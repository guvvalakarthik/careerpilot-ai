import type { NextConfig } from "next";
import { withSentryConfig } from "@sentry/nextjs";

const nextConfig: NextConfig = {
  turbopack: {
    root: __dirname,
  },
  allowedDevOrigins: ["127.0.0.1", "localhost"],
};

const canUploadSentrySourceMaps = Boolean(
  process.env.SENTRY_AUTH_TOKEN &&
    process.env.SENTRY_ORG &&
    process.env.SENTRY_PROJECT,
);

export default withSentryConfig(nextConfig, {
  org: process.env.SENTRY_ORG,
  project: process.env.SENTRY_PROJECT,
  authToken: process.env.SENTRY_AUTH_TOKEN,
  silent: !canUploadSentrySourceMaps,
  sourcemaps: {
    disable: !canUploadSentrySourceMaps,
  },
  widenClientFileUpload: canUploadSentrySourceMaps,
  webpack: {
    treeshake: {
      removeDebugLogging: true,
    },
  },
});
