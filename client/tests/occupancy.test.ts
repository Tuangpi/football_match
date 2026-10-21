// Run from client/: ../server/node_modules/.bin/tsx --test tests/occupancy.test.ts
import { test } from "node:test";
import assert from "node:assert/strict";
import { occupancyPercent } from "../src/lib/occupancy";

const allDaysOpen = Array.from({ length: 7 }, (_, d) => ({
  day: d,
  open: 6,
  close: 22,
  closed: false,
}));

function booking(startsAt: string, endsAt: string, status = "CONFIRMED") {
  return { startsAt, endsAt, status };
}

test("occupancy is 0 when there are no courts", () => {
  assert.equal(occupancyPercent([], [], "2026-10-19"), 0);
});

test("occupancy is 0 when courts are closed", () => {
  const courts = [{ openingHours: [{ day: 0, open: 6, close: 22, closed: true }] }];
  // ensure the date's weekday is 0? Use all weekdays closed instead
  const closedAll = Array.from({ length: 7 }, (_, d) => ({
    day: d,
    open: 6,
    close: 22,
    closed: true,
  }));
  assert.equal(occupancyPercent([], [{ openingHours: closedAll }], "2026-10-19"), 0);
});

test("occupancy is 0 with no confirmed bookings", () => {
  const courts = [{ openingHours: allDaysOpen }];
  assert.equal(occupancyPercent([], courts, "2026-10-19"), 0);
});

test("occupancy reflects booked vs open hours", () => {
  const courts = [{ openingHours: allDaysOpen }];
  const bookings = [booking("2026-10-19T10:00:00+06:30", "2026-10-19T14:00:00+06:30")];
  // 4h booked / 16h open = 25%
  assert.equal(occupancyPercent(bookings, courts, "2026-10-19"), 25);
});

test("occupancy caps at 100", () => {
  const courts = [{ openingHours: allDaysOpen }];
  const bookings = [booking("2026-10-19T06:00:00+06:30", "2026-10-19T22:00:00+06:30")];
  // 16h/16h = 100
  assert.equal(occupancyPercent(bookings, courts, "2026-10-19"), 100);
});

test("cancelled and pending bookings do not count", () => {
  const courts = [{ openingHours: allDaysOpen }];
  const bookings = [
    booking("2026-10-19T10:00:00+06:30", "2026-10-19T14:00:00+06:30", "CANCELLED"),
    booking("2026-10-19T10:00:00+06:30", "2026-10-19T14:00:00+06:30", "PENDING"),
  ];
  assert.equal(occupancyPercent(bookings, courts, "2026-10-19"), 0);
});

test("a booking on a different day does not count", () => {
  const courts = [{ openingHours: allDaysOpen }];
  const bookings = [booking("2026-10-18T10:00:00+06:30", "2026-10-18T14:00:00+06:30")];
  assert.equal(occupancyPercent(bookings, courts, "2026-10-19"), 0);
});

test("sums across multiple courts", () => {
  const courts = [{ openingHours: allDaysOpen }, { openingHours: allDaysOpen }];
  const bookings = [booking("2026-10-19T10:00:00+06:30", "2026-10-19T14:00:00+06:30")];
  // 4h / 32h = 12.5 -> 13
  assert.equal(occupancyPercent(bookings, courts, "2026-10-19"), 13);
});