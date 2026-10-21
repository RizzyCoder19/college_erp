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
                      PRN: {student.prn}{student.rollNumber && student.rollNumber !== student.prn ? ` • Roll: ${student.rollNumber}` : ""}
                    </span>
                    <span
                      className={`text-[10px] font-bold px-2 py-0.5 rounded-full border ${getStatusBadge(
                        student.enrollmentStatus
                      )}`}
                    >
                      {student.enrollmentStatus}
                    </span>
                    {/* Workstream D: Truthful Fee Status */}
                    <span className="text-[10px] font-medium px-2 py-0.5 rounded-full bg-slate-800 text-slate-300 border border-slate-700">
                      Fee: Not Configured
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
              <div className="flex items-center justify-between mb-0.5">
                <span className="text-[10px] uppercase font-bold text-slate-400">
                  Attendance
                </span>
                <span className="text-[9px] font-medium text-amber-700 bg-amber-50 px-1.5 py-0.5 rounded border border-amber-200">
                  Sample Metric
                </span>
              </div>
              <span
                className={`text-base font-extrabold font-serif ${
                  student.attendanceRate >= 85
                    ? "text-emerald-700"
                    : student.attendanceRate >= 75
                    ? "text-amber-700"
                    : "text-[#D92534]"
                }`}
              >
                {student.attendanceRate > 0 ? `${student.attendanceRate}%` : "Not Recorded"}
              </span>
              <span className="text-[10px] text-slate-400 block mt-0.5">
                Ledger sync pending
              </span>
            </div>

            <div className="p-3 rounded-xl bg-slate-50 border border-slate-200">
              <div className="flex items-center justify-between mb-0.5">
                <span className="text-[10px] uppercase font-bold text-slate-400">
                  Cumulative GPA
                </span>
                <span className="text-[9px] font-medium text-slate-600 bg-slate-200/60 px-1.5 py-0.5 rounded border border-slate-300/60">
                  Demo
                </span>
              </div>
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
                Enrolled {student.admissionDate}
              </span>
            </div>

            {/* Workstream D: Truthful Fee Status */}
            <div className="p-3 rounded-xl bg-slate-50 border border-slate-200">
              <span className="text-[10px] uppercase font-bold text-slate-400 block mb-0.5">
                Fee Ledger
              </span>
              <span className="text-sm font-bold text-slate-600 font-serif block mt-1">
                Not Configured
              </span>
              <span className="text-[10px] text-slate-400 block mt-0.5">
                Financial records inactive
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
                <span className="font-medium text-slate-800">{student.mentorFaculty || "Not Assigned"}</span>
              </div>
              <div>
                <span className="text-slate-400 block">Affiliation Status</span>
                <span className="font-medium text-slate-600 italic">Not configured</span>
              </div>
            </div>
          </div>

          {/* Workstream C: Academic Lifecycle & Enrolment History */}
          <div>
            <h4 className="text-xs font-bold uppercase tracking-wider text-slate-500 mb-2 flex items-center justify-between">
              <span className="flex items-center space-x-1.5">
                <Icon name="academic-cap" className="h-4 w-4 text-[#1657D9]" />
                <span>Academic Lifecycle & Enrolment History</span>
              </span>
              <span className="text-[10px] text-slate-400 font-normal">
                {student.enrolmentHistory ? student.enrolmentHistory.length : 1} recorded terms
              </span>
            </h4>

            <div className="space-y-2">
              {student.enrolmentHistory && student.enrolmentHistory.length > 0 ? (
                student.enrolmentHistory.map((item, idx) => (
                  <div
                    key={item.id || idx}
                    className={`p-3.5 rounded-xl border text-xs transition-all ${
                      item.isCurrent
                        ? "bg-blue-50/40 border-blue-200/80 shadow-2xs"
                        : "bg-slate-50/60 border-slate-200"
                    }`}
                  >
                    <div className="flex flex-wrap items-center justify-between gap-2 mb-1.5">
                      <div className="flex items-center space-x-2">
                        <span className="font-bold text-slate-900">
                          Semester {item.semesterNumber} ({item.divisionName})
                        </span>
                        <span className="font-mono text-[10px] font-bold text-slate-600 bg-slate-200/70 px-2 py-0.5 rounded">
                          {item.programmeCode}
                        </span>
                        <span className="text-[10px] text-slate-500">
                          {item.academicYearCode}
                        </span>
                      </div>
                      <div className="flex items-center space-x-1.5">
                        {item.isCurrent && (
                          <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-emerald-50 text-emerald-700 border border-emerald-200">
                            Current Placement
                          </span>
                        )}
                        <span className="px-2 py-0.5 rounded-full text-[10px] font-semibold bg-slate-100 text-slate-600 border border-slate-200">
                          {item.status}
                        </span>
                      </div>
                    </div>

                    <div className="text-[11px] text-slate-600 flex items-center justify-between">
                      <span>{item.programmeName}</span>
                      <span className="text-slate-400 text-[10px]">
                        Enrolled: {item.enrolledAt}
                      </span>
                    </div>

                    {/* Workstream E: Surface hierarchy anomaly if present */}
                    {item.hasHierarchyAnomaly && (
                      <div className="mt-2.5 p-2.5 rounded-lg bg-amber-50/90 border border-amber-300 text-amber-900 flex items-start space-x-2">
                        <Icon name="exclamation-circle" className="w-4 h-4 text-amber-600 shrink-0 mt-0.5" />
                        <div>
                          <span className="font-bold block text-[11px]">Enrolment Hierarchy Inconsistency Flagged</span>
                          <span className="text-[10px] text-amber-800 leading-relaxed block">
                            {item.anomalyMessage || "Assigned division belongs to a different semester record in active institutional records. Needs administrative review."}
                          </span>
                        </div>
                      </div>
                    )}
                  </div>
                ))
              ) : (
                <div className="p-4 rounded-xl bg-slate-50 border border-slate-200 text-slate-500 text-center text-xs">
                  No historical enrolments recorded.
                </div>
              )}
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
                <span className="font-medium text-slate-800">{student.dateOfBirth || "Not Recorded"}</span>
              </div>
              <div>
                <span className="text-slate-400 block">Blood Group</span>
                <span className="font-medium text-slate-800">{student.bloodGroup || "Not Recorded"}</span>
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
                <span className="font-semibold text-slate-800">{student.guardianName || "Not Recorded"}</span>
              </div>
              <div>
                <span className="text-slate-400 block">Relationship</span>
                <span className="font-medium text-slate-800">{student.guardianRelationship || "Not Recorded"}</span>
              </div>
              <div>
                <span className="text-slate-400 block">Emergency Phone</span>
                <span className="font-medium text-slate-800">{student.guardianPhone || "Not Recorded"}</span>
              </div>
            </div>
          </div>

          {/* Institutional Integrity Notice */}
          <div className="p-3 rounded-xl bg-blue-50/80 border border-blue-200 text-[11px] text-slate-600 leading-relaxed">
            <strong className="text-slate-800 font-semibold block mb-0.5">
              Institutional Academic Dossier:
            </strong>
            Verified student records and academic placements are backed by the institutional database. Fee ledgers and examination portals will be integrated in subsequent milestones.
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
