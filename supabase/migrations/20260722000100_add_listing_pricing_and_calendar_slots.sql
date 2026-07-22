BEGIN;

LOCK TABLE public_listings, calendar_entries, change_requests
  IN ACCESS EXCLUSIVE MODE;

ALTER TABLE public_listings
  ADD COLUMN IF NOT EXISTS weekday_day_price_amount numeric(12,2),
  ADD COLUMN IF NOT EXISTS weekday_night_price_amount numeric(12,2),
  ADD COLUMN IF NOT EXISTS weekend_day_price_amount numeric(12,2),
  ADD COLUMN IF NOT EXISTS weekend_night_price_amount numeric(12,2),
  ADD COLUMN IF NOT EXISTS weekend_iso_days smallint[];

UPDATE public_listings
SET weekday_day_price_amount = COALESCE(weekday_day_price_amount, price_amount),
    weekday_night_price_amount = COALESCE(weekday_night_price_amount, price_amount),
    weekend_day_price_amount = COALESCE(weekend_day_price_amount, price_amount),
    weekend_night_price_amount = COALESCE(weekend_night_price_amount, price_amount),
    weekend_iso_days = COALESCE(
      weekend_iso_days,
      ARRAY[6, 7]::smallint[]
    );

ALTER TABLE public_listings
  ALTER COLUMN weekday_day_price_amount SET NOT NULL,
  ALTER COLUMN weekday_night_price_amount SET NOT NULL,
  ALTER COLUMN weekend_day_price_amount SET NOT NULL,
  ALTER COLUMN weekend_night_price_amount SET NOT NULL,
  ALTER COLUMN weekend_iso_days SET DEFAULT ARRAY[6, 7]::smallint[],
  ALTER COLUMN weekend_iso_days SET NOT NULL,
  DROP CONSTRAINT IF EXISTS public_listings_weekday_day_price_amount_check,
  DROP CONSTRAINT IF EXISTS public_listings_weekday_night_price_amount_check,
  DROP CONSTRAINT IF EXISTS public_listings_weekend_day_price_amount_check,
  DROP CONSTRAINT IF EXISTS public_listings_weekend_night_price_amount_check,
  DROP CONSTRAINT IF EXISTS public_listings_weekend_iso_days_check,
  ADD CONSTRAINT public_listings_weekday_day_price_amount_check CHECK (
    weekday_day_price_amount >= 0
  ),
  ADD CONSTRAINT public_listings_weekday_night_price_amount_check CHECK (
    weekday_night_price_amount >= 0
  ),
  ADD CONSTRAINT public_listings_weekend_day_price_amount_check CHECK (
    weekend_day_price_amount >= 0
  ),
  ADD CONSTRAINT public_listings_weekend_night_price_amount_check CHECK (
    weekend_night_price_amount >= 0
  ),
  ADD CONSTRAINT public_listings_weekend_iso_days_check CHECK (
    array_position(weekend_iso_days, NULL) IS NULL
        AND weekend_iso_days <@ ARRAY[1, 2, 3, 4, 5, 6, 7]::smallint[]
        AND cardinality(weekend_iso_days) BETWEEN 1 AND 6
        AND cardinality(array_positions(weekend_iso_days, 1::smallint)) <= 1
        AND cardinality(array_positions(weekend_iso_days, 2::smallint)) <= 1
        AND cardinality(array_positions(weekend_iso_days, 3::smallint)) <= 1
        AND cardinality(array_positions(weekend_iso_days, 4::smallint)) <= 1
        AND cardinality(array_positions(weekend_iso_days, 5::smallint)) <= 1
        AND cardinality(array_positions(weekend_iso_days, 6::smallint)) <= 1
        AND cardinality(array_positions(weekend_iso_days, 7::smallint)) <= 1
  );

ALTER TABLE calendar_entries
  ADD COLUMN IF NOT EXISTS slot text,
  ADD COLUMN IF NOT EXISTS booking_price_amount numeric(12,2),
  ADD COLUMN IF NOT EXISTS booking_price_currency text;

ALTER TABLE change_requests
  ADD COLUMN IF NOT EXISTS slot text,
  ADD COLUMN IF NOT EXISTS requested_booking_price_amount numeric(12,2),
  ADD COLUMN IF NOT EXISTS requested_booking_price_currency text,
  ADD COLUMN IF NOT EXISTS previous_booking_price_amount numeric(12,2),
  ADD COLUMN IF NOT EXISTS previous_booking_price_currency text;

-- Legacy pending requests represented the full date. Preserve that intent
-- conservatively by expanding each one into independent DAY and NIGHT requests.
-- Existing decided history remains slotless and is labelled as legacy in the UI.
CREATE TEMP TABLE legacy_pending_requests_to_expand
ON COMMIT DROP
AS
SELECT id
FROM change_requests
WHERE status = 'pending'
  AND slot IS NULL;

DROP INDEX IF EXISTS one_pending_request_per_day;
DROP INDEX IF EXISTS one_pending_request_per_slot;

UPDATE change_requests
SET slot = 'day'
WHERE status = 'pending'
  AND slot IS NULL;

INSERT INTO change_requests (
  id,
  venue_id,
  reservation_date,
  slot,
  requested_status,
  requested_note,
  requested_customer_name,
  requested_customer_phone,
  requested_deposit_amount,
  requested_booking_price_amount,
  requested_booking_price_currency,
  requested_from_time,
  requested_to_time,
  previous_status,
  previous_note,
  previous_customer_name,
  previous_customer_phone,
  previous_deposit_amount,
  previous_booking_price_amount,
  previous_booking_price_currency,
  previous_from_time,
  previous_to_time,
  requested_by_id,
  owner_id,
  status,
  decided_by_id,
  decided_at,
  decision_note,
  created_at,
  updated_at
)
SELECT
  gen_random_uuid(),
  request.venue_id,
  request.reservation_date,
  'night',
  request.requested_status,
  request.requested_note,
  request.requested_customer_name,
  request.requested_customer_phone,
  request.requested_deposit_amount,
  request.requested_booking_price_amount,
  request.requested_booking_price_currency,
  request.requested_from_time,
  request.requested_to_time,
  request.previous_status,
  request.previous_note,
  request.previous_customer_name,
  request.previous_customer_phone,
  request.previous_deposit_amount,
  request.previous_booking_price_amount,
  request.previous_booking_price_currency,
  request.previous_from_time,
  request.previous_to_time,
  request.requested_by_id,
  request.owner_id,
  request.status,
  request.decided_by_id,
  request.decided_at,
  request.decision_note,
  request.created_at,
  request.updated_at
FROM change_requests request
JOIN legacy_pending_requests_to_expand legacy ON legacy.id = request.id;

-- Capture only rows that predate slots. On a rerun, already-slot-aware DAY
-- rows are not cloned into NIGHT rows.
CREATE TEMP TABLE legacy_calendar_entries_to_expand
ON COMMIT DROP
AS
SELECT id
FROM calendar_entries
WHERE slot IS NULL;

UPDATE calendar_entries
SET slot = 'day'
WHERE slot IS NULL;

ALTER TABLE calendar_entries
  ALTER COLUMN slot SET NOT NULL,
  DROP CONSTRAINT IF EXISTS calendar_entries_slot_check,
  DROP CONSTRAINT IF EXISTS calendar_entries_venue_date_slot_key,
  ADD CONSTRAINT calendar_entries_slot_check CHECK (
    slot IN ('day', 'night')
  ),
  ADD CONSTRAINT calendar_entries_venue_date_slot_key
    UNIQUE (venue_id, reservation_date, slot);

ALTER TABLE calendar_entries
  DROP CONSTRAINT IF EXISTS calendar_entries_venue_id_reservation_date_key;

-- A legacy date was whole-day/unknown. Duplicating it is conservative: a
-- formerly booked date remains booked in both independent slots.
INSERT INTO calendar_entries (
  id,
  venue_id,
  reservation_date,
  slot,
  status,
  note,
  customer_name,
  customer_phone,
  deposit_amount,
  booking_price_amount,
  booking_price_currency,
  from_time,
  to_time,
  created_by_id,
  updated_by_id,
  created_at,
  updated_at
)
SELECT
  gen_random_uuid(),
  entry.venue_id,
  entry.reservation_date,
  'night',
  entry.status,
  entry.note,
  entry.customer_name,
  entry.customer_phone,
  entry.deposit_amount,
  NULL,
  NULL,
  entry.from_time,
  entry.to_time,
  entry.created_by_id,
  entry.updated_by_id,
  entry.created_at,
  entry.updated_at
FROM calendar_entries entry
JOIN legacy_calendar_entries_to_expand legacy ON legacy.id = entry.id
ON CONFLICT (venue_id, reservation_date, slot) DO NOTHING;

-- Snapshot the current advertised rate only where a booked legacy entry maps
-- unambiguously to one listing. Unlinked and available entries remain NULL.
UPDATE calendar_entries entry
SET booking_price_amount = CASE
      WHEN EXTRACT(ISODOW FROM entry.reservation_date)::smallint =
        ANY(listing.weekend_iso_days)
      THEN CASE entry.slot
        WHEN 'day' THEN listing.weekend_day_price_amount
        ELSE listing.weekend_night_price_amount
      END
      ELSE CASE entry.slot
        WHEN 'day' THEN listing.weekday_day_price_amount
        ELSE listing.weekday_night_price_amount
      END
    END,
    booking_price_currency = listing.price_currency
FROM public_listings listing
WHERE entry.venue_id = listing.calendar_venue_id
  AND entry.status = 'booked'
  AND entry.booking_price_amount IS NULL
  AND entry.booking_price_currency IS NULL;

-- Legacy pending requests inherit slot-specific advertised prices. This keeps
-- their approval snapshots consistent with the newly expanded calendar rows.
UPDATE change_requests request
SET requested_booking_price_amount = CASE
      WHEN EXTRACT(ISODOW FROM request.reservation_date)::smallint =
        ANY(listing.weekend_iso_days)
      THEN CASE request.slot
        WHEN 'day' THEN listing.weekend_day_price_amount
        ELSE listing.weekend_night_price_amount
      END
      ELSE CASE request.slot
        WHEN 'day' THEN listing.weekday_day_price_amount
        ELSE listing.weekday_night_price_amount
      END
    END,
    requested_booking_price_currency = listing.price_currency
FROM public_listings listing
WHERE request.venue_id = listing.calendar_venue_id
  AND request.status = 'pending'
  AND request.requested_status = 'booked'
  AND request.slot IS NOT NULL
  AND request.requested_booking_price_amount IS NULL
  AND request.requested_booking_price_currency IS NULL;

UPDATE change_requests request
SET previous_booking_price_amount = entry.booking_price_amount,
    previous_booking_price_currency = entry.booking_price_currency
FROM calendar_entries entry
WHERE request.venue_id = entry.venue_id
  AND request.reservation_date = entry.reservation_date
  AND request.slot = entry.slot
  AND request.status = 'pending'
  AND request.previous_status = 'booked'
  AND entry.status = 'booked'
  AND request.previous_booking_price_amount IS NULL
  AND request.previous_booking_price_currency IS NULL
  AND entry.booking_price_amount IS NOT NULL
  AND entry.booking_price_currency IS NOT NULL;

ALTER TABLE calendar_entries
  DROP CONSTRAINT IF EXISTS calendar_entries_booking_price_pair_check,
  DROP CONSTRAINT IF EXISTS calendar_entries_booking_price_amount_check,
  DROP CONSTRAINT IF EXISTS calendar_entries_booking_price_currency_check,
  ADD CONSTRAINT calendar_entries_booking_price_pair_check CHECK (
    (booking_price_amount IS NULL) = (booking_price_currency IS NULL)
  ),
  ADD CONSTRAINT calendar_entries_booking_price_amount_check CHECK (
    booking_price_amount IS NULL OR booking_price_amount >= 0
  ),
  ADD CONSTRAINT calendar_entries_booking_price_currency_check CHECK (
    booking_price_currency IS NULL OR char_length(booking_price_currency) = 3
  );

ALTER TABLE change_requests
  DROP CONSTRAINT IF EXISTS change_requests_slot_check,
  DROP CONSTRAINT IF EXISTS change_requests_requested_booking_price_pair_check,
  DROP CONSTRAINT IF EXISTS change_requests_requested_booking_price_amount_check,
  DROP CONSTRAINT IF EXISTS change_requests_requested_booking_price_currency_check,
  DROP CONSTRAINT IF EXISTS change_requests_previous_booking_price_pair_check,
  DROP CONSTRAINT IF EXISTS change_requests_previous_booking_price_amount_check,
  DROP CONSTRAINT IF EXISTS change_requests_previous_booking_price_currency_check,
  ADD CONSTRAINT change_requests_slot_check CHECK (
    slot IN ('day', 'night') OR (slot IS NULL AND status <> 'pending')
  ),
  ADD CONSTRAINT change_requests_requested_booking_price_pair_check CHECK (
    (requested_booking_price_amount IS NULL) =
      (requested_booking_price_currency IS NULL)
  ),
  ADD CONSTRAINT change_requests_requested_booking_price_amount_check CHECK (
    requested_booking_price_amount IS NULL OR requested_booking_price_amount >= 0
  ),
  ADD CONSTRAINT change_requests_requested_booking_price_currency_check CHECK (
    requested_booking_price_currency IS NULL OR
      char_length(requested_booking_price_currency) = 3
  ),
  ADD CONSTRAINT change_requests_previous_booking_price_pair_check CHECK (
    (previous_booking_price_amount IS NULL) =
      (previous_booking_price_currency IS NULL)
  ),
  ADD CONSTRAINT change_requests_previous_booking_price_amount_check CHECK (
    previous_booking_price_amount IS NULL OR previous_booking_price_amount >= 0
  ),
  ADD CONSTRAINT change_requests_previous_booking_price_currency_check CHECK (
    previous_booking_price_currency IS NULL OR
      char_length(previous_booking_price_currency) = 3
  );

DROP INDEX IF EXISTS one_pending_request_per_day;
DROP INDEX IF EXISTS one_pending_request_per_slot;
CREATE UNIQUE INDEX one_pending_request_per_slot
  ON change_requests (venue_id, reservation_date, slot)
  WHERE status = 'pending';

COMMIT;
