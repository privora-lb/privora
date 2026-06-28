"use client";

import { useMemo } from "react";

import { ActiveSwitch } from "@/components/cms/active-switch";
import { type CmsDataTableColumn } from "@/components/cms/CmsDataTable";
import {
  cmsTableFieldErrorClassName,
  cmsTableInputClassName,
  cmsTableSelectClassName,
} from "@/components/cms/cms-table-controls";
import { AssignedUserCell } from "@/features/management/assigned-user-cell";
import {
  getVenueValidationError,
  type VenueDraft,
  type VenueValidationErrors,
  type VenueValidationField,
} from "@/features/management/venue-table-validation";
import type { AppUser, VenueType } from "@/lib/types";
import { cn } from "@/lib/ui";

const mobileDescriptionTextareaClassName =
  "min-h-24 w-full resize-y rounded-xl border border-[#d8e9ee] bg-white px-3 py-2.5 text-left text-[13px] font-bold leading-5 text-slate-700 outline-none transition placeholder:text-slate-400 focus:border-[#0EA5A8] focus:ring-3 focus:ring-[#0EA5A8]/15";

type UseVenueColumnsParams = {
  clearFieldError: (rowId: string, field: VenueValidationField) => void;
  fieldErrors: Record<string, VenueValidationErrors>;
  onToggleVenueActive: (row: VenueDraft) => void;
  pendingToggleVenueId: string | null;
  types: VenueType[];
  updateDraft: (id: string, patch: Partial<VenueDraft>) => void;
  users: AppUser[];
};

export function useVenueColumns({
  clearFieldError,
  fieldErrors,
  onToggleVenueActive,
  pendingToggleVenueId,
  types,
  updateDraft,
  users,
}: UseVenueColumnsParams) {
  return useMemo<CmsDataTableColumn<VenueDraft>[]>(
    () => [
      {
        key: "name",
        label: "Venue or space",
        baseWidth: 250,
        minWidth: 190,
        maxWidth: 420,
        grow: 0.8,
        sortable: true,
        textValue: (row) => row.name,
        render: (row) => {
          const error = getVenueValidationError(fieldErrors, row.id, "name");

          return (
            <input
              aria-invalid={Boolean(error)}
              className={cn(
                cmsTableInputClassName,
                error && cmsTableFieldErrorClassName,
              )}
              onChange={(event) => {
                updateDraft(row.id, { name: event.target.value });
                clearFieldError(row.id, "name");
              }}
              placeholder={row.isNew ? "Venue or space name" : undefined}
              required
              title={error}
              value={row.name}
            />
          );
        },
      },
      {
        key: "typeName",
        label: "Type",
        baseWidth: 190,
        minWidth: 160,
        maxWidth: 320,
        sortable: true,
        textValue: (row) => row.typeName,
        render: (row) => {
          const error = getVenueValidationError(fieldErrors, row.id, "typeId");

          return (
            <select
              aria-invalid={Boolean(error)}
              className={cn(
                cmsTableSelectClassName,
                error && cmsTableFieldErrorClassName,
              )}
              onChange={(event) => {
                const nextType = types.find(
                  (type) => type.id === event.target.value,
                );
                updateDraft(row.id, {
                  typeId: event.target.value,
                  typeName: nextType?.name ?? row.typeName,
                });
                clearFieldError(row.id, "typeId");
              }}
              title={error}
              value={row.typeId}
            >
              {row.typeId ? null : (
                <option disabled value="">
                  Select type
                </option>
              )}
              {types.map((type) => (
                <option key={type.id} value={type.id}>
                  {type.name}
                </option>
              ))}
            </select>
          );
        },
      },
      {
        key: "assignedUserName",
        label: "Assigned to",
        baseWidth: 240,
        minWidth: 190,
        maxWidth: 400,
        grow: 0.7,
        sortable: true,
        textValue: (row) => row.assignedUserName,
        render: (row) => {
          const error = getVenueValidationError(
            fieldErrors,
            row.id,
            "assignedUserId",
          );

          return (
            <AssignedUserCell
              error={error}
              onChange={(nextUser) => {
                updateDraft(row.id, {
                  assignedUserId: nextUser.id,
                  assignedUserName: nextUser.name,
                  assignedUserRole: nextUser.role,
                  assignedUserIsActive: nextUser.isActive,
                });
                clearFieldError(row.id, "assignedUserId");
              }}
              selectedUserId={row.assignedUserId}
              users={users}
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
                label="New venues are active by default"
              />
            );
          }

          return (
            <ActiveSwitch
              checked={row.isActive}
              className="mx-auto"
              disabled={pendingToggleVenueId === row.id}
              isLoading={pendingToggleVenueId === row.id}
              label={
                row.isActive
                  ? `Deactivate ${row.name}`
                  : `Activate ${row.name}`
              }
              onClick={() => onToggleVenueActive(row)}
              type="button"
            />
          );
        },
      },
      {
        key: "description",
        label: "Description",
        baseWidth: 320,
        minWidth: 220,
        maxWidth: 560,
        grow: 1,
        sortable: true,
        textValue: (row) => row.description,
        render: (row) => (
          <input
            className={cmsTableInputClassName}
            onChange={(event) =>
              updateDraft(row.id, { description: event.target.value })
            }
            placeholder="Description"
            value={row.description}
          />
        ),
        mobileRender: (row) => (
          <textarea
            className={mobileDescriptionTextareaClassName}
            onChange={(event) =>
              updateDraft(row.id, { description: event.target.value })
            }
            placeholder="Description"
            value={row.description}
          />
        ),
      },
    ],
    [
      clearFieldError,
      fieldErrors,
      onToggleVenueActive,
      pendingToggleVenueId,
      types,
      updateDraft,
      users,
    ],
  );
}
