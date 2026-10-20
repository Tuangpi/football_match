import { test, before, after } from "node:test";
import assert from "node:assert/strict";
import {
  api,
  registerUser,
  cleanupTestData,
  startServer,
  stopServer,
  type TestUser,
} from "./helpers";
let owner: TestUser, player: TestUser, other: TestUser, foreign: TestUser;
let courtId: string, bookingId: string;
const date = new Date(Date.now() + 7 * 86_400_000).toISOString().slice(0, 10);
const hours = Array.from({ length: 7 }, (_, day) => ({ day, open: 8, close: 23, closed: false }));
const range = (start: number, end: number) => ({
  courtId,
  startsAt: `${date}T${String(start).padStart(2, "0")}:00:00+06:30`,
  endsAt: `${date}T${String(end).padStart(2, "0")}:00:00+06:30`,
});
const book = (start: number, end: number, user = player) =>
  api("POST", "/api/bookings", { cookie: user.cookie, body: range(start, end) });
before(async () => {
  await startServer();
  owner = await registerUser("OWNER", "bk-owner");
  player = await registerUser("PLAYER", "bk-player");
  other = await registerUser("PLAYER", "bk-other");
  foreign = await registerUser("OWNER", "bk-foreign");
  const res = await api("POST", "/api/courts", {
    cookie: owner.cookie,
    body: { name: "Flexible Court", address: "Test", city: "Yangon", basePricePerHour: 40_000 },
  });
  assert.equal(res.status, 201);
  courtId = res.body.court.id;
});
after(async () => {
  await cleanupTestData();
  await stopServer();
});
test("authentication and obsolete slot-only validation", async () => {
  assert.equal((await api("POST", "/api/bookings", { body: range(10, 12) })).status, 401);
  assert.equal(
    (await api("POST", "/api/bookings", { cookie: player.cookie, body: { courtSlotId: "old" } }))
      .status,
    400,
  );
});
test("two-hour booking requires no slot and calculates duration price", async () => {
  const res = await book(10, 12);
  assert.equal(res.status, 201);
  assert.equal(res.body.booking.totalPrice, 80_000);
  assert.equal(res.body.booking.status, "PENDING");
  assert.equal(res.body.booking.courtSlotId, null);
  bookingId = res.body.booking.id;
});
test("pending bookings prevent all overlap shapes but allow adjacency", async () => {
  for (const [a, b] of [
    [9, 11],
    [11, 13],
    [10, 11],
    [9, 13],
  ])
    assert.equal((await book(a, b, other)).status, 409);
  assert.equal((await book(12, 13, other)).status, 201);
});
test("whole-hour rules use Myanmar wall time and reject seconds", async () => {
  for (const change of [
    { startsAt: `${date}T14:30:00+06:30` },
    { endsAt: `${date}T15:00:01+06:30` },
    { startsAt: `${date}T14:00:00Z` },
  ]) {
    assert.equal(
      (
        await api("POST", "/api/bookings", {
          cookie: player.cookie,
          body: { ...range(14, 15), ...change },
        })
      ).status,
      400,
    );
  }
});
test("reversed, empty, past, malformed and outside-opening ranges fail", async () => {
  for (const [a, b] of [
    [14, 14],
    [15, 14],
    [7, 9],
  ])
    assert.equal((await book(a, b)).status, 400);
  for (const change of [
    { startsAt: "invalid" },
    { startsAt: "2020-01-01T10:00:00+06:30", endsAt: "2020-01-01T11:00:00+06:30" },
  ])
    assert.equal(
      (
        await api("POST", "/api/bookings", {
          cookie: player.cookie,
          body: { ...range(14, 15), ...change },
        })
      ).status,
      400,
    );
});
test("owner confirms; foreign owner and player denied; owner lists isolated", async () => {
  const path = `/api/bookings/owner/${bookingId}/status`;
  for (const user of [foreign, other])
    assert.equal(
      (await api("PATCH", path, { cookie: user.cookie, body: { status: "CONFIRMED" } })).status,
      403,
    );
  assert.equal(
    (await api("PATCH", path, { cookie: owner.cookie, body: { status: "CONFIRMED" } })).status,
    200,
  );
  assert.equal(
    (await api("GET", "/api/bookings/owner", { cookie: foreign.cookie })).body.bookings.length,
    0,
  );
});
test("players cannot cancel confirmed bookings; owner cancel releases time", async () => {
  assert.equal(
    (await api("PATCH", `/api/bookings/${bookingId}/cancel`, { cookie: other.cookie })).status,
    403,
  );
  assert.equal(
    (await api("PATCH", `/api/bookings/${bookingId}/cancel`, { cookie: player.cookie })).status,
    400,
  );
  assert.equal((await book(10, 12, other)).status, 409);
  const res = await api("PATCH", `/api/bookings/owner/${bookingId}/status`, {
    cookie: owner.cookie,
    body: { status: "CANCELLED" },
  });
  assert.equal(res.status, 200);
  assert.ok(res.body.booking.cancelledAt);
  assert.equal((await book(10, 12, other)).status, 201);
  assert.equal(
    (
      await api("PATCH", `/api/bookings/owner/${bookingId}/status`, {
        cookie: owner.cookie,
        body: { status: "CONFIRMED" },
      })
    ).status,
    400,
  );
});
test("players can cancel pending bookings and release their time", async () => {
  const pending = await book(13, 14);
  assert.equal(pending.status, 201);
  const id = pending.body.booking.id;
  const res = await api("PATCH", `/api/bookings/${id}/cancel`, { cookie: player.cookie });
  assert.equal(res.status, 200);
  assert.ok(res.body.booking.cancelledAt);
  assert.equal((await book(13, 14, other)).status, 201);
  assert.equal(
    (await api("PATCH", `/api/bookings/${id}/cancel`, { cookie: player.cookie })).status,
    400,
  );
});
test("concurrent overlapping bookings produce exactly one winner", async () => {
  const results = await Promise.all([book(14, 16), book(15, 17, other)]);
  assert.deepEqual(results.map((r) => r.status).sort(), [201, 409]);
});
test("blocked time ownership, overlap, privacy and removal", async () => {
  const path = `/api/courts/${courtId}/blocks`,
    body = { ...range(18, 20), reason: "Private maintenance" };
  for (const user of [foreign, player])
    assert.equal((await api("POST", path, { cookie: user.cookie, body })).status, 403);
  const block = await api("POST", path, { cookie: owner.cookie, body });
  assert.equal(block.status, 201);
  assert.equal((await book(17, 21)).status, 409);
  const availability = await api("GET", `/api/courts/${courtId}/availability?date=${date}`);
  assert.equal(availability.status, 200);
  assert.ok(availability.body.busy.length);
  assert.equal(JSON.stringify(availability.body).includes("Private maintenance"), false);
  assert.equal(JSON.stringify(availability.body).includes(player.email), false);
  assert.equal(
    (await api("DELETE", `${path}/${block.body.block.id}`, { cookie: foreign.cookie })).status,
    403,
  );
  assert.equal(
    (await api("DELETE", `${path}/${block.body.block.id}`, { cookie: owner.cookie })).status,
    200,
  );
  assert.equal((await book(18, 20)).status, 201);
  assert.equal((await api("POST", path, { cookie: owner.cookie, body })).status, 409);
});
test("simultaneous booking and block creation produce one winner", async () => {
  const results = await Promise.all([
    book(21, 22),
    api("POST", `/api/courts/${courtId}/blocks`, {
      cookie: owner.cookie,
      body: { ...range(21, 22), reason: "Maintenance" },
    }),
  ]);
  assert.deepEqual(results.map((r) => r.status).sort(), [201, 409]);
});
test("weekly closures, invalid schedule, inactive court and historical pricing", async () => {
  const path = `/api/courts/${courtId}`;
  assert.equal(
    (
      await api("PUT", path, {
        cookie: owner.cookie,
        body: { openingHours: [...hours.slice(1), hours[1]] },
      })
    ).status,
    400,
  );
  assert.equal(
    (
      await api("PUT", path, {
        cookie: owner.cookie,
        body: {
          openingHours: hours.map((h) => ({ ...h, closed: true })),
          basePricePerHour: 50_000,
        },
      })
    ).status,
    200,
  );
  assert.equal((await book(8, 9)).status, 400);
  const mine = await api("GET", "/api/bookings/me", { cookie: player.cookie });
  assert.equal(
    mine.body.bookings.find((b: { id: string }) => b.id === bookingId).totalPrice,
    80_000,
  );
  await api("PUT", path, { cookie: owner.cookie, body: { openingHours: hours, isActive: false } });
  assert.equal((await book(8, 9)).status, 400);
  await api("PUT", path, { cookie: owner.cookie, body: { isActive: true } });
});
test("team membership enforced and valid team retained", async () => {
  const team = await api("POST", "/api/teams", {
    cookie: player.cookie,
    body: { name: "Flexible FC" },
  });
  const teamId = team.body.team.id;
  assert.equal(
    (await api("POST", "/api/bookings", { cookie: other.cookie, body: { ...range(8, 9), teamId } }))
      .status,
    403,
  );
  const res = await api("POST", "/api/bookings", {
    cookie: player.cookie,
    body: { ...range(8, 9), teamId },
  });
  assert.equal(res.status, 201);
  assert.equal(res.body.booking.team.id, teamId);
});
test("missing court and invalid availability dates", async () => {
  assert.equal(
    (
      await api("POST", "/api/bookings", {
        cookie: player.cookie,
        body: { ...range(8, 9), courtId: "missing" },
      })
    ).status,
    404,
  );
  for (const date of ["invalid", "2026-02-30"])
    assert.equal(
      (await api("GET", `/api/courts/${courtId}/availability?date=${date}`)).status,
      400,
    );
});
