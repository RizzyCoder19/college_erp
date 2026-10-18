"use client";

import React, { useState, useEffect, useRef } from "react";
import Link from "next/link";
import Image from "next/image";
import { NOTICES_AND_CIRCULARS } from "@/data/mockData";

interface NotificationPopoverProps {
  isOpen: boolean;
  onClose: () => void;
}

export const NotificationPopover: React.FC<NotificationPopoverProps> = ({
  isOpen,
  onClose,
}) => {
  const [notices, setNotices] = useState(
    NOTICES_AND_CIRCULARS.map((n) => ({ ...n, read: false }))
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
      className="absolute right-0 top-full mt-2 w-80 sm:w-96 rounded-2xl bg-white shadow-2xl ring-1 ring-slate-900/10 border border-slate-200 z-50 overflow-hidden text-xs group hover:border-[#1657D9]/40 transition-all"
      role="menu"
      aria-orientation="vertical"
    >
      {/* Subtle campus camouflage backdrop with hover zoom */}
      <div className="absolute inset-0 z-0 opacity-0 group-hover:opacity-[0.05] transition-opacity duration-500 overflow-hidden pointer-events-none">
        <Image
          src="/images/campus-illuminated-sign.png"
          alt=""
          fill
          sizes="400px"
          className="object-cover transition-transform duration-700 ease-out group-hover:scale-110"
        />
      </div>

      <div className="relative z-10">
        <div className="p-4 border-b border-slate-100 flex items-center justify-between bg-slate-50/90 backdrop-blur-xs">
          <div className="flex items-center space-x-2">
            <span className="font-bold text-sm text-slate-900">
              Campus Broadcasts
            </span>
            {unreadCount > 0 ? (
              <span className="px-2 py-0.5 text-[10px] font-bold rounded-full bg-red-100 text-[#D92534] border border-red-200">
                {unreadCount} unread
              </span>
            ) : (
              <span className="px-2 py-0.5 text-[10px] font-medium rounded-full bg-emerald-100 text-emerald-800">
                All caught up
              </span>
            )}
          </div>
          {unreadCount > 0 && (
            <button
              onClick={markAllRead}
              className="text-xs text-[#1657D9] hover:underline font-semibold cursor-pointer"
            >
              Mark all read
            </button>
          )}
        </div>

        <div className="max-h-80 overflow-y-auto divide-y divide-slate-100">
          {notices.map((n) => (
            <div
              key={n.id}
              onClick={() => toggleNotice(n.id)}
              className={`p-3.5 transition-colors cursor-pointer hover:bg-slate-50 ${
                !n.read ? "bg-blue-50/30" : ""
              }`}
            >
              <div className="flex items-center justify-between text-[11px] mb-1">
                <span
                  className={`font-semibold px-2 py-0.5 rounded text-[10px] ${
                    n.priority === "Urgent"
                      ? "bg-red-100 text-[#D92534]"
                      : n.priority === "High"
                      ? "bg-amber-100 text-amber-800"
                      : "bg-slate-100 text-slate-600"
                  }`}
                >
                  {n.priority}
                </span>
                <span className="text-slate-400">{n.date}</span>
              </div>
              <h4
                className={`text-xs font-bold leading-snug mt-1 ${
                  !n.read ? "text-slate-900" : "text-slate-600"
                }`}
              >
                {n.title}
              </h4>
              <p className="text-[11px] text-slate-500 mt-1 line-clamp-2 leading-relaxed">
                {n.excerpt}
              </p>
            </div>
          ))}
        </div>

        <div className="p-3 bg-slate-50 text-center border-t border-slate-100">
          <Link
            href="/modules/notices"
            onClick={onClose}
            className="text-xs font-semibold text-[#1657D9] hover:underline"
          >
            View All Official Circulars →
          </Link>
        </div>
      </div>
    </div>
  );
};
