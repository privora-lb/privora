CREATE EXTENSION IF NOT EXISTS pgcrypto;

CREATE TABLE IF NOT EXISTS users (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  name text NOT NULL,
  email text UNIQUE,
  phone_number text NOT NULL UNIQUE,
  password_hash text NOT NULL,
  role text NOT NULL CHECK (role IN ('superadmin', 'owner')),
  is_active boolean NOT NULL DEFAULT true,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  CONSTRAINT users_phone_number_format_check CHECK (phone_number ~ '^[0-9]{8}$')
);

CREATE TABLE IF NOT EXISTS sessions (
  token_hash text PRIMARY KEY,
  user_id uuid NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  expires_at timestamptz NOT NULL,
  created_at timestamptz NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS venue_types (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  name text NOT NULL UNIQUE,
  description text NOT NULL DEFAULT '',
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS venues (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  name text NOT NULL,
  type_id uuid NOT NULL REFERENCES venue_types(id) ON DELETE RESTRICT,
  assigned_user_id uuid NOT NULL REFERENCES users(id) ON DELETE RESTRICT,
  description text NOT NULL DEFAULT '',
  created_by_id uuid NOT NULL REFERENCES users(id) ON DELETE RESTRICT,
  is_active boolean NOT NULL DEFAULT true,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS calendar_entries (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  venue_id uuid NOT NULL REFERENCES venues(id) ON DELETE CASCADE,
  reservation_date date NOT NULL,
  slot text NOT NULL CHECK (slot IN ('day', 'night')),
  status text NOT NULL CHECK (status IN ('booked', 'available')),
  note text NOT NULL DEFAULT '',
  customer_name text NOT NULL DEFAULT '',
  customer_phone text NOT NULL DEFAULT '',
  deposit_amount numeric(12,2),
  booking_price_amount numeric(12,2),
  booking_price_currency text,
  from_time time,
  to_time time,
  created_by_id uuid NOT NULL REFERENCES users(id) ON DELETE RESTRICT,
  updated_by_id uuid NOT NULL REFERENCES users(id) ON DELETE RESTRICT,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  CONSTRAINT calendar_entries_venue_date_slot_key
    UNIQUE (venue_id, reservation_date, slot),
  CONSTRAINT calendar_entries_booking_price_pair_check CHECK (
    (booking_price_amount IS NULL) = (booking_price_currency IS NULL)
  ),
  CONSTRAINT calendar_entries_booking_price_amount_check CHECK (
    booking_price_amount IS NULL OR booking_price_amount >= 0
  ),
  CONSTRAINT calendar_entries_booking_price_currency_check CHECK (
    booking_price_currency IS NULL OR char_length(booking_price_currency) = 3
  )
);

CREATE TABLE IF NOT EXISTS change_requests (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  venue_id uuid NOT NULL REFERENCES venues(id) ON DELETE CASCADE,
  reservation_date date NOT NULL,
  slot text,
  requested_status text NOT NULL CHECK (requested_status IN ('booked', 'available')),
  requested_note text NOT NULL DEFAULT '',
  requested_customer_name text NOT NULL DEFAULT '',
  requested_customer_phone text NOT NULL DEFAULT '',
  requested_deposit_amount numeric(12,2),
  requested_booking_price_amount numeric(12,2),
  requested_booking_price_currency text,
  requested_from_time time,
  requested_to_time time,
  previous_status text CHECK (previous_status IN ('booked', 'available')),
  previous_note text,
  previous_customer_name text,
  previous_customer_phone text,
  previous_deposit_amount numeric(12,2),
  previous_booking_price_amount numeric(12,2),
  previous_booking_price_currency text,
  previous_from_time time,
  previous_to_time time,
  requested_by_id uuid NOT NULL REFERENCES users(id) ON DELETE RESTRICT,
  owner_id uuid NOT NULL REFERENCES users(id) ON DELETE RESTRICT,
  status text NOT NULL DEFAULT 'pending' CHECK (status IN ('pending', 'approved', 'rejected')),
  decided_by_id uuid REFERENCES users(id) ON DELETE RESTRICT,
  decided_at timestamptz,
  decision_note text NOT NULL DEFAULT '',
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  CONSTRAINT change_requests_slot_check CHECK (
    slot IN ('day', 'night') OR (slot IS NULL AND status <> 'pending')
  ),
  CONSTRAINT change_requests_requested_booking_price_pair_check CHECK (
    (requested_booking_price_amount IS NULL) =
      (requested_booking_price_currency IS NULL)
  ),
  CONSTRAINT change_requests_requested_booking_price_amount_check CHECK (
    requested_booking_price_amount IS NULL OR requested_booking_price_amount >= 0
  ),
  CONSTRAINT change_requests_requested_booking_price_currency_check CHECK (
    requested_booking_price_currency IS NULL OR
      char_length(requested_booking_price_currency) = 3
  ),
  CONSTRAINT change_requests_previous_booking_price_pair_check CHECK (
    (previous_booking_price_amount IS NULL) =
      (previous_booking_price_currency IS NULL)
  ),
  CONSTRAINT change_requests_previous_booking_price_amount_check CHECK (
    previous_booking_price_amount IS NULL OR previous_booking_price_amount >= 0
  ),
  CONSTRAINT change_requests_previous_booking_price_currency_check CHECK (
    previous_booking_price_currency IS NULL OR
      char_length(previous_booking_price_currency) = 3
  )
);

CREATE INDEX IF NOT EXISTS venues_assigned_user_idx ON venues (assigned_user_id);
CREATE INDEX IF NOT EXISTS entries_venue_date_idx ON calendar_entries (venue_id, reservation_date);
CREATE INDEX IF NOT EXISTS requests_owner_status_idx ON change_requests (owner_id, status);
CREATE INDEX IF NOT EXISTS requests_superadmin_status_idx ON change_requests (requested_by_id, status);

ALTER TABLE users
  ADD COLUMN IF NOT EXISTS is_active boolean NOT NULL DEFAULT true;

ALTER TABLE users
  ADD COLUMN IF NOT EXISTS phone_number text;

WITH numbered_users AS (
  SELECT
    id,
    (70000000 + row_number() OVER (ORDER BY created_at, id))::text AS generated_phone
  FROM users
  WHERE phone_number IS NULL
)
UPDATE users u
SET phone_number = numbered_users.generated_phone
FROM numbered_users
WHERE u.id = numbered_users.id;

ALTER TABLE users
  ALTER COLUMN email DROP NOT NULL;

ALTER TABLE users
  ALTER COLUMN phone_number SET NOT NULL;

ALTER TABLE venues
  ADD COLUMN IF NOT EXISTS is_active boolean NOT NULL DEFAULT true;

ALTER TABLE calendar_entries
  ADD COLUMN IF NOT EXISTS customer_name text NOT NULL DEFAULT '',
  ADD COLUMN IF NOT EXISTS customer_phone text NOT NULL DEFAULT '',
  ADD COLUMN IF NOT EXISTS deposit_amount numeric(12,2),
  ADD COLUMN IF NOT EXISTS slot text,
  ADD COLUMN IF NOT EXISTS booking_price_amount numeric(12,2),
  ADD COLUMN IF NOT EXISTS booking_price_currency text,
  ADD COLUMN IF NOT EXISTS from_time time,
  ADD COLUMN IF NOT EXISTS to_time time;

ALTER TABLE change_requests
  ADD COLUMN IF NOT EXISTS requested_customer_name text NOT NULL DEFAULT '',
  ADD COLUMN IF NOT EXISTS requested_customer_phone text NOT NULL DEFAULT '',
  ADD COLUMN IF NOT EXISTS requested_deposit_amount numeric(12,2),
  ADD COLUMN IF NOT EXISTS slot text,
  ADD COLUMN IF NOT EXISTS requested_booking_price_amount numeric(12,2),
  ADD COLUMN IF NOT EXISTS requested_booking_price_currency text,
  ADD COLUMN IF NOT EXISTS requested_from_time time,
  ADD COLUMN IF NOT EXISTS requested_to_time time,
  ADD COLUMN IF NOT EXISTS previous_customer_name text,
  ADD COLUMN IF NOT EXISTS previous_customer_phone text,
  ADD COLUMN IF NOT EXISTS previous_deposit_amount numeric(12,2),
  ADD COLUMN IF NOT EXISTS previous_booking_price_amount numeric(12,2),
  ADD COLUMN IF NOT EXISTS previous_booking_price_currency text,
  ADD COLUMN IF NOT EXISTS previous_from_time time,
  ADD COLUMN IF NOT EXISTS previous_to_time time;

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1
    FROM pg_constraint
    WHERE conname = 'users_phone_number_format_check'
  ) THEN
    ALTER TABLE users
      ADD CONSTRAINT users_phone_number_format_check
      CHECK (phone_number ~ '^[0-9]{8}$');
  END IF;
END $$;

CREATE INDEX IF NOT EXISTS users_role_active_idx ON users (role, is_active);
CREATE UNIQUE INDEX IF NOT EXISTS users_phone_number_unique_idx ON users (phone_number);
CREATE UNIQUE INDEX IF NOT EXISTS users_email_lower_unique_idx
  ON users (lower(email))
  WHERE email IS NOT NULL;
CREATE UNIQUE INDEX IF NOT EXISTS users_name_lower_unique_idx ON users (lower(name));
CREATE INDEX IF NOT EXISTS venues_assigned_active_idx ON venues (assigned_user_id, is_active);

CREATE TABLE IF NOT EXISTS public_listings (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  name text NOT NULL,
  slug text NOT NULL UNIQUE,
  price_amount numeric(12,2) NOT NULL CHECK (price_amount >= 0),
  price_currency text NOT NULL DEFAULT 'USD' CHECK (char_length(price_currency) = 3),
  weekday_day_price_amount numeric(12,2) NOT NULL,
  weekday_night_price_amount numeric(12,2) NOT NULL,
  weekend_day_price_amount numeric(12,2) NOT NULL,
  weekend_night_price_amount numeric(12,2) NOT NULL,
  weekend_iso_days smallint[] NOT NULL DEFAULT ARRAY[6, 7]::smallint[],
  location_name text NOT NULL,
  google_maps_url text NOT NULL,
  pool_capacity integer NOT NULL CHECK (pool_capacity >= 0),
  stay_capacity integer NOT NULL CHECK (stay_capacity >= 0),
  day_check_in time NOT NULL,
  day_check_out time NOT NULL,
  night_check_in time NOT NULL,
  night_check_out time NOT NULL,
  has_wifi boolean NOT NULL DEFAULT false,
  description text NOT NULL,
  bedrooms integer NOT NULL CHECK (bedrooms >= 0),
  toilets integer NOT NULL CHECK (toilets >= 0),
  pool_length_m numeric(6,2) NOT NULL CHECK (pool_length_m > 0),
  pool_width_m numeric(6,2) NOT NULL CHECK (pool_width_m > 0),
  pool_depth_m numeric(6,2) NOT NULL CHECK (pool_depth_m > 0),
  phone_number text NOT NULL,
  whatsapp_number text NOT NULL,
  instagram_url text,
  facebook_url text,
  tiktok_url text,
  website_url text,
  youtube_url text,
  calendar_venue_id uuid UNIQUE REFERENCES venues(id) ON DELETE SET NULL,
  is_published boolean NOT NULL DEFAULT false,
  created_by_id uuid NOT NULL REFERENCES users(id) ON DELETE RESTRICT,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  CONSTRAINT public_listings_weekday_day_price_amount_check CHECK (
    weekday_day_price_amount >= 0
  ),
  CONSTRAINT public_listings_weekday_night_price_amount_check CHECK (
    weekday_night_price_amount >= 0
  ),
  CONSTRAINT public_listings_weekend_day_price_amount_check CHECK (
    weekend_day_price_amount >= 0
  ),
  CONSTRAINT public_listings_weekend_night_price_amount_check CHECK (
    weekend_night_price_amount >= 0
  ),
  CONSTRAINT public_listings_weekend_iso_days_check CHECK (
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
  )
);

-- Expand the legacy single-price, whole-day calendar model. Existing
-- whole-day bookings and pending requests are conservatively copied to both
-- slots so migration never opens availability that was previously blocked.
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

CREATE TABLE IF NOT EXISTS listing_image_assets (
  id uuid PRIMARY KEY,
  object_path text NOT NULL UNIQUE,
  image_url text NOT NULL UNIQUE,
  content_type text NOT NULL CHECK (
    content_type IN ('image/jpeg', 'image/png', 'image/webp')
  ),
  uploaded_by_id uuid NOT NULL REFERENCES users(id) ON DELETE RESTRICT,
  listing_id uuid REFERENCES public_listings(id) ON DELETE SET NULL,
  state text NOT NULL CHECK (
    state IN ('uploading', 'pending', 'attached', 'delete_pending', 'deleting')
  ),
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE listing_image_assets ENABLE ROW LEVEL SECURITY;

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1
    FROM pg_constraint
    WHERE conname = 'listing_image_assets_state_listing_check'
      AND conrelid = 'listing_image_assets'::regclass
  ) THEN
    ALTER TABLE listing_image_assets
      ADD CONSTRAINT listing_image_assets_state_listing_check
      CHECK ((state = 'attached') = (listing_id IS NOT NULL));
  END IF;
END $$;

CREATE TABLE IF NOT EXISTS public_listing_images (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  listing_id uuid NOT NULL REFERENCES public_listings(id) ON DELETE CASCADE,
  storage_asset_id uuid REFERENCES listing_image_assets(id) ON DELETE RESTRICT,
  image_url text NOT NULL,
  alt_text text NOT NULL DEFAULT '',
  position integer NOT NULL CHECK (position >= 0),
  UNIQUE (listing_id, position)
);

ALTER TABLE public_listing_images
  ADD COLUMN IF NOT EXISTS storage_asset_id uuid
  REFERENCES listing_image_assets(id) ON DELETE RESTRICT;

ALTER TABLE public_listing_images ENABLE ROW LEVEL SECURITY;

CREATE OR REPLACE FUNCTION enforce_listing_image_asset_reference()
RETURNS trigger
LANGUAGE plpgsql
AS $$
BEGIN
  IF NEW.storage_asset_id IS NOT NULL AND NOT EXISTS (
    SELECT 1
    FROM listing_image_assets asset
    WHERE asset.id = NEW.storage_asset_id
      AND asset.state = 'attached'
      AND asset.listing_id = NEW.listing_id
  ) THEN
    RAISE EXCEPTION 'Managed listing image asset must be attached to this listing.'
      USING ERRCODE = '23503';
  END IF;

  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS public_listing_images_asset_reference_trigger
  ON public_listing_images;
CREATE TRIGGER public_listing_images_asset_reference_trigger
BEFORE INSERT OR UPDATE OF listing_id, storage_asset_id
ON public_listing_images
FOR EACH ROW
EXECUTE FUNCTION enforce_listing_image_asset_reference();

CREATE TABLE IF NOT EXISTS public_listing_inclusions (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  listing_id uuid NOT NULL REFERENCES public_listings(id) ON DELETE CASCADE,
  label text NOT NULL,
  details text NOT NULL DEFAULT '',
  position integer NOT NULL CHECK (position >= 0),
  UNIQUE (listing_id, position)
);

CREATE TABLE IF NOT EXISTS public_listing_rules (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  listing_id uuid NOT NULL REFERENCES public_listings(id) ON DELETE CASCADE,
  rule_text text NOT NULL,
  position integer NOT NULL CHECK (position >= 0),
  UNIQUE (listing_id, position)
);

CREATE INDEX IF NOT EXISTS public_listings_published_idx
  ON public_listings (is_published, updated_at DESC);
CREATE INDEX IF NOT EXISTS public_listing_images_listing_idx
  ON public_listing_images (listing_id, position);
CREATE UNIQUE INDEX IF NOT EXISTS public_listing_images_storage_asset_unique_idx
  ON public_listing_images (storage_asset_id)
  WHERE storage_asset_id IS NOT NULL;
CREATE INDEX IF NOT EXISTS listing_image_assets_state_updated_idx
  ON listing_image_assets (state, updated_at);
CREATE INDEX IF NOT EXISTS listing_image_assets_listing_idx
  ON listing_image_assets (listing_id)
  WHERE listing_id IS NOT NULL;
CREATE INDEX IF NOT EXISTS public_listing_inclusions_listing_idx
  ON public_listing_inclusions (listing_id, position);
CREATE INDEX IF NOT EXISTS public_listing_rules_listing_idx
  ON public_listing_rules (listing_id, position);
