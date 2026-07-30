const baseUrl = (process.env.LOAD_BASE_URL ?? "http://127.0.0.1:3000").replace(/\/$/, "");
const durationSeconds = Number(process.env.LOAD_DURATION_SECONDS ?? 10);
const concurrency = Number(process.env.LOAD_CONCURRENCY ?? 10);
const maxP95Ms = Number(process.env.LOAD_MAX_P95_MS ?? 1000);
const maxErrorRate = Number(process.env.LOAD_MAX_ERROR_RATE ?? 0.01);
const paths = (process.env.LOAD_PATHS ?? "/,/api/health")
  .split(",")
  .map((path) => path.trim())
  .filter(Boolean);

if (!Number.isFinite(durationSeconds) || durationSeconds <= 0) {
  throw new Error("LOAD_DURATION_SECONDS must be a positive number");
}
if (!Number.isInteger(concurrency) || concurrency <= 0 || concurrency > 500) {
  throw new Error("LOAD_CONCURRENCY must be an integer between 1 and 500");
}

const latencies = [];
const statuses = new Map();
let failures = 0;
let cursor = 0;
const startedAt = performance.now();
const deadline = startedAt + durationSeconds * 1000;

async function worker() {
  while (performance.now() < deadline) {
    const path = paths[cursor++ % paths.length];
    const requestStartedAt = performance.now();
    try {
      const response = await fetch(`${baseUrl}${path}`, {
        redirect: "manual",
        headers: { "User-Agent": "CareerPilot-load-smoke/1.0" },
      });
      latencies.push(performance.now() - requestStartedAt);
      statuses.set(response.status, (statuses.get(response.status) ?? 0) + 1);
      if (response.status >= 500) failures += 1;
      await response.body?.cancel();
    } catch {
      failures += 1;
      latencies.push(performance.now() - requestStartedAt);
    }
  }
}

await Promise.all(Array.from({ length: concurrency }, () => worker()));

latencies.sort((a, b) => a - b);
const elapsedSeconds = (performance.now() - startedAt) / 1000;
const percentile = (value) => {
  if (!latencies.length) return 0;
  const index = Math.min(latencies.length - 1, Math.ceil((value / 100) * latencies.length) - 1);
  return Math.round(latencies[index] * 10) / 10;
};
const errorRate = latencies.length ? failures / latencies.length : 1;
const result = {
  target: baseUrl,
  paths,
  durationSeconds: Math.round(elapsedSeconds * 10) / 10,
  concurrency,
  requests: latencies.length,
  requestsPerSecond: Math.round((latencies.length / elapsedSeconds) * 10) / 10,
  latencyMs: { p50: percentile(50), p95: percentile(95), p99: percentile(99) },
  failures,
  errorRate: Math.round(errorRate * 10000) / 10000,
  statuses: Object.fromEntries([...statuses.entries()].sort(([a], [b]) => a - b)),
  thresholds: { maxP95Ms, maxErrorRate },
};

console.log(JSON.stringify(result, null, 2));

if (result.latencyMs.p95 > maxP95Ms || errorRate > maxErrorRate) {
  console.error("Load smoke thresholds failed.");
  process.exitCode = 1;
}
