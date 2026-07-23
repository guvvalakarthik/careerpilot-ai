import { createTRPCRouter } from "@/server/api/trpc";
import { workspaceRouter } from "@/server/api/routers/workspace";

export const appRouter = createTRPCRouter({
  workspace: workspaceRouter,
});

export type AppRouter = typeof appRouter;
