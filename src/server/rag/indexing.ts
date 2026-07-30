import type {
  CandidateProfile,
  Document,
  JobOpportunity,
  KnowledgeSourceType,
  PrismaClient,
} from "@prisma/client";
import { db } from "@/server/db";
import { fetchFileTextFromR2 } from "@/server/r2";
import { chunkRagText, hashRagContent } from "./chunking";
import { getRagConfig } from "./config";

export const RAG_INDEX_VERSION = 1;
export const RAG_MAX_SOURCE_CHARACTERS = 120_000;

export interface RagSourceLocator {
  workspaceId: string;
  type: KnowledgeSourceType;
  sourceId: string;
}

export interface LoadedRagSource {
  locator: RagSourceLocator;
  ownerId: string;
  content: string;
  metadata: Record<string, string | number | boolean | null>;
}

type CandidateSource = Pick<
  CandidateProfile,
  | "id"
  | "userId"
  | "headline"
  | "summary"
  | "skills"
  | "yearsExperience"
  | "locations"
  | "desiredRoles"
  | "minSalary"
>;

type OpportunitySource = Pick<
  JobOpportunity,
  | "id"
  | "title"
  | "rawInput"
  | "sourceUrl"
  | "location"
  | "employmentType"
  | "requiredSkills"
  | "preferredSkills"
  | "experienceRequired"
  | "salaryRange"
  | "applicationDeadline"
> & {
  company: { name: string } | null;
  application: { ownerId: string } | null;
};

type DocumentSource = Pick<
  Document,
  "id" | "ownerId" | "fileName" | "storageKey" | "mimeType" | "type"
>;

export class UnsupportedRagSourceError extends Error {
  constructor(message: string) {
    super(message);
    this.name = "UnsupportedRagSourceError";
  }
}

function compactLines(lines: Array<string | null | undefined>) {
  return lines.filter((line): line is string => Boolean(line?.trim())).join("\n");
}

export function serializeCandidateProfile(profile: CandidateSource) {
  return compactLines([
    profile.headline ? `Headline: ${profile.headline}` : null,
    profile.summary ? `Summary: ${profile.summary}` : null,
    profile.skills.length ? `Skills: ${profile.skills.join(", ")}` : null,
    profile.yearsExperience !== null
      ? `Years of experience: ${profile.yearsExperience}`
      : null,
    profile.locations.length
      ? `Preferred locations: ${profile.locations.join(", ")}`
      : null,
    profile.desiredRoles.length
      ? `Desired roles: ${profile.desiredRoles.join(", ")}`
      : null,
    profile.minSalary !== null
      ? `Minimum salary: ${profile.minSalary}`
      : null,
  ]);
}

export function serializeJobOpportunity(opportunity: OpportunitySource) {
  return compactLines([
    opportunity.title ? `Role: ${opportunity.title}` : null,
    opportunity.company?.name ? `Company: ${opportunity.company.name}` : null,
    opportunity.location ? `Location: ${opportunity.location}` : null,
    opportunity.employmentType
      ? `Employment type: ${opportunity.employmentType}`
      : null,
    opportunity.experienceRequired
      ? `Experience required: ${opportunity.experienceRequired}`
      : null,
    opportunity.salaryRange ? `Salary: ${opportunity.salaryRange}` : null,
    opportunity.applicationDeadline
      ? `Application deadline: ${opportunity.applicationDeadline.toISOString()}`
      : null,
    opportunity.requiredSkills.length
      ? `Required skills: ${opportunity.requiredSkills.join(", ")}`
      : null,
    opportunity.preferredSkills.length
      ? `Preferred skills: ${opportunity.preferredSkills.join(", ")}`
      : null,
    opportunity.sourceUrl ? `Source: ${opportunity.sourceUrl}` : null,
    opportunity.rawInput ? `Job description:\n${opportunity.rawInput}` : null,
  ]);
}

function boundSourceContent(content: string) {
  const trimmed = content.trim();
  return trimmed.length <= RAG_MAX_SOURCE_CHARACTERS
    ? trimmed
    : trimmed.slice(0, RAG_MAX_SOURCE_CHARACTERS);
}

export async function loadRagSource(
  locator: RagSourceLocator,
  dependencies: {
    database?: PrismaClient;
    fetchDocumentText?: typeof fetchFileTextFromR2;
  } = {},
): Promise<LoadedRagSource | null> {
  const database = dependencies.database ?? db;
  const fetchDocumentText =
    dependencies.fetchDocumentText ?? fetchFileTextFromR2;

  if (locator.type === "DOCUMENT") {
    const document: DocumentSource | null = await database.document.findFirst({
      where: { id: locator.sourceId, workspaceId: locator.workspaceId },
      select: {
        id: true,
        ownerId: true,
        fileName: true,
        storageKey: true,
        mimeType: true,
        type: true,
      },
    });
    if (!document) return null;
    if (
      document.mimeType.startsWith("image/") ||
      (!document.mimeType.startsWith("text/") &&
        document.mimeType !== "application/pdf" &&
        document.mimeType !==
          "application/vnd.openxmlformats-officedocument.wordprocessingml.document")
    ) {
      throw new UnsupportedRagSourceError(
        `Document ${document.fileName} does not contain directly extractable text.`,
      );
    }

    return {
      locator,
      ownerId: document.ownerId,
      content: boundSourceContent(
        await fetchDocumentText(document.storageKey, document.mimeType),
      ),
      metadata: {
        fileName: document.fileName,
        documentType: document.type,
        mimeType: document.mimeType,
      },
    };
  }

  if (locator.type === "CANDIDATE_PROFILE") {
    const profile: CandidateSource | null =
      await database.candidateProfile.findFirst({
        where: {
          id: locator.sourceId,
          user: { memberships: { some: { workspaceId: locator.workspaceId } } },
        },
        select: {
          id: true,
          userId: true,
          headline: true,
          summary: true,
          skills: true,
          yearsExperience: true,
          locations: true,
          desiredRoles: true,
          minSalary: true,
        },
      });
    if (!profile) return null;

    return {
      locator,
      ownerId: profile.userId,
      content: boundSourceContent(serializeCandidateProfile(profile)),
      metadata: { candidateProfileId: profile.id },
    };
  }

  const opportunity: OpportunitySource | null =
    await database.jobOpportunity.findFirst({
      where: { id: locator.sourceId, workspaceId: locator.workspaceId },
      select: {
        id: true,
        title: true,
        rawInput: true,
        sourceUrl: true,
        location: true,
        employmentType: true,
        requiredSkills: true,
        preferredSkills: true,
        experienceRequired: true,
        salaryRange: true,
        applicationDeadline: true,
        company: { select: { name: true } },
        application: { select: { ownerId: true } },
      },
    });
  if (!opportunity?.application) return null;

  return {
    locator,
    ownerId: opportunity.application.ownerId,
    content: boundSourceContent(serializeJobOpportunity(opportunity)),
    metadata: {
      title: opportunity.title,
      company: opportunity.company?.name ?? null,
      sourceUrl: opportunity.sourceUrl,
    },
  };
}

export function prepareRagSource(source: LoadedRagSource) {
  const chunks = chunkRagText(source.content);
  return {
    ...source,
    contentHash: hashRagContent(source.content),
    chunks,
  };
}

export async function beginRagIndex(
  source: ReturnType<typeof prepareRagSource>,
) {
  const config = getRagConfig();
  const existing = await db.knowledgeSource.findUnique({
    where: {
      workspaceId_type_sourceId: {
        workspaceId: source.locator.workspaceId,
        type: source.locator.type,
        sourceId: source.locator.sourceId,
      },
    },
  });

  if (
    existing?.indexStatus === "READY" &&
    existing.contentHash === source.contentHash &&
    existing.embeddingModel === config.embeddingModel &&
    existing.embeddingDimensions === config.embeddingDimensions &&
    existing.indexVersion === RAG_INDEX_VERSION
  ) {
    return { knowledgeSourceId: existing.id, skipped: true };
  }

  const knowledgeSource = await db.knowledgeSource.upsert({
    where: {
      workspaceId_type_sourceId: {
        workspaceId: source.locator.workspaceId,
        type: source.locator.type,
        sourceId: source.locator.sourceId,
      },
    },
    create: {
      workspaceId: source.locator.workspaceId,
      ownerId: source.ownerId,
      type: source.locator.type,
      sourceId: source.locator.sourceId,
      contentHash: source.contentHash,
      indexStatus: "PROCESSING",
      embeddingModel: config.embeddingModel,
      embeddingDimensions: config.embeddingDimensions,
      indexVersion: RAG_INDEX_VERSION,
    },
    update: {
      ownerId: source.ownerId,
      contentHash: source.contentHash,
      indexStatus: "PROCESSING",
      embeddingModel: config.embeddingModel,
      embeddingDimensions: config.embeddingDimensions,
      indexVersion: RAG_INDEX_VERSION,
      errorMessage: null,
    },
    select: { id: true },
  });

  return { knowledgeSourceId: knowledgeSource.id, skipped: false };
}

async function resolveRagOwner(locator: RagSourceLocator) {
  if (locator.type === "DOCUMENT") {
    return (
      await db.document.findFirst({
        where: { id: locator.sourceId, workspaceId: locator.workspaceId },
        select: { ownerId: true },
      })
    )?.ownerId;
  }
  if (locator.type === "CANDIDATE_PROFILE") {
    return (
      await db.candidateProfile.findFirst({
        where: {
          id: locator.sourceId,
          user: { memberships: { some: { workspaceId: locator.workspaceId } } },
        },
        select: { userId: true },
      })
    )?.userId;
  }
  return (
    await db.jobOpportunity.findFirst({
      where: { id: locator.sourceId, workspaceId: locator.workspaceId },
      select: { application: { select: { ownerId: true } } },
    })
  )?.application?.ownerId;
}

export async function markRagSourceFailed(
  locator: RagSourceLocator,
  error: unknown,
) {
  const ownerId = await resolveRagOwner(locator);
  if (!ownerId) return { updated: false };

  const config = getRagConfig();
  const errorMessage =
    (error instanceof Error ? error.message : "Unknown indexing failure").slice(
      0,
      1_000,
    );
  await db.knowledgeSource.upsert({
    where: {
      workspaceId_type_sourceId: {
        workspaceId: locator.workspaceId,
        type: locator.type,
        sourceId: locator.sourceId,
      },
    },
    create: {
      workspaceId: locator.workspaceId,
      ownerId,
      type: locator.type,
      sourceId: locator.sourceId,
      contentHash: hashRagContent(
        `failed:${locator.type}:${locator.sourceId}`,
      ),
      indexStatus: "FAILED",
      embeddingModel: config.embeddingModel,
      embeddingDimensions: config.embeddingDimensions,
      indexVersion: RAG_INDEX_VERSION,
      errorMessage,
    },
    update: {
      ownerId,
      indexStatus: "FAILED",
      errorMessage,
    },
  });
  return { updated: true };
}

export async function markRagSourceReady(input: {
  locator: RagSourceLocator;
  knowledgeSourceId: string;
}) {
  const updated = await db.knowledgeSource.updateMany({
    where: {
      id: input.knowledgeSourceId,
      workspaceId: input.locator.workspaceId,
      type: input.locator.type,
      sourceId: input.locator.sourceId,
    },
    data: {
      indexStatus: "READY",
      lastIndexedAt: new Date(),
      errorMessage: null,
    },
  });
  if (updated.count !== 1) {
    throw new Error("Knowledge source changed or disappeared while indexing.");
  }
}

export async function deleteRagSource(locator: RagSourceLocator) {
  const deleted = await db.knowledgeSource.deleteMany({
    where: {
      workspaceId: locator.workspaceId,
      type: locator.type,
      sourceId: locator.sourceId,
    },
  });
  return { deleted: deleted.count };
}

export async function collectWorkspaceRagSources(workspaceId: string) {
  const workspace = await db.workspace.findUnique({
    where: { id: workspaceId },
    select: {
      documents: { select: { id: true } },
      opportunities: {
        where: { application: { isNot: null } },
        select: { id: true },
      },
      memberships: {
        where: { user: { candidateProfile: { isNot: null } } },
        select: {
          user: { select: { candidateProfile: { select: { id: true } } } },
        },
      },
    },
  });
  if (!workspace) return null;

  const locators: RagSourceLocator[] = [
    ...workspace.documents.map((document) => ({
      workspaceId,
      type: "DOCUMENT" as const,
      sourceId: document.id,
    })),
    ...workspace.opportunities.map((opportunity) => ({
      workspaceId,
      type: "JOB_OPPORTUNITY" as const,
      sourceId: opportunity.id,
    })),
    ...workspace.memberships.flatMap((membership) =>
      membership.user.candidateProfile
        ? [
            {
              workspaceId,
              type: "CANDIDATE_PROFILE" as const,
              sourceId: membership.user.candidateProfile.id,
            },
          ]
        : [],
    ),
  ];
  return locators;
}

export async function pruneWorkspaceRagSources(
  workspaceId: string,
  currentSources: readonly RagSourceLocator[],
) {
  let deleted = 0;
  for (const type of [
    "DOCUMENT",
    "CANDIDATE_PROFILE",
    "JOB_OPPORTUNITY",
  ] as const) {
    const sourceIds = currentSources
      .filter((source) => source.type === type)
      .map((source) => source.sourceId);
    const result = await db.knowledgeSource.deleteMany({
      where: {
        workspaceId,
        type,
        ...(sourceIds.length ? { sourceId: { notIn: sourceIds } } : {}),
      },
    });
    deleted += result.count;
  }
  return { deleted };
}
