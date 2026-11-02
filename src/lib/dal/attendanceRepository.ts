import prisma from "@/lib/db";
import { Prisma } from "@prisma/client";
import { Result } from "./types";

export interface AttendanceRecordInput {
  studentId: string;
  enrolmentId: string;
  status: "PRESENT" | "ABSENT" | "LATE" | "EXCUSED";
  remarks?: string;
}

export interface RecordAttendanceSessionDTO {
  timetableEntryId?: string | null;
  semesterId: string;
  divisionId?: string | null;
  subjectId: string;
  facultyId: string;
  sessionDate: string | Date;
  startTime: string;
  endTime: string;
  sessionType?: string; // THEORY, PRACTICAL_LAB, TUTORIAL
  status?: "DRAFT" | "FINALIZED";
  topicCovered?: string;
  recordedById: string; // UserAccount ID
  records: AttendanceRecordInput[];
}

export interface AttendanceFilter {
  semesterId?: string;
  divisionId?: string | null;
  subjectId?: string;
  facultyId?: string;
  studentId?: string;
  startDate?: string | Date;
  endDate?: string | Date;
  status?: string;
}

/**
 * Normalizes any Date or ISO string to UTC Midnight for calendar-day matching.
 */
export function normalizeDateToUTC(dateInput: string | Date): Date {
  const d = new Date(dateInput);
  return new Date(Date.UTC(d.getFullYear(), d.getMonth(), d.getDate(), 0, 0, 0, 0));
}

export class AttendanceRepository {
  /**
   * Loads the active student cohort for a semester and optional division.
   */
  static async getCohortForSession(semesterId: string, divisionId?: string | null): Promise<Result<unknown[]>> {
    try {
      const where: Prisma.EnrolmentWhereInput = {
        semesterId,
        status: "ENROLLED",
      };

      if (divisionId) {
        where.divisionId = divisionId;
      }

      const enrolments = await prisma.enrolment.findMany({
        where,
        include: {
          student: true,
          division: true,
          semester: {
            include: { programme: true },
          },
        },
        orderBy: [
          { student: { rollNumber: "asc" } },
        ],
      });

      const cohort = enrolments.map((enr) => ({
        enrolmentId: enr.id,
        studentId: enr.student.id,
        rollNumber: enr.student.rollNumber,
        prn: enr.student.prn,
        fullName: enr.student.fullName,
        gender: enr.student.gender,
        divisionName: enr.division?.name || "Cohort-Wide",
        divisionId: enr.divisionId,
        semesterNumber: enr.semester.semesterNumber,
        programmeCode: enr.semester.programme.code,
        currentAttendanceRate: enr.student.attendanceRate,
      }));

      return { success: true, data: cohort };
    } catch (err: unknown) {
      return {
        success: false,
        error: `Failed to load cohort: ${err instanceof Error ? err.message : String(err)}`,
        code: "COHORT_LOAD_ERROR",
      };
    }
  }

  /**
   * Records or updates a complete attendance session with individual student records atomically.
   */
  static async recordAttendanceSession(dto: RecordAttendanceSessionDTO): Promise<Result<unknown>> {
    try {
      const sessionDateUtc = normalizeDateToUTC(dto.sessionDate);

      // 1. DUPLICATE SESSION DETECTION & DRAFT UPDATE IDENTIFICATION
      let existingDraftId: string | null = null;
      if (dto.timetableEntryId) {
        const existingSlot = await prisma.attendanceSession.findUnique({
          where: {
            timetableEntryId_sessionDate: {
              timetableEntryId: dto.timetableEntryId,
              sessionDate: sessionDateUtc,
            },
          },
        });
        if (existingSlot && existingSlot.status !== "CANCELLED") {
          if (existingSlot.status === "DRAFT") {
            existingDraftId = existingSlot.id;
          } else {
            return {
              success: false,
              error: `Attendance for this scheduled timetable slot has already been recorded on ${sessionDateUtc.toISOString().split("T")[0]}.`,
              code: "DUPLICATE_ATTENDANCE_SESSION",
            };
          }
        }
      } else {
        // Ad-hoc session duplicate check
        const existingAdHoc = await prisma.attendanceSession.findFirst({
          where: {
            subjectId: dto.subjectId,
            divisionId: dto.divisionId || null,
            sessionDate: sessionDateUtc,
            startTime: dto.startTime,
            status: { not: "CANCELLED" },
          },
        });
        if (existingAdHoc) {
          if (existingAdHoc.status === "DRAFT") {
            existingDraftId = existingAdHoc.id;
          } else {
            return {
              success: false,
              error: `An attendance session for this subject, cohort, and time slot already exists on ${sessionDateUtc.toISOString().split("T")[0]}.`,
              code: "DUPLICATE_ATTENDANCE_SESSION",
            };
          }
        }
      }

      // 2. COHORT INTEGRITY & CROSS-COHORT TAMPERING PREVENTION
      const activeEnrolments = await prisma.enrolment.findMany({
        where: {
          semesterId: dto.semesterId,
          divisionId: dto.divisionId ? dto.divisionId : undefined,
          status: "ENROLLED",
        },
        include: { student: true },
      });

      const validEnrolmentMap = new Map<string, string>(); // studentId -> enrolmentId
      for (const enr of activeEnrolments) {
        validEnrolmentMap.set(enr.studentId, enr.id);
      }

      // Validate student records
      const seenStudentIds = new Set<string>();
      for (const record of dto.records) {
        if (seenStudentIds.has(record.studentId)) {
          return {
            success: false,
            error: `Duplicate student entry detected in attendance sheet (Student ID: ${record.studentId}).`,
            code: "DUPLICATE_STUDENT_IN_SHEET",
          };
        }
        seenStudentIds.add(record.studentId);

        if (!validEnrolmentMap.has(record.studentId)) {
          const student = await prisma.student.findUnique({ where: { id: record.studentId } });
          const identifier = student ? `${student.fullName} (PRN: ${student.prn})` : record.studentId;
          return {
            success: false,
            error: `Cross-cohort tampering rejected: Student ${identifier} is not actively enrolled in this class cohort.`,
            code: "CROSS_COHORT_STUDENT_REJECTED",
          };
        }

        const expectedEnrolmentId = validEnrolmentMap.get(record.studentId);
        if (record.enrolmentId !== expectedEnrolmentId) {
          return {
            success: false,
            error: `Enrolment ID mismatch for student ${record.studentId}.`,
            code: "INVALID_ENROLMENT_ID",
          };
        }
      }

      // 3. EXECUTE TRANSACTION
      const isFinalized = dto.status === "FINALIZED";
      const now = new Date();

      const result = await prisma.$transaction(async (tx) => {
        let session;
        if (existingDraftId) {
          // Clean up old draft records and update session
          await tx.attendanceRecord.deleteMany({
            where: { sessionId: existingDraftId },
          });

          session = await tx.attendanceSession.update({
            where: { id: existingDraftId },
            data: {
              status: dto.status || "DRAFT",
              topicCovered: dto.topicCovered ? dto.topicCovered.trim() : null,
              finalizedAt: isFinalized ? now : null,
              attendanceRecords: {
                create: dto.records.map((r) => ({
                  studentId: r.studentId,
                  enrolmentId: r.enrolmentId,
                  status: r.status,
                  remarks: r.remarks ? r.remarks.trim() : null,
                })),
              },
            },
            include: {
              attendanceRecords: {
                include: { student: true },
              },
              subject: true,
              division: true,
              semester: true,
              faculty: true,
            },
          });
        } else {
          session = await tx.attendanceSession.create({
            data: {
              timetableEntryId: dto.timetableEntryId || null,
              semesterId: dto.semesterId,
              divisionId: dto.divisionId || null,
              subjectId: dto.subjectId,
              facultyId: dto.facultyId,
              sessionDate: sessionDateUtc,
              startTime: dto.startTime,
              endTime: dto.endTime,
              sessionType: dto.sessionType || "THEORY",
              status: dto.status || "DRAFT",
              topicCovered: dto.topicCovered ? dto.topicCovered.trim() : null,
              recordedById: dto.recordedById,
              finalizedAt: isFinalized ? now : null,
              attendanceRecords: {
                create: dto.records.map((r) => ({
                  studentId: r.studentId,
                  enrolmentId: r.enrolmentId,
                  status: r.status,
                  remarks: r.remarks ? r.remarks.trim() : null,
                })),
              },
            },
            include: {
              attendanceRecords: {
                include: {
                  student: true,
                },
              },
              subject: true,
              division: true,
              semester: true,
              faculty: true,
            },
          });
        }

        // 4. Update student cached attendance rate from real ledger
        if (isFinalized) {
          for (const record of dto.records) {
            await AttendanceRepository.recalculateStudentRate(record.studentId, tx);
          }
        }

        return session;
      });

      return { success: true, data: result };
    } catch (err: unknown) {
      return {
        success: false,
        error: `Failed to record attendance: ${err instanceof Error ? err.message : String(err)}`,
        code: "ATTENDANCE_RECORD_ERROR",
      };
    }
  }

  /**
   * Recalculates and caches the attendance rate for a student from actual recorded sessions.
   * Returns null if student has 0 recorded eligible sessions.
   */
  static async recalculateStudentRate(studentId: string, txClient?: Prisma.TransactionClient): Promise<number | null> {
    const db = txClient || prisma;
    const records = await db.attendanceRecord.findMany({
      where: {
        studentId,
        session: {
          status: { not: "CANCELLED" },
        },
      },
    });

    if (records.length === 0) {
      await db.student.update({
        where: { id: studentId },
        data: { attendanceRate: null },
      });
      return null;
    }

    // Numerator: PRESENT (1.0) + LATE (1.0)
    // Denominator: Total eligible sessions (EXCUSED sessions excluded from denominator)
    let attended = 0;
    let totalEligible = 0;

    for (const r of records) {
      if (r.status === "PRESENT" || r.status === "LATE") {
        attended += 1;
        totalEligible += 1;
      } else if (r.status === "ABSENT") {
        totalEligible += 1;
      } else if (r.status === "EXCUSED") {
        // Officially excused medical / institutional leaves do not penalize denominator
      }
    }

    const calculatedRate = totalEligible > 0 ? Math.round((attended / totalEligible) * 1000) / 10 : null;
    await db.student.update({
      where: { id: studentId },
      data: { attendanceRate: calculatedRate },
    });

    return calculatedRate;
  }

  /**
   * Amends a specific attendance record with full audit tracking and mandatory reason.
   */
  static async amendAttendanceRecord(
    recordId: string,
    newStatus: "PRESENT" | "ABSENT" | "LATE" | "EXCUSED",
    remarks: string | undefined,
    amendedById: string
  ): Promise<Result<unknown>> {
    try {
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

      if (record.session.status === "CANCELLED") {
        return {
          success: false,
          error: "Cannot amend records for a cancelled attendance session.",
          code: "SESSION_CANCELLED",
        };
      }

      const updated = await prisma.$transaction(async (tx) => {
        const res = await tx.attendanceRecord.update({
          where: { id: recordId },
          data: {
            status: newStatus,
            remarks: remarks.trim(),
            amendedById,
            amendedAt: new Date(),
          },
          include: {
            student: true,
            session: true,
          },
        });

        // Recalculate rate
        await AttendanceRepository.recalculateStudentRate(record.studentId, tx);
        return res;
      });

      return { success: true, data: updated };
    } catch (err: unknown) {
      return {
        success: false,
        error: `Failed to amend record: ${err instanceof Error ? err.message : String(err)}`,
        code: "AMEND_ERROR",
      };
    }
  }

  /**
   * Finalizes an attendance session.
   */
  static async finalizeSession(sessionId: string, finalizedById: string): Promise<Result<unknown>> {
    try {
      const session = await prisma.attendanceSession.findUnique({
        where: { id: sessionId },
        include: { attendanceRecords: true },
      });

      if (!session) {
        return { success: false, error: "Attendance session not found.", code: "NOT_FOUND" };
      }

      const updated = await prisma.$transaction(async (tx) => {
        const res = await tx.attendanceSession.update({
          where: { id: sessionId },
          data: {
            status: "FINALIZED",
            finalizedAt: new Date(),
            amendedById: finalizedById,
          },
        });

        for (const rec of session.attendanceRecords) {
          await AttendanceRepository.recalculateStudentRate(rec.studentId, tx);
        }

        return res;
      });

      return { success: true, data: updated };
    } catch (err: unknown) {
      return {
        success: false,
        error: `Failed to finalize session: ${err instanceof Error ? err.message : String(err)}`,
        code: "FINALIZE_ERROR",
      };
    }
  }

  /**
   * Lists recorded attendance sessions with filters and zero-safe metrics.
   */
  static async getAttendanceSessions(filter: AttendanceFilter = {}): Promise<Result<unknown[]>> {
    try {
      const where: Prisma.AttendanceSessionWhereInput = {};

      if (filter.semesterId) where.semesterId = filter.semesterId;
      if (filter.divisionId !== undefined) {
        where.divisionId = filter.divisionId === null ? null : filter.divisionId;
      }
      if (filter.subjectId) where.subjectId = filter.subjectId;
      if (filter.facultyId) where.facultyId = filter.facultyId;
      if (filter.status) where.status = filter.status;

      if (filter.startDate || filter.endDate) {
        where.sessionDate = {};
        if (filter.startDate) where.sessionDate.gte = normalizeDateToUTC(filter.startDate);
        if (filter.endDate) where.sessionDate.lte = normalizeDateToUTC(filter.endDate);
      }

      const sessions = await prisma.attendanceSession.findMany({
        where,
        include: {
          subject: true,
          division: true,
          semester: {
            include: { programme: true },
          },
          faculty: true,
          recordedBy: {
            select: { id: true, fullName: true, role: true, email: true },
          },
          amendedBy: {
            select: { id: true, fullName: true, role: true, email: true },
          },
          attendanceRecords: {
            select: {
              id: true,
              status: true,
            },
          },
        },
        orderBy: [
          { sessionDate: "desc" },
          { startTime: "desc" },
        ],
      });

      const formatted = sessions.map((s) => {
        const total = s.attendanceRecords.length;
        const present = s.attendanceRecords.filter((r) => r.status === "PRESENT").length;
        const late = s.attendanceRecords.filter((r) => r.status === "LATE").length;
        const absent = s.attendanceRecords.filter((r) => r.status === "ABSENT").length;
        const excused = s.attendanceRecords.filter((r) => r.status === "EXCUSED").length;
        const eligibleTotal = present + late + absent;
        const attendanceRate = eligibleTotal > 0 ? Math.round(((present + late) / eligibleTotal) * 1000) / 10 : null;

        return {
          id: s.id,
          timetableEntryId: s.timetableEntryId,
          sessionDate: s.sessionDate,
          startTime: s.startTime,
          endTime: s.endTime,
          sessionType: s.sessionType,
          status: s.status,
          topicCovered: s.topicCovered,
          subjectCode: s.subject.code,
          subjectTitle: s.subject.title,
          programmeCode: s.semester.programme.code,
          semesterNumber: s.semester.semesterNumber,
          divisionName: s.division?.name || "Cohort-Wide",
          facultyName: s.faculty.fullName,
          recordedByName: s.recordedBy.fullName,
          finalizedAt: s.finalizedAt,
          counts: {
            total,
            present,
            late,
            absent,
            excused,
            eligibleTotal,
            attendanceRate,
          },
        };
      });

      return { success: true, data: formatted };
    } catch (err: unknown) {
      return {
        success: false,
        error: `Failed to load attendance sessions: ${err instanceof Error ? err.message : String(err)}`,
        code: "SESSIONS_LOAD_ERROR",
      };
    }
  }

  /**
   * Retrieves single session details with all student records and audit trails.
   */
  static async getSessionDetails(sessionId: string): Promise<Result<unknown>> {
    try {
      const session = await prisma.attendanceSession.findUnique({
        where: { id: sessionId },
        include: {
          subject: true,
          division: true,
          semester: {
            include: { programme: true },
          },
          faculty: true,
          recordedBy: {
            select: { id: true, fullName: true, role: true, email: true },
          },
          amendedBy: {
            select: { id: true, fullName: true, role: true, email: true },
          },
          attendanceRecords: {
            include: {
              student: true,
              amendedBy: {
                select: { id: true, fullName: true, role: true },
              },
            },
            orderBy: {
              student: { rollNumber: "asc" },
            },
          },
        },
      });

      if (!session) {
        return { success: false, error: "Session not found.", code: "NOT_FOUND" };
      }

      return { success: true, data: session };
    } catch (err: unknown) {
      return {
        success: false,
        error: `Failed to load session details: ${err instanceof Error ? err.message : String(err)}`,
        code: "SESSION_DETAIL_ERROR",
      };
    }
  }

  /**
   * Calculates comprehensive attendance metrics across a cohort or for a student with per-subject breakdown.
   */
  static async getAttendanceSummary(filter: AttendanceFilter = {}): Promise<Result<unknown>> {
    try {
      const whereSession: Prisma.AttendanceSessionWhereInput = {
        status: { not: "CANCELLED" },
      };

      if (filter.semesterId) whereSession.semesterId = filter.semesterId;
      if (filter.divisionId !== undefined) {
        whereSession.divisionId = filter.divisionId === null ? null : filter.divisionId;
      }
      if (filter.subjectId) whereSession.subjectId = filter.subjectId;

      const totalConductedSessions = await prisma.attendanceSession.count({
        where: whereSession,
      });

      const recordsWhere: Prisma.AttendanceRecordWhereInput = {
        session: whereSession,
      };

      if (filter.studentId) {
        recordsWhere.studentId = filter.studentId;
      }

      const records = await prisma.attendanceRecord.findMany({
        where: recordsWhere,
        include: {
          student: true,
          session: {
            include: { subject: true },
          },
        },
      });

      const totalRecords = records.length;
      const presentCount = records.filter((r) => r.status === "PRESENT").length;
      const lateCount = records.filter((r) => r.status === "LATE").length;
      const absentCount = records.filter((r) => r.status === "ABSENT").length;
      const excusedCount = records.filter((r) => r.status === "EXCUSED").length;

      const eligibleTotal = presentCount + lateCount + absentCount;
      const overallRate = eligibleTotal > 0 ? Math.round(((presentCount + lateCount) / eligibleTotal) * 1000) / 10 : null;

      // Calculate per-subject breakdown without double counting
      const subjectMap = new Map<string, {
        subjectId: string;
        subjectCode: string;
        subjectTitle: string;
        conductedSessions: number;
        presentCount: number;
        lateCount: number;
        absentCount: number;
        excusedCount: number;
      }>();

      const conductedSessions = await prisma.attendanceSession.findMany({
        where: whereSession,
        select: { id: true, subjectId: true, subject: { select: { code: true, title: true } } },
      });

      for (const cs of conductedSessions) {
        if (!subjectMap.has(cs.subjectId)) {
          subjectMap.set(cs.subjectId, {
            subjectId: cs.subjectId,
            subjectCode: cs.subject.code,
            subjectTitle: cs.subject.title,
            conductedSessions: 0,
            presentCount: 0,
            lateCount: 0,
            absentCount: 0,
            excusedCount: 0,
          });
        }
        subjectMap.get(cs.subjectId)!.conductedSessions += 1;
      }

      for (const r of records) {
        const subId = r.session.subjectId;
        if (!subjectMap.has(subId)) {
          subjectMap.set(subId, {
            subjectId: subId,
            subjectCode: r.session.subject.code,
            subjectTitle: r.session.subject.title,
            conductedSessions: 0,
            presentCount: 0,
            lateCount: 0,
            absentCount: 0,
            excusedCount: 0,
          });
        }
        const sEntry = subjectMap.get(subId)!;
        if (r.status === "PRESENT") sEntry.presentCount += 1;
        else if (r.status === "LATE") sEntry.lateCount += 1;
        else if (r.status === "ABSENT") sEntry.absentCount += 1;
        else if (r.status === "EXCUSED") sEntry.excusedCount += 1;
      }

      const subjectBreakdown = Array.from(subjectMap.values()).map((sub) => {
        const subEligible = sub.presentCount + sub.lateCount + sub.absentCount;
        return {
          ...sub,
          eligibleTotal: subEligible,
          attendanceRate: subEligible > 0 ? Math.round(((sub.presentCount + sub.lateCount) / subEligible) * 1000) / 10 : null,
        };
      });

      return {
        success: true,
        data: {
          totalConductedSessions,
          totalRecords,
          presentCount,
          lateCount,
          absentCount,
          excusedCount,
          eligibleTotal,
          hasRecordedSessions: eligibleTotal > 0,
          attendanceRate: overallRate,
          subjectBreakdown,
          formula: "Rate = (Present [1.0] + Late [1.0]) / (Present + Late + Absent) * 100",
          policyRules: {
            presentCredit: 1.0,
            lateCredit: 1.0, // Provisional: full credit
            excusedContribution: "Excluded from both numerator and denominator",
            cancelledSessions: "Excluded from all calculations",
            missingFutureSessions: "Excluded; never counted as unexcused absences",
            incompleteRosters: "Only enrolled students with recorded entries in conducted sessions contribute to calculation",
          },
          notes: "Cancelled sessions are excluded from calculations. Missing/unrecorded classes are not counted as student absences.",
        },
      };
    } catch (err: unknown) {
      return {
        success: false,
        error: `Failed to generate attendance summary: ${err instanceof Error ? err.message : String(err)}`,
        code: "SUMMARY_CALC_ERROR",
      };
    }
  }
}
