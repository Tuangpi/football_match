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

test('register: creates a PLAYER, sets httpOnly token cookie, omits password', async () => {
  const email = uniqueEmail('auth-register');
  const res = await fetch(`${await startServer()}/api/auth/register`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ email, password: PASSWORD, role: 'PLAYER' }),
  });
  assert.equal(res.status, 201);
  const body: any = await res.json();
  assert.equal(body.success, true);
  assert.equal(body.user.email, email);
  assert.equal(body.user.role, 'PLAYER');
  assert.equal(body.user.password, undefined);

  const setCookie = res.headers.getSetCookie().find((c) => c.startsWith('token='));
  assert.ok(setCookie, 'expected token cookie');
  assert.match(setCookie!, /HttpOnly/i);
});

test('register: duplicate email returns 400', async () => {
  const user = await registerUser('PLAYER', 'auth-dup');
  const res = await api('POST', '/api/auth/register', {
    body: { email: user.email, password: PASSWORD, role: 'PLAYER' },
  });
  assert.equal(res.status, 400);
  assert.equal(res.body.message, 'Email already registered');
});

test('register: invalid email / short password return 400 validation error', async () => {
  const bad = await api('POST', '/api/auth/register', {
    body: { email: 'not-an-email', password: PASSWORD },
  });
  assert.equal(bad.status, 400);
  assert.equal(bad.body.message, 'Validation error');

  const short = await api('POST', '/api/auth/register', {
    body: { email: 'short-pw@test.local', password: '123' },
  });
  assert.equal(short.status, 400);
  assert.equal(short.body.message, 'Validation error');
});

test('login: wrong password or unknown email return 401', async () => {
  const user = await registerUser('PLAYER', 'auth-login');
  const wrongPw = await api('POST', '/api/auth/login', {
    body: { email: user.email, password: 'wrong-password' },
  });
  assert.equal(wrongPw.status, 401);
  assert.equal(wrongPw.body.message, 'Invalid credentials');

  const unknown = await api('POST', '/api/auth/login', {
    body: { email: 'nobody-here@test.local', password: PASSWORD },
  });
  assert.equal(unknown.status, 401);
  assert.equal(unknown.body.message, 'Invalid credentials');
});

test('login: success sets cookie, /me returns the user, logout clears cookie', async () => {
  const user = await registerUser('PLAYER', 'auth-me');
  const login = await api('POST', '/api/auth/login', {
    body: { email: user.email, password: PASSWORD },
  });
  assert.equal(login.status, 200);
  assert.equal(login.body.user.email, user.email);
  assert.equal(login.body.user.role, 'PLAYER');

  const me = await api('GET', '/api/auth/me', { cookie: user.cookie });
  assert.equal(me.status, 200);
  assert.equal(me.body.user.email, user.email);

  const logout = await api('POST', '/api/auth/logout');
  assert.equal(logout.status, 200);
});

test('me: without a token returns 401', async () => {
  const res = await api('GET', '/api/auth/me');
  assert.equal(res.status, 401);
  assert.equal(res.body.message, 'Authentication required');
});
