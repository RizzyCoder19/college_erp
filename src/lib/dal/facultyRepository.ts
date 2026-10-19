import prisma from "@/lib/db";
import { Staff, TeachingAssignment, Prisma } from "@prisma/client";
import { Result, PaginatedResult } from "./types";

export interface CreateStaffDTO {
  employeeId: string;
  fullName: string;
  email: string;
  phone: string;
  designation: string;
  category: string;
  departmentId: string;
  dateOfJoining: Date;
  status?: string;
}

export interface UpdateStaffDTO {
  fullName?: string;
  phone?: string;
  email?: string;
  designation?: string;
  status?: string;
}

export interface StaffFilterParams {
  search?: string;
  departmentId?: string;
  category?: string;
  page?: number;
  pageSize?: number;
}

export type StaffWithRelations = Prisma.StaffGetPayload<{
  include: {
    department: true;
    teachingAssignments: {
      include: {
        subject: true;
        division: true;
      };
    };
  };
}>;

export class FacultyRepository {
  /**
   * Retrieves paginated staff records with department and teaching assignments.
   */
  static async getStaff(params: StaffFilterParams = {}): Promise<Result<PaginatedResult<StaffWithRelations>>> {
    try {
      const page = Math.max(1, params.page || 1);
      const pageSize = Math.max(1, Math.min(100, params.pageSize || 20));
      const skip = (page - 1) * pageSize;

      const where: Prisma.StaffWhereInput = {};

      if (params.category && params.category !== "all") {
        where.category = params.category;
      }

      if (params.departmentId && params.departmentId !== "all") {
        where.departmentId = params.departmentId;
      }

      if (params.search && params.search.trim()) {
        const q = params.search.trim();
        where.OR = [
          { fullName: { contains: q } },
          { employeeId: { contains: q } },
          { designation: { contains: q } },
          { email: { contains: q } },
        ];
      }

      const [total, items] = await Promise.all([
        prisma.staff.count({ where }),
        prisma.staff.findMany({
          where,
          skip,
          take: pageSize,
          orderBy: { employeeId: "asc" },
          include: {
            department: true,
            teachingAssignments: {
              include: {
                subject: true,
                division: true,
              },
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
      const message = error instanceof Error ? error.message : "Failed to fetch staff";
      return { success: false, error: message };
    }
  }

  /**
   * Retrieves single staff member by ID with teaching assignments and department info.
   */
  static async getStaffById(id: string): Promise<Result<StaffWithRelations>> {
    try {
      const staff = await prisma.staff.findUnique({
        where: { id },
        include: {
          department: true,
          teachingAssignments: {
            include: {
              subject: true,
              division: true,
            },
          },
        },
      });

      if (!staff) {
        return { success: false, error: "Staff member not found", code: "NOT_FOUND" };
      }

      return { success: true, data: staff };
    } catch (error: unknown) {
      const message = error instanceof Error ? error.message : "Failed to fetch staff member";
      return { success: false, error: message };
    }
  }

  /**
   * Creates a new staff member with uniqueness and foreign-key validation.
   */
  static async createStaff(dto: CreateStaffDTO): Promise<Result<Staff>> {
    try {
      const existing = await prisma.staff.findFirst({
        where: {
          OR: [{ employeeId: dto.employeeId }, { email: dto.email }],
        },
      });

      if (existing) {
        if (existing.employeeId === dto.employeeId) {
          return { success: false, error: `Employee ID ${dto.employeeId} is already registered.`, code: "DUPLICATE_EMPLOYEE_ID" };
        }
        if (existing.email === dto.email) {
          return { success: false, error: `Email ${dto.email} is already in use.`, code: "DUPLICATE_EMAIL" };
        }
      }

      const dept = await prisma.department.findUnique({
        where: { id: dto.departmentId },
      });
      if (!dept) {
        return { success: false, error: "Invalid department ID provided.", code: "INVALID_DEPARTMENT" };
      }

      const staff = await prisma.staff.create({
        data: {
          employeeId: dto.employeeId,
          fullName: dto.fullName,
          email: dto.email,
          phone: dto.phone,
          designation: dto.designation,
          category: dto.category,
          departmentId: dto.departmentId,
          dateOfJoining: dto.dateOfJoining,
          status: dto.status || "ACTIVE",
        },
      });

      return { success: true, data: staff };
    } catch (error: unknown) {
      const message = error instanceof Error ? error.message : "Failed to create staff member";
      return { success: false, error: message };
    }
  }

  /**
   * Assigns a teaching subject to a faculty member with atomic consistency.
   */
  static async assignTeachingSubject(
    staffId: string,
    subjectId: string,
    divisionId: string,
    weeklyHours: number = 4
  ): Promise<Result<TeachingAssignment>> {
    try {
      const assignment = await prisma.teachingAssignment.upsert({
        where: {
          staffId_subjectId_divisionId: {
            staffId,
            subjectId,
            divisionId,
          },
        },
        update: {
          weeklyHours,
        },
        create: {
          staffId,
          subjectId,
          divisionId,
          weeklyHours,
        },
      });

      return { success: true, data: assignment };
    } catch (error: unknown) {
      const message = error instanceof Error ? error.message : "Failed to assign teaching subject";
      return { success: false, error: message };
    }
  }

  /**
   * Updates staff details.
   */
  static async updateStaff(id: string, data: UpdateStaffDTO): Promise<Result<Staff>> {
    try {
      const updated = await prisma.staff.update({
        where: { id },
        data,
      });
      return { success: true, data: updated };
    } catch (error: unknown) {
      const message = error instanceof Error ? error.message : "Failed to update staff member";
      return { success: false, error: message };
    }
  }

  /**
   * Deletes a staff member after removing assignments.
   */
  static async deleteStaff(id: string): Promise<Result<boolean>> {
    try {
      await prisma.$transaction(async (tx) => {
        await tx.teachingAssignment.deleteMany({ where: { staffId: id } });
        await tx.staff.delete({ where: { id } });
      });
      return { success: true, data: true };
    } catch (error: unknown) {
      const message = error instanceof Error ? error.message : "Failed to delete staff member";
      return { success: false, error: message };
    }
  }
}
