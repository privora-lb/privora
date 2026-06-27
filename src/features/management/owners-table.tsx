"use client";

import { Save, X } from "lucide-react";
import {
  useCallback,
  useMemo,
  useState,
  type MouseEvent,
} from "react";

import {
  createOwnerAction,
  toggleOwnerActiveAction,
  updateOwnerAction,
} from "@/app/(app)/management/actions";
import { CmsDataTable } from "@/components/cms/CmsDataTable";
import { CmsToastStack } from "@/components/cms/CmsToastStack";
import { CmsDataTableIconButton } from "@/components/cms/data-table/CmsDataTableIconButton";
import { useCmsToasts } from "@/components/cms/use-cms-toasts";
import {
  ActiveStatusFilter,
  type ActiveStatusFilterValue,
} from "@/features/management/active-status-filter";
import { OwnerActivationModal } from "@/features/management/owner-activation-modal";
import {
  getFirstOwnerValidationMessage,
  type OwnerDraft,
  type OwnerValidationErrors,
  type OwnerValidationField,
  validateOwnerDraft,
} from "@/features/management/owner-table-validation";
import { useOwnerColumns } from "@/features/management/owners-table-columns";
import type { AppUser, Venue } from "@/lib/types";

const newOwnerId = "new-owner-row";

export function OwnersTable({
  owners,
  venues,
}: {
  owners: AppUser[];
  venues: Venue[];
}) {
  const { dismissToast, pushToast, toasts } = useCmsToasts();
  const [newOwner, setNewOwner] = useState<OwnerDraft | null>(null);
  const [activatingOwner, setActivatingOwner] = useState<AppUser | null>(null);
  const [activeFilter, setActiveFilter] =
    useState<ActiveStatusFilterValue>("all");
  const [fieldErrors, setFieldErrors] = useState<
    Record<string, OwnerValidationErrors>
  >({});
  const [drafts, setDrafts] = useState<Record<string, OwnerDraft>>(() =>
    Object.fromEntries(
      owners.map((owner) => [owner.id, { ...owner, password: "" }]),
    ),
  );
  const ownerVenuesByOwnerId = useMemo(() => {
    const grouped = new Map<string, Venue[]>();

    venues.forEach((venue) => {
      grouped.set(venue.assignedUserId, [
        ...(grouped.get(venue.assignedUserId) ?? []),
        venue,
      ]);
    });

    return grouped;
  }, [venues]);
  const rows = useMemo(
    () => [
      ...(newOwner ? [newOwner] : []),
      ...owners.map(
        (owner) => drafts[owner.id] ?? { ...owner, password: "" },
      ),
    ],
    [drafts, newOwner, owners],
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
    (rowId: string, field: OwnerValidationField) => {
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
    (id: string, patch: Partial<OwnerDraft>) => {
      if (id === newOwnerId) {
        setNewOwner((current) =>
          current ? { ...current, ...patch } : current,
        );
        return;
      }

      setDrafts((current) => ({
        ...current,
        [id]: {
          ...(current[id] ?? {
            ...owners.find((owner) => owner.id === id)!,
            password: "",
          }),
          ...patch,
        },
      }));
    },
    [owners],
  );

  const saveOwner = useCallback(
    (row: OwnerDraft, event: MouseEvent<HTMLButtonElement>) => {
      event.stopPropagation();

      const errors = validateOwnerDraft(row, owners);

      if (Object.keys(errors).length > 0) {
        setFieldErrors((current) => ({ ...current, [row.id]: errors }));
        pushToast("error", getFirstOwnerValidationMessage(errors));
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

      const ownerForm = document.getElementById(getOwnerFormId(row.id));
      if (ownerForm instanceof HTMLFormElement) {
        ownerForm.requestSubmit();
      }
    },
    [owners, pushToast],
  );

  const columns = useOwnerColumns({
    clearFieldError,
    fieldErrors,
    getOwnerToggleFormId,
    ownerVenuesByOwnerId,
    setActivatingOwner,
    updateDraft,
  });

  function addOwnerRow() {
    setNewOwner((current) =>
      current ?? {
        id: newOwnerId,
        name: "",
        email: "",
        phoneNumber: "",
        password: "",
        role: "owner",
        isActive: true,
        isNew: true,
      },
    );
  }

  return (
    <>
      <CmsToastStack onDismiss={dismissToast} toasts={toasts} />
      <HiddenOwnerForms rows={rows} />
      {activatingOwner ? (
        <OwnerActivationModal
          onClose={() => setActivatingOwner(null)}
          owner={activatingOwner}
          venues={ownerVenuesByOwnerId.get(activatingOwner.id) ?? []}
        />
      ) : null}
      <CmsDataTable
        actions={[
          {
            label: "Save owner",
            render: (row) => (
              <CmsDataTableIconButton
                className="h-7 w-7 rounded-md text-[#1f4f8f]"
                label={row.isNew ? "Create owner" : "Save owner"}
                onClick={(event) => saveOwner(row, event)}
                type="button"
              >
                <Save size={14} aria-hidden="true" />
              </CmsDataTableIconButton>
            ),
          },
          {
            label: "Cancel new owner",
            isVisible: (row) => Boolean(row.isNew),
            render: () => (
              <CmsDataTableIconButton
                className="h-7 w-7 rounded-md text-rose-700 hover:text-rose-800"
                label="Cancel new owner"
                onClick={() => setNewOwner(null)}
                type="button"
              >
                <X size={14} aria-hidden="true" />
              </CmsDataTableIconButton>
            ),
          },
        ]}
        addLabel="Add owner"
        columns={columns}
        description="Update owner accounts without leaving the management view."
        emptyLabel="No owners have been created yet."
        getRowClassName={(row) =>
          !row.isNew && !row.isActive ? "opacity-60" : undefined
        }
        getRowKey={(row) => row.id}
        noSearchResultsLabel="No owners match your search."
        onAdd={addOwnerRow}
        pageSize={14}
        rows={filteredRows}
        searchOptions={[
          { value: "__all", label: "All" },
          { value: "name", label: "Name" },
          { value: "phoneNumber", label: "Phone" },
          { value: "email", label: "Email" },
        ]}
        searchPlaceholder="Search owners..."
        title="Owners"
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

function HiddenOwnerForms({ rows }: { rows: OwnerDraft[] }) {
  return (
    <div className="hidden">
      {rows.map((row) => (
        <div key={row.id}>
          <form
            action={row.isNew ? createOwnerAction : updateOwnerAction}
            id={getOwnerFormId(row.id)}
          >
            {!row.isNew ? <input name="id" readOnly value={row.id} /> : null}
            <input name="returnTo" readOnly value="/owners" />
            <input name="name" readOnly value={row.name} />
            <input name="phoneNumber" readOnly value={row.phoneNumber} />
            <input name="email" readOnly value={row.email ?? ""} />
            <input name="password" readOnly value={row.password} />
          </form>
          {!row.isNew ? (
            <form action={toggleOwnerActiveAction} id={getOwnerToggleFormId(row.id)}>
              <input name="returnTo" readOnly value="/owners" />
              <input name="ownerId" readOnly value={row.id} />
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

function getOwnerFormId(id: string) {
  return `owner-form-${id}`;
}

function getOwnerToggleFormId(id: string) {
  return `owner-toggle-form-${id}`;
}
