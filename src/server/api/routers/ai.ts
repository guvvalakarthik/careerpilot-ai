import { z } from "zod";
import { TRPCError } from "@trpc/server";
import { createTRPCRouter, workspaceProcedure, requireRole } from "@/server/api/trpc";
import { extractJobData, calculateFitScore, isAIConfigured } from "@/server/ai";
import { recordAudit } from "@/server/api/audit";

// eslint-disable-next-line @typescript-eslint/no-explicit-any
type PrismaJson = any;

export const aiRouter = createTRPCRouter({
  status: workspaceProcedure
    .input(z.object({ workspaceId: z.string() }))
    .query(() => {
      return { configured: isAIConfigured() };
    }),

  extractJob: requireRole(["OWNER", "COACH", "SEEKER"])
    .input(
      z.object({
        workspaceId: z.string(),
        opportunityId: z.string(),
      }),
    )
    .mutation(async ({ ctx, input }) => {
      if (!isAIConfigured()) {
        throw new TRPCError({ code: "PRECONDITION_FAILED", message: "AI is not configured. Set GOOGLE_GENERATIVE_AI_API_KEY." });
      }

      const opp = await ctx.db.jobOpportunity.findFirst({
        where: { id: input.opportunityId, workspaceId: ctx.workspaceId },
      });
      if (!opp) throw new TRPCError({ code: "NOT_FOUND", message: "Opportunity not found" });

      const aiRun = await ctx.db.aiRun.create({
        data: {
          workspaceId: ctx.workspaceId,
          userId: ctx.userId,
          type: "JOB_EXTRACTION",
          status: "RUNNING",
          inputSummary: opp.rawInput?.slice(0, 200) ?? opp.title,
        },
      });

      const startTime = Date.now();
      const extracted = await extractJobData(opp.rawInput ?? opp.title ?? "");

      if (!extracted) {
        await ctx.db.aiRun.update({
          where: { id: aiRun.id },
          data: { status: "FAILED", errorMessage: "Extraction returned null", latencyMs: Date.now() - startTime },
        });
        throw new TRPCError({ code: "INTERNAL_SERVER_ERROR", message: "AI extraction failed" });
      }

      // Find or create company
      let companyId = opp.companyId;
      if (extracted.company && !companyId) {
        const existing = await ctx.db.company.findFirst({
          where: { workspaceId: ctx.workspaceId, name: { equals: extracted.company, mode: "insensitive" } },
        });
        if (existing) {
          companyId = existing.id;
        } else {
          const newCompany = await ctx.db.company.create({
            data: { workspaceId: ctx.workspaceId, name: extracted.company },
          });
          companyId = newCompany.id;
        }
      }

      const updated = await ctx.db.jobOpportunity.update({
        where: { id: opp.id },
        data: {
          companyId,
          title: extracted.title ?? opp.title,
          location: extracted.location,
          employmentType: extracted.employmentType,
          salaryRange: extracted.salaryRange,
          experienceRequired: extracted.experienceRequired,
          requiredSkills: extracted.requiredSkills,
          preferredSkills: extracted.preferredSkills,
          applicationDeadline: extracted.applicationDeadline ? new Date(extracted.applicationDeadline) : null,
          extractedAt: new Date(),
        },
      });

      await ctx.db.aiRun.update({
        where: { id: aiRun.id },
        data: {
          status: "SUCCEEDED",
          output: extracted as PrismaJson,
          latencyMs: Date.now() - startTime,
        },
      });

      await recordAudit({
        db: ctx.db,
        workspaceId: ctx.workspaceId,
        userId: ctx.userId,
        action: "ai.job_extraction",
        entityType: "JobOpportunity",
        entityId: opp.id,
      });

      return { opportunity: updated, extracted };
    }),

  fitScore: requireRole(["OWNER", "COACH", "SEEKER"])
    .input(
      z.object({
        workspaceId: z.string(),
        applicationId: z.string(),
      }),
    )
    .mutation(async ({ ctx, input }) => {
      if (!isAIConfigured()) {
        throw new TRPCError({ code: "PRECONDITION_FAILED", message: "AI is not configured. Set GOOGLE_GENERATIVE_AI_API_KEY." });
      }

      const app = await ctx.db.application.findFirst({
        where: { id: input.applicationId, workspaceId: ctx.workspaceId },
        include: { opportunity: true },
      });
      if (!app) throw new TRPCError({ code: "NOT_FOUND", message: "Application not found" });

      const profile = await ctx.db.candidateProfile.findUnique({
        where: { userId: ctx.userId },
      });
      if (!profile) {
        throw new TRPCError({ code: "PRECONDITION_FAILED", message: "Set up your candidate profile first to get fit scores." });
      }

      const aiRun = await ctx.db.aiRun.create({
        data: {
          workspaceId: ctx.workspaceId,
          userId: ctx.userId,
          type: "FIT_SCORING",
          status: "RUNNING",
          inputSummary: `App: ${app.opportunity.title ?? "Untitled"}`,
        },
      });

      const startTime = Date.now();
      const result = await calculateFitScore(
        profile.skills,
        app.opportunity.requiredSkills,
        app.opportunity.preferredSkills,
        profile.yearsExperience,
        app.opportunity.experienceRequired,
      );

      if (!result) {
        await ctx.db.aiRun.update({
          where: { id: aiRun.id },
          data: { status: "FAILED", errorMessage: "Fit scoring returned null", latencyMs: Date.now() - startTime },
        });
        throw new TRPCError({ code: "INTERNAL_SERVER_ERROR", message: "AI fit scoring failed" });
      }

      const updated = await ctx.db.application.update({
        where: { id: app.id },
        data: {
          fitScore: result.score,
          fitReasons: result.reasons as PrismaJson,
          missingSkills: result.missingSkills,
        },
      });

      await ctx.db.aiRun.update({
        where: { id: aiRun.id },
        data: {
          status: "SUCCEEDED",
          output: result as PrismaJson,
          latencyMs: Date.now() - startTime,
        },
      });

      await recordAudit({
        db: ctx.db,
        workspaceId: ctx.workspaceId,
        userId: ctx.userId,
        action: "ai.fit_scoring",
        entityType: "Application",
        entityId: app.id,
        metadata: { score: result.score },
      });

      return { application: updated, result };
    }),
});
