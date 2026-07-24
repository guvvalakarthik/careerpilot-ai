import { createTRPCRouter } from "@/server/api/trpc";
import { workspaceRouter } from "@/server/api/routers/workspace";
import { applicationRouter } from "@/server/api/routers/application";
import { companyRouter } from "@/server/api/routers/company";
import { opportunityRouter } from "@/server/api/routers/opportunity";
import { candidateRouter } from "@/server/api/routers/candidate";
import { aiRouter } from "@/server/api/routers/ai";

export const appRouter = createTRPCRouter({
  workspace: workspaceRouter,
  application: applicationRouter,
  company: companyRouter,
  opportunity: opportunityRouter,
  candidate: candidateRouter,
  ai: aiRouter,
});

export type AppRouter = typeof appRouter;
