import { test, before, after } from 'node:test';
import assert from 'node:assert/strict';
import {
  api,
  registerUser,
  cleanupTestData,
  startServer,
  stopServer,
  type TestUser,
} from './helpers';

let owner: TestUser;
let player: TestUser;
let other: TestUser;
let courtId: string;
let slotId: string;

// Slot one week out, ISO datetime as the API requires.
const SLOT_DATE = new Date(Date.now() + 7 * 24 * 60 * 60 * 1000).toISOString();

before(async () => {
  await startServer();
  owner = await registerUser('OWNER', 'bk-owner');
  player = await registerUser('PLAYER', 'bk-player');
  other = await registerUser('PLAYER', 'bk-other');

  const court = await api('POST', '/api/courts', {
    cookie: owner.cookie,
    body: {
      name: 'Test Court',
      address: '1 Test St',
      city: 'Testville',
      basePricePerHour: 40,
    },
  });
  assert.equal(court.status, 201);
  courtId = court.body.court.id;

  const slot = await api('POST', `/api/courts/${courtId}/slots`, {
    cookie: owner.cookie,
    body: { date: SLOT_DATE, startTime: '18:00', endTime: '19:00', pricePerHour: 45 },
  });
  assert.equal(slot.status, 201);
  slotId = slot.body.slot.id;
});

after(async () => {
  await cleanupTestData();
  await stopServer();
});

test('unauthenticated booking returns 401', async () => {
  const res = await api('POST', '/api/bookings', { body: { courtSlotId: slotId } });
  assert.equal(res.status, 401);
});

test('player books an available slot -> PENDING, slot flipped to unavailable', async () => {
  const res = await api('POST', '/api/bookings', {
    cookie: player.cookie,
    body: { courtSlotId: slotId },
  });
  assert.equal(res.status, 201);
  assert.equal(res.body.booking.status, 'PENDING');
  assert.equal(res.body.booking.totalPrice, 45); // slot price overrides base
  assert.equal(res.body.booking.playerId, player.userId);

  const slots = await api('GET', `/api/courts/${courtId}/slots`);
  const booked = slots.body.slots.find((s: any) => s.id === slotId);
  assert.equal(booked.isAvailable, false);
});

test('double-booking guard: second booking on the same slot returns 400', async () => {
  // The slot was flipped isAvailable=false by the first booking, so the
  // availability check fires first; either way the second booking is refused.
  const res = await api('POST', '/api/bookings', {
    cookie: other.cookie,
    body: { courtSlotId: slotId },
  });
  assert.equal(res.status, 400);
  assert.ok(
    ['Slot is not available', 'Slot already booked'].includes(res.body.message),
    `unexpected message: ${res.body.message}`
  );
});

test('non-owner cannot cancel someone else\'s booking (403)', async () => {
  const mine = await api('GET', '/api/bookings/me', { cookie: player.cookie });
  const bookingId = mine.body.bookings[0].id;

  const res = await api('PATCH', `/api/bookings/${bookingId}/cancel`, {
    cookie: other.cookie,
  });
  assert.equal(res.status, 403);
});

test('player cancels -> CANCELLED and slot freed; slot bookable again', async () => {
  const mine = await api('GET', '/api/bookings/me', { cookie: player.cookie });
  const bookingId = mine.body.bookings[0].id;

  const cancel = await api('PATCH', `/api/bookings/${bookingId}/cancel`, {
    cookie: player.cookie,
  });
  assert.equal(cancel.status, 200);
  assert.equal(cancel.body.booking.status, 'CANCELLED');

  const slots = await api('GET', `/api/courts/${courtId}/slots`);
  const freed = slots.body.slots.find((s: any) => s.id === slotId);
  assert.equal(freed.isAvailable, true);

  const rebook = await api('POST', '/api/bookings', {
    cookie: other.cookie,
    body: { courtSlotId: slotId },
  });
  assert.equal(rebook.status, 201);
});

test('owner confirms booking; owner list includes it', async () => {
  const ownerList = await api('GET', '/api/bookings/owner', { cookie: owner.cookie });
  assert.equal(ownerList.status, 200);
  const booking = ownerList.body.bookings.find(
    (b: any) => b.courtSlot.id === slotId && b.status === 'PENDING'
  );
  assert.ok(booking, 'owner should see the pending booking');

  const confirm = await api('PATCH', `/api/bookings/owner/${booking.id}/status`, {
    cookie: owner.cookie,
    body: { status: 'CONFIRMED' },
  });
  assert.equal(confirm.status, 200);
  assert.equal(confirm.body.booking.status, 'CONFIRMED');
});

test('booking with a teamId the user is not a member of returns 403', async () => {
  // player creates a team; other is not a member
  const team = await api('POST', '/api/teams', {
    cookie: player.cookie,
    body: { name: 'Guard Test FC' },
  });
  assert.equal(team.status, 201);
  const teamId = team.body.team.id;

  // fresh slot so availability isn't the failing condition
  const slot = await api('POST', `/api/courts/${courtId}/slots`, {
    cookie: owner.cookie,
    body: { date: SLOT_DATE, startTime: '20:00', endTime: '21:00' },
  });
  assert.equal(slot.status, 201);

  const res = await api('POST', '/api/bookings', {
    cookie: other.cookie,
    body: { courtSlotId: slot.body.slot.id, teamId },
  });
  assert.equal(res.status, 403);
  assert.equal(res.body.message, 'You are not a member of this team');
});

test('member books with teamId -> booking carries the team', async () => {
  const team = await api('POST', '/api/teams', {
    cookie: player.cookie,
    body: { name: 'Carry Test FC' },
  });
  const teamId = team.body.team.id;
  await api('POST', `/api/teams/${teamId}/join`, { cookie: other.cookie });

  const slot = await api('POST', `/api/courts/${courtId}/slots`, {
    cookie: owner.cookie,
    body: { date: SLOT_DATE, startTime: '21:00', endTime: '22:00' },
  });

  const res = await api('POST', '/api/bookings', {
    cookie: other.cookie,
    body: { courtSlotId: slot.body.slot.id, teamId },
  });
  assert.equal(res.status, 201);
  assert.equal(res.body.booking.teamId, teamId);
  assert.equal(res.body.booking.team.name, 'Carry Test FC');
});

test('booking a non-existent slot returns 404', async () => {
  const res = await api('POST', '/api/bookings', {
    cookie: player.cookie,
    body: { courtSlotId: 'no-such-slot' },
  });
  assert.equal(res.status, 404);
  assert.equal(res.body.message, 'Court slot not found');
});
