"use client";

import {
  CalendarCheck,
  Clock3,
  LockKeyhole,
  Send,
} from "lucide-react";

import {
  decideChangeRequestAction,
  requestCalendarChangeAction,
  saveCalendarEntryAction,
} from "@/app/(app)/calendar/actions";
import {
  CalendarDayFields,
  CalendarSubmitButton,
  DecisionSubmitButton,
} from "@/features/calendar/day-panel-form-fields";
import {
  FormHeader,
  StatusPill,
  textareaClassName,
} from "@/features/calendar/day-panel-controls";
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
  entry,
  isReadOnly,
  pendingRequest,
  returnTo,
}: {
  user: AppUser;
  venue: Venue;
  canManage: boolean;
  canRequest: boolean;
  date?: string;
  entry?: CalendarEntry;
  isReadOnly?: boolean;
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

  const canManageDay = !isReadOnly && canManage;
  const canRequestDay = !isReadOnly && canRequest;
  const currentStatus = entry?.status ?? "available";

  return (
    <aside className="flex h-full flex-col overflow-hidden rounded-[24px] border border-[#d8e9ee] bg-white shadow-[0_18px_54px_rgba(15,23,42,0.07)]">
      <div className="flex items-center justify-between gap-3 border-b border-[#d8e9ee] bg-[#eefbfc] px-4 py-3">
        <div className="min-w-0">
          <h2 className="truncate text-sm font-black text-slate-950">
            {getDateLabel(date)}
          </h2>
          <p className="mt-1 truncate text-xs font-bold text-slate-500">
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
            canDecide={!isReadOnly && user.id === venue.assignedUserId}
            entry={entry}
            pendingRequest={pendingRequest}
            returnTo={returnTo}
          />
        ) : null}

        {isReadOnly ? <ReadOnlyNotice /> : null}

        {canManageDay ? (
          <DirectEditForm
            date={date}
            entry={entry}
            key={`direct-${date}-${entry?.status ?? "available"}-${entry?.note ?? ""}`}
            returnTo={returnTo}
            venueId={venue.id}
          />
        ) : null}

        {canRequestDay ? (
          <RequestChangeForm
            date={date}
            entry={entry}
            key={`request-${date}-${entry?.status ?? "available"}-${entry?.note ?? ""}`}
            returnTo={returnTo}
            venueId={venue.id}
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
        Previous months are display only. Current and upcoming months can be
        updated from this panel.
      </span>
    </div>
  );
}

function PendingRequestBox({
  canDecide,
  entry,
  pendingRequest,
  returnTo,
}: {
  canDecide: boolean;
  entry?: CalendarEntry;
  pendingRequest: ChangeRequest;
  returnTo: string;
}) {
  const currentStatus = entry?.status ?? "available";
  const currentNote = entry?.note || "No current note for this day.";
  const requestNote = pendingRequest.requestedNote || "No request note supplied.";

  return (
    <div className="rounded-2xl border border-amber-200 bg-amber-50 p-4 text-[#92400e]">
      <div className="flex items-center gap-2 text-sm font-black text-[#92400e]">
        <Clock3 size={16} />
        Pending approval request
      </div>
      <div className="mt-3 grid gap-3">
        <div className="rounded-xl border border-white/70 bg-white/70 px-3 py-2">
          <p className="text-[11px] font-black uppercase tracking-[0.1em] text-[#92400e]/70">
            Current saved day
          </p>
          <p className="mt-1 text-sm font-black capitalize">
            Status: {currentStatus}
          </p>
          <p className="mt-1 text-sm font-semibold leading-6 text-[#92400e]/80">
            Current: {currentNote}
          </p>
        </div>

        <div className="rounded-xl border border-amber-300 bg-amber-100/70 px-3 py-2">
          <p className="text-[11px] font-black uppercase tracking-[0.1em] text-[#92400e]/70">
            Requested change
          </p>
          <p className="mt-1 text-sm font-black capitalize">
            Change to {pendingRequest.requestedStatus}
          </p>
          <p className="mt-1 text-sm font-semibold leading-6 text-[#92400e]/80">
            Request: {requestNote}
          </p>
        </div>
      </div>

      {canDecide ? (
        <form
          action={decideChangeRequestAction}
          className="mt-4 grid gap-3"
          data-calendar-preserve-scroll="true"
        >
          <input name="requestId" type="hidden" value={pendingRequest.id} />
          <input name="returnTo" type="hidden" value={returnTo} />
          <textarea
            className={textareaClassName}
            name="decisionNote"
            placeholder="Optional decision note"
          />
          <div className="grid grid-cols-1 gap-2 min-[390px]:grid-cols-2">
            <DecisionSubmitButton decision="approved" />
            <DecisionSubmitButton decision="rejected" />
          </div>
        </form>
      ) : null}
    </div>
  );
}

function DirectEditForm({
  date,
  entry,
  returnTo,
  venueId,
}: {
  date: string;
  entry?: CalendarEntry;
  returnTo: string;
  venueId: string;
}) {
  return (
    <form
      action={saveCalendarEntryAction}
      className="flex flex-1 flex-col gap-5 pb-1"
      data-calendar-preserve-scroll="true"
    >
      <input name="venueId" type="hidden" value={venueId} />
      <input name="date" type="hidden" value={date} />
      <input name="returnTo" type="hidden" value={returnTo} />

      <FormHeader
        icon={<CalendarCheck size={17} aria-hidden="true" />}
        title="Manage day"
      />

      <CalendarDayFields
        defaultNote={entry?.note ?? ""}
        defaultStatus={entry?.status ?? "available"}
        key={`${venueId}:${date}:${entry?.status ?? "available"}:${entry?.note ?? ""}`}
        noteLabel="Note"
        notePlaceholder="Add operational context for this date"
      />

      <CalendarSubmitButton mode="save" />
    </form>
  );
}

function RequestChangeForm({
  date,
  entry,
  returnTo,
  venueId,
}: {
  date: string;
  entry?: CalendarEntry;
  returnTo: string;
  venueId: string;
}) {
  return (
    <form
      action={requestCalendarChangeAction}
      className="flex flex-1 flex-col gap-5 pb-1"
      data-calendar-preserve-scroll="true"
    >
      <input name="venueId" type="hidden" value={venueId} />
      <input name="date" type="hidden" value={date} />
      <input name="returnTo" type="hidden" value={returnTo} />

      <FormHeader
        icon={<Send size={17} aria-hidden="true" />}
        title="Request change"
      />

      <CalendarDayFields
        defaultNote={entry?.note ?? ""}
        defaultStatus={entry?.status ?? "available"}
        key={`${venueId}:${date}:${entry?.status ?? "available"}:${entry?.note ?? ""}`}
        noteLabel="Request note"
        notePlaceholder="Explain the requested change"
      />

      <CalendarSubmitButton mode="request" />
    </form>
  );
}
