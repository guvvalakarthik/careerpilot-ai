const profile = process.env.DEPLOYMENT_PROFILE ?? "core";
if (!new Set(["core", "full"]).has(profile)) {
  throw new Error("DEPLOYMENT_PROFILE must be either core or full");
}

const groups = {
  core: [
    "DATABASE_URL",
    "AUTH_SECRET",
    "AUTH_URL",
    "CRON_SECRET",
    "UPSTASH_REDIS_REST_URL",
    "UPSTASH_REDIS_REST_TOKEN",
  ],
  full: [
    "GOOGLE_GENERATIVE_AI_API_KEY",
    "INNGEST_EVENT_KEY",
    "INNGEST_SIGNING_KEY",
    "R2_ACCOUNT_ID",
    "R2_ACCESS_KEY_ID",
    "R2_SECRET_ACCESS_KEY",
    "R2_BUCKET_NAME",
    "SENTRY_DSN",
  ],
};

const required = profile === "full" ? [...groups.core, ...groups.full] : groups.core;
const missing = required.filter((name) => !process.env[name]?.trim());
const problems = [];

if (process.env.AUTH_SECRET && process.env.AUTH_SECRET.length < 32) {
  problems.push("AUTH_SECRET must contain at least 32 characters");
}
if (process.env.CRON_SECRET && process.env.CRON_SECRET.length < 24) {
  problems.push("CRON_SECRET must contain at least 24 characters");
}
if (process.env.DATABASE_URL && !/^postgres(ql)?:\/\//.test(process.env.DATABASE_URL)) {
  problems.push("DATABASE_URL must be a PostgreSQL connection URL");
}
if (process.env.AUTH_URL) {
  const authUrl = new URL(process.env.AUTH_URL);
  if (authUrl.protocol !== "https:" && !["localhost", "127.0.0.1"].includes(authUrl.hostname)) {
    problems.push("AUTH_URL must use HTTPS outside local development");
  }
}

if (missing.length || problems.length) {
  console.error(JSON.stringify({ ok: false, profile, missing, problems }, null, 2));
  process.exit(1);
}

console.log(JSON.stringify({ ok: true, profile, checked: required }, null, 2));
