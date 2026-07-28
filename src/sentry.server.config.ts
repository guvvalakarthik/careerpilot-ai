import * as Sentry from "@sentry/nextjs";
import { parseSentrySampleRate } from "@/lib/sentry-config";

const tracesSampleRate = parseSentrySampleRate(
  process.env.SENTRY_TRACES_SAMPLE_RATE,
);

Sentry.init({
  dsn: process.env.SENTRY_DSN,
  tracesSampleRate,
  environment: process.env.NODE_ENV,
  enabled: Boolean(process.env.SENTRY_DSN),
});
