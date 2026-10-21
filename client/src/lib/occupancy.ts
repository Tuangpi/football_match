/** Pure helpers for computing owner-booking occupancy, extracted for testability. */
import { atHour, type TimeRange } from "./bookingTime";
import { onCalendarDay } from "./bookingCalendar";
import type { OpeningDay } from "./bookingTime";

export type { OpeningDay };

export function yangonWeekday(date: string): number {
  return new Date(`${date}T00:00:00+06:30`).getUTCDay();
}

/** Total open hours for the given courts on `date` (skips closed courts). */
export function availableHoursForDay(
  courts: { openingHours?: OpeningDay[] }[],
  date: string,
): number {
  const wd = yangonWeekday(date);
  let total = 0;
  for (const court of courts) {
    const hours = court.openingHours ?? [];
    const day = hours.find((d) => d.day === wd);
    if (!day || day.closed) continue;
    total += Math.max(0, day.close - day.open);
  }
  return total;
}

/** Sum of confirmed booking durations (in hours) overlapping `date`. */
export function bookedHoursForDay(
  bookings: (TimeRange & { status: string })[],
  date: string,
): number {
  const dayStart = new Date(atHour(date, 0)).getTime();
  const dayEnd = new Date(atHour(date, 24)).getTime();
  let totalMs = 0;
  for (const b of bookings) {
    if (b.status !== "CONFIRMED") continue;
    if (!onCalendarDay(b, date)) continue;
    const s = Math.max(new Date(b.startsAt).getTime(), dayStart);
    const e = Math.min(new Date(b.endsAt).getTime(), dayEnd);
    if (e > s) totalMs += e - s;
  }
  return totalMs / 3_600_000;
}

/** Occupancy percentage (0-100) for `date`, based on real booked vs open hours. */
export function occupancyPercent(
  bookings: (TimeRange & { status: string })[],
  courts: { openingHours?: OpeningDay[] }[],
  date: string,
): number {
  const available = availableHoursForDay(courts, date);
  if (available <= 0) return 0;
  const booked = bookedHoursForDay(bookings, date);
  return Math.min(100, Math.round((booked / available) * 100));
}