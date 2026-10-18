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
  const [academicYear, setAcademicYear] = useState("2026 – 27");
  const [isHelpOpen, setIsHelpOpen] = useState(false);

  return (
    <div className="min-h-screen w-full bg-[#F4F6F9] text-slate-900 flex flex-col relative">
      {/* 1. Desktop Persistent Dark Navy Sidebar */}
      <aside
        className="hidden lg:flex flex-col fixed top-0 bottom-0 left-0 w-64 h-screen z-40 bg-[#0B1528] border-r border-[#16243E] overflow-y-auto"
        aria-label="Institutional Sidebar"
      >
        <Sidebar onOpenHelp={() => setIsHelpOpen(true)} />
      </aside>

      {/* 2. Mobile Responsive Drawer */}
      {mobileMenuOpen && (
        <div
          className="fixed inset-0 z-50 flex lg:hidden bg-slate-900/70 backdrop-blur-xs transition-opacity"
          onClick={() => setMobileMenuOpen(false)}
          role="dialog"
          aria-modal="true"
        >
          <div
            className="relative flex w-72 max-w-xs flex-1 flex-col bg-[#0B1528] shadow-2xl h-full"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="absolute top-3 right-3 z-10">
              <button
                type="button"
                onClick={() => setMobileMenuOpen(false)}
                className="p-2 rounded-lg text-slate-400 hover:text-white hover:bg-[#13223E] cursor-pointer"
                aria-label="Close navigation drawer"
              >
                <Icon name="x-mark" className="h-5 w-5" />
              </button>
            </div>

            <Sidebar
              onNavigate={() => setMobileMenuOpen(false)}
              onOpenHelp={() => setIsHelpOpen(true)}
            />
          </div>
        </div>
      )}

      {/* 3. Main Workspace Column (Padded by 16rem / 256px on desktop to clear sidebar) */}
      <div className="flex-1 flex flex-col min-w-0 lg:pl-64 w-full">
        {/* Dark Navy Institutional Top Bar */}
        <TopBar
          onToggleMobileSidebar={() => setMobileMenuOpen(true)}
          academicYear={academicYear}
          onYearChange={setAcademicYear}
        />

        {/* Dashboard / Module Content */}
        <main className="flex-1 px-4 py-6 sm:px-6 lg:px-8 max-w-7xl w-full mx-auto">
          {children}
        </main>

        {/* Institutional Footer */}
        <footer className="mt-auto border-t border-slate-200 bg-white px-4 py-5 text-xs text-slate-500 sm:px-6 lg:px-8">
          <div className="max-w-7xl mx-auto flex flex-col md:flex-row items-center justify-between gap-3 text-center md:text-left">
            <div>
              <p className="font-semibold text-slate-800">
                R. P. Institute of Hospitality & Management, Vasai
              </p>
              <p className="text-[11px] text-slate-500 mt-0.5">
                Affiliated to University of Mumbai • Approved by Govt. of Maharashtra • CampusOS ERP
              </p>
            </div>

            <div className="flex items-center space-x-3 text-[11px]">
              <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full bg-red-50 text-[#D92534] border border-red-200">
                <span className="w-1.5 h-1.5 rounded-full bg-[#D92534]"></span>
                Demonstration Environment
              </span>
              <span className="text-slate-300">|</span>
              <span className="text-slate-600">
                Academic Session: <strong className="text-slate-900">{academicYear}</strong>
              </span>
            </div>
          </div>
        </footer>
      </div>

      {/* Interactive Help & Support Modal */}
      {isHelpOpen && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-xs"
          onClick={() => setIsHelpOpen(false)}
          role="dialog"
          aria-modal="true"
        >
          <div
            className="w-full max-w-md rounded-2xl bg-white p-6 shadow-2xl border border-slate-200"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="flex items-center justify-between pb-3 border-b border-slate-100">
              <div className="flex items-center space-x-2.5">
                <div className="p-2 rounded-xl bg-blue-50 text-[#1657D9]">
                  <Icon name="question-mark-circle" className="h-5 w-5" />
                </div>
                <h3 className="text-base font-bold text-slate-900">
                  CampusOS Helpdesk & IT Support
                </h3>
              </div>
              <button
                onClick={() => setIsHelpOpen(false)}
                className="text-slate-400 hover:text-slate-600 p-1 rounded-lg cursor-pointer"
              >
                <Icon name="x-mark" className="h-5 w-5" />
              </button>
            </div>

            <div className="py-4 space-y-3 text-xs text-slate-600">
              <p>
                Welcome to <strong>RPIHM CampusOS</strong> institutional support desk. If you need assistance with academic schedules, lab reservations, or student dossiers:
              </p>
              <div className="p-3 rounded-xl bg-slate-50 border border-slate-200 space-y-1.5 font-medium">
                <div>IT Support Desk: <span className="font-mono text-slate-800">it-support@rpihm.edu.in</span></div>
                <div>Campus Registrar: <span className="font-mono text-slate-800">registrar@rpihm.edu.in</span></div>
                <div>Campus Helpline: <span className="font-mono text-slate-800">+91 (0250) 238-XXXX</span></div>
              </div>
              <p className="text-[11px] text-slate-400 italic">
                Note: In this demonstration build, support tickets are simulated.
              </p>
            </div>

            <div className="pt-3 border-t border-slate-100 flex justify-end">
              <button
                onClick={() => setIsHelpOpen(false)}
                className="px-4 py-2 bg-[#1657D9] hover:bg-[#1248B8] text-white text-xs font-semibold rounded-lg transition-colors cursor-pointer"
              >
                Close Support
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
