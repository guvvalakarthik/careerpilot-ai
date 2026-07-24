"use client";

import { useRef, useState } from "react";
import {
  FileText,
  Upload,
  Download,
  Trash2,
  File,
  FileCheck,
  Award,
  Briefcase,
  FolderOpen,
  AlertCircle,
  Loader2,
  Tag,
} from "lucide-react";
import { api } from "@/trpc/react";

type Document = {
  id: string;
  type: string;
  fileName: string;
  mimeType: string;
  sizeBytes: number;
  createdAt: Date;
  resumeVersions: {
    id: string;
    version: number;
    label: string | null;
    applications: {
      id: string;
      opportunity: { title: string | null; company: { name: string } | null };
    }[];
  }[];
};

const typeConfig: Record<string, { icon: typeof FileText; color: string }> = {
  RESUME: { icon: FileText, color: "text-blue-600 bg-blue-50" },
  COVER_LETTER: { icon: FileCheck, color: "text-green-600 bg-green-50" },
  CERTIFICATE: { icon: Award, color: "text-amber-600 bg-amber-50" },
  PORTFOLIO: { icon: FolderOpen, color: "text-purple-600 bg-purple-50" },
  OFFER_LETTER: { icon: Briefcase, color: "text-indigo-600 bg-indigo-50" },
  OTHER: { icon: File, color: "text-slate-600 bg-slate-100" },
};

function formatSize(bytes: number): string {
  if (bytes < 1024) return bytes + " B";
  if (bytes < 1024 * 1024) return (bytes / 1024).toFixed(1) + " KB";
  return (bytes / (1024 * 1024)).toFixed(1) + " MB";
}

function formatDate(date: Date | string): string {
  return new Date(date).toLocaleDateString(undefined, { month: "short", day: "numeric", year: "numeric" });
}

export function DocumentsTab({ workspaceId }: { workspaceId: string }) {
  const [selectedType, setSelectedType] = useState<string>("ALL");
  const [uploading, setUploading] = useState(false);
  const [uploadType, setUploadType] = useState("RESUME");
  const [error, setError] = useState<string | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const utils = api.useUtils();

  const { data: r2Status } = api.document.status.useQuery({ workspaceId });
  const { data: documents, isLoading } = api.document.list.useQuery({
    workspaceId,
    ...(selectedType !== "ALL" ? { type: selectedType as never } : {}),
  });

  const createMutation = api.document.create.useMutation({
    onSuccess: () => {
      utils.document.list.invalidate({ workspaceId });
      utils.workspace.stats.invalidate({ workspaceId });
    },
  });

  const deleteMutation = api.document.delete.useMutation({
    onSuccess: () => {
      utils.document.list.invalidate({ workspaceId });
      utils.workspace.stats.invalidate({ workspaceId });
    },
  });

  const downloadMutation = api.document.getDownloadUrl.useMutation({});

  async function handleFileSelect(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (!file) return;

    setError(null);
    setUploading(true);

    try {
      const formData = new FormData();
      formData.append("file", file);
      formData.append("workspaceId", workspaceId);

      const res = await fetch("/api/upload", {
        method: "POST",
        body: formData,
      });

      if (!res.ok) {
        const data = await res.json();
        throw new Error(data.error ?? "Upload failed");
      }

      const uploadData = await res.json();

      await createMutation.mutateAsync({
        workspaceId,
        type: uploadType as never,
        fileName: uploadData.fileName,
        storageKey: uploadData.storageKey,
        mimeType: uploadData.mimeType,
        sizeBytes: uploadData.sizeBytes,
        isResume: uploadType === "RESUME",
      });
    } catch (err) {
      setError(err instanceof Error ? err.message : "Upload failed");
    } finally {
      setUploading(false);
      if (fileInputRef.current) fileInputRef.current.value = "";
    }
  }

  async function handleDownload(doc: Document) {
    try {
      const { url } = await downloadMutation.mutateAsync({
        workspaceId,
        documentId: doc.id,
      });
      window.open(url, "_blank");
    } catch (err) {
      setError(err instanceof Error ? err.message : "Download failed");
    }
  }

  const filteredDocs = (documents ?? []) as unknown as Document[];

  return (
    <div>
      {/* R2 status warning */}
      {r2Status && !r2Status.configured && (
        <div className="mb-4 flex items-start gap-2 rounded-xl border border-amber-200 bg-amber-50 p-3">
          <AlertCircle className="h-4 w-4 flex-shrink-0 text-amber-600" />
          <div className="text-xs text-amber-700">
            <p className="font-semibold">R2 storage not configured</p>
            <p className="mt-0.5">
              Set <code className="rounded bg-amber-100 px-1">R2_ACCOUNT_ID</code>,{" "}
              <code className="rounded bg-amber-100 px-1">R2_ACCESS_KEY_ID</code>, and{" "}
              <code className="rounded bg-amber-100 px-1">R2_SECRET_ACCESS_KEY</code> in your .env file to enable uploads.
            </p>
          </div>
        </div>
      )}

      {/* Upload bar */}
      <div className="mb-4 flex flex-wrap items-center gap-3">
        <select
          value={uploadType}
          onChange={(e) => setUploadType(e.target.value)}
          className="rounded-lg border border-slate-300 px-3 py-2 text-sm focus:border-slate-900 focus:outline-none focus:ring-1 focus:ring-slate-900"
        >
          <option value="RESUME">Resume</option>
          <option value="COVER_LETTER">Cover Letter</option>
          <option value="CERTIFICATE">Certificate</option>
          <option value="PORTFOLIO">Portfolio</option>
          <option value="OFFER_LETTER">Offer Letter</option>
          <option value="OTHER">Other</option>
        </select>

        <input
          ref={fileInputRef}
          type="file"
          onChange={handleFileSelect}
          className="hidden"
          accept=".pdf,.doc,.docx,.txt,.png,.jpg,.jpeg"
        />

        <button
          onClick={() => fileInputRef.current?.click()}
          disabled={uploading || (r2Status && !r2Status.configured)}
          className="flex items-center gap-1.5 rounded-lg bg-slate-900 px-3 py-2 text-sm font-medium text-white transition hover:bg-slate-800 disabled:opacity-50"
        >
          {uploading ? (
            <>
              <Loader2 className="h-4 w-4 animate-spin" />
              Uploading...
            </>
          ) : (
            <>
              <Upload className="h-4 w-4" />
              Upload document
            </>
          )}
        </button>

        <div className="ml-auto flex items-center gap-2">
          <select
            value={selectedType}
            onChange={(e) => setSelectedType(e.target.value)}
            className="rounded-lg border border-slate-300 px-3 py-2 text-sm focus:border-slate-900 focus:outline-none focus:ring-1 focus:ring-slate-900"
          >
            <option value="ALL">All types</option>
            <option value="RESUME">Resume</option>
            <option value="COVER_LETTER">Cover Letter</option>
            <option value="CERTIFICATE">Certificate</option>
            <option value="PORTFOLIO">Portfolio</option>
            <option value="OFFER_LETTER">Offer Letter</option>
            <option value="OTHER">Other</option>
          </select>
        </div>
      </div>

      {error && (
        <div className="mb-4 flex items-center gap-2 rounded-lg border border-red-200 bg-red-50 p-2.5 text-xs text-red-600">
          <AlertCircle className="h-3.5 w-3.5" />
          {error}
        </div>
      )}

      {/* Documents grid */}
      {isLoading ? (
        <div className="flex h-32 items-center justify-center text-sm text-slate-400">Loading documents...</div>
      ) : filteredDocs.length === 0 ? (
        <div className="rounded-xl border border-dashed border-slate-300 bg-white p-12 text-center">
          <FileText className="mx-auto h-8 w-8 text-slate-300" />
          <p className="mt-2 text-sm text-slate-500">No documents uploaded yet.</p>
        </div>
      ) : (
        <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
          {filteredDocs.map((doc) => {
            const config = typeConfig[doc.type] ?? typeConfig.OTHER;
            const Icon = config.icon;
            return (
              <div key={doc.id} className="rounded-xl border border-slate-200 bg-white p-4">
                <div className="flex items-start gap-3">
                  <div className={"flex h-10 w-10 flex-shrink-0 items-center justify-center rounded-lg " + config.color}>
                    <Icon className="h-5 w-5" />
                  </div>
                  <div className="min-w-0 flex-1">
                    <p className="truncate text-sm font-medium text-slate-900">{doc.fileName}</p>
                    <p className="text-xs text-slate-400">
                      {doc.type.replace(/_/g, " ").toLowerCase()} - {formatSize(doc.sizeBytes)}
                    </p>
                    <p className="mt-0.5 text-xs text-slate-400">{formatDate(doc.createdAt)}</p>
                  </div>
                </div>

                {/* Resume version info */}
                {doc.resumeVersions.length > 0 && (
                  <div className="mt-3 space-y-1">
                    {doc.resumeVersions.map((rv) => (
                      <div key={rv.id} className="flex items-center gap-1.5 rounded-lg bg-slate-50 px-2 py-1 text-xs">
                        <Tag className="h-3 w-3 text-slate-400" />
                        <span className="font-medium text-slate-600">v{rv.version}</span>
                        {rv.label && <span className="text-slate-500">{rv.label}</span>}
                        {rv.applications.length > 0 && (
                          <span className="text-slate-400">
                            - linked to {rv.applications.length} app{rv.applications.length !== 1 ? "s" : ""}
                          </span>
                        )}
                      </div>
                    ))}
                  </div>
                )}

                <div className="mt-3 flex gap-2">
                  <button
                    onClick={() => handleDownload(doc)}
                    disabled={downloadMutation.isPending}
                    className="flex items-center gap-1 rounded-lg border border-slate-200 px-2.5 py-1 text-xs font-medium text-slate-600 transition hover:bg-slate-50"
                  >
                    <Download className="h-3 w-3" />
                    View
                  </button>
                  <button
                    onClick={() => {
                      if (confirm("Delete this document?")) {
                        deleteMutation.mutate({ workspaceId, documentId: doc.id });
                      }
                    }}
                    disabled={deleteMutation.isPending}
                    className="flex items-center gap-1 rounded-lg border border-slate-200 px-2.5 py-1 text-xs font-medium text-red-500 transition hover:bg-red-50"
                  >
                    <Trash2 className="h-3 w-3" />
                    Delete
                  </button>
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
