"use client";

import React, { useEffect } from "react";
import { Icon } from "@/components/common/Icon";
import { FacultyRecord } from "@/types/faculty";

interface FacultyDetailModalProps {
  faculty: FacultyRecord | null;
  isOpen: boolean;
  onClose: () => void;
  onEdit: (faculty: FacultyRecord) => void;
}

export const FacultyDetailModal: React.FC<FacultyDetailModalProps> = ({
  faculty,
  isOpen,
  onClose,
  onEdit,
}) => {
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === "Escape" && isOpen) {
        onClose();
      }
    };
    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [isOpen, onClose]);

  if (!isOpen || !faculty) return null;

  const getStatusBadge = (status: string) => {
    switch (status) {
      case "Active":
        return "bg-emerald-50 text-emerald-700 border-emerald-200";
      case "In Lab / Kitchen":
        return "bg-blue-50 text-blue-700 border-blue-200";
      case "On Leave":
        return "bg-amber-50 text-amber-700 border-amber-200";
      case "Sabbatical":
        return "bg-purple-50 text-purple-700 border-purple-200";
      default:
        return "bg-slate-50 text-slate-700 border-slate-200";
    }
  };

  return (
    <div
      role="dialog"
      aria-modal="true"
      aria-labelledby="faculty-dossier-title"
      className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-sm animate-in fade-in duration-200"
      onClick={onClose}
    >
      <div
        className="w-full max-w-2xl bg-white rounded-2xl shadow-2xl border border-slate-200 max-h-[90vh] flex flex-col overflow-hidden"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-slate-200 bg-slate-50/70">
          <div className="flex items-center space-x-3">
            <div className="w-10 h-10 rounded-full bg-[#0B1528] text-white flex items-center justify-center font-bold text-base shadow-sm">
              {faculty.avatarInitial || faculty.fullName.charAt(0)}
            </div>
            <div>
              <h3 id="faculty-dossier-title" className="text-base font-bold text-slate-900">
                Faculty & Staff Academic Dossier
              </h3>
              <p className="text-xs font-mono text-[#1657D9] font-semibold">
                Staff ID: {faculty.staffId} • {faculty.category}
              </p>
            </div>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="w-8 h-8 rounded-lg flex items-center justify-center text-slate-400 hover:text-slate-700 hover:bg-slate-200 transition-colors"
            aria-label="Close dossier"
          >
            <Icon name="x-mark" className="w-5 h-5" />
          </button>
        </div>

        {/* Scrollable Body */}
        <div className="p-6 space-y-6 overflow-y-auto">
          {/* Identity & Department Header Card */}
          <div className="bg-gradient-to-br from-slate-50 to-blue-50/30 rounded-xl p-4 border border-slate-200/80">
            <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
              <div>
                <h4 className="text-lg font-bold text-slate-900">{faculty.fullName}</h4>
                <div className="text-xs text-slate-600 font-medium mt-0.5">
                  {faculty.designation} • {faculty.department}
                </div>
              </div>
              <div className="flex items-center gap-2">
                <span
                  className={`inline-flex items-center px-2.5 py-1 rounded-full text-[11px] font-semibold border ${getStatusBadge(
                    faculty.status
                  )}`}
                >
                  <span className="w-1.5 h-1.5 rounded-full bg-current mr-1.5" />
                  {faculty.status}
                </span>
                <span className="inline-flex items-center px-2.5 py-1 rounded-full text-[11px] font-semibold border bg-slate-100 text-slate-700 border-slate-200">
                  {faculty.employmentType}
                </span>
              </div>
            </div>
          </div>

          {/* Academic & Professional Specialization */}
          <div className="space-y-3">
            <h5 className="text-xs font-bold uppercase tracking-wider text-slate-500 flex items-center space-x-1.5">
              <Icon name="academic-cap" className="w-4 h-4 text-[#1657D9]" />
              <span>Academic Credentials & Specialization</span>
            </h5>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-3 text-xs">
              <div className="p-3 bg-slate-50 rounded-lg border border-slate-200">
                <span className="text-slate-400 block mb-1 font-medium">Highest Qualification</span>
                <span className="font-semibold text-slate-800">{faculty.qualification}</span>
              </div>
              <div className="p-3 bg-slate-50 rounded-lg border border-slate-200">
                <span className="text-slate-400 block mb-1 font-medium">Primary Specialization</span>
                <span className="font-semibold text-slate-800">{faculty.specialization}</span>
              </div>
            </div>
          </div>

          {/* Teaching Workload & Assigned Subjects */}
          <div className="space-y-3">
            <h5 className="text-xs font-bold uppercase tracking-wider text-slate-500 flex items-center space-x-1.5">
              <Icon name="book-open" className="w-4 h-4 text-emerald-600" />
              <span>Teaching Workload & Subject Allocations</span>
            </h5>
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 text-xs mb-3">
              <div className="p-3 bg-emerald-50/50 rounded-lg border border-emerald-200/60">
                <span className="text-emerald-700 font-medium block">Weekly Contact Hours</span>
                <span className="text-base font-bold text-emerald-900">{faculty.workloadHours} hrs / week</span>
              </div>
              <div className="p-3 bg-blue-50/50 rounded-lg border border-blue-200/60">
                <span className="text-blue-700 font-medium block">Assigned Programmes</span>
                <span className="text-xs font-bold text-blue-900 block mt-1">
                  {faculty.assignedProgrammes.join(", ")}
                </span>
              </div>
              <div className="p-3 bg-slate-50 rounded-lg border border-slate-200">
                <span className="text-slate-500 font-medium block">Institutional Joining Date</span>
                <span className="text-xs font-bold text-slate-800 block mt-1">{faculty.joinedDate}</span>
              </div>
            </div>

            <div className="p-3 bg-slate-50 rounded-lg border border-slate-200">
              <span className="text-slate-400 block mb-2 font-medium text-xs">Allocated Course Subjects</span>
              <div className="flex flex-wrap gap-1.5">
                {faculty.teachingSubjects.map((sub, idx) => (
                  <span
                    key={idx}
                    className="inline-flex items-center px-2.5 py-1 rounded-md text-xs font-medium bg-white text-slate-700 border border-slate-200 shadow-2xs"
                  >
                    <Icon name="document-text" className="w-3 h-3 text-[#1657D9] mr-1.5" />
                    {sub}
                  </span>
                ))}
              </div>
            </div>
          </div>

          {/* Official Location & Contact Information */}
          <div className="space-y-3">
            <h5 className="text-xs font-bold uppercase tracking-wider text-slate-500 flex items-center space-x-1.5">
              <Icon name="building-office" className="w-4 h-4 text-amber-600" />
              <span>Official Campus Location & Communications</span>
            </h5>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-3 text-xs">
              <div className="p-3 bg-slate-50 rounded-lg border border-slate-200">
                <span className="text-slate-400 block mb-1 font-medium">Campus Cabin / Studio</span>
                <span className="font-semibold text-slate-800">{faculty.officeLocation}</span>
              </div>
              <div className="p-3 bg-slate-50 rounded-lg border border-slate-200">
                <span className="text-slate-400 block mb-1 font-medium">Campus Email Address</span>
                <span className="font-mono text-[11px] font-semibold text-[#1657D9]">{faculty.email}</span>
              </div>
              <div className="p-3 bg-slate-50 rounded-lg border border-slate-200">
                <span className="text-slate-400 block mb-1 font-medium">Official Extension / Phone</span>
                <span className="font-mono text-[11px] font-semibold text-slate-800">{faculty.phone}</span>
              </div>
            </div>
          </div>

          {/* Demo Prototype Notice */}
          <div className="p-3.5 bg-slate-100 rounded-xl border border-slate-200 text-xs text-slate-600 space-y-1">
            <div className="font-semibold text-slate-800 flex items-center space-x-1.5">
              <Icon name="information-circle" className="w-4 h-4 text-slate-500" />
              <span>Fictional Demonstration Record Notice</span>
            </div>
            <p className="text-[11px] text-slate-500 leading-normal">
              This profile represents a demonstration record for RPIHM CampusOS Phase 2. No real institutional faculty personnel data or personal contact numbers are stored. All workload credits, subject allocations, and appointments are sample data.
            </p>
          </div>
        </div>

        {/* Footer */}
        <div className="flex items-center justify-between px-6 py-4 border-t border-slate-200 bg-slate-50/70">
          <button
            type="button"
            onClick={() => {
              onClose();
              onEdit(faculty);
            }}
            className="inline-flex items-center space-x-1.5 px-3.5 py-1.5 text-xs font-semibold text-[#1657D9] bg-blue-50 hover:bg-blue-100 rounded-xl transition-colors border border-blue-200"
          >
            <Icon name="pencil" className="w-3.5 h-3.5" />
            <span>Edit Staff Record</span>
          </button>
          <button
            type="button"
            onClick={onClose}
            className="px-4 py-1.5 text-xs font-semibold text-slate-700 bg-white hover:bg-slate-100 rounded-xl transition-colors border border-slate-200 shadow-2xs"
          >
            Close Dossier
          </button>
        </div>
      </div>
    </div>
  );
};
