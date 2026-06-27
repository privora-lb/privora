import { ChevronLeft, ChevronRight } from "lucide-react";
import Link from "next/link";
import type { ReactNode } from "react";

import {
  calendarStatusColors,
  pendingCalendarColor,
} from "@/lib/calendar-colors";
import { addDays, getDateLabel, toDateKey } from "@/lib/dates";
import type { CalendarEntry, ChangeRequest } from "@/lib/types";
import { cn } from "@/lib/ui";

export function MobileCalendarView({
  currentMonth,
  entriesByDate,
  isReadOnlyMonth,
  requestsByDate,
  selectedDate,
  selectedVenueId,
  selectedWeekDays,
}: {
  currentMonth: Date;
  entriesByDate: Map<string, CalendarEntry>;
  isReadOnlyMonth?: boolean;
  requestsByDate: Map<string, ChangeRequest>;
  selectedDate: string;
  selectedVenueId: string;
  selectedWeekDays: Date[];
}) {
  const selectedDay = new Date(`${selectedDate}T00:00:00`);
  const selectedEntry = entriesByDate.get(selectedDate);
  const selectedRequest = requestsByDate.get(selectedDate);
  const selectedTitle = getDateLabel(selectedDate);
  const previousWeekDate = toDateKey(addDays(selectedDay, -7));
  const nextWeekDate = toDateKey(addDays(selectedDay, 7));

  return (
    <div className="hidden gap-4 max-[760px]:grid">
      <div className="overflow-hidden rounded-2xl border border-[#d8e9ee] bg-white shadow-[0_14px_34px_rgba(15,23,42,0.06)]">
        <div className="flex items-center justify-between gap-2 border-b border-[#d8e9ee] bg-[#f8fcfd] px-3 py-3">
          <MobileWeekLink
            href={dateHref(selectedVenueId, previousWeekDate)}
            label="Previous week"
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
            href={dateHref(selectedVenueId, nextWeekDate)}
            label="Next week"
            variant="solid"
          >
            <ChevronRight size={17} aria-hidden="true" />
          </MobileWeekLink>
        </div>

        <div className="grid grid-cols-7 gap-1.5 p-2">
          {selectedWeekDays.map((day) => {
            const key = toDateKey(day);
            const entry = entriesByDate.get(key);
            const request = requestsByDate.get(key);
            const statusStyle = entry
              ? calendarStatusColors[entry.status]
              : calendarStatusColors.available;
            const isSelected = key === selectedDate;
            const isCurrentMonth = day.getMonth() === currentMonth.getMonth();

            return (
              <Link
                aria-label={getDateLabel(key)}
                className={cn(
                  "grid min-h-[52px] min-w-0 place-items-center gap-1 rounded-lg border px-0 py-1.5 text-center transition active:scale-[0.98]",
                  statusStyle.cell,
                  request && "ring-2 ring-amber-300/50",
                  !isCurrentMonth && "opacity-55",
                  isSelected &&
                    "border-[#007c92] shadow-[0_8px_20px_rgba(0,124,146,0.12)] ring-2 ring-[#007c92]/18",
                )}
                href={dateHref(selectedVenueId, key)}
                key={key}
                scroll={false}
              >
                <span className="grid h-6 w-6 place-items-center rounded-md bg-white/80 text-[11px] font-black leading-none text-slate-950 shadow-[0_4px_10px_rgba(15,23,42,0.06)] max-[360px]:h-5 max-[360px]:w-5 max-[360px]:text-[10px]">
                  {day.getDate()}
                </span>
                <span className="flex items-center gap-1">
                  <span className={cn("h-1.5 w-1.5 rounded-full", statusStyle.dot)} />
                  {request ? (
                    <span
                      className={cn(
                        "h-1.5 w-1.5 rounded-full",
                        pendingCalendarColor.dot,
                      )}
                    />
                  ) : null}
                </span>
              </Link>
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
          <MobileSelectedEntry
            entry={selectedEntry}
            isReadOnly={isReadOnlyMonth}
            request={selectedRequest}
          />
        </div>
      </article>
    </div>
  );
}

function MobileSelectedEntry({
  entry,
  isReadOnly,
  request,
}: {
  entry?: CalendarEntry;
  isReadOnly?: boolean;
  request?: ChangeRequest;
}) {
  const currentStatus = entry?.status ?? "available";
  const statusStyle = calendarStatusColors[currentStatus];
  const note = entry?.note || "No current note for this day.";

  return (
    <>
      <span
        className={cn(
          "inline-flex w-fit items-center gap-2 rounded-full border px-3 py-1.5 text-[12px] font-black capitalize",
          statusStyle.label,
        )}
      >
        <span className={cn("h-2 w-2 rounded-full", statusStyle.dot)} />
        {currentStatus}
      </span>
      <p className="m-0 rounded-xl border border-slate-100 bg-slate-50 px-3 py-3 text-[13px] font-bold leading-relaxed text-slate-700">
        Current: {note}
      </p>
      {request ? <MobilePendingRequest request={request} /> : null}
      {isReadOnly ? (
        <span className="inline-flex min-h-11 items-center justify-center rounded-xl border border-[#d8e9ee] bg-[#f8fcfd] px-4 text-[12px] font-black uppercase tracking-[0.08em] text-slate-500">
          Display only
        </span>
      ) : null}
    </>
  );
}

function MobilePendingRequest({ request }: { request: ChangeRequest }) {
  return (
    <div className="grid gap-2 rounded-2xl border border-amber-300 bg-amber-50 px-3 py-3 text-amber-900">
      <div className="flex flex-wrap items-center justify-between gap-2">
        <span className="inline-flex items-center gap-2 text-[11px] font-black uppercase tracking-[0.1em]">
          <span className={cn("h-2 w-2 rounded-full", pendingCalendarColor.dot)} />
          Pending request
        </span>
        <span className="rounded-full bg-white px-2.5 py-1 text-[11px] font-black capitalize ring-1 ring-amber-200">
          Change to {request.requestedStatus}
        </span>
      </div>
      <p className="m-0 text-[13px] font-bold leading-relaxed text-amber-900/85">
        Request: {request.requestedNote || "No request note supplied."}
      </p>
    </div>
  );
}

function MobileWeekLink({
  children,
  href,
  label,
  variant,
}: {
  children: ReactNode;
  href: string;
  label: string;
  variant: "outline" | "solid";
}) {
  return (
    <Link
      aria-label={label}
      className={
        variant === "solid"
          ? "grid h-9 w-9 place-items-center rounded-xl bg-[#007c92] text-white shadow-[0_10px_22px_rgba(0,124,146,0.18)] transition active:scale-95"
          : "grid h-9 w-9 place-items-center rounded-xl border border-[#c9e5eb] bg-white text-[#0b4658] transition active:scale-95"
      }
      href={href}
      scroll={false}
    >
      {children}
    </Link>
  );
}

function dateHref(venueId: string, dateKey: string) {
  return `/calendar?venue=${venueId}&month=${dateKey.slice(0, 7)}&date=${dateKey}`;
}
