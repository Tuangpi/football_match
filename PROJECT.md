# Football Match - Project

## Goal
Web application for booking futsal courts (designed to extend to 11-a-side). Players find courts and friends, form teams, and book whole-hour time ranges. Owners manage courts, opening hours, blocked time, bookings, and events.

## Scope / Requirements
- Roles: PLAYER, OWNER, ADMIN (ADMIN = platform moderation, future)
- PLAYER: search courts, book/cancel whole-hour time ranges, manage profile, friends, teams, leave reviews
- OWNER: list courts, configure weekly opening hours and blocked periods, confirm/cancel bookings, publish events (tournaments, discounts, price changes)
- Out of scope (for now): payments, notifications, messaging
- All court/slot prices and booking totals use Myanmar kyat (MMK); numeric API amounts are in MMK.
- Event browsing (`/events`) is public across owners; event management (`/owner/events`) is scoped server-side to the owner's courts, with admin access across all courts.

## Tech Stack
- **client/**: React 18 + Vite + Tailwind CSS, react-router v6, axios, react-hook-form + zod, sonner (toasts), lucide-react icons
- **server/**: Express + TypeScript, Zod validation, Prisma ORM + PostgreSQL
- **Auth**: JWT stored in httpOnly cookie; bcrypt password hashing

## Architecture
- server/src: routes -> middleware (authenticate/authorize, validate) -> controllers -> Prisma
- DB models: User, PlayerProfile, Friend, Team, TeamMember, Court, CourtSlot (legacy archive), CourtBlock, Booking, Event, Review
- client/src: one page per route, AuthContext for session, shared axios instance (withCredentials)
- Vite dev server proxies /api to localhost:3000

## Key Decisions
- JWT in httpOnly cookie instead of localStorage (XSS safety)
- Zod schemas validate inputs both in routes and controllers
- Bookings start PENDING; owner confirms; cancelling a booking releases its time range; cancelled bookings cannot be reopened
- One review per user per court (DB unique constraint on courtId+userId)

- Booking times use Asia/Yangon; new requests start/end on whole hours, minimum 1 hour, within a single operating day (midnight closing supported). Default hours are 08:00–23:00 daily, configurable per weekday. Pending and confirmed bookings block availability. Price is hourly rate × duration.
- Per-court row locks serialize booking/block creation; archived slot records are not used for new availability. Legacy dates are interpreted using their stored UTC calendar date and Yangon wall-clock time; existing totals and minute-based times are preserved.

## Constraints & Assumptions
- PostgreSQL required; configure via server/.env (see server/.env.example)
- Verification evidence is recorded per task in TASKS.md and PROGRESS.md; older baseline features may still need verification.
- Git repo had zero commits when tracking was initialized (2026-10-17)
