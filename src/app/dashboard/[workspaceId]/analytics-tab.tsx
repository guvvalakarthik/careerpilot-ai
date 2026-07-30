"use client";

import {
  BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer,
  AreaChart, Area, Legend,
} from "recharts";
import { TrendingUp, Target, Award, Clock, BarChart3, Activity, Database } from "lucide-react";
import { api } from "@/trpc/react";

function StatCard({ icon: Icon, label, value, color }: { icon: typeof Target; label: string; value: string | number; color: string }) {
  return (
    <div className="rounded-xl border border-slate-200 bg-white p-4">
      <div className="flex items-center gap-2">
        <div className={"flex h-8 w-8 items-center justify-center rounded-lg " + color}>
          <Icon className="h-4 w-4" />
        </div>
        <div>
          <p className="text-xs text-slate-500">{label}</p>
          <p className="text-lg font-bold text-slate-900">{value}</p>
        </div>
      </div>
    </div>
  );
}

export function AnalyticsTab({ workspaceId }: { workspaceId: string }) {
  const { data: funnel, isLoading: funnelLoading } = api.analytics.funnel.useQuery({ workspaceId });
  const { data: rates, isLoading: ratesLoading } = api.analytics.rates.useQuery({ workspaceId });
  const { data: stageTime, isLoading: stageLoading } = api.analytics.avgTimePerStage.useQuery({ workspaceId });
  const { data: velocity, isLoading: velocityLoading } = api.analytics.velocity.useQuery({ workspaceId });
  const { data: operational } = api.analytics.operational.useQuery({ workspaceId });

  if (funnelLoading || ratesLoading) {
    return <div className="flex h-32 items-center justify-center text-sm text-slate-400">Loading analytics...</div>;
  }

  return (
    <div className="space-y-6">
      {/* Rate cards */}
      {rates && (
        <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
          <StatCard icon={Target} label="Response rate" value={rates.responseRate + "%"} color="bg-blue-50 text-blue-600" />
          <StatCard icon={TrendingUp} label="Interview rate" value={rates.interviewRate + "%"} color="bg-purple-50 text-purple-600" />
          <StatCard icon={Award} label="Offer rate" value={rates.offerRate + "%"} color="bg-green-50 text-green-600" />
          <StatCard icon={BarChart3} label="Total apps" value={rates.total} color="bg-slate-100 text-slate-600" />
        </div>
      )}

      {operational && (
        <section className="rounded-xl border border-slate-200 bg-white p-4" aria-labelledby="operational-metrics-heading">
          <div className="flex items-center justify-between gap-3">
            <div>
              <h3 id="operational-metrics-heading" className="text-sm font-semibold text-slate-700">
                Production evidence
              </h3>
              <p className="mt-1 text-xs text-slate-500">
                Tenant-scoped measurements from the last {operational.windowDays} days.
              </p>
            </div>
            <Activity className="h-5 w-5 text-teal-600" aria-hidden="true" />
          </div>
          <div className="mt-4 grid grid-cols-2 gap-3 lg:grid-cols-4">
            <StatCard icon={BarChart3} label="Tracked applications" value={operational.applications} color="bg-slate-100 text-slate-600" />
            <StatCard icon={Activity} label="AI success" value={operational.aiRuns ? `${operational.aiSuccessRate}%` : "No runs"} color="bg-emerald-50 text-emerald-700" />
            <StatCard icon={Clock} label="AI p95 latency" value={operational.aiP95LatencyMs === null ? "No runs" : `${operational.aiP95LatencyMs} ms`} color="bg-amber-50 text-amber-700" />
            <StatCard icon={Database} label="Indexed sources" value={operational.indexedSources} color="bg-cyan-50 text-cyan-700" />
          </div>
          {operational.failedSources > 0 && (
            <p className="mt-3 text-xs font-medium text-amber-700">
              {operational.failedSources} source{operational.failedSources === 1 ? "" : "s"} need re-indexing.
            </p>
          )}
        </section>
      )}

      {/* Funnel chart */}
      {funnel && funnel.length > 0 && (
        <div className="rounded-xl border border-slate-200 bg-white p-4">
          <h3 className="text-sm font-semibold text-slate-700">Application Funnel</h3>
          <div className="mt-4 h-64">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={funnel}>
                <CartesianGrid strokeDasharray="3 3" stroke="#e2e8f0" />
                <XAxis dataKey="stage" tick={{ fontSize: 10 }} angle={-20} textAnchor="end" height={60} />
                <YAxis allowDecimals={false} tick={{ fontSize: 11 }} />
                <Tooltip
                  contentStyle={{ borderRadius: "8px", border: "1px solid #e2e8f0", fontSize: "12px" }}
                />
                <Bar dataKey="count" fill="#3b82f6" radius={[4, 4, 0, 0]} />
              </BarChart>
            </ResponsiveContainer>
          </div>
        </div>
      )}

      {/* Velocity chart */}
      {velocity && !velocityLoading && (
        <div className="rounded-xl border border-slate-200 bg-white p-4">
          <h3 className="text-sm font-semibold text-slate-700">Pipeline Velocity (6 months)</h3>
          <div className="mt-4 h-64">
            <ResponsiveContainer width="100%" height="100%">
              <AreaChart data={velocity}>
                <defs>
                  <linearGradient id="captured" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%" stopColor="#3b82f6" stopOpacity={0.3} />
                    <stop offset="95%" stopColor="#3b82f6" stopOpacity={0} />
                  </linearGradient>
                  <linearGradient id="advanced" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%" stopColor="#8b5cf6" stopOpacity={0.3} />
                    <stop offset="95%" stopColor="#8b5cf6" stopOpacity={0} />
                  </linearGradient>
                </defs>
                <CartesianGrid strokeDasharray="3 3" stroke="#e2e8f0" />
                <XAxis dataKey="month" tick={{ fontSize: 11 }} />
                <YAxis allowDecimals={false} tick={{ fontSize: 11 }} />
                <Tooltip
                  contentStyle={{ borderRadius: "8px", border: "1px solid #e2e8f0", fontSize: "12px" }}
                />
                <Legend wrapperStyle={{ fontSize: "12px" }} />
                <Area type="monotone" dataKey="captured" stroke="#3b82f6" fill="url(#captured)" name="Captured" />
                <Area type="monotone" dataKey="advanced" stroke="#8b5cf6" fill="url(#advanced)" name="Advanced" />
              </AreaChart>
            </ResponsiveContainer>
          </div>
        </div>
      )}

      {/* Avg time per stage */}
      {stageTime && !stageLoading && stageTime.length > 0 && (
        <div className="rounded-xl border border-slate-200 bg-white p-4">
          <h3 className="flex items-center gap-1.5 text-sm font-semibold text-slate-700">
            <Clock className="h-4 w-4" />
            Avg Time Per Stage (days)
          </h3>
          <div className="mt-4 h-48">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={stageTime} layout="vertical">
                <CartesianGrid strokeDasharray="3 3" stroke="#e2e8f0" />
                <XAxis type="number" tick={{ fontSize: 11 }} />
                <YAxis type="category" dataKey="stage" tick={{ fontSize: 10 }} width={80} />
                <Tooltip
                  contentStyle={{ borderRadius: "8px", border: "1px solid #e2e8f0", fontSize: "12px" }}
                />
                <Bar dataKey="avgDays" fill="#f59e0b" radius={[0, 4, 4, 0]} />
              </BarChart>
            </ResponsiveContainer>
          </div>
        </div>
      )}

      {funnel && funnel.every((f) => f.count === 0) && (
        <div className="rounded-xl border border-dashed border-slate-300 bg-white p-12 text-center">
          <BarChart3 className="mx-auto h-8 w-8 text-slate-300" />
          <p className="mt-2 text-sm text-slate-500">No application data yet. Start capturing opportunities to see analytics.</p>
        </div>
      )}
    </div>
  );
}
