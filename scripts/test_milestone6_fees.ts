import { PrismaClient } from "@prisma/client";
import { FeeRepository } from "@/lib/dal/feeRepository";
import { hasPermission } from "@/lib/auth/roles";
import {
  createFeeStructureAction,
  recordFeePaymentAction,
  getDefaulterListAction,
  getStudentFeeLedgerAction,
} from "@/lib/actions/fees";

const prisma = new PrismaClient();

async function runMilestone6Suite() {
  console.log("==================================================================");
  console.log("CAMPUSOS ERP: MILESTONE 6 AUTOMATED VERIFICATION SUITE");
  console.log("Student Fee Ledgers, Double-Entry Balance Engine & Receipts");
  console.log("==================================================================\n");

  let passed = 0;
  let failed = 0;

  function assert(cond: boolean, desc: string) {
    if (cond) {
      console.log(`  [PASS] ${desc}`);
      passed++;
    } else {
      console.error(`  [FAIL] ${desc}`);
      failed++;
    }
  }

  // -------------------------------------------------------------------------
  // 1. Preflight Baseline Counts
  // -------------------------------------------------------------------------
  console.log("--- 1. Baseline Preflight Checks ---");
  const baseStudents = await prisma.student.count();
  const baseStaff = await prisma.staff.count();
  const baseProgrammes = await prisma.programme.count();
  const baseSemesters = await prisma.semester.count();
  const baseDivisions = await prisma.division.count();
  const baseEnrolments = await prisma.enrolment.count();
  const baseStructures = await prisma.feeStructure.count();
  const baseInvoices = await prisma.studentFeeInvoice.count();
  const baseReceipts = await prisma.feeReceipt.count();

  assert(baseStudents === 13, `Baseline students count = 13 (found ${baseStudents})`);
  assert(baseStaff === 13, `Baseline staff count = 13 (found ${baseStaff})`);
  assert(baseProgrammes === 7, `Baseline programmes count = 7 (found ${baseProgrammes})`);
  assert(baseEnrolments === 14, `Baseline enrolments count = 14 (found ${baseEnrolments})`);
  assert(baseStructures === 0, `Preflight fee structures count = 0 (found ${baseStructures})`);
  assert(baseInvoices === 0, `Preflight fee invoices count = 0 (found ${baseInvoices})`);
  assert(baseReceipts === 0, `Preflight fee receipts count = 0 (found ${baseReceipts})`);

  // -------------------------------------------------------------------------
  // 2. Role-Based Permissions Matrix
  // -------------------------------------------------------------------------
  console.log("\n--- 2. RBAC Permissions Matrix for Fees ---");
  assert(hasPermission("SYSTEM_ADMIN", "MANAGE_FEES"), "SYSTEM_ADMIN holds MANAGE_FEES");
  assert(hasPermission("SYSTEM_ADMIN", "COLLECT_FEES"), "SYSTEM_ADMIN holds COLLECT_FEES");
  assert(hasPermission("SYSTEM_ADMIN", "VIEW_FEES"), "SYSTEM_ADMIN holds VIEW_FEES");
  assert(hasPermission("ACADEMIC_ADMIN", "MANAGE_FEES"), "ACADEMIC_ADMIN holds MANAGE_FEES");
  assert(hasPermission("ACADEMIC_ADMIN", "COLLECT_FEES"), "ACADEMIC_ADMIN holds COLLECT_FEES");
  assert(!hasPermission("FACULTY_MEMBER", "MANAGE_FEES"), "FACULTY_MEMBER denied MANAGE_FEES");
  assert(!hasPermission("FACULTY_MEMBER", "COLLECT_FEES"), "FACULTY_MEMBER denied COLLECT_FEES");
  assert(!hasPermission("STUDENT_VIEWER", "MANAGE_FEES"), "STUDENT_VIEWER denied MANAGE_FEES");
  assert(!hasPermission("STUDENT_VIEWER", "COLLECT_FEES"), "STUDENT_VIEWER denied COLLECT_FEES");
  assert(hasPermission("STUDENT_VIEWER", "VIEW_FEES"), "STUDENT_VIEWER holds VIEW_FEES");

  // Load test reference data
  const academicYear = await prisma.academicYear.findFirst({ where: { isCurrent: true } }) || await prisma.academicYear.findFirst();
  const programme = await prisma.programme.findFirst({ where: { code: "BA-CUL" } }) || await prisma.programme.findFirst();
  const semester = await prisma.semester.findFirst({
    where: { programmeId: programme!.id, semesterNumber: 1 },
    include: { enrolments: { include: { student: true } } },
  });
  const adminAccount = await prisma.userAccount.findFirst({ where: { role: "SYSTEM_ADMIN" } });
  const enrolment = semester?.enrolments[0];
  const student = enrolment?.student;

  if (!academicYear || !programme || !semester || !adminAccount || !enrolment || !student) {
    throw new Error("Missing required reference data in database");
  }

  let testStructureId = "";
  let testInvoiceId = "";

  try {
    // -------------------------------------------------------------------------
    // 3. Fee Structure Creation & Validation
    // -------------------------------------------------------------------------
    console.log("\n--- 3. Fee Structure Lifecycle & Head Validation ---");

    // Empty fee heads must fail
    const emptyHeadRes = await FeeRepository.createFeeStructure({
      academicYearId: academicYear.id,
      programmeId: programme.id,
      semesterNumber: 1,
      name: "Empty Structure",
      feeHeads: [],
    });
    assert(!emptyHeadRes.success && emptyHeadRes.code === "EMPTY_FEE_HEADS",
      "Empty fee heads rejected with EMPTY_FEE_HEADS");

    // Negative head amount must fail
    const negativeHeadRes = await FeeRepository.createFeeStructure({
      academicYearId: academicYear.id,
      programmeId: programme.id,
      semesterNumber: 1,
      name: "Negative Structure",
      feeHeads: [{ headName: "Tuition", amount: -5000 }],
    });
    assert(!negativeHeadRes.success && negativeHeadRes.code === "INVALID_HEAD_AMOUNT",
      "Negative head amount rejected with INVALID_HEAD_AMOUNT");

    // Valid Fee Structure Creation
    const validStructureRes = await FeeRepository.createFeeStructure({
      academicYearId: academicYear.id,
      programmeId: programme.id,
      semesterNumber: 1,
      name: "B.A. Culinary Arts - Semester 1 (2026-27)",
      feeHeads: [
        { headName: "Tuition Fee", amount: 45000 },
        { headName: "Commercial Kitchen Lab & Ingredients Fee", amount: 25000 },
        { headName: "Chef Uniform & Professional Knife-Kit Fee", amount: 8000 },
        { headName: "Examination & Library Fee", amount: 2000 },
      ],
    });
    assert(validStructureRes.success && !!validStructureRes.data?.id,
      "Created fee structure successfully with 4 itemized heads");
    assert(validStructureRes.data?.totalAmount === 80000,
      `Total demand computed accurately: ₹80,000 (found ₹${validStructureRes.data?.totalAmount})`);
    testStructureId = validStructureRes.data!.id;

    // Duplicate structure check
    const duplicateRes = await FeeRepository.createFeeStructure({
      academicYearId: academicYear.id,
      programmeId: programme.id,
      semesterNumber: 1,
      name: "Duplicate Structure",
      feeHeads: [{ headName: "Tuition", amount: 50000 }],
    });
    assert(!duplicateRes.success && duplicateRes.code === "DUPLICATE_FEE_STRUCTURE",
      "Duplicate fee structure rejected with DUPLICATE_FEE_STRUCTURE");

    // -------------------------------------------------------------------------
    // 4. Student Invoice Generation & Verification
    // -------------------------------------------------------------------------
    // Verify Empty-Ledger Semantics before invoice creation
    const emptyLedger = await FeeRepository.getStudentFeeLedger(student.id);
    assert(emptyLedger.success && emptyLedger.data?.feeClearanceStatus === "NOT_INVOICED",
      "Empty-ledger status is truthfully NOT_INVOICED (no invoice issued)");
    assert(emptyLedger.data?.totalDemand === 0 && emptyLedger.data?.outstandingBalance === 0,
      "Empty-ledger demand and outstanding balance are 0");

    const invoiceRes = await FeeRepository.generateStudentInvoice({
      studentId: student.id,
      enrolmentId: enrolment.id,
      feeStructureId: testStructureId,
      dueDate: new Date("2026-11-30"),
      remarks: "Official Semester 1 Demand",
      generatedById: adminAccount.id,
    });
    assert(invoiceRes.success && !!invoiceRes.data?.id,
      `Generated invoice successfully: ${invoiceRes.data?.invoiceNumber}`);
    assert(invoiceRes.data?.totalDemand === 80000,
      `Invoice demand matches structure: ₹80,000 (found ₹${invoiceRes.data?.totalDemand})`);
    testInvoiceId = invoiceRes.data!.id;

    // Verify Unpaid Demand Ledger State
    const unpaidLedger = await FeeRepository.getStudentFeeLedger(student.id);
    assert(unpaidLedger.data?.feeClearanceStatus === "PENDING_DUES",
      "Unpaid invoice ledger clearance status is PENDING_DUES");

    // Duplicate invoice prevention
    const duplicateInvoiceRes = await FeeRepository.generateStudentInvoice({
      studentId: student.id,
      enrolmentId: enrolment.id,
      feeStructureId: testStructureId,
      dueDate: new Date("2026-11-30"),
    });
    assert(!duplicateInvoiceRes.success && duplicateInvoiceRes.code === "DUPLICATE_INVOICE",
      "Duplicate invoice for same student and structure blocked with DUPLICATE_INVOICE");

    // -------------------------------------------------------------------------
    // 5. Payment Integrity: Zero, Negative & Overpayment Protection
    // -------------------------------------------------------------------------
    console.log("\n--- 5. Payment Validation & Failure Path Integrity ---");

    // Zero or negative payment
    const zeroPayRes = await FeeRepository.recordFeePayment({
      invoiceId: testInvoiceId,
      amountPaid: 0,
      paymentMethod: "UPI",
      transactionReference: "UPI-ZERO-TEST",
      collectedById: adminAccount.id,
    });
    assert(!zeroPayRes.success && zeroPayRes.code === "INVALID_AMOUNT",
      "Zero payment amount rejected with INVALID_AMOUNT");

    // Missing transaction reference
    const emptyRefRes = await FeeRepository.recordFeePayment({
      invoiceId: testInvoiceId,
      amountPaid: 10000,
      paymentMethod: "UPI",
      transactionReference: "   ",
      collectedById: adminAccount.id,
    });
    assert(!emptyRefRes.success && emptyRefRes.code === "MISSING_TRANSACTION_REF",
      "Empty transaction reference rejected with MISSING_TRANSACTION_REF");

    // Overpayment protection
    const overpayRes = await FeeRepository.recordFeePayment({
      invoiceId: testInvoiceId,
      amountPaid: 95000, // Total is 80,000
      paymentMethod: "NEFT_RTGS",
      transactionReference: "NEFT-OVERPAY-TEST",
      collectedById: adminAccount.id,
    });
    assert(!overpayRes.success && (overpayRes.error?.includes("exceeds remaining outstanding balance") ?? false),
      `Overpayment rejected: "${overpayRes.error}"`);

    // Verify DB invariance after rejected payments
    const receiptsCountAfterRejections = await prisma.feeReceipt.count({ where: { invoiceId: testInvoiceId } });
    assert(receiptsCountAfterRejections === 0,
      "Database invariance: 0 receipts recorded after rejected payment attempts");

    // -------------------------------------------------------------------------
    // 6. Partial Payment & Dynamic Balance Calculation
    // -------------------------------------------------------------------------
    console.log("\n--- 6. Partial Payment & Double-Entry Calculations ---");

    const partialTxRef = `UPI-TXN-${Date.now()}-1`;
    const partialPayRes = await FeeRepository.recordFeePayment({
      invoiceId: testInvoiceId,
      amountPaid: 50000, // Partial payment (50k out of 80k)
      paymentMethod: "UPI",
      transactionReference: partialTxRef,
      payerName: student.fullName,
      remarks: "Installment 1 via GooglePay",
      collectedById: adminAccount.id,
    });

    assert(partialPayRes.success, "Recorded partial payment of ₹50,000 successfully");
    assert(partialPayRes.data?.newOutstanding === 30000,
      `Calculated outstanding balance accurately: ₹30,000 (found ₹${partialPayRes.data?.newOutstanding})`);
    assert(partialPayRes.data?.invoiceStatus === "PARTIALLY_PAID",
      "Invoice status transitioned to PARTIALLY_PAID");

    // Verify Partially Paid Ledger State
    const partialLedger = await FeeRepository.getStudentFeeLedger(student.id);
    assert(partialLedger.data?.feeClearanceStatus === "PARTIALLY_CLEARED",
      "Partially paid ledger clearance status is PARTIALLY_CLEARED");

    // Anti-Double-Counting / Idempotency Check: Same transaction reference cannot be reused
    const replayRes = await FeeRepository.recordFeePayment({
      invoiceId: testInvoiceId,
      amountPaid: 10000,
      paymentMethod: "UPI",
      transactionReference: partialTxRef, // Replay
      collectedById: adminAccount.id,
    });
    assert(!replayRes.success && (replayRes.error?.includes("already been processed") ?? false),
      "Duplicate transaction reference strictly rejected (prevents silent double-counting)");

    // -------------------------------------------------------------------------
    // 7. Full Settlement & Clearance Lifecycle
    // -------------------------------------------------------------------------
    console.log("\n--- 7. Full Settlement & Clearance Lifecycle ---");

    const finalTxRef = `NEFT-TXN-${Date.now()}-2`;
    const fullPayRes = await FeeRepository.recordFeePayment({
      invoiceId: testInvoiceId,
      amountPaid: 30000, // Settle the remaining 30k
      paymentMethod: "NEFT_RTGS",
      transactionReference: finalTxRef,
      payerName: student.fullName,
      remarks: "Final settlement via HDFC NetBanking",
      collectedById: adminAccount.id,
    });

    assert(fullPayRes.success, "Recorded final settlement payment of ₹30,000 successfully");
    assert(fullPayRes.data?.newOutstanding === 0,
      `Outstanding balance completely cleared: ₹0 (found ₹${fullPayRes.data?.newOutstanding})`);
    assert(fullPayRes.data?.invoiceStatus === "PAID",
      "Invoice status transitioned to PAID");

    // Any further payment attempt on fully cleared invoice must fail
    const postClearanceRes = await FeeRepository.recordFeePayment({
      invoiceId: testInvoiceId,
      amountPaid: 5000,
      paymentMethod: "CASH",
      transactionReference: `CASH-OVERFLOW-${Date.now()}`,
      collectedById: adminAccount.id,
    });
    assert(!postClearanceRes.success && (postClearanceRes.error?.includes("already fully cleared") ?? false),
      "Payment on already cleared invoice rejected");

    // -------------------------------------------------------------------------
    // 8. Student Ledger Inspection & Clearance Status
    // -------------------------------------------------------------------------
    console.log("\n--- 8. Student Fee Ledger Inspection ---");

    const ledgerRes = await FeeRepository.getStudentFeeLedger(student.id);
    assert(ledgerRes.success && !!ledgerRes.data, "Retrieved student fee ledger successfully");
    assert(ledgerRes.data?.totalDemand === 80000, `Ledger total demand: ₹80,000 (found ₹${ledgerRes.data?.totalDemand})`);
    assert(ledgerRes.data?.totalPaid === 80000, `Ledger total paid: ₹80,000 (found ₹${ledgerRes.data?.totalPaid})`);
    assert(ledgerRes.data?.outstandingBalance === 0, `Ledger outstanding balance: ₹0 (found ₹${ledgerRes.data?.outstandingBalance})`);
    assert(ledgerRes.data?.feeClearanceStatus === "CLEARED", "Fee clearance status is CLEARED");
    assert((ledgerRes.data?.invoices[0]?.receipts?.length ?? 0) === 2, "Persisted 2 discrete payment receipts in ledger");

    // -------------------------------------------------------------------------
    // 9. Server Actions Security Boundary
    // -------------------------------------------------------------------------
    console.log("\n--- 9. Server Actions Unauthenticated Boundary ---");

    const unauthCreate = await createFeeStructureAction({} as any);
    assert(!unauthCreate.success && unauthCreate.code === "UNAUTHORIZED",
      "createFeeStructureAction rejected without auth context");

    const unauthPayment = await recordFeePaymentAction({} as any);
    assert(!unauthPayment.success && unauthPayment.code === "UNAUTHORIZED",
      "recordFeePaymentAction rejected without auth context");

    const unauthDefaulters = await getDefaulterListAction();
    assert(!unauthDefaulters.success && unauthDefaulters.code === "UNAUTHORIZED",
      "getDefaulterListAction rejected without auth context");

    const unauthLedger = await getStudentFeeLedgerAction("any-id");
    assert(!unauthLedger.success && unauthLedger.code === "UNAUTHORIZED",
      "getStudentFeeLedgerAction rejected without auth context");

  } finally {
    // -------------------------------------------------------------------------
    // 10. Strict Teardown & Database Invariance Restoration
    // -------------------------------------------------------------------------
    console.log("\n--- 10. Teardown of Temporary Test Fixtures ---");
    if (testInvoiceId) {
      await prisma.feeReceipt.deleteMany({ where: { invoiceId: testInvoiceId } });
      await prisma.studentFeeInvoice.deleteMany({ where: { id: testInvoiceId } });
    }
    if (testStructureId) {
      await prisma.feeHead.deleteMany({ where: { feeStructureId: testStructureId } });
      await prisma.feeStructure.deleteMany({ where: { id: testStructureId } });
    }

    const postStudents = await prisma.student.count();
    const postStaff = await prisma.staff.count();
    const postProgrammes = await prisma.programme.count();
    const postEnrolments = await prisma.enrolment.count();
    const postStructures = await prisma.feeStructure.count();
    const postInvoices = await prisma.studentFeeInvoice.count();
    const postReceipts = await prisma.feeReceipt.count();

    assert(postStudents === baseStudents, `Students count preserved: ${postStudents} === ${baseStudents}`);
    assert(postStaff === baseStaff, `Staff count preserved: ${postStaff} === ${baseStaff}`);
    assert(postProgrammes === baseProgrammes, `Programmes count preserved: ${postProgrammes} === ${baseProgrammes}`);
    assert(postEnrolments === baseEnrolments, `Enrolments count preserved: ${postEnrolments} === ${baseEnrolments}`);
    assert(postStructures === 0, `Fee structures count preserved at 0: ${postStructures}`);
    assert(postInvoices === 0, `Fee invoices count preserved at 0: ${postInvoices}`);
    assert(postReceipts === 0, `Fee receipts count preserved at 0: ${postReceipts}`);
  }

  console.log("\n==================================================================");
  console.log(`TOTAL MILESTONE 6 CHECKS: ${passed + failed} | PASSED: ${passed} | FAILED: ${failed}`);
  console.log("==================================================================");

  if (failed > 0) {
    process.exit(1);
  }
}

runMilestone6Suite()
  .catch((err) => {
    console.error("FATAL ERROR in Milestone 6 Suite:", err);
    process.exit(1);
  })
  .finally(() => prisma.$disconnect());
