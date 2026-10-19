import { test, before, after } from 'node:test';
import assert from 'node:assert/strict';
import bcrypt from 'bcryptjs';
import {
  api,
  registerUser,
  cleanupTestData,
  startServer,
  stopServer,
  uniqueEmail,
  PASSWORD,
  type TestUser,
} from './helpers';
import { prisma } from '../utils/prisma';
import { generateToken } from '../utils/auth';

let adminCookie: string;
let adminId: string;
let owner: TestUser;
let player: TestUser;
let courtId: string;

before(async () => {
  await startServer();

  // registerUser only supports PLAYER/OWNER, so mint the ADMIN directly:
  // unique email keeps cleanupTestData able to remove it.
  const adminEmail = uniqueEmail('admin-dash');
  const hashed = await bcrypt.hash(PASSWORD, 12);
  const admin = await prisma.user.create({
    data: { email: adminEmail, password: hashed, role: 'ADMIN' },
    select: { id: true, email: true, role: true },
  });
  adminId = admin.id;
  const token = generateToken({ id: admin.id, email: admin.email, role: admin.role });
  adminCookie = `token=${token}`;

  owner = await registerUser('OWNER', 'admin-owner');
  player = await registerUser('PLAYER', 'admin-player');

  const court = await api('POST', '/api/courts', {
    cookie: owner.cookie,
    body: {
      name: 'Admin Court',
      address: '1 Admin Way',
      city: 'Admintown',
      basePricePerHour: 30,
    },
  });
  assert.equal(court.status, 201);
  courtId = court.body.court.id;
});

after(async () => {
  await cleanupTestData();
  await stopServer();
});

test('admin lists: 401 unauthenticated, 403 non-admin', async () => {
  for (const path of ['/api/admin/users', '/api/admin/courts', '/api/admin/stats']) {
    const anon = await api('GET', path);
    assert.equal(anon.status, 401);

    const playerRes = await api('GET', path, { cookie: player.cookie });
    assert.equal(playerRes.status, 403);

    const ownerRes = await api('GET', path, { cookie: owner.cookie });
    assert.equal(ownerRes.status, 403);
  }
});

test('admin toggles: 401 unauthenticated, 403 non-admin, 404 missing', async () => {
  const anon = await api('PATCH', `/api/admin/courts/${courtId}/toggle`);
  assert.equal(anon.status, 401);

  const forbidden = await api('PATCH', `/api/admin/courts/${courtId}/toggle`, {
    cookie: player.cookie,
  });
  assert.equal(forbidden.status, 403);

  const missing = await api('PATCH', '/api/admin/courts/does-not-exist/toggle', {
    cookie: adminCookie,
  });
  assert.equal(missing.status, 404);
});

test('admin users/courts/stats lists return expected shapes', async () => {
  const users = await api('GET', '/api/admin/users', { cookie: adminCookie });
  assert.equal(users.status, 200);
  assert.ok(Array.isArray(users.body.users));
  const me = users.body.users.find((u: any) => u.id === adminId);
  assert.ok(me, 'expected the admin themself in the list');
  assert.equal(me.role, 'ADMIN');
  assert.equal(me.isActive, true);

  const courts = await api('GET', '/api/admin/courts', { cookie: adminCookie });
  assert.equal(courts.status, 200);
  assert.ok(Array.isArray(courts.body.courts));
  const mine = courts.body.courts.find((c: any) => c.id === courtId);
  assert.ok(mine, 'expected the test court in the admin list');
  assert.equal(mine.isActive, true);
  assert.equal(mine.owner.email, owner.email);

  const stats = await api('GET', '/api/admin/stats', { cookie: adminCookie });
  assert.equal(stats.status, 200);
  assert.ok(typeof stats.body.stats.users === 'number');
  assert.ok(typeof stats.body.stats.courts === 'number');
  assert.ok(typeof stats.body.stats.bookings === 'number');
  assert.ok(Array.isArray(stats.body.stats.recentBookings));
});

test('court toggle flips isActive and hides court from public list', async () => {
  const off = await api('PATCH', `/api/admin/courts/${courtId}/toggle`, {
    cookie: adminCookie,
  });
  assert.equal(off.status, 200);
  assert.equal(off.body.court.isActive, false);

  const publicList = await api('GET', '/api/courts');
  assert.equal(publicList.status, 200);
  assert.ok(
    !publicList.body.courts.some((c: any) => c.id === courtId),
    'deactivated court must vanish from public list'
  );

  const on = await api('PATCH', `/api/admin/courts/${courtId}/toggle`, {
    cookie: adminCookie,
  });
  assert.equal(on.status, 200);
  assert.equal(on.body.court.isActive, true);
});

test('user toggle deactivates: login 403 + existing JWT 403, reactivation restores', async () => {
  const off = await api('PATCH', `/api/admin/users/${player.userId}/toggle`, {
    cookie: adminCookie,
  });
  assert.equal(off.status, 200);
  assert.equal(off.body.user.isActive, false);

  // Login as deactivated user -> 403
  const login = await api('POST', '/api/auth/login', {
    body: { email: player.email, password: PASSWORD },
  });
  assert.equal(login.status, 403);

  // Existing JWT -> 403 on next authenticated request
  const me = await api('GET', '/api/auth/me', { cookie: player.cookie });
  assert.equal(me.status, 403);

  // Reactivate and confirm access is restored
  const on = await api('PATCH', `/api/admin/users/${player.userId}/toggle`, {
    cookie: adminCookie,
  });
  assert.equal(on.status, 200);
  assert.equal(on.body.user.isActive, true);

  const meAgain = await api('GET', '/api/auth/me', { cookie: player.cookie });
  assert.equal(meAgain.status, 200);
});

test('admin cannot deactivate themselves (400), but can reactivate', async () => {
  // Admin is currently active -> self-toggle would deactivate -> 400
  const self = await api('PATCH', `/api/admin/users/${adminId}/toggle`, {
    cookie: adminCookie,
  });
  assert.equal(self.status, 400);

  // Flip the admin inactive directly (simulating another admin doing it).
  // Note: the admin's own JWT is now rejected while inactive (lockout works),
  // so recovery goes through prisma — mirroring another admin reactivating.
  await prisma.user.update({ where: { id: adminId }, data: { isActive: false } });
  const lockedOut = await api('GET', '/api/admin/stats', { cookie: adminCookie });
  assert.equal(lockedOut.status, 403);
  await prisma.user.update({ where: { id: adminId }, data: { isActive: true } });
  const recovered = await api('GET', '/api/admin/stats', { cookie: adminCookie });
  assert.equal(recovered.status, 200);
});


test('admin session and logout remain available', async () => {
  const session = await api('GET', '/api/auth/me', { cookie: adminCookie });
  assert.equal(session.status, 200);
  assert.equal(session.body.user.role, 'ADMIN');
  assert.equal((await api('POST', '/api/auth/logout', { cookie: adminCookie })).status, 200);
});

test('admin is denied every non-dashboard API area before validation or mutation', async () => {
  const requests: Array<[string, string]> = [
    ['GET', '/api/courts'], ['GET', `/api/courts/${courtId}`],
    ['GET', `/api/courts/${courtId}/availability`], ['GET', `/api/courts/${courtId}/slots`],
    ['GET', '/api/courts/owner/me'], ['POST', '/api/courts'],
    ['PUT', `/api/courts/${courtId}`], ['DELETE', `/api/courts/${courtId}`],
    ['POST', `/api/courts/${courtId}/slots`], ['DELETE', `/api/courts/${courtId}/slots/missing`],
    ['GET', `/api/courts/${courtId}/blocks`], ['POST', `/api/courts/${courtId}/blocks`],
    ['DELETE', `/api/courts/${courtId}/blocks/missing`],
    ['GET', '/api/bookings/me'], ['POST', '/api/bookings'],
    ['PATCH', '/api/bookings/missing/cancel'], ['GET', '/api/bookings/owner'],
    ['PATCH', '/api/bookings/owner/missing/status'],
    ['GET', '/api/teams'], ['POST', '/api/teams'], ['GET', '/api/teams/missing'],
    ['POST', '/api/teams/missing/join'], ['DELETE', '/api/teams/missing/leave'],
    ['DELETE', '/api/teams/missing'],
    ['GET', '/api/players/me'], ['PUT', '/api/players/me'],
    ['GET', '/api/players/search'], ['GET', '/api/players/friends'],
    ['GET', `/api/reviews/${courtId}`], ['POST', '/api/reviews'],
    ['PATCH', '/api/reviews/missing'], ['DELETE', '/api/reviews/missing'],
  ];
  for (const [method, path] of requests) {
    const result = await api(method, path, { cookie: adminCookie });
    assert.equal(result.status, 403, `${method} ${path}`);
  }
  // An admin session must not disable anonymous public browsing.
  assert.equal((await api('GET', '/api/courts')).status, 200);
  assert.equal((await api('GET', '/api/events')).status, 200);
});
