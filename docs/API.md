# API reference

Base URL: `http://localhost:3000`. All API routes are prefixed with `/api`.
Frontend calls `/api/*` (Vite dev server proxies `/api` → `http://localhost:3000`).

Source of truth: `server/src/routes/*` + `server/src/controllers/*`. Last verified 2026-10-19 (admin list/stats endpoints + immediate `isActive` lockout — see entries marked “Added 2026-10-19”).

## Conventions

- Currency: all price fields (`basePricePerHour`, `pricePerHour`, `totalPrice`) are numeric amounts in Myanmar kyat (MMK).
- Success envelope: `{ "success": true, ... }` plus the resource (`user`, `court`, `courts`, `booking`, …).
- Error envelope: `{ "success": false, "message": "<reason>" }`.
- Validation errors (Zod): `400 { success:false, message:"Validation error", errors:[{field,message}] }`. Only the request **body** is validated; query/path params are used as-is.
- Unknown route: `404 { success:false, message:"Route not found" }`.
- Health check (no auth): `GET /health` → `{ status:"ok", service:"football-match-server" }`.

## Auth — JWT in httpOnly cookie

- Cookie name: `token`. Set on `POST /api/auth/register` and `POST /api/auth/login`.
- Cookie flags: `httpOnly`, `path=/`, `maxAge=7 days`, `sameSite=lax`, `secure` only in production (`NODE_ENV=production`).
- Token payload: `{ id, email, role }`, expiry `JWT_EXPIRES_IN` (default `7d`).
- Client must send cookies: shared axios instance uses `baseURL:/api` + `withCredentials:true`.
- Server CORS: `origin = CLIENT_URL || http://localhost:5173`, `credentials:true`.
- `authenticate` reads `req.cookies.token`; missing → `401 Authentication required`, bad/expired → `401 Invalid or expired token`.
- `authorize(...roles)` → `403 Forbidden: insufficient role` when the role does not match.
- `JWT_SECRET` is required — the server throws at boot when it is missing.

Auth shorthand below: `🔓 public`, `🔒 logged in`, `👑 OWNER or ADMIN`, `🛡 ADMIN`.

### `POST /api/auth/register` 🔓

Body: `{ email: string(email), password: string(min 6), role?: "PLAYER" | "OWNER" }` (defaults to `PLAYER`; `ADMIN` cannot self-register).
Errors: `400 Email already registered`, `400 Validation error`.
Success: `201 { success:true, message:"Registration successful", user:{id,email,role,createdAt} }` + sets `token` cookie.

### `POST /api/auth/login` 🔓

Body: `{ email: string(email), password: string(min 1) }`.
Errors: `401 Invalid credentials` (unknown email or wrong password).
Success: `200 { success:true, message:"Login successful", user:{id,email,role} }` + sets `token` cookie.

### `POST /api/auth/logout` 🔓

No body. Clears the `token` cookie. Success: `200 { success:true, message:"Logged out" }`.

### `GET /api/auth/me` 🔒

Returns the session user with profile + owned-court summary.
Success: `200 { success:true, user:{ id,email,role,createdAt, playerProfile, ownedCourts:[{id,name,city}] } }`.
Errors: `401` (no/invalid token), `404 User not found`.

## Players & friends (`/api/players`) — all 🔒

Discovery (`/search`) and all `/friends` endpoints require role `PLAYER`; OWNER and ADMIN receive `403`. Profile endpoints retain their existing authenticated access.

### `GET /api/players/me` 🔒

Own player profile (may be `null` when never saved). → `200 { success:true, profile }`.

### `PUT /api/players/me` 🔒

Upsert own profile. Body: `{ fullName?, phone?, position?, skillLevel?, bio?, avatarUrl? }` — strings except `avatarUrl`, which must be a valid URL string or `null` (clears it). Added 2026-10-18; before that the schema rejected `avatarUrl`. → `200 { success:true, profile }`.

### `GET /api/players/search?q=<email-fragment>` 🔒

Find active PLAYER accounts by email (case-insensitive, excludes self, max 10). Empty `q` → `{ success:true, users:[] }`.
Success: `200 { success:true, users:[{id,email,role,playerProfile:{fullName}}] }`.

### `GET /api/players/suggest?q=` 🔒

Typeahead suggestions for active PLAYER accounts by email (case-insensitive contains, excludes self, max 8). Requires role `PLAYER`; OWNER/ADMIN receive `403`. Empty `q` → `{ success:true, items:[] }`.
Success: `200 { success:true, items:[{id,email,role,isActive,playerProfile:{fullName}}] }`.

### `POST /api/players/friends/request` 🔒

Body: `{ receiverId: string }`.
Errors: `400 Cannot send friend request to yourself`, `404 User not found` (receiver id), `400 Friend request already exists` (a row exists in either direction, any status).
Non-player or inactive recipients return `403 Friend requests can only be sent to active players`.
Success: `201 { success:true, friend }` (`status: PENDING`).

### `GET /api/players/friends` 🔒

Accepted friendships in either direction (sender or receiver) with both users + their profiles. Both accounts must currently have role PLAYER; legacy non-player relationships are hidden, not deleted.
→ `200 { success:true, friends }`.

### `GET /api/players/friends/pending` 🔒

Incoming pending requests from PLAYER accounts where the caller is the receiver. → `200 { success:true, requests }`.

### `PUT /api/players/friends/:id/respond` 🔒

Body: `{ accept: boolean }`. Accept → `ACCEPTED`; decline → `BLOCKED` (declined requests disappear from both lists — no re-request possible while the row exists).
Errors: `404 Friend request not found`, `403 Not authorized to respond to this request` (only the receiver).
Legacy requests from non-player accounts return `403 Friend requests are only available between players` and remain unchanged.
Success: `200 { success:true, friend }` (includes sender + receiver).

### `GET /api/players/:id` 🔒

Public player profile by **user id** (`PlayerProfile.userId`). Errors: `404 Player not found`.
⚠️ Route order matters: `/search`, `/friends/*` are registered before `/:id`, otherwise `GET /friends` would be swallowed by `/:id`. Keep that order when adding routes.

## Teams (`/api/teams`) — all 🔒

### `POST /api/teams` 🔒

Body: `{ name: string(min 1), sportType?: "FUTSAL" | "ELEVEN_A_SIDE" }` (defaults `FUTSAL`).
Creator becomes `captainId` + a `CAPTAIN` member row.
Success: `201 { success:true, team }` (includes `members[].user`, `captain`).

### `GET /api/teams?sportType=` 🔒

Optional filter `?sportType=FUTSAL|ELEVEN_A_SIDE`. Includes captain, members (+user email), `_count.members`, newest first. → `200 { success:true, teams }`.

### `GET /api/teams/:id` 🔒

One team with captain (+profile), members (+profiles), last 10 bookings (+court id/name/city).
Errors: `404 Team not found`. → `200 { success:true, team }`.

### `POST /api/teams/:id/join` 🔒

No body. Errors: `404 Team not found`, `400 Already a member of this team`.
Success: `200 { success:true, member }` (`role: MEMBER`).

### `DELETE /api/teams/:id/leave` 🔒

No body. Errors: `404 Team not found`, `400 Captain cannot leave the team. Transfer captaincy first.` (captains should use `DELETE /api/teams/:id` instead).
Success: `200 { success:true, message:"Left the team" }`.

### `DELETE /api/teams/:id` 🔒

**Added 2026-10-18.** Captain-or-admin only. Deletes the team; `TeamMember` rows cascade, and any bookings referencing the team are **detached** (`teamId` set to `null`) in the same transaction — bookings themselves survive.
Errors: `404 Team not found`, `403 Only the captain can delete this team`.
Success: `200 { success:true, message:"Team deleted" }`.

## Courts (`/api/courts`)

### `GET /api/courts?city=&sportType=&minPrice=&maxPrice=` 🔓

Lists **active courts only** (`isActive:true`), newest first. Filters: `city` (case-insensitive contains), `sportType`, `minPrice`/`maxPrice` on `basePricePerHour`.
Success: `200 { success:true, courts }` (each with `owner{id,email}`, `reviews[{rating}]`, `_count.reviews`).

### `GET /api/courts/suggest?q=` 🔓

Typeahead suggestions for active courts by name or city (case-insensitive contains, max 8). Empty `q` → `{ success:true, items:[] }`.
Success: `200 { success:true, items:[{id,name,city}] }`.

### `GET /api/courts/:id` 🔓

Court detail with owner, weekly `openingHours`, and reviews (newest first, with reviewer id/email). Errors: `404 Court not found`. → `200 { success:true, court }`.

### `GET /api/courts/:id/slots?date=` 🔓

Legacy archival slots (not bookable or used for availability), ordered by date+startTime. Optional `?date=<parseable date>` filters to that calendar day (server-local 00:00–23:59:59.999). No court-exists check — unknown id returns `200 { success:true, slots:[] }`.

### `GET /api/courts/owner/me` 🔒

Own courts (any `isActive`), each with weekly `openingHours` + latest 5 bookings. Note: registered **after** `/:id` but still works — `/owner/me` (2 segments) never collides with `/:id` (1 segment). → `200 { success:true, courts }`.

### `POST /api/courts` 👑

Body: `{ name, address, city (all min 1), sportType?: "FUTSAL"|"ELEVEN_A_SIDE" (default FUTSAL), dimensions?, surfaceType?, basePricePerHour: number(positive, required) }`.
Success: `201 { success:true, court }` (owner = caller).

### `PUT /api/courts/:id` 👑

Partial update of own court (same fields as create, all optional, plus `isActive?: boolean`).
Errors: `404 Court not found`, `403 Not authorized to update this court` (non-owner, non-admin).
Success: `200 { success:true, court }`.

### `DELETE /api/courts/:id` 👑

Owner-or-admin only. Cascades to slots, events, reviews (FK `onDelete:Cascade`); bookings have **no** cascade — deleting a court with bookings fails at the DB level.
Errors: `404 Court not found`, `403 Not authorized to delete this court`.
Success: `200 { success:true, message:"Court deleted" }`.

### `POST /api/courts/:id/slots` 👑 (legacy)

Body: `{ date: string(datetime, required), startTime: string(required, e.g. "19:00"), endTime: string(required), pricePerHour?: number(positive, defaults to court's basePricePerHour) }`.
No format/ordering validation on `startTime`/`endTime`, no overlap guard.
Errors: `404 Court not found`, `403 Not authorized to add slots to this court`.
Success: `201 { success:true, slot }`.

### `DELETE /api/courts/:id/slots/:slotId` 👑

**Added 2026-10-18.** Court-owner-or-admin only. The slot must belong to `:id`.
Bookings block deletion while active (`PENDING`/`CONFIRMED`); once all bookings on the slot are `CANCELLED`, their legacy slot link is cleared in the same transaction; booking history is preserved (the FK has no cascade).
Errors: `404 Court not found`, `403 Not authorized to delete slots on this court`, `404 Slot not found` (or slot on another court), `400 Cannot delete a slot with active bookings`.
Success: `200 { success:true, message:"Slot deleted" }`.

## Bookings (`/api/bookings`) — all 🔒

Bookings store `startsAt` and `endsAt` UTC timestamps directly. All court rules and UI selections use **Asia/Yangon (UTC+06:30)**. New bookings must be future whole-hour ranges of at least one hour within one operating day. Midnight closing (`close:24`) is supported; overnight operating schedules are not supported in this version. PENDING and CONFIRMED ranges block availability, CANCELLED does not. Adjacent bookings are allowed.

### `POST /api/bookings` 🔒

Body: `{ courtId: string, startsAt: ISO datetime with timezone, endsAt: ISO datetime with timezone, teamId?: string }`.
Example: `{ "courtId":"court-id", "startsAt":"2026-11-01T18:00:00+06:30", "endsAt":"2026-11-01T20:00:00+06:30" }`.
No slot creation or slot ID is required. `courtSlotId`-only requests are no longer accepted. The server checks team membership, active court, opening hours, pending/confirmed booking overlaps and owner-blocked periods. Per-court transaction locks serialize booking and block creation, including simultaneous requests. Overlaps return `409`; invalid hours/ranges or inactive court return `400`; foreign team returns `403`; unknown court returns `404`.
`totalPrice` = current court hourly rate × duration in hours, stored permanently. Success: `201 { success:true, booking }` (PENDING, includes court and team).

### `GET /api/bookings/me` 🔒

Own bookings, newest first, with direct start/end timestamps, court id/name/city and team id/name. → `200 { success:true, bookings }`.

### `PATCH /api/bookings/:id/cancel` 🔒

Cancels caller's own booking and sets `cancelledAt`; releases its time. Errors: `404` missing, `403` not caller's booking, `400` already cancelled. → `200 { success:true, booking }`.

### `GET /api/bookings/owner` 👑

Bookings on caller-owned courts, newest first, including direct timestamps, court, player id/email and team. → `200 { success:true, bookings }`.

### `PATCH /api/bookings/owner/:id/status` 👑

Body: `{ status: "PENDING"|"CONFIRMED"|"CANCELLED" }`. Court-owner-or-admin only. CANCELLED releases time and sets `cancelledAt`. Cancelled bookings cannot be reopened; create a new request instead. Missing `404`, foreign owner `403`, reopen `400`, concurrent/already cancelled update `409`. → `200 { success:true, booking }`.

### Weekly operating hours

Court create/update accepts optional `openingHours`: exactly seven unique `{ day:0..6, open:0..23, close:1..24, closed:boolean }` entries (Sunday=0). An open day's closing hour must follow its opening hour. Default: 08:00–23:00 every day. Closing a day or changing hours/rate affects new requests only; existing reservations and totals stay unchanged.

### `GET /api/courts/:id/availability?date=YYYY-MM-DD` 🔓

Returns `{ success:true, openingHours, isActive, busy:[{ startsAt, endsAt }] }` for the Yangon calendar day. Includes active bookings and blocked periods, but never player identities or private block reasons. Invalid/missing date `400`; unknown court `404`.

### `GET /api/courts/:id/blocks` 👑

Owner-or-admin only. Upcoming blocked periods with IDs, timestamps and private reasons. → `{ success:true, blocks }`.

### `POST /api/courts/:id/blocks` 👑

Body: `{ startsAt, endsAt, reason: string(1..200) }`. Future whole-hour range, maximum 24 hours. Rejects overlaps with active bookings or blocks (`409`). Uses the same court transaction lock as booking creation. → `201 { success:true, block }`.

### `DELETE /api/courts/:id/blocks/:blockId` 👑

Court-owner-or-admin only; block must belong to court. Removes the block and releases time. Missing court/block `404`, unauthorized `403`. → `200 { success:true }`.

## Events (`/api/events`)

### `GET /api/events?courtId=&type=&city=&when=` 🔓

Optional filters:
- `courtId` — exact court id.
- `type` — `TOURNAMENT|COMPETITION|DISCOUNT|PRICE_CHANGE`.
- `city` — case-insensitive substring match on the court city.
- `when` — `upcoming` (`endDate >= now`, `startDate` asc) or `past` (`endDate < now`, `startDate` desc).

Without `when`, all events are returned ordered by `startDate` asc. Includes court id/name/city. → `200 { success:true, events }`.

### `GET /api/events/suggest?q=` 🔓

Typeahead suggestions for events by title or court city (case-insensitive contains, max 8). Empty `q` → `{ success:true, items:[] }`.
Success: `200 { success:true, items:[{id,title,city}] }`.

### `GET /api/events/:id` 🔓

Public event detail. Includes the court `id`, `name`, `city`, `address`, `sportType`, and `basePricePerHour`.
Errors: `404 Event not found`.
Success: `200 { success:true, event }`.

### `GET /api/events/owner/me` 👑

Management list, newest start date first, including court id/name/city. Owners receive only events for courts they own (including events published by an admin); admins receive all events. Ownership comes from the authenticated session; query parameters cannot override it.
Success: `200 { success:true, events }`.

### `GET /api/events/owner/me/:id` 👑

Management detail with court id/name/city, subject to the same ownership scope. Unknown or other-owner event: `404 Event not found`.
Success: `200 { success:true, event }`.

### `POST /api/events` 👑

Body: `{ courtId: string, title: string(min 1), type: "TOURNAMENT"|"COMPETITION"|"DISCOUNT"|"PRICE_CHANGE", description?, startDate: string(datetime), endDate: string(datetime) }`.
Validation: `endDate` must be after `startDate` (`400` with field `endDate`).
Errors: `404 Court not found`, `403 Not authorized to create events for this court` (must own the court unless admin).
Success: `201 { success:true, event }` (+court id/name).

### `PUT /api/events/:id` 👑

Partial update `{ title?, type?, description?, startDate?, endDate? }`. The resulting `endDate` must be after `startDate` (`400`), including when only one date is sent. An empty description clears the description. Court owner or admin only.
Errors: `404 Event not found`, `403 Not authorized to update this event`.
Success: `200 { success:true, event }`.

### `DELETE /api/events/:id` 👑

Errors: `404 Event not found`, `403 Not authorized to delete this event`.
Success: `200 { success:true, message:"Event deleted" }`.

## Reviews (`/api/reviews`)

### `GET /api/reviews/:courtId` 🔓

All reviews for a court, newest first (reviewer id/email + playerProfile). No court-exists check — unknown id returns `200 { success:true, reviews:[] }`.

### `POST /api/reviews` 🔒

Body: `{ courtId: string, rating: number(1–5), comment? }`. One review per user per court (`@@unique(courtId,userId)`).
Errors: `404 Court not found`, `400 You have already reviewed this court`, `400 Validation error` (rating out of range).
Success: `201 { success:true, review }` (+user id/email).

### `PATCH /api/reviews/:id` 🔒

**Added 2026-10-18.** Author-only update of own review. Body: at least one of `{ rating?: number(1–5), comment?: string|null }` (`null` clears the comment).
Errors: `404 Review not found`, `403 Not authorized to update this review`, `400 Provide rating and/or comment to update`, `400 Validation error`.
Success: `200 { success:true, review }` (+user id/email).

### `DELETE /api/reviews/:id` 🔒

**Added 2026-10-18.** Author-or-admin only. Deleting frees the user to post a new review for that court (the `@@unique(courtId,userId)` row is removed).
Errors: `404 Review not found`, `403 Not authorized to delete this review`.
Success: `200 { success:true, message:"Review deleted" }`.

## Admin (`/api/admin`) — all 🛡 ADMIN

### `GET /api/admin/users` 🛡

**Added 2026-10-19.** All users, newest first. Each: `{ id, email, role, isActive, createdAt, _count:{ ownedCourts, bookings } }`.
Success: `200 { success:true, users }`.

### `GET /api/admin/courts` 🛡

**Added 2026-10-19.** All courts including inactive ones, newest first. Each: `{ id, name, city, sportType, basePricePerHour, isActive, createdAt, owner:{ id, email }, _count:{ bookings, reviews } }`.
Success: `200 { success:true, courts }`.

### `GET /api/admin/stats` 🛡

**Added 2026-10-19.** Dashboard counters: `{ users, courts, bookings, events, activeCourts, pendingBookings, recentBookings }`. `recentBookings` is the latest 5 with `{ id, status, totalPrice, bookedAt, player:{ email }, court:{ name, city } }`.
Success: `200 { success:true, stats }`.

### `PATCH /api/admin/courts/:id/toggle` 🛡

Flips `Court.isActive`. Deactivated courts vanish from public list/detail filters (`GET /courts` filters `isActive:true`). Errors: `401`, `403 Forbidden: insufficient role` (non-admin), `404 Court not found`.
Success: `200 { success:true, court, message:"Court activated|deactivated" }`.

### `PATCH /api/admin/users/:id/toggle` 🛡

Flips `User.isActive`. Errors: `401`, `403` (non-admin), `404 User not found`, `400 Cannot deactivate yourself` (self-deactivation only blocked when it would deactivate — an already-inactive admin re-toggling self back on is allowed, which is also the recovery path).
**Updated 2026-10-19:** deactivation now locks the account out immediately. `POST /api/auth/login` returns `403 Account deactivated. Contact support.` and `authenticate` does a per-request DB check, so an existing JWT stops working on the next call. Reactivating restores access.
Success: `200 { success:true, user:{id,email,role,isActive}, message:"User activated|deactivated" }`.

## Roles on the wire

As of 2026-10-19, **ADMIN is dashboard-only**, not a role superset. A verified admin session receives `403` for all non-admin resource APIs, including otherwise-public court/event/review browsing. Authentication/session/logout remain available. Anonymous public browsing and PLAYER/OWNER permissions are unchanged. This restriction supersedes older admin exceptions in endpoint descriptions above; those exceptions no longer grant access.

| Area | PLAYER | OWNER | ADMIN |
|---|---|---|---|
| Courts: browse, detail, slots, availability | ✅ | ✅ | ❌ |
| Courts: create / edit / delete / add slots / blocks | ❌ | own courts ✅ | ❌ |
| Bookings: create / my list / cancel own | ✅ | ✅ (existing API behavior) | ❌ |
| Bookings: owner list / set status | ❌ | own courts ✅ | ❌ |
| Events: browse / detail | ✅ | ✅ | ❌ |
| Events: management list / create / edit / delete | ❌ | own courts ✅ | ❌ |
| Reviews: list / create / author actions | ✅ | ✅ (existing API behavior) | ❌ |
| Teams / profile | ✅ | ✅ (existing API behavior) | ❌ |
| Player discovery / friends | ✅ | ❌ | ❌ |
| Admin lists / stats / toggles | ❌ | ❌ | ✅ |
| Auth / session / logout | ✅ | ✅ | ✅ |
