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
  workspaceName,
  role,
  members,
}: {
  workspaceId: string;
  workspaceName: string;
  role: string;
  members: Member[];
}) {
  const router = useRouter();
  const [name, setName] = useState("");
  const [nameError, setNameError] = useState<string | null>(null);
  const [nameSuccess, setNameSuccess] = useState(false);
  const [transferUserId, setTransferUserId] = useState("");
  const [transferError, setTransferError] = useState<string | null>(null);
  const [deleteConfirmation, setDeleteConfirmation] = useState("");
  const [deleteError, setDeleteError] = useState<string | null>(null);
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

  const transferMutation = api.workspace.transferOwnership.useMutation({
    onSuccess: async () => {
      setTransferError(null);
      setTransferUserId("");
      await utils.workspace.list.invalidate();
      await utils.workspace.members.invalidate({ workspaceId });
      router.refresh();
    },
    onError: (err) => setTransferError(err.message),
  });

  const deleteMutation = api.workspace.delete.useMutation({
    onSuccess: async () => {
      await utils.workspace.list.invalidate();
      router.replace("/dashboard");
      router.refresh();
    },
    onError: (err) => setDeleteError(err.message),
  });

  function handleRename(e: React.FormEvent) {
    e.preventDefault();
    if (name.trim().length < 2) return;
    updateMutation.mutate({ workspaceId, name: name.trim() });
  }

  function handleTransfer() {
    if (!transferUserId) return;
    if (!confirm("Transfer ownership to this member? You will become a Coach.")) return;
    setTransferError(null);
    transferMutation.mutate({ workspaceId, memberUserId: transferUserId });
  }

  function handleDelete() {
    if (deleteConfirmation !== workspaceName) return;
    if (!confirm("Permanently delete this workspace and all of its data?")) return;
    setDeleteError(null);
    deleteMutation.mutate({ workspaceId, confirmationName: deleteConfirmation });
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
            <div className="mt-4 rounded-lg bg-red-50 px-4 py-3">
              <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
                <div>
                  <p className="text-sm font-medium text-red-700">Transfer Ownership</p>
                  <p className="text-xs text-red-500">
                    The selected member becomes Owner and you become a Coach.
                  </p>
                </div>
                <div className="flex gap-2">
                  <select
                    aria-label="New workspace owner"
                    className="rounded-lg border border-red-300 px-3 py-1.5 text-xs focus:outline-none"
                    value={transferUserId}
                    onChange={(e) => setTransferUserId(e.target.value)}
                  >
                    <option value="">Select member...</option>
                    {members
                      .filter((member) => member.role !== "OWNER")
                      .map((member) => (
                        <option key={member.user.id} value={member.user.id}>
                          {member.user.name ?? member.user.email}
                        </option>
                      ))}
                  </select>
                  <button
                    type="button"
                    onClick={handleTransfer}
                    disabled={!transferUserId || transferMutation.isPending}
                    className="rounded-lg border border-red-300 px-3 py-1.5 text-xs font-medium text-red-700 disabled:opacity-50"
                  >
                    {transferMutation.isPending ? "Transferring..." : "Transfer"}
                  </button>
                </div>
              </div>
              {transferError && <p className="mt-2 text-xs text-red-600">{transferError}</p>}
            </div>

            <div className="mt-3 rounded-lg bg-red-50 px-4 py-3">
              <div className="flex flex-col gap-3 sm:flex-row sm:items-end sm:justify-between">
                <div>
                  <p className="text-sm font-medium text-red-700">Delete Workspace</p>
                  <p className="text-xs text-red-500">
                    Permanently deletes applications, contacts, tasks, documents, and memberships.
                  </p>
                  <label className="mt-2 block text-xs font-medium text-red-700" htmlFor="delete-workspace-confirmation">
                    Type <strong>{workspaceName}</strong> to confirm
                  </label>
                  <input
                    id="delete-workspace-confirmation"
                    value={deleteConfirmation}
                    onChange={(event) => setDeleteConfirmation(event.target.value)}
                    className="mt-1 w-full rounded-lg border border-red-300 bg-white px-3 py-1.5 text-xs focus:outline-none sm:w-72"
                  />
                </div>
                <button
                  type="button"
                  onClick={handleDelete}
                  disabled={deleteConfirmation !== workspaceName || deleteMutation.isPending}
                  className="rounded-lg border border-red-300 px-4 py-1.5 text-xs font-medium text-red-700 disabled:opacity-50"
                >
                  {deleteMutation.isPending ? "Deleting..." : "Delete permanently"}
                </button>
              </div>
              {deleteError && <p className="mt-2 text-xs text-red-600">{deleteError}</p>}
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
