"use client";

import { Realtime, type InboundMessage } from "ably";
import { ChevronLeft, ChevronRight, Loader2, MessageCircle } from "lucide-react";
import { useCallback, useEffect, useMemo, useRef, useState } from "react";

import type {
  IsoWeekday,
  PublicCalendarStatus,
  PublicListing,
} from "@/features/listings/types";
import {
  calendarSlots,
  getCalendarSlotKey,
  getCalendarSlotLabel,
} from "@/lib/calendar-slots";
import {
  addMonths,
  getCalendarDays,
  getDateLabel,
  getMonthLabel,
  parseDateKey,
  todayKey,
} from "@/lib/dates";
import { realtimeEventName, type RealtimeEvent } from "@/lib/realtime-events";
import type { CalendarSlot } from "@/lib/types";
import { cn } from "@/lib/ui";

const weekdayLabels = ["Mon", "Tue", "Wed", "Thu", "Fri", "Sat", "Sun"];

type CalendarListing = Pick<
  PublicListing,
  | "name"
  | "whatsappNumber"
  | "priceCurrency"
  | "weekdayDayPriceAmount"
  | "weekdayNightPriceAmount"
  | "weekendDayPriceAmount"
  | "weekendNightPriceAmount"
  | "weekendIsoDays"
  | "dayCheckIn"
  | "dayCheckOut"
  | "nightCheckIn"
  | "nightCheckOut"
>;

export function ListingDetailCalendar({
  channelName,
  initialMonth,
  initialStatuses,
  listing,
  slug,
}: {
  channelName: string;
  initialMonth: string;
  initialStatuses: PublicCalendarStatus[];
  listing: CalendarListing;
  slug: string;
}) {
  const [monthKey, setMonthKey] = useState(initialMonth);
  const [statuses, setStatuses] = useState(initialStatuses);
  const [isLoading, setIsLoading] = useState(false);
  const [loadedMonth, setLoadedMonth] = useState(initialMonth);
  const [loadError, setLoadError] = useState(false);
  const [selectedDate, setSelectedDate] = useState(() =>
    todayKey().startsWith(initialMonth) ? todayKey() : `${initialMonth}-01`,
  );
  const monthRef = useRef(monthKey);
  const statusBySlot = useMemo(
    () =>
      new Map(
        statuses.map((status) => [
          getCalendarSlotKey(status.date, status.slot),
          status.status,
        ]),
      ),
    [statuses],
  );
  const days = useMemo(() => getCalendarDays(monthKey), [monthKey]);
  const isAvailabilityReady = loadedMonth === monthKey;
  const monthOptions = useMemo(
    () =>
      Array.from({ length: 121 }, (_, index) => {
        const value = addMonths(monthKey, index - 60);
        return { label: getMonthLabel(value), value };
      }),
    [monthKey],
  );

  const refreshMonth = useCallback(
    async (targetMonth: string, showLoading = false) => {
      if (showLoading) {
        setIsLoading(true);
        setLoadError(false);
      }
      try {
        const response = await fetch(
          `/api/public/listings/${encodeURIComponent(slug)}/calendar?month=${targetMonth}`,
          { cache: "no-store" },
        );
        if (!response.ok) {
          throw new Error("Availability could not be loaded.");
        }
        const result = (await response.json()) as {
          statuses: PublicCalendarStatus[];
        };
        if (monthRef.current === targetMonth) {
          setStatuses(result.statuses);
          setLoadedMonth(targetMonth);
          setLoadError(false);
        }
      } catch {
        if (monthRef.current === targetMonth) {
          setLoadError(true);
        }
      } finally {
        if (showLoading && monthRef.current === targetMonth) setIsLoading(false);
      }
    },
    [slug],
  );

  useEffect(() => {
    let client: Realtime | null = null;
    let isMounted = true;
    let channel: ReturnType<Realtime["channels"]["get"]> | null = null;

    async function connect() {
      const tokenUrl = `/api/public/listings/${encodeURIComponent(slug)}/realtime-token`;
      const probe = await fetch(tokenUrl, { cache: "no-store" }).catch(() => null);
      if (!isMounted || !probe?.ok) return;

      client = new Realtime({ authUrl: tokenUrl });
      channel = client.channels.get(channelName);
      client.connection.on("connected", () => {
        if (isMounted) void refreshMonth(monthRef.current);
      });
      await channel.subscribe(realtimeEventName, (message: InboundMessage) => {
        const event = parseRealtimeEvent(message.data);
        if (
          isMounted &&
          event?.venueId &&
          (!event.date || event.date.startsWith(monthRef.current))
        ) {
          void refreshMonth(monthRef.current);
        }
      });
    }

    void connect().catch(() => undefined);
    const fallbackTimer = window.setInterval(
      () => void refreshMonth(monthRef.current),
      60000,
    );

    return () => {
      isMounted = false;
      window.clearInterval(fallbackTimer);
      if (channel) channel.unsubscribe(realtimeEventName);
      client?.close();
    };
  }, [channelName, refreshMonth, slug]);

  function moveMonth(amount: number) {
    selectMonth(addMonths(monthRef.current, amount));
  }

  function selectMonth(next: string) {
    monthRef.current = next;
    setMonthKey(next);
    setLoadError(false);
    setSelectedDate(todayKey().startsWith(next) ? todayKey() : `${next}-01`);
    void refreshMonth(next, true);
  }

  return (
    <section className="overflow-hidden rounded-lg border border-[#d7dfd4] bg-white shadow-[0_16px_38px_rgba(18,60,54,0.08)]">
      <header className="flex items-center justify-between gap-3 border-b border-[#d7dfd4] bg-[#123C36] px-3 py-3 text-white sm:px-5">
        <button
          aria-label="Previous month"
          className="grid h-9 w-9 shrink-0 place-items-center rounded-lg border border-white/20 text-white transition hover:bg-white/10"
          onClick={() => moveMonth(-1)}
          type="button"
        >
          <ChevronLeft size={18} aria-hidden="true" />
        </button>
        <div className="min-w-0 text-center">
          <p className="m-0 text-[9px] font-black uppercase text-[#EACC84]">
            Live Day & Night availability
          </p>
          <div className="mt-1 flex items-center justify-center gap-2">
            <select
              aria-label="Select calendar month"
              className="h-9 max-w-[180px] rounded-lg border border-white/25 bg-white px-3 text-center text-xs font-black text-[#123C36] outline-none transition focus:border-[#EACC84] focus:ring-2 focus:ring-[#EACC84]/30 sm:max-w-none sm:text-sm"
              onChange={(event) => selectMonth(event.target.value)}
              value={monthKey}
            >
              {monthOptions.map((option) => (
                <option key={option.value} value={option.value}>
                  {option.label}
                </option>
              ))}
            </select>
            {isLoading ? (
              <Loader2 className="animate-spin text-[#EACC84]" size={15} />
            ) : null}
          </div>
        </div>
        <button
          aria-label="Next month"
          className="grid h-9 w-9 shrink-0 place-items-center rounded-lg border border-white/20 text-white transition hover:bg-white/10"
          onClick={() => moveMonth(1)}
          type="button"
        >
          <ChevronRight size={18} aria-hidden="true" />
        </button>
      </header>

      <div className="grid grid-cols-7 border-b border-[#d7dfd4] bg-[#f5f8f4]">
        {weekdayLabels.map((label) => (
          <div
            className="py-2 text-center text-[9px] font-black uppercase text-[#48675f] sm:text-[10px]"
            key={label}
          >
            {label}
          </div>
        ))}
      </div>
      <div className="grid grid-cols-7">
        {days.map((day) => {
          const isToday = day.dateKey === todayKey();
          const slotStatuses = calendarSlots.map((slot) => ({
            slot,
            status: isAvailabilityReady
              ? (statusBySlot.get(getCalendarSlotKey(day.dateKey, slot)) ??
                "available")
              : null,
          }));

          return (
            <button
              aria-label={`${day.date.toLocaleDateString("en-US", {
                day: "numeric",
                month: "long",
                year: "numeric",
              })}: ${
                day.inMonth
                  ? isAvailabilityReady
                    ? slotStatuses
                      .map(({ slot, status }) => `${getCalendarSlotLabel(slot)} ${status}`)
                      .join("; ")
                    : loadError
                      ? "availability unavailable"
                      : "availability loading"
                  : "outside month"
              }`}
              className={cn(
                "flex min-h-[72px] flex-col items-center justify-center gap-1 border-b border-r border-[#e3e9e1] p-1 text-center transition sm:min-h-[96px] sm:gap-2 sm:p-2",
                !day.inMonth && "cursor-default bg-slate-50 text-slate-300",
                day.inMonth && "bg-white text-slate-800 hover:bg-[#f5f8f4]",
                day.inMonth && selectedDate === day.dateKey &&
                  "bg-[#FCF7E8] ring-2 ring-inset ring-[#C0964E]",
              )}
              disabled={!day.inMonth || !isAvailabilityReady}
              key={day.dateKey}
              onClick={() => setSelectedDate(day.dateKey)}
              type="button"
            >
              <span
                className={cn(
                  "grid h-7 w-7 place-items-center rounded-md text-xs font-black sm:h-8 sm:w-8",
                  day.inMonth && "bg-[#f5f8f4] shadow-sm",
                  isToday && "bg-[#123C36] text-white",
                )}
              >
                {day.dayNumber}
              </span>
              {day.inMonth && isAvailabilityReady ? (
                <span className="grid gap-0.5 text-[8px] font-black sm:text-[9px]">
                  {slotStatuses.map(({ slot, status }) => (
                    <span className="flex items-center gap-1" key={slot}>
                      <span className="w-3 text-slate-500">
                        {slot === "day" ? "D" : "N"}
                      </span>
                      <span
                        className={cn(
                          "h-1.5 w-1.5 rounded-full",
                          status === "booked" ? "bg-rose-500" : "bg-emerald-500",
                        )}
                      />
                      <span className="hidden sm:inline capitalize">{status}</span>
                    </span>
                  ))}
                </span>
              ) : day.inMonth ? (
                <span className="text-[8px] font-black text-slate-400 sm:text-[9px]">
                  {loadError ? "Unavailable" : "Loading…"}
                </span>
              ) : null}
            </button>
          );
        })}
      </div>

      {isAvailabilityReady ? (
        <SelectedDateDetails
          date={selectedDate}
          listing={listing}
          statusBySlot={statusBySlot}
        />
      ) : (
        <AvailabilityLoadState
          hasError={loadError}
          isLoading={isLoading}
          onRetry={() => void refreshMonth(monthKey, true)}
        />
      )}

      <div className="flex flex-wrap items-center justify-center gap-4 border-t border-[#d7dfd4] bg-white px-4 py-3 text-[10px] font-black text-slate-600">
        <Legend color="bg-emerald-500" label="Available" />
        <Legend color="bg-rose-500" label="Booked" />
        <span>D = Day · N = Night</span>
      </div>
    </section>
  );
}

function AvailabilityLoadState({
  hasError,
  isLoading,
  onRetry,
}: {
  hasError: boolean;
  isLoading: boolean;
  onRetry: () => void;
}) {
  return (
    <div className="grid justify-items-center gap-3 border-t border-[#d7dfd4] bg-[#fffdf8] p-5 text-center">
      <p className="m-0 text-sm font-bold text-slate-600">
        {hasError
          ? "Availability could not be loaded. No session is shown as available until the calendar is refreshed."
          : "Loading Day and Night availability…"}
      </p>
      {hasError ? (
        <button
          className="inline-flex h-9 items-center justify-center rounded-lg bg-[#123C36] px-4 text-xs font-black text-white transition hover:bg-[#1b5048] disabled:opacity-60"
          disabled={isLoading}
          onClick={onRetry}
          type="button"
        >
          {isLoading ? "Retrying…" : "Retry"}
        </button>
      ) : null}
    </div>
  );
}

function SelectedDateDetails({
  date,
  listing,
  statusBySlot,
}: {
  date: string;
  listing: CalendarListing;
  statusBySlot: Map<string, PublicCalendarStatus["status"]>;
}) {
  const isoWeekday = getIsoWeekday(date);
  const isWeekend = listing.weekendIsoDays.includes(isoWeekday);
  const isPastDate = date < todayKey();

  return (
    <div className="border-t border-[#d7dfd4] bg-[#fffdf8] p-4 sm:p-5">
      <div className="flex flex-wrap items-end justify-between gap-2">
        <div>
          <p className="m-0 text-[9px] font-black uppercase tracking-[0.14em] text-[#967230]">
            {isWeekend ? "Weekend rate" : "Weekday rate"}
          </p>
          <h3 className="m-0 mt-1 text-base font-black text-[#123C36]">
            {getDateLabel(date)}
          </h3>
        </div>
        <span className="text-[10px] font-bold text-slate-500">
          Night use belongs to its starting date.
        </span>
      </div>

      <div className="mt-3 grid gap-3 sm:grid-cols-2">
        {calendarSlots.map((slot) => {
          const status =
            statusBySlot.get(getCalendarSlotKey(date, slot)) ?? "available";
          const amount = getRate(listing, isWeekend, slot);
          const time =
            slot === "day"
              ? `${formatTime(listing.dayCheckIn)}–${formatTime(listing.dayCheckOut)}`
              : `${formatTime(listing.nightCheckIn)}–${formatTime(listing.nightCheckOut)}`;

          return (
            <div
              className={cn(
                "grid gap-2 rounded-lg border bg-white p-3",
                status === "booked" ? "border-rose-200" : "border-emerald-200",
              )}
              key={slot}
            >
              <div className="flex items-center justify-between gap-2">
                <span className="text-sm font-black text-[#123C36]">
                  {getCalendarSlotLabel(slot)}
                </span>
                <span
                  className={cn(
                    "inline-flex items-center gap-1 rounded-full px-2 py-1 text-[10px] font-black capitalize",
                    status === "booked"
                      ? "bg-rose-50 text-rose-800"
                      : "bg-emerald-50 text-emerald-800",
                  )}
                >
                  <span
                    className={cn(
                      "h-1.5 w-1.5 rounded-full",
                      status === "booked" ? "bg-rose-500" : "bg-emerald-500",
                    )}
                  />
                  {status}
                </span>
              </div>
              <div className="flex items-center justify-between gap-2 text-xs font-bold text-slate-500">
                <span>{time}</span>
                <span className="text-sm font-black text-[#967230]">
                  {formatPrice(amount, listing.priceCurrency)}
                </span>
              </div>
              {status === "available" && !isPastDate ? (
                <a
                  className="inline-flex h-9 items-center justify-center gap-2 rounded-lg bg-[#123C36] px-3 text-[11px] font-black text-white transition hover:bg-[#1b5048]"
                  href={getWhatsAppUrl(listing, date, slot)}
                  rel="noreferrer"
                  target="_blank"
                >
                  <MessageCircle size={14} aria-hidden="true" />
                  Ask about {slot} use
                </a>
              ) : null}
            </div>
          );
        })}
      </div>
    </div>
  );
}

function getRate(
  listing: CalendarListing,
  isWeekend: boolean,
  slot: CalendarSlot,
) {
  if (isWeekend) {
    return slot === "day"
      ? listing.weekendDayPriceAmount
      : listing.weekendNightPriceAmount;
  }

  return slot === "day"
    ? listing.weekdayDayPriceAmount
    : listing.weekdayNightPriceAmount;
}

function getIsoWeekday(date: string): IsoWeekday {
  const weekday = parseDateKey(date).getDay();
  return (weekday === 0 ? 7 : weekday) as IsoWeekday;
}

function getWhatsAppUrl(
  listing: CalendarListing,
  date: string,
  slot: CalendarSlot,
) {
  const phone = listing.whatsappNumber.replace(/\D/g, "");
  const message = `Hello, I would like to ask about ${getCalendarSlotLabel(slot).toLowerCase()} at ${listing.name} on ${getDateLabel(date)}.`;
  return `https://wa.me/${phone}?text=${encodeURIComponent(message)}`;
}

function formatPrice(amount: number, currency: string) {
  return new Intl.NumberFormat("en-US", {
    currency,
    maximumFractionDigits: 2,
    style: "currency",
  }).format(amount);
}

function formatTime(value: string) {
  const [hours = "0", minutes = "00"] = value.split(":");
  const date = new Date(2000, 0, 1, Number(hours), Number(minutes));
  return new Intl.DateTimeFormat("en-US", {
    hour: "numeric",
    minute: "2-digit",
  }).format(date);
}

function Legend({ color, label }: { color: string; label: string }) {
  return (
    <span className="inline-flex items-center gap-1.5">
      <span className={cn("h-2 w-2 rounded-full", color)} />
      {label}
    </span>
  );
}

function parseRealtimeEvent(data: unknown): RealtimeEvent | null {
  if (!data || typeof data !== "object") return null;
  const event = data as Partial<RealtimeEvent>;
  return typeof event.venueId === "string" && typeof event.type === "string"
    ? (event as RealtimeEvent)
    : null;
}
