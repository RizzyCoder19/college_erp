import prisma from "@/lib/db";
import { Prisma } from "@prisma/client";
import { Result } from "./types";

export interface CreateTimetableEntryDTO {
  semesterId: string;
  divisionId?: string | null;
  subjectId: string;
  teachingAssignmentId: string;
  dayOfWeek: string; // MONDAY, TUESDAY, WEDNESDAY, THURSDAY, FRIDAY, SATURDAY
  startTime: string; // HH:mm format
  endTime: string;   // HH:mm format
  room?: string | null;
  sessionType?: string; // THEORY, PRACTICAL_LAB, TUTORIAL
}

export interface UpdateTimetableEntryDTO {
  semesterId?: string;
  divisionId?: string | null;
  subjectId?: string;
  teachingAssignmentId?: string;
  dayOfWeek?: string;
  startTime?: string;
  endTime?: string;
  room?: string | null;
  sessionType?: string;
  status?: string; // ACTIVE, CANCELLED
}

export interface TimetableFilter {
  programmeId?: string;
  semesterId?: string;
  divisionId?: string | null;
  dayOfWeek?: string;
  staffId?: string;
}

const VALID_DAYS = ["MONDAY", "TUESDAY", "WEDNESDAY", "THURSDAY", "FRIDAY", "SATURDAY"];

/**
 * Checks if two time intervals [startA, endA] and [startB, endB] overlap.
 * Assumes HH:mm strings in 24-hr format.
 */
export function isTimeOverlapping(startA: string, endA: string, startB: string, endB: string): boolean {
  return startA < endB && startB < endA;
}

export class TimetableRepository {
  /**
   * Retrieves timetable entries matching criteria.
   */
  static async getTimetable(filter: TimetableFilter = {}): Promise<Result<unknown[]>> {
    try {
      const where: Prisma.TimetableEntryWhereInput = {
        status: { not: "CANCELLED" },
      };

      if (filter.semesterId) {
        where.semesterId = filter.semesterId;
      } else if (filter.programmeId) {
        where.semester = { programmeId: filter.programmeId };
      }

      if (filter.divisionId !== undefined) {
        if (filter.divisionId === null) {
          where.divisionId = null;
        } else {
          // Include division-specific entries OR cohort-wide entries (divisionId = null)
          where.OR = [
            { divisionId: filter.divisionId },
            { divisionId: null },
          ];
        }
      }

      if (filter.dayOfWeek) {
        where.dayOfWeek = filter.dayOfWeek;
      }

      if (filter.staffId) {
        where.teachingAssignment = { staffId: filter.staffId };
      }

      const entries = await prisma.timetableEntry.findMany({
        where,
        include: {
          semester: {
            include: {
              programme: true,
            },
          },
          division: true,
          subject: true,
          teachingAssignment: {
            include: {
              staff: true,
            },
          },
        },
        orderBy: [
          { dayOfWeek: "asc" },
          { startTime: "asc" },
        ],
      });

      return { success: true, data: entries };
    } catch (err: unknown) {
      return {
        success: false,
        error: `Failed to load timetable: ${err instanceof Error ? err.message : String(err)}`,
        code: "TIMETABLE_READ_ERROR",
      };
    }
  }

  /**
   * Validates relational compatibility and checks for schedule overlaps.
   */
  static async validateAndCheckConflicts(
    dto: CreateTimetableEntryDTO,
    excludeEntryId?: string
  ): Promise<{ valid: boolean; error?: string; code?: string; assignmentStaffId?: string }> {
    // 1. Time format & range validation
    if (!dto.startTime || !dto.endTime) {
      return { valid: false, error: "Start time and end time are required.", code: "INVALID_TIME" };
    }
    if (dto.startTime >= dto.endTime) {
      return { valid: false, error: `Start time (${dto.startTime}) must precede end time (${dto.endTime}).`, code: "INVALID_TIME_RANGE" };
    }
    if (!VALID_DAYS.includes(dto.dayOfWeek.toUpperCase())) {
      return { valid: false, error: `Invalid day of week "${dto.dayOfWeek}". Must be one of ${VALID_DAYS.join(", ")}.`, code: "INVALID_DAY" };
    }

    // 2. Validate Semester existence
    const semester = await prisma.semester.findUnique({
      where: { id: dto.semesterId },
      include: { programme: true },
    });
    if (!semester) {
      return { valid: false, error: "Specified semester does not exist.", code: "SEMESTER_NOT_FOUND" };
    }

    // 3. Validate Division (if specified)
    if (dto.divisionId) {
      const division = await prisma.division.findUnique({
        where: { id: dto.divisionId },
      });
      if (!division) {
        return { valid: false, error: "Specified division does not exist.", code: "DIVISION_NOT_FOUND" };
      }
      if (division.semesterId !== dto.semesterId) {
        return {
          valid: false,
          error: `Division "${division.name}" belongs to a different semester than the timetable entry.`,
          code: "DIVISION_SEMESTER_MISMATCH",
        };
      }
    }

    // 4. Validate Subject belongs to semester
    const subject = await prisma.subject.findUnique({
      where: { id: dto.subjectId },
    });
    if (!subject) {
      return { valid: false, error: "Specified subject does not exist.", code: "SUBJECT_NOT_FOUND" };
    }
    if (subject.semesterId !== dto.semesterId) {
      return {
        valid: false,
        error: `Subject "${subject.title}" (${subject.code}) belongs to a different semester than the timetable entry.`,
        code: "SUBJECT_SEMESTER_MISMATCH",
      };
    }

    // 5. Validate Teaching Assignment
    const assignment = await prisma.teachingAssignment.findUnique({
      where: { id: dto.teachingAssignmentId },
      include: { staff: true, subject: true, division: true },
    });
    if (!assignment) {
      return { valid: false, error: "Specified teaching assignment does not exist.", code: "ASSIGNMENT_NOT_FOUND" };
    }
    if (assignment.subjectId !== dto.subjectId) {
      return {
        valid: false,
        error: `Teaching assignment is for "${assignment.subject.title}", but timetable specifies "${subject.title}".`,
        code: "ASSIGNMENT_SUBJECT_MISMATCH",
      };
    }
    if (assignment.divisionId && dto.divisionId && assignment.divisionId !== dto.divisionId) {
      return {
        valid: false,
        error: `Teaching assignment is restricted to "${assignment.division?.name}", but timetable specifies a different division.`,
        code: "ASSIGNMENT_DIVISION_MISMATCH",
      };
    }

    // 6. OVERLAP CONFLICT DETECTION on the same dayOfWeek (excluding cancelled & self)
    const existingEntriesOnDay = await prisma.timetableEntry.findMany({
      where: {
        dayOfWeek: dto.dayOfWeek.toUpperCase(),
        status: { not: "CANCELLED" },
        id: excludeEntryId ? { not: excludeEntryId } : undefined,
      },
      include: {
        division: true,
        subject: true,
        teachingAssignment: {
          include: { staff: true },
        },
      },
    });

    for (const existing of existingEntriesOnDay) {
      if (isTimeOverlapping(dto.startTime, dto.endTime, existing.startTime, existing.endTime)) {
        // A. Faculty Overlap Conflict
        if (existing.teachingAssignment.staffId === assignment.staffId) {
          return {
            valid: false,
            error: `Schedule Conflict: Faculty member ${assignment.staff.fullName} is already assigned to "${existing.subject.title}" on ${dto.dayOfWeek} from ${existing.startTime} to ${existing.endTime}.`,
            code: "FACULTY_SCHEDULE_CONFLICT",
          };
        }

        // B. Division Overlap Conflict (if both specify division or cohort-wide)
        if (dto.divisionId && existing.divisionId && dto.divisionId === existing.divisionId) {
          return {
            valid: false,
            error: `Schedule Conflict: Division "${existing.division?.name || 'Assigned'}" is already scheduled for "${existing.subject.title}" on ${dto.dayOfWeek} from ${existing.startTime} to ${existing.endTime}.`,
            code: "DIVISION_SCHEDULE_CONFLICT",
          };
        }

        // Cohort-wide clash within same semester
        if (dto.semesterId === existing.semesterId) {
          if (!dto.divisionId || !existing.divisionId) {
            return {
              valid: false,
              error: `Schedule Conflict: Semester cohort already has class "${existing.subject.title}" scheduled on ${dto.dayOfWeek} from ${existing.startTime} to ${existing.endTime}.`,
              code: "COHORT_SCHEDULE_CONFLICT",
            };
          }
        }

        // C. Room Overlap Conflict (if room is defined)
        if (dto.room && existing.room && dto.room.trim().toLowerCase() === existing.room.trim().toLowerCase()) {
          return {
            valid: false,
            error: `Room Conflict: Location "${dto.room}" is already booked for "${existing.subject.title}" on ${dto.dayOfWeek} from ${existing.startTime} to ${existing.endTime}.`,
            code: "ROOM_SCHEDULE_CONFLICT",
          };
        }
      }
    }

    return { valid: true, assignmentStaffId: assignment.staffId };
  }

  /**
   * Creates a new timetable entry.
   */
  static async createTimetableEntry(dto: CreateTimetableEntryDTO): Promise<Result<unknown>> {
    try {
      const validation = await this.validateAndCheckConflicts(dto);
      if (!validation.valid) {
        return {
          success: false,
          error: validation.error || "Invalid timetable configuration.",
          code: validation.code || "VALIDATION_FAILED",
        };
      }

      const entry = await prisma.timetableEntry.create({
        data: {
          semesterId: dto.semesterId,
          divisionId: dto.divisionId || null,
          subjectId: dto.subjectId,
          teachingAssignmentId: dto.teachingAssignmentId,
          dayOfWeek: dto.dayOfWeek.toUpperCase(),
          startTime: dto.startTime,
          endTime: dto.endTime,
          room: dto.room ? dto.room.trim() : null,
          sessionType: dto.sessionType || "THEORY",
          status: "ACTIVE",
        },
        include: {
          semester: true,
          division: true,
          subject: true,
          teachingAssignment: {
            include: { staff: true },
          },
        },
      });

      return { success: true, data: entry };
    } catch (err: unknown) {
      return {
        success: false,
        error: `Failed to create timetable entry: ${err instanceof Error ? err.message : String(err)}`,
        code: "TIMETABLE_CREATE_ERROR",
      };
    }
  }

  /**
   * Updates an existing timetable entry with conflict checks.
   */
  static async updateTimetableEntry(id: string, dto: UpdateTimetableEntryDTO): Promise<Result<unknown>> {
    try {
      const existing = await prisma.timetableEntry.findUnique({
        where: { id },
      });
      if (!existing) {
        return { success: false, error: "Timetable entry not found.", code: "NOT_FOUND" };
      }

      // Merge dto with existing values for validation
      const mergedDTO: CreateTimetableEntryDTO = {
        semesterId: dto.semesterId || existing.semesterId,
        divisionId: dto.divisionId !== undefined ? dto.divisionId : existing.divisionId,
        subjectId: dto.subjectId || existing.subjectId,
        teachingAssignmentId: dto.teachingAssignmentId || existing.teachingAssignmentId,
        dayOfWeek: dto.dayOfWeek || existing.dayOfWeek,
        startTime: dto.startTime || existing.startTime,
        endTime: dto.endTime || existing.endTime,
        room: dto.room !== undefined ? dto.room : existing.room,
        sessionType: dto.sessionType || existing.sessionType,
      };

      const validation = await this.validateAndCheckConflicts(mergedDTO, id);
      if (!validation.valid) {
        return {
          success: false,
          error: validation.error || "Schedule conflict detected.",
          code: validation.code || "CONFLICT_ERROR",
        };
      }

      const updated = await prisma.timetableEntry.update({
        where: { id },
        data: {
          semesterId: mergedDTO.semesterId,
          divisionId: mergedDTO.divisionId,
          subjectId: mergedDTO.subjectId,
          teachingAssignmentId: mergedDTO.teachingAssignmentId,
          dayOfWeek: mergedDTO.dayOfWeek.toUpperCase(),
          startTime: mergedDTO.startTime,
          endTime: mergedDTO.endTime,
          room: mergedDTO.room ? mergedDTO.room.trim() : null,
          sessionType: mergedDTO.sessionType,
          status: dto.status || existing.status,
        },
        include: {
          semester: true,
          division: true,
          subject: true,
          teachingAssignment: {
            include: { staff: true },
          },
        },
      });

      return { success: true, data: updated };
    } catch (err: unknown) {
      return {
        success: false,
        error: `Failed to update timetable entry: ${err instanceof Error ? err.message : String(err)}`,
        code: "TIMETABLE_UPDATE_ERROR",
      };
    }
  }

  /**
   * Cancels or deletes a timetable entry safely.
   */
  static async cancelTimetableEntry(id: string): Promise<Result<{ id: string; status: string }>> {
    try {
      const existing = await prisma.timetableEntry.findUnique({
        where: { id },
        include: { attendanceSessions: true },
      });
      if (!existing) {
        return { success: false, error: "Timetable entry not found.", code: "NOT_FOUND" };
      }

      // If attendance has been conducted, soft cancel to preserve historical integrity
      if (existing.attendanceSessions && existing.attendanceSessions.length > 0) {
        await prisma.timetableEntry.update({
          where: { id },
          data: { status: "CANCELLED" },
        });
        return { success: true, data: { id, status: "CANCELLED" } };
      }

      // If no attendance records depend on it, delete cleanly
      await prisma.timetableEntry.delete({ where: { id } });
      return { success: true, data: { id, status: "DELETED" } };
    } catch (err: unknown) {
      return {
        success: false,
        error: `Failed to cancel timetable entry: ${err instanceof Error ? err.message : String(err)}`,
        code: "TIMETABLE_CANCEL_ERROR",
      };
    }
  }
}
