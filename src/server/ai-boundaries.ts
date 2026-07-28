import { z } from "zod";

const nonEmptyText = (maxLength: number) => z.string().trim().min(1).max(maxLength);
const nullableText = (maxLength: number) => nonEmptyText(maxLength).nullable();
const skill = nonEmptyText(100);
const skillList = z.array(skill).max(50);
const isoDate = z
  .string()
  .regex(/^\d{4}-\d{2}-\d{2}$/)
  .refine((value) => {
    const parsed = new Date(`${value}T00:00:00.000Z`);
    return !Number.isNaN(parsed.getTime()) && parsed.toISOString().startsWith(value);
  }, "Invalid calendar date");

export const extractedJobDataSchema = z
  .object({
    company: nullableText(200),
    title: nullableText(300),
    location: nullableText(200),
    employmentType: nullableText(80),
    salaryRange: nullableText(100),
    experienceRequired: nullableText(100),
    requiredSkills: skillList,
    preferredSkills: skillList,
    applicationDeadline: isoDate.nullable(),
  })
  .strict();

export const fitScoreResultSchema = z
  .object({
    score: z.number().finite().min(0).max(100),
    matchedSkills: skillList,
    missingSkills: skillList,
    reasons: z.array(nonEmptyText(300)).min(1).max(4),
  })
  .strict();

const roadmapItemSchema = z
  .object({
    skill,
    level: nonEmptyText(80),
    estimatedTime: nonEmptyText(80),
    resources: z.array(nonEmptyText(300)).min(1).max(5),
    priority: z.enum(["high", "medium", "low"]),
  })
  .strict();

export const resumeJdMatchModelSchema = z
  .object({
    matchVerdict: z.enum(["strong", "moderate", "weak"]),
    matchScore: z.number().finite().min(0).max(100),
    matchedSkills: skillList,
    missingSkills: skillList,
    transferableSkills: skillList,
    summary: nonEmptyText(1_000),
    roadmap: z.array(roadmapItemSchema).max(20),
  })
  .strict();

export const skillPathSchema = z
  .object({
    fromSkill: skill,
    toSkill: skill,
    relationship: z.enum(["transferable", "prerequisite", "complementary"]),
    reason: nonEmptyText(300),
    estimatedTime: nonEmptyText(80),
    strength: z.number().finite().min(0).max(1),
  })
  .strict();

export const skillPathsSchema = z.array(skillPathSchema).max(8);

export const chatMessagesSchema = z
  .array(
    z
      .object({
        role: z.enum(["user", "model"]),
        content: nonEmptyText(4_000),
      })
      .strict(),
  )
  .min(1)
  .max(20)
  .superRefine((messages, ctx) => {
    if (messages[0]?.role !== "user") {
      ctx.addIssue({ code: "custom", message: "Conversation must start with a user message" });
    }
    if (messages.at(-1)?.role !== "user") {
      ctx.addIssue({ code: "custom", message: "Conversation must end with a user message" });
    }
    for (let index = 1; index < messages.length; index += 1) {
      if (messages[index]?.role === messages[index - 1]?.role) {
        ctx.addIssue({
          code: "custom",
          message: "Conversation roles must alternate",
          path: [index, "role"],
        });
      }
    }
  });

export const assistantResponseSchema = nonEmptyText(8_000);

export function parseModelJson<T>(text: string, schema: z.ZodType<T>): T | null {
  try {
    const json: unknown = JSON.parse(text);
    const parsed = schema.safeParse(json);
    return parsed.success ? parsed.data : null;
  } catch {
    return null;
  }
}

export function normalizePromptText(value: string, maxLength: number, minLength = 1) {
  const normalized = value.trim();
  if (normalized.length < minLength) return null;
  return normalized.slice(0, maxLength);
}

export function normalizeStringList(values: string[], maxItems = 50, maxLength = 100) {
  const unique = new Map<string, string>();
  for (const value of values) {
    const normalized = value.trim().slice(0, maxLength);
    if (!normalized) continue;
    const key = normalized.toLocaleLowerCase("en-US");
    if (!unique.has(key)) unique.set(key, normalized);
    if (unique.size >= maxItems) break;
  }
  return [...unique.values()];
}

export function pathsReferenceProvidedSkills(
  paths: z.infer<typeof skillPathsSchema>,
  matchedSkills: string[],
  missingSkills: string[],
) {
  const matched = new Set(normalizeStringList(matchedSkills).map((value) => value.toLocaleLowerCase("en-US")));
  const missing = new Set(normalizeStringList(missingSkills).map((value) => value.toLocaleLowerCase("en-US")));
  return paths.every(
    (path) =>
      matched.has(path.fromSkill.toLocaleLowerCase("en-US")) &&
      missing.has(path.toSkill.toLocaleLowerCase("en-US")),
  );
}
