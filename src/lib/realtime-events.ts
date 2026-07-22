import type { CalendarSlot } from "@/lib/types";

export type RealtimeEventType =
  | "calendar-entry-changed"
  | "calendar-request-changed";

export type RealtimeEvent = {
  date?: string;
  requestId?: string;
  slot?: CalendarSlot;
  timestamp: number;
  type: RealtimeEventType;
  venueId: string;
};

export const realtimeEventName = "reservation-change";
