import { Ratelimit, type Duration } from "@upstash/ratelimit";
import { Redis } from "@upstash/redis";

export type RateLimitPolicy =
  | "login"
  | "register"
  | "passwordReset"
  | "extract"
  | "upload"
  | "ai"
  | "expensive";

const policies: Record<RateLimitPolicy, { limit: number; window: Duration; windowMs: number }> = {
  login: { limit: 5, window: "10 m", windowMs: 10 * 60_000 },
  register: { limit: 3, window: "1 h", windowMs: 60 * 60_000 },
  passwordReset: { limit: 5, window: "15 m", windowMs: 15 * 60_000 },
  extract: { limit: 10, window: "1 m", windowMs: 60_000 },
  upload: { limit: 10, window: "1 m", windowMs: 60_000 },
  ai: { limit: 20, window: "1 m", windowMs: 60_000 },
  expensive: { limit: 30, window: "1 m", windowMs: 60_000 },
};

export type RateLimitResult = {
  success: boolean;
  limit: number;
  remaining: number;
  reset: number;
  retryAfter: number;
};

export class RateLimitUnavailableError extends Error {
  constructor() {
    super("Rate limiting is not configured or unavailable");
    this.name = "RateLimitUnavailableError";
  }
}

export class RateLimitExceededCause extends Error {
  constructor(public readonly result: RateLimitResult) {
    super("Rate limit exceeded");
    this.name = "RateLimitExceededCause";
  }
}

const memoryCounters = new Map<string, { count: number; reset: number }>();
const redisLimiters = new Map<RateLimitPolicy, Ratelimit>();

export function isUpstashConfigured() {
  return Boolean(
    process.env.UPSTASH_REDIS_REST_URL &&
    process.env.UPSTASH_REDIS_REST_TOKEN,
  );
}

function retryAfterSeconds(reset: number, now: number) {
  return Math.max(1, Math.ceil((reset - now) / 1000));
}

function checkMemory(policy: RateLimitPolicy, identifier: string, now: number): RateLimitResult {
  const config = policies[policy];
  const key = `${policy}:${identifier}`;
  const current = memoryCounters.get(key);
  const entry = !current || current.reset <= now
    ? { count: 0, reset: now + config.windowMs }
    : current;
  entry.count += 1;
  memoryCounters.set(key, entry);
  return {
    success: entry.count <= config.limit,
    limit: config.limit,
    remaining: Math.max(0, config.limit - entry.count),
    reset: entry.reset,
    retryAfter: retryAfterSeconds(entry.reset, now),
  };
}

function getRedisLimiter(policy: RateLimitPolicy) {
  const cached = redisLimiters.get(policy);
  if (cached) return cached;
  const config = policies[policy];
  const limiter = new Ratelimit({
    redis: Redis.fromEnv(),
    limiter: Ratelimit.slidingWindow(config.limit, config.window),
    prefix: `careerpilot:ratelimit:${policy}`,
    analytics: false,
    timeout: 0,
  });
  redisLimiters.set(policy, limiter);
  return limiter;
}

export async function checkRateLimit(
  policy: RateLimitPolicy,
  identifier: string,
  now = Date.now(),
): Promise<RateLimitResult> {
  const normalizedIdentifier = identifier.trim().slice(0, 256) || "unknown";
  if (process.env.NODE_ENV !== "production") {
    return checkMemory(policy, normalizedIdentifier, now);
  }
  if (!isUpstashConfigured()) throw new RateLimitUnavailableError();

  try {
    const result = await getRedisLimiter(policy).limit(normalizedIdentifier);
    return {
      success: result.success,
      limit: result.limit,
      remaining: result.remaining,
      reset: result.reset,
      retryAfter: retryAfterSeconds(result.reset, now),
    };
  } catch {
    throw new RateLimitUnavailableError();
  }
}

export function getClientIp(request: Request) {
  const forwarded = request.headers.get("x-forwarded-for")?.split(",")[0]?.trim();
  return (
    request.headers.get("cf-connecting-ip") ||
    request.headers.get("x-real-ip") ||
    forwarded ||
    "unknown"
  ).slice(0, 64);
}

export function rateLimitHeaders(result: RateLimitResult) {
  return {
    "Retry-After": String(result.retryAfter),
    "RateLimit-Limit": String(result.limit),
    "RateLimit-Remaining": String(result.remaining),
    "RateLimit-Reset": String(Math.ceil(result.reset / 1000)),
  };
}

export async function limitHttpRequest(
  request: Request,
  policy: RateLimitPolicy,
  identifier = getClientIp(request),
): Promise<Response | null> {
  try {
    const result = await checkRateLimit(policy, identifier);
    if (result.success) return null;
    return Response.json(
      { error: "Too many requests", retryAfter: result.retryAfter },
      { status: 429, headers: rateLimitHeaders(result) },
    );
  } catch (error) {
    if (error instanceof RateLimitUnavailableError) {
      return Response.json({ error: "Rate limiting unavailable" }, { status: 503 });
    }
    throw error;
  }
}

export function resetRateLimitStateForTests() {
  memoryCounters.clear();
  redisLimiters.clear();
}
