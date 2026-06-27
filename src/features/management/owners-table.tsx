"use client";

import { Loader2, Save, X } from "lucide-react";
import {
  useCallback,
  useMemo,
  useState,
  type MouseEvent,
} from "react";

import {
  createOwnerInlineAction,
  toggleOwnerActiveInlineAction,
  updateOwnerInlineAction,
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
  const [ownerRows, setOwnerRows] = useState<AppUser[]>(owners);
  const [pendingSaveId, setPendingSaveId] = useState<string | null>(null);
  const [pendingToggleOwnerId, setPendingToggleOwnerId] =
    useState<string | null>(null);
  const [venueRows, setVenueRows] = useState<Venue[]>(venues);
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

    venueRows.forEach((venue) => {
      grouped.set(venue.assignedUserId, [
        ...(grouped.get(venue.assignedUserId) ?? []),
        venue,
      ]);
    });

    return grouped;
  }, [venueRows]);
  const rows = useMemo(
    () => [
      ...(newOwner ? [newOwner] : []),
      ...ownerRows.map(
        (owner) => drafts[owner.id] ?? { ...owner, password: "" },
      ),
    ],
    [drafts, newOwner, ownerRows],
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
            ...ownerRows.find((owner) => owner.id === id)!,
            password: "",
          }),
          ...patch,
        },
      }));
    },
    [ownerRows],
  );

  const applyOwnerMutation = useCallback(
    (owner: AppUser, affectedVenues?: Venue[]) => {
      setOwnerRows((current) => {
        const exists = current.some((item) => item.id === owner.id);
        const next = exists
          ? current.map((item) => (item.id === owner.id ? owner : item))
          : [owner, ...current];

        return [...next].sort((a, b) => a.name.localeCompare(b.name));
      });
      setDrafts((current) => {
        const next = { ...current };
        delete next[newOwnerId];
        next[owner.id] = { ...owner, password: "" };
        return next;
      });
      setVenueRows((current) => {
        if (affectedVenues?.length) {
          const affectedById = new Map(
            affectedVenues.map((venue) => [venue.id, venue]),
          );

          return current.map((venue) => affectedById.get(venue.id) ?? venue);
        }

        return current.map((venue) =>
          venue.assignedUserId === owner.id
            ? {
                ...venue,
                assignedUserIsActive: owner.isActive,
                assignedUserName: owner.name,
              }
            : venue,
        );
      });
    },
    [],
  );

  const saveOwner = useCallback(
    async (row: OwnerDraft, event: MouseEvent<HTMLButtonElement>) => {
      event.stopPropagation();

      if (pendingSaveId) {
        return;
      }

      const errors = validateOwnerDraft(row, ownerRows);

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

      const formData = getOwnerFormData(row);
      setPendingSaveId(row.id);

      try {
        const result = row.isNew
          ? await createOwnerInlineAction(formData)
          : await updateOwnerInlineAction(formData);

        if (!result.ok) {
          pushToast("error", result.message);
          return;
        }

        applyOwnerMutation(result.owner, result.affectedVenues);
        if (row.isNew) {
          setNewOwner(null);
        }
        pushToast("success", result.message);
      } finally {
        setPendingSaveId(null);
      }
    },
    [applyOwnerMutation, ownerRows, pendingSaveId, pushToast],
  );

  const toggleOwnerActive = useCallback(
    async (
      row: AppUser,
      nextIsActive = !row.isActive,
      venueIds: string[] = [],
    ) => {
      if (pendingToggleOwnerId) {
        return;
      }

      const formData = new FormData();
      formData.set("ownerId", row.id);
      formData.set("isActive", String(nextIsActive));
      venueIds.forEach((venueId) => formData.append("venueIds", venueId));
      setPendingToggleOwnerId(row.id);

      try {
        const result = await toggleOwnerActiveInlineAction(formData);

        if (!result.ok) {
          pushToast("error", result.message);
          return;
        }

        applyOwnerMutation(result.owner, result.affectedVenues);
        setActivatingOwner((current) =>
          current?.id === result.owner.id ? null : current,
        );
        pushToast("success", result.message);
      } finally {
        setPendingToggleOwnerId(null);
      }
    },
    [applyOwnerMutation, pendingToggleOwnerId, pushToast],
  );

  const columns = useOwnerColumns({
    clearFieldError,
    fieldErrors,
    onToggleOwnerActive: toggleOwnerActive,
    ownerVenuesByOwnerId,
    pendingToggleOwnerId,
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
      {activatingOwner ? (
        <OwnerActivationModal
          isSubmitting={pendingToggleOwnerId === activatingOwner.id}
          onClose={() => setActivatingOwner(null)}
          onSubmit={(venueIds) =>
            toggleOwnerActive(activatingOwner, true, venueIds)
          }
          owner={activatingOwner}
          venues={ownerVenuesByOwnerId.get(activatingOwner.id) ?? []}
        />
      ) : null}
      <CmsDataTable
        actions={[
          {
            label: "Save owner",
            render: (row) => {
              const isSaving = pendingSaveId === row.id;
              const Icon = isSaving ? Loader2 : Save;

              return (
                <CmsDataTableIconButton
                  className="h-7 w-7 rounded-md text-[#1f4f8f]"
                  disabled={Boolean(pendingSaveId)}
                  label={row.isNew ? "Create owner" : "Save owner"}
                  onClick={(event) => saveOwner(row, event)}
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
            label: "Cancel new owner",
            isVisible: (row) => Boolean(row.isNew),
            render: () => (
              <CmsDataTableIconButton
                className="h-7 w-7 rounded-md text-rose-700 hover:text-rose-800"
                disabled={pendingSaveId === newOwnerId}
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

function getOwnerFormData(row: OwnerDraft) {
  const formData = new FormData();

  if (!row.isNew) {
    formData.set("id", row.id);
  }
  formData.set("name", row.name);
  formData.set("phoneNumber", row.phoneNumber);
  formData.set("email", row.email ?? "");
  formData.set("password", row.password);

  return formData;
}
