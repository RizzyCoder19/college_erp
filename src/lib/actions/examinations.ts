"use server";

import {
  ExamRepository,
  CreateExamSessionDTO,
  CreateAssessmentComponentDTO,
  MarkEntryDTO,
} from "@/lib/dal/examRepository";
import { requireAuth, requirePermission } from "@/lib/auth/guards";
import { Result } from "@/lib/dal/types";

export interface ExamSessionActionItem {
  id: string;
  [key: string]: unknown;
}

export interface AssessmentComponentActionItem {
  id: string;
  [key: string]: unknown;
}

export interface ExamRosterActionItem {
  studentId: string;
  enrolmentId: string;
  rollNumber: string | null;
  prn: string;
  fullName: string;
  divisionName?: string | null;
  marksObtained: number | null;
  moderatedMarks: number | null;
  entryStatus: string;
  remarks: string | null;
  entryId: string | null;
  [key: string]: unknown;
}

export interface ExamRosterActionResult {
  component?: { id: string; maxMarks: number; [key: string]: unknown };
  roster: ExamRosterActionItem[];
}

export interface SessionCalculationActionResult {
  studentsCalculated: number;
  summaries: unknown[];
}

export async function getExamSessionsAction(academicYearId?: string): Promise<Result<ExamSessionActionItem[]>> {
  const guard = await requireAuth();
  if (!guard.success) return guard as Result<never>;
  return ExamRepository.getExamSessions(academicYearId) as Promise<Result<ExamSessionActionItem[]>>;
}

export async function getExamSessionByIdAction(id: string): Promise<Result<ExamSessionActionItem | null>> {
  const guard = await requireAuth();
  if (!guard.success) return guard as Result<never>;
  return ExamRepository.getExamSessionById(id) as Promise<Result<ExamSessionActionItem | null>>;
}

export async function createExamSessionAction(dto: CreateExamSessionDTO): Promise<Result<ExamSessionActionItem>> {
  const guard = await requirePermission("MANAGE_EXAMS");
  if (!guard.success) return guard as Result<never>;
  return ExamRepository.createExamSession(dto) as Promise<Result<ExamSessionActionItem>>;
}

export async function updateExamSessionStatusAction(id: string, status: string): Promise<Result<ExamSessionActionItem>> {
  const guard = await requirePermission("MANAGE_EXAMS");
  if (!guard.success || !guard.data) return guard as Result<never>;
  return ExamRepository.updateExamSessionStatus(id, status, guard.data.id) as Promise<Result<ExamSessionActionItem>>;
}

export async function createAssessmentComponentAction(dto: CreateAssessmentComponentDTO): Promise<Result<AssessmentComponentActionItem>> {
  const guard = await requirePermission("MANAGE_EXAMS");
  if (!guard.success) return guard as Result<never>;
  return ExamRepository.createAssessmentComponent(dto) as Promise<Result<AssessmentComponentActionItem>>;
}

export async function getComponentsForSessionAction(examSessionId: string, subjectId?: string): Promise<Result<AssessmentComponentActionItem[]>> {
  const guard = await requireAuth();
  if (!guard.success) return guard as Result<never>;
  return ExamRepository.getComponentsForSession(examSessionId, subjectId) as Promise<Result<AssessmentComponentActionItem[]>>;
}

export async function getExamRosterForComponentAction(componentId: string): Promise<Result<ExamRosterActionResult>> {
  const guard = await requireAuth();
  if (!guard.success) return guard as Result<never>;
  return ExamRepository.getExamRosterForComponent(componentId) as Promise<Result<ExamRosterActionResult>>;
}

export async function recordStudentMarksAction(dto: {
  componentId: string;
  entries: MarkEntryDTO[];
}): Promise<Result<{ count: number }>> {
  const guard = await requirePermission("ENTER_MARKS");
  if (!guard.success || !guard.data) return guard as Result<never>;
  const user = guard.data;

  const isFacultyScoped = user.role === "FACULTY_MEMBER";
  return ExamRepository.recordStudentMarks({
    componentId: dto.componentId,
    entries: dto.entries,
    enteredById: user.id,
    isFacultyScoped,
    facultyStaffId: user.staffId ?? undefined,
  }) as Promise<Result<{ count: number }>>;
}

export async function moderateStudentMarksAction(dto: {
  entryId: string;
  moderatedMarks: number;
  reason: string;
}): Promise<Result<unknown>> {
  const guard = await requirePermission("MODERATE_MARKS");
  if (!guard.success || !guard.data) return guard as Result<never>;
  return ExamRepository.moderateStudentMarks({
    entryId: dto.entryId,
    moderatedMarks: dto.moderatedMarks,
    moderatedById: guard.data.id,
    reason: dto.reason,
  });
}

export async function calculateSessionResultsAction(
  examSessionId: string,
  semesterId: string
): Promise<Result<SessionCalculationActionResult>> {
  const guard = await requirePermission("MANAGE_EXAMS");
  if (!guard.success) return guard as Result<never>;
  return ExamRepository.calculateSessionResults(examSessionId, semesterId) as Promise<Result<SessionCalculationActionResult>>;
}

export async function publishSessionResultsAction(
  examSessionId: string,
  semesterId: string
): Promise<Result<{ publishedAt: Date }>> {
  const guard = await requirePermission("PUBLISH_RESULTS");
  if (!guard.success || !guard.data) return guard as Result<never>;
  return ExamRepository.publishSessionResults(examSessionId, semesterId, guard.data.id) as Promise<Result<{ publishedAt: Date }>>;
}

export async function getStudentResultSummariesAction(filters: {
  examSessionId?: string;
  studentId?: string;
  semesterId?: string;
}): Promise<Result<unknown[]>> {
  const guard = await requireAuth();
  if (!guard.success || !guard.data) return guard as Result<never>;
  const user = guard.data;

  let studentId = filters.studentId;
  const isStudentViewer = user.role === "STUDENT_VIEWER";

  if (isStudentViewer) {
    if (!user.studentId) {
      return {
        success: false,
        error: "Your user account is not linked to a student record.",
        code: "UNLINKED_STUDENT",
      };
    }
    studentId = user.studentId;
  }

  return ExamRepository.getStudentResultSummaries({
    examSessionId: filters.examSessionId,
    studentId,
    semesterId: filters.semesterId,
    isStudentViewer,
  }) as Promise<Result<unknown[]>>;
}

export async function amendPublishedMarkAction(dto: {
  entryId: string;
  newScore: number;
  reason: string;
}): Promise<Result<unknown>> {
  const guard = await requirePermission("PUBLISH_RESULTS");
  if (!guard.success || !guard.data) return guard as Result<never>;
  return ExamRepository.amendPublishedMark({
    entryId: dto.entryId,
    newScore: dto.newScore,
    reason: dto.reason,
    revisedById: guard.data.id,
  });
}
