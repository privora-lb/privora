"use client";

import { Check, Loader2, Trash2, X } from "lucide-react";
import { useMemo, useState } from "react";

import {
  decideChangeRequestInlineAction,
  deletePendingChangeRequestInlineAction,
} from "@/app/(app)/calendar/actions";
import { CmsDataTable } from "@/components/cms/CmsDataTable";
import { CmsToastStack } from "@/components/cms/CmsToastStack";
import { CmsDataTableIconButton } from "@/components/cms/data-table/CmsDataTableIconButton";
import { DeleteConfirmationModal } from "@/components/cms/delete-confirmation-modal";
import { useCmsToasts } from "@/components/cms/use-cms-toasts";
import { ApprovalsTableFilters } from "@/features/approvals/approvals-table-filters";
import { useApprovalsColumns } from "@/features/approvals/approvals-table-columns";
import { getDateLabel } from "@/lib/dates";
import { getCalendarSlotLabel } from "@/lib/calendar-slots";
import type {
  CalendarSlot,
  CalendarStatus,
  RequestStatus,
} from "@/lib/types";

export type ApprovalTableRow = {
  id: string;
  venueId: string;
  venueName: string;
  venueTypeName: string;
  date: string;
  slot: CalendarSlot | null;
  requestedStatus: CalendarStatus;
  requestedNote: string;
  requestedCustomerName: string;
  requestedCustomerPhone: string;
  requestedDepositAmount: number | null;
  requestedBookingPriceAmount: number | null;
  requestedBookingPriceCurrency: string | null;
  requestedFromTime: string | null;
  requestedToTime: string | null;
  previousStatus: CalendarStatus | null;
  previousNote: string | null;
  previousCustomerName: string | null;
  previousCustomerPhone: string | null;
  previousDepositAmount: number | null;
  previousBookingPriceAmount: number | null;
  previousBookingPriceCurrency: string | null;
  previousFromTime: string | null;
  previousToTime: string | null;
  requestedByName: string;
  ownerName: string;
  status: RequestStatus;
  decisionNote: string;
  canDecide: boolean;
  canDelete: boolean;
};

export type ApprovalDraftRow = ApprovalTableRow & {
  decisionDraft: string;
};

export function ApprovalsTable({
  requests,
  showVenueFilter = true,
}: {
  requests: ApprovalTableRow[];
  showVenueFilter?: boolean;
}) {
  const [statusFilter, setStatusFilter] = useState<RequestStatus | "all">("all");
  const [venueFilter, setVenueFilter] = useState("all");
  const [deleteRequest, setDeleteRequest] = useState<ApprovalDraftRow | null>(
    null,
  );
  const [pendingAction, setPendingAction] = useState<string | null>(null);
  const [rowOverrides, setRowOverrides] = useState<
    Record<string, Partial<ApprovalTableRow> | null>
  >({});
  const [decisionNotes, setDecisionNotes] = useState<Record<string, string>>(
    () => Object.fromEntries(requests.map((request) => [request.id, ""])),
  );
  const { dismissToast, pushToast, toasts } = useCmsToasts();
  const rows = useMemo(
    () =>
      requests
        .flatMap((request) => {
          const override = rowOverrides[request.id];

          if (override === null) {
            return [];
          }

          return [{ ...request, ...override }];
        })
        .map((request) => ({
          ...request,
          decisionDraft: decisionNotes[request.id] ?? "",
        })),
    [decisionNotes, requests, rowOverrides],
  );
  const venueFilterOptions = useMemo(() => {
    const venueMap = new Map<string, { id: string; name: string; typeName: string }>();

    requests.forEach((request) => {
      venueMap.set(request.venueId, {
        id: request.venueId,
        name: request.venueName,
        typeName: request.venueTypeName,
      });
    });

    return Array.from(venueMap.values()).sort((left, right) =>
      left.name.localeCompare(right.name),
    );
  }, [requests]);
  const filteredRows = useMemo(
    () =>
      rows.filter((row) => {
        const matchesStatus =
          statusFilter === "all" || row.status === statusFilter;
        const matchesVenue = venueFilter === "all" || row.venueId === venueFilter;

        return matchesStatus && matchesVenue;
      }),
    [rows, statusFilter, venueFilter],
  );
  const hasDecisionActions = rows.some((row) => row.canDecide);
  const hasDeleteActions = rows.some((row) => row.canDelete);

  async function handleDecision(
    row: ApprovalDraftRow,
    decision: Extract<RequestStatus, "approved" | "rejected">,
  ) {
    const actionKey = `decision:${row.id}:${decision}`;

    if (pendingAction) {
      return;
    }

    setPendingAction(actionKey);
    setRowOverrides((current) => ({
      ...current,
      [row.id]: {
        canDecide: false,
        canDelete: false,
        decisionNote: row.decisionDraft,
        status: decision,
      },
    }));

    const formData = new FormData();
    formData.set("requestId", row.id);
    formData.set("decision", decision);
    formData.set("decisionNote", row.decisionDraft);

    const result = await decideChangeRequestInlineAction(formData);
    setPendingAction(null);

    if (result.ok) {
      pushToast("success", result.message);
      return;
    }

    setRowOverrides((current) => {
      const next = { ...current };
      delete next[row.id];
      return next;
    });
    pushToast("error", result.message);
  }

  async function handleDelete(row: ApprovalDraftRow) {
    const actionKey = `delete:${row.id}`;

    if (pendingAction) {
      return;
    }

    setPendingAction(actionKey);
    setDeleteRequest(null);
    setRowOverrides((current) => ({ ...current, [row.id]: null }));

    const formData = new FormData();
    formData.set("requestId", row.id);

    const result = await deletePendingChangeRequestInlineAction(formData);
    setPendingAction(null);

    if (result.ok) {
      pushToast("success", result.message);
      return;
    }

    setRowOverrides((current) => {
      const next = { ...current };
      delete next[row.id];
      return next;
    });
    pushToast("error", result.message);
  }

  const columns = useApprovalsColumns(setDecisionNotes);

  return (
    <>
      <CmsToastStack onDismiss={dismissToast} toasts={toasts} />
      {deleteRequest ? (
        <DeleteConfirmationModal
          onCancel={() => setDeleteRequest(null)}
          onConfirm={() => {
            void handleDelete(deleteRequest);
          }}
          title="Delete pending request?"
        >
          This will remove the pending request for {deleteRequest.venueName} on{" "}
          {getDateLabel(deleteRequest.date)} ({deleteRequest.slot
            ? getCalendarSlotLabel(deleteRequest.slot)
            : "Legacy full day"}). It will disappear from the owner
          approvals page, and the calendar will return to normal because this
          change was not approved yet.
        </DeleteConfirmationModal>
      ) : null}
      <CmsDataTable
        actions={
          hasDecisionActions || hasDeleteActions
            ? [
                {
                  label: "Approve request",
                  isVisible: (row) => row.canDecide,
                  render: (row) => {
                    const isPending =
                      pendingAction === `decision:${row.id}:approved`;

                    return (
                      <CmsDataTableIconButton
                        className="h-8 w-8 rounded-lg text-emerald-700 hover:text-emerald-800"
                        disabled={Boolean(pendingAction)}
                        label="Approve request"
                        onClick={() => {
                          void handleDecision(row, "approved");
                        }}
                      >
                        {isPending ? (
                          <Loader2
                            className="animate-spin"
                            size={15}
                            aria-hidden="true"
                          />
                        ) : (
                          <Check size={15} aria-hidden="true" />
                        )}
                      </CmsDataTableIconButton>
                    );
                  },
                },
                {
                  label: "Reject request",
                  isVisible: (row) => row.canDecide,
                  render: (row) => {
                    const isPending =
                      pendingAction === `decision:${row.id}:rejected`;

                    return (
                      <CmsDataTableIconButton
                        className="h-8 w-8 rounded-lg text-rose-700 hover:text-rose-800"
                        disabled={Boolean(pendingAction)}
                        label="Reject request"
                        onClick={() => {
                          void handleDecision(row, "rejected");
                        }}
                      >
                        {isPending ? (
                          <Loader2
                            className="animate-spin"
                            size={15}
                            aria-hidden="true"
                          />
                        ) : (
                          <X size={15} aria-hidden="true" />
                        )}
                      </CmsDataTableIconButton>
                    );
                  },
                },
                {
                  label: "Delete pending request",
                  isVisible: (row) => row.canDelete,
                  render: (row) => (
                    <CmsDataTableIconButton
                      className="h-8 w-8 rounded-lg text-slate-500 hover:border-rose-200 hover:bg-rose-50 hover:text-rose-700"
                      disabled={Boolean(pendingAction)}
                      label="Delete pending request"
                      onClick={() => setDeleteRequest(row)}
                      type="button"
                    >
                      <Trash2 size={15} aria-hidden="true" />
                    </CmsDataTableIconButton>
                  ),
                },
              ]
            : []
        }
        columns={columns}
        description="Review requested calendar changes and their current approval state."
        emptyLabel="No approval requests yet."
        getRowKey={(row) => row.id}
        noSearchResultsLabel="No approval requests match your search."
        pageSize={14}
        rows={filteredRows}
        searchOptions={[
          { value: "__all", label: "All" },
          { value: "venueName", label: "Venue" },
          { value: "ownerName", label: "Owner" },
          { value: "requestedStatus", label: "Change" },
          { value: "slot", label: "Session" },
          { value: "status", label: "Status" },
        ]}
        searchPlaceholder="Search requests..."
        title="Approval requests"
        toolbarExtra={
          <ApprovalsTableFilters
            onStatusChange={setStatusFilter}
            onVenueChange={setVenueFilter}
            selectedStatus={statusFilter}
            selectedVenueId={venueFilter}
            showVenueFilter={showVenueFilter}
            venues={venueFilterOptions}
          />
        }
        toolbarSingleLine
      />
    </>
  );
}
