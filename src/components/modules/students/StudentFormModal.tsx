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
  onSave: (student: StudentRecord) => void;
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
  const [gpa, setGpa] = useState<string>(initialData?.gpa ? String(initialData.gpa) : "8.5");
  const [mentorFaculty, setMentorFaculty] = useState(initialData?.mentorFaculty || "Prof. Snehal Kulkarni");
  const [guardianName, setGuardianName] = useState(initialData?.guardianName || "");
  const [guardianRelationship, setGuardianRelationship] = useState(initialData?.guardianRelationship || "Father");
  const [guardianPhone, setGuardianPhone] = useState(initialData?.guardianPhone || "+91 ");
  const [dateOfBirth, setDateOfBirth] = useState(initialData?.dateOfBirth || "2006-05-15");
  const [bloodGroup, setBloodGroup] = useState(initialData?.bloodGroup || "B+");

  const [errors, setErrors] = useState<FormErrors>({});

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

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!validate()) return;

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
      isFictionalSample: true,
    };

    onSave(record);
    onClose();
  };

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-xs"
      onClick={onClose}
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
                Academic Session 2026–27 • Student Management
              </p>
            </div>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="text-slate-400 hover:text-white p-1 rounded-lg hover:bg-white/10 transition-colors cursor-pointer"
            aria-label="Close"
          >
            <Icon name="x-mark" className="w-5 h-5" />
          </button>
        </div>

        {/* Scrollable Form Body */}
        <form id="student-form" onSubmit={handleSubmit} className="flex-1 overflow-y-auto p-6 space-y-5 text-xs text-slate-800">
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
                  onChange={(e) => setFullName(e.target.value)}
                  placeholder="e.g. Aarav Sharma"
                  className={`w-full px-3 py-2 rounded-xl bg-slate-50 border ${
                    errors.fullName ? "border-[#D92534] ring-1 ring-[#D92534]" : "border-slate-200"
                  } text-slate-900 focus:outline-none focus:ring-1 focus:ring-[#1657D9] text-xs`}
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
                  onChange={(e) => setPrn(e.target.value)}
                  placeholder="e.g. 2026DS041"
                  className={`w-full px-3 py-2 rounded-xl bg-slate-50 border ${
                    errors.prn ? "border-[#D92534] ring-1 ring-[#D92534]" : "border-slate-200"
                  } font-mono font-bold text-slate-900 focus:outline-none focus:ring-1 focus:ring-[#1657D9] text-xs`}
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
                  onChange={(e) => setProgrammeId(e.target.value)}
                  className="w-full px-3 py-2 rounded-xl bg-slate-50 border border-slate-200 text-slate-900 focus:outline-none focus:ring-1 focus:ring-[#1657D9] text-xs cursor-pointer font-medium"
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
                    onChange={(e) => {
                      const sem = Number(e.target.value);
                      setSemester(sem);
                      if (sem <= 2) setYearGroup("FY");
                      else if (sem <= 4) setYearGroup("SY");
                      else setYearGroup("TY");
                    }}
                    className="w-full px-3 py-2 rounded-xl bg-slate-50 border border-slate-200 text-slate-900 focus:outline-none focus:ring-1 focus:ring-[#1657D9] text-xs cursor-pointer"
                  >
                    <option value={1}>Semester 1</option>
                    <option value={2}>Semester 2</option>
                    <option value={3}>Semester 3</option>
                    <option value={4}>Semester 4</option>
                    <option value={5}>Semester 5</option>
                    <option value={6}>Semester 6</option>
                  </select>

                  <select
                    value={division}
                    onChange={(e) => setDivision(e.target.value as "Div A" | "Div B" | "Div C")}
                    className="w-full px-3 py-2 rounded-xl bg-slate-50 border border-slate-200 text-slate-900 focus:outline-none focus:ring-1 focus:ring-[#1657D9] text-xs cursor-pointer"
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
                  onChange={(e) => setEnrollmentStatus(e.target.value as StudentStatus)}
                  className="w-full px-3 py-2 rounded-xl bg-slate-50 border border-slate-200 text-slate-900 focus:outline-none focus:ring-1 focus:ring-[#1657D9] text-xs cursor-pointer font-medium"
                >
                  <option value="Active">Active Enrolled</option>
                  <option value="On Leave">On Leave / Internship</option>
                  <option value="Pending Verification">Pending Verification</option>
                  <option value="Graduated">Graduated</option>
                </select>
              </div>
            </div>
          </div>

          {/* Section 2: Contact Information */}
          <div className="space-y-3 pt-2">
            <h4 className="text-xs font-bold uppercase tracking-wider text-[#1657D9] flex items-center space-x-1.5 border-b border-slate-100 pb-1.5">
              <Icon name="users" className="h-4 w-4" />
              <span>2. Contact & Identity</span>
            </h4>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3.5">
              <div>
                <label className="block text-slate-600 font-semibold mb-1">
                  Institutional Email <span className="text-[#D92534]">*</span>
                </label>
                <input
                  type="email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  placeholder="student@rpihm.ac.in"
                  className={`w-full px-3 py-2 rounded-xl bg-slate-50 border ${
                    errors.email ? "border-[#D92534] ring-1 ring-[#D92534]" : "border-slate-200"
                  } text-slate-900 focus:outline-none focus:ring-1 focus:ring-[#1657D9] text-xs`}
                />
                {errors.email && (
                  <p className="text-[10px] text-[#D92534] mt-1 font-medium">{errors.email}</p>
                )}
              </div>

              <div>
                <label className="block text-slate-600 font-semibold mb-1">
                  Contact Phone No. <span className="text-[#D92534]">*</span>
                </label>
                <input
                  type="text"
                  value={phone}
                  onChange={(e) => setPhone(e.target.value)}
                  placeholder="+91 98201 XXXXX"
                  className={`w-full px-3 py-2 rounded-xl bg-slate-50 border ${
                    errors.phone ? "border-[#D92534] ring-1 ring-[#D92534]" : "border-slate-200"
                  } text-slate-900 focus:outline-none focus:ring-1 focus:ring-[#1657D9] text-xs`}
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
                  onChange={(e) => setDateOfBirth(e.target.value)}
                  className="w-full px-3 py-2 rounded-xl bg-slate-50 border border-slate-200 text-slate-900 focus:outline-none focus:ring-1 focus:ring-[#1657D9] text-xs cursor-pointer"
                />
              </div>

              <div>
                <label className="block text-slate-600 font-semibold mb-1">Blood Group</label>
                <select
                  value={bloodGroup}
                  onChange={(e) => setBloodGroup(e.target.value)}
                  className="w-full px-3 py-2 rounded-xl bg-slate-50 border border-slate-200 text-slate-900 focus:outline-none focus:ring-1 focus:ring-[#1657D9] text-xs cursor-pointer"
                >
                  <option value="A+">A+</option>
                  <option value="A-">A-</option>
                  <option value="B+">B+</option>
                  <option value="B-">B-</option>
                  <option value="AB+">AB+</option>
                  <option value="AB-">AB-</option>
                  <option value="O+">O+</option>
                  <option value="O-">O-</option>
                </select>
              </div>
            </div>
          </div>

          {/* Section 3: Institutional Ledger & Mentor */}
          <div className="space-y-3 pt-2">
            <h4 className="text-xs font-bold uppercase tracking-wider text-[#1657D9] flex items-center space-x-1.5 border-b border-slate-100 pb-1.5">
              <Icon name="calendar" className="h-4 w-4" />
              <span>3. Metrics & Ledger</span>
            </h4>

            <div className="grid grid-cols-1 sm:grid-cols-3 gap-3.5">
              <div>
                <label className="block text-slate-600 font-semibold mb-1">Attendance Rate (%)</label>
                <input
                  type="number"
                  min="0"
                  max="100"
                  value={attendanceRate}
                  onChange={(e) => setAttendanceRate(Number(e.target.value))}
                  className={`w-full px-3 py-2 rounded-xl bg-slate-50 border ${
                    errors.attendanceRate ? "border-[#D92534]" : "border-slate-200"
                  } text-slate-900 focus:outline-none focus:ring-1 focus:ring-[#1657D9] text-xs`}
                />
                {errors.attendanceRate && (
                  <p className="text-[10px] text-[#D92534] mt-1 font-medium">{errors.attendanceRate}</p>
                )}
              </div>

              <div>
                <label className="block text-slate-600 font-semibold mb-1">Fee Status</label>
                <select
                  value={feeStatus}
                  onChange={(e) => setFeeStatus(e.target.value as FeeStatus)}
                  className="w-full px-3 py-2 rounded-xl bg-slate-50 border border-slate-200 text-slate-900 focus:outline-none focus:ring-1 focus:ring-[#1657D9] text-xs cursor-pointer font-medium"
                >
                  <option value="Paid">Paid Full</option>
                  <option value="Partial">Partial Installment</option>
                  <option value="Pending">Pending Due</option>
                </select>
              </div>

              <div>
                <label className="block text-slate-600 font-semibold mb-1">Cumulative GPA (10 pt)</label>
                <input
                  type="text"
                  value={gpa}
                  onChange={(e) => setGpa(e.target.value)}
                  placeholder="e.g. 8.6"
                  className="w-full px-3 py-2 rounded-xl bg-slate-50 border border-slate-200 text-slate-900 focus:outline-none focus:ring-1 focus:ring-[#1657D9] text-xs"
                />
              </div>

              <div className="sm:col-span-3">
                <label className="block text-slate-600 font-semibold mb-1">Mentor Faculty Guide</label>
                <input
                  type="text"
                  value={mentorFaculty}
                  onChange={(e) => setMentorFaculty(e.target.value)}
                  placeholder="e.g. Prof. Snehal Kulkarni"
                  className="w-full px-3 py-2 rounded-xl bg-slate-50 border border-slate-200 text-slate-900 focus:outline-none focus:ring-1 focus:ring-[#1657D9] text-xs"
                />
              </div>
            </div>
          </div>

          {/* Section 4: Guardian & Emergency Contact */}
          <div className="space-y-3 pt-2">
            <h4 className="text-xs font-bold uppercase tracking-wider text-[#1657D9] flex items-center space-x-1.5 border-b border-slate-100 pb-1.5">
              <Icon name="phone" className="h-4 w-4" />
              <span>4. Guardian & Emergency Contact</span>
            </h4>

            <div className="grid grid-cols-1 sm:grid-cols-3 gap-3.5">
              <div>
                <label className="block text-slate-600 font-semibold mb-1">
                  Guardian Name <span className="text-[#D92534]">*</span>
                </label>
                <input
                  type="text"
                  value={guardianName}
                  onChange={(e) => setGuardianName(e.target.value)}
                  placeholder="Parent / Guardian Name"
                  className={`w-full px-3 py-2 rounded-xl bg-slate-50 border ${
                    errors.guardianName ? "border-[#D92534]" : "border-slate-200"
                  } text-slate-900 focus:outline-none focus:ring-1 focus:ring-[#1657D9] text-xs`}
                />
                {errors.guardianName && (
                  <p className="text-[10px] text-[#D92534] mt-1 font-medium">{errors.guardianName}</p>
                )}
              </div>

              <div>
                <label className="block text-slate-600 font-semibold mb-1">Relationship</label>
                <select
                  value={guardianRelationship}
                  onChange={(e) => setGuardianRelationship(e.target.value)}
                  className="w-full px-3 py-2 rounded-xl bg-slate-50 border border-slate-200 text-slate-900 focus:outline-none focus:ring-1 focus:ring-[#1657D9] text-xs cursor-pointer"
                >
                  <option value="Father">Father</option>
                  <option value="Mother">Mother</option>
                  <option value="Legal Guardian">Legal Guardian</option>
                  <option value="Sibling">Sibling</option>
                </select>
              </div>

              <div>
                <label className="block text-slate-600 font-semibold mb-1">
                  Emergency Phone <span className="text-[#D92534]">*</span>
                </label>
                <input
                  type="text"
                  value={guardianPhone}
                  onChange={(e) => setGuardianPhone(e.target.value)}
                  placeholder="+91 98201 XXXXX"
                  className={`w-full px-3 py-2 rounded-xl bg-slate-50 border ${
                    errors.guardianPhone ? "border-[#D92534]" : "border-slate-200"
                  } text-slate-900 focus:outline-none focus:ring-1 focus:ring-[#1657D9] text-xs`}
                />
                {errors.guardianPhone && (
                  <p className="text-[10px] text-[#D92534] mt-1 font-medium">{errors.guardianPhone}</p>
                )}
              </div>
            </div>
          </div>
        </form>

        {/* Modal Actions Footer */}
        <div className="bg-slate-50 px-6 py-4 border-t border-slate-200 flex items-center justify-between shrink-0">
          <span className="text-[11px] text-slate-400">
            * Indicates mandatory institutional field
          </span>
          <div className="flex items-center space-x-2.5">
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2 bg-white hover:bg-slate-100 text-slate-700 text-xs font-semibold rounded-xl border border-slate-200 transition-colors cursor-pointer"
            >
              Cancel
            </button>
            <button
              type="submit"
              form="student-form"
              className="px-5 py-2 bg-[#1657D9] hover:bg-[#1248B8] text-white text-xs font-semibold rounded-xl shadow-xs transition-colors cursor-pointer"
            >
              {mode === "add" ? "Enroll Student" : "Save Changes"}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};
