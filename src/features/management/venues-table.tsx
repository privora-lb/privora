"use client";

import { Save, X } from "lucide-react";
import {
  useCallback,
  useMemo,
  useState,
  type MouseEvent,
} from "react";

import {
  createVenueAction,
  toggleVenueActiveAction,
  updateVenueAction,
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
  const [fieldErrors, setFieldErrors] = useState<
    Record<string, VenueValidationErrors>
  >({});
  const [drafts, setDrafts] = useState<Record<string, VenueDraft>>(() =>
    Object.fromEntries(venues.map((venue) => [venue.id, venue])),
  );
  const rows = useMemo(
    () => [
      ...(newVenue ? [newVenue] : []),
      ...venues.map((venue) => drafts[venue.id] ?? venue),
    ],
    [drafts, newVenue, venues],
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
          ...(current[id] ?? venues.find((venue) => venue.id === id)!),
          ...patch,
        },
      }));
    },
    [venues],
  );

  const saveVenue = useCallback(
    (row: VenueDraft, event: MouseEvent<HTMLButtonElement>) => {
      event.stopPropagation();

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

      const venueForm = document.getElementById(getVenueFormId(row.id));
      if (venueForm instanceof HTMLFormElement) {
        venueForm.requestSubmit();
      }
    },
    [pushToast],
  );

  const columns = useVenueColumns({
    clearFieldError,
    fieldErrors,
    getVenueToggleFormId,
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
      <HiddenVenueForms rows={rows} />
      <CmsDataTable
        actions={[
          {
            label: "Save venue",
            render: (row) => (
              <CmsDataTableIconButton
                className="h-7 w-7 rounded-md text-[#1f4f8f]"
                label={row.isNew ? "Create venue" : "Save venue"}
                onClick={(event) => saveVenue(row, event)}
                type="button"
              >
                <Save size={14} aria-hidden="true" />
              </CmsDataTableIconButton>
            ),
          },
          {
            label: "Cancel new venue",
            isVisible: (row) => Boolean(row.isNew),
            render: () => (
              <CmsDataTableIconButton
                className="h-7 w-7 rounded-md text-rose-700 hover:text-rose-800"
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

function HiddenVenueForms({ rows }: { rows: VenueDraft[] }) {
  return (
    <div className="hidden">
      {rows.map((row) => (
        <div key={row.id}>
          <form
            action={row.isNew ? createVenueAction : updateVenueAction}
            id={getVenueFormId(row.id)}
          >
            {!row.isNew ? <input name="id" readOnly value={row.id} /> : null}
            <input name="returnTo" readOnly value="/venues" />
            <input name="name" readOnly value={row.name} />
            <input name="typeId" readOnly value={row.typeId} />
            <input name="assignedUserId" readOnly value={row.assignedUserId} />
            <input name="description" readOnly value={row.description} />
          </form>
          {!row.isNew ? (
            <form action={toggleVenueActiveAction} id={getVenueToggleFormId(row.id)}>
              <input name="returnTo" readOnly value="/venues" />
              <input name="venueId" readOnly value={row.id} />
              <input
                name="isActive"
                readOnly
                value={row.isActive ? "false" : "true"}
              />
            </form>
          ) : null}
        </div>
      ))}
    </div>
  );
}

function getVenueFormId(id: string) {
  return `venue-form-${id}`;
}

function getVenueToggleFormId(id: string) {
  return `venue-toggle-form-${id}`;
}
