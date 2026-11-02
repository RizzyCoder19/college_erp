"use client";

import React, { useState, useEffect, useTransition } from "react";
import { useSearchParams, useRouter } from "next/navigation";
import { Icon } from "@/components/common/Icon";
import { StudentDocumentsTab } from "@/components/modules/students/StudentDocumentsTab";
import {
  StudentSelfProfileData,
  StudentSelfCurriculumData,
  StudentSelfTimetableData,
  StudentSelfAttendanceData,
  StudentSelfExamResultsData,
  StudentSelfFeeLedgerData,
  getStudentSelfCurriculum,
  getStudentSelfTimetable,
  getStudentSelfAttendance,
  getStudentSelfExamResults,
  getStudentSelfFeeLedger,
  getStudentSelfReceipt,
} from "@/lib/actions/portalStudent";

interface StudentPortalViewProps {
  initialProfile: StudentSelfProfileData;
}

type TabType =
  | "overview"
  | "academics"
  | "timetable"
  | "attendance"
  | "examinations"
  | "fees"
  | "documents";

interface ReceiptModalData {
  id: string;
  receiptNumber: string;
  amountPaid: number;
  paymentDate: Date;
  paymentMethod: string;
  transactionReference: string;
  payerName: string | null;
  remarks: string | null;
  collectedByName: string;
  invoice: {
    invoiceNumber: string;
    totalDemand: number;
    feeStructureName: string;
  };
  student: {
    fullName: string;
    rollNumber: string;
    prn: string;
  };
}

export const StudentPortalView: React.FC<StudentPortalViewProps> = ({ initialProfile }) => {
  const router = useRouter();
  const searchParams = useSearchParams();
  const initialTab = (searchParams.get("tab") as TabType) || "overview";

  const [activeTab, setActiveTab] = useState<TabType>(initialTab);
  const [profile] = useState<StudentSelfProfileData>(initialProfile);
  const [curriculum, setCurriculum] = useState<StudentSelfCurriculumData | null>(null);
  const [isLoadingCurriculum, setIsLoadingCurriculum] = useState<boolean>(false);

  const [timetable, setTimetable] = useState<StudentSelfTimetableData | null>(null);
  const [isLoadingTimetable, setIsLoadingTimetable] = useState<boolean>(false);
  const [timetableError, setTimetableError] = useState<string | null>(null);

  const [attendance, setAttendance] = useState<StudentSelfAttendanceData | null>(null);
  const [isLoadingAttendance, setIsLoadingAttendance] = useState<boolean>(false);
  const [attendanceError, setAttendanceError] = useState<string | null>(null);

  const [examResults, setExamResults] = useState<StudentSelfExamResultsData | null>(null);
  const [isLoadingExamResults, setIsLoadingExamResults] = useState<boolean>(false);
  const [examResultsError, setExamResultsError] = useState<string | null>(null);

  const [feeLedger, setFeeLedger] = useState<StudentSelfFeeLedgerData | null>(null);
  const [isLoadingFeeLedger, setIsLoadingFeeLedger] = useState<boolean>(false);
  const [feeLedgerError, setFeeLedgerError] = useState<string | null>(null);

  const [selectedReceipt, setSelectedReceipt] = useState<ReceiptModalData | null>(null);
  const [isLoadingReceipt, setIsLoadingReceipt] = useState<boolean>(false);
  const [receiptError, setReceiptError] = useState<string | null>(null);

  const [, startTransition] = useTransition();

  // Sync tab state with URL parameter for shareability and deep-linking
  const handleTabChange = (tab: TabType) => {
    setActiveTab(tab);
    startTransition(() => {
      const url = new URL(window.location.href);
      url.searchParams.set("tab", tab);
      router.replace(url.pathname + url.search, { scroll: false });
    });

    if (tab === "academics" && !curriculum && !isLoadingCurriculum) {
      setIsLoadingCurriculum(true);
      getStudentSelfCurriculum()
        .then((res) => {
          if (res.success && res.data) {
            setCurriculum(res.data);
          }
        })
        .finally(() => {
          setIsLoadingCurriculum(false);
        });
    }

    if (tab === "timetable" && !timetable && !isLoadingTimetable) {
      setIsLoadingTimetable(true);
      setTimetableError(null);
      getStudentSelfTimetable()
        .then((res) => {
          if (res.success && res.data) {
            setTimetable(res.data);
          } else {
            setTimetableError(res.error || "Failed to load timetable.");
          }
        })
        .finally(() => {
          setIsLoadingTimetable(false);
        });
    }

    if (tab === "attendance" && !attendance && !isLoadingAttendance) {
      setIsLoadingAttendance(true);
      setAttendanceError(null);
      getStudentSelfAttendance()
        .then((res) => {
          if (res.success && res.data) {
            setAttendance(res.data);
          } else {
            setAttendanceError(res.error || "Failed to load attendance records.");
          }
        })
        .finally(() => {
          setIsLoadingAttendance(false);
        });
    }

    if (tab === "examinations" && !examResults && !isLoadingExamResults) {
      setIsLoadingExamResults(true);
      setExamResultsError(null);
      getStudentSelfExamResults()
        .then((res) => {
          if (res.success && res.data) {
            setExamResults(res.data);
          } else {
            setExamResultsError(res.error || "Failed to load examination results.");
          }
        })
        .finally(() => {
          setIsLoadingExamResults(false);
        });
    }

    if (tab === "fees" && !feeLedger && !isLoadingFeeLedger) {
      setIsLoadingFeeLedger(true);
      setFeeLedgerError(null);
      getStudentSelfFeeLedger()
        .then((res) => {
          if (res.success && res.data) {
            setFeeLedger(res.data);
          } else {
            setFeeLedgerError(res.error || "Failed to load fee ledger.");
          }
        })
        .finally(() => {
          setIsLoadingFeeLedger(false);
        });
    }
  };

  // If initial tab is deep-linked, load corresponding data on mount
  useEffect(() => {
    let active = true;
    if (initialTab === "academics" && !curriculum) {
      getStudentSelfCurriculum().then((res) => {
        if (active && res.success && res.data) {
          setCurriculum(res.data);
        }
      });
    }
    if (initialTab === "timetable" && !timetable) {
      setIsLoadingTimetable(true);
      getStudentSelfTimetable().then((res) => {
        if (active) {
          if (res.success && res.data) {
            setTimetable(res.data);
          } else {
            setTimetableError(res.error || "Failed to load timetable.");
          }
          setIsLoadingTimetable(false);
        }
      });
    }
    if (initialTab === "attendance" && !attendance) {
      setIsLoadingAttendance(true);
      getStudentSelfAttendance().then((res) => {
        if (active) {
          if (res.success && res.data) {
            setAttendance(res.data);
          } else {
            setAttendanceError(res.error || "Failed to load attendance records.");
          }
          setIsLoadingAttendance(false);
        }
      });
    }
    if (initialTab === "examinations" && !examResults) {
      setIsLoadingExamResults(true);
      getStudentSelfExamResults().then((res) => {
        if (active) {
          if (res.success && res.data) {
            setExamResults(res.data);
          } else {
            setExamResultsError(res.error || "Failed to load examination results.");
          }
          setIsLoadingExamResults(false);
        }
      });
    }
    if (initialTab === "fees" && !feeLedger) {
      setIsLoadingFeeLedger(true);
      getStudentSelfFeeLedger().then((res) => {
        if (active) {
          if (res.success && res.data) {
            setFeeLedger(res.data);
          } else {
            setFeeLedgerError(res.error || "Failed to load fee ledger.");
          }
          setIsLoadingFeeLedger(false);
        }
      });
    }
    return () => {
      active = false;
    };
  }, [initialTab, curriculum, timetable, attendance, examResults, feeLedger]);

  const handleViewReceipt = async (receiptId: string) => {
    setIsLoadingReceipt(true);
    setReceiptError(null);
    try {
      const res = await getStudentSelfReceipt(receiptId);
      if (res.success && res.data) {
        setSelectedReceipt(res.data);
      } else {
        setReceiptError(res.error || "Failed to load receipt voucher.");
      }
    } catch {
      setReceiptError("An unexpected error occurred while loading receipt voucher.");
    } finally {
      setIsLoadingReceipt(false);
    }
  };

  const { student, activePlacement, documentsSummary } = profile;

  // Generate initials avatar
  const initials = student.fullName
    .split(" ")
    .filter(Boolean)
    .slice(0, 2)
    .map((n) => n[0].toUpperCase())
    .join("");

  return (
    <div className="space-y-6">
      {/* 1. Institutional Student Identity Header Card */}
      <div className="relative overflow-hidden rounded-2xl bg-[#071322] border border-[#16243E] text-white p-6 shadow-xl">
        <div className="relative z-10 flex flex-col md:flex-row md:items-center justify-between gap-6">
          <div className="flex items-start sm:items-center space-x-4">
            {/* Initials Avatar (No photo stored in database model) */}
            <div
              className="h-16 w-16 sm:h-20 sm:w-20 rounded-2xl bg-gradient-to-br from-[#1657D9] to-[#0B1528] border-2 border-blue-400/30 flex items-center justify-center font-bold text-xl sm:text-2xl text-white shadow-lg shrink-0 tracking-wider"
              aria-label={`Initials: ${initials}`}
            >
              {initials}
            </div>

            <div className="space-y-1">
              <div className="flex flex-wrap items-center gap-2">
                <h1 className="text-xl sm:text-2xl font-bold tracking-tight text-white">
                  {student.fullName}
                </h1>
                <span
                  className={`text-[11px] font-semibold px-2.5 py-0.5 rounded-full border ${
                    student.status === "ACTIVE"
                      ? "bg-emerald-500/20 text-emerald-300 border-emerald-400/30"
                      : "bg-slate-500/20 text-slate-300 border-slate-400/30"
                  }`}
                >
                  {student.status}
                </span>
              </div>

              <div className="flex flex-wrap items-center gap-x-4 gap-y-1 text-xs text-slate-300">
                <span className="flex items-center space-x-1">
                  <span className="text-slate-400">PRN:</span>
                  <strong className="font-mono text-white">{student.prn}</strong>
                </span>
                <span className="text-slate-500">•</span>
                <span className="flex items-center space-x-1">
                  <span className="text-slate-400">Roll No:</span>
                  <strong className="font-mono text-white">{student.rollNumber}</strong>
                </span>
              </div>

              {activePlacement && (
                <p className="text-xs text-blue-300/90 font-medium">
                  {activePlacement.programmeName} • Semester {activePlacement.semesterNumber} (
                  {activePlacement.divisionName})
                </p>
              )}
            </div>
          </div>

          {/* Quick Stats Summary Strip */}
          <div className="flex flex-wrap items-center gap-3 pt-2 md:pt-0 border-t md:border-t-0 border-[#16243E]">
            <div className="bg-[#0B1528] rounded-xl px-4 py-2.5 border border-[#16243E] min-w-[120px]">
              <span className="text-[10px] font-semibold uppercase tracking-wider text-slate-400">
                Placement
              </span>
              <p className="text-sm font-bold text-white mt-0.5">
                {activePlacement ? activePlacement.divisionName : "Unassigned"}
              </p>
            </div>

            <div className="bg-[#0B1528] rounded-xl px-4 py-2.5 border border-[#16243E] min-w-[140px]">
              <span className="text-[10px] font-semibold uppercase tracking-wider text-slate-400">
                Compliance Docs
              </span>
              <p className="text-sm font-bold text-emerald-400 mt-0.5 flex items-center space-x-1">
                <span>{documentsSummary.verifiedCount} Verified</span>
                <span className="text-xs text-slate-400 font-normal">
                  ({documentsSummary.totalCount} submitted)
                </span>
              </p>
            </div>

            <div className="bg-[#0B1528] rounded-xl px-4 py-2.5 border border-[#16243E] min-w-[130px]">
              <span className="text-[10px] font-semibold uppercase tracking-wider text-slate-400">
                Faculty Mentor
              </span>
              <p className="text-sm font-bold text-slate-200 mt-0.5 truncate max-w-[150px]">
                {student.mentorFaculty || "Unassigned"}
              </p>
            </div>
          </div>
        </div>
      </div>

      {/* 2. Workspace Navigation Segmented Tabs */}
      <div className="border-b border-comfort bg-card-comfort rounded-t-xl px-4 sm:px-6 shadow-2xs">
        <nav className="flex space-x-2 sm:space-x-8 overflow-x-auto py-2" aria-label="Student Portal Tabs">
          <button
            type="button"
            id="tab-btn-overview"
            onClick={() => handleTabChange("overview")}
            className={`py-3 px-3 sm:px-1 inline-flex items-center space-x-2 border-b-2 text-sm font-medium transition-all cursor-pointer whitespace-nowrap ${
              activeTab === "overview"
                ? "border-[#1657D9] text-[#1657D9] font-semibold"
                : "border-transparent text-slate-500 hover:text-slate-700 hover:border-slate-300"
            }`}
          >
            <Icon
              name="user"
              className={`h-4 w-4 ${activeTab === "overview" ? "text-[#1657D9]" : "text-slate-400"}`}
            />
            <span>Profile & Overview</span>
          </button>

          <button
            type="button"
            id="tab-btn-academics"
            onClick={() => handleTabChange("academics")}
            className={`py-3 px-3 sm:px-1 inline-flex items-center space-x-2 border-b-2 text-sm font-medium transition-all cursor-pointer whitespace-nowrap ${
              activeTab === "academics"
                ? "border-[#1657D9] text-[#1657D9] font-semibold"
                : "border-transparent text-slate-500 hover:text-slate-700 hover:border-slate-300"
            }`}
          >
            <Icon
              name="academic-cap"
              className={`h-4 w-4 ${activeTab === "academics" ? "text-[#1657D9]" : "text-slate-400"}`}
            />
            <span>Academics & Curriculum</span>
          </button>

          <button
            type="button"
            id="tab-btn-timetable"
            onClick={() => handleTabChange("timetable")}
            className={`py-3 px-3 sm:px-1 inline-flex items-center space-x-2 border-b-2 text-sm font-medium transition-all cursor-pointer whitespace-nowrap ${
              activeTab === "timetable"
                ? "border-[#1657D9] text-[#1657D9] font-semibold"
                : "border-transparent text-slate-500 hover:text-slate-700 hover:border-slate-300"
            }`}
          >
            <Icon
              name="calendar"
              className={`h-4 w-4 ${activeTab === "timetable" ? "text-[#1657D9]" : "text-slate-400"}`}
            />
            <span>Class Schedule</span>
          </button>

          <button
            type="button"
            id="tab-btn-attendance"
            onClick={() => handleTabChange("attendance")}
            className={`py-3 px-3 sm:px-1 inline-flex items-center space-x-2 border-b-2 text-sm font-medium transition-all cursor-pointer whitespace-nowrap ${
              activeTab === "attendance"
                ? "border-[#1657D9] text-[#1657D9] font-semibold"
                : "border-transparent text-slate-500 hover:text-slate-700 hover:border-slate-300"
            }`}
          >
            <Icon
              name="clipboard-check"
              className={`h-4 w-4 ${activeTab === "attendance" ? "text-[#1657D9]" : "text-slate-400"}`}
            />
            <span>Attendance</span>
          </button>

          <button
            type="button"
            id="tab-btn-examinations"
            onClick={() => handleTabChange("examinations")}
            className={`py-3 px-3 sm:px-1 inline-flex items-center space-x-2 border-b-2 text-sm font-medium transition-all cursor-pointer whitespace-nowrap ${
              activeTab === "examinations"
                ? "border-[#1657D9] text-[#1657D9] font-semibold"
                : "border-transparent text-slate-500 hover:text-slate-700 hover:border-slate-300"
            }`}
          >
            <Icon
              name="award"
              className={`h-4 w-4 ${activeTab === "examinations" ? "text-[#1657D9]" : "text-slate-400"}`}
            />
            <span>Examinations</span>
          </button>

          <button
            type="button"
            id="tab-btn-fees"
            onClick={() => handleTabChange("fees")}
            className={`py-3 px-3 sm:px-1 inline-flex items-center space-x-2 border-b-2 text-sm font-medium transition-all cursor-pointer whitespace-nowrap ${
              activeTab === "fees"
                ? "border-[#1657D9] text-[#1657D9] font-semibold"
                : "border-transparent text-slate-500 hover:text-slate-700 hover:border-slate-300"
            }`}
          >
            <Icon
              name="currency-rupee"
              className={`h-4 w-4 ${activeTab === "fees" ? "text-[#1657D9]" : "text-slate-400"}`}
            />
            <span>Fee Ledger</span>
          </button>

          <button
            type="button"
            id="tab-btn-documents"
            onClick={() => handleTabChange("documents")}
            className={`py-3 px-3 sm:px-1 inline-flex items-center space-x-2 border-b-2 text-sm font-medium transition-all cursor-pointer whitespace-nowrap ${
              activeTab === "documents"
                ? "border-[#1657D9] text-[#1657D9] font-semibold"
                : "border-transparent text-slate-500 hover:text-slate-700 hover:border-slate-300"
            }`}
          >
            <Icon
              name="document-duplicate"
              className={`h-4 w-4 ${activeTab === "documents" ? "text-[#1657D9]" : "text-slate-400"}`}
            />
            <span>Compliance Documents</span>
            {documentsSummary.totalCount > 0 && (
              <span className="ml-1.5 py-0.5 px-2 rounded-full text-[10px] font-semibold bg-blue-100 text-[#1657D9]">
                {documentsSummary.totalCount}
              </span>
            )}
          </button>
        </nav>
      </div>

      {/* 3. Tab Contents */}
      <div className="min-h-[420px]">
        {/* TAB 1: Profile & Overview */}
        {activeTab === "overview" && (
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 animate-fade-in">
            {/* Left 2 Cols: Personal & Institutional Details */}
            <div className="lg:col-span-2 space-y-6">
              <div className="bg-card-comfort rounded-xl border border-comfort p-6 shadow-2xs">
                <h2 className="text-base font-bold text-slate-900 mb-4 flex items-center space-x-2">
                  <Icon name="user-circle" className="h-5 w-5 text-[#1657D9]" />
                  <span>Personal Information</span>
                </h2>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 text-sm">
                  <div className="p-3 bg-slate-50 rounded-lg">
                    <span className="text-xs text-slate-500">Official Full Name</span>
                    <p className="font-semibold text-slate-900 mt-0.5">{student.fullName}</p>
                  </div>

                  <div className="p-3 bg-slate-50 rounded-lg">
                    <span className="text-xs text-slate-500">Institutional Email</span>
                    <p className="font-semibold text-slate-900 mt-0.5 break-all">{student.email}</p>
                  </div>

                  <div className="p-3 bg-slate-50 rounded-lg">
                    <span className="text-xs text-slate-500">Contact Number</span>
                    <p className="font-semibold text-slate-900 mt-0.5">{student.phone}</p>
                  </div>

                  <div className="p-3 bg-slate-50 rounded-lg">
                    <span className="text-xs text-slate-500">Date of Birth</span>
                    <p className="font-semibold text-slate-900 mt-0.5">
                      {new Date(student.dob).toLocaleDateString("en-IN", {
                        day: "numeric",
                        month: "long",
                        year: "numeric",
                      })}
                    </p>
                  </div>

                  <div className="p-3 bg-slate-50 rounded-lg">
                    <span className="text-xs text-slate-500">Gender</span>
                    <p className="font-semibold text-slate-900 mt-0.5">{student.gender || "Not specified"}</p>
                  </div>

                  <div className="p-3 bg-slate-50 rounded-lg">
                    <span className="text-xs text-slate-500">Blood Group</span>
                    <p className="font-semibold text-slate-900 mt-0.5">{student.bloodGroup || "Not specified"}</p>
                  </div>
                </div>

                <div className="mt-4 p-3 bg-blue-50/60 border border-blue-200/60 rounded-lg text-xs text-blue-900 flex items-start space-x-2.5">
                  <Icon name="information-circle" className="h-4 w-4 text-[#1657D9] shrink-0 mt-0.5" />
                  <p>
                    <strong>Institutional Record Policy:</strong> To maintain verified audit integrity,
                    modifications to legal name, PRN, or date of birth require formal verification. Please submit
                    a correction request directly to the Registrar Office.
                  </p>
                </div>
              </div>

              {/* Current Academic Placement */}
              <div className="bg-card-comfort rounded-xl border border-comfort p-6 shadow-2xs">
                <h2 className="text-base font-bold text-slate-900 mb-4 flex items-center space-x-2">
                  <Icon name="building-office-2" className="h-5 w-5 text-[#1657D9]" />
                  <span>Current Academic Placement</span>
                </h2>

                {activePlacement ? (
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 text-sm">
                    <div className="p-3 bg-slate-50 rounded-lg">
                      <span className="text-xs text-slate-500">Programme</span>
                      <p className="font-semibold text-slate-900 mt-0.5">
                        {activePlacement.programmeName} ({activePlacement.programmeCode})
                      </p>
                    </div>

                    <div className="p-3 bg-slate-50 rounded-lg">
                      <span className="text-xs text-slate-500">Current Semester</span>
                      <p className="font-semibold text-slate-900 mt-0.5">
                        Semester {activePlacement.semesterNumber}
                      </p>
                    </div>

                    <div className="p-3 bg-slate-50 rounded-lg">
                      <span className="text-xs text-slate-500">Assigned Division</span>
                      <p className="font-semibold text-slate-900 mt-0.5">
                        {activePlacement.divisionName}
                      </p>
                    </div>

                    <div className="p-3 bg-slate-50 rounded-lg">
                      <span className="text-xs text-slate-500">Academic Term & Year</span>
                      <p className="font-semibold text-slate-900 mt-0.5">
                        {activePlacement.academicYearName} ({activePlacement.academicYearCode})
                      </p>
                    </div>
                  </div>
                ) : (
                  <div className="p-6 text-center border-2 border-dashed border-slate-200 rounded-xl">
                    <Icon name="academic-cap" className="h-8 w-8 text-slate-400 mx-auto mb-2" />
                    <p className="text-sm font-semibold text-slate-700">No Active Placement Found</p>
                    <p className="text-xs text-slate-500 mt-1">
                      You are not currently placed in an active semester division. Please consult Academic Administration.
                    </p>
                  </div>
                )}
              </div>
            </div>

            {/* Right Col: Mentor & Guardian Information */}
            <div className="space-y-6">
              <div className="bg-card-comfort rounded-xl border border-comfort p-6 shadow-2xs">
                <h2 className="text-base font-bold text-slate-900 mb-4 flex items-center space-x-2">
                  <Icon name="academic-cap" className="h-5 w-5 text-[#1657D9]" />
                  <span>Faculty Mentorship</span>
                </h2>

                <div className="p-4 rounded-xl bg-slate-50 border border-slate-100 space-y-2">
                  <span className="text-xs font-semibold uppercase tracking-wider text-slate-500">
                    Assigned Mentor
                  </span>
                  <p className="text-base font-bold text-slate-900">
                    {student.mentorFaculty || "Unassigned"}
                  </p>
                  <p className="text-xs text-slate-500">
                    {student.mentorFaculty
                      ? "Your assigned academic counselor for institutional advising and course progression."
                      : "A mentor faculty member has not yet been assigned to your cohort."}
                  </p>
                </div>
              </div>

              <div className="bg-card-comfort rounded-xl border border-comfort p-6 shadow-2xs">
                <h2 className="text-base font-bold text-slate-900 mb-4 flex items-center space-x-2">
                  <Icon name="shield-check" className="h-5 w-5 text-[#1657D9]" />
                  <span>Emergency & Guardian</span>
                </h2>

                <div className="space-y-3 text-sm">
                  <div className="p-3 bg-slate-50 rounded-lg">
                    <span className="text-xs text-slate-500">Guardian Name</span>
                    <p className="font-semibold text-slate-900 mt-0.5">
                      {/* Guardian name or not provided */}
                      {"Guardian record on file"}
                    </p>
                  </div>

                  <div className="p-3 bg-slate-50 rounded-lg">
                    <span className="text-xs text-slate-500">Registered Student ID</span>
                    <p className="font-mono text-xs text-slate-700 mt-0.5">{student.id}</p>
                  </div>
                </div>
              </div>
            </div>
          </div>
        )}

        {/* TAB 2: Academics & Curriculum */}
        {activeTab === "academics" && (
          <div className="space-y-6 animate-fade-in">
            {/* Active Semester Curriculum Table */}
            <div className="bg-card-comfort rounded-xl border border-comfort p-6 shadow-2xs">
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 mb-4">
                <div>
                  <h2 className="text-base font-bold text-slate-900 flex items-center space-x-2">
                    <Icon name="book-open" className="h-5 w-5 text-[#1657D9]" />
                    <span>Current Semester Curriculum</span>
                  </h2>
                  <p className="text-xs text-slate-500 mt-0.5">
                    Prescribed institutional subjects and credit weightings for your active semester.
                  </p>
                </div>

                {activePlacement && (
                  <span className="text-xs font-semibold px-3 py-1 rounded-full bg-blue-50 text-[#1657D9] border border-blue-200">
                    Semester {activePlacement.semesterNumber} • {activePlacement.programmeCode}
                  </span>
                )}
              </div>

              {isLoadingCurriculum ? (
                <div className="py-12 text-center text-slate-500 text-sm">
                  <span className="inline-block h-6 w-6 border-2 border-[#1657D9] border-t-transparent rounded-full animate-spin mb-2"></span>
                  <p>Loading prescribed curriculum subjects...</p>
                </div>
              ) : curriculum?.activeSubjects && curriculum.activeSubjects.length > 0 ? (
                <div className="overflow-x-auto rounded-lg border border-slate-200">
                  <table className="w-full text-left text-sm text-slate-700">
                    <thead className="bg-card-surface border-b border-comfort text-xs font-semibold uppercase tracking-wider text-slate-500">
                      <tr>
                        <th className="py-3 px-4">Subject Code</th>
                        <th className="py-3 px-4">Subject Title</th>
                        <th className="py-3 px-4">Type</th>
                        <th className="py-3 px-4 text-center">Credits</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-100 font-medium">
                      {curriculum.activeSubjects.map((sub) => (
                        <tr key={sub.id} className="hover:bg-slate-50/60 transition-colors">
                          <td className="py-3 px-4 font-mono font-semibold text-[#1657D9]">
                            {sub.code}
                          </td>
                          <td className="py-3 px-4 font-semibold text-slate-900">
                            {sub.title}
                          </td>
                          <td className="py-3 px-4">
                            <span
                              className={`text-[11px] font-semibold px-2 py-0.5 rounded-full border ${
                                sub.subjectType === "PRACTICAL_KITCHEN"
                                  ? "bg-amber-50 text-amber-800 border-amber-200"
                                  : "bg-blue-50 text-blue-800 border-blue-200"
                              }`}
                            >
                              {sub.subjectType === "PRACTICAL_KITCHEN" ? "Kitchen Practical" : "Theory"}
                            </span>
                          </td>
                          <td className="py-3 px-4 text-center font-bold text-slate-900">
                            {sub.credits}
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              ) : (
                <div className="p-8 text-center border-2 border-dashed border-slate-200 rounded-xl">
                  <Icon name="document-text" className="h-8 w-8 text-slate-400 mx-auto mb-2" />
                  <p className="text-sm font-semibold text-slate-700">Curriculum Not Yet Assigned</p>
                  <p className="text-xs text-slate-500 mt-1">
                    No active subject allocations were found for your current semester division.
                  </p>
                </div>
              )}
            </div>

            {/* Historical Enrolment Timeline */}
            <div className="bg-card-comfort rounded-xl border border-comfort p-6 shadow-2xs">
              <h2 className="text-base font-bold text-slate-900 mb-4 flex items-center space-x-2">
                <Icon name="clock" className="h-5 w-5 text-[#1657D9]" />
                <span>Academic Progression & Enrolment History</span>
              </h2>

              {curriculum?.enrolments && curriculum.enrolments.length > 0 ? (
                <div className="space-y-3">
                  {curriculum.enrolments.map((enr) => (
                    <div
                      key={enr.id}
                      className="p-4 rounded-xl border border-slate-200 bg-slate-50/50 flex flex-col sm:flex-row sm:items-center justify-between gap-3"
                    >
                      <div className="flex items-start sm:items-center space-x-3">
                        <div className="h-8 w-8 rounded-lg bg-blue-100 text-[#1657D9] flex items-center justify-center font-bold text-xs shrink-0">
                          S{enr.semester.semesterNumber}
                        </div>
                        <div>
                          <p className="text-sm font-bold text-slate-900">
                            Semester {enr.semester.semesterNumber} ({enr.division.name})
                          </p>
                          <p className="text-xs text-slate-500">
                            {enr.programme.name} • {enr.academicYear.name}
                          </p>
                        </div>
                      </div>

                      <div className="flex items-center space-x-3 text-xs">
                        <span className="text-slate-500">
                          Enrolled: {new Date(enr.enrolledAt).toLocaleDateString("en-IN")}
                        </span>
                        <span
                          className={`px-2.5 py-0.5 rounded-full font-semibold border ${
                            enr.status === "PROMOTED"
                              ? "bg-emerald-50 text-emerald-800 border-emerald-200"
                              : "bg-blue-50 text-blue-800 border-blue-200"
                          }`}
                        >
                          {enr.status}
                        </span>
                      </div>
                    </div>
                  ))}
                </div>
              ) : (
                <p className="text-xs text-slate-500 py-4">No historical enrolment progression records logged.</p>
              )}
            </div>
          </div>
        )}

        {/* TAB: Class Schedule / Timetable */}
        {activeTab === "timetable" && (
          <div className="space-y-6 animate-fade-in">
            {/* Active Placement Card */}
            <div className="bg-card-comfort rounded-xl border border-comfort p-6 shadow-2xs">
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                <div>
                  <h2 className="text-base font-bold text-slate-900 flex items-center space-x-2">
                    <Icon name="calendar" className="h-5 w-5 text-[#1657D9]" />
                    <span>Current Class Schedule</span>
                  </h2>
                  <p className="text-xs text-slate-500 mt-0.5">
                    Persisted weekly academic timetable derived from your active semester enrolment and division.
                  </p>
                </div>

                {timetable?.placement ? (
                  <div className="inline-flex items-center space-x-2 bg-blue-50 border border-blue-200 rounded-lg px-3 py-1.5 text-xs text-blue-900 font-semibold">
                    <span>{timetable.placement.programmeCode}</span>
                    <span>•</span>
                    <span>Semester {timetable.placement.semesterNumber}</span>
                    <span>•</span>
                    <span>Division {timetable.placement.divisionName}</span>
                    <span>•</span>
                    <span className="text-blue-600">{timetable.placement.academicYearName}</span>
                  </div>
                ) : activePlacement ? (
                  <div className="inline-flex items-center space-x-2 bg-slate-50 border border-slate-200 rounded-lg px-3 py-1.5 text-xs text-slate-700 font-semibold">
                    <span>Semester {activePlacement.semesterNumber}</span>
                    <span>•</span>
                    <span>Division {activePlacement.divisionName}</span>
                  </div>
                ) : null}
              </div>
            </div>

            {/* Timetable State Rendering */}
            {isLoadingTimetable ? (
              <div className="bg-card-comfort rounded-xl border border-comfort p-12 text-center shadow-2xs">
                <div className="inline-block animate-spin rounded-full h-8 w-8 border-4 border-[#1657D9] border-t-transparent mb-3" />
                <p className="text-sm font-semibold text-slate-700">Loading Academic Schedule...</p>
                <p className="text-xs text-slate-500 mt-1">Retrieving scheduled class sessions for your active placement.</p>
              </div>
            ) : timetableError ? (
              <div className="bg-amber-50 border border-amber-200 rounded-xl p-8 text-center shadow-2xs">
                <Icon name="exclamation-triangle" className="h-10 w-10 text-amber-500 mx-auto mb-3" />
                <h3 className="text-base font-bold text-amber-900">Enrolment Notice</h3>
                <p className="text-xs text-amber-800 max-w-md mx-auto mt-1">
                  {timetableError === "No active semester enrolment found for authenticated student." ||
                  timetableError.includes("enrolment")
                    ? "No active semester enrolment found for your account. Please contact the Academic Office."
                    : timetableError}
                </p>
              </div>
            ) : timetable && timetable.entries.length === 0 ? (
              <div className="bg-card-comfort rounded-xl border border-comfort p-12 text-center shadow-2xs">
                <div className="h-12 w-12 rounded-xl bg-slate-100 flex items-center justify-center mx-auto mb-3 text-slate-400">
                  <Icon name="calendar" className="h-6 w-6" />
                </div>
                <h3 className="text-base font-bold text-slate-800">Schedule Notice</h3>
                <p className="text-xs text-slate-500 max-w-md mx-auto mt-1.5 leading-relaxed">
                  No timetable has been published for your current semester and division yet.
                </p>
              </div>
            ) : timetable && timetable.entries.length > 0 ? (
              <div className="space-y-4">
                {(["MONDAY", "TUESDAY", "WEDNESDAY", "THURSDAY", "FRIDAY", "SATURDAY"] as const).map((day) => {
                  const dayEntries = timetable.entries
                    .filter((e) => e.dayOfWeek === day)
                    .sort((a, b) => a.startTime.localeCompare(b.startTime));

                  if (dayEntries.length === 0) return null;

                  return (
                    <div
                      key={day}
                      className="bg-card-comfort rounded-xl border border-comfort overflow-hidden shadow-2xs"
                    >
                      <div className="bg-slate-50 px-5 py-3 border-b border-slate-200 flex items-center justify-between">
                        <div className="flex items-center space-x-2">
                          <span className="h-2 w-2 rounded-full bg-[#1657D9]" />
                          <h3 className="text-xs font-bold text-slate-900 tracking-wider uppercase">
                            {day}
                          </h3>
                        </div>
                        <span className="text-xs font-medium text-slate-500">
                          {dayEntries.length} {dayEntries.length === 1 ? "Session" : "Sessions"}
                        </span>
                      </div>

                      <div className="divide-y divide-slate-100">
                        {dayEntries.map((entry) => (
                          <div
                            key={entry.id}
                            className="p-4 sm:p-5 hover:bg-slate-50/60 transition-colors flex flex-col sm:flex-row sm:items-center justify-between gap-3"
                          >
                            <div className="flex items-start space-x-3.5">
                              {/* Time Pill */}
                              <div className="bg-blue-50 border border-blue-200 text-[#1657D9] rounded-lg px-3 py-1.5 text-center min-w-[95px] shrink-0">
                                <p className="text-xs font-bold font-mono">{entry.startTime}</p>
                                <p className="text-[10px] text-blue-600 font-medium">to {entry.endTime}</p>
                              </div>

                              <div className="space-y-1">
                                <div className="flex flex-wrap items-center gap-2">
                                  <span className="text-xs font-mono font-bold text-[#1657D9] bg-blue-50 px-2 py-0.5 rounded border border-blue-200/50">
                                    {entry.subject.code}
                                  </span>
                                  <h4 className="text-sm font-bold text-slate-900">
                                    {entry.subject.title}
                                  </h4>
                                  <span
                                    className={`text-[10px] font-semibold px-2 py-0.5 rounded-full border ${
                                      entry.sessionType === "PRACTICAL_KITCHEN" || entry.sessionType === "PRACTICAL"
                                        ? "bg-amber-50 text-amber-800 border-amber-200"
                                        : "bg-slate-100 text-slate-700 border-slate-200"
                                    }`}
                                  >
                                    {entry.sessionType === "PRACTICAL_KITCHEN"
                                      ? "Kitchen Practical"
                                      : entry.sessionType}
                                  </span>
                                </div>

                                <div className="flex flex-wrap items-center gap-x-4 gap-y-1 text-xs text-slate-500">
                                  <span>
                                    Faculty: <strong className="text-slate-700">{entry.staffName}</strong>
                                  </span>
                                  {entry.room && (
                                    <>
                                      <span>•</span>
                                      <span>
                                        Room / Facility: <strong className="text-slate-700">{entry.room}</strong>
                                      </span>
                                    </>
                                  )}
                                  <span>•</span>
                                  <span>
                                    Credits: <strong className="text-slate-700">{entry.subject.credits}</strong>
                                  </span>
                                </div>
                              </div>
                            </div>

                            <div className="sm:self-center">
                              <span
                                className={`text-[11px] font-semibold px-2.5 py-1 rounded-full border ${
                                  entry.status === "ACTIVE" || entry.status === "SCHEDULED"
                                    ? "bg-emerald-50 text-emerald-700 border-emerald-200"
                                    : "bg-slate-100 text-slate-700 border-slate-200"
                                }`}
                              >
                                {entry.status}
                              </span>
                            </div>
                          </div>
                        ))}
                      </div>
                    </div>
                  );
                })}
              </div>
            ) : null}
          </div>
        )}

        {/* TAB: Attendance */}
        {activeTab === "attendance" && (
          <div className="space-y-6 animate-fade-in">
            {/* 1. Mandatory Neutral Institutional Advisory Banner */}
            <div className="bg-amber-50/90 border border-amber-200/90 rounded-xl p-4 sm:p-5 flex items-start space-x-3.5 text-amber-900 shadow-2xs">
              <Icon name="shield-alert" className="h-5 w-5 text-amber-600 shrink-0 mt-0.5" />
              <div className="text-xs leading-relaxed space-y-1">
                <p className="font-bold text-amber-950 text-sm">Attendance Advisory Reference</p>
                <p className="text-amber-900">
                  The 75% figure is shown solely as an unverified advisory reference. It is not an approved institutional policy or an examination eligibility determination.
                </p>
              </div>
            </div>

            {/* Attendance State Rendering */}
            {isLoadingAttendance ? (
              <div className="bg-card-comfort rounded-xl border border-comfort p-12 text-center shadow-2xs">
                <div className="inline-block animate-spin rounded-full h-8 w-8 border-4 border-[#1657D9] border-t-transparent mb-3" />
                <p className="text-sm font-semibold text-slate-700">Loading Attendance Metrics...</p>
                <p className="text-xs text-slate-500 mt-1">Retrieving recorded session attendance records for your profile.</p>
              </div>
            ) : attendanceError ? (
              <div className="bg-rose-50 border border-rose-200 rounded-xl p-8 text-center shadow-2xs">
                <Icon name="exclamation-triangle" className="h-10 w-10 text-rose-500 mx-auto mb-3" />
                <h3 className="text-base font-bold text-rose-900">Unable to Load Attendance</h3>
                <p className="text-xs text-rose-800 max-w-md mx-auto mt-1">{attendanceError}</p>
              </div>
            ) : attendance ? (
              <>
                {/* 2. Transparent Raw Counts KPI Cards */}
                <div className="space-y-2">
                  <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-3">
                    <div className="bg-card-comfort rounded-xl border border-comfort p-4 shadow-2xs">
                      <span className="text-[11px] font-semibold text-slate-500 uppercase tracking-wider">
                        Sessions Held
                      </span>
                      <p className="text-2xl font-bold text-slate-900 mt-1">
                        {attendance.summary.totalConductedSessions}
                      </p>
                      <span className="text-[10px] text-slate-400">Total sessions</span>
                    </div>

                    <div className="bg-card-comfort rounded-xl border border-emerald-300/70 bg-emerald-50/30 p-4 shadow-2xs">
                      <span className="text-[11px] font-semibold text-emerald-700 uppercase tracking-wider">
                        Present
                      </span>
                      <p className="text-2xl font-bold text-emerald-600 mt-1">
                        {attendance.summary.presentCount}
                      </p>
                      <span className="text-[10px] text-emerald-700/80">Attended on time</span>
                    </div>

                    <div className="bg-card-comfort rounded-xl border border-amber-300/70 bg-amber-50/30 p-4 shadow-2xs">
                      <span className="text-[11px] font-semibold text-amber-700 uppercase tracking-wider">
                        Late
                      </span>
                      <p className="text-2xl font-bold text-amber-600 mt-1">
                        {attendance.summary.lateCount}
                      </p>
                      <span className="text-[10px] text-amber-700/80">Admitted with delay</span>
                    </div>

                    <div className="bg-card-comfort rounded-xl border border-rose-300/70 bg-rose-50/30 p-4 shadow-2xs">
                      <span className="text-[11px] font-semibold text-rose-700 uppercase tracking-wider">
                        Absent
                      </span>
                      <p className="text-2xl font-bold text-rose-600 mt-1">
                        {attendance.summary.absentCount}
                      </p>
                      <span className="text-[10px] text-rose-700/80">Unattended sessions</span>
                    </div>

                    <div className="bg-card-comfort rounded-xl border border-indigo-300/70 bg-indigo-50/30 p-4 shadow-2xs">
                      <span className="text-[11px] font-semibold text-indigo-700 uppercase tracking-wider">
                        Excused
                      </span>
                      <p className="text-2xl font-bold text-indigo-600 mt-1">
                        {attendance.summary.excusedCount}
                      </p>
                      <span className="text-[10px] text-indigo-700/80">Approved leaves</span>
                    </div>

                    <div className="bg-card-comfort rounded-xl border border-comfort p-4 shadow-2xs">
                      <span className="text-[11px] font-semibold text-slate-500 uppercase tracking-wider">
                        Recorded Total
                      </span>
                      <p className="text-2xl font-bold text-slate-900 mt-1">
                        {attendance.summary.totalRecordedOpportunities}
                      </p>
                      <span className="text-[10px] text-slate-400">Total opportunities</span>
                    </div>
                  </div>

                  <p className="text-[11px] text-slate-500 italic px-1">
                    * Present and Late represent attended sessions; Excused represents approved institutional or medical absences. All metrics display verifiable recorded counts; no automated compliance verdicts or examination exclusions are calculated.
                  </p>
                </div>

                {attendance.summary.totalRecordedOpportunities === 0 && attendance.records.length === 0 ? (
                  <div className="bg-card-comfort rounded-xl border border-comfort p-12 text-center shadow-2xs">
                    <div className="h-12 w-12 rounded-xl bg-slate-100 flex items-center justify-center mx-auto mb-3 text-slate-400">
                      <Icon name="clipboard-check" className="h-6 w-6" />
                    </div>
                    <h3 className="text-base font-bold text-slate-800">No Attendance Records</h3>
                    <p className="text-xs text-slate-500 max-w-md mx-auto mt-1.5 leading-relaxed">
                      No attendance records logged for your classes yet. Attendance records will appear here as faculty conduct sessions.
                    </p>
                  </div>
                ) : (
                  <>
                    {/* 3. Subject-wise Session Counts Table */}
                    <div className="bg-card-comfort rounded-xl border border-comfort p-6 shadow-2xs">
                      <div className="mb-4">
                        <h3 className="text-base font-bold text-slate-900 flex items-center space-x-2">
                          <Icon name="chart-bar" className="h-5 w-5 text-[#1657D9]" />
                          <span>Subject-Wise Session Counts</span>
                        </h3>
                        <p className="text-xs text-slate-500 mt-0.5">
                          Verifiable count of sessions conducted and attendance statuses recorded per enrolled subject.
                        </p>
                      </div>

                      <div className="overflow-x-auto">
                        <table className="w-full text-left text-xs text-slate-600">
                          <thead className="bg-slate-50 text-[11px] font-bold uppercase tracking-wider text-slate-500 border-b border-slate-200">
                            <tr>
                              <th className="py-3 px-4">Code</th>
                              <th className="py-3 px-4">Subject Title</th>
                              <th className="py-3 px-4 text-center">Conducted</th>
                              <th className="py-3 px-4 text-center text-emerald-700">Present</th>
                              <th className="py-3 px-4 text-center text-amber-700">Late</th>
                              <th className="py-3 px-4 text-center text-rose-700">Absent</th>
                              <th className="py-3 px-4 text-center text-indigo-700">Excused</th>
                            </tr>
                          </thead>
                          <tbody className="divide-y divide-slate-100">
                            {attendance.summary.subjectBreakdown.map((sb) => (
                              <tr key={sb.subjectId} className="hover:bg-slate-50/60 transition-colors">
                                <td className="py-3 px-4 font-mono font-bold text-[#1657D9]">
                                  {sb.subjectCode}
                                </td>
                                <td className="py-3 px-4 font-semibold text-slate-900">
                                  {sb.subjectTitle}
                                </td>
                                <td className="py-3 px-4 text-center font-bold text-slate-900">
                                  {sb.conductedSessions}
                                </td>
                                <td className="py-3 px-4 text-center font-semibold text-emerald-600">
                                  {sb.presentCount}
                                </td>
                                <td className="py-3 px-4 text-center font-semibold text-amber-600">
                                  {sb.lateCount}
                                </td>
                                <td className="py-3 px-4 text-center font-semibold text-rose-600">
                                  {sb.absentCount}
                                </td>
                                <td className="py-3 px-4 text-center font-semibold text-indigo-600">
                                  {sb.excusedCount}
                                </td>
                              </tr>
                            ))}
                          </tbody>
                        </table>
                      </div>
                    </div>

                    {/* 4. Chronological Attendance Session History */}
                    <div className="bg-card-comfort rounded-xl border border-comfort p-6 shadow-2xs">
                      <div className="mb-4">
                        <h3 className="text-base font-bold text-slate-900 flex items-center space-x-2">
                          <Icon name="clock" className="h-5 w-5 text-[#1657D9]" />
                          <span>Chronological Session Ledger</span>
                        </h3>
                        <p className="text-xs text-slate-500 mt-0.5">
                          Individual session attendance entries recorded by faculty members.
                        </p>
                      </div>

                      <div className="overflow-x-auto">
                        <table className="w-full text-left text-xs text-slate-600">
                          <thead className="bg-slate-50 text-[11px] font-bold uppercase tracking-wider text-slate-500 border-b border-slate-200">
                            <tr>
                              <th className="py-3 px-4">Date</th>
                              <th className="py-3 px-4">Time Slot</th>
                              <th className="py-3 px-4">Subject</th>
                              <th className="py-3 px-4">Type</th>
                              <th className="py-3 px-4">Topic Covered</th>
                              <th className="py-3 px-4">Faculty</th>
                              <th className="py-3 px-4 text-center">Status</th>
                              <th className="py-3 px-4">Remarks</th>
                            </tr>
                          </thead>
                          <tbody className="divide-y divide-slate-100">
                            {attendance.records.map((rec) => (
                              <tr key={rec.id} className="hover:bg-slate-50/60 transition-colors">
                                <td className="py-3 px-4 whitespace-nowrap font-medium text-slate-900">
                                  {new Date(rec.sessionDate).toLocaleDateString("en-IN", {
                                    year: "numeric",
                                    month: "short",
                                    day: "numeric",
                                  })}
                                </td>
                                <td className="py-3 px-4 font-mono text-slate-600 whitespace-nowrap">
                                  {rec.startTime} - {rec.endTime}
                                </td>
                                <td className="py-3 px-4">
                                  <span className="font-mono font-bold text-[#1657D9] mr-1.5">
                                    {rec.subjectCode}
                                  </span>
                                  <span className="text-slate-900 font-medium">{rec.subjectTitle}</span>
                                </td>
                                <td className="py-3 px-4">
                                  <span className="text-[10px] font-semibold px-2 py-0.5 rounded-full bg-slate-100 text-slate-700 border border-slate-200">
                                    {rec.sessionType}
                                  </span>
                                </td>
                                <td className="py-3 px-4 text-slate-700 max-w-[200px] truncate">
                                  {rec.topicCovered || "—"}
                                </td>
                                <td className="py-3 px-4 text-slate-700 whitespace-nowrap">
                                  {rec.facultyName}
                                </td>
                                <td className="py-3 px-4 text-center">
                                  <span
                                    className={`inline-block px-2.5 py-0.5 rounded-full font-semibold text-[10px] border ${
                                      rec.status === "PRESENT"
                                        ? "bg-emerald-50 text-emerald-700 border-emerald-200"
                                        : rec.status === "LATE"
                                        ? "bg-amber-50 text-amber-700 border-amber-200"
                                        : rec.status === "EXCUSED"
                                        ? "bg-indigo-50 text-indigo-700 border-indigo-200"
                                        : "bg-rose-50 text-rose-700 border-rose-200"
                                    }`}
                                  >
                                    {rec.status}
                                  </span>
                                </td>
                                <td className="py-3 px-4 text-slate-500 max-w-[150px] truncate">
                                  {rec.remarks || "—"}
                                </td>
                              </tr>
                            ))}
                          </tbody>
                        </table>
                      </div>
                    </div>
                  </>
                )}
              </>
            ) : null}
          </div>
        )}

        {/* TAB: Examinations */}
        {activeTab === "examinations" && (
          <div className="space-y-6 animate-fade-in">
            {/* Header Card */}
            <div className="bg-card-comfort rounded-xl border border-comfort p-6 shadow-2xs">
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                <div>
                  <h2 className="text-base font-bold text-slate-900 flex items-center space-x-2">
                    <Icon name="award" className="h-5 w-5 text-[#1657D9]" />
                    <span>Published Examination Results</span>
                  </h2>
                  <p className="text-xs text-slate-500 mt-0.5">
                    Official evaluation scorecards released by the Examination Office. Only published results are shown.
                  </p>
                </div>

                <div className="inline-flex items-center space-x-2 bg-emerald-50 border border-emerald-200 rounded-lg px-3 py-1.5 text-xs text-emerald-800 font-semibold">
                  <Icon name="check-circle" className="h-4 w-4 text-emerald-600" />
                  <span>Published</span>
                </div>
              </div>
            </div>

            {/* Results State Rendering */}
            {isLoadingExamResults ? (
              <div className="bg-card-comfort rounded-xl border border-comfort p-12 text-center shadow-2xs">
                <div className="inline-block animate-spin rounded-full h-8 w-8 border-4 border-[#1657D9] border-t-transparent mb-3" />
                <p className="text-sm font-semibold text-slate-700">Loading Examination Scorecards...</p>
                <p className="text-xs text-slate-500 mt-1">Retrieving official published results for your account.</p>
              </div>
            ) : examResultsError ? (
              <div className="bg-rose-50 border border-rose-200 rounded-xl p-8 text-center shadow-2xs">
                <Icon name="exclamation-triangle" className="h-10 w-10 text-rose-500 mx-auto mb-3" />
                <h3 className="text-base font-bold text-rose-900">Unable to Load Results</h3>
                <p className="text-xs text-rose-800 max-w-md mx-auto mt-1">{examResultsError}</p>
              </div>
            ) : examResults && examResults.results.length === 0 ? (
              <div className="bg-card-comfort rounded-xl border border-comfort p-12 text-center shadow-2xs">
                <div className="h-12 w-12 rounded-xl bg-slate-100 flex items-center justify-center mx-auto mb-3 text-slate-400">
                  <Icon name="award" className="h-6 w-6" />
                </div>
                <h3 className="text-base font-bold text-slate-800">Examination Results & Scorecards</h3>
                <p className="text-xs text-slate-500 max-w-md mx-auto mt-1.5 leading-relaxed">
                  No examination results have been published for your account yet. Published results will appear here when they become available.
                </p>
              </div>
            ) : examResults && examResults.results.length > 0 ? (
              <div className="space-y-6">
                {examResults.results.map((res) => (
                  <div
                    key={res.id}
                    className="bg-card-comfort rounded-xl border border-comfort overflow-hidden shadow-2xs"
                  >
                    {/* Scorecard Header */}
                    <div className="bg-slate-50 p-5 sm:p-6 border-b border-slate-200 flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                      <div>
                        <div className="flex flex-wrap items-center gap-2 mb-1">
                          <span className="font-mono text-xs font-bold text-[#1657D9] bg-blue-50 border border-blue-200 px-2.5 py-0.5 rounded">
                            {res.examSession.sessionCode}
                          </span>
                          <span className="text-xs font-semibold px-2 py-0.5 rounded-full bg-slate-100 text-slate-700 border border-slate-200">
                            {res.examSession.sessionType}
                          </span>
                          <span className="text-xs text-slate-400">•</span>
                          <span className="text-xs text-slate-600 font-medium">
                            {res.semester.programmeName}
                          </span>
                        </div>

                        <h3 className="text-lg font-bold text-slate-900">
                          {res.examSession.name}
                        </h3>

                        <p className="text-xs text-slate-500 mt-0.5">
                          Semester {res.semester.semesterNumber} •{" "}
                          {res.publishedAt
                            ? `Officially published on ${new Date(res.publishedAt).toLocaleDateString("en-IN", {
                                year: "numeric",
                                month: "long",
                                day: "numeric",
                              })}`
                            : "Published Record"}
                        </p>
                      </div>

                      {/* Result Verdict Badge */}
                      <div className="sm:text-right">
                        <span
                          className={`inline-block px-3.5 py-1.5 rounded-full font-bold text-xs border tracking-wide ${
                            res.resultStatus === "PASSED"
                              ? "bg-emerald-50 text-emerald-800 border-emerald-300 shadow-2xs"
                              : res.resultStatus === "ATKT"
                              ? "bg-amber-50 text-amber-800 border-amber-300 shadow-2xs"
                              : res.resultStatus === "FAILED"
                              ? "bg-rose-50 text-rose-800 border-rose-300 shadow-2xs"
                              : "bg-blue-50 text-blue-800 border-blue-300 shadow-2xs"
                          }`}
                        >
                          {res.resultStatus}
                        </span>
                      </div>
                    </div>

                    {/* Aggregate Performance Strip */}
                    <div className="grid grid-cols-2 sm:grid-cols-4 divide-y sm:divide-y-0 sm:divide-x divide-slate-100 bg-slate-50/40 border-b border-slate-200">
                      <div className="p-4 text-center">
                        <span className="text-[10px] font-semibold text-slate-400 uppercase tracking-wider">
                          Total Marks
                        </span>
                        <p className="text-lg font-bold text-slate-900 mt-0.5">
                          {res.totalMarksObtained !== null ? res.totalMarksObtained : "—"}{" "}
                          <span className="text-xs text-slate-400 font-normal">/ {res.totalMaxMarks}</span>
                        </p>
                      </div>

                      <div className="p-4 text-center">
                        <span className="text-[10px] font-semibold text-slate-400 uppercase tracking-wider">
                          Percentage
                        </span>
                        <p className="text-lg font-bold text-slate-900 mt-0.5">
                          {res.percentage !== null ? `${res.percentage.toFixed(1)}%` : "—"}
                        </p>
                      </div>

                      <div className="p-4 text-center">
                        <span className="text-[10px] font-semibold text-slate-400 uppercase tracking-wider">
                          SGPA
                        </span>
                        <p className="text-lg font-bold text-[#1657D9] mt-0.5 font-mono">
                          {res.sgpa !== null ? res.sgpa.toFixed(2) : "—"}
                        </p>
                      </div>

                      <div className="p-4 text-center">
                        <span className="text-[10px] font-semibold text-slate-400 uppercase tracking-wider">
                          Letter Grade
                        </span>
                        <p className="text-lg font-bold text-slate-900 mt-0.5 font-mono">
                          {res.letterGrade || "—"}
                        </p>
                      </div>
                    </div>

                    {/* Subject Breakdown Table */}
                    <div className="p-5 sm:p-6">
                      <div className="mb-3">
                        <h4 className="text-sm font-bold text-slate-900">
                          Course-Wise Evaluation Breakdown
                        </h4>
                        <p className="text-xs text-slate-500">
                          Individual subject evaluation marks, credit ratings, and grade allocations.
                        </p>
                      </div>

                      <div className="overflow-x-auto">
                        <table className="w-full text-left text-xs text-slate-600">
                          <thead className="bg-slate-50 text-[11px] font-bold uppercase tracking-wider text-slate-500 border-b border-slate-200">
                            <tr>
                              <th className="py-3 px-4">Subject Code</th>
                              <th className="py-3 px-4">Subject Title</th>
                              <th className="py-3 px-4">Type</th>
                              <th className="py-3 px-4 text-center">Credits</th>
                              <th className="py-3 px-4 text-center">Max</th>
                              <th className="py-3 px-4 text-center">Obtained</th>
                              <th className="py-3 px-4 text-center font-mono">GP</th>
                              <th className="py-3 px-4 text-center font-mono">Grade</th>
                              <th className="py-3 px-4 text-center">Status</th>
                            </tr>
                          </thead>
                          <tbody className="divide-y divide-slate-100">
                            {res.subjectResults.map((sr) => (
                              <tr key={sr.id} className="hover:bg-slate-50/60 transition-colors">
                                <td className="py-3 px-4 font-mono font-bold text-[#1657D9]">
                                  {sr.subjectCode}
                                </td>
                                <td className="py-3 px-4 font-semibold text-slate-900">
                                  {sr.subjectTitle}
                                </td>
                                <td className="py-3 px-4">
                                  <span
                                    className={`text-[10px] font-semibold px-2 py-0.5 rounded-full border ${
                                      sr.subjectType === "PRACTICAL_KITCHEN" || sr.subjectType === "PRACTICAL"
                                        ? "bg-amber-50 text-amber-800 border-amber-200"
                                        : "bg-blue-50 text-blue-800 border-blue-200"
                                    }`}
                                  >
                                    {sr.subjectType === "PRACTICAL_KITCHEN" ? "Practical Kitchen" : "Theory"}
                                  </span>
                                </td>
                                <td className="py-3 px-4 text-center font-bold text-slate-900">
                                  {sr.credits}
                                </td>
                                <td className="py-3 px-4 text-center text-slate-500">
                                  {sr.totalMaxMarks}
                                </td>
                                <td className="py-3 px-4 text-center font-bold text-slate-900">
                                  {sr.totalMarksObtained !== null ? sr.totalMarksObtained : "—"}
                                </td>
                                <td className="py-3 px-4 text-center font-mono text-slate-700">
                                  {sr.gradePoint !== null ? sr.gradePoint.toFixed(1) : "—"}
                                </td>
                                <td className="py-3 px-4 text-center font-mono font-bold text-slate-900">
                                  {sr.letterGrade || "—"}
                                </td>
                                <td className="py-3 px-4 text-center">
                                  <span
                                    className={`inline-block px-2.5 py-0.5 rounded-full font-semibold text-[10px] border ${
                                      sr.status === "PASS"
                                        ? "bg-emerald-50 text-emerald-700 border-emerald-200"
                                        : sr.status === "FAIL"
                                        ? "bg-rose-50 text-rose-700 border-rose-200"
                                        : "bg-slate-100 text-slate-700 border-slate-200"
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
                  </div>
                ))}
              </div>
            ) : null}
          </div>
        )}

        {/* TAB 5: Fee Ledger & Receipts */}
        {activeTab === "fees" && (
          <div className="space-y-6 animate-fade-in">
            {/* Header & Status Card */}
            <div className="bg-card-comfort rounded-xl border border-comfort p-6 shadow-2xs">
              <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
                <div>
                  <h2 className="text-base font-bold text-slate-900 flex items-center space-x-2">
                    <Icon name="currency-rupee" className="h-5 w-5 text-[#1657D9]" />
                    <span>Student Fee Ledger & Receipts</span>
                  </h2>
                  <p className="text-xs text-slate-500 mt-0.5">
                    Record of academic invoices, recorded collections, and electronic payment receipts.
                  </p>
                </div>
                {feeLedger && (
                  <div className="flex items-center space-x-2 self-start sm:self-auto">
                    <span
                      className={`inline-flex items-center px-3 py-1 rounded-full text-xs font-bold border tracking-wider uppercase ${
                        feeLedger.summary.feeClearanceStatus === "CLEARED"
                          ? "bg-emerald-50 text-emerald-700 border-emerald-200"
                          : feeLedger.summary.feeClearanceStatus === "PARTIALLY_CLEARED"
                          ? "bg-amber-50 text-amber-700 border-amber-200"
                          : feeLedger.summary.feeClearanceStatus === "PENDING_DUES"
                          ? "bg-rose-50 text-rose-700 border-rose-200"
                          : "bg-slate-100 text-slate-700 border-slate-200"
                      }`}
                    >
                      <Icon
                        name={
                          feeLedger.summary.feeClearanceStatus === "CLEARED"
                            ? "check-circle"
                            : "shield-alert"
                        }
                        className="h-3.5 w-3.5 mr-1.5"
                      />
                      {feeLedger.summary.feeClearanceStatus.replace("_", " ")}
                    </span>
                  </div>
                )}
              </div>

              {/* Four Financial KPI Summary Cards */}
              {feeLedger && (
                <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mt-6">
                  <div className="bg-slate-50 rounded-lg p-4 border border-slate-200/80">
                    <div className="text-[11px] font-semibold text-slate-500 uppercase tracking-wider mb-1">
                      Billed Demand
                    </div>
                    <div className="text-xl font-extrabold text-slate-900">
                      ₹{feeLedger.summary.totalDemand.toLocaleString("en-IN")}
                    </div>
                    <div className="text-[10px] text-slate-400 mt-1">
                      Sum of issued invoices
                    </div>
                  </div>

                  <div className="bg-slate-50 rounded-lg p-4 border border-slate-200/80">
                    <div className="text-[11px] font-semibold text-slate-500 uppercase tracking-wider mb-1">
                      Recorded Payments
                    </div>
                    <div className="text-xl font-extrabold text-emerald-700">
                      ₹{feeLedger.summary.totalPaid.toLocaleString("en-IN")}
                    </div>
                    <div className="text-[10px] text-slate-400 mt-1">
                      Recorded collections
                    </div>
                  </div>

                  <div className="bg-slate-50 rounded-lg p-4 border border-slate-200/80">
                    <div className="text-[11px] font-semibold text-slate-500 uppercase tracking-wider mb-1">
                      Outstanding Balance
                    </div>
                    <div
                      className={`text-xl font-extrabold ${
                        feeLedger.summary.outstandingBalance > 0
                          ? "text-rose-700"
                          : "text-slate-900"
                      }`}
                    >
                      ₹{feeLedger.summary.outstandingBalance.toLocaleString("en-IN")}
                    </div>
                    <div className="text-[10px] text-slate-400 mt-1">
                      Payable to institution
                    </div>
                  </div>

                  <div className="bg-slate-50 rounded-lg p-4 border border-slate-200/80">
                    <div className="text-[11px] font-semibold text-slate-500 uppercase tracking-wider mb-1">
                      Overpayment Credit
                    </div>
                    <div className="text-xl font-extrabold text-blue-700">
                      ₹{feeLedger.summary.overpaymentCredit.toLocaleString("en-IN")}
                    </div>
                    <div className="text-[10px] text-slate-400 mt-1">
                      Unapplied credit balance
                    </div>
                  </div>
                </div>
              )}
            </div>

            {/* Financial Transparency / Tracking Scope Notice */}
            <div className="bg-blue-50/70 border border-blue-200/80 rounded-xl p-4 flex items-start space-x-3 text-xs text-blue-900 leading-relaxed">
              <Icon name="information-circle" className="h-5 w-5 text-[#1657D9] flex-shrink-0 mt-0.5" />
              <div>
                <span className="font-semibold">Financial Scope Notice: </span>
                CampusOS currently supports single-direction student invoice and recorded-payment tracking. It is not a full accounting or reconciliation system. A receipt confirms a payment recorded in CampusOS; independent bank settlement is not implied.
              </div>
            </div>

            {/* Error Message */}
            {feeLedgerError && (
              <div className="bg-rose-50 border border-rose-200 rounded-xl p-4 flex items-center space-x-3 text-xs text-rose-800">
                <Icon name="shield-alert" className="h-5 w-5 text-rose-600 flex-shrink-0" />
                <span>{feeLedgerError}</span>
              </div>
            )}

            {/* Loading State */}
            {isLoadingFeeLedger ? (
              <div className="bg-card-comfort rounded-xl border border-comfort p-12 text-center shadow-2xs">
                <div className="inline-block animate-spin rounded-full h-8 w-8 border-4 border-slate-200 border-t-[#1657D9] mb-3" />
                <p className="text-xs font-medium text-slate-600">
                  Retrieving student fee ledger records...
                </p>
              </div>
            ) : feeLedger && feeLedger.invoices.length === 0 ? (
              /* Neutral Empty State: No Invoices */
              <div className="bg-card-comfort rounded-xl border border-comfort p-12 text-center shadow-2xs">
                <div className="h-12 w-12 rounded-xl bg-slate-100 flex items-center justify-center mx-auto mb-3 text-slate-400">
                  <Icon name="document-text" className="h-6 w-6" />
                </div>
                <h3 className="text-base font-bold text-slate-800">No Invoices Issued</h3>
                <p className="text-xs text-slate-500 max-w-md mx-auto mt-1.5 leading-relaxed">
                  No fee invoices have been issued for your account yet. If you require fee demand details, please contact the Accounts Office.
                </p>
              </div>
            ) : feeLedger && feeLedger.invoices.length > 0 ? (
              /* Invoices and Receipts Breakdown */
              <div className="space-y-6">
                {feeLedger.invoices.map((inv) => (
                  <div
                    key={inv.id}
                    className="bg-card-comfort rounded-xl border border-comfort shadow-2xs overflow-hidden"
                  >
                    {/* Invoice Header */}
                    <div className="p-5 border-b border-slate-100 bg-slate-50/60 flex flex-col md:flex-row md:items-center md:justify-between gap-3">
                      <div>
                        <div className="flex items-center space-x-2">
                          <span className="font-mono text-xs font-bold text-slate-900 bg-card-surface px-2 py-0.5 rounded border border-comfort">
                            {inv.invoiceNumber}
                          </span>
                          <span className="text-sm font-bold text-slate-800">
                            {inv.structureName}
                          </span>
                        </div>
                        <div className="flex items-center space-x-4 mt-1.5 text-xs text-slate-500">
                          <span>
                            Issued: {new Date(inv.createdAt).toLocaleDateString("en-IN")}
                          </span>
                          <span>•</span>
                          <span>
                            Due Date: {new Date(inv.dueDate).toLocaleDateString("en-IN")}
                          </span>
                        </div>
                      </div>

                      <div className="flex items-center space-x-4">
                        <div className="text-right">
                          <div className="text-[11px] text-slate-400 uppercase tracking-wider font-semibold">
                            Invoice Demand
                          </div>
                          <div className="text-base font-extrabold text-slate-900">
                            ₹{inv.totalDemand.toLocaleString("en-IN")}
                          </div>
                        </div>
                        <span
                          className={`inline-block px-3 py-1 rounded-full text-xs font-bold border tracking-wider uppercase ${
                            inv.status === "PAID"
                              ? "bg-emerald-50 text-emerald-700 border-emerald-200"
                              : inv.status === "PARTIAL"
                              ? "bg-amber-50 text-amber-700 border-amber-200"
                              : "bg-rose-50 text-rose-700 border-rose-200"
                          }`}
                        >
                          {inv.status}
                        </span>
                      </div>
                    </div>

                    <div className="p-5 space-y-5">
                      {/* Fee Heads Breakdown */}
                      <div>
                        <h4 className="text-xs font-bold text-slate-700 uppercase tracking-wider mb-2 flex items-center space-x-1.5">
                          <Icon name="clipboard-check" className="h-4 w-4 text-slate-400" />
                          <span>Fee Components</span>
                        </h4>
                        <div className="overflow-x-auto rounded-lg border border-slate-200">
                          <table className="w-full text-left text-xs">
                            <thead className="bg-slate-50 text-slate-500 font-semibold border-b border-slate-200">
                              <tr>
                                <th className="py-2.5 px-3">Component / Fee Head</th>
                                <th className="py-2.5 px-3 text-right">Demand Amount</th>
                              </tr>
                            </thead>
                            <tbody className="divide-y divide-slate-100">
                              {inv.feeHeads.map((head, idx) => (
                                <tr key={idx} className="hover:bg-slate-50/50">
                                  <td className="py-2 px-3 text-slate-700 font-medium">
                                    {head.headName}
                                  </td>
                                  <td className="py-2 px-3 text-right font-mono text-slate-900 font-semibold">
                                    ₹{head.amount.toLocaleString("en-IN")}
                                  </td>
                                </tr>
                              ))}
                              <tr className="bg-slate-50/80 font-bold text-slate-900 border-t border-slate-200">
                                <td className="py-2.5 px-3">Total Invoice Demand</td>
                                <td className="py-2.5 px-3 text-right font-mono">
                                  ₹{inv.totalDemand.toLocaleString("en-IN")}
                                </td>
                              </tr>
                            </tbody>
                          </table>
                        </div>
                      </div>

                      {/* Recorded Receipts */}
                      <div>
                        <h4 className="text-xs font-bold text-slate-700 uppercase tracking-wider mb-2 flex items-center space-x-1.5">
                          <Icon name="banknotes" className="h-4 w-4 text-emerald-600" />
                          <span>Recorded Payment Receipts ({inv.receipts.length})</span>
                        </h4>

                        {inv.receipts.length === 0 ? (
                          <div className="bg-slate-50/70 border border-dashed border-slate-200 rounded-lg p-4 text-center text-xs text-slate-500">
                            No payment receipts recorded for this invoice yet.
                          </div>
                        ) : (
                          <div className="overflow-x-auto rounded-lg border border-slate-200">
                            <table className="w-full text-left text-xs">
                              <thead className="bg-slate-50 text-slate-500 font-semibold border-b border-slate-200">
                                <tr>
                                  <th className="py-2.5 px-3">Receipt No</th>
                                  <th className="py-2.5 px-3">Payment Date</th>
                                  <th className="py-2.5 px-3">Method</th>
                                  <th className="py-2.5 px-3">Transaction Ref</th>
                                  <th className="py-2.5 px-3 text-right">Amount Paid</th>
                                  <th className="py-2.5 px-3">Collected By</th>
                                  <th className="py-2.5 px-3 text-center">Action</th>
                                </tr>
                              </thead>
                              <tbody className="divide-y divide-slate-100">
                                {inv.receipts.map((r) => (
                                  <tr key={r.id} className="hover:bg-slate-50/50">
                                    <td className="py-2.5 px-3 font-mono font-bold text-slate-900">
                                      {r.receiptNumber}
                                    </td>
                                    <td className="py-2.5 px-3 text-slate-600">
                                      {new Date(r.paymentDate).toLocaleDateString("en-IN")}
                                    </td>
                                    <td className="py-2.5 px-3">
                                      <span className="inline-block px-2 py-0.5 rounded bg-slate-100 text-slate-700 text-[10px] font-semibold">
                                        {r.paymentMethod}
                                      </span>
                                    </td>
                                    <td className="py-2.5 px-3 font-mono text-[11px] text-slate-600">
                                      {r.transactionReference}
                                    </td>
                                    <td className="py-2.5 px-3 text-right font-mono font-bold text-emerald-700">
                                      ₹{r.amountPaid.toLocaleString("en-IN")}
                                    </td>
                                    <td className="py-2.5 px-3 text-slate-600 text-[11px]">
                                      {r.collectedByName}
                                    </td>
                                    <td className="py-2.5 px-3 text-center">
                                      <button
                                        type="button"
                                        onClick={() => handleViewReceipt(r.id)}
                                        disabled={isLoadingReceipt}
                                        className="inline-flex items-center px-2.5 py-1 rounded-md text-[11px] font-semibold bg-[#1657D9]/10 text-[#1657D9] hover:bg-[#1657D9]/20 transition-colors disabled:opacity-50"
                                      >
                                        <Icon name="eye" className="h-3.5 w-3.5 mr-1" />
                                        <span>View Voucher</span>
                                      </button>
                                    </td>
                                  </tr>
                                ))}
                              </tbody>
                            </table>
                          </div>
                        )}
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            ) : null}

            {/* Receipt Voucher Modal */}
            {selectedReceipt && (
              <div className="fixed inset-0 z-50 bg-black/60 flex items-center justify-center p-4 overflow-y-auto animate-fade-in">
                <div className="bg-card-comfort rounded-2xl max-w-lg w-full p-6 border border-comfort shadow-2xl relative">
                  {/* Close button */}
                  <button
                    type="button"
                    onClick={() => setSelectedReceipt(null)}
                    className="absolute top-4 right-4 p-1.5 rounded-lg text-slate-400 hover:text-slate-600 hover:bg-slate-100 transition-colors"
                  >
                    <Icon name="x-mark" className="h-5 w-5" />
                  </button>

                  {/* Voucher Header */}
                  <div className="text-center pb-4 border-b border-slate-200">
                    <div className="text-[11px] font-bold text-[#1657D9] uppercase tracking-wider">
                      RAJENDRA PRASAD INSTITUTE OF HOTEL MANAGEMENT
                    </div>
                    <h3 className="text-base font-extrabold text-slate-900 mt-0.5">
                      PAYMENT RECEIPT VOUCHER
                    </h3>
                    <div className="mt-2 inline-flex items-center space-x-2 bg-slate-50 px-3 py-1 rounded-full border border-slate-200 text-xs font-mono">
                      <span className="text-slate-500">Receipt No:</span>
                      <span className="font-bold text-slate-900">{selectedReceipt.receiptNumber}</span>
                    </div>
                  </div>

                  {/* Voucher Details */}
                  <div className="py-4 space-y-3 text-xs">
                    <div className="grid grid-cols-2 gap-2 p-3 bg-slate-50 rounded-lg border border-slate-100">
                      <div>
                        <div className="text-slate-400 text-[10px] uppercase font-semibold">Student Name</div>
                        <div className="font-bold text-slate-900">{selectedReceipt.student.fullName}</div>
                      </div>
                      <div>
                        <div className="text-slate-400 text-[10px] uppercase font-semibold">Roll No / PRN</div>
                        <div className="font-mono text-slate-800">
                          {selectedReceipt.student.rollNumber} / {selectedReceipt.student.prn}
                        </div>
                      </div>
                    </div>

                    <div className="grid grid-cols-2 gap-2 p-3 bg-slate-50 rounded-lg border border-slate-100">
                      <div>
                        <div className="text-slate-400 text-[10px] uppercase font-semibold">Invoice Number</div>
                        <div className="font-mono font-bold text-slate-900">
                          {selectedReceipt.invoice.invoiceNumber}
                        </div>
                      </div>
                      <div>
                        <div className="text-slate-400 text-[10px] uppercase font-semibold">Fee Structure</div>
                        <div className="text-slate-800">{selectedReceipt.invoice.feeStructureName}</div>
                      </div>
                    </div>

                    <div className="grid grid-cols-2 gap-2 p-3 bg-slate-50 rounded-lg border border-slate-100">
                      <div>
                        <div className="text-slate-400 text-[10px] uppercase font-semibold">Payment Date</div>
                        <div className="text-slate-800">
                          {new Date(selectedReceipt.paymentDate).toLocaleDateString("en-IN", {
                            day: "2-digit",
                            month: "short",
                            year: "numeric",
                          })}
                        </div>
                      </div>
                      <div>
                        <div className="text-slate-400 text-[10px] uppercase font-semibold">Payment Mode</div>
                        <div className="font-semibold text-slate-900">
                          {selectedReceipt.paymentMethod}
                        </div>
                      </div>
                    </div>

                    <div className="p-3 bg-slate-50 rounded-lg border border-slate-100">
                      <div className="text-slate-400 text-[10px] uppercase font-semibold">Transaction Reference</div>
                      <div className="font-mono text-slate-800 break-all">
                        {selectedReceipt.transactionReference}
                      </div>
                    </div>

                    {/* Prominent Amount Box */}
                    <div className="p-4 bg-emerald-50 rounded-xl border border-emerald-200 text-center">
                      <div className="text-[11px] font-bold text-emerald-800 uppercase tracking-wider">
                        Amount Successfully Paid
                      </div>
                      <div className="text-2xl font-black text-emerald-700 mt-1">
                        ₹{selectedReceipt.amountPaid.toLocaleString("en-IN")}
                      </div>
                    </div>

                    <div className="flex justify-between items-center text-[11px] text-slate-500 pt-1">
                      <span>Recorded By: <strong className="text-slate-700">{selectedReceipt.collectedByName}</strong></span>
                      <span className="text-emerald-700 font-semibold flex items-center">
                        <Icon name="check-circle" className="h-3.5 w-3.5 mr-1" />
                        Recorded in CampusOS
                      </span>
                    </div>
                  </div>

                  {/* Voucher Actions */}
                  <div className="pt-4 border-t border-slate-200 flex items-center justify-end space-x-3">
                    <button
                      type="button"
                      onClick={() => window.print()}
                      className="px-4 py-2 rounded-lg text-xs font-semibold bg-slate-100 text-slate-700 hover:bg-slate-200 transition-colors inline-flex items-center space-x-1.5"
                    >
                      <Icon name="arrow-down-tray" className="h-4 w-4" />
                      <span>Print Voucher</span>
                    </button>
                    <button
                      type="button"
                      onClick={() => setSelectedReceipt(null)}
                      className="px-4 py-2 rounded-lg text-xs font-semibold bg-[#1657D9] text-white hover:bg-[#1246b0] transition-colors"
                    >
                      Done
                    </button>
                  </div>
                </div>
              </div>
            )}
          </div>
        )}

        {/* TAB 3: Compliance Documents */}
        {activeTab === "documents" && (
          <div className="bg-card-comfort rounded-xl border border-comfort p-6 shadow-2xs animate-fade-in">
            <div className="mb-4">
              <h2 className="text-base font-bold text-slate-900 flex items-center space-x-2">
                <Icon name="document-duplicate" className="h-5 w-5 text-[#1657D9]" />
                <span>Student Compliance Documents</span>
              </h2>
              <p className="text-xs text-slate-500 mt-0.5">
                Upload and inspect your official admission credentials. Supported categories are listed below.
                Replacing an existing document preserves version history and prior verification notes.
              </p>
            </div>

            {/* Reused Production Document Management Component in Student Self-Service Mode */}
            <StudentDocumentsTab
              studentId={student.id}
              studentName={student.fullName}
              userRole="STUDENT_VIEWER"
              canWrite={true}
            />
          </div>
        )}
      </div>
    </div>
  );
};
