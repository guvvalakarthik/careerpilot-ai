import { z } from "zod";
import { TRPCError } from "@trpc/server";
import {
  createTRPCRouter,
  protectedProcedure,
  workspaceProcedure,
  requireRole,
} from "@/server/api/trpc";
import { recordAudit } from "@/server/api/audit";
import { ownedApplicationScope, ownerScope } from "@/server/api/ownership";

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
      const target = await ctx.db.membership.findUnique({ where: { workspaceId_userId: { workspaceId: ctx.workspaceId, userId: input.memberUserId } } });
      if (!target) throw new TRPCError({ code: "NOT_FOUND", message: "Member not found" });
      if (target.role === "OWNER") {
        const ownerCount = await ctx.db.membership.count({ where: { workspaceId: ctx.workspaceId, role: "OWNER" } });
        if (ownerCount <= 1) throw new TRPCError({ code: "BAD_REQUEST", message: "A workspace must retain at least one owner" });
      }
      const ownedRecords = await Promise.all([
        ctx.db.application.count({ where: { workspaceId: ctx.workspaceId, ownerId: input.memberUserId } }),
        ctx.db.contact.count({ where: { workspaceId: ctx.workspaceId, ownerId: input.memberUserId } }),
        ctx.db.task.count({ where: { workspaceId: ctx.workspaceId, ownerId: input.memberUserId } }),
        ctx.db.document.count({ where: { workspaceId: ctx.workspaceId, ownerId: input.memberUserId } }),
      ]);
      if (ownedRecords.some((count) => count > 0)) throw new TRPCError({ code: "CONFLICT", message: "Reassign this member's records before removing them" });

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

  inviteMember: requireRole(["OWNER", "COACH"])
    .input(
      z.object({
        workspaceId: z.string(),
        email: z.string().email(),
        role: z.enum(["OWNER", "COACH", "SEEKER"]).default("SEEKER"),
      }),
    )
    .mutation(async ({ ctx, input }) => {
      if (ctx.membership.role === "COACH" && input.role !== "SEEKER") {
        throw new TRPCError({ code: "FORBIDDEN", message: "Coaches may only invite seekers" });
      }
      const user = await ctx.db.user.findUnique({
        where: { email: input.email },
      });
      if (!user) {
        throw new TRPCError({
          code: "NOT_FOUND",
          message: "No user found with that email. Ask them to register first.",
        });
      }

      const existing = await ctx.db.membership.findUnique({
        where: {
          workspaceId_userId: { workspaceId: ctx.workspaceId, userId: user.id },
        },
      });
      if (existing) {
        throw new TRPCError({
          code: "CONFLICT",
          message: "User is already a member of this workspace.",
        });
      }

      const membership = await ctx.db.membership.create({
        data: {
          workspaceId: ctx.workspaceId,
          userId: user.id,
          role: input.role,
        },
      });

      await recordAudit({
        db: ctx.db,
        workspaceId: ctx.workspaceId,
        userId: ctx.userId,
        action: "workspace.member_invite",
        entityType: "Membership",
        entityId: membership.id,
        metadata: { invitedEmail: input.email, role: input.role },
      });

      return membership;
    }),

  changeRole: requireRole(["OWNER"])
    .input(
      z.object({
        workspaceId: z.string(),
        memberUserId: z.string(),
        role: z.enum(["OWNER", "COACH", "SEEKER"]),
      }),
    )
    .mutation(async ({ ctx, input }) => {
      const target = await ctx.db.membership.findUnique({ where: { workspaceId_userId: { workspaceId: ctx.workspaceId, userId: input.memberUserId } } });
      if (!target) throw new TRPCError({ code: "NOT_FOUND", message: "Member not found" });
      if (target.role === "OWNER" && input.role !== "OWNER") {
        const ownerCount = await ctx.db.membership.count({ where: { workspaceId: ctx.workspaceId, role: "OWNER" } });
        if (ownerCount <= 1) throw new TRPCError({ code: "BAD_REQUEST", message: "Transfer ownership before demoting the last owner" });
      }

      const membership = await ctx.db.membership.update({
        where: {
          workspaceId_userId: { workspaceId: ctx.workspaceId, userId: input.memberUserId },
        },
        data: { role: input.role },
      });

      await recordAudit({
        db: ctx.db,
        workspaceId: ctx.workspaceId,
        userId: ctx.userId,
        action: "workspace.member_role_change",
        entityType: "Membership",
        entityId: membership.id,
        metadata: { memberUserId: input.memberUserId, newRole: input.role },
      });

      return membership;
    }),

  stats: workspaceProcedure
    .input(z.object({ workspaceId: z.string() }))
    .query(async ({ ctx }) => {
      const [companies, opportunities, applications, contacts, interviews, tasks] =
        await Promise.all([
          ctx.db.company.count({ where: { workspaceId: ctx.workspaceId } }),
          ctx.db.jobOpportunity.count({ where: { workspaceId: ctx.workspaceId, ...ownedApplicationScope(ctx.membership.role, ctx.userId) } }),
          ctx.db.application.count({ where: { workspaceId: ctx.workspaceId, ...ownerScope(ctx.membership.role, ctx.userId) } }),
          ctx.db.contact.count({ where: { workspaceId: ctx.workspaceId, ...ownerScope(ctx.membership.role, ctx.userId) } }),
          ctx.db.interview.count({ where: { workspaceId: ctx.workspaceId, ...ownedApplicationScope(ctx.membership.role, ctx.userId) } }),
          ctx.db.task.count({
            where: { workspaceId: ctx.workspaceId, ...ownerScope(ctx.membership.role, ctx.userId), status: "OPEN" },
          }),
        ]);

      return { companies, opportunities, applications, contacts, interviews, tasks };
    }),
});
