import { Rest } from "ably";

import {
  getVenueRealtimeChannel,
  realtimeGlobalChannel,
} from "@/lib/realtime-channels";
import { realtimeEventName, type RealtimeEvent } from "@/lib/realtime-events";

let ablyClient: Rest | null = null;

function getAblyClient() {
  if (ablyClient) {
    return ablyClient;
  }

  const key = process.env.ABLY_API_KEY;

  if (!key) {
    return null;
  }

  ablyClient = new Rest({ key });
  return ablyClient;
}

export async function publishRealtimeEvent(
  event: Omit<RealtimeEvent, "timestamp"> & { timestamp?: number },
) {
  const client = getAblyClient();

  if (!client) {
    console.warn("ABLY_API_KEY is missing. Realtime event was not published.");
    return;
  }

  const payload: RealtimeEvent = {
    ...event,
    timestamp: event.timestamp ?? Date.now(),
  };

  try {
    await Promise.all([
      client.channels
        .get(getVenueRealtimeChannel(payload.venueId))
        .publish(realtimeEventName, payload),
      client.channels.get(realtimeGlobalChannel).publish(realtimeEventName, payload),
    ]);
  } catch (error) {
    console.error("Realtime notification failed:", error);
  }
}
