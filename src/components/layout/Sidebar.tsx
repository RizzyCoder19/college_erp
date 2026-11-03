"use client";

import React, { useState, useEffect } from "react";
import Link from "next/link";
import Image from "next/image";
import { usePathname } from "next/navigation";
import { Icon } from "@/components/common/Icon";
import { MODULES_LIST } from "@/data/mockData";
import { getCurrentUserAction } from "@/lib/actions/auth";

interface SidebarProps {
  onNavigate?: () => void;
  onOpenHelp?: () => void;
}

export const Sidebar: React.FC<SidebarProps> = ({ onNavigate, onOpenHelp }) => {
  const pathname = usePathname();
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
            <div className="px-3.5 text-xs font-bold uppercase tracking-wider text-slate-400 mb-2">
              STUDENT WORKSPACE
            </div>
            <Link
              href="/portal/student?tab=overview"
              onClick={onNavigate}
              className={`magic-nav-item flex items-center space-x-3 rounded-lg px-3.5 py-2.5 transition-all ${
                pathname === "/portal/student"
                  ? "magic-nav-active bg-[#1657D9] text-white font-semibold shadow-md"
                  : "text-slate-300 hover:bg-[#13223E] hover:text-white"
              }`}
            >
              <Icon
                name="user"
                className={`h-5 w-5 shrink-0 ${
                  pathname === "/portal/student" ? "text-white" : "text-slate-400"
                }`}
              />
              <span>Profile & Overview</span>
            </Link>

            <Link
              href="/portal/student?tab=academics"
              onClick={onNavigate}
              className="magic-nav-item flex items-center space-x-3 rounded-lg px-3.5 py-2.5 text-slate-300 hover:bg-[#13223E] hover:text-white transition-all"
            >
              <Icon name="academic-cap" className="h-5 w-5 shrink-0 text-slate-400" />
              <span>Academics & Curriculum</span>
            </Link>

            <Link
              href="/portal/student?tab=timetable"
              onClick={onNavigate}
              className="magic-nav-item flex items-center space-x-3 rounded-lg px-3.5 py-2.5 text-slate-300 hover:bg-[#13223E] hover:text-white transition-all"
            >
              <Icon name="calendar" className="h-5 w-5 shrink-0 text-slate-400" />
              <span>Class Schedule</span>
            </Link>

            <Link
              href="/portal/student?tab=attendance"
              onClick={onNavigate}
              className="magic-nav-item flex items-center space-x-3 rounded-lg px-3.5 py-2.5 text-slate-300 hover:bg-[#13223E] hover:text-white transition-all"
            >
              <Icon name="clipboard-check" className="h-5 w-5 shrink-0 text-slate-400" />
              <span>Attendance</span>
            </Link>

            <Link
              href="/portal/student?tab=examinations"
              onClick={onNavigate}
              className="magic-nav-item flex items-center space-x-3 rounded-lg px-3.5 py-2.5 text-slate-300 hover:bg-[#13223E] hover:text-white transition-all"
            >
              <Icon name="award" className="h-5 w-5 shrink-0 text-slate-400" />
              <span>Examinations</span>
            </Link>

            <Link
              href="/portal/student?tab=fees"
              onClick={onNavigate}
              className="magic-nav-item flex items-center space-x-3 rounded-lg px-3.5 py-2.5 text-slate-300 hover:bg-[#13223E] hover:text-white transition-all"
            >
              <Icon name="currency-rupee" className="h-5 w-5 shrink-0 text-slate-400" />
              <span>Fee Ledger</span>
            </Link>

            <Link
              href="/portal/student?tab=documents"
              onClick={onNavigate}
              className="magic-nav-item flex items-center space-x-3 rounded-lg px-3.5 py-2.5 text-slate-300 hover:bg-[#13223E] hover:text-white transition-all"
            >
              <Icon name="document-duplicate" className="h-5 w-5 shrink-0 text-slate-400" />
              <span>Compliance Documents</span>
            </Link>
          </nav>
        ) : isFaculty ? (
          /* Faculty Self-Service Navigation */
          <nav className="space-y-1">
            <div className="px-3.5 text-xs font-bold uppercase tracking-wider text-blue-400 mb-2">
              FACULTY WORKSPACE
            </div>
            <Link
              href="/portal/faculty?tab=overview"
              onClick={onNavigate}
              className={`magic-nav-item flex items-center space-x-3 rounded-lg px-3.5 py-2.5 transition-all ${
                pathname === "/portal/faculty"
                  ? "magic-nav-active bg-[#1657D9] text-white font-semibold shadow-md"
                  : "text-slate-300 hover:bg-[#13223E] hover:text-white"
              }`}
            >
              <Icon
                name="dashboard"
                className={`h-5 w-5 shrink-0 ${
                  pathname === "/portal/faculty" ? "text-white" : "text-slate-400"
                }`}
              />
              <span>Overview & Workload</span>
            </Link>

            <Link
              href="/portal/faculty?tab=classes"
              onClick={onNavigate}
              className="magic-nav-item flex items-center space-x-3 rounded-lg px-3.5 py-2.5 text-slate-300 hover:bg-[#13223E] hover:text-white transition-all"
            >
              <Icon name="book-open" className="h-5 w-5 shrink-0 text-slate-400" />
              <span>Assigned Classes</span>
            </Link>

            <Link
              href="/portal/faculty?tab=timetable"
              onClick={onNavigate}
              className="magic-nav-item flex items-center space-x-3 rounded-lg px-3.5 py-2.5 text-slate-300 hover:bg-[#13223E] hover:text-white transition-all"
            >
              <Icon name="calendar" className="h-5 w-5 shrink-0 text-slate-400" />
              <span>Weekly Schedule</span>
            </Link>

            <Link
              href="/portal/faculty?tab=roster"
              onClick={onNavigate}
              className="magic-nav-item flex items-center space-x-3 rounded-lg px-3.5 py-2.5 text-slate-300 hover:bg-[#13223E] hover:text-white transition-all"
            >
              <Icon name="user-group" className="h-5 w-5 shrink-0 text-slate-400" />
              <span>Class Rosters</span>
            </Link>

            <Link
              href="/portal/faculty?tab=attendance"
              onClick={onNavigate}
              className="magic-nav-item flex items-center space-x-3 rounded-lg px-3.5 py-2.5 text-slate-300 hover:bg-[#13223E] hover:text-white transition-all"
            >
              <Icon name="clipboard-check" className="h-5 w-5 shrink-0 text-slate-400" />
              <span>Attendance History</span>
            </Link>

            <Link
              href="/portal/faculty?tab=curriculum"
              onClick={onNavigate}
              className="magic-nav-item flex items-center space-x-3 rounded-lg px-3.5 py-2.5 text-slate-300 hover:bg-[#13223E] hover:text-white transition-all"
            >
              <Icon name="academic-cap" className="h-5 w-5 shrink-0 text-slate-400" />
              <span>Course Curriculum</span>
            </Link>
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
