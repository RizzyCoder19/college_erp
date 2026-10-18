"use client";

import React, { useState } from "react";
import { Sidebar } from "@/components/layout/Sidebar";
import { TopBar } from "@/components/layout/TopBar";
import { Icon } from "@/components/common/Icon";

interface AppShellProps {
  children: React.ReactNode;
}

export const AppShell: React.FC<AppShellProps> = ({ children }) => {
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const [currentTerm, setCurrentTerm] = useState("Odd Sem 2026-27");

  return (
    <div className="flex min-h-dvh w-full bg-slate-50 text-slate-900 dark:bg-slate-950 dark:text-slate-100 antialiased">
      {/* Desktop Sidebar */}
      <div className="hidden lg:flex lg:w-64 lg:flex-col lg:fixed lg:inset-y-0 z-30 shadow-lg">
        <Sidebar />
      </div>

      {/* Mobile Drawer (Responsive slide-out) */}
      {mobileMenuOpen && (
        <div
          className="fixed inset-0 z-50 flex lg:hidden bg-slate-900/70 backdrop-blur-xs transition-opacity"
          onClick={() => setMobileMenuOpen(false)}
          role="dialog"
          aria-modal="true"
        >
          <div
            className="relative flex w-72 max-w-xs flex-1 flex-col bg-[#0A192F] shadow-2xl transition-transform"
            onClick={(e) => e.stopPropagation()}
          >
            {/* Close Button on Mobile Drawer */}
            <div className="absolute top-3 right-3 z-10">
              <button
                type="button"
                onClick={() => setMobileMenuOpen(false)}
                className="p-2 rounded-lg text-slate-400 hover:text-white hover:bg-slate-800"
                aria-label="Close navigation drawer"
              >
                <Icon name="x-mark" className="h-5 w-5" />
              </button>
            </div>

            <Sidebar onNavigate={() => setMobileMenuOpen(false)} />
          </div>
        </div>
      )}

      {/* Main Content Area */}
      <div className="flex flex-1 flex-col lg:pl-64 min-h-dvh">
        <TopBar
          onToggleMobileSidebar={() => setMobileMenuOpen(true)}
          currentTerm={currentTerm}
          onTermChange={setCurrentTerm}
        />

        <main className="flex-1 px-4 py-6 sm:px-6 lg:px-8 max-w-7xl w-full mx-auto">
          {children}
        </main>

        {/* Institutional Footer */}
        <footer className="mt-auto border-t border-slate-200 bg-white px-4 py-6 text-xs text-slate-500 sm:px-6 lg:px-8 dark:border-slate-800 dark:bg-[#0A192F]/60">
          <div className="max-w-7xl mx-auto flex flex-col md:flex-row items-center justify-between gap-3 text-center md:text-left">
            <div>
              <p className="font-semibold text-slate-700 dark:text-slate-300">
                Rajendra Prasad Institute of Hotel Management & Catering Technology
              </p>
              <p className="text-[11px] text-slate-400 mt-0.5">
                CampusOS Enterprise Resource Planning & Academic Operations System
              </p>
            </div>

            <div className="flex items-center space-x-3 text-[11px]">
              <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full bg-amber-50 text-amber-800 border border-amber-300 dark:bg-amber-950/40 dark:text-amber-300 dark:border-amber-700">
                <span className="w-1.5 h-1.5 rounded-full bg-amber-500"></span>
                Demonstration Simulation
              </span>
              <span className="text-slate-400">|</span>
              <span className="text-slate-500 dark:text-slate-400">
                Active Term: <strong className="text-slate-700 dark:text-slate-300">{currentTerm}</strong>
              </span>
            </div>
          </div>
        </footer>
      </div>
    </div>
  );
};
