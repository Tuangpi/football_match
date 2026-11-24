import assert from 'node:assert/strict';
import { test } from 'node:test';
import {
  filterBookings,
  layoutDay,
  type Booking,
} from '../src/lib/ownerBookingSchedule';

const booking = (
  id: string,
  startsAt: string,
  endsAt: string,
  status: Booking['status'] = 'PENDING',
  courtId = 'court-1',
  email = 'player@example.com',
  teamName: string | null = null,
): Booking => ({
  id,
  startsAt,
  endsAt,
  status,
  totalPrice: 40_000,
  court: { id: courtId, name: `Court ${courtId}` },
  player: { id: `player-${id}`, email },
  team: teamName ? { id: `team-${id}`, name: teamName } : null,
});

test('layoutDay gives overlapping bookings separate columns and reuses free columns', () => {
  const first = booking('first', '2026-11-25T10:00:00+06:30', '2026-11-25T12:00:00+06:30');
  const overlap = booking('overlap', '2026-11-25T11:00:00+06:30', '2026-11-25T13:00:00+06:30');
  const adjacent = booking('adjacent', '2026-11-25T12:00:00+06:30', '2026-11-25T14:00:00+06:30');

  const layout = layoutDay([overlap, adjacent, first]);

  assert.equal(layout.columns, 2);
  assert.equal(layout.placed.get(first.id), 0);
  assert.equal(layout.placed.get(overlap.id), 1);
  assert.equal(layout.placed.get(adjacent.id), 0);
});

test('filterBookings combines court, status, player, and team filters with chronological ordering', () => {
  const early = booking(
    'early',
    '2026-11-25T09:00:00+06:30',
    '2026-11-25T10:00:00+06:30',
    'CONFIRMED',
    'court-1',
    'captain@example.com',
    'Yangon FC',
  );
  const late = booking(
    'late',
    '2026-11-25T14:00:00+06:30',
    '2026-11-25T15:00:00+06:30',
    'CONFIRMED',
    'court-1',
    'captain@example.com',
    'Yangon FC',
  );
  const other = booking(
    'other',
    '2026-11-25T11:00:00+06:30',
    '2026-11-25T12:00:00+06:30',
    'PENDING',
    'court-2',
    'other@example.com',
    'Mandalay FC',
  );

  assert.deepEqual(
    filterBookings([late, other, early], 'court-1', 'CONFIRMED', 'yangon').map(({ id }) => id),
    ['early', 'late'],
  );
  assert.deepEqual(
    filterBookings([late, other, early], '', '', 'OTHER@EXAMPLE.COM').map(({ id }) => id),
    ['other'],
  );
  assert.deepEqual(
    filterBookings([late, other, early], '', '', 'mandalay fc').map(({ id }) => id),
    ['other'],
  );
});