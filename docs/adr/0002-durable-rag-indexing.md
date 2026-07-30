# ADR 0002: Durable and idempotent RAG indexing

- Status: Accepted
- Date: 2026-07-30

## Context

Embedding documents inside request handlers creates long user latency and loses work on provider or runtime failure. Events must not contain private document text, and retries must not create duplicate chunks.

## Decision

Publish identifier-only events to Inngest with a bounded publishing wait. Reload the source through workspace/owner-scoped queries inside the job. Retry four times, serialize work per source, hash normalized content, skip unchanged versions, replace chunks atomically, and persist READY/FAILED status. Use workspace backfill as reconciliation.

## Consequences

Core mutations remain available during indexing-provider failures and jobs are safe to repeat. A brief event-delivery outage can delay indexing until a later update or backfill; this is an intentional eventual-consistency trade-off rather than a distributed database transaction.
