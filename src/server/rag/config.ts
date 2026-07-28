export const RAG_EMBEDDING_DIMENSIONS = 768;
export const DEFAULT_RAG_EMBEDDING_MODEL = "gemini-embedding-001";
export const RAG_CHUNK_MAX_CHARACTERS = 6_000;
export const RAG_CHUNK_OVERLAP_CHARACTERS = 600;

export function getRagConfig(
  environment: Readonly<Record<string, string | undefined>> = process.env,
) {
  const enabledValue = (environment.RAG_ENABLED ?? "false").trim().toLowerCase();
  if (enabledValue !== "true" && enabledValue !== "false") {
    throw new Error('RAG_ENABLED must be either "true" or "false".');
  }

  return {
    enabled: enabledValue === "true",
    embeddingModel:
      environment.RAG_EMBEDDING_MODEL?.trim() || DEFAULT_RAG_EMBEDDING_MODEL,
    embeddingDimensions: RAG_EMBEDDING_DIMENSIONS,
  } as const;
}
