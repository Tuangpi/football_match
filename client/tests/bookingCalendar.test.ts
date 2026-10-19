// Run from client/: ../server/node_modules/.bin/tsx --test tests/bookingCalendar.test.ts
import { test } from "node:test";
import assert from "node:assert/strict";
import {
  addDays,
  calendarDays,
  calendarLabel,
  onCalendarDay,
  shiftPeriod,
} from "../src/lib/bookingCalendar";

test("weeks start Monday, including Sundays and cross-year weeks", () => {
  assert.deepEqual(calendarDays("2027-01-03", "week"), [
    "2026-12-28",
    "2026-12-29",
    "2026-12-30",
    "2026-12-31",
    "2027-01-01",
    "2027-01-02",
    "2027-01-03",
  ]);
  assert.equal(calendarDays("2026-10-19", "week")[0], "2026-10-19");
  assert.deepEqual(calendarDays("2026-10-19", "day"), ["2026-10-19"]);
});

test("month grids contain full Monday–Sunday weeks, leap day and adjacent dates", () => {
  const leap = calendarDays("2028-02-20", "month");
  assert.equal(leap[0], "2028-01-31");
  assert.equal(leap.at(-1), "2028-03-05");
  assert.ok(leap.includes("2028-02-29"));
  assert.equal(leap.length, 35);
  const sixWeeks = calendarDays("2026-11-01", "month");
  assert.equal(sixWeeks.length, 42);
  assert.equal(sixWeeks[0], "2026-10-26");
  assert.equal(sixWeeks.at(-1), "2026-12-06");
  assert.equal(calendarDays("2027-02-14", "month").length, 28);
});

test("period navigation clamps month-end dates and crosses years safely", () => {
  assert.equal(shiftPeriod("2027-01-31", "month", 1), "2027-02-28");
  assert.equal(shiftPeriod("2028-01-31", "month", 1), "2028-02-29");
  assert.equal(shiftPeriod("2026-12-31", "month", 1), "2027-01-31");
  assert.equal(shiftPeriod("2027-01-31", "month", -1), "2026-12-31");
  assert.equal(shiftPeriod("2026-12-28", "week", 1), "2027-01-04");
  assert.equal(shiftPeriod("2027-01-01", "day", -1), "2026-12-31");
  assert.equal(addDays("2028-02-28", 1), "2028-02-29");
});

test("Yangon day overlap includes overnight blocks but excludes midnight end adjacency", () => {
  const overnight = { startsAt: "2026-10-31T23:00:00+06:30", endsAt: "2026-11-02T00:00:00+06:30" };
  assert.equal(onCalendarDay(overnight, "2026-10-31"), true);
  assert.equal(onCalendarDay(overnight, "2026-11-01"), true);
  assert.equal(onCalendarDay(overnight, "2026-11-02"), false);
  assert.equal(
    onCalendarDay(
      { startsAt: "2026-10-31T18:00:00Z", endsAt: "2026-10-31T19:00:00Z" },
      "2026-11-01",
    ),
    true,
  );
  assert.equal(
    onCalendarDay(
      { startsAt: "2026-10-31T18:00:00Z", endsAt: "2026-10-31T19:00:00Z" },
      "2026-10-31",
    ),
    false,
  );
});

test("date formatting and arithmetic are independent of browser timezone and DST", () => {
  const original = process.env.TZ;
  try {
    for (const timezone of ["UTC", "America/Los_Angeles", "Pacific/Kiritimati"]) {
      process.env.TZ = timezone;
      assert.equal(addDays("2026-03-08", 1), "2026-03-09");
      assert.equal(calendarDays("2026-11-01", "week")[0], "2026-10-26");
      const label = calendarLabel("2026-11-01", { day: "numeric", month: "long", year: "numeric" });
      assert.match(label, /November/);
      assert.match(label, /2026/);
      assert.doesNotMatch(label, /October/);
    }
  } finally {
    if (original === undefined) delete process.env.TZ;
    else process.env.TZ = original;
  }
});
