# Awaken

Awaken is a Next.js/TypeScript self-improvement RPG. Supabase Auth and PostgreSQL are the authoritative identity and progress store. Browser storage is retained only as a recovery outbox and for explicit legacy import.

The structured schema, XP ledger, RLS, migration/rollback procedure, and discrepancy-repair guide are documented in [`docs/RELATIONAL_PERSISTENCE.md`](docs/RELATIONAL_PERSISTENCE.md).

## Required services

Create a Supabase project and (optionally) a Google Gemini API key. Copy `.env.example` to `.env.local`; fill in the Supabase URL, anon key, server-only service-role key, and Gemini key. Never expose the service-role or Gemini keys with a `NEXT_PUBLIC_` prefix.

In Supabase Authentication, enable Email/Password, choose whether email verification is required, set the Site URL, and allow `http://localhost:3000/auth/callback` plus the production callback URL. Configure SMTP before production password-reset and verification emails.

## Database setup and migrations

Install the Supabase CLI, link the project, then apply ordered migrations:

```bash
supabase link --project-ref YOUR_PROJECT_REF
supabase db push
```

For a local Supabase stack use `supabase start` followed by `supabase db reset`. Never edit a migration after it has reached any shared environment; create a new forward migration. Deploy in this order: database migration, environment variables, staging verification, application deployment, production smoke test.

The initial schema includes owner-scoped profiles, preferences, domain records, an atomic versioned state snapshot, append-only XP events, and retry-safe operations. RLS compares every owner ID with `auth.uid()`. State writes use an expected revision; stale devices receive a conflict instead of overwriting newer data. Restore is a database transaction. Account deletion uses the service role only after a normal authenticated session and an exact confirmation phrase; deleting the Auth user cascades through owned progress.

## Local progress import

After the first sign-in Awaken checks the legacy v2/v1 browser keys. It never displays the starter profile while cloud loading is unresolved. If cloud is empty, the user can import local progress. If both exist, the user must choose cloud or browser progress. The chosen browser data is validated, restored idempotently, verified by the cloud response, and retained under a migration-backup key. It is never silently deleted.

## Backup and restore

Settings exports human-readable JSON with `format`, `dataVersion`, and `exportedAt`; credentials are not included. Restore validates the envelope and supported version, shows a preview, requires destructive confirmation, and replaces the snapshot transactionally. Merge is intentionally rejected until domain-safe merge rules exist.

## Development and tests

```bash
npm install
npm run dev
npm run lint
npm run typecheck
npm test
npm run build
```

Repository and migration unit tests cover serialized-data validation. Authentication, RLS isolation, concurrency, retry idempotency, and transactional restore should also run against a disposable local Supabase instance before production; never point destructive integration tests at production.

## Failure recovery

Before a destructive migration, take a Supabase database backup and test restoration in staging. If application deployment fails, roll back the application while leaving additive migrations in place. If a data migration fails, stop writes, restore the pre-release database backup or apply a reviewed forward repair migration, validate row counts and representative users, then resume. Unsupported future data versions fail closed. Pending browser recovery state remains available when the network is unavailable.
