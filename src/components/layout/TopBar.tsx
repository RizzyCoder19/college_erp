"use client";

import React, { useState } from "react";
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

  return (
    <>
      <header className="sticky top-0 z-30 flex h-16 w-full items-center justify-between border-b border-[#16243E] bg-[#0B1528] text-white px-4 sm:px-6 shadow-sm">
        {/* Left: Mobile hamburger */}
        <div className="flex items-center space-x-3">
          <button
            type="button"
            onClick={onToggleMobileSidebar}
            className="rounded-lg p-2 text-slate-300 hover:bg-[#13223E] hover:text-white lg:hidden cursor-pointer"
            aria-label="Toggle navigation drawer"
          >
            <Icon name="bars-3" className="h-6 w-6" />
          </button>
        </div>

        {/* Center: Adapted Glowing Animated Global Search Bar (Faithfully adapted from codes/Glowing-Animated-Search-bar) */}
        <div className="flex-1 max-w-xl mx-4 sm:mx-6">
          <div className="rpihm-glowing-poda relative flex items-center justify-center w-full group">
            {/* Layered animated gradient frames from source */}
            <div className="search-layer-glow" aria-hidden="true"></div>
            <div className="search-layer-darkBorderBg" aria-hidden="true"></div>
            <div className="search-layer-white" aria-hidden="true"></div>
            <div className="search-layer-border" aria-hidden="true"></div>

            {/* Main search bar control button */}
            <button
              type="button"
              onClick={() => setIsSearchOpen(true)}
              className="relative z-10 w-full flex items-center justify-between rounded-xl bg-[#0F1D38] hover:bg-[#132547] px-3.5 py-2 text-[14px] text-slate-200 transition-colors shadow-inner cursor-pointer border border-[#1E3456]/70 group-focus-within:border-transparent"
              aria-label="Search institutional records (Press Ctrl + K)"
            >
              <span className="flex items-center space-x-2.5 truncate">
                <Icon name="search" className="h-4 w-4 text-[#3B82F6] shrink-0" />
                <span className="truncate text-slate-300">
                  Search students, faculty, programmes, modules, reports...
                </span>
              </span>
              <kbd className="hidden sm:inline-flex items-center rounded border border-[#1E3456] bg-[#070E1C] px-2 py-0.5 font-mono text-xs text-slate-300 shadow-xs">
                Ctrl + K
              </kbd>
            </button>
          </div>
        </div>

        {/* Right: Academic Year, Notifications & Profile */}
        <div className="flex items-center space-x-2 sm:space-x-4">
          {/* Academic Year Selector */}
          <div className="hidden md:flex items-center space-x-2 bg-[#13223E] border border-[#1E3456] rounded-lg px-3 py-1.5">
            <Icon name="calendar" className="h-4 w-4 text-[#3B82F6]" />
            <div className="text-left leading-none">
              <span className="text-[10px] uppercase font-bold text-slate-400 block mb-0.5">
                Academic Year
              </span>
              <select
                id="academic-year-select"
                value={academicYear}
                onChange={(e) => onYearChange(e.target.value)}
                className="text-xs font-bold text-white bg-transparent focus:outline-none cursor-pointer"
                aria-label="Select Academic Year"
              >
                <option value="2026 – 27" className="bg-[#0B1528] text-white">2026 – 27</option>
                <option value="2025 – 26" className="bg-[#0B1528] text-white">2025 – 26</option>
                <option value="2024 – 25" className="bg-[#0B1528] text-white">2024 – 25</option>
              </select>
            </div>
          </div>

          {/* Notifications Dropdown */}
          <div className="relative">
            <button
              onClick={() => setIsNotifOpen(!isNotifOpen)}
              className="relative p-2 rounded-lg text-slate-300 hover:bg-[#13223E] hover:text-white transition-colors cursor-pointer"
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

          <div className="h-6 w-[1px] bg-[#1E3456] hidden sm:block"></div>

          {/* User Profile */}
          <button
            onClick={() => setIsProfileOpen(true)}
            className="flex items-center space-x-3 p-1.5 rounded-xl hover:bg-[#13223E] transition-colors cursor-pointer text-left"
            aria-label="Open profile modal"
          >
            <div className="w-9 h-9 rounded-full bg-[#1657D9] text-white font-bold text-xs flex items-center justify-center shadow-xs border border-white/20">
              KS
            </div>
            <div className="hidden xl:block">
              <div className="text-[14px] font-bold text-white leading-tight">
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
