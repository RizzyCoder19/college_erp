"use server";

import { requireAuth, requirePermission } from "@/lib/auth/guards";
import {
  ReportsRepository,
  ReportFilterOptions,
  ReportFilterParams,
  AttendanceSummaryItem,
  StudentAttendanceRegisterItem,
  ExamResultReportItem,
  FinanceCollectionReportData,
  DefaulterReportItem,
  ProgrammeEnrolmentReportItem,
} from "@/lib/dal/reportsRepository";
import { Result } from "@/lib/dal/types";

/**
 * Retrieves filter options for reports module.
 */
export async function getReportFilterOptionsAction(): Promise<Result<ReportFilterOptions>> {
  const guard = await requireAuth();
  if (!guard.success) return guard as Result<never>;
  return ReportsRepository.getFilterOptions();
}

/**
 * Attendance summary by cohort, subject, and division.
 */
export async function getAttendanceSummaryReportAction(
  filters: ReportFilterParams = {}
): Promise<Result<AttendanceSummaryItem[]>> {
  const guard = await requirePermission("VIEW_ATTENDANCE");
  if (!guard.success) return guard as Result<never>;
  return ReportsRepository.getAttendanceSummaryReport(filters);
}

/**
 * Student attendance register with 75% University of Mumbai eligibility status.
 */
export async function getStudentAttendanceRegisterAction(
  filters: ReportFilterParams = {}
): Promise<Result<StudentAttendanceRegisterItem[]>> {
  const guard = await requirePermission("VIEW_ATTENDANCE");
  if (!guard.success) return guard as Result<never>;
  return ReportsRepository.getStudentAttendanceRegister(filters);
}

/**
 * Examination marks and published results report.
 */
export async function getExamResultsReportAction(
  filters: ReportFilterParams = {}
): Promise<Result<ExamResultReportItem[]>> {
  const guard = await requirePermission("VIEW_RESULTS");
  if (!guard.success) return guard as Result<never>;
  return ReportsRepository.getExamResultsReport(filters);
}

/**
 * Fee collections and invoicing summary report with payment method distribution.
 */
export async function getFinanceCollectionReportAction(
  filters: ReportFilterParams = {}
): Promise<Result<FinanceCollectionReportData>> {
  const guard = await requirePermission("MANAGE_FEES");
  if (!guard.success) return guard as Result<never>;
  return ReportsRepository.getFinanceCollectionReport(filters);
}

/**
 * Outstanding dues and defaulter list.
 */
export async function getDefaultersReportAction(
  filters: ReportFilterParams = {}
): Promise<Result<DefaulterReportItem[]>> {
  const guard = await requirePermission("MANAGE_FEES");
  if (!guard.success) return guard as Result<never>;
  return ReportsRepository.getDefaultersReport(filters);
}

/**
 * Programme and enrolment demographic summary.
 */
export async function getProgrammeEnrolmentReportAction(): Promise<
  Result<ProgrammeEnrolmentReportItem[]>
> {
  const guard = await requirePermission("MANAGE_ACADEMICS");
  if (!guard.success) return guard as Result<never>;
  return ReportsRepository.getProgrammeEnrolmentReport();
}
