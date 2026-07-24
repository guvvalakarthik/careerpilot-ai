"use client";

import { useState } from "react";
import { X, Building2, Star, Clock, MapPin, ExternalLink, Calendar, CheckCircle2, GitBranch, Sparkles, Zap, MessageSquare, Send, Plus } from "lucide-react";
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
  CAPTURED: "bg-slate-100 text-slate-700",
  RESEARCHING: "bg-blue-100 text-blue-700",
  READY_TO_APPLY: "bg-indigo-100 text-indigo-700",
  APPLIED: "bg-green-100 text-green-700",
  INTERVIEWING: "bg-purple-100 text-purple-700",
  OFFER: "bg-amber-100 text-amber-700",
  ACCEPTED: "bg-emerald-100 text-emerald-700",
  REJECTED: "bg-red-100 text-red-700",
  WITHDRAWN: "bg-orange-100 text-orange-700",
  ARCHIVED: "bg-slate-100 text-slate-500",
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
  const [showOutreachForm, setShowOutreachForm] = useState(false);
  const [outreachSubject, setOutreachSubject] = useState("");
  const [outreachBody, setOutreachBody] = useState("");
  const [outreachContactId, setOutreachContactId] = useState("");
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

  const extractMutation = api.ai.extractJob.useMutation({
    onSuccess: () => {
      utils.application.list.invalidate({ workspaceId });
      utils.application.get.invalidate({ workspaceId, applicationId });
    },
  });

  const fitScoreMutation = api.ai.fitScore.useMutation({
    onSuccess: () => {
      utils.application.list.invalidate({ workspaceId });
      utils.application.get.invalidate({ workspaceId, applicationId });
    },
  });

  const { data: contacts } = api.contact.list.useQuery({ workspaceId });

  const createOutreachMutation = api.contact.createOutreach.useMutation({
    onSuccess: () => {
      utils.application.get.invalidate({ workspaceId, applicationId });
      utils.contact.list.invalidate({ workspaceId });
      setShowOutreachForm(false);
      setOutreachSubject("");
      setOutreachBody("");
      setOutreachContactId("");
    },
  });

  const markSentMutation = api.contact.markSent.useMutation({
    onSuccess: () => {
      utils.application.get.invalidate({ workspaceId, applicationId });
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
          <div className="flex h-full items-center justify-center text-slate-400">
            Loading...
          </div>
        ) : app ? (
          <div className="p-6">
            <div className="flex items-start justify-between">
              <div>
                <h2 className="text-lg font-semibold text-slate-900">
                  {app.opportunity.title ?? "Untitled role"}
                </h2>
                <p className="mt-1 flex items-center gap-1.5 text-sm text-slate-500">
                  <Building2 className="h-4 w-4" />
                  {app.opportunity.company?.name ?? "Unknown company"}
                </p>
              </div>
              <button
                onClick={onClose}
                className="text-slate-400 transition hover:text-slate-600"
              >
                <X className="h-5 w-5" />
              </button>
            </div>

            <div className="mt-3 flex flex-wrap gap-2">
              <span
                className={`rounded-full px-2.5 py-0.5 text-xs font-medium ${
                  stageColors[app.stage] ?? "bg-slate-100 text-slate-600"
                }`}
              >
                {stageLabels[app.stage] ?? app.stage}
              </span>
              {app.fitScore !== null && (
                <span className="flex items-center gap-1 rounded-full bg-amber-50 px-2.5 py-0.5 text-xs font-medium text-amber-700">
                  <Star className="h-3 w-3" />
                  Fit: {app.fitScore}/100
                </span>
              )}
              {app.opportunity.location && (
                <span className="flex items-center gap-1 rounded-full bg-slate-100 px-2.5 py-0.5 text-xs text-slate-600">
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
                className="mt-3 inline-flex items-center gap-1 text-sm text-slate-600 hover:underline"
              >
                <ExternalLink className="h-3.5 w-3.5" />
                View source
              </a>
            )}

            {/* AI Actions */}
            <div className="mt-4 rounded-xl border border-slate-200 bg-slate-50 p-4">
              <h3 className="flex items-center gap-1.5 text-xs font-semibold text-slate-700">
                <Sparkles className="h-3.5 w-3.5 text-violet-500" />
                AI Tools
              </h3>
              <div className="mt-3 flex flex-wrap gap-2">
                <button
                  onClick={() => extractMutation.mutate({ workspaceId, opportunityId: app.opportunity.id })}
                  disabled={extractMutation.isPending || fitScoreMutation.isPending}
                  className="flex items-center gap-1.5 rounded-lg bg-white px-3 py-1.5 text-xs font-medium text-slate-700 transition hover:bg-slate-100 disabled:opacity-50"
                >
                  <Zap className="h-3 w-3 text-amber-500" />
                  {extractMutation.isPending ? "Extracting..." : "Extract Details"}
                </button>
                <button
                  onClick={() => fitScoreMutation.mutate({ workspaceId, applicationId })}
                  disabled={extractMutation.isPending || fitScoreMutation.isPending}
                  className="flex items-center gap-1.5 rounded-lg bg-white px-3 py-1.5 text-xs font-medium text-slate-700 transition hover:bg-slate-100 disabled:opacity-50"
                >
                  <Star className="h-3 w-3 text-amber-500" />
                  {fitScoreMutation.isPending ? "Scoring..." : "Score Fit"}
                </button>
              </div>

              {extractMutation.error && (
                <p className="mt-2 text-xs text-red-500">{extractMutation.error.message}</p>
              )}
              {fitScoreMutation.error && (
                <p className="mt-2 text-xs text-red-500">{fitScoreMutation.error.message}</p>
              )}
              {extractMutation.isSuccess && (
                <p className="mt-2 text-xs text-green-600">Job details extracted successfully.</p>
              )}
              {fitScoreMutation.isSuccess && app.fitScore !== null && (
                <div className="mt-2 rounded-lg bg-white p-2">
                  <div className="flex items-center gap-2">
                    <span className={`text-lg font-bold ${
                      app.fitScore >= 70 ? "text-green-600" : app.fitScore >= 40 ? "text-yellow-600" : "text-red-600"
                    }`}>
                      {app.fitScore}
                    </span>
                    <span className="text-xs text-slate-400">/ 100 fit score</span>
                  </div>
                  {app.fitReasons && Array.isArray(app.fitReasons) && (
                    <ul className="mt-1.5 space-y-1">
                      {(app.fitReasons as unknown as string[]).map((reason: string, i: number) => (
                        <li key={i} className="text-xs text-slate-600">• {reason}</li>
                      ))}
                    </ul>
                  )}
                  {app.missingSkills.length > 0 && (
                    <div className="mt-2">
                      <p className="text-xs font-medium text-slate-500">Missing skills:</p>
                      <div className="mt-1 flex flex-wrap gap-1">
                        {app.missingSkills.map((s: string) => (
                          <span key={s} className="rounded bg-red-50 px-1.5 py-0.5 text-xs text-red-600">{s}</span>
                        ))}
                      </div>
                    </div>
                  )}
                </div>
              )}
            </div>

            {/* Extracted details */}
            {(app.opportunity.location || app.opportunity.salaryRange || app.opportunity.employmentType || app.opportunity.experienceRequired) && (
              <div className="mt-4 grid grid-cols-2 gap-2 text-xs">
                {app.opportunity.location && (
                  <div className="rounded-lg bg-slate-50 p-2">
                    <p className="text-slate-400">Location</p>
                    <p className="font-medium text-slate-700">{app.opportunity.location}</p>
                  </div>
                )}
                {app.opportunity.employmentType && (
                  <div className="rounded-lg bg-slate-50 p-2">
                    <p className="text-slate-400">Type</p>
                    <p className="font-medium text-slate-700">{app.opportunity.employmentType}</p>
                  </div>
                )}
                {app.opportunity.salaryRange && (
                  <div className="rounded-lg bg-slate-50 p-2">
                    <p className="text-slate-400">Salary</p>
                    <p className="font-medium text-slate-700">{app.opportunity.salaryRange}</p>
                  </div>
                )}
                {app.opportunity.experienceRequired && (
                  <div className="rounded-lg bg-slate-50 p-2">
                    <p className="text-slate-400">Experience</p>
                    <p className="font-medium text-slate-700">{app.opportunity.experienceRequired}</p>
                  </div>
                )}
              </div>
            )}

            {/* Skills */}
            {(app.opportunity.requiredSkills.length > 0 || app.opportunity.preferredSkills.length > 0) && (
              <div className="mt-4">
                {app.opportunity.requiredSkills.length > 0 && (
                  <div>
                    <p className="text-xs font-semibold text-slate-500">Required Skills</p>
                    <div className="mt-1 flex flex-wrap gap-1">
                      {app.opportunity.requiredSkills.map((s: string) => (
                        <span key={s} className="rounded bg-slate-100 px-1.5 py-0.5 text-xs text-slate-700">{s}</span>
                      ))}
                    </div>
                  </div>
                )}
                {app.opportunity.preferredSkills.length > 0 && (
                  <div className="mt-2">
                    <p className="text-xs font-semibold text-slate-500">Preferred Skills</p>
                    <div className="mt-1 flex flex-wrap gap-1">
                      {app.opportunity.preferredSkills.map((s: string) => (
                        <span key={s} className="rounded bg-slate-50 px-1.5 py-0.5 text-xs text-slate-500">{s}</span>
                      ))}
                    </div>
                  </div>
                )}
              </div>
            )}

            {app.opportunity.rawInput && (
              <div className="mt-4">
                <h3 className="text-xs font-semibold text-slate-500">
                  Raw Capture
                </h3>
                <div className="mt-1 max-h-32 overflow-y-auto rounded-lg bg-slate-50 p-3 text-xs text-slate-600">
                  {app.opportunity.rawInput}
                </div>
              </div>
            )}

            {availableTransitions.length > 0 && (
              <div className="mt-6">
                <h3 className="flex items-center gap-1.5 text-xs font-semibold text-slate-500">
                  <GitBranch className="h-3.5 w-3.5" />
                  Move to stage
                </h3>
                <input
                  type="text"
                  placeholder="Add a note (optional)..."
                  value={note}
                  onChange={(e) => setNote(e.target.value)}
                  className="mt-2 w-full rounded-lg border border-slate-300 px-3 py-1.5 text-xs transition focus:border-slate-900 focus:outline-none focus:ring-1 focus:ring-slate-900"
                />
                <div className="mt-2 flex flex-wrap gap-2">
                  {availableTransitions.map((stage) => (
                    <button
                      key={stage}
                      onClick={() => handleStageChange(stage)}
                      disabled={changeStageMutation.isPending}
                      className={`rounded-lg px-3 py-1.5 text-xs font-medium transition hover:opacity-80 ${
                        stageColors[stage] ?? "bg-slate-100 text-slate-600"
                      }`}
                    >
                      {stageLabels[stage] ?? stage}
                    </button>
                  ))}
                </div>
              </div>
            )}

            <div className="mt-6">
              <h3 className="text-xs font-semibold text-slate-500">
                Stage History
              </h3>
              <div className="mt-2 space-y-2">
                {app.decisions.length === 0 ? (
                  <p className="text-xs text-slate-400">No stage changes yet.</p>
                ) : (
                  app.decisions.map((d: { id: string; fromStage: string; toStage: string; note: string | null; createdAt: Date }) => (
                    <div
                      key={d.id}
                      className="flex items-start gap-2 rounded-lg border border-slate-100 p-2"
                    >
                      <div className="flex items-center gap-1.5 text-xs">
                        <span className="rounded bg-slate-100 px-1.5 py-0.5">
                          {stageLabels[d.fromStage] ?? d.fromStage}
                        </span>
                        <span className="text-slate-400">→</span>
                        <span
                          className={`rounded px-1.5 py-0.5 ${
                            stageColors[d.toStage] ?? "bg-slate-100"
                          }`}
                        >
                          {stageLabels[d.toStage] ?? d.toStage}
                        </span>
                      </div>
                      <span className="ml-auto text-xs text-slate-400">
                        {new Date(d.createdAt).toLocaleDateString()}
                      </span>
                      {d.note && (
                        <p className="col-span-full text-xs text-slate-500">
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
                <h3 className="flex items-center gap-1.5 text-xs font-semibold text-slate-500">
                  <Calendar className="h-3.5 w-3.5" />
                  Interviews
                </h3>
                <div className="mt-2 space-y-2">
                  {app.interviews.map((iv: { id: string; type: string; scheduledAt: Date }) => (
                    <div
                      key={iv.id}
                      className="rounded-lg border border-slate-100 p-2 text-xs"
                    >
                      <p className="font-medium text-slate-900">
                        {iv.type.replace(/_/g, " ")}
                      </p>
                      <p className="text-slate-400">
                        {new Date(iv.scheduledAt).toLocaleString()}
                      </p>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {app.tasks.length > 0 && (
              <div className="mt-6">
                <h3 className="flex items-center gap-1.5 text-xs font-semibold text-slate-500">
                  <CheckCircle2 className="h-3.5 w-3.5" />
                  Tasks
                </h3>
                <div className="mt-2 space-y-2">
                  {app.tasks.map((t: { id: string; status: string; title: string; dueAt: Date | null }) => (
                    <div key={t.id} className="flex items-center gap-2 rounded-lg border border-slate-100 p-2 text-xs">
                      <span className={"h-2 w-2 rounded-full " + (t.status === "DONE" ? "bg-green-500" : t.status === "IN_PROGRESS" ? "bg-amber-500" : "bg-slate-300")} />
                      <span className="font-medium text-slate-900">{t.title}</span>
                      {t.dueAt && (
                        <span className="ml-auto flex items-center gap-0.5 text-slate-400">
                          <Clock className="h-3 w-3" />
                          {new Date(t.dueAt).toLocaleDateString()}
                        </span>
                      )}
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* Outreach */}
            <div className="mt-6">
              <div className="flex items-center justify-between">
                <h3 className="flex items-center gap-1.5 text-xs font-semibold text-slate-500">
                  <MessageSquare className="h-3.5 w-3.5" />
                  Outreach
                </h3>
                {!showOutreachForm && (
                  <button
                    onClick={() => setShowOutreachForm(true)}
                    className="flex items-center gap-1 text-xs font-medium text-slate-600 transition hover:text-slate-900"
                  >
                    <Plus className="h-3 w-3" />
                    Add message
                  </button>
                )}
              </div>

              {showOutreachForm && (
                <div className="mt-2 rounded-lg border border-slate-200 p-3">
                  <select
                    value={outreachContactId}
                    onChange={(e) => setOutreachContactId(e.target.value)}
                    className="w-full rounded-lg border border-slate-300 px-2.5 py-1.5 text-xs focus:border-slate-900 focus:outline-none focus:ring-1 focus:ring-slate-900"
                  >
                    <option value="">Select a contact...</option>
                    {contacts?.map((c: { id: string; name: string }) => (
                      <option key={c.id} value={c.id}>{c.name}</option>
                    ))}
                  </select>
                  <input
                    type="text"
                    placeholder="Subject"
                    value={outreachSubject}
                    onChange={(e) => setOutreachSubject(e.target.value)}
                    className="mt-2 w-full rounded-lg border border-slate-300 px-2.5 py-1.5 text-xs focus:border-slate-900 focus:outline-none focus:ring-1 focus:ring-slate-900"
                  />
                  <textarea
                    placeholder="Message body..."
                    rows={3}
                    value={outreachBody}
                    onChange={(e) => setOutreachBody(e.target.value)}
                    className="mt-2 w-full rounded-lg border border-slate-300 px-2.5 py-1.5 text-xs focus:border-slate-900 focus:outline-none focus:ring-1 focus:ring-slate-900"
                  />
                  <div className="mt-2 flex justify-end gap-2">
                    <button
                      onClick={() => setShowOutreachForm(false)}
                      className="rounded-lg border border-slate-200 px-2.5 py-1 text-xs text-slate-600"
                    >
                      Cancel
                    </button>
                    <button
                      onClick={() => {
                        if (!outreachContactId || !outreachBody.trim()) return;
                        createOutreachMutation.mutate({
                          workspaceId,
                          contactId: outreachContactId,
                          applicationId,
                          subject: outreachSubject.trim() || null,
                          body: outreachBody.trim(),
                        });
                      }}
                      disabled={createOutreachMutation.isPending || !outreachContactId || !outreachBody.trim()}
                      className="rounded-lg bg-slate-900 px-2.5 py-1 text-xs font-medium text-white disabled:opacity-50"
                    >
                      {createOutreachMutation.isPending ? "Saving..." : "Save"}
                    </button>
                  </div>
                  {createOutreachMutation.error && (
                    <p className="mt-1 text-xs text-red-500">{createOutreachMutation.error.message}</p>
                  )}
                </div>
              )}

              <div className="mt-2 space-y-2">
                {app.outreach.length === 0 && !showOutreachForm ? (
                  <p className="text-xs text-slate-400">No outreach messages yet.</p>
                ) : (
                  app.outreach.map((o) => (
                    <div key={o.id} className="rounded-lg border border-slate-100 p-2">
                      <div className="flex items-start justify-between gap-2">
                        <div className="min-w-0 flex-1">
                          <p className="text-xs font-medium text-slate-900">
                            {o.contact.name}
                          </p>
                          {o.subject && (
                            <p className="text-xs text-slate-600">{o.subject}</p>
                          )}
                          <p className="mt-0.5 line-clamp-2 text-xs text-slate-500">{o.body}</p>
                        </div>
                        <div className="flex flex-col items-end gap-1">
                          {o.sentAt ? (
                            <span className="flex items-center gap-0.5 rounded bg-green-50 px-1.5 py-0.5 text-xs text-green-600">
                              <Send className="h-2.5 w-2.5" />
                              Sent
                            </span>
                          ) : (
                            <button
                              onClick={() => markSentMutation.mutate({ workspaceId, outreachId: o.id })}
                              disabled={markSentMutation.isPending}
                              className="flex items-center gap-0.5 rounded bg-slate-100 px-1.5 py-0.5 text-xs text-slate-600 transition hover:bg-slate-200"
                            >
                              <Send className="h-2.5 w-2.5" />
                              Mark sent
                            </button>
                          )}
                        </div>
                      </div>
                      <p className="mt-1 text-xs text-slate-400">
                        {new Date(o.createdAt).toLocaleDateString()}
                      </p>
                    </div>
                  ))
                )}
              </div>
            </div>
          </div>
        ) : (
          <div className="flex h-full items-center justify-center text-slate-400">
            Application not found
          </div>
        )}
      </div>
    </div>
  );
}
