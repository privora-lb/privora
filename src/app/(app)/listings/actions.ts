"use server";

import { revalidatePath } from "next/cache";
import type { PoolClient } from "pg";

import type { ListingFormState } from "@/features/listings/types";
import { parseListingInput } from "@/features/listings/listing-form-data";
import { requireSuperadmin } from "@/lib/auth";
import { transaction } from "@/lib/db";
import { getActionErrorMessage, getFormString } from "@/lib/forms";

type ActionResult = { message: string; ok: boolean };

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

      if (input.id) {
        const existing = await client.query<{ slug: string }>(
          "SELECT slug FROM public_listings WHERE id = $1 LIMIT 1",
          [input.id],
        );

        if (!existing.rows[0]) {
          throw new Error("Listing was not found.");
        }

        previousSlug = existing.rows[0].slug;
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
              name = $1, slug = $2, price_amount = $3,
              price_currency = $4, location_name = $5,
              google_maps_url = $6, pool_capacity = $7, stay_capacity = $8,
              day_check_in = $9::time, day_check_out = $10::time,
              night_check_in = $11::time, night_check_out = $12::time,
              has_wifi = $13, description = $14, bedrooms = $15,
              toilets = $16, pool_length_m = $17, pool_width_m = $18,
              pool_depth_m = $19, phone_number = $20,
              whatsapp_number = $21, instagram_url = $22,
              facebook_url = $23, tiktok_url = $24, website_url = $25,
              youtube_url = $26, calendar_venue_id = $27,
              is_published = $28, updated_at = now()
             WHERE id = $29
             RETURNING id`,
            [...values.slice(0, 28), input.id],
          )
        : await client.query<{ id: string }>(
            `INSERT INTO public_listings (
              name, slug, price_amount, price_currency, location_name,
              google_maps_url, pool_capacity, stay_capacity, day_check_in,
              day_check_out, night_check_in, night_check_out, has_wifi,
              description, bedrooms, toilets, pool_length_m, pool_width_m,
              pool_depth_m, phone_number, whatsapp_number, instagram_url,
              facebook_url, tiktok_url, website_url, youtube_url,
              calendar_venue_id, is_published, created_by_id
             ) VALUES (
              $1, $2, $3, $4, $5, $6, $7, $8, $9::time, $10::time,
              $11::time, $12::time, $13, $14, $15, $16, $17, $18, $19,
              $20, $21, $22, $23, $24, $25, $26, $27, $28, $29
             ) RETURNING id`,
            values,
          );
      const listingId = listingResult.rows[0]?.id;

      if (!listingId) {
        throw new Error("Listing could not be saved.");
      }

      await replaceListingChildren(client, listingId, input);
      return { listingId, previousSlug };
    });
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
    const slug = await transaction(async (client) => {
      const result = await client.query<{ slug: string }>(
        "DELETE FROM public_listings WHERE id = $1 RETURNING slug",
        [id],
      );

      if (!result.rows[0]) {
        throw new Error("Listing was not found.");
      }

      return result.rows[0].slug;
    });

    revalidateListingPaths(slug);
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

function getListingValues(
  input: ReturnType<typeof parseListingInput>["input"],
  userId: string,
) {
  return [
    input.name,
    input.slug,
    input.priceAmount,
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

  for (const [position, image] of input.images.entries()) {
    await client.query(
      `INSERT INTO public_listing_images
        (listing_id, image_url, alt_text, position)
       VALUES ($1, $2, $3, $4)`,
      [listingId, image.imageUrl, image.altText, position],
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
