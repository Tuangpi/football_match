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
# After installing dependencies in both client/ and server/, and applying server migrations:
npm run check
```

`npm run check` runs server linting, build, and API tests, followed by client linting,
type checking, build, and unit tests. The GitHub Actions CI workflow runs the same command.

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
- PostHog is the single observability platform for browser/API errors and server logs. Set `VITE_POSTHOG_PROJECT_TOKEN` for the client and `POSTHOG_PROJECT_TOKEN` for the API. Production frontend deployment should use `npm run build:posthog` with server-side CI values for `POSTHOG_CLI_API_KEY`, `POSTHOG_CLI_PROJECT_ID`, and `POSTHOG_RELEASE_VERSION` so source maps are uploaded privately and removed from the final build.

## Docs

- [API reference](docs/API.md)
- [Data model](docs/DATA_MODEL.md)
- [Supabase operations](docs/SUPABASE_MIGRATION.md)