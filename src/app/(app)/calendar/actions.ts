"use server";

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
import { query, transaction } from "@/lib/db";
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
  venueId: string;
};

type DeleteRequestOutcome = {
  date: string;
  message: string;
  requestId: string;
  venueId: string;
};

function parseStatus(value: string): CalendarStatus {
  if (value === "booked" || value === "available") {
    return value;
  }

  throw new Error("Invalid calendar status.");
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

function getOptionalTimeRange(formData: FormData) {
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

  if (toTime <= fromTime) {
    throw new Error("To time must be after from time.");
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
      message: getFriendlyError(error, "Calendar day could not be saved."),
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
  const date = getRequiredFormString(formData, "date");

  if (isPastDate(date)) {
    throw new Error("Past dates are display only.");
  }

  const status = parseStatus(getRequiredFormString(formData, "status"));
  const note = getFormString(formData, "note");
  const customerName = getFormString(formData, "customerName");
  const customerPhone = getFormString(formData, "customerPhone");
  const depositAmount = getOptionalDepositAmount(formData);
  const { fromTime, toTime } = getOptionalTimeRange(formData);
  const venue = await getVenueForUser(venueId, user);

  if (!venue || !userCanManageVenueDirectly(user, venue)) {
    throw new Error("You do not have access to update this calendar day.");
  }

  const currentEntry = await getEntryForDay(venueId, date);

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
    revalidatePath("/calendar");
    return {
      entry: null,
      message: "The day is already available.",
    };
  }

  await query(
    `INSERT INTO calendar_entries
      (venue_id, reservation_date, status, note, customer_name, customer_phone,
       deposit_amount, from_time, to_time, created_by_id, updated_by_id)
     VALUES ($1, $2::date, $3, $4, $5, $6, $7, $8::time, $9::time, $10, $10)
     ON CONFLICT (venue_id, reservation_date)
     DO UPDATE SET
       status = EXCLUDED.status,
       note = EXCLUDED.note,
       customer_name = EXCLUDED.customer_name,
       customer_phone = EXCLUDED.customer_phone,
       deposit_amount = EXCLUDED.deposit_amount,
       from_time = EXCLUDED.from_time,
       to_time = EXCLUDED.to_time,
       updated_by_id = EXCLUDED.updated_by_id,
       updated_at = now()`,
    [
      venueId,
      date,
      status,
      note,
      customerName,
      customerPhone,
      depositAmount,
      fromTime,
      toTime,
      user.id,
    ],
  );

  const entry = await getEntryForDay(venueId, date);

  revalidatePath("/calendar");
  publishRealtimeAfterResponse({
    date,
    type: "calendar-entry-changed",
    venueId,
  });

  return {
    entry,
    message: "Calendar day saved successfully.",
  };
}

async function requestCalendarChangeMutation(
  formData: FormData,
): Promise<RequestChangeOutcome> {
  const user = await requireUser();
  const venueId = getRequiredFormString(formData, "venueId");
  const date = getRequiredFormString(formData, "date");

  if (isPastDate(date)) {
    throw new Error("Past dates are display only.");
  }

  const status = parseStatus(getRequiredFormString(formData, "status"));
  const note = getFormString(formData, "note");
  const customerName = getFormString(formData, "customerName");
  const customerPhone = getFormString(formData, "customerPhone");
  const depositAmount = getOptionalDepositAmount(formData);
  const { fromTime, toTime } = getOptionalTimeRange(formData);
  const venue = await getVenueForUser(venueId, user);

  if (!venue || !userCanRequestVenueChange(user, venue)) {
    throw new Error("You do not have access to request this change.");
  }

  const currentEntry = await getEntryForDay(venueId, date);
  let updatedExistingRequest = false;

  await transaction(async (client) => {
    const pending = await client.query<{ id: string }>(
      `SELECT id
       FROM change_requests
       WHERE venue_id = $1 AND reservation_date = $2::date AND status = 'pending'
       LIMIT 1`,
      [venueId, date],
    );

    if (pending.rows[0]) {
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
             previous_status = $8,
             previous_note = $9,
             previous_customer_name = $10,
             previous_customer_phone = $11,
             previous_deposit_amount = $12,
             previous_from_time = $13::time,
             previous_to_time = $14::time,
             owner_id = $15,
             updated_at = now()
         WHERE id = $16`,
        [
          status,
          note,
          customerName,
          customerPhone,
          depositAmount,
          fromTime,
          toTime,
          currentEntry?.status ?? null,
          currentEntry?.note ?? null,
          currentEntry?.customerName ?? null,
          currentEntry?.customerPhone ?? null,
          currentEntry?.depositAmount ?? null,
          currentEntry?.fromTime ?? null,
          currentEntry?.toTime ?? null,
          venue.assignedUserId,
          pending.rows[0].id,
        ],
      );
      return;
    }

    await client.query(
      `INSERT INTO change_requests
        (venue_id, reservation_date, requested_status, requested_note,
         requested_customer_name, requested_customer_phone, requested_deposit_amount,
         requested_from_time, requested_to_time, previous_status, previous_note,
         previous_customer_name, previous_customer_phone, previous_deposit_amount,
         previous_from_time, previous_to_time, requested_by_id, owner_id)
       VALUES ($1, $2::date, $3, $4, $5, $6, $7, $8::time, $9::time, $10,
         $11, $12, $13, $14, $15::time, $16::time, $17, $18)`,
      [
        venueId,
        date,
        status,
        note,
        customerName,
        customerPhone,
        depositAmount,
        fromTime,
        toTime,
        currentEntry?.status ?? null,
        currentEntry?.note ?? null,
        currentEntry?.customerName ?? null,
        currentEntry?.customerPhone ?? null,
        currentEntry?.depositAmount ?? null,
        currentEntry?.fromTime ?? null,
        currentEntry?.toTime ?? null,
        user.id,
        venue.assignedUserId,
      ],
    );
  });

  const pendingRequest = await getPendingRequestForDay(venueId, date);

  if (!pendingRequest) {
    throw new Error("Pending request was not found.");
  }

  revalidatePath("/calendar");
  revalidatePath("/approvals");
  publishRealtimeAfterResponse({
    date,
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
  const requestId = getRequiredFormString(formData, "requestId");
  const decision = getRequiredFormString(formData, "decision");
  const decisionNote = getFormString(formData, "decisionNote");
  let changedVenueId = "";
  let changedDate = "";

  if (decision !== "approved" && decision !== "rejected") {
    throw new Error("Invalid decision.");
  }

  await transaction(async (client) => {
    const result = await client.query<{
      id: string;
      venue_id: string;
      reservation_date: Date | string;
      requested_status: CalendarStatus;
      requested_note: string;
      requested_customer_name: string;
      requested_customer_phone: string;
      requested_deposit_amount: string | null;
      requested_from_time: string | null;
      requested_to_time: string | null;
      requested_by_id: string;
    }>(
      `SELECT
         cr.id,
         cr.venue_id,
         cr.reservation_date,
         cr.requested_status,
         cr.requested_note,
         cr.requested_customer_name,
         cr.requested_customer_phone,
         cr.requested_deposit_amount,
         cr.requested_from_time,
         cr.requested_to_time,
         cr.requested_by_id
       FROM change_requests cr
       JOIN venues v ON v.id = cr.venue_id
       WHERE cr.id = $1
         AND v.assigned_user_id = $2
         AND cr.status = 'pending'
         AND v.is_active = true
       LIMIT 1`,
      [requestId, user.id],
    );

    const request = result.rows[0];

    if (!request || isPastDate(request.reservation_date)) {
      throw new Error("This request is no longer available.");
    }

    changedVenueId = request.venue_id;
    changedDate = normalizeDateKey(request.reservation_date);

    if (decision === "approved") {
      await client.query(
        `INSERT INTO calendar_entries
          (venue_id, reservation_date, status, note, customer_name,
           customer_phone, deposit_amount, from_time, to_time, created_by_id,
           updated_by_id)
         VALUES ($1, $2::date, $3, $4, $5, $6, $7, $8::time, $9::time, $10, $10)
         ON CONFLICT (venue_id, reservation_date)
         DO UPDATE SET
           status = EXCLUDED.status,
           note = EXCLUDED.note,
           customer_name = EXCLUDED.customer_name,
           customer_phone = EXCLUDED.customer_phone,
           deposit_amount = EXCLUDED.deposit_amount,
           from_time = EXCLUDED.from_time,
           to_time = EXCLUDED.to_time,
           updated_by_id = EXCLUDED.updated_by_id,
           updated_at = now()`,
        [
          request.venue_id,
          request.reservation_date,
          request.requested_status,
          request.requested_note,
          request.requested_customer_name,
          request.requested_customer_phone,
          request.requested_deposit_amount === null
            ? null
            : Number(request.requested_deposit_amount),
          request.requested_from_time,
          request.requested_to_time,
          request.requested_by_id,
        ],
      );
    }

    await client.query(
      `UPDATE change_requests
       SET status = $1,
           decided_by_id = $2,
           decided_at = now(),
           decision_note = $3,
           updated_at = now()
       WHERE id = $4`,
      [decision, user.id, decisionNote, requestId],
    );
  });

  revalidatePath("/calendar");
  revalidatePath("/approvals");
  publishRealtimeAfterResponse({
    date: changedDate,
    requestId,
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

  await transaction(async (client) => {
    const result = await client.query<{
      reservation_date: Date | string;
      venue_id: string;
    }>(
      `DELETE FROM change_requests
       WHERE id = $1
         AND requested_by_id = $2
         AND status = 'pending'
       RETURNING venue_id, reservation_date`,
      [requestId, user.id],
    );

    venueId = result.rows[0]?.venue_id ?? "";
    date = result.rows[0] ? normalizeDateKey(result.rows[0].reservation_date) : "";

    if (!venueId) {
      throw new Error("This request is no longer available.");
    }
  });

  revalidatePath("/calendar");
  revalidatePath("/approvals");
  publishRealtimeAfterResponse({
    date,
    requestId,
    type: "calendar-request-changed",
    venueId,
  });

  return {
    date,
    message: "Pending request deleted successfully.",
    requestId,
    venueId,
  };
}

function publishRealtimeAfterResponse(
  event: Parameters<typeof publishRealtimeEvent>[0],
) {
  after(async () => {
    await publishRealtimeEvent(event);
  });
}
