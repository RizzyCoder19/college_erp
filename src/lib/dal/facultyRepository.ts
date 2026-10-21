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
  qualification?: string;
  specialization?: string;
  officeLocation?: string;
  workloadHours?: number;
  employmentType?: string;
}

export interface UpdateStaffDTO {
  fullName?: string;
  employeeId?: string;
  phone?: string;
  email?: string;
  designation?: string;
  category?: string;
  departmentId?: string;
  status?: string;
  qualification?: string;
  specialization?: string;
  officeLocation?: string;
  workloadHours?: number;
  employmentType?: string;
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
    userAccount: true;
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
            userAccount: true,
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
      let staff = await prisma.staff.findUnique({
        where: { id },
        include: {
          department: true,
          userAccount: true,
          teachingAssignments: {
            include: {
              subject: true,
              division: true,
            },
          },
        },
      });

      if (!staff) {
        staff = await prisma.staff.findFirst({
          where: { employeeId: id },
          include: {
            department: true,
            userAccount: true,
            teachingAssignments: {
              include: {
                subject: true,
                division: true,
              },
            },
          },
        });
      }

      if (!staff) {
        return { success: false, error: "Staff member not found in institutional database", code: "NOT_FOUND" };
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
      const cleanEmpId = dto.employeeId.trim().toUpperCase();
      const cleanEmail = dto.email.trim().toLowerCase();

      const existing = await prisma.staff.findFirst({
        where: {
          OR: [{ employeeId: cleanEmpId }, { email: cleanEmail }],
        },
      });

      if (existing) {
        if (existing.employeeId === cleanEmpId) {
          return { success: false, error: `Employee ID ${cleanEmpId} is already registered.`, code: "DUPLICATE_EMPLOYEE_ID" };
        }
        if (existing.email.toLowerCase() === cleanEmail) {
          return { success: false, error: `Email ${cleanEmail} is already in use by another staff member.`, code: "DUPLICATE_EMAIL" };
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
          employeeId: cleanEmpId,
          fullName: dto.fullName.trim(),
          email: cleanEmail,
          phone: dto.phone.trim(),
          designation: dto.designation.trim(),
          category: dto.category,
          departmentId: dto.departmentId,
          dateOfJoining: dto.dateOfJoining,
          status: dto.status || "ACTIVE",
          qualification: dto.qualification?.trim() || null,
          specialization: dto.specialization?.trim() || null,
          officeLocation: dto.officeLocation?.trim() || null,
          workloadHours: dto.workloadHours !== undefined ? Number(dto.workloadHours) : null,
          employmentType: dto.employmentType?.trim() || null,
        },
      });

      return { success: true, data: staff };
    } catch (error: unknown) {
      const message = error instanceof Error ? error.message : "Failed to create staff member";
      return { success: false, error: message };
    }
  }

  /**
   * Assigns a teaching subject to a faculty member with relational integrity and compatibility verification.
   * Enforces that:
   * 1. Staff exists in institutional database.
   * 2. Subject exists in curriculum database.
   * 3. If divisionId is provided, the division belongs to the exact same semester as the subject.
   */
  static async assignTeachingSubject(
    staffId: string,
    subjectId: string,
    divisionId?: string | null,
    weeklyHours: number = 4
  ): Promise<Result<TeachingAssignment>> {
    try {
      // 1. Verify staff exists
      const staff = await prisma.staff.findUnique({ where: { id: staffId } });
      if (!staff) {
        return { success: false, error: "Staff member not found in database.", code: "STAFF_NOT_FOUND" };
      }

      // 2. Verify subject exists
      const subject = await prisma.subject.findUnique({
        where: { id: subjectId },
        include: { semester: { include: { programme: true } } },
      });
      if (!subject) {
        return { success: false, error: "Subject not found in curriculum database.", code: "SUBJECT_NOT_FOUND" };
      }

      // 3. Verify division compatibility
      const cleanDivisionId: string | null = divisionId || null;
      if (cleanDivisionId) {
        const division = await prisma.division.findUnique({
          where: { id: cleanDivisionId },
          include: { semester: true },
        });
        if (!division) {
          return { success: false, error: "Specified division not found in database.", code: "DIVISION_NOT_FOUND" };
        }
        if (division.semesterId !== subject.semesterId) {
          return {
            success: false,
            error: `Relational incompatibility: Division "${division.name}" belongs to Semester ${division.semester.semesterNumber}, whereas Subject "${subject.title}" (${subject.code}) belongs to Semester ${subject.semester.semesterNumber}.`,
            code: "SUBJECT_DIVISION_SEMESTER_MISMATCH",
          };
        }
      }

      const existing = await prisma.teachingAssignment.findFirst({
        where: {
          staffId,
          subjectId,
          divisionId: cleanDivisionId,
        },
      });

      let assignment: TeachingAssignment;
      if (existing) {
        assignment = await prisma.teachingAssignment.update({
          where: { id: existing.id },
          data: { weeklyHours },
        });
      } else {
        assignment = await prisma.teachingAssignment.create({
          data: {
            staffId,
            subjectId,
            divisionId: cleanDivisionId,
            weeklyHours,
          },
        });
      }

      return { success: true, data: assignment };
    } catch (error: unknown) {
      const message = error instanceof Error ? error.message : "Failed to assign teaching subject";
      return { success: false, error: message };
    }
  }

  /**
   * Removes a teaching assignment by ID.
   */
  static async removeTeachingAssignment(id: string): Promise<Result<boolean>> {
    try {
      const existing = await prisma.teachingAssignment.findUnique({ where: { id } });
      if (!existing) {
        return { success: false, error: "Teaching assignment not found.", code: "NOT_FOUND" };
      }
      await prisma.teachingAssignment.delete({ where: { id } });
      return { success: true, data: true };
    } catch (error: unknown) {
      const message = error instanceof Error ? error.message : "Failed to remove teaching assignment";
      return { success: false, error: message };
    }
  }

  /**
   * Updates staff details and department relation with uniqueness checks.
   */
  static async updateStaff(id: string, data: UpdateStaffDTO): Promise<Result<StaffWithRelations>> {
    try {
      let staff = await prisma.staff.findUnique({ where: { id } });
      if (!staff) {
        staff = await prisma.staff.findFirst({
          where: {
            OR: [
              { employeeId: id },
              data.employeeId ? { employeeId: data.employeeId.trim().toUpperCase() } : undefined,
              data.email ? { email: data.email.trim().toLowerCase() } : undefined,
            ].filter(Boolean) as Prisma.StaffWhereInput[],
          },
        });
      }

      if (!staff) {
        return { success: false, error: "Staff member record not found in database.", code: "NOT_FOUND" };
      }

      const targetId = staff.id;

      // Validate uniqueness
      const conflictConditions: Prisma.StaffWhereInput[] = [];
      const cleanEmpId = data.employeeId ? data.employeeId.trim().toUpperCase() : undefined;
      const cleanEmail = data.email ? data.email.trim().toLowerCase() : undefined;

      if (cleanEmpId && cleanEmpId !== staff.employeeId) {
        conflictConditions.push({ employeeId: cleanEmpId });
      }
      if (cleanEmail && cleanEmail !== staff.email.toLowerCase()) {
        conflictConditions.push({ email: cleanEmail });
      }

      if (conflictConditions.length > 0) {
        const conflict = await prisma.staff.findFirst({
          where: {
            id: { not: targetId },
            OR: conflictConditions,
          },
        });

        if (conflict) {
          if (cleanEmpId && conflict.employeeId === cleanEmpId) {
            return {
              success: false,
              error: `Employee ID "${cleanEmpId}" is already registered to "${conflict.fullName}".`,
              code: "DUPLICATE_EMPLOYEE_ID",
            };
          }
          if (cleanEmail && conflict.email.toLowerCase() === cleanEmail) {
            return {
              success: false,
              error: `Email address "${cleanEmail}" is already registered to "${conflict.fullName}".`,
              code: "DUPLICATE_EMAIL",
            };
          }
        }
      }

      if (data.departmentId) {
        const dept = await prisma.department.findUnique({ where: { id: data.departmentId } });
        if (!dept) {
          return { success: false, error: "Specified department does not exist.", code: "INVALID_DEPARTMENT" };
        }
      }

      const staffUpdate: Prisma.StaffUpdateInput = {};
      if (data.fullName !== undefined) staffUpdate.fullName = data.fullName.trim();
      if (cleanEmpId !== undefined) staffUpdate.employeeId = cleanEmpId;
      if (cleanEmail !== undefined) staffUpdate.email = cleanEmail;
      if (data.phone !== undefined) staffUpdate.phone = data.phone.trim();
      if (data.designation !== undefined) staffUpdate.designation = data.designation.trim();
      if (data.category !== undefined) staffUpdate.category = data.category;
      if (data.status !== undefined) staffUpdate.status = data.status.toUpperCase();
      if (data.departmentId !== undefined) {
        staffUpdate.department = { connect: { id: data.departmentId } };
      }
      if (data.qualification !== undefined) staffUpdate.qualification = data.qualification ? data.qualification.trim() : null;
      if (data.specialization !== undefined) staffUpdate.specialization = data.specialization ? data.specialization.trim() : null;
      if (data.officeLocation !== undefined) staffUpdate.officeLocation = data.officeLocation ? data.officeLocation.trim() : null;
      if (data.workloadHours !== undefined) staffUpdate.workloadHours = data.workloadHours !== null && !isNaN(Number(data.workloadHours)) ? Number(data.workloadHours) : null;
      if (data.employmentType !== undefined) staffUpdate.employmentType = data.employmentType ? data.employmentType.trim() : null;

      const updated = await prisma.staff.update({
        where: { id: targetId },
        data: staffUpdate,
        include: {
          department: true,
          userAccount: true,
          teachingAssignments: {
            include: {
              subject: true,
              division: true,
            },
          },
        },
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
      let staff = await prisma.staff.findUnique({ where: { id } });
      if (!staff) {
        staff = await prisma.staff.findFirst({ where: { employeeId: id } });
      }
      if (!staff) {
        return { success: false, error: "Staff member not found", code: "NOT_FOUND" };
      }

      const targetId = staff.id;

      await prisma.$transaction(async (tx) => {
        await tx.teachingAssignment.deleteMany({ where: { staffId: targetId } });
        await tx.staff.delete({ where: { id: targetId } });
      });
      return { success: true, data: true };
    } catch (error: unknown) {
      const message = error instanceof Error ? error.message : "Failed to delete staff member";
      return { success: false, error: message };
    }
  }
}
