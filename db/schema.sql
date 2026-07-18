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
  status text NOT NULL CHECK (status IN ('booked', 'available')),
  note text NOT NULL DEFAULT '',
  customer_name text NOT NULL DEFAULT '',
  customer_phone text NOT NULL DEFAULT '',
  deposit_amount numeric(12,2),
  from_time time,
  to_time time,
  created_by_id uuid NOT NULL REFERENCES users(id) ON DELETE RESTRICT,
  updated_by_id uuid NOT NULL REFERENCES users(id) ON DELETE RESTRICT,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (venue_id, reservation_date)
);

CREATE TABLE IF NOT EXISTS change_requests (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  venue_id uuid NOT NULL REFERENCES venues(id) ON DELETE CASCADE,
  reservation_date date NOT NULL,
  requested_status text NOT NULL CHECK (requested_status IN ('booked', 'available')),
  requested_note text NOT NULL DEFAULT '',
  requested_customer_name text NOT NULL DEFAULT '',
  requested_customer_phone text NOT NULL DEFAULT '',
  requested_deposit_amount numeric(12,2),
  requested_from_time time,
  requested_to_time time,
  previous_status text CHECK (previous_status IN ('booked', 'available')),
  previous_note text,
  previous_customer_name text,
  previous_customer_phone text,
  previous_deposit_amount numeric(12,2),
  previous_from_time time,
  previous_to_time time,
  requested_by_id uuid NOT NULL REFERENCES users(id) ON DELETE RESTRICT,
  owner_id uuid NOT NULL REFERENCES users(id) ON DELETE RESTRICT,
  status text NOT NULL DEFAULT 'pending' CHECK (status IN ('pending', 'approved', 'rejected')),
  decided_by_id uuid REFERENCES users(id) ON DELETE RESTRICT,
  decided_at timestamptz,
  decision_note text NOT NULL DEFAULT '',
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

CREATE UNIQUE INDEX IF NOT EXISTS one_pending_request_per_day
  ON change_requests (venue_id, reservation_date)
  WHERE status = 'pending';

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
  ADD COLUMN IF NOT EXISTS from_time time,
  ADD COLUMN IF NOT EXISTS to_time time;

ALTER TABLE change_requests
  ADD COLUMN IF NOT EXISTS requested_customer_name text NOT NULL DEFAULT '',
  ADD COLUMN IF NOT EXISTS requested_customer_phone text NOT NULL DEFAULT '',
  ADD COLUMN IF NOT EXISTS requested_deposit_amount numeric(12,2),
  ADD COLUMN IF NOT EXISTS requested_from_time time,
  ADD COLUMN IF NOT EXISTS requested_to_time time,
  ADD COLUMN IF NOT EXISTS previous_customer_name text,
  ADD COLUMN IF NOT EXISTS previous_customer_phone text,
  ADD COLUMN IF NOT EXISTS previous_deposit_amount numeric(12,2),
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
  updated_at timestamptz NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS public_listing_images (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  listing_id uuid NOT NULL REFERENCES public_listings(id) ON DELETE CASCADE,
  image_url text NOT NULL,
  alt_text text NOT NULL DEFAULT '',
  position integer NOT NULL CHECK (position >= 0),
  UNIQUE (listing_id, position)
);

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
CREATE INDEX IF NOT EXISTS public_listing_inclusions_listing_idx
  ON public_listing_inclusions (listing_id, position);
CREATE INDEX IF NOT EXISTS public_listing_rules_listing_idx
  ON public_listing_rules (listing_id, position);
