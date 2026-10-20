import React, { useState } from "react";
import { StatusBadge } from "@/components/StatusBadge";
import { formatDate } from "@/lib/utils";
import { ExternalLink, Eye, Globe, Image as ImageIcon, Layers } from "lucide-react";

interface PagesTabProps {
  pages: any[];
  onSelectEvidence: (pageId: string) => void;
}

export function PagesTab({ pages, onSelectEvidence }: PagesTabProps) {
  const [selectedPage, setSelectedPage] = useState<any | null>(pages[0] || null);

  if (!pages || pages.length === 0) {
    return (
      <div className="rounded-xl border border-surface-800 bg-surface-900 p-12 text-center">
        <Globe className="mx-auto h-8 w-8 text-slate-600 mb-3" />
        <h3 className="text-sm font-semibold text-slate-300">No pages inspected yet</h3>
        <p className="text-xs text-slate-500 mt-1">Run an analysis job from the Overview tab to inspect target pages.</p>
      </div>
    );
  }

  const activePage = selectedPage || pages[0];

  return (
    <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
      {/* Pages List */}
      <div className="space-y-3">
        <h3 className="text-xs font-mono uppercase text-slate-400 tracking-wider">Collected Pages ({pages.length})</h3>
        <div className="space-y-2">
          {pages.map((p) => {
            const isSelected = activePage?.id === p.id;
            return (
              <div
                key={p.id}
                onClick={() => setSelectedPage(p)}
                className={`cursor-pointer rounded-xl border p-4 transition ${
                  isSelected
                    ? "border-blue-500 bg-blue-950/20 text-white shadow"
                    : "border-surface-800 bg-surface-900/60 text-slate-400 hover:border-surface-700"
                }`}
              >
                <div className="flex items-center justify-between gap-2 mb-1">
                  <span className="text-xs font-semibold text-slate-200 truncate">{p.title || "Untitled Page"}</span>
                  <StatusBadge status={p.inspectionStatus} size="sm" />
                </div>
                <p className="text-[11px] font-mono text-slate-500 truncate">{p.url}</p>
                <div className="mt-3 flex items-center justify-between text-[11px] text-slate-500">
                  <span>{p.viewport || "1280x800"}</span>
                  <span>{formatDate(p.inspectedAt)}</span>
                </div>
              </div>
            );
          })}
        </div>
      </div>

      {/* Selected Page Details Pane */}
      <div className="md:col-span-2 space-y-4">
        {activePage && (
          <div className="rounded-xl border border-surface-800 bg-surface-900 p-6 space-y-6">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b border-surface-800 pb-4">
              <div>
                <h2 className="text-base font-bold text-white">{activePage.title || "Target Page"}</h2>
                <a
                  href={activePage.url}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="text-xs font-mono text-blue-400 hover:underline flex items-center gap-1 mt-0.5"
                >
                  <span>{activePage.url}</span>
                  <ExternalLink className="h-3 w-3" />
                </a>
              </div>
              <StatusBadge status={activePage.inspectionStatus} />
            </div>

            {/* Viewport & Metadata details */}
            <div className="grid grid-cols-2 sm:grid-cols-3 gap-3 text-xs">
              <div className="rounded-lg bg-surface-950 p-3 border border-surface-800">
                <span className="text-slate-500 block font-mono text-[10px] uppercase">Viewport</span>
                <span className="text-slate-200 font-semibold">{activePage.viewport || "1280x800"}</span>
              </div>
              <div className="rounded-lg bg-surface-950 p-3 border border-surface-800">
                <span className="text-slate-500 block font-mono text-[10px] uppercase">Inspected At</span>
                <span className="text-slate-200 font-semibold">{formatDate(activePage.inspectedAt)}</span>
              </div>
              <div className="rounded-lg bg-surface-950 p-3 border border-surface-800">
                <span className="text-slate-500 block font-mono text-[10px] uppercase">Evidence Link</span>
                <button
                  onClick={() => onSelectEvidence(activePage.id)}
                  className="text-blue-400 hover:underline font-semibold flex items-center gap-1"
                >
                  <Eye className="h-3 w-3" /> View Evidence
                </button>
              </div>
            </div>

            {/* Screenshot Preview */}
            <div>
              <h4 className="text-xs font-mono uppercase text-slate-400 mb-2 flex items-center gap-1.5">
                <ImageIcon className="h-3.5 w-3.5 text-blue-400" />
                <span>Captured Viewport State</span>
              </h4>
              {activePage.screenshotPath ? (
                <div className="rounded-lg border border-surface-800 bg-surface-950 overflow-hidden">
                  <img
                    src={activePage.screenshotPath}
                    alt={activePage.title || "Page capture"}
                    className="w-full object-contain max-h-96"
                  />
                </div>
              ) : (
                <div className="rounded-lg border border-surface-800 bg-surface-950/60 p-6 text-center text-xs text-slate-500 font-mono">
                  No visual screenshot snapshot generated. (Resilient DOM snapshot recorded).
                </div>
              )}
            </div>

            {activePage.errorSummary && (
              <div className="rounded-lg border border-rose-900/40 bg-rose-950/20 p-4 text-xs text-rose-300 font-mono">
                <span className="font-semibold block mb-1">Observation Limitation / Error:</span>
                {activePage.errorSummary}
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  );
}
