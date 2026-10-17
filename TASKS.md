# Tasks

## Baseline (implemented before tracking began - code-complete, NOT runtime-verified)
- Auth API + Login/Register UI (JWT cookie)
- Player profile API + MyProfile UI
- Friends API (send/list/pending/respond) - no UI
- Teams API (create/list/get/join/leave) - no UI
- Courts API (search/detail/slots) + Home, CourtDetail, CreateCourt UI
- Bookings API + MyBookings, OwnerBookings UI
- Events API + public Events list UI
- Reviews API + display in CourtDetail (no create UI)

## Active Tasks

### T001 - Fix server start scripts
- Status: DONE (2026-10-17)
- Expected: `npm run dev` in server/ actually serves the API (currently runs src/app.ts which never calls listen(); only index.ts does). Same bug in `npm start` (runs dist/src/app.js).
- Check: `curl localhost:3000/health` returns ok after `npm run dev`
- Dependencies: none
- Result: changed dev to `tsx watch src/index.ts`, start/main to `dist/src/index.js`. Verified `npm run dev` boots and /health returns ok. Full API runtime-verified same day (see PROGRESS.md). Browser click-through confirmed by user (2026-10-17).

### T002 - Initial git commit
- Status: DONE
- Expected: baseline snapshot committed (repo currently has zero commits)
- Check: git log shows one commit; working tree clean
- Dependencies: none

### T003 - Owner My Courts page (/owner/courts)
- Status: DONE (2026-10-17)
- Expected: owner can list their courts, edit, delete/deactivate, and add time slots (date, start/end, price). Fixes dead redirect after CreateCourt (navigates to /owner/courts, which does not exist). Add Navbar link for owners.
- Check: create court -> lands on /owner/courts; add slot there; slot appears on public court page
- Dependencies: T001 (needed to verify)
- Result: created client/src/pages/OwnerCourts.tsx (list + inline edit form, activate/deactivate toggle, delete with confirm, inline add-slot form); route added in App.tsx; Navbar link already existed. Verified: tsc --noEmit clean, vite build clean, API smoke test against live server (owner login, GET /courts/owner/me shape matches, POST /courts/:id/slots with local-noon ISO date accepted, new slot appears in public GET /courts/:id/slots?date=). UI click-through confirmed by user (2026-10-17).

### T004 - Owner event creation page (/owner/events/create)
- Status: DONE (2026-10-17)
- Expected: form (court from owner's courts, title, type, description, start/end dates). Events page currently links here but the route/page does not exist.
- Check: owner can create an event and see it in the public Events list
- Dependencies: T001
- Result: created client/src/pages/CreateEvent.tsx (court select from GET /courts/owner/me with empty-state link to court creation, title, type select, optional description, datetime-local start/end with end-after-start validation, react-hook-form + zod like other pages). datetime-local values converted via toISOString() to satisfy the API's z.string().datetime(). Route added in App.tsx under ProtectedRoute; page itself gates on OWNER role. Verified: tsc --noEmit clean, vite build clean, live API smoke test (owner login, POST /events with the exact payload the page sends -> 201, event appears in public GET /events; test events deleted afterwards). UI click-through confirmed by user (2026-10-17).

### T005 - Review creation UI on CourtDetail
- Status: DONE (2026-10-17)
- Expected: logged-in players submit rating (1-5) + optional comment; friendly error on duplicate review
- Check: submit review -> appears in review list with correct rating
- Dependencies: T001
- Result: review form added inside the Reviews card on client/src/pages/CourtDetail.tsx (rating select 1-5 with stars, optional comment, react-hook-form + zod with coerced numeric rating). Shown only to logged-in PLAYERs who haven't reviewed; others see a login link or "You've already reviewed this court." note; owners/others see nothing. Duplicate error surfaces the server message as a toast; list refreshes via fetchCourt() after posting. Verified: tsc --noEmit clean, vite build clean, live API smoke test with fresh user revtest@test.com (POST /reviews -> 201, second POST -> 400 "You have already reviewed this court", review visible in GET /courts/:id). UI click-through confirmed by user (2026-10-17).

### T006 - Friends UI (/friends)
- Status: DONE (2026-10-17)
- Expected: list friends, view pending requests, accept/decline, send request. Note: backend sendFriendRequest needs receiverId only (no user search endpoint) - add a minimal user-search or id-input method.
- Check: two users can friend each other via the UI
- Dependencies: T001
- Result: created client/src/pages/Friends.tsx (search-by-email to send requests, pending requests with Accept/Decline, My Friends list showing display name or email; route in App.tsx under ProtectedRoute; Navbar link for logged-in users). Backend: added minimal authenticated GET /api/players/search?q= (email contains, insensitive, excludes self, max 10) in controllers/players.ts; FIXED route-ordering bug in routes/players.ts where GET /:id captured GET /friends and made the friends-list endpoint unreachable (404 "Player not found"); friend + search routes now precede /:id. Note: server-side decline sets status BLOCKED (request vanishes from both pending and friends lists) - existing behavior, kept as-is. Verified: server tsc --noEmit clean, client tsc clean + vite build clean, live API smoke test of the exact UI flow (search finds player@ from revtest@ excluding self; revtest sends request -> player@ sees it in pending -> accepts -> BOTH friend lists show each other; decline path: owner@ declines revtest request -> disappears from pending, not in friends). UI click-through not done (needs browser).

### T007 - Teams UI (/teams)
- Status: DONE (2026-10-17)
- Expected: list teams, create, join, leave; optional team selection when booking a slot (backend already accepts teamId)
- Check: create team -> join with second user -> booking carries teamId
- Dependencies: T001
- Result: created client/src/pages/Teams.tsx (team list with sport filter ALL/FUTSAL/ELEVEN_A_SIDE via GET /teams?sportType=, create-team form with react-hook-form + zod, Join button for non-members, Leave for members, "Captains can't leave" hint for captains, member chips with captain marker); route /teams in App.tsx under ProtectedRoute; Navbar "Teams" link (Trophy icon) for logged-in users. CourtDetail.tsx: logged-in PLAYERs with teams see a "Book with team (optional)" select above the slots; Book Now sends teamId when selected (hidden when the player has no teams). Verified: client `npx tsc --noEmit` clean, `npm run build` clean, live API smoke test of the exact check flow (player@ creates team -> revtest@ joins -> GET /teams shows both members -> revtest@ POST /bookings with teamId -> booking created PENDING with teamId set and team relation in /bookings/me). Test data: booking cancelled afterwards (slot freed); test team "T007 Smoke Squad" left in DB (captain player@; revtest@ left it) - no team-delete endpoint exists. UI click-through not done (needs browser).

### T008 - Admin moderation (future)
- Status: DONE (2026-10-17)
- Expected: ADMIN can deactivate courts/users
- Check: admin action takes effect
- Dependencies: T001
- Result: Added `isActive` to User model + migration. New `PATCH /api/admin/courts/:id/toggle` and `PATCH /api/admin/users/:id/toggle` endpoints (authenticate + authorize ADMIN). Guards: 404 not found, 403 non-admin, 401 unauthenticated, 400 self-deactivation. Verified live: court toggle (deactivate→activate), user toggle (deactivate→activate), persistence in DB, all error cases return correct status codes. DB restored to original state after testing.

### T009 - Backend API tests
- Status: DONE (2026-10-17)
- Expected: automated tests covering auth, bookings (incl. slot double-booking guard), reviews
- Check: test command passes locally
- Dependencies: T001
- Result: `npm test` → 21/21 pass across auth.test.ts, bookings.test.ts, reviews.test.ts. Tests import `app` directly on an ephemeral port (no new deps beyond tsx, already present), use unique per-run emails, clean all created data in FK-safe order (verified: 0 leftover users/courts/teams). Added `"test": "tsx --test src/tests/*.test.ts"` script to server/package.json. One test's message assertion was relaxed to match real server behavior (double-booking returns 400 "Slot is not available" because isAvailable flips before the existing-booking check — guard still works).

### T010 - Linting & formatting
- Status: DONE (2026-10-17)
- Expected: ESLint + Prettier configured for client/ and server/, consistent with existing code style
- Check: lint command runs clean on current code
- Dependencies: none
- Result: `npm run lint` exits 0 in both projects (client: 0 errors / 38 warnings; server: 0 errors / 13 warnings; all warnings are `no-explicit-any` + `exhaustive-deps` style, intentional). Fixed 25 client errors: removed unused lucide-react imports (Navbar, CourtDetail, CreateCourt, Home, MyBookings, MyProfile, Login, Register) + unused `user` in booking pages, and moved fetch helpers above their `useEffect` in 10 pages. Follow-up find: the v7 `react-hooks/set-state-in-effect` rule flags the standard fetch-on-mount pattern, so one targeted disable comment was added per fetch effect (behavior unchanged). Verified: client `npm run build` clean.

### T011 - Documentation (docs/)
- Status: TODO
- Expected: API reference (all /api routes: methods, auth, payloads) and data model overview based on prisma/schema.prisma
- Check: docs match actual routes; links from README
- Dependencies: none
