"use server";

import prisma from "@/lib/db";
import {
  StudentRepository,
  CreateStudentDTO,
  UpdateStudentDTO,
  StudentFilterParams,
  StudentWithEnrolment,
  StudentDossier360Data,
  validateEnrolmentPlacement,
  EnrolmentPlacementValidationParams,
  CohortProgressionPreviewData,
  ExecuteCohortProgressionParams,
  CohortProgressionResult,
} from "@/lib/dal/studentRepository";
import { requirePermission } from "@/lib/auth/guards";
import { Result } from "@/lib/dal/types";

export async function getStudentsAction(params?: StudentFilterParams) {
  const guard = await requirePermission("READ_STUDENTS");
  if (!guard.success || !guard.data) return guard as Result<never>;
  const user = guard.data;

  // Record-level authorization enforcement:
  // 1. STUDENT_VIEWER: Can only retrieve their own student record
  if (user.role === "STUDENT_VIEWER") {
    if (!user.studentId) {
      return {
        success: true,
        data: { items: [], total: 0, page: 1, pageSize: 20, totalPages: 0 },
      };
    }
    return StudentRepository.getStudents({
      ...params,
      allowedStudentIds: [user.studentId],
    });
  }

  // 2. FACULTY_MEMBER: Can only retrieve students in their assigned teaching cohorts (divisions)
  if (user.role === "FACULTY_MEMBER") {
    if (!user.staffId) {
      return {
        success: true,
        data: { items: [], total: 0, page: 1, pageSize: 20, totalPages: 0 },
      };
    }
    const assignments = await prisma.teachingAssignment.findMany({
      where: { staffId: user.staffId },
      select: { divisionId: true },
    });
    const assignedDivisionIds = assignments
      .map((a) => a.divisionId)
      .filter((id): id is string => Boolean(id));

    if (assignedDivisionIds.length === 0) {
      return {
        success: true,
        data: { items: [], total: 0, page: 1, pageSize: 20, totalPages: 0 },
      };
    }

    return StudentRepository.getStudents({
      ...params,
      allowedDivisionIds: assignedDivisionIds,
    });
  }

  // 3. ACADEMIC_ADMIN and SYSTEM_ADMIN: Full institutional access
  return StudentRepository.getStudents(params);
}

export async function getStudentByIdAction(id: string) {
  const guard = await requirePermission("READ_STUDENTS");
  if (!guard.success || !guard.data) return guard as Result<never>;
  const user = guard.data;

  // Record-level authorization enforcement:
  // 1. STUDENT_VIEWER: Can ONLY view their own dossier
  if (user.role === "STUDENT_VIEWER") {
    if (!user.studentId || user.studentId !== id) {
      return {
        success: false,
        error: "Access denied. You may only inspect your own student dossier.",
        code: "FORBIDDEN",
      };
    }
    return StudentRepository.getStudentById(id);
  }

  // 2. FACULTY_MEMBER: Can ONLY view students enrolled in assigned cohorts
  if (user.role === "FACULTY_MEMBER") {
    if (!user.staffId) {
      return {
        success: false,
        error: "Access denied. Faculty member profile is unlinked from staff master.",
        code: "FORBIDDEN",
      };
    }
    const assignments = await prisma.teachingAssignment.findMany({
      where: { staffId: user.staffId },
      select: { divisionId: true },
    });
    const assignedDivisionIds = assignments
      .map((a) => a.divisionId)
      .filter((d): d is string => Boolean(d));

    const studentEnrolment = await prisma.enrolment.findFirst({
      where: {
        studentId: id,
        divisionId: { in: assignedDivisionIds },
      },
    });

    if (!studentEnrolment) {
      return {
        success: false,
        error: "Access denied. Student is not enrolled in your assigned instructional cohorts.",
        code: "FORBIDDEN",
      };
    }
    return StudentRepository.getStudentById(id);
  }

  // 3. ACADEMIC_ADMIN and SYSTEM_ADMIN: Full institutional access
  return StudentRepository.getStudentById(id);
}

export async function getStudentDossierAction(id: string): Promise<Result<StudentDossier360Data>> {
  const guard = await requirePermission("READ_STUDENTS");
  if (!guard.success || !guard.data) return guard as Result<never>;
  const user = guard.data;

  // Resolve target student ID first (handles UUID, PRN, or rollNumber in URL)
  let student = await prisma.student.findUnique({
    where: { id },
    select: { id: true, prn: true, rollNumber: true },
  });
  if (!student) {
    student = await prisma.student.findFirst({
      where: {
        OR: [{ prn: id }, { rollNumber: id }],
      },
      select: { id: true, prn: true, rollNumber: true },
    });
  }

  if (!student) {
    return {
      success: false,
      error: `Student record '${id}' was not found in institutional database.`,
      code: "NOT_FOUND",
    };
  }

  const resolvedId = student.id;

  // Record-level authorization enforcement:
  // 1. STUDENT_VIEWER: Can ONLY view their own dossier
  if (user.role === "STUDENT_VIEWER") {
    if (!user.studentId || user.studentId !== resolvedId) {
      return {
        success: false,
        error: "Access denied. You may only inspect your own student dossier.",
        code: "FORBIDDEN",
      };
    }
    return StudentRepository.getStudentDossier360(resolvedId);
  }

  // 2. FACULTY_MEMBER: Can ONLY view students enrolled in assigned cohorts
  if (user.role === "FACULTY_MEMBER") {
    if (!user.staffId) {
      return {
        success: false,
        error: "Access denied. Faculty member profile is unlinked from staff master.",
        code: "FORBIDDEN",
      };
    }
    const assignments = await prisma.teachingAssignment.findMany({
      where: { staffId: user.staffId },
      select: { divisionId: true },
    });
    const assignedDivisionIds = assignments
      .map((a) => a.divisionId)
      .filter((d): d is string => Boolean(d));

    const studentEnrolment = await prisma.enrolment.findFirst({
      where: {
        studentId: resolvedId,
        divisionId: { in: assignedDivisionIds },
      },
    });

    if (!studentEnrolment) {
      return {
        success: false,
        error: "Access denied. Student is not enrolled in your assigned instructional cohorts.",
        code: "FORBIDDEN",
      };
    }
    return StudentRepository.getStudentDossier360(resolvedId);
  }

  // 3. ACADEMIC_ADMIN and SYSTEM_ADMIN: Full institutional access
  return StudentRepository.getStudentDossier360(resolvedId);
}


export async function createStudentAction(dto: CreateStudentDTO) {
  const guard = await requirePermission("WRITE_STUDENTS");
  if (!guard.success) return guard as Result<never>;
  return StudentRepository.createStudentWithEnrolment(dto);
}

export async function updateStudentAction(id: string, data: UpdateStudentDTO): Promise<Result<StudentWithEnrolment>> {
  const guard = await requirePermission("WRITE_STUDENTS");
  if (!guard.success) return guard as Result<never>;
  return StudentRepository.updateStudent(id, data);
}

export async function deleteStudentAction(id: string) {
  const guard = await requirePermission("DELETE_STUDENTS");
  if (!guard.success) return guard as Result<never>;
  return StudentRepository.deleteStudent(id);
}

export async function validateEnrolmentPlacementAction(params: EnrolmentPlacementValidationParams) {
  const guard = await requirePermission("READ_STUDENTS");
  if (!guard.success) return guard as Result<never>;
  return validateEnrolmentPlacement(params);
}

export async function diagnoseEnrolmentIntegrityAction() {
  const guard = await requirePermission("READ_STUDENTS");
  if (!guard.success) return guard as Result<never>;
  return StudentRepository.diagnoseEnrolmentIntegrity();
}

export async function previewCohortProgressionAction(params: {
  programmeId: string;
  semesterId: string;
  divisionId?: string;
  academicYearId: string;
}): Promise<Result<CohortProgressionPreviewData>> {
  const guard = await requirePermission("READ_STUDENTS");
  if (!guard.success || !guard.data) return guard as Result<never>;
  const user = guard.data;

  if (user.role !== "SYSTEM_ADMIN" && user.role !== "ACADEMIC_ADMIN") {
    return {
      success: false,
      error: "Access denied. Only institutional administrators may preview cohort progressions.",
      code: "FORBIDDEN",
    };
  }

  return StudentRepository.previewCohortProgression(params);
}

export async function executeCohortProgressionAction(
  params: ExecuteCohortProgressionParams
): Promise<Result<CohortProgressionResult>> {
  const guard = await requirePermission("WRITE_STUDENTS");
  if (!guard.success || !guard.data) return guard as Result<never>;
  const user = guard.data;

  if (user.role !== "SYSTEM_ADMIN" && user.role !== "ACADEMIC_ADMIN") {
    return {
      success: false,
      error: "Access denied. Only institutional administrators may execute cohort progressions.",
      code: "FORBIDDEN",
    };
  }

  return StudentRepository.executeCohortProgression(params);
}

export async function progressSingleStudentAction(params: {
  studentId: string;
  destinationAcademicYearId: string;
  destinationSemesterId: string;
  destinationDivisionId: string;
}): Promise<Result<StudentWithEnrolment>> {
  const guard = await requirePermission("WRITE_STUDENTS");
  if (!guard.success || !guard.data) return guard as Result<never>;
  const user = guard.data;

  if (user.role !== "SYSTEM_ADMIN" && user.role !== "ACADEMIC_ADMIN") {
    return {
      success: false,
      error: "Access denied. Only institutional administrators may progress student semesters.",
      code: "FORBIDDEN",
    };
  }

  return StudentRepository.progressSingleStudent(params);
}

