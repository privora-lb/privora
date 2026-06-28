"use server";

import { revalidatePath } from "next/cache";

import { requireSuperadmin } from "@/lib/auth";
import { query, transaction } from "@/lib/db";
import {
  getActionErrorMessage,
  getFormString,
  getRequiredFormString,
  redirectToReturnPath,
} from "@/lib/forms";
import { getAllVenues } from "@/lib/data/venues";
import { hashPassword } from "@/lib/password";
import type { AppUser, Venue } from "@/lib/types";

type OwnerRow = {
  id: string;
  name: string;
  email: string | null;
  phone_number: string;
  role: "owner";
  is_active: boolean;
};

type VenueRow = {
  id: string;
  name: string;
  description: string;
  type_id: string;
  type_name: string;
  assigned_user_id: string;
  assigned_user_name: string;
  assigned_user_role: "owner" | "superadmin";
  assigned_user_is_active: boolean;
  is_active: boolean;
};

type OwnerActionResult =
  | {
      affectedVenues?: Venue[];
      message: string;
      ok: true;
      owner: AppUser;
    }
  | {
      message: string;
      ok: false;
    };

type VenueActionResult =
  | {
      message: string;
      ok: true;
      venues: Venue[];
    }
  | {
      message: string;
      ok: false;
    };

function getRequiredPhoneNumber(formData: FormData) {
  const phoneNumber = getFormString(formData, "phoneNumber");

  if (!phoneNumber) {
    throw new Error("Phone number is required.");
  }

  if (!/^\d{8}$/.test(phoneNumber)) {
    throw new Error("Phone number must be exactly 8 digits.");
  }

  return phoneNumber;
}

export async function createOwnerAction(formData: FormData) {
  await requireSuperadmin();

  try {
    await createOwnerRecord(formData);
  } catch (error) {
    redirectToReturnPath(formData, "/owners", {
      message: getActionErrorMessage(error, "Owner could not be created."),
      type: "error",
    });
  }

  revalidatePath("/owners");
  revalidatePath("/venues");
  redirectToReturnPath(formData, "/owners", {
    message: "Owner created successfully.",
    type: "success",
  });
}

export async function createOwnerInlineAction(
  formData: FormData,
): Promise<OwnerActionResult> {
  await requireSuperadmin();

  try {
    const owner = await createOwnerRecord(formData);

    revalidateOwnersAndVenues();

    return {
      message: "Owner created successfully.",
      ok: true,
      owner,
    };
  } catch (error) {
    return {
      message: getActionErrorMessage(error, "Owner could not be created."),
      ok: false,
    };
  }
}

export async function updateOwnerAction(formData: FormData) {
  await requireSuperadmin();

  try {
    await updateOwnerRecord(formData);
  } catch (error) {
    redirectToReturnPath(formData, "/owners", {
      message: getActionErrorMessage(error, "Owner could not be updated."),
      type: "error",
    });
  }

  revalidatePath("/owners");
  revalidatePath("/venues");
  redirectToReturnPath(formData, "/owners", {
    message: "Owner updated successfully.",
    type: "success",
  });
}

export async function updateOwnerInlineAction(
  formData: FormData,
): Promise<OwnerActionResult> {
  await requireSuperadmin();

  try {
    const owner = await updateOwnerRecord(formData);

    revalidateOwnersAndVenues();

    return {
      affectedVenues: await getVenuesForOwner(owner.id),
      message: "Owner updated successfully.",
      ok: true,
      owner,
    };
  } catch (error) {
    return {
      message: getActionErrorMessage(error, "Owner could not be updated."),
      ok: false,
    };
  }
}

export async function createVenueAction(formData: FormData) {
  const user = await requireSuperadmin();

  try {
    await createVenueRecord(formData, user.id);
  } catch (error) {
    redirectToReturnPath(formData, "/venues", {
      message: getActionErrorMessage(error, "Venue could not be created."),
      type: "error",
    });
  }

  revalidatePath("/venues");
  revalidatePath("/calendar");
  redirectToReturnPath(formData, "/venues", {
    message: "Venue created successfully.",
    type: "success",
  });
}

export async function createVenueInlineAction(
  formData: FormData,
): Promise<VenueActionResult> {
  const user = await requireSuperadmin();

  try {
    await createVenueRecord(formData, user.id);

    revalidatePath("/venues");
    revalidatePath("/calendar");

    return {
      message: "Venue created successfully.",
      ok: true,
      venues: await getAllVenues(),
    };
  } catch (error) {
    return {
      message: getActionErrorMessage(error, "Venue could not be created."),
      ok: false,
    };
  }
}

export async function updateVenueAction(formData: FormData) {
  await requireSuperadmin();

  try {
    await updateVenueRecord(formData);
  } catch (error) {
    redirectToReturnPath(formData, "/venues", {
      message: getActionErrorMessage(error, "Venue could not be updated."),
      type: "error",
    });
  }

  revalidatePath("/venues");
  revalidatePath("/calendar");
  redirectToReturnPath(formData, "/venues", {
    message: "Venue updated successfully.",
    type: "success",
  });
}

export async function updateVenueInlineAction(
  formData: FormData,
): Promise<VenueActionResult> {
  await requireSuperadmin();

  try {
    await updateVenueRecord(formData);

    revalidatePath("/venues");
    revalidatePath("/calendar");

    return {
      message: "Venue updated successfully.",
      ok: true,
      venues: await getAllVenues(),
    };
  } catch (error) {
    return {
      message: getActionErrorMessage(error, "Venue could not be updated."),
      ok: false,
    };
  }
}

export async function toggleOwnerActiveAction(formData: FormData) {
  await requireSuperadmin();

  const isActive = getRequiredFormString(formData, "isActive") === "true";

  try {
    await toggleOwnerActiveRecord(formData);
  } catch (error) {
    redirectToReturnPath(formData, "/owners", {
      message: getActionErrorMessage(
        error,
        "Owner status could not be updated.",
      ),
      type: "error",
    });
  }

  revalidatePath("/owners");
  revalidatePath("/venues");
  revalidatePath("/calendar");
  redirectToReturnPath(formData, "/owners", {
    message: isActive
      ? "Owner activated successfully."
      : "Owner deactivated successfully.",
    type: "success",
  });
}

export async function toggleOwnerActiveInlineAction(
  formData: FormData,
): Promise<OwnerActionResult> {
  await requireSuperadmin();

  const isActive = getRequiredFormString(formData, "isActive") === "true";

  try {
    const owner = await toggleOwnerActiveRecord(formData);

    revalidateOwnersAndVenues();
    revalidatePath("/calendar");

    return {
      affectedVenues: await getVenuesForOwner(owner.id),
      message: isActive
        ? "Owner activated successfully."
        : "Owner deactivated successfully.",
      ok: true,
      owner,
    };
  } catch (error) {
    return {
      message: getActionErrorMessage(
        error,
        "Owner status could not be updated.",
      ),
      ok: false,
    };
  }
}

export async function toggleVenueActiveAction(formData: FormData) {
  await requireSuperadmin();

  const isActive = getRequiredFormString(formData, "isActive") === "true";

  try {
    await toggleVenueActiveRecord(formData);
  } catch (error) {
    redirectToReturnPath(formData, "/venues", {
      message: getActionErrorMessage(
        error,
        "Venue status could not be updated.",
      ),
      type: "error",
    });
  }

  revalidatePath("/owners");
  revalidatePath("/venues");
  revalidatePath("/calendar");
  redirectToReturnPath(formData, "/venues", {
    message: isActive
      ? "Venue activated successfully."
      : "Venue deactivated successfully.",
    type: "success",
  });
}

export async function toggleVenueActiveInlineAction(
  formData: FormData,
): Promise<VenueActionResult> {
  await requireSuperadmin();

  const isActive = getRequiredFormString(formData, "isActive") === "true";

  try {
    await toggleVenueActiveRecord(formData);

    revalidatePath("/owners");
    revalidatePath("/venues");
    revalidatePath("/calendar");

    return {
      message: isActive
        ? "Venue activated successfully."
        : "Venue deactivated successfully.",
      ok: true,
      venues: await getAllVenues(),
    };
  } catch (error) {
    return {
      message: getActionErrorMessage(
        error,
        "Venue status could not be updated.",
      ),
      ok: false,
    };
  }
}

async function createVenueRecord(formData: FormData, createdById: string) {
  const name = getRequiredFormString(formData, "name");
  const typeId = getRequiredFormString(formData, "typeId");
  const assignedUserId = getRequiredFormString(formData, "assignedUserId");
  const description = getFormString(formData, "description");

  await transaction(async (client) => {
    await client.query(
      `INSERT INTO venues
        (name, type_id, assigned_user_id, description, created_by_id)
       VALUES ($1, $2, $3, $4, $5)`,
      [name, typeId, assignedUserId, description, createdById],
    );
    await client.query(
      `UPDATE users
       SET is_active = true, updated_at = now()
       WHERE id = $1 AND role = 'owner'`,
      [assignedUserId],
    );
  });
}

async function updateVenueRecord(formData: FormData) {
  const id = getRequiredFormString(formData, "id");
  const name = getRequiredFormString(formData, "name");
  const typeId = getRequiredFormString(formData, "typeId");
  const assignedUserId = getRequiredFormString(formData, "assignedUserId");
  const description = getFormString(formData, "description");

  await transaction(async (client) => {
    const currentVenue = await client.query<{
      assigned_user_id: string;
      is_active: boolean;
    }>(
      `SELECT assigned_user_id, is_active
       FROM venues
       WHERE id = $1
       LIMIT 1`,
      [id],
    );
    const current = currentVenue.rows[0];

    await client.query(
      `UPDATE venues
       SET name = $1,
           type_id = $2,
           assigned_user_id = $3,
           description = $4,
           updated_at = now()
       WHERE id = $5`,
      [name, typeId, assignedUserId, description, id],
    );

    if (!current?.is_active) {
      return;
    }

    await client.query(
      `UPDATE users
       SET is_active = true, updated_at = now()
       WHERE id = $1 AND role = 'owner'`,
      [assignedUserId],
    );

    if (current.assigned_user_id === assignedUserId) {
      return;
    }

    const deactivatedOwner = await client.query<{ id: string }>(
      `UPDATE users u
       SET is_active = false, updated_at = now()
       WHERE u.id = $1
         AND u.role = 'owner'
         AND NOT EXISTS (
           SELECT 1
           FROM venues v
           WHERE v.assigned_user_id = u.id
             AND v.is_active = true
         )
       RETURNING u.id`,
      [current.assigned_user_id],
    );

    if (deactivatedOwner.rows[0]) {
      await client.query("DELETE FROM sessions WHERE user_id = $1", [
        current.assigned_user_id,
      ]);
    }
  });
}

async function toggleVenueActiveRecord(formData: FormData) {
  const venueId = getRequiredFormString(formData, "venueId");
  const isActive = getRequiredFormString(formData, "isActive") === "true";

  await transaction(async (client) => {
    const result = await client.query<{ assigned_user_id: string }>(
      `SELECT assigned_user_id
       FROM venues
       WHERE id = $1
       LIMIT 1`,
      [venueId],
    );
    const venue = result.rows[0];

    if (!venue) {
      throw new Error("Venue was not found.");
    }

    await client.query(
      `UPDATE venues
       SET is_active = $1, updated_at = now()
       WHERE id = $2`,
      [isActive, venueId],
    );

    if (isActive) {
      await client.query(
        `UPDATE users
         SET is_active = true, updated_at = now()
         WHERE id = $1 AND role = 'owner'`,
        [venue.assigned_user_id],
      );
      return;
    }

    const deactivatedOwner = await client.query<{ id: string }>(
      `UPDATE users u
       SET is_active = false, updated_at = now()
       WHERE u.id = $1
         AND u.role = 'owner'
         AND NOT EXISTS (
           SELECT 1
           FROM venues v
           WHERE v.assigned_user_id = u.id
             AND v.is_active = true
         )
       RETURNING u.id`,
      [venue.assigned_user_id],
    );

    if (deactivatedOwner.rows[0]) {
      await client.query("DELETE FROM sessions WHERE user_id = $1", [
        venue.assigned_user_id,
      ]);
    }
  });
}

async function createOwnerRecord(formData: FormData) {
  const name = getRequiredFormString(formData, "name");
  const email = getFormString(formData, "email") || null;
  const phoneNumber = getRequiredPhoneNumber(formData);
  const password = getRequiredFormString(formData, "password");
  const result = await query<OwnerRow>(
    `INSERT INTO users (name, email, phone_number, password_hash, role)
     VALUES ($1, $2, $3, $4, 'owner')
     RETURNING id, name, email, phone_number, role, is_active`,
    [name, email, phoneNumber, await hashPassword(password)],
  );
  const owner = result.rows[0];

  if (!owner) {
    throw new Error("Owner could not be created.");
  }

  return mapOwner(owner);
}

async function updateOwnerRecord(formData: FormData) {
  const id = getRequiredFormString(formData, "id");
  const name = getRequiredFormString(formData, "name");
  const email = getFormString(formData, "email") || null;
  const phoneNumber = getRequiredPhoneNumber(formData);
  const password = getFormString(formData, "password");
  const result = password
    ? await query<OwnerRow>(
        `UPDATE users
         SET name = $1,
             email = $2,
             phone_number = $3,
             password_hash = $4,
             updated_at = now()
         WHERE id = $5 AND role = 'owner'
         RETURNING id, name, email, phone_number, role, is_active`,
        [name, email, phoneNumber, await hashPassword(password), id],
      )
    : await query<OwnerRow>(
        `UPDATE users
         SET name = $1,
             email = $2,
             phone_number = $3,
             updated_at = now()
         WHERE id = $4 AND role = 'owner'
         RETURNING id, name, email, phone_number, role, is_active`,
        [name, email, phoneNumber, id],
      );
  const owner = result.rows[0];

  if (!owner) {
    throw new Error("Owner was not found.");
  }

  return mapOwner(owner);
}

async function toggleOwnerActiveRecord(formData: FormData) {
  const ownerId = getRequiredFormString(formData, "ownerId");
  const isActive = getRequiredFormString(formData, "isActive") === "true";
  const selectedVenueIds = formData
    .getAll("venueIds")
    .filter(
      (value): value is string => typeof value === "string" && value.length > 0,
    );

  const owner = await transaction(async (client) => {
    const venues = await client.query<{ id: string }>(
      `SELECT id
       FROM venues
       WHERE assigned_user_id = $1
       ORDER BY name`,
      [ownerId],
    );

    if (!isActive) {
      const result = await client.query<OwnerRow>(
        `UPDATE users
         SET is_active = false, updated_at = now()
         WHERE id = $1 AND role = 'owner'
         RETURNING id, name, email, phone_number, role, is_active`,
        [ownerId],
      );
      await client.query(
        `UPDATE venues
         SET is_active = false, updated_at = now()
         WHERE assigned_user_id = $1`,
        [ownerId],
      );
      await client.query("DELETE FROM sessions WHERE user_id = $1", [
        ownerId,
      ]);
      return result.rows[0] ? mapOwner(result.rows[0]) : null;
    }

    const venueIds =
      venues.rows.length <= 1
        ? venues.rows.map((venue) => venue.id)
        : selectedVenueIds;

    if (venues.rows.length > 1 && venueIds.length === 0) {
      throw new Error("Select at least one venue to activate this owner.");
    }

    const result = await client.query<OwnerRow>(
      `UPDATE users
       SET is_active = true, updated_at = now()
       WHERE id = $1 AND role = 'owner'
       RETURNING id, name, email, phone_number, role, is_active`,
      [ownerId],
    );

    if (venues.rows.length > 0) {
      await client.query(
        `UPDATE venues
         SET is_active = (id = ANY($2::uuid[])), updated_at = now()
         WHERE assigned_user_id = $1`,
        [ownerId, venueIds],
      );
    }

    return result.rows[0] ? mapOwner(result.rows[0]) : null;
  });

  if (!owner) {
    throw new Error("Owner was not found.");
  }

  return owner;
}

async function getVenuesForOwner(ownerId: string) {
  const result = await query<VenueRow>(
    `SELECT
       v.id,
       v.name,
       v.description,
       v.type_id,
       vt.name AS type_name,
       v.assigned_user_id,
       u.name AS assigned_user_name,
       u.role AS assigned_user_role,
       u.is_active AS assigned_user_is_active,
       v.is_active
     FROM venues v
     JOIN venue_types vt ON vt.id = v.type_id
     JOIN users u ON u.id = v.assigned_user_id
     WHERE v.assigned_user_id = $1
     ORDER BY v.name`,
    [ownerId],
  );

  return result.rows.map(mapVenue);
}

function mapOwner(row: OwnerRow): AppUser {
  return {
    email: row.email,
    id: row.id,
    isActive: row.is_active,
    name: row.name,
    phoneNumber: row.phone_number,
    role: row.role,
  };
}

function mapVenue(row: VenueRow): Venue {
  return {
    assignedUserId: row.assigned_user_id,
    assignedUserIsActive: row.assigned_user_is_active,
    assignedUserName: row.assigned_user_name,
    assignedUserRole: row.assigned_user_role,
    description: row.description,
    id: row.id,
    isActive: row.is_active,
    name: row.name,
    typeId: row.type_id,
    typeName: row.type_name,
  };
}

function revalidateOwnersAndVenues() {
  revalidatePath("/owners");
  revalidatePath("/venues");
}
