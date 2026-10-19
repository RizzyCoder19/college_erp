"use server";

import { StudentRepository, CreateStudentDTO, UpdateStudentDTO, StudentFilterParams, StudentWithEnrolment } from "@/lib/dal/studentRepository";
import { requirePermission } from "@/lib/auth/guards";
import { Result } from "@/lib/dal/types";

export async function getStudentsAction(params?: StudentFilterParams) {
  const guard = await requirePermission("READ_STUDENTS");
  if (!guard.success) return guard as Result<never>;
  return StudentRepository.getStudents(params);
}

export async function getStudentByIdAction(id: string) {
  const guard = await requirePermission("READ_STUDENTS");
  if (!guard.success) return guard as Result<never>;
  return StudentRepository.getStudentById(id);
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
