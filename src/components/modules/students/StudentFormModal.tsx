"use client";

import React, { useState, useEffect } from "react";
import { Icon } from "@/components/common/Icon";
import { StudentRecord, StudentStatus, FeeStatus } from "@/types/student";
import { ACADEMIC_PROGRAMMES } from "@/data/mockData";

interface StudentFormModalProps {
  isOpen: boolean;
  mode: "add" | "edit";
  initialData?: StudentRecord | null;
  programmes?: Array<{ id: string; code: string; name: string; departmentName?: string }>;
  onClose: () => void;
  onSave: (student: StudentRecord) => Promise<{ success: boolean; error?: string } | boolean | void>;
}

interface FormErrors {
  fullName?: string;
  prn?: string;
  email?: string;
  phone?: string;
  attendanceRate?: string;
  guardianName?: string;
  guardianPhone?: string;
}

export const StudentFormModal: React.FC<StudentFormModalProps> = ({
  isOpen,
  mode,
  initialData,
  programmes,
  onClose,
  onSave,
}) => {
  const [fullName, setFullName] = useState(initialData?.fullName || "");
  const [prn, setPrn] = useState(initialData?.prn || "");
  const effectiveProgrammes = programmes && programmes.length > 0 ? programmes : ACADEMIC_PROGRAMMES;
  const [programmeId, setProgrammeId] = useState(
    initialData?.programmeId || (effectiveProgrammes.length > 0 ? effectiveProgrammes[0].id : "prog-ds")
  );
  const [semester, setSemester] = useState<number>(initialData?.semester || 1);
  const [yearGroup, setYearGroup] = useState<"FY" | "SY" | "TY">(initialData?.yearGroup || "FY");
  const [division, setDivision] = useState<"Div A" | "Div B" | "Div C">(initialData?.division || "Div A");
  const [email, setEmail] = useState(initialData?.email || "");
  const [phone, setPhone] = useState(initialData?.phone || "+91 ");
  const [enrollmentStatus, setEnrollmentStatus] = useState<StudentStatus>(initialData?.enrollmentStatus || "Active");
  const [feeStatus, setFeeStatus] = useState<FeeStatus>(initialData?.feeStatus || "Paid");
  const [attendanceRate, setAttendanceRate] = useState<number>(initialData?.attendanceRate ?? 88);
  const [gpa] = useState<string>(initialData?.gpa ? String(initialData.gpa) : "8.5");
  const [mentorFaculty, setMentorFaculty] = useState(initialData?.mentorFaculty || "Prof. Snehal Kulkarni");
  const [guardianName, setGuardianName] = useState(initialData?.guardianName || "");
  const [guardianRelationship, setGuardianRelationship] = useState(initialData?.guardianRelationship || "Father");
  const [guardianPhone, setGuardianPhone] = useState(initialData?.guardianPhone || "+91 ");
  const [dateOfBirth, setDateOfBirth] = useState(initialData?.dateOfBirth || "2006-05-15");
  const [bloodGroup, setBloodGroup] = useState(initialData?.bloodGroup || "B+");

  const [errors, setErrors] = useState<FormErrors>({});
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [serverError, setServerError] = useState<string | null>(null);

  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === "Escape" && isOpen && !isSubmitting) {
        onClose();
      }
    };
    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [isOpen, onClose, isSubmitting]);

  if (!isOpen) return null;

  const validate = (): boolean => {
    const newErrors: FormErrors = {};

    if (!fullName.trim() || fullName.trim().length < 3) {
      newErrors.fullName = "Full student name must be at least 3 characters.";
    }

    if (!prn.trim()) {
      newErrors.prn = "PRN / Roll Number is required.";
    }

    if (!email.trim() || !email.includes("@") || !email.includes(".")) {
      newErrors.email = "Please enter a valid email address.";
    }

    const cleanPhone = phone.replace(/[^0-9]/g, "");
    if (cleanPhone.length < 10) {
      newErrors.phone = "Phone number must have at least 10 digits.";
    }

    if (attendanceRate < 0 || attendanceRate > 100 || isNaN(attendanceRate)) {
      newErrors.attendanceRate = "Attendance must be between 0 and 100%.";
    }

    if (!guardianName.trim()) {
      newErrors.guardianName = "Guardian name is required.";
    }

    const cleanGPhone = guardianPhone.replace(/[^0-9]/g, "");
    if (cleanGPhone.length < 10) {
      newErrors.guardianPhone = "Guardian emergency phone must have at least 10 digits.";
    }

    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (isSubmitting) return;
    if (!validate()) return;

    setServerError(null);
    setIsSubmitting(true);

    try {
      const selectedProg = effectiveProgrammes.find((p) => p.id === programmeId);
      const deptName =
        selectedProg && "departmentName" in selectedProg && typeof selectedProg.departmentName === "string"
          ? selectedProg.departmentName
          : selectedProg && "department" in selectedProg && typeof selectedProg.department === "string"
          ? selectedProg.department
          : "Technology & Computing";

      const record: StudentRecord = {
        id: initialData?.id || `std-${Date.now()}`,
        prn: prn.trim().toUpperCase(),
        fullName: fullName.trim(),
        email: email.trim().toLowerCase(),
        phone: phone.trim(),
        programmeId,
        programmeName: selectedProg ? selectedProg.name : "Undergraduate Programme",
        department: deptName,
        semester: Number(semester),
        yearGroup,
        division,
        admissionDate: initialData?.admissionDate || "24 Jul 2026",
        enrollmentStatus,
        feeStatus,
        attendanceRate: Number(attendanceRate),
        gpa: gpa ? parseFloat(gpa) : undefined,
        mentorFaculty,
        guardianName: guardianName.trim(),
        guardianRelationship,
        guardianPhone: guardianPhone.trim(),
        dateOfBirth,
        bloodGroup,
        isFictionalSample: false,
      };

      const result = await onSave(record);

      if (typeof result === "object" && result !== null && "success" in result) {
        if (!result.success) {
          setServerError(result.error || "Failed to persist student record. Please verify entered data.");
          return;
        }
      } else if (result === false) {
        setServerError("Failed to persist student record. Please verify entered data.");
        return;
      }

      onClose();
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : "An unexpected error occurred while saving.";
      setServerError(msg);
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-xs"
      onClick={() => {
        if (!isSubmitting) onClose();
      }}
      role="dialog"
      aria-modal="true"
      aria-label={mode === "add" ? "Add Student" : "Edit Student"}
    >
      <div
        className="w-full max-w-2xl max-h-[92vh] flex flex-col rounded-2xl bg-white shadow-2xl border border-slate-200 overflow-hidden"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header */}
        <div className="bg-[#0B1528] px-6 py-4.5 text-white border-b border-[#16243E] flex items-center justify-between shrink-0">
          <div className="flex items-center space-x-3">
            <div className="p-2 rounded-xl bg-blue-500/20 text-blue-200 border border-blue-400/30">
              <Icon name="users" className="h-5 w-5" />
            </div>
            <div>
              <h3 className="text-base font-bold text-white font-serif">
                {mode === "add" ? "Enroll New Student Dossier" : "Update Student Record"}
              </h3>
              <p className="text-[11px] text-slate-300">
                Academic Session 2026?27 ? Student Management
              </p>
            </div>
          </div>
          <button
            type="button"
            onClick={onClose}
            disabled={isSubmitting}
            className="text-slate-400 hover:text-white p-1 rounded-lg hover:bg-white/10 transition-colors cursor-pointer disabled:opacity-40 disabled:cursor-not-allowed"
            aria-label="Close"
          >
            <Icon name="x-mark" className="w-5 h-5" />
          </button>
        </div>

        {/* Scrollable Form Body */}
        <form id="student-form" onSubmit={handleSubmit} className="flex-1 overflow-y-auto p-6 space-y-5 text-xs text-slate-800">
          {/* Actionable Server Error Banner */}
          {serverError && (
            <div className="p-3.5 rounded-xl bg-red-50 border border-red-200 text-[#D92534] flex items-start space-x-2.5 animate-in fade-in">
              <Icon name="exclamation-circle" className="h-5 w-5 shrink-0 mt-0.5 text-[#D92534]" />
              <div className="flex-1">
                <p className="font-bold text-xs text-red-900">Unable to Save Student Record</p>
                <p className="text-[11px] text-red-700 mt-0.5 leading-relaxed">{serverError}</p>
              </div>
            </div>
          )}

          {/* Section 1: Core Academic Information */}
          <div className="space-y-3">
            <h4 className="text-xs font-bold uppercase tracking-wider text-[#1657D9] flex items-center space-x-1.5 border-b border-slate-100 pb-1.5">
              <Icon name="academic-cap" className="h-4 w-4" />
              <span>1. Academic Enrolment Data</span>
            </h4>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3.5">
              <div>
                <label className="block text-slate-600 font-semibold mb-1">
                  Full Student Name <span className="text-[#D92534]">*</span>
                </label>
                <input
                  type="text"
                  value={fullName}
                  disabled={isSubmitting}
                  onChange={(e) => setFullName(e.target.value)}
                  placeholder="e.g. Aarav Sharma"
                  className={`w-full px-3 py-2 rounded-xl bg-slate-50 border ${
                    errors.fullName ? "border-[#D92534] ring-1 ring-[#D92534]" : "border-slate-200"
                  } text-slate-900 focus:outline-none focus:ring-1 focus:ring-[#1657D9] text-xs disabled:opacity-60`}
                />
                {errors.fullName && (
                  <p className="text-[10px] text-[#D92534] mt-1 font-medium">{errors.fullName}</p>
                )}
              </div>

              <div>
                <label className="block text-slate-600 font-semibold mb-1">
                  PRN / Roll Number <span className="text-[#D92534]">*</span>
                </label>
                <input
                  type="text"
                  value={prn}
                  disabled={isSubmitting}
                  onChange={(e) => setPrn(e.target.value)}
                  placeholder="e.g. 2026DS041"
                  className={`w-full px-3 py-2 rounded-xl bg-slate-50 border ${
                    errors.prn ? "border-[#D92534] ring-1 ring-[#D92534]" : "border-slate-200"
                  } font-mono font-bold text-slate-900 focus:outline-none focus:ring-1 focus:ring-[#1657D9] text-xs disabled:opacity-60`}
                />
                {errors.prn && (
                  <p className="text-[10px] text-[#D92534] mt-1 font-medium">{errors.prn}</p>
                )}
              </div>

              <div className="sm:col-span-2">
                <label className="block text-slate-600 font-semibold mb-1">
                  Academic Programme <span className="text-[#D92534]">*</span>
                </label>
                <select
                  value={programmeId}
                  disabled={isSubmitting}
                  onChange={(e) => setProgrammeId(e.target.value)}
                  className="w-full px-3 py-2 rounded-xl bg-slate-50 border border-slate-200 text-slate-900 focus:outline-none focus:ring-1 focus:ring-[#1657D9] text-xs cursor-pointer font-medium disabled:opacity-60"
                >
                  {effectiveProgrammes.map((prog) => (
                    <option key={prog.id} value={prog.id}>
                      {prog.name} ({prog.code})
                    </option>
                  ))}
                </select>
              </div>

              <div>
                <label className="block text-slate-600 font-semibold mb-1">Semester & Cohort</label>
                <div className="grid grid-cols-2 gap-2">
                  <select
                    value={semester}
                    disabled={isSubmitting}
                    onChange={(e) => {
                      const sem = Number(e.target.value);
                      setSemester(sem);
                      setYearGroup(sem <= 2 ? "FY" : sem <= 4 ? "SY" : "TY");
                    }}
                    className="w-full px-3 py-2 rounded-xl bg-slate-50 border border-slate-200 text-slate-900 focus:outline-none focus:ring-1 focus:ring-[#1657D9] text-xs cursor-pointer font-medium disabled:opacity-60"
                  >
                    {[1, 2, 3, 4, 5, 6].map((s) => (
                      <option key={s} value={s}>
                        Semester {s}
                      </option>
                    ))}
                  </select>

                  <select
                    value={division}
                    disabled={isSubmitting}
                    onChange={(e) => setDivision(e.target.value as "Div A" | "Div B" | "Div C")}
                    className="w-full px-3 py-2 rounded-xl bg-slate-50 border border-slate-200 text-slate-900 focus:outline-none focus:ring-1 focus:ring-[#1657D9] text-xs cursor-pointer font-medium disabled:opacity-60"
                  >
                    <option value="Div A">Div A</option>
                    <option value="Div B">Div B</option>
                    <option value="Div C">Div C</option>
                  </select>
                </div>
              </div>

              <div>
                <label className="block text-slate-600 font-semibold mb-1">Enrolment Status</label>
                <select
                  value={enrollmentStatus}
                  disabled={isSubmitting}
                  onChange={(e) => setEnrollmentStatus(e.target.value as StudentStatus)}
                  className="w-full px-3 py-2 rounded-xl bg-slate-50 border border-slate-200 text-slate-900 focus:outline-none focus:ring-1 focus:ring-[#1657D9] text-xs cursor-pointer font-medium disabled:opacity-60"
                >
                  <option value="Active">Active</option>
                  <option value="On Leave">On Leave</option>
                  <option value="Graduated">Graduated</option>
                  <option value="Pending Verification">Pending Verification</option>
                </select>
              </div>
            </div>
          </div>

          {/* Section 2: Contact & Identification */}
          <div className="space-y-3">
            <h4 className="text-xs font-bold uppercase tracking-wider text-[#1657D9] flex items-center space-x-1.5 border-b border-slate-100 pb-1.5">
              <Icon name="identification" className="h-4 w-4" />
              <span>2. Contact & Identity Information</span>
            </h4>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3.5">
              <div>
                <label className="block text-slate-600 font-semibold mb-1">
                  Institutional / Student Email <span className="text-[#D92534]">*</span>
                </label>
                <input
                  type="email"
                  value={email}
                  disabled={isSubmitting}
                  onChange={(e) => setEmail(e.target.value)}
                  placeholder="student.name@rpihm.ac.in"
                  className={`w-full px-3 py-2 rounded-xl bg-slate-50 border ${
                    errors.email ? "border-[#D92534] ring-1 ring-[#D92534]" : "border-slate-200"
                  } text-slate-900 focus:outline-none focus:ring-1 focus:ring-[#1657D9] text-xs disabled:opacity-60`}
                />
                {errors.email && (
                  <p className="text-[10px] text-[#D92534] mt-1 font-medium">{errors.email}</p>
                )}
              </div>

              <div>
                <label className="block text-slate-600 font-semibold mb-1">
                  Primary Mobile Phone <span className="text-[#D92534]">*</span>
                </label>
                <input
                  type="text"
                  value={phone}
                  disabled={isSubmitting}
                  onChange={(e) => setPhone(e.target.value)}
                  placeholder="+91 98200 12345"
                  className={`w-full px-3 py-2 rounded-xl bg-slate-50 border ${
                    errors.phone ? "border-[#D92534] ring-1 ring-[#D92534]" : "border-slate-200"
                  } font-mono text-slate-900 focus:outline-none focus:ring-1 focus:ring-[#1657D9] text-xs disabled:opacity-60`}
                />
                {errors.phone && (
                  <p className="text-[10px] text-[#D92534] mt-1 font-medium">{errors.phone}</p>
                )}
              </div>

              <div>
                <label className="block text-slate-600 font-semibold mb-1">Date of Birth</label>
                <input
                  type="date"
                  value={dateOfBirth}
                  disabled={isSubmitting}
                  onChange={(e) => setDateOfBirth(e.target.value)}
                  className="w-full px-3 py-2 rounded-xl bg-slate-50 border border-slate-200 text-slate-900 focus:outline-none focus:ring-1 focus:ring-[#1657D9] text-xs disabled:opacity-60"
                />
              </div>

              <div>
                <label className="block text-slate-600 font-semibold mb-1">Blood Group</label>
                <select
                  value={bloodGroup}
                  disabled={isSubmitting}
                  onChange={(e) => setBloodGroup(e.target.value)}
                  className="w-full px-3 py-2 rounded-xl bg-slate-50 border border-slate-200 text-slate-900 focus:outline-none focus:ring-1 focus:ring-[#1657D9] text-xs cursor-pointer font-medium disabled:opacity-60"
                >
                  {["A+", "A-", "B+", "B-", "AB+", "AB-", "O+", "O-"].map((bg) => (
                    <option key={bg} value={bg}>
                      {bg}
                    </option>
                  ))}
                </select>
              </div>
            </div>
          </div>

          {/* Section 3: Guardian & Emergency Contact */}
          <div className="space-y-3">
            <h4 className="text-xs font-bold uppercase tracking-wider text-[#1657D9] flex items-center space-x-1.5 border-b border-slate-100 pb-1.5">
              <Icon name="phone" className="h-4 w-4" />
              <span>3. Guardian & Emergency Contact</span>
            </h4>

            <div className="grid grid-cols-1 sm:grid-cols-3 gap-3.5">
              <div>
                <label className="block text-slate-600 font-semibold mb-1">
                  Guardian Name <span className="text-[#D92534]">*</span>
                </label>
                <input
                  type="text"
                  value={guardianName}
                  disabled={isSubmitting}
                  onChange={(e) => setGuardianName(e.target.value)}
                  placeholder="e.g. Ramesh Sharma"
                  className={`w-full px-3 py-2 rounded-xl bg-slate-50 border ${
                    errors.guardianName ? "border-[#D92534] ring-1 ring-[#D92534]" : "border-slate-200"
                  } text-slate-900 focus:outline-none focus:ring-1 focus:ring-[#1657D9] text-xs disabled:opacity-60`}
                />
                {errors.guardianName && (
                  <p className="text-[10px] text-[#D92534] mt-1 font-medium">{errors.guardianName}</p>
                )}
              </div>

              <div>
                <label className="block text-slate-600 font-semibold mb-1">Relationship</label>
                <select
                  value={guardianRelationship}
                  disabled={isSubmitting}
                  onChange={(e) => setGuardianRelationship(e.target.value)}
                  className="w-full px-3 py-2 rounded-xl bg-slate-50 border border-slate-200 text-slate-900 focus:outline-none focus:ring-1 focus:ring-[#1657D9] text-xs cursor-pointer font-medium disabled:opacity-60"
                >
                  <option value="Father">Father</option>
                  <option value="Mother">Mother</option>
                  <option value="Guardian">Legal Guardian</option>
                  <option value="Sibling">Elder Sibling</option>
                </select>
              </div>

              <div>
                <label className="block text-slate-600 font-semibold mb-1">
                  Guardian Phone <span className="text-[#D92534]">*</span>
                </label>
                <input
                  type="text"
                  value={guardianPhone}
                  disabled={isSubmitting}
                  onChange={(e) => setGuardianPhone(e.target.value)}
                  placeholder="+91 98200 54321"
                  className={`w-full px-3 py-2 rounded-xl bg-slate-50 border ${
                    errors.guardianPhone ? "border-[#D92534] ring-1 ring-[#D92534]" : "border-slate-200"
                  } font-mono text-slate-900 focus:outline-none focus:ring-1 focus:ring-[#1657D9] text-xs disabled:opacity-60`}
                />
                {errors.guardianPhone && (
                  <p className="text-[10px] text-[#D92534] mt-1 font-medium">{errors.guardianPhone}</p>
                )}
              </div>
            </div>
          </div>

          {/* Section 4: Operational & Mentor Details */}
          <div className="space-y-3">
            <h4 className="text-xs font-bold uppercase tracking-wider text-[#1657D9] flex items-center space-x-1.5 border-b border-slate-100 pb-1.5">
              <Icon name="document-text" className="h-4 w-4" />
              <span>4. Operational & Mentor Details</span>
            </h4>

            <div className="grid grid-cols-1 sm:grid-cols-3 gap-3.5">
              <div>
                <label className="block text-slate-600 font-semibold mb-1">Institutional Fee Ledger</label>
                <select
                  value={feeStatus}
                  disabled={isSubmitting}
                  onChange={(e) => setFeeStatus(e.target.value as FeeStatus)}
                  className="w-full px-3 py-2 rounded-xl bg-slate-50 border border-slate-200 text-slate-900 focus:outline-none focus:ring-1 focus:ring-[#1657D9] text-xs cursor-pointer font-medium disabled:opacity-60"
                >
                  <option value="Paid">Paid in Full</option>
                  <option value="Partial">Partial Installment</option>
                  <option value="Pending">Payment Pending</option>
                </select>
              </div>

              <div>
                <label className="block text-slate-600 font-semibold mb-1">Attendance Rate (%)</label>
                <input
                  type="number"
                  min="0"
                  max="100"
                  value={attendanceRate}
                  disabled={isSubmitting}
                  onChange={(e) => setAttendanceRate(Number(e.target.value))}
                  className="w-full px-3 py-2 rounded-xl bg-slate-50 border border-slate-200 text-slate-900 focus:outline-none focus:ring-1 focus:ring-[#1657D9] text-xs font-semibold disabled:opacity-60"
                />
              </div>

              <div>
                <label className="block text-slate-600 font-semibold mb-1">Assigned Faculty Mentor</label>
                <input
                  type="text"
                  value={mentorFaculty}
                  disabled={isSubmitting}
                  onChange={(e) => setMentorFaculty(e.target.value)}
                  placeholder="e.g. Prof. Snehal Kulkarni"
                  className="w-full px-3 py-2 rounded-xl bg-slate-50 border border-slate-200 text-slate-900 focus:outline-none focus:ring-1 focus:ring-[#1657D9] text-xs disabled:opacity-60"
                />
              </div>
            </div>
          </div>
        </form>

        {/* Footer Actions */}
        <div className="bg-slate-50 px-6 py-4 border-t border-slate-200 flex items-center justify-between shrink-0">
          <p className="text-[11px] text-slate-400">
            {isSubmitting ? "Persisting record to institutional database..." : "All changes are saved to the persistent institutional database."}
          </p>
          <div className="flex items-center space-x-2.5">
            <button
              type="button"
              onClick={onClose}
              disabled={isSubmitting}
              className="px-4 py-2 text-xs font-semibold text-slate-600 hover:text-slate-900 hover:bg-slate-200 rounded-xl transition-colors cursor-pointer disabled:opacity-40 disabled:cursor-not-allowed"
            >
              Cancel
            </button>
            <button
              type="submit"
              form="student-form"
              disabled={isSubmitting}
              className="px-5 py-2 text-xs font-semibold text-white bg-[#1657D9] hover:bg-[#1248B8] disabled:opacity-60 disabled:cursor-not-allowed rounded-xl transition-all shadow-xs flex items-center space-x-2 cursor-pointer"
            >
              {isSubmitting && (
                <span className="w-3.5 h-3.5 border-2 border-white/30 border-t-white rounded-full animate-spin"></span>
              )}
              <span>
                {isSubmitting
                  ? (mode === "add" ? "Enrolling..." : "Saving Changes...")
                  : (mode === "add" ? "Enroll Student" : "Save Changes")}
              </span>
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};
