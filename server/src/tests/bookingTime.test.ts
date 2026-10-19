import { test } from "node:test";
import assert from "node:assert/strict";
import {
  courtParts,
  openingHoursSchema,
  validateOpeningHours,
  validateRange,
} from "../utils/bookingTime";

const hours = Array.from({ length: 7 }, (_, day) => ({ day, open: 0, close: 24, closed: false }));
test("whole-hour validation accepts Yangon midnight and UTC half-hour timestamps", () => {
  const range = validateRange("2099-01-01T00:00:00+06:30", "2099-01-01T01:00:00+06:30");
  assert.equal(range.startsAt.getUTCMinutes(), 30);
  assert.deepEqual(courtParts(range.startsAt), { day: 4, date: "2099-01-01", hour: 0, minute: 0 });
});
test("opening hours support midnight closing and full-day bookings", () => {
  for (const [from, to] of [
    ["2099-01-01T23:00:00+06:30", "2099-01-02T00:00:00+06:30"],
    ["2099-01-01T00:00:00+06:30", "2099-01-02T00:00:00+06:30"],
  ]) {
    const range = validateRange(from, to);
    assert.doesNotThrow(() => validateOpeningHours(hours, range.startsAt, range.endsAt));
  }
});
test("ranges crossing operating days, long ranges and sub-hour precision are rejected", () => {
  assert.throws(() =>
    validateOpeningHours(
      hours,
      new Date("2099-01-01T23:00:00+06:30"),
      new Date("2099-01-02T01:00:00+06:30"),
    ),
  );
  assert.throws(() => validateRange("2099-01-01T00:00:00+06:30", "2099-01-03T00:00:00+06:30"));
  assert.throws(() => validateRange("2099-01-01T10:00:00.001+06:30", "2099-01-01T11:00:00+06:30"));
});
test("weekly hours require all seven distinct days and ordered integer hours", () => {
  assert.equal(openingHoursSchema.safeParse(hours).success, true);
  assert.equal(openingHoursSchema.safeParse(hours.slice(1)).success, false);
  assert.equal(openingHoursSchema.safeParse(hours.map((h) => ({ ...h, day: 0 }))).success, false);
  assert.equal(
    openingHoursSchema.safeParse(hours.map((h) => ({ ...h, open: 8.5 }))).success,
    false,
  );
  assert.equal(
    openingHoursSchema.safeParse(hours.map((h) => ({ ...h, open: 20, close: 8 }))).success,
    false,
  );
});
