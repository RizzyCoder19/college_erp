"use client";

import React, { useState } from "react";
import { Icon } from "@/components/common/Icon";
import { InstituteCrest } from "@/components/brand/InstituteCrest";
import { NotificationPopover } from "@/components/common/NotificationPopover";
import { ProfileModal } from "@/components/common/ProfileModal";
import { GlobalSearchModal } from "@/components/common/GlobalSearchModal";
import { FICTIONAL_USER } from "@/data/mockData";

interface TopBarProps {
  onToggleMobileSidebar: () => void;
  currentTerm: string;
  onTermChange: (term: string) => void;
}

export const TopBar: React.FC<TopBarProps> = ({
  onToggleMobileSidebar,
  currentTerm,
  onTermChange,
}) => {
  const [isSearchOpen, setIsSearchOpen] = useState(false);
  const [isNotifOpen, setIsNotifOpen] = useState(false);
  const [isProfileOpen, setIsProfileOpen] = useState(false);

  return (
    <>
      <header className="sticky top-0 z-30 flex h-16 w-full items-center justify-between border-b border-slate-200 bg-white/95 px-4 backdrop-blur-md sm:px-6 dark:border-slate-800 dark:bg-[#0A192F]/95 shadow-xs">
        {/* Left Section: Mobile Toggle & Campus Indicator */}
        <div className="flex items-center space-x-3">
          <button
            type="button"
            onClick={onToggleMobileSidebar}
            className="rounded-lg p-2 text-slate-600 hover:bg-slate-100 lg:hidden dark:text-slate-300 dark:hover:bg-slate-800"
            aria-label="Toggle navigation drawer"
          >
            <Icon name="bars-3" className="h-6 w-6" />
          </button>

          <div className="flex items-center space-x-2.5">
            <div className="lg:hidden">
              <InstituteCrest size={32} />
            </div>
            <div>
              <div className="flex items-center space-x-2">
                <span className="text-sm font-bold tracking-tight text-slate-900 dark:text-white">
                  RPIHM Main Campus
                </span>
                <span className="hidden sm:inline-flex items-center px-2 py-0.5 rounded-full text-[10px] font-semibold bg-emerald-50 text-emerald-700 border border-emerald-200 dark:bg-emerald-950/40 dark:text-emerald-300 dark:border-emerald-800">
                  <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 mr-1"></span>
                  Live Session
                </span>
              </div>
              <p className="hidden md:block text-[11px] text-slate-500 dark:text-slate-400">
                Rajendra Prasad Institute of Hotel Management & Catering Tech
              </p>
            </div>
          </div>
        </div>

        {/* Center: Global Search Bar */}
        <div className="hidden md:flex flex-1 max-w-md mx-6">
          <button
            onClick={() => setIsSearchOpen(true)}
            className="w-full flex items-center justify-between rounded-xl bg-slate-100 hover:bg-slate-200/80 px-3.5 py-2 text-xs text-slate-500 transition-all border border-slate-200/60 dark:bg-slate-800/60 dark:hover:bg-slate-800 dark:border-slate-700/60 shadow-inner"
          >
            <span className="flex items-center space-x-2 truncate">
              <Icon name="search" className="h-4 w-4 text-amber-600 dark:text-amber-400" />
              <span>Search modules, chef instructors, batches, labs...</span>
            </span>
            <kbd className="hidden sm:inline-flex items-center rounded border border-slate-300 bg-white px-1.5 font-mono text-[10px] text-slate-600 shadow-xs dark:border-slate-700 dark:bg-slate-900 dark:text-slate-400">
              ⌘K
            </kbd>
          </button>
        </div>

        {/* Right Section: Term selector, Notifications & Fictional Profile */}
        <div className="flex items-center space-x-2 sm:space-x-3">
          {/* Mobile search button */}
          <button
            onClick={() => setIsSearchOpen(true)}
            className="md:hidden p-2 rounded-lg text-slate-600 hover:bg-slate-100 dark:text-slate-300 dark:hover:bg-slate-800"
            aria-label="Search campus records"
          >
            <Icon name="search" className="h-5 w-5 text-amber-600" />
          </button>

          {/* Academic Term Selector */}
          <div className="hidden lg:flex items-center">
            <label htmlFor="term-selector" className="sr-only">
              Academic Term
            </label>
            <select
              id="term-selector"
              value={currentTerm}
              onChange={(e) => onTermChange(e.target.value)}
              className="text-xs font-semibold rounded-lg bg-amber-50 text-amber-900 border border-amber-300 px-3 py-1.5 focus:outline-none focus:ring-2 focus:ring-amber-500 dark:bg-amber-950/40 dark:text-amber-200 dark:border-amber-800 cursor-pointer"
            >
              <option value="Odd Sem 2026-27">AY 2026-27 (Odd Sem)</option>
              <option value="Even Sem 2025-26">AY 2025-26 (Even Sem)</option>
              <option value="Summer Term 2026">Summer Culinary Term 2026</option>
            </select>
          </div>

          {/* Notifications Trigger */}
          <div className="relative">
            <button
              onClick={() => setIsNotifOpen(!isNotifOpen)}
              className="relative p-2 rounded-lg text-slate-600 hover:bg-slate-100 dark:text-slate-300 dark:hover:bg-slate-800"
              aria-label="Campus announcements"
            >
              <Icon name="bell" className="h-5 w-5" />
              <span className="absolute top-1.5 right-1.5 flex h-2 w-2">
                <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-amber-400 opacity-75"></span>
                <span className="relative inline-flex rounded-full h-2 w-2 bg-amber-500"></span>
              </span>
            </button>

            <NotificationPopover
              isOpen={isNotifOpen}
              onClose={() => setIsNotifOpen(false)}
            />
          </div>

          <div className="h-5 w-[1px] bg-slate-200 dark:bg-slate-700 hidden sm:block"></div>

          {/* Profile Button */}
          <button
            onClick={() => setIsProfileOpen(true)}
            className="flex items-center space-x-2 p-1.5 rounded-xl hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors text-left"
            aria-label="View institutional administrator profile"
          >
            <div className="w-8 h-8 rounded-full bg-[#0A192F] text-amber-300 font-bold text-xs flex items-center justify-center ring-2 ring-amber-400/80 shadow-xs">
              AS
            </div>
            <div className="hidden xl:block">
              <div className="text-xs font-bold leading-none text-slate-900 dark:text-white">
                {FICTIONAL_USER.name}
              </div>
              <div className="text-[10px] text-amber-700 dark:text-amber-400 font-medium leading-none mt-1">
                {FICTIONAL_USER.designation.split("&")[0]}
              </div>
            </div>
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
