export type ExperienceFilter = "Any experience" | "0-3 years" | "3-5 years" | "5+ years";
export type WorkplaceFilter = "Any workplace" | "Hybrid" | "Remote" | "On-site";

type ExperienceRange = { min: number; max: number };

export function splitOpportunityLocation(value: string | null) {
  const normalized = (value ?? "").trim().replace(/Â·/g, "·");
  const parts = normalized.split(/\s*(?:[·•|]|\s+-\s+)\s*/).filter(Boolean);
  const city = parts[0] || "Location not provided";
  const rawMode = parts.slice(1).join(" ");
  return {
    city,
    mode: normalizeWorkplace(rawMode) ?? "Not specified",
  };
}

export function normalizeWorkplace(value: string | null) {
  const normalized = (value ?? "").trim().toLowerCase().replace(/[\s_-]+/g, "");
  if (normalized === "remote" || normalized === "workfromhome" || normalized === "wfh") return "Remote";
  if (normalized === "hybrid") return "Hybrid";
  if (normalized === "onsite" || normalized === "office") return "On-site";
  return null;
}

export function parseExperienceRange(value: string | null): ExperienceRange | null {
  const normalized = (value ?? "").trim().toLowerCase().replace(/[–—]/g, "-");
  const range = normalized.match(/(\d+(?:\.\d+)?)\s*(?:-|to)\s*(\d+(?:\.\d+)?)/);
  if (range) {
    const first = Number(range[1]);
    const second = Number(range[2]);
    return { min: Math.min(first, second), max: Math.max(first, second) };
  }
  const plus = normalized.match(/(\d+(?:\.\d+)?)\s*\+/);
  if (plus) return { min: Number(plus[1]), max: Number.POSITIVE_INFINITY };
  const single = normalized.match(/(\d+(?:\.\d+)?)/);
  if (single) {
    const years = Number(single[1]);
    return { min: years, max: years };
  }
  return null;
}

export function matchesExperienceFilter(value: string | null, filter: ExperienceFilter) {
  if (filter === "Any experience") return true;
  const role = parseExperienceRange(value);
  if (!role) return false;
  const bucket = filter === "0-3 years"
    ? { min: 0, max: 3 }
    : filter === "3-5 years"
      ? { min: 3, max: 5 }
      : { min: 5, max: Number.POSITIVE_INFINITY };
  return role.min <= bucket.max && role.max >= bucket.min;
}

export function matchesWorkplaceFilter(value: string | null, filter: WorkplaceFilter) {
  return filter === "Any workplace" || normalizeWorkplace(value) === filter;
}

export function matchesLocationFilter(value: string | null, filter: string) {
  return filter === "All locations" || value?.trim().toLowerCase() === filter.trim().toLowerCase();
}