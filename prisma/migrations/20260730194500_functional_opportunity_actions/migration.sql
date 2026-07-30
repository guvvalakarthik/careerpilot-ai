-- Persist actions that were previously held only in browser state.
ALTER TABLE "Application"
ADD COLUMN "isSaved" BOOLEAN NOT NULL DEFAULT false,
ADD COLUMN "tailoringStartedAt" TIMESTAMP(3);

CREATE INDEX "Application_workspaceId_isSaved_idx"
ON "Application"("workspaceId", "isSaved");