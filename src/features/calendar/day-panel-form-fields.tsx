"use client";

import {
  Check,
  CheckCircle2,
  Loader2,
  Send,
  X,
  XCircle,
} from "lucide-react";
import { useState } from "react";
import { useFormStatus } from "react-dom";

import {
  statusMeta,
  textareaClassName,
} from "@/features/calendar/day-panel-controls";
import type { CalendarStatus } from "@/lib/types";
import { cn } from "@/lib/ui";

export function CalendarDayFields({
  defaultNote,
  defaultStatus,
  noteLabel,
  notePlaceholder,
}: {
  defaultNote: string;
  defaultStatus: CalendarStatus;
  noteLabel: string;
  notePlaceholder: string;
}) {
  const [status, setStatus] = useState(defaultStatus);
  const [note, setNote] = useState(defaultNote);

  return (
    <>
      <fieldset className="grid gap-2">
        <legend className="text-xs font-black uppercase tracking-[0.12em] text-slate-500">
          Status
        </legend>
        <input name="status" type="hidden" value={status} />
        <div className="grid grid-cols-1 gap-3 min-[430px]:grid-cols-2">
          <StatusChoice
            isSelected={status === "available"}
            onSelect={() => setStatus("available")}
            status="available"
          />
          <StatusChoice
            isSelected={status === "booked"}
            onSelect={() => setStatus("booked")}
            status="booked"
          />
        </div>
      </fieldset>

      <label className="flex flex-1 flex-col gap-2">
        <span className="text-xs font-black uppercase tracking-[0.12em] text-slate-500">
          {noteLabel}
        </span>
        <textarea
          className={textareaClassName}
          name="note"
          onChange={(event) => setNote(event.target.value)}
          placeholder={notePlaceholder}
          value={note}
        />
      </label>
    </>
  );
}

export function CalendarSubmitButton({
  isPending,
  mode,
}: {
  isPending?: boolean;
  mode: "request" | "save";
}) {
  const { pending: formPending } = useFormStatus();
  const pending = isPending ?? formPending;
  const isRequest = mode === "request";
  const Icon = pending ? Loader2 : isRequest ? Send : Check;
  const label = pending ? (isRequest ? "Sending..." : "Saving...") : isRequest ? "Send request" : "Save day";

  return (
    <button
      aria-disabled={pending}
      className="mt-auto inline-flex h-12 items-center justify-center gap-2 rounded-2xl bg-[#007c92] px-4 text-sm font-black text-white shadow-[0_16px_32px_rgba(0,124,146,0.2)] transition hover:bg-[#00677a] disabled:cursor-wait disabled:opacity-75"
      disabled={pending}
      type="submit"
    >
      <Icon
        className={cn(pending && "animate-spin")}
        size={17}
        aria-hidden="true"
      />
      {label}
    </button>
  );
}

export function DecisionSubmitButton({
  decision,
  isDisabled,
  isPending,
}: {
  decision: "approved" | "rejected";
  isDisabled?: boolean;
  isPending?: boolean;
}) {
  const { pending: formPending } = useFormStatus();
  const pending = isPending ?? formPending;
  const isApproved = decision === "approved";
  const Icon = pending ? Loader2 : isApproved ? Check : X;

  return (
    <button
      className={cn(
        "inline-flex h-11 min-w-0 items-center justify-center gap-2 rounded-2xl px-3 text-sm font-black text-white transition disabled:cursor-wait disabled:opacity-75",
        isApproved
          ? "bg-[#007c92] shadow-[0_14px_28px_rgba(0,124,146,0.18)] hover:bg-[#00677a]"
          : "bg-rose-600 shadow-[0_14px_28px_rgba(225,29,72,0.16)] hover:bg-rose-700",
      )}
      disabled={isDisabled || pending}
      name="decision"
      type="submit"
      value={decision}
    >
      <Icon
        className={cn(pending && "animate-spin")}
        size={16}
        aria-hidden="true"
      />
      {pending ? "Working..." : isApproved ? "Approve" : "Reject"}
    </button>
  );
}

function StatusChoice({
  isSelected,
  onSelect,
  status,
}: {
  isSelected: boolean;
  onSelect: () => void;
  status: CalendarStatus;
}) {
  const meta = statusMeta[status];
  const Icon = status === "available" ? CheckCircle2 : XCircle;

  return (
    <button
      aria-pressed={isSelected}
      className={cn(
        "flex min-h-[50px] min-w-0 items-center justify-center gap-2 rounded-2xl border border-[#d8e9ee] bg-[#f8fcfd] px-3 text-center transition focus-visible:outline-none focus-visible:ring-4 focus-visible:ring-[#007c92]/10 max-[360px]:gap-1.5 max-[360px]:px-2",
        isSelected && meta.selected.replaceAll("peer-checked:", ""),
      )}
      onClick={onSelect}
      type="button"
    >
      <span className="grid h-7 w-7 shrink-0 place-items-center rounded-xl bg-white/70">
        <Icon className="text-slate-500" size={16} aria-hidden="true" />
      </span>
      <span className="min-w-0 truncate text-sm font-black text-slate-950">
        {meta.label}
      </span>
    </button>
  );
}
