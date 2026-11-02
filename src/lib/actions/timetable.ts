"use server";

import {
  TimetableRepository,
  CreateTimetableEntryDTO,
  UpdateTimetableEntryDTO,
  TimetableFilter,
} from "@/lib/dal/timetableRepository";
import { requireAuth, requirePermission } from "@/lib/auth/guards";
import { Result } from "@/lib/dal/types";

export async function getTimetableAction(filter: TimetableFilter = {}): Promise<Result<unknown[]>> {
  const guard = await requireAuth();
  if (!guard.success) return guard as Result<never>;
  return TimetableRepository.getTimetable(filter);
}

export async function createTimetableEntryAction(dto: CreateTimetableEntryDTO): Promise<Result<unknown>> {
  const guard = await requirePermission("MANAGE_ACADEMICS");
  if (!guard.success) return guard as Result<never>;
  return TimetableRepository.createTimetableEntry(dto);
}

export async function updateTimetableEntryAction(id: string, dto: UpdateTimetableEntryDTO): Promise<Result<unknown>> {
  const guard = await requirePermission("MANAGE_ACADEMICS");
  if (!guard.success) return guard as Result<never>;
  return TimetableRepository.updateTimetableEntry(id, dto);
}

export async function cancelTimetableEntryAction(id: string): Promise<Result<{ id: string; status: string }>> {
  const guard = await requirePermission("MANAGE_ACADEMICS");
  if (!guard.success) return guard as Result<never>;
  return TimetableRepository.cancelTimetableEntry(id);
}
