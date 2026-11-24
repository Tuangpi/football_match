import { getLocale } from '@/lib/language';
import type {
  OwnerScheduleBlock as Block,
  OwnerScheduleBooking as Booking,
  OwnerScheduleCourt as Court,
} from '@/lib/api-types';

export type { Block, Booking, Court };

export const START_HOUR = 8;
export const END_HOUR = 23;
export const HOUR_PX = 56;
export const COURT_COLORS = [
  'bg-sky-500',
  'bg-violet-500',
  'bg-emerald-500',
  'bg-orange-500',
  'bg-pink-500',
  'bg-cyan-500',
];

export function courtColor(courtId: string, courts: Court[]) {
  const index = Math.max(0, courts.findIndex((court) => court.id === courtId));
  return COURT_COLORS[index % COURT_COLORS.length];
}

export function statusStyle(status: Booking['status']) {
  if (status === 'CONFIRMED') return 'border-green-500 bg-green-500/10 hover:bg-green-500/20';
  if (status === 'CANCELLED') return 'border-muted text-muted-foreground line-through';
  return 'border-amber-500 bg-amber-500/10 hover:bg-amber-500/20';
}

export function toMs(value: string) {
  return new Date(value).getTime();
}

export function yFor(ms: number, dayStartMs: number) {
  return ((ms - dayStartMs) / 3_600_000 - START_HOUR) * HOUR_PX;
}

export function timeChip(booking: Booking) {
  const options = { timeZone: 'Asia/Yangon', hour: 'numeric', minute: '2-digit' } as const;
  return `${new Date(booking.startsAt).toLocaleTimeString(getLocale(), options)} - ${new Date(booking.endsAt).toLocaleTimeString(getLocale(), options)}`;
}

export function layoutDay(items: Booking[]) {
  const sorted = [...items].sort((a, b) => toMs(a.startsAt) - toMs(b.startsAt));
  const columns: Booking[][] = [];
  const placed = new Map<string, number>();

  for (const booking of sorted) {
    let index = columns.findIndex(
      (column) => toMs(column[column.length - 1].endsAt) <= toMs(booking.startsAt),
    );
    if (index < 0) {
      index = columns.length;
      columns.push([]);
    }
    columns[index].push(booking);
    placed.set(booking.id, index);
  }

  return { columns: Math.max(1, columns.length), placed };
}

export function filterBookings(
  bookings: Booking[],
  courtId: string,
  status: string,
  query: string,
) {
  const normalizedQuery = query.trim().toLowerCase();
  return bookings
    .filter(
      (booking) =>
        (!courtId || booking.court.id === courtId) &&
        (!status || booking.status === status) &&
        (!normalizedQuery ||
          booking.player.email.toLowerCase().includes(normalizedQuery) ||
          (booking.team?.name ?? '').toLowerCase().includes(normalizedQuery)),
    )
    .sort((a, b) => a.startsAt.localeCompare(b.startsAt));
}