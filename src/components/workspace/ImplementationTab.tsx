import React, { useState } from "react";
import { Check, Code2, Copy, Download, FileText, Loader2, Sparkles } from "lucide-react";
import { StatusBadge } from "@/components/StatusBadge";

interface ImplementationTabProps {
  features: any[];
  onRefresh: () => void;
}

export function ImplementationTab({ features, onRefresh }: ImplementationTabProps) {
  const [selectedFeatureId, setSelectedFeatureId] = useState<string>(features[0]?.id || "");
  const [generating, setGenerating] = useState(false);
  const [copied, setCopied] = useState(false);
  const [currentSpec, setCurrentSpec] = useState<any | null>(null);

  const activeFeature = features.find((f) => f.id === selectedFeatureId) || features[0] || null;

  const handleGenerateSpec = async () => {
    if (!activeFeature) return;
    try {
      setGenerating(true);
      const res = await fetch(`/api/features/${activeFeature.id}/spec`, { method: "POST" });
      const data = await res.json();
      if (res.ok && data.spec) {
        setCurrentSpec(data.spec);
        onRefresh();
      }
    } catch (err) {
      console.error(err);
    } finally {
      setGenerating(false);
    }
  };

  const handleCopySpec = () => {
    if (!currentSpec && !activeFeature?.implementations?.[0]) return;
    const text = currentSpec
      ? JSON.stringify(currentSpec, null, 2)
      : activeFeature.implementations[0].specification;
    navigator.clipboard.writeText(text);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  const handleExportTaskPackage = () => {
    if (!activeFeature) return;
    const spec = currentSpec || (activeFeature.implementations?.[0] ? JSON.parse(activeFeature.implementations[0].specification) : null);
    if (!spec) return;

    const taskMarkdown = `# Implementation Task Package: ${activeFeature.name}

## 1. Feature Overview
- **Category:** ${activeFeature.category}
- **Description:** ${activeFeature.description}
- **Observed Behavior:** ${activeFeature.observedBehaviour}

## 2. User Stories
${(spec.userStories || []).map((s: string) => `- ${s}`).join("\n")}

## 3. Functional Requirements
${(spec.functionalRequirements || []).map((r: string) => `- [ ] ${r}`).join("\n")}

## 4. UI Component Architecture
${(spec.uiComponentOutline || []).map((c: string) => `- \`${c}\``).join("\n")}

## 5. Accessibility Requirements (WCAG 2.1 AA)
${(spec.accessibilityRequirements || []).map((a: string) => `- ${a}`).join("\n")}

## 6. Acceptance Criteria
${(spec.acceptanceCriteria || []).map((ac: string) => `- [ ] ${ac}`).join("\n")}

## 7. Test Scenarios
${(spec.testScenarios || []).map((ts: string) => `- ${ts}`).join("\n")}

## 8. Implementation Notes & Limitations
${(spec.assumptionsAndUnresolvedQuestions || []).map((q: string) => `- ${q}`).join("\n")}
`;

    const blob = new Blob([taskMarkdown], { type: "text/markdown;charset=utf-8" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `task-${activeFeature.name.toLowerCase().replace(/[^a-z0-9]/g, "-")}.md`;
    a.click();
    URL.revokeObjectURL(url);
  };

  if (!features || features.length === 0) {
    return (
      <div className="rounded-xl border border-surface-800 bg-surface-900 p-12 text-center">
        <Code2 className="mx-auto h-8 w-8 text-slate-600 mb-3" />
        <h3 className="text-sm font-semibold text-slate-300">No features ready for implementation</h3>
        <p className="text-xs text-slate-500 mt-1">Extract features from target website analysis first.</p>
      </div>
    );
  }

  const existingImpl = activeFeature?.implementations?.[0];
  const specData = currentSpec || (existingImpl ? JSON.parse(existingImpl.specification) : null);

  return (
    <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
      {/* Feature Selector Sidebar */}
      <div className="space-y-3">
        <h3 className="text-xs font-mono uppercase text-slate-400 tracking-wider">Select Feature</h3>
        <div className="space-y-2">
          {features.map((f) => {
            const isSelected = activeFeature?.id === f.id;
            return (
              <div
                key={f.id}
                onClick={() => {
                  setSelectedFeatureId(f.id);
                  setCurrentSpec(null);
                }}
                className={`cursor-pointer rounded-xl border p-3.5 transition ${
                  isSelected
                    ? "border-blue-500 bg-blue-950/20 text-white shadow"
                    : "border-surface-800 bg-surface-900/60 text-slate-400 hover:border-surface-700"
                }`}
              >
                <div className="flex items-center justify-between gap-2 mb-1">
                  <span className="text-xs font-semibold text-slate-200 truncate">{f.name}</span>
                  <span className="text-[10px] font-mono text-blue-400 uppercase">{f.category}</span>
                </div>
                <div className="flex items-center gap-2 mt-2">
                  <StatusBadge status={f.implementationStatus} size="sm" />
                </div>
              </div>
            );
          })}
        </div>
      </div>

      {/* Specification Workspace */}
      <div className="md:col-span-2 space-y-4">
        {activeFeature && (
          <div className="rounded-xl border border-surface-800 bg-surface-900 p-6 space-y-6">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b border-surface-800 pb-4">
              <div>
                <span className="text-xs font-mono text-blue-400 uppercase block mb-1">{activeFeature.category}</span>
                <h2 className="text-lg font-bold text-white">{activeFeature.name}</h2>
              </div>

              <div className="flex items-center gap-2">
                <button
                  onClick={handleGenerateSpec}
                  disabled={generating}
                  className="flex items-center gap-1.5 rounded-lg bg-blue-600 px-3.5 py-2 text-xs font-semibold text-white hover:bg-blue-500 transition shadow disabled:opacity-50"
                >
                  {generating ? (
                    <>
                      <Loader2 className="h-3.5 w-3.5 animate-spin" />
                      <span>Generating Spec...</span>
                    </>
                  ) : (
                    <>
                      <Sparkles className="h-3.5 w-3.5" />
                      <span>{specData ? "Regenerate Spec" : "Generate Spec"}</span>
                    </>
                  )}
                </button>

                {specData && (
                  <>
                    <button
                      onClick={handleCopySpec}
                      className="rounded-lg border border-surface-800 bg-surface-950 p-2 text-slate-400 hover:text-white transition"
                      title="Copy Specification"
                    >
                      {copied ? <Check className="h-4 w-4 text-emerald-400" /> : <Copy className="h-4 w-4" />}
                    </button>
                    <button
                      onClick={handleExportTaskPackage}
                      className="rounded-lg border border-surface-800 bg-surface-950 px-3 py-2 text-xs font-medium text-slate-300 hover:text-white transition flex items-center gap-1.5"
                    >
                      <Download className="h-3.5 w-3.5" />
                      <span>Export Task</span>
                    </button>
                  </>
                )}
              </div>
            </div>

            {/* Spec Details Preview */}
            {!specData ? (
              <div className="rounded-xl border border-dashed border-surface-800 p-12 text-center">
                <Sparkles className="mx-auto h-8 w-8 text-blue-500 mb-3" />
                <h3 className="text-sm font-semibold text-slate-300">No specification generated yet</h3>
                <p className="text-xs text-slate-500 mt-1 mb-4">
                  Generate a structured engineering specification with user stories, functional requirements, and acceptance criteria.
                </p>
                <button
                  onClick={handleGenerateSpec}
                  disabled={generating}
                  className="inline-flex items-center gap-2 rounded-lg bg-blue-600 px-4 py-2 text-xs font-semibold text-white hover:bg-blue-500 transition"
                >
                  Generate Implementation Spec
                </button>
              </div>
            ) : (
              <div className="space-y-6 text-xs font-sans">
                {/* User Stories */}
                <div>
                  <h4 className="text-xs font-mono uppercase text-slate-400 mb-2 font-semibold">User Stories</h4>
                  <ul className="rounded-lg bg-surface-950 p-4 border border-surface-800 space-y-2 text-slate-300 list-disc list-inside">
                    {specData.userStories?.map((us: string, idx: number) => (
                      <li key={idx} className="leading-relaxed">{us}</li>
                    ))}
                  </ul>
                </div>

                {/* Functional Requirements */}
                <div>
                  <h4 className="text-xs font-mono uppercase text-slate-400 mb-2 font-semibold">Functional Requirements</h4>
                  <ul className="rounded-lg bg-surface-950 p-4 border border-surface-800 space-y-2 text-slate-300">
                    {specData.functionalRequirements?.map((fr: string, idx: number) => (
                      <li key={idx} className="flex items-start gap-2">
                        <span className="text-blue-400 font-mono font-bold">&bull;</span>
                        <span>{fr}</span>
                      </li>
                    ))}
                  </ul>
                </div>

                {/* UI Component Outline */}
                <div>
                  <h4 className="text-xs font-mono uppercase text-slate-400 mb-2 font-semibold">UI Component Outline</h4>
                  <div className="rounded-lg bg-surface-950 p-3 border border-surface-800 font-mono text-slate-300 space-y-1 text-[11px]">
                    {specData.uiComponentOutline?.map((c: string, idx: number) => (
                      <div key={idx} className="text-cyan-400">{c}</div>
                    ))}
                  </div>
                </div>

                {/* Acceptance Criteria */}
                <div>
                  <h4 className="text-xs font-mono uppercase text-slate-400 mb-2 font-semibold">Acceptance Criteria</h4>
                  <div className="rounded-lg bg-surface-950 p-4 border border-surface-800 space-y-2 text-slate-300">
                    {specData.acceptanceCriteria?.map((ac: string, idx: number) => (
                      <div key={idx} className="flex items-start gap-2">
                        <span className="text-emerald-400 font-mono">&#10003;</span>
                        <span>{ac}</span>
                      </div>
                    ))}
                  </div>
                </div>

                {/* Accessibility & Testing */}
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <div>
                    <h4 className="text-xs font-mono uppercase text-slate-400 mb-2 font-semibold">Accessibility (WCAG 2.1)</h4>
                    <div className="rounded-lg bg-surface-950 p-3.5 border border-surface-800 space-y-1.5 text-slate-300 text-[11px]">
                      {specData.accessibilityRequirements?.map((a: string, idx: number) => (
                        <div key={idx}>&bull; {a}</div>
                      ))}
                    </div>
                  </div>
                  <div>
                    <h4 className="text-xs font-mono uppercase text-slate-400 mb-2 font-semibold">Test Scenarios</h4>
                    <div className="rounded-lg bg-surface-950 p-3.5 border border-surface-800 space-y-1.5 text-slate-300 text-[11px]">
                      {specData.testScenarios?.map((t: string, idx: number) => (
                        <div key={idx}>&bull; {t}</div>
                      ))}
                    </div>
                  </div>
                </div>
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  );
}
