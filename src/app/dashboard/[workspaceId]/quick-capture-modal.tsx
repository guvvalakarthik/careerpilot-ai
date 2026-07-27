"use client";

import { useState, useEffect, useRef } from "react";
import { Zap, X, Link as LinkIcon, FileText, Upload, Loader2, FileCheck2 } from "lucide-react";
import { api } from "@/trpc/react";

export function QuickCaptureModal({ workspaceId }: { workspaceId: string }) {
  const [open, setOpen] = useState(false);
  const [mode, setMode] = useState<"url" | "text">("url");
  const [url, setUrl] = useState("");
  const [rawText, setRawText] = useState("");
  const [companyName, setCompanyName] = useState("");
  const [title, setTitle] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);
  const [jdFileName, setJdFileName] = useState<string | null>(null);
  const [extractingJd, setExtractingJd] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const utils = api.useUtils();

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
            className="w-full max-w-lg rounded-2xl bg-white p-6 shadow-xl"
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
              Paste a job URL or job description. AI auto-extracts company, title, skills, and more.
            </p>

            <div className="mt-4 flex gap-2">
              <button
                onClick={() => setMode("url")}
                className={`flex items-center gap-1.5 rounded-lg px-3 py-1.5 text-sm font-medium ${
                  mode === "url"
                    ? "bg-slate-100 text-slate-900"
                    : "text-slate-500 hover:bg-slate-50"
                }`}
              >
                <LinkIcon className="h-3.5 w-3.5" />
                URL
              </button>
              <button
                onClick={() => setMode("text")}
                className={`flex items-center gap-1.5 rounded-lg px-3 py-1.5 text-sm font-medium ${
                  mode === "text"
                    ? "bg-slate-100 text-slate-900"
                    : "text-slate-500 hover:bg-slate-50"
                }`}
              >
                <FileText className="h-3.5 w-3.5" />
                Paste JD
              </button>
            </div>

            <form onSubmit={handleSubmit} className="mt-4 space-y-4">
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
          </div>
        </div>
      )}
    </>
  );
}
