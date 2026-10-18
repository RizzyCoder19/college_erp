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
      className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-xs"
      onClick={onClose}
      role="dialog"
      aria-modal="true"
    >
      <div
        className="relative w-full max-w-lg rounded-2xl bg-white shadow-2xl ring-1 ring-slate-900/10 border border-slate-200 overflow-hidden"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Navy Header Banner */}
        <div className="bg-[#0B1528] p-6 text-white border-b border-[#16243E] relative">
          <button
            onClick={onClose}
            className="absolute top-4 right-4 text-slate-400 hover:text-white p-1 rounded-lg hover:bg-white/10 cursor-pointer"
            aria-label="Close profile modal"
          >
            <Icon name="x-mark" className="w-5 h-5" />
          </button>
          
          <div className="flex items-center space-x-4">
            <div className="w-14 h-14 rounded-full bg-[#1657D9] text-white flex items-center justify-center font-bold text-lg shadow-md border-2 border-white/20">
              DS
            </div>
            <div>
              <div className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-[11px] font-semibold bg-blue-500/20 text-blue-200 border border-blue-400/30 mb-1">
                <span className="w-1.5 h-1.5 rounded-full bg-blue-400"></span>
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
          <div className="p-3 bg-red-50 border border-red-200 rounded-xl text-xs text-red-900">
            <strong>Demonstration Identity Notice:</strong> This profile is populated with simulated administrative credentials for R. P. Institute of Hospitality & Management, Vasai. No production authentication is claimed in this milestone.
          </div>

          <div className="grid grid-cols-2 gap-3 text-xs">
            <div className="p-3 rounded-xl bg-slate-50 border border-slate-200">
              <span className="text-slate-400 block mb-0.5">Institution</span>
              <span className="font-semibold text-slate-800">{FICTIONAL_USER.institution}</span>
            </div>
            <div className="p-3 rounded-xl bg-slate-50 border border-slate-200">
              <span className="text-slate-400 block mb-0.5">Secretariat ID</span>
              <span className="font-mono font-semibold text-slate-800">{FICTIONAL_USER.employeeId}</span>
            </div>
            <div className="p-3 rounded-xl bg-slate-50 border border-slate-200">
              <span className="text-slate-400 block mb-0.5">Affiliated Body</span>
              <span className="font-medium text-slate-800">University of Mumbai</span>
            </div>
            <div className="p-3 rounded-xl bg-slate-50 border border-slate-200">
              <span className="text-slate-400 block mb-0.5">Academic Session</span>
              <span className="font-medium text-slate-800">{FICTIONAL_USER.academicYear}</span>
            </div>
          </div>

          <div className="p-3 rounded-xl bg-slate-50 border border-slate-200 flex items-center justify-between text-xs">
            <span className="text-slate-500">Official Campus Email</span>
            <span className="font-mono text-slate-800">{FICTIONAL_USER.email}</span>
          </div>

          <div className="p-3 rounded-xl bg-slate-50 border border-slate-200 flex items-center justify-between text-xs">
            <span className="text-slate-500">Session Status</span>
            <span className="text-emerald-700 font-medium font-mono">Active (Demonstration Mode)</span>
          </div>
        </div>

        {/* Modal Actions */}
        <div className="bg-slate-50 px-6 py-4 border-t border-slate-200 flex items-center justify-between">
          <span className="text-[11px] text-slate-400">RPIHM CampusOS v0.1.0</span>
          <button
            onClick={onClose}
            className="px-4 py-2 bg-[#1657D9] hover:bg-[#1248B8] text-white text-xs font-semibold rounded-lg shadow-xs transition-colors cursor-pointer"
          >
            Close Profile
          </button>
        </div>
      </div>
    </div>
  );
};
