"use client";

import { ChevronLeft, ChevronRight } from "lucide-react";
import type { ReactNode } from "react";

import {
  calendarStatusColors,
  pendingCalendarColor,
} from "@/lib/calendar-colors";
import {
  calendarSlots,
  getCalendarSlotKey,
  getCalendarSlotShortLabel,
} from "@/lib/calendar-slots";
import { addDays, getDateLabel, toDateKey } from "@/lib/dates";
import type {
  CalendarEntry,
  CalendarSlot,
  ChangeRequest,
} from "@/lib/types";
import { cn } from "@/lib/ui";

export function MobileCalendarView({
  approvedAdminBookedSlots,
  currentMonth,
  entriesBySlot,
  isReadOnlyMonth,
  onSelectDate,
  requestsBySlot,
  selectedDate,
  selectedWeekDays,
}: {
  approvedAdminBookedSlots: Set<string>;
  currentMonth: Date;
  entriesBySlot: Map<string, CalendarEntry>;
  isReadOnlyMonth?: boolean;
  onSelectDate: (dateKey: string) => void;
  requestsBySlot: Map<string, ChangeRequest>;
  selectedDate: string;
  selectedWeekDays: Date[];
}) {
  const selectedDay = new Date(`${selectedDate}T00:00:00`);
  const selectedTitle = getDateLabel(selectedDate);
  const previousWeekDate = toDateKey(addDays(selectedDay, -7));
  const nextWeekDate = toDateKey(addDays(selectedDay, 7));

  return (
    <div className="hidden gap-4 max-[760px]:grid">
      <div className="overflow-hidden rounded-2xl border border-[#d8e9ee] bg-white shadow-[0_14px_34px_rgba(15,23,42,0.06)]">
        <div className="flex items-center justify-between gap-2 border-b border-[#d8e9ee] bg-[#f8fcfd] px-3 py-3">
          <MobileWeekLink
            label="Previous week"
            onClick={() => onSelectDate(previousWeekDate)}
            variant="outline"
          >
            <ChevronLeft size={17} aria-hidden="true" />
          </MobileWeekLink>
          <div className="min-w-0 text-center">
            <p className="m-0 text-[10px] font-black uppercase tracking-[0.14em] text-[#007c92]">
              Week
            </p>
            <p className="m-0 mt-0.5 truncate text-[13px] font-black text-slate-950">
              {selectedTitle}
            </p>
          </div>
          <MobileWeekLink
            label="Next week"
            onClick={() => onSelectDate(nextWeekDate)}
            variant="solid"
          >
            <ChevronRight size={17} aria-hidden="true" />
          </MobileWeekLink>
        </div>

        <div className="grid grid-cols-7 gap-1.5 p-2">
          {selectedWeekDays.map((day) => {
            const date = toDateKey(day);
            const isSelected = date === selectedDate;
            const isCurrentMonth = day.getMonth() === currentMonth.getMonth();
            const statuses = calendarSlots.map((slot) => {
              const key = getCalendarSlotKey(date, slot);
              const status = entriesBySlot.get(key)?.status ?? "available";
              return {
                adminBooked:
                  status === "booked" && approvedAdminBookedSlots.has(key),
                pending: requestsBySlot.has(key),
                slot,
                status,
              };
            });

            return (
              <button
                aria-label={`${getDateLabel(date)}: ${statuses
                  .map(
                    ({ pending, slot, status }) =>
                      `${getCalendarSlotShortLabel(slot)} ${status}${pending ? ", pending change" : ""}`,
                  )
                  .join("; ")}`}
                className={cn(
                  "grid min-h-[72px] min-w-0 gap-1 rounded-lg border border-[#d8e9ee] bg-white px-1 py-1.5 text-center transition active:scale-[0.98]",
                  !isCurrentMonth && "opacity-55",
                  isSelected &&
                    "border-[#007c92] shadow-[0_8px_20px_rgba(0,124,146,0.12)] ring-2 ring-[#007c92]/18",
                )}
                key={date}
                onClick={() => onSelectDate(date)}
                type="button"
              >
                <span className="mx-auto grid h-6 w-6 place-items-center rounded-md bg-[#f8fcfd] text-[11px] font-black leading-none text-slate-950">
                  {day.getDate()}
                </span>
                <span className="grid gap-0.5">
                  {statuses.map((state) => (
                    <MobileSlotIndicator key={state.slot} {...state} />
                  ))}
                </span>
              </button>
            );
          })}
        </div>
      </div>

      <article className="overflow-hidden rounded-2xl border border-[#d8e9ee] bg-white shadow-[0_16px_42px_rgba(15,23,42,0.08)]">
        <div className="border-b border-[#d8e9ee] bg-[#f8fcfd] px-4 py-3">
          <p className="m-0 text-[10px] font-black uppercase tracking-[0.14em] text-[#007c92]">
            Selected day
          </p>
          <h3 className="m-0 mt-1 text-[20px] font-black leading-tight tracking-[-0.03em] text-slate-950">
            {selectedTitle}
          </h3>
        </div>

        <div className="grid gap-3 p-4">
          {calendarSlots.map((slot) => {
            const key = getCalendarSlotKey(selectedDate, slot);
            return (
              <MobileSelectedSlot
                entry={entriesBySlot.get(key)}
                key={slot}
                request={requestsBySlot.get(key)}
                slot={slot}
              />
            );
          })}
          {isReadOnlyMonth ? (
            <span className="inline-flex min-h-11 items-center justify-center rounded-xl border border-[#d8e9ee] bg-[#f8fcfd] px-4 text-[12px] font-black uppercase tracking-[0.08em] text-slate-500">
              Display only
            </span>
          ) : null}
        </div>
      </article>
    </div>
  );
}

function MobileSlotIndicator({
  adminBooked,
  pending,
  slot,
  status,
}: {
  adminBooked: boolean;
  pending: boolean;
  slot: CalendarSlot;
  status: CalendarEntry["status"] | "available";
}) {
  const style = calendarStatusColors[status];

  return (
    <span className="flex items-center justify-center gap-1 text-[8px] font-black text-slate-500">
      <span>{slot === "day" ? "D" : "N"}</span>
      <span className={cn("h-1.5 w-1.5 rounded-full", style.dot)} />
      {pending ? (
        <span className={cn("h-1.5 w-1.5 rounded-full", pendingCalendarColor.dot)} />
      ) : null}
      {adminBooked ? <span className="text-[7px] font-black text-blue-600">P</span> : null}
    </span>
  );
}

function MobileSelectedSlot({
  entry,
  request,
  slot,
}: {
  entry?: CalendarEntry;
  request?: ChangeRequest;
  slot: CalendarSlot;
}) {
  const status = entry?.status ?? "available";
  const style = calendarStatusColors[status];
  const bookingPrice = formatBookingPrice(
    entry?.bookingPriceAmount ?? null,
    entry?.bookingPriceCurrency ?? null,
  );

  return (
    <div className={cn("grid gap-2 rounded-2xl border p-3", style.border, "bg-white")}>
      <div className="flex items-center justify-between gap-3">
        <span className="text-sm font-black text-slate-900">
          {getCalendarSlotShortLabel(slot)} use
        </span>
        <span className={cn("inline-flex items-center gap-1.5 rounded-full border px-2.5 py-1 text-[11px] font-black capitalize", style.label)}>
          <span className={cn("h-2 w-2 rounded-full", style.dot)} />
          {status}
        </span>
      </div>
      {entry?.customerName || entry?.customerPhone || bookingPrice ? (
        <div className="grid gap-1 text-xs font-bold text-slate-600">
          {entry?.customerName ? <span>{entry.customerName}</span> : null}
          {entry?.customerPhone ? <span>{entry.customerPhone}</span> : null}
          {bookingPrice ? <span>Agreed price: {bookingPrice}</span> : null}
        </div>
      ) : (
        <span className="text-xs font-bold text-slate-500">No customer details.</span>
      )}
      {request ? (
        <span className="inline-flex items-center gap-1.5 text-[11px] font-black text-amber-800">
          <span className={cn("h-2 w-2 rounded-full", pendingCalendarColor.dot)} />
          Pending change to {request.requestedStatus}
        </span>
      ) : null}
    </div>
  );
}

function formatBookingPrice(amount: number | null, currency: string | null) {
  if (amount === null || !currency) return "";

  return new Intl.NumberFormat("en-US", {
    currency,
    maximumFractionDigits: 2,
    style: "currency",
  }).format(amount);
}

function MobileWeekLink({
  children,
  label,
  onClick,
  variant,
}: {
  children: ReactNode;
  label: string;
  onClick: () => void;
  variant: "outline" | "solid";
}) {
  const className =
    variant === "solid"
      ? "grid h-9 w-9 place-items-center rounded-xl bg-[#007c92] text-white shadow-[0_10px_22px_rgba(0,124,146,0.18)] transition active:scale-95"
      : "grid h-9 w-9 place-items-center rounded-xl border border-[#c9e5eb] bg-white text-[#0b4658] transition active:scale-95";

  return (
    <button aria-label={label} className={className} onClick={onClick} type="button">
      {children}
    </button>
  );
}
