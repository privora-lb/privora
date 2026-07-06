"use client";

import { Realtime, type InboundMessage } from "ably";
import { useEffect, useRef, useState } from "react";

import {
  getVenueRealtimeChannel,
  realtimeGlobalChannel,
} from "@/lib/realtime-channels";
import { realtimeEventName, type RealtimeEvent } from "@/lib/realtime-events";
import type { UserRole } from "@/lib/types";

const refreshDelayMs = 120;

export function ApprovalPendingBadge({
  initialCount,
  ownerSelectedVenueId,
  ownerVenueIds = [],
  role,
}: {
  initialCount: number;
  ownerSelectedVenueId?: string;
  ownerVenueIds?: string[];
  role: UserRole;
}) {
  const [count, setCount] = useState(initialCount);
  const refreshTimer = useRef<number | undefined>(undefined);
  const ownerVenueKey = ownerVenueIds.join("|");

  useEffect(() => {
    const channelNames =
      role === "superadmin"
        ? [realtimeGlobalChannel]
        : ownerVenueKey
          ? ownerVenueKey.split("|").map(getVenueRealtimeChannel)
          : [];

    if (channelNames.length === 0) {
      return;
    }

    const client = new Realtime({ authUrl: "/api/realtime/token" });
    const subscribedChannels = channelNames.map((name) => client.channels.get(name));
    let isMounted = true;

    function refreshSoon() {
      window.clearTimeout(refreshTimer.current);
      refreshTimer.current = window.setTimeout(() => {
        void refreshCount();
      }, refreshDelayMs);
    }

    async function refreshCount() {
      const response = await fetch(getCountUrl(ownerSelectedVenueId), {
        cache: "no-store",
      });

      if (!response.ok) {
        return;
      }

      const payload = (await response.json()) as { count?: number };

      if (isMounted && typeof payload.count === "number") {
        setCount(payload.count);
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
  }, [ownerSelectedVenueId, ownerVenueKey, role]);

  if (count <= 0) {
    return null;
  }

  return (
    <span
      aria-label={`${count} pending approval${count === 1 ? "" : "s"}`}
      className="pointer-events-none absolute left-full top-1/2 ml-1.5 inline-grid h-5 min-w-5 -translate-y-1/2 place-items-center rounded-full bg-red-600 px-1.5 text-[10px] font-black leading-none text-white shadow-[0_8px_16px_rgba(220,38,38,0.3)]"
    >
      {count > 99 ? "99+" : count}
    </span>
  );
}

function getCountUrl(ownerSelectedVenueId?: string) {
  if (!ownerSelectedVenueId) {
    return "/api/approvals/pending-count";
  }

  const params = new URLSearchParams({ venue: ownerSelectedVenueId });

  return `/api/approvals/pending-count?${params}`;
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
