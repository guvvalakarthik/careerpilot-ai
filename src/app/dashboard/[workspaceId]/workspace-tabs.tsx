"use client";

import { useState } from "react";
import {
  LayoutDashboard,
  Users,
  Settings,
  Briefcase,
  FileText,
  Mail,
  Calendar,
  CheckSquare,
  Building2,
} from "lucide-react";
import { MembersTab } from "./members-tab";
import { SettingsTab } from "./settings-tab";

type Member = {
  id: string;
  role: string;
  createdAt: string;
  user: { id: string; name: string | null; email: string; image: string | null };
};

type Stats = {
  companies: number;
  opportunities: number;
  applications: number;
  contacts: number;
  interviews: number;
  tasks: number;
};

const statCards = [
  { key: "companies", label: "Companies", icon: Building2, color: "text-indigo-600 bg-indigo-50" },
  { key: "opportunities", label: "Job Opportunities", icon: Briefcase, color: "text-blue-600 bg-blue-50" },
  { key: "applications", label: "Applications", icon: FileText, color: "text-green-600 bg-green-50" },
  { key: "contacts", label: "Contacts", icon: Mail, color: "text-orange-600 bg-orange-50" },
  { key: "interviews", label: "Interviews", icon: Calendar, color: "text-purple-600 bg-purple-50" },
  { key: "tasks", label: "Open Tasks", icon: CheckSquare, color: "text-red-600 bg-red-50" },
] as const;

export function WorkspaceTabs({
  workspaceId,
  role,
  currentUserId,
  members,
  stats,
}: {
  workspaceId: string;
  role: string;
  currentUserId: string;
  members: Member[];
  stats: Stats;
}) {
  const [tab, setTab] = useState<"overview" | "members" | "settings">("overview");

  const tabs = [
    { id: "overview" as const, label: "Overview", icon: LayoutDashboard },
    { id: "members" as const, label: "Members", icon: Users },
    { id: "settings" as const, label: "Settings", icon: Settings },
  ];

  return (
    <div className="mt-6">
      <div className="flex gap-1 border-b border-gray-200">
        {tabs.map((t) => {
          const Icon = t.icon;
          return (
            <button
              key={t.id}
              onClick={() => setTab(t.id)}
              className={`flex items-center gap-2 border-b-2 px-4 py-2.5 text-sm font-medium transition ${
                tab === t.id
                  ? "border-blue-600 text-blue-600"
                  : "border-transparent text-gray-500 hover:text-gray-700"
              }`}
            >
              <Icon className="h-4 w-4" />
              {t.label}
            </button>
          );
        })}
      </div>

      <div className="mt-6">
        {tab === "overview" && (
          <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
            {statCards.map((card) => {
              const Icon = card.icon;
              const value = stats[card.key as keyof Stats];
              return (
                <div
                  key={card.key}
                  className="rounded-xl border border-gray-200 p-5"
                >
                  <div className="flex items-center gap-3">
                    <div
                      className={`flex h-10 w-10 items-center justify-center rounded-lg ${card.color}`}
                    >
                      <Icon className="h-5 w-5" />
                    </div>
                    <div>
                      <p className="text-2xl font-bold">{value}</p>
                      <p className="text-xs text-gray-500">{card.label}</p>
                    </div>
                  </div>
                </div>
              );
            })}

            <div className="col-span-full rounded-xl border border-dashed border-gray-200 p-6 text-center">
              <p className="text-sm text-gray-400">
                Pipeline and Quick Capture features arrive in Week 2.
              </p>
            </div>
          </div>
        )}

        {tab === "members" && (
          <MembersTab
            workspaceId={workspaceId}
            role={role}
            currentUserId={currentUserId}
            members={members}
          />
        )}

        {tab === "settings" && (
          <SettingsTab
            workspaceId={workspaceId}
            role={role}
            members={members}
          />
        )}
      </div>
    </div>
  );
}
