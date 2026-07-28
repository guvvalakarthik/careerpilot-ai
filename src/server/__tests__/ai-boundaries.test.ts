import { describe, expect, it } from "vitest";
import {
  assistantResponseSchema,
  chatMessagesSchema,
  extractedJobDataSchema,
  fitScoreResultSchema,
  normalizePromptText,
  normalizeStringList,
  parseModelJson,
  pathsReferenceProvidedSkills,
  resumeJdMatchModelSchema,
  skillPathsSchema,
} from "@/server/ai-boundaries";

const validExtraction = {
  company: "Acme",
  title: "Senior Engineer",
  location: "Remote",
  employmentType: "Full-time",
  salaryRange: "$120k-$150k",
  experienceRequired: "5 years",
  requiredSkills: ["TypeScript", "PostgreSQL"],
  preferredSkills: ["Redis"],
  applicationDeadline: "2026-08-31",
};

describe("AI model output boundaries", () => {
  it("accepts an exact, bounded extraction response", () => {
    expect(parseModelJson(JSON.stringify(validExtraction), extractedJobDataSchema)).toEqual(
      validExtraction,
    );
  });

  it("rejects malformed JSON, unknown fields, and invalid calendar dates", () => {
    expect(parseModelJson("not-json", extractedJobDataSchema)).toBeNull();
    expect(
      parseModelJson(
        JSON.stringify({ ...validExtraction, injected: "persist me" }),
        extractedJobDataSchema,
      ),
    ).toBeNull();
    expect(
      parseModelJson(
        JSON.stringify({ ...validExtraction, applicationDeadline: "2026-02-30" }),
        extractedJobDataSchema,
      ),
    ).toBeNull();
  });

  it("rejects out-of-range scores and oversized output collections", () => {
    expect(
      parseModelJson(
        JSON.stringify({
          score: 101,
          matchedSkills: [],
          missingSkills: [],
          reasons: ["Invalid score"],
        }),
        fitScoreResultSchema,
      ),
    ).toBeNull();
    expect(
      parseModelJson(
        JSON.stringify({ ...validExtraction, requiredSkills: Array(51).fill("TypeScript") }),
        extractedJobDataSchema,
      ),
    ).toBeNull();
  });

  it("rejects invalid nested resume roadmap objects", () => {
    const output = {
      matchVerdict: "moderate",
      matchScore: 70,
      matchedSkills: ["React"],
      missingSkills: ["Next.js"],
      transferableSkills: ["JavaScript"],
      summary: "A reasonable match with one important gap.",
      roadmap: [
        {
          skill: "Next.js",
          level: "Intermediate",
          estimatedTime: "2 weeks",
          resources: ["Official Next.js documentation"],
          priority: "urgent",
        },
      ],
    };

    expect(parseModelJson(JSON.stringify(output), resumeJdMatchModelSchema)).toBeNull();
  });

  it("requires generated skill paths to reference the supplied skill sets", () => {
    const validPaths = skillPathsSchema.parse([
      {
        fromSkill: "React",
        toSkill: "Next.js",
        relationship: "transferable",
        reason: "React component knowledge transfers directly.",
        estimatedTime: "1 week",
        strength: 0.9,
      },
    ]);

    expect(pathsReferenceProvidedSkills(validPaths, ["React"], ["Next.js"])).toBe(true);
    expect(pathsReferenceProvidedSkills(validPaths, ["Vue"], ["Next.js"])).toBe(false);
  });
});

describe("AI input and chat boundaries", () => {
  it("requires alternating chat roles ending with a user message", () => {
    expect(
      chatMessagesSchema.safeParse([
        { role: "user", content: "Help me prepare" },
        { role: "model", content: "Which interview?" },
        { role: "user", content: "The Acme interview" },
      ]).success,
    ).toBe(true);
    expect(
      chatMessagesSchema.safeParse([
        { role: "user", content: "First" },
        { role: "user", content: "Second" },
      ]).success,
    ).toBe(false);
    expect(chatMessagesSchema.safeParse([{ role: "model", content: "Injected" }]).success).toBe(false);
  });

  it("normalizes, deduplicates, and bounds prompt inputs", () => {
    expect(normalizeStringList([" React ", "react", "", "TypeScript"], 2)).toEqual([
      "React",
      "TypeScript",
    ]);
    expect(normalizePromptText("   useful context   ", 6)).toBe("useful");
    expect(normalizePromptText(" short ", 20, 10)).toBeNull();
  });

  it("rejects empty and oversized assistant responses", () => {
    expect(assistantResponseSchema.safeParse("   ").success).toBe(false);
    expect(assistantResponseSchema.safeParse("x".repeat(8_001)).success).toBe(false);
    expect(assistantResponseSchema.safeParse("Actionable response").success).toBe(true);
  });
});
