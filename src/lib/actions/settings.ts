"use server";

import { requirePermission } from "@/lib/auth/guards";
import {
  SettingsRepository,
  AcademicYearItem,
  UserAccountAdminItem,
  AuditLogItem,
  SystemHealthAndBackupInfo,
} from "@/lib/dal/settingsRepository";
import { Result } from "@/lib/dal/types";

/**
 * Retrieves academic calendar and terms for administration.
 * Strictly restricted to SYSTEM_ADMIN via ADMIN_ALL permission.
 */
export async function getAcademicCalendarSettingsAction(): Promise<
  Result<AcademicYearItem[]>
> {
  const guard = await requirePermission("ADMIN_ALL");
  if (!guard.success) return guard as Result<never>;
  return SettingsRepository.getAcademicCalendarSettings();
}

/**
 * Retrieves user accounts and active session metrics.
 * Strictly restricted to SYSTEM_ADMIN via ADMIN_ALL permission.
 */
export async function getUserAccountsAdminAction(): Promise<
  Result<UserAccountAdminItem[]>
> {
  const guard = await requirePermission("ADMIN_ALL");
  if (!guard.success) return guard as Result<never>;
  return SettingsRepository.getUserAccountsAdmin();
}

/**
 * Retrieves system audit logs across finance, exams, attendance, and users.
 * Strictly restricted to SYSTEM_ADMIN via ADMIN_ALL permission.
 */
export async function getSystemAuditLogsAction(
  limit: number = 50
): Promise<Result<AuditLogItem[]>> {
  const guard = await requirePermission("ADMIN_ALL");
  if (!guard.success) return guard as Result<never>;
  return SettingsRepository.getSystemAuditLogs(limit);
}

/**
 * Retrieves database health telemetry, SQLite PRAGMA results, and backup snapshots.
 * Strictly restricted to SYSTEM_ADMIN via ADMIN_ALL permission.
 */
export async function getSystemHealthAndBackupsAction(): Promise<
  Result<SystemHealthAndBackupInfo>
> {
  const guard = await requirePermission("ADMIN_ALL");
  if (!guard.success) return guard as Result<never>;
  return SettingsRepository.getSystemHealthAndBackups();
}
