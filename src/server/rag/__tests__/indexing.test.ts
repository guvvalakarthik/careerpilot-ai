import { afterEach, describe, expect, it, vi } from "vitest";
import type { PrismaClient } from "@prisma/client";
import {
  loadRagSource,
  prepareRagSource,
  serializeCandidateProfile,
  serializeJobOpportunity,
  UnsupportedRagSourceError,
} from "../indexing";

afterEach(() => {
  vi.restoreAllMocks();
});

describe("RAG source preparation", () => {
  it("serializes candidate fields deterministically", () => {
    expect(
      serializeCandidateProfile({
        id: "profile-1",
        userId: "user-1",
        headline: "Backend engineer",
        summary: "Builds reliable products.",
        skills: ["TypeScript", "PostgreSQL"],
        yearsExperience: 4,
        locations: ["Bengaluru"],
        desiredRoles: ["Senior Engineer"],
        minSalary: 2_400_000,
      }),
    ).toContain("Skills: TypeScript, PostgreSQL");
  });

  it("serializes job data and preserves the raw description", () => {
    const text = serializeJobOpportunity({
      id: "job-1",
      title: "Product Engineer",
      rawInput: "Own the product from discovery through delivery.",
      sourceUrl: "https://example.com/job",
      location: "Remote",
      employmentType: "Full-time",
      requiredSkills: ["TypeScript"],
      preferredSkills: ["PostgreSQL"],
      experienceRequired: "3+ years",
      salaryRange: "20-30 LPA",
      applicationDeadline: new Date("2026-08-01T00:00:00.000Z"),
      company: { name: "Acme" },
      application: { ownerId: "user-1" },
    });

    expect(text).toContain("Role: Product Engineer");
    expect(text).toContain("Company: Acme");
    expect(text).toContain("Own the product from discovery through delivery.");
  });

  it("creates stable content and chunk hashes", () => {
    const source = {
      locator: {
        workspaceId: "workspace-1",
        type: "CANDIDATE_PROFILE" as const,
        sourceId: "profile-1",
      },
      ownerId: "user-1",
      content: "TypeScript and PostgreSQL experience.",
      metadata: { candidateProfileId: "profile-1" },
    };

    expect(prepareRagSource(source)).toEqual(prepareRagSource(source));
  });
});

describe("RAG source loading boundaries", () => {
  it("rejects image documents before reading binary data as text", async () => {
    const fetchDocumentText = vi.fn();
    const database = {
      document: {
        findFirst: vi.fn().mockResolvedValue({
          id: "document-1",
          ownerId: "user-1",
          fileName: "certificate.png",
          storageKey: "workspaces/workspace-1/documents/file.png",
          mimeType: "image/png",
          type: "CERTIFICATE",
        }),
      },
    } as unknown as PrismaClient;

    await expect(
      loadRagSource(
        {
          workspaceId: "workspace-1",
          type: "DOCUMENT",
          sourceId: "document-1",
        },
        { database, fetchDocumentText },
      ),
    ).rejects.toBeInstanceOf(UnsupportedRagSourceError);
    expect(fetchDocumentText).not.toHaveBeenCalled();
  });

  it("derives job ownership from the workspace-scoped application", async () => {
    const database = {
      jobOpportunity: {
        findFirst: vi.fn().mockResolvedValue({
          id: "job-1",
          title: "Engineer",
          rawInput: "Build secure products.",
          sourceUrl: null,
          location: null,
          employmentType: null,
          requiredSkills: [],
          preferredSkills: [],
          experienceRequired: null,
          salaryRange: null,
          applicationDeadline: null,
          company: null,
          application: { ownerId: "actual-owner" },
        }),
      },
    } as unknown as PrismaClient;

    const loaded = await loadRagSource(
      {
        workspaceId: "workspace-1",
        type: "JOB_OPPORTUNITY",
        sourceId: "job-1",
      },
      { database },
    );

    expect(loaded?.ownerId).toBe("actual-owner");
  });
});
