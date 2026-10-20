import React from "react";
import { Image as ImageIcon, Maximize2 } from "lucide-react";
import { formatDate } from "@/lib/utils";

interface ScreenshotsTabProps {
  pages: any[];
}

export function ScreenshotsTab({ pages }: ScreenshotsTabProps) {
  const screenshots = pages.filter((p) => p.screenshotPath);

  if (screenshots.length === 0) {
    return (
      <div className="rounded-xl border border-surface-800 bg-surface-900 p-12 text-center">
        <ImageIcon className="mx-auto h-8 w-8 text-slate-600 mb-3" />
        <h3 className="text-sm font-semibold text-slate-300">No screenshots captured</h3>
        <p className="text-xs text-slate-500 mt-1">Screenshots are captured automatically during Playwright browser execution.</p>
      </div>
    );
  }

  return (
    <div className="space-y-4">
      <h3 className="text-xs font-mono uppercase text-slate-400 tracking-wider">
        Captured Viewport Snapshots ({screenshots.length})
      </h3>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        {screenshots.map((p) => (
          <div key={p.id} className="rounded-xl border border-surface-800 bg-surface-900 overflow-hidden shadow">
            <div className="border-b border-surface-800 px-4 py-3 flex items-center justify-between text-xs bg-surface-950/60">
              <span className="font-semibold text-slate-200 truncate">{p.title || p.url}</span>
              <span className="font-mono text-slate-400">{p.viewport || "1280x800"}</span>
            </div>
            <div className="p-3 bg-surface-950 flex items-center justify-center">
              <img
                src={p.screenshotPath}
                alt={p.title || "Capture"}
                className="rounded border border-surface-800 max-h-72 object-contain w-full"
              />
            </div>
            <div className="px-4 py-2.5 border-t border-surface-800 text-[11px] text-slate-500 font-mono flex items-center justify-between">
              <span>Captured: {formatDate(p.inspectedAt)}</span>
              <a
                href={p.screenshotPath}
                target="_blank"
                rel="noreferrer"
                className="text-blue-400 hover:underline inline-flex items-center gap-1"
              >
                <span>Full Resolution</span>
                <Maximize2 className="h-3 w-3" />
              </a>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
