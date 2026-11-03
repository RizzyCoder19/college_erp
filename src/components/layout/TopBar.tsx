"use client";

import React, { useState, useEffect } from "react";
import { Icon } from "@/components/common/Icon";
import { NotificationPopover } from "@/components/common/NotificationPopover";
import { ProfileModal } from "@/components/common/ProfileModal";
import { GlobalSearchModal } from "@/components/common/GlobalSearchModal";
import { getCurrentUserAction } from "@/lib/actions/auth";

interface TopBarProps {
  onToggleMobileSidebar: () => void;
  academicYear: string;
  onYearChange: (year: string) => void;
}

export const TopBar: React.FC<TopBarProps> = ({
  onToggleMobileSidebar,
  academicYear,
  onYearChange,
}) => {
  const [isSearchOpen, setIsSearchOpen] = useState(false);
  const [isNotifOpen, setIsNotifOpen] = useState(false);
  const [isProfileOpen, setIsProfileOpen] = useState(false);
  const [currentUser, setCurrentUser] = useState<{ fullName: string; role: string; designation?: string | null } | null>(null);

  useEffect(() => {
    getCurrentUserAction().then((res) => {
      if (res.success && res.data) {
        setCurrentUser(res.data);
      }
    });
  }, []);

  useEffect(() => {

    const handleGlobalKeyDown = (e: KeyboardEvent) => {
      // Don't trigger if user is actively typing in another input/textarea
      const target = e.target as HTMLElement | null;
      if (target && (target.tagName === "INPUT" || target.tagName === "TEXTAREA" || target.isContentEditable)) {
        return;
      }

      if ((e.ctrlKey || e.metaKey) && e.key.toLowerCase() === "k") {
        e.preventDefault();
        setIsSearchOpen((prev) => !prev);
      }
    };

    window.addEventListener("keydown", handleGlobalKeyDown);
    return () => window.removeEventListener("keydown", handleGlobalKeyDown);
  }, []);

  return (
    <>
      <header className="sticky top-0 z-30 flex h-16 w-full items-center justify-between border-b border-comfort-subtle bg-card-comfort text-slate-800 px-4 sm:px-6 shadow-2xs">
        {/* Left: Mobile hamburger */}
        <div className="flex items-center space-x-3">
          <button
            type="button"
            onClick={onToggleMobileSidebar}
            className="rounded-lg p-2 text-slate-600 hover:bg-slate-100 hover:text-slate-900 lg:hidden cursor-pointer"
            aria-label="Toggle navigation drawer"
          >
            <Icon name="bars-3" className="h-6 w-6" />
          </button>
        </div>

        {/* Center: Glowing Animated Global Search Bar (Stretched & Blended) */}
        <div className="flex-1 max-w-2xl min-w-0 mx-1.5 sm:mx-6 flex items-center justify-center">
          <div id="poda" role="search" className="w-full">
            {/* Layered gradient frames */}
            <div className="glow" aria-hidden="true"></div>
            <div className="darkBorderBg" aria-hidden="true"></div>
            <div className="darkBorderBg" aria-hidden="true"></div>
            <div className="darkBorderBg" aria-hidden="true"></div>
            <div className="white" aria-hidden="true"></div>
            <div className="border" aria-hidden="true"></div>

            {/* Main control */}
            <div id="main" className="w-full">
              <label htmlFor="search-input" className="visually-hidden">
                Search
              </label>
              <input
                id="search-input"
                placeholder="Search students, faculty, programmes, notices… (Ctrl+K)"
                type="text"
                name="text"
                className="input"
                aria-label="Search institutional records"
                autoComplete="off"
                onClick={() => setIsSearchOpen(true)}
                onKeyDown={(e) => {
                  if (e.key === "Enter") {
                    setIsSearchOpen(true);
                  }
                }}
              />
              <div id="input-mask" aria-hidden="true"></div>
              <div id="pink-mask" aria-hidden="true"></div>

              <div className="filterBorder" aria-hidden="true"></div>

              <button
                id="filter-icon"
                type="button"
                aria-label="Open filters"
                onClick={() => setIsSearchOpen(true)}
              >
                <svg
                  preserveAspectRatio="none"
                  height="26"
                  width="26"
                  viewBox="4.8 4.56 14.832 15.408"
                  fill="none"
                  aria-hidden="true"
                >
                  <path
                    d="M8.16 6.65002H15.83C16.47 6.65002 16.99 7.17002 16.99 7.81002V9.09002C16.99 9.56002 16.7 10.14 16.41 10.43L13.91 12.64C13.56 12.93 13.33 13.51 13.33 13.98V16.48C13.33 16.83 13.1 17.29 12.81 17.47L12 17.98C11.24 18.45 10.2 17.92 10.2 16.99V13.91C10.2 13.5 9.97 12.98 9.73 12.69L7.52 10.36C7.23 10.08 7 9.55002 7 9.20002V7.87002C7 7.17002 7.52 6.65002 8.16 6.65002Z"
                    stroke="#FFFFFF"
                    strokeWidth="1.2"
                    strokeMiterlimit="10"
                    strokeLinecap="round"
                    strokeLinejoin="round"
                  ></path>
                </svg>
              </button>

              <div id="search-icon" aria-hidden="true">
                <svg
                  xmlns="http://www.w3.org/2000/svg"
                  width="22"
                  viewBox="0 0 24 24"
                  strokeWidth="2"
                  strokeLinejoin="round"
                  strokeLinecap="round"
                  height="22"
                  fill="none"
                  className="feather feather-search"
                  aria-hidden="true"
                >
                  <circle stroke="url(#search)" r="8" cy="11" cx="11"></circle>
                  <line
                    stroke="url(#searchl)"
                    y2="16.65"
                    y1="22"
                    x2="16.65"
                    x1="22"
                  ></line>
                  <defs>
                    <linearGradient gradientTransform="rotate(50)" id="search">
                      <stop stopColor="#1657D9" offset="0%"></stop>
                      <stop stopColor="#3B82F6" offset="100%"></stop>
                    </linearGradient>
                    <linearGradient id="searchl">
                      <stop stopColor="#1657D9" offset="0%"></stop>
                      <stop stopColor="#1D4ED8" offset="100%"></stop>
                    </linearGradient>
                  </defs>
                </svg>
              </div>
            </div>
          </div>
        </div>

        {/* Right: Academic Year, Notifications & Profile */}
        <div className="flex items-center space-x-2 sm:space-x-4">
          {/* Academic Year Selector */}
          <div className="hidden md:flex items-center space-x-2 bg-slate-50 border border-slate-200 rounded-lg px-3 py-1.5 shadow-2xs">
            <Icon name="calendar" className="h-4 w-4 text-[#1657D9]" />
            <div className="text-left leading-none">
              <span className="text-[10px] uppercase font-bold text-slate-400 block mb-0.5">
                Academic Year
              </span>
              <select
                id="academic-year-select"
                value={academicYear}
                onChange={(e) => onYearChange(e.target.value)}
                className="text-xs font-bold text-slate-800 bg-transparent focus:outline-none cursor-pointer"
                aria-label="Select Academic Year"
              >
                <option value="2026 – 27">2026 – 27</option>
                <option value="2025 – 26">2025 – 26</option>
                <option value="2024 – 25">2024 – 25</option>
              </select>
            </div>
          </div>

          {/* Notifications Dropdown */}
          <div className="relative">
            <button
              onClick={() => setIsNotifOpen(!isNotifOpen)}
              className="relative p-2 rounded-lg text-slate-600 hover:bg-slate-100 hover:text-slate-900 transition-colors cursor-pointer"
              aria-label="Notifications"
            >
              <Icon name="bell" className="h-5 w-5" />
              <span className="absolute top-1.5 right-1.5 flex h-2 w-2">
                <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-[#D92534] opacity-75"></span>
                <span className="relative inline-flex rounded-full h-2 w-2 bg-[#D92534]"></span>
              </span>
            </button>

            <NotificationPopover
              isOpen={isNotifOpen}
              onClose={() => setIsNotifOpen(false)}
            />
          </div>

          <div className="h-6 w-[1px] bg-slate-200 hidden sm:block"></div>

          {/* User Profile */}
          <button
            onClick={() => setIsProfileOpen(true)}
            className="flex items-center space-x-3 p-1.5 rounded-xl hover:bg-slate-100 transition-colors cursor-pointer text-left"
            aria-label="Open profile modal"
          >
            <div className="w-9 h-9 rounded-full bg-[#0B1528] text-white font-bold text-xs flex items-center justify-center shadow-xs border border-slate-200">
              {currentUser
                ? currentUser.fullName
                    .split(" ")
                    .filter(Boolean)
                    .map((n) => n[0])
                    .slice(0, 2)
                    .join("")
                    .toUpperCase()
                : "GU"}
            </div>
            <div className="hidden xl:block">
              <div className="text-[13px] font-bold text-slate-800 leading-tight">
                {currentUser ? currentUser.fullName : "Guest Session"}
              </div>
              <div className="text-[11px] text-slate-400 font-medium">
                {currentUser
                  ? currentUser.designation ||
                    (currentUser.role === "STUDENT_VIEWER"
                      ? "Student Scholar • SY"
                      : currentUser.role === "FACULTY_MEMBER"
                      ? "Faculty Instructor"
                      : currentUser.role === "SYSTEM_ADMIN"
                      ? "System Administrator"
                      : currentUser.role === "ACADEMIC_ADMIN"
                      ? "Academic Administrator"
                      : "Institutional User")
                  : "Unauthenticated"}
              </div>
            </div>
            <Icon name="chevron-down" className="h-4 w-4 text-slate-400 hidden xl:block" />
          </button>
        </div>
      </header>

      {/* Global Search Modal */}
      <GlobalSearchModal
        isOpen={isSearchOpen}
        onClose={() => setIsSearchOpen(false)}
      />

      {/* Profile Modal */}
      <ProfileModal
        isOpen={isProfileOpen}
        onClose={() => setIsProfileOpen(false)}
      />
    </>
  );
};
