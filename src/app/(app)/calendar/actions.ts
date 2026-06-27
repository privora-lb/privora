"use server";

import { revalidatePath } from "next/cache";
import { after } from "next/server";

import { requireUser } from "@/lib/auth";
import { getEntryForDay } from "@/lib/data/calendar";
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
import type { CalendarStatus } from "@/lib/types";

function parseStatus(value: string): CalendarStatus {
  if (value === "booked" || value === "available") {
    return value;
  }

  throw new Error("Invalid calendar status.");
}

function isPastMonthDate(value: Date | string) {
  return normalizeDateKey(value).slice(0, 7) < todayKey().slice(0, 7);
}

export async function saveCalendarEntryAction(formData: FormData) {
  const user = await requireUser();
  const venueId = getRequiredFormString(formData, "venueId");
  const date = getRequiredFormString(formData, "date");

  if (isPastMonthDate(date)) {
    redirectToReturnPath(formData, "/calendar", {
      message: "Previous months are display only.",
      type: "error",
    });
  }

  const status = parseStatus(getRequiredFormString(formData, "status"));
  const note = getFormString(formData, "note");
  const venue = await getVenueForUser(venueId, user);

  if (!venue || !userCanManageVenueDirectly(user, venue)) {
    redirectToReturnPath(formData, "/calendar", {
      message: "You do not have access to update this calendar day.",
      type: "error",
    });
  }

  const currentEntry = await getEntryForDay(venueId, date);

  if (!currentEntry && status === "available" && !note) {
    revalidatePath("/calendar");
    redirectToReturnPath(formData, "/calendar", {
      message: "The day is already available.",
      type: "success",
    });
  }

  try {
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
  } catch (error) {
    redirectToReturnPath(formData, "/calendar", {
      message: getActionErrorMessage(error, "Calendar day could not be saved."),
      type: "error",
    });
  }

  revalidatePath("/calendar");
  publishRealtimeAfterResponse({
    date,
    type: "calendar-entry-changed",
    venueId,
  });
  redirectToReturnPath(formData, "/calendar", {
    message: "Calendar day saved successfully.",
    type: "success",
  });
}

export async function requestCalendarChangeAction(formData: FormData) {
  const user = await requireUser();
  const venueId = getRequiredFormString(formData, "venueId");
  const date = getRequiredFormString(formData, "date");

  if (isPastMonthDate(date)) {
    redirectToReturnPath(formData, "/calendar", {
      message: "Previous months are display only.",
      type: "error",
    });
  }

  const status = parseStatus(getRequiredFormString(formData, "status"));
  const note = getFormString(formData, "note");
  const venue = await getVenueForUser(venueId, user);

  if (!venue || !userCanRequestVenueChange(user, venue)) {
    redirectToReturnPath(formData, "/calendar", {
      message: "You do not have access to request this change.",
      type: "error",
    });
  }

  const currentEntry = await getEntryForDay(venueId, date);
  let updatedExistingRequest = false;

  try {
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
  } catch (error) {
    redirectToReturnPath(formData, "/calendar", {
      message: getActionErrorMessage(
        error,
        "Calendar change request could not be sent.",
      ),
      type: "error",
    });
  }

  revalidatePath("/calendar");
  revalidatePath("/approvals");
  publishRealtimeAfterResponse({
    date,
    type: "calendar-request-changed",
    venueId,
  });
  redirectToReturnPath(formData, "/calendar", {
    message: updatedExistingRequest
      ? "Pending request updated successfully."
      : "Change request sent successfully.",
    type: "success",
  });
}

export async function decideChangeRequestAction(formData: FormData) {
  const user = await requireUser();
  const requestId = getRequiredFormString(formData, "requestId");
  const decision = getRequiredFormString(formData, "decision");
  const decisionNote = getFormString(formData, "decisionNote");
  let changedVenueId = "";
  let changedDate = "";

  if (decision !== "approved" && decision !== "rejected") {
    throw new Error("Invalid decision.");
  }

  try {
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

      if (!request) {
        throw new Error("This request is no longer available.");
      }

      if (isPastMonthDate(request.reservation_date)) {
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
  } catch (error) {
    redirectToReturnPath(formData, "/approvals", {
      message: getActionErrorMessage(error, "Request could not be decided."),
      type: "error",
    });
  }

  revalidatePath("/calendar");
  revalidatePath("/approvals");
  publishRealtimeAfterResponse({
    date: changedDate,
    requestId,
    type: "calendar-request-changed",
    venueId: changedVenueId,
  });
  redirectToReturnPath(formData, "/approvals", {
    message:
      decision === "approved"
        ? "Request approved successfully."
        : "Request rejected successfully.",
    type: "success",
  });
}

export async function deletePendingChangeRequestAction(formData: FormData) {
  const user = await requireUser();

  if (user.role !== "superadmin") {
    redirectToReturnPath(formData, "/approvals", {
      message: "Only superadmins can delete pending requests.",
      type: "error",
    });
  }

  const requestId = getRequiredFormString(formData, "requestId");
  let venueId = "";
  let date = "";

  try {
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
      date = result.rows[0]
        ? normalizeDateKey(result.rows[0].reservation_date)
        : "";

      if (!venueId) {
        throw new Error("This request is no longer available.");
      }
    });
  } catch (error) {
    redirectToReturnPath(formData, "/approvals", {
      message: getActionErrorMessage(
        error,
        "Pending request could not be deleted.",
      ),
      type: "error",
    });
  }

  revalidatePath("/calendar");
  revalidatePath("/approvals");
  publishRealtimeAfterResponse({
    date,
    requestId,
    type: "calendar-request-changed",
    venueId,
  });
  redirectToReturnPath(formData, "/approvals", {
    message: "Pending request deleted successfully.",
    type: "success",
  });
}

function publishRealtimeAfterResponse(
  event: Parameters<typeof publishRealtimeEvent>[0],
) {
  after(async () => {
    await publishRealtimeEvent(event);
  });
}
