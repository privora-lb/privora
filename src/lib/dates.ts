export type CalendarDay = {
  date: Date;
  dateKey: string;
  dayNumber: number;
  inMonth: boolean;
  isToday: boolean;
};

export function toDateKey(date: Date) {
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, "0");
  const day = String(date.getDate()).padStart(2, "0");

  return `${year}-${month}-${day}`;
}

export function todayKey() {
  return toDateKey(new Date());
}

export function normalizeDateKey(value: unknown) {
  if (value instanceof Date) {
    return toDateKey(value);
  }

  const text = String(value);
  return text.includes("T") ? text.slice(0, 10) : text;
}

export function parseMonthKey(value?: string | null) {
  if (value && /^\d{4}-\d{2}$/.test(value)) {
    const [year, month] = value.split("-").map(Number);

    if (month >= 1 && month <= 12) {
      return `${year}-${String(month).padStart(2, "0")}`;
    }
  }

  return toDateKey(new Date()).slice(0, 7);
}

export function addMonths(monthKey: string, amount: number) {
  const [year, month] = monthKey.split("-").map(Number);
  const date = new Date(year, month - 1 + amount, 1);

  return toDateKey(date).slice(0, 7);
}

export function addDays(date: Date, amount: number) {
  const next = new Date(date);
  next.setDate(next.getDate() + amount);

  return next;
}

export function parseDateKey(dateKey: string) {
  const [year = "0", month = "1", day = "1"] = dateKey.split("-");

  return new Date(Number(year), Number(month) - 1, Number(day));
}

export function startOfWeek(date: Date) {
  const start = new Date(date.getFullYear(), date.getMonth(), date.getDate());
  const day = start.getDay();
  const diff = day === 0 ? -6 : 1 - day;
  start.setDate(start.getDate() + diff);

  return start;
}

export function getMonthLabel(monthKey: string) {
  const [year, month] = monthKey.split("-").map(Number);

  return new Intl.DateTimeFormat("en", {
    month: "long",
    year: "numeric",
  }).format(new Date(year, month - 1, 1));
}

export function getDateLabel(dateKey: string) {
  return new Intl.DateTimeFormat("en", {
    weekday: "long",
    month: "long",
    day: "numeric",
    year: "numeric",
  }).format(new Date(`${dateKey}T00:00:00`));
}

export function getMonthRange(monthKey: string) {
  const [year, month] = monthKey.split("-").map(Number);
  const start = new Date(year, month - 1, 1);
  const end = new Date(year, month, 0);

  return {
    start: toDateKey(start),
    end: toDateKey(end),
  };
}

export function getCalendarDays(monthKey: string): CalendarDay[] {
  const [year, month] = monthKey.split("-").map(Number);
  const firstOfMonth = new Date(year, month - 1, 1);
  const nextMonth = new Date(year, month, 1);
  const firstGridDay = startOfWeek(firstOfMonth);
  const lastGridDay = addDays(startOfWeek(addDays(nextMonth, -1)), 6);
  const dayCount =
    Math.round((lastGridDay.getTime() - firstGridDay.getTime()) / 86400000) + 1;

  const days: CalendarDay[] = [];
  const currentTodayKey = todayKey();

  for (let index = 0; index < dayCount; index += 1) {
    const date = addDays(firstGridDay, index);
    const dateKey = toDateKey(date);

    days.push({
      date,
      dateKey,
      dayNumber: date.getDate(),
      inMonth: date.getMonth() === month - 1,
      isToday: dateKey === currentTodayKey,
    });
  }

  return days;
}

export function getWeekDays(dateKey: string) {
  const start = startOfWeek(parseDateKey(dateKey));

  return Array.from({ length: 7 }, (_, index) => addDays(start, index));
}

export function isValidDateKey(value: string) {
  return /^\d{4}-\d{2}-\d{2}$/.test(value);
}
