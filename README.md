# CareerPilot AI

CareerPilot AI is a multi-tenant job-search workspace for candidates and career coaches. It combines an application pipeline, contacts, interviews, tasks, documents, analytics, notifications, and Gemini-powered career tools in one Next.js application.

This README describes what exists in the repository today. Planned features are listed separately under [Current limitations](#current-limitations).

## Implemented today

- Credentials authentication and Google OAuth through Auth.js v5 with JWT sessions.
- Multi-workspace tenancy with `OWNER`, `COACH`, and `SEEKER` memberships.
- Owner-scoped applications, contacts, tasks, and documents. Seekers see their own records; owners and coaches can manage records across the workspace.
- A validated 10-stage application pipeline with drag-and-drop UI and `DecisionEvent` history.
- Quick Capture for job URLs or pasted descriptions. Raw input is preserved; pasted job text can be structured by Gemini.
- Candidate profiles, explainable fit scoring, resume-to-JD matching, transferable skill paths, and a workspace-context assistant.
- A feature-gated pgvector foundation with versioned knowledge sources, bounded text chunking, normalized Gemini embeddings, and tenant/owner-scoped vector retrieval primitives.
- Contact/outreach, interview, task, document/resume-version, and analytics interfaces.
- Notification persistence, APIs, and cron generation. A bell component exists, but the current dashboard shell does not mount it.
- A system-aware theme provider and partial dark styles. The current dashboard shell does not mount the theme toggle.
- A server-owned Cloudflare R2 upload lifecycle with content-signature validation, atomic metadata creation, cleanup on database failure, signed downloads, and PDF/text extraction.
- A protected daily Vercel cron route for stale applications, upcoming interviews, and due tasks.
- Sentry runtime instrumentation.
- Upstash-backed production rate limits with deterministic in-memory limits in development and tests.
- Vitest unit and PostgreSQL integration suites plus Playwright critical-flow tests in GitHub Actions.

## Stack

| Area | Implementation |
|---|---|
| Web | Next.js 16 App Router, React 19, TypeScript, Tailwind CSS |
| API | tRPC 11, TanStack Query, Zod |
| Data | PostgreSQL 16, pgvector 0.8.5, Prisma 6 |
| Auth | Auth.js v5, credentials, Google OAuth, JWT sessions |
| AI | `@google/genai` with validated Gemini generation and 768-dimensional embedding boundaries |
| Storage | Cloudflare R2 through the AWS S3 SDK, `pdf-parse` for extraction |
| Email | Resend |
| Abuse controls | Upstash Redis and `@upstash/ratelimit` |
| Observability | Sentry for Next.js |
| Tests and CI | Vitest, Playwright, pgvector-enabled PostgreSQL 16, GitHub Actions |
| Intended hosting | Vercel, Neon PostgreSQL, Cloudflare R2 |

## Local setup

Prerequisites:

- Node.js 20+
- npm
- Docker Desktop for the local PostgreSQL service

```powershell
npm ci
Copy-Item .env.example .env
npm run db:up
npm run db:migrate
npm run db:seed
npm run dev
```

Open `http://localhost:3000`. The seed creates:

```text
demo@careerpilot.dev / demo1234
```

The repository's `db:*` scripts reject non-loopback PostgreSQL hosts before Prisma starts. They use `LOCAL_DATABASE_URL`, then `DATABASE_URL`, and otherwise default to:

```text
postgresql://careerpilot:careerpilot_dev@localhost:5434/careerpilot
```

Keep production database credentials in the hosting platform. Do not bypass the guarded scripts to run a local production migration. See [Database migration safety](docs/DATABASE_MIGRATIONS.md) for the release workflow.

## Environment variables

Copy `.env.example` and fill only the integrations you need.

| Variables | Required when | Behavior if absent |
|---|---|---|
| `DATABASE_URL` | Always | Prisma cannot access application data |
| `LOCAL_DATABASE_URL` | Guarded local database scripts | Defaults to the Docker Compose database |
| `AUTH_SECRET` | Always | Auth.js sessions are not safely configured |
| `AUTH_GOOGLE_ID`, `AUTH_GOOGLE_SECRET` | Google login | Credentials login still works |
| `GOOGLE_GENERATIVE_AI_API_KEY` | AI features | AI controls report that AI is not configured |
| `RAG_ENABLED`, `RAG_EMBEDDING_MODEL` | RAG indexing/retrieval | Disabled by default; no RAG path runs |
| `RESEND_API_KEY`, `RESEND_FROM_EMAIL` | Transactional email | Email sends are skipped and logged |
| `R2_ACCOUNT_ID`, `R2_ACCESS_KEY_ID`, `R2_SECRET_ACCESS_KEY`, `R2_BUCKET_NAME` | Document storage | Upload/download controls return a configuration error |
| `CRON_SECRET` | Notification cron | Cron fails closed with HTTP 503 |
| `UPSTASH_REDIS_REST_URL`, `UPSTASH_REDIS_REST_TOKEN` | Production | Rate-limited endpoints fail closed; development/test use memory |
| `SENTRY_DSN`, `NEXT_PUBLIC_SENTRY_DSN` | Sentry reporting | Application still runs without event delivery |

## Scripts

| Script | Purpose |
|---|---|
| `npm run dev` | Start the development server |
| `npm run build` | Create a production build |
| `npm run start` | Run a completed production build |
| `npm run lint` | Run ESLint |
| `npm run typecheck` | Run TypeScript without emitting files |
| `npm test` | Run unit tests; database integration specs are excluded |
| `npm run test:integration` | Run the dedicated PostgreSQL integration suite; requires migrated `DATABASE_URL` |
| `npm run test:e2e` | Run Playwright against a seeded, migrated database |
| `npm run test:e2e:ci` | Seed the demo account and run Playwright with the managed test server |
| `npm run db:up` | Start Dockerized PostgreSQL on host port 5434 |
| `npm run db:migrate` | Create/apply development migrations with Prisma |
| `npm run db:deploy:local` | Apply committed migrations to loopback PostgreSQL only |
| `npm run db:status:local` | Verify local migration history |
| `npm run db:drift:local` | Compare the migrated local database with `schema.prisma` |
| `npm run db:seed` | Seed the demo user, workspace, and profile |
| `npm run db:studio` | Open Prisma Studio |

For a local integration run:

```powershell
$env:DATABASE_URL = "postgresql://careerpilot:careerpilot_dev@localhost:5434/careerpilot"
npm run test:integration
```

Install the Playwright browser once before local E2E runs:

```powershell
npx playwright install chromium
npm run test:e2e:ci
```

## Security model

- `workspaceProcedure` authenticates the user and verifies membership for the input `workspaceId`.
- `requireRole` adds role checks for privileged mutations.
- `ownerScope`, `ownedApplicationScope`, and `resolveRecordOwner` enforce per-seeker ownership and validate delegated owners.
- Owners can rename workspaces, change roles, and remove members. A workspace must retain an owner, and members with owned records must be reassigned before removal.
- Coaches can see/manage all workspace records and invite seekers, but cannot grant privileged roles.
- Seekers can manage their own applications, contacts, tasks, documents, interviews, outreach, and related AI actions.
- Guessed cross-tenant or peer-owned IDs are returned as not found by owner-scoped queries.
- Application-level scoping is the current tenant boundary. PostgreSQL row-level security is not configured.
- Audit writes are best-effort: failures are logged and do not roll back the main mutation.

## Tests and CI

`.github/workflows/ci.yml` runs two jobs for pushes and pull requests to `main`:

1. `quality`: dependency install, Prisma generation, lint, typecheck, unit tests, and production build.
2. `integration-e2e`: pgvector-enabled PostgreSQL 16, guarded migrations and drift checks, RBAC/vector integration tests, Chromium installation, seed, and four critical browser flows.

Playwright covers public/protected navigation, seeded credentials login, workspace access, sign-out, registration, workspace creation, and profile onboarding. Traces, screenshots, videos, and the HTML report are uploaded from CI.

## Current limitations

The following are not implemented, despite claims in older project documents:

- The pgvector schema and tested embedding/retrieval primitives exist, but no source indexing job, backfill, citations, or saved chat history is wired yet. `RAG_ENABLED` remains false, and the assistant still uses bounded relational workspace context.
- No Vercel AI SDK usage. AI calls use `@google/genai` directly and execute synchronously.
- No Inngest jobs or durable queue. Notification generation is a Vercel cron route; AI work runs in the request path.
- Quick Capture preserves a URL but does not scrape or fetch the remote page. Paste the job description for reliable extraction.
- PostgreSQL RLS is not enabled; tenant isolation is enforced in application queries and middleware.
- The notification bell and theme toggle are not mounted in the active dashboard shell, and dark styling is not complete across every screen.
- Notification cron records are broadcast to all workspace members rather than only the related record owner; archived applications can also satisfy the current stale query.
- Analytics currently reports `responseRate` and `interviewRate` from the same calculation.
- Browser coverage does not yet exercise drag-and-drop stage changes, invitations, external AI calls, R2, Resend, or notification cron execution.
- Repository configuration does not prove automatic production deployment. Hosting and environment configuration remain deployment responsibilities.

For the deeper architecture and feature-status matrix, see [docs/PROJECT_OVERVIEW.md](docs/PROJECT_OVERVIEW.md).
