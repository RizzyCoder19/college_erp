import prisma from "@/lib/db";
import { Prisma } from "@prisma/client";
import { Result } from "./types";

export interface AcademicProgrammeDTO {
  id: string;
  code: string;
  name: string;
  degreeLevel: string;
  durationYears: number;
  departmentId: string;
  departmentName: string;
  semesterCount: number;
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
        subjects: true;
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
        orderBy: { name: "asc" },
        include: {
          department: true,
          semesters: true,
        },
      });

      const formatted: AcademicProgrammeDTO[] = programmes.map((p) => ({
        id: p.id,
        code: p.code,
        name: p.name,
        degreeLevel: p.degreeLevel,
        durationYears: p.durationYears,
        departmentId: p.departmentId,
        departmentName: p.department.name,
        semesterCount: p.semesters.length,
      }));

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
              subjects: true,
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
}
