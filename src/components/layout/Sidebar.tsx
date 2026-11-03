"use client";

import React, { useState, useEffect } from "react";
import Link from "next/link";
import Image from "next/image";
import { usePathname, useSearchParams } from "next/navigation";
import { Icon } from "@/components/common/Icon";
import { MODULES_LIST } from "@/data/mockData";
import { getCurrentUserAction } from "@/lib/actions/auth";

interface SidebarProps {
  onNavigate?: () => void;
  onOpenHelp?: () => void;
}

export const SidebarInner: React.FC<SidebarProps> = ({ onNavigate, onOpenHelp }) => {
  const pathname = usePathname();
  const searchParams = useSearchParams();
  const currentTab = searchParams ? (searchParams.get("tab") || "overview") : "overview";
  const [currentUser, setCurrentUser] = useState<{ role: string; fullName: string } | null>(null);

  useEffect(() => {
    getCurrentUserAction().then((res) => {
      if (res.success && res.data) {
        setCurrentUser(res.data);
      }
    });
  }, []);

  const isDashboard = pathname === "/";
  const isStudent = currentUser?.role === "STUDENT_VIEWER" || pathname.startsWith("/portal/student");
  const isFaculty = currentUser?.role === "FACULTY_MEMBER" || pathname.startsWith("/portal/faculty");
  const isPortalUser = isStudent || isFaculty;

  // Filter modules into main navigation and system navigation
  const mainModules = MODULES_LIST.filter((m) => m.category === "main");
  const systemModules = MODULES_LIST.filter((m) => m.category === "system");

  return (
    <div className="flex h-full w-full flex-col bg-[#0B1528] text-slate-300 select-none text-[15px]">
      {/* Brand & Official Logo Header with Camouflage Backdrop & Hover Zoom */}
      <div className="relative overflow-hidden px-5 py-5 border-b border-[#16243E] bg-[#070E1C] group">
        <div className="absolute inset-0 z-0 overflow-hidden pointer-events-none opacity-20 group-hover:opacity-35 transition-opacity duration-500">
          <Image
            src="/images/campus-illuminated-sign.png"
            alt=""
            fill
            sizes="300px"
            className="object-cover object-center transition-transform duration-700 ease-out group-hover:scale-115"
          />
          <div className="absolute inset-0 bg-gradient-to-b from-[#070E1C]/75 via-[#070E1C]/85 to-[#070E1C] backdrop-blur-[1px]"></div>
        </div>

        <Link
          href="/"
          onClick={onNavigate}
          className="relative z-10 flex flex-col gap-2 focus:outline-none"
        >
          {/* Official Logo without white box */}
          <div className="py-1 px-0.5 transition-all">
            <Image
              src="/images/rpihm-logo-transparent.webp"
              alt="R. P. Institute of Hospitality & Management"
              width={210}
              height={52}
              className="h-auto w-full object-contain filter drop-shadow-xs"
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
        {isStudent ? (
          /* Student Self-Service Navigation */
          <nav className="space-y-1">
            <div className="px-3.5 text-xs font-bold uppercase tracking-wider text-blue-400 mb-2 flex items-center justify-between">
              <span>STUDENT WORKSPACE</span>
              <span className="text-[10px] px-1.5 py-0.2 rounded bg-blue-500/20 text-blue-300 font-mono">PORTAL</span>
            </div>

            {[
              { id: "overview", href: "/portal/student?tab=overview", label: "Profile & Overview", icon: "user" },
              { id: "academics", href: "/portal/student?tab=academics", label: "Academics & Curriculum", icon: "academic-cap" },
              { id: "timetable", href: "/portal/student?tab=timetable", label: "Class Schedule", icon: "calendar" },
              { id: "attendance", href: "/portal/student?tab=attendance", label: "Attendance Ledger", icon: "clipboard-check" },
              { id: "examinations", href: "/portal/student?tab=examinations", label: "Examinations", icon: "award" },
              { id: "fees", href: "/portal/student?tab=fees", label: "Fee Ledger", icon: "currency-rupee" },
              { id: "documents", href: "/portal/student?tab=documents", label: "Compliance Documents", icon: "document-duplicate" },
            ].map((item) => {
              const isActive = pathname.startsWith("/portal/student") && currentTab === item.id;
              return (
                <Link
                  key={item.id}
                  href={item.href}
                  onClick={onNavigate}
                  className={`magic-nav-item flex items-center justify-between rounded-lg px-3.5 py-2.5 transition-all text-xs font-medium ${
                    isActive
                      ? "magic-nav-active bg-gradient-to-r from-[#1657D9] to-[#2563EB] text-white font-semibold shadow-md border-l-4 border-blue-300 pl-2.5"
                      : "text-slate-300 hover:bg-[#13223E] hover:text-white border-l-4 border-transparent pl-2.5"
                  }`}
                >
                  <div className="flex items-center space-x-3">
                    <Icon
                      name={item.icon}
                      className={`h-4.5 w-4.5 shrink-0 ${isActive ? "text-white" : "text-slate-400"}`}
                    />
                    <span>{item.label}</span>
                  </div>
                  {item.id === "academics" && (
                    <span className={`text-[10px] px-1.5 py-0.5 rounded-full font-mono font-semibold ${isActive ? "bg-white/20 text-white" : "bg-slate-800 text-slate-400"}`}>
                      5
                    </span>
                  )}
                  {item.id === "fees" && (
                    <span className="text-[10px] px-1.5 py-0.5 rounded-full font-semibold bg-emerald-500/20 text-emerald-300">
                      PAID
                    </span>
                  )}
                </Link>
              );
            })}
          </nav>
        ) : isFaculty ? (
          /* Faculty Self-Service Navigation */
          <nav className="space-y-1">
            <div className="px-3.5 text-xs font-bold uppercase tracking-wider text-blue-400 mb-2 flex items-center justify-between">
              <span>FACULTY WORKSPACE</span>
              <span className="text-[10px] px-1.5 py-0.2 rounded bg-indigo-500/20 text-indigo-300 font-mono">STAFF</span>
            </div>

            {[
              { id: "overview", href: "/portal/faculty?tab=overview", label: "Overview & Workload", icon: "dashboard" },
              { id: "classes", href: "/portal/faculty?tab=classes", label: "Assigned Classes", icon: "book-open" },
              { id: "timetable", href: "/portal/faculty?tab=timetable", label: "Weekly Schedule", icon: "calendar" },
              { id: "roster", href: "/portal/faculty?tab=roster", label: "Class Rosters", icon: "user-group" },
              { id: "attendance", href: "/portal/faculty?tab=attendance", label: "Attendance History", icon: "clipboard-check" },
              { id: "curriculum", href: "/portal/faculty?tab=curriculum", label: "Course Curriculum", icon: "academic-cap" },
            ].map((item) => {
              const isActive = pathname.startsWith("/portal/faculty") && currentTab === item.id;
              return (
                <Link
                  key={item.id}
                  href={item.href}
                  onClick={onNavigate}
                  className={`magic-nav-item flex items-center justify-between rounded-lg px-3.5 py-2.5 transition-all text-xs font-medium ${
                    isActive
                      ? "magic-nav-active bg-gradient-to-r from-[#1657D9] to-[#2563EB] text-white font-semibold shadow-md border-l-4 border-blue-300 pl-2.5"
                      : "text-slate-300 hover:bg-[#13223E] hover:text-white border-l-4 border-transparent pl-2.5"
                  }`}
                >
                  <div className="flex items-center space-x-3">
                    <Icon
                      name={item.icon}
                      className={`h-4.5 w-4.5 shrink-0 ${isActive ? "text-white" : "text-slate-400"}`}
                    />
                    <span>{item.label}</span>
                  </div>
                  {item.id === "classes" && (
                    <span className={`text-[10px] px-1.5 py-0.5 rounded-full font-mono font-semibold ${isActive ? "bg-white/20 text-white" : "bg-slate-800 text-slate-400"}`}>
                      1
                    </span>
                  )}
                  {item.id === "roster" && (
                    <span className="text-[10px] px-1.5 py-0.5 rounded-full font-semibold bg-emerald-500/20 text-emerald-300">
                      FERPA
                    </span>
                  )}
                </Link>
              );
            })}
          </nav>
        ) : (
          <>
            {/* Dashboard Link with Magic Navigation Active Indicator */}
            <nav className="space-y-1">
              <Link
                href="/"
                onClick={onNavigate}
                className={`magic-nav-item flex items-center space-x-3 rounded-lg px-3.5 py-2.5 transition-all ${
                  isDashboard
                    ? "magic-nav-active bg-[#1657D9] text-white font-semibold shadow-md"
                    : "text-slate-300 hover:bg-[#13223E] hover:text-white"
                }`}
              >
                <Icon
                  name="dashboard"
                  className={`h-5 w-5 shrink-0 ${
                    isDashboard ? "text-white" : "text-slate-400"
                  }`}
                />
                <span>Dashboard</span>
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
                        ? "magic-nav-active bg-[#1657D9] text-white font-semibold shadow-md"
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
          </>
        )}

        {/* System Group: Only for Administrators; Support group for portal users */}
        {isPortalUser ? (
          <div>
            <div className="px-3.5 text-xs font-bold uppercase tracking-wider text-slate-500 mb-2">
              SUPPORT
            </div>
            <nav className="space-y-1">
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
        ) : (
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
                        ? "magic-nav-active bg-[#1657D9] text-white font-semibold shadow-md"
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
        )}
      </div>

      {/* Institutional System Footer with Camouflage Backdrop & Hover Zoom */}
      <div className="relative overflow-hidden p-3.5 border-t border-[#16243E] bg-[#070E1C] group">
        <div className="absolute inset-0 z-0 overflow-hidden pointer-events-none opacity-0 group-hover:opacity-20 transition-opacity duration-500">
          <Image
            src="/images/campus-illuminated-sign.png"
            alt=""
            fill
            sizes="300px"
            className="object-cover object-center transition-transform duration-700 ease-out group-hover:scale-115"
          />
          <div className="absolute inset-0 bg-[#070E1C]/80 backdrop-blur-[1px]"></div>
        </div>

        <div className="relative z-10">
          <div className="flex items-center space-x-2 text-xs font-medium text-slate-300">
            <span className="font-semibold text-white">RPIHM CampusOS</span>
            <span className="text-slate-500">•</span>
            <span className="text-slate-400">v0.1.0</span>
          </div>
          <p className="text-[11px] text-slate-400 mt-1 leading-tight">
            Vasai, Maharashtra • Affiliated to Univ. of Mumbai
          </p>
        </div>
      </div>
    </div>
  );
};

export const Sidebar: React.FC<SidebarProps> = (props) => (
  <React.Suspense fallback={<div className="flex h-full w-full bg-[#0B1528]" />}>
    <SidebarInner {...props} />
  </React.Suspense>
);
