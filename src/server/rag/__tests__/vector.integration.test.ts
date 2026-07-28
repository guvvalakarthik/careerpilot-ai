import { randomUUID } from "node:crypto";
import { afterAll, beforeAll, describe, expect, it } from "vitest";
import { db } from "@/server/db";
import {
  replaceKnowledgeChunks,
  searchKnowledgeChunks,
} from "@/server/rag/repository";
import { RAG_EMBEDDING_DIMENSIONS } from "@/server/rag/config";

const marker = randomUUID();
const userIds: string[] = [];
const workspaceIds: string[] = [];

function unitEmbedding(axis: number) {
  return Array.from(
    { length: RAG_EMBEDDING_DIMENSIONS },
    (_, index) => (index === axis ? 1 : 0),
  );
}

describe("pgvector RAG foundation", () => {
  beforeAll(async () => {
    const users = await Promise.all(
      ["first", "second"].map((label) =>
        db.user.create({
          data: { email: `rag-${label}-${marker}@test.invalid`, name: `RAG ${label}` },
          select: { id: true },
        }),
      ),
    );
    userIds.push(...users.map((user) => user.id));

    const workspaces = await Promise.all(
      ["primary", "other"].map((label, index) =>
        db.workspace.create({
          data: {
            name: `RAG ${label}`,
            slug: `rag-${label}-${marker}`,
            memberships: {
              create: {
                userId: users[Math.min(index, users.length - 1)].id,
                role: "SEEKER",
              },
            },
          },
          select: { id: true },
        }),
      ),
    );
    workspaceIds.push(...workspaces.map((workspace) => workspace.id));
  });

  afterAll(async () => {
    await db.workspace.deleteMany({ where: { id: { in: workspaceIds } } });
    await db.user.deleteMany({ where: { id: { in: userIds } } });
    await db.$disconnect();
  });

  it("installs vector(768) and its cosine HNSW index", async () => {
    const extension = await db.$queryRaw<Array<{ extversion: string }>>`
      SELECT extversion FROM pg_extension WHERE extname = 'vector'
    `;
    const column = await db.$queryRaw<Array<{ dataType: string }>>`
      SELECT format_type(attribute.atttypid, attribute.atttypmod) AS "dataType"
      FROM pg_attribute AS attribute
      INNER JOIN pg_class AS table_definition
        ON table_definition.oid = attribute.attrelid
      WHERE table_definition.relname = 'KnowledgeChunk'
        AND attribute.attname = 'embedding'
    `;
    const index = await db.$queryRaw<Array<{ indexName: string }>>`
      SELECT indexname AS "indexName"
      FROM pg_indexes
      WHERE tablename = 'KnowledgeChunk'
        AND indexname = 'KnowledgeChunk_embedding_hnsw_idx'
    `;

    expect(extension[0]?.extversion).toMatch(/^0\.8\./);
    expect(column).toEqual([{ dataType: "vector(768)" }]);
    expect(index).toEqual([{ indexName: "KnowledgeChunk_embedding_hnsw_idx" }]);
  });

  it("filters vector retrieval by workspace and seeker ownership", async () => {
    await db.membership.create({
      data: { workspaceId: workspaceIds[0], userId: userIds[1], role: "SEEKER" },
    });

    const sources = await Promise.all([
      db.knowledgeSource.create({
        data: {
          workspaceId: workspaceIds[0],
          ownerId: userIds[0],
          type: "DOCUMENT",
          sourceId: `document-${marker}`,
          contentHash: `hash-document-${marker}`,
          indexStatus: "READY",
        },
      }),
      db.knowledgeSource.create({
        data: {
          workspaceId: workspaceIds[0],
          ownerId: userIds[1],
          type: "JOB_OPPORTUNITY",
          sourceId: `job-${marker}`,
          contentHash: `hash-job-${marker}`,
          indexStatus: "READY",
        },
      }),
      db.knowledgeSource.create({
        data: {
          workspaceId: workspaceIds[1],
          ownerId: userIds[1],
          type: "CANDIDATE_PROFILE",
          sourceId: `profile-${marker}`,
          contentHash: `hash-profile-${marker}`,
          indexStatus: "READY",
        },
      }),
    ]);

    await Promise.all(
      sources.map((source, index) =>
        replaceKnowledgeChunks({
          workspaceId: source.workspaceId,
          knowledgeSourceId: source.id,
          chunks: [
            {
              chunkIndex: 0,
              content: `Evidence ${index}`,
              contentHash: `chunk-${index}-${marker}`,
              tokenCount: 2,
              metadata: { label: `source-${index}` },
              embedding: unitEmbedding(0),
            },
          ],
        }),
      ),
    );

    const seekerResults = await searchKnowledgeChunks(
      {
        workspaceId: workspaceIds[0],
        userId: userIds[0],
        canAccessAllOwners: false,
      },
      unitEmbedding(0),
    );
    const privilegedResults = await searchKnowledgeChunks(
      {
        workspaceId: workspaceIds[0],
        userId: userIds[0],
        canAccessAllOwners: true,
      },
      unitEmbedding(0),
    );

    expect(seekerResults).toHaveLength(1);
    expect(seekerResults[0].ownerId).toBe(userIds[0]);
    expect(privilegedResults).toHaveLength(2);
    expect(privilegedResults.every((result) => result.knowledgeSourceId !== sources[2].id)).toBe(
      true,
    );
  });
});
