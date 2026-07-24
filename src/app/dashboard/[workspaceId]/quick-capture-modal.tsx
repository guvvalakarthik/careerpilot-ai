"use client";

import { useState } from "react";
import { Zap, X, Link as LinkIcon, FileText } from "lucide-react";
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
  const utils = api.useUtils();

  const captureMutation = api.opportunity.quickCapture.useMutation({
    onSuccess: () => {
      utils.application.list.invalidate({ workspaceId });
      utils.workspace.stats.invalidate({ workspaceId });
      setUrl("");
      setRawText("");
      setCompanyName("");
      setTitle("");
      setError(null);
      setSuccess("Captured! Added to your pipeline.");
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

  return (
    <>
      <button
        onClick={() => setOpen(true)}
        className="flex items-center gap-2 rounded-lg bg-blue-600 px-4 py-2 text-sm font-medium text-white hover:bg-blue-700"
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
            className="w-full max-w-lg rounded-xl bg-white p-6 shadow-lg"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="flex items-center justify-between">
              <h2 className="flex items-center gap-2 text-lg font-semibold">
                <Zap className="h-5 w-5 text-blue-600" />
                Quick Capture
              </h2>
              <button
                onClick={() => setOpen(false)}
                className="text-gray-400 hover:text-gray-600"
              >
                <X className="h-5 w-5" />
              </button>
            </div>

            <p className="mt-1 text-xs text-gray-400">
              Paste a job URL or job description. AI extraction comes in Week 2 — for now it&apos;s saved as-is.
            </p>

            <div className="mt-4 flex gap-2">
              <button
                onClick={() => setMode("url")}
                className={`flex items-center gap-1.5 rounded-md px-3 py-1.5 text-sm font-medium ${
                  mode === "url"
                    ? "bg-blue-50 text-blue-700"
                    : "text-gray-500 hover:bg-gray-50"
                }`}
              >
                <LinkIcon className="h-3.5 w-3.5" />
                URL
              </button>
              <button
                onClick={() => setMode("text")}
                className={`flex items-center gap-1.5 rounded-md px-3 py-1.5 text-sm font-medium ${
                  mode === "text"
                    ? "bg-blue-50 text-blue-700"
                    : "text-gray-500 hover:bg-gray-50"
                }`}
              >
                <FileText className="h-3.5 w-3.5" />
                Paste JD
              </button>
            </div>

            <form onSubmit={handleSubmit} className="mt-4 space-y-4">
              {mode === "url" ? (
                <div>
                  <label className="block text-sm font-medium">Job URL</label>
                  <input
                    type="url"
                    required
                    placeholder="https://linkedin.com/jobs/view/..."
                    value={url}
                    onChange={(e) => setUrl(e.target.value)}
                    className="mt-1 w-full rounded-md border border-gray-300 px-3 py-2 text-sm focus:border-blue-500 focus:outline-none"
                  />
                </div>
              ) : (
                <div>
                  <label className="block text-sm font-medium">Job Description</label>
                  <textarea
                    required
                    rows={5}
                    placeholder="Paste the full job description here..."
                    value={rawText}
                    onChange={(e) => setRawText(e.target.value)}
                    className="mt-1 w-full rounded-md border border-gray-300 px-3 py-2 text-sm focus:border-blue-500 focus:outline-none"
                  />
                </div>
              )}

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-sm font-medium">
                    Company <span className="text-gray-400">(optional)</span>
                  </label>
                  <input
                    type="text"
                    placeholder="e.g. Google"
                    value={companyName}
                    onChange={(e) => setCompanyName(e.target.value)}
                    className="mt-1 w-full rounded-md border border-gray-300 px-3 py-2 text-sm focus:border-blue-500 focus:outline-none"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium">
                    Title <span className="text-gray-400">(optional)</span>
                  </label>
                  <input
                    type="text"
                    placeholder="e.g. SDE II"
                    value={title}
                    onChange={(e) => setTitle(e.target.value)}
                    className="mt-1 w-full rounded-md border border-gray-300 px-3 py-2 text-sm focus:border-blue-500 focus:outline-none"
                  />
                </div>
              </div>

              {error && <p className="text-sm text-red-600">{error}</p>}
              {success && <p className="text-sm text-green-600">{success}</p>}

              <div className="flex justify-end gap-2">
                <button
                  type="button"
                  onClick={() => setOpen(false)}
                  className="rounded-md border border-gray-300 px-4 py-2 text-sm hover:bg-gray-50"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={captureMutation.isPending}
                  className="rounded-md bg-blue-600 px-4 py-2 text-sm font-medium text-white hover:bg-blue-700 disabled:opacity-50"
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
