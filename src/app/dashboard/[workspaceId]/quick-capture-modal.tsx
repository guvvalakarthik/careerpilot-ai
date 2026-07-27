"use client";

import { useState, useEffect, useRef } from "react";
import {
  Zap,
  X,
  Link as LinkIcon,
  FileText,
  Target,
  Upload,
  CheckCircle2,
  XCircle,
  Clock,
  BookOpen,
  TrendingUp,
  Loader2,
  AlertCircle,
  FileCheck2,
  ArrowRight,
} from "lucide-react";
import { api } from "@/trpc/react";
import type { ResumeJdMatchResult } from "@/server/ai";

export function QuickCaptureModal({ workspaceId }: { workspaceId: string }) {
  const [open, setOpen] = useState(false);
  const [mode, setMode] = useState<"url" | "text" | "match">("url");
  const [url, setUrl] = useState("");
  const [rawText, setRawText] = useState("");
  const [companyName, setCompanyName] = useState("");
  const [title, setTitle] = useState("");
  const [selectedResumeId, setSelectedResumeId] = useState<string>("");
  const [jdText, setJdText] = useState("");
  const [matchResult, setMatchResult] = useState<ResumeJdMatchResult | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);
  const [jdFileName, setJdFileName] = useState<string | null>(null);
  const [matchJdFileName, setMatchJdFileName] = useState<string | null>(null);
  const [extractingJd, setExtractingJd] = useState(false);
  const [extractingMatchJd, setExtractingMatchJd] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const matchJdFileInputRef = useRef<HTMLInputElement>(null);
  const utils = api.useUtils();

  const { data: documents } = api.document.list.useQuery(
    { workspaceId, type: "RESUME" as const },
    { enabled: open && mode === "match" },
  );

  useEffect(() => {
    function handleOpen() {
      setOpen(true);
    }
    window.addEventListener("quick-capture-open", handleOpen);
    return () => window.removeEventListener("quick-capture-open", handleOpen);
  }, []);

  const captureMutation = api.opportunity.quickCapture.useMutation({
    onSuccess: () => {
      utils.application.list.invalidate({ workspaceId });
      utils.workspace.stats.invalidate({ workspaceId });
      setUrl("");
      setRawText("");
      setCompanyName("");
      setTitle("");
      setError(null);
      setSuccess("Captured! AI extracted job details. Added to your pipeline.");
      setTimeout(() => {
        setSuccess(null);
        setOpen(false);
      }, 1500);
    },
    onError: (err) => {
      setError(err.message);
      setSuccess(null);
    },
  });

  const matchMutation = api.ai.resumeMatch.useMutation({
    onSuccess: (data) => {
      setMatchResult(data);
      setError(null);
    },
    onError: (err) => {
      setError(err.message);
      setMatchResult(null);
    },
  });

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    const rawInput = mode === "url" ? url : rawText;
    if (!rawInput.trim()) return;

    captureMutation.mutate({
      workspaceId,
      rawInput: rawInput.trim(),
      sourceUrl: mode === "url" ? url.trim() : "",
      companyName: companyName.trim() || undefined,
      title: title.trim() || undefined,
    });
  }

  function handleMatchSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!selectedResumeId || !jdText.trim()) return;
    setMatchResult(null);
    matchMutation.mutate({
      workspaceId,
      documentId: selectedResumeId,
      jdText: jdText.trim(),
    });
  }

  function resetMatch() {
    setMatchResult(null);
    setSelectedResumeId("");
    setJdText("");
    setError(null);
  }

  async function handleJdFileUpload(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (!file) return;

    setExtractingJd(true);
    setError(null);
    setJdFileName(file.name);

    try {
      const formData = new FormData();
      formData.append("file", file);

      const res = await fetch("/api/extract-text", {
        method: "POST",
        body: formData,
      });

      if (!res.ok) {
        const data = await res.json();
        throw new Error(data.error || "Failed to extract text");
      }

      const data = await res.json();
      setRawText(data.text);
      setMode("text");
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to read file");
      setJdFileName(null);
    } finally {
      setExtractingJd(false);
      if (fileInputRef.current) {
        fileInputRef.current.value = "";
      }
    }
  }

  async function handleMatchJdFileUpload(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (!file) return;

    setExtractingMatchJd(true);
    setError(null);
    setMatchJdFileName(file.name);

    try {
      const formData = new FormData();
      formData.append("file", file);

      const res = await fetch("/api/extract-text", {
        method: "POST",
        body: formData,
      });

      if (!res.ok) {
        const data = await res.json();
        throw new Error(data.error || "Failed to extract text");
      }

      const data = await res.json();
      setJdText(data.text);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to read file");
      setMatchJdFileName(null);
    } finally {
      setExtractingMatchJd(false);
      if (matchJdFileInputRef.current) {
        matchJdFileInputRef.current.value = "";
      }
    }
  }

  return (
    <>
      <button
        onClick={() => setOpen(true)}
        className="flex items-center gap-2 rounded-lg bg-slate-900 px-4 py-2 text-sm font-semibold text-white transition hover:bg-slate-800"
      >
        <Zap className="h-4 w-4" />
        Quick Capture
      </button>

      {open && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center bg-black/40"
          onClick={() => setOpen(false)}
        >
          <div
            className="flex max-h-[90vh] w-full max-w-lg flex-col overflow-hidden rounded-2xl bg-white p-6 shadow-xl"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="flex items-center justify-between">
              <h2 className="flex items-center gap-2 text-lg font-semibold text-slate-900">
                <Zap className="h-5 w-5 text-amber-500" />
                Quick Capture
              </h2>
              <button
                onClick={() => setOpen(false)}
                className="text-slate-400 transition hover:text-slate-600"
              >
                <X className="h-5 w-5" />
              </button>
            </div>

            <p className="mt-1 text-xs text-slate-400">
              Paste a job URL, job description, or match your resume against a JD.
            </p>

            <div className="mt-4 flex gap-2">
              <button
                onClick={() => { setMode("url"); setMatchResult(null); }}
                className={`flex items-center gap-1.5 rounded-lg px-3 py-1.5 text-sm font-medium ${
                  mode === "url" ? "bg-slate-100 text-slate-900" : "text-slate-500 hover:bg-slate-50"
                }`}
              >
                <LinkIcon className="h-3.5 w-3.5" />
                URL
              </button>
              <button
                onClick={() => { setMode("text"); setMatchResult(null); }}
                className={`flex items-center gap-1.5 rounded-lg px-3 py-1.5 text-sm font-medium ${
                  mode === "text" ? "bg-slate-100 text-slate-900" : "text-slate-500 hover:bg-slate-50"
                }`}
              >
                <FileText className="h-3.5 w-3.5" />
                Paste JD
              </button>
              <button
                onClick={() => { setMode("match"); setMatchResult(null); }}
                className={`flex items-center gap-1.5 rounded-lg px-3 py-1.5 text-sm font-medium ${
                  mode === "match" ? "bg-slate-100 text-slate-900" : "text-slate-500 hover:bg-slate-50"
                }`}
              >
                <Target className="h-3.5 w-3.5" />
                Resume Match
              </button>
            </div>

            <div className="mt-4 flex-1 overflow-y-auto">
              {/* URL & Text modes */}
              {mode !== "match" && (
                <form onSubmit={handleSubmit} className="space-y-4">
                  {mode === "url" ? (
                    <div>
                      <label className="block text-sm font-medium text-slate-700">Job URL</label>
                      <input
                        type="url"
                        required
                        placeholder="https://linkedin.com/jobs/view/..."
                        value={url}
                        onChange={(e) => setUrl(e.target.value)}
                        className="mt-1.5 w-full rounded-lg border border-slate-300 px-3.5 py-2.5 text-sm transition focus:border-slate-900 focus:outline-none focus:ring-1 focus:ring-slate-900"
                      />
                    </div>
                  ) : (
                    <div>
                      <div className="flex items-center justify-between">
                        <label className="block text-sm font-medium text-slate-700">Job Description</label>
                        <button
                          type="button"
                          onClick={() => fileInputRef.current?.click()}
                          disabled={extractingJd}
                          className="flex items-center gap-1.5 text-xs font-medium text-indigo-600 transition hover:text-indigo-700 disabled:opacity-50"
                        >
                          {extractingJd ? (
                            <>
                              <Loader2 className="h-3.5 w-3.5 animate-spin" />
                              Extracting...
                            </>
                          ) : jdFileName ? (
                            <>
                              <FileCheck2 className="h-3.5 w-3.5" />
                              {jdFileName}
                            </>
                          ) : (
                            <>
                              <Upload className="h-3.5 w-3.5" />
                              Upload PDF
                            </>
                          )}
                        </button>
                        <input
                          ref={fileInputRef}
                          type="file"
                          accept=".pdf,.txt,.doc,.docx"
                          onChange={handleJdFileUpload}
                          className="hidden"
                        />
                      </div>
                      <textarea
                        required
                        rows={5}
                        placeholder="Paste the full job description here, or upload a PDF..."
                        value={rawText}
                        onChange={(e) => setRawText(e.target.value)}
                        className="mt-1.5 w-full rounded-lg border border-slate-300 px-3.5 py-2.5 text-sm transition focus:border-slate-900 focus:outline-none focus:ring-1 focus:ring-slate-900"
                      />
                    </div>
                  )}

                  <div className="grid grid-cols-2 gap-3">
                    <div>
                      <label className="block text-sm font-medium text-slate-700">
                        Company <span className="text-slate-400">(optional)</span>
                      </label>
                      <input
                        type="text"
                        placeholder="e.g. Google"
                        value={companyName}
                        onChange={(e) => setCompanyName(e.target.value)}
                        className="mt-1.5 w-full rounded-lg border border-slate-300 px-3.5 py-2.5 text-sm transition focus:border-slate-900 focus:outline-none focus:ring-1 focus:ring-slate-900"
                      />
                    </div>
                    <div>
                      <label className="block text-sm font-medium text-slate-700">
                        Title <span className="text-slate-400">(optional)</span>
                      </label>
                      <input
                        type="text"
                        placeholder="e.g. SDE II"
                        value={title}
                        onChange={(e) => setTitle(e.target.value)}
                        className="mt-1.5 w-full rounded-lg border border-slate-300 px-3.5 py-2.5 text-sm transition focus:border-slate-900 focus:outline-none focus:ring-1 focus:ring-slate-900"
                      />
                    </div>
                  </div>

                  {error && <div className="rounded-lg bg-red-50 px-3 py-2 text-sm text-red-600">{error}</div>}
                  {success && <div className="rounded-lg bg-green-50 px-3 py-2 text-sm text-green-600">{success}</div>}

                  <div className="flex justify-end gap-2">
                    <button
                      type="button"
                      onClick={() => setOpen(false)}
                      className="rounded-lg border border-slate-300 px-4 py-2 text-sm font-medium text-slate-600 transition hover:bg-slate-50"
                    >
                      Cancel
                    </button>
                    <button
                      type="submit"
                      disabled={captureMutation.isPending}
                      className="rounded-lg bg-slate-900 px-4 py-2 text-sm font-semibold text-white transition hover:bg-slate-800 disabled:opacity-50"
                    >
                      {captureMutation.isPending ? "Capturing..." : "Capture"}
                    </button>
                  </div>
                </form>
              )}

              {/* Resume Match mode */}
              {mode === "match" && (
                <>
                  {matchResult ? (
                    <MatchResults result={matchResult} onReset={resetMatch} />
                  ) : (
                    <form onSubmit={handleMatchSubmit} className="space-y-4">
                      {/* Resume selector */}
                      <div>
                        <label className="block text-sm font-medium text-slate-700">
                          Select your resume
                        </label>
                        {documents && documents.length > 0 ? (
                          <select
                            required
                            value={selectedResumeId}
                            onChange={(e) => setSelectedResumeId(e.target.value)}
                            className="mt-1.5 w-full rounded-lg border border-slate-300 px-3.5 py-2.5 text-sm transition focus:border-slate-900 focus:outline-none focus:ring-1 focus:ring-slate-900"
                          >
                            <option value="">Choose a resume...</option>
                            {documents.map((doc) => (
                              <option key={doc.id} value={doc.id}>
                                {doc.fileName}
                              </option>
                            ))}
                          </select>
                        ) : (
                          <div className="mt-1.5 rounded-lg border border-dashed border-slate-300 bg-slate-50 p-4 text-center">
                            <Upload className="mx-auto h-5 w-5 text-slate-400" />
                            <p className="mt-2 text-xs text-slate-500">
                              No resumes found. Upload your resume in the Documents tab first.
                            </p>
                          </div>
                        )}
                      </div>

                      {/* JD input */}
                      <div>
                        <div className="flex items-center justify-between">
                          <label className="block text-sm font-medium text-slate-700">
                            Job description
                          </label>
                          <button
                            type="button"
                            onClick={() => matchJdFileInputRef.current?.click()}
                            disabled={extractingMatchJd}
                            className="flex items-center gap-1.5 text-xs font-medium text-indigo-600 transition hover:text-indigo-700 disabled:opacity-50"
                          >
                            {extractingMatchJd ? (
                              <>
                                <Loader2 className="h-3.5 w-3.5 animate-spin" />
                                Extracting...
                              </>
                            ) : matchJdFileName ? (
                              <>
                                <FileCheck2 className="h-3.5 w-3.5" />
                                {matchJdFileName}
                              </>
                            ) : (
                              <>
                                <Upload className="h-3.5 w-3.5" />
                                Upload PDF
                              </>
                            )}
                          </button>
                          <input
                            ref={matchJdFileInputRef}
                            type="file"
                            accept=".pdf,.txt,.doc,.docx"
                            onChange={handleMatchJdFileUpload}
                            className="hidden"
                          />
                        </div>
                        <textarea
                          required
                          rows={6}
                          minLength={50}
                          placeholder="Paste the job description here, or upload a PDF..."
                          value={jdText}
                          onChange={(e) => setJdText(e.target.value)}
                          className="mt-1.5 w-full rounded-lg border border-slate-300 px-3.5 py-2.5 text-sm transition focus:border-slate-900 focus:outline-none focus:ring-1 focus:ring-slate-900"
                        />
                      </div>

                      {error && (
                        <div className="flex items-start gap-2 rounded-lg bg-red-50 px-3 py-2 text-sm text-red-600">
                          <AlertCircle className="mt-0.5 h-4 w-4 flex-shrink-0" />
                          {error}
                        </div>
                      )}

                      <div className="flex justify-end gap-2">
                        <button
                          type="button"
                          onClick={() => setOpen(false)}
                          className="rounded-lg border border-slate-300 px-4 py-2 text-sm font-medium text-slate-600 transition hover:bg-slate-50"
                        >
                          Cancel
                        </button>
                        <button
                          type="submit"
                          disabled={matchMutation.isPending || !selectedResumeId || !jdText.trim()}
                          className="flex items-center gap-2 rounded-lg bg-slate-900 px-4 py-2 text-sm font-semibold text-white transition hover:bg-slate-800 disabled:opacity-50"
                        >
                          {matchMutation.isPending ? (
                            <>
                              <Loader2 className="h-4 w-4 animate-spin" />
                              Analyzing...
                            </>
                          ) : (
                            <>
                              <Target className="h-4 w-4" />
                              Match Resume
                            </>
                          )}
                        </button>
                      </div>
                    </form>
                  )}
                </>
              )}
            </div>
          </div>
        </div>
      )}
    </>
  );
}

function MatchResults({
  result,
  onReset,
}: {
  result: ResumeJdMatchResult;
  onReset: () => void;
}) {
  const verdictConfig = {
    strong: { color: "text-emerald-600", bg: "bg-emerald-50", border: "border-emerald-200", icon: CheckCircle2, label: "Strong Match" },
    moderate: { color: "text-amber-600", bg: "bg-amber-50", border: "border-amber-200", icon: TrendingUp, label: "Moderate Match" },
    weak: { color: "text-red-600", bg: "bg-red-50", border: "border-red-200", icon: XCircle, label: "Weak Match" },
  };
  const config = verdictConfig[result.matchVerdict];
  const VerdictIcon = config.icon;

  const priorityConfig = {
    high: { color: "text-red-600 bg-red-50", label: "High" },
    medium: { color: "text-amber-600 bg-amber-50", label: "Medium" },
    low: { color: "text-slate-600 bg-slate-50", label: "Low" },
  };

  return (
    <div className="space-y-4">
      {/* Score header */}
      <div className={`rounded-xl border ${config.border} ${config.bg} p-4`}>
        <div className="flex items-center gap-3">
          <VerdictIcon className={`h-6 w-6 ${config.color}`} />
          <div className="flex-1">
            <p className={`text-sm font-semibold ${config.color}`}>{config.label}</p>
            <p className="text-2xl font-bold text-slate-900">{result.matchScore}%</p>
          </div>
        </div>
        <p className="mt-2 text-sm text-slate-600">{result.summary}</p>
      </div>

      {/* Matched skills */}
      {result.matchedSkills.length > 0 && (
        <div>
          <p className="flex items-center gap-1.5 text-sm font-semibold text-emerald-700">
            <CheckCircle2 className="h-4 w-4" />
            Skills you have ({result.matchedSkills.length})
          </p>
          <div className="mt-2 flex flex-wrap gap-1.5">
            {result.matchedSkills.map((skill) => (
              <span key={skill} className="rounded-lg bg-emerald-50 px-2.5 py-1 text-xs font-medium text-emerald-700">
                {skill}
              </span>
            ))}
          </div>
        </div>
      )}

      {/* Missing skills */}
      {result.missingSkills.length > 0 && (
        <div>
          <p className="flex items-center gap-1.5 text-sm font-semibold text-red-700">
            <XCircle className="h-4 w-4" />
            Skills you&apos;re missing ({result.missingSkills.length})
          </p>
          <div className="mt-2 flex flex-wrap gap-1.5">
            {result.missingSkills.map((skill) => (
              <span key={skill} className="rounded-lg bg-red-50 px-2.5 py-1 text-xs font-medium text-red-700">
                {skill}
              </span>
            ))}
          </div>
        </div>
      )}

      {/* Transferable skills */}
      {result.transferableSkills.length > 0 && (
        <div>
          <p className="flex items-center gap-1.5 text-sm font-semibold text-indigo-700">
            <TrendingUp className="h-4 w-4" />
            Transferable skills
          </p>
          <div className="mt-2 flex flex-wrap gap-1.5">
            {result.transferableSkills.map((skill) => (
              <span key={skill} className="rounded-lg bg-indigo-50 px-2.5 py-1 text-xs font-medium text-indigo-700">
                {skill}
              </span>
            ))}
          </div>
        </div>
      )}

      {/* Skill paths — transferable knowledge graph */}
      {result.skillPaths.length > 0 && (
        <div>
          <p className="flex items-center gap-1.5 text-sm font-semibold text-violet-700">
            <ArrowRight className="h-4 w-4" />
            Skill transfer paths
          </p>
          <p className="mt-1 text-xs text-slate-500">
            Your existing skills can help you learn missing ones faster.
          </p>
          <div className="mt-2 space-y-2">
            {result.skillPaths.map((path, i) => (
              <div key={i} className="rounded-lg border border-violet-100 bg-violet-50/50 p-3">
                <div className="flex items-center gap-2">
                  <span className="rounded-lg bg-emerald-50 px-2 py-0.5 text-xs font-medium text-emerald-700">
                    {path.fromSkill}
                  </span>
                  <ArrowRight className="h-3.5 w-3.5 text-slate-400" />
                  <span className="rounded-lg bg-red-50 px-2 py-0.5 text-xs font-medium text-red-700">
                    {path.toSkill}
                  </span>
                  <span className="ml-auto text-xs text-slate-500">{path.estimatedTime}</span>
                </div>
                <p className="mt-1.5 text-xs text-slate-600">{path.reason}</p>
                <div className="mt-1.5 flex items-center gap-2">
                  <div className="h-1.5 flex-1 overflow-hidden rounded-full bg-slate-200">
                    <div
                      className="h-full rounded-full bg-violet-500"
                      style={{ width: `${Math.round(path.strength * 100)}%` }}
                    />
                  </div>
                  <span className="text-xs font-medium text-violet-600">
                    {Math.round(path.strength * 100)}%
                  </span>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Learning roadmap */}
      {result.roadmap.length > 0 && (
        <div>
          <p className="flex items-center gap-1.5 text-sm font-semibold text-slate-900">
            <BookOpen className="h-4 w-4" />
            Learning roadmap
          </p>
          <div className="mt-2 space-y-2">
            {result.roadmap.map((item, i) => {
              const pc = priorityConfig[item.priority];
              return (
                <div key={i} className="rounded-lg border border-slate-200 bg-white p-3">
                  <div className="flex items-center justify-between">
                    <p className="text-sm font-semibold text-slate-900">{item.skill}</p>
                    <span className={`rounded-full px-2 py-0.5 text-xs font-medium ${pc.color}`}>
                      {pc.label}
                    </span>
                  </div>
                  <div className="mt-1 flex items-center gap-3 text-xs text-slate-500">
                    <span className="flex items-center gap-1">
                      <BookOpen className="h-3 w-3" />
                      {item.level}
                    </span>
                    <span className="flex items-center gap-1">
                      <Clock className="h-3 w-3" />
                      {item.estimatedTime}
                    </span>
                  </div>
                  {item.resources.length > 0 && (
                    <ul className="mt-2 space-y-1">
                      {item.resources.map((res, j) => (
                        <li key={j} className="text-xs text-slate-600">
                          → {res}
                        </li>
                      ))}
                    </ul>
                  )}
                </div>
              );
            })}
          </div>
        </div>
      )}

      <div className="flex justify-end gap-2">
        <button
          type="button"
          onClick={onReset}
          className="rounded-lg border border-slate-300 px-4 py-2 text-sm font-medium text-slate-600 transition hover:bg-slate-50"
        >
          Try another JD
        </button>
      </div>
    </div>
  );
}
