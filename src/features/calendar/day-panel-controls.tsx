import { CheckCircle2, XCircle } from "lucide-react";
import type { ReactNode } from "react";

import type { CalendarStatus } from "@/lib/types";
import { cn } from "@/lib/ui";

export const textareaClassName =
  "min-h-40 w-full flex-1 resize-y rounded-2xl border border-[#d8e9ee] bg-white px-4 py-3 text-sm font-semibold leading-6 text-slate-800 outline-none transition placeholder:text-slate-400 focus:border-[#007c92] focus:ring-4 focus:ring-[#007c92]/10";

export const statusMeta = {
  available: {
    label: "Available",
    description: "Open for reservations",
    icon: CheckCircle2,
    dot: "bg-emerald-500",
    card: "border-emerald-200 bg-emerald-50 text-emerald-800",
    selected: "peer-checked:border-emerald-400 peer-checked:bg-emerald-50",
  },
  booked: {
    label: "Booked",
    description: "Reserved or blocked",
    icon: XCircle,
    dot: "bg-rose-500",
    card: "border-rose-200 bg-rose-50 text-rose-800",
    selected: "peer-checked:border-rose-400 peer-checked:bg-rose-50",
  },
} satisfies Record<
  CalendarStatus,
  {
    card: string;
    description: string;
    dot: string;
    icon: typeof CheckCircle2;
    label: string;
    selected: string;
  }
>;

export function StatusPill({
  status,
}: {
  status: CalendarStatus | "pending";
}) {
  const classes =
    status === "pending"
      ? "border-amber-300/30 bg-amber-300/14 text-amber-100"
      : statusMeta[status].card;
  const label = status === "pending" ? "Pending" : statusMeta[status].label;
  const dot = status === "pending" ? "bg-amber-400" : statusMeta[status].dot;

  return (
    <span
      className={cn(
        "inline-flex shrink-0 items-center gap-2 rounded-full border px-3 py-1.5 text-xs font-black",
        classes,
      )}
    >
      <span className={cn("h-2 w-2 rounded-full", dot)} />
      {label}
    </span>
  );
}

export function FormHeader({
  icon,
  title,
}: {
  icon: ReactNode;
  title: string;
}) {
  return (
    <div className="flex items-center gap-3">
      <span className="grid h-9 w-9 shrink-0 place-items-center rounded-xl bg-[#e2f7fb] text-[#007c92]">
        {icon}
      </span>
      <span className="block text-sm font-black text-slate-950">
        {title}
      </span>
    </div>
  );
}

export function StatusChoiceGroup({
  defaultStatus,
}: {
  defaultStatus: CalendarStatus;
}) {
  return (
    <fieldset className="grid gap-2">
      <legend className="text-xs font-black uppercase tracking-[0.12em] text-slate-500">
        Status
      </legend>
      <div className="grid grid-cols-1 gap-3 min-[430px]:grid-cols-2">
        <StatusOption defaultStatus={defaultStatus} status="available" />
        <StatusOption defaultStatus={defaultStatus} status="booked" />
      </div>
    </fieldset>
  );
}

function StatusOption({
  defaultStatus,
  status,
}: {
  defaultStatus: CalendarStatus;
  status: CalendarStatus;
}) {
  const meta = statusMeta[status];
  const Icon = meta.icon;

  return (
    <label className="cursor-pointer">
      <input
        className="peer sr-only"
        defaultChecked={defaultStatus === status}
        name="status"
        type="radio"
        value={status}
      />
      <span
        className={cn(
          "flex min-h-[50px] min-w-0 items-center justify-center gap-2 rounded-2xl border border-[#d8e9ee] bg-[#f8fcfd] px-3 text-center transition peer-focus-visible:ring-4 peer-focus-visible:ring-[#007c92]/10 max-[360px]:gap-1.5 max-[360px]:px-2",
          meta.selected,
        )}
      >
        <span className="grid h-7 w-7 shrink-0 place-items-center rounded-xl bg-white/70">
          <Icon className="text-slate-500" size={16} aria-hidden="true" />
        </span>
        <span className="min-w-0 truncate text-sm font-black text-slate-950">
          {meta.label}
        </span>
      </span>
    </label>
  );
}
