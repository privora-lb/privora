import { query } from "@/lib/db";
import { normalizeDateKey } from "@/lib/dates";
import type {
  CalendarEntry,
  CalendarSlot,
  CalendarStatus,
  ChangeRequest,
} from "@/lib/types";

type EntryRow = {
  id: string;
  venue_id: string;
  reservation_date: Date | string;
  slot: CalendarSlot;
  status: CalendarStatus;
  note: string;
  customer_name: string;
  customer_phone: string;
  deposit_amount: string | null;
  from_time: string | null;
  to_time: string | null;
  booking_price_amount: string | null;
  booking_price_currency: string | null;
  created_by_name: string;
  updated_by_name: string;
};

export type ChangeRequestRow = {
  id: string;
  venue_id: string;
  venue_name: string;
  venue_type_name: string;
  reservation_date: Date | string;
  slot: CalendarSlot | null;
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
  requested_by_name: string;
  requested_by_id: string;
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
       ce.slot,
       ce.status,
       ce.note,
       ce.customer_name,
       ce.customer_phone,
       ce.deposit_amount,
       ce.from_time,
       ce.to_time,
       ce.booking_price_amount,
       ce.booking_price_currency,
       creator.name AS created_by_name,
       updater.name AS updated_by_name
     FROM calendar_entries ce
     JOIN users creator ON creator.id = ce.created_by_id
     JOIN users updater ON updater.id = ce.updated_by_id
     WHERE ce.venue_id = $1
       AND ce.reservation_date BETWEEN $2::date AND $3::date
     ORDER BY ce.reservation_date, ce.slot`,
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
     ORDER BY cr.reservation_date, cr.slot`,
    [venueId, startDate, endDate],
  );

  return result.rows.map(mapRequest);
}

export async function getApprovedSuperadminBookedDatesForVenue(
  venueId: string,
  startDate: string,
  endDate: string,
) {
  const result = await query<{
    reservation_date: Date | string;
    slot: CalendarSlot;
  }>(
    `SELECT DISTINCT cr.reservation_date, ce.slot
     FROM change_requests cr
     JOIN users requester ON requester.id = cr.requested_by_id
     JOIN venues v ON v.id = cr.venue_id
     JOIN users owner ON owner.id = v.assigned_user_id
     JOIN calendar_entries ce
       ON ce.venue_id = cr.venue_id
      AND ce.reservation_date = cr.reservation_date
      AND (ce.slot = cr.slot OR cr.slot IS NULL)
     WHERE cr.venue_id = $1
       AND cr.status = 'approved'
       AND cr.requested_status = 'booked'
       AND requester.role = 'superadmin'
       AND owner.role = 'owner'
       AND ce.status = 'booked'
       AND ce.updated_by_id = cr.requested_by_id
       AND cr.reservation_date BETWEEN $2::date AND $3::date
     ORDER BY cr.reservation_date, ce.slot`,
    [venueId, startDate, endDate],
  );

  return result.rows.map((row) => ({
    date: normalizeDateKey(row.reservation_date),
    slot: row.slot,
  }));
}

export async function getEntryForDay(
  venueId: string,
  date: string,
  slot: CalendarSlot,
) {
  const result = await query<EntryRow>(
    `SELECT
       ce.id,
       ce.venue_id,
       ce.reservation_date,
       ce.slot,
       ce.status,
       ce.note,
       ce.customer_name,
       ce.customer_phone,
       ce.deposit_amount,
       ce.from_time,
       ce.to_time,
       ce.booking_price_amount,
       ce.booking_price_currency,
       creator.name AS created_by_name,
       updater.name AS updated_by_name
     FROM calendar_entries ce
     JOIN users creator ON creator.id = ce.created_by_id
     JOIN users updater ON updater.id = ce.updated_by_id
     WHERE ce.venue_id = $1
       AND ce.reservation_date = $2::date
       AND ce.slot = $3
     LIMIT 1`,
    [venueId, date, slot],
  );

  return result.rows[0] ? mapEntry(result.rows[0]) : null;
}

export async function getPendingRequestForDay(
  venueId: string,
  date: string,
  slot: CalendarSlot,
) {
  const result = await query<ChangeRequestRow>(
    `${requestSelect}
     WHERE cr.venue_id = $1
       AND cr.reservation_date = $2::date
       AND cr.slot = $3
       AND cr.status = 'pending'
     LIMIT 1`,
    [venueId, date, slot],
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
    requester.name AS requested_by_name,
    cr.requested_by_id,
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
    slot: row.slot,
    status: row.status,
    note: row.note,
    customerName: row.customer_name,
    customerPhone: row.customer_phone,
    depositAmount: parseNullableNumber(row.deposit_amount),
    fromTime: normalizeTime(row.from_time),
    toTime: normalizeTime(row.to_time),
    bookingPriceAmount: parseNullableNumber(row.booking_price_amount),
    bookingPriceCurrency: row.booking_price_currency,
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
    slot: row.slot,
    requestedStatus: row.requested_status,
    requestedNote: row.requested_note,
    requestedCustomerName: row.requested_customer_name,
    requestedCustomerPhone: row.requested_customer_phone,
    requestedDepositAmount: parseNullableNumber(row.requested_deposit_amount),
    requestedFromTime: normalizeTime(row.requested_from_time),
    requestedToTime: normalizeTime(row.requested_to_time),
    requestedBookingPriceAmount: parseNullableNumber(
      row.requested_booking_price_amount,
    ),
    requestedBookingPriceCurrency: row.requested_booking_price_currency,
    previousStatus: row.previous_status,
    previousNote: row.previous_note,
    previousCustomerName: row.previous_customer_name,
    previousCustomerPhone: row.previous_customer_phone,
    previousDepositAmount: parseNullableNumber(row.previous_deposit_amount),
    previousFromTime: normalizeTime(row.previous_from_time),
    previousToTime: normalizeTime(row.previous_to_time),
    previousBookingPriceAmount: parseNullableNumber(
      row.previous_booking_price_amount,
    ),
    previousBookingPriceCurrency: row.previous_booking_price_currency,
    requestedByName: row.requested_by_name,
    requestedById: row.requested_by_id,
    ownerName: row.owner_name,
    status: row.status,
    decisionNote: row.decision_note,
    createdAt: row.created_at,
    decidedAt: row.decided_at,
  };
}

function parseNullableNumber(value: string | null) {
  return value === null ? null : Number(value);
}

function normalizeTime(value: string | null) {
  return value ? value.slice(0, 5) : null;
}
