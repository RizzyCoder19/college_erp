"use server";

import { FacultyRepository, CreateStaffDTO, UpdateStaffDTO, StaffFilterParams } from "@/lib/dal/facultyRepository";

export async function getStaffAction(params?: StaffFilterParams) {
  return FacultyRepository.getStaff(params);
}

export async function getStaffByIdAction(id: string) {
  return FacultyRepository.getStaffById(id);
}

export async function createStaffAction(dto: CreateStaffDTO) {
  return FacultyRepository.createStaff(dto);
}

export async function updateStaffAction(id: string, data: UpdateStaffDTO) {
  return FacultyRepository.updateStaff(id, data);
}

export async function assignTeachingSubjectAction(
  staffId: string,
  subjectId: string,
  divisionId: string,
  weeklyHours?: number
) {
  return FacultyRepository.assignTeachingSubject(staffId, subjectId, divisionId, weeklyHours);
}

export async function deleteStaffAction(id: string) {
  return FacultyRepository.deleteStaff(id);
}
