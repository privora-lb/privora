"use client";

import { CalendarDays } from "lucide-react";
import { useEffect, useMemo, useState } from "react";
import { useRouter } from "next/navigation";

import { DayPanel } from "@/features/calendar/day-panel";
import {
  CalendarGrid,
  type CalendarGridDay,
} from "@/features/calendar/calendar-grid";
import { MobileCalendarView } from "@/features/calendar/mobile-calendar-view";
import { MonthSelector } from "@/features/calendar/month-selector";
import { VenueSwitcher } from "@/features/calendar/venue-switcher";
import {
  calendarStatusColors,
  pendingCalendarColor,
} from "@/lib/calendar-colors";
import {
  getMonthLabel,
  getWeekDays,
  parseDateKey,
} from "@/lib/dates";
import type {
  AppUser,
  CalendarEntry,
  ChangeRequest,
  Venue,
} from "@/lib/types";

export function CalendarWorkspace({
  canManage,
  canRequest,
  currentDateKey,
  currentMonthKey,
  days,
  entries,
  initialMobileDate,
  initialSelectedDate,
  isReadOnlyMonth,
  monthKey,
  pendingRequests,
  selectedVenue,
  user,
  venues,
}: {
  canManage: boolean;
  canRequest: boolean;
  currentDateKey: string;
  currentMonthKey: string;
  days: CalendarGridDay[];
  entries: CalendarEntry[];
  initialMobileDate: string;
  initialSelectedDate?: string;
  isReadOnlyMonth: boolean;
  monthKey: string;
  pendingRequests: ChangeRequest[];
  selectedVenue: Venue;
  user: AppUser;
  venues: Venue[];
}) {
  const router = useRouter();
  const [selectedDate, setSelectedDate] = useState(initialSelectedDate);
  const entriesByDate = useMemo(
    () => new Map(entries.map((entry) => [entry.date, entry])),
    [entries],
  );
  const requestsByDate = useMemo(
    () => new Map(pendingRequests.map((request) => [request.date, request])),
    [pendingRequests],
  );
  const selectedMobileDate = selectedDate ?? initialMobileDate;
  const returnTo = `/calendar?venue=${selectedVenue.id}&month=${monthKey}${
    selectedDate ? `&date=${selectedDate}` : ""
  }`;
  const mobileReturnTo =
    `/calendar?venue=${selectedVenue.id}&month=${selectedMobileDate.slice(0, 7)}` +
    `&date=${selectedMobileDate}`;
  const currentMonth = parseDateKey(`${monthKey}-01`);
  const isSelectedDateReadOnly = selectedDate
    ? selectedDate < currentDateKey
    : isReadOnlyMonth;
  const isMobileDateReadOnly = selectedMobileDate < currentDateKey;

  useEffect(() => {
    function syncSelectedDateFromUrl() {
      const params = new URLSearchParams(window.location.search);
      const urlVenueId = params.get("venue");
      const urlMonthKey = params.get("month") ?? currentMonthKey;
      const urlDate = params.get("date");

      if (urlVenueId && urlVenueId !== selectedVenue.id) {
        return;
      }

      if (urlMonthKey !== monthKey) {
        return;
      }

      setSelectedDate(urlDate?.slice(0, 7) === monthKey ? urlDate : undefined);
    }

    window.addEventListener("popstate", syncSelectedDateFromUrl);

    return () => {
      window.removeEventListener("popstate", syncSelectedDateFromUrl);
    };
  }, [currentMonthKey, monthKey, selectedVenue.id]);

  function selectDate(dateKey: string) {
    if (dateKey.slice(0, 7) !== monthKey) {
      router.push(
        `/calendar?venue=${selectedVenue.id}&month=${dateKey.slice(0, 7)}&date=${dateKey}`,
        { scroll: false },
      );
      return;
    }

    setSelectedDate(dateKey);
    window.history.pushState(
      null,
      "",
      `/calendar?venue=${selectedVenue.id}&month=${monthKey}&date=${dateKey}`,
    );
  }

  return (
    <section className="overflow-visible rounded-2xl border border-[#d8e9ee] bg-white shadow-[0_20px_70px_rgba(15,23,42,0.08)]">
      <div
        className={`grid gap-4 border-b border-[#d8e9ee] bg-[#f5fbfd] px-5 py-3 lg:items-end max-[760px]:px-3 ${
          user.role === "superadmin"
            ? "lg:grid-cols-[minmax(220px,0.8fr)_minmax(320px,1fr)_auto]"
            : "lg:grid-cols-[minmax(220px,1fr)_auto]"
        }`}
      >
        <div className="min-w-0">
          <div className="flex min-w-0 items-center gap-3">
            <span className="grid h-10 w-10 shrink-0 place-items-center rounded-xl bg-[#e2f7fb] text-[#007c92] ring-1 ring-[#c4edf4]">
              <CalendarDays size={18} aria-hidden="true" />
            </span>
            <div className="min-w-0">
              <p className="m-0 text-[10px] font-black uppercase tracking-[0.18em] text-[#007c92]">
                Reservation calendar
              </p>
              <h1 className="m-0 mt-1 truncate text-xl font-black leading-none text-slate-950">
                {getMonthLabel(monthKey)}
              </h1>
            </div>
          </div>
          <div className="mt-3 flex flex-wrap items-center gap-1.5">
            <CalendarLegendItem
              dotClassName={calendarStatusColors.available.dot}
              label="Available"
              labelClassName={calendarStatusColors.available.label}
            />
            <CalendarLegendItem
              dotClassName={calendarStatusColors.booked.dot}
              label="Booked"
              labelClassName={calendarStatusColors.booked.label}
            />
            <CalendarLegendItem
              dotClassName={pendingCalendarColor.dot}
              label="Pending approval"
              labelClassName={pendingCalendarColor.label}
            />
          </div>
        </div>

        {user.role === "superadmin" ? (
          <div className="min-w-0">
            <VenueSwitcher
              monthKey={monthKey}
              selectedVenueId={selectedVenue.id}
              venues={venues}
            />
          </div>
        ) : null}

        <div className="min-w-0 lg:justify-self-end">
          <span className="mb-2 block text-[11px] font-black uppercase tracking-[0.16em] text-[#007c92]">
            Change date
          </span>
          <MonthSelector monthKey={monthKey} selectedVenueId={selectedVenue.id} />
        </div>
      </div>

      <div className="px-5 py-4 max-[760px]:px-3">
        <div className="grid gap-4 xl:grid-cols-[minmax(0,1fr)_360px] max-[760px]:hidden">
          <CalendarGrid
            currentDateKey={currentDateKey}
            days={days}
            entriesByDate={entriesByDate}
            isReadOnlyMonth={isReadOnlyMonth}
            onSelectDate={selectDate}
            requestsByDate={requestsByDate}
            selectedDate={selectedDate}
          />
          <DayPanel
            canManage={canManage}
            canRequest={canRequest}
            currentDateKey={currentDateKey}
            date={selectedDate}
            entry={selectedDate ? entriesByDate.get(selectedDate) : undefined}
            isReadOnly={isSelectedDateReadOnly}
            pendingRequest={
              selectedDate ? requestsByDate.get(selectedDate) : undefined
            }
            returnTo={returnTo}
            user={user}
            venue={selectedVenue}
          />
        </div>

        <MobileCalendarView
          currentMonth={currentMonth}
          entriesByDate={entriesByDate}
          isReadOnlyMonth={isReadOnlyMonth}
          onSelectDate={selectDate}
          requestsByDate={requestsByDate}
          selectedDate={selectedMobileDate}
          selectedWeekDays={getWeekDays(selectedMobileDate)}
        />

        <div className="mt-4 hidden max-[760px]:block">
          <DayPanel
            canManage={canManage}
            canRequest={canRequest}
            currentDateKey={currentDateKey}
            date={selectedMobileDate}
            entry={entriesByDate.get(selectedMobileDate)}
            isReadOnly={isMobileDateReadOnly}
            pendingRequest={requestsByDate.get(selectedMobileDate)}
            returnTo={mobileReturnTo}
            user={user}
            venue={selectedVenue}
          />
        </div>
      </div>
    </section>
  );
}

function CalendarLegendItem({
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
      className={`inline-flex min-h-6 items-center gap-1.5 rounded-full border px-2.5 text-[10px] font-black ${labelClassName}`}
    >
      <span className={`h-1.5 w-1.5 rounded-full ${dotClassName}`} />
      {label}
    </span>
  );
}
