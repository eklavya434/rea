"use client";

import React, { useState, useEffect, Suspense } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import {
  ArrowLeft,
  CheckCircle2,
  Cpu,
  Layers,
  Lock,
  PlusCircle,
  Radio,
  Shield,
  Sparkles,
  Terminal,
} from "lucide-react";
import Link from "next/link";

function NewProjectForm() {
  const router = useRouter();
  const searchParams = useSearchParams();

  const [name, setName] = useState("");
  const [targetUrl, setTargetUrl] = useState("");
  const [analysisMode, setAnalysisMode] = useState<"WEBSITE_INTERFACE" | "REA_ASSISTED" | "HYBRID">("WEBSITE_INTERFACE");
  const [description, setDescription] = useState("");
  const [authorizedConsent, setAuthorizedConsent] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const urlParam = searchParams.get("url");
    if (urlParam) {
      setTargetUrl(urlParam);
      try {
        const parsed = new URL(urlParam);
        setName(`${parsed.hostname.replace("www.", "")} Audit`);
      } catch {
        setName("Website Audit");
      }
    }
  }, [searchParams]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);

    if (!name.trim()) {
      setError("Please provide a project name.");
      return;
    }

    if (!targetUrl.trim()) {
      setError("Please provide a target website URL.");
      return;
    }

    if (!authorizedConsent) {
      setError("You must confirm you have authorization to inspect and audit this target.");
      return;
    }

    try {
      setSubmitting(true);
      const res = await fetch("/api/projects", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          name: name.trim(),
          targetUrl: targetUrl.trim(),
          analysisMode,
          description: description.trim() || undefined,
          authorizedConsent: true,
        }),
      });

      const data = await res.json();
      if (!res.ok) {
        throw new Error(data.error || "Failed to create project");
      }

      // Automatically trigger analysis and redirect to project workspace
      const projectId = data.project.id;
      // Trigger analysis pipeline
      fetch(`/api/projects/${projectId}/analyze`, { method: "POST" }).catch(console.error);

      router.push(`/projects/${projectId}`);
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : "Project creation failed");
      setSubmitting(false);
    }
  };

  return (
    <div className="mx-auto max-w-3xl px-4 py-8 sm:px-6">
      <Link
        href="/dashboard"
        className="inline-flex items-center gap-1.5 text-xs font-medium text-slate-400 hover:text-slate-200 transition mb-6"
      >
        <ArrowLeft className="h-3.5 w-3.5" />
        <span>Back to Dashboard</span>
      </Link>

      <div className="rounded-xl border border-surface-800 bg-surface-900 p-6 sm:p-8 shadow-xl">
        <div className="mb-6 border-b border-surface-800 pb-5">
          <h1 className="text-xl font-bold text-white flex items-center gap-2">
            <PlusCircle className="h-5 w-5 text-blue-500" />
            Create Website X-Ray Project
          </h1>
          <p className="text-xs text-slate-400 mt-1">
            Configure target destination, inspection scope, and analysis pipeline mode
          </p>
        </div>

        {error && (
          <div className="mb-6 rounded-lg border border-rose-900/50 bg-rose-950/40 p-4 text-xs text-rose-300 font-mono">
            {error}
          </div>
        )}

        <form onSubmit={handleSubmit} className="space-y-6">
          {/* Target URL */}
          <div>
            <label className="block text-xs font-semibold uppercase tracking-wider text-slate-300 mb-1.5 font-mono">
              Target Website URL *
            </label>
            <input
              type="text"
              placeholder="https://example.com"
              value={targetUrl}
              onChange={(e) => setTargetUrl(e.target.value)}
              className="w-full rounded-lg border border-surface-800 bg-surface-950 px-3.5 py-2.5 text-sm text-slate-100 placeholder-slate-600 focus:outline-none focus:border-blue-500 font-mono transition"
              required
            />
            <p className="text-[11px] text-slate-500 mt-1">
              Protected by SSRF guard: internal network destinations, localhost, and cloud metadata IPs are rejected.
            </p>
          </div>

          {/* Project Name */}
          <div>
            <label className="block text-xs font-semibold uppercase tracking-wider text-slate-300 mb-1.5 font-mono">
              Project Name *
            </label>
            <input
              type="text"
              placeholder="e.g., Acme SaaS Portal Audit"
              value={name}
              onChange={(e) => setName(e.target.value)}
              className="w-full rounded-lg border border-surface-800 bg-surface-950 px-3.5 py-2.5 text-sm text-slate-100 placeholder-slate-600 focus:outline-none focus:border-blue-500 transition"
              required
            />
          </div>

          {/* Analysis Mode */}
          <div>
            <label className="block text-xs font-semibold uppercase tracking-wider text-slate-300 mb-2 font-mono">
              Analysis Mode
            </label>
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
              <button
                type="button"
                onClick={() => setAnalysisMode("WEBSITE_INTERFACE")}
                className={`rounded-lg border p-3.5 text-left transition ${
                  analysisMode === "WEBSITE_INTERFACE"
                    ? "border-blue-500 bg-blue-950/30 text-white shadow-sm"
                    : "border-surface-800 bg-surface-950/60 text-slate-400 hover:border-surface-700"
                }`}
              >
                <div className="flex items-center gap-2 mb-1">
                  <Radio className="h-4 w-4 text-blue-400" />
                  <span className="text-xs font-semibold">Mode A: Interface</span>
                </div>
                <p className="text-[11px] text-slate-400 leading-relaxed">
                  Browser DOM extraction, viewport snapshots, visual hierarchy & controls.
                </p>
              </button>

              <button
                type="button"
                onClick={() => setAnalysisMode("REA_ASSISTED")}
                className={`rounded-lg border p-3.5 text-left transition ${
                  analysisMode === "REA_ASSISTED"
                    ? "border-cyan-500 bg-cyan-950/30 text-white shadow-sm"
                    : "border-surface-800 bg-surface-950/60 text-slate-400 hover:border-surface-700"
                }`}
              >
                <div className="flex items-center gap-2 mb-1">
                  <Terminal className="h-4 w-4 text-cyan-400" />
                  <span className="text-xs font-semibold">Mode B: REA Server</span>
                </div>
                <p className="text-[11px] text-slate-400 leading-relaxed">
                  Deep software reverse-engineering through connected REA MCP tools.
                </p>
              </button>

              <button
                type="button"
                onClick={() => setAnalysisMode("HYBRID")}
                className={`rounded-lg border p-3.5 text-left transition ${
                  analysisMode === "HYBRID"
                    ? "border-emerald-500 bg-emerald-950/30 text-white shadow-sm"
                    : "border-surface-800 bg-surface-950/60 text-slate-400 hover:border-surface-700"
                }`}
              >
                <div className="flex items-center gap-2 mb-1">
                  <Cpu className="h-4 w-4 text-emerald-400" />
                  <span className="text-xs font-semibold">Hybrid Combined</span>
                </div>
                <p className="text-[11px] text-slate-400 leading-relaxed">
                  Run both browser surface inspection and REA software tools simultaneously.
                </p>
              </button>
            </div>
          </div>

          {/* Description */}
          <div>
            <label className="block text-xs font-semibold uppercase tracking-wider text-slate-300 mb-1.5 font-mono">
              Description & Audit Scope (Optional)
            </label>
            <textarea
              rows={3}
              placeholder="Target pages, responsive viewports, or specific workflows to prioritize..."
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              className="w-full rounded-lg border border-surface-800 bg-surface-950 px-3.5 py-2.5 text-sm text-slate-100 placeholder-slate-600 focus:outline-none focus:border-blue-500 transition"
            />
          </div>

          {/* Authorization Checkbox */}
          <div className="rounded-lg border border-amber-900/40 bg-amber-950/20 p-4">
            <label className="flex items-start gap-3 cursor-pointer">
              <input
                type="checkbox"
                checked={authorizedConsent}
                onChange={(e) => setAuthorizedConsent(e.target.checked)}
                className="mt-0.5 h-4 w-4 rounded border-surface-700 bg-surface-950 text-blue-600 focus:ring-blue-500"
              />
              <div className="text-xs text-amber-200 leading-relaxed">
                <span className="font-semibold block mb-0.5">Authorized Consent & Compliance Confirmation</span>
                I confirm that I have explicit authorization or legitimate security research permission to audit this target website, and that this analysis complies with responsible disclosure and terms of use.
              </div>
            </label>
          </div>

          <div className="flex items-center justify-end gap-3 pt-4 border-t border-surface-800">
            <Link
              href="/dashboard"
              className="rounded-lg border border-surface-800 bg-surface-900 px-4 py-2.5 text-xs font-medium text-slate-300 hover:bg-surface-800 transition"
            >
              Cancel
            </Link>
            <button
              type="submit"
              disabled={submitting}
              className="flex items-center gap-2 rounded-lg bg-blue-600 px-6 py-2.5 text-xs font-semibold text-white hover:bg-blue-500 transition shadow-lg shadow-blue-900/30 disabled:opacity-50"
            >
              <PlusCircle className="h-4 w-4" />
              <span>{submitting ? "Initializing Project..." : "Launch X-Ray Project"}</span>
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}

export default function NewProjectPage() {
  return (
    <Suspense fallback={<div className="p-12 text-center font-mono text-xs text-slate-500">Loading form...</div>}>
      <NewProjectForm />
    </Suspense>
  );
}

