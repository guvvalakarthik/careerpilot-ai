import { describe, expect, it } from "vitest";
import {
  matchesExperienceFilter,
  matchesLocationFilter,
  matchesWorkplaceFilter,
  parseExperienceRange,
  splitOpportunityLocation,
} from "@/lib/opportunity-filters";

describe("opportunity filters", () => {
  it("splits legacy and normalized location/workplace values", () => {
    expect(splitOpportunityLocation("Bengaluru · Hybrid")).toEqual({ city: "Bengaluru", mode: "Hybrid" });
    expect(splitOpportunityLocation("Chennai | Remote")).toEqual({ city: "Chennai", mode: "Remote" });
    expect(splitOpportunityLocation("Mumbai - On-site")).toEqual({ city: "Mumbai", mode: "On-site" });
    expect(splitOpportunityLocation("Hyderabad")).toEqual({ city: "Hyderabad", mode: "Not specified" });
  });

  it("parses bounded, open-ended, and single-year experience", () => {
    expect(parseExperienceRange("2–4 years")).toEqual({ min: 2, max: 4 });
    expect(parseExperienceRange("3 to 5 years")).toEqual({ min: 3, max: 5 });
    expect(parseExperienceRange("5+ years")).toEqual({ min: 5, max: Number.POSITIVE_INFINITY });
    expect(parseExperienceRange("2 years")).toEqual({ min: 2, max: 2 });
  });

  it("matches experience buckets by range overlap", () => {
    expect(matchesExperienceFilter("0-2 years", "0-3 years")).toBe(true);
    expect(matchesExperienceFilter("2-4 years", "3-5 years")).toBe(true);
    expect(matchesExperienceFilter("4-6 years", "5+ years")).toBe(true);
    expect(matchesExperienceFilter("0-2 years", "5+ years")).toBe(false);
    expect(matchesExperienceFilter(null, "Any experience")).toBe(true);
  });

  it("normalizes workplace and location comparisons", () => {
    expect(matchesWorkplaceFilter("On site", "On-site")).toBe(true);
    expect(matchesWorkplaceFilter("Remote", "Hybrid")).toBe(false);
    expect(matchesLocationFilter("Chennai", "chennai")).toBe(true);
    expect(matchesLocationFilter("Chennai", "All locations")).toBe(true);
  });
});