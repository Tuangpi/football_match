import { test, before, after } from 'node:test';
import assert from 'node:assert/strict';
import { prisma } from '../utils/prisma';
import { generateToken } from '../utils/auth';
import {
  api,
  registerUser,
  cleanupTestData,
  startServer,
  stopServer,
  type TestUser,
} from './helpers';

let owner: TestUser;
let otherOwner: TestUser;
let player: TestUser;
let courtId: string;
let otherCourtId: string;
let upcomingId: string;
let pastId: string;
let adminCookie: string;

const hoursFromNow = (hours: number) =>
  new Date(Date.now() + hours * 3_600_000).toISOString();

async function createCourt(cookie: string | null, name: string, city: string) {
  const res = await api('POST', '/api/courts', {
    cookie,
    body: { name, address: `1 ${name} St`, city, basePricePerHour: 40 },
  });
  assert.equal(res.status, 201);
  return res.body.court.id as string;
}

async function createEvent(cookie: string | null, body: Record<string, unknown>) {
  return api('POST', '/api/events', { cookie, body });
}

before(async () => {
  await startServer();
  owner = await registerUser('OWNER', 'ev-owner');
  otherOwner = await registerUser('OWNER', 'ev-other-owner');
  player = await registerUser('PLAYER', 'ev-player');
  const admin = await registerUser('OWNER', 'ev-admin');
  await prisma.user.update({ where: { id: admin.userId }, data: { role: 'ADMIN' } });
  adminCookie = `token=${generateToken({ id: admin.userId, email: admin.email, role: 'ADMIN' })}`;

  courtId = await createCourt(owner.cookie, 'Event Arena', 'Eventville');
  otherCourtId = await createCourt(otherOwner.cookie, 'Other Arena', 'Elsewhere');

  const upcoming = await createEvent(owner.cookie, {
    courtId,
    title: 'Weekend Cup',
    type: 'TOURNAMENT',
    description: 'A weekend tournament',
    startDate: hoursFromNow(48),
    endDate: hoursFromNow(52),
  });
  assert.equal(upcoming.status, 201);
  upcomingId = upcoming.body.event.id;

  const past = await createEvent(owner.cookie, {
    courtId,
    title: 'Past Promo',
    type: 'DISCOUNT',
    startDate: hoursFromNow(-240),
    endDate: hoursFromNow(-236),
  });
  assert.equal(past.status, 201);
  pastId = past.body.event.id;

  const other = await createEvent(otherOwner.cookie, {
    courtId: otherCourtId,
    title: 'Elsewhere League',
    type: 'COMPETITION',
    startDate: hoursFromNow(72),
    endDate: hoursFromNow(76),
  });
  assert.equal(other.status, 201);
});

after(async () => {
  await cleanupTestData();
  await stopServer();
});

test('events list: public, includes court, ordered by startDate', async () => {
  const res = await api('GET', '/api/events');
  assert.equal(res.status, 200);
  assert.ok(Array.isArray(res.body.events));

  const titles = res.body.events.map((e: any) => e.title);
  assert.ok(titles.includes('Weekend Cup'));
  assert.ok(titles.includes('Past Promo'));

  const mine = res.body.events.filter((e: any) =>
    ['Weekend Cup', 'Past Promo', 'Elsewhere League'].includes(e.title)
  );
  assert.equal(mine.length, 3);
  for (let i = 1; i < mine.length; i++) {
    assert.ok(
      +new Date(mine[i - 1].startDate) <= +new Date(mine[i].startDate),
      'expected ascending startDate order'
    );
  }
  const cup = mine.find((e: any) => e.title === 'Weekend Cup');
  assert.deepEqual(cup.court, { id: courtId, name: 'Event Arena', city: 'Eventville' });
});

test('events list: type, city and when filters', async () => {
  const byType = await api('GET', '/api/events?type=TOURNAMENT');
  assert.equal(byType.status, 200);
  assert.ok(byType.body.events.length >= 1);
  assert.ok(byType.body.events.every((e: any) => e.type === 'TOURNAMENT'));

  const byCity = await api('GET', '/api/events?city=eventVILLE');
  assert.equal(byCity.status, 200);
  assert.ok(byCity.body.events.length >= 2);
  assert.ok(byCity.body.events.every((e: any) => e.court.city === 'Eventville'));

  // Scope by city so unrelated seed events cannot affect these assertions.
  const upcoming = await api('GET', '/api/events?when=upcoming&city=Eventville');
  assert.equal(upcoming.status, 200);
  const upcomingTitles = upcoming.body.events.map((e: any) => e.title);
  assert.ok(upcomingTitles.includes('Weekend Cup'));
  assert.ok(!upcomingTitles.includes('Past Promo'));

  const past = await api('GET', '/api/events?when=past&city=Eventville');
  assert.equal(past.status, 200);
  const pastTitles = past.body.events.map((e: any) => e.title);
  assert.ok(pastTitles.includes('Past Promo'));
  assert.ok(!pastTitles.includes('Weekend Cup'));
  assert.equal(past.body.events[0].title, 'Past Promo', 'past is newest first');
});

test('owner events: authenticated, role-gated and scoped to court ownership', async () => {
  for (const path of ['/api/events/owner/me', `/api/events/owner/me/${upcomingId}`]) {
    assert.equal((await api('GET', path)).status, 401);
    assert.equal((await api('GET', path, { cookie: player.cookie })).status, 403);
  }
  const mine = await api('GET', '/api/events/owner/me', { cookie: owner.cookie });
  assert.equal(mine.status, 200);
  assert.deepEqual(new Set(mine.body.events.map((e: any) => e.id)), new Set([upcomingId, pastId]));
  const other = await api('GET', `/api/events/owner/me?ownerId=${owner.userId}&courtId=${courtId}`, { cookie: otherOwner.cookie });
  assert.equal(other.status, 200);
  assert.equal(other.body.events.length, 1);
  assert.equal(other.body.events[0].court.id, otherCourtId);
  const detail = await api('GET', `/api/events/owner/me/${upcomingId}`, { cookie: owner.cookie });
  assert.equal(detail.status, 200);
  assert.equal(detail.body.event.court.id, courtId);
  assert.equal((await api('GET', `/api/events/owner/me/${upcomingId}`, { cookie: otherOwner.cookie })).status, 404);
  assert.equal((await api('GET', '/api/events/owner/me/missing', { cookie: owner.cookie })).status, 404);
});

test('admin manages all events and owners see admin-created events on their courts', async () => {
  const created = await createEvent(adminCookie, {
    courtId, title: 'Admin announcement', type: 'PRICE_CHANGE',
    startDate: hoursFromNow(20), endDate: hoursFromNow(21),
  });
  assert.equal(created.status, 201);
  const id = created.body.event.id;
  const mine = await api('GET', '/api/events/owner/me', { cookie: owner.cookie });
  assert.ok(mine.body.events.some((e: any) => e.id === id));
  const all = await api('GET', '/api/events/owner/me', { cookie: adminCookie });
  assert.equal(all.status, 200);
  assert.ok(all.body.events.some((e: any) => e.court.id === courtId));
  assert.ok(all.body.events.some((e: any) => e.court.id === otherCourtId));
  assert.equal((await api('GET', `/api/events/owner/me/${upcomingId}`, { cookie: adminCookie })).status, 200);
  assert.equal((await api('PUT', `/api/events/${upcomingId}`, { cookie: adminCookie, body: { description: 'Admin edited' } })).status, 200);
  assert.equal((await api('DELETE', `/api/events/${id}`, { cookie: adminCookie })).status, 200);
});

test('event detail: 200 with court info, 404 when missing', async () => {
  const res = await api('GET', `/api/events/${upcomingId}`);
  assert.equal(res.status, 200);
  assert.equal(res.body.event.title, 'Weekend Cup');
  assert.equal(res.body.event.court.address, '1 Event Arena St');
  assert.equal(res.body.event.court.sportType, 'FUTSAL');
  assert.equal(res.body.event.court.basePricePerHour, 40);

  const missing = await api('GET', '/api/events/does-not-exist');
  assert.equal(missing.status, 404);
  assert.equal(missing.body.message, 'Event not found');
});

test('create event: rejects endDate before startDate', async () => {
  const res = await createEvent(owner.cookie, {
    courtId,
    title: 'Bad range',
    type: 'TOURNAMENT',
    startDate: hoursFromNow(10),
    endDate: hoursFromNow(5),
  });
  assert.equal(res.status, 400);
  assert.equal(res.body.message, 'Validation error');
  assert.equal(res.body.errors[0].field, 'endDate');
});

test('update event: owner can edit, player and other owner are forbidden', async () => {
  const asPlayer = await api('PUT', `/api/events/${upcomingId}`, {
    cookie: player.cookie,
    body: { title: 'Hijacked' },
  });
  assert.equal(asPlayer.status, 403);

  const asOtherOwner = await api('PUT', `/api/events/${upcomingId}`, {
    cookie: otherOwner.cookie,
    body: { title: 'Hijacked' },
  });
  assert.equal(asOtherOwner.status, 403);

  const badRange = await api('PUT', `/api/events/${upcomingId}`, {
    cookie: owner.cookie,
    body: { startDate: hoursFromNow(10), endDate: hoursFromNow(5) },
  });
  assert.equal(badRange.status, 400);

  for (const body of [{ startDate: hoursFromNow(60) }, { endDate: hoursFromNow(40) }]) {
    const invalid = await api('PUT', `/api/events/${upcomingId}`, { cookie: owner.cookie, body });
    assert.equal(invalid.status, 400, 'partial updates must validate against the stored other date');
  }

  const ok = await api('PUT', `/api/events/${upcomingId}`, {
    cookie: owner.cookie,
    body: { title: 'Weekend Cup (updated)' },
  });
  assert.equal(ok.status, 200);
  assert.equal(ok.body.event.title, 'Weekend Cup (updated)');
  const saved = await api('GET', `/api/events/owner/me/${upcomingId}`, { cookie: owner.cookie });
  assert.equal(saved.body.event.title, 'Weekend Cup (updated)');
});

test('delete event: 401 anonymous, 403 others, owner deletes', async () => {
  const anon = await api('DELETE', `/api/events/${pastId}`);
  assert.equal(anon.status, 401);

  const asPlayer = await api('DELETE', `/api/events/${pastId}`, { cookie: player.cookie });
  assert.equal(asPlayer.status, 403);

  const asOtherOwner = await api('DELETE', `/api/events/${pastId}`, {
    cookie: otherOwner.cookie,
  });
  assert.equal(asOtherOwner.status, 403);

  const ok = await api('DELETE', `/api/events/${pastId}`, { cookie: owner.cookie });
  assert.equal(ok.status, 200);

  const gone = await api('GET', `/api/events/${pastId}`);
  assert.equal(gone.status, 404);
  const mine = await api('GET', '/api/events/owner/me', { cookie: owner.cookie });
  assert.ok(!mine.body.events.some((e: any) => e.id === pastId));
});
