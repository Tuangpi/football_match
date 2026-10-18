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

before(async () => {
  await startServer();
  owner = await registerUser('OWNER', 't1-owner');
  player = await registerUser('PLAYER', 't1-player');
  other = await registerUser('PLAYER', 't1-other');

  const court = await api('POST', '/api/courts', {
    cookie: owner.cookie,
    body: {
      name: 'Tier1 Court',
      address: '1 Tier St',
      city: 'Endpointville',
      basePricePerHour: 40,
    },
  });
  assert.equal(court.status, 201);
  courtId = court.body.court.id;
});

after(async () => {
  await cleanupTestData();
  await stopServer();
});

// --- avatarUrl on PUT /players/me ---

test('avatar: PUT /players/me accepts a valid avatarUrl', async () => {
  const res = await api('PUT', '/api/players/me', {
    cookie: player.cookie,
    body: { avatarUrl: 'https://example.com/avatar.png' },
  });
  assert.equal(res.status, 200);
  assert.equal(res.body.profile.avatarUrl, 'https://example.com/avatar.png');
});

test('avatar: invalid avatarUrl returns 400 validation error', async () => {
  const res = await api('PUT', '/api/players/me', {
    cookie: player.cookie,
    body: { avatarUrl: 'not-a-url' },
  });
  assert.equal(res.status, 400);
  assert.equal(res.body.message, 'Validation error');
});

test('avatar: null clears avatarUrl', async () => {
  const res = await api('PUT', '/api/players/me', {
    cookie: player.cookie,
    body: { avatarUrl: null },
  });
  assert.equal(res.status, 200);
  assert.equal(res.body.profile.avatarUrl, null);
});

// --- review update / delete ---

async function createPlayerReview(): Promise<string> {
  const res = await api('POST', '/api/reviews', {
    cookie: player.cookie,
    body: { courtId, rating: 3, comment: 'original comment' },
  });
  assert.equal(res.status, 201);
  return res.body.review.id;
}

test('author updates their review -> 200 with new rating and comment', async () => {
  const id = await createPlayerReview();
  const res = await api('PATCH', `/api/reviews/${id}`, {
    cookie: player.cookie,
    body: { rating: 5, comment: 'updated comment' },
  });
  assert.equal(res.status, 200);
  assert.equal(res.body.review.rating, 5);
  assert.equal(res.body.review.comment, 'updated comment');
});

test('PATCH review with no fields returns 400', async () => {
  const list = await api('GET', `/api/reviews/${courtId}`);
  const id = list.body.reviews.find((r: any) => r.userId === player.userId).id;
  const res = await api('PATCH', `/api/reviews/${id}`, {
    cookie: player.cookie,
    body: {},
  });
  assert.equal(res.status, 400);
  assert.equal(res.body.message, 'Provide rating and/or comment to update');
});

test("updating someone else's review returns 403", async () => {
  const list = await api('GET', `/api/reviews/${courtId}`);
  const id = list.body.reviews.find((r: any) => r.userId === player.userId).id;
  const res = await api('PATCH', `/api/reviews/${id}`, {
    cookie: other.cookie,
    body: { rating: 1 },
  });
  assert.equal(res.status, 403);
});

test('PATCH on a non-existent review returns 404', async () => {
  const res = await api('PATCH', '/api/reviews/no-such-review', {
    cookie: player.cookie,
    body: { rating: 2 },
  });
  assert.equal(res.status, 404);
});

test('author deletes their review -> 200 and it is gone', async () => {
  const list = await api('GET', `/api/reviews/${courtId}`);
  const id = list.body.reviews.find((r: any) => r.userId === player.userId).id;

  const del = await api('DELETE', `/api/reviews/${id}`, { cookie: player.cookie });
  assert.equal(del.status, 200);

  const afterList = await api('GET', `/api/reviews/${courtId}`);
  const gone = afterList.body.reviews.find((r: any) => r.id === id);
  assert.equal(gone, undefined);
});

test("deleting someone else's review returns 403", async () => {
  const id = await createPlayerReview();
  const res = await api('DELETE', `/api/reviews/${id}`, { cookie: other.cookie });
  assert.equal(res.status, 403);
  // author cleans up for later tests
  await api('DELETE', `/api/reviews/${id}`, { cookie: player.cookie });
});

// --- slot delete ---

async function createSlot(startTime = '18:00'): Promise<string> {
  const res = await api('POST', `/api/courts/${courtId}/slots`, {
    cookie: owner.cookie,
    body: {
      date: new Date().toISOString(),
      startTime,
      endTime: `${parseInt(startTime, 10) + 1}:00`,
    },
  });
  assert.equal(res.status, 201);
  return res.body.slot.id;
}

test('owner deletes a free slot -> 200 and slot is gone', async () => {
  const slotId = await createSlot('18:00');
  const res = await api('DELETE', `/api/courts/${courtId}/slots/${slotId}`, {
    cookie: owner.cookie,
  });
  assert.equal(res.status, 200);

  const detail = await api('GET', `/api/courts/${courtId}`);
  assert.equal(detail.body.court.slots.find((s: any) => s.id === slotId), undefined);
});

test('non-owner cannot delete a slot -> 403', async () => {
  const slotId = await createSlot('18:00');
  const res = await api('DELETE', `/api/courts/${courtId}/slots/${slotId}`, {
    cookie: player.cookie,
  });
  assert.equal(res.status, 403);
});

test('slot with an active booking cannot be deleted -> 400', async () => {
  const slotId = await createSlot('18:00');
  const booking = await api('POST', '/api/bookings', {
    cookie: other.cookie,
    body: { courtSlotId: slotId },
  });
  assert.equal(booking.status, 201);

  const res = await api('DELETE', `/api/courts/${courtId}/slots/${slotId}`, {
    cookie: owner.cookie,
  });
  assert.equal(res.status, 400);
  assert.equal(res.body.message, 'Cannot delete a slot with active bookings');

  // free the slot again (cancel) so cleanup can proceed
  await api('PATCH', `/api/bookings/${booking.body.booking.id}/cancel`, {
    cookie: other.cookie,
  });
});

test('slot becomes deletable after its booking is cancelled', async () => {
  const slotId = await createSlot('18:00');
  const booking = await api('POST', '/api/bookings', {
    cookie: other.cookie,
    body: { courtSlotId: slotId },
  });
  assert.equal(booking.status, 201);
  await api('PATCH', `/api/bookings/${booking.body.booking.id}/cancel`, {
    cookie: other.cookie,
  });

  const res = await api('DELETE', `/api/courts/${courtId}/slots/${slotId}`, {
    cookie: owner.cookie,
  });
  assert.equal(res.status, 200);
});

test('delete on a non-existent slot returns 404', async () => {
  const res = await api('DELETE', `/api/courts/${courtId}/slots/no-such-slot`, {
    cookie: owner.cookie,
  });
  assert.equal(res.status, 404);
});

// --- team delete / leave ---

test('captain deletes their team -> 200 and bookings are detached', async () => {
  const create = await api('POST', '/api/teams', {
    cookie: player.cookie,
    body: { name: `T014 Squad ${Date.now()}` },
  });
  assert.equal(create.status, 201);
  const teamId = create.body.team.id;

  // attach a booking to the team (member books with teamId)
  const slotRes = await api('POST', `/api/courts/${courtId}/slots`, {
    cookie: owner.cookie,
    body: { date: new Date().toISOString(), startTime: '20:00', endTime: '21:00' },
  });
  const slotId = slotRes.body.slot.id;
  const booking = await api('POST', '/api/bookings', {
    cookie: player.cookie,
    body: { courtSlotId: slotId, teamId },
  });
  assert.equal(booking.status, 201);

  const res = await api('DELETE', `/api/teams/${teamId}`, { cookie: player.cookie });
  assert.equal(res.status, 200);

  // team is gone
  const detail = await api('GET', `/api/teams/${teamId}`, { cookie: player.cookie });
  assert.equal(detail.status, 404);

  // booking still exists but no longer references the team
  const bookings = await api('GET', '/api/bookings/me', { cookie: player.cookie });
  const kept = bookings.body.bookings.find((b: any) => b.id === booking.body.booking.id);
  assert.ok(kept, 'booking should survive team deletion');
  assert.equal(kept.teamId, null);

  // free the slot for cleanup
  await api('PATCH', `/api/bookings/${booking.body.booking.id}/cancel`, {
    cookie: player.cookie,
  });
});

test('non-captain cannot delete a team -> 403', async () => {
  const create = await api('POST', '/api/teams', {
    cookie: player.cookie,
    body: { name: `T014 Guard ${Date.now()}` },
  });
  const teamId = create.body.team.id;

  const res = await api('DELETE', `/api/teams/${teamId}`, { cookie: other.cookie });
  assert.equal(res.status, 403);

  await api('DELETE', `/api/teams/${teamId}`, { cookie: player.cookie });
});

test('DELETE /teams/:id on a non-existent team returns 404', async () => {
  const res = await api('DELETE', '/api/teams/no-such-team', { cookie: player.cookie });
  assert.equal(res.status, 404);
});

test('member leaves a team; captain cannot leave (must delete instead)', async () => {
  const create = await api('POST', '/api/teams', {
    cookie: player.cookie,
    body: { name: `T014 Leave ${Date.now()}` },
  });
  const teamId = create.body.team.id;

  const join = await api('POST', `/api/teams/${teamId}/join`, { cookie: other.cookie });
  assert.equal(join.status, 200);

  const leave = await api('DELETE', `/api/teams/${teamId}/leave`, { cookie: other.cookie });
  assert.equal(leave.status, 200);

  const captainLeave = await api('DELETE', `/api/teams/${teamId}/leave`, {
    cookie: player.cookie,
  });
  assert.equal(captainLeave.status, 400);

  await api('DELETE', `/api/teams/${teamId}`, { cookie: player.cookie });
});