"use client";

import React, { useState, useEffect, useTransition } from "react";
import {
  getReportFilterOptionsAction,
  getAttendanceSummaryReportAction,
  getStudentAttendanceRegisterAction,
  getExamResultsReportAction,
  getFinanceCollectionReportAction,
  getDefaultersReportAction,
  getProgrammeEnrolmentReportAction,
} from "@/lib/actions/reports";
import type {
  ReportFilterOptions,
  AttendanceSummaryItem,
  StudentAttendanceRegisterItem,
  ExamResultReportItem,
  FinanceCollectionReportData,
  DefaulterReportItem,
  ProgrammeEnrolmentReportItem,
} from "@/lib/dal/reportsRepository";

type ReportType =
  | "ATTENDANCE_SUMMARY"
  | "ATTENDANCE_REGISTER"
  | "EXAM_RESULTS"
  | "FINANCE_COLLECTION"
  | "STUDENT_DEFAULTERS"
  | "PROGRAMME_ENROLMENT";

// RFC 4180 CSV escaping helper
function toCsvCell(val: unknown): string {
  if (val === null || val === undefined) return '""';
  const str = String(val).replace(/"/g, '""');
  return `"${str}"`;
}

// Embedded SVG icon helper for zero-dependency reliability
function SvgIcon({ name, className = "w-4 h-4" }: { name: string; className?: string }) {
  switch (name) {
    case "table":
      return (
        <svg className={className} fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.8}>
          <path strokeLinecap="round" strokeLinejoin="round" d="M3.75 6A2.25 2.25 0 016 3.75h12A2.25 2.25 0 0120.25 6v12A2.25 2.25 0 0118 20.25H6A2.25 2.25 0 013.75 18V6zM3.75 10.5h16.5M3.75 15h16.5M9.75 3.75v16.5M14.25 3.75v16.5" />
        </svg>
      );
    case "download":
      return (
        <svg className={className} fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.8}>
          <path strokeLinecap="round" strokeLinejoin="round" d="M3 16.5v2.25A2.25 2.25 0 005.25 21h13.5A2.25 2.25 0 0021 18.5V16.5M16.5 12L12 16.5m0 0L7.5 12m4.5 4.5V3" />
        </svg>
      );
    case "refresh":
      return (
        <svg className={className} fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.8}>
          <path strokeLinecap="round" strokeLinejoin="round" d="M16.023 9.348h4.992v-.001M2.985 19.644v-4.992m0 0h4.992m-4.993 0l3.181 3.183a8.25 8.25 0 0013.803-3.7M4.031 9.865a8.25 8.25 0 0113.803-3.7l3.181 3.182m0-4.991v4.99" />
        </svg>
      );
    case "filter":
      return (
        <svg className={className} fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.8}>
          <path strokeLinecap="round" strokeLinejoin="round" d="M12 3c2.755 0 5.455.232 8.083.678.533.09.917.556.917 1.096v1.044a2.25 2.25 0 01-.659 1.591l-5.432 5.432a2.25 2.25 0 00-.659 1.591v2.927a2.25 2.25 0 01-1.244 2.013L9.75 21v-6.568a2.25 2.25 0 00-.659-1.591L3.659 7.409A2.25 2.25 0 013 5.818V4.774c0-.54.384-1.006.917-1.096A48.32 48.32 0 0112 3z" />
        </svg>
      );
    case "check":
      return (
        <svg className={className} fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
          <path strokeLinecap="round" strokeLinejoin="round" d="M4.5 12.75l6 6 9-13.5" />
        </svg>
      );
    case "alert":
      return (
        <svg className={className} fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.8}>
          <path strokeLinecap="round" strokeLinejoin="round" d="M12 9v3.75m-9.303 3.376c-.866 1.5.217 3.374 1.948 3.374h14.71c1.73 0 2.813-1.874 1.948-3.374L13.949 3.378c-.866-1.5-3.032-1.5-3.898 0L2.697 16.126zM12 15.75h.007v.008H12v-.008z" />
        </svg>
      );
    case "academic":
      return (
        <svg className={className} fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.8}>
          <path strokeLinecap="round" strokeLinejoin="round" d="M4.26 10.147a60.436 60.436 0 00-.491 6.347A48.627 48.627 0 0112 20.904a48.627 48.627 0 018.232-4.41 60.46 60.46 0 00-.491-6.347m-15.482 0a50.57 50.57 0 00-2.658-.813A59.905 59.905 0 0112 3.493a59.902 59.902 0 0110.399 5.84c-.896.248-1.783.52-2.658.814m-15.482 0A50.697 50.697 0 0112 13.489a50.702 50.702 0 017.74-3.342M6.75 15a.75.75 0 100-1.5.75.75 0 000 1.5zm0 0v-3.675A55.378 55.378 0 0112 8.443m-5.25 6.557q.276.082.556.16" />
        </svg>
      );
    case "x-circle":
      return (
        <svg className={className} fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.8}>
          <path strokeLinecap="round" strokeLinejoin="round" d="M9.75 9.75l4.5 4.5m0-4.5l-4.5 4.5M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
        </svg>
      );
    default:
      return (
        <svg className={className} fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.8}>
          <path strokeLinecap="round" strokeLinejoin="round" d="M19.5 14.25v-2.625a3.375 3.375 0 00-3.375-3.375h-1.5A1.125 1.125 0 0113.5 7.125v-1.5a3.375 3.375 0 00-3.375-3.375H8.25m0 12.75h7.5m-7.5 3H12M10.5 2.25H5.625c-.621 0-1.125.504-1.125 1.125v17.25c0 .621.504 1.125 1.125 1.125h12.75c.621 0 1.125-.504 1.125-1.125V11.25a9 9 0 00-9-9z" />
        </svg>
      );
  }
}

export default function ReportsView() {
  const [selectedReport, setSelectedReport] = useState<ReportType>("ATTENDANCE_SUMMARY");
  const [isPending, startTransition] = useTransition();

  // Filter selections
  const [programmeId, setProgrammeId] = useState<string>("all");
  const [semesterId, setSemesterId] = useState<string>("all");
  const [divisionId, setDivisionId] = useState<string>("all");
  const [examSessionId, setExamSessionId] = useState<string>("all");
  const [academicYearId, setAcademicYearId] = useState<string>("");

  // Metadata filter options
  const [filterOptions, setFilterOptions] = useState<ReportFilterOptions | null>(null);

  // Data states
  const [attendanceSummary, setAttendanceSummary] = useState<AttendanceSummaryItem[]>([]);
  const [attendanceRegister, setAttendanceRegister] = useState<StudentAttendanceRegisterItem[]>([]);
  const [examResults, setExamResults] = useState<ExamResultReportItem[]>([]);
  const [financeReport, setFinanceReport] = useState<FinanceCollectionReportData | null>(null);
  const [defaulters, setDefaulters] = useState<DefaulterReportItem[]>([]);
  const [programmeEnrolment, setProgrammeEnrolment] = useState<ProgrammeEnrolmentReportItem[]>([]);

  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [generatedAt, setGeneratedAt] = useState<Date>(new Date());

  // Check if any filter is active
  const isFiltered =
    programmeId !== "all" ||
    semesterId !== "all" ||
    divisionId !== "all" ||
    examSessionId !== "all";

  // Reset filters
  const handleResetFilters = () => {
    setProgrammeId("all");
    setSemesterId("all");
    setDivisionId("all");
    setExamSessionId("all");
  };

  // Change tab with clean filter reset to prevent empty-set trapped states
  const handleSelectTab = (tabId: ReportType) => {
    setSelectedReport(tabId);
    handleResetFilters();
  };

  // Initial load: Fetch filter options
  useEffect(() => {
    startTransition(async () => {
      try {
        const res = await getReportFilterOptionsAction();
        if (res.success && res.data) {
          setFilterOptions(res.data);
          if (res.data.academicYears.length > 0) {
            const currentYear = res.data.academicYears.find((y) => y.isCurrent) || res.data.academicYears[0];
            setAcademicYearId(currentYear.id);
          }
        }
      } catch (err: unknown) {
        setErrorMessage(err instanceof Error ? err.message : "Failed to load report filters.");
      }
    });
  }, []);

  // Filtered and disambiguated semester options
  const availableSemesters = React.useMemo(() => {
    if (!filterOptions) return [];
    if (!programmeId || programmeId === "all") {
      return filterOptions.semesters.map((s) => {
        const prog = filterOptions.programmes.find((p) => p.id === s.programmeId);
        return {
          ...s,
          label: prog ? `${prog.code} - Sem ${s.semesterNumber}` : `Sem ${s.semesterNumber}`,
        };
      });
    }
    return filterOptions.semesters
      .filter((s) => s.programmeId === programmeId)
      .map((s) => ({
        ...s,
        label: `Semester ${s.semesterNumber}`,
      }));
  }, [filterOptions, programmeId]);

  // Filtered and disambiguated division options
  const availableDivisions = React.useMemo(() => {
    if (!filterOptions) return [];
    if (!semesterId || semesterId === "all") {
      return filterOptions.divisions.map((d) => {
        const sem = filterOptions.semesters.find((s) => s.id === d.semesterId);
        const prog = sem ? filterOptions.programmes.find((p) => p.id === sem.programmeId) : null;
        return {
          ...d,
          label: prog && sem ? `${prog.code} S${sem.semesterNumber} - Div ${d.name}` : `Div ${d.name}`,
        };
      });
    }
    return filterOptions.divisions
      .filter((d) => d.semesterId === semesterId)
      .map((d) => ({
        ...d,
        label: `Division ${d.name}`,
      }));
  }, [filterOptions, semesterId]);

  // Fetch report data on report type or filter change
  const fetchReportData = React.useCallback(() => {
    setErrorMessage(null);
    startTransition(async () => {
      try {
        const params = {
          programmeId: programmeId !== "all" ? programmeId : undefined,
          semesterId: semesterId !== "all" ? semesterId : undefined,
          divisionId: divisionId !== "all" ? divisionId : undefined,
          examSessionId: examSessionId !== "all" ? examSessionId : undefined,
          academicYearId: academicYearId || undefined,
        };

        if (selectedReport === "ATTENDANCE_SUMMARY") {
          const res = await getAttendanceSummaryReportAction(params);
          if (res.success && res.data) setAttendanceSummary(res.data);
          else setErrorMessage(res.error || "Failed to fetch attendance summary.");
        } else if (selectedReport === "ATTENDANCE_REGISTER") {
          const res = await getStudentAttendanceRegisterAction(params);
          if (res.success && res.data) setAttendanceRegister(res.data);
          else setErrorMessage(res.error || "Failed to fetch student attendance register.");
        } else if (selectedReport === "EXAM_RESULTS") {
          const res = await getExamResultsReportAction(params);
          if (res.success && res.data) setExamResults(res.data);
          else setErrorMessage(res.error || "Failed to fetch exam results.");
        } else if (selectedReport === "FINANCE_COLLECTION") {
          const res = await getFinanceCollectionReportAction(params);
          if (res.success && res.data) setFinanceReport(res.data);
          else setErrorMessage(res.error || "Failed to fetch fee collection report.");
        } else if (selectedReport === "STUDENT_DEFAULTERS") {
          const res = await getDefaultersReportAction(params);
          if (res.success && res.data) setDefaulters(res.data);
          else setErrorMessage(res.error || "Failed to fetch defaulters report.");
        } else if (selectedReport === "PROGRAMME_ENROLMENT") {
          const res = await getProgrammeEnrolmentReportAction();
          if (res.success && res.data) setProgrammeEnrolment(res.data);
          else setErrorMessage(res.error || "Failed to fetch programme enrolment report.");
        }
        setGeneratedAt(new Date());
      } catch (err: unknown) {
        setErrorMessage(err instanceof Error ? err.message : "Failed to generate report.");
      }
    });
  }, [selectedReport, programmeId, semesterId, divisionId, examSessionId, academicYearId]);

  useEffect(() => {
    fetchReportData();
  }, [fetchReportData]);

  // Export to CSV helper with RFC 4180 escaping
  const handleExportCSV = () => {
    let csvContent = "";
    const filename = `CampusOS_${selectedReport}_${new Date().toISOString().slice(0, 10)}.csv`;

    if (selectedReport === "ATTENDANCE_SUMMARY") {
      csvContent = "Subject Code,Subject Title,Programme,Semester,Division,Faculty,Total Sessions,Total Marks Count,Present,Late,Absent,Excused,Avg Attendance Rate %\n";
      attendanceSummary.forEach((r) => {
        csvContent += `${toCsvCell(r.subjectCode)},${toCsvCell(r.subjectTitle)},${toCsvCell(r.programmeCode)},"Sem ${r.semesterNumber}",${toCsvCell(r.divisionName)},${toCsvCell(r.facultyName)},${r.totalSessions},${r.totalMarksCount},${r.presentCount},${r.lateCount},${r.absentCount},${r.excusedCount},"${r.averageAttendanceRate.toFixed(1)}%"\n`;
      });
    } else if (selectedReport === "ATTENDANCE_REGISTER") {
      csvContent = "Roll No,PRN,Student Name,Programme,Semester,Division,Sessions Held,Attended (Present+Late),Absent,Excused,Attendance %,Exam Eligibility (>=75% Ref)\n";
      attendanceRegister.forEach((r) => {
        const elig = r.totalSessionsHeld === 0 ? "NOT_EVALUATED" : r.isEligibleForExams ? "ELIGIBLE" : "SHORTAGE";
        csvContent += `${toCsvCell(r.rollNumber)},${toCsvCell(r.prn)},${toCsvCell(r.fullName)},${toCsvCell(r.programmeCode)},"Sem ${r.semesterNumber}",${toCsvCell(r.divisionName)},${r.totalSessionsHeld},${r.sessionsAttended},${r.sessionsAbsent},${r.sessionsExcused},"${r.attendancePercentage.toFixed(1)}%",${toCsvCell(elig)}\n`;
      });
    } else if (selectedReport === "EXAM_RESULTS") {
      csvContent = "Exam Session,Roll No,PRN,Student Name,Programme,Semester,Total Max Marks,Marks Obtained,Percentage,SGPA,Grade,Result Status,Approval Status\n";
      examResults.forEach((r) => {
        csvContent += `${toCsvCell(r.sessionCode)},${toCsvCell(r.rollNumber)},${toCsvCell(r.prn)},${toCsvCell(r.studentName)},${toCsvCell(r.programmeCode)},"Sem ${r.semesterNumber}",${r.totalMaxMarks},${r.totalMarksObtained ?? "N/A"},${r.percentage !== null ? `"${r.percentage.toFixed(1)}%"` : '"N/A"'},${r.sgpa ?? "N/A"},${toCsvCell(r.letterGrade ?? "N/A")},${toCsvCell(r.resultStatus)},${toCsvCell(r.approvalStatus)}\n`;
      });
    } else if (selectedReport === "FINANCE_COLLECTION") {
      csvContent = "Invoice No,Roll No,Student Name,Programme,Total Demand (INR),Paid Amount (INR),Outstanding Balance (INR),Status,Due Date,Receipts Count,Last Payment Date\n";
      if (financeReport) {
        financeReport.items.forEach((r) => {
          csvContent += `${toCsvCell(r.invoiceNumber)},${toCsvCell(r.rollNumber)},${toCsvCell(r.studentName)},${toCsvCell(r.programmeCode)},${r.totalDemand},${r.totalPaid},${r.outstandingBalance},${toCsvCell(r.status)},${toCsvCell(new Date(r.dueDate).toISOString().slice(0, 10))},${r.receiptCount},${toCsvCell(r.lastPaymentDate ? new Date(r.lastPaymentDate).toISOString().slice(0, 10) : "N/A")}\n`;
        });
      }
    } else if (selectedReport === "STUDENT_DEFAULTERS") {
      csvContent = "Roll No,Student Name,Programme,Semester,Total Demand (INR),Paid Amount (INR),Outstanding Balance (INR),Status,Guardian Name,Guardian Phone\n";
      defaulters.forEach((r) => {
        csvContent += `${toCsvCell(r.rollNumber)},${toCsvCell(r.fullName)},${toCsvCell(r.programmeCode)},${toCsvCell(r.semesterNumber ? `Sem ${r.semesterNumber}` : "N/A")},${r.totalDemand},${r.totalPaid},${r.outstandingBalance},${toCsvCell(r.status)},${toCsvCell(r.guardianName ?? "N/A")},${toCsvCell(r.guardianPhone ?? "N/A")}\n`;
      });
    } else if (selectedReport === "PROGRAMME_ENROLMENT") {
      csvContent = "Programme Code,Programme Name,Degree Level,Duration (Years),Total Semesters,Total Students,Active Enrolments,Male,Female,Other\n";
      programmeEnrolment.forEach((r) => {
        csvContent += `${toCsvCell(r.code)},${toCsvCell(r.name)},${toCsvCell(r.degreeLevel)},${r.durationYears},${r.totalSemesters},${r.totalEnrolled},${r.activeEnrolments},${r.maleCount},${r.femaleCount},${r.otherCount}\n`;
      });
    }

    const blob = new Blob([csvContent], { type: "text/csv;charset=utf-8;" });
    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.setAttribute("href", url);
    link.setAttribute("download", filename);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  return (
    <div className="space-y-6">
      {/* Top Header Card */}
      <div className="bg-white rounded-xl border border-slate-200 shadow-xs p-6">
        <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4">
          <div>
            <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-blue-50 border border-blue-200 text-[#1657D9] text-xs font-semibold mb-2">
              <SvgIcon name="academic" className="w-3.5 h-3.5" />
              Institutional Intelligence & Regulatory Compliance
            </div>
            <h1 className="text-2xl font-bold text-[#0B192C]">
              Institutional Reports & Analytics Register
            </h1>
            <p className="text-sm text-slate-500 mt-1">
              Live operational reports aggregated directly from institutional records across attendance, examinations, fee collections, and student cohorts.
            </p>
          </div>

          <div className="flex flex-wrap items-center gap-3">
            <button
              onClick={fetchReportData}
              disabled={isPending}
              className="inline-flex items-center gap-2 px-3.5 py-2 rounded-lg border border-slate-200 bg-white text-xs font-medium text-slate-700 hover:bg-slate-50 transition-colors shadow-2xs disabled:opacity-50"
            >
              <SvgIcon name="refresh" className={`w-3.5 h-3.5 ${isPending ? "animate-spin" : ""}`} />
              Generate / Refresh
            </button>
            <button
              onClick={handleExportCSV}
              disabled={isPending}
              className="inline-flex items-center gap-2 px-4 py-2 rounded-lg bg-[#1657D9] text-xs font-semibold text-white hover:bg-blue-700 transition-colors shadow-xs disabled:opacity-50"
            >
              <SvgIcon name="download" className="w-3.5 h-3.5" />
              Export CSV
            </button>
          </div>
        </div>

        {/* Tab Selection */}
        <div className="mt-6 flex flex-wrap gap-2 border-b border-slate-200 pb-3">
          {[
            { id: "ATTENDANCE_SUMMARY", label: "Attendance Summary", icon: "table" },
            { id: "ATTENDANCE_REGISTER", label: "Attendance Register", icon: "table" },
            { id: "EXAM_RESULTS", label: "Examination Gazette", icon: "table" },
            { id: "FINANCE_COLLECTION", label: "Fee Collections", icon: "table" },
            { id: "STUDENT_DEFAULTERS", label: "Fee Defaulters", icon: "alert" },
            { id: "PROGRAMME_ENROLMENT", label: "Programme Cohorts", icon: "academic" },
          ].map((tab) => (
            <button
              key={tab.id}
              onClick={() => handleSelectTab(tab.id as ReportType)}
              className={`inline-flex items-center gap-2 px-3.5 py-2 rounded-lg text-xs font-medium transition-all ${
                selectedReport === tab.id
                  ? "bg-[#071322] text-white shadow-xs"
                  : "bg-slate-50 text-slate-600 hover:bg-slate-100 hover:text-slate-900"
              }`}
            >
              <SvgIcon name={tab.icon} className="w-3.5 h-3.5" />
              {tab.label}
            </button>
          ))}
        </div>

        {/* Filter Controls Bar */}
        <div className="mt-4 pt-2 flex flex-wrap items-center gap-3 text-xs">
          <div className="flex items-center gap-1.5 text-slate-500 font-medium">
            <SvgIcon name="filter" className="w-3.5 h-3.5" />
            Filters:
          </div>

          {/* Programme Filter */}
          {selectedReport !== "PROGRAMME_ENROLMENT" && (
            <select
              value={programmeId}
              onChange={(e) => {
                setProgrammeId(e.target.value);
                setSemesterId("all");
                setDivisionId("all");
              }}
              className="bg-slate-50 border border-slate-200 rounded-lg px-2.5 py-1.5 text-slate-800 font-medium focus:outline-none focus:ring-1 focus:ring-blue-500"
            >
              <option value="all">All Programmes</option>
              {filterOptions?.programmes.map((p) => (
                <option key={p.id} value={p.id}>
                  {p.code} - {p.name}
                </option>
              ))}
            </select>
          )}

          {/* Semester Filter */}
          {(selectedReport === "ATTENDANCE_SUMMARY" ||
            selectedReport === "ATTENDANCE_REGISTER" ||
            selectedReport === "EXAM_RESULTS") && (
            <select
              value={semesterId}
              onChange={(e) => {
                setSemesterId(e.target.value);
                setDivisionId("all");
              }}
              className="bg-slate-50 border border-slate-200 rounded-lg px-2.5 py-1.5 text-slate-800 font-medium focus:outline-none focus:ring-1 focus:ring-blue-500"
            >
              <option value="all">All Semesters</option>
              {availableSemesters.map((s) => (
                <option key={s.id} value={s.id}>
                  {s.label}
                </option>
              ))}
            </select>
          )}

          {/* Division Filter */}
          {(selectedReport === "ATTENDANCE_SUMMARY" || selectedReport === "ATTENDANCE_REGISTER") && (
            <select
              value={divisionId}
              onChange={(e) => setDivisionId(e.target.value)}
              className="bg-slate-50 border border-slate-200 rounded-lg px-2.5 py-1.5 text-slate-800 font-medium focus:outline-none focus:ring-1 focus:ring-blue-500"
            >
              <option value="all">All Divisions</option>
              {availableDivisions.map((d) => (
                <option key={d.id} value={d.id}>
                  {d.label}
                </option>
              ))}
            </select>
          )}

          {/* Exam Session Filter */}
          {selectedReport === "EXAM_RESULTS" && (
            <select
              value={examSessionId}
              onChange={(e) => setExamSessionId(e.target.value)}
              className="bg-slate-50 border border-slate-200 rounded-lg px-2.5 py-1.5 text-slate-800 font-medium focus:outline-none focus:ring-1 focus:ring-blue-500"
            >
              <option value="all">All Exam Sessions</option>
              {filterOptions?.examSessions.map((es) => (
                <option key={es.id} value={es.id}>
                  {es.sessionCode} - {es.name}
                </option>
              ))}
            </select>
          )}

          {/* Reset Filters Action Button */}
          {isFiltered && (
            <button
              onClick={handleResetFilters}
              className="inline-flex items-center gap-1 px-2.5 py-1.5 rounded-lg bg-slate-100 hover:bg-slate-200 text-slate-700 font-medium transition-colors"
            >
              <SvgIcon name="x-circle" className="w-3.5 h-3.5" />
              Reset Filters
            </button>
          )}

          <div className="ml-auto text-slate-400 text-[11px]">
            Generated: {generatedAt.toLocaleTimeString("en-IN", { hour: "2-digit", minute: "2-digit", second: "2-digit" })}
          </div>
        </div>

        {/* Active Filter Summary Bar */}
        {isFiltered && (
          <div className="mt-3 pt-2 border-t border-slate-100 flex items-center gap-2 text-[11px] text-blue-700 font-medium">
            <span className="text-slate-500">Active Filter Scope:</span>
            {programmeId !== "all" && (
              <span className="px-2 py-0.5 rounded bg-blue-50 border border-blue-200">
                Programme: {filterOptions?.programmes.find((p) => p.id === programmeId)?.code || programmeId}
              </span>
            )}
            {semesterId !== "all" && (
              <span className="px-2 py-0.5 rounded bg-blue-50 border border-blue-200">
                Semester: {availableSemesters.find((s) => s.id === semesterId)?.label || semesterId}
              </span>
            )}
            {divisionId !== "all" && (
              <span className="px-2 py-0.5 rounded bg-blue-50 border border-blue-200">
                Division: {availableDivisions.find((d) => d.id === divisionId)?.label || divisionId}
              </span>
            )}
            {examSessionId !== "all" && (
              <span className="px-2 py-0.5 rounded bg-blue-50 border border-blue-200">
                Session: {filterOptions?.examSessions.find((es) => es.id === examSessionId)?.sessionCode || examSessionId}
              </span>
            )}
          </div>
        )}
      </div>

      {/* Error feedback banner */}
      {errorMessage && (
        <div className="p-4 rounded-xl bg-red-50 border border-red-200 text-red-700 text-xs flex items-center gap-2">
          <SvgIcon name="alert" className="w-4 h-4 shrink-0 text-red-500" />
          <span>{errorMessage}</span>
        </div>
      )}

      {/* Main Report Table Container */}
      <div className="bg-white rounded-xl border border-slate-200 shadow-xs overflow-hidden">
        {/* 1. ATTENDANCE SUMMARY TABLE */}
        {selectedReport === "ATTENDANCE_SUMMARY" && (
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs border-collapse">
              <thead>
                <tr className="bg-slate-100 text-slate-600 uppercase tracking-wider text-[11px] font-semibold">
                  <th className="py-3 px-4">Subject</th>
                  <th className="py-3 px-4">Programme & Cohort</th>
                  <th className="py-3 px-4">Faculty</th>
                  <th className="py-3 px-4 text-center">Sessions Held</th>
                  <th className="py-3 px-4 text-center">Present</th>
                  <th className="py-3 px-4 text-center">Late</th>
                  <th className="py-3 px-4 text-center">Absent</th>
                  <th className="py-3 px-4 text-center">Excused</th>
                  <th className="py-3 px-4 text-right">Avg Attendance Rate</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 text-slate-700">
                {attendanceSummary.length === 0 ? (
                  <tr>
                    <td colSpan={9} className="py-12 text-center text-slate-500">
                      <div className="font-semibold text-slate-700">No attendance records found for the selected scope.</div>
                      {isFiltered && (
                        <div className="mt-1 text-slate-400 text-xs">
                          Try resetting active filters to view all institutional records.
                        </div>
                      )}
                    </td>
                  </tr>
                ) : (
                  attendanceSummary.map((item, idx) => (
                    <tr key={`${item.subjectCode}_${item.divisionName}_${idx}`} className="hover:bg-slate-50 transition-colors">
                      <td className="py-3 px-4">
                        <span className="font-mono font-bold text-blue-700">{item.subjectCode}</span>
                        <div className="font-medium text-slate-900 mt-0.5">{item.subjectTitle}</div>
                      </td>
                      <td className="py-3 px-4">
                        <span className="font-semibold text-slate-900">{item.programmeCode}</span>
                        <div className="text-slate-500 text-[11px]">
                          Sem {item.semesterNumber} • Div {item.divisionName}
                        </div>
                      </td>
                      <td className="py-3 px-4 text-slate-700 font-medium">{item.facultyName}</td>
                      <td className="py-3 px-4 text-center font-bold text-slate-900">{item.totalSessions}</td>
                      <td className="py-3 px-4 text-center text-emerald-700 font-semibold">{item.presentCount}</td>
                      <td className="py-3 px-4 text-center text-amber-600 font-semibold">{item.lateCount}</td>
                      <td className="py-3 px-4 text-center text-red-600 font-semibold">{item.absentCount}</td>
                      <td className="py-3 px-4 text-center text-blue-600 font-semibold">{item.excusedCount}</td>
                      <td className="py-3 px-4 text-right">
                        <span
                          className={`inline-block px-2.5 py-0.5 rounded font-bold text-xs ${
                            item.averageAttendanceRate >= 75
                              ? "bg-emerald-50 text-emerald-700 border border-emerald-200"
                              : "bg-red-50 text-red-700 border border-red-200"
                          }`}
                        >
                          {item.averageAttendanceRate.toFixed(1)}%
                        </span>
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        )}

        {/* 2. ATTENDANCE REGISTER TABLE */}
        {selectedReport === "ATTENDANCE_REGISTER" && (
          <div className="space-y-2">
            <div className="overflow-x-auto">
              <table className="w-full text-left text-xs border-collapse">
                <thead>
                  <tr className="bg-slate-100 text-slate-600 uppercase tracking-wider text-[11px] font-semibold">
                    <th className="py-3 px-4">Roll No & PRN</th>
                    <th className="py-3 px-4">Student Name</th>
                    <th className="py-3 px-4">Programme & Cohort</th>
                    <th className="py-3 px-4 text-center">Sessions Held</th>
                    <th className="py-3 px-4 text-center">Attended (P+L)</th>
                    <th className="py-3 px-4 text-center">Absent</th>
                    <th className="py-3 px-4 text-center">Excused</th>
                    <th className="py-3 px-4 text-center">Attendance %</th>
                    <th className="py-3 px-4 text-right">Exam Eligibility</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100 text-slate-700">
                  {attendanceRegister.length === 0 ? (
                    <tr>
                      <td colSpan={9} className="py-12 text-center text-slate-500">
                        <div className="font-semibold text-slate-700">No student attendance records found for the selected scope.</div>
                        {isFiltered && (
                          <div className="mt-1 text-slate-400 text-xs">
                            Try resetting active filters to view all institutional records.
                          </div>
                        )}
                      </td>
                    </tr>
                  ) : (
                    attendanceRegister.map((s) => (
                      <tr key={s.studentId} className="hover:bg-slate-50 transition-colors">
                        <td className="py-3 px-4 font-mono font-bold text-slate-800">
                          <div>{s.rollNumber}</div>
                          <div className="text-[11px] text-slate-400 font-normal">{s.prn}</div>
                        </td>
                        <td className="py-3 px-4 font-semibold text-slate-900">{s.fullName}</td>
                        <td className="py-3 px-4 text-slate-600">
                          <span className="font-semibold text-slate-800">{s.programmeCode}</span>
                          <span className="text-[11px] text-slate-500"> • Sem {s.semesterNumber} ({s.divisionName})</span>
                        </td>
                        <td className="py-3 px-4 text-center font-bold text-slate-900">{s.totalSessionsHeld}</td>
                        <td className="py-3 px-4 text-center text-emerald-700 font-semibold">{s.sessionsAttended}</td>
                        <td className="py-3 px-4 text-center text-red-600 font-semibold">{s.sessionsAbsent}</td>
                        <td className="py-3 px-4 text-center text-blue-600 font-semibold">{s.sessionsExcused}</td>
                        <td className="py-3 px-4 text-center">
                          <span
                            className={`inline-block px-2 py-0.5 rounded font-bold text-xs ${
                              s.totalSessionsHeld === 0
                                ? "bg-slate-100 text-slate-600"
                                : s.attendancePercentage >= 75
                                ? "bg-emerald-50 text-emerald-700 border border-emerald-200"
                                : "bg-amber-50 text-amber-700 border border-amber-200"
                            }`}
                          >
                            {s.totalSessionsHeld === 0 ? "N/A" : `${s.attendancePercentage.toFixed(1)}%`}
                          </span>
                        </td>
                        <td className="py-3 px-4 text-right">
                          <span
                            className={`inline-block px-2.5 py-0.5 rounded-full font-bold text-[11px] ${
                              s.totalSessionsHeld === 0
                                ? "bg-slate-100 text-slate-600 border border-slate-200"
                                : s.isEligibleForExams
                                ? "bg-emerald-50 text-emerald-700 border border-emerald-200"
                                : "bg-red-50 text-red-700 border border-red-200"
                            }`}
                          >
                            {s.totalSessionsHeld === 0
                              ? "No Sessions Logged"
                              : s.isEligibleForExams
                              ? "Eligible (≥75% Ref)"
                              : "Shortage (<75% Ref)"}
                          </span>
                        </td>
                      </tr>
                    ))
                  )}
                </tbody>
              </table>
            </div>
            <div className="px-4 py-2 bg-slate-50 text-[11px] text-slate-500 border-t border-slate-200">
              * Note: The 75% attendance benchmark is a reference calculation guideline and subject to formal institutional/programme regulations verification.
            </div>
          </div>
        )}

        {/* 3. EXAM RESULTS GAZETTE */}
        {selectedReport === "EXAM_RESULTS" && (
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs border-collapse">
              <thead>
                <tr className="bg-slate-100 text-slate-600 uppercase tracking-wider text-[11px] font-semibold">
                  <th className="py-3 px-4">Session</th>
                  <th className="py-3 px-4">Roll No & Student</th>
                  <th className="py-3 px-4">Programme & Sem</th>
                  <th className="py-3 px-4 text-center">Max Marks</th>
                  <th className="py-3 px-4 text-center">Obtained</th>
                  <th className="py-3 px-4 text-center">Percentage</th>
                  <th className="py-3 px-4 text-center">SGPA</th>
                  <th className="py-3 px-4 text-center">Grade</th>
                  <th className="py-3 px-4 text-center">Status</th>
                  <th className="py-3 px-4 text-right">Approval State</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 text-slate-700">
                {examResults.length === 0 ? (
                  <tr>
                    <td colSpan={10} className="py-12 text-center text-slate-500">
                      <div className="font-semibold text-slate-700">No examination marks or results found for the selected scope.</div>
                      {isFiltered && (
                        <div className="mt-1 text-slate-400 text-xs">
                          Try resetting active filters to view all institutional records.
                        </div>
                      )}
                    </td>
                  </tr>
                ) : (
                  examResults.map((e) => (
                    <tr key={e.resultId} className="hover:bg-slate-50 transition-colors">
                      <td className="py-3 px-4 font-mono font-bold text-blue-700">
                        {e.sessionCode}
                      </td>
                      <td className="py-3 px-4">
                        <span className="font-mono font-bold text-slate-800">{e.rollNumber}</span>
                        <div className="font-semibold text-slate-900">{e.studentName}</div>
                      </td>
                      <td className="py-3 px-4 text-slate-600">
                        <span className="font-semibold text-slate-800">{e.programmeCode}</span>
                        <div className="text-[11px] text-slate-500">Sem {e.semesterNumber}</div>
                      </td>
                      <td className="py-3 px-4 text-center font-bold text-slate-900">{e.totalMaxMarks}</td>
                      <td className="py-3 px-4 text-center font-bold text-slate-900">
                        {e.totalMarksObtained !== null ? e.totalMarksObtained : "—"}
                      </td>
                      <td className="py-3 px-4 text-center font-semibold text-slate-800">
                        {e.percentage !== null ? `${e.percentage.toFixed(1)}%` : "—"}
                      </td>
                      <td className="py-3 px-4 text-center font-bold text-[#1657D9]">
                        {e.sgpa !== null ? e.sgpa.toFixed(2) : "—"}
                      </td>
                      <td className="py-3 px-4 text-center font-bold text-slate-800">
                        {e.letterGrade || "—"}
                      </td>
                      <td className="py-3 px-4 text-center">
                        <span
                          className={`inline-block px-2.5 py-0.5 rounded-full text-[11px] font-bold ${
                            e.resultStatus === "PASSED"
                              ? "bg-emerald-50 text-emerald-700 border border-emerald-200"
                              : e.resultStatus === "ATKT"
                              ? "bg-amber-50 text-amber-700 border border-amber-200"
                              : "bg-red-50 text-red-700 border border-red-200"
                          }`}
                        >
                          {e.resultStatus}
                        </span>
                      </td>
                      <td className="py-3 px-4 text-right">
                        <span
                          className={`inline-block px-2 py-0.5 rounded text-[10px] font-bold ${
                            e.approvalStatus === "PUBLISHED"
                              ? "bg-blue-50 text-blue-700 border border-blue-200"
                              : "bg-amber-50 text-amber-800 border border-amber-200"
                          }`}
                        >
                          {e.approvalStatus === "PUBLISHED" ? "PUBLISHED" : "PROVISIONAL / DRAFT"}
                        </span>
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        )}

        {/* 4. FINANCE COLLECTION REPORT */}
        {selectedReport === "FINANCE_COLLECTION" && (
          <div className="space-y-4">
            {financeReport && (
              <div className="p-4 bg-slate-50/70 border-b border-slate-200 grid grid-cols-2 sm:grid-cols-4 gap-4">
                <div className="bg-white p-3 rounded-lg border border-slate-200 shadow-2xs">
                  <div className="text-[11px] font-semibold text-slate-500 uppercase">Total Demand</div>
                  <div className="text-base font-bold text-[#0B192C] mt-0.5">
                    ₹{financeReport.summary.totalDemand.toLocaleString("en-IN")}
                  </div>
                </div>
                <div className="bg-white p-3 rounded-lg border border-slate-200 shadow-2xs">
                  <div className="text-[11px] font-semibold text-slate-500 uppercase">Total Collected</div>
                  <div className="text-base font-bold text-emerald-700 mt-0.5">
                    ₹{financeReport.summary.totalPaid.toLocaleString("en-IN")}
                  </div>
                </div>
                <div className="bg-white p-3 rounded-lg border border-slate-200 shadow-2xs">
                  <div className="text-[11px] font-semibold text-slate-500 uppercase">Outstanding Balance</div>
                  <div className="text-base font-bold text-red-600 mt-0.5">
                    ₹{financeReport.summary.outstanding.toLocaleString("en-IN")}
                  </div>
                </div>
                <div className="bg-white p-3 rounded-lg border border-slate-200 shadow-2xs">
                  <div className="text-[11px] font-semibold text-slate-500 uppercase">Collection Efficiency</div>
                  <div className="text-base font-bold text-blue-700 mt-0.5">
                    {financeReport.summary.collectionRate.toFixed(1)}%
                  </div>
                </div>
              </div>
            )}

            {/* Payment Method Distribution Breakdown */}
            {financeReport && financeReport.summary.paymentMethodDistribution.length > 0 && (
              <div className="px-4 py-3 bg-slate-50/50 border-b border-slate-200">
                <div className="text-[11px] font-semibold text-slate-600 uppercase tracking-wider mb-2">
                  Payment Method Distribution (Receipts Ledger)
                </div>
                <div className="flex flex-wrap gap-2">
                  {financeReport.summary.paymentMethodDistribution.map((pm) => (
                    <div
                      key={pm.paymentMethod}
                      className="inline-flex items-center gap-2 px-3 py-1.5 rounded-lg bg-white border border-slate-200 shadow-2xs text-xs"
                    >
                      <span className="font-semibold text-slate-800">{pm.paymentMethod}</span>
                      <span className="text-slate-400">•</span>
                      <span className="font-bold text-emerald-700">₹{pm.totalCollected.toLocaleString("en-IN")}</span>
                      <span className="text-[10px] text-slate-500 font-medium">({pm.receiptCount} {pm.receiptCount === 1 ? "receipt" : "receipts"})</span>
                    </div>
                  ))}
                </div>
              </div>
            )}

            <div className="overflow-x-auto">
              <table className="w-full text-left text-xs border-collapse">
                <thead>
                  <tr className="bg-slate-100 text-slate-600 uppercase tracking-wider text-[11px] font-semibold">
                    <th className="py-3 px-4">Invoice No</th>
                    <th className="py-3 px-4">Student</th>
                    <th className="py-3 px-4">Programme</th>
                    <th className="py-3 px-4 text-right">Total Demand</th>
                    <th className="py-3 px-4 text-right">Paid</th>
                    <th className="py-3 px-4 text-right">Outstanding</th>
                    <th className="py-3 px-4">Due Date</th>
                    <th className="py-3 px-4 text-center">Receipts</th>
                    <th className="py-3 px-4 text-right">Status</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100 text-slate-700">
                  {!financeReport || financeReport.items.length === 0 ? (
                    <tr>
                      <td colSpan={9} className="py-12 text-center text-slate-500">
                        <div className="font-semibold text-slate-700">No financial invoices found for the selected scope.</div>
                        {isFiltered && (
                          <div className="mt-1 text-slate-400 text-xs">
                            Try resetting active filters to view all institutional records.
                          </div>
                        )}
                      </td>
                    </tr>
                  ) : (
                    financeReport.items.map((inv) => (
                      <tr key={inv.invoiceId} className="hover:bg-slate-50 transition-colors">
                        <td className="py-3 px-4 font-mono font-bold text-blue-700">{inv.invoiceNumber}</td>
                        <td className="py-3 px-4">
                          <span className="font-semibold text-slate-900">{inv.studentName}</span>
                          <div className="text-[11px] font-mono text-slate-500">{inv.rollNumber}</div>
                        </td>
                        <td className="py-3 px-4 text-slate-600 font-medium">{inv.programmeCode}</td>
                        <td className="py-3 px-4 text-right font-bold text-slate-900">
                          ₹{inv.totalDemand.toLocaleString("en-IN")}
                        </td>
                        <td className="py-3 px-4 text-right text-emerald-700 font-semibold">
                          ₹{inv.totalPaid.toLocaleString("en-IN")}
                        </td>
                        <td className="py-3 px-4 text-right text-red-600 font-semibold">
                          ₹{inv.outstandingBalance.toLocaleString("en-IN")}
                        </td>
                        <td className="py-3 px-4 text-slate-600">
                          {new Date(inv.dueDate).toLocaleDateString("en-IN")}
                        </td>
                        <td className="py-3 px-4 text-center font-bold text-slate-700">{inv.receiptCount}</td>
                        <td className="py-3 px-4 text-right">
                          <span
                            className={`inline-block px-2.5 py-0.5 rounded-full text-[11px] font-bold ${
                              inv.status === "PAID"
                                ? "bg-emerald-50 text-emerald-700 border border-emerald-200"
                                : inv.status === "PARTIALLY_PAID"
                                ? "bg-amber-50 text-amber-700 border border-amber-200"
                                : "bg-red-50 text-red-700 border border-red-200"
                            }`}
                          >
                            {inv.status}
                          </span>
                        </td>
                      </tr>
                    ))
                  )}
                </tbody>
              </table>
            </div>
          </div>
        )}

        {/* 5. DEFAULTERS REGISTER */}
        {selectedReport === "STUDENT_DEFAULTERS" && (
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs border-collapse">
              <thead>
                <tr className="bg-slate-100 text-slate-600 uppercase tracking-wider text-[11px] font-semibold">
                  <th className="py-3 px-4">Roll No</th>
                  <th className="py-3 px-4">Student Name</th>
                  <th className="py-3 px-4">Programme & Sem</th>
                  <th className="py-3 px-4 text-right">Total Demand</th>
                  <th className="py-3 px-4 text-right">Paid Amount</th>
                  <th className="py-3 px-4 text-right">Outstanding Dues</th>
                  <th className="py-3 px-4">Guardian Contact</th>
                  <th className="py-3 px-4 text-right">Invoice Status</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 text-slate-700">
                {defaulters.length === 0 ? (
                  <tr>
                    <td colSpan={8} className="py-12 text-center text-slate-500">
                      <div className="flex flex-col items-center justify-center">
                        <div className="flex h-10 w-10 items-center justify-center rounded-full bg-emerald-100 text-emerald-600 mb-2">
                          <SvgIcon name="check" className="w-5 h-5" />
                        </div>
                        <div className="text-sm font-bold text-slate-800">Zero Fee Defaulters Found</div>
                        <div className="text-xs text-slate-400 mt-1 max-w-sm">
                          All billed student fee invoices are currently fully cleared (100% collection efficiency). No overdue defaulters exist in the current institutional cohort.
                        </div>
                      </div>
                    </td>
                  </tr>
                ) : (
                  defaulters.map((d) => (
                    <tr key={d.studentId} className="hover:bg-slate-50 transition-colors">
                      <td className="py-3 px-4 font-mono font-bold text-slate-800">{d.rollNumber}</td>
                      <td className="py-3 px-4 font-semibold text-slate-900">{d.fullName}</td>
                      <td className="py-3 px-4 text-slate-600">
                        <span className="font-semibold text-slate-800">{d.programmeCode}</span>
                        {d.semesterNumber && <span className="text-[11px] text-slate-500"> • Sem {d.semesterNumber}</span>}
                      </td>
                      <td className="py-3 px-4 text-right text-slate-700">₹{d.totalDemand.toLocaleString("en-IN")}</td>
                      <td className="py-3 px-4 text-right text-emerald-700 font-semibold">₹{d.totalPaid.toLocaleString("en-IN")}</td>
                      <td className="py-3 px-4 text-right font-bold text-red-600">₹{d.outstandingBalance.toLocaleString("en-IN")}</td>
                      <td className="py-3 px-4 text-slate-600">
                        <div className="font-medium text-slate-800">{d.guardianName || "N/A"}</div>
                        <div className="text-[11px] font-mono text-slate-500">{d.guardianPhone || "No contact"}</div>
                      </td>
                      <td className="py-3 px-4 text-right">
                        <span className="inline-block px-2.5 py-0.5 rounded-full text-xs font-bold bg-amber-100 text-amber-800">
                          {d.status}
                        </span>
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        )}

        {/* 6. PROGRAMME ENROLMENT COHORT MATRIX */}
        {selectedReport === "PROGRAMME_ENROLMENT" && (
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs border-collapse">
              <thead>
                <tr className="bg-slate-100 text-slate-600 uppercase tracking-wider text-[11px] font-semibold">
                  <th className="py-3 px-4">Code</th>
                  <th className="py-3 px-4">Programme Title</th>
                  <th className="py-3 px-4">Degree Level</th>
                  <th className="py-3 px-4 text-center">Duration</th>
                  <th className="py-3 px-4 text-center">Total Semesters</th>
                  <th className="py-3 px-4 text-center font-bold">Total Students</th>
                  <th className="py-3 px-4 text-center font-bold text-blue-700">Active Enrolments</th>
                  <th className="py-3 px-4 text-center">Male</th>
                  <th className="py-3 px-4 text-center">Female</th>
                  <th className="py-3 px-4 text-right">Other</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 text-slate-700">
                {programmeEnrolment.length === 0 ? (
                  <tr>
                    <td colSpan={10} className="py-12 text-center text-slate-400">
                      No programme enrolment data found.
                    </td>
                  </tr>
                ) : (
                  programmeEnrolment.map((prog) => (
                    <tr key={prog.programmeId} className="hover:bg-slate-50 transition-colors">
                      <td className="py-3 px-4 font-mono font-bold text-blue-700">{prog.code}</td>
                      <td className="py-3 px-4 font-semibold text-slate-900">{prog.name}</td>
                      <td className="py-3 px-4 text-slate-600">{prog.degreeLevel}</td>
                      <td className="py-3 px-4 text-center text-slate-700">{prog.durationYears} Years</td>
                      <td className="py-3 px-4 text-center text-slate-700">{prog.totalSemesters}</td>
                      <td className="py-3 px-4 text-center font-bold text-[#0B192C]">
                        {prog.totalEnrolled}
                      </td>
                      <td className="py-3 px-4 text-center font-bold text-blue-700">
                        {prog.activeEnrolments}
                      </td>
                      <td className="py-3 px-4 text-center text-slate-700">{prog.maleCount}</td>
                      <td className="py-3 px-4 text-center text-slate-700">{prog.femaleCount}</td>
                      <td className="py-3 px-4 text-right text-slate-500">{prog.otherCount}</td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  );
}
