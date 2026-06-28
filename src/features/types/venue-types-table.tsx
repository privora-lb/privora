"use client";

import { Loader2, Save, Trash2, X } from "lucide-react";
import {
  useCallback,
  useMemo,
  useState,
  type MouseEvent,
} from "react";

import {
  createVenueTypeInlineAction,
  deleteVenueTypeInlineAction,
  updateVenueTypeInlineAction,
} from "@/app/(app)/types/actions";
import { CmsDataTable } from "@/components/cms/CmsDataTable";
import { CmsToastStack } from "@/components/cms/CmsToastStack";
import { CmsDataTableIconButton } from "@/components/cms/data-table/CmsDataTableIconButton";
import { DeleteConfirmationModal } from "@/components/cms/delete-confirmation-modal";
import { useCmsToasts } from "@/components/cms/use-cms-toasts";
import {
  getFirstVenueTypeValidationMessage,
  type VenueTypeDraft,
  type VenueTypeValidationErrors,
  type VenueTypeValidationField,
  validateVenueTypeDraft,
} from "@/features/types/venue-type-table-validation";
import { useVenueTypeColumns } from "@/features/types/venue-types-table-columns";
import type { VenueType } from "@/lib/types";

const newTypeId = "new-type-row";
const minimumPendingMs = 450;

export function VenueTypesTable({ types }: { types: VenueType[] }) {
  const { dismissToast, pushToast, toasts } = useCmsToasts();
  const [newType, setNewType] = useState<VenueTypeDraft | null>(null);
  const [deleteType, setDeleteType] = useState<VenueTypeDraft | null>(null);
  const [typeRows, setTypeRows] = useState<VenueType[]>(types);
  const [pendingDeleteId, setPendingDeleteId] = useState<string | null>(null);
  const [pendingSaveId, setPendingSaveId] = useState<string | null>(null);
  const [fieldErrors, setFieldErrors] = useState<
    Record<string, VenueTypeValidationErrors>
  >({});
  const [drafts, setDrafts] = useState<Record<string, VenueTypeDraft>>(() =>
    Object.fromEntries(types.map((type) => [type.id, type])),
  );
  const rows = useMemo(
    () => [
      ...(newType ? [newType] : []),
      ...typeRows.map((type) => drafts[type.id] ?? type),
    ],
    [drafts, newType, typeRows],
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
        [id]: {
          ...(current[id] ?? typeRows.find((type) => type.id === id)!),
          ...patch,
        },
      }));
    },
    [typeRows],
  );

  const applyTypeMutation = useCallback((type: VenueType) => {
    setTypeRows((current) => {
      const exists = current.some((item) => item.id === type.id);
      const next = exists
        ? current.map((item) => (item.id === type.id ? type : item))
        : [type, ...current];

      return [...next].sort((a, b) => a.name.localeCompare(b.name));
    });
    setDrafts((current) => {
      const next = { ...current };
      delete next[newTypeId];
      next[type.id] = type;
      return next;
    });
  }, []);

  const saveType = useCallback(
    async (row: VenueTypeDraft, event: MouseEvent<HTMLButtonElement>) => {
      event.stopPropagation();

      if (pendingSaveId) {
        return;
      }

      const errors = validateVenueTypeDraft(row, typeRows);

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

      const formData = getTypeFormData(row);
      const pendingStartedAt = Date.now();
      setPendingSaveId(row.id);

      try {
        const result = row.isNew
          ? await createVenueTypeInlineAction(formData)
          : await updateVenueTypeInlineAction(formData);

        if (!result.ok) {
          pushToast("error", result.message);
          return;
        }

        applyTypeMutation(result.type);
        if (row.isNew) {
          setNewType(null);
        }
        pushToast("success", result.message);
      } finally {
        await waitForMinimumPendingTime(pendingStartedAt);
        setPendingSaveId(null);
      }
    },
    [applyTypeMutation, pendingSaveId, pushToast, typeRows],
  );

  const deleteSelectedType = useCallback(async (row: VenueTypeDraft) => {
    if (pendingDeleteId) {
      return;
    }

    const formData = new FormData();
    formData.set("id", row.id);
    const pendingStartedAt = Date.now();
    setPendingDeleteId(row.id);

    try {
      const result = await deleteVenueTypeInlineAction(formData);

      if (!result.ok) {
        pushToast("error", result.message);
        setDeleteType(null);
        return;
      }

      setTypeRows((current) =>
        current.filter((type) => type.id !== result.deletedId),
      );
      setDrafts((current) => {
        const next = { ...current };
        delete next[result.deletedId];
        return next;
      });
      setDeleteType(null);
      pushToast("success", result.message);
    } finally {
      await waitForMinimumPendingTime(pendingStartedAt);
      setPendingDeleteId(null);
    }
  }, [pendingDeleteId, pushToast]);

  const columns = useVenueTypeColumns({
    clearFieldError,
    fieldErrors,
    updateDraft,
  });

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
      {deleteType ? (
        <DeleteConfirmationModal
          isConfirming={pendingDeleteId === deleteType.id}
          onCancel={() => setDeleteType(null)}
          onConfirm={() => {
            void deleteSelectedType(deleteType);
          }}
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
            render: (row) => {
              const isSaving = pendingSaveId === row.id;
              const Icon = isSaving ? Loader2 : Save;

              return (
                <CmsDataTableIconButton
                  className="h-7 w-7 rounded-md text-[#1f4f8f]"
                  disabled={Boolean(pendingSaveId)}
                  label={row.isNew ? "Create type" : "Save type"}
                  onClick={(event) => saveType(row, event)}
                  type="button"
                >
                  <Icon
                    className={isSaving ? "animate-spin" : undefined}
                    size={14}
                    aria-hidden="true"
                  />
                </CmsDataTableIconButton>
              );
            },
          },
          {
            label: "Delete type",
            isVisible: (row) => !row.isNew && row.venueCount === 0,
            render: (row) => {
              const isDeleting = pendingDeleteId === row.id;
              const Icon = isDeleting ? Loader2 : Trash2;

              return (
                <CmsDataTableIconButton
                  className="h-7 w-7 rounded-md text-rose-700 hover:border-rose-200 hover:bg-rose-50 hover:text-rose-800"
                  disabled={Boolean(pendingDeleteId)}
                  label="Delete type"
                  onClick={() => setDeleteType(row)}
                  type="button"
                >
                  <Icon
                    className={isDeleting ? "animate-spin" : undefined}
                    size={14}
                    aria-hidden="true"
                  />
                </CmsDataTableIconButton>
              );
            },
          },
          {
            label: "Cancel new type",
            isVisible: (row) => Boolean(row.isNew),
            render: () => (
              <CmsDataTableIconButton
                className="h-7 w-7 rounded-md text-rose-700 hover:text-rose-800"
                disabled={pendingSaveId === newTypeId}
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

function getTypeFormData(row: VenueTypeDraft) {
  const formData = new FormData();

  if (!row.isNew) {
    formData.set("id", row.id);
  }
  formData.set("name", row.name);
  formData.set("description", row.description);

  return formData;
}

async function waitForMinimumPendingTime(startedAt: number) {
  const remainingMs = minimumPendingMs - (Date.now() - startedAt);

  if (remainingMs > 0) {
    await new Promise((resolve) => window.setTimeout(resolve, remainingMs));
  }
}
