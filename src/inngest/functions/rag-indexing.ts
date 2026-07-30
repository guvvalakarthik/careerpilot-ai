import { NonRetriableError } from "inngest";
import type { Prisma } from "@prisma/client";
import {
  inngest,
  ragSourceDeleted,
  ragSourceEventSchema,
  ragSourceRequested,
  ragWorkspaceBackfillRequested,
} from "../client";
import {
  beginRagIndex,
  collectWorkspaceRagSources,
  deleteRagSource,
  loadRagSource,
  markRagSourceFailed,
  markRagSourceReady,
  prepareRagSource,
  pruneWorkspaceRagSources,
  UnsupportedRagSourceError,
} from "@/server/rag/indexing";
import { getRagConfig } from "@/server/rag/config";
import { embedRagTexts } from "@/server/rag/embeddings";
import { replaceKnowledgeChunks } from "@/server/rag/repository";

const EMBEDDING_BATCH_SIZE = 20;
const SOURCE_CONCURRENCY_KEY =
  'event.data.workspaceId + ":" + event.data.type + ":" + event.data.sourceId';

function getFailureLocator(event: {
  data: { event: { data?: unknown } };
}) {
  return ragSourceEventSchema.safeParse(event.data.event.data);
}

export const indexRagSource = inngest.createFunction(
  {
    id: "rag-index-source",
    name: "Index RAG source",
    triggers: [ragSourceRequested],
    retries: 4,
    concurrency: {
      limit: 1,
      key: SOURCE_CONCURRENCY_KEY,
      scope: "env",
    },
    onFailure: async ({ event, error, step }) => {
      const parsed = getFailureLocator(event);
      if (!parsed.success) return;
      await step.run("mark-source-failed", () =>
        markRagSourceFailed(parsed.data, error),
      );
    },
  },
  async ({ event, step }) => {
    if (!getRagConfig().enabled) {
      return { skipped: true, reason: "disabled" };
    }

    let loaded;
    try {
      loaded = await step.run("load-current-source", () =>
        loadRagSource(event.data),
      );
    } catch (error) {
      await step.run("record-load-failure", () =>
        markRagSourceFailed(event.data, error),
      );
      if (error instanceof UnsupportedRagSourceError) {
        throw new NonRetriableError(error.message);
      }
      throw error;
    }

    if (!loaded) {
      const result = await step.run("remove-missing-source", () =>
        deleteRagSource(event.data),
      );
      return { skipped: true, reason: "source_missing", ...result };
    }

    const prepared = await step.run("prepare-source", () =>
      prepareRagSource(loaded),
    );
    const indexing = await step.run("begin-index", () =>
      beginRagIndex(prepared),
    );
    if (indexing.skipped) {
      return {
        skipped: true,
        reason: "content_unchanged",
        knowledgeSourceId: indexing.knowledgeSourceId,
      };
    }

    const embeddings: number[][] = [];
    for (
      let offset = 0;
      offset < prepared.chunks.length;
      offset += EMBEDDING_BATCH_SIZE
    ) {
      const batch = prepared.chunks.slice(
        offset,
        offset + EMBEDDING_BATCH_SIZE,
      );
      const batchEmbeddings = await step.run(
        `embed-chunks-${offset}-${offset + batch.length - 1}`,
        () =>
          embedRagTexts(
            batch.map((chunk) => chunk.content),
            "RETRIEVAL_DOCUMENT",
          ),
      );
      embeddings.push(...batchEmbeddings);
    }

    await step.run("replace-indexed-chunks", () =>
      replaceKnowledgeChunks({
        workspaceId: event.data.workspaceId,
        knowledgeSourceId: indexing.knowledgeSourceId,
        chunks: prepared.chunks.map((chunk, index) => ({
          ...chunk,
          embedding: embeddings[index],
          metadata: {
            ...prepared.metadata,
            sourceType: event.data.type,
            sourceId: event.data.sourceId,
          } satisfies Prisma.InputJsonObject,
        })),
      }),
    );
    await step.run("mark-source-ready", () =>
      markRagSourceReady({
        locator: event.data,
        knowledgeSourceId: indexing.knowledgeSourceId,
      }),
    );

    return {
      indexed: true,
      knowledgeSourceId: indexing.knowledgeSourceId,
      chunkCount: prepared.chunks.length,
    };
  },
);

export const deleteIndexedRagSource = inngest.createFunction(
  {
    id: "rag-delete-source",
    name: "Delete indexed RAG source",
    triggers: [ragSourceDeleted],
    retries: 4,
    concurrency: {
      limit: 1,
      key: SOURCE_CONCURRENCY_KEY,
      scope: "env",
    },
  },
  async ({ event, step }) => {
    if (!getRagConfig().enabled) {
      return { skipped: true, reason: "disabled" };
    }
    return step.run("delete-source-and-chunks", () =>
      deleteRagSource(event.data),
    );
  },
);

export const backfillRagWorkspace = inngest.createFunction(
  {
    id: "rag-backfill-workspace",
    name: "Backfill workspace RAG index",
    triggers: [ragWorkspaceBackfillRequested],
    retries: 4,
    concurrency: {
      limit: 1,
      key: "event.data.workspaceId",
    },
  },
  async ({ event, step }) => {
    if (!getRagConfig().enabled) {
      return { skipped: true, reason: "disabled" };
    }

    const sources = await step.run("collect-current-sources", () =>
      collectWorkspaceRagSources(event.data.workspaceId),
    );
    if (!sources) {
      return { skipped: true, reason: "workspace_missing" };
    }

    const cleanup = await step.run("prune-deleted-sources", () =>
      pruneWorkspaceRagSources(event.data.workspaceId, sources),
    );
    for (let offset = 0; offset < sources.length; offset += 50) {
      const batch = sources.slice(offset, offset + 50);
      await step.sendEvent(
        `request-source-index-${offset}-${offset + batch.length - 1}`,
        batch.map((source) => ragSourceRequested.create(source)),
      );
    }

    return {
      queued: sources.length,
      pruned: cleanup.deleted,
      requestedBy: event.data.requestedBy,
    };
  },
);

export const ragFunctions = [
  indexRagSource,
  deleteIndexedRagSource,
  backfillRagWorkspace,
];