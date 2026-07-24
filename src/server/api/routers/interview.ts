import { z } from "zod";
import { TRPCError } from "@trpc/server";
import { createTRPCRouter, workspaceProcedure, requireRole } from "@/server/api/trpc";
import { recordAudit } from "@/server/api/audit";

const interviewTypeEnum = z.enum([
  "PHONE_SCREEN",
  "TECHNICAL",
  "SYSTEM_DESIGN",
  "BEHAVIORAL",
  "HR",
  "ONSITE",
  "OTHER",
]);

const interviewOutcomeEnum = z.enum([
  "PENDING",
  "PASSED",
  "FAILED",
  "NO_SHOW",
  "CANCELLED",
]);

export const interviewRouter = createTRPCRouter({
  list: workspaceProcedure
    .input(
      z.object({
        workspaceId: z.string(),
        applicationId: z.string().optional(),
        upcoming: z.boolean().optional(),
      }),
    )
    .query(async ({ ctx, input }) => {
      return ctx.db.interview.findMany({
        where: {
          workspaceId: ctx.workspaceId,
          ...(input.applicationId ? { applicationId: input.applicationId } : {}),
          ...(input.upcoming
            ? { scheduledAt: { gte: new Date() }, outcome: "PENDING" }
            : {}),
        },
        include: {
          application: { include: { opportunity: { include: { company: true } } } },
        },
        orderBy: { scheduledAt: "asc" },
      });
    }),

  get: workspaceProcedure
    .input(z.object({ workspaceId: z.string(), interviewId: z.string() }))
    .query(async ({ ctx, input }) => {
      const interview = await ctx.db.interview.findFirst({
        where: { id: input.interviewId, workspaceId: ctx.workspaceId },
        include: { application: { include: { opportunity: true } } },
      });
      if (!interview) throw new TRPCError({ code: "NOT_FOUND", message: "Interview not found" });
      return interview;
    }),

  create: requireRole(["OWNER", "COACH", "SEEKER"])
    .input(
      z.object({
        workspaceId: z.string(),
        applicationId: z.string(),
        type: interviewTypeEnum.default("OTHER"),
        scheduledAt: z.string().datetime(),
        durationMins: z.number().int().min(5).max(480).default(60),
        interviewer: z.string().max(200).optional().nullable(),
        notes: z.string().max(2000).optional().nullable(),
      }),
    )
    .mutation(async ({ ctx, input }) => {
      const app = await ctx.db.application.findFirst({
        where: { id: input.applicationId, workspaceId: ctx.workspaceId },
      });
      if (!app) throw new TRPCError({ code: "NOT_FOUND", message: "Application not found" });

      const interview = await ctx.db.interview.create({
        data: {
          workspaceId: ctx.workspaceId,
          applicationId: input.applicationId,
          type: input.type,
          scheduledAt: new Date(input.scheduledAt),
          durationMins: input.durationMins,
          interviewer: input.interviewer ?? null,
          notes: input.notes ?? null,
        },
      });

      await recordAudit({
        db: ctx.db,
        workspaceId: ctx.workspaceId,
        userId: ctx.userId,
        action: "interview.create",
        entityType: "Interview",
        entityId: interview.id,
        metadata: { applicationId: input.applicationId, type: input.type },
      });

      return interview;
    }),

  update: requireRole(["OWNER", "COACH", "SEEKER"])
    .input(
      z.object({
        workspaceId: z.string(),
        interviewId: z.string(),
        type: interviewTypeEnum.optional(),
        scheduledAt: z.string().datetime().optional(),
        durationMins: z.number().int().min(5).max(480).optional(),
        interviewer: z.string().max(200).optional().nullable(),
        notes: z.string().max(2000).optional().nullable(),
        outcome: interviewOutcomeEnum.optional(),
      }),
    )
    .mutation(async ({ ctx, input }) => {
      const existing = await ctx.db.interview.findFirst({
        where: { id: input.interviewId, workspaceId: ctx.workspaceId },
      });
      if (!existing) throw new TRPCError({ code: "NOT_FOUND", message: "Interview not found" });

      const { interviewId, ...data } = input;
      return ctx.db.interview.update({
        where: { id: interviewId },
        data: {
          ...(data.type !== undefined ? { type: data.type } : {}),
          ...(data.scheduledAt !== undefined ? { scheduledAt: new Date(data.scheduledAt) } : {}),
          ...(data.durationMins !== undefined ? { durationMins: data.durationMins } : {}),
          ...(data.interviewer !== undefined ? { interviewer: data.interviewer } : {}),
          ...(data.notes !== undefined ? { notes: data.notes } : {}),
          ...(data.outcome !== undefined ? { outcome: data.outcome } : {}),
        },
      });
    }),

  cancel: requireRole(["OWNER", "COACH", "SEEKER"])
    .input(z.object({ workspaceId: z.string(), interviewId: z.string() }))
    .mutation(async ({ ctx, input }) => {
      const existing = await ctx.db.interview.findFirst({
        where: { id: input.interviewId, workspaceId: ctx.workspaceId },
      });
      if (!existing) throw new TRPCError({ code: "NOT_FOUND", message: "Interview not found" });

      return ctx.db.interview.update({
        where: { id: input.interviewId },
        data: { outcome: "CANCELLED" },
      });
    }),

  delete: requireRole(["OWNER", "COACH"])
    .input(z.object({ workspaceId: z.string(), interviewId: z.string() }))
    .mutation(async ({ ctx, input }) => {
      await ctx.db.interview.delete({
        where: { id: input.interviewId },
      });

      await recordAudit({
        db: ctx.db,
        workspaceId: ctx.workspaceId,
        userId: ctx.userId,
        action: "interview.delete",
        entityType: "Interview",
        entityId: input.interviewId,
      });

      return { ok: true };
    }),
});
