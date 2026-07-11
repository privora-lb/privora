"use client";

import {
  Check,
  Loader2,
  Send,
  X,
} from "lucide-react";
import { useState } from "react";
import { useFormStatus } from "react-dom";

import {
  StatusChoiceGroup,
  textareaClassName,
} from "@/features/calendar/day-panel-controls";
import type { CalendarStatus } from "@/lib/types";
import { cn } from "@/lib/ui";

const detailInputClassName =
  "h-11 w-full min-w-0 rounded-2xl border border-[#d8e9ee] bg-white px-3 text-sm font-semibold text-slate-800 outline-none transition placeholder:text-slate-400 focus:border-[#007c92] focus:ring-4 focus:ring-[#007c92]/10";

export function CalendarDayFields({
  defaultCustomerName,
  defaultCustomerPhone,
  defaultDepositAmount,
  defaultFromTime,
  defaultNote,
  defaultStatus,
  defaultToTime,
  noteLabel,
  notePlaceholder,
}: {
  defaultCustomerName: string;
  defaultCustomerPhone: string;
  defaultDepositAmount: number | null;
  defaultFromTime: string | null;
  defaultNote: string;
  defaultStatus: CalendarStatus;
  defaultToTime: string | null;
  noteLabel: string;
  notePlaceholder: string;
}) {
  const [customerName, setCustomerName] = useState(defaultCustomerName);
  const [customerPhone, setCustomerPhone] = useState(defaultCustomerPhone);
  const [depositAmount, setDepositAmount] = useState(
    defaultDepositAmount === null ? "" : String(defaultDepositAmount),
  );
  const [fromTime, setFromTime] = useState(defaultFromTime ?? "");
  const [toTime, setToTime] = useState(defaultToTime ?? "");
  const [note, setNote] = useState(defaultNote);

  return (
    <>
      <StatusChoiceGroup defaultStatus={defaultStatus} />

      <div className="grid gap-3">
        <div className="grid gap-3 min-[430px]:grid-cols-2">
          <label className="grid min-w-0 gap-2">
            <span className="text-xs font-black uppercase tracking-[0.12em] text-slate-500">
              Name
            </span>
            <input
              className={detailInputClassName}
              name="customerName"
              onChange={(event) => setCustomerName(event.target.value)}
              placeholder="Customer name"
              value={customerName}
            />
          </label>

          <label className="grid min-w-0 gap-2">
            <span className="text-xs font-black uppercase tracking-[0.12em] text-slate-500">
              Phone
            </span>
            <input
              className={detailInputClassName}
              name="customerPhone"
              onChange={(event) => setCustomerPhone(event.target.value)}
              placeholder="Customer phone"
              value={customerPhone}
            />
          </label>
        </div>

        <label className="grid gap-2">
          <span className="text-xs font-black uppercase tracking-[0.12em] text-slate-500">
            Deposit
          </span>
          <input
            className={detailInputClassName}
            min="0"
            name="depositAmount"
            onChange={(event) => setDepositAmount(event.target.value)}
            placeholder="Deposit amount"
            step="0.01"
            type="number"
            value={depositAmount}
          />
        </label>

        <div className="grid gap-3 min-[480px]:grid-cols-2">
          <label className="grid min-w-0 gap-2">
            <span className="text-xs font-black uppercase tracking-[0.12em] text-slate-500">
              From time
            </span>
            <input
              className={detailInputClassName}
              name="fromTime"
              onChange={(event) => setFromTime(event.target.value)}
              type="time"
              value={fromTime}
            />
          </label>

          <label className="grid min-w-0 gap-2">
            <span className="text-xs font-black uppercase tracking-[0.12em] text-slate-500">
              To time
            </span>
            <input
              className={detailInputClassName}
              name="toTime"
              onChange={(event) => setToTime(event.target.value)}
              type="time"
              value={toTime}
            />
          </label>
        </div>
      </div>

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
      className="mt-auto inline-flex h-12 items-center justify-center gap-2 rounded-2xl bg-[#C0964E] px-4 text-sm font-black text-[#123C36] shadow-[0_16px_32px_rgba(192,150,78,0.22)] transition hover:bg-[#A87E36] disabled:cursor-wait disabled:opacity-75"
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
