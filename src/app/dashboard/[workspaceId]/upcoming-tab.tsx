"use client";

import { Calendar, CheckCircle2, Clock, Building2, AlertCircle } from "lucide-react";
import { api } from "@/trpc/react";

type Interview = {
  id: string;
  type: string;
  scheduledAt: Date;
  durationMins: number;
  interviewer: string | null;
  outcome: string;
  application: {
    id: string;
    opportunity: {
      title: string | null;
      company: { name: string } | null;
    };
  };
};

type Task = {
  id: string;
  title: string;
  status: string;
  dueAt: Date | null;
  application: {
    id: string;
    opportunity: {
      title: string | null;
      company: { name: string } | null;
    };
  } | null;
};

function isOverdue(date: Date | null): boolean {
  if (!date) return false;
  return new Date(date).getTime() < Date.now();
}

function formatDate(date: Date | string): string {
  return new Date(date).toLocaleDateString(undefined, { weekday: "short", month: "short", day: "numeric" });
}

function formatTime(date: Date | string): string {
  return new Date(date).toLocaleTimeString(undefined, { hour: "numeric", minute: "2-digit" });
}

export function UpcomingTab({ workspaceId }: { workspaceId: string }) {
  const { data: interviews, isLoading: ivLoading } = api.interview.list.useQuery({
    workspaceId,
    upcoming: true,
  });

  const { data: tasks, isLoading: taskLoading } = api.task.list.useQuery({
    workspaceId,
    upcoming: true,
  });

  const isLoading = ivLoading || taskLoading;

  const upcomingInterviews = (interviews ?? []) as unknown as Interview[];
  const upcomingTasks = (tasks ?? []) as unknown as Task[];

  const overdueTasks = upcomingTasks.filter((t) => isOverdue(t.dueAt));
  const dueTasks = upcomingTasks.filter((t) => !isOverdue(t.dueAt));

  return (
    <div>
      {isLoading ? (
        <div className="flex h-32 items-center justify-center text-sm text-slate-400">Loading upcoming items...</div>
      ) : upcomingInterviews.length === 0 && upcomingTasks.length === 0 ? (
        <div className="rounded-xl border border-dashed border-slate-300 bg-white p-12 text-center">
          <p className="text-sm text-slate-500">
            No upcoming interviews or task deadlines. You&apos;re all caught up!
          </p>
        </div>
      ) : (
        <div className="space-y-6">
          {/* Overdue tasks alert */}
          {overdueTasks.length > 0 && (
            <div className="rounded-xl border border-red-200 bg-red-50 p-4">
              <h3 className="flex items-center gap-1.5 text-sm font-semibold text-red-700">
                <AlertCircle className="h-4 w-4" />
                {overdueTasks.length} overdue task{overdueTasks.length !== 1 ? "s" : ""}
              </h3>
              <div className="mt-2 space-y-1.5">
                {overdueTasks.map((t) => (
                  <div key={t.id} className="flex items-center gap-2 text-xs text-red-600">
                    <Clock className="h-3 w-3" />
                    <span className="font-medium">{t.title}</span>
                    {t.dueAt && <span>was due {formatDate(t.dueAt)}</span>}
                    {t.application?.opportunity && (
                      <span className="text-red-400">
                        - {t.application.opportunity.title ?? "Untitled"}
                      </span>
                    )}
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Upcoming interviews */}
          {upcomingInterviews.length > 0 && (
            <div>
              <h3 className="flex items-center gap-1.5 text-sm font-semibold text-slate-700">
                <Calendar className="h-4 w-4 text-purple-600" />
                Upcoming Interviews
              </h3>
              <div className="mt-3 space-y-2">
                {upcomingInterviews.map((iv) => (
                  <div key={iv.id} className="flex items-center gap-3 rounded-xl border border-slate-200 bg-white p-3">
                    <div className="flex h-12 w-12 flex-shrink-0 flex-col items-center justify-center rounded-lg bg-purple-50">
                      <span className="text-xs font-bold text-purple-700">
                        {new Date(iv.scheduledAt).getDate()}
                      </span>
                      <span className="text-xs text-purple-500">
                        {new Date(iv.scheduledAt).toLocaleDateString(undefined, { month: "short" })}
                      </span>
                    </div>
                    <div className="min-w-0 flex-1">
                      <p className="truncate text-sm font-medium text-slate-900">
                        {iv.type.replace(/_/g, " ")}
                      </p>
                      <p className="truncate text-xs text-slate-500">
                        {iv.application.opportunity.title ?? "Untitled role"}
                        {iv.application.opportunity.company && (
                          <span className="flex items-center gap-0.5">
                            <Building2 className="h-3 w-3" />
                            {iv.application.opportunity.company.name}
                          </span>
                        )}
                      </p>
                    </div>
                    <div className="flex-shrink-0 text-right text-xs text-slate-500">
                      <p>{formatTime(iv.scheduledAt)}</p>
                      <p>{iv.durationMins}min</p>
                    </div>
                    {iv.interviewer && (
                      <div className="flex-shrink-0 text-xs text-slate-400">
                        with {iv.interviewer}
                      </div>
                    )}
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Upcoming task deadlines */}
          {dueTasks.length > 0 && (
            <div>
              <h3 className="flex items-center gap-1.5 text-sm font-semibold text-slate-700">
                <CheckCircle2 className="h-4 w-4 text-blue-600" />
                Task Deadlines
              </h3>
              <div className="mt-3 space-y-2">
                {dueTasks.map((t) => (
                  <div key={t.id} className="flex items-center gap-3 rounded-xl border border-slate-200 bg-white p-3">
                    <div className="flex h-12 w-12 flex-shrink-0 flex-col items-center justify-center rounded-lg bg-blue-50">
                      <span className="text-xs font-bold text-blue-700">
                        {t.dueAt ? new Date(t.dueAt).getDate() : "-"}
                      </span>
                      <span className="text-xs text-blue-500">
                        {t.dueAt ? new Date(t.dueAt).toLocaleDateString(undefined, { month: "short" }) : ""}
                      </span>
                    </div>
                    <div className="min-w-0 flex-1">
                      <p className="truncate text-sm font-medium text-slate-900">{t.title}</p>
                      {t.application?.opportunity && (
                        <p className="truncate text-xs text-slate-500">
                          {t.application.opportunity.title ?? "Untitled role"}
                          {t.application.opportunity.company && (
                            <span className="flex items-center gap-0.5">
                              <Building2 className="h-3 w-3" />
                              {t.application.opportunity.company.name}
                            </span>
                          )}
                        </p>
                      )}
                    </div>
                    <div className="flex-shrink-0 text-xs text-slate-500">
                      {t.dueAt && <p>{formatTime(t.dueAt)}</p>}
                      <span className={"rounded px-1.5 py-0.5 " + (t.status === "IN_PROGRESS" ? "bg-amber-50 text-amber-600" : "bg-slate-100 text-slate-500")}>
                        {t.status.replace(/_/g, " ").toLowerCase()}
                      </span>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>
      )}
    </div>
  );
}
