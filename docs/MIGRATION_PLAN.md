# Production architecture and operations

## Current architecture

```text
Browser
  └─ React/Vite frontend + Clerk browser SDK
       └─ Express API + Clerk session verification
            └─ Prisma ORM + Supabase PostgreSQL pool
```

- **Clerk owns identity:** sign-up, sign-in, verification, and sessions.
- **Express owns authorization:** application users, PLAYER/OWNER/ADMIN roles, court ownership, booking rules, and moderation permissions.
- **Supabase hosts PostgreSQL:** Prisma Client, migrations, transactions, and row locks remain in use.

## Authentication and roles

1. A Clerk-authenticated request reaches `authenticate`.
2. The API links the Clerk user to an existing application user by Clerk ID or normalized email, or provisions a new `PLAYER` user.
3. Public signup may choose `PLAYER` or `OWNER`; the server permits only a first-time `PLAYER` to `OWNER` sync for a new account.
4. Clerk metadata is not trusted to grant application roles. `ADMIN` is assigned out of band.

## Release procedure

1. Run `npm ci` in both `client/` and `server/`.
2. Run server migrations with a direct/session-capable Supabase connection: `npx prisma migrate deploy`.
3. Configure `DATABASE_URL` for the API runtime with the Supabase pooled connection.
4. Configure `NODE_ENV=production`, `CLIENT_URL`, `CLERK_SECRET_KEY`, and client `VITE_CLERK_PUBLISHABLE_KEY`.
5. Deploy the API and verify `GET /health` and `GET /ready`.
6. Deploy the frontend with the appropriate API origin/routing configuration for the selected host.
7. Smoke-test Clerk signup/signin/signout, PLAYER/OWNER authorization, admin lockout, booking creation, concurrent booking rejection, and a database-outage readiness response.

## Rollback

- Keep a database backup before migration releases.
- Roll back the frontend and API as one compatible release pair when an authentication or schema issue occurs.
- Do not remove a Prisma migration from a deployed environment; create a forward corrective migration if schema repair is required.