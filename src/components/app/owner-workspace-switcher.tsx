"use client";

import { Realtime, type InboundMessage } from "ably";
import { Building2, Check, ChevronDown } from "lucide-react";
import { usePathname, useSearchParams } from "next/navigation";
import { useEffect, useMemo, useRef, useState } from "react";

import { setOwnerVenueAction } from "@/app/(app)/actions";
import { getVenueRealtimeChannel } from "@/lib/realtime-channels";
import { realtimeEventName, type RealtimeEvent } from "@/lib/realtime-events";
import type { AppUser, Venue } from "@/lib/types";
import { cn } from "@/lib/ui";

const refreshDelayMs = 120;

export function OwnerWorkspaceSwitcher({
  compact,
  initialPendingCountsByVenue,
  selectedVenueId,
  user,
  venues,
}: {
  compact?: boolean;
  initialPendingCountsByVenue: Record<string, number>;
  selectedVenueId?: string;
  user: AppUser;
  venues: Venue[];
}) {
  const pathname = usePathname();
  const searchParams = useSearchParams();
  const switcherRef = useRef<HTMLDivElement>(null);
  const toggleRef = useRef<HTMLInputElement>(null);
  const refreshTimer = useRef<number | undefined>(undefined);
  const [pendingCountsByVenue, setPendingCountsByVenue] = useState(
    initialPendingCountsByVenue,
  );
  const queryVenueId = searchParams.get("venue");
  const currentVenueId = queryVenueId ?? selectedVenueId ?? null;
  const venueIds = useMemo(() => venues.map((venue) => venue.id), [venues]);
  const venueIdKey = venueIds.join("|");
  const pendingTotal = Object.values(pendingCountsByVenue).reduce(
    (total, count) => total + count,
    0,
  );
  const [optimisticSelection, setOptimisticSelection] = useState<{
    baseVenueId: string | null;
    venueId: string;
  }>();
  const optimisticVenueId =
    optimisticSelection?.baseVenueId === currentVenueId
      ? optimisticSelection.venueId
      : undefined;
  const activeVenue =
    venues.find((venue) => venue.id === optimisticVenueId) ??
    venues.find((venue) => venue.id === queryVenueId) ??
    venues.find((venue) => venue.id === selectedVenueId) ??
    venues[0];

  useEffect(() => {
    function handlePointerDown(event: PointerEvent) {
      if (!switcherRef.current?.contains(event.target as Node)) {
        if (toggleRef.current) {
          toggleRef.current.checked = false;
        }
      }
    }

    document.addEventListener("pointerdown", handlePointerDown);

    return () => {
      document.removeEventListener("pointerdown", handlePointerDown);
    };
  }, []);

  useEffect(() => {
    if (!venueIdKey) {
      return;
    }

    const client = new Realtime({ authUrl: "/api/realtime/token" });
    const subscribedChannels = venueIds.map((venueId) =>
      client.channels.get(getVenueRealtimeChannel(venueId)),
    );
    let isMounted = true;

    function refreshSoon() {
      window.clearTimeout(refreshTimer.current);
      refreshTimer.current = window.setTimeout(() => {
        void refreshCounts();
      }, refreshDelayMs);
    }

    async function refreshCounts() {
      const response = await fetch("/api/approvals/pending-counts-by-venue", {
        cache: "no-store",
      });

      if (!response.ok) {
        return;
      }

      const payload = (await response.json()) as {
        counts?: Record<string, number>;
      };

      if (isMounted && payload.counts) {
        setPendingCountsByVenue(payload.counts);
      }
    }

    function handleMessage(message: InboundMessage) {
      const event = parseRealtimeEvent(message.data);

      if (event?.type === "calendar-request-changed") {
        refreshSoon();
      }
    }

    subscribedChannels.forEach((channel) => {
      void channel.subscribe(realtimeEventName, (message) => {
        if (isMounted) {
          handleMessage(message);
        }
      });
    });

    return () => {
      isMounted = false;
      window.clearTimeout(refreshTimer.current);
      subscribedChannels.forEach((channel) => {
        channel.unsubscribe(realtimeEventName);
      });
      client.close();
    };
  }, [venueIdKey, venueIds]);

  if (!activeVenue) {
    return <OwnerSummary compact={compact} user={user} />;
  }

  return (
    <div className="relative" ref={switcherRef}>
      <input
        className="peer sr-only"
        id="owner-workspace-toggle"
        ref={toggleRef}
        type="checkbox"
      />
      <label
        aria-label="Select active venue"
        className={cn(
          "flex min-w-0 cursor-pointer items-center gap-2 rounded-full border border-[#EACC84]/35 bg-[#FCFCF0] text-slate-950 shadow-[0_10px_24px_rgba(0,0,0,0.14)] transition hover:bg-[#F6E4AE] peer-focus-visible:ring-2 peer-focus-visible:ring-[#EACC84]/45",
          compact
            ? "max-w-[calc(100vw-128px)] gap-1.5 p-1 pr-1.5 min-[390px]:max-w-[calc(100vw-144px)] sm:max-w-xs sm:p-1.5 sm:pr-2"
            : "px-3 py-1.5",
        )}
        htmlFor="owner-workspace-toggle"
      >
        <span
          className={cn(
            "grid shrink-0 place-items-center rounded-full bg-[#C0964E] text-[#123C36]",
            compact ? "h-7 w-7 sm:h-8 sm:w-8" : "h-8 w-8",
          )}
        >
          <Building2 size={compact ? 13 : 15} aria-hidden="true" />
        </span>
        <span className="min-w-0 flex-1 text-left">
          <span
            className={cn(
              "block max-w-56 truncate font-black leading-tight text-slate-950",
              compact ? "text-[12px] sm:text-sm" : "text-sm",
            )}
          >
            {activeVenue.name}
          </span>
          <span
            className={cn(
              "block max-w-56 truncate font-bold leading-tight text-[#967230]",
              compact ? "text-[10px] sm:text-[11px]" : "text-[11px]",
            )}
          >
            {activeVenue.typeName}
          </span>
        </span>
        <PendingCountBadge count={pendingTotal} />
        {venues.length > 1 ? (
          <ChevronDown
            className={cn(
              "shrink-0 text-[#123C36] transition peer-checked:rotate-180",
              compact && "hidden min-[390px]:block",
            )}
            size={15}
            aria-hidden="true"
          />
        ) : null}
      </label>

      {venues.length > 1 ? (
        <div className="fixed left-1/2 top-[68px] z-50 hidden w-[calc(100vw-24px)] max-w-[340px] -translate-x-1/2 overflow-hidden rounded-2xl border border-[#EACC84]/40 bg-white p-2 shadow-[0_24px_60px_rgba(18,60,54,0.2)] peer-checked:block sm:absolute sm:top-full sm:mt-2 sm:w-[min(320px,calc(100vw-24px))]">
          <div className="px-3 py-2">
            <p className="text-[10px] font-black uppercase tracking-[0.14em] text-[#967230]">
              Active venue
            </p>
            <p className="mt-0.5 truncate text-xs font-bold text-slate-500">
              {user.email ?? user.phoneNumber}
            </p>
          </div>
          <div className="grid max-h-72 gap-1 overflow-y-auto">
            {venues.map((venue) => {
              const isSelected = venue.id === activeVenue.id;
              const pendingCount = pendingCountsByVenue[venue.id] ?? 0;

              return (
                <form action={setOwnerVenueAction} key={venue.id}>
                  <input name="venueId" readOnly type="hidden" value={venue.id} />
                  <input
                    name="returnTo"
                    readOnly
                    type="hidden"
                    value={getReturnTo(pathname, searchParams, venue.id)}
                  />
                  <button
                    className={cn(
                      "flex w-full items-center gap-3 rounded-xl px-3 py-2.5 text-left transition hover:bg-[#f8f3e4]",
                      isSelected && "bg-[#FCF7E8]",
                    )}
                    onClick={() =>
                      setOptimisticSelection({
                        baseVenueId: currentVenueId,
                        venueId: venue.id,
                      })
                    }
                    type="submit"
                  >
                    <span className="grid h-9 w-9 shrink-0 place-items-center rounded-xl bg-[#F6E4AE] text-[#123C36]">
                      <Building2 size={15} aria-hidden="true" />
                    </span>
                    <span className="min-w-0 flex-1">
                      <span className="block truncate text-sm font-black text-slate-950">
                        {venue.name}
                      </span>
                      <span className="block truncate text-xs font-bold text-slate-500">
                        {venue.typeName}
                      </span>
                    </span>
                    <span className="flex min-w-[46px] shrink-0 items-center justify-end gap-1.5">
                      {isSelected ? (
                        <Check className="text-[#967230]" size={16} />
                      ) : null}
                      <PendingCountBadge count={pendingCount} />
                    </span>
                  </button>
                </form>
              );
            })}
          </div>
        </div>
      ) : null}
    </div>
  );
}

function OwnerSummary({
  compact,
  user,
}: {
  compact?: boolean;
  user: AppUser;
}) {
  const initials = getInitials(user.name);

  return (
    <div
      className={cn(
        "flex items-center gap-2 rounded-full border border-[#EACC84]/35 bg-[#FCFCF0] text-slate-950 shadow-[0_10px_24px_rgba(0,0,0,0.14)]",
        compact ? "p-1.5 sm:px-2" : "px-3 py-1.5",
      )}
    >
      <span className="grid h-8 w-8 shrink-0 place-items-center rounded-full bg-[#C0964E] text-[11px] font-black text-[#123C36]">
        {initials}
      </span>
      <span className={cn("min-w-0", compact && "hidden sm:block")}>
        <span className="block max-w-56 truncate text-sm font-black leading-tight text-slate-950">
          {user.email ?? user.phoneNumber}
        </span>
        <span className="block text-[11px] font-bold capitalize leading-tight text-[#967230]">
          {user.role}
        </span>
      </span>
    </div>
  );
}

function PendingCountBadge({ count }: { count: number }) {
  if (count <= 0) {
    return null;
  }

  return (
    <span
      aria-label={`${count} pending approval${count === 1 ? "" : "s"}`}
      className="grid h-5 min-w-5 shrink-0 place-items-center rounded-full bg-red-600 px-1.5 text-[10px] font-black leading-none text-white shadow-[0_8px_16px_rgba(220,38,38,0.28)]"
    >
      {count > 99 ? "99+" : count}
    </span>
  );
}

function parseRealtimeEvent(data: unknown): RealtimeEvent | null {
  if (!data || typeof data !== "object") {
    return null;
  }

  const event = data as Partial<RealtimeEvent>;

  if (
    typeof event.type !== "string" ||
    typeof event.venueId !== "string" ||
    typeof event.timestamp !== "number"
  ) {
    return null;
  }

  return event as RealtimeEvent;
}

function getReturnTo(
  pathname: string,
  searchParams: URLSearchParams,
  venueId: string,
) {
  const nextParams = new URLSearchParams(searchParams.toString());

  if (pathname === "/calendar" || pathname === "/approvals") {
    nextParams.set("venue", venueId);
  }

  const query = nextParams.toString();
  return `${pathname}${query ? `?${query}` : ""}`;
}

function getInitials(name: string) {
  return name
    .split(" ")
    .map((part) => part[0])
    .join("")
    .slice(0, 2)
    .toUpperCase();
}
