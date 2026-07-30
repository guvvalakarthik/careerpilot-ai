# Production deployment runbook

## Reference services

- Vercel: Next.js Node.js runtime and daily cron
- Neon: PostgreSQL 16 with the pgvector extension
- Cloudflare R2: private document objects
- Upstash: distributed production rate limits
- Inngest: durable RAG indexing and backfills
- Gemini: structured generation and embeddings
- Resend: transactional email
- Sentry: errors, traces, and source maps

Use separate databases, buckets, keys, and OAuth callbacks for preview and production.

## Preflight

```powershell
npm ci
npx prisma generate
npm run db:validate
npm run lint
npm run typecheck
npm test
npm run build
```

Validate a core deployment without printing values:

```powershell
$env:DEPLOYMENT_PROFILE = "core"
npm run deploy:check
```

Set the profile to `full` when AI, RAG, storage, and monitoring must all be available. The validator prints only missing or checked variable names, never secret values.

## Database release

1. Create and review migrations locally against Docker PostgreSQL.
2. Back up production and verify the restore procedure.
3. Run `npx prisma migrate deploy` once from a controlled release job using the production URL.
4. Run `npx prisma migrate status` and inspect the health endpoint.
5. Deploy application code only after the migration succeeds.

The repository's `db:*` scripts intentionally reject remote targets. They are local-development safeguards, not production migration commands.

## Vercel setup

1. Import `guvvalakarthik/careerpilot-ai` and select `main` as the production branch.
2. Use Node.js 20+, `npm ci`, and `npm run build`.
3. Configure all core variables from `.env.example` in Vercel, never in Git.
4. Configure the production Google callback as `<AUTH_URL>/api/auth/callback/google`.
5. Connect Inngest to `<AUTH_URL>/api/inngest` and set both signing/event keys.
6. Confirm `vercel.json` created the daily notification cron.
7. Configure Sentry release/source-map credentials only in the build environment.
8. Require CI and preview checks before merging to `main`.

Do not seed a database containing real users. For a dedicated portfolio-demo database, run the guarded seed once and use the one-click recruiter login shown on `/login`.

## Release gates

- `GET /api/health` returns HTTP 200 and `checks.database.status: up`.
- Credentials login, dashboard navigation, workspace access, and sign-out pass.
- Inngest lists all RAG functions and a test event completes.
- A document upload validates its signature and signed download expires.
- Upstash blocks an intentional rate-limit test.
- Sentry receives a test event with the correct release.
- `npm run load:smoke` passes the agreed error-rate and p95 thresholds.
- Database migration status is clean and rollback ownership is assigned.

## Rollback and recovery

- Roll back application code through the hosting provider; do not automatically reverse destructive database migrations.
- Prefer expand/migrate/contract schema changes so the prior application version remains compatible.
- Disable `RAG_ENABLED` to stop new indexing without affecting core tracking.
- Use the owner/coach workspace backfill after an Inngest or embedding outage.
- Rotate any exposed key immediately and invalidate affected sessions or signed URLs.

## Observability

`/api/health` is an uncached readiness check with database latency in the `Server-Timing` header. It exposes no URLs, credentials, query text, or provider errors. Sentry captures server/client failures and traces. Workspace analytics show tenant-scoped AI success rate, p95 latency, and index readiness over real stored operations.
