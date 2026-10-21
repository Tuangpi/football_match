# Supabase migration runbook (T029)

Step-by-step guide to move the database to Supabase. The app code does not change: Prisma ORM, the schema, migrations, transactions, and row locks stay exactly as they are. Only `DATABASE_URL` and the hosting target change.

This runbook is written for the current stack (Prisma 5.x, PostgreSQL). Check Supabase's current Prisma guide for any updated connection parameters before you start.

## What stays the same

- Prisma schema (`server/prisma/schema.prisma`) and all migrations under `server/prisma/migrations/`.
- Booking transactions and per-court row locks (`SELECT ... FOR UPDATE`).
- MMK pricing and Asia/Yangon whole-hour booking rules.

## What changes

- `DATABASE_URL` points at Supabase instead of `localhost`.
- Migrations run with Supabase's **direct** connection; the app runs with the **pooled** connection.

## Prerequisites

- A Supabase project.
- `psql` (or Supabase's SQL editor) and `pg_dump`/`pg_restore` for data migration.
- Node.js and the server dependencies installed (`cd server && npm install`).

## 1. Create the Supabase project

1. Create a project in the Supabase dashboard.
2. Note the **project ref** (the short id in the project URL) and the database password you chose.
3. Under **Connect** (or Settings → Database), collect both connection strings:
   - **Direct** (port `5432`, host `db.<ref>.supabase.co`) — used for migrations.
   - **Pooled / Session pooler** (port `6543`, host `<ref>.pooler.supabase.com` or `aws-0-<region>.pooler.supabase.com`) — used by the running app.

Both strings include the `?schema=public` parameter (or you can append it).

## 2. Point migrations at Supabase (direct connection)

Set `DATABASE_URL` in `server/.env` to the **direct** connection string, then apply all migrations:

```bash
cd server
# DATABASE_URL in .env now = direct connection (port 5432)
npx prisma migrate deploy
```

`migrate deploy` applies every migration in `server/prisma/migrations/` in order, including the `flexible_booking` backfill. It records applied migrations in the `_prisma_migrations` table on Supabase.

Verify the schema:

```bash
npx prisma migrate status   # should report no pending migrations
```

> If you prefer Prisma's split connection handling, you can instead add `directUrl = env("DIRECT_URL")` to the `datasource db` block and set `DIRECT_URL` to the direct string while `DATABASE_URL` stays pooled. This is optional; the steps below keep it simple by switching `DATABASE_URL` between direct (migrate) and pooled (runtime).

## 3. Switch the app to the pooled connection

After migrations succeed, change `DATABASE_URL` in `server/.env` to the **pooled** connection string (port `6543`). The running app should use the pooler so connections are shared instead of exhausting Supabase's limit.

Restart the server and confirm the health check:

```bash
npm run dev        # or npm run build && npm start for production
curl http://localhost:3000/health   # {"status":"ok",...}
```

## 4. Migrate existing data

If the current local database has data you want to keep (users, courts, bookings, teams, friends, reviews, events), copy it over with `pg_dump`/`pg_restore`:

```bash
# Dump the local database (adjust host/db/user to your local setup)
pg_dump -Fc -d football_match -f football_match.dump

# Restore into Supabase (use the DIRECT connection string)
pg_restore --no-owner --no-privileges -d "$SUPABASE_DIRECT_URL" football_match.dump
```

Alternatively, run the dump SQL through Supabase's SQL editor. After restoring, confirm row counts on key tables match the source.

If you are starting fresh with no data to keep, skip this step — `migrate deploy` already created the empty schema.

## 5. Verify

Run the existing server test suite against the Supabase database (point `DATABASE_URL` at Supabase first):

```bash
npm test
```

Then confirm the behaviors that matter most:

- Two simultaneous booking requests for the same court/hour: only one succeeds (row lock + transaction still serialize them).
- Booking cancellation releases the time range.
- Owner confirm/cancel, admin toggles, and role guards behave as before.

## Rollback

- Keep a backup of the source database before migrating.
- To revert, repoint `DATABASE_URL` at the previous database and restart. No code or schema rollback is needed because the schema did not change.

## Troubleshooting

- **Migration fails on the pooled string:** migrations need the direct connection (port `5432`). Use the direct string for `migrate deploy`.
- **IPv4-only machine / direct host unreachable:** Supabase's direct host (`db.<ref>.supabase.co`) is IPv6-only. On networks without IPv6, use the **Session pooler** (port `5432` on `aws-0-<region>.pooler.supabase.com`, user `postgres.<ref>`) for `migrate deploy` and the **Transaction pooler** (port `6543`, `?pgbouncer=true`) for the running app. Both resolve to IPv4.
- **Connection errors / too many connections at runtime:** make sure the app uses the pooled string (port `6543`), not the direct one.
- **SSL required:** Supabase requires SSL; the provided connection strings already include it. If your client rejects it, append `?sslmode=require`.
- **Exact query parameters evolve:** Supabase occasionally updates recommended Prisma query parameters (for example pooler-related flags). Check their current Prisma guide if a connection behaves unexpectedly.
