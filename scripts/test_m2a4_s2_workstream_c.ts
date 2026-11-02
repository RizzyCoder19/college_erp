/**
 * ============================================================================
 * CAMPUSOS ERP — MILESTONE 2A.4 STAGE 2: WORKSTREAM C TEST SUITE
 * STUDENT FEE LEDGER, RECEIPTS INTEGRITY, ANTI-DOUBLE-COUNTING & AUTHORIZATION
 * ============================================================================
 *
 * Test Scenarios:
 * 1. Authorization Boundaries:
 *    - Unauthenticated call returns UNAUTHORIZED
 *    - Admin / Staff role calling student action returns FORBIDDEN
 *    - Student account without linked student profile returns UNLINKED_STUDENT
 * 2. Financial Aggregation & Clearance States:
 *    - NOT_INVOICED: Student with no invoices issued
 *    - PENDING_DUES: Student with unpaid invoices (totalPaid === 0)
 *    - PARTIALLY_CLEARED: Student with partial collections (0 < totalPaid < totalDemand)
 *    - CLEARED: Student with full collections (totalPaid >= totalDemand)
 * 3. Anti-Double-Counting Integrity:
 *    - Total paid derived strictly from persisted receipts (sum of amountPaid),
 *      not combining invoice.paidAmount + receipts
 * 4. Overpayment Handling:
 *    - Outstanding balance is bounded at 0: Math.max(0, demand - paid)
 *    - Overpayment credit is accurately preserved: Math.max(0, paid - demand)
 * 5. Single Receipt Voucher & Cross-Student Security:
 *    - Student viewing own receipt receives full voucher data
 *    - Cross-student retrieval rejected with FORBIDDEN
 *    - Missing receipt rejected with NOT_FOUND
 *    - Empty receipt identifier rejected with VALIDATION_FAILED
 * 6. Operational database (prisma/dev.db) SHA-256 invariance verification
 *
 * STRICT REQUIREMENT: Executed against prisma/isolated_test.db
 */

import path from "path";
import fs from "fs";
import crypto from "crypto";

const DEV_DB = path.resolve(process.cwd(), "prisma/dev.db");
const ISOLATED_DB = path.resolve(process.cwd(), "prisma/isolated_test.db");

// Force isolated test database
process.env.DATABASE_URL = `file:${ISOLATED_DB}`;
process.env.APP_ENV = "test";

let totalAssertions = 0;
let passedAssertions = 0;
let failedAssertions = 0;

function setSuite(name: string) {
  console.log(`\n[${name}]`);
}

function assert(condition: boolean, description: string, details?: unknown) {
  totalAssertions++;
  if (condition) {
    passedAssertions++;
    console.log(`  PASS: ${description}`);
  } else {
    failedAssertions++;
    console.error(`  FAIL: ${description}`);
    if (details) {
      console.error(`        Details:`, JSON.stringify(details));
    }
  }
}

async function main() {
  console.log("=================================================================");
  console.log("CAMPUSOS ERP: MILESTONE 2A.4 STAGE 2 WORKSTREAM C TESTS");
  console.log("STUDENT FEE LEDGER, RECEIPTS INTEGRITY & AUTHORIZATION");
  console.log("=================================================================");

  // 1. Check baseline dev.db hash
  const initialDevBuf = fs.readFileSync(DEV_DB);
  const initialHash = crypto.createHash("sha256").update(initialDevBuf).digest("hex").toUpperCase();
  const EXPECTED_HASH = "2F092C9633F565F416051E4551A6D0751DAB601163271D10F3AC49AA0BD0B162";

  setSuite("1. Operational Database Baseline Protection");
  assert(
    initialHash === EXPECTED_HASH,
    `Initial operational database SHA-256 matches protected baseline (${EXPECTED_HASH.slice(0, 8)}...)`,
    { initialHash, EXPECTED_HASH }
  );

  // Dynamic imports after setting DATABASE_URL
  const { default: prisma } = await import("../src/lib/db");
  const { createSession } = await import("../src/lib/auth/session");
  const { setTestSessionToken } = await import("../src/lib/auth/guards");
  const { getStudentSelfFeeLedger, getStudentSelfReceipt } = await import("../src/lib/actions/portalStudent");

  setSuite("2. Isolated Test Database Clean Fixture Setup");

  const testEmails = [
    "ws_c_studentA@rpihm.ac.in",
    "ws_c_studentB@rpihm.ac.in",
    "ws_c_studentC@rpihm.ac.in",
    "ws_c_studentD@rpihm.ac.in",
    "ws_c_studentE@rpihm.ac.in",
    "ws_c_unlinked@rpihm.ac.in",
    "ws_c_cashier@rpihm.ac.in",
  ];

  // Clean prior test fixtures idempotently
  await prisma.feeReceipt.deleteMany({
    where: { student: { email: { in: testEmails } } },
  });
  await prisma.studentFeeInvoice.deleteMany({
    where: { student: { email: { in: testEmails } } },
  });
  await prisma.feeHead.deleteMany({
    where: { feeStructure: { name: { startsWith: "WS_C_" } } },
  });
  await prisma.feeStructure.deleteMany({
    where: { name: { startsWith: "WS_C_" } },
  });
  await prisma.enrolment.deleteMany({
    where: { student: { email: { in: testEmails } } },
  });
  await prisma.userAccount.deleteMany({
    where: { email: { in: testEmails } },
  });
  await prisma.student.deleteMany({
    where: { email: { in: testEmails } },
  });
  await prisma.staff.deleteMany({
    where: { email: { in: testEmails } },
  });

  console.log("  Cleaned previous test fixtures.");

  // Base Academic Structure
  let academicYear = await prisma.academicYear.findFirst({ where: { code: "2026-27" } });
  if (!academicYear) {
    academicYear = await prisma.academicYear.create({
      data: {
        code: "2026-27",
        name: "Academic Year 2026-2027",
        startDate: new Date("2026-07-01"),
        endDate: new Date("2027-06-30"),
      },
    });
  }

  let dept = await prisma.department.findFirst({ where: { code: "HM" } });
  if (!dept) {
    dept = await prisma.department.create({
      data: {
        code: "HM",
        name: "Hospitality Management",
      },
    });
  }

  let programme = await prisma.programme.findFirst({ where: { code: "BHM-FEE" } });
  if (!programme) {
    programme = await prisma.programme.create({
      data: {
        code: "BHM-FEE",
        name: "Bachelor of Hotel Management",
        degreeLevel: "UNDERGRADUATE",
        durationYears: 3,
        departmentId: dept.id,
      },
    });
  }

  let semester1 = await prisma.semester.findFirst({
    where: { programmeId: programme.id, semesterNumber: 1 },
  });
  if (!semester1) {
    semester1 = await prisma.semester.create({
      data: {
        programmeId: programme.id,
        semesterNumber: 1,
        termType: "ODD",
      },
    });
  }

  let divisionA = await prisma.division.findFirst({
    where: { semesterId: semester1.id, name: "Division A" },
  });
  if (!divisionA) {
    divisionA = await prisma.division.create({
      data: {
        semesterId: semester1.id,
        name: "Division A",
        maxCapacity: 60,
      },
    });
  }

  // Create Staff / Cashier
  const cashierStaff = await prisma.staff.create({
    data: {
      employeeId: "RPIHM-FIN-WS-C",
      fullName: "Ramesh Kulkarni",
      email: "ws_c_cashier@rpihm.ac.in",
      phone: "9876543200",
      designation: "Finance Officer",
      category: "ADMINISTRATIVE",
      departmentId: dept!.id,
      dateOfJoining: new Date("2024-01-01"),
      status: "ACTIVE",
    },
  });

  const cashierUser = await prisma.userAccount.create({
    data: {
      email: "ws_c_cashier@rpihm.ac.in",
      fullName: "Ramesh Kulkarni",
      role: "ACADEMIC_ADMIN",
      passwordHash: "dummyhash",
      salt: "dummysalt",
      isActive: true,
      staffId: cashierStaff.id,
    },
  });

  // Create Students:
  // Student A: Partially Paid (Demand 10k, Paid 4k)
  const studentA = await prisma.student.create({
    data: {
      prn: "PRN-WS-C-001",
      rollNumber: "R-WS-C-01",
      fullName: "Aarav Patel",
      email: "ws_c_studentA@rpihm.ac.in",
      phone: "9876543211",
      dob: new Date("2005-03-15"),
      gender: "MALE",
      status: "ACTIVE",
      currentSemester: 1,
    },
  });

  const studentUserA = await prisma.userAccount.create({
    data: {
      email: "ws_c_studentA@rpihm.ac.in",
      fullName: "Aarav Patel",
      role: "STUDENT_VIEWER",
      passwordHash: "dummyhash",
      salt: "dummysalt",
      isActive: true,
      studentId: studentA.id,
    },
  });

  const enrA = await prisma.enrolment.create({
    data: {
      studentId: studentA.id,
      programmeId: programme.id,
      semesterId: semester1.id,
      divisionId: divisionA.id,
      academicYearId: academicYear.id,
      status: "ENROLLED",
      enrolledAt: new Date("2026-07-01"),
    },
  });

  // Student B: Fully Paid (CLEARED, Demand 10k, Paid 10k)
  const studentB = await prisma.student.create({
    data: {
      prn: "PRN-WS-C-002",
      rollNumber: "R-WS-C-02",
      fullName: "Bhavna Shah",
      email: "ws_c_studentB@rpihm.ac.in",
      phone: "9876543212",
      dob: new Date("2005-04-20"),
      gender: "FEMALE",
      status: "ACTIVE",
      currentSemester: 1,
    },
  });

  const studentUserB = await prisma.userAccount.create({
    data: {
      email: "ws_c_studentB@rpihm.ac.in",
      fullName: "Bhavna Shah",
      role: "STUDENT_VIEWER",
      passwordHash: "dummyhash",
      salt: "dummysalt",
      isActive: true,
      studentId: studentB.id,
    },
  });

  const enrB = await prisma.enrolment.create({
    data: {
      studentId: studentB.id,
      programmeId: programme.id,
      semesterId: semester1.id,
      divisionId: divisionA.id,
      academicYearId: academicYear.id,
      status: "ENROLLED",
      enrolledAt: new Date("2026-07-01"),
    },
  });

  // Student C: Enrolled, No Invoices (NOT_INVOICED)
  const studentC = await prisma.student.create({
    data: {
      prn: "PRN-WS-C-003",
      rollNumber: "R-WS-C-03",
      fullName: "Chetan Rao",
      email: "ws_c_studentC@rpihm.ac.in",
      phone: "9876543213",
      dob: new Date("2005-05-10"),
      gender: "MALE",
      status: "ACTIVE",
      currentSemester: 1,
    },
  });

  const studentUserC = await prisma.userAccount.create({
    data: {
      email: "ws_c_studentC@rpihm.ac.in",
      fullName: "Chetan Rao",
      role: "STUDENT_VIEWER",
      passwordHash: "dummyhash",
      salt: "dummysalt",
      isActive: true,
      studentId: studentC.id,
    },
  });

  await prisma.enrolment.create({
    data: {
      studentId: studentC.id,
      programmeId: programme.id,
      semesterId: semester1.id,
      divisionId: divisionA.id,
      academicYearId: academicYear.id,
      status: "ENROLLED",
      enrolledAt: new Date("2026-07-01"),
    },
  });

  // Student D: Enrolled, Unpaid Invoice (PENDING_DUES)
  const studentD = await prisma.student.create({
    data: {
      prn: "PRN-WS-C-004",
      rollNumber: "R-WS-C-04",
      fullName: "Divya Nair",
      email: "ws_c_studentD@rpihm.ac.in",
      phone: "9876543214",
      dob: new Date("2005-06-12"),
      gender: "FEMALE",
      status: "ACTIVE",
      currentSemester: 1,
    },
  });

  const studentUserD = await prisma.userAccount.create({
    data: {
      email: "ws_c_studentD@rpihm.ac.in",
      fullName: "Divya Nair",
      role: "STUDENT_VIEWER",
      passwordHash: "dummyhash",
      salt: "dummysalt",
      isActive: true,
      studentId: studentD.id,
    },
  });

  const enrD = await prisma.enrolment.create({
    data: {
      studentId: studentD.id,
      programmeId: programme.id,
      semesterId: semester1.id,
      divisionId: divisionA.id,
      academicYearId: academicYear.id,
      status: "ENROLLED",
      enrolledAt: new Date("2026-07-01"),
    },
  });

  // Student E: Overpayment Case (Demand 10k, Paid 12k -> Credit 2k)
  const studentE = await prisma.student.create({
    data: {
      prn: "PRN-WS-C-005",
      rollNumber: "R-WS-C-05",
      fullName: "Eshaan Joshi",
      email: "ws_c_studentE@rpihm.ac.in",
      phone: "9876543215",
      dob: new Date("2005-07-18"),
      gender: "MALE",
      status: "ACTIVE",
      currentSemester: 1,
    },
  });

  const studentUserE = await prisma.userAccount.create({
    data: {
      email: "ws_c_studentE@rpihm.ac.in",
      fullName: "Eshaan Joshi",
      role: "STUDENT_VIEWER",
      passwordHash: "dummyhash",
      salt: "dummysalt",
      isActive: true,
      studentId: studentE.id,
    },
  });

  const enrE = await prisma.enrolment.create({
    data: {
      studentId: studentE.id,
      programmeId: programme.id,
      semesterId: semester1.id,
      divisionId: divisionA.id,
      academicYearId: academicYear.id,
      status: "ENROLLED",
      enrolledAt: new Date("2026-07-01"),
    },
  });

  // Student Unlinked: STUDENT_VIEWER with no studentId
  const unlinkedUser = await prisma.userAccount.create({
    data: {
      email: "ws_c_unlinked@rpihm.ac.in",
      fullName: "Unlinked Account",
      role: "STUDENT_VIEWER",
      passwordHash: "dummyhash",
      salt: "dummysalt",
      isActive: true,
    },
  });

  // Create Fee Structure: Semester 1 Fees
  const feeStructure = await prisma.feeStructure.create({
    data: {
      academicYearId: academicYear.id,
      programmeId: programme.id,
      semesterNumber: 1,
      name: "WS_C_BHM Semester 1 Tuition & Lab Fees (2026-27)",
      totalAmount: 10000,
      feeHeads: {
        create: [
          { headName: "Tuition Fee", amount: 7000 },
          { headName: "Culinary Lab & Kitchen Fee", amount: 2000 },
          { headName: "Student Welfare & Activity Fee", amount: 1000 },
        ],
      },
    },
  });

  // Create Invoices:
  // Invoice A: Student A (Demand 10,000, Paid 4,000)
  const invA = await prisma.studentFeeInvoice.create({
    data: {
      invoiceNumber: "INV-WS-C-001",
      studentId: studentA.id,
      enrolmentId: enrA.id,
      feeStructureId: feeStructure.id,
      totalDemand: 10000,
      dueDate: new Date("2026-08-31"),
      status: "PARTIALLY_PAID",
      generatedById: cashierUser.id,
    },
  });

  const receiptA = await prisma.feeReceipt.create({
    data: {
      receiptNumber: "REC-WS-C-001",
      invoiceId: invA.id,
      studentId: studentA.id,
      amountPaid: 4000,
      paymentDate: new Date("2026-07-15"),
      paymentMethod: "UPI",
      transactionReference: "UPI-RPIHM-99887766",
      payerName: "Aarav Patel",
      remarks: "Semester 1 first instalment via GPay",
      collectedById: cashierUser.id,
    },
  });

  // Invoice B: Student B (Demand 10,000, Paid 10,000)
  const invB = await prisma.studentFeeInvoice.create({
    data: {
      invoiceNumber: "INV-WS-C-002",
      studentId: studentB.id,
      enrolmentId: enrB.id,
      feeStructureId: feeStructure.id,
      totalDemand: 10000,
      dueDate: new Date("2026-08-31"),
      status: "PAID",
      generatedById: cashierUser.id,
    },
  });

  await prisma.feeReceipt.create({
    data: {
      receiptNumber: "REC-WS-C-002",
      invoiceId: invB.id,
      studentId: studentB.id,
      amountPaid: 10000,
      paymentDate: new Date("2026-07-10"),
      paymentMethod: "NEFT_RTGS",
      transactionReference: "NEFT-HDFC-11223344",
      payerName: "Bhavna Shah",
      remarks: "Full fee settlement",
      collectedById: cashierUser.id,
    },
  });

  // Invoice D: Student D (Demand 10,000, Unpaid)
  await prisma.studentFeeInvoice.create({
    data: {
      invoiceNumber: "INV-WS-C-004",
      studentId: studentD.id,
      enrolmentId: enrD.id,
      feeStructureId: feeStructure.id,
      totalDemand: 10000,
      dueDate: new Date("2026-08-31"),
      status: "PENDING",
      generatedById: cashierUser.id,
    },
  });

  // Invoice E: Student E (Demand 10,000, Paid 12,000 via 2 receipts)
  const invE = await prisma.studentFeeInvoice.create({
    data: {
      invoiceNumber: "INV-WS-C-005",
      studentId: studentE.id,
      enrolmentId: enrE.id,
      feeStructureId: feeStructure.id,
      totalDemand: 10000,
      dueDate: new Date("2026-08-31"),
      status: "PAID",
      generatedById: cashierUser.id,
    },
  });

  await prisma.feeReceipt.create({
    data: {
      receiptNumber: "REC-WS-C-005A",
      invoiceId: invE.id,
      studentId: studentE.id,
      amountPaid: 10000,
      paymentDate: new Date("2026-07-05"),
      paymentMethod: "NEFT_RTGS",
      transactionReference: "NEFT-SBI-55443322",
      payerName: "Eshaan Joshi",
      remarks: "Full payment",
      collectedById: cashierUser.id,
    },
  });

  await prisma.feeReceipt.create({
    data: {
      receiptNumber: "REC-WS-C-005B",
      invoiceId: invE.id,
      studentId: studentE.id,
      amountPaid: 2000,
      paymentDate: new Date("2026-07-20"),
      paymentMethod: "UPI",
      transactionReference: "UPI-PAYTM-66778899",
      payerName: "Eshaan Joshi",
      remarks: "Additional advance fee credit",
      collectedById: cashierUser.id,
    },
  });

  console.log("  Seeded fee structures, invoices, and payment receipts.");

  // Create Sessions for test calls:
  const sessionUserA = await createSession(studentUserA.id);
  const sessionUserB = await createSession(studentUserB.id);
  const sessionUserC = await createSession(studentUserC.id);
  const sessionUserD = await createSession(studentUserD.id);
  const sessionUserE = await createSession(studentUserE.id);
  const sessionUnlinked = await createSession(unlinkedUser.id);
  const sessionCashier = await createSession(cashierUser.id);

  // -------------------------------------------------------------
  // SUITE 3: Authorization & Session Boundaries
  // -------------------------------------------------------------
  setSuite("3. Authorization & Session Boundaries");

  // 3.1 Unauthenticated access
  setTestSessionToken(null);
  const unauthRes = await getStudentSelfFeeLedger();
  assert(
    !unauthRes.success && unauthRes.code === "UNAUTHORIZED",
    "Unauthenticated fee ledger request rejected with UNAUTHORIZED"
  );

  // 3.2 Non-student role rejection (cashier / ACADEMIC_ADMIN)
  setTestSessionToken(sessionCashier.token);
  const forbiddenRes = await getStudentSelfFeeLedger();
  assert(
    !forbiddenRes.success && forbiddenRes.code === "FORBIDDEN",
    "Staff / Admin account attempting to call student fee action rejected with FORBIDDEN"
  );

  // 3.3 Student without linked student profile
  setTestSessionToken(sessionUnlinked.token);
  const unlinkedRes = await getStudentSelfFeeLedger();
  assert(
    !unlinkedRes.success && unlinkedRes.code === "UNLINKED_STUDENT",
    "Student account without linked student record rejected with UNLINKED_STUDENT"
  );

  // -------------------------------------------------------------
  // SUITE 4: Student C — NOT_INVOICED State
  // -------------------------------------------------------------
  setSuite("4. Financial Aggregation: NOT_INVOICED State (Student C)");

  setTestSessionToken(sessionUserC.token);
  const resC = await getStudentSelfFeeLedger();
  assert(resC.success, "Student C fee ledger retrieved successfully");
  if (resC.success && resC.data) {
    assert(
      resC.data.summary.feeClearanceStatus === "NOT_INVOICED",
      "Clearance state is NOT_INVOICED when no invoices exist",
      { status: resC.data.summary.feeClearanceStatus }
    );
    assert(
      resC.data.summary.totalDemand === 0 &&
      resC.data.summary.totalPaid === 0 &&
      resC.data.summary.outstandingBalance === 0 &&
      resC.data.summary.overpaymentCredit === 0,
      "Zero demand, zero paid, zero outstanding, and zero credit for un-invoiced student",
      resC.data.summary
    );
    assert(
      resC.data.invoices.length === 0,
      "Invoices list is empty array without simulated entries"
    );
  }

  // -------------------------------------------------------------
  // SUITE 5: Student D — PENDING_DUES State (Unpaid Invoice)
  // -------------------------------------------------------------
  setSuite("5. Financial Aggregation: PENDING_DUES State (Student D)");

  setTestSessionToken(sessionUserD.token);
  const resD = await getStudentSelfFeeLedger();
  assert(resD.success, "Student D fee ledger retrieved successfully");
  if (resD.success && resD.data) {
    assert(
      resD.data.summary.feeClearanceStatus === "PENDING_DUES",
      "Clearance state is PENDING_DUES when unpaid invoices exist and totalPaid is 0",
      { status: resD.data.summary.feeClearanceStatus }
    );
    assert(
      resD.data.summary.totalDemand === 10000 &&
      resD.data.summary.totalPaid === 0 &&
      resD.data.summary.outstandingBalance === 10000 &&
      resD.data.summary.overpaymentCredit === 0,
      "Total demand 10,000, total paid 0, outstanding 10,000 for unpaid student",
      resD.data.summary
    );
    assert(
      resD.data.invoices.length === 1 && resD.data.invoices[0].receipts.length === 0,
      "Single invoice with 0 receipts attached"
    );
  }

  // -------------------------------------------------------------
  // SUITE 6: Student A — PARTIALLY_CLEARED State (Demand 10k, Paid 4k)
  // -------------------------------------------------------------
  setSuite("6. Financial Aggregation: PARTIALLY_CLEARED State (Student A)");

  setTestSessionToken(sessionUserA.token);
  const resA = await getStudentSelfFeeLedger();
  assert(resA.success, "Student A fee ledger retrieved successfully");
  if (resA.success && resA.data) {
    assert(
      resA.data.summary.feeClearanceStatus === "PARTIALLY_CLEARED",
      "Clearance state is PARTIALLY_CLEARED when 0 < totalPaid < totalDemand",
      { status: resA.data.summary.feeClearanceStatus }
    );
    assert(
      resA.data.summary.totalDemand === 10000 &&
      resA.data.summary.totalPaid === 4000 &&
      resA.data.summary.outstandingBalance === 6000 &&
      resA.data.summary.overpaymentCredit === 0,
      "Total demand 10,000, total paid 4,000, outstanding 6,000",
      resA.data.summary
    );
    assert(
      resA.data.invoices.length === 1 && resA.data.invoices[0].receipts.length === 1,
      "Single invoice with exactly 1 receipt attached"
    );
    assert(
      resA.data.invoices[0].feeHeads.length === 3,
      "Fee components / heads breakdown is populated (Tuition, Lab, Welfare)"
    );
  }

  // -------------------------------------------------------------
  // SUITE 7: Student B — CLEARED State (Demand 10k, Paid 10k)
  // -------------------------------------------------------------
  setSuite("7. Financial Aggregation: CLEARED State (Student B)");

  setTestSessionToken(sessionUserB.token);
  const resB = await getStudentSelfFeeLedger();
  assert(resB.success, "Student B fee ledger retrieved successfully");
  if (resB.success && resB.data) {
    assert(
      resB.data.summary.feeClearanceStatus === "CLEARED",
      "Clearance state is CLEARED when totalPaid matches totalDemand exactly",
      { status: resB.data.summary.feeClearanceStatus }
    );
    assert(
      resB.data.summary.totalDemand === 10000 &&
      resB.data.summary.totalPaid === 10000 &&
      resB.data.summary.outstandingBalance === 0 &&
      resB.data.summary.overpaymentCredit === 0,
      "Total demand 10,000, total paid 10,000, outstanding balance is 0",
      resB.data.summary
    );
  }

  // -------------------------------------------------------------
  // SUITE 8: Student E — Overpayment Handling (Demand 10k, Paid 12k)
  // -------------------------------------------------------------
  setSuite("8. Overpayment Handling & Anti-Double-Counting (Student E)");

  setTestSessionToken(sessionUserE.token);
  const resE = await getStudentSelfFeeLedger();
  assert(resE.success, "Student E fee ledger retrieved successfully");
  if (resE.success && resE.data) {
    assert(
      resE.data.summary.feeClearanceStatus === "CLEARED",
      "Clearance state is CLEARED when totalPaid exceeds totalDemand",
      { status: resE.data.summary.feeClearanceStatus }
    );
    assert(
      resE.data.summary.totalDemand === 10000 &&
      resE.data.summary.totalPaid === 12000,
      "Demand 10,000 and total paid 12,000 derived correctly from multiple receipts",
      resE.data.summary
    );
    assert(
      resE.data.summary.outstandingBalance === 0,
      "Outstanding balance is safely bounded at 0 (Math.max(0, demand - paid))",
      { outstanding: resE.data.summary.outstandingBalance }
    );
    assert(
      resE.data.summary.overpaymentCredit === 2000,
      "Overpayment credit is accurately calculated as 2,000 (Math.max(0, paid - demand))",
      { overpaymentCredit: resE.data.summary.overpaymentCredit }
    );
    assert(
      resE.data.invoices[0].receipts.length === 2,
      "Both receipts (10,000 + 2,000) are listed under the invoice without double-counting",
      { receiptsCount: resE.data.invoices[0].receipts.length }
    );
  }

  // -------------------------------------------------------------
  // SUITE 9: Receipt Voucher Action & Cross-Student Isolation
  // -------------------------------------------------------------
  setSuite("9. Receipt Voucher Action & Cross-Student Isolation");

  // 9.1 Student A can view own receipt (REC-WS-C-001)
  setTestSessionToken(sessionUserA.token);
  const receiptResA = await getStudentSelfReceipt(receiptA.id);
  assert(receiptResA.success, "Student A successfully retrieves own receipt voucher");
  if (receiptResA.success && receiptResA.data) {
    assert(
      receiptResA.data.receiptNumber === "REC-WS-C-001" &&
      receiptResA.data.amountPaid === 4000 &&
      receiptResA.data.paymentMethod === "UPI" &&
      receiptResA.data.transactionReference === "UPI-RPIHM-99887766",
      "Receipt voucher fields match persisted transaction record exactly",
      receiptResA.data
    );
    assert(
      receiptResA.data.student.fullName === "Aarav Patel" &&
      receiptResA.data.student.rollNumber === "R-WS-C-01",
      "Student identity linked to receipt is accurate"
    );
    assert(
      receiptResA.data.collectedByName === "Ramesh Kulkarni",
      "Cashier / CollectedBy staff name is resolved accurately"
    );
  }

  // 9.2 Cross-student security: Student B attempts to retrieve Student A's receipt
  setTestSessionToken(sessionUserB.token);
  const crossStudentRes = await getStudentSelfReceipt(receiptA.id);
  assert(
    !crossStudentRes.success && crossStudentRes.code === "FORBIDDEN",
    "Cross-student receipt access strictly rejected with FORBIDDEN",
    crossStudentRes
  );

  // 9.3 Non-existent receipt ID
  setTestSessionToken(sessionUserA.token);
  const notFoundRes = await getStudentSelfReceipt("non-existent-rec-id");
  assert(
    !notFoundRes.success && notFoundRes.code === "NOT_FOUND",
    "Query for non-existent receipt identifier rejected with NOT_FOUND"
  );

  // 9.4 Empty / blank receipt ID
  const invalidRes = await getStudentSelfReceipt("   ");
  assert(
    !invalidRes.success && invalidRes.code === "VALIDATION_FAILED",
    "Blank receipt identifier rejected with VALIDATION_FAILED"
  );

  // -------------------------------------------------------------
  // SUITE 10: Final Operational Database Invariance Check
  // -------------------------------------------------------------
  setSuite("10. Final Operational Database Invariance Check");
  const finalDevBuf = fs.readFileSync(DEV_DB);
  const finalHash = crypto.createHash("sha256").update(finalDevBuf).digest("hex").toUpperCase();

  assert(
    finalHash === EXPECTED_HASH,
    `Final operational database SHA-256 remains 100% INVARIANT (${EXPECTED_HASH.slice(0, 8)}...)`,
    { finalHash, EXPECTED_HASH }
  );

  // Summary
  console.log("\n=================================================================");
  console.log(`WORKSTREAM C TEST RESULTS: ${passedAssertions}/${totalAssertions} PASSED (${failedAssertions} FAILED)`);
  console.log("=================================================================");

  if (failedAssertions > 0) {
    process.exit(1);
  }
}

main()
  .catch((err) => {
    console.error("Test execution encountered an unhandled exception:", err);
    process.exit(1);
  })
  .finally(async () => {
    const { default: prisma } = await import("../src/lib/db");
    await prisma.$disconnect();
  });
