import { randomUUID } from "node:crypto";
import { Prisma, type KnowledgeSourceType } from "@prisma/client";
import { db } from "@/server/db";
import { normalizeEmbedding } from "./embeddings";

export interface StoredRagChunk {
  chunkIndex: number;
  content: string;
  contentHash: string;
  tokenCount: number;
  metadata?: Prisma.InputJsonValue | null;
  embedding: readonly number[];
}

export interface RagRetrievalScope {
  workspaceId: string;
  userId: string;
  canAccessAllOwners: boolean;
}

export interface RagSearchResult {
  chunkId: string;
  knowledgeSourceId: string;
  sourceType: KnowledgeSourceType;
  sourceId: string;
  ownerId: string;
  chunkIndex: number;
  content: string;
  metadata: Prisma.JsonValue | null;
  similarity: number;
}

export function embeddingToVectorLiteral(values: readonly number[]) {
  const normalized = normalizeEmbedding(values);
  return `[${normalized.join(",")}]`;
}

export async function replaceKnowledgeChunks(input: {
  workspaceId: string;
  knowledgeSourceId: string;
  chunks: readonly StoredRagChunk[];
}) {
  const seenIndexes = new Set<number>();
  for (const chunk of input.chunks) {
    if (
      !Number.isInteger(chunk.chunkIndex) ||
      chunk.chunkIndex < 0 ||
      seenIndexes.has(chunk.chunkIndex)
    ) {
      throw new Error("Knowledge chunk indexes must be unique non-negative integers.");
    }
    if (
      !chunk.content.trim() ||
      !chunk.contentHash ||
      !Number.isInteger(chunk.tokenCount) ||
      chunk.tokenCount <= 0
    ) {
      throw new Error("Knowledge chunks require content, a hash, and a positive token count.");
    }
    seenIndexes.add(chunk.chunkIndex);
  }

  await db.$transaction(async (transaction) => {
    const source = await transaction.knowledgeSource.findUnique({
      where: {
        id_workspaceId: {
          id: input.knowledgeSourceId,
          workspaceId: input.workspaceId,
        },
      },
      select: { id: true },
    });
    if (!source) {
      throw new Error("Knowledge source was not found in the requested workspace.");
    }

    await transaction.knowledgeChunk.deleteMany({
      where: {
        knowledgeSourceId: input.knowledgeSourceId,
        workspaceId: input.workspaceId,
      },
    });

    for (const chunk of input.chunks) {
      const vectorLiteral = embeddingToVectorLiteral(chunk.embedding);
      const metadataJson =
        chunk.metadata === undefined || chunk.metadata === null
          ? null
          : JSON.stringify(chunk.metadata);

      await transaction.$executeRaw`
        INSERT INTO "KnowledgeChunk" (
          "id", "knowledgeSourceId", "workspaceId", "chunkIndex", "content",
          "contentHash", "tokenCount", "metadata", "embedding", "createdAt"
        ) VALUES (
          ${randomUUID()}, ${input.knowledgeSourceId}, ${input.workspaceId},
          ${chunk.chunkIndex}, ${chunk.content}, ${chunk.contentHash},
          ${chunk.tokenCount}, ${metadataJson}::jsonb, ${vectorLiteral}::vector,
          CURRENT_TIMESTAMP
        )
      `;
    }
  });
}

export async function searchKnowledgeChunks(
  scope: RagRetrievalScope,
  queryEmbedding: readonly number[],
  options: { limit?: number; minimumSimilarity?: number } = {},
) {
  if (!scope.workspaceId || (!scope.canAccessAllOwners && !scope.userId)) {
    throw new Error("A workspace and permitted user are required for RAG retrieval.");
  }

  const limit = options.limit ?? 8;
  const minimumSimilarity = options.minimumSimilarity ?? 0.6;
  if (!Number.isInteger(limit) || limit < 1 || limit > 20) {
    throw new Error("RAG retrieval limit must be between 1 and 20.");
  }
  if (
    !Number.isFinite(minimumSimilarity) ||
    minimumSimilarity < -1 ||
    minimumSimilarity > 1
  ) {
    throw new Error("RAG minimum similarity must be between -1 and 1.");
  }

  const vectorLiteral = embeddingToVectorLiteral(queryEmbedding);
  const ownerFilter = scope.canAccessAllOwners
    ? Prisma.empty
    : Prisma.sql`AND source."ownerId" = ${scope.userId}`;

  return db.$queryRaw<RagSearchResult[]>(Prisma.sql`
    SELECT
      chunk."id" AS "chunkId",
      chunk."knowledgeSourceId",
      source."type" AS "sourceType",
      source."sourceId",
      source."ownerId",
      chunk."chunkIndex",
      chunk."content",
      chunk."metadata",
      1 - (chunk."embedding" <=> ${vectorLiteral}::vector) AS "similarity"
    FROM "KnowledgeChunk" AS chunk
    INNER JOIN "KnowledgeSource" AS source
      ON source."id" = chunk."knowledgeSourceId"
      AND source."workspaceId" = chunk."workspaceId"
    WHERE chunk."workspaceId" = ${scope.workspaceId}
      AND source."workspaceId" = ${scope.workspaceId}
      AND source."indexStatus" = 'READY'
      ${ownerFilter}
      AND 1 - (chunk."embedding" <=> ${vectorLiteral}::vector) >= ${minimumSimilarity}
    ORDER BY chunk."embedding" <=> ${vectorLiteral}::vector
    LIMIT ${limit}
  `);
}
