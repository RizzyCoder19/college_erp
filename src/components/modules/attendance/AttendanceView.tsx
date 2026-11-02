"use client";

import React, { useState, useEffect, useTransition } from "react";
import { Icon } from "@/components/common/Icon";
import {
  getProgrammesAction,
  getProgrammeDetailsAction,
  getSubjectsAction,
} from "@/lib/actions/academics";
import {
  getTimetableAction,
  createTimetableEntryAction,
  cancelTimetableEntryAction,
} from "@/lib/actions/timetable";
import {
  getCohortForSessionAction,
  recordAttendanceSessionAction,
  getAttendanceSessionsAction,
  getSessionDetailsAction,
  amendAttendanceRecordAction,
  finalizeAttendanceSessionAction,
  getAttendanceSummaryAction,
} from "@/lib/actions/attendance";

interface ProgrammeOption {
  id: string;
  code: string;
  name: string;
}

interface SemesterOption {
  id: string;
  semesterNumber: number;
  termType: string;
  divisions?: DivisionOption[];
}

interface DivisionOption {
  id: string;
  name: string;
  maxCapacity: number;
}

interface TeachingAssignmentOption {
  id: string;
  staffId: string;
  weeklyHours: number;
  staff?: { id: string; fullName: string };
  division?: { id: string; name: string };
}

interface SubjectOption {
  id: string;
  code: string;
  title: string;
  subjectType: string;
  teachingAssignments?: TeachingAssignmentOption[];
}

interface CohortStudentItem {
  enrolmentId: string;
  studentId: string;
  rollNumber: string;
  prn: string;
  fullName: string;
  gender: string | null;
  divisionName: string;
  divisionId: string;
  semesterNumber: number;
  programmeCode: string;
  currentAttendanceRate: number | null;
}

interface AttendanceSessionItem {
  id: string;
  timetableEntryId: string | null;
  sessionDate: Date;
  startTime: string;
  endTime: string;
  sessionType: string;
  status: string;
  topicCovered: string | null;
  subjectCode: string;
  subjectTitle: string;
  programmeCode: string;
  semesterNumber: number;
  divisionName: string;
  facultyName: string;
  recordedByName: string;
  finalizedAt: Date | null;
  counts: {
    total: number;
    present: number;
    late: number;
    absent: number;
    excused: number;
    attendanceRate: number;
  };
}

interface TimetableCardItem {
  id: string;
  dayOfWeek: string;
  startTime: string;
  endTime: string;
  room: string | null;
  sessionType: string;
  subjectId: string;
  subject: { id: string; code: string; title: string };
  teachingAssignment?: { staff?: { fullName: string } };
  division?: { name: string };
}

interface SubjectAttendanceBreakdown {
  subjectId: string;
  subjectCode: string;
  subjectTitle: string;
  conductedSessions: number;
  presentCount: number;
  lateCount: number;
  absentCount: number;
  excusedCount: number;
  eligibleTotal: number;
  attendanceRate: number | null;
}

interface AttendanceSummaryItem {
  totalConductedSessions: number;
  totalRecords: number;
  presentCount: number;
  lateCount: number;
  absentCount: number;
  excusedCount: number;
  eligibleTotal?: number;
  hasRecordedSessions?: boolean;
  attendanceRate: number | null;
  subjectBreakdown?: SubjectAttendanceBreakdown[];
  formula: string;
  notes: string;
}

interface SessionAuditRecordItem {
  id: string;
  status: "PRESENT" | "ABSENT" | "LATE" | "EXCUSED";
  remarks: string | null;
  markedAt: Date;
  amendedAt: Date | null;
  student: { rollNumber: string; prn: string; fullName: string };
  amendedBy?: { fullName: string };
}

interface SessionAuditDetails {
  id: string;
  sessionDate: Date;
  createdAt: Date;
  recordedBy: { fullName: string; role: string };
  attendanceRecords: SessionAuditRecordItem[];
}

interface AttendanceViewProps {
  initialTab?: "mark" | "ledger" | "timetable" | "analytics";
}

export const AttendanceView: React.FC<AttendanceViewProps> = ({ initialTab = "mark" }) => {
  const [activeTab, setActiveTab] = useState<"mark" | "ledger" | "timetable" | "analytics">(initialTab);
  const [isPending, startTransition] = useTransition();

  // Reference Master Data
  const [programmes, setProgrammes] = useState<ProgrammeOption[]>([]);
  const [selectedProgrammeId, setSelectedProgrammeId] = useState<string>("");
  const [semesters, setSemesters] = useState<SemesterOption[]>([]);
  const [selectedSemesterId, setSelectedSemesterId] = useState<string>("");
  const [divisions, setDivisions] = useState<DivisionOption[]>([]);
  const [selectedDivisionId, setSelectedDivisionId] = useState<string>("");
  const [subjects, setSubjects] = useState<SubjectOption[]>([]);
  const [selectedSubjectId, setSelectedSubjectId] = useState<string>("");

  // Tab 1: Mark Attendance State
  const [sessionDate, setSessionDate] = useState<string>(new Date().toISOString().split("T")[0]);
  const [startTime, setStartTime] = useState<string>("09:00");
  const [endTime, setEndTime] = useState<string>("10:00");
  const [sessionType, setSessionType] = useState<string>("THEORY");
  const [roomLocation, setRoomLocation] = useState<string>("Basic Training Kitchen 1");
  const [topicCovered, setTopicCovered] = useState<string>("");
  const [cohortStudents, setCohortStudents] = useState<CohortStudentItem[]>([]);
  const [attendanceSheet, setAttendanceSheet] = useState<Record<string, { status: "PRESENT" | "ABSENT" | "LATE" | "EXCUSED"; remarks?: string }>>({});
  const [actionMessage, setActionMessage] = useState<{ type: "success" | "error"; text: string } | null>(null);

  // Tab 2: Ledger State
  const [sessionsList, setSessionsList] = useState<AttendanceSessionItem[]>([]);
  const [selectedSessionAudit, setSelectedSessionAudit] = useState<SessionAuditDetails | null>(null);
  const [amendModalOpen, setAmendModalOpen] = useState(false);
  const [recordToAmend, setRecordToAmend] = useState<SessionAuditRecordItem | null>(null);
  const [amendStatus, setAmendStatus] = useState<"PRESENT" | "ABSENT" | "LATE" | "EXCUSED">("PRESENT");
  const [amendRemarks, setAmendRemarks] = useState<string>("");

  // Tab 3: Timetable State
  const [timetableEntries, setTimetableEntries] = useState<TimetableCardItem[]>([]);
  const [showAddTimetableModal, setShowAddTimetableModal] = useState(false);
  const [newEntryDay, setNewEntryDay] = useState<string>("MONDAY");
  const [newEntryStart, setNewEntryStart] = useState<string>("09:00");
  const [newEntryEnd, setNewEntryEnd] = useState<string>("10:00");
  const [newEntryRoom, setNewEntryRoom] = useState<string>("Basic Training Kitchen 1");
  const [newEntryAssignmentId, setNewEntryAssignmentId] = useState<string>("");
  const [newEntryError, setNewEntryError] = useState<string | null>(null);

  // Tab 4: Analytics State
  const [summaryData, setSummaryData] = useState<AttendanceSummaryItem | null>(null);

  // 1. Initial Load of Master Data
  useEffect(() => {
    loadProgrammes();
  }, []);

  async function loadProgrammes() {
    const res = await getProgrammesAction();
    if (res.success && res.data && res.data.length > 0) {
      setProgrammes(res.data as ProgrammeOption[]);
      handleProgrammeChange(res.data[0].id);
    }
  }

  // When Programme changes
  async function handleProgrammeChange(progId: string) {
    setSelectedProgrammeId(progId);
    const detailsRes = await getProgrammeDetailsAction(progId);
    if (detailsRes.success && detailsRes.data) {
      const progDetails = detailsRes.data as unknown as { semesters?: SemesterOption[] };
      const sems = progDetails.semesters || [];
      setSemesters(sems);
      if (sems.length > 0) {
        handleSemesterChange(sems[0].id, sems);
      } else {
        setSelectedSemesterId("");
        setDivisions([]);
        setSelectedDivisionId("");
      }
    }
  }

  // When Semester changes
  function handleSemesterChange(semId: string, currentSemesters = semesters) {
    setSelectedSemesterId(semId);
    const sem = currentSemesters.find((s) => s.id === semId);
    if (sem) {
      const divs = sem.divisions || [];
      setDivisions(divs);
      if (divs.length > 0) {
        setSelectedDivisionId(divs[0].id);
      } else {
        setSelectedDivisionId("");
      }
    }
  }

  // Load Subjects and Cohort when Semester/Division changes
  useEffect(() => {
    if (selectedSemesterId) {
      loadSubjectsForSemester(selectedSemesterId);
      loadCohort(selectedSemesterId, selectedDivisionId);
      loadTimetable(selectedSemesterId, selectedDivisionId);
      loadLedgerSessions(selectedSemesterId, selectedDivisionId);
      loadSummary(selectedSemesterId, selectedDivisionId);
    }
  }, [selectedSemesterId, selectedDivisionId]);

  async function loadSubjectsForSemester(semId: string) {
    const res = await getSubjectsAction(semId);
    if (res.success && res.data) {
      const subs = res.data as SubjectOption[];
      setSubjects(subs);
      if (subs.length > 0) {
        setSelectedSubjectId(subs[0].id);
        if (subs[0].teachingAssignments && subs[0].teachingAssignments.length > 0) {
          setNewEntryAssignmentId(subs[0].teachingAssignments[0].id);
        }
      }
    }
  }

  async function loadCohort(semId: string, divId?: string) {
    const res = await getCohortForSessionAction(semId, divId || null);
    if (res.success && res.data) {
      const cohort = res.data as CohortStudentItem[];
      setCohortStudents(cohort);
      const initialSheet: Record<string, { status: "PRESENT" | "ABSENT" | "LATE" | "EXCUSED"; remarks?: string }> = {};
      for (const st of cohort) {
        initialSheet[st.studentId] = { status: "PRESENT" };
      }
      setAttendanceSheet(initialSheet);
    }
  }

  async function loadTimetable(semId: string, divId?: string) {
    const res = await getTimetableAction({ semesterId: semId, divisionId: divId || null });
    if (res.success && res.data) {
      setTimetableEntries(res.data as TimetableCardItem[]);
    }
  }

  async function loadLedgerSessions(semId: string, divId?: string) {
    const res = await getAttendanceSessionsAction({ semesterId: semId, divisionId: divId || null });
    if (res.success && res.data) {
      setSessionsList(res.data as AttendanceSessionItem[]);
    }
  }

  async function loadSummary(semId: string, divId?: string) {
    const res = await getAttendanceSummaryAction({ semesterId: semId, divisionId: divId || null });
    if (res.success && res.data) {
      setSummaryData(res.data as AttendanceSummaryItem);
    }
  }

  // Attendance Marking Handlers
  function setStudentStatus(studentId: string, status: "PRESENT" | "ABSENT" | "LATE" | "EXCUSED") {
    setAttendanceSheet((prev) => ({
      ...prev,
      [studentId]: {
        ...prev[studentId],
        status,
      },
    }));
  }

  function setStudentRemarks(studentId: string, remarks: string) {
    setAttendanceSheet((prev) => ({
      ...prev,
      [studentId]: {
        ...prev[studentId],
        remarks,
      },
    }));
  }

  function markAll(status: "PRESENT" | "ABSENT") {
    const updated: Record<string, { status: "PRESENT" | "ABSENT" | "LATE" | "EXCUSED"; remarks?: string }> = {};
    for (const st of cohortStudents) {
      updated[st.studentId] = {
        ...attendanceSheet[st.studentId],
        status,
      };
    }
    setAttendanceSheet(updated);
  }

  async function handleSaveAttendance(status: "DRAFT" | "FINALIZED") {
    setActionMessage(null);
    if (status === "FINALIZED") {
      const confirmed = window.confirm(
        "Are you sure you want to finalize this attendance ledger?\n\nOnce finalized, this session will be locked against ordinary faculty edits. Any subsequent adjustments will require administrative authorization and will be permanently recorded in the audit trail."
      );
      if (!confirmed) return;
    }
    if (!selectedSubjectId) {
      setActionMessage({ type: "error", text: "Please select an accredited subject." });
      return;
    }

    const currentSubject = subjects.find((s) => s.id === selectedSubjectId);
    let facultyId = "";
    if (currentSubject?.teachingAssignments && currentSubject.teachingAssignments.length > 0) {
      facultyId = currentSubject.teachingAssignments[0].staffId;
    } else {
      setActionMessage({ type: "error", text: "No teaching faculty assigned to this subject. Assign a faculty member before recording attendance." });
      return;
    }

    const records = cohortStudents.map((st) => ({
      studentId: st.studentId,
      enrolmentId: st.enrolmentId,
      status: attendanceSheet[st.studentId]?.status || "PRESENT",
      remarks: attendanceSheet[st.studentId]?.remarks,
    }));

    startTransition(async () => {
      const res = await recordAttendanceSessionAction({
        semesterId: selectedSemesterId,
        divisionId: selectedDivisionId || null,
        subjectId: selectedSubjectId,
        facultyId,
        sessionDate,
        startTime,
        endTime,
        sessionType,
        status,
        topicCovered,
        records,
      });

      if (res.success) {
        const savedSession = res.data as { id?: string } | undefined;
        setActionMessage({
          type: "success",
          text: `Attendance session successfully recorded and saved to SQLite (${status === "FINALIZED" ? "Finalized Ledger Entry" : "Draft Session"}). Session ID: ${savedSession?.id || "Saved"}`,
        });
        loadLedgerSessions(selectedSemesterId, selectedDivisionId);
        loadSummary(selectedSemesterId, selectedDivisionId);
      } else {
        setActionMessage({
          type: "error",
          text: res.error || "Failed to record attendance session.",
        });
      }
    });
  }

  // Create Timetable Slot Handler
  async function handleCreateTimetableEntry() {
    setNewEntryError(null);
    if (!newEntryAssignmentId) {
      setNewEntryError("Please select an active teaching assignment.");
      return;
    }

    startTransition(async () => {
      const res = await createTimetableEntryAction({
        semesterId: selectedSemesterId,
        divisionId: selectedDivisionId || null,
        subjectId: selectedSubjectId,
        teachingAssignmentId: newEntryAssignmentId,
        dayOfWeek: newEntryDay,
        startTime: newEntryStart,
        endTime: newEntryEnd,
        room: newEntryRoom,
        sessionType,
      });

      if (res.success) {
        setShowAddTimetableModal(false);
        loadTimetable(selectedSemesterId, selectedDivisionId);
      } else {
        setNewEntryError(res.error || "Conflict or validation failure.");
      }
    });
  }

  // Cancel Timetable Entry Handler
  async function handleCancelTimetableEntry(entryId: string) {
    if (!confirm("Are you sure you want to cancel this scheduled timetable slot?")) return;
    const res = await cancelTimetableEntryAction(entryId);
    if (res.success) {
      loadTimetable(selectedSemesterId, selectedDivisionId);
    } else {
      alert(res.error || "Failed to cancel timetable slot.");
    }
  }

  // Audit Sheet Inspector
  async function handleInspectSession(sessionId: string) {
    const res = await getSessionDetailsAction(sessionId);
    if (res.success && res.data) {
      setSelectedSessionAudit(res.data as SessionAuditDetails);
    }
  }

  // Finalize an existing draft session
  async function handleFinalizeExistingSession(sessionId: string) {
    const res = await finalizeAttendanceSessionAction(sessionId);
    if (res.success) {
      loadLedgerSessions(selectedSemesterId, selectedDivisionId);
      if (selectedSessionAudit?.id === sessionId) {
        handleInspectSession(sessionId);
      }
      alert("Session finalized successfully. Ledger records are now locked against standard modification.");
    } else {
      alert(res.error || "Failed to finalize session.");
    }
  }

  // Amend Record Handler
  async function handleAmendRecordSubmit() {
    if (!recordToAmend) return;
    const res = await amendAttendanceRecordAction(recordToAmend.id, amendStatus, amendRemarks);
    if (res.success) {
      setAmendModalOpen(false);
      if (selectedSessionAudit) {
        handleInspectSession(selectedSessionAudit.id);
      }
      loadLedgerSessions(selectedSemesterId, selectedDivisionId);
      loadSummary(selectedSemesterId, selectedDivisionId);
      alert("Attendance record successfully amended with administrative audit trail.");
    } else {
      alert(res.error || "Failed to amend record.");
    }
  }

  // Calculations for current sheet
  const sheetTotal = cohortStudents.length;
  const sheetPresent = Object.values(attendanceSheet).filter((r) => r.status === "PRESENT").length;
  const sheetLate = Object.values(attendanceSheet).filter((r) => r.status === "LATE").length;
  const sheetAbsent = Object.values(attendanceSheet).filter((r) => r.status === "ABSENT").length;
  const sheetExcused = Object.values(attendanceSheet).filter((r) => r.status === "EXCUSED").length;
  const currentSheetRate = sheetTotal > 0 ? Math.round(((sheetPresent + sheetLate) / sheetTotal) * 1000) / 10 : 0;

  return (
    <div className="space-y-6">
      {/* Top Header Card */}
      <div className="rounded-2xl border border-slate-200 bg-white p-6 shadow-xs">
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
          <div className="flex items-center space-x-3">
            <div className="flex h-12 w-12 items-center justify-center rounded-xl bg-blue-50 text-[#1657D9] border border-blue-100">
              <Icon name="clipboard-check" className="h-6 w-6" />
            </div>
            <div>
              <div className="flex items-center space-x-2">
                <h1 className="text-xl font-bold text-slate-900 tracking-tight">
                  Attendance Tracking & Timetable Scheduling
                </h1>
                <span className="inline-flex items-center px-2 py-0.5 rounded-full text-[10px] font-bold uppercase tracking-wider bg-emerald-100 text-emerald-800 border border-emerald-200">
                  Milestone 4 Live
                </span>
              </div>
              <p className="text-xs text-slate-500 mt-0.5">
                Authentic SQLite ledger-backed attendance recording, conflict-free timetable management, and student cohort tracking.
              </p>
            </div>
          </div>

          {/* Quick Context Selectors */}
          <div className="flex flex-wrap items-center gap-2 bg-slate-50 p-2 rounded-xl border border-slate-200 text-xs">
            <div>
              <label className="block text-[10px] font-semibold text-slate-500 mb-0.5">Programme</label>
              <select
                value={selectedProgrammeId}
                onChange={(e) => handleProgrammeChange(e.target.value)}
                className="bg-white border border-slate-200 rounded-lg px-2.5 py-1 text-slate-800 font-medium focus:outline-none focus:ring-1 focus:ring-[#1657D9]"
              >
                {programmes.map((p) => (
                  <option key={p.id} value={p.id}>{p.code} - {p.name}</option>
                ))}
              </select>
            </div>

            <div>
              <label className="block text-[10px] font-semibold text-slate-500 mb-0.5">Semester</label>
              <select
                value={selectedSemesterId}
                onChange={(e) => handleSemesterChange(e.target.value)}
                className="bg-white border border-slate-200 rounded-lg px-2.5 py-1 text-slate-800 font-medium focus:outline-none focus:ring-1 focus:ring-[#1657D9]"
              >
                {semesters.map((s) => (
                  <option key={s.id} value={s.id}>Semester {s.semesterNumber} ({s.termType})</option>
                ))}
              </select>
            </div>

            <div>
              <label className="block text-[10px] font-semibold text-slate-500 mb-0.5">Division</label>
              <select
                value={selectedDivisionId}
                onChange={(e) => setSelectedDivisionId(e.target.value)}
                className="bg-white border border-slate-200 rounded-lg px-2.5 py-1 text-slate-800 font-medium focus:outline-none focus:ring-1 focus:ring-[#1657D9]"
              >
                <option value="">Cohort-Wide (All Divisions)</option>
                {divisions.map((d) => (
                  <option key={d.id} value={d.id}>{d.name} (Cap: {d.maxCapacity})</option>
                ))}
              </select>
            </div>
          </div>
        </div>
      </div>

      {/* Main Tab Switcher */}
      <div className="flex items-center space-x-2 border-b border-slate-200 pb-2 text-xs font-bold">
        <button
          onClick={() => setActiveTab("mark")}
          className={`flex items-center space-x-2 px-4 py-2.5 rounded-xl transition-all cursor-pointer ${
            activeTab === "mark"
              ? "bg-[#1657D9] text-white shadow-xs"
              : "text-slate-600 hover:bg-slate-100"
          }`}
        >
          <Icon name="clipboard-check" className="h-4 w-4" />
          <span>Mark Class Attendance</span>
        </button>

        <button
          onClick={() => setActiveTab("ledger")}
          className={`flex items-center space-x-2 px-4 py-2.5 rounded-xl transition-all cursor-pointer ${
            activeTab === "ledger"
              ? "bg-[#1657D9] text-white shadow-xs"
              : "text-slate-600 hover:bg-slate-100"
          }`}
        >
          <Icon name="document-text" className="h-4 w-4" />
          <span>Attendance Ledger &amp; Sessions ({sessionsList.length})</span>
        </button>

        <button
          onClick={() => setActiveTab("timetable")}
          className={`flex items-center space-x-2 px-4 py-2.5 rounded-xl transition-all cursor-pointer ${
            activeTab === "timetable"
              ? "bg-[#1657D9] text-white shadow-xs"
              : "text-slate-600 hover:bg-slate-100"
          }`}
        >
          <Icon name="calendar" className="h-4 w-4" />
          <span>Timetable &amp; Scheduling ({timetableEntries.length})</span>
        </button>

        <button
          onClick={() => setActiveTab("analytics")}
          className={`flex items-center space-x-2 px-4 py-2.5 rounded-xl transition-all cursor-pointer ${
            activeTab === "analytics"
              ? "bg-[#1657D9] text-white shadow-xs"
              : "text-slate-600 hover:bg-slate-100"
          }`}
        >
          <Icon name="chart-bar" className="h-4 w-4" />
          <span>Calculations &amp; Summaries</span>
        </button>
      </div>

      {/* Action Notification Banner */}
      {actionMessage && (
        <div
          className={`p-4 rounded-xl text-xs flex items-start space-x-3 border ${
            actionMessage.type === "success"
              ? "bg-emerald-50 text-emerald-900 border-emerald-200"
              : "bg-rose-50 text-rose-900 border-rose-200"
          }`}
        >
          <Icon
            name={actionMessage.type === "success" ? "check-circle" : "exclamation-circle"}
            className={`h-5 w-5 shrink-0 ${actionMessage.type === "success" ? "text-emerald-600" : "text-rose-600"}`}
          />
          <div>
            <span className="font-bold">{actionMessage.type === "success" ? "Operation Successful: " : "Operation Failed: "}</span>
            <span>{actionMessage.text}</span>
          </div>
        </div>
      )}

      {/* ========================================================================= */}
      {/* TAB 1: MARK CLASS ATTENDANCE */}
      {/* ========================================================================= */}
      {activeTab === "mark" && (
        <div className="space-y-6">
          {/* Class Session Parameters Bar */}
          <div className="rounded-2xl border border-slate-200 bg-white p-5 shadow-xs space-y-4">
            <h2 className="text-sm font-bold text-slate-900 flex items-center space-x-2">
              <span>Class Session Parameters</span>
              <span className="text-xs font-normal text-slate-500">(Authorized Faculty / Admin Console)</span>
            </h2>

            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-3 text-xs">
              <div>
                <label className="block font-semibold text-slate-700 mb-1">Academic Date</label>
                <input
                  type="date"
                  value={sessionDate}
                  onChange={(e) => setSessionDate(e.target.value)}
                  className="w-full px-3 py-1.5 rounded-xl border border-slate-200 bg-slate-50 focus:bg-white focus:outline-none focus:ring-1 focus:ring-[#1657D9]"
                />
              </div>

              <div>
                <label className="block font-semibold text-slate-700 mb-1">Subject / Course</label>
                <select
                  value={selectedSubjectId}
                  onChange={(e) => {
                    setSelectedSubjectId(e.target.value);
                    const sub = subjects.find((s) => s.id === e.target.value);
                    if (sub?.teachingAssignments && sub.teachingAssignments.length > 0) {
                      setNewEntryAssignmentId(sub.teachingAssignments[0].id);
                    }
                  }}
                  className="w-full px-3 py-1.5 rounded-xl border border-slate-200 bg-slate-50 focus:bg-white focus:outline-none focus:ring-1 focus:ring-[#1657D9] font-medium"
                >
                  {subjects.map((sub) => (
                    <option key={sub.id} value={sub.id}>
                      {sub.code} - {sub.title} ({sub.subjectType})
                    </option>
                  ))}
                </select>
              </div>

              <div>
                <label className="block font-semibold text-slate-700 mb-1">Time Slot</label>
                <div className="flex items-center space-x-1">
                  <input
                    type="time"
                    value={startTime}
                    onChange={(e) => setStartTime(e.target.value)}
                    className="w-1/2 px-2 py-1.5 rounded-xl border border-slate-200 bg-slate-50 focus:bg-white text-center font-mono text-[11px]"
                  />
                  <span className="text-slate-400">-</span>
                  <input
                    type="time"
                    value={endTime}
                    onChange={(e) => setEndTime(e.target.value)}
                    className="w-1/2 px-2 py-1.5 rounded-xl border border-slate-200 bg-slate-50 focus:bg-white text-center font-mono text-[11px]"
                  />
                </div>
              </div>

              <div>
                <label className="block font-semibold text-slate-700 mb-1">Session Type</label>
                <select
                  value={sessionType}
                  onChange={(e) => setSessionType(e.target.value)}
                  className="w-full px-3 py-1.5 rounded-xl border border-slate-200 bg-slate-50 focus:bg-white focus:outline-none focus:ring-1 focus:ring-[#1657D9]"
                >
                  <option value="THEORY">Theory Lecture</option>
                  <option value="PRACTICAL_LAB">Laboratory / Kitchen Practical</option>
                  <option value="TUTORIAL">Academic Tutorial</option>
                </select>
              </div>

              <div>
                <label className="block font-semibold text-slate-700 mb-1">Facility / Room</label>
                <input
                  type="text"
                  value={roomLocation}
                  onChange={(e) => setRoomLocation(e.target.value)}
                  placeholder="e.g. Basic Training Kitchen 1"
                  className="w-full px-3 py-1.5 rounded-xl border border-slate-200 bg-slate-50 focus:bg-white focus:outline-none focus:ring-1 focus:ring-[#1657D9]"
                />
              </div>
            </div>

            <div>
              <label className="block text-xs font-semibold text-slate-700 mb-1">Topic Covered / Syllabus Milestone (Optional)</label>
              <input
                type="text"
                value={topicCovered}
                onChange={(e) => setTopicCovered(e.target.value)}
                placeholder="e.g. Unit 3: Classical Mother Sauces & Béchamel Practical Demonstration"
                className="w-full px-3 py-1.5 text-xs rounded-xl border border-slate-200 bg-slate-50 focus:bg-white focus:outline-none focus:ring-1 focus:ring-[#1657D9]"
              />
            </div>
          </div>

          {/* Real Student Cohort Roster Sheet */}
          <div className="rounded-2xl border border-slate-200 bg-white p-5 shadow-xs space-y-4">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b border-slate-100 pb-3">
              <div>
                <h3 className="text-sm font-bold text-slate-900 flex items-center space-x-2">
                  <span>Active Enrolment Cohort Roster</span>
                  <span className="px-2 py-0.5 rounded-full text-[10px] bg-blue-100 text-[#1657D9] font-bold">
                    {cohortStudents.length} Students
                  </span>
                </h3>
                <p className="text-xs text-slate-500">
                  Enforced against relational semester &amp; division enrolment. Cross-cohort tampering is strictly rejected.
                </p>
              </div>

              {/* Quick Batch Controls & Sheet Summary */}
              <div className="flex flex-wrap items-center gap-2">
                <button
                  type="button"
                  onClick={() => markAll("PRESENT")}
                  className="px-2.5 py-1 text-[11px] font-bold rounded-lg bg-emerald-50 text-emerald-700 border border-emerald-200 hover:bg-emerald-100 cursor-pointer"
                >
                  Mark All Present
                </button>
                <button
                  type="button"
                  onClick={() => markAll("ABSENT")}
                  className="px-2.5 py-1 text-[11px] font-bold rounded-lg bg-rose-50 text-rose-700 border border-rose-200 hover:bg-rose-100 cursor-pointer"
                >
                  Mark All Absent
                </button>

                <div className="flex items-center space-x-1.5 pl-2 border-l border-slate-200 text-[11px]">
                  <span className="px-2 py-0.5 rounded-md bg-emerald-100 text-emerald-800 font-bold">{sheetPresent} P</span>
                  <span className="px-2 py-0.5 rounded-md bg-amber-100 text-amber-800 font-bold">{sheetLate} L</span>
                  <span className="px-2 py-0.5 rounded-md bg-rose-100 text-rose-800 font-bold">{sheetAbsent} A</span>
                  <span className="px-2 py-0.5 rounded-md bg-blue-100 text-blue-800 font-bold">{sheetExcused} E</span>
                  <span className="px-2 py-0.5 rounded-md bg-slate-900 text-white font-mono font-bold">{currentSheetRate}%</span>
                </div>
              </div>
            </div>

            {cohortStudents.length === 0 ? (
              <div className="py-12 text-center text-slate-400 text-xs">
                No active students enrolled in the selected semester / division cohort.
              </div>
            ) : (
              <div className="overflow-x-auto rounded-xl border border-slate-200">
                <table className="w-full text-left text-xs">
                  <thead className="bg-slate-50 text-slate-600 font-bold uppercase tracking-wider text-[11px] border-b border-slate-200">
                    <tr>
                      <th scope="col" className="px-4 py-3">Roll / PRN</th>
                      <th scope="col" className="px-4 py-3">Student Name</th>
                      <th scope="col" className="px-4 py-3">Cohort / Division</th>
                      <th scope="col" className="px-4 py-3 text-center">Status Marking (Touch-Friendly)</th>
                      <th scope="col" className="px-4 py-3">Remarks</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100">
                    {cohortStudents.map((st) => {
                      const curStatus = attendanceSheet[st.studentId]?.status || "PRESENT";
                      return (
                        <tr key={st.studentId} className="hover:bg-blue-50/30 transition-colors">
                          <td className="px-4 py-3 font-mono font-bold text-slate-800">
                            <div>{st.rollNumber}</div>
                            <div className="text-[10px] text-slate-400 font-normal">PRN: {st.prn}</div>
                          </td>
                          <td className="px-4 py-3 font-semibold text-slate-900">
                            {st.fullName}
                          </td>
                          <td className="px-4 py-3 text-slate-600">
                            <span className="px-2 py-0.5 rounded-md bg-slate-100 text-slate-700 text-[10px] font-medium">
                              {st.divisionName}
                            </span>
                          </td>
                          <td className="px-4 py-3 text-center">
                            <div className="inline-flex items-center space-x-1 bg-slate-100 p-1 rounded-xl">
                              <button
                                type="button"
                                onClick={() => setStudentStatus(st.studentId, "PRESENT")}
                                className={`px-2.5 py-1 text-[11px] font-bold rounded-lg transition-all cursor-pointer ${
                                  curStatus === "PRESENT"
                                    ? "bg-emerald-600 text-white shadow-2xs"
                                    : "text-slate-600 hover:bg-slate-200"
                                }`}
                              >
                                Present
                              </button>
                              <button
                                type="button"
                                onClick={() => setStudentStatus(st.studentId, "LATE")}
                                className={`px-2.5 py-1 text-[11px] font-bold rounded-lg transition-all cursor-pointer ${
                                  curStatus === "LATE"
                                    ? "bg-amber-500 text-white shadow-2xs"
                                    : "text-slate-600 hover:bg-slate-200"
                                }`}
                              >
                                Late
                              </button>
                              <button
                                type="button"
                                onClick={() => setStudentStatus(st.studentId, "ABSENT")}
                                className={`px-2.5 py-1 text-[11px] font-bold rounded-lg transition-all cursor-pointer ${
                                  curStatus === "ABSENT"
                                    ? "bg-rose-600 text-white shadow-2xs"
                                    : "text-slate-600 hover:bg-slate-200"
                                }`}
                              >
                                Absent
                              </button>
                              <button
                                type="button"
                                onClick={() => setStudentStatus(st.studentId, "EXCUSED")}
                                className={`px-2.5 py-1 text-[11px] font-bold rounded-lg transition-all cursor-pointer ${
                                  curStatus === "EXCUSED"
                                    ? "bg-blue-600 text-white shadow-2xs"
                                    : "text-slate-600 hover:bg-slate-200"
                                }`}
                              >
                                Excused
                              </button>
                            </div>
                          </td>
                          <td className="px-4 py-3">
                            <input
                              type="text"
                              placeholder="Optional remark..."
                              value={attendanceSheet[st.studentId]?.remarks || ""}
                              onChange={(e) => setStudentRemarks(st.studentId, e.target.value)}
                              className="w-full px-2.5 py-1 text-[11px] rounded-lg border border-slate-200 bg-slate-50 focus:bg-white focus:outline-none"
                            />
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            )}

            {/* Bottom Actions */}
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pt-3 border-t border-slate-100">
              <div className="text-xs text-slate-500">
                Calculated Session Attendance: <span className="font-bold text-slate-900">{currentSheetRate}%</span> ({sheetPresent + sheetLate} of {sheetTotal} present/late)
              </div>

              <div className="flex items-center space-x-3">
                <button
                  type="button"
                  disabled={isPending || cohortStudents.length === 0}
                  onClick={() => handleSaveAttendance("DRAFT")}
                  className="px-4 py-2 text-xs font-bold rounded-xl border border-slate-300 text-slate-700 bg-white hover:bg-slate-50 transition-all cursor-pointer disabled:opacity-50"
                >
                  Save as Draft
                </button>
                <button
                  type="button"
                  disabled={isPending || cohortStudents.length === 0}
                  onClick={() => handleSaveAttendance("FINALIZED")}
                  className="px-5 py-2 text-xs font-bold rounded-xl bg-[#1657D9] text-white hover:bg-[#1246B0] shadow-xs transition-all cursor-pointer disabled:opacity-50"
                >
                  {isPending ? "Recording..." : "Finalize Attendance Ledger"}
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* ========================================================================= */}
      {/* TAB 2: ATTENDANCE LEDGER & SESSION AUDIT */}
      {/* ========================================================================= */}
      {activeTab === "ledger" && (
        <div className="space-y-6">
          <div className="rounded-2xl border border-slate-200 bg-white p-5 shadow-xs space-y-4">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
              <div>
                <h2 className="text-sm font-bold text-slate-900">Institutional Attendance Ledger</h2>
                <p className="text-xs text-slate-500">
                  Conducted sessions recorded in SQLite with cryptographic audit logs and modification history.
                </p>
              </div>
            </div>

            {sessionsList.length === 0 ? (
              <div className="py-12 text-center text-slate-400 text-xs">
                No recorded attendance sessions found for this cohort. Mark attendance in the first tab to begin the ledger.
              </div>
            ) : (
              <div className="overflow-x-auto rounded-xl border border-slate-200">
                <table className="w-full text-left text-xs">
                  <thead className="bg-slate-50 text-slate-600 font-bold uppercase tracking-wider text-[11px] border-b border-slate-200">
                    <tr>
                      <th scope="col" className="px-4 py-3">Date &amp; Time</th>
                      <th scope="col" className="px-4 py-3">Subject &amp; Type</th>
                      <th scope="col" className="px-4 py-3">Cohort</th>
                      <th scope="col" className="px-4 py-3">Faculty Member</th>
                      <th scope="col" className="px-4 py-3 text-center">Attendance Stats</th>
                      <th scope="col" className="px-4 py-3 text-center">Ledger Status</th>
                      <th scope="col" className="px-4 py-3 text-right">Actions</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100">
                    {sessionsList.map((ses) => (
                      <tr key={ses.id} className="hover:bg-blue-50/30 transition-colors">
                        <td className="px-4 py-3 font-mono text-slate-800">
                          <div className="font-bold">{new Date(ses.sessionDate).toISOString().split("T")[0]}</div>
                          <div className="text-[10px] text-slate-400">{ses.startTime} - {ses.endTime}</div>
                        </td>
                        <td className="px-4 py-3">
                          <div className="font-semibold text-slate-900">{ses.subjectTitle}</div>
                          <div className="text-[10px] text-slate-500 font-mono">{ses.subjectCode} • {ses.sessionType}</div>
                        </td>
                        <td className="px-4 py-3 text-slate-700">
                          <div>{ses.programmeCode} • Sem {ses.semesterNumber}</div>
                          <div className="text-[10px] text-slate-400">{ses.divisionName}</div>
                        </td>
                        <td className="px-4 py-3 text-slate-800 font-medium">
                          {ses.facultyName}
                        </td>
                        <td className="px-4 py-3 text-center">
                          <span className="inline-flex items-center px-2 py-0.5 rounded-md text-[11px] font-bold bg-blue-50 text-[#1657D9]">
                            {ses.counts.present + ses.counts.late} / {ses.counts.total} ({ses.counts.attendanceRate}%)
                          </span>
                        </td>
                        <td className="px-4 py-3 text-center">
                          {ses.status === "FINALIZED" ? (
                            <span className="inline-flex items-center px-2 py-0.5 rounded-full text-[10px] font-bold bg-emerald-100 text-emerald-800 border border-emerald-200">
                              Finalized
                            </span>
                          ) : (
                            <span className="inline-flex items-center px-2 py-0.5 rounded-full text-[10px] font-bold bg-amber-100 text-amber-800 border border-amber-200">
                              Draft
                            </span>
                          )}
                        </td>
                        <td className="px-4 py-3 text-right space-x-2">
                          <button
                            type="button"
                            onClick={() => handleInspectSession(ses.id)}
                            className="px-2.5 py-1 text-[11px] font-semibold text-[#1657D9] hover:bg-blue-50 rounded-lg border border-blue-200 cursor-pointer"
                          >
                            Inspect Audit Sheet
                          </button>
                          {ses.status === "DRAFT" && (
                            <button
                              type="button"
                              onClick={() => handleFinalizeExistingSession(ses.id)}
                              className="px-2.5 py-1 text-[11px] font-semibold text-emerald-700 hover:bg-emerald-50 rounded-lg border border-emerald-200 cursor-pointer"
                            >
                              Finalize
                            </button>
                          )}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </div>

          {/* Detailed Audit Modal / Inspector */}
          {selectedSessionAudit && (
            <div className="rounded-2xl border border-slate-300 bg-white p-6 shadow-md space-y-4">
              <div className="flex items-center justify-between border-b border-slate-200 pb-3">
                <div>
                  <h3 className="text-base font-bold text-slate-900 flex items-center space-x-2">
                    <span>Attendance Session Audit Dossier</span>
                    <span className="text-xs font-mono font-normal text-slate-400">({selectedSessionAudit.id})</span>
                  </h3>
                  <p className="text-xs text-slate-500">
                    Recorded by <span className="font-bold text-slate-800">{selectedSessionAudit.recordedBy.fullName}</span> ({selectedSessionAudit.recordedBy.role}) on {new Date(selectedSessionAudit.createdAt).toLocaleString()}
                  </p>
                </div>
                <button
                  type="button"
                  onClick={() => setSelectedSessionAudit(null)}
                  className="px-3 py-1 text-xs font-bold text-slate-500 hover:text-slate-800 rounded-lg border border-slate-200"
                >
                  Close Dossier
                </button>
              </div>

              <div className="overflow-x-auto rounded-xl border border-slate-200">
                <table className="w-full text-left text-xs">
                  <thead className="bg-slate-50 text-slate-600 font-bold uppercase tracking-wider text-[11px] border-b border-slate-200">
                    <tr>
                      <th scope="col" className="px-4 py-3">Student Roll / PRN</th>
                      <th scope="col" className="px-4 py-3">Name</th>
                      <th scope="col" className="px-4 py-3">Status</th>
                      <th scope="col" className="px-4 py-3">Remarks</th>
                      <th scope="col" className="px-4 py-3">Audit Trail</th>
                      <th scope="col" className="px-4 py-3 text-right">Correction</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100">
                    {selectedSessionAudit.attendanceRecords.map((rec) => (
                      <tr key={rec.id} className="hover:bg-slate-50">
                        <td className="px-4 py-2.5 font-mono font-bold text-slate-800">
                          {rec.student.rollNumber}
                          <div className="text-[10px] text-slate-400 font-normal">PRN: {rec.student.prn}</div>
                        </td>
                        <td className="px-4 py-2.5 font-semibold text-slate-900">
                          {rec.student.fullName}
                        </td>
                        <td className="px-4 py-2.5">
                          <span
                            className={`inline-flex items-center px-2 py-0.5 rounded-full text-[10px] font-bold ${
                              rec.status === "PRESENT"
                                ? "bg-emerald-100 text-emerald-800"
                                : rec.status === "LATE"
                                ? "bg-amber-100 text-amber-800"
                                : rec.status === "ABSENT"
                                ? "bg-rose-100 text-rose-800"
                                : "bg-blue-100 text-blue-800"
                            }`}
                          >
                            {rec.status}
                          </span>
                        </td>
                        <td className="px-4 py-2.5 text-slate-600">
                          {rec.remarks || "—"}
                        </td>
                        <td className="px-4 py-2.5 text-[10px] text-slate-400">
                          {rec.amendedAt ? (
                            <div>
                              Amended by {rec.amendedBy?.fullName || "Admin"} on {new Date(rec.amendedAt).toLocaleDateString()}
                            </div>
                          ) : (
                            <div>Marked at {new Date(rec.markedAt).toLocaleTimeString()}</div>
                          )}
                        </td>
                        <td className="px-4 py-2.5 text-right">
                          <button
                            type="button"
                            onClick={() => {
                              setRecordToAmend(rec);
                              setAmendStatus(rec.status);
                              setAmendRemarks(rec.remarks || "");
                              setAmendModalOpen(true);
                            }}
                            className="px-2 py-1 text-[11px] font-bold text-[#1657D9] hover:bg-blue-50 rounded-lg border border-blue-200"
                          >
                            Amend
                          </button>
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

      {/* ========================================================================= */}
      {/* TAB 3: TIMETABLE & SCHEDULING MATRIX */}
      {/* ========================================================================= */}
      {activeTab === "timetable" && (
        <div className="space-y-6">
          <div className="rounded-2xl border border-slate-200 bg-white p-5 shadow-xs space-y-4">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
              <div>
                <h2 className="text-sm font-bold text-slate-900">Weekly Academic Timetable Schedule</h2>
                <p className="text-xs text-slate-500">
                  Official clash-free lecture and laboratory timetable. Validates faculty, room, and cohort schedules.
                </p>
              </div>

              <button
                type="button"
                onClick={() => {
                  setNewEntryError(null);
                  setShowAddTimetableModal(true);
                }}
                className="flex items-center space-x-1.5 px-4 py-2 text-xs font-bold rounded-xl bg-[#1657D9] text-white hover:bg-[#1246B0] shadow-xs cursor-pointer"
              >
                <Icon name="calendar" className="h-4 w-4" />
                <span>Add Timetable Slot</span>
              </button>
            </div>

            {/* Weekly Schedule Days Cards */}
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4 pt-2">
              {["MONDAY", "TUESDAY", "WEDNESDAY", "THURSDAY", "FRIDAY", "SATURDAY"].map((day) => {
                const dayEntries = timetableEntries.filter((t) => t.dayOfWeek === day);
                return (
                  <div key={day} className="rounded-xl border border-slate-200 bg-slate-50/70 p-4 space-y-3">
                    <div className="flex items-center justify-between border-b border-slate-200 pb-2">
                      <span className="text-xs font-bold text-slate-800 tracking-wide">{day}</span>
                      <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-white text-slate-600 border border-slate-200">
                        {dayEntries.length} Classes
                      </span>
                    </div>

                    {dayEntries.length === 0 ? (
                      <div className="py-6 text-center text-slate-400 text-[11px]">
                        No scheduled sessions
                      </div>
                    ) : (
                      <div className="space-y-2">
                        {dayEntries.map((ent) => (
                          <div
                            key={ent.id}
                            className="rounded-lg border border-slate-200 bg-white p-3 shadow-2xs hover:border-[#1657D9]/40 transition-all space-y-2"
                          >
                            <div className="flex items-start justify-between gap-2">
                              <div>
                                <span className="text-[10px] font-mono font-bold px-1.5 py-0.5 rounded-md bg-blue-50 text-[#1657D9]">
                                  {ent.startTime} - {ent.endTime}
                                </span>
                                <h4 className="text-xs font-bold text-slate-900 mt-1">
                                  {ent.subject.title}
                                </h4>
                                <div className="text-[10px] text-slate-500 font-mono">
                                  {ent.subject.code} • {ent.sessionType}
                                </div>
                              </div>
                              <button
                                type="button"
                                onClick={() => handleCancelTimetableEntry(ent.id)}
                                title="Cancel timetable slot"
                                className="text-slate-400 hover:text-rose-600 p-1"
                              >
                                <Icon name="x-mark" className="h-3.5 w-3.5" />
                              </button>
                            </div>

                            <div className="text-[11px] text-slate-600 space-y-0.5 pt-1 border-t border-slate-100">
                              <div className="flex items-center space-x-1">
                                <span className="text-slate-400 text-[10px]">Faculty:</span>
                                <span className="font-medium text-slate-800">{ent.teachingAssignment?.staff?.fullName || "Assigned"}</span>
                              </div>
                              {ent.room && (
                                <div className="flex items-center space-x-1">
                                  <span className="text-slate-400 text-[10px]">Room:</span>
                                  <span className="font-medium text-slate-700">{ent.room}</span>
                                </div>
                              )}
                              <div className="flex items-center space-x-1">
                                <span className="text-slate-400 text-[10px]">Cohort:</span>
                                <span className="font-medium text-slate-700">{ent.division?.name || "Cohort-Wide"}</span>
                              </div>
                            </div>

                            {/* Direct launch into attendance */}
                            <button
                              type="button"
                              onClick={() => {
                                setSelectedSubjectId(ent.subjectId);
                                setStartTime(ent.startTime);
                                setEndTime(ent.endTime);
                                setSessionType(ent.sessionType);
                                if (ent.room) setRoomLocation(ent.room);
                                setActiveTab("mark");
                              }}
                              className="w-full mt-1 px-2 py-1 text-[11px] font-bold text-center text-[#1657D9] hover:bg-blue-50 rounded-lg border border-blue-200 transition-colors"
                            >
                              Launch Attendance Sheet
                            </button>
                          </div>
                        ))}
                      </div>
                    )}
                  </div>
                );
              })}
            </div>
          </div>
        </div>
      )}

      {/* ========================================================================= */}
      {/* TAB 4: CALCULATIONS & SUMMARIES */}
      {/* ========================================================================= */}
      {activeTab === "analytics" && (
        <div className="space-y-6">
          {/* Institutional Policy & Formula Card */}
          <div className="rounded-2xl border border-slate-200 bg-white p-6 shadow-xs space-y-3">
            <div className="flex items-center space-x-2">
              <div className="p-1.5 rounded-lg bg-blue-50 text-[#1657D9]">
                <Icon name="chart-bar" className="h-5 w-5" />
              </div>
              <h2 className="text-sm font-bold text-slate-900">Attendance Rate Calculation Methodology &amp; Policy</h2>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-3 gap-4 text-xs pt-2">
              <div className="p-4 rounded-xl border border-slate-200 bg-slate-50">
                <h4 className="font-bold text-slate-900 mb-1">Numerator Definition</h4>
                <p className="text-slate-600">
                  Sum of verified <span className="font-semibold text-emerald-700">PRESENT (1.0)</span> and <span className="font-semibold text-amber-700">LATE (1.0)</span> marks attended by the student.
                </p>
              </div>

              <div className="p-4 rounded-xl border border-slate-200 bg-slate-50">
                <h4 className="font-bold text-slate-900 mb-1">Denominator Definition</h4>
                <p className="text-slate-600">
                  Total recorded, eligible sessions conducted for the student&apos;s enrolled cohort. Cancelled sessions and unconducted timetable slots are completely excluded.
                </p>
              </div>

              <div className="p-4 rounded-xl border border-slate-200 bg-slate-50">
                <h4 className="font-bold text-slate-900 mb-1">Institutional Restraint</h4>
                <p className="text-slate-600">
                  Missing records are never assumed to be absences. CampusOS does not automatically trigger examination debarment without authorized University of Mumbai directives.
                </p>
              </div>
            </div>
          </div>

          {/* Real Metrics Summary */}
          {summaryData && (
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
              <div className="p-5 rounded-2xl border border-slate-200 bg-white shadow-xs">
                <span className="text-xs text-slate-500 font-medium">Total Conducted Sessions</span>
                <div className="text-2xl font-bold text-slate-900 mt-1">{summaryData.totalConductedSessions}</div>
                <span className="text-[10px] text-slate-400">Excluding cancelled slots</span>
              </div>

              <div className="p-5 rounded-2xl border border-slate-200 bg-white shadow-xs">
                <span className="text-xs text-slate-500 font-medium">Total Attendance Marks</span>
                <div className="text-2xl font-bold text-slate-900 mt-1">{summaryData.totalRecords}</div>
                <span className="text-[10px] text-slate-400">Recorded in SQLite ledger</span>
              </div>

              <div className="p-5 rounded-2xl border border-slate-200 bg-white shadow-xs">
                <span className="text-xs text-slate-500 font-medium">Cohort Average Rate</span>
                <div className="text-2xl font-bold text-[#1657D9] mt-1">
                  {summaryData.attendanceRate !== null ? `${summaryData.attendanceRate}%` : "—"}
                </div>
                <span className={`text-[10px] font-medium ${summaryData.attendanceRate !== null ? "text-emerald-600" : "text-slate-400"}`}>
                  {summaryData.attendanceRate !== null ? "Eligible attendance ratio" : "No sessions recorded"}
                </span>
              </div>

              <div className="p-5 rounded-2xl border border-slate-200 bg-white shadow-xs">
                <span className="text-xs text-slate-500 font-medium">Absentee Marks</span>
                <div className="text-2xl font-bold text-rose-600 mt-1">{summaryData.absentCount}</div>
                <span className="text-[10px] text-slate-400">Unexcused class absences</span>
              </div>
            </div>
          )}

          {/* Course & Subject Attendance Breakdown */}
          {summaryData && summaryData.subjectBreakdown && summaryData.subjectBreakdown.length > 0 && (
            <div className="rounded-2xl border border-slate-200 bg-white p-5 shadow-xs space-y-3">
              <h3 className="text-sm font-bold text-slate-900">Course &amp; Subject Attendance Breakdown</h3>
              <p className="text-xs text-slate-500">
                Independent subject metrics calculated without double-counting.
              </p>
              <div className="overflow-x-auto rounded-xl border border-slate-200">
                <table className="w-full text-left text-xs">
                  <thead className="bg-slate-50 text-slate-600 font-bold uppercase tracking-wider text-[11px] border-b border-slate-200">
                    <tr>
                      <th className="px-4 py-3">Subject / Course</th>
                      <th className="px-4 py-3 text-center">Conducted Sessions</th>
                      <th className="px-4 py-3 text-center">Present</th>
                      <th className="px-4 py-3 text-center">Late</th>
                      <th className="px-4 py-3 text-center">Absent</th>
                      <th className="px-4 py-3 text-center">Excused</th>
                      <th className="px-4 py-3 text-right">Attendance Rate</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100">
                    {summaryData.subjectBreakdown.map((sb) => (
                      <tr key={sb.subjectId} className="hover:bg-blue-50/20">
                        <td className="px-4 py-3">
                          <span className="font-mono font-bold text-[#1657D9]">{sb.subjectCode}</span>
                          <span className="text-slate-700 ml-2 font-medium">{sb.subjectTitle}</span>
                        </td>
                        <td className="px-4 py-3 text-center font-bold text-slate-800">{sb.conductedSessions}</td>
                        <td className="px-4 py-3 text-center text-emerald-700 font-semibold">{sb.presentCount}</td>
                        <td className="px-4 py-3 text-center text-amber-700 font-semibold">{sb.lateCount}</td>
                        <td className="px-4 py-3 text-center text-rose-700 font-semibold">{sb.absentCount}</td>
                        <td className="px-4 py-3 text-center text-blue-700 font-semibold">{sb.excusedCount}</td>
                        <td className="px-4 py-3 text-right font-mono font-bold text-slate-900">
                          {sb.attendanceRate !== null ? `${sb.attendanceRate}%` : "—"}
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

      {/* ========================================================================= */}
      {/* MODAL: ADD TIMETABLE SLOT */}
      {/* ========================================================================= */}
      {showAddTimetableModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/50 backdrop-blur-xs p-4">
          <div className="w-full max-w-lg rounded-2xl bg-white p-6 shadow-xl space-y-4 border border-slate-200">
            <div className="flex items-center justify-between border-b border-slate-100 pb-3">
              <h3 className="text-base font-bold text-slate-900">Provision Timetable Slot</h3>
              <button
                type="button"
                onClick={() => setShowAddTimetableModal(false)}
                className="text-slate-400 hover:text-slate-600 p-1"
              >
                <Icon name="x-mark" className="h-4 w-4" />
              </button>
            </div>

            {newEntryError && (
              <div className="p-3 rounded-xl bg-rose-50 text-rose-900 border border-rose-200 text-xs">
                <span className="font-bold">Schedule Conflict / Error: </span>
                <span>{newEntryError}</span>
              </div>
            )}

            <div className="space-y-3 text-xs">
              <div>
                <label className="block font-semibold text-slate-700 mb-1">Subject</label>
                <select
                  value={selectedSubjectId}
                  onChange={(e) => {
                    setSelectedSubjectId(e.target.value);
                    const sub = subjects.find((s) => s.id === e.target.value);
                    if (sub?.teachingAssignments && sub.teachingAssignments.length > 0) {
                      setNewEntryAssignmentId(sub.teachingAssignments[0].id);
                    }
                  }}
                  className="w-full px-3 py-2 rounded-xl border border-slate-200 bg-slate-50"
                >
                  {subjects.map((sub) => (
                    <option key={sub.id} value={sub.id}>{sub.code} - {sub.title}</option>
                  ))}
                </select>
              </div>

              <div>
                <label className="block font-semibold text-slate-700 mb-1">Teaching Assignment (Faculty &amp; Division)</label>
                <select
                  value={newEntryAssignmentId}
                  onChange={(e) => setNewEntryAssignmentId(e.target.value)}
                  className="w-full px-3 py-2 rounded-xl border border-slate-200 bg-slate-50"
                >
                  <option value="">Select faculty assignment...</option>
                  {subjects.find((s) => s.id === selectedSubjectId)?.teachingAssignments?.map((a) => (
                    <option key={a.id} value={a.id}>
                      {a.staff?.fullName} ({a.division?.name || "Cohort-Wide"}) • {a.weeklyHours} hrs/wk
                    </option>
                  ))}
                </select>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block font-semibold text-slate-700 mb-1">Academic Day</label>
                  <select
                    value={newEntryDay}
                    onChange={(e) => setNewEntryDay(e.target.value)}
                    className="w-full px-3 py-2 rounded-xl border border-slate-200 bg-slate-50"
                  >
                    {["MONDAY", "TUESDAY", "WEDNESDAY", "THURSDAY", "FRIDAY", "SATURDAY"].map((d) => (
                      <option key={d} value={d}>{d}</option>
                    ))}
                  </select>
                </div>

                <div>
                  <label className="block font-semibold text-slate-700 mb-1">Room / Facility</label>
                  <input
                    type="text"
                    value={newEntryRoom}
                    onChange={(e) => setNewEntryRoom(e.target.value)}
                    placeholder="e.g. Basic Training Kitchen 1"
                    className="w-full px-3 py-2 rounded-xl border border-slate-200 bg-slate-50"
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block font-semibold text-slate-700 mb-1">Start Time</label>
                  <input
                    type="time"
                    value={newEntryStart}
                    onChange={(e) => setNewEntryStart(e.target.value)}
                    className="w-full px-3 py-2 rounded-xl border border-slate-200 bg-slate-50 font-mono text-center"
                  />
                </div>
                <div>
                  <label className="block font-semibold text-slate-700 mb-1">End Time</label>
                  <input
                    type="time"
                    value={newEntryEnd}
                    onChange={(e) => setNewEntryEnd(e.target.value)}
                    className="w-full px-3 py-2 rounded-xl border border-slate-200 bg-slate-50 font-mono text-center"
                  />
                </div>
              </div>
            </div>

            <div className="flex items-center justify-end space-x-2 pt-3 border-t border-slate-100">
              <button
                type="button"
                onClick={() => setShowAddTimetableModal(false)}
                className="px-4 py-2 text-xs font-bold rounded-xl border border-slate-200 text-slate-700 hover:bg-slate-50"
              >
                Cancel
              </button>
              <button
                type="button"
                disabled={isPending}
                onClick={handleCreateTimetableEntry}
                className="px-5 py-2 text-xs font-bold rounded-xl bg-[#1657D9] text-white hover:bg-[#1246B0] shadow-xs disabled:opacity-50"
              >
                {isPending ? "Validating Overlaps..." : "Save Timetable Slot"}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ========================================================================= */}
      {/* MODAL: AMEND ATTENDANCE RECORD */}
      {/* ========================================================================= */}
      {amendModalOpen && recordToAmend && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/50 backdrop-blur-xs p-4">
          <div className="w-full max-w-md rounded-2xl bg-white p-6 shadow-xl space-y-4 border border-slate-200">
            <div className="flex items-center justify-between border-b border-slate-100 pb-3">
              <h3 className="text-base font-bold text-slate-900">Amend Attendance Ledger Entry</h3>
              <button
                type="button"
                onClick={() => setAmendModalOpen(false)}
                className="text-slate-400 hover:text-slate-600 p-1"
              >
                <Icon name="x-mark" className="h-4 w-4" />
              </button>
            </div>

            <div className="space-y-3 text-xs">
              <div className="p-3 rounded-xl bg-slate-50 border border-slate-200">
                <div className="font-bold text-slate-900">{recordToAmend.student.fullName}</div>
                <div className="text-slate-500 font-mono">Roll: {recordToAmend.student.rollNumber} • PRN: {recordToAmend.student.prn}</div>
              </div>

              <div>
                <label className="block font-semibold text-slate-700 mb-1">New Status</label>
                <select
                  value={amendStatus}
                  onChange={(e) => setAmendStatus(e.target.value as "PRESENT" | "ABSENT" | "LATE" | "EXCUSED")}
                  className="w-full px-3 py-2 rounded-xl border border-slate-200 bg-slate-50"
                >
                  <option value="PRESENT">PRESENT (Attended)</option>
                  <option value="LATE">LATE (Attended with Late Arrival)</option>
                  <option value="ABSENT">ABSENT (Unexcused)</option>
                  <option value="EXCUSED">EXCUSED (Medical / Official Representation)</option>
                </select>
              </div>

              <div>
                <label className="block font-semibold text-slate-700 mb-1">Administrative Justification / Remarks</label>
                <textarea
                  value={amendRemarks}
                  onChange={(e) => setAmendRemarks(e.target.value)}
                  placeholder="Enter official justification for audit trail (e.g. Verified Medical Certificate ref: MC-2026-99)..."
                  className="w-full px-3 py-2 rounded-xl border border-slate-200 bg-slate-50 h-20"
                />
              </div>
            </div>

            <div className="flex items-center justify-end space-x-2 pt-3 border-t border-slate-100">
              <button
                type="button"
                onClick={() => setAmendModalOpen(false)}
                className="px-4 py-2 text-xs font-bold rounded-xl border border-slate-200 text-slate-700 hover:bg-slate-50"
              >
                Cancel
              </button>
              <button
                type="button"
                disabled={isPending}
                onClick={handleAmendRecordSubmit}
                className="px-5 py-2 text-xs font-bold rounded-xl bg-[#1657D9] text-white hover:bg-[#1246B0] shadow-xs disabled:opacity-50"
              >
                Commit Amendment
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
