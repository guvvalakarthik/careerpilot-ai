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
    .query(() => ({ configured: isR2Configured() })),

  list: workspaceProcedure
    .input(z.object({ workspaceId: z.string(), type: documentTypeEnum.optional() }))
    .query(async ({ ctx, input }) => {
      return ctx.db.document.findMany({
        where: {
          workspaceId: ctx.workspaceId,
          ...(input.type ? { type: input.type } : {}),
        },
        include: {
          resumeVersions: {
            include: {
              applications: {
                select: {
                  id: true,
                  opportunity: { select: { title: true, company: { select: { name: true } } } },
                },
              },
            },
          },
        },
        orderBy: { createdAt: "desc" },
      });
    }),

  delete: requireRole(["OWNER", "COACH", "SEEKER"])
    .input(z.object({ workspaceId: z.string(), documentId: z.string() }))
    .mutation(async ({ ctx, input }) => {
      const doc = await ctx.db.document.findFirst({
        where: { id: input.documentId, workspaceId: ctx.workspaceId },
      });
      if (!doc) throw new TRPCError({ code: "NOT_FOUND", message: "Document not found" });

      await ctx.db.document.delete({ where: { id: doc.id } });
      if (isR2Configured()) {
        await deleteFromR2(doc.storageKey).catch((error) => {
          console.error("R2 document cleanup failed", error instanceof Error ? error.message : "Unknown error");
        });
      }

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
