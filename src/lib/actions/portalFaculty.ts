"use server";

import prisma from "@/lib/db";
import { connection } from "next/server";
import { getCurrentUser } from "@/lib/auth/guards";
import { FacultyRepository } from "@/lib/dal/facultyRepository";
import { TimetableRepository, TimetableFilter } from "@/lib/dal/timetableRepository";
import { AttendanceRepository } from "@/lib/dal/attendanceRepository";
import { Result } from "@/lib/dal/types";

// ============================================================================
// DATA TRANSFER OBJECTS (DTOs) — STRICT PRIVACY-FILTERED INTERFACES
// ============================================================================

export interface FacultySelfProfileDTO {
  staff: {
    id: string;
    employeeId: string;
    fullName: string;
    email: string;
    phone: string | null;
    designation: string;
    category: string;
    officeLocation: string | null;
    status: string;
    department: {
      id: string;
      code: string;
      name: string;
    } | null;
  };
  workloadSummary: {
    activeAssignmentsCount: number;
    prescribedWeeklyHours: number; // Curricular target contact hours, not an employment contract
    scheduledTimetableHours: number; // Sum of active published timetable entries
    totalRecordedSessionsCount: number; // Raw recorded attendance sessions count
  };
}

export interface FacultyTeachingAssignmentDTO {
  id: string;
  subjectId: string;
  subjectCode: string;
  subjectTitle: string;
  subjectCredits: number;
  subjectType: string;
  programmeCode: string;
  programmeName: string;
  semesterId: string;
  semesterNumber: number;
  divisionId: string | null;
  divisionName: string | null;
  weeklyHours: number;
  enrolledStudentsCount: number;
}

export interface FacultyTimetableEntryDTO {
  id: string;
  dayOfWeek: string;
  startTime: string;
  endTime: string;
  room: string | null;
  sessionType: string;
  status: string;
  subjectCode: string;
  subjectTitle: string;
  divisionName: string | null;
  programmeCode: string;
  semesterNumber: number;
  durationHours: number;
}

export interface FacultyClassRosterDTO {
  assignment: {
    id: string;
    subjectCode: string;
    subjectTitle: string;
    programmeCode: string;
    programmeName: string;
    semesterNumber: number;
    divisionName: string | null;
  };
  students: Array<{
    id: string;
    rollNumber: string;
    prn: string;
    fullName: string;
    status: string;
  }>;
  totalCount: number;
}

export interface FacultyAttendanceSessionDTO {
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
  divisionName: string | null;
  semesterNumber: number;
  presentCount: number;
  totalCount: number;
  finalizedAt: Date | null;
}

// ============================================================================
// INTERNAL HELPERS & AUTHORIZATION GUARDS
// ============================================================================

interface VerifiedFacultySession {
  staffId: string;
  userId: string;
  fullName: string;
  email: string;
}

/**
 * Validates the authenticated session and confirms active faculty member identity.
 * Strictly derives staffId from the server session; rejects unlinked or inactive profiles.
 * Client-supplied identifiers are never accepted as proof of authorization.
 */
async function requireFacultySession(): Promise<Result<VerifiedFacultySession>> {
  try {
    try {
      await connection();
    } catch {
      // In non-request or mock execution contexts, connection() safely passes through
    }

    const user = await getCurrentUser();
    if (!user) {
      return {
        success: false,
        error: "Authentication required. Please sign in to access faculty self-service.",
        code: "UNAUTHORIZED",
      };
    }

    if (user.role !== "FACULTY_MEMBER") {
      return {
        success: false,
        error: "Access denied. Only authenticated faculty members may access this portal.",
        code: "FORBIDDEN",
      };
    }

    if (!user.staffId) {
      return {
        success: false,
        error: "No staff profile is linked to this user account.",
        code: "UNLINKED_STAFF_PROFILE",
      };
    }

    // Verify the linked staff profile exists and has ACTIVE status
    const staff = await prisma.staff.findUnique({
      where: { id: user.staffId },
      select: { id: true, status: true, fullName: true },
    });

    if (!staff) {
      return {
        success: false,
        error: "Linked staff profile was not found in the institutional directory.",
        code: "STAFF_NOT_FOUND",
      };
    }

    if (staff.status !== "ACTIVE") {
      return {
        success: false,
        error: "Linked staff profile is not active.",
        code: "INACTIVE_STAFF_ACCOUNT",
      };
    }

    return {
      success: true,
      data: {
        staffId: user.staffId,
        userId: user.id,
        fullName: user.fullName,
        email: user.email,
      },
    };
  } catch (err: unknown) {
    return {
      success: false,
      error: `Faculty session verification failed: ${err instanceof Error ? err.message : String(err)}`,
      code: "AUTH_VERIFICATION_ERROR",
    };
  }
}

/**
 * Parses "HH:mm" time strings into total minutes from midnight.
 */
function parseTimeToMinutes(timeStr: string): number {
  if (!timeStr || typeof timeStr !== "string") return 0;
  const parts = timeStr.split(":").map(Number);
  const hours = parts[0] || 0;
  const minutes = parts[1] || 0;
  return hours * 60 + minutes;
}

/**
 * Calculates session duration in decimal hours (e.g., "09:00" to "10:30" => 1.5).
 */
function calculateDurationHours(startTime: string, endTime: string): number {
  const startMin = parseTimeToMinutes(startTime);
  const endMin = parseTimeToMinutes(endTime);
  const diff = endMin - startMin;
  return diff > 0 ? Math.round((diff / 60) * 100) / 100 : 0;
}

// ============================================================================
// WORKSTREAM 1 SERVER ACTIONS (MINIMUM READ OPERATIONS)
// ============================================================================

/**
 * Retrieves the authenticated faculty member's personal profile, department,
 * and high-level teaching workload metrics.
 */
export async function getFacultySelfProfile(): Promise<Result<FacultySelfProfileDTO>> {
  const authRes = await requireFacultySession();
  if (!authRes.success || !authRes.data) {
    return { success: false, error: authRes.error, code: authRes.code };
  }

  const { staffId } = authRes.data;

  try {
    // 1-4. Parallelize staff profile, active assignments, timetable, and attendance sessions queries
    const [staffRes, activeAssignments, timetableRes, totalRecordedSessionsCount] = await Promise.all([
      FacultyRepository.getStaffById(staffId),
      prisma.teachingAssignment.findMany({
        where: { staffId },
        select: { weeklyHours: true },
      }),
      TimetableRepository.getTimetable({ staffId }),
      prisma.attendanceSession.count({
        where: {
          facultyId: staffId,
          status: { not: "CANCELLED" },
        },
      }),
    ]);

    if (!staffRes.success || !staffRes.data) {
      return {
        success: false,
        error: staffRes.error || "Failed to load faculty staff profile.",
        code: staffRes.code || "PROFILE_LOAD_ERROR",
      };
    }

    const staffData = staffRes.data;

    const activeAssignmentsCount = activeAssignments.length;
    const prescribedWeeklyHours = activeAssignments.reduce(
      (sum, a) => sum + (a.weeklyHours || 0),
      0
    );

    let scheduledTimetableHours = 0;
    if (timetableRes.success && Array.isArray(timetableRes.data)) {
      for (const entry of timetableRes.data as Array<{ startTime: string; endTime: string }>) {
        scheduledTimetableHours += calculateDurationHours(entry.startTime, entry.endTime);
      }
    }

    const dto: FacultySelfProfileDTO = {
      staff: {
        id: staffData.id,
        employeeId: staffData.employeeId,
        fullName: staffData.fullName,
        email: staffData.email,
        phone: staffData.phone,
        designation: staffData.designation,
        category: staffData.category,
        officeLocation: staffData.officeLocation,
        status: staffData.status,
        department: staffData.department
          ? {
              id: staffData.department.id,
              code: staffData.department.code,
              name: staffData.department.name,
            }
          : null,
      },
      workloadSummary: {
        activeAssignmentsCount,
        prescribedWeeklyHours,
        scheduledTimetableHours: Math.round(scheduledTimetableHours * 10) / 10,
        totalRecordedSessionsCount,
      },
    };

    return { success: true, data: dto };
  } catch (err: unknown) {
    return {
      success: false,
      error: `Failed to load faculty profile: ${err instanceof Error ? err.message : String(err)}`,
      code: "PROFILE_FETCH_FAILED",
    };
  }
}

/**
 * Retrieves the active teaching assignments assigned to the authenticated faculty member,
 * including subject specifications, division placement, and live enrolled student count.
 */
export async function getFacultySelfTeachingAssignments(): Promise<Result<FacultyTeachingAssignmentDTO[]>> {
  const authRes = await requireFacultySession();
  if (!authRes.success || !authRes.data) {
    return { success: false, error: authRes.error, code: authRes.code };
  }

  const { staffId } = authRes.data;

  try {
    const assignments = await prisma.teachingAssignment.findMany({
      where: { staffId },
      include: {
        subject: {
          include: {
            semester: {
              include: {
                programme: true,
              },
            },
          },
        },
        division: true,
      },
      orderBy: [
        { subject: { code: "asc" } },
        { division: { name: "asc" } },
      ],
    });

    const dtoList: FacultyTeachingAssignmentDTO[] = [];

    for (const a of assignments) {
      // Count active enrolled students in this specific division or semester cohort
      const enrolledCount = await prisma.enrolment.count({
        where: {
          semesterId: a.subject.semesterId,
          ...(a.divisionId ? { divisionId: a.divisionId } : {}),
          status: "ENROLLED",
        },
      });

      dtoList.push({
        id: a.id,
        subjectId: a.subjectId,
        subjectCode: a.subject.code,
        subjectTitle: a.subject.title,
        subjectCredits: a.subject.credits,
        subjectType: a.subject.subjectType,
        programmeCode: a.subject.semester.programme.code,
        programmeName: a.subject.semester.programme.name,
        semesterId: a.subject.semesterId,
        semesterNumber: a.subject.semester.semesterNumber,
        divisionId: a.divisionId,
        divisionName: a.division?.name || "Cohort-Wide",
        weeklyHours: a.weeklyHours,
        enrolledStudentsCount: enrolledCount,
      });
    }

    return { success: true, data: dtoList };
  } catch (err: unknown) {
    return {
      success: false,
      error: `Failed to load teaching assignments: ${err instanceof Error ? err.message : String(err)}`,
      code: "ASSIGNMENTS_FETCH_FAILED",
    };
  }
}

/**
 * Retrieves weekly timetable entries for the authenticated faculty member.
 * Only returns entries linked to teaching assignments held by the authenticated instructor.
 * Returns an empty array honestly if 0 timetable entries exist.
 */
export async function getFacultySelfTimetable(): Promise<Result<FacultyTimetableEntryDTO[]>> {
  const authRes = await requireFacultySession();
  if (!authRes.success || !authRes.data) {
    return { success: false, error: authRes.error, code: authRes.code };
  }

  const { staffId } = authRes.data;

  try {
    const filter: TimetableFilter = { staffId };
    const timetableRes = await TimetableRepository.getTimetable(filter);

    if (!timetableRes.success || !Array.isArray(timetableRes.data)) {
      return {
        success: false,
        error: timetableRes.error || "Failed to load faculty timetable.",
        code: timetableRes.code || "TIMETABLE_FETCH_FAILED",
      };
    }

    interface RawTimetableEntry {
      id: string;
      dayOfWeek: string;
      startTime: string;
      endTime: string;
      room: string | null;
      sessionType: string;
      status: string;
      subject: { code: string; title: string };
      division: { name: string } | null;
      semester: { semesterNumber: number; programme: { code: string } };
    }

    const dtoList: FacultyTimetableEntryDTO[] = (timetableRes.data as RawTimetableEntry[]).map((entry) => ({
      id: entry.id,
      dayOfWeek: entry.dayOfWeek,
      startTime: entry.startTime,
      endTime: entry.endTime,
      room: entry.room,
      sessionType: entry.sessionType,
      status: entry.status,
      subjectCode: entry.subject.code,
      subjectTitle: entry.subject.title,
      divisionName: entry.division?.name || "Cohort-Wide",
      programmeCode: entry.semester.programme.code,
      semesterNumber: entry.semester.semesterNumber,
      durationHours: calculateDurationHours(entry.startTime, entry.endTime),
    }));

    return { success: true, data: dtoList };
  } catch (err: unknown) {
    return {
      success: false,
      error: `Failed to load timetable: ${err instanceof Error ? err.message : String(err)}`,
      code: "TIMETABLE_FETCH_FAILED",
    };
  }
}

/**
 * Retrieves the student roster for an assigned class.
 *
 * RIGID SECURITY BOUNDARY:
 * 1. Checks that teachingAssignmentId is owned by the authenticated faculty member.
 * 2. Unassigned class queries are rejected with FORBIDDEN (HTTP 403).
 * 3. Returns strictly privacy-filtered academic identifiers:
 *    [id, rollNumber, prn, fullName, status].
 * 4. Gender, personal phone, email, guardian PII, financial ledgers, and compliance
 *    documents are strictly EXCLUDED from the payload.
 */
export async function getFacultyClassRoster(
  teachingAssignmentId: string
): Promise<Result<FacultyClassRosterDTO>> {
  const authRes = await requireFacultySession();
  if (!authRes.success || !authRes.data) {
    return { success: false, error: authRes.error, code: authRes.code };
  }

  if (!teachingAssignmentId || typeof teachingAssignmentId !== "string") {
    return {
      success: false,
      error: "Teaching assignment identifier is required.",
      code: "INVALID_ARGUMENT",
    };
  }

  const { staffId } = authRes.data;

  try {
    // 1. Verify ownership of the teaching assignment
    const assignment = await prisma.teachingAssignment.findUnique({
      where: { id: teachingAssignmentId },
      include: {
        subject: {
          include: {
            semester: {
              include: {
                programme: true,
              },
            },
          },
        },
        division: true,
      },
    });

    if (!assignment) {
      return {
        success: false,
        error: "Teaching assignment not found.",
        code: "ASSIGNMENT_NOT_FOUND",
      };
    }

    // Row-level boundary: Instructor must hold this teaching assignment
    if (assignment.staffId !== staffId) {
      return {
        success: false,
        error: "Access denied. You do not hold this teaching assignment.",
        code: "FORBIDDEN",
      };
    }

    // 2. Query division cohort via AttendanceRepository
    const cohortRes = await AttendanceRepository.getCohortForSession(
      assignment.subject.semesterId,
      assignment.divisionId || undefined
    );

    if (!cohortRes.success || !Array.isArray(cohortRes.data)) {
      return {
        success: false,
        error: cohortRes.error || "Failed to load class roster.",
        code: cohortRes.code || "ROSTER_FETCH_FAILED",
      };
    }

    interface RawCohortStudent {
      studentId: string;
      rollNumber: string;
      prn: string;
      fullName: string;
    }

    // 3. Map strictly to privacy-filtered DTO (gender, phone, guardian PII omitted)
    const students = (cohortRes.data as RawCohortStudent[]).map((s) => ({
      id: s.studentId,
      rollNumber: s.rollNumber,
      prn: s.prn,
      fullName: s.fullName,
      status: "ENROLLED",
    }));

    const dto: FacultyClassRosterDTO = {
      assignment: {
        id: assignment.id,
        subjectCode: assignment.subject.code,
        subjectTitle: assignment.subject.title,
        programmeCode: assignment.subject.semester.programme.code,
        programmeName: assignment.subject.semester.programme.name,
        semesterNumber: assignment.subject.semester.semesterNumber,
        divisionName: assignment.division?.name || "Cohort-Wide",
      },
      students,
      totalCount: students.length,
    };

    return { success: true, data: dto };
  } catch (err: unknown) {
    return {
      success: false,
      error: `Failed to load class roster: ${err instanceof Error ? err.message : String(err)}`,
      code: "ROSTER_FETCH_FAILED",
    };
  }
}

/**
 * Retrieves the attendance session ledger recorded by the authenticated faculty member.
 * Strictly scopes queries to facultyId === session.staffId.
 * Raw session metrics (presentCount, totalCount) are returned; unverified rate percentages
 * and eligibility verdicts are not rendered.
 */
export async function getFacultyAttendanceSessions(): Promise<Result<FacultyAttendanceSessionDTO[]>> {
  const authRes = await requireFacultySession();
  if (!authRes.success || !authRes.data) {
    return { success: false, error: authRes.error, code: authRes.code };
  }

  const { staffId } = authRes.data;

  try {
    const sessionsRes = await AttendanceRepository.getAttendanceSessions({
      facultyId: staffId,
    });

    if (!sessionsRes.success || !Array.isArray(sessionsRes.data)) {
      return {
        success: false,
        error: sessionsRes.error || "Failed to load attendance session ledger.",
        code: sessionsRes.code || "ATTENDANCE_FETCH_FAILED",
      };
    }

    interface RawAttendanceSession {
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
      divisionName: string | null;
      semesterNumber: number;
      finalizedAt: Date | null;
      counts: {
        total: number;
        present: number;
        late: number;
      };
    }

    const dtoList: FacultyAttendanceSessionDTO[] = (sessionsRes.data as RawAttendanceSession[]).map((s) => ({
      id: s.id,
      timetableEntryId: s.timetableEntryId,
      sessionDate: s.sessionDate,
      startTime: s.startTime,
      endTime: s.endTime,
      sessionType: s.sessionType,
      status: s.status,
      topicCovered: s.topicCovered,
      subjectCode: s.subjectCode,
      subjectTitle: s.subjectTitle,
      divisionName: s.divisionName,
      semesterNumber: s.semesterNumber,
      presentCount: (s.counts?.present || 0) + (s.counts?.late || 0),
      totalCount: s.counts?.total || 0,
      finalizedAt: s.finalizedAt,
    }));

    return { success: true, data: dtoList };
  } catch (err: unknown) {
    return {
      success: false,
      error: `Failed to load attendance session ledger: ${err instanceof Error ? err.message : String(err)}`,
      code: "ATTENDANCE_FETCH_FAILED",
    };
  }
}
