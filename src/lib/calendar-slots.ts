import type { CalendarSlot } from "@/lib/types";

export const calendarSlots: CalendarSlot[] = ["day", "night"];

export function getCalendarSlotKey(date: string, slot: CalendarSlot) {
  return `${date}:${slot}`;
}

export function getCalendarSlotLabel(slot: CalendarSlot) {
  return slot === "day" ? "Day use" : "Night use";
}

export function getCalendarSlotShortLabel(slot: CalendarSlot) {
  return slot === "day" ? "Day" : "Night";
}
