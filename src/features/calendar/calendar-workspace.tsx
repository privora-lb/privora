"use client";

import { CalendarDays } from "lucide-react";
import { useEffect, useMemo, useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";

import { CmsToastStack } from "@/components/cms/CmsToastStack";
import { useCmsToasts } from "@/components/cms/use-cms-toasts";
import { DayPanel } from "@/features/calendar/day-panel";
import {
  CalendarGrid,
  type CalendarGridDay,
} from "@/features/calendar/calendar-grid";
import { MobileCalendarView } from "@/features/calendar/mobile-calendar-view";
import { MonthSelector } from "@/features/calendar/month-selector";
import {
  MobileCalendarModeToggle,
  type MobileCalendarMode,
} from "@/features/calendar/mobile-calendar-mode-toggle";
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
  approvedAdminBookedDates,
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
  approvedAdminBookedDates: string[];
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
  const searchParams = useSearchParams();
  const [selectedDate, setSelectedDate] = useState(initialSelectedDate);
  const [entryOverrides, setEntryOverrides] = useState<
    Record<string, CalendarEntry | null>
  >({});
  const [requestOverrides, setRequestOverrides] = useState<
    Record<string, ChangeRequest | null>
  >({});
  const { dismissToast, pushToast, toasts } = useCmsToasts();
  const entriesByDate = useMemo(() => {
    const map = new Map(entries.map((entry) => [entry.date, entry]));

    Object.entries(entryOverrides).forEach(([dateKey, entry]) => {
      if (entry) {
        map.set(dateKey, entry);
      } else {
        map.delete(dateKey);
      }
    });

    return map;
  }, [entries, entryOverrides]);
  const requestsByDate = useMemo(() => {
    const map = new Map(pendingRequests.map((request) => [request.date, request]));

    Object.entries(requestOverrides).forEach(([dateKey, request]) => {
      if (request) {
        map.set(dateKey, request);
      } else {
        map.delete(dateKey);
      }
    });

    return map;
  }, [pendingRequests, requestOverrides]);
  const approvedAdminBookedDatesSet = useMemo(
    () => new Set(approvedAdminBookedDates),
    [approvedAdminBookedDates],
  );
  const statusCounts = useMemo(() => {
    return days.reduce(
      (counts, day) => {
        if (!day.inMonth) {
          return counts;
        }

        if (requestsByDate.has(day.dateKey)) {
          counts.pending += 1;
          return counts;
        }

        const status = entriesByDate.get(day.dateKey)?.status ?? "available";

        if (status === "booked") {
          counts.booked += 1;
        } else {
          counts.available += 1;
        }

        return counts;
      },
      { available: 0, booked: 0, pending: 0 },
    );
  }, [days, entriesByDate, requestsByDate]);
  const [mobileCalendarMode, setMobileCalendarMode] =
    useState<MobileCalendarMode>(() =>
      searchParams.get("view") === "full" ? "full" : "compact",
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
        getCalendarHref({
          date: dateKey,
          month: dateKey.slice(0, 7),
          venueId: selectedVenue.id,
          view: mobileCalendarMode,
        }),
        { scroll: false },
      );
      return;
    }

    setSelectedDate(dateKey);
    window.history.pushState(
      null,
      "",
      getCalendarHref({
        date: dateKey,
        month: monthKey,
        venueId: selectedVenue.id,
        view: mobileCalendarMode,
      }),
    );
  }

  function changeMobileCalendarMode(nextMode: MobileCalendarMode) {
    setMobileCalendarMode(nextMode);
    window.history.replaceState(
      null,
      "",
      getCalendarHref({
        date: selectedMobileDate,
        month: monthKey,
        venueId: selectedVenue.id,
        view: nextMode,
      }),
    );
  }

  function replaceEntry(dateKey: string, entry?: CalendarEntry | null) {
    setEntryOverrides((current) => ({ ...current, [dateKey]: entry ?? null }));
  }

  function replacePendingRequest(request?: ChangeRequest | null) {
    if (!request) {
      return;
    }

    setRequestOverrides((current) => ({ ...current, [request.date]: request }));
  }

  function removePendingRequest(requestId: string) {
    const serverRequest = pendingRequests.find((request) => request.id === requestId);

    setRequestOverrides((current) => {
      const next = { ...current };

      if (serverRequest) {
        next[serverRequest.date] = null;
      }

      Object.values(current).forEach((request) => {
        if (request?.id === requestId) {
          next[request.date] = null;
        }
      });

      return next;
    });
  }

  return (
    <section className="overflow-visible rounded-2xl border border-[#EACC84]/45 bg-white shadow-[0_20px_70px_rgba(18,60,54,0.1)]">
      <CmsToastStack onDismiss={dismissToast} toasts={toasts} />
      <div
        className={`grid gap-4 border-b border-[#C0964E]/35 bg-[#123C36] px-5 py-3 lg:items-end max-[760px]:px-3 ${
          user.role === "superadmin"
            ? "lg:grid-cols-[minmax(220px,0.8fr)_minmax(320px,1fr)_auto]"
            : "lg:grid-cols-[minmax(220px,1fr)_auto]"
        }`}
      >
        <div className="min-w-0">
          <div className="flex min-w-0 items-center gap-3">
            <span className="grid h-10 w-10 shrink-0 place-items-center rounded-xl bg-[#F6E4AE] text-[#123C36] ring-1 ring-[#EACC84]/70">
              <CalendarDays size={18} aria-hidden="true" />
            </span>
            <div className="min-w-0">
              <p className="m-0 text-[10px] font-black uppercase tracking-[0.18em] text-[#EACC84]">
                Reservation calendar
              </p>
              <h1 className="m-0 mt-1 truncate text-xl font-black leading-none text-[#FCFCF0]">
                {getMonthLabel(monthKey)}
              </h1>
            </div>
          </div>
          <div className="mt-3 flex flex-wrap items-center gap-1.5">
            <CalendarLegendItem
              count={statusCounts.available}
              dotClassName={calendarStatusColors.available.dot}
              label="Available"
              labelClassName={calendarStatusColors.available.label}
            />
            <CalendarLegendItem
              count={statusCounts.booked}
              dotClassName={calendarStatusColors.booked.dot}
              label="Booked"
              labelClassName={calendarStatusColors.booked.label}
            />
            <CalendarLegendItem
              count={statusCounts.pending}
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
          <span className="mb-2 block text-[11px] font-black uppercase tracking-[0.16em] text-[#EACC84]">
            Change date
          </span>
          <MonthSelector
            key={monthKey}
            monthKey={monthKey}
            selectedVenueId={selectedVenue.id}
            view={mobileCalendarMode}
          />
        </div>
      </div>

      <div className="px-5 py-4 max-[760px]:px-3">
        <MobileCalendarModeToggle
          mode={mobileCalendarMode}
          onModeChange={changeMobileCalendarMode}
        />

        <div className="grid gap-4 xl:grid-cols-[minmax(0,1fr)_360px] max-[760px]:hidden">
          <CalendarGrid
            approvedAdminBookedDates={approvedAdminBookedDatesSet}
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
            onEntryChange={replaceEntry}
            onPendingRequestChange={replacePendingRequest}
            onPendingRequestRemove={removePendingRequest}
            onToast={pushToast}
            pendingRequest={
              selectedDate ? requestsByDate.get(selectedDate) : undefined
            }
            returnTo={returnTo}
            user={user}
            venue={selectedVenue}
          />
        </div>

        {mobileCalendarMode === "compact" ? (
          <MobileCalendarView
            approvedAdminBookedDates={approvedAdminBookedDatesSet}
            currentMonth={currentMonth}
            entriesByDate={entriesByDate}
            isReadOnlyMonth={isReadOnlyMonth}
            onSelectDate={selectDate}
            requestsByDate={requestsByDate}
            selectedDate={selectedMobileDate}
            selectedWeekDays={getWeekDays(selectedMobileDate)}
          />
        ) : (
          <div className="hidden max-[760px]:block">
            <div className="mb-2 rounded-2xl border border-[#d8e9ee] bg-[#f8fcfd] px-3 py-2 text-center text-[11px] font-black uppercase tracking-[0.08em] text-[#35717d]">
              Swipe horizontally to view the full month
            </div>
            <div className="max-w-full overflow-x-auto overscroll-x-contain [-webkit-overflow-scrolling:touch]">
              <CalendarGrid
                approvedAdminBookedDates={approvedAdminBookedDatesSet}
                className="[-webkit-overflow-scrolling:touch]"
                currentDateKey={currentDateKey}
                days={days}
                entriesByDate={entriesByDate}
                isReadOnlyMonth={isReadOnlyMonth}
                onSelectDate={selectDate}
                requestsByDate={requestsByDate}
                selectedDate={selectedMobileDate}
              />
            </div>
          </div>
        )}

        <div className="mt-4 hidden max-[760px]:block">
          <DayPanel
            canManage={canManage}
            canRequest={canRequest}
            currentDateKey={currentDateKey}
            date={selectedMobileDate}
            entry={entriesByDate.get(selectedMobileDate)}
            isReadOnly={isMobileDateReadOnly}
            onEntryChange={replaceEntry}
            onPendingRequestChange={replacePendingRequest}
            onPendingRequestRemove={removePendingRequest}
            onToast={pushToast}
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

function getCalendarHref({
  date,
  month,
  venueId,
  view,
}: {
  date?: string;
  month: string;
  venueId: string;
  view: MobileCalendarMode;
}) {
  const params = new URLSearchParams({
    month,
    venue: venueId,
    view,
  });

  if (date) {
    params.set("date", date);
  }

  return `/calendar?${params.toString()}`;
}

function CalendarLegendItem({
  count,
  dotClassName,
  label,
  labelClassName,
}: {
  count: number;
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
      <span className="ml-0.5 rounded-full bg-white/70 px-1.5 py-0.5 text-[10px] leading-none shadow-sm">
        {count}
      </span>
    </span>
  );
}
