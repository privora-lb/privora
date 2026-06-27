"use client";

import { useMemo, type Dispatch, type SetStateAction } from "react";

import type { CmsDataTableColumn } from "@/components/cms/CmsDataTable";
import { cmsTableTextareaClassName } from "@/components/cms/cms-table-controls";
import { Badge } from "@/components/ui/badge";
import { getDateLabel } from "@/lib/dates";
import type { CalendarStatus, RequestStatus } from "@/lib/types";
import type { ApprovalDraftRow } from "@/features/approvals/approvals-table";

export function useApprovalsColumns(
  setDecisionNotes: Dispatch<SetStateAction<Record<string, string>>>,
) {
  return useMemo<CmsDataTableColumn<ApprovalDraftRow>[]>(
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
    [setDecisionNotes],
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
