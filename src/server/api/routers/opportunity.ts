import { z } from "zod";
import { TRPCError } from "@trpc/server";
import { createTRPCRouter, workspaceProcedure, requireRole } from "@/server/api/trpc";
import { recordAudit } from "@/server/api/audit";
import { extractJobData, isAIConfigured } from "@/server/ai";

export const opportunityRouter = createTRPCRouter({
  list: workspaceProcedure
    .input(
      z.object({
        workspaceId: z.string(),
        search: z.string().optional(),
      }),
    )
    .query(async ({ ctx, input }) => {
      return ctx.db.jobOpportunity.findMany({
        where: {
          workspaceId: ctx.workspaceId,
          ...(input.search
            ? { title: { contains: input.search, mode: "insensitive" } }
            : {}),
        },
        include: {
          company: true,
          application: true,
        },
        orderBy: { createdAt: "desc" },
      });
    }),

  get: workspaceProcedure
    .input(z.object({ workspaceId: z.string(), opportunityId: z.string() }))
    .query(async ({ ctx, input }) => {
      const opp = await ctx.db.jobOpportunity.findFirst({
        where: { id: input.opportunityId, workspaceId: ctx.workspaceId },
        include: { company: true, application: true },
      });
      if (!opp) throw new TRPCError({ code: "NOT_FOUND", message: "Opportunity not found" });
      return opp;
    }),

  quickCapture: requireRole(["OWNER", "COACH", "SEEKER"])
    .input(
      z.object({
        workspaceId: z.string(),
        rawInput: z.string().min(1),
        sourceUrl: z.string().url().optional().or(z.literal("")),
        companyName: z.string().optional(),
        title: z.string().optional(),
      }),
    )
    .mutation(async ({ ctx, input }) => {
      let company = null;
      if (input.companyName) {
        company = await ctx.db.company.findFirst({
          where: {
            workspaceId: ctx.workspaceId,
            name: { equals: input.companyName, mode: "insensitive" },
          },
        });
        if (!company) {
          company = await ctx.db.company.create({
            data: {
              workspaceId: ctx.workspaceId,
              name: input.companyName,
            },
          });
        }
      }

      const opportunity = await ctx.db.jobOpportunity.create({
        data: {
          workspaceId: ctx.workspaceId,
          companyId: company?.id ?? null,
          title: input.title ?? null,
          rawInput: input.rawInput,
          sourceUrl: input.sourceUrl || null,
        },
      });

      const application = await ctx.db.application.create({
        data: {
          workspaceId: ctx.workspaceId,
          opportunityId: opportunity.id,
          stage: "CAPTURED",
        },
      });

      // Auto-extract with AI if configured and no manual company/title provided
      let extracted = false;
      if (isAIConfigured() && !input.companyName && !input.title) {
        try {
          const result = await extractJobData(input.rawInput);
          if (result) {
            let companyId = company?.id ?? null;
            if (result.company && !companyId) {
              const existing = await ctx.db.company.findFirst({
                where: { workspaceId: ctx.workspaceId, name: { equals: result.company, mode: "insensitive" } },
              });
              if (existing) {
                companyId = existing.id;
              } else {
                const newCompany = await ctx.db.company.create({
                  data: { workspaceId: ctx.workspaceId, name: result.company },
                });
                companyId = newCompany.id;
              }
            }

            await ctx.db.jobOpportunity.update({
              where: { id: opportunity.id },
              data: {
                companyId,
                title: result.title ?? opportunity.title,
                location: result.location,
                employmentType: result.employmentType,
                salaryRange: result.salaryRange,
                experienceRequired: result.experienceRequired,
                requiredSkills: result.requiredSkills,
                preferredSkills: result.preferredSkills,
                applicationDeadline: result.applicationDeadline ? new Date(result.applicationDeadline) : null,
                extractedAt: new Date(),
              },
            });

            await ctx.db.aiRun.create({
              data: {
                workspaceId: ctx.workspaceId,
                userId: ctx.userId,
                type: "JOB_EXTRACTION",
                status: "SUCCEEDED",
                inputSummary: input.rawInput.slice(0, 200),
                output: result as unknown as object,
              },
            });

            extracted = true;
          }
        } catch (err) {
          console.error("Auto-extraction in quickCapture failed:", err);
          await ctx.db.aiRun.create({
            data: {
              workspaceId: ctx.workspaceId,
              userId: ctx.userId,
              type: "JOB_EXTRACTION",
              status: "FAILED",
              inputSummary: input.rawInput.slice(0, 200),
              errorMessage: err instanceof Error ? err.message : "Unknown error",
            },
          }).catch(() => {});
        }
      }

      await recordAudit({
        db: ctx.db,
        workspaceId: ctx.workspaceId,
        userId: ctx.userId,
        action: "opportunity.quick_capture",
        entityType: "JobOpportunity",
        entityId: opportunity.id,
        metadata: {
          title: input.title,
          companyName: input.companyName,
          applicationId: application.id,
        },
      });

      return { opportunity, application, extracted };
    }),

  update: requireRole(["OWNER", "COACH", "SEEKER"])
    .input(
      z.object({
        workspaceId: z.string(),
        opportunityId: z.string(),
        title: z.string().optional(),
        companyId: z.string().optional().nullable(),
        location: z.string().optional(),
        employmentType: z.string().optional(),
        salaryRange: z.string().optional(),
        experienceRequired: z.string().optional(),
        applicationDeadline: z.coerce.date().optional().nullable(),
        requiredSkills: z.array(z.string()).optional(),
        preferredSkills: z.array(z.string()).optional(),
      }),
    )
    .mutation(async ({ ctx, input }) => {
      const { opportunityId, ...data } = input;
      return ctx.db.jobOpportunity.update({
        where: { id: opportunityId },
        data: {
          ...(data.title !== undefined ? { title: data.title } : {}),
          ...(data.companyId !== undefined ? { companyId: data.companyId } : {}),
          ...(data.location !== undefined ? { location: data.location } : {}),
          ...(data.employmentType !== undefined ? { employmentType: data.employmentType } : {}),
          ...(data.salaryRange !== undefined ? { salaryRange: data.salaryRange } : {}),
          ...(data.experienceRequired !== undefined ? { experienceRequired: data.experienceRequired } : {}),
          ...(data.applicationDeadline !== undefined ? { applicationDeadline: data.applicationDeadline } : {}),
          ...(data.requiredSkills !== undefined ? { requiredSkills: data.requiredSkills } : {}),
          ...(data.preferredSkills !== undefined ? { preferredSkills: data.preferredSkills } : {}),
        },
      });
    }),

  delete: requireRole(["OWNER", "COACH"])
    .input(z.object({ workspaceId: z.string(), opportunityId: z.string() }))
    .mutation(async ({ ctx, input }) => {
      await ctx.db.jobOpportunity.delete({
        where: { id: input.opportunityId },
      });

      await recordAudit({
        db: ctx.db,
        workspaceId: ctx.workspaceId,
        userId: ctx.userId,
        action: "opportunity.delete",
        entityType: "JobOpportunity",
        entityId: input.opportunityId,
      });

      return { ok: true };
    }),
});
