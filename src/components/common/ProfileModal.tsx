"use client";

import React, { useEffect } from "react";
import { Icon } from "@/components/common/Icon";
import { FICTIONAL_USER } from "@/data/mockData";

interface ProfileModalProps {
  isOpen: boolean;
  onClose: () => void;
}

export const ProfileModal: React.FC<ProfileModalProps> = ({ isOpen, onClose }) => {
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === "Escape" && isOpen) {
        onClose();
      }
    };
    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [isOpen, onClose]);

  if (!isOpen) return null;

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-sm"
      onClick={onClose}
      role="dialog"
      aria-modal="true"
    >
      <div
        className="relative w-full max-w-lg rounded-2xl bg-white shadow-2xl ring-1 ring-slate-900/10 dark:bg-slate-900 border border-slate-200 dark:border-slate-800 overflow-hidden"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Navy Header Banner */}
        <div className="bg-[#0A192F] p-6 text-white border-b border-amber-600/30 relative">
          <button
            onClick={onClose}
            className="absolute top-4 right-4 text-slate-400 hover:text-white p-1 rounded-lg hover:bg-white/10"
            aria-label="Close profile modal"
          >
            <Icon name="x-mark" className="w-5 h-5" />
          </button>
          
          <div className="flex items-center space-x-4">
            <div className="w-16 h-16 rounded-full bg-gradient-to-tr from-amber-600 to-amber-300 p-0.5 shadow-md">
              <div className="w-full h-full rounded-full bg-[#0A192F] flex items-center justify-center text-amber-300 font-bold text-xl">
                AS
              </div>
            </div>
            <div>
              <div className="inline-flex items-center gap-1.5 px-2 py-0.5 rounded-full text-[11px] font-semibold bg-amber-500/20 text-amber-300 border border-amber-400/30 mb-1">
                <span className="w-1.5 h-1.5 rounded-full bg-amber-400 animate-pulse"></span>
                {FICTIONAL_USER.permissionsLevel}
              </div>
              <h2 className="text-xl font-bold tracking-tight text-white">{FICTIONAL_USER.name}</h2>
              <p className="text-xs text-slate-300">{FICTIONAL_USER.designation}</p>
            </div>
          </div>
        </div>

        {/* Profile Details Content */}
        <div className="p-6 space-y-4 text-sm">
          {/* Institutional Note */}
          <div className="p-3 bg-amber-50 dark:bg-amber-950/20 border border-amber-200/80 dark:border-amber-900/30 rounded-xl text-xs text-amber-900 dark:text-amber-200">
            <strong>Fictional Identity Notice:</strong> This profile is populated with simulated demonstration credentials for the Milestone 2 ERP dashboard review. No active authentication system is attached.
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div className="p-3 rounded-xl bg-slate-50 dark:bg-slate-800/60 border border-slate-200/60 dark:border-slate-800">
              <span className="text-xs text-slate-500 block">Institution</span>
              <span className="font-semibold text-slate-900 dark:text-white text-xs">{FICTIONAL_USER.institution}</span>
            </div>
            <div className="p-3 rounded-xl bg-slate-50 dark:bg-slate-800/60 border border-slate-200/60 dark:border-slate-800">
              <span className="text-xs text-slate-500 block">Employee ID</span>
              <span className="font-mono font-semibold text-slate-900 dark:text-white text-xs">{FICTIONAL_USER.employeeId}</span>
            </div>
            <div className="p-3 rounded-xl bg-slate-50 dark:bg-slate-800/60 border border-slate-200/60 dark:border-slate-800">
              <span className="text-xs text-slate-500 block">Department</span>
              <span className="font-medium text-slate-800 dark:text-slate-200 text-xs">{FICTIONAL_USER.department}</span>
            </div>
            <div className="p-3 rounded-xl bg-slate-50 dark:bg-slate-800/60 border border-slate-200/60 dark:border-slate-800">
              <span className="text-xs text-slate-500 block">Academic Session</span>
              <span className="font-medium text-slate-800 dark:text-slate-200 text-xs">{FICTIONAL_USER.academicYear}</span>
            </div>
          </div>

          <div className="p-3 rounded-xl bg-slate-50 dark:bg-slate-800/60 border border-slate-200/60 dark:border-slate-800 flex items-center justify-between text-xs">
            <span className="text-slate-500">Official Institutional Email</span>
            <span className="font-mono text-slate-700 dark:text-slate-300">{FICTIONAL_USER.email}</span>
          </div>

          <div className="p-3 rounded-xl bg-slate-50 dark:bg-slate-800/60 border border-slate-200/60 dark:border-slate-800 flex items-center justify-between text-xs">
            <span className="text-slate-500">Session Status</span>
            <span className="text-emerald-700 dark:text-emerald-400 font-medium">Simulation Active ({FICTIONAL_USER.lastLogin})</span>
          </div>
        </div>

        {/* Modal Actions */}
        <div className="bg-slate-50 dark:bg-slate-800/40 px-6 py-4 border-t border-slate-200 dark:border-slate-800 flex items-center justify-between">
          <span className="text-[11px] text-slate-500">CampusOS ERP v0.2.0 • Shell Mode</span>
          <button
            onClick={onClose}
            className="px-4 py-2 bg-[#0A192F] hover:bg-[#102A43] text-white text-xs font-semibold rounded-lg shadow-sm transition-colors"
          >
            Close Overview
          </button>
        </div>
      </div>
    </div>
  );
};
