import { PrismaClient } from "@prisma/client";
import { FeeRepository } from "../src/lib/dal/feeRepository";
import { hasPermission, Role } from "../src/lib/auth/roles";

const prisma = new PrismaClient();

async function runFinancialAcceptanceTests() {
  console.log("==================================================================");
  console.log("CAMPUSOS ERP: MILESTONE 6 DEEP FINANCIAL ACCEPTANCE REVIEW");
  console.log("Auditing Concurrency, Balance Invariants, Idempotency & Auth");
  console.log("==================================================================\n");

  let passed = 0;
  let failed = 0;

  function assert(condition: boolean, msg: string) {
    if (condition) {
      console.log(`  [PASS] ${msg}`);
      passed++;
    } else {
      console.error(`  [FAIL] ${msg}`);
      failed++;
    }
  }

  // 1. Snapshot Baselines
  const baseline = {
    students: await prisma.student.count(),
    staff: await prisma.staff.count(),
    programmes: await prisma.programme.count(),
    enrolments: await prisma.enrolment.count(),
    feeStructures: await prisma.feeStructure.count(),
    feeInvoices: await prisma.studentFeeInvoice.count(),
    feeReceipts: await prisma.feeReceipt.count(),
  };

  console.log("--- 1. Baseline Verification ---");
  assert(baseline.students === 13, `Baseline Students = 13 (found ${baseline.students})`);
  assert(baseline.feeStructures === 0, `Baseline FeeStructures = 0 (found ${baseline.feeStructures})`);
  assert(baseline.feeInvoices === 0, `Baseline FeeInvoices = 0 (found ${baseline.feeInvoices})`);
  assert(baseline.feeReceipts === 0, `Baseline FeeReceipts = 0 (found ${baseline.feeReceipts})`);

  // Setup test fixtures
  const student = await prisma.student.findFirst({
    include: {
      enrolments: {
        include: { semester: true, programme: true, academicYear: true },
      },
    },
  });

  if (!student || !student.enrolments[0]) {
    throw new Error("No student enrolment found for test.");
  }

  const enr = student.enrolments[0];
  const adminUser = await prisma.userAccount.findFirst({
    where: { role: "SYSTEM_ADMIN" },
  });

  if (!adminUser) {
    throw new Error("No admin user found for test.");
  }

  let testStructureId = "";
  let testInvoiceId = "";
  const testReceiptIds: string[] = [];

  try {
    console.log("\n--- 2. Structure Creation & Multi-Head Allocation ---");
    const structureRes = await FeeRepository.createFeeStructure({
      academicYearId: enr.academicYearId,
      programmeId: enr.programmeId,
      semesterNumber: enr.semester.semesterNumber,
      name: `FinAcceptance - ${enr.programme.name} Sem ${enr.semester.semesterNumber}`,
      feeHeads: [
        { headName: "Tuition Fee", amount: 50000 },
        { headName: "Culinary Laboratory Fee", amount: 20000 },
        { headName: "Uniform & Tools Fee", amount: 10000 },
      ],
    });

    assert(structureRes.success, "Fee structure created successfully");
    testStructureId = structureRes.data?.id as string;
    assert(structureRes.data?.totalAmount === 80000, `Total demand = 80,000 (found ${structureRes.data?.totalAmount})`);

    console.log("\n--- 3. Invoice Generation & Baseline Ledger Demand ---");
    // Verify pre-invoice empty ledger semantics
    const preInvoiceLedger = await FeeRepository.getStudentFeeLedger(student.id);
    assert(preInvoiceLedger.data?.feeClearanceStatus === "NOT_INVOICED", "Empty ledger truthfully reports NOT_INVOICED status");
    assert(preInvoiceLedger.data?.totalDemand === 0, "Empty ledger demand is exactly 0");
    assert(preInvoiceLedger.data?.outstandingBalance === 0, "Empty ledger outstanding balance is exactly 0");

    const invoiceRes = await FeeRepository.generateStudentInvoice({
      studentId: student.id,
      enrolmentId: enr.id,
      feeStructureId: testStructureId,
      dueDate: new Date(Date.now() + 30 * 24 * 3600 * 1000),
      generatedById: adminUser.id,
    });

    assert(invoiceRes.success, "Student fee invoice generated");
    testInvoiceId = invoiceRes.data?.id as string;
    assert(invoiceRes.data?.totalDemand === 80000, "Invoice total demand is 80,000");
    assert(invoiceRes.data?.status === "PENDING", "Invoice initial status is PENDING");

    // 4. Concurrency & Idempotency Tests
    console.log("\n--- 4. Concurrency & Duplicate Payment Safeguards ---");

    // Test 4A: Exact duplicate transaction reference serial submission
    const txRef1 = `UTR-CONC-${Date.now()}-A`;
    const pay1 = await FeeRepository.recordFeePayment({
      invoiceId: testInvoiceId,
      amountPaid: 20000,
      paymentMethod: "UPI",
      transactionReference: txRef1,
      collectedById: adminUser.id,
    });
    assert(pay1.success, "Initial payment 1 of 20,000 succeeded");
    if (pay1.data?.receipt?.id) {
      testReceiptIds.push(pay1.data.receipt.id as string);
    }

    // Repeated submission of exact same transaction reference (client retry after timeout)
    const pay1Retry = await FeeRepository.recordFeePayment({
      invoiceId: testInvoiceId,
      amountPaid: 20000,
      paymentMethod: "UPI",
      transactionReference: txRef1,
      collectedById: adminUser.id,
    });
    assert(!pay1Retry.success, "Re-submission of identical transaction reference rejected (idempotency guard)");
    assert(
      Boolean(pay1Retry.error?.includes("already been processed")),
      `Correct error message returned: "${pay1Retry.error}"`
    );

    // Test 4B: Concurrent attempts with SAME transaction reference (Promise.all race condition)
    const txRefConcurrentSame = `UTR-RACE-SAME-${Date.now()}`;
    const raceResults = await Promise.all([
      FeeRepository.recordFeePayment({
        invoiceId: testInvoiceId,
        amountPaid: 15000,
        paymentMethod: "NEFT_RTGS",
        transactionReference: txRefConcurrentSame,
        collectedById: adminUser.id,
      }),
      FeeRepository.recordFeePayment({
        invoiceId: testInvoiceId,
        amountPaid: 15000,
        paymentMethod: "NEFT_RTGS",
        transactionReference: txRefConcurrentSame,
        collectedById: adminUser.id,
      }),
    ]);

    const successesSame = raceResults.filter((r) => r.success);
    const failuresSame = raceResults.filter((r) => !r.success);
    assert(successesSame.length === 1, `Concurrent race with same UTR: Exactly 1 succeeded (${successesSame.length})`);
    assert(failuresSame.length === 1, `Concurrent race with same UTR: Exactly 1 failed (${failuresSame.length})`);
    if (successesSame[0]?.data?.receipt?.id) {
      testReceiptIds.push(successesSame[0].data.receipt.id as string);
    }

    // Test 4C: Concurrent attempts that TOGETHER would exceed balance
    // Current invoice demand: 80,000. Paid so far: 20,000 + 15,000 = 35,000. Outstanding = 45,000.
    // Two concurrent requests of 30,000 each (total 60,000 > 45,000 remaining)
    const txRefRaceOverA = `UTR-RACE-OVER-A-${Date.now()}`;
    const txRefRaceOverB = `UTR-RACE-OVER-B-${Date.now()}`;
    const raceOverResults = await Promise.all([
      FeeRepository.recordFeePayment({
        invoiceId: testInvoiceId,
        amountPaid: 30000,
        paymentMethod: "CHEQUE",
        transactionReference: txRefRaceOverA,
        collectedById: adminUser.id,
      }),
      FeeRepository.recordFeePayment({
        invoiceId: testInvoiceId,
        amountPaid: 30000,
        paymentMethod: "CHEQUE",
        transactionReference: txRefRaceOverB,
        collectedById: adminUser.id,
      }),
    ]);

    const successesOver = raceOverResults.filter((r) => r.success);
    const failuresOver = raceOverResults.filter((r) => !r.success);
    assert(successesOver.length === 1, `Concurrent race exceeding balance: Exactly 1 succeeded (30k accepted)`);
    assert(failuresOver.length === 1, `Concurrent race exceeding balance: Exactly 1 rejected for overpayment`);
    assert(
      Boolean(failuresOver[0]?.error?.includes("exceeds remaining outstanding balance")),
      `Overpayment rejection reason verified: "${failuresOver[0]?.error}"`
    );
    if (successesOver[0]?.data?.receipt?.id) {
      testReceiptIds.push(successesOver[0].data.receipt.id as string);
    }

    // 5. Balance Ledger Invariant Verification
    console.log("\n--- 5. Financial Balance & Ledger Invariant Verification ---");
    // Current state: Demand 80,000. Paid: 20k + 15k + 30k = 65k. Outstanding: 15,000.
    const ledgerCheck1 = await FeeRepository.getStudentFeeLedger(student.id);
    assert(ledgerCheck1.success, "Student fee ledger retrieved");
    const l1 = ledgerCheck1.data;
    assert(l1?.totalDemand === 80000, `Ledger Demand = 80,000 (found ${l1?.totalDemand})`);
    assert(l1?.totalPaid === 65000, `Ledger Total Paid = 65,000 (found ${l1?.totalPaid})`);
    assert(l1?.outstandingBalance === 15000, `Ledger Outstanding = 15,000 (found ${l1?.outstandingBalance})`);
    assert(l1?.feeClearanceStatus === "PARTIALLY_CLEARED", `Clearance Status = PARTIALLY_CLEARED (found ${l1?.feeClearanceStatus})`);

    // Verify mathematical equality with persisted receipts
    const persistedReceipts = await prisma.feeReceipt.findMany({
      where: { invoiceId: testInvoiceId },
    });
    const sumReceipts = persistedReceipts.reduce((acc, r) => acc + r.amountPaid, 0);
    assert(sumReceipts === 65000, `Sum of persisted receipt vouchers = 65,000 (found ${sumReceipts})`);
    assert(sumReceipts === l1?.totalPaid, "Ledger totalPaid identically matches sum of receipt vouchers");
    assert(
      l1?.outstandingBalance === (l1?.totalDemand || 0) - sumReceipts,
      "Ledger outstandingBalance identically matches (totalDemand - sumReceipts)"
    );

    // Final settlement of remaining 15,000
    const txRefSettle = `UTR-SETTLE-${Date.now()}`;
    const paySettle = await FeeRepository.recordFeePayment({
      invoiceId: testInvoiceId,
      amountPaid: 15000,
      paymentMethod: "CARD",
      transactionReference: txRefSettle,
      collectedById: adminUser.id,
    });
    assert(paySettle.success, "Final settlement payment of 15,000 succeeded");
    if (paySettle.data?.receipt?.id) {
      testReceiptIds.push(paySettle.data.receipt.id as string);
    }

    const ledgerCheck2 = await FeeRepository.getStudentFeeLedger(student.id);
    const l2 = ledgerCheck2.data;
    assert(l2?.totalPaid === 80000, `Final Total Paid = 80,000 (found ${l2?.totalPaid})`);
    assert(l2?.outstandingBalance === 0, `Final Outstanding Balance = 0 (found ${l2?.outstandingBalance})`);
    assert(l2?.feeClearanceStatus === "CLEARED", `Final Clearance Status = CLEARED (found ${l2?.feeClearanceStatus})`);

    // Attempt payment on fully settled invoice
    const payPostSettle = await FeeRepository.recordFeePayment({
      invoiceId: testInvoiceId,
      amountPaid: 1000,
      paymentMethod: "CASH",
      transactionReference: `UTR-POST-${Date.now()}`,
      collectedById: adminUser.id,
    });
    assert(!payPostSettle.success, "Post-settlement payment strictly rejected");
    assert(
      Boolean(payPostSettle.error?.includes("already fully cleared")),
      `Post-settlement rejection confirmed: "${payPostSettle.error}"`
    );

    // 6. Identifier and Referential Integrity
    console.log("\n--- 6. Identifier & Relational Integrity ---");
    const finalInvoice = await prisma.studentFeeInvoice.findUnique({
      where: { id: testInvoiceId },
      include: { receipts: true, student: true, enrolment: true, feeStructure: true },
    });
    assert(Boolean(finalInvoice?.invoiceNumber.match(/^INV-\d{4}-\d+$/)), `Invoice number format valid: ${finalInvoice?.invoiceNumber}`);
    assert(finalInvoice?.receipts.length === 4, `Persisted 4 discrete receipts (found ${finalInvoice?.receipts.length})`);
    for (const r of finalInvoice?.receipts || []) {
      assert(Boolean(r.receiptNumber.match(/^REC-\d{4}-\d+$/)), `Receipt format valid: ${r.receiptNumber}`);
      assert(r.collectedById === adminUser.id, `Receipt collecting account correctly logged: ${r.collectedById}`);
      assert(r.studentId === student.id, `Receipt belongs to correct student: ${r.studentId}`);
    }

    // 7. Server-Side Role-Based Authorization Checks
    console.log("\n--- 7. Server-Side RBAC Permissions Matrix ---");
    assert(hasPermission("SYSTEM_ADMIN" as Role, "MANAGE_FEES"), "SYSTEM_ADMIN has MANAGE_FEES");
    assert(hasPermission("SYSTEM_ADMIN" as Role, "COLLECT_FEES"), "SYSTEM_ADMIN has COLLECT_FEES");
    assert(hasPermission("SYSTEM_ADMIN" as Role, "VIEW_FEES"), "SYSTEM_ADMIN has VIEW_FEES");
    assert(hasPermission("ACADEMIC_ADMIN" as Role, "MANAGE_FEES"), "ACADEMIC_ADMIN has MANAGE_FEES");
    assert(hasPermission("ACADEMIC_ADMIN" as Role, "COLLECT_FEES"), "ACADEMIC_ADMIN has COLLECT_FEES");
    assert(!hasPermission("FACULTY_MEMBER" as Role, "COLLECT_FEES"), "FACULTY_MEMBER denied COLLECT_FEES");
    assert(!hasPermission("FACULTY_MEMBER" as Role, "MANAGE_FEES"), "FACULTY_MEMBER denied MANAGE_FEES");
    assert(!hasPermission("STUDENT_VIEWER" as Role, "COLLECT_FEES"), "STUDENT_VIEWER denied COLLECT_FEES");
    assert(!hasPermission("STUDENT_VIEWER" as Role, "MANAGE_FEES"), "STUDENT_VIEWER denied MANAGE_FEES");
    assert(hasPermission("STUDENT_VIEWER" as Role, "VIEW_FEES"), "STUDENT_VIEWER has VIEW_FEES");

  } finally {
    // 8. Surgical Teardown of Test Records
    console.log("\n--- 8. Teardown & Database Invariance Restoration ---");
    if (testReceiptIds.length > 0) {
      await prisma.feeReceipt.deleteMany({
        where: { id: { in: testReceiptIds } },
      });
    }
    if (testInvoiceId) {
      await prisma.studentFeeInvoice.delete({
        where: { id: testInvoiceId },
      });
    }
    if (testStructureId) {
      await prisma.feeHead.deleteMany({
        where: { feeStructureId: testStructureId },
      });
      await prisma.feeStructure.delete({
        where: { id: testStructureId },
      });
    }

    const postCleanup = {
      students: await prisma.student.count(),
      staff: await prisma.staff.count(),
      programmes: await prisma.programme.count(),
      enrolments: await prisma.enrolment.count(),
      feeStructures: await prisma.feeStructure.count(),
      feeInvoices: await prisma.studentFeeInvoice.count(),
      feeReceipts: await prisma.feeReceipt.count(),
    };

    assert(postCleanup.students === baseline.students, `Students baseline preserved: ${postCleanup.students} === ${baseline.students}`);
    assert(postCleanup.staff === baseline.staff, `Staff baseline preserved: ${postCleanup.staff} === ${baseline.staff}`);
    assert(postCleanup.feeStructures === baseline.feeStructures, `FeeStructures preserved: ${postCleanup.feeStructures} === ${baseline.feeStructures}`);
    assert(postCleanup.feeInvoices === baseline.feeInvoices, `FeeInvoices preserved: ${postCleanup.feeInvoices} === ${baseline.feeInvoices}`);
    assert(postCleanup.feeReceipts === baseline.feeReceipts, `FeeReceipts preserved: ${postCleanup.feeReceipts} === ${baseline.feeReceipts}`);
  }

  console.log("\n==================================================================");
  console.log(`FINANCIAL ACCEPTANCE RESULTS: ${passed} PASSED | ${failed} FAILED`);
  console.log("==================================================================");

  if (failed > 0) process.exit(1);
}

runFinancialAcceptanceTests()
  .catch((err) => {
    console.error("Fatal test failure:", err);
    process.exit(1);
  })
  .finally(() => prisma.$disconnect());
