import React, { useState } from "react";
import { StatusBadge } from "@/components/StatusBadge";
import { formatDate } from "@/lib/utils";
import { Activity, ArrowRight, Play, RefreshCw, Terminal } from "lucide-react";

interface OverviewTabProps {
  project: any;
  onRefresh: () => void;
  onSelectTab: (tab: string) => void;
}

export function OverviewTab({ project, onRefresh, onSelectTab }: OverviewTabProps) {
  const [analyzing, setAnalyzing] = useState(false);
  const latestJob = project.jobs?.[0];
  const logs = latestJob?.logs ? JSON.parse(latestJob.logs) : [];

  const handleRunAnalysis = async () => {
    try {
      setAnalyzing(true);
      await fetch(`/api/projects/${project.id}/analyze`, { method: "POST" });
      onRefresh();
    } catch (e) {
      console.error(e);
    } finally {
      setAnalyzing(false);
    }
  };

  return (
    <div className="space-y-6">
      {/* Top Banner */}
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 rounded-xl border border-surface-800 bg-surface-900/60 p-5">
        <div>
          <div className="flex items-center gap-2 mb-1">
            <h2 className="text-lg font-bold text-white">{project.name}</h2>
            <StatusBadge status={project.status} size="sm" />
          </div>
          <p className="text-xs text-slate-400 font-mono">{project.targetUrl}</p>
        </div>

        <div className="flex items-center gap-3">
          <button
            onClick={onRefresh}
            className="flex items-center gap-1.5 rounded-lg border border-surface-800 bg-surface-900 px-3 py-2 text-xs font-medium text-slate-300 hover:bg-surface-800 transition"
          >
            <RefreshCw className="h-3.5 w-3.5" />
            <span>Refresh State</span>
          </button>
          <button
            onClick={handleRunAnalysis}
            disabled={analyzing || project.status === "ANALYZING"}
            className="flex items-center gap-1.5 rounded-lg bg-blue-600 px-4 py-2 text-xs font-semibold text-white hover:bg-blue-500 transition shadow disabled:opacity-50"
          >
            <Play className={`h-3.5 w-3.5 ${analyzing ? "animate-spin" : ""}`} />
            <span>{analyzing ? "Analyzing..." : "Re-Run X-Ray Pipeline"}</span>
          </button>
        </div>
      </div>

      {/* Metrics Row */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
        <div
          onClick={() => onSelectTab("pages")}
          className="cursor-pointer rounded-xl border border-surface-800 bg-surface-900 p-4 hover:border-surface-700 transition"
        >
          <div className="text-xs font-mono uppercase text-slate-400 mb-1">Pages Inspected</div>
          <div className="text-2xl font-bold text-white">{project.pages?.length || 0}</div>
          <span className="text-[11px] text-blue-400 mt-1 inline-flex items-center gap-1">
            Explore Pages <ArrowRight className="h-3 w-3" />
          </span>
        </div>

        <div
          onClick={() => onSelectTab("features")}
          className="cursor-pointer rounded-xl border border-surface-800 bg-surface-900 p-4 hover:border-surface-700 transition"
        >
          <div className="text-xs font-mono uppercase text-slate-400 mb-1">Discovered Features</div>
          <div className="text-2xl font-bold text-white">{project.features?.length || 0}</div>
          <span className="text-[11px] text-blue-400 mt-1 inline-flex items-center gap-1">
            View Features <ArrowRight className="h-3 w-3" />
          </span>
        </div>

        <div
          onClick={() => onSelectTab("evidence")}
          className="cursor-pointer rounded-xl border border-surface-800 bg-surface-900 p-4 hover:border-surface-700 transition"
        >
          <div className="text-xs font-mono uppercase text-slate-400 mb-1">Evidence Records</div>
          <div className="text-2xl font-bold text-white">{project.evidence?.length || 0}</div>
          <span className="text-[11px] text-blue-400 mt-1 inline-flex items-center gap-1">
            Review Evidence <ArrowRight className="h-3 w-3" />
          </span>
        </div>

        <div
          onClick={() => onSelectTab("tests")}
          className="cursor-pointer rounded-xl border border-surface-800 bg-surface-900 p-4 hover:border-surface-700 transition"
        >
          <div className="text-xs font-mono uppercase text-slate-400 mb-1">Test Assertions</div>
          <div className="text-2xl font-bold text-white">{project.testRuns?.length || 0}</div>
          <span className="text-[11px] text-blue-400 mt-1 inline-flex items-center gap-1">
            Run Tests <ArrowRight className="h-3 w-3" />
          </span>
        </div>
      </div>

      {/* Real-time Pipeline Execution Console */}
      <div className="rounded-xl border border-surface-800 bg-surface-900 overflow-hidden">
        <div className="flex items-center justify-between border-b border-surface-800 px-5 py-3.5 bg-surface-950/60 font-mono text-xs">
          <div className="flex items-center gap-2 text-slate-300">
            <Terminal className="h-4 w-4 text-blue-400" />
            <span>ANALYSIS PIPELINE TELEMETRY</span>
          </div>
          {latestJob && (
            <div className="flex items-center gap-3">
              <span className="text-slate-500">{formatDate(latestJob.startedAt)}</span>
              <StatusBadge status={latestJob.status} size="sm" />
            </div>
          )}
        </div>

        <div className="p-4 bg-surface-950 font-mono text-xs text-slate-300 space-y-2 max-h-64 overflow-y-auto">
          {logs.length === 0 ? (
            <p className="text-slate-600">No telemetry logged yet. Click &quot;Re-Run X-Ray Pipeline&quot; to inspect target.</p>
          ) : (
            logs.map((log: any, idx: number) => (
              <div key={idx} className="flex items-start gap-3">
                <span className="text-slate-600 text-[11px] flex-shrink-0">
                  {new Date(log.time).toLocaleTimeString()}
                </span>
                <span className="text-slate-300">{log.message}</span>
              </div>
            ))
          )}
        </div>
      </div>
    </div>
  );
}
