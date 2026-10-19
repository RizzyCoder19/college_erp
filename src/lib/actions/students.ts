"use server";

import { StudentRepository, CreateStudentDTO, UpdateStudentDTO, StudentFilterParams } from "@/lib/dal/studentRepository";

export async function getStudentsAction(params?: StudentFilterParams) {
  return StudentRepository.getStudents(params);
}

export async function getStudentByIdAction(id: string) {
  return StudentRepository.getStudentById(id);
}

export async function createStudentAction(dto: CreateStudentDTO) {
  return StudentRepository.createStudentWithEnrolment(dto);
}

export async function updateStudentAction(id: string, data: UpdateStudentDTO) {
  return StudentRepository.updateStudent(id, data);
}

export async function deleteStudentAction(id: string) {
  return StudentRepository.deleteStudent(id);
}
