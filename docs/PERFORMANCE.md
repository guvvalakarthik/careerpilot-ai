# Performance evidence

## Reproducible smoke load

The dependency-free harness exercises the landing page and database-backed readiness route using concurrent Node.js requests:

```powershell
npm run build
npm run start -- --hostname 127.0.0.1 --port 3000
$env:LOAD_BASE_URL = "http://127.0.0.1:3000"
$env:LOAD_DURATION_SECONDS = "30"
$env:LOAD_CONCURRENCY = "20"
$env:LOAD_MAX_P95_MS = "1000"
$env:LOAD_MAX_ERROR_RATE = "0.01"
npm run load:smoke
```

The command emits machine-readable JSON with request count, requests/second, status distribution, error rate, and p50/p95/p99 latency. It exits non-zero when thresholds fail.

## Local verification baseline

A local result belongs here only after a production build, migrated local PostgreSQL, and the exact command/environment are recorded. Local numbers demonstrate regression detection, not internet-scale capacity. Production results should come from the deployed region against a non-destructive workload.

| Date | Commit | Environment | Duration | Concurrency | Requests/s | p95 | Error rate |
|---|---|---|---:|---:|---:|---:|---:|
| 2026-07-30 | working tree | Windows 11, Node 20, production Next.js, Docker PostgreSQL | 20.2s | 20 | 76.7 | 428.9 ms | 0% |

## Production test plan

1. Establish a 15-minute baseline for `/` and `/api/health`.
2. Add authenticated read-only tRPC scenarios with a dedicated load-test tenant.
3. Measure database pool saturation, p95/p99, cold starts, cache behavior, and provider latency separately.
4. Test RAG backfills as an asynchronous workload and confirm interactive APIs retain their SLO.
5. Inject temporary AI, Inngest, Redis, R2, and database failures in staging.
6. Store raw results as CI artifacts and compare them to the previous release.

Initial release targets:

- availability during the test: at least 99%;
- read-only p95: below 1,000 ms from the deployment region;
- no cross-tenant results under concurrency;
- core mutations complete even when optional AI/index publishing is unavailable; and
- readiness returns 503 when the database is unavailable.
