"use client";

import { useState } from "react";
import { Plus, X } from "lucide-react";
import { api } from "@/trpc/react";
import { useRouter } from "next/navigation";

export function CreateWorkspaceModal() {
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const [name, setName] = useState("");
  const [error, setError] = useState<string | null>(null);
  const utils = api.useUtils();

  const createMutation = api.workspace.create.useMutation({
    onSuccess: (workspace) => {
      utils.workspace.list.invalidate();
      setOpen(false);
      setName("");
      setError(null);
      router.push(`/dashboard/${workspace.id}`);
    },
    onError: (err) => {
      setError(err.message);
    },
  });

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (name.trim().length < 2) return;
    createMutation.mutate({ name: name.trim() });
  }

  return (
    <>
      <button
        onClick={() => setOpen(true)}
        className="flex items-center gap-2 rounded-lg bg-[#087f79] px-4 py-2 text-sm font-semibold text-white transition hover:bg-[#066e69]"
      >
        <Plus className="h-4 w-4" />
        New Workspace
      </button>

      {open && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center bg-black/40"
          onClick={() => setOpen(false)}
        >
          <div
            className="w-full max-w-md rounded-2xl bg-white p-6 shadow-xl"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="flex items-center justify-between">
              <h2 className="text-lg font-semibold text-slate-900">Create Workspace</h2>
              <button
                onClick={() => setOpen(false)}
                className="text-gray-400 hover:text-gray-600"
              >
                <X className="h-5 w-5" />
              </button>
            </div>

            <form onSubmit={handleSubmit} className="mt-4 space-y-4">
              <div>
                <label htmlFor="ws-name" className="block text-sm font-medium">
                  Workspace name
                </label>
                <input
                  id="ws-name"
                  type="text"
                  autoFocus
                  required
                  minLength={2}
                  maxLength={60}
                  placeholder="e.g. My Job Search"
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  className="mt-1.5 w-full rounded-lg border border-slate-300 px-3.5 py-2.5 text-sm transition focus:border-[#087f79] focus:outline-none focus:ring-1 focus:ring-[#087f79]"
                />
                <p className="mt-1 text-xs text-slate-400">
                  You&apos;ll be the owner of this workspace.
                </p>
              </div>

              {error && (
                <div className="rounded-lg bg-red-50 px-3 py-2 text-sm text-red-600">{error}</div>
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
                  disabled={createMutation.isPending}
                  className="rounded-lg bg-[#087f79] px-4 py-2 text-sm font-semibold text-white transition hover:bg-[#066e69] disabled:opacity-50"
                >
                  {createMutation.isPending ? "Creating..." : "Create"}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </>
  );
}
