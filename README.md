# CareerPilot AI

An AI-powered job search and career networking platform. Capture job opportunities, track applications through a pipeline, manage recruiter contacts, prepare for interviews, and get explainable AI fit scoring — all inside private, multi-tenant workspaces.

## Tech stack

- **Frontend:** Next.js (App Router), TypeScript, Tailwind CSS
- **API:** tRPC (end-to-end type safety) with Zod validation
- **Database:** PostgreSQL + Prisma ORM
- **Auth:** Auth.js v5 (credentials + Google OAuth), JWT sessions
- **AI:** Vercel AI SDK + Gemini (structured outputs), pgvector RAG (planned)
- **Jobs:** Inngest (planned) · **Storage:** Cloudflare R2 (planned)
- **Testing:** Vitest + Playwright (planned) · **CI:** GitHub Actions
- **Deploy:** Vercel + Neon Postgres · **Monitoring:** Sentry (planned)

## Getting started

Prerequisites: Node 20+, Docker Desktop.

```bash
# 1. Install dependencies
npm install

# 2. Configure environment
copy .env.example .env   # then fill in AUTH_SECRET (npx auth secret)

# 3. Start local Postgres (host port 5434)
npm run db:up

# 4. Apply migrations and seed demo data
npm run db:migrate
npm run db:seed

# 5. Run the app
npm run dev
```

Open http://localhost:3000 — demo login: `demo@careerpilot.dev` / `demo1234`.

## Scripts

| Script | Purpose |
|---|---|
| `npm run dev` | Start dev server |
| `npm run build` | Production build |
| `npm run lint` / `npm run typecheck` | Static checks (run in CI) |
| `npm run db:up` | Start Dockerized Postgres |
| `npm run db:migrate` | Apply Prisma migrations |
| `npm run db:seed` | Seed demo user + workspace |
| `npm run db:studio` | Browse data in Prisma Studio |

## Architecture notes

- **Multi-tenancy:** every domain record carries `workspaceId`; tRPC's `workspaceProcedure` verifies membership before any access.
- **RBAC:** roles are `OWNER` / `COACH` / `SEEKER` per workspace; `requireRole([...])` gates privileged procedures.
- **Audit logging:** all significant mutations write `AuditEvent` records via `recordAudit` (fire-and-forget, never blocks the main flow).
- **Application workflow:** a 10-stage state machine (`CAPTURED` → ... → `ACCEPTED`/`REJECTED`/`WITHDRAWN`/`ARCHIVED`) with `DecisionEvent` history.

## Roadmap

Built over 8 weeks: foundation → pipeline + Quick Capture → AI extraction & fit scoring → contacts → interviews → document vault → grounded RAG assistant → testing & launch.
