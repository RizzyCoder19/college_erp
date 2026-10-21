"use client";

import React, { useState, useEffect } from "react";
import { Icon } from "@/components/common/Icon";
import { StudentRecord, StudentStatus, FeeStatus } from "@/types/student";
import { ACADEMIC_PROGRAMMES } from "@/data/mockData";
import { getProgrammeDetailsAction } from "@/lib/actions/academics";

interface StudentFormModalProps {
  isOpen: boolean;
  mode: "add" | "edit";
  initialData?: StudentRecord | null;
  programmes?: Array<{ id: string; code: string; name: string; departmentName?: string; semesterCount?: number; durationYears?: number }>;
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

  // Compute maximum semesters supported by the selected programme
  const selectedProg = effectiveProgrammes.find((p) => p.id === programmeId);
  const maxSemesters =
    selectedProg && "semesterCount" in selectedProg && typeof selectedProg.semesterCount === "number" && selectedProg.semesterCount > 0
      ? selectedProg.semesterCount
      : selectedProg && "durationYears" in selectedProg && typeof selectedProg.durationYears === "number"
      ? selectedProg.durationYears * 2
      : 6;

  const [semester, setSemester] = useState<number>(initialData?.semester || 1);
  const [yearGroup, setYearGroup] = useState<"FY" | "SY" | "TY">(initialData?.yearGroup || "FY");
  const [division, setDivision] = useState<string>(initialData?.division || "Div A");
  const [availableDivisions, setAvailableDivisions] = useState<Array<{ id: string; name: string; maxCapacity: number }>>([]);
  const [isLoadingDivisions, setIsLoadingDivisions] = useState(false);

  // Dynamically load real provisioned divisions for the selected programme and semester
  useEffect(() => {
    let active = true;
    async function loadDivisions() {
      if (!programmeId) return;
      setIsLoadingDivisions(true);
      try {
        const res = await getProgrammeDetailsAction(programmeId);
        if (active && res.success && res.data) {
          const sem = res.data.semesters.find((s) => s.semesterNumber === Number(semester));
          const divs = sem?.divisions || [];
          setAvailableDivisions(divs);
          // If current division not in list and we have valid divisions, update division
          if (divs.length > 0 && !divs.some((d) => d.name === division)) {
            // If editing an existing student, keep their division if unmodified, else snap to first
            if (!initialData || initialData.programmeId !== programmeId || initialData.semester !== Number(semester)) {
              setDivision(divs[0].name);
            }
          }
        }
      } catch (err) {
        console.error("Failed to load semester divisions", err);
      } finally {
        if (active) setIsLoadingDivisions(false);
      }
    }
    loadDivisions();
    return () => {
      active = false;
    };
  }, [programmeId, semester, initialData]);

  // Compute placement change type
  const isProgChanged = Boolean(initialData && initialData.programmeId && initialData.programmeId !== programmeId);
  const isSemChanged = Boolean(initialData && initialData.semester !== Number(semester));
  const isDivChanged = Boolean(initialData && initialData.division !== division);

  const placementMode: "NEW" | "IDENTITY_ONLY" | "DIVISION_UPDATE" | "PROGRESSION" = !initialData
    ? "NEW"
    : !isProgChanged && !isSemChanged && !isDivChanged
    ? "IDENTITY_ONLY"
    : !isProgChanged && !isSemChanged && isDivChanged
    ? "DIVISION_UPDATE"
    : "PROGRESSION";
  const [email, setEmail] = useState(initialData?.email || "");
  const [phone, setPhone] = useState(initialData?.phone || "+91 ");
  const [enrollmentStatus, setEnrollmentStatus] = useState<StudentStatus>(initialData?.enrollmentStatus || "Active");
  const [attendanceRate, setAttendanceRate] = useState<number>(initialData?.attendanceRate ?? 88);
  const [gpa] = useState<string>(initialData?.gpa ? String(initialData.gpa) : "8.5");
  const [mentorFaculty, setMentorFaculty] = useState(initialData?.mentorFaculty || "");
  const [guardianName, setGuardianName] = useState(initialData?.guardianName || "");
  const [guardianRelationship, setGuardianRelationship] = useState(initialData?.guardianRelationship || "");
  const [guardianPhone, setGuardianPhone] = useState(initialData?.guardianPhone || "");
  const [dateOfBirth, setDateOfBirth] = useState(initialData?.dateOfBirth || "");
  const [bloodGroup, setBloodGroup] = useState(initialData?.bloodGroup || "");

  const [errors, setErrors] = useState<FormErrors>({});
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [serverError, setServerError] = useState<string | null>(null);

  // Synchronize form state whenever modal opens or target record updates
  useEffect(() => {
    if (isOpen) {
      setFullName(initialData?.fullName || "");
      setPrn(initialData?.prn || "");
      setProgrammeId(
        initialData?.programmeId || (effectiveProgrammes.length > 0 ? effectiveProgrammes[0].id : "prog-ds")
      );
      setSemester(initialData?.semester || 1);
      setYearGroup(initialData?.yearGroup || "FY");
      setDivision(initialData?.division || "Div A");
      setEmail(initialData?.email || "");
      setPhone(initialData?.phone || "+91 ");
      setEnrollmentStatus(initialData?.enrollmentStatus || "Active");
      setAttendanceRate(initialData?.attendanceRate ?? 88);
      setMentorFaculty(initialData?.mentorFaculty || "");
      setGuardianName(initialData?.guardianName || "");
      setGuardianRelationship(initialData?.guardianRelationship || "");
      setGuardianPhone(initialData?.guardianPhone || "");
      setDateOfBirth(initialData?.dateOfBirth || "");
      setBloodGroup(initialData?.bloodGroup || "");
      setErrors({});
      setServerError(null);
    }
  }, [isOpen, initialData, effectiveProgrammes]);

  // Keep semester bounded to the selected programme's valid range
  useEffect(() => {
    if (semester > maxSemesters) {
      setSemester(1);
      setYearGroup("FY");
    }
  }, [programmeId, maxSemesters, semester]);

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

    if (guardianPhone.trim()) {
      const cleanGPhone = guardianPhone.replace(/[^0-9]/g, "");
      if (cleanGPhone.length < 10) {
        newErrors.guardianPhone = "Guardian emergency phone must have at least 10 digits.";
      }
    }

    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleSubmit = async (e?: React.FormEvent | React.MouseEvent) => {
    if (e) e.preventDefault();
    if (isSubmitting) return;
    if (!validate()) return;

    if (placementMode !== "IDENTITY_ONLY" && !isLoadingDivisions && availableDivisions.length === 0) {
      setServerError(
        `Semester ${semester} of "${selectedProg?.name || 'the selected programme'}" has no divisions provisioned in the database. Academic administrators must provision a division before students can be placed in this semester.`
      );
      return;
    }

    setServerError(null);
    setIsSubmitting(true);

    try {
      const selectedP = effectiveProgrammes.find((p) => p.id === programmeId);
      const deptName =
        selectedP && "departmentName" in selectedP && typeof selectedP.departmentName === "string"
          ? selectedP.departmentName
          : selectedP && "department" in selectedP && typeof selectedP.department === "string"
          ? selectedP.department
          : "Technology & Computing";

      const record: StudentRecord = {
        id: initialData?.id || `std-${Date.now()}`,
        prn: prn.trim().toUpperCase(),
        fullName: fullName.trim(),
        email: email.trim().toLowerCase(),
        phone: phone.trim(),
        programmeId,
        programmeName: selectedP ? selectedP.name : "Undergraduate Programme",
        department: deptName,
        semester: Number(semester),
        yearGroup,
        division: division as "Div A" | "Div B" | "Div C",
        admissionDate: initialData?.admissionDate || "24 Jul 2026",
        enrollmentStatus,
        feeStatus: "Not configured" as FeeStatus,
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
      onClick={onClose}
      role="dialog"
      aria-modal="true"
      aria-label={mode === "add" ? "Enroll New Student" : "Edit Student Record"}
    >
      <div
        className="w-full max-w-2xl max-h-[90vh] flex flex-col rounded-2xl bg-white shadow-2xl border border-slate-200 overflow-hidden"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header */}
        <div className="bg-[#0B1528] p-5 text-white flex items-center justify-between border-b border-[#16243E] shrink-0">
          <div className="flex items-center space-x-3">
            <div className="w-10 h-10 rounded-xl bg-[#1657D9] flex items-center justify-center font-bold text-white shadow-md">
              <Icon name={mode === "add" ? "plus" : "pencil"} className="w-5 h-5" />
            </div>
            <div>
              <h3 className="font-bold text-base font-serif">
                {mode === "add" ? "Enroll New Student Record" : `Edit Dossier: ${initialData?.fullName}`}
              </h3>
              <p className="text-xs text-slate-300">
                {mode === "add"
                  ? "Record student identity and academic placement in the institutional register."
                  : `PRN: ${initialData?.prn} • Verified SQLite Record`}
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

        {/* Form Body */}
        <form
          id="student-form"
          onSubmit={handleSubmit}
          className="flex-1 overflow-y-auto p-6 space-y-6 text-xs text-slate-700"
        >
          {serverError && (
            <div className="p-3.5 rounded-xl bg-red-50 border border-red-200 text-red-700 flex items-center space-x-2">
              <Icon name="exclamation-circle" className="h-4 w-4 text-red-600 shrink-0" />
              <span>{serverError}</span>
            </div>
          )}

          {/* Section 1: Academic Placement */}
          <div className="space-y-3">
            <div className="flex items-center justify-between border-b border-slate-100 pb-1.5">
              <h4 className="text-xs font-bold uppercase tracking-wider text-[#1657D9] flex items-center space-x-1.5">
                <Icon name="academic-cap" className="h-4 w-4" />
                <span>1. Institutional Academic Placement</span>
              </h4>
              {initialData && (
                <span className={`text-[10px] font-bold px-2 py-0.5 rounded-full uppercase tracking-wider ${
                  placementMode === "IDENTITY_ONLY"
                    ? "bg-slate-100 text-slate-600"
                    : placementMode === "DIVISION_UPDATE"
                    ? "bg-blue-100 text-blue-700"
                    : "bg-amber-100 text-amber-800"
                }`}>
                  {placementMode === "IDENTITY_ONLY" && "Identity-Only Edit"}
                  {placementMode === "DIVISION_UPDATE" && "Division Correction"}
                  {placementMode === "PROGRESSION" && "Academic Progression"}
                </span>
              )}
            </div>

            {/* Placement Transition Indicator for Existing Students */}
            {initialData && (
              <div className={`p-3 rounded-xl border text-xs flex items-start space-x-2.5 ${
                placementMode === "IDENTITY_ONLY"
                  ? "bg-slate-50/80 border-slate-200 text-slate-600"
                  : placementMode === "DIVISION_UPDATE"
                  ? "bg-blue-50/80 border-blue-200 text-blue-800"
                  : "bg-amber-50/80 border-amber-200 text-amber-900"
              }`}>
                <Icon
                  name={placementMode === "IDENTITY_ONLY" ? "check-circle" : "academic-cap"}
                  className="h-4 w-4 shrink-0 mt-0.5"
                />
                <div className="flex-1 space-y-0.5">
                  <span className="font-bold block text-[11px]">
                    {placementMode === "IDENTITY_ONLY" && "Academic Placement Unchanged:"}
                    {placementMode === "DIVISION_UPDATE" && "Active Division Reassignment:"}
                    {placementMode === "PROGRESSION" && "Academic Progression / Placement Transition:"}
                  </span>
                  <p className="text-[11px] leading-relaxed">
                    {placementMode === "IDENTITY_ONLY" &&
                      "Editing name, contact, guardian, or operations details preserves the existing enrolment record untouched."}
                    {placementMode === "DIVISION_UPDATE" &&
                      `Reassigning division from ${initialData.division} to ${division} within the active semester without archiving enrolment history.`}
                    {placementMode === "PROGRESSION" &&
                      `Student will advance from Semester ${initialData.semester} (${initialData.division}) to Semester ${semester} (${division}). Previous placement will be safely preserved in institutional history as COMPLETED.`}
                  </p>
                </div>
              </div>
            )}

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3.5">
              <div>
                <label className="block text-slate-600 font-semibold mb-1">Academic Programme</label>
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
                <label className="block text-slate-600 font-semibold mb-1">
                  Semester & Cohort {isLoadingDivisions && <span className="text-slate-400 font-normal">(verifying...)</span>}
                </label>
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
                    {Array.from({ length: maxSemesters }, (_, i) => i + 1).map((s) => (
                      <option key={s} value={s}>
                        Semester {s}
                      </option>
                    ))}
                  </select>

                  <select
                    value={division}
                    disabled={isSubmitting || availableDivisions.length === 0}
                    onChange={(e) => setDivision(e.target.value)}
                    className="w-full px-3 py-2 rounded-xl bg-slate-50 border border-slate-200 text-slate-900 focus:outline-none focus:ring-1 focus:ring-[#1657D9] text-xs cursor-pointer font-medium disabled:opacity-60"
                  >
                    {availableDivisions.length > 0 ? (
                      availableDivisions.map((d) => (
                        <option key={d.id} value={d.name}>
                          {d.name} (Cap: {d.maxCapacity})
                        </option>
                      ))
                    ) : (
                      <option value={division}>{division} (No divisions provisioned)</option>
                    )}
                  </select>
                </div>
                {availableDivisions.length === 0 && !isLoadingDivisions && (
                  <p className="text-[10px] text-amber-700 mt-1 flex items-center space-x-1">
                    <Icon name="exclamation-circle" className="h-3 w-3 shrink-0" />
                    <span>No divisions provisioned for Semester {semester}. Progression blocked until division exists.</span>
                  </p>
                )}
              </div>

              <div>
                <label className="block text-slate-600 font-semibold mb-1">Enrolment Status</label>
                <select
                  value={enrollmentStatus}
                  disabled={isSubmitting}
                  onChange={(e) => setEnrollmentStatus(e.target.value as StudentStatus)}
                  className="w-full px-3 py-2 rounded-xl bg-slate-50 border border-slate-200 text-slate-900 focus:outline-none focus:ring-1 focus:ring-[#1657D9] text-xs cursor-pointer font-medium disabled:opacity-60"
                >
                  <option value="Active">Active Student</option>
                  <option value="On Leave">On Leave / Training</option>
                  <option value="Pending Verification">Pending Verification</option>
                  <option value="Graduated">Graduated / Alumni</option>
                </select>
              </div>

              <div>
                <label className="block text-slate-600 font-semibold mb-1">
                  Institutional Roll Number / PRN <span className="text-[#D92534]">*</span>
                </label>
                <input
                  type="text"
                  value={prn}
                  disabled={isSubmitting}
                  onChange={(e) => setPrn(e.target.value.toUpperCase())}
                  placeholder="e.g. 2026DS045 or RPIHM-2026-045"
                  className={`w-full px-3 py-2 rounded-xl bg-slate-50 border ${
                    errors.prn ? "border-[#D92534] ring-1 ring-[#D92534]" : "border-slate-200"
                  } font-mono font-semibold text-slate-900 focus:outline-none focus:ring-1 focus:ring-[#1657D9] text-xs disabled:opacity-60`}
                />
                {errors.prn && <p className="text-[10px] text-[#D92534] mt-1 font-medium">{errors.prn}</p>}
              </div>
            </div>
          </div>

          {/* Section 2: Student Identity */}
          <div className="space-y-3">
            <h4 className="text-xs font-bold uppercase tracking-wider text-[#1657D9] flex items-center space-x-1.5 border-b border-slate-100 pb-1.5">
              <Icon name="users" className="h-4 w-4" />
              <span>2. Student Identity & Contact Information</span>
            </h4>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3.5">
              <div className="sm:col-span-2">
                <label className="block text-slate-600 font-semibold mb-1">
                  Full Name (as per matriculation records) <span className="text-[#D92534]">*</span>
                </label>
                <input
                  type="text"
                  value={fullName}
                  disabled={isSubmitting}
                  onChange={(e) => setFullName(e.target.value)}
                  placeholder="e.g. Aarav Sharma"
                  className={`w-full px-3 py-2 rounded-xl bg-slate-50 border ${
                    errors.fullName ? "border-[#D92534] ring-1 ring-[#D92534]" : "border-slate-200"
                  } text-slate-900 focus:outline-none focus:ring-1 focus:ring-[#1657D9] text-xs font-medium disabled:opacity-60`}
                />
                {errors.fullName && <p className="text-[10px] text-[#D92534] mt-1 font-medium">{errors.fullName}</p>}
              </div>

              <div>
                <label className="block text-slate-600 font-semibold mb-1">
                  Institutional Email <span className="text-[#D92534]">*</span>
                </label>
                <input
                  type="email"
                  value={email}
                  disabled={isSubmitting}
                  onChange={(e) => setEmail(e.target.value.toLowerCase())}
                  placeholder="e.g. student.name.26@rpihm.ac.in"
                  className={`w-full px-3 py-2 rounded-xl bg-slate-50 border ${
                    errors.email ? "border-[#D92534] ring-1 ring-[#D92534]" : "border-slate-200"
                  } text-slate-900 focus:outline-none focus:ring-1 focus:ring-[#1657D9] text-xs disabled:opacity-60`}
                />
                {errors.email && <p className="text-[10px] text-[#D92534] mt-1 font-medium">{errors.email}</p>}
              </div>

              <div>
                <label className="block text-slate-600 font-semibold mb-1">
                  Primary Mobile Phone <span className="text-[#D92534]">*</span>
                </label>
                <input
                  type="tel"
                  value={phone}
                  disabled={isSubmitting}
                  onChange={(e) => setPhone(e.target.value)}
                  placeholder="+91 98000 00000"
                  className={`w-full px-3 py-2 rounded-xl bg-slate-50 border ${
                    errors.phone ? "border-[#D92534] ring-1 ring-[#D92534]" : "border-slate-200"
                  } font-mono text-slate-900 focus:outline-none focus:ring-1 focus:ring-[#1657D9] text-xs disabled:opacity-60`}
                />
                {errors.phone && <p className="text-[10px] text-[#D92534] mt-1 font-medium">{errors.phone}</p>}
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
                  <option value="A+">A+</option>
                  <option value="A-">A-</option>
                  <option value="B+">B+</option>
                  <option value="B-">B-</option>
                  <option value="O+">O+</option>
                  <option value="O-">O-</option>
                  <option value="AB+">AB+</option>
                  <option value="AB-">AB-</option>
                </select>
              </div>
            </div>
          </div>

          {/* Section 3: Guardian Details */}
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
                  <option value="Sibling">Sibling</option>
                </select>
              </div>

              <div>
                <label className="block text-slate-600 font-semibold mb-1">
                  Emergency Phone <span className="text-[#D92534]">*</span>
                </label>
                <input
                  type="tel"
                  value={guardianPhone}
                  disabled={isSubmitting}
                  onChange={(e) => setGuardianPhone(e.target.value)}
                  placeholder="+91 98000 00000"
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
              {/* Workstream D: Disabled Unconfigured Fee Input */}
              <div>
                <label className="block text-slate-600 font-semibold mb-1">Institutional Fee Ledger</label>
                <select
                  disabled
                  className="w-full px-3 py-2 rounded-xl bg-slate-100 border border-slate-200 text-slate-400 text-xs cursor-not-allowed font-medium opacity-80"
                  title="Fee ledger not configured for live database persistence"
                >
                  <option>Fee records not configured</option>
                </select>
                <p className="text-[10px] text-slate-400 mt-1">Financial ledger inactive in current milestone.</p>
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
              onClick={handleSubmit}
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
