import { z } from "zod";
import { TRPCError } from "@trpc/server";
import { createTRPCRouter, workspaceProcedure, requireRole } from "@/server/api/trpc";
import { recordAudit } from "@/server/api/audit";
import { getDownloadUrl, deleteFromR2, isR2Configured } from "@/server/r2";

const documentTypeEnum = z.enum([
  "RESUME",
  "COVER_LETTER",
  "CERTIFICATE",
  "PORTFOLIO",
  "OFFER_LETTER",
  "OTHER",
]);

export const documentRouter = createTRPCRouter({
  status: workspaceProcedure
    .input(z.object({ workspaceId: z.string() }))
    .query(() => {
      return { configured: isR2Configured() };
    }),

  list: workspaceProcedure
    .input(
      z.object({
        workspaceId: z.string(),
        type: documentTypeEnum.optional(),
      }),
    )
    .query(async ({ ctx, input }) => {
      return ctx.db.document.findMany({
        where: {
          workspaceId: ctx.workspaceId,
          ...(input.type ? { type: input.type } : {}),
        },
        include: {
          resumeVersions: {
            include: {
              applications: { select: { id: true, opportunity: { select: { title: true, company: { select: { name: true } } } } } },
            },
          },
        },
        orderBy: { createdAt: "desc" },
      });
    }),

  create: requireRole(["OWNER", "COACH", "SEEKER"])
    .input(
      z.object({
        workspaceId: z.string(),
        type: documentTypeEnum.default("OTHER"),
        fileName: z.string().min(1).max(255),
        storageKey: z.string().min(1),
        mimeType: z.string().max(100),
        sizeBytes: z.number().int().min(1),
        isResume: z.boolean().optional(),
        resumeLabel: z.string().max(100).optional().nullable(),
      }),
    )
    .mutation(async ({ ctx, input }) => {
      const doc = await ctx.db.document.create({
        data: {
          workspaceId: ctx.workspaceId,
          type: input.type,
          fileName: input.fileName,
          storageKey: input.storageKey,
          mimeType: input.mimeType,
          sizeBytes: input.sizeBytes,
        },
      });

      let resumeVersion = null;
      if (input.isResume || input.type === "RESUME") {
        const existingCount = await ctx.db.resumeVersion.count({
          where: { documentId: doc.id },
        });
        resumeVersion = await ctx.db.resumeVersion.create({
          data: {
            documentId: doc.id,
            version: existingCount + 1,
            label: input.resumeLabel ?? null,
          },
        });
      }

      await recordAudit({
        db: ctx.db,
        workspaceId: ctx.workspaceId,
        userId: ctx.userId,
        action: "document.create",
        entityType: "Document",
        entityId: doc.id,
        metadata: { fileName: input.fileName, type: input.type },
      });

      return { document: doc, resumeVersion };
    }),

  delete: requireRole(["OWNER", "COACH", "SEEKER"])
    .input(z.object({ workspaceId: z.string(), documentId: z.string() }))
    .mutation(async ({ ctx, input }) => {
      const doc = await ctx.db.document.findFirst({
        where: { id: input.documentId, workspaceId: ctx.workspaceId },
      });
      if (!doc) throw new TRPCError({ code: "NOT_FOUND", message: "Document not found" });

      if (isR2Configured()) {
        try {
          await deleteFromR2(doc.storageKey);
        } catch {
          // Continue with DB deletion even if R2 delete fails
        }
      }

      await ctx.db.document.delete({ where: { id: input.documentId } });

      await recordAudit({
        db: ctx.db,
        workspaceId: ctx.workspaceId,
        userId: ctx.userId,
        action: "document.delete",
        entityType: "Document",
        entityId: input.documentId,
      });

      return { ok: true };
    }),

  getDownloadUrl: requireRole(["OWNER", "COACH", "SEEKER"])
    .input(z.object({ workspaceId: z.string(), documentId: z.string() }))
    .mutation(async ({ ctx, input }) => {
      const doc = await ctx.db.document.findFirst({
        where: { id: input.documentId, workspaceId: ctx.workspaceId },
      });
      if (!doc) throw new TRPCError({ code: "NOT_FOUND", message: "Document not found" });

      if (!isR2Configured()) {
        throw new TRPCError({ code: "PRECONDITION_FAILED", message: "R2 storage is not configured" });
      }

      const url = await getDownloadUrl(doc.storageKey);
      return { url, fileName: doc.fileName, mimeType: doc.mimeType };
    }),
});
