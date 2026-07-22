import pg from "pg";

const { Pool } = pg;
const connectionString =
  process.env.DATABASE_URL ??
  "postgres://naderkhaddaj@localhost:5432/reservation_tracking";
const target = new URL(connectionString);

if (!["localhost", "127.0.0.1", "::1"].includes(target.hostname)) {
  throw new Error("Listing demo seed is restricted to a local PostgreSQL database.");
}

const pool = new Pool({ connectionString });

const listings = [
  {
    name: "Cedar Horizon Pool",
    slug: "cedar-horizon-pool",
    weekdayDayPrice: 320,
    weekdayNightPrice: 380,
    weekendDayPrice: 400,
    weekendNightPrice: 460,
    weekendIsoDays: [6, 7],
    location: "Faraya, Lebanon",
    mapsUrl: "https://www.google.com/maps/search/?api=1&query=Faraya%2C%20Lebanon",
    poolCapacity: 24,
    stayCapacity: 10,
    dayTimes: ["09:00", "18:00"],
    nightTimes: ["19:00", "01:00"],
    hasWifi: true,
    description:
      "A private mountain retreat with open cedar views, a generous heated pool, and calm indoor spaces designed for relaxed family stays.",
    bedrooms: 4,
    toilets: 5,
    dimensions: [11, 5, 1.8],
    phone: "+96176702870",
    whatsapp: "96176702870",
    instagram: "https://www.instagram.com/privora.lb",
    images: ["mountain-day.jpg", "alpine-pool.jpg", "golden-pool.jpg"],
    inclusions: [
      ["Sound", "Bluetooth speaker and indoor sound system"],
      ["Kitchen", "Refrigerator, oven, microwave, cookware, and tableware"],
      ["Outdoor", "Barbecue station, shaded dining, and sun loungers"],
    ],
    rules: [
      "Children must be supervised around the pool.",
      "Music volume must be reduced after 11:00 PM.",
      "Glassware is not allowed inside the pool area.",
    ],
    venue: "Admin Private Pool",
  },
  {
    name: "Azure Bay Retreat",
    slug: "azure-bay-retreat",
    weekdayDayPrice: 410,
    weekdayNightPrice: 480,
    weekendDayPrice: 520,
    weekendNightPrice: 590,
    weekendIsoDays: [5, 6, 7],
    location: "Batroun, Lebanon",
    mapsUrl: "https://www.google.com/maps/search/?api=1&query=Batroun%2C%20Lebanon",
    poolCapacity: 30,
    stayCapacity: 12,
    dayTimes: ["10:00", "19:00"],
    nightTimes: ["20:00", "02:00"],
    hasWifi: true,
    description:
      "A modern coastal private with a wide infinity edge, sunset views, and a bright open-plan interior for daytime gatherings or overnight stays.",
    bedrooms: 5,
    toilets: 6,
    dimensions: [13, 6, 2],
    phone: "+96170112233",
    whatsapp: "96170112233",
    facebook: "https://www.facebook.com/privora.lb",
    website: "https://privora-lb.com",
    images: ["sunset-pool.jpg", "coast-evening.jpg", "night-infinity.jpg"],
    inclusions: [
      ["Kitchen", "Full kitchen, coffee machine, ice maker, and serving counter"],
      ["Entertainment", "Smart TV, speaker system, and pool lighting"],
      ["Parking", "Private parking for eight cars"],
    ],
    rules: [
      "Outside catering is allowed with prior notice.",
      "Pets are not allowed inside bedrooms.",
      "Check-out must be completed at the reserved time.",
    ],
    venue: "Privora Sunset Pool Calendar",
  },
  {
    name: "Olive Grove Private",
    slug: "olive-grove-private",
    weekdayDayPrice: 245,
    weekdayNightPrice: 290,
    weekendDayPrice: 315,
    weekendNightPrice: 360,
    weekendIsoDays: [6, 7],
    location: "Beit Mery, Lebanon",
    mapsUrl: "https://www.google.com/maps/search/?api=1&query=Beit%20Mery%2C%20Lebanon",
    poolCapacity: 18,
    stayCapacity: 6,
    dayTimes: ["09:30", "17:30"],
    nightTimes: ["18:30", "00:30"],
    hasWifi: false,
    description:
      "A quiet stone private surrounded by olive trees, with a family-sized pool, shaded terrace, and warm spaces for a simple countryside escape.",
    bedrooms: 3,
    toilets: 3,
    dimensions: [9, 4, 1.6],
    phone: "+96171889900",
    whatsapp: "96171889900",
    tiktok: "https://www.tiktok.com/@privora.lb",
    images: ["alpine-pool.jpg", "waterfall-pool.jpg", "mountain-day.jpg"],
    inclusions: [
      ["Outdoor", "Charcoal barbecue, garden seating, and dining table"],
      ["Kitchen", "Refrigerator, gas stove, and basic cookware"],
      ["Comfort", "Fresh towels and poolside changing room"],
    ],
    rules: [
      "No loud music after 10:30 PM.",
      "Pool towels must remain on the property.",
      "Maximum capacity must be respected.",
    ],
    venue: "Maya Garden Pool",
  },
  {
    name: "Stone & Water House",
    slug: "stone-and-water-house",
    weekdayDayPrice: 375,
    weekdayNightPrice: 430,
    weekendDayPrice: 470,
    weekendNightPrice: 525,
    weekendIsoDays: [5, 6],
    location: "Broummana, Lebanon",
    mapsUrl: "https://www.google.com/maps/search/?api=1&query=Broummana%2C%20Lebanon",
    poolCapacity: 26,
    stayCapacity: 8,
    dayTimes: ["08:30", "18:30"],
    nightTimes: ["19:30", "01:30"],
    hasWifi: true,
    description:
      "A refined stone house with a long pool, private garden, and flexible indoor-outdoor areas suited to intimate celebrations and weekend stays.",
    bedrooms: 4,
    toilets: 4,
    dimensions: [12, 4.5, 1.9],
    phone: "+96176334455",
    whatsapp: "96176334455",
    instagram: "https://www.instagram.com/privora.lb",
    youtube: "https://www.youtube.com/@privora-lb",
    images: ["golden-pool.jpg", "night-infinity.jpg", "sunset-pool.jpg"],
    inclusions: [
      ["Entertainment", "Portable speaker, projector, and ambient pool lights"],
      ["Kitchen", "Open kitchen, dishwasher, refrigerator, and glassware"],
      ["Garden", "Covered lounge, fire pit, and lawn seating"],
    ],
    rules: [
      "Decorations must be removed before check-out.",
      "Fireworks and open flames are not permitted.",
      "A responsible adult must supervise children at all times.",
    ],
  },
];

async function assertNoTrackedListingImages(client) {
  const registry = await client.query(
    "SELECT to_regclass('public.listing_image_assets')::text AS name",
  );

  if (!registry.rows[0]?.name) return;

  const assets = await client.query(
    "SELECT count(*)::int AS count FROM listing_image_assets",
  );

  if (assets.rows[0]?.count) {
    throw new Error(
      "Local listing seed stopped because tracked images exist. Remove them through the application before reseeding.",
    );
  }
}

async function seed() {
  const client = await pool.connect();

  try {
    await client.query("BEGIN");
    await assertNoTrackedListingImages(client);
    await client.query(
      `TRUNCATE public_listing_rules, public_listing_inclusions,
        public_listing_images, public_listings RESTART IDENTITY CASCADE`,
    );

    const adminResult = await client.query(
      `SELECT id FROM users
       WHERE role = 'superadmin' AND is_active = true
       ORDER BY created_at
       LIMIT 1`,
    );
    const adminId = adminResult.rows[0]?.id;

    if (!adminId) {
      throw new Error("Create an active local superadmin before seeding listings.");
    }

    const typeResult = await client.query(
      `INSERT INTO venue_types (name, description)
       VALUES ('Pool', 'Private swimming pool reservations')
       ON CONFLICT (name) DO UPDATE SET name = EXCLUDED.name
       RETURNING id`,
    );
    const poolTypeId = typeResult.rows[0].id;

    await client.query(
      `INSERT INTO venues
        (name, type_id, assigned_user_id, description, created_by_id, is_active)
       SELECT $1, $2, $3, $4, $3, true
       WHERE NOT EXISTS (
         SELECT 1 FROM venues
         WHERE name = $1 AND assigned_user_id = $3
       )`,
      [
        "Privora Sunset Pool Calendar",
        poolTypeId,
        adminId,
        "Local listing calendar demonstration venue.",
      ],
    );

    const venueRows = await client.query(
      `SELECT v.id, v.name
       FROM venues v
       JOIN users u ON u.id = v.assigned_user_id
       WHERE u.is_active = true AND v.is_active = true`,
    );
    const venueIds = new Map(venueRows.rows.map((row) => [row.name, row.id]));

    for (const listing of listings) {
      const listingResult = await client.query(
        `INSERT INTO public_listings (
          name, slug, price_amount, price_currency, location_name,
          weekday_day_price_amount, weekday_night_price_amount,
          weekend_day_price_amount, weekend_night_price_amount,
          weekend_iso_days, google_maps_url, pool_capacity, stay_capacity,
          day_check_in, day_check_out, night_check_in, night_check_out,
          has_wifi, description, bedrooms, toilets, pool_length_m,
          pool_width_m, pool_depth_m, phone_number, whatsapp_number,
          instagram_url, facebook_url, tiktok_url, website_url, youtube_url,
          calendar_venue_id, is_published, created_by_id
        ) VALUES (
          $1, $2, $3, 'USD', $4, $5, $6, $7, $8, $9::smallint[],
          $10, $11, $12, $13::time, $14::time, $15::time, $16::time,
          $17, $18, $19, $20, $21, $22, $23, $24, $25, $26, $27,
          $28, $29, $30, $31, true, $32
        ) RETURNING id`,
        [
          listing.name,
          listing.slug,
          Math.min(
            listing.weekdayDayPrice,
            listing.weekdayNightPrice,
            listing.weekendDayPrice,
            listing.weekendNightPrice,
          ),
          listing.location,
          listing.weekdayDayPrice,
          listing.weekdayNightPrice,
          listing.weekendDayPrice,
          listing.weekendNightPrice,
          listing.weekendIsoDays,
          listing.mapsUrl,
          listing.poolCapacity,
          listing.stayCapacity,
          listing.dayTimes[0],
          listing.dayTimes[1],
          listing.nightTimes[0],
          listing.nightTimes[1],
          listing.hasWifi,
          listing.description,
          listing.bedrooms,
          listing.toilets,
          ...listing.dimensions,
          listing.phone,
          listing.whatsapp,
          listing.instagram ?? null,
          listing.facebook ?? null,
          listing.tiktok ?? null,
          listing.website ?? null,
          listing.youtube ?? null,
          listing.venue ? venueIds.get(listing.venue) ?? null : null,
          adminId,
        ],
      );
      const listingId = listingResult.rows[0].id;

      for (const [position, image] of listing.images.entries()) {
        await client.query(
          `INSERT INTO public_listing_images
            (listing_id, image_url, alt_text, position)
           VALUES ($1, $2, $3, $4)`,
          [
            listingId,
            `/listings/demo/${image}`,
            `${listing.name} view ${position + 1}`,
            position,
          ],
        );
      }

      for (const [position, inclusion] of listing.inclusions.entries()) {
        await client.query(
          `INSERT INTO public_listing_inclusions
            (listing_id, label, details, position)
           VALUES ($1, $2, $3, $4)`,
          [listingId, inclusion[0], inclusion[1], position],
        );
      }

      for (const [position, rule] of listing.rules.entries()) {
        await client.query(
          `INSERT INTO public_listing_rules
            (listing_id, rule_text, position)
           VALUES ($1, $2, $3)`,
          [listingId, rule, position],
        );
      }
    }

    const linkedVenueIds = [
      ...new Set(
        listings
          .map((listing) =>
            listing.venue ? venueIds.get(listing.venue) : undefined,
          )
          .filter(Boolean),
      ),
    ];

    for (const venueId of linkedVenueIds) {
      await client.query(
        `INSERT INTO calendar_entries
          (venue_id, reservation_date, slot, status, note,
           booking_price_amount, booking_price_currency, created_by_id,
           updated_by_id)
         SELECT
           $1,
           date_trunc('month', CURRENT_DATE)::date + offset_value,
           slot_value,
           'booked',
           'Local public calendar demonstration',
           CASE
             WHEN EXTRACT(
               ISODOW FROM date_trunc('month', CURRENT_DATE)::date + offset_value
             )::smallint = ANY(listing.weekend_iso_days)
             THEN CASE slot_value
               WHEN 'day' THEN listing.weekend_day_price_amount
               ELSE listing.weekend_night_price_amount
             END
             ELSE CASE slot_value
               WHEN 'day' THEN listing.weekday_day_price_amount
               ELSE listing.weekday_night_price_amount
             END
           END,
           listing.price_currency,
           $2,
           $2
         FROM public_listings listing
         CROSS JOIN unnest(ARRAY[2, 6, 11, 17, 23]) AS offsets(offset_value)
         CROSS JOIN unnest(ARRAY['day', 'night']::text[]) AS slots(slot_value)
         WHERE listing.calendar_venue_id = $1
         ON CONFLICT (venue_id, reservation_date, slot)
         DO UPDATE SET
           status = 'booked',
           booking_price_amount = EXCLUDED.booking_price_amount,
           booking_price_currency = EXCLUDED.booking_price_currency,
           updated_by_id = EXCLUDED.updated_by_id`,
        [venueId, adminId],
      );
    }

    await client.query("COMMIT");
    console.log("Seeded 4 local public pool listings.");
  } catch (error) {
    await client.query("ROLLBACK");
    throw error;
  } finally {
    client.release();
    await pool.end();
  }
}

await seed();
