import React from "react";
import { cn } from "@/lib/utils";

interface StatusBadgeProps {
  status: string;
  size?: "sm" | "md";
}

export function StatusBadge({ status, size = "md" }: StatusBadgeProps) {
  const normalized = status.toUpperCase();

  let styles = "bg-slate-800 text-slate-300 border-slate-700";

  switch (normalized) {
    case "COMPLETED":
    case "SUCCESS":
    case "PASSED":
    case "HIGH":
    case "ACTIVE":
      styles = "bg-emerald-950/60 text-emerald-400 border-emerald-800/60";
      break;
    case "RUNNING":
    case "IN_PROGRESS":
    case "ANALYZING":
      styles = "bg-blue-950/60 text-blue-400 border-blue-800/60 animate-pulse";
      break;
    case "PENDING":
    case "UNTESTED":
    case "NOT_STARTED":
    case "MEDIUM":
      styles = "bg-amber-950/60 text-amber-400 border-amber-800/60";
      break;
    case "FAILED":
    case "LOW":
    case "OFFLINE":
    case "OFFLINE_FALLBACK":
      styles = "bg-rose-950/60 text-rose-400 border-rose-800/60";
      break;
  }

  const padding = size === "sm" ? "px-1.5 py-0.5 text-xs" : "px-2.5 py-1 text-xs font-medium";

  return (
    <span
      className={cn(
        "inline-flex items-center rounded-md border font-mono tracking-tight uppercase",
        padding,
        styles
      )}
    >
      {status}
    </span>
  );
}
