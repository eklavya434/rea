"use client";

import React, { useEffect, useState } from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import {
  Activity,
  Box,
  Cpu,
  Layers,
  PlusCircle,
  Radio,
  ShieldCheck,
  Terminal,
} from "lucide-react";

export function Navbar() {
  const pathname = usePathname();
  const [reaConnected, setReaConnected] = useState<boolean>(false);
  const [aiStatus, setAiStatus] = useState<string>("Detecting...");

  useEffect(() => {
    // Probe actual REA status and AI status on load
    fetch("/api/rea/status")
      .then((res) => res.json())
      .then((data) => {
        setReaConnected(data.connected);
      })
      .catch(() => setReaConnected(false));

    fetch("/api/projects/meta")
      .then((res) => res.json())
      .then((data) => {
        setAiStatus(data.ai?.provider || "Heuristics Fallback");
      })
      .catch(() => setAiStatus("Heuristics Fallback"));
  }, []);

  const navItems = [
    { label: "Dashboard", href: "/dashboard", icon: Layers },
    { label: "New Analysis", href: "/projects/new", icon: PlusCircle },
  ];

  return (
    <header className="sticky top-0 z-50 w-full border-b border-surface-800 bg-surface-950/80 backdrop-blur-md">
      <div className="mx-auto flex h-14 max-w-7xl items-center justify-between px-4 sm:px-6">
        <div className="flex items-center gap-6">
          <Link href="/" className="flex items-center gap-2.5 font-semibold text-slate-100 hover:text-white transition">
            <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-blue-600/20 border border-blue-500/30 text-blue-400">
              <Radio className="h-4 w-4" />
            </div>
            <div className="flex flex-col">
              <span className="text-sm font-bold tracking-tight">WEBSITE X-RAY</span>
              <span className="text-[10px] text-slate-400 font-mono tracking-widest uppercase">Analysis & Reverse Eng.</span>
            </div>
          </Link>

          <nav className="hidden md:flex items-center gap-1">
            {navItems.map((item) => {
              const Icon = item.icon;
              const isActive = pathname === item.href || (item.href !== "/" && pathname?.startsWith(item.href));
              return (
                <Link
                  key={item.href}
                  href={item.href}
                  className={`flex items-center gap-2 rounded-md px-3 py-1.5 text-xs font-medium transition ${
                    isActive
                      ? "bg-surface-800 text-blue-400 font-semibold"
                      : "text-slate-400 hover:bg-surface-900 hover:text-slate-200"
                  }`}
                >
                  <Icon className="h-3.5 w-3.5" />
                  {item.label}
                </Link>
              );
            })}
          </nav>
        </div>

        <div className="flex items-center gap-3">
          {/* REA MCP Status Indicator */}
          <div
            title={
              reaConnected
                ? "REA MCP Server is connected and active"
                : "REA MCP Server is offline. Running with browser-level heuristic inspection fallback."
            }
            className={`flex items-center gap-1.5 rounded-full border px-2.5 py-1 text-[11px] font-mono transition ${
              reaConnected
                ? "border-emerald-500/40 bg-emerald-950/40 text-emerald-300"
                : "border-slate-800 bg-surface-900 text-slate-400"
            }`}
          >
            <span
              className={`h-1.5 w-1.5 rounded-full ${
                reaConnected ? "bg-emerald-400 animate-pulse" : "bg-slate-500"
              }`}
            />
            <span>REA: {reaConnected ? "CONNECTED" : "OFFLINE"}</span>
          </div>

          {/* AI Status Indicator */}
          <div
            className="hidden sm:flex items-center gap-1.5 rounded-full border border-slate-800 bg-surface-900 px-2.5 py-1 text-[11px] font-mono text-slate-400"
            title="Active AI Provider engine"
          >
            <Cpu className="h-3 w-3 text-blue-400" />
            <span className="uppercase">{aiStatus}</span>
          </div>

          <Link
            href="/projects/new"
            className="flex items-center gap-1.5 rounded-md bg-blue-600 px-3 py-1.5 text-xs font-medium text-white shadow hover:bg-blue-500 transition"
          >
            <PlusCircle className="h-3.5 w-3.5" />
            <span>New Project</span>
          </Link>
        </div>
      </div>
    </header>
  );
}
