import { z } from "zod";
import { TRPCError } from "@trpc/server";
import { createTRPCRouter, workspaceProcedure, requireRole } from "@/server/api/trpc";

export const resumeRouter = createTRPCRouter({
  list: workspaceProcedure
    .input(z.object({ workspaceId: z.string() }))
    .query(async ({ ctx }) => {
      return ctx.db.resumeVersion.findMany({
        where: { document: { workspaceId: ctx.workspaceId } },
        include: {
          document: true,
          applications: {
            select: {
              id: true,
              opportunity: { select: { title: true, company: { select: { name: true } } } },
            },
          },
        },
        orderBy: { createdAt: "desc" },
      });
    }),

  linkToApplication: requireRole(["OWNER", "COACH", "SEEKER"])
    .input(
      z.object({
        workspaceId: z.string(),
        resumeVersionId: z.string(),
        applicationId: z.string(),
      }),
    )
    .mutation(async ({ ctx, input }) => {
      const resume = await ctx.db.resumeVersion.findFirst({
        where: {
          id: input.resumeVersionId,
          document: { workspaceId: ctx.workspaceId },
        },
      });
      if (!resume) throw new TRPCError({ code: "NOT_FOUND", message: "Resume version not found" });

      const app = await ctx.db.application.findFirst({
        where: { id: input.applicationId, workspaceId: ctx.workspaceId },
      });
      if (!app) throw new TRPCError({ code: "NOT_FOUND", message: "Application not found" });

      await ctx.db.application.update({
        where: { id: input.applicationId },
        data: {
          resumeLinks: {
            connect: { id: input.resumeVersionId },
          },
        },
      });

      return { ok: true };
    }),

  unlinkFromApplication: requireRole(["OWNER", "COACH", "SEEKER"])
    .input(
      z.object({
        workspaceId: z.string(),
        resumeVersionId: z.string(),
        applicationId: z.string(),
      }),
    )
    .mutation(async ({ ctx, input }) => {
      await ctx.db.application.update({
        where: { id: input.applicationId },
        data: {
          resumeLinks: {
            disconnect: { id: input.resumeVersionId },
          },
        },
      });

      return { ok: true };
    }),

  updateLabel: requireRole(["OWNER", "COACH", "SEEKER"])
    .input(
      z.object({
        workspaceId: z.string(),
        resumeVersionId: z.string(),
        label: z.string().max(100).optional().nullable(),
      }),
    )
    .mutation(async ({ ctx, input }) => {
      const resume = await ctx.db.resumeVersion.findFirst({
        where: {
          id: input.resumeVersionId,
          document: { workspaceId: ctx.workspaceId },
        },
      });
      if (!resume) throw new TRPCError({ code: "NOT_FOUND", message: "Resume version not found" });

      return ctx.db.resumeVersion.update({
        where: { id: input.resumeVersionId },
        data: { label: input.label ?? null },
      });
    }),
});
