"use client";

import React, { useEffect } from "react";
import Image from "next/image";
import { Icon } from "@/components/common/Icon";
import { StudentRecord } from "@/types/student";

interface StudentDetailModalProps {
  student: StudentRecord | null;
  isOpen: boolean;
  onClose: () => void;
  onEdit: (student: StudentRecord) => void;
}

export const StudentDetailModal: React.FC<StudentDetailModalProps> = ({
  student,
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

  if (!isOpen || !student) return null;

  const getStatusBadge = (status: string) => {
    switch (status) {
      case "Active":
        return "bg-emerald-50 text-emerald-700 border-emerald-200";
      case "On Leave":
        return "bg-amber-50 text-amber-700 border-amber-200";
      case "Graduated":
        return "bg-blue-50 text-[#1657D9] border-blue-200";
      default:
        return "bg-purple-50 text-purple-700 border-purple-200";
    }
  };

  const getFeeBadge = (status: string) => {
    switch (status) {
      case "Paid":
        return "bg-emerald-50 text-emerald-700 border-emerald-200";
      case "Partial":
        return "bg-amber-50 text-amber-700 border-amber-200";
      default:
        return "bg-red-50 text-[#D92534] border-red-200";
    }
  };

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-xs"
      onClick={onClose}
      role="dialog"
      aria-modal="true"
      aria-label="Student Dossier"
    >
      <div
        className="w-full max-w-2xl max-h-[90vh] flex flex-col rounded-2xl bg-white shadow-2xl border border-slate-200 overflow-hidden"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Navy Header Banner with subtle campus signage */}
        <div className="relative overflow-hidden bg-[#0B1528] p-6 text-white border-b border-[#16243E] shrink-0">
          <div className="absolute inset-0 z-0 overflow-hidden pointer-events-none opacity-25">
            <Image
              src="/images/campus-illuminated-sign.png"
              alt=""
              fill
              sizes="600px"
              className="object-cover object-right"
            />
            <div className="absolute inset-0 bg-[#0B1528]/80 backdrop-blur-[1px]"></div>
          </div>

          <div className="relative z-10">
            <div className="flex items-start justify-between">
              <div className="flex items-center space-x-3.5">
                <div className="w-13 h-13 rounded-2xl bg-[#1657D9] text-white flex items-center justify-center font-bold text-lg shadow-md border-2 border-white/20">
                  {student.fullName
                    .split(" ")
                    .map((n) => n[0])
                    .slice(0, 2)
                    .join("")}
                </div>
                <div>
                  <div className="flex flex-wrap items-center gap-2 mb-1">
                    <span className="font-mono text-xs font-bold text-blue-200 bg-blue-500/20 px-2 py-0.5 rounded border border-blue-400/30">
                      PRN: {student.prn}
                    </span>
                    <span
                      className={`text-[10px] font-bold px-2 py-0.5 rounded-full border ${getStatusBadge(
                        student.enrollmentStatus
                      )}`}
                    >
                      {student.enrollmentStatus}
                    </span>
                    <span
                      className={`text-[10px] font-bold px-2 py-0.5 rounded-full border ${getFeeBadge(
                        student.feeStatus
                      )}`}
                    >
                      Fee: {student.feeStatus}
                    </span>
                  </div>
                  <h2 className="text-xl font-bold tracking-tight text-white font-serif">
                    {student.fullName}
                  </h2>
                  <p className="text-xs text-slate-300">
                    {student.programmeName} • Semester {student.semester} ({student.division})
                  </p>
                </div>
              </div>

              <button
                type="button"
                onClick={onClose}
                className="text-slate-400 hover:text-white p-1 rounded-lg hover:bg-white/10 transition-colors cursor-pointer"
                aria-label="Close modal"
              >
                <Icon name="x-mark" className="w-5 h-5" />
              </button>
            </div>
          </div>
        </div>

        {/* Scrollable Body Content */}
        <div className="flex-1 overflow-y-auto p-6 space-y-6 text-xs text-slate-700">
          {/* Quick Metrics Bar */}
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
            <div className="p-3 rounded-xl bg-slate-50 border border-slate-200">
              <span className="text-[10px] uppercase font-bold text-slate-400 block mb-0.5">
                Attendance Rate
              </span>
              <span
                className={`text-base font-extrabold font-serif ${
                  student.attendanceRate >= 85
                    ? "text-emerald-700"
                    : student.attendanceRate >= 75
                    ? "text-amber-700"
                    : "text-[#D92534]"
                }`}
              >
                {student.attendanceRate}%
              </span>
              <span className="text-[10px] text-slate-400 block mt-0.5">
                {student.attendanceRate >= 75 ? "Eligible for exams" : "Attendance warning"}
              </span>
            </div>

            <div className="p-3 rounded-xl bg-slate-50 border border-slate-200">
              <span className="text-[10px] uppercase font-bold text-slate-400 block mb-0.5">
                Cumulative GPA
              </span>
              <span className="text-base font-extrabold text-slate-900 font-serif">
                {student.gpa ? `${student.gpa} / 10.0` : "Evaluation Pending"}
              </span>
              <span className="text-[10px] text-slate-400 block mt-0.5">
                CBCS Grading Scale
              </span>
            </div>

            <div className="p-3 rounded-xl bg-slate-50 border border-slate-200">
              <span className="text-[10px] uppercase font-bold text-slate-400 block mb-0.5">
                Cohort / Year
              </span>
              <span className="text-base font-extrabold text-slate-900 font-serif">
                {student.yearGroup} ({student.division})
              </span>
              <span className="text-[10px] text-slate-400 block mt-0.5">
                Admitted {student.admissionDate}
              </span>
            </div>

            <div className="p-3 rounded-xl bg-slate-50 border border-slate-200">
              <span className="text-[10px] uppercase font-bold text-slate-400 block mb-0.5">
                Fee Ledger
              </span>
              <span
                className={`text-base font-extrabold font-serif ${
                  student.feeStatus === "Paid"
                    ? "text-emerald-700"
                    : student.feeStatus === "Partial"
                    ? "text-amber-700"
                    : "text-[#D92534]"
                }`}
              >
                {student.feeStatus}
              </span>
              <span className="text-[10px] text-slate-400 block mt-0.5">
                AY 2026 – 27 Installment
              </span>
            </div>
          </div>

          {/* Academic & Curriculum Dossier */}
          <div>
            <h4 className="text-xs font-bold uppercase tracking-wider text-slate-500 mb-2 flex items-center space-x-1.5">
              <Icon name="academic-cap" className="h-4 w-4 text-[#1657D9]" />
              <span>Academic Dossier</span>
            </h4>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 bg-slate-50/70 p-4 rounded-xl border border-slate-200">
              <div>
                <span className="text-slate-400 block">Programme & Code</span>
                <span className="font-semibold text-slate-800">{student.programmeName}</span>
              </div>
              <div>
                <span className="text-slate-400 block">Department</span>
                <span className="font-semibold text-slate-800">{student.department}</span>
              </div>
              <div>
                <span className="text-slate-400 block">Faculty Mentor / Guide</span>
                <span className="font-medium text-slate-800">{student.mentorFaculty}</span>
              </div>
              <div>
                <span className="text-slate-400 block">Affiliated Body</span>
                <span className="font-medium text-slate-800">University of Mumbai</span>
              </div>
            </div>
          </div>

          {/* Contact & Personal Details */}
          <div>
            <h4 className="text-xs font-bold uppercase tracking-wider text-slate-500 mb-2 flex items-center space-x-1.5">
              <Icon name="users" className="h-4 w-4 text-[#1657D9]" />
              <span>Contact & Personal Details</span>
            </h4>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 bg-slate-50/70 p-4 rounded-xl border border-slate-200">
              <div>
                <span className="text-slate-400 block">Institutional Email</span>
                <span className="font-medium text-[#1657D9]">{student.email}</span>
              </div>
              <div>
                <span className="text-slate-400 block">Student Contact No.</span>
                <span className="font-medium text-slate-800">{student.phone}</span>
              </div>
              <div>
                <span className="text-slate-400 block">Date of Birth</span>
                <span className="font-medium text-slate-800">{student.dateOfBirth || "Recorded on Dossier"}</span>
              </div>
              <div>
                <span className="text-slate-400 block">Blood Group</span>
                <span className="font-medium text-slate-800">{student.bloodGroup || "O+"}</span>
              </div>
            </div>
          </div>

          {/* Guardian & Emergency Contact */}
          <div>
            <h4 className="text-xs font-bold uppercase tracking-wider text-slate-500 mb-2 flex items-center space-x-1.5">
              <Icon name="phone" className="h-4 w-4 text-[#1657D9]" />
              <span>Guardian & Emergency Contact</span>
            </h4>
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 bg-slate-50/70 p-4 rounded-xl border border-slate-200">
              <div>
                <span className="text-slate-400 block">Guardian Name</span>
                <span className="font-semibold text-slate-800">{student.guardianName}</span>
              </div>
              <div>
                <span className="text-slate-400 block">Relationship</span>
                <span className="font-medium text-slate-800">{student.guardianRelationship}</span>
              </div>
              <div>
                <span className="text-slate-400 block">Emergency Phone</span>
                <span className="font-medium text-slate-800">{student.guardianPhone}</span>
              </div>
            </div>
          </div>

          {/* Institutional Prototype Disclaimer Notice */}
          <div className="p-3 rounded-xl bg-blue-50/80 border border-blue-200 text-[11px] text-slate-600 leading-relaxed">
            <strong className="text-slate-800 font-semibold block mb-0.5">
              Prototype Mode • Sample Record Information:
            </strong>
            This record is a fictional demonstration profile for R. P. Institute of Hospitality & Management. Student data is stored in the local application session state. Final institutional verification portals (eligibility enrolment, caste certificates, and university marksheets) will be connected in subsequent phases.
          </div>
        </div>

        {/* Modal Actions Footer */}
        <div className="bg-slate-50 px-6 py-4 border-t border-slate-200 flex items-center justify-between shrink-0">
          <span className="text-[11px] text-slate-400">RPIHM CampusOS • Student Management</span>
          <div className="flex items-center space-x-2">
            <button
              type="button"
              onClick={() => {
                onClose();
                onEdit(student);
              }}
              className="px-4 py-2 bg-[#1657D9] hover:bg-[#1248B8] text-white text-xs font-semibold rounded-xl shadow-xs transition-colors cursor-pointer flex items-center space-x-1.5"
            >
              <Icon name="pencil" className="h-3.5 w-3.5" />
              <span>Edit Record</span>
            </button>
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2 bg-white hover:bg-slate-100 text-slate-700 text-xs font-semibold rounded-xl border border-slate-200 transition-colors cursor-pointer"
            >
              Close
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};
