"use client";

import { CalendarCheck, Clock3, Send } from "lucide-react";
import { useState, type FormEvent, type ReactNode } from "react";

import {
  decideChangeRequestInlineAction,
  requestCalendarChangeInlineAction,
  saveCalendarEntryInlineAction,
} from "@/app/(app)/calendar/actions";
import {
  CalendarDayFields,
  CalendarSubmitButton,
  DecisionSubmitButton,
} from "@/features/calendar/day-panel-form-fields";
import {
  FormHeader,
  textareaClassName,
} from "@/features/calendar/day-panel-controls";
import {
  createEntryFromRequest,
  createOptimisticEntry,
  createOptimisticRequest,
} from "@/features/calendar/day-panel-optimistic";
import type {
  AppUser,
  CalendarEntry,
  ChangeRequest,
  Venue,
} from "@/lib/types";

type ToastType = "error" | "success";

type DayPanelFormProps = {
  date: string;
  entry?: CalendarEntry;
  onEntryChange: (date: string, entry?: CalendarEntry | null) => void;
  onPendingRequestChange: (request?: ChangeRequest | null) => void;
  onPendingRequestRemove: (requestId: string) => void;
  onToast: (type: ToastType, message: string) => void;
  pendingRequest?: ChangeRequest;
  returnTo: string;
  user: AppUser;
  venue: Venue;
};

export function PendingRequestBox({
  canDecide,
  entry,
  onEntryChange,
  onPendingRequestChange,
  onPendingRequestRemove,
  onToast,
  pendingRequest,
  returnTo,
}: Pick<
  DayPanelFormProps,
  | "entry"
  | "onEntryChange"
  | "onPendingRequestChange"
  | "onPendingRequestRemove"
  | "onToast"
  | "pendingRequest"
  | "returnTo"
> & {
  canDecide: boolean;
  pendingRequest: ChangeRequest;
}) {
  const [pendingDecision, setPendingDecision] = useState<
    "approved" | "rejected" | null
  >(null);
  const currentStatus = entry?.status ?? "available";
  const currentNote = entry?.note || "No current note for this day.";
  const requestNote = pendingRequest.requestedNote || "No request note supplied.";

  async function handleDecisionSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();

    if (pendingDecision) {
      return;
    }

    const submitter = (
      event.nativeEvent as SubmitEvent
    ).submitter as HTMLButtonElement | null;
    const decision = submitter?.value === "rejected" ? "rejected" : "approved";
    const formData = new FormData(event.currentTarget);
    formData.set("decision", decision);

    const previousEntry = entry;
    setPendingDecision(decision);
    onPendingRequestRemove(pendingRequest.id);

    if (decision === "approved") {
      onEntryChange(
        pendingRequest.date,
        createEntryFromRequest(pendingRequest, previousEntry),
      );
    }

    const result = await decideChangeRequestInlineAction(formData);
    setPendingDecision(null);

    if (result.ok) {
      onToast("success", result.message);
      return;
    }

    onPendingRequestChange(pendingRequest);
    onEntryChange(pendingRequest.date, previousEntry);
    onToast("error", result.message);
  }

  return (
    <div className="rounded-2xl border border-amber-200 bg-amber-50 p-4 text-[#92400e]">
      <div className="flex items-center gap-2 text-sm font-black text-[#92400e]">
        <Clock3 size={16} />
        Pending approval request
      </div>
      <div className="mt-3 grid gap-3">
        <PendingInfo title="Current saved day">
          <p className="mt-1 text-sm font-black capitalize">
            Status: {currentStatus}
          </p>
          <p className="mt-1 text-sm font-semibold leading-6 text-[#92400e]/80">
            Current: {currentNote}
          </p>
        </PendingInfo>

        <PendingInfo isStrong title="Requested change">
          <p className="mt-1 text-sm font-black capitalize">
            Change to {pendingRequest.requestedStatus}
          </p>
          <p className="mt-1 text-sm font-semibold leading-6 text-[#92400e]/80">
            Request: {requestNote}
          </p>
        </PendingInfo>
      </div>

      {canDecide ? (
        <form
          className="mt-4 grid gap-3"
          data-calendar-preserve-scroll="true"
          onSubmit={handleDecisionSubmit}
        >
          <input name="requestId" type="hidden" value={pendingRequest.id} />
          <input name="returnTo" type="hidden" value={returnTo} />
          <textarea
            className={textareaClassName}
            name="decisionNote"
            placeholder="Optional decision note"
          />
          <div className="grid grid-cols-1 gap-2 min-[390px]:grid-cols-2">
            <DecisionSubmitButton
              decision="approved"
              isDisabled={Boolean(pendingDecision)}
              isPending={pendingDecision === "approved"}
            />
            <DecisionSubmitButton
              decision="rejected"
              isDisabled={Boolean(pendingDecision)}
              isPending={pendingDecision === "rejected"}
            />
          </div>
        </form>
      ) : null}
    </div>
  );
}

export function DirectEditForm({
  date,
  entry,
  onEntryChange,
  onToast,
  returnTo,
  user,
  venue,
}: DayPanelFormProps) {
  const [isPending, setIsPending] = useState(false);

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();

    if (isPending) {
      return;
    }

    const formData = new FormData(event.currentTarget);
    const optimisticEntry = createOptimisticEntry(formData, entry, user, venue);
    setIsPending(true);
    onEntryChange(date, optimisticEntry);

    const result = await saveCalendarEntryInlineAction(formData);
    setIsPending(false);

    if (result.ok) {
      onEntryChange(date, result.entry);
      onToast("success", result.message);
      return;
    }

    onEntryChange(date, entry);
    onToast("error", result.message);
  }

  return (
    <form
      className="flex flex-1 flex-col gap-5 pb-1"
      data-calendar-preserve-scroll="true"
      onSubmit={handleSubmit}
    >
      <input name="venueId" type="hidden" value={venue.id} />
      <input name="date" type="hidden" value={date} />
      <input name="returnTo" type="hidden" value={returnTo} />

      <FormHeader
        icon={<CalendarCheck size={17} aria-hidden="true" />}
        title="Manage day"
      />

      <CalendarDayFields
        defaultNote={entry?.note ?? ""}
        defaultStatus={entry?.status ?? "available"}
        key={`${venue.id}:${date}:${entry?.status ?? "available"}:${entry?.note ?? ""}`}
        noteLabel="Note"
        notePlaceholder="Add operational context for this date"
      />

      <CalendarSubmitButton isPending={isPending} mode="save" />
    </form>
  );
}

export function RequestChangeForm({
  date,
  entry,
  onPendingRequestChange,
  onPendingRequestRemove,
  onToast,
  pendingRequest,
  returnTo,
  user,
  venue,
}: DayPanelFormProps) {
  const [isPending, setIsPending] = useState(false);

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();

    if (isPending) {
      return;
    }

    const formData = new FormData(event.currentTarget);
    const optimisticRequest = createOptimisticRequest(
      formData,
      entry,
      pendingRequest,
      user,
      venue,
    );
    setIsPending(true);
    onPendingRequestChange(optimisticRequest);

    const result = await requestCalendarChangeInlineAction(formData);
    setIsPending(false);

    if (result.ok) {
      onPendingRequestChange(result.pendingRequest);
      onToast("success", result.message);
      return;
    }

    if (pendingRequest) {
      onPendingRequestChange(pendingRequest);
    } else {
      onPendingRequestRemove(optimisticRequest.id);
    }

    onToast("error", result.message);
  }

  return (
    <form
      className="flex flex-1 flex-col gap-5 pb-1"
      data-calendar-preserve-scroll="true"
      onSubmit={handleSubmit}
    >
      <input name="venueId" type="hidden" value={venue.id} />
      <input name="date" type="hidden" value={date} />
      <input name="returnTo" type="hidden" value={returnTo} />

      <FormHeader
        icon={<Send size={17} aria-hidden="true" />}
        title="Request change"
      />

      <CalendarDayFields
        defaultNote={entry?.note ?? ""}
        defaultStatus={entry?.status ?? "available"}
        key={`${venue.id}:${date}:${entry?.status ?? "available"}:${entry?.note ?? ""}`}
        noteLabel="Request note"
        notePlaceholder="Explain the requested change"
      />

      <CalendarSubmitButton isPending={isPending} mode="request" />
    </form>
  );
}

function PendingInfo({
  children,
  isStrong,
  title,
}: {
  children: ReactNode;
  isStrong?: boolean;
  title: string;
}) {
  return (
    <div
      className={
        isStrong
          ? "rounded-xl border border-amber-300 bg-amber-100/70 px-3 py-2"
          : "rounded-xl border border-white/70 bg-white/70 px-3 py-2"
      }
    >
      <p className="text-[11px] font-black uppercase tracking-[0.1em] text-[#92400e]/70">
        {title}
      </p>
      {children}
    </div>
  );
}
