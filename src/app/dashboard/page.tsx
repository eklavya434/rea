"use client";

import React, { useEffect, useState } from "react";
import Link from "next/link";
import {
  Activity,
  ArrowRight,
  CheckCircle2,
  Clock,
  Cpu,
  Layers,
  PlusCircle,
  Radio,
  RefreshCw,
  Search,
  Server,
  Terminal,
  XCircle,
} from "lucide-react";
import { StatusBadge } from "@/components/StatusBadge";
import { formatDate, formatUrl } from "@/lib/utils";

interface DashboardData {
  metrics: {
    totalProjects: number;
    totalJobs: number;
    completedJobs: number;
    runningJobs: number;
    failedJobs: number;
  };
  recentProjects: Array<{
    id: string;
    name: string;
    targetUrl: string;
    analysisMode: string;
    status: string;
    createdAt: string;
    _count: {
      pages: number;
      features: number;
    };
  }>;
  rea: {
    configured: boolean;
    connected: boolean;
    tools: Array<{ name: string; description?: string }>;
    error?: string;
  };
  ai: {
    configured: boolean;
    provider: string;
    modelName: string;
  };
}

export default function DashboardPage() {
  const [data, setData] = useState<DashboardData | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const fetchDashboardData = async () => {
    try {
      setLoading(true);
      setError(null);
      const res = await fetch("/api/projects/meta");
      if (!res.ok) throw new Error(`HTTP ${res.status}`);
      const json = await res.json();
      setData(json);
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : "Failed to load dashboard data");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchDashboardData();
  }, []);

  return (
    <div className="mx-auto max-w-7xl px-4 py-8 sm:px-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 mb-8">
        <div>
          <h1 className="text-2xl font-bold tracking-tight text-white flex items-center gap-2">
            <Layers className="h-6 w-6 text-blue-500" />
            Audit Console & Dashboard
          </h1>
          <p className="text-sm text-slate-400 mt-1">
            Real-time telemetry, persistent projects, and inspection subsystem health
          </p>
        </div>

        <div className="flex items-center gap-3">
          <button
            onClick={fetchDashboardData}
            disabled={loading}
            className="flex items-center gap-1.5 rounded-lg border border-surface-800 bg-surface-900 px-3 py-2 text-xs font-medium text-slate-300 hover:bg-surface-800 transition disabled:opacity-50"
          >
            <RefreshCw className={`h-3.5 w-3.5 ${loading ? "animate-spin" : ""}`} />
            <span>Refresh</span>
          </button>
          <Link
            href="/projects/new"
            className="flex items-center gap-2 rounded-lg bg-blue-600 px-4 py-2 text-xs font-semibold text-white hover:bg-blue-500 transition shadow"
          >
            <PlusCircle className="h-4 w-4" />
            <span>New Analysis</span>
          </Link>
        </div>
      </div>

      {/* Integration Status Cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-8">
        {/* REA MCP Status Card */}
        <div className="rounded-xl border border-surface-800 bg-surface-900/60 p-5">
          <div className="flex items-start justify-between">
            <div className="flex items-center gap-3">
              <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-surface-800 text-blue-400">
                <Terminal className="h-5 w-5" />
              </div>
              <div>
                <h3 className="text-sm font-semibold text-white">REA MCP Integration</h3>
                <span className="text-xs text-slate-400 font-mono">Model Context Protocol</span>
              </div>
            </div>
            <StatusBadge status={data?.rea?.connected ? "ACTIVE" : "OFFLINE_FALLBACK"} size="sm" />
          </div>

          <div className="mt-4 border-t border-surface-800/80 pt-3">
            {data?.rea?.connected ? (
              <div className="text-xs text-emerald-400 space-y-1">
                <p className="font-semibold">Connected to REA Server</p>
                <p className="text-slate-400 font-mono">
                  {data.rea.tools.length} discovered tools ready: {data.rea.tools.map((t) => t.name).join(", ")}
                </p>
              </div>
            ) : (
              <div className="text-xs text-slate-400 space-y-1">
                <p className="text-slate-300">Standalone Browser & Heuristic Mode Active</p>
                <p className="text-slate-500 leading-relaxed">
                  {data?.rea?.error || "REA MCP server is not currently attached. All website interface inspection workflows remain fully operational."}
                </p>
              </div>
            )}
          </div>
        </div>

        {/* AI Provider Status Card */}
        <div className="rounded-xl border border-surface-800 bg-surface-900/60 p-5">
          <div className="flex items-start justify-between">
            <div className="flex items-center gap-3">
              <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-surface-800 text-cyan-400">
                <Cpu className="h-5 w-5" />
              </div>
              <div>
                <h3 className="text-sm font-semibold text-white">AI Provider Engine</h3>
                <span className="text-xs text-slate-400 font-mono">Structured Feature Extraction</span>
              </div>
            </div>
            <StatusBadge status={data?.ai?.configured ? "ACTIVE" : "FALLBACK"} size="sm" />
          </div>

          <div className="mt-4 border-t border-surface-800/80 pt-3">
            <div className="text-xs text-slate-400 space-y-1">
              <p className="text-slate-200 font-medium">Provider: <span className="text-blue-400 font-mono uppercase">{data?.ai?.provider || "Loading..."}</span></p>
              <p className="text-slate-400 font-mono text-[11px]">{data?.ai?.modelName || "Zero-API Heuristics"}</p>
            </div>
          </div>
        </div>
      </div>

      {/* Metrics Row */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-4 mb-8">
        <div className="rounded-xl border border-surface-800 bg-surface-900 p-4">
          <div className="text-xs font-mono uppercase text-slate-400 mb-1">Total Projects</div>
          <div className="text-2xl font-bold text-white">{data?.metrics?.totalProjects ?? 0}</div>
        </div>
        <div className="rounded-xl border border-surface-800 bg-surface-900 p-4">
          <div className="text-xs font-mono uppercase text-emerald-400 mb-1">Completed Jobs</div>
          <div className="text-2xl font-bold text-white">{data?.metrics?.completedJobs ?? 0}</div>
        </div>
        <div className="rounded-xl border border-surface-800 bg-surface-900 p-4">
          <div className="text-xs font-mono uppercase text-blue-400 mb-1">Running Jobs</div>
          <div className="text-2xl font-bold text-white">{data?.metrics?.runningJobs ?? 0}</div>
        </div>
        <div className="rounded-xl border border-surface-800 bg-surface-900 p-4">
          <div className="text-xs font-mono uppercase text-rose-400 mb-1">Failed Jobs</div>
          <div className="text-2xl font-bold text-white">{data?.metrics?.failedJobs ?? 0}</div>
        </div>
      </div>

      {/* Projects Table */}
      <div className="rounded-xl border border-surface-800 bg-surface-900 overflow-hidden shadow">
        <div className="flex items-center justify-between border-b border-surface-800 px-6 py-4">
          <div>
            <h2 className="text-base font-semibold text-white">Saved Projects</h2>
            <p className="text-xs text-slate-400">Stored in database with full evidence trails</p>
          </div>
        </div>

        {loading ? (
          <div className="p-12 text-center text-sm text-slate-500">Loading audit records...</div>
        ) : error ? (
          <div className="p-8 text-center text-sm text-rose-400">{error}</div>
        ) : !data?.recentProjects || data.recentProjects.length === 0 ? (
          <div className="p-12 text-center">
            <Radio className="mx-auto h-8 w-8 text-slate-600 mb-3" />
            <h3 className="text-sm font-medium text-slate-300">No projects recorded yet</h3>
            <p className="text-xs text-slate-500 mt-1 mb-4">Start by auditing a public website you have authorization to inspect.</p>
            <Link
              href="/projects/new"
              className="inline-flex items-center gap-1.5 rounded-lg bg-blue-600 px-4 py-2 text-xs font-medium text-white hover:bg-blue-500 transition"
            >
              <PlusCircle className="h-3.5 w-3.5" />
              Create First Project
            </Link>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs">
              <thead className="border-b border-surface-800 bg-surface-950/50 font-mono uppercase text-slate-400">
                <tr>
                  <th className="px-6 py-3">Project</th>
                  <th className="px-6 py-3">Target URL</th>
                  <th className="px-6 py-3">Mode</th>
                  <th className="px-6 py-3">Status</th>
                  <th className="px-6 py-3">Discovered</th>
                  <th className="px-6 py-3">Created</th>
                  <th className="px-6 py-3 text-right">Action</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-surface-800/60 font-sans">
                {data.recentProjects.map((p) => (
                  <tr key={p.id} className="hover:bg-surface-800/40 transition">
                    <td className="px-6 py-3.5 font-medium text-white">
                      <Link href={`/projects/${p.id}`} className="hover:text-blue-400 transition">
                        {p.name}
                      </Link>
                    </td>
                    <td className="px-6 py-3.5 font-mono text-slate-300">
                      {formatUrl(p.targetUrl)}
                    </td>
                    <td className="px-6 py-3.5 font-mono text-slate-400">
                      {p.analysisMode}
                    </td>
                    <td className="px-6 py-3.5">
                      <StatusBadge status={p.status} size="sm" />
                    </td>
                    <td className="px-6 py-3.5 text-slate-400 font-mono">
                      {p._count.features} feats &bull; {p._count.pages} pages
                    </td>
                    <td className="px-6 py-3.5 text-slate-500">
                      {formatDate(p.createdAt)}
                    </td>
                    <td className="px-6 py-3.5 text-right">
                      <Link
                        href={`/projects/${p.id}`}
                        className="inline-flex items-center gap-1 rounded border border-surface-700 bg-surface-800 px-2.5 py-1 text-[11px] font-medium text-blue-400 hover:bg-surface-700 hover:text-blue-300 transition"
                      >
                        <span>Workspace</span>
                        <ArrowRight className="h-3 w-3" />
                      </Link>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  );
}
