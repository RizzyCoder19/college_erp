"use client";

import React from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { InstituteCrest } from "@/components/brand/InstituteCrest";
import { Icon } from "@/components/common/Icon";
import { MODULES_LIST } from "@/data/mockData";

interface SidebarProps {
  onNavigate?: () => void;
}

export const Sidebar: React.FC<SidebarProps> = ({ onNavigate }) => {
  const pathname = usePathname();

  const isOverview = pathname === "/";

  return (
    <aside className="flex h-full w-64 flex-col bg-[#0A192F] text-slate-200 border-r border-[#1E3A5F] select-none">
      {/* Brand Header */}
      <div className="flex items-center space-x-3 px-5 py-5 border-b border-[#1E3A5F]/80 bg-[#071224]">
        <InstituteCrest size={40} />
        <div>
          <div className="flex items-center space-x-1.5">
            <span className="text-base font-extrabold tracking-tight text-white font-serif">
              RPIHM
            </span>
            <span className="text-xs font-semibold px-1.5 py-0.2 rounded bg-amber-500/20 text-amber-300 border border-amber-400/30">
              CampusOS
            </span>
          </div>
          <p className="text-[10px] text-amber-200/70 tracking-wider uppercase font-medium mt-0.5">
            Academic & Hospitality ERP
          </p>
        </div>
      </div>

      {/* Navigation List */}
      <div className="flex-1 overflow-y-auto px-3 py-4 space-y-6">
        {/* Core Institutional Navigation */}
        <div>
          <div className="px-3 text-[10px] font-bold uppercase tracking-wider text-slate-400/80 mb-2">
            Executive Cockpit
          </div>
          <nav className="space-y-1">
            <Link
              href="/"
              onClick={onNavigate}
              className={`flex items-center space-x-3 rounded-xl px-3 py-2.5 text-xs font-semibold transition-all ${
                isOverview
                  ? "bg-gradient-to-r from-amber-500/20 to-amber-500/5 text-amber-300 border-l-4 border-amber-400 shadow-sm"
                  : "text-slate-300 hover:bg-slate-800/60 hover:text-white"
              }`}
            >
              <Icon
                name="chart-bar"
                className={`h-4 w-4 shrink-0 ${
                  isOverview ? "text-amber-400" : "text-slate-400"
                }`}
              />
              <span>Executive Overview</span>
            </Link>

            <Link
              href="/#switchboard"
              onClick={onNavigate}
              className="flex items-center space-x-3 rounded-xl px-3 py-2 text-xs font-medium text-slate-300 hover:bg-slate-800/60 hover:text-white transition-colors"
            >
              <Icon name="briefcase" className="h-4 w-4 shrink-0 text-slate-400" />
              <span>Module Switchboard</span>
            </Link>
          </nav>
        </div>

        {/* 8 Core ERP Modules */}
        <div>
          <div className="flex items-center justify-between px-3 text-[10px] font-bold uppercase tracking-wider text-slate-400/80 mb-2">
            <span>Enterprise Modules</span>
            <span className="text-[9px] bg-slate-800 px-1.5 py-0.5 rounded text-amber-300/80 font-mono">
              8 Systems
            </span>
          </div>
          <nav className="space-y-1">
            {MODULES_LIST.map((module) => {
              const isActive = pathname === `/modules/${module.slug}`;
              return (
                <Link
                  key={module.slug}
                  href={`/modules/${module.slug}`}
                  onClick={onNavigate}
                  className={`flex items-center justify-between rounded-xl px-3 py-2 text-xs font-medium transition-all group ${
                    isActive
                      ? "bg-gradient-to-r from-amber-500/20 to-amber-500/5 text-amber-300 border-l-4 border-amber-400 font-semibold shadow-sm"
                      : "text-slate-300 hover:bg-slate-800/60 hover:text-white"
                  }`}
                >
                  <div className="flex items-center space-x-3 truncate">
                    <Icon
                      name={module.icon}
                      className={`h-4 w-4 shrink-0 ${
                        isActive
                          ? "text-amber-400"
                          : "text-slate-400 group-hover:text-amber-300"
                      }`}
                    />
                    <span className="truncate">{module.title}</span>
                  </div>
                  {isActive && (
                    <span className="w-1.5 h-1.5 rounded-full bg-amber-400 shrink-0"></span>
                  )}
                </Link>
              );
            })}
          </nav>
        </div>
      </div>

      {/* Demonstration Sandbox Notice Footer */}
      <div className="p-3.5 border-t border-[#1E3A5F]/80 bg-[#071224]/80">
        <div className="rounded-xl bg-[#0F233D] border border-amber-500/30 p-2.5">
          <div className="flex items-center space-x-2">
            <span className="flex h-2 w-2 relative">
              <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-amber-400 opacity-75"></span>
              <span className="relative inline-flex rounded-full h-2 w-2 bg-amber-400"></span>
            </span>
            <span className="text-[11px] font-bold text-amber-300 uppercase tracking-wide">
              Demonstration Mode
            </span>
          </div>
          <p className="text-[10px] text-slate-300 mt-1 leading-relaxed">
            Fictional institutional dataset. Stage 2 dashboard shell.
          </p>
          <div className="mt-2 pt-1.5 border-t border-slate-700/60 flex items-center justify-between text-[9px] text-slate-400 font-mono">
            <span>Stack: Next.js 16</span>
            <span className="text-emerald-400">Turbopack</span>
          </div>
        </div>
      </div>
    </aside>
  );
};
