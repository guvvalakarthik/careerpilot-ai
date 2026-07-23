import { z } from "zod";
import { TRPCError } from "@trpc/server";
import {
  createTRPCRouter,
  protectedProcedure,
  workspaceProcedure,
  requireRole,
} from "@/server/api/trpc";
import { recordAudit } from "@/server/api/audit";

function slugify(name: string): string {
  return (
    name
      .toLowerCase()
      .trim()
      .replace(/[^a-z0-9]+/g, "-")
      .replace(/^-+|-+$/g, "")
      .slice(0, 40) +
    "-" +
    Math.random().toString(36).slice(2, 8)
  );
}

export const workspaceRouter = createTRPCRouter({
  list: protectedProcedure.query(async ({ ctx }) => {
    return ctx.db.membership.findMany({
      where: { userId: ctx.userId },
      include: { workspace: true },
      orderBy: { createdAt: "asc" },
    });
  }),

  create: protectedProcedure
    .input(z.object({ name: z.string().min(2).max(60) }))
    .mutation(async ({ ctx, input }) => {
      const workspace = await ctx.db.workspace.create({
        data: {
          name: input.name,
          slug: slugify(input.name),
          memberships: {
            create: { userId: ctx.userId, role: "OWNER" },
          },
        },
      });

      await recordAudit({
        db: ctx.db,
        workspaceId: workspace.id,
        userId: ctx.userId,
        action: "workspace.create",
        entityType: "Workspace",
        entityId: workspace.id,
        metadata: { name: input.name },
      });

      return workspace;
    }),

  get: workspaceProcedure
    .input(z.object({ workspaceId: z.string() }))
    .query(async ({ ctx }) => {
      return ctx.db.workspace.findUniqueOrThrow({
        where: { id: ctx.workspaceId },
        include: {
          memberships: { include: { user: { select: { id: true, name: true, email: true } } } },
        },
      });
    }),

  members: workspaceProcedure
    .input(z.object({ workspaceId: z.string() }))
    .query(async ({ ctx }) => {
      return ctx.db.membership.findMany({
        where: { workspaceId: ctx.workspaceId },
        include: { user: { select: { id: true, name: true, email: true, image: true } } },
      });
    }),

  updateName: requireRole(["OWNER"])
    .input(z.object({ workspaceId: z.string(), name: z.string().min(2).max(60) }))
    .mutation(async ({ ctx, input }) => {
      const workspace = await ctx.db.workspace.update({
        where: { id: ctx.workspaceId },
        data: { name: input.name },
      });

      await recordAudit({
        db: ctx.db,
        workspaceId: ctx.workspaceId,
        userId: ctx.userId,
        action: "workspace.rename",
        entityType: "Workspace",
        entityId: ctx.workspaceId,
        metadata: { name: input.name },
      });

      return workspace;
    }),

  removeMember: requireRole(["OWNER"])
    .input(z.object({ workspaceId: z.string(), memberUserId: z.string() }))
    .mutation(async ({ ctx, input }) => {
      if (input.memberUserId === ctx.userId) {
        throw new TRPCError({ code: "BAD_REQUEST", message: "Owner cannot remove themselves" });
      }

      await ctx.db.membership.delete({
        where: {
          workspaceId_userId: { workspaceId: ctx.workspaceId, userId: input.memberUserId },
        },
      });

      await recordAudit({
        db: ctx.db,
        workspaceId: ctx.workspaceId,
        userId: ctx.userId,
        action: "workspace.member_remove",
        entityType: "Membership",
        metadata: { removedUserId: input.memberUserId },
      });

      return { ok: true };
    }),
});
