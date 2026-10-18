"use client";

import React from "react";
import Link from "next/link";
import Image from "next/image";
import { usePathname } from "next/navigation";
import { Icon } from "@/components/common/Icon";
import { MODULES_LIST } from "@/data/mockData";

interface SidebarProps {
  onNavigate?: () => void;
  onOpenHelp?: () => void;
}

export const Sidebar: React.FC<SidebarProps> = ({ onNavigate, onOpenHelp }) => {
  const pathname = usePathname();

  const isDashboard = pathname === "/";

  // Filter modules into main navigation and system navigation
  const mainModules = MODULES_LIST.filter((m) => m.category === "main");
  const systemModules = MODULES_LIST.filter((m) => m.category === "system");

  return (
    <aside className="flex h-full w-64 flex-col bg-[#0B1528] text-slate-300 border-r border-[#16243E] select-none text-[15px]">
      {/* Brand & Official Logo Header */}
      <div className="px-5 py-5 border-b border-[#16243E] bg-[#070E1C]/80">
        <Link
          href="/"
          onClick={onNavigate}
          className="flex flex-col gap-2 group focus:outline-none"
        >
          {/* Official Logo */}
          <div className="bg-white/95 rounded-lg p-2 shadow-xs border border-white/20 transition-all group-hover:bg-white">
            <Image
              src="/images/rpihm-logo.webp"
              alt="R. P. Institute of Hospitality & Management"
              width={210}
              height={42}
              className="h-auto w-full object-contain"
              priority
            />
          </div>

          <div className="mt-1">
            <div className="flex items-center space-x-1.5">
              <span className="text-base font-bold text-white tracking-tight">
                CampusOS
              </span>
              <span className="text-[10px] font-semibold px-1.5 py-0.5 rounded bg-blue-500/20 text-blue-300 border border-blue-400/30">
                ERP
              </span>
            </div>
            <p className="text-xs text-slate-400 font-medium">
              Academic & Administrative ERP
            </p>
          </div>
        </Link>
      </div>

      {/* Navigation Scrollable Body */}
      <div className="flex-1 overflow-y-auto px-3 py-4 space-y-6">
        {/* Dashboard Link */}
        <nav className="space-y-1">
          <Link
            href="/"
            onClick={onNavigate}
            className={`magic-nav-item flex items-center space-x-3 rounded-lg px-3.5 py-2.5 transition-all ${
              isDashboard
                ? "magic-nav-active"
                : "text-slate-300 hover:bg-[#13223E] hover:text-white"
            }`}
          >
            <Icon
              name="dashboard"
              className={`h-5 w-5 shrink-0 ${
                isDashboard ? "text-white" : "text-slate-400"
              }`}
            />
            <span className="font-medium">Dashboard</span>
          </Link>
        </nav>

        {/* Core Academic & Administrative Modules */}
        <nav className="space-y-1">
          {mainModules.map((module) => {
            const isActive = pathname === `/modules/${module.slug}`;
            return (
              <Link
                key={module.slug}
                href={`/modules/${module.slug}`}
                onClick={onNavigate}
                className={`magic-nav-item flex items-center space-x-3 rounded-lg px-3.5 py-2 transition-all ${
                  isActive
                    ? "magic-nav-active"
                    : "text-slate-300 hover:bg-[#13223E] hover:text-white"
                }`}
              >
                <Icon
                  name={module.icon}
                  className={`h-5 w-5 shrink-0 ${
                    isActive ? "text-white" : "text-slate-400"
                  }`}
                />
                <span className="truncate">{module.title}</span>
              </Link>
            );
          })}
        </nav>

        {/* System Group */}
        <div>
          <div className="px-3.5 text-xs font-bold uppercase tracking-wider text-slate-500 mb-2">
            SYSTEM
          </div>
          <nav className="space-y-1">
            {systemModules.map((module) => {
              const isActive = pathname === `/modules/${module.slug}`;
              return (
                <Link
                  key={module.slug}
                  href={`/modules/${module.slug}`}
                  onClick={onNavigate}
                  className={`magic-nav-item flex items-center space-x-3 rounded-lg px-3.5 py-2 transition-all ${
                    isActive
                      ? "magic-nav-active"
                      : "text-slate-300 hover:bg-[#13223E] hover:text-white"
                  }`}
                >
                  <Icon
                    name={module.icon}
                    className={`h-5 w-5 shrink-0 ${
                      isActive ? "text-white" : "text-slate-400"
                    }`}
                  />
                  <span>{module.title}</span>
                </Link>
              );
            })}

            <button
              onClick={() => {
                if (onOpenHelp) onOpenHelp();
                if (onNavigate) onNavigate();
              }}
              className="w-full text-left flex items-center space-x-3 rounded-lg px-3.5 py-2 text-slate-300 hover:bg-[#13223E] hover:text-white transition-all cursor-pointer"
            >
              <Icon name="question-mark-circle" className="h-5 w-5 shrink-0 text-slate-400" />
              <span>Help & Support</span>
            </button>
          </nav>
        </div>
      </div>

      {/* Footer Demonstration Status */}
      <div className="p-3.5 border-t border-[#16243E] bg-[#070E1C]">
        <div className="flex items-center space-x-2 text-xs font-medium text-slate-300">
          <span className="font-semibold text-white">RPIHM CampusOS</span>
          <span className="text-slate-500">•</span>
          <span className="text-slate-400">Version 0.1.0 (Demo)</span>
        </div>

        <div className="mt-2 flex items-start space-x-2 p-2 rounded-lg bg-red-950/40 border border-red-800/40 text-[11px] text-red-200">
          <span className="w-2 h-2 rounded-full bg-red-500 shrink-0 mt-0.5"></span>
          <div>
            <strong className="font-bold text-red-400">Demonstration Mode</strong>
            <p className="text-slate-400 text-[10px] leading-tight mt-0.5">
              Fictional data for UI/UX showcase only
            </p>
          </div>
        </div>
      </div>
    </aside>
  );
};
