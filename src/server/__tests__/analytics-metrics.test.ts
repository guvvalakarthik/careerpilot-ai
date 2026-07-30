import { describe, expect, it } from "vitest";
import { nearestRankPercentile, percentage } from "../analytics-metrics";

describe("analytics metrics", () => {
  it("uses nearest-rank percentiles without mutating input", () => {
    const values = [900, 100, 400, 200];
    expect(nearestRankPercentile(values, 95)).toBe(900);
    expect(nearestRankPercentile(values, 50)).toBe(200);
    expect(values).toEqual([900, 100, 400, 200]);
  });

  it("handles empty samples and zero denominators", () => {
    expect(nearestRankPercentile([], 95)).toBeNull();
    expect(percentage(1, 0)).toBe(0);
    expect(percentage(3, 4)).toBe(75);
  });
});
