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
import { hashPassword } from "@/lib/password";

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
    const name = getRequiredFormString(formData, "name");
    const email = getFormString(formData, "email") || null;
    const phoneNumber = getRequiredPhoneNumber(formData);
    const password = getRequiredFormString(formData, "password");

    await query(
      `INSERT INTO users (name, email, phone_number, password_hash, role)
       VALUES ($1, $2, $3, $4, 'owner')`,
      [name, email, phoneNumber, await hashPassword(password)],
    );
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

export async function updateOwnerAction(formData: FormData) {
  await requireSuperadmin();

  try {
    const id = getRequiredFormString(formData, "id");
    const name = getRequiredFormString(formData, "name");
    const email = getFormString(formData, "email") || null;
    const phoneNumber = getRequiredPhoneNumber(formData);
    const password = getFormString(formData, "password");

    if (password) {
      await query(
        `UPDATE users
         SET name = $1,
             email = $2,
             phone_number = $3,
             password_hash = $4,
             updated_at = now()
         WHERE id = $5 AND role = 'owner'`,
        [name, email, phoneNumber, await hashPassword(password), id],
      );
    } else {
      await query(
        `UPDATE users
         SET name = $1,
             email = $2,
             phone_number = $3,
             updated_at = now()
         WHERE id = $4 AND role = 'owner'`,
        [name, email, phoneNumber, id],
      );
    }
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

export async function createVenueAction(formData: FormData) {
  const user = await requireSuperadmin();

  try {
    const name = getRequiredFormString(formData, "name");
    const typeId = getRequiredFormString(formData, "typeId");
    const assignedUserId = getRequiredFormString(formData, "assignedUserId");
    const description = getFormString(formData, "description");

    await transaction(async (client) => {
      await client.query(
        `INSERT INTO venues
          (name, type_id, assigned_user_id, description, created_by_id)
         VALUES ($1, $2, $3, $4, $5)`,
        [name, typeId, assignedUserId, description, user.id],
      );
      await client.query(
        `UPDATE users
         SET is_active = true, updated_at = now()
         WHERE id = $1 AND role = 'owner'`,
        [assignedUserId],
      );
    });
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

export async function updateVenueAction(formData: FormData) {
  await requireSuperadmin();

  try {
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

export async function toggleOwnerActiveAction(formData: FormData) {
  await requireSuperadmin();

  const ownerId = getRequiredFormString(formData, "ownerId");
  const isActive = getRequiredFormString(formData, "isActive") === "true";
  const selectedVenueIds = formData
    .getAll("venueIds")
    .filter((value): value is string => typeof value === "string" && value.length > 0);

  try {
    await transaction(async (client) => {
      const venues = await client.query<{ id: string }>(
        `SELECT id
         FROM venues
         WHERE assigned_user_id = $1
         ORDER BY name`,
        [ownerId],
      );

      if (!isActive) {
        await client.query(
          `UPDATE users
           SET is_active = false, updated_at = now()
           WHERE id = $1 AND role = 'owner'`,
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
        return;
      }

      const venueIds =
        venues.rows.length <= 1
          ? venues.rows.map((venue) => venue.id)
          : selectedVenueIds;

      if (venues.rows.length > 1 && venueIds.length === 0) {
        throw new Error("Select at least one venue to activate this owner.");
      }

      await client.query(
        `UPDATE users
         SET is_active = true, updated_at = now()
         WHERE id = $1 AND role = 'owner'`,
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
    });
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

export async function toggleVenueActiveAction(formData: FormData) {
  await requireSuperadmin();

  const venueId = getRequiredFormString(formData, "venueId");
  const isActive = getRequiredFormString(formData, "isActive") === "true";

  try {
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
