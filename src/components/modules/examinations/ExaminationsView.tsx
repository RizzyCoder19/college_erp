"use client";

import React, { useState, useEffect, useTransition } from "react";
import { Icon } from "@/components/common/Icon";
import {
  getExamSessionsAction,
  createExamSessionAction,
  createAssessmentComponentAction,
  getComponentsForSessionAction,
  getExamRosterForComponentAction,
  recordStudentMarksAction,
  moderateStudentMarksAction,
  calculateSessionResultsAction,
  publishSessionResultsAction,
  getStudentResultSummariesAction,
  amendPublishedMarkAction,
} from "@/lib/actions/examinations";
import { getAcademicYearsAction, getSubjectsAction, getSemestersAction } from "@/lib/actions/academics";

type TabType = "sessions" | "marks" | "moderation" | "gradecards";


interface AcademicYearOption {
  id: string;
  yearName?: string;
  name?: string;
  code?: string;
  isCurrent?: boolean;
  [key: string]: unknown;
}

interface SemesterOption {
  id: string;
  name?: string;
  semesterNumber?: number;
  termType?: string;
  programme?: { code?: string; name?: string; [key: string]: unknown };
  academicYearId?: string;
  [key: string]: unknown;
}

interface SubjectOption {
  id: string;
  name?: string;
  title?: string;
  code?: string;
  credits?: number;
  semesterId?: string;
  teachingAssignments?: { staff?: { fullName?: string; [key: string]: unknown }; [key: string]: unknown }[];
  [key: string]: unknown;
}

interface ExamSessionOption {
  id: string;
  name: string;
  sessionCode: string;
  sessionType: string;
  status: string;
  startDate?: string | Date;
  endDate?: string | Date;
  academicYear?: { name?: string; yearName?: string; [key: string]: unknown };
  _count?: { assessmentComponents?: number; resultSummaries?: number; [key: string]: unknown };
  [key: string]: unknown;
}

interface ComponentOption {
  id: string;
  name: string;
  componentType: string;
  maxMarks: number;
  weightagePercentage: number;
  passingMarks?: number | null;
  minPassingMarks?: number | null;
  examSessionId?: string;
  subjectId?: string;
  subject?: SubjectOption;
  _count?: { studentEntries?: number; markEntries?: number; [key: string]: unknown };
  [key: string]: unknown;
}

interface RosterCandidateItem {
  entryId?: string;
  studentId: string;
  rollNumber: string;
  studentName?: string;
  fullName?: string;
  prn?: string;
  divisionName?: string;
  enrolmentId: string;
  marksObtained: number | null;
  moderatedMarks?: number | null;
  moderatedBy?: string | { fullName?: string; [key: string]: unknown };
  entryStatus: string;
  remarks: string;
  isPassed?: boolean | null;
  [key: string]: unknown;
}

interface SubjectResultOption {
  id: string;
  subjectId?: string;
  subject?: { code?: string; title?: string; name?: string; [key: string]: unknown };
  subjectName?: string;
  subjectCode?: string;
  credits?: number;
  totalMarksObtained?: number | null;
  totalMaxMarks?: number;
  marksObtained?: number;
  maxMarks?: number;
  letterGrade?: string;
  grade?: string;
  gradePoint?: number;
  status?: string;
  resultStatus?: string;
  isPassed?: boolean;
  [key: string]: unknown;
}

interface StudentSummaryOption {
  id?: string;
  studentId: string;
  student?: { name?: string; prn?: string; rollNumber?: string; fullName?: string; [key: string]: unknown };
  semester?: { semesterNumber?: number; programme?: { code?: string; name?: string; [key: string]: unknown }; [key: string]: unknown };
  examSession?: { name?: string; sessionCode?: string; [key: string]: unknown };
  studentName?: string;
  fullName?: string;
  rollNumber?: string;
  totalMarksObtained: number;
  totalMaxMarks: number;
  percentage: number;
  sgpa?: number | null;
  letterGrade?: string;
  resultStatus: string;
  isPublished?: boolean;
  publishedBy?: { fullName?: string; [key: string]: unknown };
  subjectResults?: SubjectResultOption[];
  [key: string]: unknown;
}

export const ExaminationsView: React.FC = () => {
  const [activeTab, setActiveTab] = useState<TabType>("sessions");
  const [isPending, startTransition] = useTransition();
  const [message, setMessage] = useState<{ text: string; type: "success" | "error" } | null>(null);

  // Reference data
  const [academicYears, setAcademicYears] = useState<AcademicYearOption[]>([]);
  const [semesters, setSemesters] = useState<SemesterOption[]>([]);
  const [subjects, setSubjects] = useState<SubjectOption[]>([]);
  const [examSessions, setExamSessions] = useState<ExamSessionOption[]>([]);

  // Tab 1 state: Sessions & Components
  const [selectedSessionId, setSelectedSessionId] = useState<string>("");
  const [sessionComponents, setSessionComponents] = useState<ComponentOption[]>([]);
  const [showNewSessionModal, setShowNewSessionModal] = useState<boolean>(false);
  const [showNewComponentModal, setShowNewComponentModal] = useState<boolean>(false);
  const [newSessionForm, setNewSessionForm] = useState({
    academicYearId: "",
    name: "",
    sessionCode: "",
    sessionType: "REGULAR",
    startDate: "2026-11-15",
    endDate: "2026-12-05",
  });
  const [newComponentForm, setNewComponentForm] = useState<{
    name: string;
    componentType: "THEORY_SEE" | "INTERNAL_IA" | "PRACTICAL_SEE" | "VIVA_VOCE";
    maxMarks: number;
    weightagePercentage: number;
    passingMarks?: number;
    minPassingMarks: number;
    subjectId: string;
  }>({
    subjectId: "",
    name: "Theory End-Semester Exam",
    componentType: "THEORY_SEE" as const,
    maxMarks: 75,
    minPassingMarks: 30,
    weightagePercentage: 75,
  });

  // Tab 2 state: Marks Entry
  const [activeComponentId, setActiveComponentId] = useState<string>("");
  const [rosterData, setRosterData] = useState<{ component?: ComponentOption; roster: RosterCandidateItem[] }>({ roster: [] });
  const [markEdits, setMarkEdits] = useState<{ [studentId: string]: { marksObtained: number | null; entryStatus: string; remarks: string } }>({});

  // Tab 3 state: Moderation & Publication
  const [moderationSemesterId, setModerationSemesterId] = useState<string>("");
  const [calculatedSummaries, setCalculatedSummaries] = useState<StudentSummaryOption[]>([]);
  const [selectedModerationEntry, setSelectedModerationEntry] = useState<RosterCandidateItem | null>(null);
  const [moderationScoreInput, setModerationScoreInput] = useState<string>("");
  const [moderationReasonInput, setModerationReasonInput] = useState<string>("");
  const [showPublishConfirm, setShowPublishConfirm] = useState<boolean>(false);

  // Tab 4 state: Grade Cards
  const [gradeCardSearch, setGradeCardSearch] = useState<string>("");
  const [studentSummaries, setStudentSummaries] = useState<StudentSummaryOption[]>([]);
  const [selectedStudentSummary, setSelectedStudentSummary] = useState<StudentSummaryOption | null>(null);
  const [amendmentEntry, setAmendmentEntry] = useState<SubjectResultOption | null>(null);
  const [amendmentScore, setAmendmentScore] = useState<string>("");
  const [amendmentReason, setAmendmentReason] = useState<string>("");

  const loadReferenceData = async () => {
    const [ayRes, semRes, subRes] = await Promise.all([
      getAcademicYearsAction(),
      getSemestersAction(),
      getSubjectsAction(),
    ]);
    if (ayRes.success && ayRes.data) {
      setAcademicYears(ayRes.data);
      if (ayRes.data.length > 0) {
        setNewSessionForm((prev) => ({ ...prev, academicYearId: ayRes.data![0].id }));
      }
    }
    if (semRes.success && semRes.data) {
      setSemesters(semRes.data);
      if (semRes.data.length > 0) {
        setModerationSemesterId(semRes.data[0].id);
      }
    }
    if (subRes.success && subRes.data) {
      setSubjects(subRes.data);
      if (subRes.data.length > 0) {
        setNewComponentForm((prev) => ({ ...prev, subjectId: subRes.data![0].id }));
      }
    }
  };

  const loadSessions = async () => {
    const res = await getExamSessionsAction();
    if (res.success && res.data) {
      setExamSessions(res.data as unknown as ExamSessionOption[]);
      if (res.data.length > 0 && !selectedSessionId) {
        setSelectedSessionId(res.data[0].id);
        loadSessionComponents(res.data[0].id);
      }
    }
  };

  // Initial load
  useEffect(() => {
    loadReferenceData();
    loadSessions();
  }, []);

  const loadSessionComponents = async (sessionId: string) => {
    if (!sessionId) return;
    const res = await getComponentsForSessionAction(sessionId);
    if (res.success && res.data) {
      setSessionComponents(res.data as unknown as ComponentOption[]);
      if (res.data.length > 0) {
        setActiveComponentId(res.data[0].id);
        loadRoster(res.data[0].id);
      } else {
        setActiveComponentId("");
        setRosterData({ roster: [] });
      }
    }
  };

  const loadRoster = async (compId: string) => {
    if (!compId) return;
    startTransition(async () => {
      const res = await getExamRosterForComponentAction(compId);
      if (res.success && res.data) {
        setRosterData(res.data as unknown as { component?: ComponentOption; roster: RosterCandidateItem[] });
        // Prepopulate markEdits
        const initialEdits: Record<string, { marksObtained: number | null; entryStatus: string; remarks: string }> = {};
        for (const item of res.data.roster) {
          initialEdits[item.studentId] = {
            marksObtained: item.marksObtained,
            entryStatus: item.entryStatus || "PENDING",
            remarks: item.remarks || "",
          };
        }
        setMarkEdits(initialEdits);
      }
    });
  };

  const loadStudentSummaries = async (sessionId: string) => {
    if (!sessionId) return;
    const res = await getStudentResultSummariesAction({ examSessionId: sessionId });
    if (res.success && res.data) {
      setStudentSummaries(res.data as unknown as StudentSummaryOption[]);
      if (res.data.length > 0) {
        setSelectedStudentSummary(res.data[0] as unknown as StudentSummaryOption);
      }
    }
  };

  const showToast = (text: string, type: "success" | "error" = "success") => {
    setMessage({ text, type });
    setTimeout(() => setMessage(null), 5000);
  };

  // Handlers for Session Tab
  const handleCreateSession = async (e: React.FormEvent) => {
    e.preventDefault();
    startTransition(async () => {
      const res = await createExamSessionAction({
        academicYearId: newSessionForm.academicYearId,
        name: newSessionForm.name,
        sessionCode: newSessionForm.sessionCode,
        sessionType: newSessionForm.sessionType as "REGULAR" | "ATKT_SUPPLEMENTARY" | "REVALUATION",
        startDate: newSessionForm.startDate,
        endDate: newSessionForm.endDate,
      });
      if (res.success) {
        showToast("Examination session created successfully", "success");
        setShowNewSessionModal(false);
        loadSessions();
      } else {
        showToast(res.error || "Failed to create exam session", "error");
      }
    });
  };

  const handleCreateComponent = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedSessionId) return;
    startTransition(async () => {
      const res = await createAssessmentComponentAction({
        examSessionId: selectedSessionId,
        subjectId: newComponentForm.subjectId,
        name: newComponentForm.name,
        componentType: newComponentForm.componentType,
        maxMarks: Number(newComponentForm.maxMarks),
        minPassingMarks: Number(newComponentForm.minPassingMarks) || undefined,
        weightagePercentage: Number(newComponentForm.weightagePercentage) || undefined,
      });
      if (res.success) {
        showToast("Assessment component added to exam session", "success");
        setShowNewComponentModal(false);
        loadSessionComponents(selectedSessionId);
      } else {
        showToast(res.error || "Failed to add assessment component", "error");
      }
    });
  };

  // Handlers for Marks Tab
  const handleScoreChange = (studentId: string, val: string) => {
    const max = rosterData.component?.maxMarks || 100;
    const num = val === "" ? null : Number(val);
    if (num !== null && num > max) {
      showToast(`Marks cannot exceed maximum (${max})`, "error");
      return;
    }
    setMarkEdits((prev) => ({
      ...prev,
      [studentId]: {
        ...(prev[studentId] || { entryStatus: "ENTERED", remarks: "" }),
        marksObtained: num,
        entryStatus: num === null ? "PENDING" : "ENTERED",
      },
    }));
  };

  const handleStatusToggle = (studentId: string, status: string) => {
    setMarkEdits((prev) => ({
      ...prev,
      [studentId]: {
        ...(prev[studentId] || { remarks: "" }),
        entryStatus: status,
        marksObtained: status === "ABSENT" || status === "EXEMPT" || status === "WITHHELD" ? null : prev[studentId]?.marksObtained ?? null,
      },
    }));
  };

  const handleSaveMarks = async () => {
    if (!activeComponentId) return;
    const maxMarks = rosterData.component?.maxMarks || 100;

    // Client validation
    for (const item of rosterData.roster) {
      const edit = markEdits[item.studentId];
      if (edit && edit.marksObtained !== null) {
        if (edit.marksObtained < 0) {
          showToast(`Negative marks not allowed for student ${item.fullName}`, "error");
          return;
        }
        if (edit.marksObtained > maxMarks) {
          showToast(`Marks obtained (${edit.marksObtained}) exceeds max marks (${maxMarks}) for ${item.fullName}`, "error");
          return;
        }
      }
    }

    startTransition(async () => {
      const entries = rosterData.roster.map((item) => {
        const edit = markEdits[item.studentId] || {
          marksObtained: item.marksObtained,
          entryStatus: item.entryStatus || "PENDING",
          remarks: item.remarks || "",
        };
        return {
          studentId: item.studentId,
          enrolmentId: item.enrolmentId,
          marksObtained: edit.marksObtained,
          entryStatus: edit.entryStatus as "PENDING" | "ENTERED" | "ABSENT" | "EXEMPT" | "WITHHELD" | "MEDICAL_LEAVE",
          remarks: edit.remarks,
        };
      });

      const res = await recordStudentMarksAction({
        componentId: activeComponentId,
        entries,
      });

      if (res.success) {
        showToast(`Marks successfully recorded for ${res.data?.count || entries.length} students`, "success");
        loadRoster(activeComponentId);
      } else {
        showToast(res.error || "Failed to record marks roster", "error");
      }
    });
  };

  // Handlers for Moderation & Calculation
  const handleCalculateSGPA = async () => {
    if (!selectedSessionId || !moderationSemesterId) {
      showToast("Please select both an exam session and a semester", "error");
      return;
    }
    startTransition(async () => {
      const res = await calculateSessionResultsAction(selectedSessionId, moderationSemesterId);
      if (res.success && res.data) {
        setCalculatedSummaries((res.data.summaries || []) as unknown as StudentSummaryOption[]);
        showToast(`SGPA calculation completed for ${res.data.studentsCalculated} students (Provisional CBCS 10-Point Scale)`, "success");
      } else {
        showToast(res.error || "Failed to calculate session results", "error");
      }
    });
  };

  const handlePublishResults = async () => {
    if (!selectedSessionId || !moderationSemesterId) return;
    startTransition(async () => {
      const res = await publishSessionResultsAction(selectedSessionId, moderationSemesterId);
      if (res.success) {
        showToast("Results successfully published! Grade cards are now visible to students.", "success");
        setShowPublishConfirm(false);
        loadSessions();
        loadStudentSummaries(selectedSessionId);
      } else {
        showToast(res.error || "Failed to publish examination results", "error");
      }
    });
  };

  const handleModerateSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedModerationEntry || !selectedModerationEntry.entryId) return;
    startTransition(async () => {
      const res = await moderateStudentMarksAction({
        entryId: selectedModerationEntry.entryId!,
        moderatedMarks: Number(moderationScoreInput),
        reason: moderationReasonInput,
      });
      if (res.success) {
        showToast("Mark moderation and audit log persisted", "success");
        setSelectedModerationEntry(null);
        setModerationScoreInput("");
        setModerationReasonInput("");
        if (activeComponentId) loadRoster(activeComponentId);
      } else {
        showToast(res.error || "Moderation rejected", "error");
      }
    });
  };

  // Post-publication amendment handler
  const handleAmendmentSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!amendmentEntry) return;
    startTransition(async () => {
      const res = await amendPublishedMarkAction({
        entryId: amendmentEntry.id,
        newScore: Number(amendmentScore),
        reason: amendmentReason,
      });
      if (res.success) {
        showToast("Post-publication mark amended and SGPA recalculated with formal audit trail", "success");
        setAmendmentEntry(null);
        setAmendmentScore("");
        setAmendmentReason("");
        loadStudentSummaries(selectedSessionId);
      } else {
        showToast(res.error || "Amendment failed", "error");
      }
    });
  };

  const currentSession = examSessions.find((s) => s.id === selectedSessionId);

  return (
    <div className="space-y-6">
      {/* Toast Feedback */}
      {message && (
        <div
          className={`p-4 rounded-xl text-xs font-semibold flex items-center justify-between border transition-all ${
            message.type === "success"
              ? "bg-emerald-50 text-emerald-800 border-emerald-200"
              : "bg-rose-50 text-rose-800 border-rose-200"
          }`}
        >
          <span>{message.text}</span>
          <button onClick={() => setMessage(null)} className="text-xs font-bold hover:opacity-75 cursor-pointer">
            Dismiss
          </button>
        </div>
      )}

      {/* Header Banner */}
      <div className="relative overflow-hidden rounded-2xl bg-gradient-to-r from-[#0B1528] via-[#102244] to-[#1657D9] p-6 text-white shadow-md">
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
          <div className="space-y-1">
            <div className="flex items-center space-x-2">
              <span className="px-2.5 py-0.5 text-[10px] font-bold tracking-wider uppercase rounded-full bg-blue-500/30 text-blue-200 border border-blue-400/30">
                CBCS 10-Point Framework
              </span>
              <span className="px-2.5 py-0.5 text-[10px] font-bold tracking-wider uppercase rounded-full bg-amber-500/30 text-amber-200 border border-amber-400/30">
                Provisional Policy
              </span>
            </div>
            <h1 className="text-xl font-bold tracking-tight">Examinations & Result Management</h1>
            <p className="text-xs text-blue-100 max-w-2xl">
              Transactional evaluation engine for R. P. Institute of Hospitality & Management. Manage exam sessions, configure assessment heads, capture multi-component scores, execute CBCS grade calculations, and securely publish ratified result dossiers.
            </p>
          </div>

          <div className="flex items-center space-x-3 shrink-0">
            <button
              onClick={() => setShowNewSessionModal(true)}
              className="px-3.5 py-2 text-xs font-bold bg-white text-[#1657D9] hover:bg-blue-50 rounded-xl transition-all shadow-xs cursor-pointer flex items-center space-x-1.5"
            >
              <Icon name="clipboard-check" className="w-4 h-4" />
              <span>New Exam Session</span>
            </button>
          </div>
        </div>
      </div>

      {/* Operational Navigation Tabs */}
      <div className="flex flex-wrap items-center gap-2 border-b border-slate-200 pb-2">
        <button
          onClick={() => setActiveTab("sessions")}
          className={`px-4 py-2 text-xs font-bold rounded-xl transition-all cursor-pointer flex items-center space-x-2 ${
            activeTab === "sessions" ? "bg-[#1657D9] text-white shadow-xs" : "text-slate-600 hover:bg-slate-200"
          }`}
        >
          <Icon name="briefcase" className="w-3.5 h-3.5" />
          <span>Sessions & Schedules ({examSessions.length})</span>
        </button>

        <button
          onClick={() => setActiveTab("marks")}
          className={`px-4 py-2 text-xs font-bold rounded-xl transition-all cursor-pointer flex items-center space-x-2 ${
            activeTab === "marks" ? "bg-[#1657D9] text-white shadow-xs" : "text-slate-600 hover:bg-slate-200"
          }`}
        >
          <Icon name="clipboard-check" className="w-3.5 h-3.5" />
          <span>Marks Entry & Assessment Roster</span>
        </button>

        <button
          onClick={() => {
            setActiveTab("moderation");
            if (selectedSessionId && moderationSemesterId) {
              handleCalculateSGPA();
            }
          }}
          className={`px-4 py-2 text-xs font-bold rounded-xl transition-all cursor-pointer flex items-center space-x-2 ${
            activeTab === "moderation" ? "bg-[#1657D9] text-white shadow-xs" : "text-slate-600 hover:bg-slate-200"
          }`}
        >
          <Icon name="award" className="w-3.5 h-3.5" />
          <span>Moderation & Publication Gate</span>
        </button>

        <button
          onClick={() => {
            setActiveTab("gradecards");
            if (selectedSessionId) loadStudentSummaries(selectedSessionId);
          }}
          className={`px-4 py-2 text-xs font-bold rounded-xl transition-all cursor-pointer flex items-center space-x-2 ${
            activeTab === "gradecards" ? "bg-[#1657D9] text-white shadow-xs" : "text-slate-600 hover:bg-slate-200"
          }`}
        >
          <Icon name="academic-cap" className="w-3.5 h-3.5" />
          <span>Student Grade Cards & Dossiers</span>
        </button>
      </div>

      {/* =========================================================================
          TAB 1: SESSIONS & EXAMINATION SCHEDULES
         ========================================================================= */}
      {activeTab === "sessions" && (
        <div className="space-y-6">
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            {examSessions.map((session) => (
              <div
                key={session.id}
                onClick={() => {
                  setSelectedSessionId(session.id);
                  loadSessionComponents(session.id);
                }}
                className={`p-5 rounded-2xl border transition-all cursor-pointer relative ${
                  selectedSessionId === session.id
                    ? "border-[#1657D9] bg-blue-50/50 shadow-xs"
                    : "border-slate-200 bg-white hover:border-slate-300"
                }`}
              >
                <div className="flex items-start justify-between">
                  <div>
                    <span className="font-mono text-[10px] font-bold text-slate-500 uppercase">
                      {session.sessionCode}
                    </span>
                    <h3 className="text-sm font-bold text-slate-900 mt-0.5">{session.name}</h3>
                  </div>
                  <span
                    className={`px-2 py-0.5 text-[10px] font-bold rounded-full uppercase ${
                      session.status === "PUBLISHED"
                        ? "bg-emerald-100 text-emerald-800"
                        : session.status === "EVALUATION"
                        ? "bg-amber-100 text-amber-800"
                        : "bg-slate-100 text-slate-700"
                    }`}
                  >
                    {session.status}
                  </span>
                </div>

                <div className="mt-4 pt-3 border-t border-slate-200/60 text-xs text-slate-500 space-y-1">
                  <div className="flex justify-between">
                    <span>Type:</span>
                    <span className="font-semibold text-slate-700">{session.sessionType}</span>
                  </div>
                  <div className="flex justify-between">
                    <span>Academic Year:</span>
                    <span className="font-semibold text-slate-700">{session.academicYear?.name || "AY 2026-27"}</span>
                  </div>
                  <div className="flex justify-between">
                    <span>Components:</span>
                    <span className="font-semibold text-slate-700">{session._count?.assessmentComponents || 0} subjects</span>
                  </div>
                </div>
              </div>
            ))}

            {examSessions.length === 0 && (
              <div className="col-span-3 p-8 text-center bg-white rounded-2xl border border-slate-200 text-slate-500 text-xs">
                No examination sessions configured yet. Click &quot;New Exam Session&quot; to initialize the first session.
              </div>
            )}
          </div>

          {/* Components for Selected Session */}
          {currentSession && (
            <div className="rounded-2xl bg-white border border-slate-200 p-6 space-y-4 shadow-xs">
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b border-slate-100 pb-4">
                <div>
                  <h3 className="text-base font-bold text-slate-900">
                    Assessment Heads & Components — {currentSession.name}
                  </h3>
                  <p className="text-xs text-slate-500">
                    Configure theory SEE, internal assessments, and kitchen practicals per subject
                  </p>
                </div>
                <button
                  onClick={() => setShowNewComponentModal(true)}
                  className="px-3 py-1.5 text-xs font-bold bg-[#1657D9] text-white hover:bg-blue-700 rounded-xl transition-all shadow-xs cursor-pointer flex items-center space-x-1"
                >
                  <Icon name="check-circle" className="w-3.5 h-3.5" />
                  <span>Add Subject Component</span>
                </button>
              </div>

              <div className="overflow-x-auto rounded-xl border border-slate-200">
                <table className="w-full text-left text-xs">
                  <thead className="bg-slate-50 text-slate-600 font-bold uppercase tracking-wider text-[11px] border-b border-slate-200">
                    <tr>
                      <th className="px-4 py-3">Subject</th>
                      <th className="px-4 py-3">Component Type</th>
                      <th className="px-4 py-3">Component Name</th>
                      <th className="px-4 py-3 text-right">Max Marks</th>
                      <th className="px-4 py-3 text-right">Passing Cutoff</th>
                      <th className="px-4 py-3 text-right">Weightage</th>
                      <th className="px-4 py-3 text-center">Assigned Faculty</th>
                      <th className="px-4 py-3 text-right">Entries Recorded</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100">
                    {sessionComponents.map((comp) => (
                      <tr key={comp.id} className="hover:bg-slate-50/60 transition-colors">
                        <td className="px-4 py-3 font-medium text-slate-900">
                          <span className="font-mono text-blue-600 font-bold mr-1.5">{comp.subject?.code}</span>
                          {comp.subject?.title}
                        </td>
                        <td className="px-4 py-3">
                          <span className="px-2 py-0.5 text-[10px] font-bold rounded-md bg-blue-100 text-blue-800">
                            {comp.componentType}
                          </span>
                        </td>
                        <td className="px-4 py-3 text-slate-700">{comp.name}</td>
                        <td className="px-4 py-3 text-right font-mono font-bold text-slate-900">{comp.maxMarks}</td>
                        <td className="px-4 py-3 text-right font-mono text-slate-600">
                          {comp.minPassingMarks ? `${comp.minPassingMarks} (40%)` : "Provisional"}
                        </td>
                        <td className="px-4 py-3 text-right font-mono text-slate-600">
                          {comp.weightagePercentage ? `${comp.weightagePercentage}%` : "100%"}
                        </td>
                        <td className="px-4 py-3 text-center text-slate-600">
                          {comp.subject?.teachingAssignments?.[0]?.staff?.fullName || "Unassigned"}
                        </td>
                        <td className="px-4 py-3 text-right font-bold text-emerald-600">
                          {comp._count?.studentEntries || 0}
                        </td>
                      </tr>
                    ))}
                    {sessionComponents.length === 0 && (
                      <tr>
                        <td colSpan={8} className="px-4 py-6 text-center text-slate-500">
                          No assessment components defined for this session yet. Click &quot;Add Subject Component&quot; to configure heads of passing.
                        </td>
                      </tr>
                    )}
                  </tbody>
                </table>
              </div>
            </div>
          )}
        </div>
      )}

      {/* =========================================================================
          TAB 2: MARKS ENTRY & ASSESSMENT ROSTER
         ========================================================================= */}
      {activeTab === "marks" && (
        <div className="space-y-4">
          <div className="bg-white p-4 rounded-2xl border border-slate-200 shadow-xs flex flex-wrap items-center justify-between gap-4">
            <div className="flex flex-wrap items-center gap-3">
              <div>
                <label className="block text-[11px] font-bold text-slate-600 uppercase mb-1">
                  Assessment Component
                </label>
                <select
                  value={activeComponentId}
                  onChange={(e) => {
                    setActiveComponentId(e.target.value);
                    loadRoster(e.target.value);
                  }}
                  className="px-3 py-1.5 text-xs rounded-xl border border-slate-200 bg-slate-50 text-slate-900 font-medium focus:ring-1 focus:ring-[#1657D9]"
                >
                  {sessionComponents.map((c) => (
                    <option key={c.id} value={c.id}>
                      {c.subject?.code} — {c.name} ({c.componentType}, Max: {c.maxMarks})
                    </option>
                  ))}
                </select>
              </div>

              {rosterData.component && (
                <div className="text-xs text-slate-600 bg-slate-50 px-3 py-2 rounded-xl border border-slate-200 space-y-0.5">
                  <div>
                    <span className="font-semibold text-slate-800">Max Allowable: </span>
                    <span className="font-bold text-blue-600">{rosterData.component.maxMarks} marks</span>
                  </div>
                  <div>
                    <span className="font-semibold text-slate-800">Pass Cutoff: </span>
                    <span>{rosterData.component.minPassingMarks || "40% (Provisional)"}</span>
                  </div>
                </div>
              )}
            </div>

            <button
              onClick={handleSaveMarks}
              disabled={isPending || !activeComponentId}
              className="px-5 py-2 text-xs font-bold bg-[#1657D9] text-white hover:bg-blue-700 rounded-xl transition-all shadow-xs cursor-pointer flex items-center space-x-1.5 disabled:opacity-50"
            >
              <Icon name="check-circle" className="w-4 h-4" />
              <span>{isPending ? "Persisting..." : "Save Marks Roster"}</span>
            </button>
          </div>

          {/* Roster Table */}
          <div className="rounded-2xl bg-white border border-slate-200 overflow-hidden shadow-xs">
            <div className="overflow-x-auto">
              <table className="w-full text-left text-xs">
                <thead className="bg-slate-50 text-slate-600 font-bold uppercase tracking-wider text-[11px] border-b border-slate-200">
                  <tr>
                    <th className="px-4 py-3">Roll No</th>
                    <th className="px-4 py-3">PRN</th>
                    <th className="px-4 py-3">Student Name</th>
                    <th className="px-4 py-3">Division</th>
                    <th className="px-4 py-3">Status</th>
                    <th className="px-4 py-3 text-right">Marks Obtained (Max: {rosterData.component?.maxMarks || 100})</th>
                    <th className="px-4 py-3">Remarks / Moderation</th>
                    <th className="px-4 py-3 text-right">Action</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {rosterData.roster.map((item) => {
                    const edit = markEdits[item.studentId] || {
                      marksObtained: item.marksObtained,
                      entryStatus: item.entryStatus || "PENDING",
                      remarks: item.remarks || "",
                    };
                    const max = rosterData.component?.maxMarks || 100;
                    const isExceeded = edit.marksObtained !== null && (edit.marksObtained > max || edit.marksObtained < 0);

                    return (
                      <tr key={item.studentId} className="hover:bg-slate-50/60 transition-colors">
                        <td className="px-4 py-3 font-mono font-bold text-blue-600">{item.rollNumber}</td>
                        <td className="px-4 py-3 font-mono text-slate-500">{item.prn}</td>
                        <td className="px-4 py-3 font-semibold text-slate-900">{item.fullName}</td>
                        <td className="px-4 py-3 text-slate-600">{item.divisionName}</td>
                        <td className="px-4 py-3">
                          <div className="flex items-center space-x-1">
                            <button
                              type="button"
                              onClick={() => handleStatusToggle(item.studentId, "ENTERED")}
                              className={`px-2 py-0.5 text-[10px] font-bold rounded ${
                                edit.entryStatus === "ENTERED" ? "bg-emerald-100 text-emerald-800 border border-emerald-300" : "bg-slate-100 text-slate-600"
                              }`}
                            >
                              Present
                            </button>
                            <button
                              type="button"
                              onClick={() => handleStatusToggle(item.studentId, "ABSENT")}
                              className={`px-2 py-0.5 text-[10px] font-bold rounded ${
                                edit.entryStatus === "ABSENT" ? "bg-rose-100 text-rose-800 border border-rose-300" : "bg-slate-100 text-slate-600"
                              }`}
                            >
                              Absent
                            </button>
                            <button
                              type="button"
                              onClick={() => handleStatusToggle(item.studentId, "WITHHELD")}
                              className={`px-2 py-0.5 text-[10px] font-bold rounded ${
                                edit.entryStatus === "WITHHELD" ? "bg-amber-100 text-amber-800 border border-amber-300" : "bg-slate-100 text-slate-600"
                              }`}
                            >
                              Withheld
                            </button>
                          </div>
                        </td>
                        <td className="px-4 py-3 text-right">
                          <input
                            type="number"
                            step="0.5"
                            min="0"
                            max={max}
                            disabled={edit.entryStatus === "ABSENT" || edit.entryStatus === "WITHHELD"}
                            placeholder={edit.entryStatus === "ABSENT" ? "ABSENT" : "Unentered"}
                            value={edit.marksObtained !== null ? edit.marksObtained : ""}
                            onChange={(e) => handleScoreChange(item.studentId, e.target.value)}
                            className={`w-28 px-2 py-1 text-right font-mono font-bold text-xs rounded-lg border ${
                              isExceeded
                                ? "border-rose-500 bg-rose-50 text-rose-800 focus:ring-rose-500"
                                : "border-slate-200 bg-white text-slate-900 focus:ring-blue-500"
                            }`}
                          />
                        </td>
                        <td className="px-4 py-3">
                          {item.moderatedMarks !== null ? (
                            <span className="text-[11px] font-bold text-purple-700 bg-purple-50 px-2 py-0.5 rounded border border-purple-200">
                              Mod: {item.moderatedMarks} by {typeof item.moderatedBy === "object" ? item.moderatedBy?.fullName : (item.moderatedBy || "Faculty")}
                            </span>
                          ) : (
                            <input
                              type="text"
                              placeholder="Optional remarks..."
                              value={edit.remarks}
                              onChange={(e) =>
                                setMarkEdits((prev) => ({
                                  ...prev,
                                  [item.studentId]: { ...edit, remarks: e.target.value },
                                }))
                              }
                              className="w-full px-2 py-1 text-xs rounded border border-slate-200 bg-slate-50 text-slate-700"
                            />
                          )}
                        </td>
                        <td className="px-4 py-3 text-right">
                          {item.entryId && (
                            <button
                              type="button"
                              onClick={() => {
                                setSelectedModerationEntry(item);
                                setModerationScoreInput(String(item.moderatedMarks ?? item.marksObtained ?? ""));
                              }}
                              className="px-2 py-1 text-[11px] font-semibold text-purple-700 bg-purple-50 hover:bg-purple-100 rounded-lg border border-purple-200 transition-colors cursor-pointer"
                            >
                              Moderate
                            </button>
                          )}
                        </td>
                      </tr>
                    );
                  })}
                  {rosterData.roster.length === 0 && (
                    <tr>
                      <td colSpan={8} className="px-4 py-6 text-center text-slate-500">
                        No enrolled students found for this subject and semester.
                      </td>
                    </tr>
                  )}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      )}

      {/* =========================================================================
          TAB 3: MODERATION & PUBLICATION GATE
         ========================================================================= */}
      {activeTab === "moderation" && (
        <div className="space-y-6">
          <div className="bg-white p-5 rounded-2xl border border-slate-200 shadow-xs flex flex-wrap items-center justify-between gap-4">
            <div className="flex flex-wrap items-center gap-3">
              <div>
                <label className="block text-[11px] font-bold text-slate-600 uppercase mb-1">Semester Cohort</label>
                <select
                  value={moderationSemesterId}
                  onChange={(e) => setModerationSemesterId(e.target.value)}
                  className="px-3 py-1.5 text-xs rounded-xl border border-slate-200 bg-slate-50 text-slate-900 font-medium"
                >
                  {semesters.map((s) => (
                    <option key={s.id} value={s.id}>
                      {s.programme?.code} — Semester {s.semesterNumber} ({s.termType})
                    </option>
                  ))}
                </select>
              </div>

              <button
                onClick={handleCalculateSGPA}
                disabled={isPending}
                className="mt-4 px-4 py-2 text-xs font-bold bg-[#1657D9] text-white hover:bg-blue-700 rounded-xl transition-all shadow-xs cursor-pointer flex items-center space-x-1.5"
              >
                <Icon name="chart-bar" className="w-4 h-4" />
                <span>{isPending ? "Calculating..." : "Compute 10-Point CBCS SGPA"}</span>
              </button>
            </div>

            <div className="flex items-center space-x-3">
              <button
                onClick={() => setShowPublishConfirm(true)}
                disabled={calculatedSummaries.length === 0 || currentSession?.status === "PUBLISHED"}
                className="px-5 py-2 text-xs font-bold bg-emerald-600 text-white hover:bg-emerald-700 rounded-xl transition-all shadow-xs cursor-pointer flex items-center space-x-1.5 disabled:opacity-50"
              >
                <Icon name="check-circle" className="w-4 h-4" />
                <span>{currentSession?.status === "PUBLISHED" ? "Results Already Published" : "Publish Results (CoE Gate)"}</span>
              </button>
            </div>
          </div>

          {/* Provisional Policy Disclosure */}
          <div className="p-4 rounded-xl bg-amber-50 border border-amber-200 text-amber-900 text-xs flex items-start space-x-3">
            <Icon name="award" className="w-5 h-5 text-amber-600 shrink-0 mt-0.5" />
            <div className="space-y-1">
              <span className="font-bold">Institutional Policy Disclaimer & Grace Mark Policy:</span>
              <p>
                University of Mumbai Ordinance O.5042, O.5043, and O.5044 grace mark rules have not been formally ratified for this session. All semester GPAs and letter grades are calculated strictly under standard 10-point CBCS without automatic grace escalation. Passing status is flagged as <strong>PROVISIONAL</strong>.
              </p>
            </div>
          </div>

          {/* Results Summary Table */}
          <div className="rounded-2xl bg-white border border-slate-200 overflow-hidden shadow-xs">
            <div className="p-4 border-b border-slate-100 flex justify-between items-center">
              <div>
                <h3 className="text-sm font-bold text-slate-900">
                  Semester Result Calculation Roster ({calculatedSummaries.length} Students)
                </h3>
                <p className="text-xs text-slate-500">
                  Computed grade point averages and subject performance breakdown
                </p>
              </div>
            </div>

            <div className="overflow-x-auto">
              <table className="w-full text-left text-xs">
                <thead className="bg-slate-50 text-slate-600 font-bold uppercase tracking-wider text-[11px] border-b border-slate-200">
                  <tr>
                    <th className="px-4 py-3">Student PRN</th>
                    <th className="px-4 py-3 text-right">Max Marks</th>
                    <th className="px-4 py-3 text-right">Marks Obtained</th>
                    <th className="px-4 py-3 text-right">Percentage</th>
                    <th className="px-4 py-3 text-right">CBCS SGPA</th>
                    <th className="px-4 py-3 text-center">Letter Grade</th>
                    <th className="px-4 py-3 text-center">Result Status</th>
                    <th className="px-4 py-3 text-right">Subjects Evaluated</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {calculatedSummaries.map((item, idx) => (
                    <tr key={idx} className="hover:bg-slate-50/60 transition-colors">
                      <td className="px-4 py-3 font-mono font-bold text-blue-600">{item.studentId}</td>
                      <td className="px-4 py-3 text-right font-mono text-slate-600">{item.totalMaxMarks}</td>
                      <td className="px-4 py-3 text-right font-mono font-bold text-slate-900">{item.totalMarksObtained}</td>
                      <td className="px-4 py-3 text-right font-mono text-slate-700">{item.percentage}%</td>
                      <td className="px-4 py-3 text-right font-mono font-bold text-blue-700 text-sm">{item.sgpa}</td>
                      <td className="px-4 py-3 text-center">
                        <span className="px-2 py-0.5 text-xs font-bold rounded bg-blue-100 text-blue-800">
                          {item.letterGrade}
                        </span>
                      </td>
                      <td className="px-4 py-3 text-center">
                        <span
                          className={`px-2.5 py-0.5 text-[10px] font-bold rounded-full uppercase ${
                            item.resultStatus === "PASSED"
                              ? "bg-emerald-100 text-emerald-800"
                              : item.resultStatus === "ATKT"
                              ? "bg-amber-100 text-amber-800"
                              : "bg-rose-100 text-rose-800"
                          }`}
                        >
                          {item.resultStatus}
                        </span>
                      </td>
                      <td className="px-4 py-3 text-right text-slate-600">
                        {item.subjectResults?.length || 0} heads
                      </td>
                    </tr>
                  ))}
                  {calculatedSummaries.length === 0 && (
                    <tr>
                      <td colSpan={8} className="px-4 py-6 text-center text-slate-500">
                        No calculation performed yet. Click &quot;Compute 10-Point CBCS SGPA&quot; above to run the evaluation engine.
                      </td>
                    </tr>
                  )}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      )}

      {/* =========================================================================
          TAB 4: STUDENT GRADE CARDS & RESULTS DOSSIER
         ========================================================================= */}
      {activeTab === "gradecards" && (
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {/* Left: Student Selector */}
          <div className="bg-white p-5 rounded-2xl border border-slate-200 shadow-xs space-y-4">
            <div>
              <h3 className="text-sm font-bold text-slate-900">Student Dossier Directory</h3>
              <p className="text-xs text-slate-500">Select an enrolled student to inspect official grade card</p>
            </div>

            <input
              type="text"
              placeholder="Search student roll, PRN or name..."
              value={gradeCardSearch}
              onChange={(e) => setGradeCardSearch(e.target.value)}
              className="w-full px-3 py-1.5 text-xs rounded-xl bg-slate-50 border border-slate-200 text-slate-900 focus:ring-1 focus:ring-blue-500"
            />

            <div className="divide-y divide-slate-100 max-h-96 overflow-y-auto">
              {studentSummaries
                .filter((s) =>
                  s.student?.fullName?.toLowerCase().includes(gradeCardSearch.toLowerCase()) ||
                  s.student?.rollNumber?.toLowerCase().includes(gradeCardSearch.toLowerCase()) ||
                  s.student?.prn?.toLowerCase().includes(gradeCardSearch.toLowerCase())
                )
                .map((summary) => (
                  <div
                    key={summary.id}
                    onClick={() => setSelectedStudentSummary(summary)}
                    className={`p-3 rounded-xl transition-all cursor-pointer ${
                      selectedStudentSummary?.id === summary.id ? "bg-blue-50 border border-blue-200" : "hover:bg-slate-50"
                    }`}
                  >
                    <div className="flex justify-between items-start">
                      <span className="font-mono text-[11px] font-bold text-blue-600">{summary.student?.rollNumber}</span>
                      <span className="font-mono text-xs font-bold text-slate-800">SGPA: {summary.sgpa ?? "—"}</span>
                    </div>
                    <div className="text-xs font-bold text-slate-900 mt-0.5">{summary.student?.fullName || summary.student?.name}</div>
                    <div className="text-[11px] text-slate-500">{summary.semester?.programme?.code} • Sem {summary.semester?.semesterNumber}</div>
                  </div>
                ))}
              {studentSummaries.length === 0 && (
                <div className="p-6 text-center text-slate-500 text-xs">
                  No published result summaries available for this session. Ensure results have been published through the CoE Gate.
                </div>
              )}
            </div>
          </div>

          {/* Right: Authentic Mumbai University Styled Grade Card */}
          <div className="lg:col-span-2">
            {selectedStudentSummary ? (
              <div className="bg-white rounded-2xl border-2 border-slate-300 shadow-md p-6 space-y-6 print:border-none">
                {/* Institutional Header */}
                <div className="text-center border-b-2 border-slate-900 pb-4 space-y-1">
                  <span className="text-[10px] font-bold tracking-widest text-slate-600 uppercase">
                    Affiliated to University of Mumbai • Autonomous Grade Statement
                  </span>
                  <h2 className="text-base font-black text-slate-900 uppercase tracking-tight">
                    R. P. Institute of Hospitality & Management
                  </h2>
                  <p className="text-[11px] text-slate-600 font-medium">
                    PROVISIONAL STATEMENT OF MARKS & GRADES — {selectedStudentSummary.examSession?.name || "Winter 2026"}
                  </p>
                </div>

                {/* Candidate Info Grid */}
                <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 bg-slate-50 p-4 rounded-xl border border-slate-200 text-xs">
                  <div>
                    <span className="text-[10px] text-slate-500 uppercase font-bold block">Candidate Name</span>
                    <span className="font-bold text-slate-900">{selectedStudentSummary.student?.fullName}</span>
                  </div>
                  <div>
                    <span className="text-[10px] text-slate-500 uppercase font-bold block">Permanent Reg. (PRN)</span>
                    <span className="font-mono font-bold text-slate-900">{selectedStudentSummary.student?.prn}</span>
                  </div>
                  <div>
                    <span className="text-[10px] text-slate-500 uppercase font-bold block">Roll Number</span>
                    <span className="font-mono font-bold text-blue-600">{selectedStudentSummary.student?.rollNumber}</span>
                  </div>
                  <div>
                    <span className="text-[10px] text-slate-500 uppercase font-bold block">Programme & Sem</span>
                    <span className="font-bold text-slate-900">
                      {selectedStudentSummary.semester?.programme?.code} Sem {selectedStudentSummary.semester?.semesterNumber}
                    </span>
                  </div>
                </div>

                {/* Subject Performance Table */}
                <div className="overflow-x-auto rounded-xl border border-slate-200">
                  <table className="w-full text-left text-xs">
                    <thead className="bg-slate-100 text-slate-700 font-bold uppercase tracking-wider text-[11px] border-b border-slate-300">
                      <tr>
                        <th className="px-3 py-2.5">Subject Code & Title</th>
                        <th className="px-3 py-2.5 text-center">Credits (C)</th>
                        <th className="px-3 py-2.5 text-right">Max Marks</th>
                        <th className="px-3 py-2.5 text-right">Marks Obtained</th>
                        <th className="px-3 py-2.5 text-center">Grade Point (G)</th>
                        <th className="px-3 py-2.5 text-center">Letter Grade</th>
                        <th className="px-3 py-2.5 text-center">Credit Points (C×G)</th>
                        <th className="px-3 py-2.5 text-center">Status</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-200">
                      {selectedStudentSummary.subjectResults?.map((sr: SubjectResultOption) => {
                        const creditPoints = (sr.credits || 0) * (sr.gradePoint || 0);
                        return (
                          <tr key={sr.id} className="hover:bg-slate-50/60">
                            <td className="px-3 py-2.5">
                              <span className="font-mono font-bold text-blue-700 mr-1.5">{sr.subject?.code}</span>
                              <span className="text-slate-800 font-medium">{sr.subject?.title}</span>
                            </td>
                            <td className="px-3 py-2.5 text-center font-mono">{sr.credits}</td>
                            <td className="px-3 py-2.5 text-right font-mono text-slate-600">{sr.totalMaxMarks}</td>
                            <td className="px-3 py-2.5 text-right font-mono font-bold text-slate-900">
                              {sr.totalMarksObtained ?? "—"}
                            </td>
                            <td className="px-3 py-2.5 text-center font-mono font-bold text-slate-800">{sr.gradePoint}</td>
                            <td className="px-3 py-2.5 text-center">
                              <span className="font-bold text-slate-900">{sr.letterGrade}</span>
                            </td>
                            <td className="px-3 py-2.5 text-center font-mono font-semibold text-slate-700">
                              {creditPoints.toFixed(1)}
                            </td>
                            <td className="px-3 py-2.5 text-center">
                              <span
                                className={`px-2 py-0.5 text-[10px] font-bold rounded ${
                                  sr.status === "PASS"
                                    ? "bg-emerald-100 text-emerald-800"
                                    : "bg-rose-100 text-rose-800"
                                }`}
                              >
                                {sr.status}
                              </span>
                            </td>
                          </tr>
                        );
                      })}
                    </tbody>
                  </table>
                </div>

                {/* Summary Scorecard Box */}
                <div className="bg-slate-900 text-white p-4 rounded-xl flex flex-wrap items-center justify-between gap-4">
                  <div>
                    <span className="text-[10px] text-slate-400 uppercase font-bold block">Aggregated Score</span>
                    <span className="text-lg font-bold">
                      {selectedStudentSummary.totalMarksObtained} / {selectedStudentSummary.totalMaxMarks} ({selectedStudentSummary.percentage}%)
                    </span>
                  </div>

                  <div>
                    <span className="text-[10px] text-blue-300 uppercase font-bold block">10-Point CBCS SGPA</span>
                    <span className="text-2xl font-black text-amber-400">{selectedStudentSummary.sgpa}</span>
                  </div>

                  <div>
                    <span className="text-[10px] text-slate-400 uppercase font-bold block">Overall Result</span>
                    <span
                      className={`px-3 py-1 text-xs font-black rounded-full uppercase ${
                        selectedStudentSummary.resultStatus === "PASSED"
                          ? "bg-emerald-500 text-white"
                          : selectedStudentSummary.resultStatus === "ATKT"
                          ? "bg-amber-500 text-slate-900"
                          : "bg-rose-500 text-white"
                      }`}
                    >
                      {selectedStudentSummary.resultStatus}
                    </span>
                  </div>

                  <div>
                    <span className="text-[10px] text-slate-400 uppercase font-bold block">Publication Status</span>
                    <span className="text-xs text-slate-200 font-medium">
                      Published by {selectedStudentSummary.publishedBy?.fullName || "Controller of Exams"}
                    </span>
                  </div>
                </div>

                {/* Statutory Disclaimer */}
                <p className="text-[10px] text-slate-500 text-center italic border-t border-slate-200 pt-3">
                  This document is a computer-generated provisional statement of marks issued by CampusOS ERP for internal evaluation. Official statement of marks with institutional hologram is issued separately by the University of Mumbai.
                </p>
              </div>
            ) : (
              <div className="bg-white rounded-2xl border border-slate-200 p-12 text-center text-slate-500 text-xs">
                Select a student from the directory to inspect their grade card.
              </div>
            )}
          </div>
        </div>
      )}

      {/* =========================================================================
          MODALS
         ========================================================================= */}

      {/* Modal: New Exam Session */}
      {showNewSessionModal && (
        <div className="fixed inset-0 z-50 bg-slate-900/60 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl max-w-md w-full p-6 space-y-4 shadow-xl border border-slate-200">
            <div className="flex justify-between items-center border-b border-slate-100 pb-3">
              <h3 className="text-sm font-bold text-slate-900">Create Examination Session</h3>
              <button
                onClick={() => setShowNewSessionModal(false)}
                className="text-slate-400 hover:text-slate-600 cursor-pointer"
              >
                ✕
              </button>
            </div>

            <form onSubmit={handleCreateSession} className="space-y-3 text-xs">
              <div>
                <label className="block font-bold text-slate-700 mb-1">Academic Year</label>
                <select
                  value={newSessionForm.academicYearId}
                  onChange={(e) => setNewSessionForm({ ...newSessionForm, academicYearId: e.target.value })}
                  className="w-full px-3 py-1.5 rounded-xl border border-slate-200 bg-slate-50"
                  required
                >
                  {academicYears.map((ay) => (
                    <option key={ay.id} value={ay.id}>
                      {ay.name} ({ay.code})
                    </option>
                  ))}
                </select>
              </div>

              <div>
                <label className="block font-bold text-slate-700 mb-1">Session Name</label>
                <input
                  type="text"
                  placeholder="e.g. Winter 2026 - Regular Examinations"
                  value={newSessionForm.name}
                  onChange={(e) => setNewSessionForm({ ...newSessionForm, name: e.target.value })}
                  className="w-full px-3 py-1.5 rounded-xl border border-slate-200 bg-slate-50"
                  required
                />
              </div>

              <div>
                <label className="block font-bold text-slate-700 mb-1">Session Code (Unique)</label>
                <input
                  type="text"
                  placeholder="e.g. WIN-2026-REG"
                  value={newSessionForm.sessionCode}
                  onChange={(e) => setNewSessionForm({ ...newSessionForm, sessionCode: e.target.value })}
                  className="w-full px-3 py-1.5 rounded-xl border border-slate-200 bg-slate-50 font-mono"
                  required
                />
              </div>

              <div>
                <label className="block font-bold text-slate-700 mb-1">Session Type</label>
                <select
                  value={newSessionForm.sessionType}
                  onChange={(e) => setNewSessionForm({ ...newSessionForm, sessionType: e.target.value })}
                  className="w-full px-3 py-1.5 rounded-xl border border-slate-200 bg-slate-50"
                >
                  <option value="REGULAR">Regular End-Semester</option>
                  <option value="ATKT_SUPPLEMENTARY">ATKT / Supplementary</option>
                  <option value="REVALUATION">Revaluation Assessment</option>
                </select>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block font-bold text-slate-700 mb-1">Start Date</label>
                  <input
                    type="date"
                    value={newSessionForm.startDate}
                    onChange={(e) => setNewSessionForm({ ...newSessionForm, startDate: e.target.value })}
                    className="w-full px-3 py-1.5 rounded-xl border border-slate-200 bg-slate-50"
                    required
                  />
                </div>
                <div>
                  <label className="block font-bold text-slate-700 mb-1">End Date</label>
                  <input
                    type="date"
                    value={newSessionForm.endDate}
                    onChange={(e) => setNewSessionForm({ ...newSessionForm, endDate: e.target.value })}
                    className="w-full px-3 py-1.5 rounded-xl border border-slate-200 bg-slate-50"
                    required
                  />
                </div>
              </div>

              <div className="flex justify-end space-x-2 pt-3 border-t border-slate-100">
                <button
                  type="button"
                  onClick={() => setShowNewSessionModal(false)}
                  className="px-4 py-2 rounded-xl text-slate-600 hover:bg-slate-100 cursor-pointer"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={isPending}
                  className="px-4 py-2 rounded-xl bg-[#1657D9] text-white font-bold hover:bg-blue-700 cursor-pointer disabled:opacity-50"
                >
                  {isPending ? "Creating..." : "Create Session"}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Modal: Add Assessment Component */}
      {showNewComponentModal && (
        <div className="fixed inset-0 z-50 bg-slate-900/60 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl max-w-md w-full p-6 space-y-4 shadow-xl border border-slate-200">
            <div className="flex justify-between items-center border-b border-slate-100 pb-3">
              <h3 className="text-sm font-bold text-slate-900">Add Subject Assessment Head</h3>
              <button
                onClick={() => setShowNewComponentModal(false)}
                className="text-slate-400 hover:text-slate-600 cursor-pointer"
              >
                ✕
              </button>
            </div>

            <form onSubmit={handleCreateComponent} className="space-y-3 text-xs">
              <div>
                <label className="block font-bold text-slate-700 mb-1">Subject</label>
                <select
                  value={newComponentForm.subjectId}
                  onChange={(e) => setNewComponentForm({ ...newComponentForm, subjectId: e.target.value })}
                  className="w-full px-3 py-1.5 rounded-xl border border-slate-200 bg-slate-50"
                  required
                >
                  {subjects.map((s) => (
                    <option key={s.id} value={s.id}>
                      {s.code} — {s.title} ({s.credits} Credits)
                    </option>
                  ))}
                </select>
              </div>

              <div>
                <label className="block font-bold text-slate-700 mb-1">Component Head</label>
                <select
                  value={newComponentForm.componentType}
                  onChange={(e) => setNewComponentForm({ ...newComponentForm, componentType: e.target.value as "THEORY_SEE" | "INTERNAL_IA" | "PRACTICAL_SEE" | "VIVA_VOCE" })}
                  className="w-full px-3 py-1.5 rounded-xl border border-slate-200 bg-slate-50"
                >
                  <option value="THEORY_SEE">Theory Semester End Exam (SEE)</option>
                  <option value="INTERNAL_IA">Continuous Internal Assessment (IA)</option>
                  <option value="PRACTICAL_SEE">Practical Kitchen / Bakery SEE</option>
                  <option value="VIVA_VOCE">Viva Voce / Industrial Training</option>
                </select>
              </div>

              <div>
                <label className="block font-bold text-slate-700 mb-1">Component Display Name</label>
                <input
                  type="text"
                  placeholder="e.g. Theory End-Semester Exam"
                  value={newComponentForm.name}
                  onChange={(e) => setNewComponentForm({ ...newComponentForm, name: e.target.value })}
                  className="w-full px-3 py-1.5 rounded-xl border border-slate-200 bg-slate-50"
                  required
                />
              </div>

              <div className="grid grid-cols-3 gap-2">
                <div>
                  <label className="block font-bold text-slate-700 mb-1">Max Marks</label>
                  <input
                    type="number"
                    value={newComponentForm.maxMarks}
                    onChange={(e) => setNewComponentForm({ ...newComponentForm, maxMarks: Number(e.target.value) })}
                    className="w-full px-3 py-1.5 rounded-xl border border-slate-200 bg-slate-50 font-mono"
                    required
                  />
                </div>
                <div>
                  <label className="block font-bold text-slate-700 mb-1">Pass Cutoff</label>
                  <input
                    type="number"
                    value={newComponentForm.minPassingMarks}
                    onChange={(e) => setNewComponentForm({ ...newComponentForm, minPassingMarks: Number(e.target.value) })}
                    className="w-full px-3 py-1.5 rounded-xl border border-slate-200 bg-slate-50 font-mono"
                  />
                </div>
                <div>
                  <label className="block font-bold text-slate-700 mb-1">Weight %</label>
                  <input
                    type="number"
                    value={newComponentForm.weightagePercentage}
                    onChange={(e) => setNewComponentForm({ ...newComponentForm, weightagePercentage: Number(e.target.value) })}
                    className="w-full px-3 py-1.5 rounded-xl border border-slate-200 bg-slate-50 font-mono"
                  />
                </div>
              </div>

              <div className="flex justify-end space-x-2 pt-3 border-t border-slate-100">
                <button
                  type="button"
                  onClick={() => setShowNewComponentModal(false)}
                  className="px-4 py-2 rounded-xl text-slate-600 hover:bg-slate-100 cursor-pointer"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={isPending}
                  className="px-4 py-2 rounded-xl bg-[#1657D9] text-white font-bold hover:bg-blue-700 cursor-pointer disabled:opacity-50"
                >
                  {isPending ? "Adding..." : "Add Component"}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Modal: Moderation Adjustment */}
      {selectedModerationEntry && (
        <div className="fixed inset-0 z-50 bg-slate-900/60 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl max-w-md w-full p-6 space-y-4 shadow-xl border border-slate-200">
            <div className="flex justify-between items-center border-b border-slate-100 pb-3">
              <h3 className="text-sm font-bold text-slate-900">Moderate Assessment Score</h3>
              <button
                onClick={() => setSelectedModerationEntry(null)}
                className="text-slate-400 hover:text-slate-600 cursor-pointer"
              >
                ✕
              </button>
            </div>

            <form onSubmit={handleModerateSubmit} className="space-y-3 text-xs">
              <div className="bg-slate-50 p-3 rounded-xl border border-slate-200 space-y-1">
                <div>
                  <span className="font-semibold text-slate-700">Candidate: </span>
                  <span className="font-bold text-slate-900">{selectedModerationEntry.fullName}</span>
                </div>
                <div>
                  <span className="font-semibold text-slate-700">Raw Mark Entered: </span>
                  <span className="font-mono font-bold text-blue-600">{selectedModerationEntry.marksObtained ?? "Unentered"}</span>
                </div>
              </div>

              <div>
                <label className="block font-bold text-slate-700 mb-1">Moderated Score</label>
                <input
                  type="number"
                  step="0.5"
                  value={moderationScoreInput}
                  onChange={(e) => setModerationScoreInput(e.target.value)}
                  className="w-full px-3 py-1.5 rounded-xl border border-slate-200 bg-slate-50 font-mono font-bold text-sm"
                  required
                />
              </div>

              <div>
                <label className="block font-bold text-slate-700 mb-1">
                  Mandatory Moderation Justification
                </label>
                <textarea
                  placeholder="Record formal moderation committee resolution or revaluation note..."
                  value={moderationReasonInput}
                  onChange={(e) => setModerationReasonInput(e.target.value)}
                  className="w-full px-3 py-2 rounded-xl border border-slate-200 bg-slate-50 text-xs"
                  rows={3}
                  required
                />
              </div>

              <div className="flex justify-end space-x-2 pt-3 border-t border-slate-100">
                <button
                  type="button"
                  onClick={() => setSelectedModerationEntry(null)}
                  className="px-4 py-2 rounded-xl text-slate-600 hover:bg-slate-100 cursor-pointer"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={isPending}
                  className="px-4 py-2 rounded-xl bg-purple-600 text-white font-bold hover:bg-purple-700 cursor-pointer disabled:opacity-50"
                >
                  {isPending ? "Persisting..." : "Apply Moderation"}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}


      {/* Modal: Post-Publication Amendment */}
      {amendmentEntry && (
        <div className="fixed inset-0 z-50 bg-slate-900/60 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl max-w-md w-full p-6 space-y-4 shadow-xl border border-slate-200">
            <div className="flex justify-between items-center border-b border-slate-100 pb-3">
              <h3 className="text-sm font-bold text-slate-900">Post-Publication Mark Amendment</h3>
              <button
                onClick={() => setAmendmentEntry(null)}
                className="text-slate-400 hover:text-slate-600 cursor-pointer"
              >
                ✕
              </button>
            </div>

            <form onSubmit={handleAmendmentSubmit} className="space-y-3 text-xs">
              <div className="bg-slate-50 p-3 rounded-xl border border-slate-200 space-y-1">
                <div>
                  <span className="font-semibold text-slate-700">Subject: </span>
                  <span className="font-bold text-slate-900">{amendmentEntry.subject?.title || amendmentEntry.subjectName}</span>
                </div>
                <div>
                  <span className="font-semibold text-slate-700">Current Score: </span>
                  <span className="font-mono font-bold text-blue-600">{amendmentEntry.totalMarksObtained ?? amendmentEntry.marksObtained ?? "—"}</span>
                </div>
              </div>

              <div>
                <label className="block font-bold text-slate-700 mb-1">Amended Score</label>
                <input
                  type="number"
                  step="0.5"
                  value={amendmentScore}
                  onChange={(e) => setAmendmentScore(e.target.value)}
                  className="w-full px-3 py-1.5 rounded-xl border border-slate-200 bg-slate-50 font-mono font-bold text-sm"
                  required
                />
              </div>

              <div>
                <label className="block font-bold text-slate-700 mb-1">
                  Mandatory Audit Reason (CoE Approval)
                </label>
                <textarea
                  placeholder="Record formal revaluation committee resolution or grievance order..."
                  value={amendmentReason}
                  onChange={(e) => setAmendmentReason(e.target.value)}
                  className="w-full px-3 py-2 rounded-xl border border-slate-200 bg-slate-50 text-xs"
                  rows={3}
                  required
                />
              </div>

              <div className="flex justify-end space-x-2 pt-3 border-t border-slate-100">
                <button
                  type="button"
                  onClick={() => setAmendmentEntry(null)}
                  className="px-4 py-2 rounded-xl text-slate-600 hover:bg-slate-100 cursor-pointer"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={isPending}
                  className="px-4 py-2 rounded-xl bg-amber-600 text-white font-bold hover:bg-amber-700 cursor-pointer disabled:opacity-50"
                >
                  {isPending ? "Persisting..." : "Apply Amendment"}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Modal: Publish Confirmation */}
      {showPublishConfirm && (
        <div className="fixed inset-0 z-50 bg-slate-900/60 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl max-w-md w-full p-6 space-y-4 shadow-xl border border-slate-200">
            <div className="flex items-center space-x-3 text-amber-600">
              <Icon name="award" className="w-6 h-6" />
              <h3 className="text-base font-bold text-slate-900">CoE Result Publication Confirmation</h3>
            </div>

            <p className="text-xs text-slate-600 leading-relaxed">
              You are about to publish examination results for <strong>{currentSession?.name}</strong>. Upon publication:
            </p>

            <ul className="text-xs text-slate-600 space-y-1 list-disc pl-5">
              <li>Raw marks roster will be permanently locked against regular edits.</li>
              <li>Official provisional grade cards will become visible to all enrolled students.</li>
              <li>Future score alterations will require post-publication amendment with mandatory audit records.</li>
            </ul>

            <div className="flex justify-end space-x-2 pt-4 border-t border-slate-100">
              <button
                type="button"
                onClick={() => setShowPublishConfirm(false)}
                className="px-4 py-2 rounded-xl text-slate-600 hover:bg-slate-100 text-xs font-semibold cursor-pointer"
              >
                Abort
              </button>
              <button
                type="button"
                onClick={handlePublishResults}
                disabled={isPending}
                className="px-4 py-2 rounded-xl bg-emerald-600 text-white text-xs font-bold hover:bg-emerald-700 transition-all cursor-pointer disabled:opacity-50"
              >
                {isPending ? "Publishing..." : "Confirm & Publish Results"}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
