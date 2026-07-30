import { describe, expect, it } from "vitest";
import { isPublicPath } from "../public-paths";

describe("public route policy", () => {
  it.each([
    "/",
    "/login",
    "/forgot-password",
    "/reset-password",
    "/api/health",
    "/api/auth/session",
    "/api/cron/notifications",
    "/api/inngest",
  ])("allows %s to reach its route-level controls", (path) => {
    expect(isPublicPath(path)).toBe(true);
  });

  it.each(["/dashboard", "/dashboard/workspace-1", "/api/upload", "/api/trpc/application.list"])(
    "keeps %s behind authentication",
    (path) => {
      expect(isPublicPath(path)).toBe(false);
    },
  );
});
