import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import {
  checkRateLimit,
  getClientIp,
  limitHttpRequest,
  RateLimitUnavailableError,
  resetRateLimitStateForTests,
} from "@/server/rate-limit";

describe("rate limiting", () => {
  beforeEach(() => {
    resetRateLimitStateForTests();
    vi.useFakeTimers();
    vi.setSystemTime(new Date("2026-07-28T00:00:00Z"));
  });

  afterEach(() => {
    vi.useRealTimers();
    vi.unstubAllEnvs();
  });

  it("blocks after the deterministic development limit and resets by window", async () => {
    for (let attempt = 0; attempt < 5; attempt += 1) {
      expect((await checkRateLimit("login", "198.51.100.1")).success).toBe(true);
    }
    const blocked = await checkRateLimit("login", "198.51.100.1");
    expect(blocked).toMatchObject({ success: false, limit: 5, remaining: 0, retryAfter: 600 });

    vi.advanceTimersByTime(10 * 60_000);
    expect((await checkRateLimit("login", "198.51.100.1")).success).toBe(true);
  });

  it("returns HTTP 429 with retry metadata", async () => {
    const request = new Request("https://example.test/api/register", {
      headers: { "x-forwarded-for": "203.0.113.10, 10.0.0.1" },
    });
    for (let attempt = 0; attempt < 3; attempt += 1) {
      expect(await limitHttpRequest(request, "register")).toBeNull();
    }
    const response = await limitHttpRequest(request, "register");
    expect(response?.status).toBe(429);
    expect(response?.headers.get("Retry-After")).toBe("3600");
    expect(response?.headers.get("RateLimit-Remaining")).toBe("0");
    await expect(response?.json()).resolves.toMatchObject({ error: "Too many requests", retryAfter: 3600 });
  });

  it("uses separate authenticated user and workspace identities", async () => {
    for (let attempt = 0; attempt < 20; attempt += 1) {
      await checkRateLimit("ai", "user-1:workspace-1");
    }
    expect((await checkRateLimit("ai", "user-1:workspace-1")).success).toBe(false);
    expect((await checkRateLimit("ai", "user-1:workspace-2")).success).toBe(true);
  });

  it("extracts the first trusted forwarding address", () => {
    const request = new Request("https://example.test", {
      headers: { "x-forwarded-for": "198.51.100.7, 10.0.0.2" },
    });
    expect(getClientIp(request)).toBe("198.51.100.7");
  });

  it("fails closed in production when Upstash is missing", async () => {
    vi.stubEnv("NODE_ENV", "production");
    vi.stubEnv("UPSTASH_REDIS_REST_URL", "");
    vi.stubEnv("UPSTASH_REDIS_REST_TOKEN", "");
    await expect(checkRateLimit("login", "198.51.100.1")).rejects.toBeInstanceOf(
      RateLimitUnavailableError,
    );
  });
});
