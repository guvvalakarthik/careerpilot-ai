import { createTRPCRouter } from "@/server/api/trpc";
import { workspaceRouter } from "@/server/api/routers/workspace";
import { applicationRouter } from "@/server/api/routers/application";
import { companyRouter } from "@/server/api/routers/company";
import { opportunityRouter } from "@/server/api/routers/opportunity";

export const appRouter = createTRPCRouter({
  workspace: workspaceRouter,
  application: applicationRouter,
  company: companyRouter,
  opportunity: opportunityRouter,
});

export type AppRouter = typeof appRouter;
