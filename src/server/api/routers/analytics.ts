import { z } from "zod";
import { createTRPCRouter, workspaceProcedure } from "@/server/api/trpc";

const STAGE_ORDER = [
  "CAPTURED",
  "RESEARCHING",
  "READY_TO_APPLY",
  "APPLIED",
  "INTERVIEWING",
  "OFFER",
  "ACCEPTED",
] as const;

export const analyticsRouter = createTRPCRouter({
  funnel: workspaceProcedure
    .input(z.object({ workspaceId: z.string() }))
    .query(async ({ ctx }) => {
      const stages = await ctx.db.application.groupBy({
        by: ["stage"],
        where: {
          workspaceId: ctx.workspaceId,
          stage: { notIn: ["REJECTED", "WITHDRAWN", "ARCHIVED"] },
        },
        _count: true,
      });

      const funnel = STAGE_ORDER.map((stage) => {
        const found = stages.find((s) => s.stage === stage);
        return { stage: stage.replace(/_/g, " "), count: found?._count ?? 0 };
      });

      return funnel;
    }),

  rates: workspaceProcedure
    .input(z.object({ workspaceId: z.string() }))
    .query(async ({ ctx }) => {
      const total = await ctx.db.application.count({
        where: { workspaceId: ctx.workspaceId },
      });

      const applied = await ctx.db.application.count({
        where: {
          workspaceId: ctx.workspaceId,
          stage: { notIn: ["CAPTURED", "RESEARCHING", "READY_TO_APPLY", "WITHDRAWN", "ARCHIVED"] },
        },
      });

      const interviewing = await ctx.db.application.count({
        where: {
          workspaceId: ctx.workspaceId,
          stage: { in: ["INTERVIEWING", "OFFER", "ACCEPTED"] },
        },
      });

      const offers = await ctx.db.application.count({
        where: {
          workspaceId: ctx.workspaceId,
          stage: { in: ["OFFER", "ACCEPTED"] },
        },
      });

      const accepted = await ctx.db.application.count({
        where: { workspaceId: ctx.workspaceId, stage: "ACCEPTED" },
      });

      return {
        total,
        responseRate: applied > 0 ? Math.round((interviewing / applied) * 100) : 0,
        interviewRate: applied > 0 ? Math.round((interviewing / applied) * 100) : 0,
        offerRate: applied > 0 ? Math.round((offers / applied) * 100) : 0,
        acceptanceRate: offers > 0 ? Math.round((accepted / offers) * 100) : 0,
        applied,
        interviewing,
        offers,
        accepted,
      };
    }),

  avgTimePerStage: workspaceProcedure
    .input(z.object({ workspaceId: z.string() }))
    .query(async ({ ctx }) => {
      const apps = await ctx.db.application.findMany({
        where: { workspaceId: ctx.workspaceId },
        select: { stage: true, createdAt: true, lastStageAt: true, appliedAt: true },
      });

      const stageTimes: Record<string, number[]> = {};

      for (const app of apps) {
        const created = new Date(app.createdAt).getTime();
        const lastStage = new Date(app.lastStageAt).getTime();
        const applied = app.appliedAt ? new Date(app.appliedAt).getTime() : null;

        const totalDays = (lastStage - created) / (1000 * 60 * 60 * 24);
        if (totalDays > 0 && totalDays < 365) {
          const stage = app.stage.replace(/_/g, " ");
          if (!stageTimes[stage]) stageTimes[stage] = [];
          stageTimes[stage].push(totalDays);
        }

        if (applied) {
          const preApplyDays = (applied - created) / (1000 * 60 * 60 * 24);
          if (preApplyDays > 0 && preApplyDays < 365) {
            if (!stageTimes["Pre-apply"]) stageTimes["Pre-apply"] = [];
            stageTimes["Pre-apply"].push(preApplyDays);
          }
        }
      }

      return Object.entries(stageTimes).map(([stage, days]) => ({
        stage,
        avgDays: Math.round((days.reduce((a, b) => a + b, 0) / days.length) * 10) / 10,
        count: days.length,
      }));
    }),

  velocity: workspaceProcedure
    .input(z.object({ workspaceId: z.string() }))
    .query(async ({ ctx }) => {
      const now = new Date();
      const sixMonthsAgo = new Date(now.getFullYear(), now.getMonth() - 5, 1);

      const apps = await ctx.db.application.findMany({
        where: {
          workspaceId: ctx.workspaceId,
          createdAt: { gte: sixMonthsAgo },
        },
        select: { createdAt: true, stage: true },
        orderBy: { createdAt: "asc" },
      });

      const months: { month: string; captured: number; advanced: number }[] = [];
      for (let i = 5; i >= 0; i--) {
        const d = new Date(now.getFullYear(), now.getMonth() - i, 1);
        const label = d.toLocaleDateString(undefined, { month: "short" });
        months.push({ month: label, captured: 0, advanced: 0 });
      }

      for (const app of apps) {
        const d = new Date(app.createdAt);
        const monthIdx = (d.getFullYear() - sixMonthsAgo.getFullYear()) * 12 + d.getMonth() - sixMonthsAgo.getMonth();
        if (monthIdx >= 0 && monthIdx < 6) {
          months[monthIdx].captured++;
          if (!["CAPTURED", "RESEARCHING", "READY_TO_APPLY"].includes(app.stage)) {
            months[monthIdx].advanced++;
          }
        }
      }

      return months;
    }),
});
