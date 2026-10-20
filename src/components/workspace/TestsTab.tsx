import React, { useState } from "react";
import { CheckCircle2, ChevronRight, Eye, Play, Sliders, XCircle } from "lucide-react";
import { StatusBadge } from "@/components/StatusBadge";
import { formatDate } from "@/lib/utils";

interface TestsTabProps {
  project: any;
  onRefresh: () => void;
}

export function TestsTab({ project, onRefresh }: TestsTabProps) {
  const features = project.features || [];
  const pages = project.pages || [];
  const referencePage = pages.find((p: any) => p.screenshotPath) || pages[0];

  const [opacity, setOpacity] = useState<number>(50);
  const [activeFeatureId, setActiveFeatureId] = useState<string>(features[0]?.id || "");
  const [updatingId, setUpdatingId] = useState<string | null>(null);

  const activeFeature = features.find((f: any) => f.id === activeFeatureId) || features[0];

  const handleUpdateTestStatus = async (status: "PASSED" | "FAILED" | "BLOCKED") => {
    if (!activeFeature) return;
    try {
      setUpdatingId(activeFeature.id);
      await fetch(`/api/features/${activeFeature.id}/test`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ status }),
      });
      onRefresh();
    } catch (e) {
      console.error(e);
    } finally {
      setUpdatingId(null);
    }
  };

  return (
    <div className="space-y-8">
      {/* Visual Comparison Section */}
      <div className="rounded-xl border border-surface-800 bg-surface-900 p-6 space-y-5">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-surface-800 pb-4">
          <div>
            <h3 className="text-sm font-bold text-white flex items-center gap-2">
              <Eye className="h-4 w-4 text-blue-400" />
              Visual Screenshot Comparison Studio
            </h3>
            <p className="text-xs text-slate-400 mt-0.5">
              Side-by-side and overlaid opacity inspection between original reference and local implementation
            </p>
          </div>

          <div className="flex items-center gap-3 bg-surface-950 px-3.5 py-1.5 rounded-lg border border-surface-800">
            <Sliders className="h-3.5 w-3.5 text-slate-400" />
            <span className="text-xs font-mono text-slate-400">Overlay Opacity: {opacity}%</span>
            <input
              type="range"
              min="0"
              max="100"
              value={opacity}
              onChange={(e) => setOpacity(Number(e.target.value))}
              className="h-1.5 w-24 accent-blue-500 cursor-pointer"
            />
          </div>
        </div>

        {referencePage?.screenshotPath ? (
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            {/* Original Reference */}
            <div className="space-y-2">
              <div className="flex items-center justify-between text-xs font-mono text-slate-400">
                <span className="text-blue-400 font-semibold">1. Original Reference Target</span>
                <span>{referencePage.viewport || "1280x800"}</span>
              </div>
              <div className="rounded-lg border border-surface-800 bg-surface-950 p-2 flex items-center justify-center">
                <img
                  src={referencePage.screenshotPath}
                  alt="Original Reference"
                  className="rounded max-h-72 object-contain w-full"
                />
              </div>
              <div className="text-[11px] font-mono text-slate-500">
                Captured: {formatDate(referencePage.inspectedAt)}
              </div>
            </div>

            {/* Overlaid Implementation Preview */}
            <div className="space-y-2">
              <div className="flex items-center justify-between text-xs font-mono text-slate-400">
                <span className="text-emerald-400 font-semibold">2. Implementation Comparison Overlay</span>
                <span>Opacity Blend: {opacity}%</span>
              </div>
              <div className="relative rounded-lg border border-surface-800 bg-surface-950 p-2 flex items-center justify-center overflow-hidden max-h-72">
                <img
                  src={referencePage.screenshotPath}
                  alt="Base"
                  className="rounded object-contain w-full filter contrast-125"
                />
                <div
                  className="absolute inset-2 flex items-center justify-center bg-blue-900/40 backdrop-blur-[1px] pointer-events-none"
                  style={{ opacity: opacity / 100 }}
                >
                  <span className="font-mono text-xs text-white bg-surface-950/80 px-3 py-1 rounded border border-blue-500">
                    Active Overlay &bull; {opacity}%
                  </span>
                </div>
              </div>
              <div className="text-[11px] font-mono text-slate-500">
                Measurement method: Visual layer registration (0% to 100% overlay blend).
              </div>
            </div>
          </div>
        ) : (
          <div className="rounded-lg border border-surface-800 bg-surface-950 p-8 text-center text-xs text-slate-500 font-mono">
            No reference viewport screenshot available for visual comparison.
          </div>
        )}
      </div>

      {/* Behavioural Verification Checklist */}
      <div className="rounded-xl border border-surface-800 bg-surface-900 p-6 space-y-4">
        <div className="border-b border-surface-800 pb-3">
          <h3 className="text-sm font-bold text-white flex items-center gap-2">
            <CheckCircle2 className="h-4 w-4 text-emerald-400" />
            Behavioural Verification Checklist
          </h3>
          <p className="text-xs text-slate-400 mt-0.5">
            Record pass, fail, or blocked verification outcomes for each extracted feature
          </p>
        </div>

        <div className="divide-y divide-surface-800/80">
          {features.map((f: any) => (
            <div key={f.id} className="py-4 flex flex-col sm:flex-row sm:items-center justify-between gap-4">
              <div className="space-y-1">
                <div className="flex items-center gap-2">
                  <span className="text-xs font-semibold text-white">{f.name}</span>
                  <span className="text-[10px] font-mono text-blue-400 uppercase">{f.category}</span>
                </div>
                <p className="text-xs text-slate-400">{f.observedBehaviour}</p>
              </div>

              <div className="flex items-center gap-2 flex-shrink-0">
                <StatusBadge status={f.testStatus} size="sm" />

                <button
                  onClick={() => {
                    setActiveFeatureId(f.id);
                    handleUpdateTestStatus("PASSED");
                  }}
                  disabled={updatingId === f.id}
                  className="rounded border border-emerald-800/60 bg-emerald-950/40 px-2.5 py-1 text-[11px] font-medium text-emerald-300 hover:bg-emerald-900/60 transition"
                >
                  Pass
                </button>
                <button
                  onClick={() => {
                    setActiveFeatureId(f.id);
                    handleUpdateTestStatus("FAILED");
                  }}
                  disabled={updatingId === f.id}
                  className="rounded border border-rose-800/60 bg-rose-950/40 px-2.5 py-1 text-[11px] font-medium text-rose-300 hover:bg-rose-900/60 transition"
                >
                  Fail
                </button>
                <button
                  onClick={() => {
                    setActiveFeatureId(f.id);
                    handleUpdateTestStatus("BLOCKED");
                  }}
                  disabled={updatingId === f.id}
                  className="rounded border border-amber-800/60 bg-amber-950/40 px-2.5 py-1 text-[11px] font-medium text-amber-300 hover:bg-amber-900/60 transition"
                >
                  Blocked
                </button>
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
