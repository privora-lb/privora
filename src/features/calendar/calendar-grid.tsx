"use client";

import {
  calendarStatusColors,
  pendingCalendarColor,
} from "@/lib/calendar-colors";
import {
  calendarSlots,
  getCalendarSlotKey,
  getCalendarSlotShortLabel,
} from "@/lib/calendar-slots";
import type {
  CalendarEntry,
  CalendarSlot,
  ChangeRequest,
} from "@/lib/types";
import { cn } from "@/lib/ui";

const weekdayLabels = ["Mon", "Tue", "Wed", "Thu", "Fri", "Sat", "Sun"];

export type CalendarGridDay = {
  dateKey: string;
  dayNumber: number;
  inMonth: boolean;
  isToday: boolean;
};

export function CalendarGrid({
  approvedAdminBookedSlots,
  className,
  currentDateKey,
  days,
  isReadOnlyMonth,
  onSelectDate,
  selectedDate,
  entriesBySlot,
  requestsBySlot,
}: {
  approvedAdminBookedSlots: Set<string>;
  className?: string;
  currentDateKey: string;
  days: CalendarGridDay[];
  isReadOnlyMonth?: boolean;
  onSelectDate: (dateKey: string) => void;
  selectedDate?: string;
  entriesBySlot: Map<string, CalendarEntry>;
  requestsBySlot: Map<string, ChangeRequest>;
}) {
  return (
    <section
      className={cn(
        "overflow-x-auto rounded-xl border border-[#d8e9ee] bg-white",
        className,
      )}
    >
      <div className="min-w-[860px]">
        <div className="grid grid-cols-7 border-b border-[#d8e9ee] bg-[#f8fcfd]">
          {weekdayLabels.map((label) => (
            <div
              className="px-3 py-3 text-center text-[11px] font-black uppercase tracking-[0.16em] text-[#35717d]"
              key={label}
            >
              {label}
            </div>
          ))}
        </div>

        <div className="grid grid-cols-7">
          {days.map((day) => {
            const isSelected = selectedDate === day.dateKey;
            const isReadOnlyDay = isReadOnlyMonth || day.dateKey < currentDateKey;
            const slotStates = calendarSlots.map((slot) => {
              const key = getCalendarSlotKey(day.dateKey, slot);
              const entry = entriesBySlot.get(key);
              const request = requestsBySlot.get(key);

              return {
                entry,
                isAdminBooked:
                  entry?.status === "booked" &&
                  approvedAdminBookedSlots.has(key),
                request,
                slot,
                status: entry?.status ?? "available",
              };
            });
            const ariaStatus = slotStates
              .map(
                ({ request, slot, status }) =>
                  `${getCalendarSlotShortLabel(slot)} ${status}${request ? ", pending change" : ""}`,
              )
              .join("; ");

            return (
              <button
                aria-label={`${day.dateKey}: ${day.inMonth ? ariaStatus : "outside month"}`}
                className={cn(
                  "relative flex min-h-[150px] touch-manipulation flex-col items-center border-b border-r border-[#e1eef2] p-2.5 text-center transition last:border-r-0 focus:outline-none focus:ring-2 focus:ring-inset focus:ring-[#007c92]",
                  day.inMonth
                    ? "bg-white text-slate-900 hover:bg-[#f8fcfd]"
                    : "bg-slate-50 text-slate-400 opacity-70",
                  isSelected && "ring-2 ring-inset ring-[#007c92]",
                )}
                key={day.dateKey}
                onClick={() => onSelectDate(day.dateKey)}
                type="button"
              >
                <span
                  className={cn(
                    "inline-grid h-8 min-w-8 place-items-center rounded-lg border px-2 text-[13px] font-black shadow-[0_8px_18px_rgba(15,23,42,0.07)]",
                    day.isToday
                      ? "border-[#007c92] bg-[#007c92] text-white"
                      : "border-white bg-white text-slate-900",
                  )}
                >
                  {day.dayNumber}
                </span>

                {day.inMonth ? (
                  <div className="mt-2 grid w-full gap-1.5">
                    {slotStates.map((state) => (
                      <SlotStatusRow
                        entry={state.entry}
                        isAdminBooked={state.isAdminBooked}
                        isReadOnly={Boolean(isReadOnlyDay)}
                        key={state.slot}
                        request={state.request}
                        slot={state.slot}
                        status={state.status}
                      />
                    ))}
                  </div>
                ) : null}
              </button>
            );
          })}
        </div>
      </div>
    </section>
  );
}

function SlotStatusRow({
  entry,
  isAdminBooked,
  isReadOnly,
  request,
  slot,
  status,
}: {
  entry?: CalendarEntry;
  isAdminBooked: boolean;
  isReadOnly: boolean;
  request?: ChangeRequest;
  slot: CalendarSlot;
  status: CalendarEntry["status"] | "available";
}) {
  const style = calendarStatusColors[status];
  const customerName = entry?.customerName || request?.requestedCustomerName;

  return (
    <span
      className={cn(
        "grid min-w-0 grid-cols-[34px_1fr_auto] items-center gap-1 rounded-lg border bg-white px-1.5 py-1.5 text-left",
        request ? pendingCalendarColor.border : style.border,
      )}
    >
      <span className="text-[9px] font-black uppercase tracking-[0.06em] text-slate-500">
        {getCalendarSlotShortLabel(slot)}
      </span>
      <span className="min-w-0">
        <span className={cn("flex items-center gap-1 text-[9px] font-black capitalize", style.text)}>
          <span className={cn("h-1.5 w-1.5 shrink-0 rounded-full", style.dot)} />
          <span className="truncate">{status}</span>
        </span>
        {customerName ? (
          <span className="block truncate text-[8px] font-bold text-slate-500">
            {customerName}
          </span>
        ) : !isReadOnly && status === "available" ? (
          <span className="block truncate text-[8px] font-bold text-slate-400">
            Open slot
          </span>
        ) : null}
      </span>
      <span className="flex items-center gap-1">
        {isAdminBooked ? (
          <span
            aria-label={`Booked by superadmin request for ${getCalendarSlotShortLabel(slot)}`}
            className="grid h-4 w-4 place-items-center rounded-full bg-[#2563eb] text-[8px] font-black text-white"
            title="Booked by superadmin request"
          >
            P
          </span>
        ) : null}
        {request ? (
          <span
            aria-label={`Pending ${getCalendarSlotShortLabel(slot)} request`}
            className={cn("h-2 w-2 rounded-full", pendingCalendarColor.dot)}
            title="Pending request"
          />
        ) : null}
      </span>
    </span>
  );
}
