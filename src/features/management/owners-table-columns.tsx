"use client";

import {
  useMemo,
  type Dispatch,
  type SetStateAction,
} from "react";

import { ActiveSwitch } from "@/components/cms/active-switch";
import { type CmsDataTableColumn } from "@/components/cms/CmsDataTable";
import { cmsTableInputClassName } from "@/components/cms/cms-table-controls";
import { PasswordInput } from "@/components/ui/password-input";
import {
  getOwnerInputClassName,
  getOwnerValidationError,
  type OwnerDraft,
  type OwnerValidationErrors,
  type OwnerValidationField,
} from "@/features/management/owner-table-validation";
import type { AppUser, Venue } from "@/lib/types";

const cmsTablePasswordInputClassName =
  "min-h-[35px] w-full border-0 bg-transparent px-3 pr-9 text-[12px] font-bold text-slate-700 outline-none transition placeholder:text-slate-400 focus:bg-white focus:text-slate-950 focus:ring-2 focus:ring-inset focus:ring-[#0EA5A8]/20";

type UseOwnerColumnsParams = {
  clearFieldError: (rowId: string, field: OwnerValidationField) => void;
  fieldErrors: Record<string, OwnerValidationErrors>;
  getOwnerToggleFormId: (id: string) => string;
  ownerVenuesByOwnerId: Map<string, Venue[]>;
  setActivatingOwner: Dispatch<SetStateAction<AppUser | null>>;
  updateDraft: (id: string, patch: Partial<OwnerDraft>) => void;
};

export function useOwnerColumns({
  clearFieldError,
  fieldErrors,
  getOwnerToggleFormId,
  ownerVenuesByOwnerId,
  setActivatingOwner,
  updateDraft,
}: UseOwnerColumnsParams) {
  return useMemo<CmsDataTableColumn<OwnerDraft>[]>(
    () => [
      {
        key: "name",
        label: "Owner name",
        baseWidth: 240,
        minWidth: 180,
        maxWidth: 380,
        grow: 0.8,
        sortable: true,
        textValue: (row) => row.name,
        render: (row) => {
          const error = getOwnerValidationError(fieldErrors, row.id, "name");

          return (
            <input
              aria-invalid={Boolean(error)}
              className={getOwnerInputClassName(cmsTableInputClassName, error)}
              onChange={(event) => {
                updateDraft(row.id, { name: event.target.value });
                clearFieldError(row.id, "name");
              }}
              placeholder={row.isNew ? "Owner name" : undefined}
              required
              title={error}
              value={row.name}
            />
          );
        },
      },
      {
        key: "phoneNumber",
        label: "Phone",
        baseWidth: 170,
        minWidth: 140,
        maxWidth: 230,
        sortable: true,
        textValue: (row) => row.phoneNumber,
        render: (row) => {
          const error = getOwnerValidationError(
            fieldErrors,
            row.id,
            "phoneNumber",
          );

          return (
            <input
              aria-invalid={Boolean(error)}
              className={getOwnerInputClassName(cmsTableInputClassName, error)}
              inputMode="numeric"
              maxLength={8}
              onChange={(event) => {
                updateDraft(row.id, {
                  phoneNumber: event.target.value.replace(/\D/g, "").slice(0, 8),
                });
                clearFieldError(row.id, "phoneNumber");
              }}
              pattern="\d{8}"
              placeholder={row.isNew ? "70123456" : undefined}
              required
              title={error}
              value={row.phoneNumber}
            />
          );
        },
      },
      {
        key: "email",
        label: "Email",
        baseWidth: 280,
        minWidth: 220,
        maxWidth: 420,
        grow: 1,
        sortable: true,
        textValue: (row) => row.email ?? "",
        render: (row) => {
          const error = getOwnerValidationError(fieldErrors, row.id, "email");

          return (
            <input
              aria-invalid={Boolean(error)}
              className={getOwnerInputClassName(cmsTableInputClassName, error)}
              onChange={(event) => {
                updateDraft(row.id, { email: event.target.value });
                clearFieldError(row.id, "email");
              }}
              placeholder={row.isNew ? "owner@example.com" : undefined}
              title={error}
              type="email"
              value={row.email ?? ""}
            />
          );
        },
      },
      {
        key: "isActive",
        label: "Active",
        align: "center",
        baseWidth: 110,
        minWidth: 92,
        maxWidth: 140,
        sortable: true,
        sortType: "number",
        sortValue: (row) => (row.isActive ? 1 : 0),
        textValue: (row) => (row.isActive ? "Active" : "Inactive"),
        render: (row) => {
          if (row.isNew) {
            return (
              <ActiveSwitch
                checked
                className="mx-auto"
                disabled
                label="New owners are active by default"
              />
            );
          }

          const assignedVenues = ownerVenuesByOwnerId.get(row.id) ?? [];
          const shouldChooseVenues = !row.isActive && assignedVenues.length > 1;

          if (shouldChooseVenues) {
            return (
              <ActiveSwitch
                checked={row.isActive}
                className="mx-auto"
                label={`Activate ${row.name}`}
                onClick={() => setActivatingOwner(row)}
                type="button"
              />
            );
          }

          return (
            <ActiveSwitch
              checked={row.isActive}
              className="mx-auto"
              form={getOwnerToggleFormId(row.id)}
              label={
                row.isActive
                  ? `Deactivate ${row.name}`
                  : `Activate ${row.name}`
              }
              type="submit"
            />
          );
        },
      },
      {
        key: "password",
        label: "New password",
        baseWidth: 220,
        minWidth: 170,
        maxWidth: 340,
        textValue: () => "",
        render: (row) => {
          const error = getOwnerValidationError(
            fieldErrors,
            row.id,
            "password",
          );

          return (
            <PasswordInput
              aria-invalid={Boolean(error)}
              buttonClassName="right-1.5 h-7 w-7 text-[#0b6f7d] hover:bg-[#eefbfc] hover:text-[#0b4658]"
              className={getOwnerInputClassName(
                cmsTablePasswordInputClassName,
                error,
              )}
              onChange={(event) => {
                updateDraft(row.id, { password: event.target.value });
                clearFieldError(row.id, "password");
              }}
              placeholder={row.isNew ? "Password" : "Optional"}
              title={error}
              value={row.password}
              wrapperClassName="-mx-3 w-[calc(100%+1.5rem)]"
            />
          );
        },
      },
    ],
    [
      clearFieldError,
      fieldErrors,
      getOwnerToggleFormId,
      ownerVenuesByOwnerId,
      setActivatingOwner,
      updateDraft,
    ],
  );
}
