import { test, before, after } from 'node:test';
import assert from 'node:assert/strict';
import {
  api,
  registerUser,
  cleanupTestData,
  startServer,
  stopServer,
  PASSWORD,
  uniqueEmail,
} from './helpers';

before(async () => {
  await startServer();
});

after(async () => {
  await cleanupTestData();
  await stopServer();
});

async function register(role: 'PLAYER' | 'OWNER', name: string) {
  return registerUser(role, name);
}

async function cookieOf(role: 'PLAYER' | 'OWNER', name: string) {
  const user = await register(role, name);
  return { userId: user.userId, email: user.email };
}

test('courts/suggest: empty q returns empty items', async () => {
  const res = await api('GET', '/api/courts/suggest?q=');
  assert.equal(res.status, 200);
  assert.equal(res.body.success, true);
  assert.deepEqual(res.body.items, []);
});

test('courts/suggest: matches by city (case-insensitive)', async () => {
  const owner = await register('OWNER', 'suggest-court-owner');
  await api('POST', '/api/courts', {
    userId: owner.userId,
    body: {
      name: 'Yangon United Court',
      address: '123 Aung San St',
      city: 'Yangon',
      sportType: 'FUTSAL',
      basePricePerHour: 5000,
    },
  });

  const res = await api('GET', '/api/courts/suggest?q=yangon');
  assert.equal(res.status, 200);
  assert.equal(res.body.success, true);
  assert.ok(res.body.items.length > 0);
  assert.ok(res.body.items.some((c: any) => c.city === 'Yangon'));
  assert.ok(res.body.items.length <= 8);
});

test('courts/suggest: matches by name (case-insensitive)', async () => {
  const owner = await register('OWNER', 'suggest-court-owner-2');
  await api('POST', '/api/courts', {
    userId: owner.userId,
    body: {
      name: 'Mandalay Strikers Arena',
      address: '456 78th St',
      city: 'Mandalay',
      sportType: 'ELEVEN_A_SIDE',
      basePricePerHour: 7000,
    },
  });

  const res = await api('GET', '/api/courts/suggest?q=strikers');
  assert.equal(res.status, 200);
  assert.equal(res.body.success, true);
  assert.ok(res.body.items.some((c: any) => c.name === 'Mandalay Strikers Arena'));
});

test('events/suggest: empty q returns empty items', async () => {
  const res = await api('GET', '/api/events/suggest?q=');
  assert.equal(res.status, 200);
  assert.equal(res.body.success, true);
  assert.deepEqual(res.body.items, []);
});

test('events/suggest: matches by title and city', async () => {
  const owner = await register('OWNER', 'suggest-event-owner');
  const court = await api('POST', '/api/courts', {
    userId: owner.userId,
    body: {
      name: 'Suggest Event Court',
      address: '1 Event St',
      city: 'Yangon',
      sportType: 'FUTSAL',
      basePricePerHour: 5000,
    },
  });
  assert.equal(court.status, 201);
  const courtId: string = court.body.court.id;

  const eventRes = await api('POST', '/api/events', {
    userId: owner.userId,
    body: {
      courtId,
      title: 'Summer Futsal Tournament',
      type: 'TOURNAMENT',
      description: 'Annual summer cup',
      startDate: '2026-11-01T09:00:00Z',
      endDate: '2026-11-01T17:00:00Z',
    },
  });
  assert.equal(eventRes.status, 201);

  const res = await api('GET', '/api/events/suggest?q=tournament');
  assert.equal(res.status, 200);
  assert.equal(res.body.success, true);
  assert.ok(res.body.items.some((e: any) => e.title === 'Summer Futsal Tournament'));
});

test('players/suggest: requires authentication (no cookie => 401)', async () => {
  const res = await api('GET', '/api/players/suggest?q=test');
  assert.equal(res.status, 401);
});

test('players/suggest: requires PLAYER role (OWNER => 403)', async () => {
  const owner = await register('OWNER', 'suggest-player-owner');
  const res = await api('GET', '/api/players/suggest?q=test', {
    userId: owner.userId,
  });
  assert.equal(res.status, 403);
});

test('players/suggest: matches by email, excludes self, limit 8', async () => {
  const me = await register('PLAYER', 'suggest-player-me');
  await register('PLAYER', 'suggest-player-extra');
  await register('PLAYER', 'suggest-player-extra2');
  await register('PLAYER', 'suggest-player-extra3');
  await register('PLAYER', 'suggest-player-extra4');
  await register('PLAYER', 'suggest-player-extra5');
  await register('PLAYER', 'suggest-player-extra6');
  await register('PLAYER', 'suggest-player-extra7');
  await register('PLAYER', 'suggest-player-extra8');

  const res = await api('GET', '/api/players/suggest?q=extra', {
    userId: me.userId,
  });
  assert.equal(res.status, 200);
  assert.equal(res.body.success, true);
  assert.ok(res.body.items.length >= 0);
  assert.ok(res.body.items.length <= 8);
  assert.ok(
    !res.body.items.some((u: any) => u.id === me.userId),
    'self should be excluded'
  );
  for (const u of res.body.items) {
    assert.equal(u.role, 'PLAYER');
    assert.equal(u.isActive, true);
  }
});

test('players/suggest: empty q returns empty items', async () => {
  const me = await register('PLAYER', 'suggest-player-empty');
  const res = await api('GET', '/api/players/suggest?q=', {
    userId: me.userId,
  });
  assert.equal(res.status, 200);
  assert.equal(res.body.success, true);
  assert.deepEqual(res.body.items, []);
});