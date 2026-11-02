"use client";

import React, { useState, useEffect, useCallback, useTransition } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { Icon } from "@/components/common/Icon";
import { getStudentDossierAction, updateStudentAction } from "@/lib/actions/students";
import { getCurrentUserAction } from "@/lib/actions/auth";
import { getProgrammesAction, getProgrammeDetailsAction, getCurrentAcademicYearAction } from "@/lib/actions/academics";
import { StudentDossier360Data } from "@/lib/dal/studentRepository";
import { AcademicProgrammeDTO } from "@/lib/dal/academicRepository";
import { StudentFormModal } from "./StudentFormModal";
import { StudentDocumentsTab } from "./StudentDocumentsTab";
import { StudentRecord } from "@/types/student";

interface StudentDossierViewProps {
  studentId: string;
}

type DossierTab = "overview" | "academics" | "attendance" | "fees" | "examinations" | "documents";

export const StudentDossierView: React.FC<StudentDossierViewProps> = ({ studentId }) => {
  const router = useRouter();
  const [, startTransition] = useTransition();

  const [dossier, setDossier] = useState<StudentDossier360Data | null>(null);
  const [activeTab, setActiveTab] = useState<DossierTab>("overview");

  useEffect(() => {
    if (typeof window !== "undefined") {
      const params = new URLSearchParams(window.location.search);
      const tab = params.get("tab") as DossierTab;
      if (tab && ["overview", "academics", "attendance", "fees", "examinations", "documents"].includes(tab)) {
        setActiveTab(tab);
      }
    }
  }, []);
  const [isLoading, setIsLoading] = useState(true);
  const [errorCode, setErrorCode] = useState<string | null>(null);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  // User Permissions & Editing
  const [userRole, setUserRole] = useState<string>("");
  const [canWrite, setCanWrite] = useState<boolean>(false);
  const [isEditModalOpen, setIsEditModalOpen] = useState(false);
  const [programmes, setProgrammes] = useState<AcademicProgrammeDTO[]>([]);
  const [toastMessage, setToastMessage] = useState<string | null>(null);

  const showToast = (msg: string) => {
    setToastMessage(msg);
    setTimeout(() => setToastMessage(null), 4000);
  };

  const loadDossier = useCallback(async () => {
    setIsLoading(true);
    setErrorCode(null);
    setErrorMessage(null);
    try {
      const [dossierRes, userRes, progRes] = await Promise.all([
        getStudentDossierAction(studentId),
        getCurrentUserAction(),
        getProgrammesAction(),
      ]);

      if (userRes.success && userRes.data) {
        setUserRole(userRes.data.role);
        setCanWrite(userRes.data.role === "SYSTEM_ADMIN" || userRes.data.role === "ACADEMIC_ADMIN");
      }

      if (progRes.success && progRes.data) {
        setProgrammes(progRes.data);
      }

      if (!dossierRes.success || !dossierRes.data) {
        setErrorCode(dossierRes.code || "LOAD_ERROR");
        setErrorMessage(dossierRes.error || "Unable to retrieve student record from institutional database.");
        setDossier(null);
      } else {
        setDossier(dossierRes.data);
      }
    } catch (err) {
      const msg = err instanceof Error ? err.message : "Network error contacting campus database";
      setErrorCode("FETCH_FAILED");
      setErrorMessage(msg);
    } finally {
      setIsLoading(false);
    }
  }, [studentId]);

  useEffect(() => {
    loadDossier();
  }, [loadDossier]);

  // Convert dossier student into StudentRecord for the edit form modal
  const formStudentRecord: StudentRecord | null = dossier
    ? {
        id: dossier.student.id,
        prn: dossier.student.prn,
        rollNumber: dossier.student.rollNumber,
        fullName: dossier.student.fullName,
        email: dossier.student.email,
        phone: dossier.student.phone,
        programmeId: dossier.activePlacement?.programmeId || "",
        programmeName: dossier.activePlacement?.programmeName || "Not assigned",
        department: "Academics",
        semester: dossier.activePlacement?.semesterNumber || dossier.student.currentSemester || 1,
        yearGroup:
          (dossier.activePlacement?.semesterNumber || 1) <= 2
            ? "FY"
            : (dossier.activePlacement?.semesterNumber || 1) <= 4
            ? "SY"
            : "TY",
        division: (dossier.activePlacement?.divisionName as "Div A" | "Div B" | "Div C") || "Div A",
        admissionDate: dossier.student.createdAt
          ? new Date(dossier.student.createdAt).toISOString().split("T")[0]
          : "",
        enrollmentStatus:
          dossier.student.status === "ACTIVE"
            ? "Active"
            : dossier.student.status === "ON_LEAVE"
            ? "On Leave"
            : dossier.student.status === "GRADUATED"
            ? "Graduated"
            : "Pending Verification",
        feeStatus:
          dossier.finance.summary.status === "CLEARED"
            ? "Paid"
            : dossier.finance.summary.status === "PARTIAL"
            ? "Partial"
            : dossier.finance.summary.status === "PENDING"
            ? "Pending"
            : "Not configured",
        attendanceRate: dossier.attendance.summary.ratePercentage ?? 0,
        mentorFaculty: dossier.student.mentorFaculty || "",
        guardianName: dossier.student.guardianName || "",
        guardianRelationship: dossier.student.guardianRelationship || "",
        guardianPhone: dossier.student.guardianPhone || "",
        dateOfBirth: dossier.student.dob
          ? new Date(dossier.student.dob).toISOString().split("T")[0]
          : "",
        bloodGroup: dossier.student.bloodGroup || "",
        isFictionalSample: false,
      }
    : null;

  const handleSaveStudent = async (updated: StudentRecord) => {
    if (!dossier) return;
    try {
      const cleanPrn = updated.prn.trim().toUpperCase();
      const rollNumber = cleanPrn.startsWith("RPIHM-") ? cleanPrn : `RPIHM-${cleanPrn}`;

      let dbStatus = "ACTIVE";
      if (updated.enrollmentStatus === "On Leave") dbStatus = "ON_LEAVE";
      else if (updated.enrollmentStatus === "Graduated") dbStatus = "GRADUATED";
      else if (updated.enrollmentStatus === "Pending Verification") dbStatus = "PENDING_VERIFICATION";

      let targetProgId: string | undefined = undefined;
      let semesterId: string | undefined = undefined;
      let divisionId: string | undefined = undefined;
      let academicYearId: string | undefined = undefined;

      const placementChanged =
        !dossier.activePlacement ||
        dossier.activePlacement.programmeId !== updated.programmeId ||
        dossier.activePlacement.semesterNumber !== Number(updated.semester) ||
        dossier.activePlacement.divisionName !== updated.division;

      if (placementChanged && updated.programmeId) {
        targetProgId = updated.programmeId;
        const progRes = await getProgrammeDetailsAction(targetProgId);
        if (progRes.success && progRes.data && progRes.data.semesters?.length > 0) {
          const sem = progRes.data.semesters.find((s) => s.semesterNumber === Number(updated.semester));
          if (sem) {
            semesterId = sem.id;
            const div = sem.divisions?.find((d) => d.name === updated.division) || sem.divisions?.[0];
            if (div) {
              divisionId = div.id;
            }
          }
        }
        const ayRes = await getCurrentAcademicYearAction();
        if (ayRes.success && ayRes.data) {
          academicYearId = ayRes.data.id;
        }
      }

      const res = await updateStudentAction(dossier.student.id, {
        fullName: updated.fullName.trim(),
        prn: cleanPrn,
        rollNumber,
        phone: updated.phone.trim(),
        email: updated.email.trim().toLowerCase(),
        bloodGroup: updated.bloodGroup,
        dob: updated.dateOfBirth ? new Date(updated.dateOfBirth) : undefined,
        status: dbStatus,
        guardianName: updated.guardianName,
        guardianRelationship: updated.guardianRelationship,
        guardianPhone: updated.guardianPhone,
        mentorFaculty: updated.mentorFaculty,
        programmeId: targetProgId,
        semesterId,
        divisionId,
        academicYearId,
      });

      if (!res.success) {
        showToast("Error updating student: " + (res.error || "Permission denied"));
        return { success: false, error: res.error };
      }

      showToast(`Student dossier for "${updated.fullName}" updated successfully.`);
      setIsEditModalOpen(false);
      await loadDossier();
      return { success: true };
    } catch (err) {
      const msg = err instanceof Error ? err.message : "Failed to update student";
      showToast("Error: " + msg);
      return { success: false, error: msg };
    }
  };

  // 1. Loading State
  if (isLoading) {
    return (
      <div className="space-y-6">
        <div className="flex items-center space-x-2 text-xs text-slate-400">
          <Link href="/modules/students" className="hover:text-slate-600 transition-colors">
            Student Register
          </Link>
          <span>/</span>
          <span className="text-slate-600 font-medium">Loading Dossier...</span>
        </div>
        <div className="bg-white rounded-2xl border border-slate-200 p-8 shadow-xs flex flex-col items-center justify-center min-h-[360px]">
          <div className="h-9 w-9 rounded-full border-3 border-[#1657D9] border-t-transparent animate-spin mb-4" />
          <p className="text-sm font-semibold text-slate-800">Retrieving 360° Student Dossier</p>
          <p className="text-xs text-slate-400 mt-1">Aggregating enrolments, attendance records, financial ledgers and examination results...</p>
        </div>
      </div>
    );
  }

  // 2. Access Denied / Authorization Error State
  if (errorCode === "FORBIDDEN") {
    return (
      <div className="space-y-6">
        <div className="flex items-center space-x-2 text-xs text-slate-400">
          <Link href="/modules/students" className="hover:text-slate-600 transition-colors">
            Student Register
          </Link>
          <span>/</span>
          <span className="text-slate-600 font-medium">Access Restricted</span>
        </div>
        <div className="flex min-h-[420px] flex-col items-center justify-center rounded-2xl border border-red-200 bg-red-50/40 p-8 text-center shadow-xs">
          <div className="flex h-12 w-12 items-center justify-center rounded-full bg-red-100 text-[#D92534] mb-4">
            <Icon name="shield-alert" className="h-6 w-6" />
          </div>
          <h2 className="text-lg font-bold text-slate-900">Institutional Access Restricted</h2>
          <p className="mt-2 max-w-md text-xs text-slate-600 leading-relaxed">
            {errorMessage ||
              "Your current institutional role does not have authorization to inspect this student record. Faculty members are restricted to assigned cohorts, and students may only inspect their personal dossier."}
          </p>
          <div className="mt-2 text-[11px] font-mono text-slate-400">
            Active Role: <span className="font-semibold text-slate-700">{userRole || "AUTHENTICATED_USER"}</span>
          </div>
          <div className="mt-6 flex items-center space-x-3">
            <Link
              href="/modules/students"
              className="inline-flex items-center space-x-2 rounded-xl bg-[#1657D9] px-4 py-2.5 text-xs font-semibold text-white shadow-xs hover:bg-[#1246ad] transition-colors"
            >
              <Icon name="arrow-left" className="h-3.5 w-3.5" />
              <span>Return to Student Directory</span>
            </Link>
          </div>
        </div>
      </div>
    );
  }

  // 3. Not Found State
  if (errorCode === "NOT_FOUND" || !dossier) {
    return (
      <div className="space-y-6">
        <div className="flex items-center space-x-2 text-xs text-slate-400">
          <Link href="/modules/students" className="hover:text-slate-600 transition-colors">
            Student Register
          </Link>
          <span>/</span>
          <span className="text-slate-600 font-medium">Student Not Found</span>
        </div>
        <div className="flex min-h-[400px] flex-col items-center justify-center rounded-2xl border border-slate-200 bg-white p-8 text-center shadow-xs">
          <div className="flex h-12 w-12 items-center justify-center rounded-full bg-amber-50 text-amber-600 mb-4 border border-amber-200">
            <Icon name="exclamation-triangle" className="h-6 w-6" />
          </div>
          <h2 className="text-lg font-bold text-slate-900">Student Record Not Found</h2>
          <p className="mt-2 max-w-md text-xs text-slate-600 leading-relaxed">
            No student record matching the identifier <code className="bg-slate-100 px-1.5 py-0.5 rounded text-slate-800 font-mono">{studentId}</code> was located in the institutional database.
          </p>
          <div className="mt-6">
            <Link
              href="/modules/students"
              className="inline-flex items-center space-x-2 rounded-xl bg-[#1657D9] px-4 py-2.5 text-xs font-semibold text-white shadow-xs hover:bg-[#1246ad] transition-colors"
            >
              <Icon name="arrow-left" className="h-3.5 w-3.5" />
              <span>Back to Student Directory</span>
            </Link>
          </div>
        </div>
      </div>
    );
  }

  const { student, activePlacement, enrolments, attendance, finance, examinations, documentsSummary } = dossier;

  const initials = student.fullName
    .split(" ")
    .filter(Boolean)
    .slice(0, 2)
    .map((n) => n[0].toUpperCase())
    .join("");

  return (
    <div className="space-y-6">
      {/* Toast Notification */}
      {toastMessage && (
        <div className="fixed top-20 right-6 z-50 bg-slate-900 text-white text-xs px-4 py-2.5 rounded-xl shadow-lg border border-slate-700 flex items-center space-x-2">
          <Icon name="check-circle" className="h-4 w-4 text-emerald-400" />
          <span>{toastMessage}</span>
        </div>
      )}

      {/* Breadcrumb Navigation */}
      <div className="flex items-center justify-between">
        <div className="flex items-center space-x-2 text-xs text-slate-500">
          <Link href="/modules/students" className="hover:text-[#1657D9] transition-colors font-medium">
            Student Register
          </Link>
          <span>/</span>
          <span className="font-mono text-slate-400">{student.prn}</span>
          <span>/</span>
          <span className="text-slate-900 font-bold truncate max-w-[200px] sm:max-w-none">
            {student.fullName}
          </span>
        </div>

        <Link
          href="/modules/students"
          className="inline-flex items-center space-x-1.5 text-xs font-semibold text-slate-600 hover:text-slate-900 px-3 py-1.5 rounded-lg border border-slate-200 hover:bg-slate-100 transition-colors"
        >
          <Icon name="arrow-left" className="h-3.5 w-3.5" />
          <span>Back to Directory</span>
        </Link>
      </div>

      {/* Main Student Header Card */}
      <div className="bg-white rounded-2xl border border-slate-200 p-6 shadow-xs">
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-6">
          {/* Avatar and Identity */}
          <div className="flex items-start sm:items-center space-x-4">
            <div className="h-16 w-16 sm:h-18 sm:w-18 rounded-2xl bg-[#1657D9] text-white flex items-center justify-center font-bold text-xl sm:text-2xl shadow-xs shrink-0 tracking-wider">
              {initials || "ST"}
            </div>
            <div>
              <div className="flex flex-wrap items-center gap-2">
                <h1 className="text-xl sm:text-2xl font-bold text-slate-900 tracking-tight">
                  {student.fullName}
                </h1>
                <span
                  className={`text-[10px] font-bold uppercase tracking-wider px-2 py-0.5 rounded-full border ${
                    student.status === "ACTIVE"
                      ? "bg-emerald-50 text-emerald-700 border-emerald-200"
                      : student.status === "ON_LEAVE"
                      ? "bg-amber-50 text-amber-700 border-amber-200"
                      : "bg-slate-100 text-slate-600 border-slate-200"
                  }`}
                >
                  {student.status}
                </span>
                {activePlacement?.hasAnomaly && (
                  <span className="inline-flex items-center space-x-1 text-[10px] font-bold px-2 py-0.5 rounded-full bg-rose-50 text-[#D92534] border border-rose-200">
                    <Icon name="exclamation-triangle" className="h-3 w-3" />
                    <span>Hierarchy Mismatch</span>
                  </span>
                )}
              </div>

              {/* Badges strip */}
              <div className="flex flex-wrap items-center gap-2 mt-2 text-xs">
                <span className="font-mono font-semibold px-2.5 py-0.5 rounded-md bg-blue-50 text-[#1657D9] border border-blue-200">
                  PRN: {student.prn}
                </span>
                {student.rollNumber && (
                  <span className="font-mono text-slate-600 px-2.5 py-0.5 rounded-md bg-slate-100 border border-slate-200">
                    Roll: {student.rollNumber}
                  </span>
                )}
                <span className="text-slate-400 hidden sm:inline">•</span>
                <span className="font-medium text-slate-700">
                  {activePlacement
                    ? `${activePlacement.programmeName} (${activePlacement.programmeCode})`
                    : "No Programme Enrolled"}
                </span>
                {activePlacement && (
                  <span className="text-slate-600 bg-slate-50 px-2 py-0.5 rounded border border-slate-200 font-medium">
                    Sem {activePlacement.semesterNumber} • {activePlacement.divisionName}
                  </span>
                )}
              </div>
            </div>
          </div>

          {/* Quick Header Actions */}
          <div className="flex items-center space-x-2 shrink-0 self-start md:self-center">
            {canWrite && (
              <>
                <button
                  type="button"
                  onClick={() => setIsEditModalOpen(true)}
                  className="inline-flex items-center space-x-1.5 rounded-xl bg-blue-600 text-white px-3.5 py-2 text-xs font-semibold shadow-xs hover:bg-blue-700 transition-colors cursor-pointer"
                >
                  <Icon name="arrow-path" className="h-3.5 w-3.5" />
                  <span>Progress Placement</span>
                </button>
                <button
                  type="button"
                  onClick={() => setIsEditModalOpen(true)}
                  className="inline-flex items-center space-x-1.5 rounded-xl bg-slate-900 text-white px-3.5 py-2 text-xs font-semibold shadow-xs hover:bg-slate-800 transition-colors cursor-pointer"
                >
                  <Icon name="pencil" className="h-3.5 w-3.5" />
                  <span>Edit Profile</span>
                </button>
              </>
            )}

            <button
              type="button"
              onClick={loadDossier}
              className="inline-flex items-center space-x-1.5 rounded-xl bg-slate-100 text-slate-700 px-3 py-2 text-xs font-semibold hover:bg-slate-200 transition-colors cursor-pointer"
              title="Refresh Dossier Records"
            >
              <Icon name="arrow-path" className="h-3.5 w-3.5" />
              <span className="hidden sm:inline">Refresh</span>
            </button>
          </div>
        </div>

        {/* Anomaly Notice Banner (if active placement is corrupted) */}
        {activePlacement?.hasAnomaly && (
          <div className="mt-4 p-3 rounded-xl bg-rose-50 border border-rose-200 text-xs text-rose-800 flex items-start space-x-2">
            <Icon name="exclamation-triangle" className="h-4 w-4 text-[#D92534] shrink-0 mt-0.5" />
            <div>
              <strong className="font-semibold text-rose-900">Enrolment Hierarchy Alert: </strong>
              <span>{activePlacement.anomalyDescription}</span>
              <p className="mt-0.5 text-[11px] text-rose-700">
                Action required: An administrator should update this student&apos;s active placement to a valid division belonging to the assigned semester.
              </p>
            </div>
          </div>
        )}
      </div>

      {/* 5-Tab Navigation Bar */}
      <div className="bg-white rounded-2xl border border-slate-200 shadow-xs px-2 sm:px-4">
        <div className="flex overflow-x-auto space-x-1 sm:space-x-2 py-2 border-b border-slate-100 no-scrollbar">
          <button
            type="button"
            onClick={() => setActiveTab("overview")}
            className={`flex items-center space-x-2 px-3 sm:px-4 py-2.5 rounded-xl text-xs font-semibold transition-all whitespace-nowrap cursor-pointer ${
              activeTab === "overview"
                ? "bg-[#1657D9] text-white shadow-xs"
                : "text-slate-600 hover:text-slate-900 hover:bg-slate-100"
            }`}
          >
            <Icon name="users" className="h-4 w-4" />
            <span>Overview</span>
          </button>

          <button
            type="button"
            onClick={() => setActiveTab("academics")}
            className={`flex items-center space-x-2 px-3 sm:px-4 py-2.5 rounded-xl text-xs font-semibold transition-all whitespace-nowrap cursor-pointer ${
              activeTab === "academics"
                ? "bg-[#1657D9] text-white shadow-xs"
                : "text-slate-600 hover:text-slate-900 hover:bg-slate-100"
            }`}
          >
            <Icon name="book-open" className="h-4 w-4" />
            <span>Academic History</span>
            <span
              className={`text-[10px] px-1.5 py-0.2 rounded-full font-bold ${
                activeTab === "academics" ? "bg-white/20 text-white" : "bg-slate-200 text-slate-700"
              }`}
            >
              {enrolments.length}
            </span>
          </button>

          <button
            type="button"
            onClick={() => setActiveTab("attendance")}
            className={`flex items-center space-x-2 px-3 sm:px-4 py-2.5 rounded-xl text-xs font-semibold transition-all whitespace-nowrap cursor-pointer ${
              activeTab === "attendance"
                ? "bg-[#1657D9] text-white shadow-xs"
                : "text-slate-600 hover:text-slate-900 hover:bg-slate-100"
            }`}
          >
            <Icon name="calendar" className="h-4 w-4" />
            <span>Attendance</span>
            {attendance.summary.ratePercentage !== null && (
              <span
                className={`text-[10px] px-1.5 py-0.2 rounded-full font-bold ${
                  activeTab === "attendance"
                    ? "bg-white/20 text-white"
                    : attendance.summary.isShortage
                    ? "bg-rose-100 text-[#D92534]"
                    : "bg-emerald-100 text-emerald-800"
                }`}
              >
                {attendance.summary.ratePercentage}%
              </span>
            )}
          </button>

          <button
            type="button"
            onClick={() => setActiveTab("fees")}
            className={`flex items-center space-x-2 px-3 sm:px-4 py-2.5 rounded-xl text-xs font-semibold transition-all whitespace-nowrap cursor-pointer ${
              activeTab === "fees"
                ? "bg-[#1657D9] text-white shadow-xs"
                : "text-slate-600 hover:text-slate-900 hover:bg-slate-100"
            }`}
          >
            <Icon name="currency-rupee" className="h-4 w-4" />
            <span>Fees & Ledger</span>
            {finance.summary.outstandingBalance > 0 && (
              <span
                className={`text-[10px] px-1.5 py-0.2 rounded-full font-bold ${
                  activeTab === "fees" ? "bg-white/20 text-white" : "bg-rose-100 text-[#D92534]"
                }`}
              >
                Due
              </span>
            )}
          </button>

          <button
            type="button"
            onClick={() => setActiveTab("examinations")}
            className={`flex items-center space-x-2 px-3 sm:px-4 py-2.5 rounded-xl text-xs font-semibold transition-all whitespace-nowrap cursor-pointer ${
              activeTab === "examinations"
                ? "bg-[#1657D9] text-white shadow-xs"
                : "text-slate-600 hover:text-slate-900 hover:bg-slate-100"
            }`}
          >
            <Icon name="academic-cap" className="h-4 w-4" />
            <span>Examinations</span>
            <span
              className={`text-[10px] px-1.5 py-0.2 rounded-full font-bold ${
                activeTab === "examinations" ? "bg-white/20 text-white" : "bg-slate-200 text-slate-700"
              }`}
            >
              {examinations.summaries.length}
            </span>
          </button>

          <button
            id="tab-documents"
            type="button"
            onClick={() => setActiveTab("documents")}
            className={`flex items-center space-x-2 px-3 sm:px-4 py-2.5 rounded-xl text-xs font-semibold transition-all whitespace-nowrap cursor-pointer ${
              activeTab === "documents"
                ? "bg-[#1657D9] text-white shadow-xs"
                : "text-slate-600 hover:text-slate-900 hover:bg-slate-100"
            }`}
          >
            <Icon name="folder" className="h-4 w-4" />
            <span>Documents & Verification</span>
            <span
              className={`text-[10px] px-1.5 py-0.2 rounded-full font-bold ${
                activeTab === "documents"
                  ? "bg-white/20 text-white"
                  : (documentsSummary?.pendingCount || 0) > 0
                  ? "bg-amber-100 text-amber-800"
                  : "bg-slate-200 text-slate-700"
              }`}
            >
              {documentsSummary?.totalCount ?? 0}
            </span>
          </button>
        </div>

        {/* Tab 1: Overview Workspace */}
        {activeTab === "overview" && (
          <div className="py-6 space-y-6">
            {/* Top KPI row */}
            <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
              <div className="p-4 rounded-xl bg-slate-50 border border-slate-100">
                <div className="text-[11px] font-bold uppercase tracking-wider text-slate-400">
                  Current Placement
                </div>
                <div className="mt-1 text-base font-bold text-slate-900 truncate">
                  {activePlacement ? activePlacement.programmeCode : "None"}
                </div>
                <div className="text-xs text-slate-500 mt-0.5">
                  {activePlacement ? `Sem ${activePlacement.semesterNumber} • ${activePlacement.divisionName}` : "Unenrolled"}
                </div>
              </div>

              <div className="p-4 rounded-xl bg-slate-50 border border-slate-100">
                <div className="text-[11px] font-bold uppercase tracking-wider text-slate-400">
                  Attendance Standing
                </div>
                <div className="mt-1 text-base font-bold text-slate-900">
                  {attendance.summary.ratePercentage !== null ? `${attendance.summary.ratePercentage}%` : "No sessions"}
                </div>
                <div className="text-xs text-slate-500 mt-0.5">
                  {attendance.summary.sessionsHeld > 0
                    ? `${attendance.summary.attendedCount} of ${attendance.summary.sessionsHeld} sessions attended`
                    : "No attendance logged"}
                </div>
              </div>

              <div className="p-4 rounded-xl bg-slate-50 border border-slate-100">
                <div className="text-[11px] font-bold uppercase tracking-wider text-slate-400">
                  Fee Ledger Status
                </div>
                <div className="mt-1 text-base font-bold text-slate-900">
                  {finance.summary.status === "CLEARED"
                    ? "Dues Cleared"
                    : finance.summary.status === "PARTIAL"
                    ? "Partially Paid"
                    : finance.summary.status === "PENDING"
                    ? "Payment Due"
                    : "Not Invoiced"}
                </div>
                <div className="text-xs text-slate-500 mt-0.5">
                  {finance.summary.outstandingBalance > 0
                    ? `₹${finance.summary.outstandingBalance.toLocaleString("en-IN")} balance remaining`
                    : "Zero outstanding dues"}
                </div>
              </div>

              <div className="p-4 rounded-xl bg-slate-50 border border-slate-100">
                <div className="text-[11px] font-bold uppercase tracking-wider text-slate-400">
                  Exam Session Status
                </div>
                <div className="mt-1 text-base font-bold text-slate-900">
                  {examinations.summaries.length > 0
                    ? examinations.summaries[0].resultStatus
                    : "No Exams"}
                </div>
                <div className="text-xs text-slate-500 mt-0.5">
                  {examinations.summaries.length > 0
                    ? `${examinations.summaries[0].examSessionName} (${examinations.summaries[0].approvalStatus})`
                    : "No registered marks"}
                </div>
              </div>
            </div>

            {/* Information Grid */}
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
              {/* Card 1: Personal Information */}
              <div className="rounded-xl border border-slate-200 p-5 space-y-4">
                <div className="flex items-center space-x-2 text-xs font-bold text-slate-900 uppercase tracking-wider pb-2 border-b border-slate-100">
                  <Icon name="users" className="h-4 w-4 text-[#1657D9]" />
                  <span>Personal Particulars</span>
                </div>
                <dl className="space-y-3 text-xs">
                  <div>
                    <dt className="text-slate-400 font-medium">Full Name</dt>
                    <dd className="font-semibold text-slate-800 mt-0.5">{student.fullName}</dd>
                  </div>
                  <div>
                    <dt className="text-slate-400 font-medium">Date of Birth</dt>
                    <dd className="font-semibold text-slate-800 mt-0.5">
                      {student.dob
                        ? new Date(student.dob).toLocaleDateString("en-IN", {
                            day: "2-digit",
                            month: "short",
                            year: "numeric",
                          })
                        : "Not specified"}
                    </dd>
                  </div>
                  <div>
                    <dt className="text-slate-400 font-medium">Gender</dt>
                    <dd className="font-semibold text-slate-800 mt-0.5 capitalize">
                      {student.gender ? student.gender.toLowerCase() : "Not specified"}
                    </dd>
                  </div>
                  <div>
                    <dt className="text-slate-400 font-medium">Blood Group</dt>
                    <dd className="font-semibold text-slate-800 mt-0.5">
                      {student.bloodGroup || "Not specified"}
                    </dd>
                  </div>
                  <div>
                    <dt className="text-slate-400 font-medium">Assigned Faculty Mentor</dt>
                    <dd className="font-semibold text-slate-800 mt-0.5">
                      {student.mentorFaculty || "Unassigned"}
                    </dd>
                  </div>
                </dl>
              </div>

              {/* Card 2: Contact Information */}
              <div className="rounded-xl border border-slate-200 p-5 space-y-4">
                <div className="flex items-center space-x-2 text-xs font-bold text-slate-900 uppercase tracking-wider pb-2 border-b border-slate-100">
                  <Icon name="envelope" className="h-4 w-4 text-[#1657D9]" />
                  <span>Contact & Identity</span>
                </div>
                <dl className="space-y-3 text-xs">
                  <div>
                    <dt className="text-slate-400 font-medium">Institutional Email</dt>
                    <dd className="font-semibold text-[#1657D9] mt-0.5 break-all">
                      <a href={`mailto:${student.email}`} className="hover:underline">
                        {student.email}
                      </a>
                    </dd>
                  </div>
                  <div>
                    <dt className="text-slate-400 font-medium">Primary Phone</dt>
                    <dd className="font-semibold text-slate-800 mt-0.5">
                      <a href={`tel:${student.phone}`} className="hover:underline font-mono">
                        {student.phone}
                      </a>
                    </dd>
                  </div>
                  <div>
                    <dt className="text-slate-400 font-medium">Permanent Registration Number (PRN)</dt>
                    <dd className="font-mono font-semibold text-slate-900 mt-0.5">{student.prn}</dd>
                  </div>
                  <div>
                    <dt className="text-slate-400 font-medium">Roll Number</dt>
                    <dd className="font-mono font-semibold text-slate-900 mt-0.5">
                      {student.rollNumber || "Not allocated"}
                    </dd>
                  </div>
                  <div>
                    <dt className="text-slate-400 font-medium">Institutional Admission Date</dt>
                    <dd className="font-semibold text-slate-800 mt-0.5">
                      {new Date(student.createdAt).toLocaleDateString("en-IN", {
                        day: "2-digit",
                        month: "short",
                        year: "numeric",
                      })}
                    </dd>
                  </div>
                </dl>
              </div>

              {/* Card 3: Guardian Details */}
              <div className="rounded-xl border border-slate-200 p-5 space-y-4">
                <div className="flex items-center space-x-2 text-xs font-bold text-slate-900 uppercase tracking-wider pb-2 border-b border-slate-100">
                  <Icon name="phone" className="h-4 w-4 text-[#1657D9]" />
                  <span>Guardian & Emergency Contacts</span>
                </div>
                {student.guardianName ? (
                  <dl className="space-y-3 text-xs">
                    <div>
                      <dt className="text-slate-400 font-medium">Guardian Name</dt>
                      <dd className="font-semibold text-slate-800 mt-0.5">{student.guardianName}</dd>
                    </div>
                    <div>
                      <dt className="text-slate-400 font-medium">Relationship</dt>
                      <dd className="font-semibold text-slate-800 mt-0.5">
                        {student.guardianRelationship || "Guardian"}
                      </dd>
                    </div>
                    <div>
                      <dt className="text-slate-400 font-medium">Emergency Contact Phone</dt>
                      <dd className="font-semibold text-slate-800 mt-0.5">
                        {student.guardianPhone ? (
                          <a href={`tel:${student.guardianPhone}`} className="hover:underline font-mono">
                            {student.guardianPhone}
                          </a>
                        ) : (
                          <span className="text-slate-400 italic">No phone logged</span>
                        )}
                      </dd>
                    </div>
                  </dl>
                ) : (
                  <div className="p-4 rounded-xl bg-slate-50 border border-dashed border-slate-200 text-center text-xs text-slate-500 space-y-1">
                    <p className="font-semibold text-slate-700">No Guardian Details Recorded</p>
                    <p className="text-[11px] text-slate-400">
                      Emergency guardian and parent contacts have not been entered in the student master database.
                    </p>
                  </div>
                )}
              </div>
            </div>
          </div>
        )}

        {/* Tab 2: Academic History Workspace */}
        {activeTab === "academics" && (
          <div className="py-6 space-y-6">
            <div className="flex items-center justify-between pb-3 border-b border-slate-100">
              <div>
                <h3 className="text-sm font-bold text-slate-900">Enrolment Progression & Term History</h3>
                <p className="text-xs text-slate-500 mt-0.5">
                  Chronological academic admissions, semester progression records, and division assignments.
                </p>
              </div>
              {canWrite && (
                <button
                  type="button"
                  onClick={() => setIsEditModalOpen(true)}
                  className="inline-flex items-center space-x-1.5 px-3 py-1.5 rounded-lg bg-blue-50 text-[#1657D9] text-xs font-semibold hover:bg-blue-100 transition-colors cursor-pointer border border-blue-200"
                >
                  <Icon name="arrow-path" className="h-3.5 w-3.5" />
                  <span>Progress Semester / Change Placement</span>
                </button>
              )}
            </div>

            {enrolments.length > 0 ? (
              <div className="overflow-x-auto rounded-xl border border-slate-200">
                <table className="w-full text-left text-xs">
                  <thead className="bg-slate-50 text-slate-500 font-semibold uppercase tracking-wider text-[10px] border-b border-slate-200">
                    <tr>
                      <th className="py-3 px-4">Academic Year</th>
                      <th className="py-3 px-4">Programme</th>
                      <th className="py-3 px-4">Semester</th>
                      <th className="py-3 px-4">Division</th>
                      <th className="py-3 px-4">Enrolment Status</th>
                      <th className="py-3 px-4">Enrolled Date</th>
                      <th className="py-3 px-4 text-right">Integrity Audit</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100 text-slate-700">
                    {enrolments.map((enr, idx) => (
                      <tr key={enr.id} className="hover:bg-slate-50/80 transition-colors">
                        <td className="py-3 px-4 font-mono font-semibold text-slate-900">
                          {enr.academicYear.code}
                          {enr.academicYear.isCurrent && (
                            <span className="ml-1.5 text-[9px] font-bold uppercase tracking-wider px-1.5 py-0.2 rounded bg-blue-100 text-[#1657D9]">
                              Current
                            </span>
                          )}
                        </td>
                        <td className="py-3 px-4">
                          <div className="font-semibold text-slate-900">{enr.programme.code}</div>
                          <div className="text-[11px] text-slate-400">{enr.programme.name}</div>
                        </td>
                        <td className="py-3 px-4 font-medium text-slate-800">
                          Semester {enr.semester.semesterNumber}
                        </td>
                        <td className="py-3 px-4 font-mono font-medium text-slate-700">
                          {enr.division.name}
                        </td>
                        <td className="py-3 px-4">
                          <span
                            className={`text-[10px] font-bold px-2 py-0.5 rounded-full border ${
                              enr.status === "ENROLLED"
                                ? "bg-emerald-50 text-emerald-700 border-emerald-200"
                                : enr.status === "COMPLETED"
                                ? "bg-blue-50 text-[#1657D9] border-blue-200"
                                : enr.status === "PROMOTED"
                                ? "bg-purple-50 text-purple-700 border-purple-200"
                                : "bg-slate-100 text-slate-700 border-slate-200"
                            }`}
                          >
                            {enr.status}
                          </span>
                        </td>
                        <td className="py-3 px-4 text-slate-500">
                          {new Date(enr.enrolledAt).toLocaleDateString("en-IN", {
                            day: "2-digit",
                            month: "short",
                            year: "numeric",
                          })}
                        </td>
                        <td className="py-3 px-4 text-right">
                          {enr.hasAnomaly ? (
                            <span
                              className="inline-flex items-center space-x-1 text-[10px] font-bold text-[#D92534] bg-rose-50 px-2 py-0.5 rounded border border-rose-200"
                              title={enr.anomalyDescription}
                            >
                              <Icon name="exclamation-triangle" className="h-3 w-3" />
                              <span>Anomaly</span>
                            </span>
                          ) : (
                            <span className="inline-flex items-center space-x-1 text-[10px] font-bold text-emerald-700 bg-emerald-50 px-2 py-0.5 rounded border border-emerald-200">
                              <Icon name="check-circle" className="h-3 w-3" />
                              <span>Valid</span>
                            </span>
                          )}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            ) : (
              <div className="p-8 rounded-xl bg-slate-50 border border-slate-200 text-center text-xs text-slate-500">
                <Icon name="book-open" className="h-8 w-8 text-slate-400 mx-auto mb-2" />
                <p className="font-semibold text-slate-800">No Enrolment Records Available</p>
                <p className="text-[11px] text-slate-400 mt-0.5">
                  This student has no registered semester or division enrolments in the database.
                </p>
              </div>
            )}
          </div>
        )}

        {/* Tab 3: Attendance Workspace */}
        {activeTab === "attendance" && (
          <div className="py-6 space-y-6">
            {/* Top Attendance KPI Cards */}
            <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-3">
              <div className="p-3.5 rounded-xl bg-slate-50 border border-slate-100 text-center">
                <div className="text-[10px] font-bold uppercase tracking-wider text-slate-400">Sessions Held</div>
                <div className="text-xl font-bold text-slate-900 mt-1">{attendance.summary.sessionsHeld}</div>
              </div>
              <div className="p-3.5 rounded-xl bg-slate-50 border border-slate-100 text-center">
                <div className="text-[10px] font-bold uppercase tracking-wider text-slate-400">Present</div>
                <div className="text-xl font-bold text-emerald-700 mt-1">{attendance.summary.presentCount}</div>
              </div>
              <div className="p-3.5 rounded-xl bg-slate-50 border border-slate-100 text-center">
                <div className="text-[10px] font-bold uppercase tracking-wider text-slate-400">Late</div>
                <div className="text-xl font-bold text-amber-600 mt-1">{attendance.summary.lateCount}</div>
              </div>
              <div className="p-3.5 rounded-xl bg-slate-50 border border-slate-100 text-center">
                <div className="text-[10px] font-bold uppercase tracking-wider text-slate-400">Absent</div>
                <div className="text-xl font-bold text-[#D92534] mt-1">{attendance.summary.absentCount}</div>
              </div>
              <div className="p-3.5 rounded-xl bg-slate-50 border border-slate-100 text-center">
                <div className="text-[10px] font-bold uppercase tracking-wider text-slate-400">Excused</div>
                <div className="text-xl font-bold text-purple-700 mt-1">{attendance.summary.excusedCount}</div>
              </div>
              <div className="p-3.5 rounded-xl bg-slate-50 border border-slate-100 text-center">
                <div className="text-[10px] font-bold uppercase tracking-wider text-slate-400">Attendance Rate</div>
                <div
                  className={`text-xl font-bold mt-1 ${
                    attendance.summary.ratePercentage === null
                      ? "text-slate-400"
                      : attendance.summary.isShortage
                      ? "text-[#D92534]"
                      : "text-emerald-700"
                  }`}
                >
                  {attendance.summary.ratePercentage !== null ? `${attendance.summary.ratePercentage}%` : "N/A"}
                </div>
              </div>
            </div>

            {/* Policy Note Alert */}
            <div className="p-3.5 rounded-xl bg-blue-50/60 border border-blue-200 text-xs text-blue-900 flex items-start space-x-2.5">
              <Icon name="check-circle" className="h-4 w-4 text-[#1657D9] shrink-0 mt-0.5" />
              <div>
                <strong className="font-semibold">Calculation Policy Note: </strong>
                <span>{attendance.summary.policyNote}</span>
              </div>
            </div>

            {/* Sessions Register */}
            {attendance.records.length > 0 ? (
              <div className="space-y-3">
                <h4 className="text-xs font-bold uppercase tracking-wider text-slate-500">
                  Logged Session Records ({attendance.records.length})
                </h4>
                <div className="overflow-x-auto rounded-xl border border-slate-200">
                  <table className="w-full text-left text-xs">
                    <thead className="bg-slate-50 text-slate-500 font-semibold uppercase tracking-wider text-[10px] border-b border-slate-200">
                      <tr>
                        <th className="py-3 px-4">Date</th>
                        <th className="py-3 px-4">Subject</th>
                        <th className="py-3 px-4">Session Type</th>
                        <th className="py-3 px-4">Topic Covered</th>
                        <th className="py-3 px-4">Faculty</th>
                        <th className="py-3 px-4 text-right">Status</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-100 text-slate-700">
                      {attendance.records.map((rec) => (
                        <tr key={rec.id} className="hover:bg-slate-50/80 transition-colors">
                          <td className="py-3 px-4 font-mono font-medium text-slate-800">
                            {new Date(rec.session.sessionDate).toLocaleDateString("en-IN", {
                              day: "2-digit",
                              month: "short",
                              year: "numeric",
                            })}
                          </td>
                          <td className="py-3 px-4">
                            <span className="font-mono font-bold text-xs text-[#1657D9]">
                              {rec.session.subject.code}
                            </span>
                            <span className="ml-2 font-medium text-slate-900">
                              {rec.session.subject.name}
                            </span>
                          </td>
                          <td className="py-3 px-4 capitalize font-medium text-slate-600">
                            {rec.session.sessionType.toLowerCase().replace("_", " ")}
                          </td>
                          <td className="py-3 px-4 text-slate-600 max-w-xs truncate">
                            {rec.session.topicCovered || "Standard Curriculum Session"}
                          </td>
                          <td className="py-3 px-4 text-slate-800 font-medium">
                            {rec.session.faculty.fullName}
                          </td>
                          <td className="py-3 px-4 text-right">
                            <span
                              className={`text-[10px] font-bold px-2.5 py-0.5 rounded-full border ${
                                rec.status === "PRESENT"
                                  ? "bg-emerald-50 text-emerald-700 border-emerald-200"
                                  : rec.status === "LATE"
                                  ? "bg-amber-50 text-amber-700 border-amber-200"
                                  : rec.status === "ABSENT"
                                  ? "bg-rose-50 text-[#D92534] border-rose-200"
                                  : "bg-purple-50 text-purple-700 border-purple-200"
                              }`}
                            >
                              {rec.status}
                            </span>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>
            ) : (
              <div className="p-8 rounded-xl bg-slate-50 border border-slate-200 text-center text-xs text-slate-500">
                <Icon name="calendar" className="h-8 w-8 text-slate-400 mx-auto mb-2" />
                <p className="font-semibold text-slate-800">No Attendance Sessions Logged</p>
                <p className="text-[11px] text-slate-400 mt-0.5">
                  No attendance session marks have been recorded for this student in the database yet.
                </p>
              </div>
            )}
          </div>
        )}

        {/* Tab 4: Fees & Ledger Workspace */}
        {activeTab === "fees" && (
          <div className="py-6 space-y-6">
            {/* Top Financial KPI Cards */}
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
              <div className="p-4 rounded-xl bg-slate-50 border border-slate-100">
                <div className="text-[11px] font-bold uppercase tracking-wider text-slate-400">Total Billed</div>
                <div className="text-xl font-bold text-slate-900 mt-1">
                  ₹{finance.summary.totalBilled.toLocaleString("en-IN")}
                </div>
                <div className="text-xs text-slate-500 mt-0.5">{finance.invoices.length} invoices generated</div>
              </div>

              <div className="p-4 rounded-xl bg-slate-50 border border-slate-100">
                <div className="text-[11px] font-bold uppercase tracking-wider text-slate-400">Total Paid</div>
                <div className="text-xl font-bold text-emerald-700 mt-1">
                  ₹{finance.summary.totalPaid.toLocaleString("en-IN")}
                </div>
                <div className="text-xs text-slate-500 mt-0.5">{finance.receipts.length} receipts logged</div>
              </div>

              <div className="p-4 rounded-xl bg-slate-50 border border-slate-100">
                <div className="text-[11px] font-bold uppercase tracking-wider text-slate-400">Outstanding Balance</div>
                <div
                  className={`text-xl font-bold mt-1 ${
                    finance.summary.outstandingBalance > 0 ? "text-[#D92534]" : "text-slate-900"
                  }`}
                >
                  ₹{finance.summary.outstandingBalance.toLocaleString("en-IN")}
                </div>
                <div className="text-xs text-slate-500 mt-0.5">
                  {finance.summary.outstandingBalance === 0 ? "All dues settled" : "Pending collection"}
                </div>
              </div>

              <div className="p-4 rounded-xl bg-slate-50 border border-slate-100">
                <div className="text-[11px] font-bold uppercase tracking-wider text-slate-400">Collection Rate</div>
                <div className="text-xl font-bold text-[#1657D9] mt-1">
                  {finance.summary.paymentEfficiency}%
                </div>
                <div className="text-xs text-slate-500 mt-0.5">
                  Status: <strong className="text-slate-800">{finance.summary.status}</strong>
                </div>
              </div>
            </div>

            {/* Quick Cashier Action Banner */}
            <div className="p-4 rounded-xl bg-slate-900 text-white flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 shadow-xs">
              <div>
                <h4 className="text-sm font-bold">Institutional Bursar & Cashier Desk</h4>
                <p className="text-xs text-slate-300 mt-0.5">
                  Record payments via UPI, NEFT/RTGS, or Cash with immediate bank voucher logging.
                </p>
              </div>
              <a
                href={`/modules/finance?studentId=${student.id}`}
                className="inline-flex items-center space-x-1.5 px-3.5 py-2 rounded-xl bg-[#1657D9] text-white text-xs font-semibold hover:bg-[#1246ad] transition-colors shrink-0"
              >
                <Icon name="credit-card" className="h-3.5 w-3.5" />
                <span>Open Cashier POS</span>
              </a>
            </div>

            {/* Invoices List */}
            <div className="space-y-3">
              <h4 className="text-xs font-bold uppercase tracking-wider text-slate-500">
                Fee Invoices ({finance.invoices.length})
              </h4>
              {finance.invoices.length > 0 ? (
                <div className="overflow-x-auto rounded-xl border border-slate-200">
                  <table className="w-full text-left text-xs">
                    <thead className="bg-slate-50 text-slate-500 font-semibold uppercase tracking-wider text-[10px] border-b border-slate-200">
                      <tr>
                        <th className="py-3 px-4">Invoice No</th>
                        <th className="py-3 px-4">Structure</th>
                        <th className="py-3 px-4">Billed Demand</th>
                        <th className="py-3 px-4">Due Date</th>
                        <th className="py-3 px-4">Status</th>
                        <th className="py-3 px-4 text-right">Invoiced On</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-100 text-slate-700">
                      {finance.invoices.map((inv) => (
                        <tr key={inv.id} className="hover:bg-slate-50/80 transition-colors">
                          <td className="py-3 px-4 font-mono font-bold text-xs text-[#1657D9]">
                            {inv.invoiceNumber}
                          </td>
                          <td className="py-3 px-4">
                            <div className="font-semibold text-slate-900">{inv.feeStructure.name}</div>
                            {inv.feeStructure.feeHeads.length > 0 && (
                              <div className="text-[11px] text-slate-400 mt-0.5">
                                {inv.feeStructure.feeHeads.map((h) => `${h.headName} (₹${h.amount.toLocaleString("en-IN")})`).join(", ")}
                              </div>
                            )}
                          </td>
                          <td className="py-3 px-4 font-mono font-semibold text-slate-900">
                            ₹{inv.totalDemand.toLocaleString("en-IN")}
                          </td>
                          <td className="py-3 px-4 text-slate-600">
                            {new Date(inv.dueDate).toLocaleDateString("en-IN", {
                              day: "2-digit",
                              month: "short",
                              year: "numeric",
                            })}
                          </td>
                          <td className="py-3 px-4">
                            <span
                              className={`text-[10px] font-bold px-2 py-0.5 rounded-full border ${
                                inv.status === "PAID"
                                  ? "bg-emerald-50 text-emerald-700 border-emerald-200"
                                  : inv.status === "PARTIALLY_PAID"
                                  ? "bg-amber-50 text-amber-700 border-amber-200"
                                  : "bg-rose-50 text-[#D92534] border-rose-200"
                              }`}
                            >
                              {inv.status}
                            </span>
                          </td>
                          <td className="py-3 px-4 text-right text-slate-500">
                            {new Date(inv.createdAt).toLocaleDateString("en-IN", {
                              day: "2-digit",
                              month: "short",
                              year: "numeric",
                            })}
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              ) : (
                <div className="p-6 rounded-xl bg-slate-50 border border-slate-200 text-center text-xs text-slate-500">
                  <p className="font-semibold text-slate-800">No Invoices Issued</p>
                  <p className="text-[11px] text-slate-400 mt-0.5">
                    No fee invoices have been generated for this student.
                  </p>
                </div>
              )}
            </div>

            {/* Payment Receipts List */}
            <div className="space-y-3">
              <h4 className="text-xs font-bold uppercase tracking-wider text-slate-500">
                Payment Receipts ({finance.receipts.length})
              </h4>
              {finance.receipts.length > 0 ? (
                <div className="overflow-x-auto rounded-xl border border-slate-200">
                  <table className="w-full text-left text-xs">
                    <thead className="bg-slate-50 text-slate-500 font-semibold uppercase tracking-wider text-[10px] border-b border-slate-200">
                      <tr>
                        <th className="py-3 px-4">Receipt No</th>
                        <th className="py-3 px-4">Invoice No</th>
                        <th className="py-3 px-4">Amount Paid</th>
                        <th className="py-3 px-4">Payment Method</th>
                        <th className="py-3 px-4">Transaction / UTR Reference</th>
                        <th className="py-3 px-4 text-right">Payment Date</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-100 text-slate-700">
                      {finance.receipts.map((rec) => (
                        <tr key={rec.id} className="hover:bg-slate-50/80 transition-colors">
                          <td className="py-3 px-4 font-mono font-bold text-xs text-emerald-700">
                            {rec.receiptNumber}
                          </td>
                          <td className="py-3 px-4 font-mono text-slate-600">
                            {rec.invoiceNumber}
                          </td>
                          <td className="py-3 px-4 font-mono font-bold text-slate-900">
                            ₹{rec.amountPaid.toLocaleString("en-IN")}
                          </td>
                          <td className="py-3 px-4 font-semibold text-slate-800">
                            <span className="px-2 py-0.5 rounded bg-slate-100 border border-slate-200 text-[10px] font-mono">
                              {rec.paymentMethod.replace("_", " / ")}
                            </span>
                          </td>
                          <td className="py-3 px-4 font-mono text-[11px] text-slate-600">
                            {rec.transactionReference}
                          </td>
                          <td className="py-3 px-4 text-right text-slate-500">
                            {new Date(rec.paymentDate).toLocaleDateString("en-IN", {
                              day: "2-digit",
                              month: "short",
                              year: "numeric",
                            })}
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              ) : (
                <div className="p-6 rounded-xl bg-slate-50 border border-slate-200 text-center text-xs text-slate-500">
                  <p className="font-semibold text-slate-800">No Payment Receipts</p>
                  <p className="text-[11px] text-slate-400 mt-0.5">
                    No receipts have been recorded in the cashier register for this student.
                  </p>
                </div>
              )}
            </div>
          </div>
        )}

        {/* Tab 5: Examinations Workspace */}
        {activeTab === "examinations" && (
          <div className="py-6 space-y-6">
            <div className="flex items-center justify-between pb-3 border-b border-slate-100">
              <div>
                <h3 className="text-sm font-bold text-slate-900">Examination Results & Performance</h3>
                <p className="text-xs text-slate-500 mt-0.5">
                  Provisional examination summaries, semester SGPA, letter grades, and assessment components.
                </p>
              </div>
            </div>

            {/* Academic Discipline Notice */}
            <div className="p-3.5 rounded-xl bg-slate-50 border border-slate-200 text-xs text-slate-600 flex items-start space-x-2.5">
              <Icon name="academic-cap" className="h-4 w-4 text-[#1657D9] shrink-0 mt-0.5" />
              <div>
                <strong className="font-semibold text-slate-800">Institutional Examination Policy: </strong>
                <span>
                  All results reflect authoritative entries in the institutional examinations repository (`ExamResultSummary`). Missing marks or grades are never inferred or artificially estimated.
                </span>
              </div>
            </div>

            {/* Summaries Register */}
            {examinations.summaries.length > 0 ? (
              <div className="space-y-6">
                {examinations.summaries.map((summary) => (
                  <div key={summary.id} className="rounded-xl border border-slate-200 p-5 space-y-4 bg-white shadow-2xs">
                    <div className="flex flex-col sm:flex-row sm:items-center justify-between pb-3 border-b border-slate-100 gap-2">
                      <div>
                        <div className="flex items-center space-x-2">
                          <h4 className="text-sm font-bold text-slate-900">{summary.examSessionName}</h4>
                          <span className="font-mono text-xs px-2 py-0.5 rounded bg-blue-50 text-[#1657D9] border border-blue-100">
                            {summary.sessionCode}
                          </span>
                        </div>
                        <p className="text-xs text-slate-400 mt-0.5">
                          Semester {summary.semesterNumber} • Session Type: {summary.sessionType}
                        </p>
                      </div>

                      <div className="flex items-center space-x-2">
                        <span
                          className={`text-xs font-bold px-2.5 py-1 rounded-full border ${
                            summary.resultStatus === "PASSED"
                              ? "bg-emerald-50 text-emerald-700 border-emerald-200"
                              : summary.resultStatus === "ATKT"
                              ? "bg-amber-50 text-amber-700 border-amber-200"
                              : "bg-rose-50 text-[#D92534] border-rose-200"
                          }`}
                        >
                          {summary.resultStatus}
                        </span>

                        <span
                          className={`text-[10px] font-bold px-2 py-0.5 rounded-full border ${
                            summary.approvalStatus === "PUBLISHED"
                              ? "bg-blue-50 text-[#1657D9] border-blue-200"
                              : "bg-slate-100 text-slate-600 border-slate-200"
                          }`}
                        >
                          {summary.approvalStatus === "DRAFT" ? "Draft Gazette" : summary.approvalStatus}
                        </span>
                      </div>
                    </div>

                    {/* Metric Cards Row */}
                    <div className="grid grid-cols-2 sm:grid-cols-5 gap-3 text-center">
                      <div className="p-3 rounded-lg bg-slate-50 border border-slate-100">
                        <div className="text-[10px] font-bold uppercase tracking-wider text-slate-400">Total Marks</div>
                        <div className="text-base font-bold text-slate-900 mt-0.5">
                          {summary.totalMarksObtained !== null ? summary.totalMarksObtained : "—"} / {summary.totalMaxMarks}
                        </div>
                      </div>

                      <div className="p-3 rounded-lg bg-slate-50 border border-slate-100">
                        <div className="text-[10px] font-bold uppercase tracking-wider text-slate-400">Percentage</div>
                        <div className="text-base font-bold text-slate-900 mt-0.5">
                          {summary.percentage !== null ? `${summary.percentage}%` : "—"}
                        </div>
                      </div>

                      <div className="p-3 rounded-lg bg-slate-50 border border-slate-100">
                        <div className="text-[10px] font-bold uppercase tracking-wider text-slate-400">SGPA</div>
                        <div className="text-base font-bold text-[#1657D9] mt-0.5 font-mono">
                          {summary.sgpa !== null ? summary.sgpa.toFixed(2) : "—"}
                        </div>
                      </div>

                      <div className="p-3 rounded-lg bg-slate-50 border border-slate-100">
                        <div className="text-[10px] font-bold uppercase tracking-wider text-slate-400">Letter Grade</div>
                        <div className="text-base font-bold text-slate-900 mt-0.5">
                          {summary.letterGrade || "—"}
                        </div>
                      </div>

                      <div className="p-3 rounded-lg bg-slate-50 border border-slate-100">
                        <div className="text-[10px] font-bold uppercase tracking-wider text-slate-400">Result Status</div>
                        <div className="text-base font-bold text-slate-900 mt-0.5">
                          {summary.resultStatus}
                        </div>
                      </div>
                    </div>

                    {/* Subject-Wise Results if present */}
                    {summary.subjectResults.length > 0 && (
                      <div className="mt-4">
                        <h5 className="text-[11px] font-bold uppercase tracking-wider text-slate-500 mb-2">
                          Course-Wise Evaluation Break-Up
                        </h5>
                        <div className="overflow-x-auto rounded-lg border border-slate-200">
                          <table className="w-full text-left text-xs">
                            <thead className="bg-slate-50 text-slate-500 font-semibold uppercase tracking-wider text-[10px] border-b border-slate-200">
                              <tr>
                                <th className="py-2.5 px-3">Subject</th>
                                <th className="py-2.5 px-3">Credits</th>
                                <th className="py-2.5 px-3">Max Marks</th>
                                <th className="py-2.5 px-3">Marks Obtained</th>
                                <th className="py-2.5 px-3">Grade Point</th>
                                <th className="py-2.5 px-3">Grade</th>
                                <th className="py-2.5 px-3 text-right">Result</th>
                              </tr>
                            </thead>
                            <tbody className="divide-y divide-slate-100 text-slate-700">
                              {summary.subjectResults.map((sr) => (
                                <tr key={sr.id} className="hover:bg-slate-50/80">
                                  <td className="py-2.5 px-3">
                                    <span className="font-mono font-bold text-slate-800">{sr.subjectCode}</span>
                                    <span className="ml-2 text-slate-600">{sr.subjectName}</span>
                                  </td>
                                  <td className="py-2.5 px-3 font-mono">{sr.credits}</td>
                                  <td className="py-2.5 px-3 font-mono">{sr.totalMaxMarks}</td>
                                  <td className="py-2.5 px-3 font-mono font-bold text-slate-900">
                                    {sr.totalMarksObtained !== null ? sr.totalMarksObtained : "—"}
                                  </td>
                                  <td className="py-2.5 px-3 font-mono">
                                    {sr.gradePoint !== null ? sr.gradePoint.toFixed(1) : "—"}
                                  </td>
                                  <td className="py-2.5 px-3 font-bold">{sr.letterGrade || "—"}</td>
                                  <td className="py-2.5 px-3 text-right">
                                    <span
                                      className={`text-[9px] font-bold px-2 py-0.5 rounded-full ${
                                        sr.status === "PASS"
                                          ? "bg-emerald-50 text-emerald-700"
                                          : "bg-rose-50 text-[#D92534]"
                                      }`}
                                    >
                                      {sr.status}
                                    </span>
                                  </td>
                                </tr>
                              ))}
                            </tbody>
                          </table>
                        </div>
                      </div>
                    )}
                  </div>
                ))}
              </div>
            ) : (
              <div className="p-8 rounded-xl bg-slate-50 border border-slate-200 text-center text-xs text-slate-500">
                <Icon name="academic-cap" className="h-8 w-8 text-slate-400 mx-auto mb-2" />
                <p className="font-semibold text-slate-800">No Examination Results Recorded</p>
                <p className="text-[11px] text-slate-400 mt-0.5">
                  No examination sessions or provisional result gazettes have been generated for this student yet.
                </p>
              </div>
            )}
          </div>
        )}

        {/* Tab 6: Documents & Verification */}
        {activeTab === "documents" && (
          <StudentDocumentsTab
            studentId={student.id}
            studentName={student.fullName}
            userRole={userRole}
            canWrite={canWrite}
            onRefreshParent={loadDossier}
          />
        )}
      </div>

      {/* Edit Student Modal */}
      {isEditModalOpen && formStudentRecord && (
        <StudentFormModal
          isOpen={isEditModalOpen}
          mode="edit"
          initialData={formStudentRecord}
          programmes={programmes}
          onClose={() => setIsEditModalOpen(false)}
          onSave={handleSaveStudent}
        />
      )}
    </div>
  );
};
