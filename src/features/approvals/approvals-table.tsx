"use client";

import { Check, Trash2, X } from "lucide-react";
import { useMemo, useState } from "react";

import {
  decideChangeRequestAction,
  deletePendingChangeRequestAction,
} from "@/app/(app)/calendar/actions";
import { CmsDataTable, type CmsDataTableColumn } from "@/components/cms/CmsDataTable";
import { CmsDataTableIconButton } from "@/components/cms/data-table/CmsDataTableIconButton";
import { cmsTableTextareaClassName } from "@/components/cms/cms-table-controls";
import { DeleteConfirmationModal } from "@/components/cms/delete-confirmation-modal";
import { Badge } from "@/components/ui/badge";
import { ApprovalsTableFilters } from "@/features/approvals/approvals-table-filters";
import { getDateLabel } from "@/lib/dates";
import type { CalendarStatus, RequestStatus } from "@/lib/types";

export type ApprovalTableRow = {
  id: string;
  venueId: string;
  venueName: string;
  venueTypeName: string;
  date: string;
  requestedStatus: CalendarStatus;
  requestedNote: string;
  previousStatus: CalendarStatus | null;
  previousNote: string | null;
  requestedByName: string;
  ownerName: string;
  status: RequestStatus;
  decisionNote: string;
  canDecide: boolean;
  canDelete: boolean;
};

type ApprovalDraftRow = ApprovalTableRow & {
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
  const [decisionNotes, setDecisionNotes] = useState<Record<string, string>>(
    () => Object.fromEntries(requests.map((request) => [request.id, ""])),
  );
  const rows = useMemo(
    () =>
      requests.map((request) => ({
        ...request,
        decisionDraft: decisionNotes[request.id] ?? "",
      })),
    [decisionNotes, requests],
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

  const columns = useMemo<CmsDataTableColumn<ApprovalDraftRow>[]>(
    () => [
      {
        key: "venueName",
        label: "Venue",
        baseWidth: 220,
        minWidth: 170,
        maxWidth: 380,
        grow: 0.7,
        sortable: true,
        textValue: (row) => row.venueName,
      },
      {
        key: "venueTypeName",
        label: "Type",
        baseWidth: 150,
        minWidth: 120,
        maxWidth: 240,
        sortable: true,
        textValue: (row) => row.venueTypeName,
      },
      {
        key: "date",
        label: "Date",
        baseWidth: 220,
        minWidth: 170,
        maxWidth: 330,
        sortable: true,
        sortType: "date",
        sortValue: (row) => row.date,
        textValue: (row) => getDateLabel(row.date),
      },
      {
        key: "requestedStatus",
        label: "Requested",
        baseWidth: 140,
        minWidth: 120,
        maxWidth: 220,
        align: "center",
        sortable: true,
        textValue: (row) => row.requestedStatus,
        render: (row) => <CalendarStatusBadge status={row.requestedStatus} />,
      },
      {
        key: "requestedNote",
        label: "Request note",
        baseWidth: 260,
        minWidth: 200,
        maxWidth: 520,
        grow: 0.8,
        sortable: true,
        textValue: (row) => row.requestedNote || "No note supplied.",
      },
      {
        key: "previousState",
        label: "Previous state",
        baseWidth: 240,
        minWidth: 190,
        maxWidth: 460,
        grow: 0.6,
        sortable: true,
        textValue: (row) =>
          `${row.previousStatus ?? "No entry"} ${row.previousNote ?? ""}`,
      },
      {
        key: "ownerName",
        label: "Owner",
        baseWidth: 190,
        minWidth: 150,
        maxWidth: 320,
        sortable: true,
        textValue: (row) => row.ownerName,
      },
      {
        key: "status",
        label: "Status",
        baseWidth: 140,
        minWidth: 120,
        maxWidth: 220,
        align: "center",
        sortable: true,
        textValue: (row) => row.status,
        render: (row) => <RequestStatusBadge status={row.status} />,
      },
      {
        key: "decisionNote",
        label: "Decision note",
        baseWidth: 260,
        minWidth: 210,
        maxWidth: 520,
        grow: 0.8,
        sortable: true,
        textValue: (row) => row.decisionNote || row.decisionDraft,
        render: (row) =>
          row.canDecide ? (
            <textarea
              className={cmsTableTextareaClassName}
              onChange={(event) =>
                setDecisionNotes((current) => ({
                  ...current,
                  [row.id]: event.target.value,
                }))
              }
              placeholder="Optional decision note"
              value={row.decisionDraft}
            />
          ) : (
            <span className="line-clamp-2">
              {row.decisionNote || "No decision note."}
            </span>
          ),
      },
    ],
    [],
  );

  return (
    <>
      <HiddenApprovalForms rows={rows} />
      {deleteRequest ? (
        <DeleteConfirmationModal
          confirmFormId={getDeleteRequestFormId(deleteRequest.id)}
          onCancel={() => setDeleteRequest(null)}
          title="Delete pending request?"
        >
          This will remove the pending request for {deleteRequest.venueName} on{" "}
          {getDateLabel(deleteRequest.date)}. It will disappear from the owner
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
                  render: (row) => (
                    <CmsDataTableIconButton
                      className="h-8 w-8 rounded-lg text-emerald-700 hover:text-emerald-800"
                      form={getApprovalFormId(row.id)}
                      label="Approve request"
                      name="decision"
                      type="submit"
                      value="approved"
                    >
                      <Check size={15} aria-hidden="true" />
                    </CmsDataTableIconButton>
                  ),
                },
                {
                  label: "Reject request",
                  isVisible: (row) => row.canDecide,
                  render: (row) => (
                    <CmsDataTableIconButton
                      className="h-8 w-8 rounded-lg text-rose-700 hover:text-rose-800"
                      form={getApprovalFormId(row.id)}
                      label="Reject request"
                      name="decision"
                      type="submit"
                      value="rejected"
                    >
                      <X size={15} aria-hidden="true" />
                    </CmsDataTableIconButton>
                  ),
                },
                {
                  label: "Delete pending request",
                  isVisible: (row) => row.canDelete,
                  render: (row) => (
                    <CmsDataTableIconButton
                      className="h-8 w-8 rounded-lg text-slate-500 hover:border-rose-200 hover:bg-rose-50 hover:text-rose-700"
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

function HiddenApprovalForms({ rows }: { rows: ApprovalDraftRow[] }) {
  return (
    <div className="hidden">
      {rows.map((row) => (
        <div key={row.id}>
          <form action={decideChangeRequestAction} id={getApprovalFormId(row.id)}>
            <input name="requestId" readOnly value={row.id} />
            <input name="returnTo" readOnly value="/approvals" />
            <input name="decisionNote" readOnly value={row.decisionDraft} />
          </form>
          {row.canDelete ? (
            <form
              action={deletePendingChangeRequestAction}
              id={getDeleteRequestFormId(row.id)}
            >
              <input name="requestId" readOnly value={row.id} />
              <input name="returnTo" readOnly value="/approvals" />
            </form>
          ) : null}
        </div>
      ))}
    </div>
  );
}

function RequestStatusBadge({ status }: { status: RequestStatus }) {
  if (status === "approved") {
    return <Badge tone="success">Approved</Badge>;
  }

  if (status === "rejected") {
    return <Badge tone="danger">Rejected</Badge>;
  }

  return <Badge tone="warning">Pending</Badge>;
}

function CalendarStatusBadge({ status }: { status: CalendarStatus }) {
  return status === "available" ? (
    <span className="inline-flex h-7 w-[92px] items-center justify-center rounded-md border border-emerald-200 bg-emerald-50 px-2 text-xs font-medium text-emerald-800">
      Available
    </span>
  ) : (
    <span className="inline-flex h-7 w-[92px] items-center justify-center rounded-md border border-red-200 bg-red-50 px-2 text-xs font-medium text-red-800">
      Booked
    </span>
  );
}

function getApprovalFormId(id: string) {
  return `approval-form-${id}`;
}

function getDeleteRequestFormId(id: string) {
  return `delete-request-form-${id}`;
}
