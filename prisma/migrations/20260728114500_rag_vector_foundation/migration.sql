CREATE EXTENSION IF NOT EXISTS vector;

CREATE TYPE "KnowledgeSourceType" AS ENUM (
  'DOCUMENT',
  'CANDIDATE_PROFILE',
  'JOB_OPPORTUNITY'
);

CREATE TYPE "KnowledgeIndexStatus" AS ENUM (
  'PENDING',
  'PROCESSING',
  'READY',
  'FAILED'
);

CREATE TABLE "KnowledgeSource" (
  "id" TEXT NOT NULL,
  "workspaceId" TEXT NOT NULL,
  "ownerId" TEXT NOT NULL,
  "type" "KnowledgeSourceType" NOT NULL,
  "sourceId" TEXT NOT NULL,
  "contentHash" TEXT NOT NULL,
  "indexStatus" "KnowledgeIndexStatus" NOT NULL DEFAULT 'PENDING',
  "embeddingModel" TEXT NOT NULL DEFAULT 'gemini-embedding-001',
  "embeddingDimensions" INTEGER NOT NULL DEFAULT 768,
  "indexVersion" INTEGER NOT NULL DEFAULT 1,
  "lastIndexedAt" TIMESTAMP(3),
  "errorMessage" TEXT,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMP(3) NOT NULL,

  CONSTRAINT "KnowledgeSource_pkey" PRIMARY KEY ("id"),
  CONSTRAINT "KnowledgeSource_embeddingDimensions_check" CHECK ("embeddingDimensions" = 768),
  CONSTRAINT "KnowledgeSource_indexVersion_check" CHECK ("indexVersion" > 0)
);

CREATE TABLE "KnowledgeChunk" (
  "id" TEXT NOT NULL,
  "knowledgeSourceId" TEXT NOT NULL,
  "workspaceId" TEXT NOT NULL,
  "chunkIndex" INTEGER NOT NULL,
  "content" TEXT NOT NULL,
  "contentHash" TEXT NOT NULL,
  "tokenCount" INTEGER NOT NULL,
  "metadata" JSONB,
  "embedding" vector(768) NOT NULL,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

  CONSTRAINT "KnowledgeChunk_pkey" PRIMARY KEY ("id"),
  CONSTRAINT "KnowledgeChunk_chunkIndex_check" CHECK ("chunkIndex" >= 0),
  CONSTRAINT "KnowledgeChunk_tokenCount_check" CHECK ("tokenCount" > 0)
);

CREATE UNIQUE INDEX "KnowledgeSource_workspaceId_type_sourceId_key"
  ON "KnowledgeSource"("workspaceId", "type", "sourceId");
CREATE UNIQUE INDEX "KnowledgeSource_id_workspaceId_key"
  ON "KnowledgeSource"("id", "workspaceId");
CREATE INDEX "KnowledgeSource_workspaceId_ownerId_type_idx"
  ON "KnowledgeSource"("workspaceId", "ownerId", "type");
CREATE INDEX "KnowledgeSource_workspaceId_indexStatus_idx"
  ON "KnowledgeSource"("workspaceId", "indexStatus");
CREATE UNIQUE INDEX "KnowledgeChunk_knowledgeSourceId_chunkIndex_key"
  ON "KnowledgeChunk"("knowledgeSourceId", "chunkIndex");
CREATE INDEX "KnowledgeChunk_workspaceId_knowledgeSourceId_idx"
  ON "KnowledgeChunk"("workspaceId", "knowledgeSourceId");
CREATE INDEX "KnowledgeChunk_embedding_hnsw_idx"
  ON "KnowledgeChunk" USING hnsw ("embedding" vector_cosine_ops);

ALTER TABLE "KnowledgeSource"
  ADD CONSTRAINT "KnowledgeSource_workspaceId_fkey"
  FOREIGN KEY ("workspaceId") REFERENCES "Workspace"("id")
  ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "KnowledgeSource"
  ADD CONSTRAINT "KnowledgeSource_ownerId_fkey"
  FOREIGN KEY ("ownerId") REFERENCES "User"("id")
  ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "KnowledgeChunk"
  ADD CONSTRAINT "KnowledgeChunk_knowledgeSourceId_workspaceId_fkey"
  FOREIGN KEY ("knowledgeSourceId", "workspaceId") REFERENCES "KnowledgeSource"("id", "workspaceId")
  ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "KnowledgeChunk"
  ADD CONSTRAINT "KnowledgeChunk_workspaceId_fkey"
  FOREIGN KEY ("workspaceId") REFERENCES "Workspace"("id")
  ON DELETE CASCADE ON UPDATE CASCADE;
