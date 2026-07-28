import { describe, expect, it, vi } from "vitest";
import { chunkRagText, hashRagContent } from "@/server/rag/chunking";
import {
  DEFAULT_RAG_EMBEDDING_MODEL,
  getRagConfig,
  RAG_EMBEDDING_DIMENSIONS,
} from "@/server/rag/config";
import {
  embedRagTexts,
  normalizeEmbedding,
  type EmbeddingClient,
} from "@/server/rag/embeddings";
import {
  embeddingToVectorLiteral,
  replaceKnowledgeChunks,
  searchKnowledgeChunks,
} from "@/server/rag/repository";

describe("RAG configuration", () => {
  it("fails closed and uses the versioned embedding contract by default", () => {
    expect(getRagConfig({})).toEqual({
      enabled: false,
      embeddingModel: DEFAULT_RAG_EMBEDDING_MODEL,
      embeddingDimensions: 768,
    });
  });

  it("only accepts explicit boolean feature flags", () => {
    expect(getRagConfig({ RAG_ENABLED: "true" }).enabled).toBe(true);
    expect(() => getRagConfig({ RAG_ENABLED: "enabled" })).toThrow(/true.*false/i);
  });
});

describe("RAG text chunking", () => {
  it("normalizes text into deterministic bounded overlapping chunks", () => {
    const text = Array.from(
      { length: 30 },
      (_, index) => `Section ${index}. TypeScript and PostgreSQL project evidence.`,
    ).join("\n\n");

    const first = chunkRagText(text, { maxCharacters: 300, overlapCharacters: 40 });
    const second = chunkRagText(text, { maxCharacters: 300, overlapCharacters: 40 });

    expect(first).toEqual(second);
    expect(first.length).toBeGreaterThan(1);
    expect(first.every((chunk) => chunk.content.length <= 300)).toBe(true);
    expect(first.map((chunk) => chunk.chunkIndex)).toEqual(
      first.map((_, index) => index),
    );
    expect(first.every((chunk) => chunk.contentHash === hashRagContent(chunk.content))).toBe(
      true,
    );
  });

  it("rejects unsafe chunk settings and ignores empty content", () => {
    expect(chunkRagText("   \n\n ")).toEqual([]);
    expect(() => chunkRagText("content", { maxCharacters: 100 })).toThrow(/at least 200/i);
    expect(() =>
      chunkRagText("content", { maxCharacters: 300, overlapCharacters: 150 }),
    ).toThrow(/less than half/i);
  });
});

describe("Gemini embedding boundary", () => {
  it("requests retrieval embeddings at 768 dimensions and normalizes the result", async () => {
    const embedContent = vi.fn().mockResolvedValue({
      embeddings: [
        { values: Array(RAG_EMBEDDING_DIMENSIONS).fill(2) },
        { values: Array(RAG_EMBEDDING_DIMENSIONS).fill(4) },
      ],
    });
    const client = { models: { embedContent } } as EmbeddingClient;

    const embeddings = await embedRagTexts(
      ["First candidate fact", "Second candidate fact"],
      "RETRIEVAL_DOCUMENT",
      client,
    );

    expect(embedContent).toHaveBeenCalledWith({
      model: DEFAULT_RAG_EMBEDDING_MODEL,
      contents: ["First candidate fact", "Second candidate fact"],
      config: {
        taskType: "RETRIEVAL_DOCUMENT",
        outputDimensionality: 768,
      },
    });
    expect(embeddings).toHaveLength(2);
    expect(Math.hypot(...embeddings[0])).toBeCloseTo(1, 10);
  });

  it("rejects malformed, missing, and non-finite embeddings", async () => {
    expect(() => normalizeEmbedding([1, 2], 3)).toThrow(/3 embedding dimensions/i);
    expect(() => normalizeEmbedding([1, Number.NaN], 2)).toThrow(/non-finite/i);
    expect(() => normalizeEmbedding([0, 0], 2)).toThrow(/greater than zero/i);

    const client = {
      models: { embedContent: vi.fn().mockResolvedValue({ embeddings: [] }) },
    } as EmbeddingClient;
    await expect(embedRagTexts(["candidate fact"], "RETRIEVAL_QUERY", client)).rejects.toThrow(
      /expected 1 embeddings/i,
    );
  });

  it("rejects invalid storage and retrieval numeric boundaries before database access", async () => {
    await expect(
      replaceKnowledgeChunks({
        workspaceId: "workspace",
        knowledgeSourceId: "source",
        chunks: [
          {
            chunkIndex: 0,
            content: "Evidence",
            contentHash: "hash",
            tokenCount: 1.5,
            embedding: Array(RAG_EMBEDDING_DIMENSIONS).fill(1),
          },
        ],
      }),
    ).rejects.toThrow(/positive token count/i);

    await expect(
      searchKnowledgeChunks(
        { workspaceId: "workspace", userId: "user", canAccessAllOwners: false },
        Array(RAG_EMBEDDING_DIMENSIONS).fill(1),
        { minimumSimilarity: Number.NaN },
      ),
    ).rejects.toThrow(/between -1 and 1/i);
  });

  it("serializes only validated normalized vectors for parameterized SQL", () => {
    const literal = embeddingToVectorLiteral(
      Array.from({ length: RAG_EMBEDDING_DIMENSIONS }, (_, index) =>
        index === 0 ? 2 : 0,
      ),
    );

    expect(literal.startsWith("[1,0,0,")).toBe(true);
    expect(literal.endsWith("]")).toBe(true);
    expect(() => embeddingToVectorLiteral([1, 2, 3])).toThrow(/768 embedding dimensions/i);
  });
});
