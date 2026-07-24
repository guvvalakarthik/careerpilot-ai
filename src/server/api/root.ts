import { createTRPCRouter } from "@/server/api/trpc";
import { workspaceRouter } from "@/server/api/routers/workspace";
import { applicationRouter } from "@/server/api/routers/application";
import { companyRouter } from "@/server/api/routers/company";
import { opportunityRouter } from "@/server/api/routers/opportunity";
import { candidateRouter } from "@/server/api/routers/candidate";
import { aiRouter } from "@/server/api/routers/ai";
import { contactRouter } from "@/server/api/routers/contact";
import { interviewRouter } from "@/server/api/routers/interview";
import { taskRouter } from "@/server/api/routers/task";

export const appRouter = createTRPCRouter({
  workspace: workspaceRouter,
  application: applicationRouter,
  company: companyRouter,
  opportunity: opportunityRouter,
  candidate: candidateRouter,
  ai: aiRouter,
  contact: contactRouter,
  interview: interviewRouter,
  task: taskRouter,
});

export type AppRouter = typeof appRouter;
