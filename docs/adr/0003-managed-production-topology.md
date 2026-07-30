# ADR 0003: Managed production topology

- Status: Accepted
- Date: 2026-07-30

## Context

The portfolio needs a deployable topology that supports Next.js server features, PostgreSQL vectors, private object storage, distributed rate limiting, durable jobs, email, AI, and tracing without operating a Kubernetes platform.

## Decision

Use Vercel, Neon PostgreSQL/pgvector, Cloudflare R2, Upstash Redis, Inngest, Gemini, Resend, and Sentry as the reference topology. Keep provider boundaries behind server modules and environment variables so a standard Node.js host can replace Vercel.

## Consequences

The system gains production primitives and low operational overhead but depends on several managed services. Preview and production resources must be isolated, provider failures must degrade safely, and costs/quotas must be monitored.
