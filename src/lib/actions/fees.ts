"use server";

import {
  FeeRepository,
  CreateFeeStructureDTO,
  UpdateFeeStructureDTO,
  GenerateInvoiceDTO,
  RecordPaymentDTO,
  StudentFeeLedgerSummary,
  DefaulterItem,
  FeeStructureItem,
  StudentFeeInvoiceItem,
  PaymentReceiptResult,
  FeeStudentSearchResult,
  StructureEligibleStudent,
  ApplicableFeeStructureOption,
} from "@/lib/dal/feeRepository";
import { requireAuth, requirePermission } from "@/lib/auth/guards";
import { Result } from "@/lib/dal/types";

export type FeeStructureActionItem = FeeStructureItem;
export type {
  DefaulterItem,
  FeeStudentSearchResult,
  StructureEligibleStudent,
  ApplicableFeeStructureOption,
  UpdateFeeStructureDTO,
};

export interface FinanceOverviewResult {
  totalDemand: number;
  totalCollected: number;
  totalOutstanding: number;
  collectionRate: number;
  totalInvoices: number;
  totalReceipts: number;
  totalStructures: number;
}

export async function getFinanceOverviewAction(): Promise<Result<FinanceOverviewResult>> {
  const guard = await requirePermission("MANAGE_FEES");
  if (!guard.success) return guard as Result<never>;
  return FeeRepository.getFinanceOverview() as Promise<Result<FinanceOverviewResult>>;
}

export async function getFeeStructuresAction(
  academicYearId?: string,
  programmeId?: string
): Promise<Result<FeeStructureItem[]>> {
  const guard = await requirePermission("VIEW_FEES");
  if (!guard.success) return guard as Result<never>;
  return FeeRepository.getFeeStructures(academicYearId, programmeId) as Promise<Result<FeeStructureItem[]>>;
}

export async function createFeeStructureAction(dto: CreateFeeStructureDTO): Promise<Result<FeeStructureItem>> {
  const guard = await requirePermission("MANAGE_FEES");
  if (!guard.success) return guard as Result<never>;
  return FeeRepository.createFeeStructure(dto) as Promise<Result<FeeStructureItem>>;
}

export async function updateFeeStructureAction(
  id: string,
  dto: UpdateFeeStructureDTO
): Promise<Result<FeeStructureItem>> {
  const guard = await requirePermission("MANAGE_FEES");
  if (!guard.success) return guard as Result<never>;
  return FeeRepository.updateFeeStructure(id, dto);
}

export async function getStructureEligibleStudentsAction(
  structureId: string
): Promise<Result<{ structure: FeeStructureItem; eligibleStudents: StructureEligibleStudent[] }>> {
  const guard = await requirePermission("MANAGE_FEES");
  if (!guard.success) return guard as Result<never>;
  return FeeRepository.getStructureEligibleStudents(structureId);
}

export async function searchFeeStudentsAction(
  query: string
): Promise<Result<FeeStudentSearchResult[]>> {
  const guard = await requirePermission("COLLECT_FEES");
  if (!guard.success) return guard as Result<never>;
  return FeeRepository.searchStudentsForFees(query, 12);
}

export async function generateStudentInvoiceAction(
  dto: Omit<GenerateInvoiceDTO, "generatedById">
): Promise<Result<StudentFeeInvoiceItem>> {
  const guard = await requirePermission("MANAGE_FEES");
  if (!guard.success || !guard.data) return guard as Result<never>;
  return FeeRepository.generateStudentInvoice({
    ...dto,
    generatedById: guard.data.id,
  });
}

export async function generateBatchInvoicesAction(dto: {
  feeStructureId: string;
  dueDate: Date;
}): Promise<Result<{ generatedCount: number; skippedCount: number }>> {
  const guard = await requirePermission("MANAGE_FEES");
  if (!guard.success || !guard.data) return guard as Result<never>;
  return FeeRepository.generateBatchInvoices({
    ...dto,
    generatedById: guard.data.id,
  });
}

export async function recordFeePaymentAction(
  dto: Omit<RecordPaymentDTO, "collectedById">
): Promise<Result<PaymentReceiptResult>> {
  const guard = await requirePermission("COLLECT_FEES");
  if (!guard.success || !guard.data) return guard as Result<never>;
  return FeeRepository.recordFeePayment({
    ...dto,
    collectedById: guard.data.id,
  });
}

export async function getStudentFeeLedgerAction(
  studentId: string
): Promise<Result<StudentFeeLedgerSummary>> {
  const guard = await requireAuth();
  if (!guard.success || !guard.data) return guard as Result<never>;
  const user = guard.data;

  // Enforce record-level isolation:
  if (user.role === "FACULTY_MEMBER") {
    return {
      success: false,
      error: "Access denied. Faculty members do not hold fee administration authorization.",
      code: "FORBIDDEN",
    };
  }

  let targetStudentId = studentId;
  if (user.role === "STUDENT_VIEWER") {
    if (!user.studentId) {
      return {
        success: false,
        error: "Your user account is not linked to a student record.",
        code: "UNLINKED_STUDENT",
      };
    }
    if (studentId && studentId !== user.studentId) {
      return {
        success: false,
        error: "Access denied. You may only view your own student fee ledger.",
        code: "FORBIDDEN",
      };
    }
    targetStudentId = user.studentId;
  }

  return FeeRepository.getStudentFeeLedger(targetStudentId);
}

export async function getDefaulterListAction(filters?: {
  programmeId?: string;
}): Promise<Result<DefaulterItem[]>> {
  const guard = await requirePermission("MANAGE_FEES");
  if (!guard.success) return guard as Result<never>;
  return FeeRepository.getDefaulterList(filters);
}
