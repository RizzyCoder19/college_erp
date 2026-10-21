import prisma from "@/lib/db";
import { Prisma, Division } from "@prisma/client";
import { Result } from "./types";


export interface CreateDivisionDTO {
  semesterId: string;
  name: string;
  maxCapacity?: number;
}

export interface AcademicProgrammeDTO {
  id: string;
  code: string;
  name: string;
  degreeLevel: string;
  durationYears: number;
  departmentId: string;
  departmentName: string;
  semesterCount: number;
  divisionCount: number;
  subjectCount: number;
  enrolmentCount: number;
}

export type AcademicYearWithTerms = Prisma.AcademicYearGetPayload<{
  include: { terms: true };
}>;

export type DepartmentWithCounts = Prisma.DepartmentGetPayload<{
  include: {
    _count: {
      select: { programmes: true; staff: true };
    };
  };
}>;

export type ProgrammeDetails = Prisma.ProgrammeGetPayload<{
  include: {
    department: true;
    semesters: {
      include: {
        divisions: true;
        subjects: {
          include: {
            teachingAssignments: {
              include: {
                staff: true;
                division: true;
              };
            };
          };
        };
        enrolments: {
          include: {
            student: true;
            division: true;
          };
        };
      };
    };
    _count: {
      select: {
        enrolments: true;
      };
    };
  };
}>;

export type SubjectWithRelations = Prisma.SubjectGetPayload<{
  include: {
    semester: {
      include: { programme: true };
    };
  };
}>;

export class AcademicRepository {
  /**
   * Retrieves all academic years, ordered by start date descending.
   */
  static async getAcademicYears(): Promise<Result<AcademicYearWithTerms[]>> {
    try {
      const years = await prisma.academicYear.findMany({
        orderBy: { startDate: "desc" },
        include: { terms: true },
      });
      return { success: true, data: years };
    } catch (error: unknown) {
      const message = error instanceof Error ? error.message : "Failed to fetch academic years";
      return { success: false, error: message };
    }
  }

  /**
   * Retrieves the currently active academic year and terms.
   */
  static async getCurrentAcademicYear(): Promise<Result<AcademicYearWithTerms>> {
    try {
      const current = await prisma.academicYear.findFirst({
        where: { isCurrent: true },
        include: { terms: true },
      });
      if (!current) {
        return { success: false, error: "No active academic year configured" };
      }
      return { success: true, data: current };
    } catch (error: unknown) {
      const message = error instanceof Error ? error.message : "Failed to fetch active academic year";
      return { success: false, error: message };
    }
  }

  /**
   * Retrieves all departments with programme counts and staff counts.
   */
  static async getDepartments(): Promise<Result<DepartmentWithCounts[]>> {
    try {
      const departments = await prisma.department.findMany({
        orderBy: { name: "asc" },
        include: {
          _count: {
            select: { programmes: true, staff: true },
          },
        },
      });
      return { success: true, data: departments };
    } catch (error: unknown) {
      const message = error instanceof Error ? error.message : "Failed to fetch departments";
      return { success: false, error: message };
    }
  }

  /**
   * Retrieves all programmes with their department information.
   */
  static async getProgrammes(departmentId?: string): Promise<Result<AcademicProgrammeDTO[]>> {
    try {
      const programmes = await prisma.programme.findMany({
        where: departmentId ? { departmentId } : undefined,
        orderBy: { code: "asc" },
        include: {
          department: true,
          semesters: {
            include: {
              _count: {
                select: {
                  divisions: true,
                  subjects: true,
                  enrolments: true,
                },
              },
            },
          },
          _count: {
            select: {
              enrolments: true,
            },
          },
        },
      });

      const formatted: AcademicProgrammeDTO[] = programmes.map((p) => {
        const divisionCount = p.semesters.reduce((acc, s) => acc + s._count.divisions, 0);
        const subjectCount = p.semesters.reduce((acc, s) => acc + s._count.subjects, 0);
        return {
          id: p.id,
          code: p.code,
          name: p.name,
          degreeLevel: p.degreeLevel,
          durationYears: p.durationYears,
          departmentId: p.departmentId,
          departmentName: p.department.name,
          semesterCount: p.semesters.length,
          divisionCount,
          subjectCount,
          enrolmentCount: p._count.enrolments,
        };
      });

      return { success: true, data: formatted };
    } catch (error: unknown) {
      const message = error instanceof Error ? error.message : "Failed to fetch programmes";
      return { success: false, error: message };
    }
  }

  /**
   * Retrieves full details of a programme including semesters, divisions, and subjects.
   */
  static async getProgrammeDetails(programmeId: string): Promise<Result<ProgrammeDetails>> {
    try {
      const programme = await prisma.programme.findUnique({
        where: { id: programmeId },
        include: {
          department: true,
          semesters: {
            orderBy: { semesterNumber: "asc" },
            include: {
              divisions: true,
              subjects: {
                include: {
                  teachingAssignments: {
                    include: {
                      staff: true,
                      division: true,
                    },
                  },
                },
              },
              enrolments: {
                include: {
                  student: true,
                  division: true,
                },
              },
            },
          },
          _count: {
            select: {
              enrolments: true,
            },
          },
        },
      });

      if (!programme) {
        return { success: false, error: "Programme not found", code: "NOT_FOUND" };
      }

      return { success: true, data: programme };
    } catch (error: unknown) {
      const message = error instanceof Error ? error.message : "Failed to fetch programme details";
      return { success: false, error: message };
    }
  }

  /**
   * Retrieves subjects by semester or programme.
   */
  static async getSubjects(semesterId?: string): Promise<Result<SubjectWithRelations[]>> {
    try {
      const subjects = await prisma.subject.findMany({
        where: semesterId ? { semesterId } : undefined,
        orderBy: { code: "asc" },
        include: {
          semester: {
            include: { programme: true },
          },
        },
      });
      return { success: true, data: subjects };
    } catch (error: unknown) {
      const message = error instanceof Error ? error.message : "Failed to fetch subjects";
      return { success: false, error: message };
    }
  }
  /**
   * Creates a new academic division under a specified semester with validation.
   * Enforces:
   * 1. Target semester exists.
   * 2. Division name is valid.
   * 3. Max capacity is a positive integer (default 60, min 1, max 200).
   * 4. Uniqueness per semester (semesterId + name).
   */
  static async createDivision(dto: CreateDivisionDTO): Promise<Result<Division>> {
    try {
      const cleanName = dto.name.trim();
      if (!cleanName) {
        return { success: false, error: "Division name cannot be empty.", code: "INVALID_DIVISION_NAME" };
      }

      const capacity = dto.maxCapacity !== undefined ? Math.floor(Number(dto.maxCapacity)) : 60;
      if (isNaN(capacity) || capacity < 1 || capacity > 200) {
        return { success: false, error: "Division capacity must be between 1 and 200.", code: "INVALID_CAPACITY" };
      }

      // Check semester existence
      const semester = await prisma.semester.findUnique({
        where: { id: dto.semesterId },
        include: { programme: true },
      });
      if (!semester) {
        return { success: false, error: "Target semester record not found.", code: "SEMESTER_NOT_FOUND" };
      }

      // Check duplicate division name in same semester
      const existing = await prisma.division.findUnique({
        where: {
          semesterId_name: {
            semesterId: dto.semesterId,
            name: cleanName,
          },
        },
      });
      if (existing) {
        return {
          success: false,
          error: `Division "${cleanName}" already exists in Semester ${semester.semesterNumber} of ${semester.programme.name}.`,
          code: "DUPLICATE_DIVISION",
        };
      }

      const division = await prisma.division.create({
        data: {
          semesterId: dto.semesterId,
          name: cleanName,
          maxCapacity: capacity,
        },
      });

      return { success: true, data: division };
    } catch (error: unknown) {
      const message = error instanceof Error ? error.message : "Failed to create division";
      return { success: false, error: message };
    }
  }

  /**
   * Deletes an academic division if it has no associated enrolments or teaching assignments.
   */
  static async deleteDivision(divisionId: string): Promise<Result<boolean>> {
    try {
      const division = await prisma.division.findUnique({
        where: { id: divisionId },
        include: {
          _count: {
            select: { enrolments: true, teachingAssignments: true },
          },
        },
      });

      if (!division) {
        return { success: false, error: "Division not found.", code: "NOT_FOUND" };
      }

      if (division._count.enrolments > 0) {
        return {
          success: false,
          error: `Cannot delete division "${division.name}": ${division._count.enrolments} student enrolment(s) are actively placed in this cohort.`,
          code: "DIVISION_IN_USE",
        };
      }

      if (division._count.teachingAssignments > 0) {
        return {
          success: false,
          error: `Cannot delete division "${division.name}": Faculty teaching assignments are linked to this division.`,
          code: "DIVISION_IN_USE",
        };
      }

      await prisma.division.delete({ where: { id: divisionId } });
      return { success: true, data: true };
    } catch (error: unknown) {
      const message = error instanceof Error ? error.message : "Failed to delete division";
      return { success: false, error: message };
    }
  }
}
