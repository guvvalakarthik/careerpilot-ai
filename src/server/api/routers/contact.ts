import { z } from "zod";
import { TRPCError } from "@trpc/server";
import { createTRPCRouter, workspaceProcedure, requireRole } from "@/server/api/trpc";
import { recordAudit } from "@/server/api/audit";
import { ownerScope, resolveRecordOwner } from "@/server/api/ownership";

export const contactRouter = createTRPCRouter({
  list: workspaceProcedure
    .input(
      z.object({
        workspaceId: z.string(),
        search: z.string().optional(),
        companyId: z.string().optional(),
      }),
    )
    .query(async ({ ctx, input }) => {
      return ctx.db.contact.findMany({
        where: {
          workspaceId: ctx.workspaceId,
          ...ownerScope(ctx.membership.role, ctx.userId),
          ...(input.companyId ? { companyId: input.companyId } : {}),
          ...(input.search
            ? {
                OR: [
                  { name: { contains: input.search, mode: "insensitive" } },
                  { role: { contains: input.search, mode: "insensitive" } },
                  { email: { contains: input.search, mode: "insensitive" } },
                  { notes: { contains: input.search, mode: "insensitive" } },
                ],
              }
            : {}),
        },
        include: {
          company: true,
          outreach: { include: { application: { include: { opportunity: true } } } },
        },
        orderBy: { updatedAt: "desc" },
      });
    }),

  get: workspaceProcedure
    .input(z.object({ workspaceId: z.string(), contactId: z.string() }))
    .query(async ({ ctx, input }) => {
      const contact = await ctx.db.contact.findFirst({
        where: { id: input.contactId, workspaceId: ctx.workspaceId, ...ownerScope(ctx.membership.role, ctx.userId) },
        include: {
          company: true,
          outreach: { include: { application: { include: { opportunity: true } } } },
        },
      });
      if (!contact) throw new TRPCError({ code: "NOT_FOUND", message: "Contact not found" });
      return contact;
    }),

  create: requireRole(["OWNER", "COACH", "SEEKER"])
    .input(
      z.object({
        workspaceId: z.string(),
        ownerId: z.string().optional(),
        name: z.string().min(1).max(100),
        companyId: z.string().optional().nullable(),
        role: z.string().max(100).optional().nullable(),
        email: z.string().email().optional().or(z.literal("")).nullable(),
        linkedinUrl: z.string().url().optional().or(z.literal("")).nullable(),
        relationship: z.string().max(100).optional().nullable(),
        notes: z.string().max(2000).optional().nullable(),
        nextAction: z.string().max(200).optional().nullable(),
      }),
    )
    .mutation(async ({ ctx, input }) => {
      const ownerId = await resolveRecordOwner({ db: ctx.db, workspaceId: ctx.workspaceId, actorId: ctx.userId, actorRole: ctx.membership.role, requestedOwnerId: input.ownerId });
      if (input.companyId) {
        const company = await ctx.db.company.findFirst({ where: { id: input.companyId, workspaceId: ctx.workspaceId } });
        if (!company) throw new TRPCError({ code: "BAD_REQUEST", message: "Company must belong to this workspace" });
      }
      const contact = await ctx.db.contact.create({
        data: {
          workspaceId: ctx.workspaceId,
          ownerId,
          name: input.name,
          companyId: input.companyId ?? null,
          role: input.role ?? null,
          email: input.email ?? null,
          linkedinUrl: input.linkedinUrl ?? null,
          relationship: input.relationship ?? null,
          notes: input.notes ?? null,
          nextAction: input.nextAction ?? null,
        },
      });

      await recordAudit({
        db: ctx.db,
        workspaceId: ctx.workspaceId,
        userId: ctx.userId,
        action: "contact.create",
        entityType: "Contact",
        entityId: contact.id,
        metadata: { name: input.name },
      });

      return contact;
    }),

  update: requireRole(["OWNER", "COACH", "SEEKER"])
    .input(
      z.object({
        workspaceId: z.string(),
        contactId: z.string(),
        name: z.string().min(1).max(100).optional(),
        companyId: z.string().optional().nullable(),
        role: z.string().max(100).optional().nullable(),
        email: z.string().email().optional().or(z.literal("")).nullable(),
        linkedinUrl: z.string().url().optional().or(z.literal("")).nullable(),
        relationship: z.string().max(100).optional().nullable(),
        notes: z.string().max(2000).optional().nullable(),
        nextAction: z.string().max(200).optional().nullable(),
        lastInteraction: z.date().optional().nullable(),
      }),
    )
    .mutation(async ({ ctx, input }) => {
      const existing = await ctx.db.contact.findFirst({
        where: { id: input.contactId, workspaceId: ctx.workspaceId, ...ownerScope(ctx.membership.role, ctx.userId) },
      });
      if (!existing) throw new TRPCError({ code: "NOT_FOUND", message: "Contact not found" });
      if (input.companyId) {
        const company = await ctx.db.company.findFirst({ where: { id: input.companyId, workspaceId: ctx.workspaceId } });
        if (!company) throw new TRPCError({ code: "BAD_REQUEST", message: "Company must belong to this workspace" });
      }

      const { contactId, ...data } = input;
      // workspaceId is validated by workspaceProcedure middleware
      return ctx.db.contact.update({
        where: { id: contactId },
        data: {
          ...(data.name !== undefined ? { name: data.name } : {}),
          ...(data.companyId !== undefined ? { companyId: data.companyId } : {}),
          ...(data.role !== undefined ? { role: data.role } : {}),
          ...(data.email !== undefined ? { email: data.email } : {}),
          ...(data.linkedinUrl !== undefined ? { linkedinUrl: data.linkedinUrl } : {}),
          ...(data.relationship !== undefined ? { relationship: data.relationship } : {}),
          ...(data.notes !== undefined ? { notes: data.notes } : {}),
          ...(data.nextAction !== undefined ? { nextAction: data.nextAction } : {}),
          ...(data.lastInteraction !== undefined ? { lastInteraction: data.lastInteraction } : {}),
        },
      });
    }),

  delete: requireRole(["OWNER", "COACH", "SEEKER"])
    .input(z.object({ workspaceId: z.string(), contactId: z.string() }))
    .mutation(async ({ ctx, input }) => {
      const contact = await ctx.db.contact.findFirst({
        where: {
          id: input.contactId,
          workspaceId: ctx.workspaceId,
          ...ownerScope(ctx.membership.role, ctx.userId),
        },
        select: { id: true },
      });
      if (!contact) throw new TRPCError({ code: "NOT_FOUND", message: "Contact not found" });
      await ctx.db.contact.delete({ where: { id: contact.id } });

      await recordAudit({
        db: ctx.db,
        workspaceId: ctx.workspaceId,
        userId: ctx.userId,
        action: "contact.delete",
        entityType: "Contact",
        entityId: input.contactId,
      });

      return { ok: true };
    }),

  // Outreach messages
  listOutreach: workspaceProcedure
    .input(
      z.object({
        workspaceId: z.string(),
        contactId: z.string().optional(),
        applicationId: z.string().optional(),
      }),
    )
    .query(async ({ ctx, input }) => {
      return ctx.db.outreachMessage.findMany({
        where: {
          ...(input.contactId ? { contactId: input.contactId } : {}),
          ...(input.applicationId ? { applicationId: input.applicationId } : {}),
          contact: { workspaceId: ctx.workspaceId, ...ownerScope(ctx.membership.role, ctx.userId) },
        },
        include: {
          contact: true,
          application: { include: { opportunity: true } },
        },
        orderBy: { createdAt: "desc" },
      });
    }),

  createOutreach: requireRole(["OWNER", "COACH", "SEEKER"])
    .input(
      z.object({
        workspaceId: z.string(),
        contactId: z.string(),
        applicationId: z.string().optional().nullable(),
        subject: z.string().max(200).optional().nullable(),
        body: z.string().min(1).max(5000),
      }),
    )
    .mutation(async ({ ctx, input }) => {
      const contact = await ctx.db.contact.findFirst({
        where: { id: input.contactId, workspaceId: ctx.workspaceId, ...ownerScope(ctx.membership.role, ctx.userId) },
      });
      if (!contact) throw new TRPCError({ code: "NOT_FOUND", message: "Contact not found" });
      if (input.applicationId) {
        const application = await ctx.db.application.findFirst({ where: { id: input.applicationId, workspaceId: ctx.workspaceId } });
        if (!application || application.ownerId !== contact.ownerId) throw new TRPCError({ code: "BAD_REQUEST", message: "Application and contact must have the same workspace owner" });
      }

      const outreach = await ctx.db.outreachMessage.create({
        data: {
          contactId: input.contactId,
          applicationId: input.applicationId ?? null,
          subject: input.subject ?? null,
          body: input.body,
        },
      });

      await recordAudit({
        db: ctx.db,
        workspaceId: ctx.workspaceId,
        userId: ctx.userId,
        action: "outreach.create",
        entityType: "OutreachMessage",
        entityId: outreach.id,
        metadata: { contactId: input.contactId },
      });

      return outreach;
    }),

  markSent: requireRole(["OWNER", "COACH", "SEEKER"])
    .input(z.object({ workspaceId: z.string(), outreachId: z.string() }))
    .mutation(async ({ ctx, input }) => {
      const outreach = await ctx.db.outreachMessage.findFirst({
        where: { id: input.outreachId, contact: { workspaceId: ctx.workspaceId, ...ownerScope(ctx.membership.role, ctx.userId) } },
      });
      if (!outreach) throw new TRPCError({ code: "NOT_FOUND", message: "Outreach message not found" });

      return ctx.db.outreachMessage.update({
        where: { id: input.outreachId },
        data: { sentAt: new Date(), approved: true },
      });
    }),

  deleteOutreach: requireRole(["OWNER", "COACH", "SEEKER"])
    .input(z.object({ workspaceId: z.string(), outreachId: z.string() }))
    .mutation(async ({ ctx, input }) => {
      const outreach = await ctx.db.outreachMessage.findFirst({
        where: { id: input.outreachId, contact: { workspaceId: ctx.workspaceId, ...ownerScope(ctx.membership.role, ctx.userId) } },
      });
      if (!outreach) throw new TRPCError({ code: "NOT_FOUND", message: "Outreach message not found" });

      await ctx.db.outreachMessage.delete({
        where: { id: input.outreachId },
      });

      return { ok: true };
    }),
});
