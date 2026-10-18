"use client";

import React, { useState, useEffect, useRef } from "react";
import { CAMPUS_NOTICES } from "@/data/mockData";

interface NotificationPopoverProps {
  isOpen: boolean;
  onClose: () => void;
}

export const NotificationPopover: React.FC<NotificationPopoverProps> = ({
  isOpen,
  onClose,
}) => {
  const [notices, setNotices] = useState(
    CAMPUS_NOTICES.map((n) => ({ ...n, read: false }))
  );
  const containerRef = useRef<HTMLDivElement>(null);

  const unreadCount = notices.filter((n) => !n.read).length;

  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (
        containerRef.current &&
        !containerRef.current.contains(event.target as Node)
      ) {
        onClose();
      }
    };
    if (isOpen) {
      document.addEventListener("mousedown", handleClickOutside);
    }
    return () => {
      document.removeEventListener("mousedown", handleClickOutside);
    };
  }, [isOpen, onClose]);

  const markAllRead = () => {
    setNotices((prev) => prev.map((n) => ({ ...n, read: true })));
  };

  const toggleNotice = (id: string) => {
    setNotices((prev) =>
      prev.map((n) => (n.id === id ? { ...n, read: !n.read } : n))
    );
  };

  if (!isOpen) return null;

  return (
    <div
      ref={containerRef}
      className="absolute right-0 top-full mt-2 w-80 sm:w-96 rounded-2xl bg-white shadow-2xl ring-1 ring-slate-900/10 dark:bg-slate-900 border border-slate-200 dark:border-slate-800 z-50 overflow-hidden"
      role="menu"
      aria-orientation="vertical"
    >
      <div className="p-4 border-b border-slate-200 dark:border-slate-800 flex items-center justify-between bg-slate-50 dark:bg-slate-800/40">
        <div className="flex items-center space-x-2">
          <span className="font-semibold text-sm text-slate-900 dark:text-white">
            Campus Broadcasts
          </span>
          {unreadCount > 0 ? (
            <span className="px-2 py-0.5 text-[11px] font-bold rounded-full bg-amber-100 text-amber-800 dark:bg-amber-900/50 dark:text-amber-200 border border-amber-300 dark:border-amber-700">
              {unreadCount} unread
            </span>
          ) : (
            <span className="px-2 py-0.5 text-[11px] rounded-full bg-emerald-100 text-emerald-800 dark:bg-emerald-950/50 dark:text-emerald-300">
              All caught up
            </span>
          )}
        </div>
        {unreadCount > 0 && (
          <button
            onClick={markAllRead}
            className="text-xs text-amber-700 dark:text-amber-400 hover:underline font-medium"
          >
            Mark all read
          </button>
        )}
      </div>

      <div className="max-h-80 overflow-y-auto divide-y divide-slate-100 dark:divide-slate-800">
        {notices.map((n) => (
          <div
            key={n.id}
            onClick={() => toggleNotice(n.id)}
            className={`p-4 transition-colors cursor-pointer hover:bg-slate-50 dark:hover:bg-slate-800/50 ${
              !n.read ? "bg-amber-50/40 dark:bg-amber-950/10" : ""
            }`}
          >
            <div className="flex items-center justify-between text-xs mb-1">
              <span
                className={`font-semibold px-2 py-0.5 rounded text-[10px] ${
                  n.priority === "Urgent"
                    ? "bg-rose-100 text-rose-800 dark:bg-rose-950/60 dark:text-rose-200"
                    : n.priority === "High"
                    ? "bg-amber-100 text-amber-800 dark:bg-amber-950/60 dark:text-amber-200"
                    : "bg-slate-100 text-slate-800 dark:bg-slate-800 dark:text-slate-300"
                }`}
              >
                {n.priority}
              </span>
              <span className="text-slate-400">{n.date}</span>
            </div>
            <h4
              className={`text-xs font-semibold leading-snug mt-1 ${
                !n.read
                  ? "text-slate-900 dark:text-white"
                  : "text-slate-600 dark:text-slate-400"
              }`}
            >
              {n.title}
            </h4>
            <p className="text-[11px] text-slate-500 mt-1 line-clamp-2">
              {n.excerpt}
            </p>
            <div className="text-[10px] text-amber-700 dark:text-amber-400 mt-2 font-medium">
              Audience: {n.targetAudience}
            </div>
          </div>
        ))}
      </div>

      <div className="p-3 bg-slate-50 dark:bg-slate-800/40 text-center border-t border-slate-200 dark:border-slate-800">
        <span className="text-[11px] text-slate-500">
          Showing 3 simulated system notices
        </span>
      </div>
    </div>
  );
};
