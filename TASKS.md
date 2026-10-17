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
- Result: changed dev to `tsx watch src/index.ts`, start/main to `dist/src/index.js`. Verified `npm run dev` boots and /health returns ok. Full API runtime-verified same day (see PROGRESS.md).

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
- Result: created client/src/pages/OwnerCourts.tsx (list + inline edit form, activate/deactivate toggle, delete with confirm, inline add-slot form); route added in App.tsx; Navbar link already existed. Verified: tsc --noEmit clean, vite build clean, API smoke test against live server (owner login, GET /courts/owner/me shape matches, POST /courts/:id/slots with local-noon ISO date accepted, new slot appears in public GET /courts/:id/slots?date=). UI click-through not done (needs browser).

### T004 - Owner event creation page (/owner/events/create)
- Status: TODO
- Expected: form (court from owner's courts, title, type, description, start/end dates). Events page currently links here but the route/page does not exist.
- Check: owner can create an event and see it in the public Events list
- Dependencies: T001

### T005 - Review creation UI on CourtDetail
- Status: TODO
- Expected: logged-in players submit rating (1-5) + optional comment; friendly error on duplicate review
- Check: submit review -> appears in review list with correct rating
- Dependencies: T001

### T006 - Friends UI (/friends)
- Status: TODO
- Expected: list friends, view pending requests, accept/decline, send request. Note: backend sendFriendRequest needs receiverId only (no user search endpoint) - add a minimal user-search or id-input method.
- Check: two users can friend each other via the UI
- Dependencies: T001

### T007 - Teams UI (/teams)
- Status: TODO
- Expected: list teams, create, join, leave; optional team selection when booking a slot (backend already accepts teamId)
- Check: create team -> join with second user -> booking carries teamId
- Dependencies: T001

### T008 - Admin moderation (future)
- Status: TODO (low priority)
- Expected: ADMIN can deactivate courts/users
- Check: admin action takes effect
- Dependencies: T001

### T009 - Backend API tests
- Status: TODO
- Expected: automated tests covering auth, bookings (incl. slot double-booking guard), reviews
- Check: test command passes locally
- Dependencies: T001

### T010 - Linting & formatting
- Status: TODO
- Expected: ESLint + Prettier configured for client/ and server/, consistent with existing code style
- Check: lint command runs clean on current code
- Dependencies: none

### T011 - Documentation (docs/)
- Status: TODO
- Expected: API reference (all /api routes: methods, auth, payloads) and data model overview based on prisma/schema.prisma
- Check: docs match actual routes; links from README
- Dependencies: none
