export type RealtimeEventType =
  | "calendar-entry-changed"
  | "calendar-request-changed";

export type RealtimeEvent = {
  date?: string;
  requestId?: string;
  timestamp: number;
  type: RealtimeEventType;
  venueId: string;
};

export const realtimeEventName = "reservation-change";
