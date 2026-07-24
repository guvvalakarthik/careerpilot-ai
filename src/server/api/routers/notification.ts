import { z } from "zod";
import { createTRPCRouter, workspaceProcedure, protectedProcedure } from "@/server/api/trpc";

export const notificationRouter = createTRPCRouter({
  list: workspaceProcedure
    .input(
      z.object({
        workspaceId: z.string(),
        unreadOnly: z.boolean().optional(),
      }),
    )
    .query(async ({ ctx, input }) => {
      return ctx.db.notification.findMany({
        where: {
          workspaceId: ctx.workspaceId,
          userId: ctx.userId,
          ...(input.unreadOnly ? { readAt: null } : {}),
        },
        orderBy: { createdAt: "desc" },
        take: 50,
      });
    }),

  unreadCount: workspaceProcedure
    .input(z.object({ workspaceId: z.string() }))
    .query(async ({ ctx }) => {
      return ctx.db.notification.count({
        where: {
          workspaceId: ctx.workspaceId,
          userId: ctx.userId,
          readAt: null,
        },
      });
    }),

  markRead: workspaceProcedure
    .input(z.object({ workspaceId: z.string(), notificationId: z.string() }))
    .mutation(async ({ ctx, input }) => {
      return ctx.db.notification.updateMany({
        where: {
          id: input.notificationId,
          workspaceId: ctx.workspaceId,
          userId: ctx.userId,
        },
        data: { readAt: new Date() },
      });
    }),

  markAllRead: workspaceProcedure
    .input(z.object({ workspaceId: z.string() }))
    .mutation(async ({ ctx }) => {
      await ctx.db.notification.updateMany({
        where: {
          workspaceId: ctx.workspaceId,
          userId: ctx.userId,
          readAt: null,
        },
        data: { readAt: new Date() },
      });
      return { ok: true };
    }),

  listAll: protectedProcedure
    .input(z.object({}))
    .query(async ({ ctx }) => {
      return ctx.db.notification.findMany({
        where: { userId: ctx.userId },
        include: { workspace: { select: { name: true } } },
        orderBy: { createdAt: "desc" },
        take: 50,
      });
    }),

  unreadCountAll: protectedProcedure
    .input(z.object({}))
    .query(async ({ ctx }) => {
      return ctx.db.notification.count({
        where: {
          userId: ctx.userId,
          readAt: null,
        },
      });
    }),

  markReadAll: protectedProcedure
    .input(z.object({ notificationId: z.string() }))
    .mutation(async ({ ctx, input }) => {
      return ctx.db.notification.updateMany({
        where: {
          id: input.notificationId,
          userId: ctx.userId,
        },
        data: { readAt: new Date() },
      });
    }),

  markAllReadAll: protectedProcedure
    .input(z.object({}))
    .mutation(async ({ ctx }) => {
      await ctx.db.notification.updateMany({
        where: {
          userId: ctx.userId,
          readAt: null,
        },
        data: { readAt: new Date() },
      });
      return { ok: true };
    }),
});
