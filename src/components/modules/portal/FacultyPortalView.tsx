"use client";

import React, { useState, useEffect, useTransition } from "react";
import { useSearchParams, useRouter } from "next/navigation";
import { Icon } from "@/components/common/Icon";
import {
  FacultySelfProfileDTO,
  FacultyTeachingAssignmentDTO,
  FacultyTimetableEntryDTO,
  FacultyClassRosterDTO,
  FacultyAttendanceSessionDTO,
  getFacultySelfTeachingAssignments,
  getFacultySelfTimetable,
  getFacultyClassRoster,
  getFacultyAttendanceSessions,
} from "@/lib/actions/portalFaculty";

interface FacultyPortalViewProps {
  initialProfile: FacultySelfProfileDTO;
}

type TabType =
  | "overview"
  | "classes"
  | "timetable"
  | "roster"
  | "attendance"
  | "curriculum";

export const FacultyPortalView: React.FC<FacultyPortalViewProps> = ({ initialProfile }) => {
  const router = useRouter();
  const searchParams = useSearchParams();
  const initialTab = (searchParams.get("tab") as TabType) || "overview";

  const [activeTab, setActiveTab] = useState<TabType>(initialTab);
  const [profile] = useState<FacultySelfProfileDTO>(initialProfile);

  // Teaching Assignments state
  const [assignments, setAssignments] = useState<FacultyTeachingAssignmentDTO[] | null>(null);
  const [isLoadingAssignments, setIsLoadingAssignments] = useState<boolean>(false);
  const [assignmentsError, setAssignmentsError] = useState<string | null>(null);

  // Timetable state
  const [timetable, setTimetable] = useState<FacultyTimetableEntryDTO[] | null>(null);
  const [isLoadingTimetable, setIsLoadingTimetable] = useState<boolean>(false);
  const [timetableError, setTimetableError] = useState<string | null>(null);

  // Class Roster state
  const [selectedAssignmentId, setSelectedAssignmentId] = useState<string | null>(null);
  const [roster, setRoster] = useState<FacultyClassRosterDTO | null>(null);
  const [isLoadingRoster, setIsLoadingRoster] = useState<boolean>(false);
  const [rosterError, setRosterError] = useState<string | null>(null);

  // Attendance Sessions state (Read-only in Workstream 2)
  const [attendanceSessions, setAttendanceSessions] = useState<FacultyAttendanceSessionDTO[] | null>(null);
  const [isLoadingAttendance, setIsLoadingAttendance] = useState<boolean>(false);
  const [attendanceError, setAttendanceError] = useState<string | null>(null);
  const [attendanceFilter, setAttendanceFilter] = useState<"ALL" | "FINALIZED" | "DRAFT">("ALL");

  const [, startTransition] = useTransition();

  // Synchronize tab changes with URL query string
  const handleTabChange = (tab: TabType) => {
    setActiveTab(tab);
    startTransition(() => {
      const url = new URL(window.location.href);
      url.searchParams.set("tab", tab);
      router.replace(url.pathname + url.search, { scroll: false });
    });

    // Lazy load data on tab change if not already fetched
    if (tab === "classes" && !assignments && !isLoadingAssignments) {
      loadTeachingAssignments();
    }
    if (tab === "timetable" && !timetable && !isLoadingTimetable) {
      loadTimetable();
    }
    if (tab === "roster" && !assignments && !isLoadingAssignments) {
      loadTeachingAssignments();
    }
    if (tab === "attendance" && !attendanceSessions && !isLoadingAttendance) {
      loadAttendanceSessions();
    }
    if (tab === "curriculum" && !assignments && !isLoadingAssignments) {
      loadTeachingAssignments();
    }
  };

  // Helper functions for data fetching
  const loadTeachingAssignments = async () => {
    setIsLoadingAssignments(true);
    setAssignmentsError(null);
    try {
      const res = await getFacultySelfTeachingAssignments();
      if (res.success && res.data) {
        setAssignments(res.data);
        if (res.data.length > 0 && !selectedAssignmentId) {
          setSelectedAssignmentId(res.data[0].id);
          loadClassRoster(res.data[0].id);
        }
      } else {
        setAssignmentsError(res.error || "Failed to load teaching assignments.");
      }
    } catch (err: unknown) {
      setAssignmentsError(err instanceof Error ? err.message : "Network error");
    } finally {
      setIsLoadingAssignments(false);
    }
  };

  const loadTimetable = async () => {
    setIsLoadingTimetable(true);
    setTimetableError(null);
    try {
      const res = await getFacultySelfTimetable();
      if (res.success && res.data) {
        setTimetable(res.data);
      } else {
        setTimetableError(res.error || "Failed to load faculty timetable.");
      }
    } catch (err: unknown) {
      setTimetableError(err instanceof Error ? err.message : "Network error");
    } finally {
      setIsLoadingTimetable(false);
    }
  };

  const loadClassRoster = async (assignmentId: string) => {
    setIsLoadingRoster(true);
    setRosterError(null);
    try {
      const res = await getFacultyClassRoster(assignmentId);
      if (res.success && res.data) {
        setRoster(res.data);
      } else {
        setRosterError(res.error || "Failed to load class roster.");
      }
    } catch (err: unknown) {
      setRosterError(err instanceof Error ? err.message : "Network error");
    } finally {
      setIsLoadingRoster(false);
    }
  };

  const loadAttendanceSessions = async () => {
    setIsLoadingAttendance(true);
    setAttendanceError(null);
    try {
      const res = await getFacultyAttendanceSessions();
      if (res.success && res.data) {
        setAttendanceSessions(res.data);
      } else {
        setAttendanceError(res.error || "Failed to load attendance session history.");
      }
    } catch (err: unknown) {
      setAttendanceError(err instanceof Error ? err.message : "Network error");
    } finally {
      setIsLoadingAttendance(false);
    }
  };

  // Preload assignments if starting on a tab that requires them
  useEffect(() => {
    if (initialTab === "classes" || initialTab === "roster" || initialTab === "curriculum") {
      loadTeachingAssignments();
    } else if (initialTab === "timetable") {
      loadTimetable();
    } else if (initialTab === "attendance") {
      loadAttendanceSessions();
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const { staff, workloadSummary } = profile;

  // Filter attendance sessions by status
  const filteredAttendance = attendanceSessions?.filter((s) => {
    if (attendanceFilter === "ALL") return true;
    return s.status === attendanceFilter;
  });

  return (
    <div className="space-y-6">
      {/* =========================================================================
          FACULTY PROFILE HEADER BANNER (Editorial Dark Navy #0B1928 with Badges)
          ========================================================================= */}
      <div className="relative overflow-hidden rounded-2xl bg-gradient-to-r from-[#071322] via-[#0B1928] to-[#122842] text-white p-6 sm:p-8 shadow-sm border border-slate-800">
        <div className="relative z-10 flex flex-col md:flex-row md:items-center justify-between gap-6">
          <div className="flex items-start sm:items-center space-x-4 sm:space-x-5">
            {/* Faculty Avatar Initial Box */}
            <div className="h-16 w-16 sm:h-18 sm:w-18 rounded-2xl bg-gradient-to-tr from-[#1657D9] to-blue-500 text-white flex items-center justify-center font-bold text-2xl sm:text-3xl shadow-md border-2 border-white/20 shrink-0">
              {staff.fullName.replace("Prof. ", "").charAt(0)}
            </div>

            <div className="space-y-1">
              <div className="flex flex-wrap items-center gap-2">
                <h1 className="text-xl sm:text-2xl font-bold tracking-tight text-white">
                  {staff.fullName}
                </h1>
                <span className="inline-flex items-center px-2 py-0.5 rounded text-[11px] font-semibold bg-emerald-500/20 text-emerald-300 border border-emerald-500/30">
                  <span className="h-1.5 w-1.5 rounded-full bg-emerald-400 mr-1.5 animate-pulse" />
                  {staff.status}
                </span>
                <span className="inline-flex items-center px-2 py-0.5 rounded text-[11px] font-medium bg-blue-500/20 text-blue-200 border border-blue-400/30">
                  {staff.category}
                </span>
              </div>

              <p className="text-sm text-slate-300 font-medium">
                {staff.designation} • {staff.department ? `${staff.department.name} (${staff.department.code})` : "Academic Department"}
              </p>

              <div className="flex flex-wrap items-center gap-x-4 gap-y-1 text-xs text-slate-400 pt-0.5">
                <span className="flex items-center space-x-1">
                  <span className="text-slate-500 font-mono">ID:</span>
                  <strong className="text-slate-200 font-mono">{staff.employeeId}</strong>
                </span>
                <span className="text-slate-600">•</span>
                <span className="flex items-center space-x-1">
                  <Icon name="briefcase" className="h-3.5 w-3.5 text-slate-400" />
                  <span>{staff.officeLocation || "Faculty Chambers, Main Block"}</span>
                </span>
                <span className="text-slate-600">•</span>
                <span className="flex items-center space-x-1">
                  <span className="text-slate-500">Email:</span>
                  <strong className="text-slate-200">{staff.email}</strong>
                </span>
              </div>
            </div>
          </div>

          {/* Quick Stat Pill in Banner */}
          <div className="hidden lg:flex flex-col items-end justify-center pl-6 border-l border-white/10 text-right space-y-1">
            <span className="text-xs text-slate-400 font-medium">Official Contact Load</span>
            <div className="flex items-baseline space-x-1.5">
              <span className="text-2xl font-bold text-white tracking-tight">{workloadSummary.prescribedWeeklyHours}</span>
              <span className="text-xs text-blue-300 font-medium">Hrs / Week</span>
            </div>
            <span className="text-[10px] text-slate-400">Curricular teaching target</span>
          </div>
        </div>

        {/* Tab Navigation Pill Bar */}
        <div className="mt-6 pt-5 border-t border-white/10 flex items-center space-x-1 sm:space-x-2 overflow-x-auto no-scrollbar">
          {[
            { id: "overview", label: "Overview & Workload", icon: "dashboard" },
            { id: "classes", label: "My Teaching & Classes", icon: "book-open" },
            { id: "timetable", label: "Weekly Schedule", icon: "calendar" },
            { id: "roster", label: "Class Rosters", icon: "user-group" },
            { id: "attendance", label: "Attendance History", icon: "clipboard-check" },
            { id: "curriculum", label: "Course Specifications", icon: "academic-cap" },
          ].map((tab) => {
            const isActive = activeTab === tab.id;
            return (
              <button
                key={tab.id}
                onClick={() => handleTabChange(tab.id as TabType)}
                className={`flex items-center space-x-2 px-3.5 py-2 rounded-xl text-xs font-medium transition-all whitespace-nowrap cursor-pointer ${
                  isActive
                    ? "bg-[#1657D9] text-white shadow-sm font-semibold"
                    : "text-slate-300 hover:bg-white/10 hover:text-white"
                }`}
              >
                <Icon
                  name={tab.icon}
                  className={`h-4 w-4 shrink-0 ${isActive ? "text-white" : "text-slate-400"}`}
                />
                <span>{tab.label}</span>
              </button>
            );
          })}
        </div>
      </div>

      {/* =========================================================================
          TAB 1: OVERVIEW & WORKLOAD
          ========================================================================= */}
      {activeTab === "overview" && (
        <div className="space-y-6">
          {/* Workload Metric Cards (4 Grid) */}
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
            <div className="bg-white rounded-xl border border-slate-200/80 p-5 shadow-xs">
              <div className="flex items-center justify-between text-slate-500 mb-2">
                <span className="text-xs font-semibold uppercase tracking-wider">Assigned Classes</span>
                <div className="h-8 w-8 rounded-lg bg-blue-50 text-[#1657D9] flex items-center justify-center">
                  <Icon name="book-open" className="h-4 w-4" />
                </div>
              </div>
              <div className="flex items-baseline space-x-2">
                <span className="text-2xl font-bold text-slate-900 tracking-tight">
                  {workloadSummary.activeAssignmentsCount}
                </span>
                <span className="text-xs text-slate-500 font-medium">Class Section</span>
              </div>
              <p className="text-[11px] text-slate-400 mt-1">Official teaching assignments</p>
            </div>

            <div className="bg-white rounded-xl border border-slate-200/80 p-5 shadow-xs">
              <div className="flex items-center justify-between text-slate-500 mb-2">
                <span className="text-xs font-semibold uppercase tracking-wider">Prescribed Hours</span>
                <div className="h-8 w-8 rounded-lg bg-indigo-50 text-indigo-600 flex items-center justify-center">
                  <Icon name="clock" className="h-4 w-4" />
                </div>
              </div>
              <div className="flex items-baseline space-x-2">
                <span className="text-2xl font-bold text-slate-900 tracking-tight">
                  {workloadSummary.prescribedWeeklyHours}
                </span>
                <span className="text-xs text-slate-500 font-medium">Hours / Week</span>
              </div>
              <p className="text-[11px] text-slate-400 mt-1">Curricular contact target</p>
            </div>

            <div className="bg-white rounded-xl border border-slate-200/80 p-5 shadow-xs">
              <div className="flex items-center justify-between text-slate-500 mb-2">
                <span className="text-xs font-semibold uppercase tracking-wider">Scheduled Timetable</span>
                <div className="h-8 w-8 rounded-lg bg-emerald-50 text-emerald-600 flex items-center justify-center">
                  <Icon name="calendar" className="h-4 w-4" />
                </div>
              </div>
              <div className="flex items-baseline space-x-2">
                <span className="text-2xl font-bold text-slate-900 tracking-tight">
                  {workloadSummary.scheduledTimetableHours}
                </span>
                <span className="text-xs text-slate-500 font-medium">Hours / Week</span>
              </div>
              <p className="text-[11px] text-slate-400 mt-1">Published active slots</p>
            </div>

            <div className="bg-white rounded-xl border border-slate-200/80 p-5 shadow-xs">
              <div className="flex items-center justify-between text-slate-500 mb-2">
                <span className="text-xs font-semibold uppercase tracking-wider">Attendance Logged</span>
                <div className="h-8 w-8 rounded-lg bg-purple-50 text-purple-600 flex items-center justify-center">
                  <Icon name="clipboard-check" className="h-4 w-4" />
                </div>
              </div>
              <div className="flex items-baseline space-x-2">
                <span className="text-2xl font-bold text-slate-900 tracking-tight">
                  {workloadSummary.totalRecordedSessionsCount}
                </span>
                <span className="text-xs text-slate-500 font-medium">Sessions</span>
              </div>
              <p className="text-[11px] text-slate-400 mt-1">Total roll-call records</p>
            </div>
          </div>

          {/* Quick Jump Action Banners */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <button
              onClick={() => handleTabChange("classes")}
              className="text-left bg-white rounded-xl border border-slate-200/80 p-5 shadow-xs hover:border-[#1657D9]/50 hover:shadow-sm transition-all group cursor-pointer"
            >
              <div className="flex items-center justify-between mb-3">
                <div className="h-10 w-10 rounded-xl bg-blue-50 text-[#1657D9] flex items-center justify-center group-hover:scale-105 transition-transform">
                  <Icon name="book-open" className="h-5 w-5" />
                </div>
                <Icon name="arrow-right" className="h-4 w-4 text-slate-300 group-hover:text-[#1657D9] transition-colors" />
              </div>
              <h2 className="text-sm font-bold text-slate-900 group-hover:text-[#1657D9] transition-colors">
                My Teaching & Classes
              </h2>
              <p className="text-xs text-slate-500 mt-1">
                View your assigned subjects, student cohorts, divisions, and prescribed syllabus contact hours.
              </p>
            </button>

            <button
              onClick={() => handleTabChange("timetable")}
              className="text-left bg-white rounded-xl border border-slate-200/80 p-5 shadow-xs hover:border-[#1657D9]/50 hover:shadow-sm transition-all group cursor-pointer"
            >
              <div className="flex items-center justify-between mb-3">
                <div className="h-10 w-10 rounded-xl bg-emerald-50 text-emerald-600 flex items-center justify-center group-hover:scale-105 transition-transform">
                  <Icon name="calendar" className="h-5 w-5" />
                </div>
                <Icon name="arrow-right" className="h-4 w-4 text-slate-300 group-hover:text-emerald-600 transition-colors" />
              </div>
              <h2 className="text-sm font-bold text-slate-900 group-hover:text-emerald-600 transition-colors">
                Weekly Class Schedule
              </h2>
              <p className="text-xs text-slate-500 mt-1">
                Inspect your day-by-day timetable matrix, assigned lecture halls, training labs, and timing slots.
              </p>
            </button>

            <button
              onClick={() => handleTabChange("roster")}
              className="text-left bg-white rounded-xl border border-slate-200/80 p-5 shadow-xs hover:border-[#1657D9]/50 hover:shadow-sm transition-all group cursor-pointer"
            >
              <div className="flex items-center justify-between mb-3">
                <div className="h-10 w-10 rounded-xl bg-purple-50 text-purple-600 flex items-center justify-center group-hover:scale-105 transition-transform">
                  <Icon name="user-group" className="h-5 w-5" />
                </div>
                <Icon name="arrow-right" className="h-4 w-4 text-slate-300 group-hover:text-purple-600 transition-colors" />
              </div>
              <h2 className="text-sm font-bold text-slate-900 group-hover:text-purple-600 transition-colors">
                Authorized Class Rosters
              </h2>
              <p className="text-xs text-slate-500 mt-1">
                Access official student roll numbers, PRNs, and enrolment statuses for your assigned divisions.
              </p>
            </button>
          </div>

          {/* Institutional Staff Dossier & Verification Notice */}
          <div className="bg-white rounded-xl border border-slate-200/80 p-6 shadow-xs">
            <div className="flex items-center space-x-2 text-slate-800 font-bold text-sm mb-4">
              <Icon name="document-text" className="h-4 w-4 text-[#1657D9]" />
              <span>Official Institutional Profile Details</span>
            </div>
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6 text-xs">
              <div className="space-y-1">
                <span className="text-slate-400 font-medium">Full Legal Name</span>
                <p className="font-semibold text-slate-800 text-sm">{staff.fullName}</p>
              </div>
              <div className="space-y-1">
                <span className="text-slate-400 font-medium">Institutional Employee ID</span>
                <p className="font-mono font-semibold text-slate-800 text-sm">{staff.employeeId}</p>
              </div>
              <div className="space-y-1">
                <span className="text-slate-400 font-medium">Institutional Email</span>
                <p className="font-mono text-slate-700">{staff.email}</p>
              </div>
              <div className="space-y-1">
                <span className="text-slate-400 font-medium">Academic Department</span>
                <p className="font-semibold text-slate-800">
                  {staff.department ? `${staff.department.name} (${staff.department.code})` : "General Academics"}
                </p>
              </div>
              <div className="space-y-1">
                <span className="text-slate-400 font-medium">Official Contact Number</span>
                <p className="text-slate-700">{staff.phone || "Not on public record"}</p>
              </div>
              <div className="space-y-1">
                <span className="text-slate-400 font-medium">Primary Office / Workstation</span>
                <p className="text-slate-700">{staff.officeLocation || "Faculty Room, Tech Block"}</p>
              </div>
            </div>

            <div className="mt-6 pt-4 border-t border-slate-100 flex items-center justify-between text-xs text-slate-500">
              <span className="flex items-center space-x-1.5">
                <Icon name="check-circle" className="h-4 w-4 text-emerald-500" />
                <span>Identity verified via server session • Scoped strictly to your faculty record</span>
              </span>
              <span className="text-slate-400 font-mono text-[11px]">CampusOS Core Identity</span>
            </div>
          </div>
        </div>
      )}

      {/* =========================================================================
          TAB 2: MY TEACHING & CLASSES
          ========================================================================= */}
      {activeTab === "classes" && (
        <div className="space-y-6">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
            <div>
              <h2 className="text-base font-bold text-slate-900">Assigned Classes & Teaching Load</h2>
              <p className="text-xs text-slate-500">
                Official subjects and cohorts assigned to you by Academic Administration.
              </p>
            </div>
            <button
              onClick={loadTeachingAssignments}
              disabled={isLoadingAssignments}
              className="inline-flex items-center space-x-1.5 px-3 py-1.5 rounded-lg border border-slate-200 text-xs font-medium text-slate-600 hover:bg-slate-50 disabled:opacity-50 cursor-pointer self-start"
            >
              <Icon name="funnel" className={`h-3.5 w-3.5 ${isLoadingAssignments ? "animate-spin" : ""}`} />
              <span>Refresh</span>
            </button>
          </div>

          {isLoadingAssignments && (
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4 animate-pulse">
              <div className="h-44 bg-slate-200 rounded-xl" />
              <div className="h-44 bg-slate-200 rounded-xl" />
            </div>
          )}

          {assignmentsError && (
            <div className="p-4 rounded-xl bg-rose-50 border border-rose-200 text-rose-800 text-xs flex items-center space-x-3">
              <Icon name="shield-alert" className="h-5 w-5 text-[#D92534] shrink-0" />
              <span>{assignmentsError}</span>
            </div>
          )}

          {!isLoadingAssignments && !assignmentsError && assignments && assignments.length === 0 && (
            <div className="bg-white rounded-xl border border-slate-200/80 p-12 text-center shadow-xs">
              <div className="h-12 w-12 rounded-xl bg-slate-100 text-slate-400 flex items-center justify-center mx-auto mb-3">
                <Icon name="book-open" className="h-6 w-6" />
              </div>
              <h3 className="text-sm font-bold text-slate-800">No Teaching Assignments Assigned</h3>
              <p className="text-xs text-slate-500 mt-1 max-w-md mx-auto">
                No active academic teaching assignments are currently mapped to your staff profile.
                Please contact the Academic Dean or Registrar if this requires administrative allocation.
              </p>
            </div>
          )}

          {!isLoadingAssignments && assignments && assignments.length > 0 && (
            <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
              {assignments.map((assignment) => (
                <div
                  key={assignment.id}
                  className="bg-white rounded-xl border border-slate-200/80 p-6 shadow-xs hover:border-slate-300 transition-all flex flex-col justify-between"
                >
                  <div className="space-y-3">
                    <div className="flex items-start justify-between gap-2">
                      <div className="space-y-1">
                        <div className="flex items-center space-x-2">
                          <span className="font-mono font-bold text-xs px-2 py-0.5 rounded bg-blue-50 text-[#1657D9] border border-blue-200">
                            {assignment.subjectCode}
                          </span>
                          <span className="text-[11px] font-medium px-2 py-0.5 rounded bg-slate-100 text-slate-600">
                            {assignment.subjectType}
                          </span>
                          <span className="text-[11px] font-medium px-2 py-0.5 rounded bg-emerald-50 text-emerald-700 border border-emerald-200">
                            {assignment.subjectCredits} Credits
                          </span>
                        </div>
                        <h3 className="text-base font-bold text-slate-900 leading-snug">
                          {assignment.subjectTitle}
                        </h3>
                      </div>
                    </div>

                    <div className="p-3 rounded-lg bg-slate-50 border border-slate-100 text-xs space-y-1.5">
                      <div className="flex items-center justify-between text-slate-600">
                        <span className="text-slate-400">Programme:</span>
                        <strong className="text-slate-800">{assignment.programmeName} ({assignment.programmeCode})</strong>
                      </div>
                      <div className="flex items-center justify-between text-slate-600">
                        <span className="text-slate-400">Term & Division:</span>
                        <strong className="text-slate-800">Semester {assignment.semesterNumber} • {assignment.divisionName}</strong>
                      </div>
                      <div className="flex items-center justify-between text-slate-600">
                        <span className="text-slate-400">Weekly Contact:</span>
                        <strong className="text-slate-800 font-mono">{assignment.weeklyHours} Hours / Week</strong>
                      </div>
                      <div className="flex items-center justify-between text-slate-600">
                        <span className="text-slate-400">Active Enrolment:</span>
                        <span className="inline-flex items-center font-semibold text-emerald-700">
                          <span className="h-1.5 w-1.5 rounded-full bg-emerald-500 mr-1.5" />
                          {assignment.enrolledStudentsCount} Enrolled {assignment.enrolledStudentsCount === 1 ? "Student" : "Students"}
                        </span>
                      </div>
                    </div>
                  </div>

                  <div className="mt-5 pt-4 border-t border-slate-100 flex items-center justify-between gap-3">
                    <button
                      onClick={() => {
                        setSelectedAssignmentId(assignment.id);
                        loadClassRoster(assignment.id);
                        handleTabChange("roster");
                      }}
                      className="flex-1 inline-flex items-center justify-center space-x-1.5 px-3 py-2 rounded-lg bg-[#1657D9] text-white text-xs font-semibold hover:bg-blue-700 transition-colors cursor-pointer"
                    >
                      <Icon name="user-group" className="h-3.5 w-3.5" />
                      <span>View Class Roster</span>
                    </button>

                    <button
                      onClick={() => handleTabChange("curriculum")}
                      className="px-3 py-2 rounded-lg border border-slate-200 text-xs font-medium text-slate-700 hover:bg-slate-50 transition-colors cursor-pointer"
                    >
                      <span>Syllabus</span>
                    </button>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      )}

      {/* =========================================================================
          TAB 3: WEEKLY SCHEDULE / TIMETABLE
          ========================================================================= */}
      {activeTab === "timetable" && (
        <div className="space-y-6">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
            <div>
              <h2 className="text-base font-bold text-slate-900">Weekly Teaching Timetable</h2>
              <p className="text-xs text-slate-500">
                Published schedule of class meetings and lab sessions for your assignments.
              </p>
            </div>
            <button
              onClick={loadTimetable}
              disabled={isLoadingTimetable}
              className="inline-flex items-center space-x-1.5 px-3 py-1.5 rounded-lg border border-slate-200 text-xs font-medium text-slate-600 hover:bg-slate-50 disabled:opacity-50 cursor-pointer self-start"
            >
              <Icon name="funnel" className={`h-3.5 w-3.5 ${isLoadingTimetable ? "animate-spin" : ""}`} />
              <span>Refresh Schedule</span>
            </button>
          </div>

          {isLoadingTimetable && (
            <div className="bg-white rounded-xl border border-slate-200/80 p-8 text-center animate-pulse">
              <div className="h-8 w-48 bg-slate-200 rounded mx-auto mb-4" />
              <div className="h-24 bg-slate-100 rounded-xl" />
            </div>
          )}

          {timetableError && (
            <div className="p-4 rounded-xl bg-rose-50 border border-rose-200 text-rose-800 text-xs flex items-center space-x-3">
              <Icon name="shield-alert" className="h-5 w-5 text-[#D92534] shrink-0" />
              <span>{timetableError}</span>
            </div>
          )}

          {!isLoadingTimetable && !timetableError && timetable && timetable.length === 0 && (
            <div className="bg-white rounded-xl border border-slate-200/80 p-12 text-center shadow-xs">
              <div className="h-14 w-14 rounded-2xl bg-blue-50 text-[#1657D9] flex items-center justify-center mx-auto mb-4 border border-blue-100">
                <Icon name="calendar" className="h-7 w-7" />
              </div>
              <h3 className="text-base font-bold text-slate-900">No Class Schedule Published</h3>
              <p className="text-xs text-slate-600 mt-2 max-w-md mx-auto leading-relaxed">
                No weekly timetable slots have been scheduled for your teaching assignments yet.
                Published schedules finalized by Academic Administration will appear here automatically.
              </p>
              <div className="mt-4 inline-flex items-center px-3 py-1.5 rounded-lg bg-slate-50 border border-slate-200 text-[11px] text-slate-500">
                <span>Distinguished from service error: Teaching profile verified • 0 active timetable records</span>
              </div>
            </div>
          )}

          {!isLoadingTimetable && timetable && timetable.length > 0 && (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
              {timetable.map((entry) => (
                <div
                  key={entry.id}
                  className="bg-white rounded-xl border border-slate-200/80 p-5 shadow-xs hover:border-[#1657D9]/40 transition-all space-y-3"
                >
                  <div className="flex items-center justify-between text-xs">
                    <span className="font-bold text-slate-800 uppercase tracking-wider">{entry.dayOfWeek}</span>
                    <span className="font-mono font-semibold px-2 py-0.5 rounded bg-blue-50 text-[#1657D9]">
                      {entry.startTime} – {entry.endTime}
                    </span>
                  </div>

                  <div>
                    <span className="text-[11px] font-mono font-bold text-[#1657D9]">{entry.subjectCode}</span>
                    <h4 className="text-sm font-bold text-slate-900 mt-0.5">{entry.subjectTitle}</h4>
                    <p className="text-xs text-slate-500 mt-0.5">
                      {entry.programmeCode} Sem {entry.semesterNumber} • {entry.divisionName}
                    </p>
                  </div>

                  <div className="pt-2 border-t border-slate-100 flex items-center justify-between text-xs text-slate-600">
                    <span className="flex items-center space-x-1">
                      <Icon name="building-storefront" className="h-3.5 w-3.5 text-slate-400" />
                      <span>{entry.room || "Classroom TBA"}</span>
                    </span>
                    <span className="font-medium text-slate-700">{entry.sessionType}</span>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      )}

      {/* =========================================================================
          TAB 4: CLASS ROSTERS (Strict Privacy: Roll, PRN, Name, Status Only)
          ========================================================================= */}
      {activeTab === "roster" && (
        <div className="space-y-6">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
            <div>
              <h2 className="text-base font-bold text-slate-900">Authorized Class Rosters</h2>
              <p className="text-xs text-slate-500">
                Official student enrolment lists scoped strictly to your authorized teaching assignments.
              </p>
            </div>

            {/* Assignment Selector Dropdown */}
            {assignments && assignments.length > 0 && (
              <div className="flex items-center space-x-2">
                <label htmlFor="assignment-select" className="text-xs font-semibold text-slate-600">
                  Select Class:
                </label>
                <select
                  id="assignment-select"
                  value={selectedAssignmentId || ""}
                  onChange={(e) => {
                    const id = e.target.value;
                    setSelectedAssignmentId(id);
                    loadClassRoster(id);
                  }}
                  className="text-xs font-semibold px-3 py-2 rounded-lg border border-slate-200 bg-white text-slate-800 shadow-2xs focus:outline-hidden focus:border-[#1657D9] cursor-pointer"
                >
                  {assignments.map((a) => (
                    <option key={a.id} value={a.id}>
                      {a.subjectCode} - {a.divisionName} ({a.programmeCode} Sem {a.semesterNumber})
                    </option>
                  ))}
                </select>
              </div>
            )}
          </div>

          {/* Rigid FERPA / Institutional Privacy Banner */}
          <div className="p-4 rounded-xl bg-blue-50/70 border border-blue-200/80 text-xs text-blue-900 flex items-start space-x-3">
            <Icon name="shield-alert" className="h-5 w-5 text-[#1657D9] shrink-0 mt-0.5" />
            <div className="space-y-1">
              <p className="font-bold">FERPA & Student Privacy Compliance Guarantee</p>
              <p className="text-blue-800/90 leading-relaxed">
                This roster discloses strictly academic identifiers (Roll Number, PRN, Full Name, Enrolment Status).
                Under CampusOS privacy architecture, personal contact numbers, personal emails, date of birth,
                gender, guardian records, financial invoices, and compliance dossiers are strictly excluded from faculty interfaces.
              </p>
            </div>
          </div>

          {isLoadingRoster && (
            <div className="bg-white rounded-xl border border-slate-200/80 p-8 animate-pulse text-center">
              <div className="h-6 w-48 bg-slate-200 rounded mx-auto mb-4" />
              <div className="h-40 bg-slate-100 rounded-xl" />
            </div>
          )}

          {rosterError && (
            <div className="p-4 rounded-xl bg-rose-50 border border-rose-200 text-rose-800 text-xs flex items-center space-x-3">
              <Icon name="shield-alert" className="h-5 w-5 text-[#D92534] shrink-0" />
              <span>{rosterError}</span>
            </div>
          )}

          {!isLoadingRoster && !rosterError && roster && (
            <div className="bg-white rounded-xl border border-slate-200/80 shadow-xs overflow-hidden">
              <div className="px-6 py-4 border-b border-slate-100 bg-slate-50/50 flex flex-col sm:flex-row sm:items-center justify-between gap-2">
                <div>
                  <h3 className="text-sm font-bold text-slate-900">
                    {roster.assignment.subjectCode}: {roster.assignment.subjectTitle}
                  </h3>
                  <p className="text-xs text-slate-500">
                    {roster.assignment.programmeName} • Semester {roster.assignment.semesterNumber} • {roster.assignment.divisionName}
                  </p>
                </div>
                <div className="inline-flex items-center px-2.5 py-1 rounded-full text-xs font-semibold bg-blue-100 text-[#1657D9]">
                  {roster.totalCount} {roster.totalCount === 1 ? "Student Enrolled" : "Students Enrolled"}
                </div>
              </div>

              {roster.students.length === 0 ? (
                <div className="p-8 text-center text-xs text-slate-500">
                  No enrolled students found in this division cohort.
                </div>
              ) : (
                <div className="overflow-x-auto">
                  <table className="w-full text-left text-xs">
                    <thead className="bg-slate-50 border-b border-slate-200/80 text-slate-500 font-semibold uppercase tracking-wider">
                      <tr>
                        <th className="px-6 py-3.5">Roll Number</th>
                        <th className="px-6 py-3.5">Permanent Reg. No (PRN)</th>
                        <th className="px-6 py-3.5">Student Full Name</th>
                        <th className="px-6 py-3.5 text-right">Enrolment Status</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-100">
                      {roster.students.map((student) => (
                        <tr key={student.id} className="hover:bg-slate-50/60 transition-colors">
                          <td className="px-6 py-4 font-mono font-bold text-slate-900">
                            {student.rollNumber}
                          </td>
                          <td className="px-6 py-4 font-mono text-slate-600">
                            {student.prn}
                          </td>
                          <td className="px-6 py-4 font-semibold text-slate-900">
                            {student.fullName}
                          </td>
                          <td className="px-6 py-4 text-right">
                            <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-[11px] font-semibold bg-emerald-50 text-emerald-700 border border-emerald-200">
                              <span className="h-1.5 w-1.5 rounded-full bg-emerald-500 mr-1.5" />
                              {student.status}
                            </span>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              )}
            </div>
          )}
        </div>
      )}

      {/* =========================================================================
          TAB 5: ATTENDANCE HISTORY (Read-Only Ledger in Workstream 2)
          ========================================================================= */}
      {activeTab === "attendance" && (
        <div className="space-y-6">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
            <div>
              <div className="flex items-center space-x-2">
                <h2 className="text-base font-bold text-slate-900">Attendance Session Ledger</h2>
                <span className="px-2 py-0.5 rounded text-[10px] font-bold bg-amber-100 text-amber-800 border border-amber-200 uppercase tracking-wider">
                  Read-Only Mode
                </span>
              </div>
              <p className="text-xs text-slate-500">
                Historical records of attendance roll-calls recorded for your assigned classes.
              </p>
            </div>

            {/* Filter buttons */}
            <div className="flex items-center space-x-1.5 bg-slate-100 p-1 rounded-xl self-start">
              {(["ALL", "FINALIZED", "DRAFT"] as const).map((filter) => (
                <button
                  key={filter}
                  onClick={() => setAttendanceFilter(filter)}
                  className={`px-3 py-1 rounded-lg text-xs font-semibold transition-all cursor-pointer ${
                    attendanceFilter === filter
                      ? "bg-white text-slate-900 shadow-2xs"
                      : "text-slate-500 hover:text-slate-900"
                  }`}
                >
                  {filter}
                </button>
              ))}
            </div>
          </div>

          {/* Workstream Notice */}
          <div className="p-4 rounded-xl bg-slate-50 border border-slate-200 text-xs text-slate-600 flex items-center space-x-3">
            <Icon name="clipboard-check" className="h-5 w-5 text-slate-500 shrink-0" />
            <div className="space-y-0.5">
              <p className="font-semibold text-slate-800">Attendance Console: Workstream 2 Scope</p>
              <p className="text-slate-500">
                This console is strictly read-only. Full roll-call recording, student marking, draft persistence,
                and finalization lock will be implemented in Workstream 5.
              </p>
            </div>
          </div>

          {isLoadingAttendance && (
            <div className="bg-white rounded-xl border border-slate-200/80 p-8 animate-pulse text-center">
              <div className="h-6 w-48 bg-slate-200 rounded mx-auto mb-4" />
              <div className="h-32 bg-slate-100 rounded-xl" />
            </div>
          )}

          {attendanceError && (
            <div className="p-4 rounded-xl bg-rose-50 border border-rose-200 text-rose-800 text-xs flex items-center space-x-3">
              <Icon name="shield-alert" className="h-5 w-5 text-[#D92534] shrink-0" />
              <span>{attendanceError}</span>
            </div>
          )}

          {!isLoadingAttendance && !attendanceError && (!filteredAttendance || filteredAttendance.length === 0) && (
            <div className="bg-white rounded-xl border border-slate-200/80 p-12 text-center shadow-xs">
              <div className="h-12 w-12 rounded-xl bg-slate-100 text-slate-400 flex items-center justify-center mx-auto mb-3">
                <Icon name="clipboard-check" className="h-6 w-6" />
              </div>
              <h3 className="text-sm font-bold text-slate-800">No Attendance Sessions Recorded</h3>
              <p className="text-xs text-slate-500 mt-1 max-w-md mx-auto">
                You have not logged any attendance roll-call sessions yet.
                Roll-call recording functionality will be enabled when Workstream 5 is activated.
              </p>
            </div>
          )}

          {!isLoadingAttendance && filteredAttendance && filteredAttendance.length > 0 && (
            <div className="bg-white rounded-xl border border-slate-200/80 shadow-xs overflow-hidden">
              <div className="overflow-x-auto">
                <table className="w-full text-left text-xs">
                  <thead className="bg-slate-50 border-b border-slate-200/80 text-slate-500 font-semibold uppercase tracking-wider">
                    <tr>
                      <th className="px-6 py-3.5">Session Date</th>
                      <th className="px-6 py-3.5">Subject & Division</th>
                      <th className="px-6 py-3.5">Time Slot</th>
                      <th className="px-6 py-3.5">Topic Covered</th>
                      <th className="px-6 py-3.5">Attendance</th>
                      <th className="px-6 py-3.5 text-right">Status</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100">
                    {filteredAttendance.map((session) => (
                      <tr key={session.id} className="hover:bg-slate-50/60 transition-colors">
                        <td className="px-6 py-4 font-medium text-slate-900">
                          {new Date(session.sessionDate).toLocaleDateString("en-IN", {
                            day: "2-digit",
                            month: "short",
                            year: "numeric",
                          })}
                        </td>
                        <td className="px-6 py-4">
                          <span className="font-bold text-slate-800">{session.subjectCode}</span>
                          <span className="text-slate-500 ml-1.5">• {session.divisionName}</span>
                        </td>
                        <td className="px-6 py-4 font-mono text-slate-600">
                          {session.startTime} – {session.endTime}
                        </td>
                        <td className="px-6 py-4 text-slate-700 max-w-xs truncate">
                          {session.topicCovered || "General Curriculum Delivery"}
                        </td>
                        <td className="px-6 py-4 font-semibold text-slate-900">
                          {session.presentCount} / {session.totalCount} Present
                        </td>
                        <td className="px-6 py-4 text-right">
                          <span
                            className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-[11px] font-semibold border ${
                              session.status === "FINALIZED"
                                ? "bg-emerald-50 text-emerald-700 border-emerald-200"
                                : "bg-amber-50 text-amber-700 border-amber-200"
                            }`}
                          >
                            {session.status}
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
      )}

      {/* =========================================================================
          TAB 6: COURSE SPECIFICATIONS / CURRICULUM
          ========================================================================= */}
      {activeTab === "curriculum" && (
        <div className="space-y-6">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
            <div>
              <h2 className="text-base font-bold text-slate-900">Course Curriculum & Syllabus Dossier</h2>
              <p className="text-xs text-slate-500">
                Detailed course outlines, academic credit weights, and contact requirements for your subjects.
              </p>
            </div>
          </div>

          {isLoadingAssignments && (
            <div className="grid grid-cols-1 gap-4 animate-pulse">
              <div className="h-44 bg-slate-200 rounded-xl" />
            </div>
          )}

          {!isLoadingAssignments && assignments && (
            <div className="grid grid-cols-1 gap-5">
              {assignments.map((assignment) => (
                <div
                  key={assignment.id}
                  className="bg-white rounded-xl border border-slate-200/80 p-6 shadow-xs space-y-4"
                >
                  <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 pb-4 border-b border-slate-100">
                    <div>
                      <div className="flex items-center space-x-2">
                        <span className="font-mono font-bold text-xs px-2.5 py-1 rounded bg-[#1657D9] text-white">
                          {assignment.subjectCode}
                        </span>
                        <span className="text-xs font-semibold px-2.5 py-1 rounded bg-slate-100 text-slate-700">
                          {assignment.subjectType}
                        </span>
                        <span className="text-xs font-semibold px-2.5 py-1 rounded bg-emerald-50 text-emerald-700 border border-emerald-200">
                          {assignment.subjectCredits} Academic Credits
                        </span>
                      </div>
                      <h3 className="text-lg font-bold text-slate-900 mt-2">
                        {assignment.subjectTitle}
                      </h3>
                      <p className="text-xs text-slate-500 mt-0.5">
                        {assignment.programmeName} ({assignment.programmeCode}) • Semester {assignment.semesterNumber} • {assignment.divisionName}
                      </p>
                    </div>

                    <div className="text-right sm:border-l sm:border-slate-100 sm:pl-6 space-y-1">
                      <span className="text-xs text-slate-400">Weekly Contact Target</span>
                      <p className="text-xl font-bold text-slate-900 font-mono">{assignment.weeklyHours} Hours</p>
                    </div>
                  </div>

                  <div className="grid grid-cols-1 md:grid-cols-3 gap-4 text-xs">
                    <div className="p-3.5 rounded-lg bg-slate-50 border border-slate-100 space-y-1">
                      <span className="text-slate-400 font-medium">Curricular Type</span>
                      <p className="font-bold text-slate-800">{assignment.subjectType}</p>
                      <p className="text-[11px] text-slate-500">Classroom lecture & seminar delivery</p>
                    </div>

                    <div className="p-3.5 rounded-lg bg-slate-50 border border-slate-100 space-y-1">
                      <span className="text-slate-400 font-medium">Enrolled Cohort</span>
                      <p className="font-bold text-slate-800">{assignment.enrolledStudentsCount} Active Enrolments</p>
                      <p className="text-[11px] text-slate-500">Official division cohort registered</p>
                    </div>

                    <div className="p-3.5 rounded-lg bg-slate-50 border border-slate-100 space-y-1">
                      <span className="text-slate-400 font-medium">Academic Assignment</span>
                      <p className="font-bold text-slate-800">Faculty Appointment</p>
                      <p className="text-[11px] text-slate-500">Assigned to {staff.fullName}</p>
                    </div>
                  </div>

                  <div className="p-4 rounded-xl bg-slate-50 border border-slate-200 text-xs text-slate-600 flex items-center justify-between">
                    <span className="flex items-center space-x-2">
                      <Icon name="check-circle" className="h-4 w-4 text-emerald-600" />
                      <span>Syllabus approved under University of Mumbai / RPIHM academic framework</span>
                    </span>
                    <button
                      onClick={() => {
                        setSelectedAssignmentId(assignment.id);
                        loadClassRoster(assignment.id);
                        handleTabChange("roster");
                      }}
                      className="text-xs font-semibold text-[#1657D9] hover:underline cursor-pointer"
                    >
                      View Student Roster →
                    </button>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      )}
    </div>
  );
};
