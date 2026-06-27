import type { CalendarStatus } from "@/lib/types";

export const pendingCalendarColor = {
  border: "border-amber-200",
  cell: "border-amber-200 bg-amber-50 text-amber-900 hover:border-amber-300 hover:bg-amber-100",
  dot: "bg-amber-500",
  label: "border-amber-200 bg-amber-50 text-amber-800",
  chip: "border-amber-200 bg-amber-50 text-amber-800",
};

export const calendarStatusColors: Record<
  CalendarStatus,
  { border: string; cell: string; dot: string; label: string; text: string }
> = {
  booked: {
    border: "border-rose-200",
    cell: "border-rose-200 bg-rose-50 text-rose-900 hover:border-rose-300 hover:bg-rose-100",
    dot: "bg-rose-500",
    label: "border-rose-200 bg-rose-50 text-rose-800",
    text: "text-rose-800",
  },
  available: {
    border: "border-emerald-200",
    cell: "border-emerald-200 bg-emerald-50 text-emerald-900 hover:border-emerald-300 hover:bg-emerald-100",
    dot: "bg-emerald-500",
    label: "border-emerald-200 bg-emerald-50 text-emerald-800",
    text: "text-emerald-800",
  },
};
