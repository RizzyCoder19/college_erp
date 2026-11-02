import prisma from "@/lib/db";
import { Prisma } from "@prisma/client";
import { Result } from "./types";

export interface CreateFeeHeadDTO {
  headName: string;
  amount: number;
  isOptional?: boolean;
}

export interface CreateFeeStructureDTO {
  academicYearId: string;
  programmeId: string;
  semesterNumber: number;
  name: string;
  feeHeads: CreateFeeHeadDTO[];
}

export interface GenerateInvoiceDTO {
  studentId: string;
  enrolmentId: string;
  feeStructureId: string;
  dueDate: Date;
  remarks?: string;
  generatedById?: string;
}

export interface RecordPaymentDTO {
  invoiceId: string;
  amountPaid: number;
  paymentMethod: "UPI" | "NEFT_RTGS" | "CHEQUE" | "CASH" | "CARD" | "DEMAND_DRAFT";
  transactionReference: string;
  payerName?: string;
  remarks?: string;
  collectedById: string;
}

export interface StudentFeeLedgerItem {
  invoiceId: string;
  invoiceNumber: string;
  structureId?: string;
  structureName: string;
  totalDemand: number;
  totalPaid: number;
  outstandingBalance: number;
  status: string;
  dueDate: Date;
  createdAt: Date;
  feeHeads: Array<{ headName: string; amount: number }>;
  receipts: Array<{
    id: string;
    receiptNumber: string;
    amountPaid: number;
    paymentDate: Date;
    paymentMethod: string;
    transactionReference: string;
    payerName?: string | null;
    collectedByName?: string | null;
    remarks?: string | null;
  }>;
}

export interface StudentFeeLedgerSummary {
  studentId: string;
  rollNumber: string;
  prn: string;
  fullName: string;
  programmeName: string;
  semesterNumber?: number;
  divisionName?: string;
  activeEnrolmentId?: string;
  totalDemand: number;
  totalPaid: number;
  outstandingBalance: number;
  feeClearanceStatus: "CLEARED" | "PARTIALLY_CLEARED" | "PENDING_DUES" | "NOT_INVOICED";
  invoices: StudentFeeLedgerItem[];
  applicableStructures?: ApplicableFeeStructureOption[];
}


export interface FeeStudentSearchResult {
  id: string;
  fullName: string;
  prn: string;
  rollNumber: string;
  email: string;
  programmeName: string;
  programmeCode: string;
  semesterNumber: number;
  divisionName: string;
  activeEnrolmentId?: string;
  feeClearanceStatus: "CLEARED" | "PARTIALLY_CLEARED" | "PENDING_DUES" | "NOT_INVOICED";
  totalDemand: number;
  totalPaid: number;
  outstandingBalance: number;
}

export interface ApplicableFeeStructureOption {
  id: string;
  name: string;
  totalAmount: number;
  semesterNumber: number;
  academicYearName: string;
  feeHeads: Array<{ headName: string; amount: number }>;
}

export interface UpdateFeeStructureDTO {
  name?: string;
  isActive?: boolean;
  feeHeads?: CreateFeeHeadDTO[];
}

export interface StructureEligibleStudent {
  studentId: string;
  enrolmentId: string;
  fullName: string;
  prn: string;
  rollNumber: string;
  divisionName: string;
  isInvoiced: boolean;
  invoiceId?: string;
  invoiceNumber?: string;
  totalDemand?: number;
  totalPaid?: number;
  outstandingBalance?: number;
  invoiceStatus?: string;
}

export interface DefaulterItem {
  studentId: string;
  rollNumber: string;
  prn: string;
  fullName: string;
  programmeCode: string;
  programmeName: string;
  semesterNumber: number;
  totalDemand: number;
  totalPaid: number;
  outstandingBalance: number;
  overdueSince?: Date;
  status: string;
}


export interface FeeStructureItem {
  id: string;
  name: string;
  programmeId?: string;
  academicYearId?: string;
  semesterNumber: number;
  totalAmount: number;
  isActive?: boolean;
  programme?: { name: string; code: string };
  academicYear?: { name: string; code: string };
  feeHeads?: Array<{ id: string; headName: string; amount: number; isOptional: boolean }>;
  _count?: { invoices: number };
}

export interface StudentFeeInvoiceItem {
  id: string;
  invoiceNumber: string;
  studentId: string;
  enrolmentId: string;
  feeStructureId: string;
  totalDemand: number;
  status: string;
  dueDate: Date;
  remarks?: string | null;
  feeStructure?: unknown;
  student?: unknown;
  enrolment?: unknown;
}

export interface PaymentReceiptResult {
  receipt: {
    id: string;
    receiptNumber: string;
    invoiceId: string;
    studentId: string;
    amountPaid: number;
    paymentMethod: string;
    transactionReference: string;
    paymentDate: Date;
    collectedById: string;
    payerName?: string | null;
    remarks?: string | null;
  };
  invoiceId: string;
  invoiceNumber: string;
  amountPaid: number;
  previousOutstanding: number;
  newOutstanding: number;
  invoiceStatus: string;
}

export class FeeRepository {
  /**
   * Creates a durable fee structure for a specific programme, academic year, and semester cohort.
   */

  /**
   * Fast, authoritative student search for cashier and ledger inspection.
   * Searches persisted Student records by fullName, PRN, rollNumber, or email.
   * Returns useful student identification with live fee clearance status.
   */
  static async searchStudentsForFees(
    query: string,
    limit = 10
  ): Promise<Result<FeeStudentSearchResult[]>> {
    try {
      const trimmed = query.trim();
      const where: Prisma.StudentWhereInput = trimmed
        ? {
            OR: [
              { fullName: { contains: trimmed } },
              { prn: { contains: trimmed } },
              { rollNumber: { contains: trimmed } },
              { email: { contains: trimmed } },
            ],
          }
        : {};

      const students = await prisma.student.findMany({
        where,
        take: Math.max(1, Math.min(25, limit)),
        orderBy: { fullName: "asc" },
        include: {
          enrolments: {
            include: {
              programme: true,
              semester: true,
              division: true,
            },
            orderBy: { enrolledAt: "desc" },
            take: 1,
          },
          feeInvoices: {
            include: {
              receipts: true,
            },
          },
        },
      });

      const results: FeeStudentSearchResult[] = students.map((s) => {
        const activeEnrolment = s.enrolments[0];
        let totalDemand = 0;
        let totalPaid = 0;

        for (const inv of s.feeInvoices) {
          totalDemand += inv.totalDemand;
          totalPaid += inv.receipts.reduce((sum, r) => sum + r.amountPaid, 0);
        }

        const outstandingBalance = Math.max(0, totalDemand - totalPaid);
        let feeClearanceStatus: "CLEARED" | "PARTIALLY_CLEARED" | "PENDING_DUES" | "NOT_INVOICED" = "NOT_INVOICED";

        if (s.feeInvoices.length === 0) {
          feeClearanceStatus = "NOT_INVOICED";
        } else if (outstandingBalance === 0 && totalDemand > 0) {
          feeClearanceStatus = "CLEARED";
        } else if (totalPaid > 0) {
          feeClearanceStatus = "PARTIALLY_CLEARED";
        } else {
          feeClearanceStatus = "PENDING_DUES";
        }

        return {
          id: s.id,
          fullName: s.fullName,
          prn: s.prn,
          rollNumber: s.rollNumber,
          email: s.email,
          programmeName: activeEnrolment?.programme?.name || "Unassigned",
          programmeCode: activeEnrolment?.programme?.code || "N/A",
          semesterNumber: activeEnrolment?.semester?.semesterNumber || 1,
          divisionName: activeEnrolment?.division?.name || "Unassigned",
          activeEnrolmentId: activeEnrolment?.id,
          feeClearanceStatus,
          totalDemand,
          totalPaid,
          outstandingBalance,
        };
      });

      return { success: true, data: results };
    } catch (err: unknown) {
      return {
        success: false,
        error: err instanceof Error ? err.message : "Failed to search students for fees.",
        code: "SEARCH_STUDENTS_ERROR",
      };
    }
  }

  /**
   * Updates an existing fee structure.
   * Preserves historical issued invoices by leaving existing invoice demands untouched.
   */
  static async updateFeeStructure(
    id: string,
    dto: UpdateFeeStructureDTO
  ): Promise<Result<FeeStructureItem>> {
    try {
      const existing = await prisma.feeStructure.findUnique({
        where: { id },
        include: { feeHeads: true },
      });
      if (!existing) {
        return { success: false, error: "Fee structure not found.", code: "NOT_FOUND" };
      }

      let newTotal = existing.totalAmount;
      if (dto.feeHeads && dto.feeHeads.length > 0) {
        for (const h of dto.feeHeads) {
          if (h.amount <= 0) {
            return { success: false, error: "Fee head amount must be greater than zero.", code: "INVALID_HEAD_AMOUNT" };
          }
        }
        newTotal = dto.feeHeads.reduce((s, h) => s + h.amount, 0);
      }

      const updated = await prisma.$transaction(async (tx) => {
        if (dto.feeHeads && dto.feeHeads.length > 0) {
          await tx.feeHead.deleteMany({ where: { feeStructureId: id } });
          await tx.feeHead.createMany({
            data: dto.feeHeads.map((h) => ({
              feeStructureId: id,
              headName: h.headName.trim(),
              amount: h.amount,
              isOptional: h.isOptional || false,
            })),
          });
        }

        return tx.feeStructure.update({
          where: { id },
          data: {
            ...(dto.name ? { name: dto.name.trim() } : {}),
            ...(typeof dto.isActive === "boolean" ? { isActive: dto.isActive } : {}),
            totalAmount: newTotal,
          },
          include: {
            feeHeads: true,
            programme: true,
            academicYear: true,
          },
        });
      });

      return { success: true, data: updated as FeeStructureItem };
    } catch (err: unknown) {
      return {
        success: false,
        error: err instanceof Error ? err.message : "Failed to update fee structure.",
        code: "UPDATE_STRUCTURE_ERROR",
      };
    }
  }

  /**
   * Retrieves all students eligible for a specific fee structure cohort.
   * Shows which students are already invoiced vs pending invoice.
   */
  static async getStructureEligibleStudents(
    structureId: string
  ): Promise<Result<{ structure: FeeStructureItem; eligibleStudents: StructureEligibleStudent[] }>> {
    try {
      const structure = await prisma.feeStructure.findUnique({
        where: { id: structureId },
        include: { feeHeads: true, programme: true, academicYear: true },
      });
      if (!structure) {
        return { success: false, error: "Fee structure not found.", code: "NOT_FOUND" };
      }

      const enrolments = await prisma.enrolment.findMany({
        where: {
          programmeId: structure.programmeId,
          semester: { semesterNumber: structure.semesterNumber },
          academicYearId: structure.academicYearId,
        },
        include: {
          student: {
            include: {
              feeInvoices: {
                where: { feeStructureId: structure.id },
                include: { receipts: true },
              },
            },
          },
          division: true,
        },
        orderBy: { student: { fullName: "asc" } },
      });

      const eligibleStudents: StructureEligibleStudent[] = enrolments.map((e) => {
        const inv = e.student.feeInvoices[0];
        const invPaid = inv ? inv.receipts.reduce((s, r) => s + r.amountPaid, 0) : 0;
        return {
          studentId: e.student.id,
          enrolmentId: e.id,
          fullName: e.student.fullName,
          prn: e.student.prn,
          rollNumber: e.student.rollNumber,
          divisionName: e.division?.name || "Unassigned",
          isInvoiced: !!inv,
          invoiceId: inv?.id,
          invoiceNumber: inv?.invoiceNumber,
          totalDemand: inv?.totalDemand,
          totalPaid: invPaid,
          outstandingBalance: inv ? inv.totalDemand - invPaid : undefined,
          invoiceStatus: inv?.status,
        };
      });

      return {
        success: true,
        data: {
          structure: structure as FeeStructureItem,
          eligibleStudents,
        },
      };
    } catch (err: unknown) {
      return {
        success: false,
        error: err instanceof Error ? err.message : "Failed to load eligible students.",
        code: "ELIGIBLE_STUDENTS_ERROR",
      };
    }
  }

  static async createFeeStructure(dto: CreateFeeStructureDTO): Promise<Result<FeeStructureItem>> {
    try {
      if (!dto.feeHeads || dto.feeHeads.length === 0) {
        return {
          success: false,
          error: "At least one fee head component is required to establish a fee structure.",
          code: "EMPTY_FEE_HEADS",
        };
      }

      // Check for negative or zero fee heads
      for (const head of dto.feeHeads) {
        if (head.amount <= 0) {
          return {
            success: false,
            error: `Fee head '${head.headName}' must specify a positive amount. Received: ${head.amount}`,
            code: "INVALID_HEAD_AMOUNT",
          };
        }
      }

      // Check existing structure collision
      const existing = await prisma.feeStructure.findUnique({
        where: {
          academicYearId_programmeId_semesterNumber: {
            academicYearId: dto.academicYearId,
            programmeId: dto.programmeId,
            semesterNumber: dto.semesterNumber,
          },
        },
      });

      if (existing) {
        return {
          success: false,
          error: `A fee structure already exists for this programme, semester ${dto.semesterNumber}, and academic year.`,
          code: "DUPLICATE_FEE_STRUCTURE",
        };
      }

      const totalAmount = dto.feeHeads.reduce((acc, h) => acc + h.amount, 0);

      const created = await prisma.feeStructure.create({
        data: {
          academicYearId: dto.academicYearId,
          programmeId: dto.programmeId,
          semesterNumber: dto.semesterNumber,
          name: dto.name.trim(),
          totalAmount,
          feeHeads: {
            create: dto.feeHeads.map((h) => ({
              headName: h.headName.trim(),
              amount: h.amount,
              isOptional: h.isOptional || false,
            })),
          },
        },
        include: {
          feeHeads: true,
          programme: true,
          academicYear: true,
        },
      });

      return { success: true, data: created };
    } catch (err: unknown) {
      return {
        success: false,
        error: err instanceof Error ? err.message : "Failed to create fee structure.",
        code: "CREATE_STRUCTURE_ERROR",
      };
    }
  }

  /**
   * Retrieves active fee structures with component heads.
   */
  static async getFeeStructures(academicYearId?: string, programmeId?: string): Promise<Result<unknown[]>> {
    try {
      const where: Prisma.FeeStructureWhereInput = { isActive: true };
      if (academicYearId) where.academicYearId = academicYearId;
      if (programmeId) where.programmeId = programmeId;

      const structures = await prisma.feeStructure.findMany({
        where,
        include: {
          feeHeads: true,
          programme: true,
          academicYear: true,
          _count: {
            select: { invoices: true },
          },
        },
        orderBy: [{ programme: { name: "asc" } }, { semesterNumber: "asc" }],
      });

      return { success: true, data: structures };
    } catch (err: unknown) {
      return {
        success: false,
        error: err instanceof Error ? err.message : "Failed to retrieve fee structures.",
        code: "GET_STRUCTURES_ERROR",
      };
    }
  }

  /**
   * Generates a formal student fee invoice based on their enrolment and configured fee structure.
   */
  static async generateStudentInvoice(dto: GenerateInvoiceDTO): Promise<Result<StudentFeeInvoiceItem>> {
    try {
      // Validate enrolment exists and matches student
      const enrolment = await prisma.enrolment.findUnique({
        where: { id: dto.enrolmentId },
        include: { semester: true, programme: true, student: true },
      });

      if (!enrolment || enrolment.studentId !== dto.studentId) {
        return {
          success: false,
          error: "Specified enrolment record does not belong to the target student.",
          code: "INVALID_ENROLMENT",
        };
      }

      // Validate fee structure exists and matches enrolment
      const structure = await prisma.feeStructure.findUnique({
        where: { id: dto.feeStructureId },
      });

      if (!structure) {
        return {
          success: false,
          error: "Referenced fee structure does not exist.",
          code: "STRUCTURE_NOT_FOUND",
        };
      }

      if (structure.programmeId !== enrolment.programmeId || structure.semesterNumber !== enrolment.semester.semesterNumber) {
        return {
          success: false,
          error: `Fee structure mismatch: Structure applies to ${structure.semesterNumber} but enrolment is semester ${enrolment.semester.semesterNumber}.`,
          code: "STRUCTURE_MISMATCH",
        };
      }

      // Check existing invoice collision
      const existingInvoice = await prisma.studentFeeInvoice.findUnique({
        where: {
          studentId_feeStructureId: {
            studentId: dto.studentId,
            feeStructureId: dto.feeStructureId,
          },
        },
      });

      if (existingInvoice) {
        return {
          success: false,
          error: `An invoice has already been issued to this student for this fee structure (${existingInvoice.invoiceNumber}).`,
          code: "DUPLICATE_INVOICE",
        };
      }

      const invoiceSeq = Math.floor(1000 + Math.random() * 9000);
      const invoiceNumber = `INV-${new Date().getFullYear()}-${invoiceSeq}`;

      const invoice = await prisma.studentFeeInvoice.create({
        data: {
          invoiceNumber,
          studentId: dto.studentId,
          enrolmentId: dto.enrolmentId,
          feeStructureId: dto.feeStructureId,
          totalDemand: structure.totalAmount,
          dueDate: dto.dueDate,
          remarks: dto.remarks?.trim() || null,
          generatedById: dto.generatedById || null,
          status: "PENDING",
        },
        include: {
          feeStructure: { include: { feeHeads: true } },
          student: true,
          enrolment: true,
        },
      });

      return { success: true, data: invoice };
    } catch (err: unknown) {
      return {
        success: false,
        error: err instanceof Error ? err.message : "Failed to generate student fee invoice.",
        code: "GENERATE_INVOICE_ERROR",
      };
    }
  }

  /**
   * Generates invoices in bulk for all actively enrolled students matching a fee structure.
   */
  static async generateBatchInvoices(dto: {
    feeStructureId: string;
    dueDate: Date;
    generatedById?: string;
  }): Promise<Result<{ generatedCount: number; skippedCount: number }>> {
    try {
      const structure = await prisma.feeStructure.findUnique({
        where: { id: dto.feeStructureId },
      });

      if (!structure) {
        return { success: false, error: "Fee structure not found.", code: "NOT_FOUND" };
      }

      // Find matching enrolments
      const enrolments = await prisma.enrolment.findMany({
        where: {
          programmeId: structure.programmeId,
          academicYearId: structure.academicYearId,
          semester: { semesterNumber: structure.semesterNumber },
          status: "ENROLLED",
        },
      });

      let generatedCount = 0;
      let skippedCount = 0;

      for (const enr of enrolments) {
        const res = await this.generateStudentInvoice({
          studentId: enr.studentId,
          enrolmentId: enr.id,
          feeStructureId: structure.id,
          dueDate: dto.dueDate,
          generatedById: dto.generatedById,
        });

        if (res.success) {
          generatedCount++;
        } else if (res.code === "DUPLICATE_INVOICE") {
          skippedCount++;
        }
      }

      return { success: true, data: { generatedCount, skippedCount } };
    } catch (err: unknown) {
      return {
        success: false,
        error: err instanceof Error ? err.message : "Failed during batch invoice generation.",
        code: "BATCH_INVOICE_ERROR",
      };
    }
  }

  /**
   * Records a fee payment receipt transactionally, calculates the remaining balance,
   * prevents double-counting, and dynamically updates invoice & student status.
   */
  static async recordFeePayment(dto: RecordPaymentDTO): Promise<Result<PaymentReceiptResult>> {
    try {
      if (dto.amountPaid <= 0) {
        return {
          success: false,
          error: "Payment amount must be strictly greater than zero.",
          code: "INVALID_AMOUNT",
        };
      }

      if (!dto.transactionReference || !dto.transactionReference.trim()) {
        return {
          success: false,
          error: "A valid transaction reference (UTR, Cheque Number, or Receipt ID) is mandatory.",
          code: "MISSING_TRANSACTION_REF",
        };
      }

      const trimmedRef = dto.transactionReference.trim();

      // Execute within an atomic database transaction
      const transactionResult = await prisma.$transaction(async (tx) => {
        // 1. Lock/fetch invoice with receipts
        const invoice = await tx.studentFeeInvoice.findUnique({
          where: { id: dto.invoiceId },
          include: { receipts: true, student: true },
        });

        if (!invoice) {
          throw new Error("Target invoice does not exist.");
        }

        if (invoice.status === "PAID") {
          throw new Error("This invoice is already fully cleared. No outstanding balance remains.");
        }

        // 2. Check duplicate transaction reference (idempotency & anti-double-counting)
        const duplicateRef = await tx.feeReceipt.findUnique({
          where: { transactionReference: trimmedRef },
        });

        if (duplicateRef) {
          throw new Error(`Transaction reference '${trimmedRef}' has already been processed (Receipt: ${duplicateRef.receiptNumber}).`);
        }

        // 3. Compute balance from persisted database records
        const alreadyPaid = invoice.receipts.reduce((sum, r) => sum + r.amountPaid, 0);
        const outstandingBalance = invoice.totalDemand - alreadyPaid;

        if (dto.amountPaid > outstandingBalance) {
          throw new Error(
            `Payment amount (₹${dto.amountPaid}) exceeds remaining outstanding balance (₹${outstandingBalance}). Overpayments are rejected.`
          );
        }

        // 4. Create Receipt
        const receiptSeq = Math.floor(100000 + Math.random() * 900000);
        const receiptNumber = `REC-${new Date().getFullYear()}-${receiptSeq}`;

        const createdReceipt = await tx.feeReceipt.create({
          data: {
            receiptNumber,
            invoiceId: invoice.id,
            studentId: invoice.studentId,
            amountPaid: dto.amountPaid,
            paymentMethod: dto.paymentMethod,
            transactionReference: trimmedRef,
            payerName: dto.payerName?.trim() || invoice.student.fullName,
            remarks: dto.remarks?.trim() || null,
            collectedById: dto.collectedById,
          },
        });

        // 5. Update Invoice Status
        const newTotalPaid = alreadyPaid + dto.amountPaid;
        const newBalance = invoice.totalDemand - newTotalPaid;
        const newStatus = newBalance <= 0 ? "PAID" : "PARTIALLY_PAID";

        await tx.studentFeeInvoice.update({
          where: { id: invoice.id },
          data: { status: newStatus },
        });

        // 6. Dynamically update student master clearance status
        // Check all invoices for this student
        const allStudentInvoices = await tx.studentFeeInvoice.findMany({
          where: { studentId: invoice.studentId },
          include: { receipts: true },
        });

        
        for (const inv of allStudentInvoices) {
          const invPaid = inv.receipts.reduce((s, r) => s + r.amountPaid, 0) + (inv.id === invoice.id ? dto.amountPaid : 0);
          if (inv.totalDemand - invPaid > 0) {
            
            break;
          }
        }

        // Student model fee clearance synchronization
        await tx.student.update({
          where: { id: invoice.studentId },
          data: {
            status: invoice.student.status, // preserve active status
          },
        });

        return {
          receipt: createdReceipt,
          invoiceId: invoice.id,
          invoiceNumber: invoice.invoiceNumber,
          amountPaid: dto.amountPaid,
          previousOutstanding: outstandingBalance,
          newOutstanding: newBalance,
          invoiceStatus: newStatus,
        };
      });

      return { success: true, data: transactionResult };
    } catch (err: unknown) {
      return {
        success: false,
        error: err instanceof Error ? err.message : "Failed to record fee payment.",
        code: "RECORD_PAYMENT_ERROR",
      };
    }
  }

  /**
   * Retrieves the comprehensive double-entry financial ledger for a specific student.
   */
  static async getStudentFeeLedger(identifier: string): Promise<Result<StudentFeeLedgerSummary>> {
    try {
      const trimmed = identifier.trim();
      let student = await prisma.student.findUnique({
        where: { id: trimmed },
        include: {
          enrolments: {
            include: { programme: true, semester: true, division: true },
            take: 1,
            orderBy: { enrolledAt: "desc" },
          },
          feeInvoices: {
            include: {
              feeStructure: { include: { feeHeads: true } },
              receipts: {
                include: { collectedBy: true },
                orderBy: { paymentDate: "desc" },
              },
            },
            orderBy: { createdAt: "desc" },
          },
        },
      });

      if (!student) {
        student = await prisma.student.findFirst({
          where: {
            OR: [
              { prn: trimmed },
              { rollNumber: trimmed },
              { email: trimmed },
            ],
          },
          include: {
            enrolments: {
              include: { programme: true, semester: true, division: true },
              take: 1,
              orderBy: { enrolledAt: "desc" },
            },
            feeInvoices: {
              include: {
                feeStructure: { include: { feeHeads: true } },
                receipts: {
                  include: { collectedBy: true },
                  orderBy: { paymentDate: "desc" },
                },
              },
              orderBy: { createdAt: "desc" },
            },
          },
        });
      }

      if (!student) {
        return { success: false, error: "Student not found.", code: "NOT_FOUND" };
      }

      const activeEnrolment = student.enrolments[0];

      // Retrieve applicable active fee structures for this student's cohort
      let applicableStructures: ApplicableFeeStructureOption[] = [];
      if (activeEnrolment?.programmeId) {
        const matchingStructures = await prisma.feeStructure.findMany({
          where: {
            programmeId: activeEnrolment.programmeId,
            semesterNumber: activeEnrolment.semester?.semesterNumber || 1,
            isActive: true,
          },
          include: {
            academicYear: true,
            feeHeads: true,
          },
        });

        applicableStructures = matchingStructures.map((st) => ({
          id: st.id,
          name: st.name,
          totalAmount: st.totalAmount,
          semesterNumber: st.semesterNumber,
          academicYearName: st.academicYear?.name || "Active Session",
          feeHeads: st.feeHeads.map((h) => ({
            headName: h.headName,
            amount: h.amount,
          })),
        }));
      }

      let totalDemand = 0;
      let totalPaid = 0;

      const items: StudentFeeLedgerItem[] = student.feeInvoices.map((inv) => {
        const invPaid = inv.receipts.reduce((sum, r) => sum + r.amountPaid, 0);
        const invOutstanding = inv.totalDemand - invPaid;

        totalDemand += inv.totalDemand;
        totalPaid += invPaid;

        return {
          invoiceId: inv.id,
          invoiceNumber: inv.invoiceNumber,
          structureId: inv.feeStructureId,
          structureName: inv.feeStructure.name,
          totalDemand: inv.totalDemand,
          totalPaid: invPaid,
          outstandingBalance: invOutstanding,
          status: inv.status,
          dueDate: inv.dueDate,
          createdAt: inv.createdAt,
          feeHeads: inv.feeStructure.feeHeads.map((h) => ({
            headName: h.headName,
            amount: h.amount,
          })),
          receipts: inv.receipts.map((r) => ({
            id: r.id,
            receiptNumber: r.receiptNumber,
            amountPaid: r.amountPaid,
            paymentDate: r.paymentDate,
            paymentMethod: r.paymentMethod,
            transactionReference: r.transactionReference,
            payerName: r.payerName,
            collectedByName: r.collectedBy?.fullName || "Cashier Desk",
            remarks: r.remarks,
          })),
        };
      });

      const outstandingBalance = Math.max(0, totalDemand - totalPaid);

      let feeClearanceStatus: "CLEARED" | "PARTIALLY_CLEARED" | "PENDING_DUES" | "NOT_INVOICED" = "PENDING_DUES";

      if (student.feeInvoices.length === 0) {
        feeClearanceStatus = "NOT_INVOICED";
      } else if (outstandingBalance === 0 && totalDemand > 0) {
        feeClearanceStatus = "CLEARED";
      } else if (totalPaid > 0) {
        feeClearanceStatus = "PARTIALLY_CLEARED";
      } else {
        feeClearanceStatus = "PENDING_DUES";
      }

      return {
        success: true,
        data: {
          studentId: student.id,
          rollNumber: student.rollNumber,
          prn: student.prn,
          fullName: student.fullName,
          programmeName: activeEnrolment?.programme?.name || "Unenrolled",
          semesterNumber: activeEnrolment?.semester?.semesterNumber || 1,
          divisionName: activeEnrolment?.division?.name || "Unassigned",
          activeEnrolmentId: activeEnrolment?.id,
          totalDemand: student.feeInvoices.length === 0 ? 0 : totalDemand,
          totalPaid,
          outstandingBalance: student.feeInvoices.length === 0 ? 0 : outstandingBalance,
          feeClearanceStatus,
          invoices: items,
          applicableStructures,
        },
      };
    } catch (err: unknown) {
      return {
        success: false,
        error: err instanceof Error ? err.message : "Failed to retrieve student fee ledger.",
        code: "GET_LEDGER_ERROR",
      };
    }
  }

  /**
   * Retrieves the institutional defaulter list (students with outstanding balances).
   */
  static async getDefaulterList(filters?: { programmeId?: string }): Promise<Result<DefaulterItem[]>> {
    try {
      const invoices = await prisma.studentFeeInvoice.findMany({
        where: {
          status: { in: ["PENDING", "PARTIALLY_PAID", "OVERDUE"] },
          ...(filters?.programmeId ? { feeStructure: { programmeId: filters.programmeId } } : {}),
        },
        include: {
          student: {
            include: {
              enrolments: {
                include: { programme: true, semester: true },
                take: 1,
                orderBy: { enrolledAt: "desc" },
              },
            },
          },
          feeStructure: { include: { programme: true } },
          receipts: true,
        },
      });

      // Group by student
      const studentMap = new Map<string, DefaulterItem>();

      for (const inv of invoices) {
        const paid = inv.receipts.reduce((sum, r) => sum + r.amountPaid, 0);
        const balance = inv.totalDemand - paid;

        if (balance > 0) {
          const s = inv.student;
          const current = studentMap.get(s.id);
          if (current) {
            current.totalDemand += inv.totalDemand;
            current.totalPaid += paid;
            current.outstandingBalance += balance;
          } else {
            studentMap.set(s.id, {
              studentId: s.id,
              rollNumber: s.rollNumber,
              prn: s.prn,
              fullName: s.fullName,
              programmeCode: inv.feeStructure.programme.code,
              programmeName: inv.feeStructure.programme.name,
              semesterNumber: inv.feeStructure.semesterNumber,
              totalDemand: inv.totalDemand,
              totalPaid: paid,
              outstandingBalance: balance,
              overdueSince: inv.dueDate,
              status: inv.status,
            });
          }
        }
      }

      return { success: true, data: Array.from(studentMap.values()) };
    } catch (err: unknown) {
      return {
        success: false,
        error: err instanceof Error ? err.message : "Failed to retrieve defaulter list.",
        code: "GET_DEFAULTERS_ERROR",
      };
    }
  }

  /**
   * Retrieves institutional finance overview metrics.
   */
  static async getFinanceOverview(): Promise<Result<unknown>> {
    try {
      const invoices = await prisma.studentFeeInvoice.findMany({
        include: { receipts: true },
      });

      let totalDemand = 0;
      let totalCollected = 0;

      for (const inv of invoices) {
        totalDemand += inv.totalDemand;
        totalCollected += inv.receipts.reduce((s, r) => s + r.amountPaid, 0);
      }

      const totalOutstanding = totalDemand - totalCollected;
      const collectionRate = totalDemand > 0 ? (totalCollected / totalDemand) * 100 : 0;

      const totalStructures = await prisma.feeStructure.count({ where: { isActive: true } });
      const totalReceipts = await prisma.feeReceipt.count();

      return {
        success: true,
        data: {
          totalDemand,
          totalCollected,
          totalOutstanding,
          collectionRate: Math.round(collectionRate * 10) / 10,
          totalInvoices: invoices.length,
          totalReceipts,
          totalStructures,
        },
      };
    } catch (err: unknown) {
      return {
        success: false,
        error: err instanceof Error ? err.message : "Failed to retrieve finance overview.",
        code: "GET_OVERVIEW_ERROR",
      };
    }
  }
}
