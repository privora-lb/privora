"use client";

import { Realtime, type InboundMessage } from "ably";
import { ChevronLeft, ChevronRight, Loader2 } from "lucide-react";
import { useCallback, useEffect, useMemo, useRef, useState } from "react";

import type { PublicCalendarStatus } from "@/features/listings/types";
import {
  addMonths,
  getCalendarDays,
  getMonthLabel,
  todayKey,
} from "@/lib/dates";
import { realtimeEventName, type RealtimeEvent } from "@/lib/realtime-events";
import { cn } from "@/lib/ui";

const weekdayLabels = ["Mon", "Tue", "Wed", "Thu", "Fri", "Sat", "Sun"];

export function ListingDetailCalendar({
  channelName,
  initialMonth,
  initialStatuses,
  slug,
}: {
  channelName: string;
  initialMonth: string;
  initialStatuses: PublicCalendarStatus[];
  slug: string;
}) {
  const [monthKey, setMonthKey] = useState(initialMonth);
  const [statuses, setStatuses] = useState(initialStatuses);
  const [isLoading, setIsLoading] = useState(false);
  const monthRef = useRef(monthKey);
  const statusByDate = useMemo(
    () => new Map(statuses.map((status) => [status.date, status.status])),
    [statuses],
  );
  const days = useMemo(() => getCalendarDays(monthKey), [monthKey]);
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
      if (showLoading) setIsLoading(true);
      try {
        const response = await fetch(
          `/api/public/listings/${encodeURIComponent(slug)}/calendar?month=${targetMonth}`,
          { cache: "no-store" },
        );
        if (!response.ok) return;
        const result = (await response.json()) as {
          statuses: PublicCalendarStatus[];
        };
        if (monthRef.current === targetMonth) setStatuses(result.statuses);
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
    const next = addMonths(monthRef.current, amount);
    selectMonth(next);
  }

  function selectMonth(next: string) {
    monthRef.current = next;
    setMonthKey(next);
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
            Live availability
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
            {isLoading ? <Loader2 className="animate-spin text-[#EACC84]" size={15} /> : null}
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
          <div className="py-2 text-center text-[9px] font-black uppercase text-[#48675f] sm:text-[10px]" key={label}>
            {label}
          </div>
        ))}
      </div>
      <div className="grid grid-cols-7">
        {days.map((day) => {
          const status = statusByDate.get(day.dateKey) ?? "available";
          const isBooked = status === "booked";
          const isToday = day.dateKey === todayKey();

          return (
            <div
              aria-label={`${day.date.toLocaleDateString("en-US", { month: "long", day: "numeric", year: "numeric" })}: ${day.inMonth ? status : "outside month"}`}
              className={cn(
                "flex min-h-[62px] flex-col items-center justify-center gap-1 border-b border-r border-[#e3e9e1] p-1 text-center sm:min-h-[86px] sm:gap-2 sm:p-2",
                !day.inMonth && "bg-slate-50 text-slate-300",
                day.inMonth && !isBooked && "bg-[#edf9f0] text-emerald-800",
                day.inMonth && isBooked && "bg-[#fff0f1] text-rose-800",
              )}
              key={day.dateKey}
            >
              <span
                className={cn(
                  "grid h-7 w-7 place-items-center rounded-md text-xs font-black sm:h-8 sm:w-8",
                  day.inMonth && "bg-white/90 shadow-sm",
                  isToday && "bg-[#123C36] text-white",
                )}
              >
                {day.dayNumber}
              </span>
              {day.inMonth ? (
                <span className="inline-flex items-center gap-1 text-[8px] font-black sm:text-[10px]">
                  <span className={cn("h-1.5 w-1.5 rounded-full", isBooked ? "bg-rose-500" : "bg-emerald-500")} />
                  <span className="hidden sm:inline">{isBooked ? "Booked" : "Available"}</span>
                </span>
              ) : null}
            </div>
          );
        })}
      </div>
      <div className="flex items-center justify-center gap-5 border-t border-[#d7dfd4] bg-white px-4 py-3 text-[10px] font-black text-slate-600">
        <Legend color="bg-emerald-500" label="Available" />
        <Legend color="bg-rose-500" label="Booked" />
      </div>
    </section>
  );
}

function Legend({ color, label }: { color: string; label: string }) {
  return <span className="inline-flex items-center gap-1.5"><span className={cn("h-2 w-2 rounded-full", color)} />{label}</span>;
}

function parseRealtimeEvent(data: unknown): RealtimeEvent | null {
  if (!data || typeof data !== "object") return null;
  const event = data as Partial<RealtimeEvent>;
  return typeof event.venueId === "string" && typeof event.type === "string"
    ? (event as RealtimeEvent)
    : null;
}
