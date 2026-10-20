# Migration plan: Supabase database + Clerk authentication

## Status

**Not started.** This document records the intended migration target. The current application still uses:

- Prisma ORM against a self-managed PostgreSQL database (`DATABASE_URL` in `server/.env`)
- JWT sessions in an httpOnly cookie (`token`) issued by the Express backend
- Bcrypt password hashing

No dependency, schema, authentication, or deployment changes have been made.

## Target architecture

```text
Browser
   │
   ▼
Vercel — React frontend
   ├── Clerk — sign-in, sessions, user identity
   └── /api/* → Express API (Render or Vercel)
          └── Prisma ORM
                 └── Supabase PostgreSQL (connection pool)
```

- **Clerk owns identity:** sign-up, sign-in, session management, user metadata.
- **The Express backend owns authorization:** PLAYER/OWNER/ADMIN roles, court ownership, booking permissions, and all business rules remain in `server/src` (routes → middleware → controllers → Prisma).
- **Supabase is the PostgreSQL host:** Prisma Client and migrations continue to be used; Supabase is not a replacement for Prisma.
- **Booking behavior is preserved:** whole-hour Asia/Yangon times, per-court row locks (`FOR UPDATE`), transactions, MMK pricing, one review per court per user.

## Migration stages (suggested order)

### 1. Database to Supabase

- See the step-by-step runbook: [SUPABASE_MIGRATION.md](./SUPABASE_MIGRATION.md).
- Provision a Supabase PostgreSQL project.
- Point `DATABASE_URL` at Supabase (use the pooled connection string recommended for the API runtime).
- Run Prisma migrations against Supabase; verify the schema matches `server/prisma/schema.prisma`.
- Back up and migrate existing application data (users, courts, bookings, teams, friends, reviews, events).
- Verify transactions and row locks still serialize booking and block creation correctly.

### 2. Authentication to Clerk

- Add Clerk to the frontend and backend.
- Replace JWT cookie issuance with Clerk session verification.
- Link existing application users to Clerk identities (email match or an explicit migration mapping).
- Keep `User.role` (PLAYER/OWNER/ADMIN) and authorization logic in the backend.
- Decide the experience for existing accounts: password reset flow, invite flow, or linked migration.
- Keep an identity/me equivalent available to the frontend so sessions resolve to application users.

### 3. Frontend to Vercel

- Connect the `client/` repo to Vercel.
- Configure the Vite build output and SPA fallback/rewrites for page refreshes.
- Forward `/api/*` to the backend host.
- Verify cookie/CORS behavior across the frontend and API domains.

### 4. Backend API hosting

- Deploy the Express server (Render recommended; Vercel Express is an alternative).
- Configure `CLIENT_URL`, `DATABASE_URL`, `NODE_ENV=production`, and Clerk verification settings (replacing `JWT_SECRET`-based cookie issuance).
- Verify the health check, authentication, role guards, and booking endpoints.

### 5. Verification and rollback

- Run the existing server test suite and client build/lint/typecheck.
- Smoke test register/login/logout, court booking, owner approval, admin toggles, and concurrency on two simultaneous bookings.
- Keep a rollback plan: restore the previous PostgreSQL database and re-enable JWT cookie auth if the migration fails.

## Open decisions

- Backend host: Render vs Vercel Express (function limits and Prisma connection handling to verify).
- Existing-user migration strategy for Clerk (automatic email match vs invite/reset).
- Whether Clerk user data is mirrored into the `User` table or referenced only by Clerk ID.
