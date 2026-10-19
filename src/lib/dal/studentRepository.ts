import prisma from "@/lib/db";
import { Student, Enrolment, Prisma } from "@prisma/client";
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
   * Creates a student record and their initial academic enrolment in a single transaction.
   * Ensures atomic consistency: if enrolment fails, the student creation is completely rolled back.
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
        const student = await tx.student.create({
          data: {
            rollNumber: cleanRoll,
            prn: cleanPrn,
            fullName: dto.fullName.trim(),
            email: cleanEmail,
            phone: dto.phone.trim(),
            dob: dto.dob,
            gender: dto.gender || "MALE",
            bloodGroup: dto.bloodGroup || "B+",
            status: "ACTIVE",
            currentSemester: 1,
          },
        });

        const enrolment = await tx.enrolment.create({
          data: {
            studentId: student.id,
            academicYearId: dto.academicYearId,
            programmeId: dto.programmeId,
            semesterId: dto.semesterId,
            divisionId: dto.divisionId,
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
   * Updates student details and academic enrolment with conflict detection.
   * Resolves stable identities by ID or unique PRN/Email fallback.
   */
  static async updateStudent(id: string, data: UpdateStudentDTO): Promise<Result<StudentWithEnrolment>> {
    try {
      // 1. Resolve student by ID or fallback to stable unique identifiers
      let student = await prisma.student.findUnique({
        where: { id },
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

      // 3. Atomically update student record and their active enrolment
      const updated = await prisma.$transaction(async (tx) => {
        const studentUpdate: Prisma.StudentUpdateInput = {};
        if (data.fullName !== undefined) studentUpdate.fullName = data.fullName.trim();
        if (cleanPrn !== undefined) studentUpdate.prn = cleanPrn;
        if (cleanRoll !== undefined) studentUpdate.rollNumber = cleanRoll;
        if (data.phone !== undefined) studentUpdate.phone = data.phone.trim();
        if (cleanEmail !== undefined) studentUpdate.email = cleanEmail;
        if (data.dob !== undefined) studentUpdate.dob = data.dob;
        if (data.gender !== undefined) studentUpdate.gender = data.gender;
        if (data.bloodGroup !== undefined) studentUpdate.bloodGroup = data.bloodGroup;
        if (data.status !== undefined) studentUpdate.status = data.status.toUpperCase();

        // If academic placement changed, update latest enrolment
        if (data.programmeId || data.semesterId || data.divisionId) {
          const latestEnrolment = await tx.enrolment.findFirst({
            where: { studentId: targetId },
            orderBy: { enrolledAt: "desc" },
          });

          if (latestEnrolment) {
            await tx.enrolment.update({
              where: { id: latestEnrolment.id },
              data: {
                programmeId: data.programmeId || latestEnrolment.programmeId,
                semesterId: data.semesterId || latestEnrolment.semesterId,
                divisionId: data.divisionId || latestEnrolment.divisionId,
                academicYearId: data.academicYearId || latestEnrolment.academicYearId,
              },
            });
          } else if (data.programmeId && data.semesterId && data.divisionId) {
            let ayId = data.academicYearId;
            if (!ayId) {
              const currentAy = await tx.academicYear.findFirst({ where: { isCurrent: true } });
              ayId = currentAy ? currentAy.id : (await tx.academicYear.findFirst())?.id;
            }
            if (ayId) {
              await tx.enrolment.create({
                data: {
                  studentId: targetId,
                  academicYearId: ayId,
                  programmeId: data.programmeId,
                  semesterId: data.semesterId,
                  divisionId: data.divisionId,
                  status: "ENROLLED",
                },
              });
            }
          }
        }

        if (data.semesterId) {
          const sem = await tx.semester.findUnique({ where: { id: data.semesterId } });
          if (sem) {
            studentUpdate.currentSemester = sem.semesterNumber;
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
