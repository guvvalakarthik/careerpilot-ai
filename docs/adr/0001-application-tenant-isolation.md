# ADR 0001: Application-enforced tenant isolation

- Status: Accepted
- Date: 2026-07-30

## Context

CareerPilot uses Prisma through pooled PostgreSQL connections. Every domain record belongs to a workspace, and seeker-owned records also carry an owner. Request-specific PostgreSQL roles or session variables are not currently transaction-bound across all queries.

## Decision

Enforce tenancy in the server data-access boundary using authenticated workspace procedures, role gates, owner scopes, compound workspace keys, and PostgreSQL integration tests. Return not found for guessed peer records. Do not claim database RLS.

## Consequences

The policy is explicit and works with pooled/serverless connections, but every new query must adopt the established procedure and scope helpers. RLS may later be added as defense in depth only after transaction-local context and complete policy tests exist.
