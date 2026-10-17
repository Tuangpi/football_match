# Football Match - Project

## Goal
Web application for booking futsal courts (designed to extend to 11-a-side). Players find courts and friends, form teams, and book slots. Owners manage courts, slots, bookings, and events.

## Scope / Requirements
- Roles: PLAYER, OWNER, ADMIN (ADMIN = platform moderation, future)
- PLAYER: search courts, book/cancel slots, manage profile, friends, teams, leave reviews
- OWNER: list courts, manage time slots, confirm/cancel bookings, publish events (tournaments, discounts, price changes)
- Out of scope (for now): payments, notifications, messaging

## Tech Stack
- **client/**: React 18 + Vite + Tailwind CSS, react-router v6, axios, react-hook-form + zod, sonner (toasts), lucide-react icons
- **server/**: Express + TypeScript, Zod validation, Prisma ORM + PostgreSQL
- **Auth**: JWT stored in httpOnly cookie; bcrypt password hashing

## Architecture
- server/src: routes -> middleware (authenticate/authorize, validate) -> controllers -> Prisma
- DB models: User, PlayerProfile, Friend, Team, TeamMember, Court, CourtSlot, Booking, Event, Review
- client/src: one page per route, AuthContext for session, shared axios instance (withCredentials)
- Vite dev server proxies /api to localhost:3000

## Key Decisions
- JWT in httpOnly cookie instead of localStorage (XSS safety)
- Zod schemas validate inputs both in routes and controllers
- Bookings start PENDING; owner confirms; cancelling a booking frees the slot (isAvailable=true)
- One review per user per court (DB unique constraint on courtId+userId)

## Constraints & Assumptions
- PostgreSQL required; configure via server/.env (see server/.env.example)
- Statuses in TASKS.md mean code-complete only; nothing has been runtime-verified yet
- Git repo had zero commits when tracking was initialized (2026-10-17)
