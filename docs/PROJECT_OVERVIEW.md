# CareerPilot AI: Implementation Overview

This document is the implementation source of truth for the current repository. It separates shipped behavior from integration-dependent behavior and future ideas.

## Product scope

CareerPilot AI is a candidate-side job-search system for:

- Individual job seekers tracking their own work.
- Career coaches collaborating with one or more seekers.
- Small shared workspaces with role-based access.

It is not an employer ATS, job board, remote-job scraper, or resume builder.

## Feature status

Status meanings:

- **Implemented**: code and UI are present in the repository.
- **Configured integration**: implemented, but requires external credentials or infrastructure.
- **Partial**: supporting code exists, but the user-facing or operational flow is incomplete.
- **Not implemented**: no production implementation exists in this repository.

| Capability | Status | Implementation notes |
|---|---|---|
| Credentials registration/login | Implemented | Auth.js credentials provider with bcrypt password hashes and JWT sessions |
| Google OAuth | Configured integration | Requires Google client ID and secret |
| Password reset | Configured integration | Token storage is implemented; delivery requires Resend |
| Multi-workspace membership | Implemented | Users may belong to multiple workspaces with per-workspace roles |
| Owner/coach/seeker RBAC | Implemented | Membership, role middleware, ownership scopes, last-owner protection |
| Candidate onboarding/profile | Implemented | Workspace creation, skills, headline, and experience |
| Application Kanban | Implemented | Ten stages, search/filter, drag-and-drop, validated transitions |
| Quick Capture | Implemented | Stores URL or text and creates opportunity plus application |
| Remote URL scraping | Not implemented | A pasted URL is preserved but not fetched |
| Job extraction | Configured integration | Gemini structures pasted job text into validated JSON |
| Fit scoring | Configured integration | Gemini output with deterministic algorithmic fallback for invalid responses |
| Resume/JD analysis | Configured integration | R2 text extraction plus match, roadmap, and skill-path output |
| Workspace assistant | Configured integration | Uses bounded relational workspace context; not RAG |
| Contacts and outreach | Implemented | Owner-scoped contact CRUD and application-linked messages |
| Interviews and tasks | Implemented | Scheduling, outcomes, due dates, and upcoming view |
| Document vault | Configured integration | R2 object storage, metadata, signed downloads, resume versions |
| Analytics | Implemented | Funnel, rates, time-per-stage, and six-month velocity charts |
| Notifications | Partial | Persistence, routers, cron, and bell component exist; bell is not mounted in current dashboard shell |
| Notification scheduler | Configured integration | Daily Vercel cron protected by `CRON_SECRET` |
| Dark mode | Partial | Theme provider and toggle component exist; toggle is not mounted and styles are incomplete |
| Sentry | Configured integration | Server, edge, client, and request-error instrumentation |
| Production abuse limits | Configured integration | Upstash required in production; memory limiter in development/test |
| Unit/integration/E2E tests | Implemented | Vitest, PostgreSQL integration config, Playwright critical flows |
| GitHub Actions CI | Implemented | Quality and PostgreSQL/Playwright jobs |
| pgvector RAG/citations | Not implemented | No vector column, embedding job, retrieval, or citation model |
| Inngest/background queue | Not implemented | No Inngest client, functions, or durable AI job queue |
| Saved assistant history | Not implemented | Chat state is client-side for the current session |
| PWA/native mobile app | Not implemented | Responsive web application only |

## Runtime architecture

```mermaid
flowchart LR
    Browser[Next.js React client] --> App[Next.js App Router]
    Browser --> TRPC[tRPC route handler]
    App --> Auth[Auth.js JWT session]
    TRPC --> Membership[workspaceProcedure and role middleware]
    Membership --> Prisma[Prisma Client]
    Prisma --> Postgres[(PostgreSQL)]
    TRPC --> Gemini[Google Gemini]
    App --> R2[Cloudflare R2]
    App --> Resend[Resend]
    Cron[Vercel Cron] --> Notifications[/api/cron/notifications]
    Notifications --> Postgres
    App --> Upstash[Upstash rate limits]
    App --> Sentry[Sentry]
```

### Request paths

- Server-rendered pages call Auth.js and Prisma directly when loading session-scoped page data.
- Client interactions use the tRPC route at `/api/trpc/[trpc]`.
- Credentials auth uses `/api/auth/[...nextauth]`.
- Registration, password reset, text extraction, upload, and cron use dedicated Next.js route handlers.
- AI service functions call Gemini synchronously from the server.
- R2 is accessed only from server-side helpers and routes.

## API surface

The root tRPC router exposes:

| Router | Responsibility |
|---|---|
| `workspace` | Workspace CRUD, membership, invitations, roles, workspace statistics |
| `candidate` | User-level candidate profile |
| `company` | Workspace company records |
| `opportunity` | Job capture and opportunity metadata |
| `application` | Pipeline queries, details, stage transitions, outcome notes |
| `contact` | Contacts and outreach messages |
| `interview` | Interview schedule, update, cancel, delete |
| `task` | Standalone or application/interview-linked tasks |
| `document` | Document metadata, listing, signed download, deletion |
| `resume` | Resume versions and application links |
| `ai` | Extraction, fit score, assistant, resume match, skill paths |
| `notification` | User/workspace notification lists and read state |
| `analytics` | Funnel, rates, stage timing, and velocity |

## Tenancy and ownership

### Workspace boundary

Collaborative pipeline, contact, interview, task, document, AI-run, audit, and notification records are linked directly or indirectly to a workspace. `CandidateProfile` is user-level and `SkillRelationship` is a global cache. `workspaceProcedure`:

1. Requires an authenticated session with a user ID.
2. Reads `workspaceId` from the raw tRPC input.
3. Looks up the composite `(workspaceId, userId)` membership.
4. Adds `membership` and `workspaceId` to the tRPC context.

Role-gated procedures compose `requireRole` on top of this middleware.

### Record ownership

Applications, contacts, tasks, and documents have `ownerId` fields. Related opportunities and interviews are scoped through their application owner. The ownership helpers are:

- `ownerScope(role, userId)`: adds `{ ownerId: userId }` for seekers.
- `ownedApplicationScope(role, userId)`: scopes records through their linked application.
- `resolveRecordOwner(...)`: forces seekers to own new records and verifies delegated owners are workspace members.

Companies are workspace-shared reference data rather than seeker-owned records.

### Role matrix

| Action | Owner | Coach | Seeker |
|---|---:|---:|---:|
| Read all pipeline/contact/task/document records | Yes | Yes | No, own records only |
| Create/update own records | Yes | Yes | Yes |
| Create records for another member | Yes | Yes | No |
| Delete applications/contacts/interviews/tasks | Yes | Yes | No |
| Delete own documents | Yes | Yes | Yes |
| Invite a seeker | Yes | Yes | No |
| Invite an owner or coach | Yes | No | No |
| Rename workspace/change roles/remove members | Yes | No | No |

Additional invariants:

- The last owner cannot be removed or demoted.
- A member with owned applications, contacts, tasks, or documents cannot be removed until records are reassigned.
- Resume/application links require the same record owner.
- Peer-owned and cross-tenant IDs are hidden with not-found behavior where ownership scopes apply.

PostgreSQL RLS is not configured. Application middleware and query predicates are the enforced boundary.

## Application workflow

The pipeline stages are:

```text
CAPTURED -> RESEARCHING -> READY_TO_APPLY -> APPLIED -> INTERVIEWING -> OFFER -> ACCEPTED
```

`REJECTED`, `WITHDRAWN`, and `ARCHIVED` are terminal/exit paths. `application.changeStage` validates transitions against an allowlist and performs the application update plus `DecisionEvent` creation in one Prisma transaction. Moving to `APPLIED` sets `appliedAt` if it is not already present.

The UI supports drag-and-drop, search, stage filters, and company filters.

## AI implementation

The server uses `@google/generative-ai` with `gemini-flash-latest`. It does not use the Vercel AI SDK.

Implemented operations:

- Job-posting extraction.
- Candidate/job fit score.
- Workspace-context assistant chat.
- Resume-to-job match and learning roadmap.
- Transferable skill-path generation and relationship caching.

### Boundary controls

`src/server/ai-boundaries.ts` defines strict Zod schemas for all model JSON. Model output is rejected when it contains:

- Malformed JSON or unknown fields.
- Wrong types, invalid enums, or invalid dates.
- Scores outside allowed ranges.
- Oversized strings, arrays, roadmaps, or skill paths.
- Skill paths that do not reference the provided matched/missing skills.

Prompt input is trimmed, deduplicated, and bounded. Chat must start and end with a user message and alternate user/model roles. Model responses are also size-bounded. Untrusted resume, job, workspace, and chat content is explicitly marked as data in prompts.

Failure behavior:

- Invalid extraction, resume match, or chat output becomes a controlled failure.
- Invalid fit-score output uses the deterministic skill-overlap fallback.
- Invalid skill paths are discarded as a non-critical enhancement.
- Explicit extraction, fit-score, assistant, and resume-match routes create `AiRun` records before calling the model and then mark success/failure. Quick Capture writes a successful run when inline extraction returns data and a failed run only if an exception escapes; a null extraction result is currently not logged. Skill-path generation is part of the resume-match run rather than a separate run.

The assistant is context-aware, not retrieval-augmented. It loads bounded applications, interviews, contacts, and tasks from PostgreSQL and places them in the prompt. There are no embeddings, citations, or saved conversations.

## Storage and document flow

R2 helpers support:

- Object upload with a workspace-prefixed generated key.
- Time-limited signed downloads.
- Object deletion.
- PDF/text extraction for resume analysis.

Document metadata and resume versions are stored in PostgreSQL. Access to list, download, delete, and resume links is owner-scoped for seekers.

Current merged limitation: object upload and document metadata creation are separate requests. The merged route checks authentication, workspace membership, size, R2 configuration, and a user/workspace rate limit, but it does not yet provide a single atomic upload-plus-metadata transaction, file-signature validation, or guaranteed orphan cleanup.

## Notifications and scheduled work

`vercel.json` schedules `/api/cron/notifications` daily at `08:00 UTC`.

The route creates notifications for:

- Applications with no stage change for at least 14 days.
- Pending interviews occurring in 24 to 48 hours.
- Open/in-progress tasks due within 24 hours.

The route fails closed if `CRON_SECRET` is missing and uses a constant-time bearer-secret comparison. It writes notifications directly during the request; no queue or Inngest worker is involved.

Current limitations: the cron sends each generated reminder to every workspace member instead of the related record owner, and the stale-application terminal filter omits `ARCHIVED`. The `NotificationBell` component is not mounted by the active `AppSidebar` dashboard layout.

## Rate limits

Anonymous routes are keyed by client IP. Authenticated expensive work is keyed by user and workspace where workspace context exists.

| Policy | Limit |
|---|---:|
| Credentials login | 5 per 10 minutes |
| Registration | 3 per hour |
| Forgot/reset password | 5 per 15 minutes |
| Text extraction | 10 per minute |
| Upload | 10 per minute |
| AI procedures | 20 per minute |
| Quick Capture/other expensive work | 30 per minute |

Production uses Upstash sliding windows and fails closed when Upstash is missing or unavailable. Development and tests use a process-local fixed-window map. HTTP endpoints return 429 responses with retry metadata; tRPC uses `TOO_MANY_REQUESTS` and adds rate-limit data to the formatted error.

## Data model

Major groups in `prisma/schema.prisma`:

- Auth: `User`, `Account`, `Session`, `VerificationToken`.
- Tenancy/profile: `Workspace`, `Membership`, `CandidateProfile`.
- Pipeline: `Company`, `JobOpportunity`, `Application`, `DecisionEvent`.
- Collaboration: `Contact`, `OutreachMessage`, `Interview`, `Task`.
- Documents: `Document`, `ResumeVersion`.
- AI/operations: `SkillRelationship`, `AiRun`, `AuditEvent`, `Notification`.

Although an Auth.js `Session` model exists for adapter compatibility, the configured application session strategy is JWT.

## Audit and observability

`recordAudit` awaits an `AuditEvent` insert but catches failures so auditing does not fail the main operation. It covers significant mutations, not every read or write.

Sentry initialization exists for server, edge, client, and request errors. Event delivery requires DSN configuration. Release creation and source-map upload additionally depend on Sentry build credentials/configuration; they are not guaranteed by the repository alone.

## Tests and CI

### Local suites

- `npm test`: unit and boundary tests; integration specs are excluded.
- `npm run test:integration`: six real PostgreSQL RBAC/tenant tests.
- `npm run test:e2e:ci`: seed plus four Playwright critical-flow tests.

The database integration suite covers seeker ownership, coach visibility, guessed IDs, delegated ownership, cross-owner links, role escalation, and last-owner protection.

The browser suite covers:

- Landing-page authentication links.
- Protected-route callback redirects.
- Seeded credentials login.
- Opening an authorized workspace.
- Sign-out and post-sign-out route protection.
- Registration, workspace onboarding, candidate profile persistence, and dashboard visibility.

### GitHub Actions

The CI workflow runs on pushes and pull requests targeting `main`:

- `quality`: `npm ci`, Prisma generation, lint, typecheck, unit tests, production build.
- `integration-e2e`: PostgreSQL 16, migrations, integration tests, Chromium, seed, Playwright.

The workflow uses read-only repository permissions, cancels superseded runs for the same ref, and uploads Playwright diagnostics.

## Deployment and operations

Repository-provided deployment pieces:

- A production Next.js build and start script.
- `vercel.json` daily cron configuration.
- Sentry wrappers and instrumentation.
- Environment templates for Neon/PostgreSQL, Auth.js, Gemini, Resend, R2, Sentry, cron, and Upstash.

Not guaranteed by repository code:

- A linked Vercel project.
- Automatic deploys on merge.
- Provisioned Neon, R2, Upstash, Resend, Google OAuth, Gemini, or Sentry projects.
- Production secrets, domain configuration, backup policy, or operational alerts.

## Known gaps and next engineering work

1. Merge a single-step, content-validated document upload lifecycle with orphan cleanup.
2. Mount and tenant-harden the notification UI; deliver record reminders to the related owner and exclude archived applications from stale alerts.
3. Mount the theme toggle and finish dark-mode coverage across the dashboard.
4. Correct or rename analytics `responseRate`, which currently duplicates `interviewRate`.
5. Add browser coverage for invitations, drag-and-drop stage transitions, uploads, and notification behavior.
6. Decide whether the assistant needs real RAG. If yes, add embeddings, tenant-filtered retrieval, citations, and saved conversation models.
7. Move long-running AI and notification work to a durable queue if request latency or reliability requires it.
8. Add PostgreSQL RLS only as defense in depth after defining/test-driving policies; do not treat it as a replacement for application scopes.
9. Add production deployment runbooks, backup/restore verification, health checks, and alert ownership.
10. Expand router tests beyond the currently covered tenant/RBAC and core application/workspace/interview/task behavior.
