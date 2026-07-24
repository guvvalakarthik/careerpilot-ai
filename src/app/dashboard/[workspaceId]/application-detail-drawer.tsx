"use client";

import { useState } from "react";
import { X, Building2, Star, Clock, MapPin, ExternalLink, Calendar, CheckCircle2, GitBranch, Sparkles, Zap, MessageSquare, Send, Plus, Trash2, Pencil, XCircle, FileText, Link2, Unlink } from "lucide-react";
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
  const [showInterviewForm, setShowInterviewForm] = useState(false);
  const [editingInterviewId, setEditingInterviewId] = useState<string | null>(null);
  const [ivType, setIvType] = useState("OTHER");
  const [ivDate, setIvDate] = useState("");
  const [ivDuration, setIvDuration] = useState("60");
  const [ivInterviewer, setIvInterviewer] = useState("");
  const [ivNotes, setIvNotes] = useState("");
  const [showTaskForm, setShowTaskForm] = useState(false);
  const [taskTitle, setTaskTitle] = useState("");
  const [taskDesc, setTaskDesc] = useState("");
  const [taskDueAt, setTaskDueAt] = useState("");
  const [showResumeLinker, setShowResumeLinker] = useState(false);
  const [selectedResumeId, setSelectedResumeId] = useState("");
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

  const createInterviewMutation = api.interview.create.useMutation({
    onSuccess: () => {
      utils.application.get.invalidate({ workspaceId, applicationId });
      utils.interview.list.invalidate({ workspaceId });
      resetInterviewForm();
    },
  });

  const updateInterviewMutation = api.interview.update.useMutation({
    onSuccess: () => {
      utils.application.get.invalidate({ workspaceId, applicationId });
      utils.interview.list.invalidate({ workspaceId });
      resetInterviewForm();
    },
  });

  const cancelInterviewMutation = api.interview.cancel.useMutation({
    onSuccess: () => {
      utils.application.get.invalidate({ workspaceId, applicationId });
      utils.interview.list.invalidate({ workspaceId });
    },
  });

  const deleteInterviewMutation = api.interview.delete.useMutation({
    onSuccess: () => {
      utils.application.get.invalidate({ workspaceId, applicationId });
      utils.interview.list.invalidate({ workspaceId });
    },
  });

  const createTaskMutation = api.task.create.useMutation({
    onSuccess: () => {
      utils.application.get.invalidate({ workspaceId, applicationId });
      utils.task.list.invalidate({ workspaceId });
      resetTaskForm();
    },
  });

  const updateTaskMutation = api.task.update.useMutation({
    onSuccess: () => {
      utils.application.get.invalidate({ workspaceId, applicationId });
      utils.task.list.invalidate({ workspaceId });
    },
  });

  const deleteTaskMutation = api.task.delete.useMutation({
    onSuccess: () => {
      utils.application.get.invalidate({ workspaceId, applicationId });
      utils.task.list.invalidate({ workspaceId });
    },
  });

  const { data: resumeVersions } = api.resume.list.useQuery({ workspaceId });

  const linkResumeMutation = api.resume.linkToApplication.useMutation({
    onSuccess: () => {
      utils.application.get.invalidate({ workspaceId, applicationId });
      utils.resume.list.invalidate({ workspaceId });
      setShowResumeLinker(false);
      setSelectedResumeId("");
    },
  });

  const unlinkResumeMutation = api.resume.unlinkFromApplication.useMutation({
    onSuccess: () => {
      utils.application.get.invalidate({ workspaceId, applicationId });
      utils.resume.list.invalidate({ workspaceId });
    },
  });

  function resetInterviewForm() {
    setShowInterviewForm(false);
    setEditingInterviewId(null);
    setIvType("OTHER");
    setIvDate("");
    setIvDuration("60");
    setIvInterviewer("");
    setIvNotes("");
  }

  function resetTaskForm() {
    setShowTaskForm(false);
    setTaskTitle("");
    setTaskDesc("");
    setTaskDueAt("");
  }

  function handleInterviewSubmit() {
    if (!ivDate) return;
    const payload = {
      workspaceId,
      applicationId,
      type: ivType as never,
      scheduledAt: new Date(ivDate).toISOString(),
      durationMins: parseInt(ivDuration) || 60,
      interviewer: ivInterviewer.trim() || null,
      notes: ivNotes.trim() || null,
    };
    if (editingInterviewId) {
      updateInterviewMutation.mutate({ ...payload, interviewId: editingInterviewId });
    } else {
      createInterviewMutation.mutate(payload);
    }
  }

  function handleTaskSubmit() {
    if (!taskTitle.trim()) return;
    createTaskMutation.mutate({
      workspaceId,
      applicationId,
      title: taskTitle.trim(),
      description: taskDesc.trim() || null,
      dueAt: taskDueAt ? new Date(taskDueAt).toISOString() : null,
    });
  }

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

            {/* Interviews */}
            <div className="mt-6">
              <div className="flex items-center justify-between">
                <h3 className="flex items-center gap-1.5 text-xs font-semibold text-slate-500">
                  <Calendar className="h-3.5 w-3.5" />
                  Interviews
                </h3>
                {!showInterviewForm && (
                  <button
                    onClick={() => { resetInterviewForm(); setShowInterviewForm(true); }}
                    className="flex items-center gap-1 text-xs font-medium text-slate-600 transition hover:text-slate-900"
                  >
                    <Plus className="h-3 w-3" />
                    Schedule
                  </button>
                )}
              </div>

              {showInterviewForm && (
                <div className="mt-2 rounded-lg border border-slate-200 p-3 space-y-2">
                  <div className="grid grid-cols-2 gap-2">
                    <select
                      value={ivType}
                      onChange={(e) => setIvType(e.target.value)}
                      className="rounded-lg border border-slate-300 px-2.5 py-1.5 text-xs focus:border-slate-900 focus:outline-none focus:ring-1 focus:ring-slate-900"
                    >
                      <option value="PHONE_SCREEN">Phone Screen</option>
                      <option value="TECHNICAL">Technical</option>
                      <option value="SYSTEM_DESIGN">System Design</option>
                      <option value="BEHAVIORAL">Behavioral</option>
                      <option value="HR">HR</option>
                      <option value="ONSITE">Onsite</option>
                      <option value="OTHER">Other</option>
                    </select>
                    <input
                      type="number"
                      placeholder="Duration (mins)"
                      value={ivDuration}
                      onChange={(e) => setIvDuration(e.target.value)}
                      className="rounded-lg border border-slate-300 px-2.5 py-1.5 text-xs focus:border-slate-900 focus:outline-none focus:ring-1 focus:ring-slate-900"
                    />
                  </div>
                  <input
                    type="datetime-local"
                    value={ivDate}
                    onChange={(e) => setIvDate(e.target.value)}
                    className="w-full rounded-lg border border-slate-300 px-2.5 py-1.5 text-xs focus:border-slate-900 focus:outline-none focus:ring-1 focus:ring-slate-900"
                  />
                  <input
                    type="text"
                    placeholder="Interviewer name"
                    value={ivInterviewer}
                    onChange={(e) => setIvInterviewer(e.target.value)}
                    className="w-full rounded-lg border border-slate-300 px-2.5 py-1.5 text-xs focus:border-slate-900 focus:outline-none focus:ring-1 focus:ring-slate-900"
                  />
                  <textarea
                    placeholder="Notes..."
                    rows={2}
                    value={ivNotes}
                    onChange={(e) => setIvNotes(e.target.value)}
                    className="w-full rounded-lg border border-slate-300 px-2.5 py-1.5 text-xs focus:border-slate-900 focus:outline-none focus:ring-1 focus:ring-slate-900"
                  />
                  <div className="flex justify-end gap-2">
                    <button onClick={resetInterviewForm} className="rounded-lg border border-slate-200 px-2.5 py-1 text-xs text-slate-600">Cancel</button>
                    <button
                      onClick={handleInterviewSubmit}
                      disabled={createInterviewMutation.isPending || updateInterviewMutation.isPending || !ivDate}
                      className="rounded-lg bg-slate-900 px-2.5 py-1 text-xs font-medium text-white disabled:opacity-50"
                    >
                      {(createInterviewMutation.isPending || updateInterviewMutation.isPending) ? "Saving..." : editingInterviewId ? "Update" : "Schedule"}
                    </button>
                  </div>
                </div>
              )}

              <div className="mt-2 space-y-2">
                {app.interviews.length === 0 && !showInterviewForm ? (
                  <p className="text-xs text-slate-400">No interviews scheduled.</p>
                ) : (
                  app.interviews.map((iv: { id: string; type: string; scheduledAt: Date; durationMins: number; interviewer: string | null; notes: string | null; outcome: string }) => (
                    <div key={iv.id} className="rounded-lg border border-slate-100 p-2 text-xs">
                      <div className="flex items-start justify-between gap-2">
                        <div className="min-w-0 flex-1">
                          <div className="flex items-center gap-1.5">
                            <p className="font-medium text-slate-900">{iv.type.replace(/_/g, " ")}</p>
                            {iv.outcome !== "PENDING" && (
                              <span className={"rounded px-1.5 py-0.5 text-xs " + (iv.outcome === "PASSED" ? "bg-green-50 text-green-600" : iv.outcome === "FAILED" ? "bg-red-50 text-red-600" : iv.outcome === "CANCELLED" ? "bg-slate-100 text-slate-500" : "bg-amber-50 text-amber-600")}>
                                {iv.outcome.replace(/_/g, " ").toLowerCase()}
                              </span>
                            )}
                          </div>
                          <p className="mt-0.5 text-slate-400">
                            {new Date(iv.scheduledAt).toLocaleString()} - {iv.durationMins}min
                          </p>
                          {iv.interviewer && <p className="mt-0.5 text-slate-500">with {iv.interviewer}</p>}
                          {iv.notes && <p className="mt-1 text-slate-500">{iv.notes}</p>}
                        </div>
                        <div className="flex gap-1">
                          <button
                            onClick={() => {
                              setEditingInterviewId(iv.id);
                              setIvType(iv.type);
                              setIvDate(new Date(iv.scheduledAt).toISOString().slice(0, 16));
                              setIvDuration(String(iv.durationMins));
                              setIvInterviewer(iv.interviewer ?? "");
                              setIvNotes(iv.notes ?? "");
                              setShowInterviewForm(true);
                            }}
                            className="rounded p-1 text-slate-400 transition hover:bg-slate-100 hover:text-slate-600"
                          >
                            <Pencil className="h-3 w-3" />
                          </button>
                          {iv.outcome === "PENDING" && (
                            <button
                              onClick={() => cancelInterviewMutation.mutate({ workspaceId, interviewId: iv.id })}
                              disabled={cancelInterviewMutation.isPending}
                              className="rounded p-1 text-slate-400 transition hover:bg-amber-50 hover:text-amber-600"
                              title="Cancel interview"
                            >
                              <XCircle className="h-3 w-3" />
                            </button>
                          )}
                          <button
                            onClick={() => deleteInterviewMutation.mutate({ workspaceId, interviewId: iv.id })}
                            disabled={deleteInterviewMutation.isPending}
                            className="rounded p-1 text-slate-400 transition hover:bg-red-50 hover:text-red-500"
                          >
                            <Trash2 className="h-3 w-3" />
                          </button>
                        </div>
                      </div>
                      {iv.outcome === "PENDING" && (
                        <div className="mt-1.5 flex gap-1">
                          <button
                            onClick={() => updateInterviewMutation.mutate({ workspaceId, interviewId: iv.id, outcome: "PASSED" })}
                            className="rounded bg-green-50 px-1.5 py-0.5 text-xs text-green-600 transition hover:bg-green-100"
                          >Mark passed</button>
                          <button
                            onClick={() => updateInterviewMutation.mutate({ workspaceId, interviewId: iv.id, outcome: "FAILED" })}
                            className="rounded bg-red-50 px-1.5 py-0.5 text-xs text-red-600 transition hover:bg-red-100"
                          >Mark failed</button>
                        </div>
                      )}
                    </div>
                  ))
                )}
              </div>
            </div>

            {/* Tasks */}
            <div className="mt-6">
              <div className="flex items-center justify-between">
                <h3 className="flex items-center gap-1.5 text-xs font-semibold text-slate-500">
                  <CheckCircle2 className="h-3.5 w-3.5" />
                  Tasks
                </h3>
                {!showTaskForm && (
                  <button
                    onClick={() => setShowTaskForm(true)}
                    className="flex items-center gap-1 text-xs font-medium text-slate-600 transition hover:text-slate-900"
                  >
                    <Plus className="h-3 w-3" />
                    Add task
                  </button>
                )}
              </div>

              {showTaskForm && (
                <div className="mt-2 rounded-lg border border-slate-200 p-3 space-y-2">
                  <input
                    type="text"
                    placeholder="Task title *"
                    value={taskTitle}
                    onChange={(e) => setTaskTitle(e.target.value)}
                    className="w-full rounded-lg border border-slate-300 px-2.5 py-1.5 text-xs focus:border-slate-900 focus:outline-none focus:ring-1 focus:ring-slate-900"
                  />
                  <textarea
                    placeholder="Description..."
                    rows={2}
                    value={taskDesc}
                    onChange={(e) => setTaskDesc(e.target.value)}
                    className="w-full rounded-lg border border-slate-300 px-2.5 py-1.5 text-xs focus:border-slate-900 focus:outline-none focus:ring-1 focus:ring-slate-900"
                  />
                  <input
                    type="datetime-local"
                    placeholder="Due date"
                    value={taskDueAt}
                    onChange={(e) => setTaskDueAt(e.target.value)}
                    className="w-full rounded-lg border border-slate-300 px-2.5 py-1.5 text-xs focus:border-slate-900 focus:outline-none focus:ring-1 focus:ring-slate-900"
                  />
                  <div className="flex justify-end gap-2">
                    <button onClick={resetTaskForm} className="rounded-lg border border-slate-200 px-2.5 py-1 text-xs text-slate-600">Cancel</button>
                    <button
                      onClick={handleTaskSubmit}
                      disabled={createTaskMutation.isPending || !taskTitle.trim()}
                      className="rounded-lg bg-slate-900 px-2.5 py-1 text-xs font-medium text-white disabled:opacity-50"
                    >
                      {createTaskMutation.isPending ? "Saving..." : "Add task"}
                    </button>
                  </div>
                </div>
              )}

              <div className="mt-2 space-y-2">
                {app.tasks.length === 0 && !showTaskForm ? (
                  <p className="text-xs text-slate-400">No tasks yet.</p>
                ) : (
                  app.tasks.map((t: { id: string; status: string; title: string; dueAt: Date | null; description: string | null }) => (
                    <div key={t.id} className="flex items-center gap-2 rounded-lg border border-slate-100 p-2 text-xs">
                      <button
                        onClick={() => {
                          const next = t.status === "DONE" ? "OPEN" : t.status === "OPEN" ? "IN_PROGRESS" : "DONE";
                          updateTaskMutation.mutate({ workspaceId, taskId: t.id, status: next as never });
                        }}
                        className={"h-2 w-2 rounded-full transition " + (t.status === "DONE" ? "bg-green-500" : t.status === "IN_PROGRESS" ? "bg-amber-500" : "bg-slate-300 hover:bg-slate-400")}
                        title="Click to cycle status"
                      />
                      <div className="min-w-0 flex-1">
                        <span className={"font-medium " + (t.status === "DONE" ? "text-slate-400 line-through" : "text-slate-900")}>{t.title}</span>
                        {t.description && <p className="mt-0.5 text-slate-400">{t.description}</p>}
                      </div>
                      {t.dueAt && (
                        <span className="flex items-center gap-0.5 text-slate-400">
                          <Clock className="h-3 w-3" />
                          {new Date(t.dueAt).toLocaleDateString()}
                        </span>
                      )}
                      <button
                        onClick={() => deleteTaskMutation.mutate({ workspaceId, taskId: t.id })}
                        disabled={deleteTaskMutation.isPending}
                        className="rounded p-1 text-slate-400 transition hover:bg-red-50 hover:text-red-500"
                      >
                        <Trash2 className="h-3 w-3" />
                      </button>
                    </div>
                  ))
                )}
              </div>
            </div>

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

            {/* Resume versions */}
            <div className="mt-6">
              <div className="flex items-center justify-between">
                <h3 className="flex items-center gap-1.5 text-xs font-semibold text-slate-500">
                  <FileText className="h-3.5 w-3.5" />
                  Resume versions
                </h3>
                {!showResumeLinker && (
                  <button
                    onClick={() => setShowResumeLinker(true)}
                    className="flex items-center gap-1 text-xs font-medium text-slate-600 transition hover:text-slate-900"
                  >
                    <Link2 className="h-3 w-3" />
                    Link resume
                  </button>
                )}
              </div>

              {showResumeLinker && (
                <div className="mt-2 rounded-lg border border-slate-200 p-3 space-y-2">
                  <select
                    value={selectedResumeId}
                    onChange={(e) => setSelectedResumeId(e.target.value)}
                    className="w-full rounded-lg border border-slate-300 px-2.5 py-1.5 text-xs focus:border-slate-900 focus:outline-none focus:ring-1 focus:ring-slate-900"
                  >
                    <option value="">Select a resume version...</option>
                    {(resumeVersions ?? []).map((rv: { id: string; version: number; label: string | null; document: { fileName: string } }) => (
                      <option key={rv.id} value={rv.id}>
                        {rv.document.fileName} - v{rv.version}{rv.label ? ` (${rv.label})` : ""}
                      </option>
                    ))}
                  </select>
                  <div className="flex justify-end gap-2">
                    <button
                      onClick={() => { setShowResumeLinker(false); setSelectedResumeId(""); }}
                      className="rounded-lg border border-slate-200 px-2.5 py-1 text-xs text-slate-600"
                    >Cancel</button>
                    <button
                      onClick={() => {
                        if (selectedResumeId) {
                          linkResumeMutation.mutate({ workspaceId, resumeVersionId: selectedResumeId, applicationId });
                        }
                      }}
                      disabled={linkResumeMutation.isPending || !selectedResumeId}
                      className="rounded-lg bg-slate-900 px-2.5 py-1 text-xs font-medium text-white disabled:opacity-50"
                    >
                      {linkResumeMutation.isPending ? "Linking..." : "Link"}
                    </button>
                  </div>
                </div>
              )}

              <div className="mt-2 space-y-2">
                {app.resumeLinks.length === 0 && !showResumeLinker ? (
                  <p className="text-xs text-slate-400">No resume versions linked.</p>
                ) : (
                  app.resumeLinks.map((rv: { id: string; version: number; label: string | null; document: { fileName: string } }) => (
                    <div key={rv.id} className="flex items-center gap-2 rounded-lg border border-slate-100 p-2 text-xs">
                      <FileText className="h-3 w-3 text-slate-400" />
                      <span className="font-medium text-slate-900">{rv.document.fileName}</span>
                      <span className="rounded bg-slate-100 px-1.5 py-0.5 text-slate-500">v{rv.version}</span>
                      {rv.label && <span className="text-slate-400">{rv.label}</span>}
                      <button
                        onClick={() => unlinkResumeMutation.mutate({ workspaceId, resumeVersionId: rv.id, applicationId })}
                        disabled={unlinkResumeMutation.isPending}
                        className="ml-auto rounded p-1 text-slate-400 transition hover:bg-red-50 hover:text-red-500"
                        title="Unlink resume"
                      >
                        <Unlink className="h-3 w-3" />
                      </button>
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
