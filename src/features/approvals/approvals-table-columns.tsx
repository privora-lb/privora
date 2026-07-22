"use client";

import { useMemo, type Dispatch, type SetStateAction } from "react";

import type { CmsDataTableColumn } from "@/components/cms/CmsDataTable";
import { cmsTableTextareaClassName } from "@/components/cms/cms-table-controls";
import { Badge } from "@/components/ui/badge";
import {
  formatDeposit,
  getTimeRange,
} from "@/features/calendar/calendar-detail-utils";
import { getDateLabel } from "@/lib/dates";
import { getCalendarSlotLabel } from "@/lib/calendar-slots";
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
        key: "slot",
        label: "Session",
        baseWidth: 130,
        minWidth: 110,
        maxWidth: 180,
        align: "center",
        sortable: true,
        textValue: (row) =>
          row.slot ? getCalendarSlotLabel(row.slot) : "Legacy full day",
        render: (row) => (
          <Badge tone="neutral">
            {row.slot ? getCalendarSlotLabel(row.slot) : "Legacy full day"}
          </Badge>
        ),
      },
      {
        key: "requestedNote",
        label: "Request details",
        baseWidth: 300,
        minWidth: 200,
        maxWidth: 560,
        grow: 0.8,
        sortable: true,
        textValue: (row) => getRequestDetailsText(row),
        render: (row) => (
          <RequestDetails
            customerName={row.requestedCustomerName}
            customerPhone={row.requestedCustomerPhone}
            depositAmount={row.requestedDepositAmount}
            bookingPriceAmount={row.requestedBookingPriceAmount}
            bookingPriceCurrency={row.requestedBookingPriceCurrency}
            fromTime={row.requestedFromTime}
            note={row.requestedNote}
            toTime={row.requestedToTime}
          />
        ),
      },
      {
        key: "previousState",
        label: "Previous state",
        baseWidth: 240,
        minWidth: 190,
        maxWidth: 460,
        grow: 0.6,
        sortable: true,
        textValue: (row) => getPreviousStateText(row),
        render: (row) => (
          <RequestDetails
            customerName={row.previousCustomerName ?? ""}
            customerPhone={row.previousCustomerPhone ?? ""}
            depositAmount={row.previousDepositAmount}
            bookingPriceAmount={row.previousBookingPriceAmount}
            bookingPriceCurrency={row.previousBookingPriceCurrency}
            fromTime={row.previousFromTime}
            note={row.previousNote ?? ""}
            status={row.previousStatus ?? "No entry"}
            toTime={row.previousToTime}
          />
        ),
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

function RequestDetails({
  bookingPriceAmount,
  bookingPriceCurrency,
  customerName,
  customerPhone,
  depositAmount,
  fromTime,
  note,
  status,
  toTime,
}: {
  bookingPriceAmount: number | null;
  bookingPriceCurrency: string | null;
  customerName: string;
  customerPhone: string;
  depositAmount: number | null;
  fromTime: string | null;
  note: string;
  status?: string;
  toTime: string | null;
}) {
  const details = [
    status ? `Status: ${status}` : "",
    bookingPriceAmount !== null && bookingPriceCurrency
      ? `Agreed: ${formatCurrency(bookingPriceAmount, bookingPriceCurrency)}`
      : "",
    customerName ? `Name: ${customerName}` : "",
    customerPhone ? `Phone: ${customerPhone}` : "",
    getTimeRange(fromTime, toTime),
    depositAmount !== null ? `Deposit: ${formatDeposit(depositAmount)}` : "",
    note ? `Note: ${note}` : "",
  ].filter(Boolean);

  if (!details.length) {
    return <span className="line-clamp-2 text-slate-500">No details.</span>;
  }

  return (
    <span className="grid gap-0.5 text-[12px] font-bold leading-5 text-slate-600">
      {details.slice(0, 3).map((detail) => (
        <span className="line-clamp-1" key={detail}>
          {detail}
        </span>
      ))}
    </span>
  );
}

function getRequestDetailsText(row: ApprovalDraftRow) {
  return [
    row.requestedCustomerName,
    row.requestedCustomerPhone,
    row.requestedFromTime,
    row.requestedToTime,
    row.requestedDepositAmount,
    row.requestedBookingPriceAmount,
    row.requestedBookingPriceCurrency,
    row.requestedNote,
  ]
    .filter((value) => value !== null && value !== "")
    .join(" ");
}

function getPreviousStateText(row: ApprovalDraftRow) {
  return [
    row.previousStatus ?? "No entry",
    row.previousCustomerName,
    row.previousCustomerPhone,
    row.previousFromTime,
    row.previousToTime,
    row.previousDepositAmount,
    row.previousBookingPriceAmount,
    row.previousBookingPriceCurrency,
    row.previousNote,
  ]
    .filter((value) => value !== null && value !== "")
    .join(" ");
}

function formatCurrency(amount: number, currency: string) {
  return new Intl.NumberFormat("en-US", {
    currency,
    maximumFractionDigits: 2,
    style: "currency",
  }).format(amount);
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
