"use client";

import { useState, useCallback } from "react";
import { api } from "@/trpc/react";
import { Building2, ExternalLink, Star, Clock } from "lucide-react";

type Stage =
  | "CAPTURED"
  | "RESEARCHING"
  | "READY_TO_APPLY"
  | "APPLIED"
  | "INTERVIEWING"
  | "OFFER"
  | "ACCEPTED"
  | "REJECTED"
  | "WITHDRAWN"
  | "ARCHIVED";

const STAGES: { id: Stage; label: string; color: string }[] = [
  { id: "CAPTURED", label: "Captured", color: "border-t-gray-400" },
  { id: "RESEARCHING", label: "Researching", color: "border-t-blue-400" },
  { id: "READY_TO_APPLY", label: "Ready to Apply", color: "border-t-indigo-400" },
  { id: "APPLIED", label: "Applied", color: "border-t-green-400" },
  { id: "INTERVIEWING", label: "Interviewing", color: "border-t-purple-400" },
  { id: "OFFER", label: "Offer", color: "border-t-yellow-400" },
  { id: "ACCEPTED", label: "Accepted", color: "border-t-emerald-500" },
  { id: "REJECTED", label: "Rejected", color: "border-t-red-400" },
  { id: "WITHDRAWN", label: "Withdrawn", color: "border-t-orange-400" },
  { id: "ARCHIVED", label: "Archived", color: "border-t-gray-300" },
];

type Application = {
  id: string;
  stage: Stage;
  fitScore: number | null;
  appliedAt: Date | null;
  lastStageAt: Date | null;
  opportunity: {
    id: string;
    title: string | null;
    sourceUrl: string | null;
    location: string | null;
    company: { id: string; name: string } | null;
  };
};

export function KanbanBoard({
  workspaceId,
  applications,
  onSelectApplication,
}: {
  workspaceId: string;
  applications: Application[];
  onSelectApplication: (applicationId: string) => void;
}) {
  const [draggingId, setDraggingId] = useState<string | null>(null);
  const [dragOverStage, setDragOverStage] = useState<Stage | null>(null);
  const utils = api.useUtils();

  const changeStageMutation = api.application.changeStage.useMutation({
    onSuccess: () => {
      utils.application.list.invalidate({ workspaceId });
      utils.workspace.stats.invalidate({ workspaceId });
    },
  });

  const handleDragStart = useCallback((e: React.DragEvent, appId: string) => {
    setDraggingId(appId);
    e.dataTransfer.effectAllowed = "move";
    e.dataTransfer.setData("text/plain", appId);
  }, []);

  const handleDragOver = useCallback((e: React.DragEvent, stage: Stage) => {
    e.preventDefault();
    e.dataTransfer.dropEffect = "move";
    setDragOverStage(stage);
  }, []);

  const handleDrop = useCallback(
    (e: React.DragEvent, stage: Stage) => {
      e.preventDefault();
      setDragOverStage(null);
      setDraggingId(null);

      const appId = e.dataTransfer.getData("text/plain");
      if (!appId) return;

      const app = applications.find((a) => a.id === appId);
      if (!app || app.stage === stage) return;

      changeStageMutation.mutate({
        workspaceId,
        applicationId: appId,
        toStage: stage,
      });
    },
    [applications, changeStageMutation, workspaceId],
  );

  const handleDragEnd = useCallback(() => {
    setDraggingId(null);
    setDragOverStage(null);
  }, []);

  return (
    <div className="flex gap-3 overflow-x-auto pb-4">
      {STAGES.map((stage) => {
        const stageApps = applications.filter((a) => a.stage === stage.id);
        return (
          <div
            key={stage.id}
            className={`w-64 flex-shrink-0 rounded-lg border-t-4 ${stage.color} bg-gray-50 ${
              dragOverStage === stage.id ? "ring-2 ring-blue-400" : ""
            }`}
            onDragOver={(e) => handleDragOver(e, stage.id)}
            onDrop={(e) => handleDrop(e, stage.id)}
          >
            <div className="flex items-center justify-between px-3 py-2">
              <h3 className="text-xs font-semibold text-gray-600">
                {stage.label}
              </h3>
              <span className="rounded-full bg-gray-200 px-2 py-0.5 text-xs text-gray-600">
                {stageApps.length}
              </span>
            </div>

            <div className="space-y-2 px-2 pb-3">
              {stageApps.map((app) => (
                <div
                  key={app.id}
                  draggable
                  onDragStart={(e) => handleDragStart(e, app.id)}
                  onDragEnd={handleDragEnd}
                  onClick={() => onSelectApplication(app.id)}
                  className={`cursor-pointer rounded-lg border border-gray-200 bg-white p-3 shadow-sm transition hover:shadow-md ${
                    draggingId === app.id ? "opacity-40" : ""
                  }`}
                >
                  <div className="flex items-start justify-between gap-2">
                    <div className="min-w-0 flex-1">
                      <p className="truncate text-sm font-medium">
                        {app.opportunity.title ?? "Untitled role"}
                      </p>
                      <p className="mt-0.5 flex items-center gap-1 text-xs text-gray-500">
                        <Building2 className="h-3 w-3" />
                        {app.opportunity.company?.name ?? "Unknown company"}
                      </p>
                    </div>
                    {app.fitScore !== null && (
                      <span
                        className={`flex items-center gap-0.5 rounded-full px-1.5 py-0.5 text-xs font-medium ${
                          app.fitScore >= 70
                            ? "bg-green-50 text-green-700"
                            : app.fitScore >= 40
                              ? "bg-yellow-50 text-yellow-700"
                              : "bg-red-50 text-red-700"
                        }`}
                      >
                        <Star className="h-2.5 w-2.5" />
                        {app.fitScore}
                      </span>
                    )}
                  </div>

                  <div className="mt-2 flex items-center gap-2 text-xs text-gray-400">
                    {app.opportunity.location && (
                      <span>{app.opportunity.location}</span>
                    )}
                    {app.opportunity.sourceUrl && (
                      <a
                        href={app.opportunity.sourceUrl}
                        target="_blank"
                        rel="noopener noreferrer"
                        onClick={(e) => e.stopPropagation()}
                        className="inline-flex items-center gap-0.5 text-blue-500 hover:underline"
                      >
                        <ExternalLink className="h-3 w-3" />
                        source
                      </a>
                    )}
                    {app.lastStageAt && (
                      <span className="ml-auto flex items-center gap-0.5">
                        <Clock className="h-3 w-3" />
                        {timeAgo(app.lastStageAt)}
                      </span>
                    )}
                  </div>
                </div>
              ))}

              {stageApps.length === 0 && (
                <div className="rounded-lg border border-dashed border-gray-200 py-6 text-center text-xs text-gray-300">
                  Empty
                </div>
              )}
            </div>
          </div>
        );
      })}
    </div>
  );
}

function timeAgo(date: Date | string): string {
  const d = typeof date === "string" ? new Date(date) : date;
  const diff = Date.now() - d.getTime();
  const days = Math.floor(diff / 86400000);
  if (days === 0) return "today";
  if (days === 1) return "1d ago";
  if (days < 30) return `${days}d ago`;
  const months = Math.floor(days / 30);
  if (months === 1) return "1mo ago";
  return `${months}mo ago`;
}
