import { describe, expect, it, vi } from "vitest";
import { buildHealthReport } from "../health";

describe("health report", () => {
  it("reports database readiness without exposing configuration", async () => {
    const ping = vi.fn().mockResolvedValue([{ ok: 1 }]);
    const ticks = [100, 112];

    const report = await buildHealthReport({
      ping,
      clock: () => ticks.shift() ?? 112,
    });

    expect(report.status).toBe("ok");
    expect(report.checks.database).toEqual({ status: "up", latencyMs: 12 });
    expect(ping).toHaveBeenCalledOnce();
    expect(JSON.stringify(report)).not.toContain("DATABASE_URL");
  });

  it("fails closed with a stable public error", async () => {
    const report = await buildHealthReport({
      ping: vi.fn().mockRejectedValue(new Error("password authentication failed")),
      clock: () => 100,
    });

    expect(report.status).toBe("degraded");
    expect(report.checks.database).toEqual({
      status: "down",
      latencyMs: 0,
      error: "database_unavailable",
    });
    expect(JSON.stringify(report)).not.toContain("password authentication failed");
  });
});
