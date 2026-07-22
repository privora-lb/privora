import { query } from "@/lib/db";
import { normalizeDateKey } from "@/lib/dates";
import type {
  CalendarVenueOption,
  IsoWeekday,
  ListingImage,
  ListingInclusion,
  ListingRule,
  PublicCalendarStatus,
  PublicListing,
} from "@/features/listings/types";

type ListingRow = {
  id: string;
  name: string;
  slug: string;
  weekday_day_price_amount: string;
  weekday_night_price_amount: string;
  weekend_day_price_amount: string;
  weekend_night_price_amount: string;
  weekend_iso_days: number[];
  price_currency: string;
  location_name: string;
  google_maps_url: string;
  pool_capacity: number;
  stay_capacity: number;
  day_check_in: string;
  day_check_out: string;
  night_check_in: string;
  night_check_out: string;
  has_wifi: boolean;
  description: string;
  bedrooms: number;
  toilets: number;
  pool_length_m: string;
  pool_width_m: string;
  pool_depth_m: string;
  phone_number: string;
  whatsapp_number: string;
  instagram_url: string | null;
  facebook_url: string | null;
  tiktok_url: string | null;
  website_url: string | null;
  youtube_url: string | null;
  calendar_venue_id: string | null;
  calendar_venue_name: string | null;
  calendar_venue_eligible: boolean;
  is_published: boolean;
  created_at: Date;
  updated_at: Date;
};

const listingSelect = `
  SELECT
    pl.*,
    v.name AS calendar_venue_name,
    COALESCE(
      v.is_active = true
      AND calendar_owner.is_active = true,
      false
    ) AS calendar_venue_eligible
  FROM public_listings pl
  LEFT JOIN venues v ON v.id = pl.calendar_venue_id
  LEFT JOIN users calendar_owner ON calendar_owner.id = v.assigned_user_id
`;

export async function getAllPublicListings() {
  return getListings("ORDER BY pl.updated_at DESC");
}

export async function getPublishedListings() {
  return getListings(
    "WHERE pl.is_published = true ORDER BY pl.updated_at DESC",
  );
}

export async function getListingById(id: string) {
  const listings = await getListings("WHERE pl.id = $1 LIMIT 1", [id]);
  return listings[0] ?? null;
}

export async function getPublishedListingBySlug(slug: string) {
  const listings = await getListings(
    "WHERE pl.slug = $1 AND pl.is_published = true LIMIT 1",
    [slug],
  );
  return listings[0] ?? null;
}

export async function getCalendarVenueOptions(listingId?: string) {
  const result = await query<{
    id: string;
    name: string;
    owner_name: string;
    owner_role: CalendarVenueOption["ownerRole"];
  }>(
    `SELECT v.id, v.name, u.name AS owner_name, u.role AS owner_role
     FROM venues v
     JOIN users u ON u.id = v.assigned_user_id
     WHERE v.is_active = true
       AND u.is_active = true
       AND NOT EXISTS (
         SELECT 1
         FROM public_listings linked
         WHERE linked.calendar_venue_id = v.id
           AND ($1::uuid IS NULL OR linked.id <> $1::uuid)
       )
     ORDER BY v.name, u.name`,
    [listingId ?? null],
  );

  return result.rows.map(
    (row): CalendarVenueOption => ({
      id: row.id,
      name: row.name,
      ownerName: row.owner_name,
      ownerRole: row.owner_role,
    }),
  );
}

export async function getPublishedCalendarVenue(slug: string) {
  const result = await query<{ id: string; name: string }>(
    `SELECT v.id, v.name
     FROM public_listings pl
     JOIN venues v ON v.id = pl.calendar_venue_id
     JOIN users u ON u.id = v.assigned_user_id
     WHERE pl.slug = $1
       AND pl.is_published = true
       AND v.is_active = true
       AND u.is_active = true
     LIMIT 1`,
    [slug],
  );

  return result.rows[0] ?? null;
}

export async function getPublicCalendarStatuses(
  venueId: string,
  startDate: string,
  endDate: string,
) {
  const result = await query<{
    reservation_date: Date | string;
    slot: "day" | "night";
    status: "available" | "booked";
  }>(
    `SELECT reservation_date, slot, status
     FROM calendar_entries
     WHERE venue_id = $1
       AND reservation_date BETWEEN $2::date AND $3::date
     ORDER BY reservation_date, slot`,
    [venueId, startDate, endDate],
  );

  return result.rows.map(
    (row): PublicCalendarStatus => ({
      date: normalizeDateKey(row.reservation_date),
      slot: row.slot,
      status: row.status,
    }),
  );
}

async function getListings(whereClause: string, params: unknown[] = []) {
  const result = await query<ListingRow>(
    `${listingSelect} ${whereClause}`,
    params,
  );
  const ids = result.rows.map((row) => row.id);

  if (!ids.length) {
    return [];
  }

  const [images, inclusions, rules] = await Promise.all([
    getImages(ids),
    getInclusions(ids),
    getRules(ids),
  ]);

  return result.rows.map((row) =>
    mapListing(
      row,
      images.get(row.id) ?? [],
      inclusions.get(row.id) ?? [],
      rules.get(row.id) ?? [],
    ),
  );
}

async function getImages(listingIds: string[]) {
  const result = await query<{
    id: string;
    listing_id: string;
    storage_asset_id: string | null;
    image_url: string;
    alt_text: string;
    position: number;
  }>(
    `SELECT id, listing_id, storage_asset_id, image_url, alt_text, position
     FROM public_listing_images
     WHERE listing_id = ANY($1::uuid[])
     ORDER BY listing_id, position`,
    [listingIds],
  );

  return groupRows(result.rows, (row): ListingImage => ({
    id: row.id,
    storageAssetId: row.storage_asset_id,
    imageUrl: row.image_url,
    altText: row.alt_text,
    position: row.position,
  }));
}

async function getInclusions(listingIds: string[]) {
  const result = await query<{
    id: string;
    listing_id: string;
    label: string;
    details: string;
    position: number;
  }>(
    `SELECT id, listing_id, label, details, position
     FROM public_listing_inclusions
     WHERE listing_id = ANY($1::uuid[])
     ORDER BY listing_id, position`,
    [listingIds],
  );

  return groupRows(result.rows, (row): ListingInclusion => ({
    id: row.id,
    label: row.label,
    details: row.details,
    position: row.position,
  }));
}

async function getRules(listingIds: string[]) {
  const result = await query<{
    id: string;
    listing_id: string;
    rule_text: string;
    position: number;
  }>(
    `SELECT id, listing_id, rule_text, position
     FROM public_listing_rules
     WHERE listing_id = ANY($1::uuid[])
     ORDER BY listing_id, position`,
    [listingIds],
  );

  return groupRows(result.rows, (row): ListingRule => ({
    id: row.id,
    text: row.rule_text,
    position: row.position,
  }));
}

function groupRows<Row extends { listing_id: string }, Value>(
  rows: Row[],
  mapValue: (row: Row) => Value,
) {
  const grouped = new Map<string, Value[]>();

  for (const row of rows) {
    grouped.set(row.listing_id, [
      ...(grouped.get(row.listing_id) ?? []),
      mapValue(row),
    ]);
  }

  return grouped;
}

function mapListing(
  row: ListingRow,
  images: ListingImage[],
  inclusions: ListingInclusion[],
  rules: ListingRule[],
): PublicListing {
  return {
    id: row.id,
    name: row.name,
    slug: row.slug,
    weekdayDayPriceAmount: Number(row.weekday_day_price_amount),
    weekdayNightPriceAmount: Number(row.weekday_night_price_amount),
    weekendDayPriceAmount: Number(row.weekend_day_price_amount),
    weekendNightPriceAmount: Number(row.weekend_night_price_amount),
    weekendIsoDays: normalizeWeekendIsoDays(row.weekend_iso_days),
    priceCurrency: row.price_currency,
    locationName: row.location_name,
    googleMapsUrl: row.google_maps_url,
    poolCapacity: row.pool_capacity,
    stayCapacity: row.stay_capacity,
    dayCheckIn: normalizeTime(row.day_check_in),
    dayCheckOut: normalizeTime(row.day_check_out),
    nightCheckIn: normalizeTime(row.night_check_in),
    nightCheckOut: normalizeTime(row.night_check_out),
    hasWifi: row.has_wifi,
    description: row.description,
    bedrooms: row.bedrooms,
    toilets: row.toilets,
    poolLengthM: Number(row.pool_length_m),
    poolWidthM: Number(row.pool_width_m),
    poolDepthM: Number(row.pool_depth_m),
    phoneNumber: row.phone_number,
    whatsappNumber: row.whatsapp_number,
    instagramUrl: row.instagram_url ?? "",
    facebookUrl: row.facebook_url ?? "",
    tiktokUrl: row.tiktok_url ?? "",
    websiteUrl: row.website_url ?? "",
    youtubeUrl: row.youtube_url ?? "",
    calendarVenueId: row.calendar_venue_id,
    calendarVenueName: row.calendar_venue_name,
    calendarVenueEligible: row.calendar_venue_eligible,
    isPublished: row.is_published,
    images,
    inclusions,
    rules,
    createdAt: row.created_at,
    updatedAt: row.updated_at,
  };
}

function normalizeTime(value: string) {
  return value.slice(0, 5);
}

function normalizeWeekendIsoDays(values: number[]) {
  return [...new Set(values)]
    .filter((value): value is IsoWeekday =>
      Number.isInteger(value) && value >= 1 && value <= 7,
    )
    .sort((left, right) => left - right);
}
