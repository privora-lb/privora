"use client";

import { Realtime, type InboundMessage } from "ably";
import { usePathname, useRouter, useSearchParams } from "next/navigation";
import { useEffect, useMemo, useRef } from "react";

import {
  getVenueRealtimeChannel,
  realtimeGlobalChannel,
} from "@/lib/realtime-channels";
import { realtimeEventName, type RealtimeEvent } from "@/lib/realtime-events";
import type { UserRole } from "@/lib/types";

const refreshDelayMs = 120;

export function RealtimeRouteRefresh({
  ownerVenueIds = [],
  userRole,
}: {
  ownerVenueIds?: string[];
  userRole: UserRole;
}) {
  const pathname = usePathname();
  const router = useRouter();
  const searchParams = useSearchParams();
  const refreshTimer = useRef<number | undefined>(undefined);
  const queryString = searchParams.toString();
  const channelNames = useMemo(
    () =>
      userRole === "superadmin"
        ? [realtimeGlobalChannel]
        : ownerVenueIds.map(getVenueRealtimeChannel),
    [ownerVenueIds, userRole],
  );

  useEffect(() => {
    if (!shouldListen(pathname) || channelNames.length === 0) {
      return;
    }

    const client = new Realtime({
      authUrl: "/api/realtime/token",
    });
    const subscribedChannels = channelNames.map((name) => client.channels.get(name));
    let isMounted = true;

    function refreshSoon() {
      window.clearTimeout(refreshTimer.current);
      refreshTimer.current = window.setTimeout(() => {
        router.refresh();
      }, refreshDelayMs);
    }

    function handleMessage(message: InboundMessage) {
      const event = parseRealtimeEvent(message.data);

      if (!event) {
        return;
      }

      if (shouldNavigateToOwnerRequest(pathname, userRole, event)) {
        const target = getCalendarTarget(event);

        if (target && target !== getCurrentPath(pathname, queryString)) {
          router.push(target, { scroll: false });
          return;
        }
      }

      if (shouldRefresh(pathname, queryString, event)) {
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
  }, [channelNames, pathname, queryString, router, userRole]);

  return null;
}

function shouldNavigateToOwnerRequest(
  pathname: string,
  userRole: UserRole,
  event: RealtimeEvent | null,
) {
  return (
    pathname === "/calendar" &&
    userRole === "owner" &&
    event?.type === "calendar-request-changed" &&
    Boolean(event.venueId && event.date)
  );
}

function getCalendarTarget(event: RealtimeEvent | null) {
  if (!event?.venueId || !event.date) {
    return null;
  }

  return `/calendar?venue=${event.venueId}&month=${event.date.slice(
    0,
    7,
  )}&date=${event.date}`;
}

function getCurrentPath(pathname: string, queryString: string) {
  return queryString ? `${pathname}?${queryString}` : pathname;
}

function shouldListen(pathname: string) {
  return pathname === "/calendar" || pathname === "/approvals";
}

function shouldRefresh(
  pathname: string,
  queryString: string,
  event: RealtimeEvent | null,
) {
  if (!event?.type.startsWith("calendar-")) {
    return false;
  }

  if (pathname === "/approvals") {
    return true;
  }

  const selectedVenueId = new URLSearchParams(queryString).get("venue");
  return !selectedVenueId || selectedVenueId === event.venueId;
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
