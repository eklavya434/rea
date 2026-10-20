import React, { useState } from "react";
import { useRouter } from "next/navigation";
import { formatDate } from "@/lib/utils";
import { AlertTriangle, Trash2 } from "lucide-react";

interface SettingsTabProps {
  project: any;
}

export function SettingsTab({ project }: SettingsTabProps) {
  const router = useRouter();
  const [confirmName, setConfirmName] = useState("");
  const [deleting, setDeleting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleDelete = async () => {
    if (confirmName !== project.name) return;
    try {
      setDeleting(true);
      setError(null);
      const res = await fetch(`/api/projects/${project.id}`, { method: "DELETE" });
      if (!res.ok) throw new Error("Delete failed");
      router.push("/dashboard");
    } catch (e: unknown) {
      setError(e instanceof Error ? e.message : "Failed to delete project");
      setDeleting(false);
    }
  };

  return (
    <div className="space-y-6">
      {/* Project Meta Information */}
      <div className="rounded-xl border border-surface-800 bg-surface-900 p-6 space-y-4">
        <h3 className="text-sm font-bold text-white border-b border-surface-800 pb-3">Project Metadata</h3>

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 text-xs">
          <div>
            <span className="font-mono text-slate-500 uppercase text-[10px] block">Project ID</span>
            <span className="font-mono text-slate-300">{project.id}</span>
          </div>
          <div>
            <span className="font-mono text-slate-500 uppercase text-[10px] block">Target Destination</span>
            <span className="font-mono text-slate-300">{project.targetUrl}</span>
          </div>
          <div>
            <span className="font-mono text-slate-500 uppercase text-[10px] block">Analysis Mode</span>
            <span className="font-mono text-slate-300">{project.analysisMode}</span>
          </div>
          <div>
            <span className="font-mono text-slate-500 uppercase text-[10px] block">Created Date</span>
            <span className="text-slate-300">{formatDate(project.createdAt)}</span>
          </div>
        </div>
      </div>

      {/* Danger Zone: Delete Project */}
      <div className="rounded-xl border border-rose-900/40 bg-rose-950/20 p-6 space-y-4">
        <div className="flex items-center gap-2 text-rose-400 font-semibold text-sm">
          <AlertTriangle className="h-4 w-4" />
          <span>Danger Zone: Permanent Deletion</span>
        </div>
        <p className="text-xs text-rose-300/80 leading-relaxed">
          Deleting this project permanently removes all associated pages, extracted features, sanitized evidence records, telemetry logs, and test assertions from the database.
        </p>

        {error && <div className="text-xs text-rose-400 font-mono">{error}</div>}

        <div className="pt-2 flex flex-col sm:flex-row items-stretch sm:items-center gap-3">
          <input
            type="text"
            placeholder={`Type "${project.name}" to confirm`}
            value={confirmName}
            onChange={(e) => setConfirmName(e.target.value)}
            className="rounded-lg border border-surface-800 bg-surface-950 px-3.5 py-2 text-xs text-slate-100 placeholder-slate-600 focus:outline-none focus:border-rose-500 font-mono"
          />
          <button
            onClick={handleDelete}
            disabled={confirmName !== project.name || deleting}
            className="flex items-center justify-center gap-2 rounded-lg bg-rose-600 px-4 py-2 text-xs font-semibold text-white hover:bg-rose-500 transition disabled:opacity-40"
          >
            <Trash2 className="h-4 w-4" />
            <span>{deleting ? "Deleting..." : "Permanently Delete Project"}</span>
          </button>
        </div>
      </div>
    </div>
  );
}
