# Football Match

Futsal (extensible to 11-a-side) court booking web application.

## Tech stack

- **Frontend:** React, Vite, Tailwind CSS, Clerk
- **Backend:** Express.js, TypeScript, Clerk session verification
- **Database:** Supabase PostgreSQL with Prisma ORM

## Structure

```text
client/   # React frontend
server/   # Express backend + Prisma schema
docs/     # Developer and operational documentation
```

## Local setup

### Backend

```bash
cd server
cp .env.example .env # configure DATABASE_URL, CLERK_SECRET_KEY, CLIENT_URL, and PORT
npm install
npx prisma generate
npx prisma migrate deploy
npm run dev
```

### Frontend

```bash
cd client
cp .env.example .env.local # configure VITE_CLERK_PUBLISHABLE_KEY and VITE_API_URL
npm install
npm run dev
```

## Verification

```bash
# server
cd server
npm run lint && npm run build && npm test

# client
cd client
npm run lint && npx tsc --noEmit && npm run build
../server/node_modules/.bin/tsx --test tests/*.test.ts
```

## Roles

- **PLAYER** — find friends, join/create teams, and book courts
- **OWNER** — manage courts, opening hours, bookings, and events
- **ADMIN** — platform moderation via the admin dashboard; assigned outside public signup

## Production notes

- Use the pooled Supabase PostgreSQL connection for the running API.
- Set `NODE_ENV=production`, `DATABASE_URL`, `CLIENT_URL`, `CLERK_SECRET_KEY`, and the client Clerk publishable key in the production platform.
- Apply Prisma migrations with `npx prisma migrate deploy` before releasing the API.
- `GET /health` is a liveness endpoint. `GET /ready` verifies database availability and should be used by deployment readiness checks.
- API routing and hosting must be configured for your chosen frontend and backend deployment architecture.

## Docs

- [API reference](docs/API.md)
- [Data model](docs/DATA_MODEL.md)
- [Supabase operations](docs/SUPABASE_MIGRATION.md)