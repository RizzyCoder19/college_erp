"use server";

import prisma from "@/lib/db";
import { requireAuth } from "@/lib/auth/guards";
import { Result } from "@/lib/dal/types";

export interface SearchStudentResult {
  id: string;
  fullName: string;
  rollNumber: string;
  prn: string;
  programmeName: string;
  semesterName: string;
  status: string;
}

export interface SearchFacultyResult {
  id: string;
  fullName: string;
  employeeId: string;
  designation: string;
  departmentName: string;
  status: string;
}

export interface SearchProgrammeResult {
  id: string;
  name: string;
  code: string;
  departmentName: string;
}

export interface UnifiedSearchResults {
  students: SearchStudentResult[];
  faculty: SearchFacultyResult[];
  programmes: SearchProgrammeResult[];
}

export async function unifiedGlobalSearchAction(
  query: string
): Promise<Result<UnifiedSearchResults>> {
  const guard = await requireAuth();
  if (!guard.success) {
    return { success: false, error: "Authentication required to search institutional records." };
  }

  const q = (query || "").trim();
  if (!q) {
    return {
      success: true,
      data: {
        students: [],
        faculty: [],
        programmes: [],
      },
    };
  }

  try {
    const [students, faculty, programmes] = await Promise.all([
      prisma.student.findMany({
        where: {
          OR: [
            { fullName: { contains: q } },
            { rollNumber: { contains: q } },
            { prn: { contains: q } },
            { email: { contains: q } },
          ],
        },
        take: 6,
        include: {
          enrolments: {
            include: {
              programme: true,
              semester: true,
            },
            take: 1,
            orderBy: { enrolledAt: "desc" },
          },
        },
        orderBy: { fullName: "asc" },
      }),
      prisma.staff.findMany({
        where: {
          OR: [
            { fullName: { contains: q } },
            { employeeId: { contains: q } },
            { designation: { contains: q } },
            { email: { contains: q } },
          ],
        },
        take: 6,
        include: {
          department: true,
        },
        orderBy: { fullName: "asc" },
      }),
      prisma.programme.findMany({
        where: {
          OR: [
            { name: { contains: q } },
            { code: { contains: q } },
          ],
        },
        take: 6,
        include: {
          department: true,
        },
        orderBy: { name: "asc" },
      }),
    ]);

    const formattedStudents: SearchStudentResult[] = students.map((s) => {
      const activeEnrolment = s.enrolments[0];
      const semNumber = activeEnrolment?.semester?.semesterNumber;
      return {
        id: s.id,
        fullName: s.fullName,
        rollNumber: s.rollNumber,
        prn: s.prn,
        programmeName: activeEnrolment?.programme?.name || "Unassigned Programme",
        semesterName: semNumber ? `Semester ${semNumber}` : "Semester 1",
        status: s.status,
      };
    });

    const formattedFaculty: SearchFacultyResult[] = faculty.map((f) => ({
      id: f.id,
      fullName: f.fullName,
      employeeId: f.employeeId,
      designation: f.designation,
      departmentName: f.department?.name || "General Department",
      status: f.status,
    }));

    const formattedProgrammes: SearchProgrammeResult[] = programmes.map((p) => ({
      id: p.id,
      name: p.name,
      code: p.code,
      departmentName: p.department?.name || "Academic Department",
    }));

    return {
      success: true,
      data: {
        students: formattedStudents,
        faculty: formattedFaculty,
        programmes: formattedProgrammes,
      },
    };
  } catch (error) {
    const message = error instanceof Error ? error.message : "Search query failed";
    return { success: false, error: message };
  }
}
