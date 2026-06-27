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
  previous_status text CHECK (previous_status IN ('booked', 'available')),
  previous_note text,
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
