"use server";

import { AcademicRepository } from "@/lib/dal/academicRepository";

export async function getAcademicYearsAction() {
  return AcademicRepository.getAcademicYears();
}

export async function getCurrentAcademicYearAction() {
  return AcademicRepository.getCurrentAcademicYear();
}

export async function getDepartmentsAction() {
  return AcademicRepository.getDepartments();
}

export async function getProgrammesAction(departmentId?: string) {
  return AcademicRepository.getProgrammes(departmentId);
}

export async function getProgrammeDetailsAction(programmeId: string) {
  return AcademicRepository.getProgrammeDetails(programmeId);
}

export async function getSubjectsAction(semesterId?: string) {
  return AcademicRepository.getSubjects(semesterId);
}
