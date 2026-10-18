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

`id · ownerId (FK → User, onDelete: Cascade) · name · address · city · sportType (default FUTSAL) · dimensions? · surfaceType? · basePricePerHour · isActive (default true) · createdAt · updatedAt`
Relations: `owner → User`, `slots[]`, `bookings[]`, `events[]`, `reviews[]`.
Notes: public listing shows only `isActive:true`. `PUT /courts/:id` can flip `isActive` (owner self-deactivate); admin toggle does the same. Deleting a court cascades to slots, events, reviews — but **not** bookings (no cascade declared), so a court with bookings cannot be deleted without removing bookings first.

### CourtSlot

`id · courtId (FK → Court, onDelete: Cascade) · date (DateTime) · startTime (string) · endTime (string) · isAvailable (default true) · pricePerHour · createdAt`
Relations: `court → Court`, `bookings[]`. Index: `(courtId, date, startTime)` — a performance index only, **not** a uniqueness guard; overlapping/duplicate slots are possible.
Notes: `date` carries the day (time component ignored by day-filter queries); `startTime`/`endTime` are unvalidated strings. `pricePerHour` snapshots at creation (defaults to the court's base price). No update/delete endpoint. Booking sets `isAvailable=false`; cancel/CANCELLED sets it back to `true`.

### Booking

`id · courtId (FK → Court, no cascade) · courtSlotId (FK → CourtSlot, no cascade) · playerId (FK → User, no cascade) · teamId? (FK → Team, no cascade) · status (default PENDING) · totalPrice · bookedAt · cancelledAt?`
Index: `(courtSlotId)`. Relations: `court`, `courtSlot`, `player → User`, `team?`.
Lifecycle: created PENDING (slot flagged unavailable, `totalPrice` = slot price); owner sets CONFIRMED or CANCELLED; player cancels own via `PATCH /:id/cancel` (sets CANCELLED + `cancelledAt`, frees slot). Double-booking is guarded twice: the `isAvailable` flag (checked first) and a live PENDING/CONFIRMED row check. Because none of court/slot/player/team cascade to bookings, history rows survive their parents' deletion attempts — in practice the FKs block deleting a referenced court, slot, user, or team.

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

Court ──1:n── CourtSlot (onDelete: Cascade)
Court ──1:n── Booking (no cascade)
Court ──1:n── Event (onDelete: Cascade)
Court ──1:n── Review (onDelete: Cascade)

CourtSlot ──1:n── Booking (no cascade)
```
