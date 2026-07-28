import { describe, expect, it } from "vitest";
import { isValidCronAuthorization } from "@/server/cron-auth";

describe("cron authorization", () => {
  it("fails closed when the server secret is missing", () => {
    expect(isValidCronAuthorization("Bearer anything", undefined)).toBe(false);
    expect(isValidCronAuthorization("Bearer anything", "")).toBe(false);
  });

  it("accepts only the exact bearer secret", () => {
    expect(isValidCronAuthorization("Bearer correct-secret", "correct-secret")).toBe(true);
    expect(isValidCronAuthorization("Bearer wrong-secret", "correct-secret")).toBe(false);
    expect(isValidCronAuthorization("Bearer correct-secret-extra", "correct-secret")).toBe(false);
    expect(isValidCronAuthorization(null, "correct-secret")).toBe(false);
  });
});
