"use client";

import { useState } from "react";
import { Search, Filter } from "lucide-react";
import { api } from "@/trpc/react";
import { KanbanBoard } from "./kanban-board";
import { QuickCaptureModal } from "./quick-capture-modal";
import { ApplicationDetailDrawer } from "./application-detail-drawer";

export function PipelineTab({ workspaceId }: { workspaceId: string }) {
  const [selectedAppId, setSelectedAppId] = useState<string | null>(null);
  const [search, setSearch] = useState("");
  const [companyFilter, setCompanyFilter] = useState("");

  const { data: applications, isLoading } = api.application.list.useQuery({
    workspaceId,
    search: search || undefined,
    companyId: companyFilter || undefined,
  });

  const { data: companies } = api.company.list.useQuery({ workspaceId });

  const filteredCount = applications?.length ?? 0;

  return (
    <div>
      {/* Search & Filter Bar */}
      <div className="mb-4 flex flex-wrap items-center gap-3">
        <div className="relative min-w-[200px] flex-1">
          <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />
          <input
            type="text"
            placeholder="Search by title, company, or location..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="w-full rounded-lg border border-slate-300 py-2 pl-9 pr-3 text-sm transition focus:border-slate-900 focus:outline-none focus:ring-1 focus:ring-slate-900"
          />
        </div>
        <div className="flex items-center gap-2">
          <Filter className="h-4 w-4 text-slate-400" />
          <select
            value={companyFilter}
            onChange={(e) => setCompanyFilter(e.target.value)}
            className="rounded-lg border border-slate-300 px-3 py-2 text-sm transition focus:border-slate-900 focus:outline-none focus:ring-1 focus:ring-slate-900"
          >
            <option value="">All companies</option>
            {companies?.map((c: { id: string; name: string }) => (
              <option key={c.id} value={c.id}>{c.name}</option>
            ))}
          </select>
        </div>
        <div className="ml-auto flex items-center gap-3">
          <p className="text-sm text-slate-500">
            {isLoading ? "Loading..." : `${filteredCount} application${filteredCount !== 1 ? "s" : ""}`}
          </p>
          <QuickCaptureModal workspaceId={workspaceId} />
        </div>
      </div>

      {isLoading ? (
        <div className="flex h-64 items-center justify-center text-slate-400">
          Loading board...
        </div>
      ) : applications && applications.length > 0 ? (
        <KanbanBoard
          workspaceId={workspaceId}
          applications={applications as never}
          onSelectApplication={(id) => setSelectedAppId(id)}
        />
      ) : (
        <div className="rounded-xl border border-dashed border-slate-300 bg-white p-12 text-center">
          <p className="text-sm text-slate-500">
            {search || companyFilter
              ? "No applications match your filters."
              : "No applications yet. Use Quick Capture to add your first job opportunity."}
          </p>
        </div>
      )}

      {selectedAppId && (
        <ApplicationDetailDrawer
          workspaceId={workspaceId}
          applicationId={selectedAppId}
          onClose={() => setSelectedAppId(null)}
        />
      )}
    </div>
  );
}
