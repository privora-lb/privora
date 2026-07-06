"use client";

import { LockKeyhole } from "lucide-react";

import {
  DirectEditForm,
  PendingRequestBox,
  RequestChangeForm,
} from "@/features/calendar/day-panel-forms";
import { StatusPill } from "@/features/calendar/day-panel-controls";
import { getDateLabel } from "@/lib/dates";
import type {
  AppUser,
  CalendarEntry,
  ChangeRequest,
  Venue,
} from "@/lib/types";

export function DayPanel({
  user,
  venue,
  date,
  canManage,
  canRequest,
  currentDateKey,
  entry,
  isReadOnly,
  onEntryChange,
  onPendingRequestChange,
  onPendingRequestRemove,
  onToast,
  pendingRequest,
  returnTo,
}: {
  user: AppUser;
  venue: Venue;
  canManage: boolean;
  canRequest: boolean;
  currentDateKey: string;
  date?: string;
  entry?: CalendarEntry;
  isReadOnly?: boolean;
  onEntryChange: (date: string, entry?: CalendarEntry | null) => void;
  onPendingRequestChange: (request?: ChangeRequest | null) => void;
  onPendingRequestRemove: (requestId: string) => void;
  onToast: (type: "error" | "success", message: string) => void;
  pendingRequest?: ChangeRequest;
  returnTo: string;
}) {
  if (!date) {
    return (
      <aside className="overflow-hidden rounded-[24px] border border-[#d8e9ee] bg-white shadow-[0_18px_54px_rgba(15,23,42,0.07)]">
        <div className="border-b border-[#d8e9ee] bg-[#eefbfc] px-4 py-3">
          <p className="text-[11px] font-black uppercase tracking-[0.14em] text-[#007c92]">
            Selected day
          </p>
        </div>
        <div className="px-5 py-6">
          <h2 className="text-lg font-black text-slate-950">
            Select a calendar day
          </h2>
          <p className="mt-2 text-sm font-semibold leading-6 text-slate-500">
            {isReadOnly
              ? "Pick a day to inspect previous calendar records."
              : "Pick a day to book it, mark it available, add notes, or review requests."}
          </p>
        </div>
      </aside>
    );
  }

  const isReadOnlyDay = Boolean(isReadOnly || date < currentDateKey);
  const canManageDay = !isReadOnlyDay && canManage;
  const canRequestDay = !isReadOnlyDay && canRequest;
  const currentStatus = entry?.status ?? "available";

  return (
    <aside className="flex h-full flex-col overflow-hidden rounded-[24px] border border-[#d8e9ee] bg-white shadow-[0_18px_54px_rgba(15,23,42,0.07)]">
      <div className="flex items-center justify-between gap-3 border-b border-[#C0964E]/35 bg-[#123C36] px-4 py-3">
        <div className="min-w-0">
          <h2 className="truncate text-sm font-black text-[#FCFCF0]">
            {getDateLabel(date)}
          </h2>
          <p className="mt-1 truncate text-xs font-bold text-[#EACC84]">
            {venue.name} · {venue.typeName}
          </p>
        </div>
        <div className="flex shrink-0 flex-col items-end gap-1.5">
          <StatusPill status={currentStatus} />
          {pendingRequest ? (
            <span className="inline-flex items-center gap-1.5 rounded-full border border-amber-200 bg-amber-50 px-2.5 py-1 text-[10px] font-black uppercase tracking-[0.08em] text-amber-800">
              <span className="h-1.5 w-1.5 rounded-full bg-amber-500" />
              Pending
            </span>
          ) : null}
        </div>
      </div>

      <div className="flex flex-1 flex-col gap-5 p-5 pb-4">
        {pendingRequest ? (
          <PendingRequestBox
            canDecide={!isReadOnlyDay && user.id === venue.assignedUserId}
            entry={entry}
            onEntryChange={onEntryChange}
            onPendingRequestChange={onPendingRequestChange}
            onPendingRequestRemove={onPendingRequestRemove}
            onToast={onToast}
            pendingRequest={pendingRequest}
            returnTo={returnTo}
          />
        ) : null}

        {isReadOnlyDay ? <ReadOnlyNotice /> : null}

        {canManageDay ? (
          <DirectEditForm
            date={date}
            entry={entry}
            key={`direct-${date}-${entry?.status ?? "available"}-${entry?.note ?? ""}-${entry?.customerName ?? ""}-${entry?.customerPhone ?? ""}-${entry?.depositAmount ?? ""}-${entry?.fromTime ?? ""}-${entry?.toTime ?? ""}`}
            onEntryChange={onEntryChange}
            onPendingRequestChange={onPendingRequestChange}
            onPendingRequestRemove={onPendingRequestRemove}
            onToast={onToast}
            returnTo={returnTo}
            user={user}
            venue={venue}
          />
        ) : null}

        {canRequestDay ? (
          <RequestChangeForm
            date={date}
            entry={entry}
            key={`request-${date}-${entry?.status ?? "available"}-${entry?.note ?? ""}-${entry?.customerName ?? ""}-${entry?.customerPhone ?? ""}-${entry?.depositAmount ?? ""}-${entry?.fromTime ?? ""}-${entry?.toTime ?? ""}-${pendingRequest?.requestedStatus ?? ""}-${pendingRequest?.requestedNote ?? ""}-${pendingRequest?.requestedCustomerName ?? ""}-${pendingRequest?.requestedCustomerPhone ?? ""}-${pendingRequest?.requestedDepositAmount ?? ""}-${pendingRequest?.requestedFromTime ?? ""}-${pendingRequest?.requestedToTime ?? ""}`}
            onEntryChange={onEntryChange}
            onPendingRequestChange={onPendingRequestChange}
            onPendingRequestRemove={onPendingRequestRemove}
            onToast={onToast}
            pendingRequest={pendingRequest}
            returnTo={returnTo}
            user={user}
            venue={venue}
          />
        ) : null}
      </div>
    </aside>
  );
}

function ReadOnlyNotice() {
  return (
    <div className="flex gap-3 rounded-2xl border border-[#d8e9ee] bg-[#f8fcfd] p-4 text-sm font-semibold leading-6 text-slate-600">
      <span className="grid h-9 w-9 shrink-0 place-items-center rounded-xl bg-white text-slate-500 shadow-sm">
        <LockKeyhole size={16} aria-hidden="true" />
      </span>
      <span>
        Past dates are display only. Today and upcoming dates can be updated
        from this panel.
      </span>
    </div>
  );
}
