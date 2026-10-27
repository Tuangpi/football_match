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
let courtId: string;

before(async () => {
  await startServer();
  owner = await registerUser('OWNER', 'rv-owner');
  player = await registerUser('PLAYER', 'rv-player');

  const court = await api('POST', '/api/courts', {
    userId: owner.userId,
    body: {
      name: 'Review Court',
      address: '9 Review Rd',
      city: 'Ratington',
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

test('unauthenticated review returns 401', async () => {
  const res = await api('POST', '/api/reviews', {
    body: { courtId, rating: 5 },
  });
  assert.equal(res.status, 401);
});

test('player creates a review -> 201 with rating and comment', async () => {
  const res = await api('POST', '/api/reviews', {
    userId: player.userId,
    body: { courtId, rating: 4, comment: 'Great turf, T009 test' },
  });
  assert.equal(res.status, 201);
  assert.equal(res.body.review.rating, 4);
  assert.equal(res.body.review.comment, 'Great turf, T009 test');
  assert.equal(res.body.review.userId, player.userId);
});

test('review appears in the court detail and the reviews list', async () => {
  const detail = await api('GET', `/api/courts/${courtId}`);
  const inCourt = detail.body.court.reviews.find((r: any) => r.userId === player.userId);
  assert.ok(inCourt, 'review should be embedded in court detail');
  assert.equal(inCourt.rating, 4);

  const list = await api('GET', `/api/reviews/${courtId}`);
  assert.equal(list.status, 200);
  const inList = list.body.reviews.find((r: any) => r.userId === player.userId);
  assert.ok(inList, 'review should be in GET /api/reviews/:courtId');
});

test('duplicate review returns 400 with friendly message', async () => {
  const res = await api('POST', '/api/reviews', {
    userId: player.userId,
    body: { courtId, rating: 5 },
  });
  assert.equal(res.status, 400);
  assert.equal(res.body.message, 'You have already reviewed this court');
});

test('rating out of range returns 400 validation error', async () => {
  const res = await api('POST', '/api/reviews', {
    userId: owner.userId, // a different user, so duplicate-check isn't the failure
    body: { courtId, rating: 6 },
  });
  assert.equal(res.status, 400);
  assert.equal(res.body.message, 'Validation error');
});

test('review on a non-existent court returns 404', async () => {
  const res = await api('POST', '/api/reviews', {
    userId: owner.userId,
    body: { courtId: 'no-such-court', rating: 3 },
  });
  assert.equal(res.status, 404);
  assert.equal(res.body.message, 'Court not found');
});
