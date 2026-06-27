import { query } from "@/lib/db";
import { normalizeDateKey } from "@/lib/dates";
import type { CalendarEntry, CalendarStatus, ChangeRequest } from "@/lib/types";

type EntryRow = {
  id: string;
  venue_id: string;
  reservation_date: Date | string;
  status: CalendarStatus;
  note: string;
  created_by_name: string;
  updated_by_name: string;
};

export type ChangeRequestRow = {
  id: string;
  venue_id: string;
  venue_name: string;
  venue_type_name: string;
  reservation_date: Date | string;
  requested_status: CalendarStatus;
  requested_note: string;
  previous_status: CalendarStatus | null;
  previous_note: string | null;
  requested_by_name: string;
  owner_name: string;
  status: "pending" | "approved" | "rejected";
  decision_note: string;
  created_at: Date;
  decided_at: Date | null;
};

export async function getCalendarEntries(
  venueId: string,
  startDate: string,
  endDate: string,
) {
  const result = await query<EntryRow>(
    `SELECT
       ce.id,
       ce.venue_id,
       ce.reservation_date,
       ce.status,
       ce.note,
       creator.name AS created_by_name,
       updater.name AS updated_by_name
     FROM calendar_entries ce
     JOIN users creator ON creator.id = ce.created_by_id
     JOIN users updater ON updater.id = ce.updated_by_id
     WHERE ce.venue_id = $1
       AND ce.reservation_date BETWEEN $2::date AND $3::date
     ORDER BY ce.reservation_date`,
    [venueId, startDate, endDate],
  );

  return result.rows.map(mapEntry);
}

export async function getPendingRequestsForVenue(
  venueId: string,
  startDate: string,
  endDate: string,
) {
  const result = await query<ChangeRequestRow>(
    `${requestSelect}
     WHERE cr.venue_id = $1
       AND cr.status = 'pending'
       AND cr.reservation_date BETWEEN $2::date AND $3::date
     ORDER BY cr.reservation_date`,
    [venueId, startDate, endDate],
  );

  return result.rows.map(mapRequest);
}

export async function getEntryForDay(venueId: string, date: string) {
  const result = await query<EntryRow>(
    `SELECT
       ce.id,
       ce.venue_id,
       ce.reservation_date,
       ce.status,
       ce.note,
       creator.name AS created_by_name,
       updater.name AS updated_by_name
     FROM calendar_entries ce
     JOIN users creator ON creator.id = ce.created_by_id
     JOIN users updater ON updater.id = ce.updated_by_id
     WHERE ce.venue_id = $1 AND ce.reservation_date = $2::date
     LIMIT 1`,
    [venueId, date],
  );

  return result.rows[0] ? mapEntry(result.rows[0]) : null;
}

export async function getPendingRequestForDay(venueId: string, date: string) {
  const result = await query<ChangeRequestRow>(
    `${requestSelect}
     WHERE cr.venue_id = $1
       AND cr.reservation_date = $2::date
       AND cr.status = 'pending'
     LIMIT 1`,
    [venueId, date],
  );

  return result.rows[0] ? mapRequest(result.rows[0]) : null;
}

export const requestSelect = `
  SELECT
    cr.id,
    cr.venue_id,
    v.name AS venue_name,
    vt.name AS venue_type_name,
    cr.reservation_date,
    cr.requested_status,
    cr.requested_note,
    cr.previous_status,
    cr.previous_note,
    requester.name AS requested_by_name,
    owner.name AS owner_name,
    cr.status,
    cr.decision_note,
    cr.created_at,
    cr.decided_at
  FROM change_requests cr
  JOIN venues v ON v.id = cr.venue_id
  JOIN venue_types vt ON vt.id = v.type_id
  JOIN users requester ON requester.id = cr.requested_by_id
  JOIN users owner ON owner.id = v.assigned_user_id
`;

export function mapEntry(row: EntryRow): CalendarEntry {
  return {
    id: row.id,
    venueId: row.venue_id,
    date: normalizeDateKey(row.reservation_date),
    status: row.status,
    note: row.note,
    createdByName: row.created_by_name,
    updatedByName: row.updated_by_name,
  };
}

export function mapRequest(row: ChangeRequestRow): ChangeRequest {
  return {
    id: row.id,
    venueId: row.venue_id,
    venueName: row.venue_name,
    venueTypeName: row.venue_type_name,
    date: normalizeDateKey(row.reservation_date),
    requestedStatus: row.requested_status,
    requestedNote: row.requested_note,
    previousStatus: row.previous_status,
    previousNote: row.previous_note,
    requestedByName: row.requested_by_name,
    ownerName: row.owner_name,
    status: row.status,
    decisionNote: row.decision_note,
    createdAt: row.created_at,
    decidedAt: row.decided_at,
  };
}
