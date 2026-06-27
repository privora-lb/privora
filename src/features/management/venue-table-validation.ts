import type { Venue } from "@/lib/types";

export type VenueDraft = Venue & {
  isNew?: boolean;
};

export type VenueValidationField = "assignedUserId" | "name" | "typeId";
export type VenueValidationErrors = Partial<
  Record<VenueValidationField, string>
>;

export function getVenueValidationError(
  errors: Record<string, VenueValidationErrors>,
  rowId: string,
  field: VenueValidationField,
) {
  return errors[rowId]?.[field];
}

export function getFirstVenueValidationMessage(
  errors: VenueValidationErrors,
) {
  return (
    errors.name ??
    errors.typeId ??
    errors.assignedUserId ??
    "Fix the highlighted venue fields."
  );
}

export function validateVenueDraft(row: VenueDraft) {
  const errors: VenueValidationErrors = {};

  if (!row.name.trim()) {
    errors.name = "Venue or space name is required.";
  }

  if (!row.typeId) {
    errors.typeId = "Select a space type.";
  }

  if (!row.assignedUserId) {
    errors.assignedUserId = "Select an assigned user.";
  }

  return errors;
}
