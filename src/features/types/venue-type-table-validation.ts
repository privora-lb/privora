import type { VenueType } from "@/lib/types";

export type VenueTypeDraft = VenueType & {
  isNew?: boolean;
};

export type VenueTypeValidationField = "name";
export type VenueTypeValidationErrors = Partial<
  Record<VenueTypeValidationField, string>
>;

export function getFirstVenueTypeValidationMessage(
  errors: VenueTypeValidationErrors,
) {
  return errors.name ?? "Fix the highlighted space type fields.";
}

export function getVenueTypeValidationError(
  errors: Record<string, VenueTypeValidationErrors>,
  rowId: string,
  field: VenueTypeValidationField,
) {
  return errors[rowId]?.[field];
}

export function validateVenueTypeDraft(
  row: VenueTypeDraft,
  types: VenueType[],
) {
  const errors: VenueTypeValidationErrors = {};
  const normalizedName = row.name.trim().toLowerCase();

  if (!normalizedName) {
    errors.name = "Space type name is required.";
  } else if (
    types.some(
      (type) =>
        type.id !== row.id && type.name.trim().toLowerCase() === normalizedName,
    )
  ) {
    errors.name = "A space type with this name already exists.";
  }

  return errors;
}
