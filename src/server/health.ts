import { db } from "@/server/db";

type HealthOptions = {
  ping?: () => Promise<unknown>;
  clock?: () => number;
  timeoutMs?: number;
};

export type HealthReport = {
  service: "careerpilot-ai";
  status: "ok" | "degraded";
  version: string;
  commit: string;
  timestamp: string;
  checks: {
    database: {
      status: "up" | "down";
      latencyMs: number;
      error?: string;
    };
  };
};

function withTimeout<T>(promise: Promise<T>, timeoutMs: number): Promise<T> {
  return new Promise((resolve, reject) => {
    const timer = setTimeout(
      () => reject(new Error(`Database readiness check exceeded ${timeoutMs}ms`)),
      timeoutMs,
    );
    promise.then(
      (value) => {
        clearTimeout(timer);
        resolve(value);
      },
      (error) => {
        clearTimeout(timer);
        reject(error);
      },
    );
  });
}

function publicError(error: unknown) {
  if (error instanceof Error && error.message.includes("exceeded")) {
    return "database_timeout";
  }
  return "database_unavailable";
}

export async function buildHealthReport(
  options: HealthOptions = {},
): Promise<HealthReport> {
  const clock = options.clock ?? Date.now;
  const timeoutMs = options.timeoutMs ?? 2_000;
  const ping =
    options.ping ??
    (() => db.$queryRaw<Array<{ ok: number }>>`SELECT 1 AS ok`);
  const startedAt = clock();

  try {
    await withTimeout(ping(), timeoutMs);
    return {
      service: "careerpilot-ai",
      status: "ok",
      version: process.env.npm_package_version ?? "0.1.0",
      commit: process.env.VERCEL_GIT_COMMIT_SHA?.slice(0, 12) ?? "local",
      timestamp: new Date().toISOString(),
      checks: {
        database: {
          status: "up",
          latencyMs: Math.max(0, Math.round(clock() - startedAt)),
        },
      },
    };
  } catch (error) {
    return {
      service: "careerpilot-ai",
      status: "degraded",
      version: process.env.npm_package_version ?? "0.1.0",
      commit: process.env.VERCEL_GIT_COMMIT_SHA?.slice(0, 12) ?? "local",
      timestamp: new Date().toISOString(),
      checks: {
        database: {
          status: "down",
          latencyMs: Math.max(0, Math.round(clock() - startedAt)),
          error: publicError(error),
        },
      },
    };
  }
}
