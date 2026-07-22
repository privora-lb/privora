"use client";

import { LockKeyhole } from "lucide-react";

import {
  DirectEditForm,
  PendingRequestBox,
  RequestChangeForm,
} from "@/features/calendar/day-panel-forms";
import { StatusPill } from "@/features/calendar/day-panel-controls";
import { calendarStatusColors } from "@/lib/calendar-colors";
import {
  calendarSlots,
  getCalendarSlotShortLabel,
} from "@/lib/calendar-slots";
import { getDateLabel } from "@/lib/dates";
import type {
  AppUser,
  CalendarEntry,
  CalendarSlot,
  ChangeRequest,
  Venue,
} from "@/lib/types";
import { cn } from "@/lib/ui";

type SlotValues<T> = Partial<Record<CalendarSlot, T>>;

export function DayPanel({
  user,
  venue,
  date,
  canManage,
  canRequest,
  currentDateKey,
  entries = {},
  isReadOnly,
  onEntryChange,
  onPendingRequestChange,
  onPendingRequestRemove,
  onSlotChange,
  onToast,
  pendingRequests = {},
  returnTo,
  selectedSlot,
}: {
  user: AppUser;
  venue: Venue;
  canManage: boolean;
  canRequest: boolean;
  currentDateKey: string;
  date?: string;
  entries?: SlotValues<CalendarEntry>;
  isReadOnly?: boolean;
  onEntryChange: (
    date: string,
    slot: CalendarSlot,
    entry?: CalendarEntry | null,
  ) => void;
  onPendingRequestChange: (request?: ChangeRequest | null) => void;
  onPendingRequestRemove: (requestId: string) => void;
  onSlotChange: (slot: CalendarSlot) => void;
  onToast: (type: "error" | "success", message: string) => void;
  pendingRequests?: SlotValues<ChangeRequest>;
  returnTo: string;
  selectedSlot: CalendarSlot;
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
              ? "Pick a day to inspect its Day and Night records."
              : "Pick a day, then manage its Day or Night reservation slot."}
          </p>
        </div>
      </aside>
    );
  }

  const isReadOnlyDay = Boolean(isReadOnly || date < currentDateKey);
  const canManageDay = !isReadOnlyDay && canManage;
  const canRequestDay = !isReadOnlyDay && canRequest;
  const entry = entries[selectedSlot];
  const pendingRequest = pendingRequests[selectedSlot];
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
          <span className="text-[10px] font-black uppercase tracking-[0.1em] text-[#EACC84]">
            {getCalendarSlotShortLabel(selectedSlot)} use
          </span>
          <StatusPill status={currentStatus} />
        </div>
      </div>

      <div className="flex flex-1 flex-col gap-5 p-5 pb-4">
        <SlotSelector
          entries={entries}
          onSelect={onSlotChange}
          pendingRequests={pendingRequests}
          selectedSlot={selectedSlot}
        />

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
            key={`direct-${date}-${selectedSlot}-${entry?.status ?? "available"}-${entry?.note ?? ""}-${entry?.customerName ?? ""}-${entry?.customerPhone ?? ""}-${entry?.depositAmount ?? ""}-${entry?.fromTime ?? ""}-${entry?.toTime ?? ""}-${entry?.bookingPriceAmount ?? ""}`}
            onEntryChange={onEntryChange}
            onPendingRequestChange={onPendingRequestChange}
            onPendingRequestRemove={onPendingRequestRemove}
            onToast={onToast}
            returnTo={returnTo}
            slot={selectedSlot}
            user={user}
            venue={venue}
          />
        ) : null}

        {canRequestDay &&
        (!pendingRequest || pendingRequest.requestedById === user.id) ? (
          <RequestChangeForm
            date={date}
            entry={entry}
            key={`request-${date}-${selectedSlot}-${entry?.status ?? "available"}-${entry?.note ?? ""}-${pendingRequest?.requestedStatus ?? ""}-${pendingRequest?.requestedNote ?? ""}`}
            onEntryChange={onEntryChange}
            onPendingRequestChange={onPendingRequestChange}
            onPendingRequestRemove={onPendingRequestRemove}
            onToast={onToast}
            pendingRequest={pendingRequest}
            returnTo={returnTo}
            slot={selectedSlot}
            user={user}
            venue={venue}
          />
        ) : null}
      </div>
    </aside>
  );
}

function SlotSelector({
  entries,
  onSelect,
  pendingRequests,
  selectedSlot,
}: {
  entries: SlotValues<CalendarEntry>;
  onSelect: (slot: CalendarSlot) => void;
  pendingRequests: SlotValues<ChangeRequest>;
  selectedSlot: CalendarSlot;
}) {
  return (
    <div className="grid grid-cols-2 gap-2 rounded-2xl border border-[#d8e9ee] bg-[#f8fcfd] p-1.5">
      {calendarSlots.map((slot) => {
        const status = entries[slot]?.status ?? "available";
        const style = calendarStatusColors[status];
        const isSelected = selectedSlot === slot;

        return (
          <button
            aria-pressed={isSelected}
            className={cn(
              "grid gap-1 rounded-xl border px-3 py-2.5 text-left transition",
              isSelected
                ? "border-[#007c92] bg-white shadow-sm ring-2 ring-[#007c92]/10"
                : "border-transparent hover:bg-white/80",
            )}
            key={slot}
            onClick={() => onSelect(slot)}
            type="button"
          >
            <span className="text-xs font-black text-slate-900">
              {getCalendarSlotShortLabel(slot)} use
            </span>
            <span className={cn("flex items-center gap-1.5 text-[10px] font-black capitalize", style.text)}>
              <span className={cn("h-2 w-2 rounded-full", style.dot)} />
              {status}
              {pendingRequests[slot] ? (
                <span className="ml-auto text-amber-700">Pending</span>
              ) : null}
            </span>
          </button>
        );
      })}
    </div>
  );
}

function ReadOnlyNotice() {
  return (
    <div className="flex gap-3 rounded-2xl border border-[#d8e9ee] bg-[#f8fcfd] p-4 text-sm font-semibold leading-6 text-slate-600">
      <span className="grid h-9 w-9 shrink-0 place-items-center rounded-xl bg-white text-slate-500 shadow-sm">
        <LockKeyhole size={16} aria-hidden="true" />
      </span>
      <span>
        Past dates are display only. Today and upcoming slots can be updated
        from this panel.
      </span>
    </div>
  );
}
