"use client";

import { Plus } from "lucide-react";

import {
  calendarStatusColors,
  pendingCalendarColor,
} from "@/lib/calendar-colors";
import type { CalendarEntry, ChangeRequest } from "@/lib/types";
import { cn } from "@/lib/ui";

const weekdayLabels = ["Mon", "Tue", "Wed", "Thu", "Fri", "Sat", "Sun"];

export type CalendarGridDay = {
  dateKey: string;
  dayNumber: number;
  inMonth: boolean;
  isToday: boolean;
};

export function CalendarGrid({
  days,
  isReadOnlyMonth,
  onSelectDate,
  selectedDate,
  entriesByDate,
  requestsByDate,
}: {
  days: CalendarGridDay[];
  isReadOnlyMonth?: boolean;
  onSelectDate: (dateKey: string) => void;
  selectedDate?: string;
  entriesByDate: Map<string, CalendarEntry>;
  requestsByDate: Map<string, ChangeRequest>;
}) {
  return (
    <section className="overflow-x-auto rounded-xl border border-[#d8e9ee] bg-white max-[760px]:hidden">
      <div className="min-w-[860px]">
        <div className="grid grid-cols-7 border-b border-[#d8e9ee] bg-[#f8fcfd]">
          {weekdayLabels.map((label) => (
            <div
              key={label}
              className="px-3 py-3 text-center text-[11px] font-black uppercase tracking-[0.16em] text-[#35717d]"
            >
              {label}
            </div>
          ))}
        </div>

        <div className="grid grid-cols-7">
          {days.map((day) => {
            const entry = entriesByDate.get(day.dateKey);
            const request = requestsByDate.get(day.dateKey);
            const isSelected = selectedDate === day.dateKey;
            const currentStatus = entry?.status ?? "available";
            const statusStyle = calendarStatusColors[currentStatus];
            const currentNote = entry?.note || "";

            return (
              <button
                key={day.dateKey}
                className={cn(
                  "flex min-h-[132px] flex-col items-center border-b border-r border-[#e1eef2] p-3 text-center transition last:border-r-0 focus:outline-none focus:ring-2 focus:ring-inset focus:ring-[#007c92]",
                  day.inMonth
                    ? statusStyle.cell
                    : "bg-slate-50 text-slate-400 opacity-70",
                  isSelected && "ring-2 ring-inset ring-[#007c92]",
                )}
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
                  <div className="mt-2.5 grid w-full justify-items-center gap-1.5">
                    <div className="grid min-w-0 justify-items-center gap-1">
                      <CalendarStatusBadge
                        dotClassName={statusStyle.dot}
                        label={currentStatus}
                        labelClassName={statusStyle.label}
                      />
                      {request ? (
                        <span className="inline-flex items-center gap-1 rounded-full border border-amber-300 bg-white/80 px-2 py-0.5 text-[9px] font-black text-amber-800">
                          <span
                            className={cn(
                              "h-1.5 w-1.5 rounded-full",
                              pendingCalendarColor.dot,
                            )}
                          />
                          Pending
                        </span>
                      ) : null}
                    </div>
                    {currentNote ? (
                      <span className="line-clamp-1 max-w-full text-center text-[11px] font-bold leading-[1.35] text-slate-700">
                        {currentNote}
                      </span>
                    ) : !request && entry ? (
                      <span className="text-center text-[11px] font-bold text-slate-500">
                        No note added
                      </span>
                    ) : !request && isReadOnlyMonth ? (
                      <span className="text-center text-[11px] font-black text-[#337946]">
                        Available
                      </span>
                    ) : !request ? (
                      <span className="inline-flex items-center justify-center gap-1.5 text-center text-[11px] font-black text-[#337946]">
                        <Plus size={13} aria-hidden="true" />
                        Add day
                      </span>
                    ) : null}

                    {request ? (
                      <PendingRequestPanel
                        currentStatus={currentStatus}
                        request={request}
                      />
                    ) : null}
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

function PendingRequestPanel({
  currentStatus,
  request,
}: {
  currentStatus: CalendarEntry["status"] | "available";
  request: ChangeRequest;
}) {
  return (
    <span className="line-clamp-2 rounded-lg border border-amber-300 bg-amber-50/95 px-2 py-1.5 text-center text-[9px] font-bold leading-[1.25] text-amber-900 shadow-[0_8px_16px_rgba(146,64,14,0.07)]">
      changed from {currentStatus} to {request.requestedStatus}
    </span>
  );
}

function CalendarStatusBadge({
  dotClassName,
  label,
  labelClassName,
}: {
  dotClassName: string;
  label: string;
  labelClassName: string;
}) {
  return (
    <span
      className={cn(
        "inline-flex min-w-0 w-fit items-center gap-1.5 rounded-full border px-2 py-0.5 text-[10px] font-black capitalize",
        labelClassName,
      )}
    >
      <span className={cn("h-1.5 w-1.5 shrink-0 rounded-full", dotClassName)} />
      <span className="truncate">{label}</span>
    </span>
  );
}
