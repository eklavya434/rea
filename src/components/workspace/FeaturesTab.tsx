import React, { useState } from "react";
import { StatusBadge } from "@/components/StatusBadge";
import { CheckCircle2, ChevronRight, Code2, Eye, Filter, Search, Sparkles } from "lucide-react";

interface FeaturesTabProps {
  features: any[];
  onOpenImplementation: (featureId: string) => void;
  onOpenEvidence: (featureId: string) => void;
}

export function FeaturesTab({ features, onOpenImplementation, onOpenEvidence }: FeaturesTabProps) {
  const [filterCategory, setFilterCategory] = useState<string>("ALL");
  const [searchQuery, setSearchQuery] = useState("");

  const categories = ["ALL", ...Array.from(new Set(features.map((f) => f.category)))];

  const filtered = features.filter((f) => {
    const matchesCategory = filterCategory === "ALL" || f.category === filterCategory;
    const matchesQuery =
      searchQuery === "" ||
      f.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
      f.description.toLowerCase().includes(searchQuery.toLowerCase());
    return matchesCategory && matchesQuery;
  });

  if (!features || features.length === 0) {
    return (
      <div className="rounded-xl border border-surface-800 bg-surface-900 p-12 text-center">
        <Sparkles className="mx-auto h-8 w-8 text-slate-600 mb-3" />
        <h3 className="text-sm font-semibold text-slate-300">No features extracted yet</h3>
        <p className="text-xs text-slate-500 mt-1">Run an analysis job from the Overview tab to automatically extract features.</p>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Search and Filters */}
      <div className="flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-3">
        <div className="relative flex-1 max-w-md">
          <Search className="absolute left-3 top-2.5 h-4 w-4 text-slate-500" />
          <input
            type="text"
            placeholder="Search features..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="w-full rounded-lg border border-surface-800 bg-surface-950 pl-9 pr-4 py-2 text-xs text-slate-200 placeholder-slate-500 focus:outline-none focus:border-blue-500 transition font-mono"
          />
        </div>

        <div className="flex items-center gap-1.5 overflow-x-auto pb-1 sm:pb-0">
          {categories.map((cat) => (
            <button
              key={cat}
              onClick={() => setFilterCategory(cat)}
              className={`rounded-lg px-2.5 py-1.5 text-xs font-mono uppercase tracking-wider transition ${
                filterCategory === cat
                  ? "bg-blue-600 text-white font-semibold"
                  : "border border-surface-800 bg-surface-900 text-slate-400 hover:bg-surface-800"
              }`}
            >
              {cat}
            </button>
          ))}
        </div>
      </div>

      {/* Feature Cards Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        {filtered.map((f) => (
          <div
            key={f.id}
            className="rounded-xl border border-surface-800 bg-surface-900 p-5 flex flex-col justify-between shadow-sm hover:border-surface-700 transition"
          >
            <div>
              <div className="flex items-start justify-between gap-2 mb-2">
                <span className="text-xs font-mono px-2 py-0.5 rounded bg-surface-800 text-blue-400 border border-surface-700 uppercase">
                  {f.category}
                </span>
                <div className="flex items-center gap-2">
                  <span className="text-[11px] font-mono text-slate-500">Confidence:</span>
                  <StatusBadge status={f.confidence} size="sm" />
                </div>
              </div>

              <h3 className="text-sm font-bold text-white mb-1.5">{f.name}</h3>
              <p className="text-xs text-slate-300 leading-relaxed mb-3">{f.description}</p>

              <div className="rounded-lg bg-surface-950 p-3 border border-surface-850 space-y-2 mb-4 text-xs font-sans">
                <div>
                  <span className="text-[10px] font-mono uppercase text-slate-500 block">Observed Behaviour:</span>
                  <span className="text-slate-300">{f.observedBehaviour}</span>
                </div>
                {f.assumptions && (
                  <div>
                    <span className="text-[10px] font-mono uppercase text-amber-500/80 block">Assumptions / Uncertainty:</span>
                    <span className="text-slate-400 text-[11px]">{f.assumptions}</span>
                  </div>
                )}
              </div>
            </div>

            <div className="pt-3 border-t border-surface-800 flex items-center justify-between text-xs">
              <div className="flex items-center gap-2">
                <StatusBadge status={f.implementationStatus} size="sm" />
                <StatusBadge status={f.testStatus} size="sm" />
              </div>

              <div className="flex items-center gap-2">
                <button
                  onClick={() => onOpenEvidence(f.id)}
                  className="rounded border border-surface-700 bg-surface-800 px-2.5 py-1 text-[11px] font-medium text-slate-300 hover:text-white transition flex items-center gap-1"
                >
                  <Eye className="h-3 w-3" />
                  <span>Evidence ({f.evidence?.length || 0})</span>
                </button>
                <button
                  onClick={() => onOpenImplementation(f.id)}
                  className="rounded bg-blue-600 px-2.5 py-1 text-[11px] font-medium text-white hover:bg-blue-500 transition flex items-center gap-1"
                >
                  <Code2 className="h-3 w-3" />
                  <span>Implement</span>
                </button>
              </div>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
