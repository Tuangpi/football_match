import { test, before, after } from 'node:test';
import assert from 'node:assert/strict';
import {
  api, registerUser, cleanupTestData, startServer, stopServer,
  uniqueEmail, RUN_ID, type TestUser,
} from './helpers';
import { prisma } from '../utils/prisma';
import { generateToken } from '../utils/auth';

let player: TestUser;
let other: TestUser;
let owner: TestUser;
let inactive: TestUser;
let adminId: string;
let adminCookie: string;

before(async () => {
  await startServer();
  player = await registerUser('PLAYER', 'friends-player');
  other = await registerUser('PLAYER', 'friends-other');
  owner = await registerUser('OWNER', 'friends-owner');
  inactive = await registerUser('PLAYER', 'friends-inactive');
  await prisma.user.update({ where: { id: inactive.userId }, data: { isActive: false } });
  const admin = await prisma.user.create({
    data: { email: uniqueEmail('friends-admin'), password: 'unused-test-password', role: 'ADMIN' },
  });
  adminId = admin.id;
  adminCookie = `token=${generateToken({ id: admin.id, email: admin.email, role: admin.role })}`;
});

after(async () => {
  await cleanupTestData();
  await stopServer();
});

test('friends endpoints require authentication and reject owners/admins', async () => {
  const endpoints = [
    { method: 'GET', path: '/api/players/search?q=friends' },
    { method: 'GET', path: '/api/players/friends' },
    { method: 'GET', path: '/api/players/friends/pending' },
    { method: 'POST', path: '/api/players/friends/request', body: { receiverId: player.userId } },
    { method: 'PUT', path: '/api/players/friends/missing/respond', body: { accept: true } },
  ];
  for (const { method, path, body } of endpoints) {
    assert.equal((await api(method, path, { body })).status, 401);
    for (const cookie of [owner.cookie, adminCookie]) {
      assert.equal((await api(method, path, { cookie, body })).status, 403);
    }
  }
});

test('discovery returns only active players, excluding self, owners and admins', async () => {
  const res = await api('GET', `/api/players/search?q=${RUN_ID}`, { cookie: player.cookie });
  assert.equal(res.status, 200);
  assert.deepEqual(res.body.users.map((user: { id: string }) => user.id), [other.userId]);
  assert.equal(res.body.users[0].role, 'PLAYER');
  const empty = await api('GET', '/api/players/search?q=', { cookie: player.cookie });
  assert.deepEqual(empty.body.users, []);
});

test('requests reject non-player and inactive recipients without storing a relationship', async () => {
  for (const receiverId of [owner.userId, adminId, inactive.userId]) {
    const res = await api('POST', '/api/players/friends/request', {
      cookie: player.cookie, body: { receiverId },
    });
    assert.equal(res.status, 403);
    assert.equal(await prisma.friend.count({ where: { senderId: player.userId, receiverId } }), 0);
  }
});

test('self and missing recipient validation remains intact', async () => {
  for (const [receiverId, status] of [[player.userId, 400], ['missing', 404]] as const) {
    const res = await api('POST', '/api/players/friends/request', {
      cookie: player.cookie, body: { receiverId },
    });
    assert.equal(res.status, status);
  }
});

test('players can request, receive and accept; duplicates and unauthorized responses fail', async () => {
  const created = await api('POST', '/api/players/friends/request', {
    cookie: player.cookie, body: { receiverId: other.userId },
  });
  assert.equal(created.status, 201);
  const id = created.body.friend.id;
  const pending = await api('GET', '/api/players/friends/pending', { cookie: other.cookie });
  assert.ok(pending.body.requests.some((request: { id: string }) => request.id === id));
  const duplicate = await api('POST', '/api/players/friends/request', {
    cookie: other.cookie, body: { receiverId: player.userId },
  });
  assert.equal(duplicate.status, 400);
  assert.equal((await api('PUT', `/api/players/friends/${id}/respond`, {
    cookie: player.cookie, body: { accept: true },
  })).status, 403);
  const accepted = await api('PUT', `/api/players/friends/${id}/respond`, {
    cookie: other.cookie, body: { accept: true },
  });
  assert.equal(accepted.status, 200);
  assert.equal(accepted.body.friend.status, 'ACCEPTED');
  for (const cookie of [player.cookie, other.cookie]) {
    const list = await api('GET', '/api/players/friends', { cookie });
    assert.ok(list.body.friends.some((friend: { id: string }) => friend.id === id));
  }
});

test('legacy non-player requests are hidden and cannot be accepted or declined', async () => {
  for (const senderId of [owner.userId, adminId]) {
    const legacy = await prisma.friend.create({ data: { senderId, receiverId: player.userId } });
    const pending = await api('GET', '/api/players/friends/pending', { cookie: player.cookie });
    assert.ok(!pending.body.requests.some((request: { id: string }) => request.id === legacy.id));
    for (const accept of [true, false]) {
      assert.equal((await api('PUT', `/api/players/friends/${legacy.id}/respond`, {
        cookie: player.cookie, body: { accept },
      })).status, 403);
    }
    assert.equal((await prisma.friend.findUniqueOrThrow({ where: { id: legacy.id } })).status, 'PENDING');
    await prisma.friend.update({ where: { id: legacy.id }, data: { status: 'ACCEPTED' } });
    const list = await api('GET', '/api/players/friends', { cookie: player.cookie });
    assert.ok(!list.body.friends.some((friend: { id: string }) => friend.id === legacy.id));
  }
  const legacy = await prisma.friend.create({
    data: { senderId: player.userId, receiverId: adminId, status: 'ACCEPTED' },
  });
  const list = await api('GET', '/api/players/friends', { cookie: player.cookie });
  assert.ok(!list.body.friends.some((friend: { id: string }) => friend.id === legacy.id));
  assert.ok(await prisma.friend.findUnique({ where: { id: legacy.id } }));
});

test('players can decline a request', async () => {
  const sender = await registerUser('PLAYER', 'friends-decline');
  const request = await api('POST', '/api/players/friends/request', {
    cookie: sender.cookie, body: { receiverId: player.userId },
  });
  assert.equal(request.status, 201);
  const response = await api('PUT', `/api/players/friends/${request.body.friend.id}/respond`, {
    cookie: player.cookie, body: { accept: false },
  });
  assert.equal(response.status, 200);
  assert.equal(response.body.friend.status, 'BLOCKED');
});