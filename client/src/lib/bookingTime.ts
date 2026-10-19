import { getLocale, t } from './language';

export type OpeningDay = { day: number; open: number; close: number; closed: boolean };
export type TimeRange = { startsAt: string; endsAt: string };
export const weekdays = [
  "Sunday",
  "Monday",
  "Tuesday",
  "Wednesday",
  "Thursday",
  "Friday",
  "Saturday",
];
export const defaultHours: OpeningDay[] = weekdays.map((_, day) => ({
  day,
  open: 8,
  close: 23,
  closed: false,
}));
export const hourLabel = (hour: number) =>
  hour === 24 ? t("12:00 AM (next day)") : `${hour % 12 || 12}:00 ${t(hour < 12 ? "AM" : "PM")}`;
export function courtDate(date = new Date()) {
  return new Date(date.getTime() + 390 * 60_000).toISOString().slice(0, 10);
}
export function atHour(date: string, hour: number) {
  const start = new Date(`${date}T00:00:00+06:30`);
  return new Date(start.getTime() + hour * 3_600_000).toISOString();
}
export function formatBooking(range: TimeRange) {
  const options = { timeZone: "Asia/Yangon" };
  return `${new Date(range.startsAt).toLocaleDateString(getLocale(), options)}, ${new Date(range.startsAt).toLocaleTimeString(getLocale(), { ...options, hour: "numeric", minute: "2-digit" })} – ${new Date(range.endsAt).toLocaleString(getLocale(), { ...options, month: "short", day: "numeric", hour: "numeric", minute: "2-digit" })}`;
}
export function overlaps(a: TimeRange, b: TimeRange) {
  return new Date(a.startsAt) < new Date(b.endsAt) && new Date(a.endsAt) > new Date(b.startsAt);
}
