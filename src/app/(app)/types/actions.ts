"use server";

import { revalidatePath } from "next/cache";

import { requireSuperadmin } from "@/lib/auth";
import { query } from "@/lib/db";
import {
  getActionErrorMessage,
  getFormString,
  getRequiredFormString,
  redirectToReturnPath,
} from "@/lib/forms";

export async function createVenueTypeAction(formData: FormData) {
  await requireSuperadmin();

  try {
    const name = getRequiredFormString(formData, "name");
    const description = getFormString(formData, "description");

    await query(
      `INSERT INTO venue_types (name, description)
       VALUES ($1, $2)`,
      [name, description],
    );
  } catch (error) {
    redirectToReturnPath(formData, "/types", {
      message: getActionErrorMessage(error, "Space type could not be created."),
      type: "error",
    });
  }

  revalidatePath("/types");
  revalidatePath("/venues");
  redirectToReturnPath(formData, "/types", {
    message: "Space type created successfully.",
    type: "success",
  });
}

export async function updateVenueTypeAction(formData: FormData) {
  await requireSuperadmin();

  try {
    const id = getRequiredFormString(formData, "id");
    const name = getRequiredFormString(formData, "name");
    const description = getFormString(formData, "description");

    const usage = await query<{ count: string }>(
      `SELECT count(*)::text
       FROM venues
       WHERE type_id = $1`,
      [id],
    );

    if (Number(usage.rows[0]?.count ?? 0) > 0) {
      await query(
        `UPDATE venue_types
         SET description = $1, updated_at = now()
         WHERE id = $2`,
        [description, id],
      );
    } else {
      await query(
        `UPDATE venue_types
         SET name = $1, description = $2, updated_at = now()
         WHERE id = $3`,
        [name, description, id],
      );
    }
  } catch (error) {
    redirectToReturnPath(formData, "/types", {
      message: getActionErrorMessage(error, "Space type could not be updated."),
      type: "error",
    });
  }

  revalidatePath("/types");
  revalidatePath("/venues");
  redirectToReturnPath(formData, "/types", {
    message: "Space type updated successfully.",
    type: "success",
  });
}

export async function deleteVenueTypeAction(formData: FormData) {
  await requireSuperadmin();

  try {
    const id = getRequiredFormString(formData, "id");

    const result = await query(
      `DELETE FROM venue_types vt
       WHERE vt.id = $1
         AND NOT EXISTS (
           SELECT 1
           FROM venues v
           WHERE v.type_id = vt.id
         )`,
      [id],
    );

    if (result.rowCount === 0) {
      throw new Error("This space type is still used by at least one venue.");
    }
  } catch (error) {
    redirectToReturnPath(formData, "/types", {
      message: getActionErrorMessage(error, "Space type could not be deleted."),
      type: "error",
    });
  }

  revalidatePath("/types");
  revalidatePath("/venues");
  redirectToReturnPath(formData, "/types", {
    message: "Space type deleted successfully.",
    type: "success",
  });
}
