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
import { documentRouter } from "@/server/api/routers/document";
import { resumeRouter } from "@/server/api/routers/resume";
import { notificationRouter } from "@/server/api/routers/notification";
import { analyticsRouter } from "@/server/api/routers/analytics";

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
  document: documentRouter,
  resume: resumeRouter,
  notification: notificationRouter,
  analytics: analyticsRouter,
});

export type AppRouter = typeof appRouter;
