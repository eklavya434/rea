import React, { useState } from "react";
import { StatusBadge } from "@/components/StatusBadge";
import { formatDate } from "@/lib/utils";
import { Code, Eye, FileText, Image as ImageIcon, Shield, Terminal } from "lucide-react";

interface EvidenceTabProps {
  evidence: any[];
}

export function EvidenceTab({ evidence }: EvidenceTabProps) {
  const [filterType, setFilterType] = useState<string>("ALL");
  const [selectedRecord, setSelectedRecord] = useState<any | null>(evidence[0] || null);

  const types = ["ALL", ...Array.from(new Set(evidence.map((e) => e.sourceType)))];

  const filtered = evidence.filter((e) => filterType === "ALL" || e.sourceType === filterType);
  const activeRecord = selectedRecord || filtered[0] || null;

  if (!evidence || evidence.length === 0) {
    return (
      <div className="rounded-xl border border-surface-800 bg-surface-900 p-12 text-center">
        <Shield className="mx-auto h-8 w-8 text-slate-600 mb-3" />
        <h3 className="text-sm font-semibold text-slate-300">No evidence collected</h3>
        <p className="text-xs text-slate-500 mt-1">Run an analysis pipeline to collect sanitized DOM excerpts and screenshots.</p>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Type Filters */}
      <div className="flex items-center gap-1.5 overflow-x-auto pb-1">
        {types.map((t) => (
          <button
            key={t}
            onClick={() => setFilterType(t)}
            className={`rounded-lg px-2.5 py-1.5 text-xs font-mono uppercase tracking-wider transition ${
              filterType === t
                ? "bg-blue-600 text-white font-semibold"
                : "border border-surface-800 bg-surface-900 text-slate-400 hover:bg-surface-800"
            }`}
          >
            {t}
          </button>
        ))}
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        {/* Evidence List */}
        <div className="space-y-2">
          {filtered.map((item) => {
            const isSelected = activeRecord?.id === item.id;
            return (
              <div
                key={item.id}
                onClick={() => setSelectedRecord(item)}
                className={`cursor-pointer rounded-xl border p-3.5 transition ${
                  isSelected
                    ? "border-blue-500 bg-blue-950/20 text-white shadow"
                    : "border-surface-800 bg-surface-900/60 text-slate-400 hover:border-surface-700"
                }`}
              >
                <div className="flex items-center justify-between gap-2 mb-1">
                  <span className="font-mono text-xs text-blue-400 uppercase font-semibold">{item.sourceType}</span>
                  <StatusBadge status={item.confidence} size="sm" />
                </div>
                <p className="text-xs font-mono text-slate-300 truncate">{item.sourceReference}</p>
                <div className="mt-2 text-[11px] text-slate-500">{formatDate(item.createdAt)}</div>
              </div>
            );
          })}
        </div>

        {/* Selected Evidence Detail Inspector */}
        <div className="md:col-span-2 space-y-4">
          {activeRecord && (
            <div className="rounded-xl border border-surface-800 bg-surface-900 p-6 space-y-6">
              <div className="flex items-start justify-between border-b border-surface-800 pb-4">
                <div>
                  <span className="text-xs font-mono text-blue-400 uppercase font-semibold block mb-1">
                    {activeRecord.sourceType}
                  </span>
                  <h3 className="text-sm font-mono text-white break-all">{activeRecord.sourceReference}</h3>
                </div>
                <StatusBadge status={activeRecord.confidence} />
              </div>

              {/* Provenance Metadata */}
              <div className="grid grid-cols-2 sm:grid-cols-3 gap-3 text-xs">
                <div className="rounded-lg bg-surface-950 p-3 border border-surface-800">
                  <span className="text-slate-500 block font-mono text-[10px] uppercase">Captured At</span>
                  <span className="text-slate-200 font-semibold">{formatDate(activeRecord.createdAt)}</span>
                </div>
                <div className="rounded-lg bg-surface-950 p-3 border border-surface-800">
                  <span className="text-slate-500 block font-mono text-[10px] uppercase">Confidence</span>
                  <span className="text-slate-200 font-semibold">{activeRecord.confidence}</span>
                </div>
                <div className="rounded-lg bg-surface-950 p-3 border border-surface-800">
                  <span className="text-slate-500 block font-mono text-[10px] uppercase">Redaction Status</span>
                  <span className="text-emerald-400 font-semibold flex items-center gap-1">
                    <Shield className="h-3 w-3" /> Sanitized
                  </span>
                </div>
              </div>

              {/* Sanitized Content Preview */}
              <div>
                <h4 className="text-xs font-mono uppercase text-slate-400 mb-2 flex items-center gap-1.5">
                  <Code className="h-3.5 w-3.5 text-blue-400" />
                  <span>Sanitized Payload</span>
                </h4>
                <div className="rounded-lg bg-surface-950 p-4 border border-surface-800 font-mono text-xs text-slate-300 max-h-96 overflow-y-auto whitespace-pre-wrap break-all leading-relaxed">
                  {activeRecord.sanitisedContent}
                </div>
              </div>

              {activeRecord.metadata && (
                <div>
                  <h4 className="text-xs font-mono uppercase text-slate-400 mb-2">Technical Metadata</h4>
                  <pre className="rounded-lg bg-surface-950 p-3 border border-surface-800 font-mono text-[11px] text-slate-400 overflow-x-auto">
                    {activeRecord.metadata}
                  </pre>
                </div>
              )}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
