# docs

Developer documentation for the Football Match app.

- [API reference](./API.md) — every `/api` route: method, auth/role, request payload, responses, and error cases. Verified against `server/src/routes/*` + `server/src/controllers/*`.
- [Data model overview](./DATA_MODEL.md) — enums, models, relations, constraints, and lifecycle notes from `server/prisma/schema.prisma`.
- [Migration plan](./MIGRATION_PLAN.md) — planned move to Supabase PostgreSQL and Clerk authentication; not yet implemented.
- [Supabase migration runbook](./SUPABASE_MIGRATION.md) — step-by-step database migration guide (T029).
