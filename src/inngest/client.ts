import { eventType, Inngest } from "inngest";
import { z } from "zod";

export const ragSourceEventSchema = z
  .object({
    workspaceId: z.string().trim().min(1).max(128),
    type: z.enum(["DOCUMENT", "CANDIDATE_PROFILE", "JOB_OPPORTUNITY"]),
    sourceId: z.string().trim().min(1).max(128),
  })
  .strict();

export type RagSourceEventData = z.infer<typeof ragSourceEventSchema>;

export const ragWorkspaceBackfillEventSchema = z
  .object({
    workspaceId: z.string().trim().min(1).max(128),
    requestedBy: z.string().trim().min(1).max(128),
  })
  .strict();

export const ragSourceRequested = eventType(
  "careerpilot/rag.source.requested",
  { schema: ragSourceEventSchema },
);

export const ragSourceDeleted = eventType("careerpilot/rag.source.deleted", {
  schema: ragSourceEventSchema,
});

export const ragWorkspaceBackfillRequested = eventType(
  "careerpilot/rag.workspace.backfill.requested",
  {
    schema: ragWorkspaceBackfillEventSchema,
  },
);

export const inngest = new Inngest({
  id: "careerpilot-ai",
  maxRuntime: "300s",
});