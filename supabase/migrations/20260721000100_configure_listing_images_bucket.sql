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

-- The application accesses this table through its direct server-side database
-- connection. Keep it inaccessible through Supabase's public Data API.
ALTER TABLE listing_image_assets ENABLE ROW LEVEL SECURITY;
REVOKE ALL ON TABLE listing_image_assets FROM anon, authenticated;

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

ALTER TABLE public_listing_images
  ADD COLUMN IF NOT EXISTS storage_asset_id uuid
  REFERENCES listing_image_assets(id) ON DELETE RESTRICT;

-- Listing image rows are also server-owned. Deny Data API writes so a caller
-- cannot create a reference while an object is being removed.
ALTER TABLE public_listing_images ENABLE ROW LEVEL SECURITY;
REVOKE ALL ON TABLE public_listing_images FROM anon, authenticated;

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

CREATE UNIQUE INDEX IF NOT EXISTS public_listing_images_storage_asset_unique_idx
  ON public_listing_images (storage_asset_id)
  WHERE storage_asset_id IS NOT NULL;

CREATE INDEX IF NOT EXISTS listing_image_assets_state_updated_idx
  ON listing_image_assets (state, updated_at);

CREATE INDEX IF NOT EXISTS listing_image_assets_listing_idx
  ON listing_image_assets (listing_id)
  WHERE listing_id IS NOT NULL;

-- Adopt legacy images only when the exact UUID object exists in this project's
-- bucket and is referenced by one listing image row. External/demo URLs remain
-- intentionally unmanaged.
WITH legacy_candidates AS (
  SELECT
    image.id AS image_row_id,
    image.image_url,
    image.listing_id,
    listing.created_by_id AS uploaded_by_id,
    object.name AS object_path,
    count(*) OVER (PARTITION BY object.name) AS reference_count
  FROM public_listing_images image
  JOIN public_listings listing ON listing.id = image.listing_id
  JOIN storage.objects object
    ON object.bucket_id = 'listing-images'
   AND object.name ~* '^[0-9a-f]{8}-[0-9a-f]{4}-[1-8][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}\.(jpg|png|webp)$'
   AND image.image_url LIKE
     '%/storage/v1/object/public/listing-images/' || object.name
  WHERE image.storage_asset_id IS NULL
)
INSERT INTO listing_image_assets (
  id,
  object_path,
  image_url,
  content_type,
  uploaded_by_id,
  listing_id,
  state
)
SELECT
  regexp_replace(object_path, '\.(jpg|png|webp)$', '', 'i')::uuid,
  object_path,
  image_url,
  CASE lower(split_part(object_path, '.', 2))
    WHEN 'jpg' THEN 'image/jpeg'
    WHEN 'png' THEN 'image/png'
    ELSE 'image/webp'
  END,
  uploaded_by_id,
  listing_id,
  'attached'
FROM legacy_candidates
WHERE reference_count = 1
ON CONFLICT DO NOTHING;

UPDATE public_listing_images image
SET storage_asset_id = asset.id
FROM listing_image_assets asset
WHERE image.storage_asset_id IS NULL
  AND asset.state = 'attached'
  AND asset.listing_id = image.listing_id
  AND asset.image_url = image.image_url;

-- Production listing images are intentionally public because they appear on
-- public listing pages. Mutations still require the server-side secret key.
INSERT INTO storage.buckets (
  id,
  name,
  public,
  file_size_limit,
  allowed_mime_types
)
VALUES (
  'listing-images',
  'listing-images',
  true,
  4194304,
  ARRAY['image/jpeg', 'image/png', 'image/webp']::text[]
)
ON CONFLICT (id) DO UPDATE
SET public = EXCLUDED.public,
    file_size_limit = EXCLUDED.file_size_limit,
    allowed_mime_types = EXCLUDED.allowed_mime_types;
