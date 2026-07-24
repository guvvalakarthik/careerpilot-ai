"use client";

import { useState } from "react";
import { api } from "@/trpc/react";
import { KanbanBoard } from "./kanban-board";
import { QuickCaptureModal } from "./quick-capture-modal";
import { ApplicationDetailDrawer } from "./application-detail-drawer";

export function PipelineTab({ workspaceId }: { workspaceId: string }) {
  const [selectedAppId, setSelectedAppId] = useState<string | null>(null);

  const { data: applications, isLoading } = api.application.list.useQuery({
    workspaceId,
  });

  return (
    <div>
      <div className="mb-4 flex items-center justify-between">
        <p className="text-sm text-gray-500">
          {isLoading
            ? "Loading pipeline..."
            : `${applications?.length ?? 0} applications`}
        </p>
        <QuickCaptureModal workspaceId={workspaceId} />
      </div>

      {isLoading ? (
        <div className="flex h-64 items-center justify-center text-gray-400">
          Loading board...
        </div>
      ) : applications && applications.length > 0 ? (
        <KanbanBoard
          workspaceId={workspaceId}
          applications={applications as never}
          onSelectApplication={(id) => setSelectedAppId(id)}
        />
      ) : (
        <div className="rounded-xl border border-dashed border-gray-300 p-12 text-center">
          <p className="text-sm text-gray-500">
            No applications yet. Use Quick Capture to add your first job opportunity.
          </p>
        </div>
      )}

      {selectedAppId && (
        <ApplicationDetailDrawer
          workspaceId={workspaceId}
          applicationId={selectedAppId}
          onClose={() => setSelectedAppId(null)}
        />
      )}
    </div>
  );
}
