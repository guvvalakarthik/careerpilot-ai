import { z } from "zod";
import { createTRPCRouter, workspaceProcedure, requireRole } from "@/server/api/trpc";
import { recordAudit } from "@/server/api/audit";

export const companyRouter = createTRPCRouter({
  list: workspaceProcedure
    .input(
      z.object({
        workspaceId: z.string(),
        search: z.string().optional(),
      }),
    )
    .query(async ({ ctx, input }) => {
      return ctx.db.company.findMany({
        where: {
          workspaceId: ctx.workspaceId,
          ...(input.search
            ? { name: { contains: input.search, mode: "insensitive" } }
            : {}),
        },
        include: {
          _count: { select: { opportunities: true, contacts: true } },
        },
        orderBy: { createdAt: "desc" },
      });
    }),

  get: workspaceProcedure
    .input(z.object({ workspaceId: z.string(), companyId: z.string() }))
    .query(async ({ ctx, input }) => {
      const company = await ctx.db.company.findFirst({
        where: { id: input.companyId, workspaceId: ctx.workspaceId },
        include: {
          opportunities: { include: { application: true } },
          contacts: true,
        },
      });
      if (!company) throw new Error("Company not found");
      return company;
    }),

  create: requireRole(["OWNER", "COACH", "SEEKER"])
    .input(
      z.object({
        workspaceId: z.string(),
        name: z.string().min(1).max(100),
        website: z.string().url().optional().or(z.literal("")),
        industry: z.string().optional(),
        notes: z.string().optional(),
      }),
    )
    .mutation(async ({ ctx, input }) => {
      const company = await ctx.db.company.create({
        data: {
          workspaceId: ctx.workspaceId,
          name: input.name,
          website: input.website || null,
          industry: input.industry || null,
          notes: input.notes || null,
        },
      });

      await recordAudit({
        db: ctx.db,
        workspaceId: ctx.workspaceId,
        userId: ctx.userId,
        action: "company.create",
        entityType: "Company",
        entityId: company.id,
        metadata: { name: input.name },
      });

      return company;
    }),

  update: requireRole(["OWNER", "COACH"])
    .input(
      z.object({
        workspaceId: z.string(),
        companyId: z.string(),
        name: z.string().min(1).max(100).optional(),
        website: z.string().url().optional().or(z.literal("")),
        industry: z.string().optional(),
        notes: z.string().optional(),
      }),
    )
    .mutation(async ({ ctx, input }) => {
      return ctx.db.company.update({
        where: { id: input.companyId },
        data: {
          ...(input.name !== undefined ? { name: input.name } : {}),
          ...(input.website !== undefined ? { website: input.website || null } : {}),
          ...(input.industry !== undefined ? { industry: input.industry || null } : {}),
          ...(input.notes !== undefined ? { notes: input.notes || null } : {}),
        },
      });
    }),

  delete: requireRole(["OWNER", "COACH"])
    .input(z.object({ workspaceId: z.string(), companyId: z.string() }))
    .mutation(async ({ ctx, input }) => {
      await ctx.db.company.delete({
        where: { id: input.companyId },
      });

      await recordAudit({
        db: ctx.db,
        workspaceId: ctx.workspaceId,
        userId: ctx.userId,
        action: "company.delete",
        entityType: "Company",
        entityId: input.companyId,
      });

      return { ok: true };
    }),
});
