import { z } from "zod";
import { TRPCError } from "@trpc/server";
import { createTRPCRouter, workspaceProcedure, requireRole } from "@/server/api/trpc";
import { recordAudit } from "@/server/api/audit";
import { ownerScope, resolveRecordOwner } from "@/server/api/ownership";

const taskStatusEnum = z.enum(["OPEN", "IN_PROGRESS", "DONE", "CANCELLED"]);

export const taskRouter = createTRPCRouter({
  list: workspaceProcedure
    .input(
      z.object({
        workspaceId: z.string(),
        applicationId: z.string().optional(),
        status: taskStatusEnum.optional(),
        upcoming: z.boolean().optional(),
      }),
    )
    .query(async ({ ctx, input }) => {
      return ctx.db.task.findMany({
        where: {
          workspaceId: ctx.workspaceId,
          ...ownerScope(ctx.membership.role, ctx.userId),
          ...(input.applicationId ? { applicationId: input.applicationId } : {}),
          ...(input.status ? { status: input.status } : {}),
          ...(input.upcoming
            ? { dueAt: { gte: new Date() }, status: { in: ["OPEN", "IN_PROGRESS"] } }
            : {}),
        },
        include: {
          application: { include: { opportunity: { include: { company: true } } } },
        },
        orderBy: { dueAt: "asc" },
      });
    }),

  create: requireRole(["OWNER", "COACH", "SEEKER"])
    .input(
      z.object({
        workspaceId: z.string(),
        ownerId: z.string().optional(),
        applicationId: z.string().optional().nullable(),
        title: z.string().min(1).max(200),
        description: z.string().max(2000).optional().nullable(),
        dueAt: z.string().datetime().optional().nullable(),
      }),
    )
    .mutation(async ({ ctx, input }) => {
      const ownerId = await resolveRecordOwner({ db: ctx.db, workspaceId: ctx.workspaceId, actorId: ctx.userId, actorRole: ctx.membership.role, requestedOwnerId: input.ownerId });
      if (input.applicationId) {
        const app = await ctx.db.application.findFirst({
          where: { id: input.applicationId, workspaceId: ctx.workspaceId, ownerId },
        });
        if (!app) throw new TRPCError({ code: "NOT_FOUND", message: "Application not found" });
      }

      const task = await ctx.db.task.create({
        data: {
          workspaceId: ctx.workspaceId,
          ownerId,
          applicationId: input.applicationId ?? null,
          title: input.title,
          description: input.description ?? null,
          dueAt: input.dueAt ? new Date(input.dueAt) : null,
        },
      });

      await recordAudit({
        db: ctx.db,
        workspaceId: ctx.workspaceId,
        userId: ctx.userId,
        action: "task.create",
        entityType: "Task",
        entityId: task.id,
        metadata: { title: input.title },
      });

      return task;
    }),

  update: requireRole(["OWNER", "COACH", "SEEKER"])
    .input(
      z.object({
        workspaceId: z.string(),
        taskId: z.string(),
        title: z.string().min(1).max(200).optional(),
        description: z.string().max(2000).optional().nullable(),
        dueAt: z.string().datetime().optional().nullable(),
        status: taskStatusEnum.optional(),
      }),
    )
    .mutation(async ({ ctx, input }) => {
      const existing = await ctx.db.task.findFirst({
        where: { id: input.taskId, workspaceId: ctx.workspaceId, ...ownerScope(ctx.membership.role, ctx.userId) },
      });
      if (!existing) throw new TRPCError({ code: "NOT_FOUND", message: "Task not found" });

      const { taskId, ...data } = input;
      return ctx.db.task.update({
        where: { id: taskId },
        data: {
          ...(data.title !== undefined ? { title: data.title } : {}),
          ...(data.description !== undefined ? { description: data.description } : {}),
          ...(data.dueAt !== undefined ? { dueAt: data.dueAt ? new Date(data.dueAt) : null } : {}),
          ...(data.status !== undefined
            ? {
                status: data.status,
                completedAt: data.status === "DONE" ? new Date() : null,
              }
            : {}),
        },
      });
    }),

  delete: requireRole(["OWNER", "COACH"])
    .input(z.object({ workspaceId: z.string(), taskId: z.string() }))
    .mutation(async ({ ctx, input }) => {
      const deleted = await ctx.db.task.deleteMany({ where: { id: input.taskId, workspaceId: ctx.workspaceId } });
      if (deleted.count === 0) throw new TRPCError({ code: "NOT_FOUND", message: "Task not found" });

      await recordAudit({
        db: ctx.db,
        workspaceId: ctx.workspaceId,
        userId: ctx.userId,
        action: "task.delete",
        entityType: "Task",
        entityId: input.taskId,
      });

      return { ok: true };
    }),
});
