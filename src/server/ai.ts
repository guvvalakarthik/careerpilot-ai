import { GoogleGenerativeAI } from "@google/generative-ai";

const apiKey = process.env.GOOGLE_GENERATIVE_AI_API_KEY;

function getClient() {
  if (!apiKey) return null;
  return new GoogleGenerativeAI(apiKey);
}

export interface ExtractedJobData {
  company: string | null;
  title: string | null;
  location: string | null;
  employmentType: string | null;
  salaryRange: string | null;
  experienceRequired: string | null;
  requiredSkills: string[];
  preferredSkills: string[];
  applicationDeadline: string | null;
}

/**
 * Extracts structured job data from a raw job description or URL content.
 * Returns null if no API key is configured.
 */
export async function extractJobData(rawInput: string): Promise<ExtractedJobData | null> {
  const client = getClient();
  if (!client) return null;

  const model = client.getGenerativeModel({
    model: "gemini-flash-latest",
    generationConfig: {
      responseMimeType: "application/json",
    },
  });

  const prompt = `Extract structured job information from the following job posting. Return JSON with these exact fields:
{
  "company": string | null,
  "title": string | null,
  "location": string | null,
  "employmentType": string | null (e.g. "Full-time", "Contract", "Part-time"),
  "salaryRange": string | null (e.g. "$120k-$150k"),
  "experienceRequired": string | null (e.g. "3-5 years"),
  "requiredSkills": string[],
  "preferredSkills": string[],
  "applicationDeadline": string | null (ISO date if mentioned, else null)
}

Only include skills explicitly mentioned. If a field is not present in the posting, use null or empty array.

Job posting:
"""
${rawInput.slice(0, 8000)}
"""`;

  try {
    const result = await model.generateContent(prompt);
    const text = result.response.text();
    const parsed = JSON.parse(text) as ExtractedJobData;
    return {
      company: parsed.company ?? null,
      title: parsed.title ?? null,
      location: parsed.location ?? null,
      employmentType: parsed.employmentType ?? null,
      salaryRange: parsed.salaryRange ?? null,
      experienceRequired: parsed.experienceRequired ?? null,
      requiredSkills: Array.isArray(parsed.requiredSkills) ? parsed.requiredSkills : [],
      preferredSkills: Array.isArray(parsed.preferredSkills) ? parsed.preferredSkills : [],
      applicationDeadline: parsed.applicationDeadline ?? null,
    };
  } catch (err) {
    console.error("AI extraction failed:", err);
    return null;
  }
}

export interface FitScoreResult {
  score: number;
  matchedSkills: string[];
  missingSkills: string[];
  reasons: string[];
}

/**
 * Calculates a fit score by comparing candidate skills against job required skills.
 * Returns null if no API key is configured.
 */
export async function calculateFitScore(
  candidateSkills: string[],
  requiredSkills: string[],
  preferredSkills: string[],
  yearsExperience: number | null,
  experienceRequired: string | null,
): Promise<FitScoreResult | null> {
  const client = getClient();
  if (!client) return null;

  // Simple algorithmic fallback even without AI — skills matching
  const candidateLower = candidateSkills.map((s) => s.toLowerCase());
  const matched = requiredSkills.filter((s) =>
    candidateLower.some((c) => c.includes(s.toLowerCase()) || s.toLowerCase().includes(c)),
  );
  const missing = requiredSkills.filter(
    (s) => !candidateLower.some((c) => c.includes(s.toLowerCase()) || s.toLowerCase().includes(c)),
  );
  const preferredMatched = preferredSkills.filter((s) =>
    candidateLower.some((c) => c.includes(s.toLowerCase()) || s.toLowerCase().includes(c)),
  );

  const requiredRatio = requiredSkills.length > 0 ? matched.length / requiredSkills.length : 1;
  const preferredRatio = preferredSkills.length > 0 ? preferredMatched.length / preferredSkills.length : 0;
  const baseScore = Math.round(requiredRatio * 70 + preferredRatio * 20 + 10);

  const reasons: string[] = [];
  if (matched.length > 0) reasons.push(`Matches ${matched.length} of ${requiredSkills.length} required skills`);
  if (missing.length > 0) reasons.push(`Missing ${missing.length} required skills: ${missing.slice(0, 5).join(", ")}`);
  if (preferredMatched.length > 0) reasons.push(`Has ${preferredMatched.length} of ${preferredSkills.length} preferred skills`);
  if (requiredSkills.length === 0) reasons.push("No specific required skills listed");

  // Use AI for a more nuanced score if available
  const model = client.getGenerativeModel({
    model: "gemini-flash-latest",
    generationConfig: { responseMimeType: "application/json" },
  });

  const prompt = `You are a recruiter evaluating a candidate's fit for a job. Calculate a fit score from 0-100.

Candidate skills: ${JSON.stringify(candidateSkills)}
Candidate years of experience: ${yearsExperience ?? "unknown"}
Job required skills: ${JSON.stringify(requiredSkills)}
Job preferred skills: ${JSON.stringify(preferredSkills)}
Job experience required: ${experienceRequired ?? "not specified"}

Return JSON:
{
  "score": number (0-100),
  "matchedSkills": string[],
  "missingSkills": string[],
  "reasons": string[] (2-4 short explanations)
}

Consider: skill overlap (weighted heavily), experience level match, and transferable skills.`;

  try {
    const result = await model.generateContent(prompt);
    const text = result.response.text();
    const parsed = JSON.parse(text) as FitScoreResult;
    return {
      score: Math.max(0, Math.min(100, Math.round(parsed.score))),
      matchedSkills: Array.isArray(parsed.matchedSkills) ? parsed.matchedSkills : matched,
      missingSkills: Array.isArray(parsed.missingSkills) ? parsed.missingSkills : missing,
      reasons: Array.isArray(parsed.reasons) ? parsed.reasons : reasons,
    };
  } catch (err) {
    console.error("AI fit scoring failed, using algorithmic fallback:", err);
    return {
      score: Math.max(0, Math.min(100, baseScore)),
      matchedSkills: matched,
      missingSkills: missing,
      reasons,
    };
  }
}

export function isAIConfigured() {
  return !!apiKey;
}

export interface ResumeJdMatchResult {
  matchVerdict: "strong" | "moderate" | "weak";
  matchScore: number;
  matchedSkills: string[];
  missingSkills: string[];
  transferableSkills: string[];
  summary: string;
  roadmap: {
    skill: string;
    level: string;
    estimatedTime: string;
    resources: string[];
    priority: "high" | "medium" | "low";
  }[];
  skillPaths: SkillPath[];
}

export async function resumeJdMatch(
  resumeText: string,
  jdText: string,
): Promise<ResumeJdMatchResult | null> {
  const client = getClient();
  if (!client) return null;

  const model = client.getGenerativeModel({
    model: "gemini-flash-latest",
    generationConfig: { responseMimeType: "application/json" },
  });

  const prompt = `You are an expert technical recruiter and career coach. Compare the candidate's resume against the job description and provide a detailed match analysis.

Resume:
"""
${resumeText.slice(0, 8000)}
"""

Job Description:
"""
${jdText.slice(0, 8000)}
"""

Return JSON with these exact fields:
{
  "matchVerdict": "strong" | "moderate" | "weak",
  "matchScore": number (0-100),
  "matchedSkills": string[] (skills the candidate has that the JD requires),
  "missingSkills": string[] (skills the JD requires that the candidate lacks),
  "transferableSkills": string[] (candidate skills that could transfer to required skills),
  "summary": string (2-3 sentence overall assessment),
  "roadmap": [
    {
      "skill": string (the missing skill to learn),
      "level": string (e.g. "Beginner", "Intermediate"),
      "estimatedTime": string (e.g. "2-3 weeks", "1 month"),
      "resources": string[] (2-3 specific resources: courses, docs, projects),
      "priority": "high" | "medium" | "low"
    }
  ]
}

Guidelines:
- matchScore should reflect real employability, not just keyword overlap
- Consider experience level, project complexity, and domain knowledge
- Roadmap should only include missingSkills, ordered by priority (high first)
- Resources should be specific and actionable (e.g. "Official React docs: react.dev/learn", "Build a CRUD app with Express + PostgreSQL")
- Keep summary concise and honest`;

  try {
    const result = await model.generateContent(prompt);
    const text = result.response.text();
    const parsed = JSON.parse(text) as ResumeJdMatchResult;
    return {
      matchVerdict: parsed.matchVerdict ?? "moderate",
      matchScore: Math.max(0, Math.min(100, Math.round(parsed.matchScore ?? 50))),
      matchedSkills: Array.isArray(parsed.matchedSkills) ? parsed.matchedSkills : [],
      missingSkills: Array.isArray(parsed.missingSkills) ? parsed.missingSkills : [],
      transferableSkills: Array.isArray(parsed.transferableSkills) ? parsed.transferableSkills : [],
      summary: parsed.summary ?? "",
      roadmap: Array.isArray(parsed.roadmap) ? parsed.roadmap : [],
      skillPaths: [],
    };
  } catch (err) {
    console.error("Resume-JD match failed:", err);
    return null;
  }
}

export interface SkillPath {
  fromSkill: string;
  toSkill: string;
  relationship: string;
  reason: string;
  estimatedTime: string;
  strength: number;
}

export async function generateSkillPaths(
  matchedSkills: string[],
  missingSkills: string[],
): Promise<SkillPath[] | null> {
  const client = getClient();
  if (!client) return null;

  const model = client.getGenerativeModel({
    model: "gemini-flash-latest",
    generationConfig: { responseMimeType: "application/json" },
  });

  const prompt = `You are a technical career coach. Given a candidate's existing skills and skills they're missing for a job, identify transferable skill paths — ways their existing skills can help them learn missing skills faster.

Candidate has: ${JSON.stringify(matchedSkills)}
Candidate needs: ${JSON.stringify(missingSkills)}

Return JSON array of skill paths:
[
  {
    "fromSkill": string (a skill the candidate already has),
    "toSkill": string (a missing skill they need to learn),
    "relationship": "transferable" | "prerequisite" | "complementary",
    "reason": string (why knowing fromSkill helps learn toSkill faster, 1 sentence),
    "estimatedTime": string (e.g. "1-2 weeks" — time to bridge fromSkill to toSkill),
    "strength": number (0.0-1.0, how strong the transfer is)
  }
]

Rules:
- Only include paths where there's a genuine knowledge transfer
- Order by strength (highest first)
- Max 8 paths
- Be specific in reasons (e.g. "Both use component-based architecture with lifecycle methods")`;

  try {
    const result = await model.generateContent(prompt);
    const text = result.response.text();
    const parsed = JSON.parse(text) as SkillPath[];
    if (!Array.isArray(parsed)) return [];
    return parsed.filter(
      (p) => p.fromSkill && p.toSkill && typeof p.strength === "number",
    );
  } catch (err) {
    console.error("Skill path generation failed:", err);
    return null;
  }
}

export interface ChatMessage {
  role: "user" | "model";
  content: string;
}

/**
 * Context-aware assistant chat using Gemini with workspace data as context.
 * Returns null if no API key is configured.
 */
export async function assistantChat(
  messages: ChatMessage[],
  context: string,
): Promise<string | null> {
  const client = getClient();
  if (!client) return null;

  const model = client.getGenerativeModel({ model: "gemini-flash-latest" });

  const systemPrompt = `You are CareerPilot AI, a helpful career search assistant. You have access to the user's workspace data below. Use it to provide personalized, actionable advice.

Workspace context:
${context}

Guidelines:
- Be concise and practical
- Reference specific applications, companies, or interviews from the context when relevant
- If asked to draft emails or messages, provide a complete draft
- If asked about interview prep, give structured preparation tips
- If the user asks about something not in the context, say so and give general advice`;

  const history = messages.slice(0, -1).map((m) => ({
    role: m.role,
    parts: [{ text: m.content }],
  }));

  const lastMessage = messages[messages.length - 1];

  try {
    const chat = model.startChat({
      history: [
        { role: "user", parts: [{ text: systemPrompt }] },
        { role: "model", parts: [{ text: "I understand. I have your workspace context and I'm ready to help with your career search." }] },
        ...history,
      ],
    });

    const result = await chat.sendMessage(lastMessage.content);
    return result.response.text();
  } catch (err) {
    console.error("Assistant chat failed:", err);
    return null;
  }
}
