import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

const mocks = vi.hoisted(() => ({
  constructorOptions: vi.fn(),
  generateContent: vi.fn(),
  createChat: vi.fn(),
  sendMessage: vi.fn(),
}));

vi.mock("@google/genai", () => ({
  GoogleGenAI: class {
    models = { generateContent: mocks.generateContent };
    chats = { create: mocks.createChat };

    constructor(options: unknown) {
      mocks.constructorOptions(options);
    }
  },
}));

describe("Gemini provider integration", () => {
  beforeEach(() => {
    vi.resetModules();
    vi.clearAllMocks();
    vi.stubEnv("GOOGLE_GENERATIVE_AI_API_KEY", "test-api-key");
  });

  afterEach(() => {
    vi.unstubAllEnvs();
  });

  it("uses the current SDK request shape for structured generation", async () => {
    mocks.generateContent.mockResolvedValue({
      text: JSON.stringify({
        company: "Acme",
        title: "Engineer",
        location: null,
        employmentType: null,
        salaryRange: null,
        experienceRequired: null,
        requiredSkills: ["TypeScript"],
        preferredSkills: [],
        applicationDeadline: null,
      }),
    });

    const { extractJobData } = await import("@/server/ai");
    const result = await extractJobData("Acme needs a TypeScript engineer.");

    expect(mocks.constructorOptions).toHaveBeenCalledWith({ apiKey: "test-api-key" });
    expect(mocks.generateContent).toHaveBeenCalledWith(
      expect.objectContaining({
        model: "gemini-flash-latest",
        config: {
          responseMimeType: "application/json",
          maxOutputTokens: 2_048,
        },
      }),
    );
    expect(result?.requiredSkills).toEqual(["TypeScript"]);
  });

  it("uses the current chat SDK and validates its text response", async () => {
    mocks.sendMessage.mockResolvedValue({ text: "Prepare two STAR stories." });
    mocks.createChat.mockReturnValue({ sendMessage: mocks.sendMessage });

    const { assistantChat } = await import("@/server/ai");
    const result = await assistantChat(
      [{ role: "user", content: "How should I prepare?" }],
      "Interview at Acme tomorrow.",
    );

    expect(mocks.createChat).toHaveBeenCalledWith(
      expect.objectContaining({
        model: "gemini-flash-latest",
        config: { maxOutputTokens: 2_048 },
        history: expect.any(Array),
      }),
    );
    expect(mocks.sendMessage).toHaveBeenCalledWith({
      message: "How should I prepare?",
    });
    expect(result).toBe("Prepare two STAR stories.");
  });
});
