# API reference

Base URL: `http://localhost:3000`. All API routes are prefixed with `/api`.
Frontend calls `/api/*` (Vite dev server proxies `/api` → `http://localhost:3000`).

Source of truth: `server/src/routes/*` + `server/src/controllers/*`. Last verified 2026-10-19 (admin list/stats endpoints + immediate `isActive` lockout — see entries marked “Added 2026-10-19”).

## Conventions

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

### `GET /api/players/me` 🔒

Own player profile (may be `null` when never saved). → `200 { success:true, profile }`.

### `PUT /api/players/me` 🔒

Upsert own profile. Body: `{ fullName?, phone?, position?, skillLevel?, bio?, avatarUrl? }` — strings except `avatarUrl`, which must be a valid URL string or `null` (clears it). Added 2026-10-18; before that the schema rejected `avatarUrl`. → `200 { success:true, profile }`.

### `GET /api/players/search?q=<email-fragment>` 🔒

Find users by email (case-insensitive, excludes self, max 10). Empty `q` → `{ success:true, users:[] }`.
Success: `200 { success:true, users:[{id,email,role,playerProfile:{fullName}}] }`.

### `POST /api/players/friends/request` 🔒

Body: `{ receiverId: string }`.
Errors: `400 Cannot send friend request to yourself`, `404 User not found` (receiver id), `400 Friend request already exists` (a row exists in either direction, any status).
Success: `201 { success:true, friend }` (`status: PENDING`).

### `GET /api/players/friends` 🔒

Accepted friendships in either direction (sender or receiver) with both users + their profiles.
→ `200 { success:true, friends }`.

### `GET /api/players/friends/pending` 🔒

Incoming pending requests where the caller is the receiver. → `200 { success:true, requests }`.

### `PUT /api/players/friends/:id/respond` 🔒

Body: `{ accept: boolean }`. Accept → `ACCEPTED`; decline → `BLOCKED` (declined requests disappear from both lists — no re-request possible while the row exists).
Errors: `404 Friend request not found`, `403 Not authorized to respond to this request` (only the receiver).
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

### `GET /api/courts/:id` 🔓

Court detail with owner, future slots (`date >= now`, ordered by date+startTime), and reviews (newest first, with reviewer id/email). Errors: `404 Court not found`. → `200 { success:true, court }`.

### `GET /api/courts/:id/slots?date=` 🔓

Slots for a court, ordered by date+startTime. Optional `?date=<parseable date>` filters to that calendar day (server-local 00:00–23:59:59.999). No court-exists check — unknown id returns `200 { success:true, slots:[] }`.

### `GET /api/courts/owner/me` 🔒

Own courts (any `isActive`), each with latest 5 slots + latest 5 bookings. Note: registered **after** `/:id` but still works — `/owner/me` (2 segments) never collides with `/:id` (1 segment). → `200 { success:true, courts }`.

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

### `POST /api/courts/:id/slots` 👑

Body: `{ date: string(datetime, required), startTime: string(required, e.g. "19:00"), endTime: string(required), pricePerHour?: number(positive, defaults to court's basePricePerHour) }`.
No format/ordering validation on `startTime`/`endTime`, no overlap guard.
Errors: `404 Court not found`, `403 Not authorized to add slots to this court`.
Success: `201 { success:true, slot }`.

### `DELETE /api/courts/:id/slots/:slotId` 👑

**Added 2026-10-18.** Court-owner-or-admin only. The slot must belong to `:id`.
Bookings block deletion while active (`PENDING`/`CONFIRMED`); once all bookings on the slot are `CANCELLED`, they are removed with the slot in one transaction (the FK has no cascade).
Errors: `404 Court not found`, `403 Not authorized to delete slots on this court`, `404 Slot not found` (or slot on another court), `400 Cannot delete a slot with active bookings`.
Success: `200 { success:true, message:"Slot deleted" }`.

## Bookings (`/api/bookings`) — all 🔒

Lifecycle: booking starts `PENDING`; creating flips `CourtSlot.isAvailable=false`. Player-cancel or owner-set-`CANCELLED` flips it back to `true`. Nothing else re-opens a slot.

### `POST /api/bookings` 🔒

Body: `{ courtSlotId: string, teamId?: string }` (`teamId` requires caller membership).
Guards in order: `404 Court slot not found` → `400 Slot is not available` (slot flag) → `403 You are not a member of this team` → `400 Slot already booked` (live PENDING/CONFIRMED row).
`totalPrice` = slot's `pricePerHour`. Success: `201 { success:true, booking }` (`status: PENDING`, includes court, courtSlot, team).

### `GET /api/bookings/me` 🔒

Own bookings, newest first (court id/name/city, full slot, team id/name). → `200 { success:true, bookings }`.

### `PATCH /api/bookings/:id/cancel` 🔒

Player cancels **own** booking. Errors: `404 Booking not found`, `403 Not authorized to cancel this booking`, `400 Booking already cancelled`. Frees the slot. Success: `200 { success:true, booking }` (`status: CANCELLED`, `cancelledAt` set).

### `GET /api/bookings/owner` 👑

Bookings for courts owned by the caller, newest first (court id/name, full slot, player id/email, team id/name). → `200 { success:true, bookings }`.

### `PATCH /api/bookings/owner/:id/status` 👑

Body: `{ status: "PENDING"|"CONFIRMED"|"CANCELLED" }`. Court-owner-or-admin only. Setting `CANCELLED` from PENDING/CONFIRMED frees the slot (other transitions leave the flag untouched).
Errors: `404 Booking not found`, `403 Not authorized to update this booking`.
Success: `200 { success:true, booking }`.

## Events (`/api/events`)

### `GET /api/events?courtId=&type=&city=&when=` 🔓

Optional filters:
- `courtId` — exact court id.
- `type` — `TOURNAMENT|COMPETITION|DISCOUNT|PRICE_CHANGE`.
- `city` — case-insensitive substring match on the court city.
- `when` — `upcoming` (`endDate >= now`, `startDate` asc) or `past` (`endDate < now`, `startDate` desc).

Without `when`, all events are returned ordered by `startDate` asc. Includes court id/name/city. → `200 { success:true, events }`.

### `GET /api/events/:id` 🔓

Public event detail. Includes the court `id`, `name`, `city`, `address`, `sportType`, and `basePricePerHour`.
Errors: `404 Event not found`.
Success: `200 { success:true, event }`.

### `POST /api/events` 👑

Body: `{ courtId: string, title: string(min 1), type: "TOURNAMENT"|"COMPETITION"|"DISCOUNT"|"PRICE_CHANGE", description?, startDate: string(datetime), endDate: string(datetime) }`.
Validation: `endDate` must be after `startDate` (`400` with field `endDate`).
Errors: `404 Court not found`, `403 Not authorized to create events for this court` (must own the court unless admin).
Success: `201 { success:true, event }` (+court id/name).

### `PUT /api/events/:id` 👑

Partial update `{ title?, type?, description?, startDate?, endDate? }`. When both dates are sent, `endDate` must be after `startDate` (`400`).
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

| Area | PLAYER | OWNER | ADMIN |
|---|---|---|---|
| Courts: browse, detail, slots | ✅ | ✅ | ✅ |
| Courts: create / edit / delete / add slots | ❌ | own courts ✅ | any ✅ |
| Bookings: create / my list / cancel own | ✅ (any role technically — no role check) | ✅ | ✅ |
| Bookings: owner list / set status | ❌ | own courts ✅ | any ✅ |
| Events: list | ✅ | ✅ | ✅ |
| Events: create / edit / delete | ❌ | own courts ✅ | any ✅ |
| Reviews: list | ✅ | ✅ | ✅ |
| Reviews: create | ✅ (any logged-in role technically) | ✅ | ✅ |
| Teams / friends / profile | ✅ (any logged-in role) | ✅ | ✅ |
| Admin lists / stats / toggles | ❌ | ❌ | ✅ |

