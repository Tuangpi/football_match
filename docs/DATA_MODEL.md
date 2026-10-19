# Data model overview

Source of truth: `server/prisma/schema.prisma` (PostgreSQL via Prisma). Last verified 2026-10-17.

## Enums

- `UserRole`: `PLAYER` (default) · `OWNER` · `ADMIN`. Only PLAYER/OWNER can self-register; ADMIN must be set directly in the DB.
- `BookingStatus`: `PENDING` (default) · `CONFIRMED` · `CANCELLED`.
- `SportType`: `FUTSAL` (default) · `ELEVEN_A_SIDE`.
- `FriendStatus`: `PENDING` (default) · `ACCEPTED` · `BLOCKED` (decline path — see Friend below).
- `EventType`: `TOURNAMENT` · `COMPETITION` · `DISCOUNT` · `PRICE_CHANGE`.

## Models

### User

`id (cuid PK) · email (unique) · password (bcrypt hash) · role (UserRole, default PLAYER) · isActive (default true, T008) · createdAt · updatedAt`
Relations: `playerProfile?`, `ownedCourts[]`, `events[]` (created), `teams[]` (captained), `teamMemberships[]`, `bookings[]` (as player), `reviews[]`, `sentFriendRequests[]` / `receivedFriendRequests[]`.
Notes: `isActive` is only flipped by admin toggles; nothing in auth currently blocks a deactivated user's JWT (see docs/API.md).

### PlayerProfile

`id · userId (unique, FK → User, onDelete: Cascade) · fullName? · phone? · position? · skillLevel? · bio? · avatarUrl?`
Notes: one row per user max. The `PUT /api/players/me` upsert accepts fullName/phone/position/skillLevel/bio plus `avatarUrl` (valid URL string or `null` — write path added 2026-10-18; it previously existed in the DB only). Public reads go through `GET /api/players/:id` keyed by **user id**. Deleting the user deletes the profile.

### Friend

`id · senderId · receiverId · status (default PENDING) · createdAt`
Relations: `sender → User`, `receiver → User`. Constraint: `@@unique(senderId, receiverId)` — one directed row per pair.
Lifecycle: request → PENDING; respond accept → ACCEPTED, decline → BLOCKED. The API checks both directions for duplicates, so a BLOCKED (declined) row permanently blocks re-requests in either direction. `GET /friends` returns ACCEPTED rows where the caller is sender or receiver; `GET /friends/pending` returns PENDING rows where the caller is the receiver. No delete endpoint.
No FK cascade is declared — deleting a user with friend rows fails at the DB level.

### Team

`id · name · sportType (default FUTSAL) · captainId (FK → User, no cascade) · createdAt`
Relations: `captain → User`, `members[]`, `bookings[]`.
Notes: creator auto-becomes captain + a CAPTAIN `TeamMember` row. No team-delete or captain-transfer endpoint, so a captain can never leave/remove their team via the API. `GET /teams` can filter by `sportType`; detail includes captain, members, and last 10 bookings.

### TeamMember

`id · teamId (FK → Team, onDelete: Cascade) · userId (FK → User, onDelete: Cascade) · role (string, default "MEMBER"; captain row uses "CAPTAIN") · joinedAt`
Constraint: `@@unique(teamId, userId)` — one membership per user per team.
Notes: `role` is a free string, not an enum. Booking with a `teamId` requires a live membership row. Deleting the team or user removes the row.

### Court

`id · ownerId (FK → User, onDelete: Cascade) · name · address · city · sportType (default FUTSAL) · dimensions? · surfaceType? · basePricePerHour · openingHours (JSON weekly schedule) · isActive (default true) · createdAt · updatedAt`
Relations: `owner → User`, `slots[]` (legacy), `blockedPeriods[]`, `bookings[]`, `events[]`, `reviews[]`.
Notes: public listing shows only `isActive:true`. `PUT /courts/:id` can flip `isActive` (owner self-deactivate); admin toggle does the same. Deleting a court cascades to slots, events, reviews — but **not** bookings (no cascade declared), so a court with bookings cannot be deleted without removing bookings first.

### CourtSlot (legacy archive)

Existing rows are retained for historical reference. New booking availability does not depend on these records, and no player-facing slot creation/selection exists. Legacy management endpoints remain for compatibility; archived slots cannot be booked through the new booking API.

### Booking

`id · courtId · courtSlotId? (legacy FK) · startsAt · endsAt · playerId · teamId? · status · totalPrice · bookedAt · cancelledAt?`
Indexes: `(courtSlotId)` and `(courtId, startsAt, endsAt)`. Database check: end > start.
New bookings store UTC timestamps directly and have no slot link. API validates whole hours in Asia/Yangon and court opening hours. Pending/confirmed bookings block overlapping requests. Price snapshots hourly rate × duration; cancellation releases time without removing history. Cancelled records cannot be reopened.

Migration `20261019070000_flexible_booking` backfills timestamps from the archived slot's stored UTC calendar date and time strings interpreted in Yangon. Overnight legacy end times move to the next day. Existing totals and non-whole-hour times are unchanged. Invalid legacy strings fail the migration instead of silently rounding. Review legacy date-carrier conventions before applying this migration to another database.

### CourtBlock

`id · courtId (FK → Court, onDelete: Cascade) · startsAt · endsAt · reason · createdAt`
Index: `(courtId, startsAt, endsAt)`. Database check: end > start. Owner-only reasons are never exposed through public availability. Booking and block creation share a per-court transaction lock and check overlapping ranges after acquiring it.

### Event

`id · courtId (FK → Court, onDelete: Cascade) · userId (FK → User creator, onDelete: Cascade) · title · type (EventType) · description? · startDate · endDate · createdAt · updatedAt`
Relations: `court → Court`, `user → User`.
Notes: creation requires owning the court (or admin). No `endDate > startDate` validation in the schema or API. Deleting the court or creator cascades the event away.

### Review

`id · courtId (FK → Court, onDelete: Cascade) · userId (FK → User, no cascade) · rating (Int, 1–5 enforced in API not schema) · comment? · createdAt`
Constraint: `@@unique(courtId, userId)` — one review per user per court.
Notes: surfaced on court detail + `GET /api/reviews/:courtId`. No update/delete endpoint. Deleting the court removes its reviews; deleting a user with reviews fails at the DB level.

## Relation map

```
User ──1:1── PlayerProfile
User ──1:n── Court (ownedCourts, onDelete: Cascade)
User ──1:n── Event (created, onDelete: Cascade)
User ──1:n── Team (captained, no cascade)
User ──1:n── TeamMember (onDelete: Cascade)
User ──1:n── Booking (as player, no cascade)
User ──1:n── Review (no cascade)
User ──1:n── Friend (as sender / receiver, no cascade)

Team ──1:n── TeamMember (onDelete: Cascade)
Team ──1:n── Booking (optional teamId, no cascade)

Court ──1:n── CourtBlock (onDelete: Cascade)
Court ──1:n── CourtSlot (onDelete: Cascade)
Court ──1:n── Booking (no cascade)
Court ──1:n── Event (onDelete: Cascade)
Court ──1:n── Review (onDelete: Cascade)

CourtSlot ──1:n── Booking (no cascade)
```
