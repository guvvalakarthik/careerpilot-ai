"use client";

import { useState } from "react";
import { X, Building2, Star, Clock, MapPin, ExternalLink, Calendar, CheckCircle2, GitBranch } from "lucide-react";
import { api } from "@/trpc/react";

const stageLabels: Record<string, string> = {
  CAPTURED: "Captured",
  RESEARCHING: "Researching",
  READY_TO_APPLY: "Ready to Apply",
  APPLIED: "Applied",
  INTERVIEWING: "Interviewing",
  OFFER: "Offer",
  ACCEPTED: "Accepted",
  REJECTED: "Rejected",
  WITHDRAWN: "Withdrawn",
  ARCHIVED: "Archived",
};

const stageColors: Record<string, string> = {
  CAPTURED: "bg-gray-100 text-gray-700",
  RESEARCHING: "bg-blue-100 text-blue-700",
  READY_TO_APPLY: "bg-indigo-100 text-indigo-700",
  APPLIED: "bg-green-100 text-green-700",
  INTERVIEWING: "bg-purple-100 text-purple-700",
  OFFER: "bg-yellow-100 text-yellow-700",
  ACCEPTED: "bg-emerald-100 text-emerald-700",
  REJECTED: "bg-red-100 text-red-700",
  WITHDRAWN: "bg-orange-100 text-orange-700",
  ARCHIVED: "bg-gray-100 text-gray-500",
};

export function ApplicationDetailDrawer({
  workspaceId,
  applicationId,
  onClose,
}: {
  workspaceId: string;
  applicationId: string;
  onClose: () => void;
}) {
  const [note, setNote] = useState("");
  const utils = api.useUtils();

  const { data: app, isLoading } = api.application.get.useQuery({
    workspaceId,
    applicationId,
  });

  const changeStageMutation = api.application.changeStage.useMutation({
    onSuccess: () => {
      utils.application.list.invalidate({ workspaceId });
      utils.application.get.invalidate({ workspaceId, applicationId });
      setNote("");
    },
  });

  const validTransitions: Record<string, string[]> = {
    CAPTURED: ["RESEARCHING", "READY_TO_APPLY", "REJECTED", "WITHDRAWN", "ARCHIVED"],
    RESEARCHING: ["READY_TO_APPLY", "REJECTED", "WITHDRAWN", "ARCHIVED"],
    READY_TO_APPLY: ["APPLIED", "REJECTED", "WITHDRAWN", "ARCHIVED"],
    APPLIED: ["INTERVIEWING", "REJECTED", "WITHDRAWN", "ARCHIVED"],
    INTERVIEWING: ["OFFER", "REJECTED", "WITHDRAWN", "ARCHIVED"],
    OFFER: ["ACCEPTED", "REJECTED", "WITHDRAWN", "ARCHIVED"],
    ACCEPTED: ["ARCHIVED"],
    REJECTED: ["ARCHIVED"],
    WITHDRAWN: ["ARCHIVED"],
    ARCHIVED: [],
  };

  const availableTransitions = app ? validTransitions[app.stage] ?? [] : [];

  function handleStageChange(toStage: string) {
    changeStageMutation.mutate({
      workspaceId,
      applicationId,
      toStage: toStage as never,
      note: note.trim() || undefined,
    });
  }

  return (
    <div
      className="fixed inset-0 z-50 flex justify-end bg-black/40"
      onClick={onClose}
    >
      <div
        className="h-full w-full max-w-md overflow-y-auto bg-white shadow-xl"
        onClick={(e) => e.stopPropagation()}
      >
        {isLoading ? (
          <div className="flex h-full items-center justify-center text-gray-400">
            Loading...
          </div>
        ) : app ? (
          <div className="p-6">
            <div className="flex items-start justify-between">
              <div>
                <h2 className="text-lg font-semibold">
                  {app.opportunity.title ?? "Untitled role"}
                </h2>
                <p className="mt-1 flex items-center gap-1.5 text-sm text-gray-500">
                  <Building2 className="h-4 w-4" />
                  {app.opportunity.company?.name ?? "Unknown company"}
                </p>
              </div>
              <button
                onClick={onClose}
                className="text-gray-400 hover:text-gray-600"
              >
                <X className="h-5 w-5" />
              </button>
            </div>

            <div className="mt-3 flex flex-wrap gap-2">
              <span
                className={`rounded-full px-2.5 py-0.5 text-xs font-medium ${
                  stageColors[app.stage] ?? "bg-gray-100 text-gray-600"
                }`}
              >
                {stageLabels[app.stage] ?? app.stage}
              </span>
              {app.fitScore !== null && (
                <span className="flex items-center gap-1 rounded-full bg-yellow-50 px-2.5 py-0.5 text-xs font-medium text-yellow-700">
                  <Star className="h-3 w-3" />
                  Fit: {app.fitScore}/100
                </span>
              )}
              {app.opportunity.location && (
                <span className="flex items-center gap-1 rounded-full bg-gray-100 px-2.5 py-0.5 text-xs text-gray-600">
                  <MapPin className="h-3 w-3" />
                  {app.opportunity.location}
                </span>
              )}
            </div>

            {app.opportunity.sourceUrl && (
              <a
                href={app.opportunity.sourceUrl}
                target="_blank"
                rel="noopener noreferrer"
                className="mt-3 inline-flex items-center gap-1 text-sm text-blue-600 hover:underline"
              >
                <ExternalLink className="h-3.5 w-3.5" />
                View source
              </a>
            )}

            {app.opportunity.rawInput && (
              <div className="mt-4">
                <h3 className="text-xs font-semibold text-gray-500">
                  Raw Capture
                </h3>
                <div className="mt-1 max-h-32 overflow-y-auto rounded-md bg-gray-50 p-3 text-xs text-gray-600">
                  {app.opportunity.rawInput}
                </div>
              </div>
            )}

            {availableTransitions.length > 0 && (
              <div className="mt-6">
                <h3 className="flex items-center gap-1.5 text-xs font-semibold text-gray-500">
                  <GitBranch className="h-3.5 w-3.5" />
                  Move to stage
                </h3>
                <input
                  type="text"
                  placeholder="Add a note (optional)..."
                  value={note}
                  onChange={(e) => setNote(e.target.value)}
                  className="mt-2 w-full rounded-md border border-gray-300 px-3 py-1.5 text-xs focus:border-blue-500 focus:outline-none"
                />
                <div className="mt-2 flex flex-wrap gap-2">
                  {availableTransitions.map((stage) => (
                    <button
                      key={stage}
                      onClick={() => handleStageChange(stage)}
                      disabled={changeStageMutation.isPending}
                      className={`rounded-md px-3 py-1.5 text-xs font-medium transition hover:opacity-80 ${
                        stageColors[stage] ?? "bg-gray-100 text-gray-600"
                      }`}
                    >
                      {stageLabels[stage] ?? stage}
                    </button>
                  ))}
                </div>
              </div>
            )}

            <div className="mt-6">
              <h3 className="text-xs font-semibold text-gray-500">
                Stage History
              </h3>
              <div className="mt-2 space-y-2">
                {app.decisions.length === 0 ? (
                  <p className="text-xs text-gray-400">No stage changes yet.</p>
                ) : (
                  app.decisions.map((d) => (
                    <div
                      key={d.id}
                      className="flex items-start gap-2 rounded-md border border-gray-100 p-2"
                    >
                      <div className="flex items-center gap-1.5 text-xs">
                        <span className="rounded bg-gray-100 px-1.5 py-0.5">
                          {stageLabels[d.fromStage] ?? d.fromStage}
                        </span>
                        <span className="text-gray-400">→</span>
                        <span
                          className={`rounded px-1.5 py-0.5 ${
                            stageColors[d.toStage] ?? "bg-gray-100"
                          }`}
                        >
                          {stageLabels[d.toStage] ?? d.toStage}
                        </span>
                      </div>
                      <span className="ml-auto text-xs text-gray-400">
                        {new Date(d.createdAt).toLocaleDateString()}
                      </span>
                      {d.note && (
                        <p className="col-span-full text-xs text-gray-500">
                          {d.note}
                        </p>
                      )}
                    </div>
                  ))
                )}
              </div>
            </div>

            {app.interviews.length > 0 && (
              <div className="mt-6">
                <h3 className="flex items-center gap-1.5 text-xs font-semibold text-gray-500">
                  <Calendar className="h-3.5 w-3.5" />
                  Interviews
                </h3>
                <div className="mt-2 space-y-2">
                  {app.interviews.map((iv) => (
                    <div
                      key={iv.id}
                      className="rounded-md border border-gray-100 p-2 text-xs"
                    >
                      <p className="font-medium">
                        {iv.type.replace(/_/g, " ")}
                      </p>
                      <p className="text-gray-400">
                        {new Date(iv.scheduledAt).toLocaleString()}
                      </p>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {app.tasks.length > 0 && (
              <div className="mt-6">
                <h3 className="flex items-center gap-1.5 text-xs font-semibold text-gray-500">
                  <CheckCircle2 className="h-3.5 w-3.5" />
                  Tasks
                </h3>
                <div className="mt-2 space-y-2">
                  {app.tasks.map((t) => (
                    <div
                      key={t.id}
                      className="flex items-center gap-2 rounded-md border border-gray-100 p-2 text-xs"
                    >
                      <span
                        className={`h-2 w-2 rounded-full ${
                          t.status === "DONE"
                            ? "bg-green-500"
                            : t.status === "IN_PROGRESS"
                              ? "bg-yellow-500"
                              : "bg-gray-300"
                        }`}
                      />
                      <span className="font-medium">{t.title}</span>
                      {t.dueAt && (
                        <span className="ml-auto flex items-center gap-0.5 text-gray-400">
                          <Clock className="h-3 w-3" />
                          {new Date(t.dueAt).toLocaleDateString()}
                        </span>
                      )}
                    </div>
                  ))}
                </div>
              </div>
            )}
          </div>
        ) : (
          <div className="flex h-full items-center justify-center text-gray-400">
            Application not found
          </div>
        )}
      </div>
    </div>
  );
}
