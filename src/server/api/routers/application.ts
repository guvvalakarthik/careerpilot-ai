import { z } from "zod";
import { TRPCError } from "@trpc/server";
import {
  createTRPCRouter,
  workspaceProcedure,
  requireRole,
} from "@/server/api/trpc";
import { recordAudit } from "@/server/api/audit";
import { ownerScope } from "@/server/api/ownership";

const stageEnum = z.enum([
  "CAPTURED",
  "RESEARCHING",
  "READY_TO_APPLY",
  "APPLIED",
  "INTERVIEWING",
  "OFFER",
  "ACCEPTED",
  "REJECTED",
  "WITHDRAWN",
  "ARCHIVED",
]);

const validTransitions: Record<string, string[]> = {
  CAPTURED: ["RESEARCHING", "READY_TO_APPLY", "REJECTED", "WITHDRAWN", "ARCHIVED"],
  RESEARCHING: ["READY_TO_APPLY", "REJECTED", "WITHDRAWN", "ARCHIVED"],
  READY_TO_APPLY: ["APPLIED", "REJECTED", "WITHDRAWN", "ARCHIVED"],
  APPLIED: ["INTERVIEWING", "REJECTED", "WITHDRAWN", "ARCHIVED"],
  INTERVIEWING: ["OFFER", "REJECTED", "WITHDRAWN", "ARCHIVED"],
  OFFER: ["ACCEPTED", "REJECTED", "WITHDRAWN", "ARCHIVED"],
  ACCEPTED: ["ARCHIVED"],
  REJECTED: ["ARCHIVED"],
  WITHDRAWN: ["ARCHIVED"],
  ARCHIVED: [],
};

export const applicationRouter = createTRPCRouter({
  list: workspaceProcedure
    .input(
      z.object({
        workspaceId: z.string(),
        stage: stageEnum.optional(),
        search: z.string().optional(),
        companyId: z.string().optional(),
      }),
    )
    .query(async ({ ctx, input }) => {
      return ctx.db.application.findMany({
        where: {
          workspaceId: ctx.workspaceId,
          ...ownerScope(ctx.membership.role, ctx.userId),
          ...(input.stage ? { stage: input.stage } : {}),
          ...(input.companyId ? { opportunity: { companyId: input.companyId } } : {}),
          ...(input.search
            ? {
                OR: [
                  { opportunity: { title: { contains: input.search, mode: "insensitive" } } },
                  { opportunity: { company: { name: { contains: input.search, mode: "insensitive" } } } },
                  { opportunity: { location: { contains: input.search, mode: "insensitive" } } },
                ],
              }
            : {}),
        },
        include: {
          opportunity: {
            include: { company: true },
          },
          tasks: { select: { id: true, status: true } },
          outreach: { select: { id: true } },
        },
        orderBy: { lastStageAt: "desc" },
      });
    }),

  get: workspaceProcedure
    .input(z.object({ workspaceId: z.string(), applicationId: z.string() }))
    .query(async ({ ctx, input }) => {
      const app = await ctx.db.application.findFirst({
        where: {
          id: input.applicationId,
          workspaceId: ctx.workspaceId,
          ...ownerScope(ctx.membership.role, ctx.userId),
        },
        include: {
          opportunity: { include: { company: true } },
          interviews: { orderBy: { scheduledAt: "asc" } },
          tasks: { orderBy: { dueAt: "asc" } },
          decisions: { orderBy: { createdAt: "desc" } },
          outreach: { include: { contact: true } },
          resumeLinks: { include: { document: true } },
        },
      });
      if (!app) throw new TRPCError({ code: "NOT_FOUND", message: "Application not found" });
      return app;
    }),

  changeStage: workspaceProcedure
    .input(
      z.object({
        workspaceId: z.string(),
        applicationId: z.string(),
        toStage: stageEnum,
        note: z.string().optional(),
      }),
    )
    .mutation(async ({ ctx, input }) => {
      const app = await ctx.db.application.findFirst({
        where: {
          id: input.applicationId,
          workspaceId: ctx.workspaceId,
          ...ownerScope(ctx.membership.role, ctx.userId),
        },
      });
      if (!app) throw new TRPCError({ code: "NOT_FOUND", message: "Application not found" });

      const allowed = validTransitions[app.stage] ?? [];
      if (!allowed.includes(input.toStage)) {
        throw new TRPCError({
          code: "BAD_REQUEST",
          message: `Cannot transition from ${app.stage} to ${input.toStage}`,
        });
      }

      const [updatedApp] = await ctx.db.$transaction([
        ctx.db.application.update({
          where: { id: input.applicationId },
          data: {
            stage: input.toStage,
            lastStageAt: new Date(),
            appliedAt:
              input.toStage === "APPLIED" && !app.appliedAt
                ? new Date()
                : app.appliedAt,
          },
        }),
        ctx.db.decisionEvent.create({
          data: {
            applicationId: input.applicationId,
            fromStage: app.stage,
            toStage: input.toStage,
            note: input.note,
          },
        }),
      ]);

      await recordAudit({
        db: ctx.db,
        workspaceId: ctx.workspaceId,
        userId: ctx.userId,
        action: "application.stage_change",
        entityType: "Application",
        entityId: input.applicationId,
        metadata: { from: app.stage, to: input.toStage, note: input.note },
      });

      return updatedApp;
    }),

  update: requireRole(["OWNER", "COACH", "SEEKER"])
    .input(
      z.object({
        workspaceId: z.string(),
        applicationId: z.string(),
        fitScore: z.number().min(0).max(100).optional(),
        outcomeNotes: z.string().optional(),
      }),
    )
    .mutation(async ({ ctx, input }) => {
      const existing = await ctx.db.application.findFirst({
        where: {
          id: input.applicationId,
          workspaceId: ctx.workspaceId,
          ...ownerScope(ctx.membership.role, ctx.userId),
        },
        select: { id: true },
      });
      if (!existing) throw new TRPCError({ code: "NOT_FOUND", message: "Application not found" });
      return ctx.db.application.update({
        where: { id: input.applicationId },
        data: {
          ...(input.fitScore !== undefined ? { fitScore: input.fitScore } : {}),
          ...(input.outcomeNotes !== undefined ? { outcomeNotes: input.outcomeNotes } : {}),
        },
      });
    }),

  delete: requireRole(["OWNER", "COACH"])
    .input(z.object({ workspaceId: z.string(), applicationId: z.string() }))
    .mutation(async ({ ctx, input }) => {
      const deleted = await ctx.db.application.deleteMany({
        where: { id: input.applicationId, workspaceId: ctx.workspaceId },
      });
      if (deleted.count === 0) throw new TRPCError({ code: "NOT_FOUND", message: "Application not found" });

      await recordAudit({
        db: ctx.db,
        workspaceId: ctx.workspaceId,
        userId: ctx.userId,
        action: "application.delete",
        entityType: "Application",
        entityId: input.applicationId,
      });

      return { ok: true };
    }),
});
