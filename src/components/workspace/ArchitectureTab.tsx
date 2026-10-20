import React from "react";
import { ArrowDown, CheckCircle2, ChevronRight, HelpCircle, Layers, Link2, ShieldAlert } from "lucide-react";

interface ArchitectureTabProps {
  project: any;
}

export function ArchitectureTab({ project }: ArchitectureTabProps) {
  const pages = project.pages || [];
  const features = project.features || [];

  return (
    <div className="space-y-6">
      {/* Notice Banner */}
      <div className="rounded-xl border border-blue-900/40 bg-blue-950/20 p-4 text-xs text-blue-300 flex items-start gap-3">
        <Layers className="h-5 w-5 text-blue-400 flex-shrink-0 mt-0.5" />
        <div>
          <span className="font-semibold block mb-0.5">Observable Evidence Architecture</span>
          This graph maps verified surface components, observed navigation routes, and user input points.
          Backend microservices, internal data models, and unobserved databases are marked as{" "}
          <span className="font-mono text-amber-300 font-semibold">[UNKNOWN / UNVERIFIED]</span> to prevent speculative assumptions.
        </div>
      </div>

      {/* Visual Architectural Hierarchy */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Layer 1: Client Surface & Route Ingress */}
        <div className="rounded-xl border border-surface-800 bg-surface-900 p-5 space-y-4">
          <div className="flex items-center justify-between border-b border-surface-800 pb-3">
            <span className="font-mono text-xs uppercase text-slate-400 font-semibold">1. Client Routing Layer</span>
            <span className="text-[10px] font-mono rounded bg-emerald-950 text-emerald-400 border border-emerald-800 px-1.5 py-0.5">
              OBSERVED
            </span>
          </div>

          <div className="space-y-3">
            {pages.map((p: any) => (
              <div key={p.id} className="rounded-lg bg-surface-950 p-3.5 border border-surface-800">
                <div className="flex items-center gap-2 mb-1">
                  <Link2 className="h-3.5 w-3.5 text-blue-400" />
                  <span className="text-xs font-semibold text-white truncate">{p.title || "Route Entry"}</span>
                </div>
                <p className="text-[11px] font-mono text-slate-400 truncate">{p.url}</p>
                <div className="mt-2 text-[10px] font-mono text-slate-500">
                  Viewport: {p.viewport || "1280x800"} &bull; Render: DOMContentLoaded
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* Layer 2: Interactive Features & UI Components */}
        <div className="rounded-xl border border-surface-800 bg-surface-900 p-5 space-y-4">
          <div className="flex items-center justify-between border-b border-surface-800 pb-3">
            <span className="font-mono text-xs uppercase text-slate-400 font-semibold">2. Observable UI Features</span>
            <span className="text-[10px] font-mono rounded bg-emerald-950 text-emerald-400 border border-emerald-800 px-1.5 py-0.5">
              OBSERVED
            </span>
          </div>

          <div className="space-y-3">
            {features.map((f: any) => (
              <div key={f.id} className="rounded-lg bg-surface-950 p-3.5 border border-surface-800 space-y-1.5">
                <div className="flex items-center justify-between">
                  <span className="text-xs font-semibold text-white">{f.name}</span>
                  <span className="text-[10px] font-mono text-blue-400 uppercase">{f.category}</span>
                </div>
                <p className="text-[11px] text-slate-400 leading-relaxed">{f.observedBehaviour}</p>
              </div>
            ))}
          </div>
        </div>

        {/* Layer 3: Server Boundaries & Unknown Internals */}
        <div className="rounded-xl border border-surface-800 bg-surface-900 p-5 space-y-4">
          <div className="flex items-center justify-between border-b border-surface-800 pb-3">
            <span className="font-mono text-xs uppercase text-slate-400 font-semibold">3. Backend & Storage Boundaries</span>
            <span className="text-[10px] font-mono rounded bg-amber-950 text-amber-400 border border-amber-800 px-1.5 py-0.5">
              INFERRED / UNKNOWN
            </span>
          </div>

          <div className="space-y-3">
            <div className="rounded-lg bg-surface-950 p-3.5 border border-amber-900/30 space-y-2">
              <div className="flex items-center gap-2 text-amber-400">
                <HelpCircle className="h-4 w-4" />
                <span className="text-xs font-semibold">Server Application Logic</span>
              </div>
              <p className="text-[11px] text-slate-400 leading-relaxed">
                Backend services, controllers, and framework runtime are <span className="text-amber-300 font-medium">unverified</span> from public browser analysis. Clean-room implementation must provide original server logic.
              </p>
            </div>

            <div className="rounded-lg bg-surface-950 p-3.5 border border-amber-900/30 space-y-2">
              <div className="flex items-center gap-2 text-amber-400">
                <HelpCircle className="h-4 w-4" />
                <span className="text-xs font-semibold">Persistence & Database Schema</span>
              </div>
              <p className="text-[11px] text-slate-400 leading-relaxed">
                Relational or document stores cannot be directly inspected. Inferences must be derived solely from client forms and payload contracts.
              </p>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
