-- Preserve legacy slots as archival records. Do not round legacy booking times or reprice bookings.
ALTER TABLE "Court" ADD COLUMN "openingHours" JSONB NOT NULL DEFAULT '[{"day":0,"open":8,"close":23,"closed":false},{"day":1,"open":8,"close":23,"closed":false},{"day":2,"open":8,"close":23,"closed":false},{"day":3,"open":8,"close":23,"closed":false},{"day":4,"open":8,"close":23,"closed":false},{"day":5,"open":8,"close":23,"closed":false},{"day":6,"open":8,"close":23,"closed":false}]';
ALTER TABLE "Booking" ALTER COLUMN "courtSlotId" DROP NOT NULL;
ALTER TABLE "Booking" ADD COLUMN "startsAt" TIMESTAMP(3), ADD COLUMN "endsAt" TIMESTAMP(3);
-- Legacy slot.date is a date carrier. Interpret its stored UTC calendar date and time strings in Yangon.
-- Invalid legacy time strings intentionally fail the migration instead of losing or rounding data.
UPDATE "Booking" b SET
  "startsAt" = ((s."date"::date + s."startTime"::time) AT TIME ZONE 'Asia/Yangon') AT TIME ZONE 'UTC',
  "endsAt" = ((s."date"::date + s."endTime"::time + CASE WHEN s."endTime"::time <= s."startTime"::time THEN INTERVAL '1 day' ELSE INTERVAL '0 day' END) AT TIME ZONE 'Asia/Yangon') AT TIME ZONE 'UTC'
FROM "CourtSlot" s WHERE s.id = b."courtSlotId";
ALTER TABLE "Booking" ALTER COLUMN "startsAt" SET NOT NULL, ALTER COLUMN "endsAt" SET NOT NULL;
ALTER TABLE "Booking" ADD CONSTRAINT "Booking_time_order" CHECK ("endsAt" > "startsAt");
CREATE INDEX "Booking_courtId_startsAt_endsAt_idx" ON "Booking"("courtId", "startsAt", "endsAt");
CREATE TABLE "CourtBlock" (
  "id" TEXT NOT NULL PRIMARY KEY,
  "courtId" TEXT NOT NULL REFERENCES "Court"("id") ON DELETE CASCADE ON UPDATE CASCADE,
  "startsAt" TIMESTAMP(3) NOT NULL,
  "endsAt" TIMESTAMP(3) NOT NULL,
  "reason" TEXT NOT NULL,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "CourtBlock_time_order" CHECK ("endsAt" > "startsAt")
);
CREATE INDEX "CourtBlock_courtId_startsAt_endsAt_idx" ON "CourtBlock"("courtId", "startsAt", "endsAt");