"use client";

import React, { useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import {
  ArrowRight,
  CheckCircle2,
  Cpu,
  Eye,
  FileCode2,
  Layers,
  Lock,
  Radio,
  Search,
  Shield,
  Sparkles,
  Terminal,
} from "lucide-react";

export default function LandingPage() {
  const router = useRouter();
  const [urlInput, setUrlInput] = useState("");
  const [validating, setValidating] = useState(false);
  const [validationError, setValidationError] = useState<string | null>(null);

  const handleQuickAudit = async (e: React.FormEvent) => {
    e.preventDefault();
    setValidationError(null);

    const trimmed = urlInput.trim();
    if (!trimmed) {
      setValidationError("Please enter a target website URL.");
      return;
    }

    try {
      const parsed = new URL(trimmed.startsWith("http") ? trimmed : `https://${trimmed}`);
      if (parsed.protocol !== "http:" && parsed.protocol !== "https:") {
        setValidationError("Only HTTP and HTTPS URLs are permitted.");
        return;
      }
      if (parsed.hostname === "localhost" || parsed.hostname === "127.0.0.1" || parsed.hostname.endsWith(".local")) {
        setValidationError("Security policy: Localhost and internal loopback addresses are prohibited.");
        return;
      }

      setValidating(true);
      // Route directly to project creation with pre-filled target URL
      router.push(`/projects/new?url=${encodeURIComponent(parsed.toString())}`);
    } catch {
      setValidationError("Invalid URL format. Please provide a standard URL such as https://example.com");
    } finally {
      setValidating(false);
    }
  };

  return (
    <div className="flex flex-col min-h-screen">
      {/* Hero Section */}
      <section className="relative overflow-hidden border-b border-surface-800 bg-gradient-to-b from-surface-950 via-surface-900 to-surface-950 pt-20 pb-24">
        <div className="absolute inset-0 bg-[radial-gradient(ellipse_80%_80%_at_50%_-20%,rgba(59,130,246,0.15),rgba(255,255,255,0))] pointer-events-none" />

        <div className="mx-auto max-w-5xl px-4 sm:px-6 text-center relative z-10">
          <div className="inline-flex items-center gap-2 rounded-full border border-blue-500/30 bg-blue-950/40 px-3 py-1 text-xs font-mono text-blue-300 mb-6">
            <Radio className="h-3.5 w-3.5 animate-pulse text-blue-400" />
            <span>WEBSITE X-RAY v1.0 &bull; AUTHORIZED AUDIT PLATFORM</span>
          </div>

          <h1 className="text-4xl sm:text-6xl font-extrabold tracking-tight text-white mb-6 leading-tight">
            Understand website behavior. <br />
            <span className="bg-gradient-to-r from-blue-400 via-cyan-400 to-emerald-400 bg-clip-text text-transparent">
              Reverse-engineer clean implementations.
            </span>
          </h1>

          <p className="mx-auto max-w-2xl text-base sm:text-lg text-slate-400 mb-10 leading-relaxed">
            Observe UI components, DOM hierarchies, and interaction patterns through isolated browser inspection,
            probe supported software targets via REA MCP, and generate high-fidelity feature specifications with AI.
          </p>

          {/* Quick URL Entry Form */}
          <div className="mx-auto max-w-2xl">
            <form onSubmit={handleQuickAudit} className="flex flex-col sm:flex-row gap-2 rounded-xl border border-surface-800 bg-surface-900/90 p-2 shadow-2xl backdrop-blur-md">
              <div className="relative flex-1">
                <Search className="absolute left-3.5 top-3.5 h-4 w-4 text-slate-500" />
                <input
                  type="text"
                  placeholder="https://target-domain.com"
                  value={urlInput}
                  onChange={(e) => setUrlInput(e.target.value)}
                  className="w-full rounded-lg bg-surface-950/70 border border-surface-800 pl-10 pr-4 py-2.5 text-sm text-slate-100 placeholder-slate-500 focus:outline-none focus:border-blue-500 transition font-mono"
                />
              </div>
              <button
                type="submit"
                disabled={validating}
                className="flex items-center justify-center gap-2 rounded-lg bg-blue-600 px-6 py-2.5 text-sm font-semibold text-white hover:bg-blue-500 transition shadow-lg shadow-blue-900/30 disabled:opacity-50"
              >
                <span>{validating ? "Validating..." : "Analyze Site"}</span>
                <ArrowRight className="h-4 w-4" />
              </button>
            </form>

            {validationError && (
              <div className="mt-3 rounded-lg border border-rose-900/50 bg-rose-950/40 px-3.5 py-2 text-left text-xs text-rose-300 font-mono">
                {validationError}
              </div>
            )}

            <div className="mt-3 flex items-center justify-center gap-4 text-xs text-slate-500">
              <span className="flex items-center gap-1">
                <Shield className="h-3 w-3 text-emerald-400" /> SSRF Blocklist Protected
              </span>
              <span>&bull;</span>
              <span className="flex items-center gap-1">
                <Lock className="h-3 w-3 text-cyan-400" /> Private Credential Redaction
              </span>
            </div>
          </div>
        </div>
      </section>

      {/* Analysis Pipeline Demonstration */}
      <section className="py-16 bg-surface-950 border-b border-surface-800">
        <div className="mx-auto max-w-6xl px-4 sm:px-6">
          <div className="text-center mb-12">
            <h2 className="text-2xl font-bold tracking-tight text-white mb-2">The X-Ray Verification Pipeline</h2>
            <p className="text-sm text-slate-400">Strict separation of observed facts from architectural inferences</p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
            <div className="rounded-xl border border-surface-800 bg-surface-900/50 p-5">
              <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-blue-600/10 border border-blue-500/20 text-blue-400 mb-4 font-mono font-bold text-sm">
                01
              </div>
              <h3 className="text-sm font-semibold text-white mb-1.5">Isolated Inspection</h3>
              <p className="text-xs text-slate-400 leading-relaxed">
                Headless Playwright navigation records viewport rendering, semantic headers, buttons, inputs, and screenshot evidence.
              </p>
            </div>

            <div className="rounded-xl border border-surface-800 bg-surface-900/50 p-5">
              <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-cyan-600/10 border border-cyan-500/20 text-cyan-400 mb-4 font-mono font-bold text-sm">
                02
              </div>
              <h3 className="text-sm font-semibold text-white mb-1.5">Sanitized Evidence Graph</h3>
              <p className="text-xs text-slate-400 leading-relaxed">
                HTML, text, and metadata are cleansed of cookies, secrets, and auth tokens, binding observations to distinct evidence IDs.
              </p>
            </div>

            <div className="rounded-xl border border-surface-800 bg-surface-900/50 p-5">
              <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-emerald-600/10 border border-emerald-500/20 text-emerald-400 mb-4 font-mono font-bold text-sm">
                03
              </div>
              <h3 className="text-sm font-semibold text-white mb-1.5">Feature Extraction</h3>
              <p className="text-xs text-slate-400 leading-relaxed">
                Structured AI models categorize features (Search, Nav, Form) with explicit confidence ratings and noted assumptions.
              </p>
            </div>

            <div className="rounded-xl border border-surface-800 bg-surface-900/50 p-5">
              <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-purple-600/10 border border-purple-500/20 text-purple-400 mb-4 font-mono font-bold text-sm">
                04
              </div>
              <h3 className="text-sm font-semibold text-white mb-1.5">Implementation Studio</h3>
              <p className="text-xs text-slate-400 leading-relaxed">
                Generate clean-room specifications, user stories, acceptance criteria, and task packages for your engineering IDE.
              </p>
            </div>
          </div>
        </div>
      </section>

      {/* Feature Highlights Grid */}
      <section className="py-16 bg-surface-900/30">
        <div className="mx-auto max-w-6xl px-4 sm:px-6">
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            <div className="rounded-xl border border-surface-800 bg-surface-900 p-6 flex flex-col justify-between">
              <div>
                <div className="h-10 w-10 rounded-lg bg-blue-500/10 text-blue-400 flex items-center justify-center mb-4">
                  <Terminal className="h-5 w-5" />
                </div>
                <h3 className="text-base font-semibold text-white mb-2">REA MCP Integration</h3>
                <p className="text-xs text-slate-400 leading-relaxed mb-4">
                  Connect to a running REA MCP server to inspect source artifacts, assemblies, or application binaries. If REA is offline, Website X-Ray gracefully falls back to browser-level inspection without breaking.
                </p>
              </div>
              <div className="text-[11px] font-mono text-slate-500 flex items-center gap-1.5">
                <CheckCircle2 className="h-3.5 w-3.5 text-emerald-400" />
                Verified Tool Discovery &bull; Zero Fabrications
              </div>
            </div>

            <div className="rounded-xl border border-surface-800 bg-surface-900 p-6 flex flex-col justify-between">
              <div>
                <div className="h-10 w-10 rounded-lg bg-cyan-500/10 text-cyan-400 flex items-center justify-center mb-4">
                  <FileCode2 className="h-5 w-5" />
                </div>
                <h3 className="text-base font-semibold text-white mb-2">Evidence-Backed Specs</h3>
                <p className="text-xs text-slate-400 leading-relaxed mb-4">
                  Every functional requirement, user story, and acceptance criteria is linked to verified evidence records rather than speculative hallucination.
                </p>
              </div>
              <div className="text-[11px] font-mono text-slate-500 flex items-center gap-1.5">
                <CheckCircle2 className="h-3.5 w-3.5 text-emerald-400" />
                Markdown & JSON Exportable
              </div>
            </div>

            <div className="rounded-xl border border-surface-800 bg-surface-900 p-6 flex flex-col justify-between">
              <div>
                <div className="h-10 w-10 rounded-lg bg-emerald-500/10 text-emerald-400 flex items-center justify-center mb-4">
                  <Eye className="h-5 w-5" />
                </div>
                <h3 className="text-base font-semibold text-white mb-2">Visual & Behavioural Diff</h3>
                <p className="text-xs text-slate-400 leading-relaxed mb-4">
                  Compare reference screenshots against your newly built implementation with side-by-side viewports, opacity sliders, and behavioural checklists.
                </p>
              </div>
              <div className="text-[11px] font-mono text-slate-500 flex items-center gap-1.5">
                <CheckCircle2 className="h-3.5 w-3.5 text-emerald-400" />
                Measurable Acceptance Testing
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* Authorized-Use Policy & Privacy Notice */}
      <section className="py-12 bg-surface-950 border-t border-surface-800">
        <div className="mx-auto max-w-4xl px-4 sm:px-6">
          <div className="rounded-xl border border-amber-900/30 bg-amber-950/20 p-6">
            <div className="flex items-start gap-4">
              <Shield className="h-6 w-6 text-amber-400 flex-shrink-0 mt-0.5" />
              <div>
                <h4 className="text-sm font-semibold text-amber-200 mb-1">Authorized Use & Responsible Reverse Engineering</h4>
                <p className="text-xs text-amber-300/80 leading-relaxed">
                  Website X-Ray is intended solely for security research, architecture documentation, and clean-room implementation of public or authorized software. It automatically adheres to strict observation boundaries: no CAPTCHA bypassing, no unauthorized authentication circumvention, no automated form submissions, and zero credential scraping.
                </p>
              </div>
            </div>
          </div>
        </div>
      </section>
    </div>
  );
}
