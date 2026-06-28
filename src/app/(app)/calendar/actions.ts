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
  const venue = await getVenueForUser(venueId, user);

  if (!venue || !userCanManageVenueDirectly(user, venue)) {
    throw new Error("You do not have access to update this calendar day.");
  }

  const currentEntry = await getEntryForDay(venueId, date);

  if (!currentEntry && status === "available" && !note) {
    revalidatePath("/calendar");
    return {
      entry: null,
      message: "The day is already available.",
    };
  }

  await query(
    `INSERT INTO calendar_entries
      (venue_id, reservation_date, status, note, created_by_id, updated_by_id)
     VALUES ($1, $2::date, $3, $4, $5, $5)
     ON CONFLICT (venue_id, reservation_date)
     DO UPDATE SET
       status = EXCLUDED.status,
       note = EXCLUDED.note,
       updated_by_id = EXCLUDED.updated_by_id,
       updated_at = now()`,
    [venueId, date, status, note, user.id],
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
             previous_status = $3,
             previous_note = $4,
             owner_id = $5,
             updated_at = now()
         WHERE id = $6`,
        [
          status,
          note,
          currentEntry?.status ?? null,
          currentEntry?.note ?? null,
          venue.assignedUserId,
          pending.rows[0].id,
        ],
      );
      return;
    }

    await client.query(
      `INSERT INTO change_requests
        (venue_id, reservation_date, requested_status, requested_note,
         previous_status, previous_note, requested_by_id, owner_id)
       VALUES ($1, $2::date, $3, $4, $5, $6, $7, $8)`,
      [
        venueId,
        date,
        status,
        note,
        currentEntry?.status ?? null,
        currentEntry?.note ?? null,
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
      requested_by_id: string;
    }>(
      `SELECT
         cr.id,
         cr.venue_id,
         cr.reservation_date,
         cr.requested_status,
         cr.requested_note,
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
          (venue_id, reservation_date, status, note, created_by_id, updated_by_id)
         VALUES ($1, $2::date, $3, $4, $5, $5)
         ON CONFLICT (venue_id, reservation_date)
         DO UPDATE SET
           status = EXCLUDED.status,
           note = EXCLUDED.note,
           updated_by_id = EXCLUDED.updated_by_id,
           updated_at = now()`,
        [
          request.venue_id,
          request.reservation_date,
          request.requested_status,
          request.requested_note,
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
