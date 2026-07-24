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

Built over 9 phases. Phases 1-2 are complete; phases 3-9 are planned.

### Phase 1 — Foundation ✅
- Next.js App Router + tRPC + Prisma + Auth.js setup
- Multi-tenant workspaces with RBAC (Owner / Coach / Seeker)
- Auth: credentials + Google OAuth, JWT sessions
- Audit logging via `AuditEvent` records

### Phase 2 — Pipeline + Quick Capture + UI Overhaul ✅
- 10-stage Kanban board with drag-and-drop stage transitions
- Quick Capture modal (paste URL or JD)
- Application detail drawer with stage history, interviews, tasks
- Professional landing page (hero, problem, features, how-it-works, CTA)
- Shared navbar, split-panel login/register, polished dashboard
- Slate design system across all pages

### Phase 3 — AI Extraction, Fit Scoring & Profile (Week 3)
- **CandidateProfile UI**: headline, skills, years of experience, desired roles, locations, min salary
- **AI Job Extraction**: Gemini/OpenAI call in `quickCapture` to auto-extract company, title, location, salary, skills, employment type from pasted JD
- **Fit Scoring**: compare candidate skills vs job required skills → 0-100 score with explainable breakdown stored in `fitReasons`
- **AiRun logging**: every AI call recorded with type, status, latency, output
- **Onboarding flow**: multi-step after register (create workspace → set up profile → capture first job)
- **Landing page social proof**: testimonials section, user count, trusted-by strip

### Phase 4 — Contacts & Networking (Week 4)
- **Contacts tab**: CRUD for recruiters, hiring managers, referrals — name, role, email, LinkedIn, company link, notes, last interaction, next action
- **Outreach messages**: link contacts to applications, draft messages, track sent status
- **Contact router** + tRPC procedures
- **Pipeline search & filter**: search bar + filter by company, stage, date above Kanban
- **Richer Kanban cards**: show salary, location, days in current stage, task count, notes indicator

### Phase 5 — Interviews & Tasks (Week 5)
- **Interview CRUD**: schedule, edit, cancel interviews from application detail — type, date, duration, interviewer, notes, outcome
- **Task management**: create tasks linked to applications or standalone — status tracking, due dates, completion
- **Upcoming view**: consolidated list of upcoming interviews + task deadlines across all applications
- **Dark mode**: Tailwind dark class toggle across all pages
- **Keyboard shortcuts**: `cmd+K` for Quick Capture, arrow keys for board navigation

### Phase 6 — Document Vault (Week 6)
- **Cloudflare R2 integration**: upload resumes, cover letters, certificates, offer letters
- **Document CRUD**: `Document` + `ResumeVersion` management
- **Resume versioning**: link resume versions to specific applications
- **PDF preview** in browser
- **Storage key management**: secure upload/download flow

### Phase 7 — Notifications & Reminders (Week 7)
- **Notification system**: use existing `Notification` model with bell icon in navbar
- **Stale application alerts**: `APPLICATION_STALE` — no stage change in 14+ days
- **Interview reminders**: `INTERVIEW_UPCOMING` — interview in 24-48 hours
- **Task due alerts**: `TASK_DUE` — task due in 24 hours
- **Cron job**: Inngest or Vercel Cron for periodic checks
- **Notification bell** in navbar with unread badge + dropdown

### Phase 8 — Analytics & RAG Assistant (Week 8)
- **Analytics dashboard**: replace static stat cards with charts — application funnel, response rate, offer rate, avg time per stage, pipeline velocity over time (recharts)
- **RAG assistant**: chat interface using Vercel AI SDK + Gemini with context from user's applications, contacts, interviews, documents
- **Use cases**: "Which applications have I not heard back from?", "Draft a follow-up email for X", "Prep me for my interview at Y"
- **pgvector**: store document embeddings for grounded retrieval

### Phase 9 — Testing, Polish & Launch (Week 9)
- **Vitest**: unit tests for all tRPC routers (workspace, application, opportunity, contact, interview, task, document, ai, notification)
- **Playwright**: E2E tests for critical flows (auth, create workspace, quick capture, drag stage, invite member)
- **GitHub Actions CI**: lint + typecheck + test on every PR
- **Mobile polish**: responsive Kanban (list view toggle for mobile), PWA setup
- **Empty state illustrations**: SVG illustrations for empty pipeline, no contacts, no interviews
- **Deploy**: Vercel + Neon Postgres + Cloudflare R2
- **Sentry**: error monitoring + performance tracking
