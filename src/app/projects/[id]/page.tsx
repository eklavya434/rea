"use client";

import React, { useEffect, useState, use } from "react";
import Link from "next/link";
import {
  ArrowLeft,
  CheckCircle2,
  Code2,
  Cpu,
  Eye,
  FileText,
  Globe,
  Image as ImageIcon,
  Layers,
  LayoutDashboard,
  Radio,
  Settings,
  Shield,
  Sparkles,
} from "lucide-react";
import { StatusBadge } from "@/components/StatusBadge";
import { OverviewTab } from "@/components/workspace/OverviewTab";
import { PagesTab } from "@/components/workspace/PagesTab";
import { ScreenshotsTab } from "@/components/workspace/ScreenshotsTab";
import { FeaturesTab } from "@/components/workspace/FeaturesTab";
import { EvidenceTab } from "@/components/workspace/EvidenceTab";
import { ArchitectureTab } from "@/components/workspace/ArchitectureTab";
import { ImplementationTab } from "@/components/workspace/ImplementationTab";
import { TestsTab } from "@/components/workspace/TestsTab";
import { ReportsTab } from "@/components/workspace/ReportsTab";
import { SettingsTab } from "@/components/workspace/SettingsTab";

type WorkspaceTab =
  | "overview"
  | "pages"
  | "screenshots"
  | "features"
  | "evidence"
  | "architecture"
  | "implementation"
  | "tests"
  | "reports"
  | "settings";

export default function ProjectWorkspacePage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = use(params);

  const [project, setProject] = useState<any | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [activeTab, setActiveTab] = useState<WorkspaceTab>("overview");

  const fetchProject = async () => {
    try {
      setLoading(true);
      setError(null);
      const res = await fetch(`/api/projects/${id}`);
      if (!res.ok) throw new Error(`Project fetch failed (HTTP ${res.status})`);
      const data = await res.json();
      setProject(data.project);
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : "Failed to load project");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchProject();
  }, [id]);

  const tabs: Array<{ id: WorkspaceTab; label: string; icon: any; count?: number }> = [
    { id: "overview", label: "Overview", icon: LayoutDashboard },
    { id: "pages", label: "Pages", icon: Globe, count: project?.pages?.length },
    {
      id: "screenshots",
      label: "Screenshots",
      icon: ImageIcon,
      count: project?.pages?.filter((p: any) => p.screenshotPath)?.length,
    },
    { id: "features", label: "Features", icon: Sparkles, count: project?.features?.length },
    { id: "evidence", label: "Evidence", icon: Shield, count: project?.evidence?.length },
    { id: "architecture", label: "Architecture", icon: Layers },
    { id: "implementation", label: "Implementation", icon: Code2 },
    { id: "tests", label: "Tests & Diff", icon: CheckCircle2, count: project?.testRuns?.length },
    { id: "reports", label: "Reports", icon: FileText },
    { id: "settings", label: "Settings", icon: Settings },
  ];

  if (loading) {
    return (
      <div className="mx-auto max-w-7xl px-4 py-16 text-center">
        <div className="inline-flex items-center gap-2 font-mono text-xs text-blue-400">
          <span className="h-2 w-2 rounded-full bg-blue-500 animate-ping" />
          <span>Loading Website X-Ray Project State...</span>
        </div>
      </div>
    );
  }

  if (error || !project) {
    return (
      <div className="mx-auto max-w-2xl px-4 py-16 text-center">
        <div className="rounded-xl border border-rose-900/40 bg-rose-950/20 p-8">
          <h2 className="text-base font-semibold text-rose-300">Project Workspace Error</h2>
          <p className="text-xs text-rose-400 mt-2 mb-6 font-mono">{error || "Project could not be found."}</p>
          <Link
            href="/dashboard"
            className="inline-flex items-center gap-1.5 rounded-lg bg-surface-800 px-4 py-2 text-xs font-medium text-slate-200 hover:bg-surface-700 transition"
          >
            <ArrowLeft className="h-3.5 w-3.5" />
            <span>Return to Dashboard</span>
          </Link>
        </div>
      </div>
    );
  }

  return (
    <div className="mx-auto max-w-7xl px-4 py-6 sm:px-6">
      {/* Top Breadcrumb & Title Bar */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 mb-6">
        <div className="flex items-center gap-3">
          <Link
            href="/dashboard"
            className="rounded-lg border border-surface-800 bg-surface-900 p-2 text-slate-400 hover:text-white transition"
            title="Dashboard"
          >
            <ArrowLeft className="h-4 w-4" />
          </Link>
          <div>
            <div className="flex items-center gap-2">
              <h1 className="text-xl font-bold tracking-tight text-white">{project.name}</h1>
              <StatusBadge status={project.status} size="sm" />
            </div>
            <p className="text-xs font-mono text-slate-400 mt-0.5">{project.targetUrl}</p>
          </div>
        </div>

        <div className="flex items-center gap-2">
          <span className="font-mono text-[11px] text-slate-400 border border-surface-800 bg-surface-900 px-2.5 py-1 rounded">
            MODE: {project.analysisMode}
          </span>
        </div>
      </div>

      {/* Workspace 10-Tab Navigation Bar */}
      <div className="mb-6 flex items-center gap-1 overflow-x-auto border-b border-surface-800 pb-2">
        {tabs.map((tab) => {
          const Icon = tab.icon;
          const isActive = activeTab === tab.id;
          return (
            <button
              key={tab.id}
              onClick={() => setActiveTab(tab.id)}
              className={`flex items-center gap-2 rounded-lg px-3.5 py-2 text-xs font-medium transition whitespace-nowrap ${
                isActive
                  ? "bg-blue-600 text-white font-semibold shadow"
                  : "text-slate-400 hover:bg-surface-900 hover:text-slate-200"
              }`}
            >
              <Icon className="h-3.5 w-3.5" />
              <span>{tab.label}</span>
              {typeof tab.count === "number" && tab.count > 0 && (
                <span
                  className={`rounded-full px-1.5 py-0.2 text-[10px] font-mono ${
                    isActive ? "bg-blue-700 text-white" : "bg-surface-800 text-slate-300"
                  }`}
                >
                  {tab.count}
                </span>
              )}
            </button>
          );
        })}
      </div>

      {/* Tab Panels */}
      <div>
        {activeTab === "overview" && (
          <OverviewTab
            project={project}
            onRefresh={fetchProject}
            onSelectTab={(t: any) => setActiveTab(t)}
          />
        )}
        {activeTab === "pages" && (
          <PagesTab
            pages={project.pages || []}
            onSelectEvidence={() => setActiveTab("evidence")}
          />
        )}
        {activeTab === "screenshots" && (
          <ScreenshotsTab pages={project.pages || []} />
        )}
        {activeTab === "features" && (
          <FeaturesTab
            features={project.features || []}
            onOpenImplementation={() => setActiveTab("implementation")}
            onOpenEvidence={() => setActiveTab("evidence")}
          />
        )}
        {activeTab === "evidence" && (
          <EvidenceTab evidence={project.evidence || []} />
        )}
        {activeTab === "architecture" && (
          <ArchitectureTab project={project} />
        )}
        {activeTab === "implementation" && (
          <ImplementationTab
            features={project.features || []}
            onRefresh={fetchProject}
          />
        )}
        {activeTab === "tests" && (
          <TestsTab project={project} onRefresh={fetchProject} />
        )}
        {activeTab === "reports" && (
          <ReportsTab project={project} />
        )}
        {activeTab === "settings" && (
          <SettingsTab project={project} />
        )}
      </div>
    </div>
  );
}
