# Football Match

Futsal (extensible to 11-a-side) court booking web application.

## Tech Stack
- **Frontend:** React + Vite + Tailwind CSS
- **Backend:** Express.js + TypeScript
- **Database:** PostgreSQL + Prisma ORM
- **Auth:** JWT (HttpOnly cookies), email/password

## Structure
```
client/   # React frontend
server/   # Express backend + Prisma schema
docs/     # Developer docs: [API reference](docs/API.md) · [Data model](docs/DATA_MODEL.md)
```

## Getting Started

### 1. Prerequisites
- Node.js (v18+)
- PostgreSQL

### 2. Backend
```bash
cd server
cp .env.example .env   # configure DATABASE_URL, JWT_SECRET, PORT
npm install
npx prisma generate
npx prisma migrate deploy
npm run db:seed          # optional: demo data + admin account (dev only)
npm run dev
```

### 3. Frontend
```bash
cd client
npm install
npm run dev
```

## Roles
- **PLAYER** — find friends, join/create teams, book courts
- **OWNER** — manage courts, opening hours, calendar bookings, events
- **ADMIN** — platform moderation (future)

## Calendar tests
With both application dependencies installed, run the focused frontend date tests using the existing server TypeScript runner (no additional dependency):
```bash
cd client
../server/node_modules/.bin/tsx --test tests/bookingCalendar.test.ts
```

## Seed data

For local development, `npm run db:seed` (in `server/`) creates an admin account (`admin@mail.com` / `admin12345`) plus demo owners, courts, players, bookings, events and reviews. It is idempotent and safe to re-run. It runs automatically with `prisma migrate dev` but not with `prisma migrate deploy`, so production databases are not seeded. Set `ALLOW_SEED=true` to permit seeding in production.

## Docs
- [API reference](docs/API.md) — all `/api` routes: methods, auth/roles, payloads, errors
- [Data model overview](docs/DATA_MODEL.md) — enums, models, relations, constraints
- [Migration plan](docs/MIGRATION_PLAN.md) — planned move to Supabase PostgreSQL and Clerk authentication; not yet implemented
- Docs index: [docs/](docs/README.md)