import prisma from "@/lib/db";
import { Student, Enrolment, Programme, Semester, Division, AcademicYear, Prisma } from "@prisma/client";
import { Result, PaginatedResult } from "./types";

export interface CreateStudentDTO {
  rollNumber: string;
  prn: string;
  fullName: string;
  email: string;
  phone: string;
  dob: Date;
  gender?: string;
  bloodGroup?: string;
  guardianName?: string;
  guardianRelationship?: string;
  guardianPhone?: string;
  attendanceRate?: number;
  mentorFaculty?: string;
  programmeId: string;
  semesterId: string;
  divisionId: string;
  academicYearId: string;
}

export interface UpdateStudentDTO {
  fullName?: string;
  prn?: string;
  rollNumber?: string;
  phone?: string;
  email?: string;
  dob?: Date;
  gender?: string;
  bloodGroup?: string;
  status?: string;
  guardianName?: string;
  guardianRelationship?: string;
  guardianPhone?: string;
  attendanceRate?: number;
  mentorFaculty?: string;
  programmeId?: string;
  semesterId?: string;
  divisionId?: string;
  academicYearId?: string;
}

export interface StudentFilterParams {
  search?: string;
  programmeId?: string;
  status?: string;
  page?: number;
  pageSize?: number;
}

export type StudentWithEnrolment = Prisma.StudentGetPayload<{
  include: {
    enrolments: {
      include: {
        academicYear: true;
        programme: true;
        semester: true;
        division: true;
      };
    };
  };
}>;

export interface StudentCreationResult {
  student: Student;
  enrolment: Enrolment;
}

export interface EnrolmentPlacementValidationParams {
  programmeId: string;
  semesterId: string;
  divisionId: string;
  academicYearId?: string;
}

export interface ValidatedEnrolmentEntities {
  academicYear: AcademicYear;
  programme: Programme;
  semester: Semester;
  division: Division;
}

/**
 * Shared server-side validator for academic placement hierarchy.
 * Enforces relational integrity across AcademicYear, Programme, Semester, and Division:
 * 1. Programme exists in institutional database.
 * 2. Semester exists and strictly belongs to the selected programme (semester.programmeId === programme.id).
 * 3. Division exists and strictly belongs to the selected semester (division.semesterId === semester.id).
 * 4. Academic year exists and is verified.
 */
export async function validateEnrolmentPlacement(
  params: EnrolmentPlacementValidationParams,
  client: Prisma.TransactionClient | typeof prisma = prisma
): Promise<Result<ValidatedEnrolmentEntities>> {
  // 1. Validate Programme
  if (!params.programmeId) {
    return { success: false, error: "Programme ID is required for academic placement.", code: "INVALID_PROGRAMME" };
  }
  const programme = await client.programme.findUnique({
    where: { id: params.programmeId },
  });
  if (!programme) {
    return {
      success: false,
      error: `Selected programme (ID: ${params.programmeId}) does not exist in institutional database.`,
      code: "PROGRAMME_NOT_FOUND",
    };
  }

  // 2. Validate Semester
  if (!params.semesterId) {
    return { success: false, error: "Semester ID is required for academic placement.", code: "INVALID_SEMESTER" };
  }
  const semester = await client.semester.findUnique({
    where: { id: params.semesterId },
  });
  if (!semester) {
    return {
      success: false,
      error: `Selected semester (ID: ${params.semesterId}) does not exist in institutional database.`,
      code: "SEMESTER_NOT_FOUND",
    };
  }
  if (semester.programmeId !== programme.id) {
    return {
      success: false,
      error: `Semester ${semester.semesterNumber} does not belong to programme "${programme.name}" (${programme.code}).`,
      code: "SEMESTER_PROGRAMME_MISMATCH",
    };
  }

  // 3. Validate Division
  if (!params.divisionId) {
    return { success: false, error: "Division ID is required for academic placement.", code: "INVALID_DIVISION" };
  }
  const division = await client.division.findUnique({
    where: { id: params.divisionId },
  });
  if (!division) {
    return {
      success: false,
      error: `Selected division (ID: ${params.divisionId}) does not exist in institutional database.`,
      code: "DIVISION_NOT_FOUND",
    };
  }
  if (division.semesterId !== semester.id) {
    return {
      success: false,
      error: `Division "${division.name}" belongs to a different semester and cannot be assigned to Semester ${semester.semesterNumber}.`,
      code: "DIVISION_SEMESTER_MISMATCH",
    };
  }

  // 4. Validate Academic Year
  let academicYear: AcademicYear | null = null;
  if (params.academicYearId) {
    academicYear = await client.academicYear.findUnique({
      where: { id: params.academicYearId },
    });
    if (!academicYear) {
      return {
        success: false,
        error: `Specified academic year (ID: ${params.academicYearId}) does not exist in institutional database.`,
        code: "ACADEMIC_YEAR_NOT_FOUND",
      };
    }
  } else {
    academicYear = await client.academicYear.findFirst({
      where: { isCurrent: true },
    });
    if (!academicYear) {
      academicYear = await client.academicYear.findFirst({
        orderBy: { startDate: "desc" },
      });
    }
    if (!academicYear) {
      return {
        success: false,
        error: "No active academic year configured in institutional database.",
        code: "ACADEMIC_YEAR_NOT_FOUND",
      };
    }
  }

  return {
    success: true,
    data: {
      academicYear,
      programme,
      semester,
      division,
    },
  };
}

export class StudentRepository {
  /**
   * Retrieves paginated students with active enrolments, programme, and division details.
   */
  static async getStudents(params: StudentFilterParams = {}): Promise<Result<PaginatedResult<StudentWithEnrolment>>> {
    try {
      const page = Math.max(1, params.page || 1);
      const pageSize = Math.max(1, Math.min(100, params.pageSize || 20));
      const skip = (page - 1) * pageSize;

      const where: Prisma.StudentWhereInput = {};

      if (params.status && params.status !== "all") {
        where.status = params.status;
      }

      if (params.programmeId && params.programmeId !== "all") {
        where.enrolments = {
          some: { programmeId: params.programmeId },
        };
      }

      if (params.search && params.search.trim()) {
        const q = params.search.trim();
        where.OR = [
          { fullName: { contains: q } },
          { rollNumber: { contains: q } },
          { prn: { contains: q } },
          { email: { contains: q } },
        ];
      }

      const [total, items] = await Promise.all([
        prisma.student.count({ where }),
        prisma.student.findMany({
          where,
          skip,
          take: pageSize,
          orderBy: { rollNumber: "asc" },
          include: {
            enrolments: {
              include: {
                academicYear: true,
                programme: true,
                semester: true,
                division: true,
              },
              orderBy: { enrolledAt: "desc" },
            },
          },
        }),
      ]);

      return {
        success: true,
        data: {
          items,
          total,
          page,
          pageSize,
          totalPages: Math.ceil(total / pageSize),
        },
      };
    } catch (error: unknown) {
      const message = error instanceof Error ? error.message : "Failed to fetch students";
      return { success: false, error: message };
    }
  }

  /**
   * Retrieves single student by ID with complete enrolment history.
   */
  static async getStudentById(id: string): Promise<Result<StudentWithEnrolment>> {
    try {
      let student = await prisma.student.findUnique({
        where: { id },
        include: {
          enrolments: {
            include: {
              academicYear: true,
              programme: true,
              semester: true,
              division: true,
            },
            orderBy: { enrolledAt: "desc" },
          },
        },
      });

      if (!student) {
        student = await prisma.student.findFirst({
          where: {
            OR: [{ prn: id }, { rollNumber: id }],
          },
          include: {
            enrolments: {
              include: {
                academicYear: true,
                programme: true,
                semester: true,
                division: true,
              },
              orderBy: { enrolledAt: "desc" },
            },
          },
        });
      }

      if (!student) {
        return { success: false, error: "Student not found in institutional database", code: "NOT_FOUND" };
      }

      return { success: true, data: student };
    } catch (error: unknown) {
      const message = error instanceof Error ? error.message : "Failed to fetch student";
      return { success: false, error: message };
    }
  }

  /**
   * Creates a student record and their initial academic enrolment in a single atomic transaction.
   * Enforces server-side enrolment hierarchy validation before committing.
   */
  static async createStudentWithEnrolment(dto: CreateStudentDTO): Promise<Result<StudentCreationResult>> {
    try {
      const cleanPrn = dto.prn.trim().toUpperCase();
      const cleanEmail = dto.email.trim().toLowerCase();
      const cleanRoll = dto.rollNumber.trim();

      const existing = await prisma.student.findFirst({
        where: {
          OR: [{ rollNumber: cleanRoll }, { prn: cleanPrn }, { email: cleanEmail }],
        },
      });

      if (existing) {
        if (existing.rollNumber === cleanRoll) {
          return { success: false, error: `Roll number ${cleanRoll} is already registered.`, code: "DUPLICATE_ROLL" };
        }
        if (existing.prn === cleanPrn) {
          return { success: false, error: `PRN ${cleanPrn} is already registered.`, code: "DUPLICATE_PRN" };
        }
        if (existing.email.toLowerCase() === cleanEmail) {
          return { success: false, error: `Email ${cleanEmail} is already registered.`, code: "DUPLICATE_EMAIL" };
        }
      }

      const result = await prisma.$transaction(async (tx) => {
        // Workstream A: Server-side validation of enrolment hierarchy
        const validation = await validateEnrolmentPlacement(
          {
            programmeId: dto.programmeId,
            semesterId: dto.semesterId,
            divisionId: dto.divisionId,
            academicYearId: dto.academicYearId,
          },
          tx
        );

        if (!validation.success || !validation.data) {
          throw new Error(validation.error || "Enrolment hierarchy validation failed.");
        }

        const { academicYear, programme, semester, division } = validation.data;

        const student = await tx.student.create({
          data: {
            rollNumber: cleanRoll,
            prn: cleanPrn,
            fullName: dto.fullName.trim(),
            email: cleanEmail,
            phone: dto.phone.trim(),
            dob: dto.dob,
            gender: dto.gender || null,
            bloodGroup: dto.bloodGroup?.trim() || null,
            status: "ACTIVE",
            currentSemester: semester.semesterNumber || 1,
            guardianName: dto.guardianName?.trim() || null,
            guardianRelationship: dto.guardianRelationship?.trim() || null,
            guardianPhone: dto.guardianPhone?.trim() || null,
            attendanceRate: dto.attendanceRate !== undefined ? Number(dto.attendanceRate) : null,
            mentorFaculty: dto.mentorFaculty?.trim() || null,
          },
        });

        const enrolment = await tx.enrolment.create({
          data: {
            studentId: student.id,
            academicYearId: academicYear.id,
            programmeId: programme.id,
            semesterId: semester.id,
            divisionId: division.id,
            status: "ENROLLED",
          },
        });

        return { student, enrolment };
      });

      return { success: true, data: result };
    } catch (error: unknown) {
      const message = error instanceof Error ? error.message : "Failed to create student and enrolment";
      return { success: false, error: message };
    }
  }

  /**
   * Updates student details and manages academic placement history.
   * - Preserves academic history when changing semesters/terms by archiving previous placements as COMPLETED.
   * - Allows in-place division corrections within the active semester without erasing history.
   * - Protects identity-only edits from touching enrolment records.
   * - Enforces server-side enrolment hierarchy validation for all placement transitions.
   */
  static async updateStudent(id: string, data: UpdateStudentDTO): Promise<Result<StudentWithEnrolment>> {
    try {
      // 1. Resolve student by ID or fallback to stable unique identifiers
      let student = await prisma.student.findUnique({
        where: { id },
        include: {
          enrolments: {
            include: {
              academicYear: true,
              programme: true,
              semester: true,
              division: true,
            },
            orderBy: { enrolledAt: "desc" },
          },
        },
      });

      if (!student) {
        student = await prisma.student.findFirst({
          where: {
            OR: [
              { prn: id },
              { rollNumber: id },
              data.prn ? { prn: data.prn.trim().toUpperCase() } : undefined,
              data.email ? { email: data.email.trim().toLowerCase() } : undefined,
            ].filter(Boolean) as Prisma.StudentWhereInput[],
          },
          include: {
            enrolments: {
              include: {
                academicYear: true,
                programme: true,
                semester: true,
                division: true,
              },
              orderBy: { enrolledAt: "desc" },
            },
          },
        });
      }

      if (!student) {
        return { success: false, error: "Student record not found in institutional database.", code: "NOT_FOUND" };
      }

      const targetId = student.id;

      // 2. Validate uniqueness constraints against other students
      const conflictConditions: Prisma.StudentWhereInput[] = [];
      const cleanPrn = data.prn ? data.prn.trim().toUpperCase() : undefined;
      const cleanEmail = data.email ? data.email.trim().toLowerCase() : undefined;
      const cleanRoll = data.rollNumber ? data.rollNumber.trim() : undefined;

      if (cleanPrn && cleanPrn !== student.prn) {
        conflictConditions.push({ prn: cleanPrn });
      }
      if (cleanEmail && cleanEmail !== student.email.toLowerCase()) {
        conflictConditions.push({ email: cleanEmail });
      }
      if (cleanRoll && cleanRoll !== student.rollNumber) {
        conflictConditions.push({ rollNumber: cleanRoll });
      }

      if (conflictConditions.length > 0) {
        const conflict = await prisma.student.findFirst({
          where: {
            id: { not: targetId },
            OR: conflictConditions,
          },
        });

        if (conflict) {
          if (cleanPrn && conflict.prn === cleanPrn) {
            return {
              success: false,
              error: `PRN "${cleanPrn}" is already registered to student "${conflict.fullName}".`,
              code: "DUPLICATE_PRN",
            };
          }
          if (cleanEmail && conflict.email.toLowerCase() === cleanEmail) {
            return {
              success: false,
              error: `Email address "${cleanEmail}" is already in use by student "${conflict.fullName}".`,
              code: "DUPLICATE_EMAIL",
            };
          }
          if (cleanRoll && conflict.rollNumber === cleanRoll) {
            return {
              success: false,
              error: `Roll number "${cleanRoll}" is already assigned to student "${conflict.fullName}".`,
              code: "DUPLICATE_ROLL",
            };
          }
        }
      }

      // 3. Atomically update student record and manage academic history inside a transaction
      const updated = await prisma.$transaction(async (tx) => {
        const studentUpdate: Prisma.StudentUpdateInput = {};
        if (data.fullName !== undefined) studentUpdate.fullName = data.fullName.trim();
        if (cleanPrn !== undefined) studentUpdate.prn = cleanPrn;
        if (cleanRoll !== undefined) studentUpdate.rollNumber = cleanRoll;
        if (data.phone !== undefined) studentUpdate.phone = data.phone.trim();
        if (cleanEmail !== undefined) studentUpdate.email = cleanEmail;
        if (data.dob !== undefined) studentUpdate.dob = data.dob;
        if (data.gender !== undefined) studentUpdate.gender = data.gender;
        if (data.bloodGroup !== undefined) studentUpdate.bloodGroup = data.bloodGroup ? data.bloodGroup.trim() : null;
        if (data.status !== undefined) studentUpdate.status = data.status.toUpperCase();
        if (data.guardianName !== undefined) studentUpdate.guardianName = data.guardianName ? data.guardianName.trim() : null;
        if (data.guardianRelationship !== undefined) studentUpdate.guardianRelationship = data.guardianRelationship ? data.guardianRelationship.trim() : null;
        if (data.guardianPhone !== undefined) studentUpdate.guardianPhone = data.guardianPhone ? data.guardianPhone.trim() : null;
        if (data.attendanceRate !== undefined) studentUpdate.attendanceRate = data.attendanceRate !== null && !isNaN(Number(data.attendanceRate)) ? Number(data.attendanceRate) : null;
        if (data.mentorFaculty !== undefined) studentUpdate.mentorFaculty = data.mentorFaculty ? data.mentorFaculty.trim() : null;

        // Academic Placement Handling:
        // Distinguish Identity-Only updates vs In-Place Correction vs New Historical Placement
        const latestEnrolment = student.enrolments && student.enrolments.length > 0 ? student.enrolments[0] : null;

        const placementActuallyChanged =
          Boolean(data.programmeId && data.programmeId !== latestEnrolment?.programmeId) ||
          Boolean(data.semesterId && data.semesterId !== latestEnrolment?.semesterId) ||
          Boolean(data.divisionId && data.divisionId !== latestEnrolment?.divisionId);

        if (placementActuallyChanged) {
          const targetProgId = data.programmeId || latestEnrolment?.programmeId;
          const targetSemId = data.semesterId || latestEnrolment?.semesterId;
          const targetDivId = data.divisionId || latestEnrolment?.divisionId;
          const targetAyId = data.academicYearId || latestEnrolment?.academicYearId;

          if (!targetProgId || !targetSemId || !targetDivId) {
            throw new Error("Complete academic placement (programme, semester, and division) is required.");
          }

          // Workstream A: Server-side validation of hierarchy for changed placement
          const validation = await validateEnrolmentPlacement(
            {
              programmeId: targetProgId,
              semesterId: targetSemId,
              divisionId: targetDivId,
              academicYearId: targetAyId,
            },
            tx
          );

          if (!validation.success || !validation.data) {
            throw new Error(validation.error || "Invalid academic placement hierarchy.");
          }

          const { academicYear, programme, semester, division } = validation.data;

          if (
            latestEnrolment &&
            latestEnrolment.programmeId === programme.id &&
            latestEnrolment.semesterId === semester.id &&
            latestEnrolment.academicYearId === academicYear.id &&
            latestEnrolment.divisionId !== division.id
          ) {
            // In-place division correction within the exact same semester & academic term
            await tx.enrolment.update({
              where: { id: latestEnrolment.id },
              data: { divisionId: division.id },
            });
          } else {
            // New Academic Placement (e.g. new semester or programme change):
            // Check if an enrolment already exists for (studentId, academicYearId, semesterId)
            const existingForTerm = await tx.enrolment.findUnique({
              where: {
                studentId_academicYearId_semesterId: {
                  studentId: targetId,
                  academicYearId: academicYear.id,
                  semesterId: semester.id,
                },
              },
            });

            if (existingForTerm) {
              // Reactivate / update that term's enrolment
              await tx.enrolment.update({
                where: { id: existingForTerm.id },
                data: {
                  programmeId: programme.id,
                  divisionId: division.id,
                  status: "ENROLLED",
                },
              });
            } else {
              // Mark prior active enrolments as COMPLETED to preserve history
              if (latestEnrolment && latestEnrolment.status === "ENROLLED") {
                await tx.enrolment.update({
                  where: { id: latestEnrolment.id },
                  data: { status: "COMPLETED" },
                });
              }

              // Create a brand new enrolment record for the new academic placement
              await tx.enrolment.create({
                data: {
                  studentId: targetId,
                  academicYearId: academicYear.id,
                  programmeId: programme.id,
                  semesterId: semester.id,
                  divisionId: division.id,
                  status: "ENROLLED",
                  enrolledAt: new Date(),
                },
              });
            }

            studentUpdate.currentSemester = semester.semesterNumber;
          }
        }

        return tx.student.update({
          where: { id: targetId },
          data: studentUpdate,
          include: {
            enrolments: {
              include: {
                academicYear: true,
                programme: true,
                semester: true,
                division: true,
              },
              orderBy: { enrolledAt: "desc" },
            },
          },
        });
      });

      return { success: true, data: updated };
    } catch (error: unknown) {
      const message = error instanceof Error ? error.message : "Failed to update student record";
      return { success: false, error: message };
    }
  }

  /**
   * Diagnostic check for enrolment hierarchy consistency.
   * Identifies semester/programme mismatches and division/semester mismatches
   * without modifying any records.
   */
  static async diagnoseEnrolmentIntegrity(): Promise<Result<{
    totalEnrolmentsChecked: number;
    anomalyCount: number;
    anomalies: Array<{
      enrolmentId: string;
      studentRoll: string;
      studentPrn: string;
      programmeCode: string;
      semesterNumber: number;
      divisionName: string;
      issueType: "SEMESTER_PROGRAMME_MISMATCH" | "DIVISION_SEMESTER_MISMATCH" | "CONTRADICTORY_CURRENT_ENROLMENTS";
      description: string;
    }>;
  }>> {
    try {
      const enrolments = await prisma.enrolment.findMany({
        include: {
          student: true,
          programme: true,
          semester: true,
          division: true,
          academicYear: true,
        },
      });

      const anomalies: Array<{
        enrolmentId: string;
        studentRoll: string;
        studentPrn: string;
        programmeCode: string;
        semesterNumber: number;
        divisionName: string;
        issueType: "SEMESTER_PROGRAMME_MISMATCH" | "DIVISION_SEMESTER_MISMATCH" | "CONTRADICTORY_CURRENT_ENROLMENTS";
        description: string;
      }> = [];

      for (const e of enrolments) {
        if (e.semester.programmeId !== e.programmeId) {
          anomalies.push({
            enrolmentId: e.id,
            studentRoll: e.student.rollNumber,
            studentPrn: e.student.prn,
            programmeCode: e.programme.code,
            semesterNumber: e.semester.semesterNumber,
            divisionName: e.division.name,
            issueType: "SEMESTER_PROGRAMME_MISMATCH",
            description: `Semester belongs to a different programme than the registered programme.`,
          });
        }

        if (e.division.semesterId !== e.semesterId) {
          anomalies.push({
            enrolmentId: e.id,
            studentRoll: e.student.rollNumber,
            studentPrn: e.student.prn,
            programmeCode: e.programme.code,
            semesterNumber: e.semester.semesterNumber,
            divisionName: e.division.name,
            issueType: "DIVISION_SEMESTER_MISMATCH",
            description: `Division '${e.division.name}' belongs to a different semester than the enrolment record.`,
          });
        }
      }

      return {
        success: true,
        data: {
          totalEnrolmentsChecked: enrolments.length,
          anomalyCount: anomalies.length,
          anomalies,
        },
      };
    } catch (error: unknown) {
      const message = error instanceof Error ? error.message : "Failed to run enrolment diagnostics";
      return { success: false, error: message };
    }
  }

  /**
   * Deletes a student and associated enrolments in a transaction.
   */
  static async deleteStudent(id: string): Promise<Result<boolean>> {
    try {
      let student = await prisma.student.findUnique({ where: { id } });
      if (!student) {
        student = await prisma.student.findFirst({
          where: { OR: [{ prn: id }, { rollNumber: id }] },
        });
      }
      if (!student) {
        return { success: false, error: "Student not found", code: "NOT_FOUND" };
      }

      const targetId = student.id;

      await prisma.$transaction(async (tx) => {
        await tx.enrolment.deleteMany({ where: { studentId: targetId } });
        await tx.student.delete({ where: { id: targetId } });
      });
      return { success: true, data: true };
    } catch (error: unknown) {
      const message = error instanceof Error ? error.message : "Failed to delete student";
      return { success: false, error: message };
    }
  }
}

