import type { AppUser } from "@/lib/types";
import { cn } from "@/lib/ui";

export type OwnerDraft = AppUser & {
  isNew?: boolean;
  password: string;
};

export type OwnerValidationField = "email" | "name" | "phoneNumber" | "password";
export type OwnerValidationErrors = Partial<
  Record<OwnerValidationField, string>
>;

const ownerFieldErrorClassName =
  "bg-rose-50 text-rose-900 ring-2 ring-inset ring-rose-300 placeholder:text-rose-300 focus:bg-rose-50 focus:ring-rose-400";

export function getOwnerInputClassName(
  className: string,
  error?: string,
) {
  return cn(className, error && ownerFieldErrorClassName);
}

export function getOwnerValidationError(
  errors: Record<string, OwnerValidationErrors>,
  rowId: string,
  field: OwnerValidationField,
) {
  return errors[rowId]?.[field];
}

export function getFirstOwnerValidationMessage(
  errors: OwnerValidationErrors,
) {
  return (
    errors.name ??
    errors.phoneNumber ??
    errors.email ??
    errors.password ??
    "Fix the highlighted owner fields."
  );
}

export function validateOwnerDraft(row: OwnerDraft, owners: AppUser[]) {
  const errors: OwnerValidationErrors = {};
  const normalizedName = row.name.trim().toLowerCase();
  const normalizedEmail = (row.email ?? "").trim().toLowerCase();
  const phoneNumber = row.phoneNumber.trim();

  if (!normalizedName) {
    errors.name = "Owner name is required.";
  } else if (
    owners.some(
      (owner) =>
        owner.id !== row.id &&
        owner.name.trim().toLowerCase() === normalizedName,
    )
  ) {
    errors.name = "An owner with this name already exists.";
  }

  if (!phoneNumber) {
    errors.phoneNumber = "Phone number is required.";
  } else if (!/^\d{8}$/.test(phoneNumber)) {
    errors.phoneNumber = "Phone number must be exactly 8 digits.";
  } else if (
    owners.some(
      (owner) => owner.id !== row.id && owner.phoneNumber === phoneNumber,
    )
  ) {
    errors.phoneNumber = "An owner with this phone number already exists.";
  }

  if (
    normalizedEmail &&
    owners.some(
      (owner) =>
        owner.id !== row.id &&
        (owner.email ?? "").trim().toLowerCase() === normalizedEmail,
    )
  ) {
    errors.email = "An owner with this email already exists.";
  }

  if (row.isNew && !row.password.trim()) {
    errors.password = "Password is required for a new owner.";
  }

  return errors;
}
