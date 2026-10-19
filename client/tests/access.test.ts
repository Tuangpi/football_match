import assert from 'node:assert/strict';
import { test } from 'node:test';
import { defaultRouteForRole, resolvePostAuthRedirect } from '../src/lib/utils';

test('admins always land on the dashboard, ignoring saved URLs', () => {
  for (const path of [undefined, '/', '/login', '/register', '/bookings', '/teams', '/friends',
    '/profile', '/courts', '/courts/example', '/events', '/events/example',
    '/owner/courts', '/owner/bookings', '/owner/events', '/admin', '/admin/users']) {
    assert.equal(resolvePostAuthRedirect('ADMIN', path), '/admin');
  }
  assert.equal(defaultRouteForRole('ADMIN'), '/admin');
});

test('player and owner redirects retain their existing destinations and role guards', () => {
  assert.equal(resolvePostAuthRedirect('PLAYER', '/bookings'), '/bookings');
  assert.equal(resolvePostAuthRedirect('OWNER', '/owner/events'), '/owner/events');
  assert.equal(resolvePostAuthRedirect('PLAYER', '/owner/courts'), '/');
  assert.equal(resolvePostAuthRedirect('OWNER', '/admin'), '/owner/courts');
  assert.equal(resolvePostAuthRedirect('PLAYER', '/admin'), '/');
});
