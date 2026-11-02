"use server";

import {
  AttendanceRepository,
  RecordAttendanceSessionDTO,
  AttendanceFilter,
} from "@/lib/dal/attendanceRepository";
import { requireAuth, requirePermission } from "@/lib/auth/guards";
import { Result } from "@/lib/dal/types";
import prisma from "@/lib/db";

export async function getCohortForSessionAction(semesterId: string, divisionId?: string | null): Promise<Result<unknown[]>> {
  const guard = await requireAuth();
  if (!guard.success) return guard as Result<never>;
  return AttendanceRepository.getCohortForSession(semesterId, divisionId);
}

export async function recordAttendanceSessionAction(dto: Omit<RecordAttendanceSessionDTO, "recordedById">): Promise<Result<unknown>> {
  const guard = await requirePermission("RECORD_ATTENDANCE");
  if (!guard.success || !guard.data) return guard as Result<never>;
  const user = guard.data;

  // Row-level authorization: Faculty can ONLY record attendance for classes they are assigned to
  if (user.role === "FACULTY_MEMBER") {
    if (!user.staffId) {
      return {
        success: false,
        error: "Access denied. Your faculty account is not linked to an institutional staff profile.",
        code: "UNLINKED_STAFF_ACCOUNT",
      };
    }

    const assignment = await prisma.teachingAssignment.findFirst({
      where: {
        staffId: user.staffId,
        subjectId: dto.subjectId,
        OR: [
          { divisionId: null },
          { divisionId: dto.divisionId || null },
        ],
      },
    });

    if (!assignment && dto.facultyId !== user.staffId) {
      return {
        success: false,
        error: "Access denied: Faculty members cannot record attendance for unassigned classes without explicit administrative authorization.",
        code: "UNASSIGNED_CLASS_ACCESS_DENIED",
      };
    }
  }

  const payload: RecordAttendanceSessionDTO = {
    ...dto,
    recordedById: user.id,
  };

  return AttendanceRepository.recordAttendanceSession(payload);
}

export async function amendAttendanceRecordAction(
  recordId: string,
  newStatus: "PRESENT" | "ABSENT" | "LATE" | "EXCUSED",
  remarks?: string
): Promise<Result<unknown>> {
  const guard = await requireAuth();
  if (!guard.success || !guard.data) return guard as Result<never>;
  const user = guard.data;

  if (!remarks || !remarks.trim()) {
    return {
      success: false,
      error: "A mandatory justification or amendment reason must be provided.",
      code: "REASON_REQUIRED",
    };
  }

  const record = await prisma.attendanceRecord.findUnique({
    where: { id: recordId },
    include: { session: true },
  });

  if (!record) {
    return { success: false, error: "Attendance record not found.", code: "NOT_FOUND" };
  }

  // Finalized records require administrative authorization (SYSTEM_ADMIN or ACADEMIC_ADMIN)
  if (record.session.status === "FINALIZED") {
    const adminCheck = await requirePermission("EDIT_FINALIZED_ATTENDANCE");
    if (!adminCheck.success) {
      return {
        success: false,
        error: "Access denied: Modifying a finalized attendance ledger entry requires administrative authorization.",
        code: "FINALIZED_RECORD_LOCKED",
      };
    }
  } else {
    // Draft session records can be amended by assigned faculty or admin
    const recCheck = await requirePermission("RECORD_ATTENDANCE");
    if (!recCheck.success) return recCheck as Result<never>;

    if (user.role === "FACULTY_MEMBER") {
      if (record.session.facultyId !== user.staffId) {
        return {
          success: false,
          error: "Access denied: You are not authorized to amend attendance for another faculty member's session.",
          code: "UNAUTHORIZED_FACULTY_AMEND",
        };
      }
    }
  }

  return AttendanceRepository.amendAttendanceRecord(recordId, newStatus, remarks, user.id);
}

export async function finalizeAttendanceSessionAction(sessionId: string): Promise<Result<unknown>> {
  const guard = await requirePermission("RECORD_ATTENDANCE");
  if (!guard.success || !guard.data) return guard as Result<never>;
  const user = guard.data;

  const session = await prisma.attendanceSession.findUnique({
    where: { id: sessionId },
  });

  if (!session) {
    return { success: false, error: "Attendance session not found.", code: "NOT_FOUND" };
  }

  if (user.role === "FACULTY_MEMBER" && session.facultyId !== user.staffId) {
    return {
      success: false,
      error: "Access denied: You cannot finalize attendance for another faculty member's session.",
      code: "FORBIDDEN",
    };
  }

  return AttendanceRepository.finalizeSession(sessionId, user.id);
}

export async function getAttendanceSessionsAction(filter: AttendanceFilter = {}): Promise<Result<unknown[]>> {
  const guard = await requirePermission("VIEW_ATTENDANCE");
  if (!guard.success || !guard.data) return guard as Result<never>;
  const user = guard.data;

  // Student viewers can view sessions relevant to their cohort, or filter
  if (user.role === "STUDENT_VIEWER" && user.studentId) {
    filter.studentId = user.studentId;
  }
  return AttendanceRepository.getAttendanceSessions(filter);
}

export async function getSessionDetailsAction(sessionId: string): Promise<Result<unknown>> {
  const guard = await requirePermission("VIEW_ATTENDANCE");
  if (!guard.success) return guard as Result<never>;
  return AttendanceRepository.getSessionDetails(sessionId);
}

export async function getAttendanceSummaryAction(filter: AttendanceFilter = {}): Promise<Result<unknown>> {
  const guard = await requirePermission("VIEW_ATTENDANCE");
  if (!guard.success || !guard.data) return guard as Result<never>;
  const user = guard.data;

  // Row-level scope: if student viewer, restrict to their own studentId
  if (user.role === "STUDENT_VIEWER") {
    if (!user.studentId) {
      return { success: false, error: "Student profile is not linked.", code: "UNLINKED_STUDENT" };
    }
    filter.studentId = user.studentId;
  }

  return AttendanceRepository.getAttendanceSummary(filter);
}
