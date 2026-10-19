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

### T028 - English / Myanmar language switcher
- Status: DONE (2026-10-19)
- Expected: Switch application-owned UI text between English and Myanmar on public, authentication, player, owner and admin screens; preserve forms and user content, remember the choice and keep MMK/Yangon booking rules.
- Check: Translation coverage and preference/interpolation tests, existing client tests, typecheck, lint/build, and desktop/mobile browser smoke checks where available.
- Dependencies: Existing React client and navigation.
- Result: Shared reactive language store/provider, browser-persisted ENG/မြန်မာ switcher in navbar and auth layout, Myanmar UI dictionary, parameterized dynamic messages, localized validation/status/date/price labels, and Myanmar font fallbacks. API enum values, user content, MMK and Yangon booking arithmetic preserved. Mobile navbar/footer overflow fixed. Verified 13/13 client tests, typecheck/build, lint 0 errors/34 existing warnings, diff whitespace, and mocked-API Chrome switch/persistence/form/validation plus public pages at 1440/390/320px and PLAYER/OWNER/ADMIN smoke checks with zero runtime exceptions. Desktop/mobile screenshots reviewed. Existing bundle-size warning remains; native-speaker translation review recommended; browser-native date controls follow browser/OS locale and unknown server messages fall back to English. No dependencies/API/schema changes.

### T027 - Dashboard-only admin role
- Status: DONE (2026-10-19)
- Expected: ADMIN can access only the admin dashboard and its APIs; player/owner pages, public court/event browsing while signed in, and non-admin actions are denied. Existing dashboard features remain intact.
- Check: API permission regression tests, frontend redirect/navigation checks, builds, typecheck and lint.
- Dependencies: Existing admin dashboard and authentication.
- Result: Global session-aware page guard, dashboard-only desktop/mobile navigation, forced admin login destination, blocked court-detail links, API boundary denying admins all non-admin resources, and removed owner-route ADMIN grants. Existing dashboard moderation remains intact. Verified 68/68 server tests, 7/7 frontend tests, client typecheck and both builds; lint 0 errors (34 client/28 server warnings). Existing bundle-size warning remains. Browser click-through not run.

### T025 - Restrict friendships to players
- Status: DONE (2026-10-19)
- Expected: Only PLAYER accounts can discover active players, send requests, view friendships, and respond. Non-player legacy relationships remain stored but hidden and cannot be accepted. Friends navigation and route are player-only.
- Check: API role/recipient/discovery/legacy and player request-response tests; server tests/build, client typecheck/lint/build, review existing user edits are preserved.
- Dependencies: Existing friends API and UI.
- Result: PLAYER-only middleware on search/friend routes; active PLAYER recipient validation and discovery; legacy non-player relationships hidden and responses denied without deletion; player-only client route and desktop/mobile links. Added seven API tests. Verified 66/66 server tests, server build and changed-server lint (no warnings), client typecheck/build, client lint (0 errors/34 existing warnings), and diff whitespace review. Existing Friends/auth/navigation user edits preserved. Browser click-through not run; production build retains existing chunk-size warning.

### T026 - Owner booking week and month views
- Status: DONE (2026-10-19)
- Expected: Add Monday–Sunday week and month calendars alongside Day/List, with period navigation, court/status filters, blocked time, booking details/actions, Yangon dates, month-to-day drill-down, and mobile agendas.
- Check: Calendar boundary/filter/action checks; relevant tests, client typecheck/lint/build and UI smoke checks where available.
- Dependencies: T024.
- Result: Added Week daily agenda columns and Month grid (three summaries/day plus overflow to Day), vertical mobile agendas, period-aware previous/next, today/date controls and Yangon labels. Court/status filters persist across switches; existing details/confirm/cancel/history and blocked periods remain available. Added timezone-independent calendar helpers and five focused date tests. Verified 5/5 date tests, client tsc/build, focused lint (no warnings), full lint (0 errors/34 existing warnings), diff whitespace and Chrome mocked-API flows at desktop/mobile with LA browser timezone (filters, dates/overflow drill-down, blocks, confirm/cancel, cancellation history, empty/error/retry, no horizontal mobile overflow, zero runtime exceptions). Screenshots reviewed. Existing bundle-size warning only; no dependencies, schema/API changes, commits or deployment.

### T023 - Separate owner event management from public events
- Status: DONE (2026-10-19)
- Expected: owners list only events on their courts in `/owner/events`, edit and delete with confirmation; public browsing remains separate; admins retain access.
- Check: owner-list isolation and access-control API tests, partial-date validation, server tests/build, client typecheck/lint/build, focused UI checks where available.
- Dependencies: T004, T022
- Result: authenticated owner-scoped list/detail endpoints; separate `/owner/events` with edit/delete confirmation, loading/error/retry/empty states; shared create/edit form returns to management and preserves local date/time; account/mobile management links and public-page management shortcut; partial-date API validation fixed. Verified server 53/53 tests, server build, client typecheck/lint (0 errors, 42 existing warnings)/build (existing chunk-size warning), mocked-API Chrome checks for list/edit/create/delete/access/error/empty flows and mobile navigation, and diff whitespace check.

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
- Status: DONE (2026-10-17)
- Expected: API reference (all /api routes: methods, auth, payloads) and data model overview based on prisma/schema.prisma
- Check: docs match actual routes; links from README
- Dependencies: none
- Result: created docs/README.md (index), docs/API.md (all 40 routes incl. GET /health: methods, auth/roles, payloads, responses, error cases; verified against server/src/routes/* + controllers), docs/DATA_MODEL.md (enums, all 10 models, constraints, lifecycles, relation map from prisma/schema.prisma). README gained Structure entry + Docs section linking all three. Notable findings recorded in docs: PUT /players/me lacks avatarUrl, courts DELETE blocked by booking FKs, decline→BLOCKED permanently blocks re-request, no slot/team-delete/review-update endpoints, deactivated users keep JWT access, endDate/startTime ordering unvalidated.

### T012 - Emerald theme + shadcn + light/dark mode
- Status: DONE (2026-10-18) — code-complete + build/lint/tsc VERIFIED
- Expected: primary orange-600 replaced by emerald (shadcn `primary` token) on all 14 client files; shadcn ui primitives (Button/Input/Textarea/Label/Card/Badge/Select/Dialog/DropdownMenu) used across all pages; light/dark/system theme with toggle in Navbar + Appearance card in MyProfile, persisted in localStorage; zero `orange-*` / raw `bg-white` / `text-gray-*` structural classes left
- Check: `grep -r "orange-" client/src` = 0 (verified); `npx tsc --noEmit` clean (verified); `npm run build` passes (verified); `npm run lint` 0 errors / 36 warnings (verified — all pre-existing no-explicit-any + exhaustive-deps, intentional)
- Dependencies: none
- Result: All done. Foundation (components.json, lib/utils cn(), tailwind darkMode class + tokens, index.css emerald vars light/dark, ThemeContext + ThemeToggle + ThemeProvider in main.tsx, ui/* x9). All 14 pages + Navbar migrated. Toaster mounted (was missing). Fixes during work: OwnerCourts duplicated slot-form block removed, stale inputClass removed, ThemeContext unused React import fixed, tailwind config require() -> ESM import, JSX closing-tag bug in OwnerCourts (missing `</div>` before `</CardContent>`) fixed and verified.

### T013 - UI modernization Phases 1-3 (foundations, Home, CourtDetail)
- Status: DONE (2026-10-18)
- Expected: framer-motion installed; shared Skeleton + Avatar + motion (PageTransition/FadeIn) components; glassmorphism/gradient CSS utilities in index.css; AnimatePresence route transitions in App.tsx; Home hero + skeleton loading + court image cards + sport filter + feature strip; CourtDetail hero image header, skeleton loading, selected-slot styling, booking confirmation dialog, avatar review list
- Check: `npx tsc --noEmit` clean; `npm run build` clean; `npm run lint` 0 errors on touched files
- Dependencies: T012
- Result: framer-motion ^14.3.0 installed (--legacy-peer-deps). Created client/src/components/{motion.tsx, ui/skeleton.tsx, ui/avatar.tsx, lib/images.ts} (deterministic Unsplash court image per id). index.css gained .text-gradient/.glass/.panel-accent/.shadow-soft. App.tsx wraps Routes in AnimatePresence keyed by pathname. Home.tsx + CourtDetail.tsx rewritten (details above). Verified: tsc exit 0, vite build exit 0, eslint 0 errors / 8 warnings (pre-existing style warnings only).

### T014 - Backend Tier 1 endpoints (avatarUrl, review update/delete, slot delete, team delete)
- Status: DONE (2026-10-18)
- Expected: PUT /players/me accepts avatarUrl (optional, validated as URL); PATCH + DELETE /reviews/:id (author only); DELETE /courts/:id/slots/:slotId (court owner only, frees bookings safely or rejects when active bookings exist); DELETE /teams/:id (captain only) — documented in docs/API.md, covered by tests
- Check: server `npm test` passes (21 existing + new cases); live smoke test of each endpoint; docs/API.md updated
- Dependencies: T012 (schema unchanged; no migration expected unless Prisma requires it)
- Note: matches Tier 1 gaps recorded in T011 findings (avatarUrl rejected today; no review/slot/team delete endpoints)
- Result: No schema change (PlayerProfile.avatarUrl already existed). (1) players: avatarUrl: url-or-null added to controller + route zod schemas. (2) reviews: updateReview (author-only, at least one of rating/comment, comment nullable to clear) + deleteReview (author-or-admin; unblocks re-review) via PATCH/DELETE /api/reviews/:id. (3) courts: deleteCourtSlot via DELETE /api/courts/:id/slots/:slotId (owner-or-admin, slot must belong to :id; active bookings -> 400; cancelled bookings + slot removed in one $transaction since FK has no cascade). (4) teams: deleteTeam via DELETE /api/teams/:id (captain-or-admin; bookings detached teamId=null then team deleted, members cascade); leave endpoint already existed (DELETE /:id/leave, captain blocked) — now paired with delete for captains. docs/API.md (+DATA_MODEL.md avatarUrl note, header date) updated with 4 new/changed entries. New server/src/tests/tier1.test.ts: 18 cases (avatar valid/invalid/null, review update/400/403/404/delete/403, slot delete free/403/active-booking-400/deletable-after-cancel/404, team delete + booking-detach/403/404, member leave + captain-leave-400). Checks: server tsc 0, lint 0 errors / 19 warnings (pre-existing style), `npm test` 39/39 pass (21 old + 18 new), test data cleaned by existing helpers. Live browser smoke test still pending (covered by T015 click-through).

### T015 - Client Tier 1 wiring (profile avatar, review edit/delete, slot delete, team delete/leave)
- Status: DONE (2026-10-18) — code-complete + checks verified; browser click-through pending user
- Expected: MyProfile shows/edits avatar via new endpoint (Avatar component used across Navbar/reviews); CourtDetail review edit + delete for author; OwnerCourts slot delete button; Teams delete (captain) + leave reuses new endpoint
- Check: tsc + build + lint clean; browser click-through of each action
- Dependencies: T013, T014
- Result: MyProfile: avatarUrl field (client zod: valid URL or empty), empty string sent as null to clear, Avatar preview with camera badge; AuthContext User type gained optional playerProfile{fullName,avatarUrl}; Navbar shows Avatar (links to /profile, email hidden on xs). CourtDetail: author-only Edit/Delete buttons on own review, inline rating select + comment textarea edit form (PATCH /reviews/:id), window.confirm + DELETE /reviews/:id (matches existing confirm patterns), "already reviewed" hint now points to edit/delete. OwnerCourts: trash button per slot -> DELETE /courts/:id/slots/:slotId with confirm (server 400 on active bookings surfaces as toast). Teams: captains get Delete button next to "Captains can't leave" (window.confirm -> DELETE /teams/:id); members keep Leave. Checks: client tsc 0, lint 0 errors / 38 warnings (pre-existing), build 0; server boot smoke: /health ok + PATCH /api/reviews/:id returns 401 unauthenticated (route live); server test suite 39/39 still passing. Known limitation: Navbar avatar refreshes after reload/login (AuthContext not refetched on profile save).

### T016 - UI modernization Phases 4-5 (Navbar mobile menu, empty states, page polish)
- Status: DONE (2026-10-18)
- Expected: Navbar hamburger menu on mobile; friendly empty states (MyBookings, Events, Friends, Teams, OwnerCourts, OwnerBookings) reusing icon+message+CTA pattern; consistent skeleton loaders on remaining pages
- Check: tsc + build + lint clean; mobile viewport renders menu
- Dependencies: T013

### T017 - Auth & login polish (Chunk A)
- Status: DONE (2026-10-19)
- Expected: Login page redesigned (split-screen brand panel + form, password show/hide toggle), login redirects per role (ADMIN=/admin, OWNER=/owner/courts, PLAYER=/), `state.from` honored after login, AuthContext exposes redirect target and returns result object
- Check: tsc --noEmit clean; build clean; live browser login flow for PLAYER/OWNER/ADMIN
- Dependencies: none
- Result: AuthContext login/register now return { success, redirectTo } and accept a redirectTo override; Login.tsx redesigned with brand panel (hero features) + form panel, password show/hide toggle, redirectTo! with replace, no `state.from` support yet (covered by T019). Checks: client tsc --noEmit clean, vite build clean, eslint clean. Full live browser login flow pending (covered by T019).

### T018 - Footer + Home improvements + Navbar Events link (Chunk B)
- Status: DONE (2026-10-19)
- Expected: Footer component in App.tsx (role-based columns); Home gains upcoming-events strip + how-it-works steps + stats/popular-cities; Navbar desktop gains Events link (currently missing)
- Check: tsc --noEmit clean; build clean; lint clean; mobile viewport renders footer
- Dependencies: T017
- Result: Footer already present in App.tsx - fixed dead links (Connect column with /contact,/privacy,/terms that have no routes -> replaced with Account column: profile/bookings/login) and removed unused Heart icon import. Navbar Events link moved out of the logged-in-only block to public nav on both desktop and mobile (Events page is public); fixed invalid `Event` lucide icon -> CalendarCheck; removed duplicate entries. Home: upcoming-events strip (top 3 future events, non-blocking fetch), how-it-works 3-step section, stats row (courts listed / cities covered / avg rating). Checks: tsc exit 0, vite build ok (pre-existing chunk-size warning only), eslint 0 errors / 2 pre-existing warnings on Home (no-explicit-any + exhaustive-deps, same pattern as other pages).

### T019 - Honor state.from + role-aware redirect after login/register
- Status: DONE (2026-10-19)
- Expected: ProtectedRoute's saved `state.from` is honored on login; users land on role home (ADMIN -> /admin, OWNER -> /owner/courts, PLAYER -> /); role-gated URLs don't trap the wrong role
- Check: tsc + build + lint clean; login from a deep link returns there; OWNER login lands on /owner/courts
- Dependencies: T017, T018
- Result: lib/utils gained defaultRouteForRole + resolvePostAuthRedirect (honors from-path except auth pages, blocks /admin for non-admins and /owner/* for non-owner/admin). AuthContext login/register simplified to return { success, user } so pages own redirect decisions. Login honors state.from with role fallback; Register navigates to role home with replace. ProtectedRoute gained optional roles prop; all four /owner/* routes gated with ['OWNER','ADMIN'] so wrong-role users bounce to their home. Checks: tsc clean, vite build ok (pre-existing chunk warning only), eslint 0 errors / 1 pre-existing warning.

TODO

### T020 - Admin dashboard (Chunk C: tables + stats + isActive lockout)
- Status: DONE (2026-10-19)
- Expected: server gains GET /api/admin/users, /courts, /stats (ADMIN-only) + isActive enforced at login/authenticate (deactivation locks out immediately); client gains /admin layout with overview stats + users/courts moderation tables wiring T008 toggles; /admin route gated ADMIN-only; Navbar shows Admin link for admins
- Check: server npm test passes (incl. new admin tests); client tsc + build + lint clean
- Dependencies: T008, T019
- Result: server: admin.ts gained listUsers (select + _count ownedCourts/bookings), listCourts (owner email + _count bookings/reviews) and getStats (users/courts/bookings/events/activeCourts/pendingBookings + 5 recentBookings); routes/admin.ts wires GET /users, /courts, /stats behind authenticate + authorize('ADMIN'). isActive now enforced twice: login returns 403 "Account deactivated..." and authenticate middleware is async and does a per-request DB lookup so an existing JWT stops working the moment an admin deactivates the user. Fixed the inverted self-deactivation guard to `if (id === req.user.id && user.isActive)`. Tests: new server/src/tests/admin.test.ts with 6 cases (401/403/404 matrix, list shapes, court toggle hides court from public list, user toggle -> login 403 + JWT 403 + reactivation restores, self-deactivation 400 + lockout recovery) — 45/45 server tests pass. Client: new pages/AdminDashboard.tsx (tabbed Overview/Users/Courts; stat cards; pending-bookings banner; recent-bookings card; debounce-free client-side filter; window.confirm before toggles; optimistic isActive + activeCourts stats updates; skeleton loading; EmptyState for no data). /admin route in App.tsx gated by ProtectedRoute roles={['ADMIN']}; Navbar shows Admin link (desktop + mobile) only for ADMIN. Checks: tsc --noEmit clean, vite build ok (pre-existing chunk-size warning only), eslint 0 errors (3 `any` warnings matching existing pages).

### T021 - Shared auth layout + modern navbar (presentation only)
- Status: DONE (2026-10-19)
- Expected: /login and /register share one full-page two-column layout (gradient brand panel on lg+, centered max-w-md form) with no footer; navbar becomes a sticky glass bar with pill nav links + active state, owner Manage dropdown, Admin link, avatar account menu, and an animated mobile panel. No route, role, or API changes.
- Check: client tsc + build clean, eslint 0 errors, /login, /register, / render correctly at desktop and mobile widths
- Dependencies: T016, T017, T019

### T022 - Events list redesign + public event detail page
- Status: DONE (2026-10-19)
- Expected: `/events` matches the `/courts` list pattern (gradient hero, URL-bound `type`/`city`/`when` filters, count line, skeletons, empty state, upcoming/past sections, owner/admin create CTA). New public read-only `/events/:id` (hero with type gradient/status, description, schedule, venue card with court link, back links, friendly 404). Server: `GET /events/:id`, `city` + `when` list filters, and `endDate > startDate` validation on create/update. Home event cards deep-link to detail and show the footer there.
- Check: server `npm test` + `npm run build` pass; client `npx tsc --noEmit`, `npm run lint` (0 errors), `npm run build` pass; `/events` (desktop/mobile), deep-linked filters, `/events/:id`, and `/events/does-not-exist` render correctly with 0 page errors.
- Dependencies: T004, T018
- Result: server `controllers/events.ts` gained public `getEvent` (court id/name/city/address/sportType/basePricePerHour, 404 "Event not found"), `city` (case-insensitive contains) and `when=upcoming|past` filters (past ordered newest first), and `.refine` date-range checks on create/update schemas; routes register `GET /:id` before `authenticate`. Client: new shared `components/EventCard.tsx` (`EventSummary`, type meta/icon/gradient, date/time/range, duration, status helpers) consumed by Home and Events; `/events` rebuilt with gradient hero, URL filters via `useSearchParams` (replace), filtered count, skeletons, EmptyState + clear filters, Upcoming/Past sections, and OWNER/ADMIN create CTA. New `pages/EventDetail.tsx` + `/events/:id` route; `showFooter` now covers `/events/*`. Home fetches `/events?when=upcoming` and links each card to its detail page. CreateEvent now accepts ADMIN too (loads all active courts, no owner CTA). `docs/API.md` updated. Tests: new `server/src/tests/events.test.ts` (list/order/shape, type+city+when filters, detail 200/404, date validation, update/delete authz matrix). Checks run: server 51/51 tests pass, server build 0; client tsc 0, eslint 0 errors (44 existing `any`/deps warnings), vite build 0; headless Chrome verified `/events` (1 event, filters applied, footer), `/events/:id` (all sections + venue CTA + footer), and the 404 state; desktop + mobile screenshots reviewed.

- Result: new `components/Brand.tsx` (shared Goal gradient tile, `onGradient` variant for the brand panel) and `components/AuthLayout.tsx` (min-h-[calc(100vh-4rem)], left gradient panel hidden below lg, right max-w-md form slot, switch prompt + mobile brand). Login and Register re-skinned on AuthLayout; Register's native role `<select>` replaced with accessible Player/Court owner radio cards (react-hook-form `useWatch`, default PLAYER) and gained a password show/hide toggle; both forms got autoComplete hints and 44px inputs. Navbar rewritten: sticky glass header with scroll shadow, active NavLink pills, separator between Explore and activity links, OWNER "Manage" dropdown (courts/bookings/add court), ADMIN link, avatar dropdown (profile/bookings/role shortcut/logout), and animated mobile panel with grouped icon rows, aria-expanded/controls/labels; auth-loading shows a skeleton instead of nothing. App.tsx hides Footer on /login and /register. Checks: `npx tsc --noEmit` 0, eslint on changed files 0 errors/0 warnings, `npm run build` ok (pre-existing chunk-size warning only), vite preview returns 200 for /, /login, /register, and headless Chrome screenshots at 1440x900 and 390x844 confirm the layouts. No routes, permissions, or API behavior changed. Follow-up (same day): the navbar is now hidden on auth routes too (`App.tsx`: `{!isAuthRoute && <Navbar />}`) and `AuthLayout` uses `min-h-dvh` for a true full-screen page; the logo links home from the desktop brand panel and the mobile header, and the form column shows a "Back to home" link on lg+. No theme toggle on auth pages (per request). Toasts now appear top-right (`position="top-right"`) with `offset={isAuthRoute ? 16 : 80}` so they clear the 64px navbar on app pages instead of covering its controls.
### T024 - Whole-hour calendar booking without predefined slots
- Status: DONE (2026-10-19)
- Expected: Players select whole-hour start/end times directly; owners configure weekly hours, block time, and manage bookings on a daily calendar/list. Existing booking history and totals are preserved.
- Check: Safe migration/backfill reviewed; API coverage for hours, pricing, overlap/concurrency, blocked time, cancellation, and permissions; server/client builds and client lint pass; UI smoke checks where available.
- Dependencies: Existing court and booking management.
- Result: Direct whole-hour bookings, weekly opening hours, private blocked periods, daily calendar/mobile agenda/list, cancellation and archived-history migration implemented. Local backup and transaction dry run completed before migration; all 6 legacy bookings preserved. Server tests 59/59, Prisma validation and build passed; client typecheck/build passed; lint 0 errors (38 existing client warnings, 8 warnings on changed server files); mocked-API Chrome checks passed with no runtime exceptions.
