import { atHour, overlaps, type TimeRange } from "./bookingTime";
import { getLocale } from './language';

export type CalendarView = "day" | "week" | "month";

// Calendar-date arithmetic uses UTC fields, not the browser's local timezone.
export function addDays(date: string, days: number) {
  const value = new Date(`${date}T00:00:00Z`);
  value.setUTCDate(value.getUTCDate() + days);
  return value.toISOString().slice(0, 10);
}

export function shiftPeriod(date: string, view: CalendarView, direction: number) {
  if (view !== "month") return addDays(date, direction * (view === "week" ? 7 : 1));
  const value = new Date(`${date}T00:00:00Z`);
  const day = value.getUTCDate();
  value.setUTCDate(1);
  value.setUTCMonth(value.getUTCMonth() + direction);
  const last = new Date(Date.UTC(value.getUTCFullYear(), value.getUTCMonth() + 1, 0));
  value.setUTCDate(Math.min(day, last.getUTCDate()));
  return value.toISOString().slice(0, 10);
}

export function calendarDays(date: string, view: CalendarView) {
  if (view === "day") return [date];
  const first = view === "month" ? `${date.slice(0, 7)}-01` : date;
  const weekday = new Date(`${first}T00:00:00Z`).getUTCDay();
  const start = addDays(first, -((weekday + 6) % 7));
  if (view === "week") return Array.from({ length: 7 }, (_, i) => addDays(start, i));
  const last = new Date(`${first}T00:00:00Z`);
  last.setUTCMonth(last.getUTCMonth() + 1, 0);
  const length = Math.ceil((((weekday + 6) % 7) + last.getUTCDate()) / 7) * 7;
  return Array.from({ length }, (_, i) => addDays(start, i));
}

export function onCalendarDay(range: TimeRange, date: string) {
  return overlaps(range, { startsAt: atHour(date, 0), endsAt: atHour(date, 24) });
}

export function calendarLabel(date: string, options: Intl.DateTimeFormatOptions) {
  return new Date(atHour(date, 12)).toLocaleDateString(getLocale(), {
    ...options,
    timeZone: "Asia/Yangon",
  });
}
