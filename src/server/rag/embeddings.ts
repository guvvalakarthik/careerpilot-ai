import { GoogleGenAI, type EmbedContentParameters } from "@google/genai";
import { getRagConfig, RAG_EMBEDDING_DIMENSIONS } from "./config";

export type RagEmbeddingTask = "RETRIEVAL_DOCUMENT" | "RETRIEVAL_QUERY";

export interface EmbeddingClient {
  models: {
    embedContent(
      parameters: EmbedContentParameters,
    ): Promise<{ embeddings?: Array<{ values?: number[] }> }>;
  };
}

export function normalizeEmbedding(
  values: readonly number[],
  dimensions = RAG_EMBEDDING_DIMENSIONS,
) {
  if (values.length !== dimensions) {
    throw new Error(`Expected ${dimensions} embedding dimensions, received ${values.length}.`);
  }

  let magnitudeSquared = 0;
  for (const value of values) {
    if (!Number.isFinite(value)) {
      throw new Error("Embedding contains a non-finite value.");
    }
    magnitudeSquared += value * value;
  }

  const magnitude = Math.sqrt(magnitudeSquared);
  if (!Number.isFinite(magnitude) || magnitude === 0) {
    throw new Error("Embedding magnitude must be finite and greater than zero.");
  }

  return values.map((value) => value / magnitude);
}

function createEmbeddingClient() {
  const apiKey = process.env.GOOGLE_GENERATIVE_AI_API_KEY?.trim();
  if (!apiKey) {
    throw new Error("GOOGLE_GENERATIVE_AI_API_KEY is required for RAG embeddings.");
  }
  return new GoogleGenAI({ apiKey });
}

export async function embedRagTexts(
  texts: readonly string[],
  taskType: RagEmbeddingTask,
  client: EmbeddingClient = createEmbeddingClient(),
) {
  if (texts.length === 0 || texts.length > 100) {
    throw new Error("Embedding requests must contain between 1 and 100 texts.");
  }

  const normalizedTexts = texts.map((text) => text.trim());
  if (normalizedTexts.some((text) => text.length === 0 || text.length > 6_000)) {
    throw new Error("Embedding text must contain between 1 and 6000 characters.");
  }

  const config = getRagConfig();
  const response = await client.models.embedContent({
    model: config.embeddingModel,
    contents: normalizedTexts,
    config: {
      taskType,
      outputDimensionality: config.embeddingDimensions,
    },
  });

  if (response.embeddings?.length !== normalizedTexts.length) {
    throw new Error(
      `Expected ${normalizedTexts.length} embeddings, received ${response.embeddings?.length ?? 0}.`,
    );
  }

  return response.embeddings.map((embedding) =>
    normalizeEmbedding(embedding.values ?? [], config.embeddingDimensions),
  );
}
