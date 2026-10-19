import { z } from "zod";
import { AppError } from "../middleware/error";

export const COURT_TIME_ZONE = "Asia/Yangon";
export const openingHoursSchema = z
  .array(
    z
      .object({
        day: z.number().int().min(0).max(6),
        open: z.number().int().min(0).max(23),
        close: z.number().int().min(1).max(24),
        closed: z.boolean(),
      })
      .refine((v) => v.closed || v.close > v.open, "Closing hour must follow opening hour"),
  )
  .length(7)
  .refine((v) => new Set(v.map((d) => d.day)).size === 7, "Provide each weekday once");

export const timeRangeSchema = z.object({
  startsAt: z.string().datetime({ offset: true }),
  endsAt: z.string().datetime({ offset: true }),
});
export const createBookingSchema = timeRangeSchema.extend({
  courtId: z.string().min(1),
  teamId: z.string().min(1).optional(),
});

export function courtParts(date: Date) {
  // Yangon is UTC+06:30; use the court's wall clock, never the server/browser timezone.
  const local = new Date(date.getTime() + 390 * 60_000);
  return {
    day: local.getUTCDay(),
    date: local.toISOString().slice(0, 10),
    hour: local.getUTCHours(),
    minute: local.getUTCMinutes(),
  };
}

export function validateRange(startsAt: string, endsAt: string) {
  const start = new Date(startsAt);
  const end = new Date(endsAt);
  if (start <= new Date() || end <= start)
    throw new AppError("Choose a future start and a later end time", 400);
  for (const date of [start, end]) {
    if (courtParts(date).minute || date.getUTCSeconds() || date.getUTCMilliseconds()) {
      throw new AppError("Bookings must start and end on whole hours in Myanmar time", 400);
    }
  }
  if (end.getTime() - start.getTime() > 24 * 3_600_000)
    throw new AppError("Choose a range of at most 24 hours", 400);
  return { startsAt: start, endsAt: end };
}

export function validateOpeningHours(hours: unknown, start: Date, end: Date) {
  const schedule = openingHoursSchema.parse(hours);
  const from = courtParts(start);
  const to = courtParts(end);
  const day = schedule.find((d) => d.day === from.day)!;
  const endHour = to.date === from.date ? to.hour : to.hour === 0 ? 24 : -1;
  if (
    day.closed ||
    from.hour < day.open ||
    endHour < 0 ||
    endHour > day.close ||
    endHour <= from.hour
  ) {
    throw new AppError("Requested time is outside court opening hours", 400);
  }
}
