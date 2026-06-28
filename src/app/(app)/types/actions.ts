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
import type { VenueType } from "@/lib/types";

type VenueTypeActionResult =
  | {
      message: string;
      ok: true;
      type: VenueType;
    }
  | {
      message: string;
      ok: false;
    };

type DeleteVenueTypeActionResult =
  | {
      deletedId: string;
      message: string;
      ok: true;
    }
  | {
      message: string;
      ok: false;
    };

type VenueTypeRow = {
  id: string;
  name: string;
  description: string;
  venue_count: string;
};

export async function createVenueTypeAction(formData: FormData) {
  await requireSuperadmin();

  try {
    await createVenueTypeRecord(formData);
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

export async function createVenueTypeInlineAction(
  formData: FormData,
): Promise<VenueTypeActionResult> {
  await requireSuperadmin();

  try {
    const type = await createVenueTypeRecord(formData);

    revalidateTypesAndVenues();

    return {
      message: "Space type created successfully.",
      ok: true,
      type,
    };
  } catch (error) {
    return {
      message: getActionErrorMessage(error, "Space type could not be created."),
      ok: false,
    };
  }
}

export async function updateVenueTypeAction(formData: FormData) {
  await requireSuperadmin();

  try {
    await updateVenueTypeRecord(formData);
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

export async function updateVenueTypeInlineAction(
  formData: FormData,
): Promise<VenueTypeActionResult> {
  await requireSuperadmin();

  try {
    const type = await updateVenueTypeRecord(formData);

    revalidateTypesAndVenues();

    return {
      message: "Space type updated successfully.",
      ok: true,
      type,
    };
  } catch (error) {
    return {
      message: getActionErrorMessage(error, "Space type could not be updated."),
      ok: false,
    };
  }
}

export async function deleteVenueTypeAction(formData: FormData) {
  await requireSuperadmin();

  try {
    await deleteVenueTypeRecord(formData);
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

export async function deleteVenueTypeInlineAction(
  formData: FormData,
): Promise<DeleteVenueTypeActionResult> {
  await requireSuperadmin();

  try {
    const deletedId = await deleteVenueTypeRecord(formData);

    revalidateTypesAndVenues();

    return {
      deletedId,
      message: "Space type deleted successfully.",
      ok: true,
    };
  } catch (error) {
    return {
      message: getActionErrorMessage(error, "Space type could not be deleted."),
      ok: false,
    };
  }
}

async function createVenueTypeRecord(formData: FormData) {
  const name = getRequiredFormString(formData, "name");
  const description = getFormString(formData, "description");
  const result = await query<{ id: string }>(
    `INSERT INTO venue_types (name, description)
     VALUES ($1, $2)
     RETURNING id`,
    [name, description],
  );
  const id = result.rows[0]?.id;

  if (!id) {
    throw new Error("Space type could not be created.");
  }

  return getVenueTypeById(id);
}

async function updateVenueTypeRecord(formData: FormData) {
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

  return getVenueTypeById(id);
}

async function deleteVenueTypeRecord(formData: FormData) {
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

  return id;
}

async function getVenueTypeById(id: string) {
  const result = await query<VenueTypeRow>(
    `SELECT
       vt.id,
       vt.name,
       vt.description,
       count(v.id)::text AS venue_count
     FROM venue_types vt
     LEFT JOIN venues v ON v.type_id = vt.id
     WHERE vt.id = $1
     GROUP BY vt.id, vt.name, vt.description
     LIMIT 1`,
    [id],
  );
  const row = result.rows[0];

  if (!row) {
    throw new Error("Space type was not found.");
  }

  return {
    description: row.description,
    id: row.id,
    name: row.name,
    venueCount: Number(row.venue_count),
  };
}

function revalidateTypesAndVenues() {
  revalidatePath("/types");
  revalidatePath("/venues");
}
