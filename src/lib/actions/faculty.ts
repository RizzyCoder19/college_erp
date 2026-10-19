"use server";

import { FacultyRepository, CreateStaffDTO, UpdateStaffDTO, StaffFilterParams, StaffWithRelations } from "@/lib/dal/facultyRepository";
import { requirePermission } from "@/lib/auth/guards";
import { Result } from "@/lib/dal/types";

export async function getStaffAction(params?: StaffFilterParams) {
  const guard = await requirePermission("READ_FACULTY");
  if (!guard.success) return guard as Result<never>;
  return FacultyRepository.getStaff(params);
}

export async function getStaffByIdAction(id: string) {
  const guard = await requirePermission("READ_FACULTY");
  if (!guard.success) return guard as Result<never>;
  return FacultyRepository.getStaffById(id);
}

export async function createStaffAction(dto: CreateStaffDTO) {
  const guard = await requirePermission("WRITE_FACULTY");
  if (!guard.success) return guard as Result<never>;
  return FacultyRepository.createStaff(dto);
}

export async function updateStaffAction(id: string, data: UpdateStaffDTO): Promise<Result<StaffWithRelations>> {
  const guard = await requirePermission("WRITE_FACULTY");
  if (!guard.success) return guard as Result<never>;
  return FacultyRepository.updateStaff(id, data);
}

export async function assignTeachingSubjectAction(
  staffId: string,
  subjectId: string,
  divisionId: string,
  weeklyHours?: number
) {
  const guard = await requirePermission("WRITE_FACULTY");
  if (!guard.success) return guard as Result<never>;
  return FacultyRepository.assignTeachingSubject(staffId, subjectId, divisionId, weeklyHours);
}

export async function deleteStaffAction(id: string) {
  const guard = await requirePermission("DELETE_FACULTY");
  if (!guard.success) return guard as Result<never>;
  return FacultyRepository.deleteStaff(id);
}
