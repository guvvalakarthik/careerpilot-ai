import { z } from "zod";
import { TRPCError } from "@trpc/server";
import { createTRPCRouter, workspaceProcedure, requireRateLimitedRole } from "@/server/api/trpc";
import { extractJobData, calculateFitScore, isAIConfigured, assistantChat, resumeJdMatch, generateSkillPaths } from "@/server/ai";
import { chatMessagesSchema } from "@/server/ai-boundaries";
import { fetchFileTextFromR2, isR2Configured } from "@/server/r2";
import { recordAudit } from "@/server/api/audit";
import { ownedApplicationScope, ownerScope } from "@/server/api/ownership";

// eslint-disable-next-line @typescript-eslint/no-explicit-any
type PrismaJson = any;

const idSchema = z.string().trim().min(1).max(128);

export const aiRouter = createTRPCRouter({
  status: workspaceProcedure
    .input(z.object({ workspaceId: idSchema }).strict())
    .query(() => {
      return { configured: isAIConfigured() };
    }),

  extractJob: requireRateLimitedRole(["OWNER", "COACH", "SEEKER"], "ai")
    .input(
      z.object({
        workspaceId: idSchema,
        opportunityId: idSchema,
      }).strict(),
    )
    .mutation(async ({ ctx, input }) => {
      if (!isAIConfigured()) {
        throw new TRPCError({ code: "PRECONDITION_FAILED", message: "AI is not configured. Set GOOGLE_GENERATIVE_AI_API_KEY." });
      }

      const opp = await ctx.db.jobOpportunity.findFirst({
        where: { id: input.opportunityId, workspaceId: ctx.workspaceId, ...ownedApplicationScope(ctx.membership.role, ctx.userId) },
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

  fitScore: requireRateLimitedRole(["OWNER", "COACH", "SEEKER"], "ai")
    .input(
      z.object({
        workspaceId: idSchema,
        applicationId: idSchema,
      }).strict(),
    )
    .mutation(async ({ ctx, input }) => {
      if (!isAIConfigured()) {
        throw new TRPCError({ code: "PRECONDITION_FAILED", message: "AI is not configured. Set GOOGLE_GENERATIVE_AI_API_KEY." });
      }

      const app = await ctx.db.application.findFirst({
        where: { id: input.applicationId, workspaceId: ctx.workspaceId, ...ownerScope(ctx.membership.role, ctx.userId) },
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

  assistantChat: requireRateLimitedRole(["OWNER", "COACH", "SEEKER"], "ai")
    .input(
      z.object({
        workspaceId: idSchema,
        messages: chatMessagesSchema,
      }).strict(),
    )
    .mutation(async ({ ctx, input }) => {
      if (!isAIConfigured()) {
        throw new TRPCError({ code: "PRECONDITION_FAILED", message: "AI is not configured. Set GOOGLE_GENERATIVE_AI_API_KEY." });
      }

      // Build context from workspace data
      const [applications, interviews, contacts, tasks] = await Promise.all([
        ctx.db.application.findMany({
          where: { workspaceId: ctx.workspaceId, ...ownerScope(ctx.membership.role, ctx.userId) },
          include: { opportunity: { include: { company: true } } },
          orderBy: { updatedAt: "desc" },
          take: 20,
        }),
        ctx.db.interview.findMany({
          where: { workspaceId: ctx.workspaceId, ...ownedApplicationScope(ctx.membership.role, ctx.userId), outcome: "PENDING" },
          include: { application: { include: { opportunity: { include: { company: true } } } } },
          orderBy: { scheduledAt: "asc" },
          take: 10,
        }),
        ctx.db.contact.findMany({
          where: { workspaceId: ctx.workspaceId, ...ownerScope(ctx.membership.role, ctx.userId) },
          include: { company: true },
          take: 15,
        }),
        ctx.db.task.findMany({
          where: { workspaceId: ctx.workspaceId, ...ownerScope(ctx.membership.role, ctx.userId), status: { in: ["OPEN", "IN_PROGRESS"] } },
          include: { application: { include: { opportunity: true } } },
          orderBy: { dueAt: "asc" },
          take: 10,
        }),
      ]);

      const contextParts: string[] = [];

      contextParts.push("=== APPLICATIONS ===");
      for (const app of applications) {
        const company = app.opportunity.company?.name ?? "Unknown";
        const title = app.opportunity.title ?? "Untitled";
        contextParts.push(`- ${title} at ${company} | Stage: ${app.stage} | Fit: ${app.fitScore ?? "N/A"} | Applied: ${app.appliedAt ? new Date(app.appliedAt).toLocaleDateString() : "Not yet"} | Last stage change: ${new Date(app.lastStageAt).toLocaleDateString()}`);
      }

      contextParts.push("\n=== UPCOMING INTERVIEWS ===");
      for (const iv of interviews) {
        const company = iv.application.opportunity.company?.name ?? "Unknown";
        const title = iv.application.opportunity.title ?? "Untitled";
        contextParts.push(`- ${iv.type.replace(/_/g, " ")} at ${company} for ${title} on ${new Date(iv.scheduledAt).toLocaleString()} | Interviewer: ${iv.interviewer ?? "TBD"}`);
      }

      contextParts.push("\n=== CONTACTS ===");
      for (const c of contacts) {
        contextParts.push(`- ${c.name} | ${c.role ?? "Unknown role"} | ${c.company?.name ?? "Unknown company"} | Email: ${c.email ?? "N/A"}`);
      }

      contextParts.push("\n=== OPEN TASKS ===");
      for (const t of tasks) {
        const appInfo = t.application?.opportunity?.title ? ` (${t.application.opportunity.title})` : "";
        contextParts.push(`- ${t.title}${appInfo} | Due: ${t.dueAt ? new Date(t.dueAt).toLocaleDateString() : "No deadline"} | Status: ${t.status}`);
      }

      const context = contextParts.join("\n");

      const aiRun = await ctx.db.aiRun.create({
        data: {
          workspaceId: ctx.workspaceId,
          userId: ctx.userId,
          type: "ASSISTANT_CHAT",
          status: "RUNNING",
          inputSummary: input.messages[input.messages.length - 1].content.slice(0, 200),
        },
      });

      const startTime = Date.now();
      const response = await assistantChat(input.messages, context);

      if (!response) {
        await ctx.db.aiRun.update({
          where: { id: aiRun.id },
          data: { status: "FAILED", errorMessage: "Chat returned null", latencyMs: Date.now() - startTime },
        });
        throw new TRPCError({ code: "INTERNAL_SERVER_ERROR", message: "AI chat failed" });
      }

      await ctx.db.aiRun.update({
        where: { id: aiRun.id },
        data: {
          status: "SUCCEEDED",
          output: { response } as PrismaJson,
          latencyMs: Date.now() - startTime,
        },
      });

      return { response };
    }),

  resumeMatch: requireRateLimitedRole(["OWNER", "COACH", "SEEKER"], "ai")
    .input(
      z.object({
        workspaceId: idSchema,
        documentId: idSchema,
        jdText: z.string().trim().min(50).max(20_000),
      }).strict(),
    )
    .mutation(async ({ ctx, input }) => {
      if (!isAIConfigured()) {
        throw new TRPCError({ code: "PRECONDITION_FAILED", message: "AI is not configured. Set GOOGLE_GENERATIVE_AI_API_KEY." });
      }

      if (!isR2Configured()) {
        throw new TRPCError({ code: "PRECONDITION_FAILED", message: "R2 storage is not configured." });
      }

      // Fetch the resume document from DB
      const doc = await ctx.db.document.findFirst({
        where: {
          id: input.documentId,
          workspaceId: ctx.workspaceId,
          ...ownerScope(ctx.membership.role, ctx.userId),
        },
      });
      if (!doc) {
        throw new TRPCError({ code: "NOT_FOUND", message: "Resume document not found" });
      }

      const aiRun = await ctx.db.aiRun.create({
        data: {
          workspaceId: ctx.workspaceId,
          userId: ctx.userId,
          type: "FIT_SCORING",
          status: "RUNNING",
          inputSummary: `Resume match: ${doc.fileName}`,
        },
      });

      const startTime = Date.now();

      // Extract text from the resume file in R2
      let resumeText: string;
      try {
        resumeText = await fetchFileTextFromR2(doc.storageKey, doc.mimeType);
      } catch {
        await ctx.db.aiRun.update({
          where: { id: aiRun.id },
          data: { status: "FAILED", errorMessage: "Failed to extract resume text", latencyMs: Date.now() - startTime },
        });
        throw new TRPCError({ code: "INTERNAL_SERVER_ERROR", message: "Failed to read resume file" });
      }

      if (resumeText.trim().length < 50) {
        await ctx.db.aiRun.update({
          where: { id: aiRun.id },
          data: { status: "FAILED", errorMessage: "Resume text too short", latencyMs: Date.now() - startTime },
        });
        throw new TRPCError({ code: "BAD_REQUEST", message: "Could not extract enough text from the resume. If it's a scanned PDF, try uploading a text-based version." });
      }

      const result = await resumeJdMatch(resumeText, input.jdText);

      if (!result) {
        await ctx.db.aiRun.update({
          where: { id: aiRun.id },
          data: { status: "FAILED", errorMessage: "Resume match returned null", latencyMs: Date.now() - startTime },
        });
        throw new TRPCError({ code: "INTERNAL_SERVER_ERROR", message: "Resume match analysis failed" });
      }

      // Generate transferable skill paths and cache them
      if (result.matchedSkills.length > 0 && result.missingSkills.length > 0) {
        const paths = await generateSkillPaths(result.matchedSkills, result.missingSkills);
        if (paths && paths.length > 0) {
          result.skillPaths = paths;

          // Cache skill relationships in DB (upsert, ignore failures)
          for (const p of paths) {
            const skillA = p.fromSkill.toLowerCase();
            const skillB = p.toSkill.toLowerCase();
            try {
              await ctx.db.skillRelationship.upsert({
                where: {
                  skillA_skillB_relationship: { skillA, skillB, relationship: p.relationship },
                },
                create: {
                  skillA,
                  skillB,
                  relationship: p.relationship,
                  strength: p.strength,
                  reason: p.reason,
                  estimatedTime: p.estimatedTime,
                },
                update: {
                  strength: p.strength,
                  reason: p.reason,
                  estimatedTime: p.estimatedTime,
                },
              });
            } catch {
              // Non-critical — continue
            }
          }
        }
      }

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
        action: "ai.resume_match",
        entityType: "AiRun",
        entityId: aiRun.id,
        metadata: { matchScore: result.matchScore, verdict: result.matchVerdict, documentId: doc.id },
      });

      return result;
    }),

  skillPaths: requireRateLimitedRole(["OWNER", "COACH", "SEEKER"], "ai")
    .input(
      z.object({
        workspaceId: idSchema,
        skills: z.array(z.string().trim().min(1).max(100)).min(1).max(50),
      }).strict(),
    )
    .query(async ({ ctx, input }) => {
      const lowerSkills = input.skills.map((s) => s.toLowerCase());

      // Check DB cache for known relationships
      const cached = await ctx.db.skillRelationship.findMany({
        where: {
          skillA: { in: lowerSkills },
        },
        orderBy: { strength: "desc" },
      });

      return { paths: cached };
    }),
});
