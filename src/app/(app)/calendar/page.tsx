import { CalendarDays } from "lucide-react";
import { redirect } from "next/navigation";

import { PageHeader } from "@/components/app/page-header";
import { CalendarScrollRestorer } from "@/features/calendar/calendar-scroll-restorer";
import { CalendarGrid } from "@/features/calendar/calendar-grid";
import { DayPanel } from "@/features/calendar/day-panel";
import { MonthSelector } from "@/features/calendar/month-selector";
import { MobileCalendarView } from "@/features/calendar/mobile-calendar-view";
import { VenueSwitcher } from "@/features/calendar/venue-switcher";
import { requireUser } from "@/lib/auth";
import {
  calendarStatusColors,
  pendingCalendarColor,
} from "@/lib/calendar-colors";
import {
  getCalendarDays,
  getMonthLabel,
  getMonthRange,
  getWeekDays,
  isValidDateKey,
  parseMonthKey,
  parseDateKey,
  todayKey,
} from "@/lib/dates";
import {
  getCalendarEntries,
  getPendingRequestsForVenue,
} from "@/lib/data/calendar";
import { getLatestPendingRequestForOwner } from "@/lib/data/requests";
import { getVisibleVenues, getVenueForUser } from "@/lib/data/venues";
import { getOwnerSelectedVenueId } from "@/lib/owner-venue-selection";

export default async function CalendarPage({
  searchParams,
}: {
  searchParams: Promise<{ venue?: string; month?: string; date?: string }>;
}) {
  const user = await requireUser();
  const params = await searchParams;
  const storedOwnerVenueId =
    user.role === "owner" ? await getOwnerSelectedVenueId() : undefined;
  const pendingDefault =
    user.role === "owner" &&
    !params.venue &&
    !params.date &&
    !storedOwnerVenueId
      ? await getLatestPendingRequestForOwner(user.id)
      : null;
  const monthKey = parseMonthKey(
    params.month ?? pendingDefault?.date.slice(0, 7),
  );
  const venues = await getVisibleVenues(user);

  if (venues.length === 0) {
    return (
      <>
        <PageHeader
          title="Calendar"
          description="No venues are assigned to your account yet."
        />
        <div className="rounded-lg border border-zinc-200 bg-white p-6 text-sm text-zinc-500">
          Ask the superadmin to assign a venue or space to this account.
        </div>
      </>
    );
  }

  const selectedVenueId =
    params.venue ?? storedOwnerVenueId ?? pendingDefault?.venueId ?? venues[0].id;
  const selectedVenue =
    (await getVenueForUser(selectedVenueId, user)) ?? venues[0];

  if (selectedVenue.id !== selectedVenueId) {
    redirect(`/calendar?venue=${selectedVenue.id}&month=${monthKey}`);
  }

  if (pendingDefault && selectedVenue.id === pendingDefault.venueId) {
    redirect(
      `/calendar?venue=${pendingDefault.venueId}` +
        `&month=${pendingDefault.date.slice(0, 7)}&date=${pendingDefault.date}`,
    );
  }

  const currentDateKey = todayKey();
  const currentMonthKey = currentDateKey.slice(0, 7);
  const requestedDate =
    params.date && isValidDateKey(params.date) && params.date.slice(0, 7) === monthKey
      ? params.date
      : undefined;
  const selectedDate =
    requestedDate ?? (monthKey === currentMonthKey ? currentDateKey : undefined);
  const range = getMonthRange(monthKey);
  const [entries, pendingRequests] = await Promise.all([
    getCalendarEntries(selectedVenue.id, range.start, range.end),
    getPendingRequestsForVenue(selectedVenue.id, range.start, range.end),
  ]);

  const entriesByDate = new Map(entries.map((entry) => [entry.date, entry]));
  const requestsByDate = new Map(
    pendingRequests.map((request) => [request.date, request]),
  );
  const returnTo = `/calendar?venue=${selectedVenue.id}&month=${monthKey}${
    selectedDate ? `&date=${selectedDate}` : ""
  }`;
  const selectedMobileDate =
    selectedDate ??
    (monthKey === currentMonthKey ? currentDateKey : `${monthKey}-01`);
  const mobileReturnTo =
    `/calendar?venue=${selectedVenue.id}&month=${selectedMobileDate.slice(0, 7)}` +
    `&date=${selectedMobileDate}`;
  const currentMonth = parseDateKey(`${monthKey}-01`);
  const isReadOnlyMonth = monthKey < currentMonthKey;
  const isSelectedDateReadOnly = selectedDate
    ? selectedDate.slice(0, 7) < currentMonthKey
    : isReadOnlyMonth;
  const isMobileDateReadOnly = selectedMobileDate.slice(0, 7) < currentMonthKey;

  return (
    <section className="overflow-visible rounded-2xl border border-[#d8e9ee] bg-white shadow-[0_20px_70px_rgba(15,23,42,0.08)]">
      <CalendarScrollRestorer />
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
            days={getCalendarDays(monthKey)}
            entriesByDate={entriesByDate}
            isReadOnlyMonth={isReadOnlyMonth}
            monthKey={monthKey}
            requestsByDate={requestsByDate}
            selectedDate={selectedDate}
            selectedVenueId={selectedVenue.id}
          />
          <DayPanel
            date={selectedDate}
            entry={selectedDate ? entriesByDate.get(selectedDate) : undefined}
            pendingRequest={
              selectedDate ? requestsByDate.get(selectedDate) : undefined
            }
            returnTo={returnTo}
            isReadOnly={isSelectedDateReadOnly}
            user={user}
            venue={selectedVenue}
          />
        </div>

        <MobileCalendarView
          currentMonth={currentMonth}
          entriesByDate={entriesByDate}
          isReadOnlyMonth={isReadOnlyMonth}
          requestsByDate={requestsByDate}
          selectedDate={selectedMobileDate}
          selectedVenueId={selectedVenue.id}
          selectedWeekDays={getWeekDays(selectedMobileDate)}
        />

        <div className="mt-4 hidden max-[760px]:block">
          <DayPanel
            date={selectedMobileDate}
            entry={entriesByDate.get(selectedMobileDate)}
            pendingRequest={requestsByDate.get(selectedMobileDate)}
            returnTo={mobileReturnTo}
            isReadOnly={isMobileDateReadOnly}
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
