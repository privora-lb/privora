"use client";

import { useMemo } from "react";

import { type CmsDataTableColumn } from "@/components/cms/CmsDataTable";
import {
  cmsTableFieldErrorClassName,
  cmsTableInputClassName,
} from "@/components/cms/cms-table-controls";
import {
  getVenueTypeValidationError,
  type VenueTypeDraft,
  type VenueTypeValidationErrors,
  type VenueTypeValidationField,
} from "@/features/types/venue-type-table-validation";
import { cn } from "@/lib/ui";

const mobileDescriptionTextareaClassName =
  "min-h-24 w-full resize-y rounded-xl border border-[#d8e9ee] bg-white px-3 py-2.5 text-left text-[13px] font-bold leading-5 text-slate-700 outline-none transition placeholder:text-slate-400 focus:border-[#0EA5A8] focus:ring-3 focus:ring-[#0EA5A8]/15";

type UseVenueTypeColumnsParams = {
  clearFieldError: (rowId: string, field: VenueTypeValidationField) => void;
  fieldErrors: Record<string, VenueTypeValidationErrors>;
  updateDraft: (id: string, patch: Partial<VenueTypeDraft>) => void;
};

export function useVenueTypeColumns({
  clearFieldError,
  fieldErrors,
  updateDraft,
}: UseVenueTypeColumnsParams) {
  return useMemo<CmsDataTableColumn<VenueTypeDraft>[]>(
    () => [
      {
        key: "name",
        label: "Type name",
        baseWidth: 220,
        minWidth: 180,
        maxWidth: 360,
        grow: 0.6,
        sortable: true,
        textValue: (row) => row.name,
        render: (row) => {
          const isNameLocked = !row.isNew && row.venueCount > 0;
          const error = getVenueTypeValidationError(
            fieldErrors,
            row.id,
            "name",
          );

          return (
            <input
              aria-invalid={Boolean(error)}
              className={cn(
                cmsTableInputClassName,
                error && cmsTableFieldErrorClassName,
                isNameLocked && "cursor-not-allowed text-slate-400 opacity-80",
              )}
              disabled={isNameLocked}
              onChange={(event) => {
                updateDraft(row.id, { name: event.target.value });
                clearFieldError(row.id, "name");
              }}
              placeholder={row.isNew ? "Type name" : undefined}
              required
              title={
                error ??
                (isNameLocked
                  ? "This type name is locked because venues use it."
                  : undefined)
              }
              value={row.name}
            />
          );
        },
      },
      {
        key: "venueCount",
        label: "Usage",
        align: "center",
        baseWidth: 150,
        minWidth: 120,
        maxWidth: 220,
        sortable: true,
        sortType: "number",
        sortValue: (row) => row.venueCount,
        textValue: (row) =>
          row.venueCount > 0 ? `Used by ${row.venueCount} venues` : "Unused",
        render: (row) =>
          row.isNew ? (
            <span className="inline-flex h-7 items-center justify-center rounded-md border border-slate-200 bg-slate-50 px-2.5 text-xs font-medium text-slate-600">
              New
            </span>
          ) : row.venueCount > 0 ? (
            <span className="inline-flex h-7 items-center justify-center rounded-md border border-cyan-200 bg-cyan-50 px-2.5 text-xs font-medium text-cyan-800">
              Used by {row.venueCount}
            </span>
          ) : (
            <span className="inline-flex h-7 items-center justify-center rounded-md border border-emerald-200 bg-emerald-50 px-2.5 text-xs font-medium text-emerald-800">
              Unused
            </span>
          ),
      },
      {
        key: "description",
        label: "Description",
        baseWidth: 420,
        minWidth: 260,
        maxWidth: 720,
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
    [clearFieldError, fieldErrors, updateDraft],
  );
}
