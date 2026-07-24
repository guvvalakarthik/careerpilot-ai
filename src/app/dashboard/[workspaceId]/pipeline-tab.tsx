"use client";

import { useState } from "react";
import { Search, Filter, LayoutGrid, List } from "lucide-react";
import { api } from "@/trpc/react";
import { KanbanBoard } from "./kanban-board";
import { QuickCaptureModal } from "./quick-capture-modal";
import { ApplicationDetailDrawer } from "./application-detail-drawer";
import { EmptyState } from "@/components/empty-state";

export function PipelineTab({ workspaceId }: { workspaceId: string }) {
  const [selectedAppId, setSelectedAppId] = useState<string | null>(null);
  const [search, setSearch] = useState("");
  const [companyFilter, setCompanyFilter] = useState("");
  const [viewMode, setViewMode] = useState<"board" | "list">("board");

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
          <p className="hidden text-sm text-slate-500 sm:block">
            {isLoading ? "Loading..." : `${filteredCount} application${filteredCount !== 1 ? "s" : ""}`}
          </p>
          <div className="flex items-center gap-1 rounded-lg border border-slate-200 p-0.5">
            <button
              onClick={() => setViewMode("board")}
              className={"flex items-center justify-center rounded-md p-1.5 transition " + (viewMode === "board" ? "bg-slate-900 text-white" : "text-slate-500 hover:bg-slate-100")}
              title="Board view"
            >
              <LayoutGrid className="h-4 w-4" />
            </button>
            <button
              onClick={() => setViewMode("list")}
              className={"flex items-center justify-center rounded-md p-1.5 transition " + (viewMode === "list" ? "bg-slate-900 text-white" : "text-slate-500 hover:bg-slate-100")}
              title="List view"
            >
              <List className="h-4 w-4" />
            </button>
          </div>
          <QuickCaptureModal workspaceId={workspaceId} />
        </div>
      </div>

      {isLoading ? (
        <div className="flex h-64 items-center justify-center text-slate-400">
          Loading board...
        </div>
      ) : applications && applications.length > 0 ? (
        viewMode === "board" ? (
          <KanbanBoard
            workspaceId={workspaceId}
            applications={applications as never}
            onSelectApplication={(id) => setSelectedAppId(id)}
          />
        ) : (
          <div className="space-y-2">
            {(applications as never as Array<{
              id: string;
              stage: string;
              opportunity: { title: string | null; company: { name: string | null } | null; location: string | null };
              fitScore: number | null;
            }>).map((app) => (
              <button
                key={app.id}
                onClick={() => setSelectedAppId(app.id)}
                className="flex w-full items-center gap-3 rounded-lg border border-slate-200 bg-white p-3 text-left transition hover:border-slate-300 hover:shadow-sm"
              >
                <div className="min-w-0 flex-1">
                  <p className="truncate text-sm font-medium text-slate-900">
                    {app.opportunity.title ?? "Untitled"}
                  </p>
                  <p className="truncate text-xs text-slate-500">
                    {app.opportunity.company?.name ?? "Unknown"}
                    {app.opportunity.location ? ` - ${app.opportunity.location}` : ""}
                  </p>
                </div>
                <span className="flex-shrink-0 rounded-full bg-slate-100 px-2 py-0.5 text-xs font-medium text-slate-600">
                  {app.stage.replace(/_/g, " ").toLowerCase()}
                </span>
                {app.fitScore !== null && (
                  <span className="flex-shrink-0 text-xs font-medium text-blue-600">
                    {app.fitScore}%
                  </span>
                )}
              </button>
            ))}
          </div>
        )
      ) : (
        <EmptyState
          icon="pipeline"
          message={search || companyFilter
            ? "No applications match your filters."
            : "No applications yet. Use Quick Capture to add your first job opportunity."}
        />
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
