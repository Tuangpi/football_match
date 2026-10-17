# Progress

## Current State
- Current task: None (T004 DONE)
- Most recently completed: T004 Owner event creation page
- Blockers: none
- Recommended next: T005 (Review creation UI on CourtDetail)

## Notes
- 2026-10-17 - T004 DONE: /owner/events/create implemented (client/src/pages/CreateEvent.tsx + route in App.tsx). Owner picks one of their courts, title, type, optional description, start/end datetimes; page converts datetime-local to full ISO for the API and redirects to /events after publish; empty state if owner has no courts yet. Checks: `npx tsc --noEmit` clean, `npm run build` clean, live-server smoke test OK (owner login -> POST /events with the page's exact payload shape -> 201 -> event visible in public GET /events; both smoke-test events deleted afterwards, DB left as found; server stopped again after test). Browser click-through still pending.
- 2026-10-17 - T003 DONE: /owner/courts page implemented (client/src/pages/OwnerCourts.tsx + route in App.tsx). Owner can list courts, inline-edit, activate/deactivate, delete, and add slots (date/start/end/optional price). Slot dates sent as local-noon ISO to avoid UTC day-shift. Checks: `npx tsc --noEmit` clean, `npm run build` clean, live-server API smoke test OK (owner login, /courts/owner/me shape, POST slot -> visible in public /courts/:id/slots?date=). Left in test DB: two duplicate slots on 2026-10-21 19:00-20:00 (no slot DELETE endpoint exists). Browser click-through still pending (create-court -> redirect, UI forms).
- 2026-10-17 - Backend fully runtime-verified against a live server (npm run dev + curl):
  - Auth: register (PLAYER/OWNER), login, /me - all OK (JWT httpOnly cookie)
  - Courts: public list + filters, detail with slots/reviews, owner create, owner /owner/me - OK
  - Court slots: owner POST /courts/:id/slots, public GET /courts/:id/slots?date= - OK (added this session; endpoints did not exist before)
  - Bookings: create (flips slot isAvailable=false), /me list, PATCH /:id/cancel (frees slot), owner /owner list, owner PATCH /owner/:id/status confirm - OK
  - Events: owner create, public list - OK
  - Reviews: player create (one per court per user), listed on court detail - OK
  - Teams: player create (captain auto-joined as member) - OK
  - Friends: send request, receiver pending list - OK
  - Test data in DB: player@test.com / owner@test.com (password123), one court, one slot (2026-10-20 10:00), one CONFIRMED booking, one event, one review, one team, one friend request
- 2026-10-17 - T001 DONE: server package.json dev/start/main now point to src/index.ts / dist/src/index.js (was app.ts which never listens). Verified npm run dev + /health.
- 2026-10-17 - Earlier scan: full codebase baseline established (see TASKS.md baseline section)
