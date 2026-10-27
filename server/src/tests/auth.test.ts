import { test, before, after } from 'node:test';
import assert from 'node:assert/strict';
import {
  api,
  registerUser,
  cleanupTestData,
  startServer,
  stopServer,
} from './helpers';

let user: Awaited<ReturnType<typeof registerUser>>;

before(async () => {
  await startServer();
  user = await registerUser('PLAYER', 'auth-me');
});

after(async () => {
  await cleanupTestData();
  await stopServer();
});

test('me: with x-test-user-id returns the user', async () => {
  const res = await api('GET', '/api/auth/me', { userId: user.userId });
  assert.equal(res.status, 200);
  assert.equal(res.body.user.id, user.userId);
  assert.equal(res.body.user.role, 'PLAYER');
});

test('me: without a user id returns 401', async () => {
  const res = await api('GET', '/api/auth/me');
  assert.equal(res.status, 401);
  assert.equal(res.body.message, 'Authentication required');
});
