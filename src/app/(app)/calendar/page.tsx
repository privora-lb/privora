import { redirect } from "next/navigation";

import { PageHeader } from "@/components/app/page-header";
import { CalendarScrollRestorer } from "@/features/calendar/calendar-scroll-restorer";
import { CalendarWorkspace } from "@/features/calendar/calendar-workspace";
import { requireUser } from "@/lib/auth";
import {
  getCalendarDays,
  getMonthRange,
  isValidDateKey,
  parseMonthKey,
  todayKey,
} from "@/lib/dates";
import {
  getCalendarEntries,
  getPendingRequestsForVenue,
} from "@/lib/data/calendar";
import { getLatestPendingRequestForOwner } from "@/lib/data/requests";
import {
  getVisibleVenues,
  getVenueForUser,
  userCanManageVenueDirectly,
  userCanRequestVenueChange,
} from "@/lib/data/venues";
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

  const selectedMobileDate =
    selectedDate ??
    (monthKey === currentMonthKey ? currentDateKey : `${monthKey}-01`);
  const isReadOnlyMonth = monthKey < currentMonthKey;
  const days = getCalendarDays(monthKey).map((day) => ({
    dateKey: day.dateKey,
    dayNumber: day.dayNumber,
    inMonth: day.inMonth,
    isToday: day.isToday,
  }));

  return (
    <>
      <CalendarScrollRestorer />
      <CalendarWorkspace
        canManage={userCanManageVenueDirectly(user, selectedVenue)}
        canRequest={userCanRequestVenueChange(user, selectedVenue)}
        currentDateKey={currentDateKey}
        currentMonthKey={currentMonthKey}
        days={days}
        entries={entries}
        initialMobileDate={selectedMobileDate}
        initialSelectedDate={selectedDate}
        isReadOnlyMonth={isReadOnlyMonth}
        key={`${selectedVenue.id}:${monthKey}:${selectedDate ?? ""}`}
        monthKey={monthKey}
        pendingRequests={pendingRequests}
        selectedVenue={selectedVenue}
        user={user}
        venues={venues}
      />
    </>
  );
}
