"use client";

import { useState } from "react";
import { UserPlus, Trash2, Shield, Crown, GraduationCap } from "lucide-react";
import { api } from "@/trpc/react";

type Member = {
  id: string;
  role: string;
  createdAt: string;
  user: { id: string; name: string | null; email: string; image: string | null };
};

const roleConfig: Record<
  string,
  { icon: typeof Crown; badge: string; label: string }
> = {
  OWNER: { icon: Crown, badge: "bg-purple-50 text-purple-700", label: "Owner" },
  COACH: { icon: Shield, badge: "bg-blue-50 text-blue-700", label: "Coach" },
  SEEKER: { icon: GraduationCap, badge: "bg-gray-100 text-gray-600", label: "Seeker" },
};

export function MembersTab({
  workspaceId,
  role,
  currentUserId,
  members,
}: {
  workspaceId: string;
  role: string;
  currentUserId: string;
  members: Member[];
}) {
  const [inviteEmail, setInviteEmail] = useState("");
  const [inviteRole, setInviteRole] = useState<"SEEKER" | "COACH" | "OWNER">("SEEKER");
  const [inviteError, setInviteError] = useState<string | null>(null);
  const [inviteSuccess, setInviteSuccess] = useState<string | null>(null);
  const utils = api.useUtils();

  const canManage = role === "OWNER";
  const canInvite = role === "OWNER" || role === "COACH";

  const inviteMutation = api.workspace.inviteMember.useMutation({
    onSuccess: () => {
      utils.workspace.members.invalidate({ workspaceId });
      utils.workspace.stats.invalidate({ workspaceId });
      setInviteEmail("");
      setInviteError(null);
      setInviteSuccess("Member invited successfully!");
      setTimeout(() => setInviteSuccess(null), 3000);
    },
    onError: (err) => {
      setInviteError(err.message);
      setInviteSuccess(null);
    },
  });

  const changeRoleMutation = api.workspace.changeRole.useMutation({
    onSuccess: () => {
      utils.workspace.members.invalidate({ workspaceId });
    },
  });

  const removeMutation = api.workspace.removeMember.useMutation({
    onSuccess: () => {
      utils.workspace.members.invalidate({ workspaceId });
    },
  });

  function handleInvite(e: React.FormEvent) {
    e.preventDefault();
    if (!inviteEmail.trim()) return;
    setInviteError(null);
    setInviteSuccess(null);
    inviteMutation.mutate({
      workspaceId,
      email: inviteEmail.trim(),
      role: inviteRole,
    });
  }

  return (
    <div className="space-y-6">
      {canInvite && (
        <div className="rounded-xl border border-gray-200 p-5">
          <h3 className="flex items-center gap-2 font-semibold">
            <UserPlus className="h-4 w-4" />
            Invite Member
          </h3>
          <p className="mt-1 text-xs text-gray-400">
            The user must be registered on CareerPilot AI first.
          </p>

          <form onSubmit={handleInvite} className="mt-4 flex flex-col gap-3 sm:flex-row">
            <input
              type="email"
              required
              placeholder="user@example.com"
              value={inviteEmail}
              onChange={(e) => setInviteEmail(e.target.value)}
              className="flex-1 rounded-md border border-gray-300 px-3 py-2 text-sm focus:border-blue-500 focus:outline-none"
            />
            <select
              value={inviteRole}
              onChange={(e) =>
                setInviteRole(e.target.value as "SEEKER" | "COACH" | "OWNER")
              }
              className="rounded-md border border-gray-300 px-3 py-2 text-sm focus:border-blue-500 focus:outline-none"
            >
              <option value="SEEKER">Seeker</option>
              <option value="COACH">Coach</option>
              {canManage && <option value="OWNER">Owner</option>}
            </select>
            <button
              type="submit"
              disabled={inviteMutation.isPending}
              className="rounded-md bg-blue-600 px-4 py-2 text-sm font-medium text-white hover:bg-blue-700 disabled:opacity-50"
            >
              {inviteMutation.isPending ? "Inviting..." : "Invite"}
            </button>
          </form>

          {inviteError && (
            <p className="mt-2 text-sm text-red-600">{inviteError}</p>
          )}
          {inviteSuccess && (
            <p className="mt-2 text-sm text-green-600">{inviteSuccess}</p>
          )}
        </div>
      )}

      <div>
        <h3 className="mb-3 font-semibold">
          Members ({members.length})
        </h3>
        <div className="space-y-2">
          {members.map((m) => {
            const cfg = roleConfig[m.role] ?? roleConfig.SEEKER;
            const RoleIcon = cfg.icon;
            const isCurrentUser = m.user.id === currentUserId;

            return (
              <div
                key={m.id}
                className="flex items-center justify-between rounded-lg border border-gray-200 px-4 py-3"
              >
                <div className="flex items-center gap-3">
                  <div className="flex h-9 w-9 items-center justify-center rounded-full bg-gray-100 text-sm font-medium text-gray-600">
                    {m.user.name?.[0]?.toUpperCase() ?? m.user.email[0]?.toUpperCase()}
                  </div>
                  <div>
                    <p className="text-sm font-medium">
                      {m.user.name ?? m.user.email}
                      {isCurrentUser && (
                        <span className="ml-2 text-xs text-gray-400">(you)</span>
                      )}
                    </p>
                    <p className="text-xs text-gray-400">{m.user.email}</p>
                  </div>
                </div>

                <div className="flex items-center gap-2">
                  {canManage && !isCurrentUser ? (
                    <select
                      value={m.role}
                      onChange={(e) =>
                        changeRoleMutation.mutate({
                          workspaceId,
                          memberUserId: m.user.id,
                          role: e.target.value as "OWNER" | "COACH" | "SEEKER",
                        })
                      }
                      disabled={changeRoleMutation.isPending}
                      className="rounded-md border border-gray-300 px-2 py-1 text-xs focus:border-blue-500 focus:outline-none"
                    >
                      <option value="SEEKER">Seeker</option>
                      <option value="COACH">Coach</option>
                      <option value="OWNER">Owner</option>
                    </select>
                  ) : (
                    <span
                      className={`flex items-center gap-1 rounded-full px-2.5 py-0.5 text-xs font-medium ${cfg.badge}`}
                    >
                      <RoleIcon className="h-3 w-3" />
                      {cfg.label}
                    </span>
                  )}

                  {canManage && !isCurrentUser && (
                    <button
                      onClick={() =>
                        removeMutation.mutate({
                          workspaceId,
                          memberUserId: m.user.id,
                        })
                      }
                      disabled={removeMutation.isPending}
                      className="rounded-md p-1.5 text-gray-400 hover:bg-red-50 hover:text-red-600"
                      title="Remove member"
                    >
                      <Trash2 className="h-4 w-4" />
                    </button>
                  )}
                </div>
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
}
