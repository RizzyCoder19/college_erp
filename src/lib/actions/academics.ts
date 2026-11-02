"use server";

import { AcademicRepository } from "@/lib/dal/academicRepository";
import { requireAuth, requirePermission } from "@/lib/auth/guards";
import { Result } from "@/lib/dal/types";

export async function getAcademicYearsAction() {
  const guard = await requireAuth();
  if (!guard.success) return guard as Result<never>;
  return AcademicRepository.getAcademicYears();
}

export async function getCurrentAcademicYearAction() {
  const guard = await requireAuth();
  if (!guard.success) return guard as Result<never>;
  return AcademicRepository.getCurrentAcademicYear();
}

export async function getDepartmentsAction() {
  const guard = await requireAuth();
  if (!guard.success) return guard as Result<never>;
  return AcademicRepository.getDepartments();
}

export async function getProgrammesAction(departmentId?: string) {
  const guard = await requireAuth();
  if (!guard.success) return guard as Result<never>;
  return AcademicRepository.getProgrammes(departmentId);
}

export async function getProgrammeDetailsAction(programmeId: string) {
  const guard = await requireAuth();
  if (!guard.success) return guard as Result<never>;
  return AcademicRepository.getProgrammeDetails(programmeId);
}

export async function getSemestersAction(programmeId?: string) {
  const guard = await requireAuth();
  if (!guard.success) return guard as Result<never>;
  return AcademicRepository.getSemesters(programmeId);
}

export async function getSubjectsAction(semesterId?: string) {
  const guard = await requireAuth();
  if (!guard.success) return guard as Result<never>;
  return AcademicRepository.getSubjects(semesterId);
}

export async function createDivisionAction(semesterId: string, name: string, maxCapacity?: number) {
  const guard = await requirePermission("MANAGE_ACADEMICS");
  if (!guard.success) return guard as Result<never>;
  return AcademicRepository.createDivision({ semesterId, name, maxCapacity });
}

export async function deleteDivisionAction(divisionId: string) {
  const guard = await requirePermission("MANAGE_ACADEMICS");
  if (!guard.success) return guard as Result<never>;
  return AcademicRepository.deleteDivision(divisionId);
}
