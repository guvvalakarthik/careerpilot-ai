"use client";

import { useState } from "react";
import { Save, AlertTriangle } from "lucide-react";
import { api } from "@/trpc/react";
import { useRouter } from "next/navigation";

type Member = {
  id: string;
  role: string;
  createdAt: string;
  user: { id: string; name: string | null; email: string; image: string | null };
};

export function SettingsTab({
  workspaceId,
  role,
  members,
}: {
  workspaceId: string;
  role: string;
  members: Member[];
}) {
  const router = useRouter();
  const [name, setName] = useState("");
  const [nameError, setNameError] = useState<string | null>(null);
  const [nameSuccess, setNameSuccess] = useState(false);
  const utils = api.useUtils();

  const isOwner = role === "OWNER";

  const updateMutation = api.workspace.updateName.useMutation({
    onSuccess: () => {
      utils.workspace.list.invalidate();
      utils.workspace.get.invalidate({ workspaceId });
      setName("");
      setNameError(null);
      setNameSuccess(true);
      setTimeout(() => setNameSuccess(false), 3000);
      router.refresh();
    },
    onError: (err) => {
      setNameError(err.message);
    },
  });

  function handleRename(e: React.FormEvent) {
    e.preventDefault();
    if (name.trim().length < 2) return;
    updateMutation.mutate({ workspaceId, name: name.trim() });
  }

  return (
    <div className="space-y-6">
      {isOwner ? (
        <>
          <div className="rounded-xl border border-slate-200 bg-white p-5">
            <h3 className="font-semibold text-slate-900">Rename Workspace</h3>
            <form onSubmit={handleRename} className="mt-4 flex gap-3">
              <input
                type="text"
                required
                minLength={2}
                maxLength={60}
                placeholder="New workspace name"
                value={name}
                onChange={(e) => setName(e.target.value)}
                className="flex-1 rounded-lg border border-slate-300 px-3.5 py-2 text-sm transition focus:border-slate-900 focus:outline-none focus:ring-1 focus:ring-slate-900"
              />
              <button
                type="submit"
                disabled={updateMutation.isPending}
                className="flex items-center gap-1.5 rounded-lg bg-slate-900 px-4 py-2 text-sm font-semibold text-white transition hover:bg-slate-800 disabled:opacity-50"
              >
                <Save className="h-4 w-4" />
                {updateMutation.isPending ? "Saving..." : "Save"}
              </button>
            </form>
            {nameError && (
              <div className="mt-2 rounded-lg bg-red-50 px-3 py-2 text-sm text-red-600">{nameError}</div>
            )}
            {nameSuccess && (
              <div className="mt-2 rounded-lg bg-green-50 px-3 py-2 text-sm text-green-600">
                Workspace renamed successfully!
              </div>
            )}
          </div>

          <div className="rounded-xl border border-red-200 bg-white p-5">
            <h3 className="flex items-center gap-2 font-semibold text-red-700">
              <AlertTriangle className="h-4 w-4" />
              Danger Zone
            </h3>
            <div className="mt-4 flex items-center justify-between rounded-lg bg-red-50 px-4 py-3">
              <div>
                <p className="text-sm font-medium text-red-700">
                  Transfer Ownership
                </p>
                <p className="text-xs text-red-500">
                  Transfer this workspace to another owner. You will become a Coach.
                </p>
              </div>
              <select
                className="rounded-lg border border-red-300 px-3 py-1.5 text-xs focus:outline-none"
                onChange={(e) => {
                  if (e.target.value && confirm("Transfer ownership to this member?")) {
                    utils.client.workspace.changeRole.mutate({
                      workspaceId,
                      memberUserId: e.target.value,
                      role: "OWNER",
                    });
                    router.refresh();
                  }
                }}
                defaultValue=""
              >
                <option value="" disabled>
                  Select member...
                </option>
                {members
                  .filter((m) => m.role !== "OWNER")
                  .map((m) => (
                    <option key={m.user.id} value={m.user.id}>
                      {m.user.name ?? m.user.email}
                    </option>
                  ))}
              </select>
            </div>

            <div className="mt-3 flex items-center justify-between rounded-lg bg-red-50 px-4 py-3">
              <div>
                <p className="text-sm font-medium text-red-700">
                  Delete Workspace
                </p>
                <p className="text-xs text-red-500">
                  Permanently delete this workspace and all its data.
                </p>
              </div>
              <button
                disabled
                className="rounded-lg border border-red-300 px-4 py-1.5 text-xs font-medium text-red-600 opacity-50"
                title="Coming soon"
              >
                Delete
              </button>
            </div>
          </div>
        </>
      ) : (
        <div className="rounded-xl border border-slate-200 bg-white p-8 text-center">
          <p className="text-sm text-slate-400">
            Only the workspace owner can manage settings.
          </p>
        </div>
      )}
    </div>
  );
}
