"use client";

import React, { useEffect } from "react";
import Image from "next/image";
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
              KS
            </div>
            <div>
              <div className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-[11px] font-semibold bg-blue-500/20 text-blue-200 border border-blue-400/30 mb-1">
                <span className="w-1.5 h-1.5 rounded-full bg-blue-400"></span>
                Institutional Designation
              </div>
              <h2 className="text-xl font-bold tracking-tight text-white">{FICTIONAL_USER.name}</h2>
              <p className="text-xs text-slate-300">{FICTIONAL_USER.designation}</p>
            </div>
          </div>
        </div>

        {/* Profile Details Content */}
        <div className="p-6 space-y-4 text-sm">
          <div className="grid grid-cols-2 gap-3 text-xs">
            <div className="p-3 rounded-xl bg-slate-50 border border-slate-200">
              <span className="text-slate-400 block mb-0.5">Institution</span>
              <span className="font-semibold text-slate-800">{FICTIONAL_USER.institution}</span>
            </div>
            <div className="p-3 rounded-xl bg-slate-50 border border-slate-200">
              <span className="text-slate-400 block mb-0.5">Designation</span>
              <span className="font-semibold text-slate-800">{FICTIONAL_USER.designation}</span>
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

          <div className="flex items-center space-x-3 p-2.5 rounded-xl bg-slate-50 border border-slate-200">
            <div className="relative w-12 h-12 rounded-lg overflow-hidden shrink-0 border border-slate-200">
              <Image
                src="/images/campus-front-gate.jpg"
                alt="RPIHM Campus Vasai"
                fill
                sizes="48px"
                className="object-cover"
              />
            </div>
            <div className="min-w-0">
              <span className="text-[10px] font-bold text-[#1657D9] uppercase tracking-wider block">
                Campus Location
              </span>
              <p className="text-xs font-semibold text-slate-800 truncate">
                Vasai (West) Main Campus, Palghar
              </p>
              <p className="text-[10px] text-slate-400">
                R.P. Educational Trust • Affiliated to Univ. of Mumbai
              </p>
            </div>
          </div>

          <div className="p-3.5 bg-slate-50 border border-slate-200 rounded-xl text-xs text-slate-600 leading-relaxed">
            <strong className="text-slate-800 font-semibold block mb-1">Institutional Administration:</strong>
            CampusOS authentication and role-based permissions will be integrated in a subsequent milestone. Sample departmental records are currently displayed.
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
