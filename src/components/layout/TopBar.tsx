"use client";

import React, { useState, useEffect } from "react";
import { Icon } from "@/components/common/Icon";
import { NotificationPopover } from "@/components/common/NotificationPopover";
import { ProfileModal } from "@/components/common/ProfileModal";
import { GlobalSearchModal } from "@/components/common/GlobalSearchModal";
import { FICTIONAL_USER } from "@/data/mockData";

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
  const [shortcutKey, setShortcutKey] = useState("Ctrl + K");

  // Detect Mac vs Windows/Linux for keyboard shortcut hint
  useEffect(() => {
    if (typeof window !== "undefined" && /(Mac|iPhone|iPod|iPad)/i.test(navigator.userAgent || navigator.platform || "")) {
      requestAnimationFrame(() => {
        setShortcutKey("⌘K");
      });
    }

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
      <header className="sticky top-0 z-30 flex h-16 w-full items-center justify-between border-b border-slate-200/80 bg-white text-slate-800 px-4 sm:px-6 shadow-2xs">
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

        {/* Center: Glowing Animated Global Search Bar (From codes/Glowing-Animated-Search-bar) */}
        <div className="flex-1 max-w-xl mx-3 sm:mx-6">
          <div className="rpihm-glowing-poda relative flex items-center justify-center w-full group">
            {/* Multi-layer animated gradient frames from source */}
            <div className="search-layer-glow" aria-hidden="true"></div>
            <div className="search-layer-darkBorderBg" aria-hidden="true"></div>
            <div className="search-layer-white" aria-hidden="true"></div>
            <div className="search-layer-border" aria-hidden="true"></div>

            {/* Clean white input button matching the visual reference */}
            <button
              type="button"
              onClick={() => setIsSearchOpen(true)}
              className="relative z-10 w-full flex items-center justify-between rounded-xl bg-white hover:bg-slate-50/90 px-3.5 py-2 text-[14px] text-slate-600 transition-colors shadow-2xs cursor-pointer border border-slate-200/80 group-focus-within:border-transparent"
              aria-label="Search institutional records"
            >
              <span className="flex items-center space-x-2.5 truncate">
                <Icon name="search" className="h-4 w-4 text-[#1657D9] shrink-0" />
                <span className="truncate text-slate-400 font-normal">
                  Search students, faculty, programmes, schedules, notices…
                </span>
              </span>
              <kbd className="hidden sm:inline-flex items-center rounded border border-slate-200 bg-slate-100 px-2 py-0.5 font-mono text-xs text-slate-500 shadow-2xs">
                {shortcutKey}
              </kbd>
            </button>
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
              KS
            </div>
            <div className="hidden xl:block">
              <div className="text-[13px] font-bold text-slate-800 leading-tight">
                {FICTIONAL_USER.name}
              </div>
              <div className="text-[11px] text-slate-400 font-medium">
                {FICTIONAL_USER.designation}
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
