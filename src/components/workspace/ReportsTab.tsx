import React, { useState } from "react";
import { Download, FileJson, FileText, Loader2, Sparkles } from "lucide-react";

interface ReportsTabProps {
  project: any;
}

export function ReportsTab({ project }: ReportsTabProps) {
  const [downloading, setDownloading] = useState<string | null>(null);

  const handleDownloadReport = async (format: "markdown" | "json") => {
    try {
      setDownloading(format);
      const res = await fetch(`/api/projects/${project.id}/reports?format=${format}`);
      if (!res.ok) throw new Error("Report fetch failed");

      if (format === "json") {
        const json = await res.json();
        const blob = new Blob([JSON.stringify(json, null, 2)], { type: "application/json" });
        const url = URL.createObjectURL(blob);
        const a = document.createElement("a");
        a.href = url;
        a.download = `xray-report-${project.name.toLowerCase().replace(/[^a-z0-9]/g, "-")}.json`;
        a.click();
        URL.revokeObjectURL(url);
      } else {
        const text = await res.text();
        const blob = new Blob([text], { type: "text/markdown;charset=utf-8" });
        const url = URL.createObjectURL(blob);
        const a = document.createElement("a");
        a.href = url;
        a.download = `xray-report-${project.name.toLowerCase().replace(/[^a-z0-9]/g, "-")}.md`;
        a.click();
        URL.revokeObjectURL(url);
      }
    } catch (e) {
      console.error(e);
    } finally {
      setDownloading(null);
    }
  };

  return (
    <div className="space-y-6">
      <div className="rounded-xl border border-surface-800 bg-surface-900 p-6 space-y-6">
        <div className="border-b border-surface-800 pb-4">
          <h3 className="text-base font-bold text-white flex items-center gap-2">
            <FileText className="h-5 w-5 text-blue-400" />
            Exportable Audit & Implementation Reports
          </h3>
          <p className="text-xs text-slate-400 mt-1">
            Generate verifiable documentation backed strictly by stored database records, observed DOM evidence, and behavioral test results.
          </p>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          {/* Markdown Report */}
          <div className="rounded-xl border border-surface-800 bg-surface-950 p-5 flex flex-col justify-between">
            <div className="space-y-2 mb-6">
              <div className="flex items-center gap-2 text-blue-400 font-mono text-xs font-semibold uppercase">
                <FileText className="h-4 w-4" />
                <span>Markdown Format (.md)</span>
              </div>
              <p className="text-xs text-slate-400 leading-relaxed">
                Clean, formatted Markdown report complete with executive summary, page captures, discovered features, sanitized evidence excerpts, and implementation recommendations.
              </p>
            </div>
            <button
              onClick={() => handleDownloadReport("markdown")}
              disabled={Boolean(downloading)}
              className="flex items-center justify-center gap-2 rounded-lg bg-blue-600 px-4 py-2.5 text-xs font-semibold text-white hover:bg-blue-500 transition disabled:opacity-50"
            >
              {downloading === "markdown" ? (
                <Loader2 className="h-4 w-4 animate-spin" />
              ) : (
                <Download className="h-4 w-4" />
              )}
              <span>Download Markdown Report</span>
            </button>
          </div>

          {/* JSON Structured Data */}
          <div className="rounded-xl border border-surface-800 bg-surface-950 p-5 flex flex-col justify-between">
            <div className="space-y-2 mb-6">
              <div className="flex items-center gap-2 text-cyan-400 font-mono text-xs font-semibold uppercase">
                <FileJson className="h-4 w-4" />
                <span>Raw JSON Data (.json)</span>
              </div>
              <p className="text-xs text-slate-400 leading-relaxed">
                Complete relational JSON export containing all normalized entities, timestamps, foreign key relationships, telemetry logs, and test assertions.
              </p>
            </div>
            <button
              onClick={() => handleDownloadReport("json")}
              disabled={Boolean(downloading)}
              className="flex items-center justify-center gap-2 rounded-lg border border-surface-700 bg-surface-800 px-4 py-2.5 text-xs font-semibold text-slate-200 hover:bg-surface-700 transition disabled:opacity-50"
            >
              {downloading === "json" ? (
                <Loader2 className="h-4 w-4 animate-spin" />
              ) : (
                <Download className="h-4 w-4" />
              )}
              <span>Download Raw JSON</span>
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
