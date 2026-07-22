"use server";

import type { PoolClient } from "pg";
import { revalidatePath } from "next/cache";
import { after } from "next/server";
import { isRedirectError } from "next/dist/client/components/redirect-error";

import { requireUser } from "@/lib/auth";
import {
  getEntryForDay,
  getPendingRequestForDay,
} from "@/lib/data/calendar";
import {
  getVenueForUser,
  userCanManageVenueDirectly,
  userCanRequestVenueChange,
} from "@/lib/data/venues";
import { transaction } from "@/lib/db";
import {
  getActionErrorMessage,
  getFormString,
  getRequiredFormString,
  redirectToReturnPath,
} from "@/lib/forms";
import { normalizeDateKey, todayKey } from "@/lib/dates";
import { publishRealtimeEvent } from "@/lib/realtime";
import type {
  CalendarEntry,
  CalendarSlot,
  CalendarStatus,
  ChangeRequest,
  RequestStatus,
} from "@/lib/types";

type ActionResult<T extends object = Record<string, never>> =
  | ({ ok: true; message: string } & T)
  | { ok: false; message: string };

type SaveEntryOutcome = {
  entry: CalendarEntry | null;
  message: string;
};

type RequestChangeOutcome = {
  message: string;
  pendingRequest: ChangeRequest;
};

type DecideRequestOutcome = {
  date: string;
  decision: Extract<RequestStatus, "approved" | "rejected">;
  message: string;
  requestId: string;
  slot: CalendarSlot;
  venueId: string;
};

type DeleteRequestOutcome = {
  date: string;
  message: string;
  requestId: string;
  slot: CalendarSlot;
  venueId: string;
};

type CalendarEntrySnapshotRow = {
  status: CalendarStatus;
  note: string;
  customer_name: string;
  customer_phone: string;
  deposit_amount: string | null;
  from_time: string | null;
  to_time: string | null;
  booking_price_amount: string | null;
  booking_price_currency: string | null;
};

type BookingPriceSnapshot = {
  amount: number | null;
  currency: string | null;
};

type DecisionRequestRow = {
  id: string;
  venue_id: string;
  reservation_date: Date | string;
  slot: CalendarSlot;
  requested_status: CalendarStatus;
  requested_note: string;
  requested_customer_name: string;
  requested_customer_phone: string;
  requested_deposit_amount: string | null;
  requested_from_time: string | null;
  requested_to_time: string | null;
  requested_booking_price_amount: string | null;
  requested_booking_price_currency: string | null;
  previous_status: CalendarStatus | null;
  previous_note: string | null;
  previous_customer_name: string | null;
  previous_customer_phone: string | null;
  previous_deposit_amount: string | null;
  previous_from_time: string | null;
  previous_to_time: string | null;
  previous_booking_price_amount: string | null;
  previous_booking_price_currency: string | null;
  requested_by_id: string;
};

function parseStatus(value: string): CalendarStatus {
  if (value === "booked" || value === "available") {
    return value;
  }

  throw new Error("Invalid calendar status.");
}

function parseSlot(value: string): CalendarSlot {
  if (value === "day" || value === "night") {
    return value;
  }

  throw new Error("Invalid calendar slot.");
}

function parseReservationDate(value: string) {
  if (!/^\d{4}-\d{2}-\d{2}$/.test(value)) {
    throw new Error("Invalid reservation date.");
  }

  const [year, month, day] = value.split("-").map(Number);
  const parsed = new Date(0);
  parsed.setUTCHours(0, 0, 0, 0);
  parsed.setUTCFullYear(year, month - 1, day);

  if (
    parsed.getUTCFullYear() !== year ||
    parsed.getUTCMonth() !== month - 1 ||
    parsed.getUTCDate() !== day
  ) {
    throw new Error("Invalid reservation date.");
  }

  return value;
}

function isPastDate(value: Date | string) {
  return normalizeDateKey(value) < todayKey();
}

function getFriendlyError(error: unknown, fallback: string) {
  if (isRedirectError(error)) {
    throw error;
  }

  return getActionErrorMessage(error, fallback);
}

function getOptionalDepositAmount(formData: FormData) {
  const rawValue = getFormString(formData, "depositAmount");

  if (!rawValue) {
    return null;
  }

  const amount = Number(rawValue);

  if (!Number.isFinite(amount)) {
    throw new Error("Deposit must be a valid number.");
  }

  if (amount < 0) {
    throw new Error("Deposit cannot be negative.");
  }

  return amount;
}

function getOptionalTimeRange(formData: FormData, slot: CalendarSlot) {
  const fromTime = getFormString(formData, "fromTime");
  const toTime = getFormString(formData, "toTime");

  if (!fromTime && !toTime) {
    return { fromTime: null, toTime: null };
  }

  if (!fromTime || !toTime) {
    throw new Error("From time and to time must be filled together.");
  }

  if (!isValidTimeValue(fromTime) || !isValidTimeValue(toTime)) {
    throw new Error("Time must use a valid 24-hour format.");
  }

  if (toTime === fromTime) {
    throw new Error("From time and to time cannot be the same.");
  }

  if (slot === "day" && toTime < fromTime) {
    throw new Error("A day slot cannot end on the following day.");
  }

  return { fromTime, toTime };
}

function isValidTimeValue(value: string) {
  return /^([01]\d|2[0-3]):[0-5]\d$/.test(value);
}

export async function saveCalendarEntryInlineAction(
  formData: FormData,
): Promise<ActionResult<{ entry: CalendarEntry | null }>> {
  try {
    const outcome = await saveCalendarEntryMutation(formData);

    return { ok: true, ...outcome };
  } catch (error) {
    return {
      ok: false,
      message: getFriendlyError(error, "Calendar slot could not be saved."),
    };
  }
}

export async function requestCalendarChangeInlineAction(
  formData: FormData,
): Promise<ActionResult<{ pendingRequest: ChangeRequest }>> {
  try {
    const outcome = await requestCalendarChangeMutation(formData);

    return { ok: true, ...outcome };
  } catch (error) {
    return {
      ok: false,
      message: getFriendlyError(
        error,
        "Calendar change request could not be sent.",
      ),
    };
  }
}

export async function decideChangeRequestInlineAction(
  formData: FormData,
): Promise<ActionResult<DecideRequestOutcome>> {
  try {
    const outcome = await decideChangeRequestMutation(formData);

    return { ok: true, ...outcome };
  } catch (error) {
    return {
      ok: false,
      message: getFriendlyError(error, "Request could not be decided."),
    };
  }
}

export async function deletePendingChangeRequestInlineAction(
  formData: FormData,
): Promise<ActionResult<DeleteRequestOutcome>> {
  try {
    const outcome = await deletePendingChangeRequestMutation(formData);

    return { ok: true, ...outcome };
  } catch (error) {
    return {
      ok: false,
      message: getFriendlyError(
        error,
        "Pending request could not be deleted.",
      ),
    };
  }
}

export async function saveCalendarEntryAction(formData: FormData) {
  const result = await saveCalendarEntryInlineAction(formData);

  redirectToReturnPath(formData, "/calendar", {
    message: result.message,
    type: result.ok ? "success" : "error",
  });
}

export async function requestCalendarChangeAction(formData: FormData) {
  const result = await requestCalendarChangeInlineAction(formData);

  redirectToReturnPath(formData, "/calendar", {
    message: result.message,
    type: result.ok ? "success" : "error",
  });
}

export async function decideChangeRequestAction(formData: FormData) {
  const result = await decideChangeRequestInlineAction(formData);

  redirectToReturnPath(formData, "/approvals", {
    message: result.message,
    type: result.ok ? "success" : "error",
  });
}

export async function deletePendingChangeRequestAction(formData: FormData) {
  const result = await deletePendingChangeRequestInlineAction(formData);

  redirectToReturnPath(formData, "/approvals", {
    message: result.message,
    type: result.ok ? "success" : "error",
  });
}

async function saveCalendarEntryMutation(
  formData: FormData,
): Promise<SaveEntryOutcome> {
  const user = await requireUser();
  const venueId = getRequiredFormString(formData, "venueId");
  const date = parseReservationDate(getRequiredFormString(formData, "date"));
  const slot = parseSlot(getRequiredFormString(formData, "slot"));

  if (isPastDate(date)) {
    throw new Error("Past dates are display only.");
  }

  const status = parseStatus(getRequiredFormString(formData, "status"));
  const note = getFormString(formData, "note");
  const customerName = getFormString(formData, "customerName");
  const customerPhone = getFormString(formData, "customerPhone");
  const depositAmount = getOptionalDepositAmount(formData);
  const { fromTime, toTime } = getOptionalTimeRange(formData, slot);
  const venue = await getVenueForUser(venueId, user);

  if (!venue || !userCanManageVenueDirectly(user, venue)) {
    throw new Error("You do not have access to update this calendar slot.");
  }

  const didWrite = await transaction(async (client) => {
    await lockCalendarSlot(client, venueId, date, slot);
    await assertDirectCalendarAccess(client, venueId, user.id);
    const currentEntry = await getCalendarEntrySnapshot(
      client,
      venueId,
      date,
      slot,
      true,
    );

    if (
      !currentEntry &&
      status === "available" &&
      !note &&
      !customerName &&
      !customerPhone &&
      depositAmount === null &&
      fromTime === null &&
      toTime === null
    ) {
      return false;
    }

    const bookingPrice = await resolveBookingPriceSnapshot({
      client,
      currentEntry,
      date,
      requestedStatus: status,
      slot,
      venueId,
    });

    await client.query(
      `INSERT INTO calendar_entries
        (venue_id, reservation_date, slot, status, note, customer_name,
         customer_phone, deposit_amount, from_time, to_time,
         booking_price_amount, booking_price_currency, created_by_id,
         updated_by_id)
       VALUES ($1, $2::date, $3, $4, $5, $6, $7, $8, $9::time, $10::time,
         $11, $12, $13, $13)
       ON CONFLICT (venue_id, reservation_date, slot)
       DO UPDATE SET
         status = EXCLUDED.status,
         note = EXCLUDED.note,
         customer_name = EXCLUDED.customer_name,
         customer_phone = EXCLUDED.customer_phone,
         deposit_amount = EXCLUDED.deposit_amount,
         from_time = EXCLUDED.from_time,
         to_time = EXCLUDED.to_time,
         booking_price_amount = EXCLUDED.booking_price_amount,
         booking_price_currency = EXCLUDED.booking_price_currency,
         updated_by_id = EXCLUDED.updated_by_id,
         updated_at = now()`,
      [
        venueId,
        date,
        slot,
        status,
        note,
        customerName,
        customerPhone,
        depositAmount,
        fromTime,
        toTime,
        bookingPrice.amount,
        bookingPrice.currency,
        user.id,
      ],
    );

    return true;
  });

  const entry = didWrite ? await getEntryForDay(venueId, date, slot) : null;

  revalidatePath("/calendar");

  if (didWrite) {
    publishRealtimeAfterResponse({
      date,
      slot,
      type: "calendar-entry-changed",
      venueId,
    });
  }

  return {
    entry,
    message: didWrite
      ? "Calendar slot saved successfully."
      : "The slot is already available.",
  };
}

async function requestCalendarChangeMutation(
  formData: FormData,
): Promise<RequestChangeOutcome> {
  const user = await requireUser();
  const venueId = getRequiredFormString(formData, "venueId");
  const date = parseReservationDate(getRequiredFormString(formData, "date"));
  const slot = parseSlot(getRequiredFormString(formData, "slot"));

  if (isPastDate(date)) {
    throw new Error("Past dates are display only.");
  }

  const status = parseStatus(getRequiredFormString(formData, "status"));
  const note = getFormString(formData, "note");
  const customerName = getFormString(formData, "customerName");
  const customerPhone = getFormString(formData, "customerPhone");
  const depositAmount = getOptionalDepositAmount(formData);
  const { fromTime, toTime } = getOptionalTimeRange(formData, slot);
  const venue = await getVenueForUser(venueId, user);

  if (!venue || !userCanRequestVenueChange(user, venue)) {
    throw new Error("You do not have access to request this change.");
  }

  let updatedExistingRequest = false;

  await transaction(async (client) => {
    await lockCalendarSlot(client, venueId, date, slot);
    const ownerId = await getCalendarChangeRequestOwner(
      client,
      venueId,
      user.id,
    );
    const currentEntry = await getCalendarEntrySnapshot(
      client,
      venueId,
      date,
      slot,
      true,
    );
    const requestedBookingPrice = await resolveBookingPriceSnapshot({
      client,
      currentEntry,
      date,
      requestedStatus: status,
      slot,
      venueId,
    });
    const pending = await client.query<{
      id: string;
      requested_by_id: string;
    }>(
      `SELECT id, requested_by_id
       FROM change_requests
       WHERE venue_id = $1
         AND reservation_date = $2::date
         AND slot = $3
         AND status = 'pending'
       LIMIT 1
       FOR UPDATE`,
      [venueId, date, slot],
    );

    if (pending.rows[0]) {
      if (pending.rows[0].requested_by_id !== user.id) {
        throw new Error(
          "Another superadmin already has a pending request for this slot.",
        );
      }

      updatedExistingRequest = true;
      await client.query(
        `UPDATE change_requests
         SET requested_status = $1,
             requested_note = $2,
             requested_customer_name = $3,
             requested_customer_phone = $4,
             requested_deposit_amount = $5,
             requested_from_time = $6::time,
             requested_to_time = $7::time,
             requested_booking_price_amount = $8,
             requested_booking_price_currency = $9,
             previous_status = $10,
             previous_note = $11,
             previous_customer_name = $12,
             previous_customer_phone = $13,
             previous_deposit_amount = $14,
             previous_from_time = $15::time,
             previous_to_time = $16::time,
             previous_booking_price_amount = $17,
             previous_booking_price_currency = $18,
             owner_id = $19,
             updated_at = now()
         WHERE id = $20`,
        [
          status,
          note,
          customerName,
          customerPhone,
          depositAmount,
          fromTime,
          toTime,
          requestedBookingPrice.amount,
          requestedBookingPrice.currency,
          currentEntry?.status ?? null,
          currentEntry?.note ?? null,
          currentEntry?.customer_name ?? null,
          currentEntry?.customer_phone ?? null,
          currentEntry?.deposit_amount ?? null,
          normalizeTimeValue(currentEntry?.from_time ?? null),
          normalizeTimeValue(currentEntry?.to_time ?? null),
          currentEntry?.booking_price_amount ?? null,
          currentEntry?.booking_price_currency ?? null,
          ownerId,
          pending.rows[0].id,
        ],
      );
      return;
    }

    await client.query(
      `INSERT INTO change_requests
        (venue_id, reservation_date, slot, requested_status, requested_note,
         requested_customer_name, requested_customer_phone, requested_deposit_amount,
         requested_from_time, requested_to_time, requested_booking_price_amount,
         requested_booking_price_currency, previous_status, previous_note,
         previous_customer_name, previous_customer_phone, previous_deposit_amount,
         previous_from_time, previous_to_time, previous_booking_price_amount,
         previous_booking_price_currency, requested_by_id, owner_id)
       VALUES ($1, $2::date, $3, $4, $5, $6, $7, $8, $9::time, $10::time,
         $11, $12, $13, $14, $15, $16, $17, $18::time, $19::time, $20, $21,
         $22, $23)`,
      [
        venueId,
        date,
        slot,
        status,
        note,
        customerName,
        customerPhone,
        depositAmount,
        fromTime,
        toTime,
        requestedBookingPrice.amount,
        requestedBookingPrice.currency,
        currentEntry?.status ?? null,
        currentEntry?.note ?? null,
        currentEntry?.customer_name ?? null,
        currentEntry?.customer_phone ?? null,
        currentEntry?.deposit_amount ?? null,
        normalizeTimeValue(currentEntry?.from_time ?? null),
        normalizeTimeValue(currentEntry?.to_time ?? null),
        currentEntry?.booking_price_amount ?? null,
        currentEntry?.booking_price_currency ?? null,
        user.id,
        ownerId,
      ],
    );
  });

  const pendingRequest = await getPendingRequestForDay(venueId, date, slot);

  if (!pendingRequest) {
    throw new Error("Pending request was not found.");
  }

  revalidatePath("/calendar");
  revalidatePath("/approvals");
  publishRealtimeAfterResponse({
    date,
    slot,
    type: "calendar-request-changed",
    venueId,
  });

  return {
    message: updatedExistingRequest
      ? "Pending request updated successfully."
      : "Change request sent successfully.",
    pendingRequest,
  };
}

async function decideChangeRequestMutation(
  formData: FormData,
): Promise<DecideRequestOutcome> {
  const user = await requireUser();

  if (user.role !== "owner") {
    throw new Error("Only the assigned owner can decide this request.");
  }

  const requestId = getRequiredFormString(formData, "requestId");
  const decision = getRequiredFormString(formData, "decision");
  const decisionNote = getFormString(formData, "decisionNote");
  let changedVenueId = "";
  let changedDate = "";
  let changedSlot: CalendarSlot | null = null;

  if (decision !== "approved" && decision !== "rejected") {
    throw new Error("Invalid decision.");
  }

  await transaction(async (client) => {
    const targetResult = await client.query<{
      venue_id: string;
      reservation_date: Date | string;
      slot: CalendarSlot | null;
    }>(
      `SELECT
         cr.venue_id,
         cr.reservation_date,
         cr.slot
       FROM change_requests cr
       JOIN venues v ON v.id = cr.venue_id
       WHERE cr.id = $1
         AND v.assigned_user_id = $2
         AND cr.status = 'pending'
         AND v.is_active = true
       LIMIT 1`,
      [requestId, user.id],
    );

    const target = targetResult.rows[0];

    if (!target || !target.slot || isPastDate(target.reservation_date)) {
      throw new Error("This request is no longer available.");
    }

    await lockCalendarSlot(
      client,
      target.venue_id,
      normalizeDateKey(target.reservation_date),
      target.slot,
    );

    const result = await client.query<DecisionRequestRow>(
      `SELECT
         cr.id,
         cr.venue_id,
         cr.reservation_date,
         cr.slot,
         cr.requested_status,
         cr.requested_note,
         cr.requested_customer_name,
         cr.requested_customer_phone,
         cr.requested_deposit_amount,
         cr.requested_from_time,
         cr.requested_to_time,
         cr.requested_booking_price_amount,
         cr.requested_booking_price_currency,
         cr.previous_status,
         cr.previous_note,
         cr.previous_customer_name,
         cr.previous_customer_phone,
         cr.previous_deposit_amount,
         cr.previous_from_time,
         cr.previous_to_time,
         cr.previous_booking_price_amount,
         cr.previous_booking_price_currency,
         cr.requested_by_id
       FROM change_requests cr
       JOIN venues v ON v.id = cr.venue_id
       WHERE cr.id = $1
         AND v.assigned_user_id = $2
         AND cr.status = 'pending'
         AND cr.slot IS NOT NULL
         AND v.is_active = true
       LIMIT 1
       FOR UPDATE OF cr, v`,
      [requestId, user.id],
    );
    const request = result.rows[0];

    if (!request || isPastDate(request.reservation_date)) {
      throw new Error("This request is no longer available.");
    }

    changedVenueId = request.venue_id;
    changedDate = normalizeDateKey(request.reservation_date);
    changedSlot = request.slot;

    if (decision === "approved") {
      const currentEntry = await getCalendarEntrySnapshot(
        client,
        request.venue_id,
        changedDate,
        request.slot,
        true,
      );

      if (!calendarEntryMatchesPreviousSnapshot(currentEntry, request)) {
        throw new Error(
          "This calendar slot changed after the request was submitted. Review and resubmit the request before approving it.",
        );
      }

      await client.query(
        `INSERT INTO calendar_entries
          (venue_id, reservation_date, slot, status, note, customer_name,
           customer_phone, deposit_amount, from_time, to_time,
           booking_price_amount, booking_price_currency, created_by_id,
           updated_by_id)
         VALUES ($1, $2::date, $3, $4, $5, $6, $7, $8, $9::time, $10::time,
           $11, $12, $13, $13)
         ON CONFLICT (venue_id, reservation_date, slot)
         DO UPDATE SET
           status = EXCLUDED.status,
           note = EXCLUDED.note,
           customer_name = EXCLUDED.customer_name,
           customer_phone = EXCLUDED.customer_phone,
           deposit_amount = EXCLUDED.deposit_amount,
           from_time = EXCLUDED.from_time,
           to_time = EXCLUDED.to_time,
           booking_price_amount = EXCLUDED.booking_price_amount,
           booking_price_currency = EXCLUDED.booking_price_currency,
           updated_by_id = EXCLUDED.updated_by_id,
           updated_at = now()`,
        [
          request.venue_id,
          request.reservation_date,
          request.slot,
          request.requested_status,
          request.requested_note,
          request.requested_customer_name,
          request.requested_customer_phone,
          request.requested_deposit_amount === null
            ? null
            : Number(request.requested_deposit_amount),
          request.requested_from_time,
          request.requested_to_time,
          request.requested_booking_price_amount,
          request.requested_booking_price_currency,
          request.requested_by_id,
        ],
      );
    }

    const updateResult = await client.query<{ id: string }>(
      `UPDATE change_requests
       SET status = $1,
           decided_by_id = $2,
           decided_at = now(),
           decision_note = $3,
           updated_at = now()
       WHERE id = $4
         AND status = 'pending'
       RETURNING id`,
      [decision, user.id, decisionNote, requestId],
    );

    if (!updateResult.rows[0]) {
      throw new Error("This request is no longer available.");
    }
  });

  if (!changedSlot) {
    throw new Error("This request is no longer available.");
  }

  revalidatePath("/calendar");
  revalidatePath("/approvals");
  publishRealtimeAfterResponse({
    date: changedDate,
    requestId,
    slot: changedSlot,
    type: "calendar-request-changed",
    venueId: changedVenueId,
  });

  return {
    date: changedDate,
    decision,
    message:
      decision === "approved"
        ? "Request approved successfully."
        : "Request rejected successfully.",
    requestId,
    slot: changedSlot,
    venueId: changedVenueId,
  };
}

async function deletePendingChangeRequestMutation(
  formData: FormData,
): Promise<DeleteRequestOutcome> {
  const user = await requireUser();

  if (user.role !== "superadmin") {
    throw new Error("Only superadmins can delete pending requests.");
  }

  const requestId = getRequiredFormString(formData, "requestId");
  let venueId = "";
  let date = "";
  let slot: CalendarSlot | null = null;

  await transaction(async (client) => {
    const result = await client.query<{
      reservation_date: Date | string;
      slot: CalendarSlot | null;
      venue_id: string;
    }>(
      `DELETE FROM change_requests
       WHERE id = $1
         AND requested_by_id = $2
         AND status = 'pending'
       RETURNING venue_id, reservation_date, slot`,
      [requestId, user.id],
    );

    venueId = result.rows[0]?.venue_id ?? "";
    date = result.rows[0] ? normalizeDateKey(result.rows[0].reservation_date) : "";
    slot = result.rows[0]?.slot ?? null;

    if (!venueId || !slot) {
      throw new Error("This request is no longer available.");
    }
  });

  if (!slot) {
    throw new Error("This request is no longer available.");
  }

  revalidatePath("/calendar");
  revalidatePath("/approvals");
  publishRealtimeAfterResponse({
    date,
    requestId,
    slot,
    type: "calendar-request-changed",
    venueId,
  });

  return {
    date,
    message: "Pending request deleted successfully.",
    requestId,
    slot,
    venueId,
  };
}

async function lockCalendarSlot(
  client: PoolClient,
  venueId: string,
  date: string,
  slot: CalendarSlot,
) {
  await client.query(
    `SELECT pg_advisory_xact_lock(
       hashtextextended($1::text, 0)
     )`,
    [`calendar-slot:${venueId}:${date}:${slot}`],
  );
}

async function assertDirectCalendarAccess(
  client: PoolClient,
  venueId: string,
  userId: string,
) {
  const result = await client.query<{ id: string }>(
    `SELECT v.id
     FROM venues v
     WHERE v.id = $1
       AND v.assigned_user_id = $2
       AND v.is_active = true
     LIMIT 1
     FOR SHARE OF v`,
    [venueId, userId],
  );

  if (!result.rows[0]) {
    throw new Error("You do not have access to update this calendar slot.");
  }
}

async function getCalendarChangeRequestOwner(
  client: PoolClient,
  venueId: string,
  requesterId: string,
) {
  const result = await client.query<{ assigned_user_id: string }>(
    `SELECT v.assigned_user_id
     FROM venues v
     JOIN users owner ON owner.id = v.assigned_user_id
     WHERE v.id = $1
       AND v.assigned_user_id <> $2
       AND v.is_active = true
       AND owner.is_active = true
       AND owner.role = 'owner'
     LIMIT 1
     FOR SHARE OF v`,
    [venueId, requesterId],
  );
  const ownerId = result.rows[0]?.assigned_user_id;

  if (!ownerId) {
    throw new Error("You do not have access to request this change.");
  }

  return ownerId;
}

async function getCalendarEntrySnapshot(
  client: PoolClient,
  venueId: string,
  date: string,
  slot: CalendarSlot,
  lockForUpdate = false,
) {
  const result = await client.query<CalendarEntrySnapshotRow>(
    `SELECT
       status,
       note,
       customer_name,
       customer_phone,
       deposit_amount,
       from_time,
       to_time,
       booking_price_amount,
       booking_price_currency
     FROM calendar_entries
     WHERE venue_id = $1
       AND reservation_date = $2::date
       AND slot = $3
     LIMIT 1
     ${lockForUpdate ? "FOR UPDATE" : ""}`,
    [venueId, date, slot],
  );

  return result.rows[0] ?? null;
}

async function resolveBookingPriceSnapshot({
  client,
  currentEntry,
  date,
  requestedStatus,
  slot,
  venueId,
}: {
  client: PoolClient;
  currentEntry: CalendarEntrySnapshotRow | null;
  date: string;
  requestedStatus: CalendarStatus;
  slot: CalendarSlot;
  venueId: string;
}): Promise<BookingPriceSnapshot> {
  if (requestedStatus === "available") {
    return { amount: null, currency: null };
  }

  if (currentEntry?.status === "booked") {
    return {
      amount:
        currentEntry.booking_price_amount === null
          ? null
          : Number(currentEntry.booking_price_amount),
      currency: currentEntry.booking_price_currency,
    };
  }

  const result = await client.query<{
    amount: string | null;
    currency: string | null;
  }>(
    `SELECT
       CASE
         WHEN EXTRACT(ISODOW FROM $2::date)::smallint = ANY(pl.weekend_iso_days)
           THEN CASE
             WHEN $3::text = 'day' THEN pl.weekend_day_price_amount
             ELSE pl.weekend_night_price_amount
           END
         ELSE CASE
           WHEN $3::text = 'day' THEN pl.weekday_day_price_amount
           ELSE pl.weekday_night_price_amount
         END
       END AS amount,
       pl.price_currency AS currency
     FROM public_listings pl
     WHERE pl.calendar_venue_id = $1
     LIMIT 1`,
    [venueId, date, slot],
  );
  const price = result.rows[0];

  if (
    price?.amount === null ||
    price?.amount === undefined ||
    !price.currency
  ) {
    return { amount: null, currency: null };
  }

  return {
    amount: Number(price.amount),
    currency: price.currency,
  };
}

function calendarEntryMatchesPreviousSnapshot(
  currentEntry: CalendarEntrySnapshotRow | null,
  request: DecisionRequestRow,
) {
  if (!currentEntry) {
    return (
      request.previous_status === null &&
      request.previous_note === null &&
      request.previous_customer_name === null &&
      request.previous_customer_phone === null &&
      request.previous_deposit_amount === null &&
      request.previous_from_time === null &&
      request.previous_to_time === null &&
      request.previous_booking_price_amount === null &&
      request.previous_booking_price_currency === null
    );
  }

  return (
    currentEntry.status === request.previous_status &&
    currentEntry.note === request.previous_note &&
    currentEntry.customer_name === request.previous_customer_name &&
    currentEntry.customer_phone === request.previous_customer_phone &&
    nullableNumbersEqual(
      currentEntry.deposit_amount,
      request.previous_deposit_amount,
    ) &&
    normalizeTimeValue(currentEntry.from_time) ===
      normalizeTimeValue(request.previous_from_time) &&
    normalizeTimeValue(currentEntry.to_time) ===
      normalizeTimeValue(request.previous_to_time) &&
    nullableNumbersEqual(
      currentEntry.booking_price_amount,
      request.previous_booking_price_amount,
    ) &&
    currentEntry.booking_price_currency ===
      request.previous_booking_price_currency
  );
}

function nullableNumbersEqual(left: string | null, right: string | null) {
  if (left === null || right === null) {
    return left === right;
  }

  return Number(left) === Number(right);
}

function normalizeTimeValue(value: string | null) {
  return value ? value.slice(0, 5) : null;
}

function publishRealtimeAfterResponse(
  event: Parameters<typeof publishRealtimeEvent>[0],
) {
  after(async () => {
    await publishRealtimeEvent(event);
  });
}
