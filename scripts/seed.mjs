import crypto from "node:crypto";
import pg from "pg";

const { Pool } = pg;

const connectionString =
  process.env.DATABASE_URL ??
  process.env.NETLIFY_DATABASE_URL ??
  process.env.NETLIFY_DB_URL ??
  "postgres://naderkhaddaj@localhost:5432/reservation_tracking";

const pool = new Pool({ connectionString });

function hashPassword(password) {
  const salt = crypto.randomBytes(16).toString("base64url");
  const hash = crypto.scryptSync(password, salt, 64).toString("base64url");
  return `${salt}:${hash}`;
}

async function insertUser(client, user) {
  const result = await client.query(
    `INSERT INTO users (name, email, phone_number, password_hash, role)
     VALUES ($1, $2, $3, $4, $5)
     RETURNING id`,
    [
      user.name,
      user.email ?? null,
      user.phoneNumber,
      hashPassword(user.password),
      user.role,
    ],
  );
  return result.rows[0].id;
}

async function insertType(client, name, description) {
  const result = await client.query(
    `INSERT INTO venue_types (name, description)
     VALUES ($1, $2)
     RETURNING id`,
    [name, description],
  );
  return result.rows[0].id;
}

async function insertVenue(client, venue) {
  const result = await client.query(
    `INSERT INTO venues (name, type_id, assigned_user_id, description, created_by_id)
     VALUES ($1, $2, $3, $4, $5)
     RETURNING id`,
    [
      venue.name,
      venue.typeId,
      venue.assignedUserId,
      venue.description,
      venue.createdById,
    ],
  );
  return result.rows[0].id;
}

async function seed() {
  const client = await pool.connect();

  try {
    await client.query("BEGIN");
    await client.query(
      `TRUNCATE change_requests, calendar_entries, venues, venue_types, sessions, users
       RESTART IDENTITY CASCADE`,
    );

    const superadminId = await insertUser(client, {
      name: "Main Superadmin",
      email: "admin@example.com",
      phoneNumber: "70000000",
      password: "admin123",
      role: "superadmin",
    });

    const ownerSeeds = [
      ["Maya Haddad", "maya@example.com"],
      ["Karim Mansour", "karim@example.com"],
      ["Lina Saad", "lina@example.com"],
      ["Omar Nasser", "omar@example.com"],
      ["Rana Khoury", "rana@example.com"],
      ["Ziad Farah", "ziad@example.com"],
      ["Nour Aoun", "nour@example.com"],
      ["Tarek Saliba", "tarek@example.com"],
      ["Hala Karam", "hala@example.com"],
      ["Fadi Daher", "fadi@example.com"],
      ["Mira Jaber", "mira@example.com"],
      ["Samir Haddad", "samir@example.com"],
      ["Yara Mansour", "yara@example.com"],
      ["Nabil Raad", "nabil@example.com"],
      ["Dina Awad", "dina@example.com"],
      ["Elias Saab", "elias@example.com"],
      ["Sara Chidiac", "sara@example.com"],
      ["Hadi Ghosn", "hadi@example.com"],
      ["Lea Tannous", "lea@example.com"],
      ["Rami Sfeir", "rami@example.com"],
      ["Celine Matar", "celine@example.com"],
      ["Joseph Nohra", "joseph@example.com"],
      ["Mariam Abi Raad", "mariam@example.com"],
      ["Tony Khazen", "tony@example.com"],
      ["Nadine Akl", "nadine@example.com"],
      ["Bassel Hayek", "bassel@example.com"],
      ["Carla Rizk", "carla@example.com"],
      ["Walid Kassis", "walid@example.com"],
      ["Reem Hobeika", "reem@example.com"],
      ["George Sayegh", "george@example.com"],
    ];
    const ownerIds = [];

    for (const [index, [name, email]] of ownerSeeds.entries()) {
      ownerIds.push(
        await insertUser(client, {
          name,
          email,
          phoneNumber: String(70000001 + index),
          password: "owner123",
          role: "owner",
        }),
      );
    }

    const typeSeeds = [
      ["Pool", "Private swimming pool reservations"],
      ["Chalet", "Chalet and short-stay property reservations"],
      ["Event Venue", "Indoor or outdoor event spaces"],
      ["Villa", "Private villa reservations"],
      ["Rooftop", "Rooftop spaces for private gatherings"],
      ["Garden", "Outdoor garden reservation spaces"],
      ["Beach House", "Coastal short-stay venues"],
      ["Banquet Hall", "Large indoor event halls"],
      ["Meeting Room", "Small business meeting spaces"],
      ["Sports Court", "Reservable courts and sports surfaces"],
      ["Studio", "Photo, video, and creative studios"],
      ["Lounge", "Private lounge reservations"],
      ["Terrace", "Open-air terrace spaces"],
      ["Cabin", "Small cabin stays"],
      ["Farmhouse", "Rural farmhouse reservations"],
      ["Conference Hall", "Corporate event halls"],
      ["Kids Area", "Children activity spaces"],
      ["Spa Room", "Wellness and spa rooms"],
      ["Fitness Space", "Private gym or class spaces"],
      ["Coworking Room", "Shared work rooms"],
      ["Cinema Room", "Private screening rooms"],
      ["Dining Room", "Private dining spaces"],
      ["Wedding Hall", "Wedding-ready spaces"],
      ["Workshop Room", "Training and workshop rooms"],
      ["Gallery", "Art and exhibition spaces"],
      ["Music Room", "Practice or performance rooms"],
      ["Lake House", "Lake-side reservations"],
      ["Mountain House", "Mountain retreat venues"],
      ["Clubhouse", "Private club spaces"],
      ["Playground", "Outdoor play areas"],
    ];
    const typeIds = [];

    for (const [name, description] of typeSeeds) {
      typeIds.push(await insertType(client, name, description));
    }

    const venueSeeds = [
      ["Admin Private Pool", 0, superadminId, "Calendar controlled directly by the superadmin."],
      ["Maya Garden Pool", 0, ownerIds[0], "Owner-managed pool with approval required for superadmin requests."],
      ["Cedars Weekend Chalet", 1, ownerIds[0], "Two-bedroom chalet with weekend reservations."],
      ["Karim Rooftop Venue", 2, ownerIds[1], "Rooftop venue for private events."],
      ["Karim Seaside Villa", 3, ownerIds[1], "Villa calendar assigned to Karim."],
      ["Lina Sunset Terrace", 12, ownerIds[2], "Sunset terrace for evening bookings."],
      ["Omar Downtown Hall", 7, ownerIds[3], "Central hall for business events."],
      ["Rana Pine Cabin", 13, ownerIds[4], "Quiet cabin near the pine forest."],
      ["Ziad Garden Lounge", 5, ownerIds[5], "Garden lounge with weekend availability."],
      ["Nour Beach House", 6, ownerIds[6], "Beachfront house with private access."],
      ["Tarek Sports Court", 9, ownerIds[7], "Multi-use sports court."],
      ["Hala Workshop Room", 23, ownerIds[8], "Training room for teams."],
      ["Fadi Music Studio", 25, ownerIds[9], "Sound-treated music room."],
      ["Mira Gallery Space", 24, ownerIds[10], "Gallery for small exhibitions."],
      ["Samir Farmhouse", 14, ownerIds[11], "Farmhouse with outdoor seating."],
      ["Yara Dining Room", 21, ownerIds[12], "Private dining room for groups."],
      ["Nabil Conference Hall", 15, ownerIds[13], "Conference hall with projector setup."],
      ["Dina Spa Suite", 17, ownerIds[14], "Spa room for wellness bookings."],
      ["Elias Fitness Room", 18, ownerIds[15], "Fitness class reservation room."],
      ["Sara Cinema Room", 20, ownerIds[16], "Private cinema experience."],
      ["Hadi Clubhouse", 28, ownerIds[17], "Clubhouse event room."],
      ["Lea Lake House", 26, ownerIds[18], "Lake-side stay calendar."],
      ["Rami Mountain House", 27, ownerIds[19], "Mountain retreat calendar."],
      ["Celine Coworking Room", 19, ownerIds[20], "Work room with hourly availability."],
      ["Joseph Wedding Hall", 22, ownerIds[21], "Wedding hall calendar."],
      ["Mariam Playground", 29, ownerIds[22], "Outdoor playground bookings."],
      ["Tony Rooftop Garden", 4, ownerIds[23], "Rooftop garden space."],
      ["Nadine Kids Area", 16, ownerIds[24], "Kids area for birthday events."],
      ["Bassel Creative Studio", 10, ownerIds[25], "Creative studio and content space."],
      ["Carla Private Lounge", 11, ownerIds[26], "Private lounge calendar."],
    ];
    const venues = [];

    for (const [name, typeIndex, assignedUserId, description] of venueSeeds) {
      venues.push({
        id: await insertVenue(client, {
          name,
          typeId: typeIds[typeIndex],
          assignedUserId,
          description,
          createdById: superadminId,
        }),
        assignedUserId,
        name,
      });
    }

    for (let index = 0; index < venues.length; index += 1) {
      const venue = venues[index];
      const createdById = venue.assignedUserId === superadminId
        ? superadminId
        : venue.assignedUserId;

      await client.query(
        `INSERT INTO calendar_entries
          (venue_id, reservation_date, status, note, created_by_id, updated_by_id)
         VALUES
          ($1, CURRENT_DATE + ($2::int), $3, $4, $5, $5)`,
        [
          venue.id,
          (index % 20) + 1,
          index % 3 === 0 ? "booked" : "available",
          index % 3 === 0
            ? `Confirmed booking for ${venue.name}`
            : `Open operating day for ${venue.name}`,
          createdById,
        ],
      );
    }

    const requestVenues = venues.filter(
      (venue) => venue.assignedUserId !== superadminId,
    );

    for (let index = 0; index < 30; index += 1) {
      const venue = requestVenues[index % requestVenues.length];
      const status = ["pending", "approved", "rejected"][index % 3];
      const requestedStatus = index % 2 === 0 ? "booked" : "available";
      const previousStatus = index % 4 === 0 ? null : requestedStatus === "booked" ? "available" : "booked";

      await client.query(
        `INSERT INTO change_requests
          (venue_id, reservation_date, requested_status, requested_note, previous_status,
           previous_note, requested_by_id, owner_id, status, decided_by_id,
           decided_at, decision_note, created_at, updated_at)
         VALUES
          ($1, CURRENT_DATE + ($2::int), $3, $4, $5, $6, $7, $8, $9, $10,
           $11, $12, now() - ($13::int * interval '1 day'), now())`,
        [
          venue.id,
          index + 3,
          requestedStatus,
          `${status === "pending" ? "Pending" : "Historical"} request ${index + 1} for ${venue.name}`,
          previousStatus,
          previousStatus ? `Previous ${previousStatus} note` : null,
          superadminId,
          venue.assignedUserId,
          status,
          status === "pending" ? null : venue.assignedUserId,
          status === "pending" ? null : new Date(Date.now() - index * 3600000),
          status === "pending" ? "" : `${status} after owner review`,
          index,
        ],
      );
    }

    await client.query("COMMIT");
    console.log("Seed complete.");
    console.log("Superadmin: admin@example.com / admin123");
    console.log("Owner: maya@example.com / owner123");
    console.log("Owner: karim@example.com / owner123");
  } catch (error) {
    await client.query("ROLLBACK");
    throw error;
  } finally {
    client.release();
    await pool.end();
  }
}

seed().catch((error) => {
  console.error(error);
  process.exit(1);
});
