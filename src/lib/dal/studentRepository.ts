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
  phone?: string;
  email?: string;
  gender?: string;
  bloodGroup?: string;
  status?: string;
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
      const student = await prisma.student.findUnique({
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
        return { success: false, error: "Student not found", code: "NOT_FOUND" };
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
      const existing = await prisma.student.findFirst({
        where: {
          OR: [{ rollNumber: dto.rollNumber }, { prn: dto.prn }, { email: dto.email }],
        },
      });

      if (existing) {
        if (existing.rollNumber === dto.rollNumber) {
          return { success: false, error: `Roll number ${dto.rollNumber} is already registered.`, code: "DUPLICATE_ROLL" };
        }
        if (existing.prn === dto.prn) {
          return { success: false, error: `PRN ${dto.prn} is already registered.`, code: "DUPLICATE_PRN" };
        }
        if (existing.email === dto.email) {
          return { success: false, error: `Email ${dto.email} is already registered.`, code: "DUPLICATE_EMAIL" };
        }
      }

      const result = await prisma.$transaction(async (tx) => {
        const student = await tx.student.create({
          data: {
            rollNumber: dto.rollNumber,
            prn: dto.prn,
            fullName: dto.fullName,
            email: dto.email,
            phone: dto.phone,
            dob: dto.dob,
            gender: dto.gender,
            bloodGroup: dto.bloodGroup,
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
   * Updates student details.
   */
  static async updateStudent(id: string, data: UpdateStudentDTO): Promise<Result<Student>> {
    try {
      const updated = await prisma.student.update({
        where: { id },
        data,
      });
      return { success: true, data: updated };
    } catch (error: unknown) {
      const message = error instanceof Error ? error.message : "Failed to update student";
      return { success: false, error: message };
    }
  }

  /**
   * Deletes a student and associated enrolments in a transaction.
   */
  static async deleteStudent(id: string): Promise<Result<boolean>> {
    try {
      await prisma.$transaction(async (tx) => {
        await tx.enrolment.deleteMany({ where: { studentId: id } });
        await tx.student.delete({ where: { id } });
      });
      return { success: true, data: true };
    } catch (error: unknown) {
      const message = error instanceof Error ? error.message : "Failed to delete student";
      return { success: false, error: message };
    }
  }
}
