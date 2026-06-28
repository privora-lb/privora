"use client";

import { Loader2, Save, X } from "lucide-react";
import {
  useCallback,
  useMemo,
  useState,
  type MouseEvent,
} from "react";

import {
  createVenueInlineAction,
  toggleVenueActiveInlineAction,
  updateVenueInlineAction,
} from "@/app/(app)/management/actions";
import { CmsDataTable } from "@/components/cms/CmsDataTable";
import { CmsToastStack } from "@/components/cms/CmsToastStack";
import { CmsDataTableIconButton } from "@/components/cms/data-table/CmsDataTableIconButton";
import { useCmsToasts } from "@/components/cms/use-cms-toasts";
import {
  ActiveStatusFilter,
  type ActiveStatusFilterValue,
} from "@/features/management/active-status-filter";
import {
  getFirstVenueValidationMessage,
  type VenueDraft,
  type VenueValidationErrors,
  type VenueValidationField,
  validateVenueDraft,
} from "@/features/management/venue-table-validation";
import { useVenueColumns } from "@/features/management/venues-table-columns";
import type { AppUser, Venue, VenueType } from "@/lib/types";

const newVenueId = "new-venue-row";
const minimumPendingMs = 450;

export function VenuesTable({
  currentUserId,
  types,
  users,
  venues,
}: {
  currentUserId: string;
  types: VenueType[];
  users: AppUser[];
  venues: Venue[];
}) {
  const { dismissToast, pushToast, toasts } = useCmsToasts();
  const [newVenue, setNewVenue] = useState<VenueDraft | null>(null);
  const [activeFilter, setActiveFilter] =
    useState<ActiveStatusFilterValue>("all");
  const [venueRows, setVenueRows] = useState<Venue[]>(venues);
  const [pendingSaveId, setPendingSaveId] = useState<string | null>(null);
  const [pendingToggleVenueId, setPendingToggleVenueId] =
    useState<string | null>(null);
  const [fieldErrors, setFieldErrors] = useState<
    Record<string, VenueValidationErrors>
  >({});
  const [drafts, setDrafts] = useState<Record<string, VenueDraft>>(() =>
    Object.fromEntries(venues.map((venue) => [venue.id, venue])),
  );
  const rows = useMemo(
    () => [
      ...(newVenue ? [newVenue] : []),
      ...venueRows.map((venue) => drafts[venue.id] ?? venue),
    ],
    [drafts, newVenue, venueRows],
  );
  const filteredRows = useMemo(
    () =>
      rows.filter((row) => {
        if (row.isNew || activeFilter === "all") {
          return true;
        }

        return activeFilter === "active" ? row.isActive : !row.isActive;
      }),
    [activeFilter, rows],
  );

  const clearFieldError = useCallback(
    (rowId: string, field: VenueValidationField) => {
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
    (id: string, patch: Partial<VenueDraft>) => {
      if (id === newVenueId) {
        setNewVenue((current) =>
          current ? { ...current, ...patch } : current,
        );
        return;
      }

      setDrafts((current) => ({
        ...current,
        [id]: {
          ...(current[id] ?? venueRows.find((venue) => venue.id === id)!),
          ...patch,
        },
      }));
    },
    [venueRows],
  );

  const applyVenueRows = useCallback(
    (nextVenues: Venue[], changedRowId?: string) => {
      setVenueRows(nextVenues);
      setDrafts((current) => {
        const next = { ...current };

        delete next[newVenueId];

        if (changedRowId) {
          const changedVenue = nextVenues.find(
            (venue) => venue.id === changedRowId,
          );

          if (changedVenue) {
            next[changedVenue.id] = changedVenue;
          }
        }

        return next;
      });
    },
    [],
  );

  const saveVenue = useCallback(
    async (row: VenueDraft, event: MouseEvent<HTMLButtonElement>) => {
      event.stopPropagation();

      if (pendingSaveId) {
        return;
      }

      const errors = validateVenueDraft(row);

      if (Object.keys(errors).length > 0) {
        setFieldErrors((current) => ({ ...current, [row.id]: errors }));
        pushToast("error", getFirstVenueValidationMessage(errors));
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

      const formData = getVenueFormData(row);
      const pendingStartedAt = Date.now();
      setPendingSaveId(row.id);

      try {
        const result = row.isNew
          ? await createVenueInlineAction(formData)
          : await updateVenueInlineAction(formData);

        if (!result.ok) {
          pushToast("error", result.message);
          return;
        }

        applyVenueRows(result.venues, row.isNew ? undefined : row.id);
        if (row.isNew) {
          setNewVenue(null);
        }
        pushToast("success", result.message);
      } finally {
        await waitForMinimumPendingTime(pendingStartedAt);
        setPendingSaveId(null);
      }
    },
    [applyVenueRows, pendingSaveId, pushToast],
  );

  const toggleVenueActive = useCallback(
    async (row: VenueDraft) => {
      if (pendingToggleVenueId) {
        return;
      }

      const formData = new FormData();
      formData.set("venueId", row.id);
      formData.set("isActive", String(!row.isActive));
      const pendingStartedAt = Date.now();
      setPendingToggleVenueId(row.id);

      try {
        const result = await toggleVenueActiveInlineAction(formData);

        if (!result.ok) {
          pushToast("error", result.message);
          return;
        }

        applyVenueRows(result.venues, row.id);
        pushToast("success", result.message);
      } finally {
        await waitForMinimumPendingTime(pendingStartedAt);
        setPendingToggleVenueId(null);
      }
    },
    [applyVenueRows, pendingToggleVenueId, pushToast],
  );

  const columns = useVenueColumns({
    clearFieldError,
    fieldErrors,
    onToggleVenueActive: toggleVenueActive,
    pendingToggleVenueId,
    types,
    updateDraft,
    users,
  });

  function addVenueRow() {
    const defaultType = types[0];
    const defaultUser =
      users.find((user) => user.id === currentUserId) ?? users[0];

    setNewVenue((current) =>
      current ?? {
        id: newVenueId,
        name: "",
        description: "",
        typeId: defaultType?.id ?? "",
        typeName: defaultType?.name ?? "",
        assignedUserId: defaultUser?.id ?? "",
        assignedUserName: defaultUser?.name ?? "",
        assignedUserRole: defaultUser?.role ?? "superadmin",
        assignedUserIsActive: defaultUser?.isActive ?? true,
        isActive: true,
        isNew: true,
      },
    );
  }

  return (
    <>
      <CmsToastStack onDismiss={dismissToast} toasts={toasts} />
      <CmsDataTable
        actions={[
          {
            label: "Save venue",
            render: (row) => {
              const isSaving = pendingSaveId === row.id;
              const Icon = isSaving ? Loader2 : Save;

              return (
                <CmsDataTableIconButton
                  className="h-7 w-7 rounded-md text-[#1f4f8f]"
                  disabled={Boolean(pendingSaveId)}
                  label={row.isNew ? "Create venue" : "Save venue"}
                  onClick={(event) => saveVenue(row, event)}
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
            label: "Cancel new venue",
            isVisible: (row) => Boolean(row.isNew),
            render: () => (
              <CmsDataTableIconButton
                className="h-7 w-7 rounded-md text-rose-700 hover:text-rose-800"
                disabled={pendingSaveId === newVenueId}
                label="Cancel new venue"
                onClick={() => setNewVenue(null)}
                type="button"
              >
                <X size={14} aria-hidden="true" />
              </CmsDataTableIconButton>
            ),
          },
        ]}
        addLabel="Add venue"
        columns={columns}
        description="Assign spaces to owners and keep their operational metadata current."
        emptyLabel="No venues or spaces have been created yet."
        getRowClassName={(row) =>
          !row.isNew && !row.isActive ? "opacity-60" : undefined
        }
        getRowKey={(row) => row.id}
        noSearchResultsLabel="No venues match your search."
        onAdd={addVenueRow}
        pageSize={14}
        rows={filteredRows}
        searchOptions={[
          { value: "__all", label: "All" },
          { value: "name", label: "Name" },
          { value: "typeName", label: "Type" },
          { value: "assignedUserName", label: "Owner" },
          { value: "description", label: "Description" },
        ]}
        searchPlaceholder="Search venues, owners, or types..."
        title="Venues and spaces"
        toolbarExtra={
          <ActiveStatusFilter
            onChange={setActiveFilter}
            value={activeFilter}
          />
        }
      />
    </>
  );
}

function getVenueFormData(row: VenueDraft) {
  const formData = new FormData();

  if (!row.isNew) {
    formData.set("id", row.id);
  }
  formData.set("name", row.name);
  formData.set("typeId", row.typeId);
  formData.set("assignedUserId", row.assignedUserId);
  formData.set("description", row.description);

  return formData;
}

async function waitForMinimumPendingTime(startedAt: number) {
  const remainingMs = minimumPendingMs - (Date.now() - startedAt);

  if (remainingMs > 0) {
    await new Promise((resolve) => window.setTimeout(resolve, remainingMs));
  }
}
