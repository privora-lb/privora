"use server";

import { revalidatePath } from "next/cache";
import { after } from "next/server";
import type { PoolClient } from "pg";

import type { ListingFormState } from "@/features/listings/types";
import { parseListingInput } from "@/features/listings/listing-form-data";
import { requireSuperadmin } from "@/lib/auth";
import { transaction } from "@/lib/db";
import { getActionErrorMessage, getFormString } from "@/lib/forms";
import { purgeDeletePendingImageAssets } from "@/lib/listing-image-assets";

type ActionResult = { message: string; ok: boolean };

type ExistingListingImageRow = {
  alt_text: string;
  id: string;
  image_url: string;
  position: number;
  storage_asset_id: string | null;
};

type ListingImageAssetRow = {
  id: string;
  image_url: string;
  listing_id: string | null;
  state: "attached" | "delete_pending" | "deleting" | "pending" | "uploading";
  uploaded_by_id: string;
};

type ResolvedListingImage = {
  altText: string;
  imageUrl: string;
  storageAssetId: string | null;
};

export async function saveListingAction(
  _previousState: ListingFormState,
  formData: FormData,
): Promise<ListingFormState> {
  const user = await requireSuperadmin();
  const { errors, input } = parseListingInput(formData);

  if (Object.keys(errors).length) {
    return {
      fieldErrors: errors,
      message: Object.values(errors)[0],
      ok: false,
    };
  }

  try {
    const result = await transaction(async (client) => {
      let previousSlug = "";
      let existingImages: ExistingListingImageRow[] = [];

      if (input.id) {
        const existing = await client.query<{ slug: string }>(
          "SELECT slug FROM public_listings WHERE id = $1 FOR UPDATE",
          [input.id],
        );

        if (!existing.rows[0]) {
          throw new Error("Listing was not found.");
        }

        previousSlug = existing.rows[0].slug;
        const previousImages = await client.query<ExistingListingImageRow>(
          `SELECT id, storage_asset_id, image_url, alt_text, position
           FROM public_listing_images
           WHERE listing_id = $1
           ORDER BY position`,
          [input.id],
        );
        existingImages = previousImages.rows;
      }

      if (input.calendarVenueId) {
        const eligibleVenue = await client.query<{ id: string }>(
          `SELECT v.id
           FROM venues v
           JOIN users u ON u.id = v.assigned_user_id
           WHERE v.id = $1
             AND v.is_active = true
             AND u.is_active = true
             AND NOT EXISTS (
               SELECT 1 FROM public_listings other
               WHERE other.calendar_venue_id = v.id
                 AND other.id <> COALESCE(NULLIF($2, '')::uuid, gen_random_uuid())
             )
           LIMIT 1`,
          [input.calendarVenueId, input.id],
        );

        if (!eligibleVenue.rows[0]) {
          throw new Error(
            "Select an active venue assigned to an active user that is not linked elsewhere.",
          );
        }
      }

      const values = getListingValues(input, user.id);
      const listingResult = input.id
        ? await client.query<{ id: string }>(
            `UPDATE public_listings SET
              name = $1, slug = $2,
              weekday_day_price_amount = $3,
              weekday_night_price_amount = $4,
              weekend_day_price_amount = $5,
              weekend_night_price_amount = $6,
              price_amount = LEAST($3, $4, $5, $6),
              weekend_iso_days = $7::smallint[], price_currency = $8,
              location_name = $9, google_maps_url = $10,
              pool_capacity = $11, stay_capacity = $12,
              day_check_in = $13::time, day_check_out = $14::time,
              night_check_in = $15::time, night_check_out = $16::time,
              has_wifi = $17, description = $18, bedrooms = $19,
              toilets = $20, pool_length_m = $21, pool_width_m = $22,
              pool_depth_m = $23, phone_number = $24,
              whatsapp_number = $25, instagram_url = $26,
              facebook_url = $27, tiktok_url = $28, website_url = $29,
              youtube_url = $30, calendar_venue_id = $31,
              is_published = $32, updated_at = now()
             WHERE id = $33
             RETURNING id`,
            [...values.slice(0, 32), input.id],
          )
        : await client.query<{ id: string }>(
            `INSERT INTO public_listings (
              name, slug, weekday_day_price_amount, weekday_night_price_amount,
              weekend_day_price_amount, weekend_night_price_amount,
              price_amount, weekend_iso_days, price_currency, location_name, google_maps_url,
              pool_capacity, stay_capacity, day_check_in, day_check_out,
              night_check_in, night_check_out, has_wifi, description, bedrooms,
              toilets, pool_length_m, pool_width_m, pool_depth_m, phone_number,
              whatsapp_number, instagram_url, facebook_url, tiktok_url,
              website_url, youtube_url, calendar_venue_id, is_published,
              created_by_id
             ) VALUES (
              $1, $2, $3, $4, $5, $6, LEAST($3, $4, $5, $6),
              $7::smallint[], $8, $9, $10, $11,
              $12, $13::time, $14::time, $15::time, $16::time, $17, $18,
              $19, $20, $21, $22, $23, $24, $25, $26, $27, $28, $29, $30,
              $31, $32, $33
             ) RETURNING id`,
            values,
          );
      const listingId = listingResult.rows[0]?.id;

      if (!listingId) {
        throw new Error("Listing could not be saved.");
      }

      const resolvedImages = await resolveListingImages(
        client,
        listingId,
        input.images,
        existingImages,
        user.id,
      );
      await replaceListingChildren(client, listingId, input, resolvedImages.images);

      return {
        listingId,
        previousSlug,
        removedStorageAssetIds: resolvedImages.removedStorageAssetIds,
      };
    });
    scheduleListingImageCleanup(result.removedStorageAssetIds);
    revalidateListingPaths(input.slug, result.previousSlug);

    return {
      listingId: result.listingId,
      message: input.id
        ? "Listing updated successfully."
        : "Listing created successfully.",
      ok: true,
    };
  } catch (error) {
    const saveError = getListingSaveError(error);

    return {
      fieldErrors: saveError.fieldErrors,
      message: saveError.message,
      ok: false,
    };
  }
}

export async function deleteListingInlineAction(
  formData: FormData,
): Promise<ActionResult> {
  await requireSuperadmin();
  const id = getFormString(formData, "id");

  try {
    const deletedListing = await transaction(async (client) => {
      const listingResult = await client.query<{ slug: string }>(
        "SELECT slug FROM public_listings WHERE id = $1 FOR UPDATE",
        [id],
      );

      if (!listingResult.rows[0]) {
        throw new Error("Listing was not found.");
      }

      const imageResult = await client.query<{ storage_asset_id: string }>(
        `SELECT storage_asset_id
         FROM public_listing_images
         WHERE listing_id = $1
           AND storage_asset_id IS NOT NULL`,
        [id],
      );
      const storageAssetIds = [
        ...new Set(imageResult.rows.map((row) => row.storage_asset_id)),
      ];

      if (storageAssetIds.length) {
        const assets = await client.query<{ id: string }>(
          `SELECT id
           FROM listing_image_assets
           WHERE id = ANY($1::uuid[])
             AND listing_id = $2
             AND state = 'attached'
           FOR UPDATE`,
          [storageAssetIds, id],
        );

        if (assets.rows.length !== storageAssetIds.length) {
          throw new Error("A listing image is no longer available.");
        }

        await client.query(
          `UPDATE listing_image_assets
           SET state = 'delete_pending', listing_id = NULL, updated_at = now()
           WHERE id = ANY($1::uuid[])`,
          [storageAssetIds],
        );
      }

      await client.query("DELETE FROM public_listings WHERE id = $1", [id]);

      return {
        storageAssetIds,
        slug: listingResult.rows[0].slug,
      };
    });

    scheduleListingImageCleanup(deletedListing.storageAssetIds);
    revalidateListingPaths(deletedListing.slug);
    return { message: "Listing deleted successfully.", ok: true };
  } catch (error) {
    return {
      message: getActionErrorMessage(error, "Listing could not be deleted."),
      ok: false,
    };
  }
}

export async function toggleListingPublishedInlineAction(
  formData: FormData,
): Promise<ActionResult> {
  await requireSuperadmin();
  const id = getFormString(formData, "id");
  const isPublished = getFormString(formData, "isPublished") === "true";

  try {
    const result = await transaction((client) =>
      client.query<{ slug: string }>(
        `UPDATE public_listings
         SET is_published = $2, updated_at = now()
         WHERE id = $1
         RETURNING slug`,
        [id, isPublished],
      ),
    );
    const slug = result.rows[0]?.slug;

    if (!slug) {
      throw new Error("Listing was not found.");
    }

    revalidateListingPaths(slug);
    return {
      message: isPublished ? "Listing published." : "Listing moved to draft.",
      ok: true,
    };
  } catch (error) {
    return {
      message: getActionErrorMessage(error, "Listing status could not be updated."),
      ok: false,
    };
  }
}

async function resolveListingImages(
  client: PoolClient,
  listingId: string,
  requestedImages: ReturnType<typeof parseListingInput>["input"]["images"],
  existingImages: ExistingListingImageRow[],
  userId: string,
) {
  const requestedStorageAssetIds = requestedImages
    .map((image) => image.storageAssetId)
    .filter(Boolean);
  const uniqueRequestedAssetIds = [...new Set(requestedStorageAssetIds)];

  if (requestedStorageAssetIds.length !== uniqueRequestedAssetIds.length) {
    throw new Error("An uploaded image is no longer available.");
  }

  const assetResult = uniqueRequestedAssetIds.length
    ? await client.query<ListingImageAssetRow>(
        `SELECT id, image_url, uploaded_by_id, listing_id, state
         FROM listing_image_assets
         WHERE id = ANY($1::uuid[])
         FOR UPDATE`,
        [uniqueRequestedAssetIds],
      )
    : { rows: [] as ListingImageAssetRow[] };
  const assetsById = new Map(assetResult.rows.map((asset) => [asset.id, asset]));
  const existingManagedIds = new Set(
    existingImages
      .map((image) => image.storage_asset_id)
      .filter((assetId): assetId is string => Boolean(assetId)),
  );
  const existingUnmanagedCounts = new Map<string, number>();

  for (const image of existingImages) {
    if (!image.storage_asset_id) {
      existingUnmanagedCounts.set(
        image.image_url,
        (existingUnmanagedCounts.get(image.image_url) ?? 0) + 1,
      );
    }
  }

  const newlyAttachedIds: string[] = [];
  const selectedManagedIds = new Set<string>();
  const images: ResolvedListingImage[] = [];

  for (const image of requestedImages) {
    if (!image.storageAssetId) {
      const remainingCount = existingUnmanagedCounts.get(image.imageUrl) ?? 0;

      if (!remainingCount) {
        throw new Error("An uploaded image is no longer available.");
      }

      existingUnmanagedCounts.set(image.imageUrl, remainingCount - 1);
      images.push({
        altText: image.altText,
        imageUrl: image.imageUrl,
        storageAssetId: null,
      });
      continue;
    }

    const asset = assetsById.get(image.storageAssetId);

    if (!asset) {
      throw new Error("An uploaded image is no longer available.");
    }

    if (existingManagedIds.has(asset.id)) {
      if (asset.state !== "attached" || asset.listing_id !== listingId) {
        throw new Error("An uploaded image is no longer available.");
      }
    } else {
      if (
        asset.state !== "pending" ||
        asset.listing_id ||
        asset.uploaded_by_id !== userId
      ) {
        throw new Error("An uploaded image is no longer available.");
      }

      newlyAttachedIds.push(asset.id);
    }

    selectedManagedIds.add(asset.id);
    images.push({
      altText: image.altText,
      imageUrl: asset.image_url,
      storageAssetId: asset.id,
    });
  }

  if (newlyAttachedIds.length) {
    const attached = await client.query<{ id: string }>(
      `UPDATE listing_image_assets
       SET state = 'attached', listing_id = $2, updated_at = now()
       WHERE id = ANY($1::uuid[])
         AND state = 'pending'
         AND listing_id IS NULL
       RETURNING id`,
      [newlyAttachedIds, listingId],
    );

    if (attached.rows.length !== newlyAttachedIds.length) {
      throw new Error("An uploaded image is no longer available.");
    }
  }

  const removedStorageAssetIds = [...existingManagedIds].filter(
    (assetId) => !selectedManagedIds.has(assetId),
  );

  if (removedStorageAssetIds.length) {
    const removed = await client.query<{ id: string }>(
      `UPDATE listing_image_assets
       SET state = 'delete_pending', listing_id = NULL, updated_at = now()
       WHERE id = ANY($1::uuid[])
         AND state = 'attached'
         AND listing_id = $2
       RETURNING id`,
      [removedStorageAssetIds, listingId],
    );

    if (removed.rows.length !== removedStorageAssetIds.length) {
      throw new Error("An uploaded image is no longer available.");
    }
  }

  return { images, removedStorageAssetIds };
}

function getListingValues(
  input: ReturnType<typeof parseListingInput>["input"],
  userId: string,
) {
  return [
    input.name,
    input.slug,
    input.weekdayDayPriceAmount,
    input.weekdayNightPriceAmount,
    input.weekendDayPriceAmount,
    input.weekendNightPriceAmount,
    input.weekendIsoDays,
    input.priceCurrency,
    input.locationName,
    input.googleMapsUrl,
    input.poolCapacity,
    input.stayCapacity,
    input.dayCheckIn,
    input.dayCheckOut,
    input.nightCheckIn,
    input.nightCheckOut,
    input.hasWifi,
    input.description,
    input.bedrooms,
    input.toilets,
    input.poolLengthM,
    input.poolWidthM,
    input.poolDepthM,
    input.phoneNumber,
    input.whatsappNumber,
    input.instagramUrl || null,
    input.facebookUrl || null,
    input.tiktokUrl || null,
    input.websiteUrl || null,
    input.youtubeUrl || null,
    input.calendarVenueId || null,
    input.isPublished,
    userId,
  ];
}

async function replaceListingChildren(
  client: PoolClient,
  listingId: string,
  input: ReturnType<typeof parseListingInput>["input"],
  images: ResolvedListingImage[],
) {
  await client.query("DELETE FROM public_listing_images WHERE listing_id = $1", [
    listingId,
  ]);
  await client.query(
    "DELETE FROM public_listing_inclusions WHERE listing_id = $1",
    [listingId],
  );
  await client.query("DELETE FROM public_listing_rules WHERE listing_id = $1", [
    listingId,
  ]);

  for (const [position, image] of images.entries()) {
    await client.query(
      `INSERT INTO public_listing_images
        (listing_id, storage_asset_id, image_url, alt_text, position)
       VALUES ($1, $2, $3, $4, $5)`,
      [
        listingId,
        image.storageAssetId,
        image.imageUrl,
        image.altText,
        position,
      ],
    );
  }

  for (const [position, item] of input.inclusions.entries()) {
    await client.query(
      `INSERT INTO public_listing_inclusions
        (listing_id, label, details, position)
       VALUES ($1, $2, $3, $4)`,
      [listingId, item.label, item.details, position],
    );
  }

  for (const [position, rule] of input.rules.entries()) {
    await client.query(
      `INSERT INTO public_listing_rules
        (listing_id, rule_text, position)
       VALUES ($1, $2, $3)`,
      [listingId, rule.text, position],
    );
  }
}

function revalidateListingPaths(slug: string, previousSlug = "") {
  revalidatePath("/listings");
  revalidatePath("/listing");
  revalidatePath(`/listing/${slug}`);

  if (previousSlug && previousSlug !== slug) {
    revalidatePath(`/listing/${previousSlug}`);
  }
}

function scheduleListingImageCleanup(storageAssetIds: string[]) {
  if (storageAssetIds.length) {
    after(() => purgeDeletePendingImageAssets(storageAssetIds));
  }
}

function getListingSaveError(error: unknown): {
  fieldErrors?: Record<string, string>;
  message: string;
} {
  const databaseError = error as { code?: string; constraint?: string };

  if (databaseError.code === "23505") {
    if (databaseError.constraint?.includes("slug")) {
      const message = "This public URL slug is already used by another listing.";
      return { fieldErrors: { slug: message }, message };
    }

    if (databaseError.constraint?.includes("calendar_venue")) {
      return {
        message: "This operational calendar is already linked to another listing.",
      };
    }
  }

  return {
    message: getActionErrorMessage(error, "Listing could not be saved."),
  };
}
