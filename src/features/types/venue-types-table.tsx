"use client";

import { Save, Trash2, X } from "lucide-react";
import {
  useCallback,
  useMemo,
  useState,
  type MouseEvent,
} from "react";

import {
  createVenueTypeAction,
  deleteVenueTypeAction,
  updateVenueTypeAction,
} from "@/app/(app)/types/actions";
import { CmsDataTable, type CmsDataTableColumn } from "@/components/cms/CmsDataTable";
import { CmsToastStack } from "@/components/cms/CmsToastStack";
import { CmsDataTableIconButton } from "@/components/cms/data-table/CmsDataTableIconButton";
import {
  cmsTableFieldErrorClassName,
  cmsTableInputClassName,
} from "@/components/cms/cms-table-controls";
import { DeleteConfirmationModal } from "@/components/cms/delete-confirmation-modal";
import { useCmsToasts } from "@/components/cms/use-cms-toasts";
import {
  getFirstVenueTypeValidationMessage,
  getVenueTypeValidationError,
  type VenueTypeDraft,
  type VenueTypeValidationErrors,
  type VenueTypeValidationField,
  validateVenueTypeDraft,
} from "@/features/types/venue-type-table-validation";
import type { VenueType } from "@/lib/types";
import { cn } from "@/lib/ui";

const newTypeId = "new-type-row";
const mobileDescriptionTextareaClassName =
  "min-h-24 w-full resize-y rounded-xl border border-[#d8e9ee] bg-white px-3 py-2.5 text-left text-[13px] font-bold leading-5 text-slate-700 outline-none transition placeholder:text-slate-400 focus:border-[#0EA5A8] focus:ring-3 focus:ring-[#0EA5A8]/15";

export function VenueTypesTable({ types }: { types: VenueType[] }) {
  const { dismissToast, pushToast, toasts } = useCmsToasts();
  const [newType, setNewType] = useState<VenueTypeDraft | null>(null);
  const [deleteType, setDeleteType] = useState<VenueTypeDraft | null>(null);
  const [fieldErrors, setFieldErrors] = useState<
    Record<string, VenueTypeValidationErrors>
  >({});
  const [drafts, setDrafts] = useState<Record<string, VenueTypeDraft>>(() =>
    Object.fromEntries(types.map((type) => [type.id, type])),
  );
  const rows = useMemo(
    () => [
      ...(newType ? [newType] : []),
      ...types.map((type) => drafts[type.id] ?? type),
    ],
    [drafts, newType, types],
  );

  const clearFieldError = useCallback(
    (rowId: string, field: VenueTypeValidationField) => {
      setFieldErrors((current) => {
        if (!current[rowId]?.[field]) {
          return current;
        }

        const nextRowErrors = { ...current[rowId] };
        delete nextRowErrors[field];

        if (Object.keys(nextRowErrors).length === 0) {
          const next = { ...current };
          delete next[rowId];
          return next;
        }

        return { ...current, [rowId]: nextRowErrors };
      });
    },
    [],
  );

  const updateDraft = useCallback(
    (id: string, patch: Partial<VenueTypeDraft>) => {
      if (id === newTypeId) {
        setNewType((current) =>
          current ? { ...current, ...patch } : current,
        );
        return;
      }

      setDrafts((current) => ({
        ...current,
        [id]: { ...(current[id] ?? types.find((type) => type.id === id)!), ...patch },
      }));
    },
    [types],
  );

  const saveType = useCallback(
    (row: VenueTypeDraft, event: MouseEvent<HTMLButtonElement>) => {
      event.stopPropagation();

      const errors = validateVenueTypeDraft(row, types);

      if (Object.keys(errors).length > 0) {
        setFieldErrors((current) => ({ ...current, [row.id]: errors }));
        pushToast("error", getFirstVenueTypeValidationMessage(errors));
        return;
      }

      setFieldErrors((current) => {
        if (!current[row.id]) {
          return current;
        }

        const next = { ...current };
        delete next[row.id];
        return next;
      });

      const typeForm = document.getElementById(getTypeFormId(row.id));
      if (typeForm instanceof HTMLFormElement) {
        typeForm.requestSubmit();
      }
    },
    [pushToast, types],
  );

  const columns = useMemo<CmsDataTableColumn<VenueTypeDraft>[]>(
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

  function addTypeRow() {
    setNewType((current) =>
      current ?? {
        id: newTypeId,
        name: "",
        description: "",
        venueCount: 0,
        isNew: true,
      },
    );
  }

  return (
    <>
      <CmsToastStack onDismiss={dismissToast} toasts={toasts} />
      <HiddenVenueTypeForms rows={rows} />
      {deleteType ? (
        <DeleteConfirmationModal
          confirmFormId={getTypeDeleteFormId(deleteType.id)}
          onCancel={() => setDeleteType(null)}
          title="Delete space type?"
        >
          This will permanently delete {deleteType.name}. It is not assigned to
          any venue, so existing venues, calendars, and approval history will
          not change.
        </DeleteConfirmationModal>
      ) : null}
      <CmsDataTable
        actions={[
          {
            label: "Save type",
            render: (row) => (
              <CmsDataTableIconButton
                className="h-7 w-7 rounded-md text-[#1f4f8f]"
                label={row.isNew ? "Create type" : "Save type"}
                onClick={(event) => saveType(row, event)}
                type="button"
              >
                <Save size={14} aria-hidden="true" />
              </CmsDataTableIconButton>
            ),
          },
          {
            label: "Delete type",
            isVisible: (row) => !row.isNew && row.venueCount === 0,
            render: (row) => (
              <CmsDataTableIconButton
                className="h-7 w-7 rounded-md text-rose-700 hover:border-rose-200 hover:bg-rose-50 hover:text-rose-800"
                label="Delete type"
                onClick={() => setDeleteType(row)}
                type="button"
              >
                <Trash2 size={14} aria-hidden="true" />
              </CmsDataTableIconButton>
            ),
          },
          {
            label: "Cancel new type",
            isVisible: (row) => Boolean(row.isNew),
            render: () => (
              <CmsDataTableIconButton
                className="h-7 w-7 rounded-md text-rose-700 hover:text-rose-800"
                label="Cancel new type"
                onClick={() => setNewType(null)}
                type="button"
              >
                <X size={14} aria-hidden="true" />
              </CmsDataTableIconButton>
            ),
          },
        ]}
        addLabel="Add type"
        columns={columns}
        description="Create and maintain the categories used by venues and spaces."
        emptyLabel="No space types have been created yet."
        getRowKey={(row) => row.id}
        noSearchResultsLabel="No space types match your search."
        onAdd={addTypeRow}
        pageSize={14}
        rows={rows}
        searchOptions={[
          { value: "__all", label: "All" },
          { value: "name", label: "Name" },
          { value: "description", label: "Description" },
        ]}
        searchPlaceholder="Search space types..."
        title="Existing space types"
      />
    </>
  );
}

function HiddenVenueTypeForms({ rows }: { rows: VenueTypeDraft[] }) {
  return (
    <div className="hidden">
      {rows.map((row) => (
        <div key={row.id}>
          <form
            action={row.isNew ? createVenueTypeAction : updateVenueTypeAction}
            id={getTypeFormId(row.id)}
          >
            {!row.isNew ? <input name="id" readOnly value={row.id} /> : null}
            <input name="returnTo" readOnly value="/types" />
            <input name="name" readOnly value={row.name} />
            <input name="description" readOnly value={row.description} />
          </form>
          {!row.isNew && row.venueCount === 0 ? (
            <form action={deleteVenueTypeAction} id={getTypeDeleteFormId(row.id)}>
              <input name="id" readOnly value={row.id} />
              <input name="returnTo" readOnly value="/types" />
            </form>
          ) : null}
        </div>
      ))}
    </div>
  );
}

function getTypeFormId(id: string) {
  return `type-form-${id}`;
}

function getTypeDeleteFormId(id: string) {
  return `type-delete-form-${id}`;
}
