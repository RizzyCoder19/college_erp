/**
 * Automated Verification Suite for Milestone 2A.2
 * Scope: Student Admission, Enrolment Lifecycle & Cohort Progression
 * Target: Isolated Test Database (prisma/isolated_test.db)
 */

import path from "path";
import fs from "fs";
import crypto from "crypto";

// 1. Enforce isolated database environment before any Prisma client module is loaded
const ISOLATED_DB_PATH = path.resolve(process.cwd(), "prisma/isolated_test.db");
const OPERATIONAL_DB_PATH = path.resolve(process.cwd(), "prisma/dev.db");

// Record baseline operational database hash before test execution
const baselineOperationalHash = crypto
  .createHash("sha256")
  .update(fs.readFileSync(OPERATIONAL_DB_PATH))
  .digest("hex");

// Refresh isolated test database from dev.db snapshot to ensure exact replica
fs.copyFileSync(OPERATIONAL_DB_PATH, ISOLATED_DB_PATH);
process.env.DATABASE_URL = `file:${ISOLATED_DB_PATH}`;

interface TestResult {
  name: string;
  passed: boolean;
  error?: string;
  details?: unknown;
}

const results: TestResult[] = [];

function assert(condition: boolean, name: string, details?: unknown) {
  if (condition) {
    results.push({ name, passed: true, details });
    console.log(`  [PASS] ${name}`);
  } else {
    results.push({ name, passed: false, error: "Assertion failed", details });
    console.error(`  [FAIL] ${name}`, details);
  }
}

async function runSuite() {
  console.log("\n========================================================");
  console.log("   CAMPUSOS — MILESTONE 2A.2 AUTOMATED VERIFICATION");
  console.log("========================================================\n");

  const { default: prisma } = await import("../src/lib/db");
  const { StudentRepository } = await import("../src/lib/dal/studentRepository");
  const {
    previewCohortProgressionAction,
    executeCohortProgressionAction,
    progressSingleStudentAction,
  } = await import("../src/lib/actions/students");

  // SUITE 1: DATABASE ISOLATION & PRE-FLIGHT
  console.log("--- SUITE 1: Database Isolation & Pre-Flight ---");
  const dbList = await prisma.$queryRaw<Array<{ seq: number; name: string; file: string }>>`PRAGMA database_list;`;
  const activeDbFile = dbList[0]?.file || "";
  assert(
    activeDbFile.toLowerCase().includes("isolated_test.db"),
    "T1.1: Active database connection is strictly bound to isolated_test.db",
    { activeDbFile }
  );
  assert(
    !activeDbFile.toLowerCase().endsWith("dev.db"),
    "T1.2: Operational database dev.db is protected from test mutations",
    { activeDbFile }
  );

  // SUITE 2: PREFLIGHT CORRECTIONS VERIFICATION
  console.log("\n--- SUITE 2: Preflight Corrections Verification ---");
  // A. Dev-Login Production Rejection
  const originalEnv = process.env.NODE_ENV;
  try {
    (process.env as Record<string, string | undefined>).NODE_ENV = "production";
    const { GET, POST } = await import("../src/app/api/dev-login/route");
    const req = new Request("http://localhost:3000/api/dev-login?token=xyz");
    const getRes = await GET(req as unknown as import("next/server").NextRequest);
    assert(
      getRes.status === 404,
      "T2.1: Dev-login GET route returns 404 in production environment",
      { status: getRes.status }
    );
    const postRes = await POST();
    assert(
      postRes.status === 404,
      "T2.2: Dev-login POST route returns 404 in production environment",
      { status: postRes.status }
    );
  } finally {
    (process.env as Record<string, string | undefined>).NODE_ENV = originalEnv;
  }

  // B. Attendance Formula Consistency & Advisory Benchmark
  const aaravDossier = await StudentRepository.getStudentDossier360("2026DS039");
  assert(aaravDossier.success && Boolean(aaravDossier.data), "T2.3: Aarav Sharma dossier loaded successfully");
  if (aaravDossier.success && aaravDossier.data) {
    const policyNote = aaravDossier.data.attendance.summary.policyNote;
    assert(
      policyNote.includes("Rate = (Present + Late) / Total Opportunities (Held)"),
      "T2.4: Attendance formula explicitly documents (Present + Late) / Total Opportunities",
      { policyNote }
    );
    assert(
      policyNote.includes("institutional advisory guideline"),
      "T2.5: 75% attendance threshold correctly documented as institutional advisory guideline (not statutory)",
      { policyNote }
    );
  }

  // SUITE 3: STUDENT ADMISSION & REGISTRATION WORKFLOW
  console.log("\n--- SUITE 3: Student Admission & Registration Workflow ---");
  const testAy = await prisma.academicYear.findFirst({ where: { isCurrent: true } });
  assert(Boolean(testAy), "T3.1: Active academic year located in isolated database", { testAy });
  const ayId = testAy!.id;

  const bscDs = await prisma.programme.findFirst({
    where: { code: "BSCDS-AI" },
    include: {
      semesters: {
        where: { semesterNumber: 1 },
        include: { divisions: true },
      },
    },
  });
  assert(Boolean(bscDs && bscDs.semesters.length > 0), "T3.2: B.Sc. DS Semester 1 located in database");
  const sem1 = bscDs!.semesters[0];
  const divA = sem1.divisions[0];
  assert(Boolean(divA), "T3.3: Division located for Semester 1", { divA });

  // 3.4 Valid Student Registration with Atomic Enrolment
  const newStudentPrn = "2026TEST099";
  const newStudentRoll = "RPIHM-2026TEST099";
  const newStudentEmail = "test.admit99@rpihm.edu.in";

  const admitRes = await StudentRepository.createStudentWithEnrolment({
    fullName: "Rohan V. Deshmukh",
    prn: newStudentPrn,
    rollNumber: newStudentRoll,
    email: newStudentEmail,
    phone: "+91 9876543210",
    dob: new Date("2006-03-12"),
    status: "PROVISIONAL",
    programmeId: bscDs!.id,
    semesterId: sem1.id,
    divisionId: divA.id,
    academicYearId: ayId,
  });

  assert(admitRes.success, "T3.4: Student registered successfully with atomic enrolment", admitRes);
  const admittedStudentId = admitRes.data?.student.id;
  assert(Boolean(admittedStudentId), "T3.5: Registered student assigned UUID primary key", { admittedStudentId });

  // Verify status is PROVISIONAL
  const persistedStudent = await prisma.student.findUnique({
    where: { id: admittedStudentId },
    include: { enrolments: true },
  });
  assert(
    persistedStudent?.status === "PROVISIONAL",
    "T3.6: Provisional admission status correctly persisted on student record",
    { status: persistedStudent?.status }
  );
  assert(
    persistedStudent?.enrolments.length === 1 && persistedStudent.enrolments[0].status === "ENROLLED",
    "T3.7: Initial enrolment record created with status ENROLLED",
    { enrolment: persistedStudent?.enrolments[0] }
  );

  // 3.8 Prevent Duplicate PRN
  const dupPrnRes = await StudentRepository.createStudentWithEnrolment({
    fullName: "Duplicate PRN Test",
    prn: newStudentPrn,
    rollNumber: "RPIHM-UNIQUE-001",
    email: "unique1@rpihm.edu.in",
    phone: "+91 9876500001",
    dob: new Date("2006-01-01"),
    programmeId: bscDs!.id,
    semesterId: sem1.id,
    divisionId: divA.id,
    academicYearId: ayId,
  });
  assert(
    !dupPrnRes.success && dupPrnRes.code === "DUPLICATE_PRN",
    "T3.8: Registration prevents duplicate PRN with DUPLICATE_PRN error code",
    dupPrnRes
  );

  // 3.9 Prevent Duplicate Roll Number
  const dupRollRes = await StudentRepository.createStudentWithEnrolment({
    fullName: "Duplicate Roll Test",
    prn: "UNIQUE-PRN-002",
    rollNumber: newStudentRoll,
    email: "unique2@rpihm.edu.in",
    phone: "+91 9876500002",
    dob: new Date("2006-01-01"),
    programmeId: bscDs!.id,
    semesterId: sem1.id,
    divisionId: divA.id,
    academicYearId: ayId,
  });
  assert(
    !dupRollRes.success && dupRollRes.code === "DUPLICATE_ROLL",
    "T3.9: Registration prevents duplicate Roll Number with DUPLICATE_ROLL error code",
    dupRollRes
  );

  // 3.10 Prevent Invalid Placement Hierarchy (Wrong Division)
  const otherSemDiv = await prisma.division.findFirst({
    where: { semesterId: { not: sem1.id } },
  });
  if (otherSemDiv) {
    const invalidPlacementRes = await StudentRepository.createStudentWithEnrolment({
      fullName: "Invalid Placement Test",
      prn: "2026TEST100",
      rollNumber: "RPIHM-2026TEST100",
      email: "invalid.placement@rpihm.edu.in",
      phone: "+91 9876500003",
      dob: new Date("2006-01-01"),
      programmeId: bscDs!.id,
      semesterId: sem1.id,
      divisionId: otherSemDiv.id, // Division belongs to another semester
      academicYearId: ayId,
    });
    assert(
      !invalidPlacementRes.success,
      "T3.10: Registration rejects invalid division-semester placement hierarchy",
      invalidPlacementRes
    );
  }

  // SUITE 4: ENROLMENT LIFECYCLE & HISTORICAL PRESERVATION
  console.log("\n--- SUITE 4: Enrolment Lifecycle & History Preservation ---");
  // Locate Sem 2 for progression
  const sem2 = await prisma.semester.findFirst({
    where: { programmeId: bscDs!.id, semesterNumber: 2 },
    include: { divisions: true },
  });
  assert(Boolean(sem2 && sem2.divisions.length > 0), "T4.1: Destination Semester 2 and division located");
  const sem2Div = sem2!.divisions[0];

  // 4.2 Single Student Semester Progression
  const progressRes = await StudentRepository.progressSingleStudent({
    studentId: admittedStudentId!,
    destinationAcademicYearId: ayId,
    destinationSemesterId: sem2!.id,
    destinationDivisionId: sem2Div.id,
  });

  assert(progressRes.success, "T4.2: Single student progressed to Semester 2 successfully", progressRes);

  // 4.3 Verify Historical Preservation on Dossier
  const dossierAfterProg = await StudentRepository.getStudentDossier360(admittedStudentId!);
  assert(dossierAfterProg.success && Boolean(dossierAfterProg.data), "T4.3: Dossier retrieved post-progression");
  if (dossierAfterProg.success && dossierAfterProg.data) {
    const d = dossierAfterProg.data;
    assert(
      d.student.currentSemester === 2,
      "T4.4: Student master currentSemester updated to 2",
      { currentSemester: d.student.currentSemester }
    );
    assert(
      d.activePlacement?.semesterNumber === 2,
      "T4.5: Active placement reflects Semester 2",
      { activePlacement: d.activePlacement }
    );
    assert(
      d.enrolments.length === 2,
      "T4.6: Historical enrolments count preserved (exactly 2 enrolments: Sem 1 and Sem 2)",
      { enrolmentsCount: d.enrolments.length }
    );
    const sem1Enr = d.enrolments.find((e) => e.semester.semesterNumber === 1);
    const sem2Enr = d.enrolments.find((e) => e.semester.semesterNumber === 2);
    assert(
      sem1Enr?.status === "COMPLETED",
      "T4.7: Historical Semester 1 enrolment archived as COMPLETED",
      { sem1Status: sem1Enr?.status }
    );
    assert(
      sem2Enr?.status === "ENROLLED",
      "T4.8: New Semester 2 enrolment active with status ENROLLED",
      { sem2Status: sem2Enr?.status }
    );
  }

  // 4.9 In-Place Division Update within Same Semester
  const sem2DivB = sem2!.divisions.length > 1 ? sem2!.divisions[1] : null;
  if (sem2DivB) {
    const divUpdateRes = await StudentRepository.updateStudent(admittedStudentId!, {
      divisionId: sem2DivB.id,
      semesterId: sem2!.id,
      programmeId: bscDs!.id,
    });
    assert(divUpdateRes.success, "T4.9: In-place division update within same semester succeeded");
    const dossierAfterDiv = await StudentRepository.getStudentDossier360(admittedStudentId!);
    if (dossierAfterDiv.success && dossierAfterDiv.data) {
      assert(
        dossierAfterDiv.data.enrolments.length === 2,
        "T4.10: In-place division update does NOT generate duplicate enrolment (remains 2)",
        { count: dossierAfterDiv.data.enrolments.length }
      );
      assert(
        dossierAfterDiv.data.activePlacement?.divisionId === sem2DivB.id,
        "T4.11: Active placement updated to new division",
        { divisionId: dossierAfterDiv.data.activePlacement?.divisionId }
      );
    }
  }

  // SUITE 5: COHORT PROGRESSION TRANSACTIONAL WORKFLOW
  console.log("\n--- SUITE 5: Cohort Progression Transactional Workflow ---");

  // 5.1 Preview Candidates for Cohort Progression
  const previewRes = await StudentRepository.previewCohortProgression({
    programmeId: bscDs!.id,
    semesterId: sem2!.id,
    academicYearId: ayId,
  });

  assert(previewRes.success && Boolean(previewRes.data), "T5.1: Cohort progression preview generated successfully");
  if (previewRes.success && previewRes.data) {
    const p = previewRes.data;
    assert(
      p.destinationSemester?.semesterNumber === 3,
      "T5.2: Destination semester auto-calculated as Semester 3",
      { destSem: p.destinationSemester }
    );
    assert(
      p.availableDestinationDivisions.length > 0,
      "T5.3: Available divisions for destination semester enumerated",
      { divisions: p.availableDestinationDivisions }
    );
    const candidate = p.candidates.find((c) => c.id === admittedStudentId);
    assert(
      Boolean(candidate),
      "T5.4: Test student present in cohort candidates list",
      { candidate }
    );
    assert(
      candidate?.isEligible === true,
      "T5.5: Test student evaluated as eligible for progression",
      { isEligible: candidate?.isEligible }
    );
  }

  // 5.6 Create second candidate student in Sem 2 for batch testing
  const batchStudent2 = await StudentRepository.createStudentWithEnrolment({
    fullName: "Pooja K. Patil",
    prn: "2026TEST101",
    rollNumber: "RPIHM-2026TEST101",
    email: "pooja.patil101@rpihm.edu.in",
    phone: "+91 9876500004",
    dob: new Date("2006-07-22"),
    status: "ACTIVE",
    programmeId: bscDs!.id,
    semesterId: sem2!.id,
    divisionId: sem2!.divisions[0].id,
    academicYearId: ayId,
  });
  assert(batchStudent2.success, "T5.6: Second candidate student registered in Sem 2");
  const student2Id = batchStudent2.data!.student.id;

  // 5.7 Locate Semester 3
  const sem3 = await prisma.semester.findFirst({
    where: { programmeId: bscDs!.id, semesterNumber: 3 },
    include: { divisions: true },
  });
  assert(Boolean(sem3 && sem3.divisions.length > 0), "T5.7: Semester 3 located for cohort batch destination");
  const sem3Div = sem3!.divisions[0];

  // 5.8 Execute Transactional Cohort Progression for Both Students
  const batchExecRes = await StudentRepository.executeCohortProgression({
    studentIds: [admittedStudentId!, student2Id],
    sourceSemesterId: sem2!.id,
    destinationAcademicYearId: ayId,
    destinationSemesterId: sem3!.id,
    destinationDivisionId: sem3Div.id,
  });

  assert(batchExecRes.success, "T5.8: Transactional batch cohort progression succeeded", batchExecRes);
  if (batchExecRes.success && batchExecRes.data) {
    assert(
      batchExecRes.data.successfulIds.length === 2,
      "T5.9: Both students progressed to Semester 3",
      { successfulIds: batchExecRes.data.successfulIds }
    );
    assert(
      batchExecRes.data.failedRecords.length === 0,
      "T5.10: Zero batch failures recorded",
      { failedRecords: batchExecRes.data.failedRecords }
    );
  }

  // 5.11 Verify Duplicate Destination Enrolment Prevention
  const dupProgRes = await StudentRepository.executeCohortProgression({
    studentIds: [admittedStudentId!],
    sourceSemesterId: sem2!.id,
    destinationAcademicYearId: ayId,
    destinationSemesterId: sem3!.id,
    destinationDivisionId: sem3Div.id,
  });
  assert(
    Boolean(
      dupProgRes.success &&
        dupProgRes.data?.failedRecords.some((f) => f.reason.includes("Already enrolled"))
    ),
    "T5.11: Repeat progression cleanly rejects duplicate active enrolment in destination",
    dupProgRes
  );

  // 5.12 Transactional Rollback on Critical Failure
  // Passing an invalid destination division should cause an error and abort without touching any student
  const beforeCount = await prisma.enrolment.count();
  const invalidBatchRes = await StudentRepository.executeCohortProgression({
    studentIds: [student2Id],
    sourceSemesterId: sem3!.id,
    destinationAcademicYearId: ayId,
    destinationSemesterId: sem3!.id,
    destinationDivisionId: "non-existent-div-id",
  });
  const afterCount = await prisma.enrolment.count();
  assert(
    !invalidBatchRes.success,
    "T5.12: Invalid destination placement rejects batch progression",
    invalidBatchRes
  );
  assert(
    beforeCount === afterCount,
    "T5.13: Transactional rollback verified (enrolment count completely unchanged after failed batch)",
    { beforeCount, afterCount }
  );

  // SUITE 6: SERVER-SIDE RBAC AUTHORIZATION
  console.log("\n--- SUITE 6: Server-Side RBAC Authorization ---");
  const { hasPermission } = await import("../src/lib/auth/roles");

  // 6.1 Permission Matrix Verification
  assert(
    hasPermission("SYSTEM_ADMIN", "WRITE_STUDENTS") === true,
    "T6.1: SYSTEM_ADMIN holds WRITE_STUDENTS authorization"
  );
  assert(
    hasPermission("ACADEMIC_ADMIN", "WRITE_STUDENTS") === true,
    "T6.2: ACADEMIC_ADMIN holds WRITE_STUDENTS authorization"
  );
  assert(
    hasPermission("FACULTY_MEMBER", "WRITE_STUDENTS") === false,
    "T6.3: FACULTY_MEMBER denied WRITE_STUDENTS authorization"
  );
  assert(
    hasPermission("STUDENT_VIEWER", "WRITE_STUDENTS") === false,
    "T6.4: STUDENT_VIEWER denied WRITE_STUDENTS authorization"
  );

  // 6.5 Unauthenticated Server Action Protection (Fails Closed)
  const unauthPreview = await previewCohortProgressionAction({
    programmeId: bscDs!.id,
    semesterId: sem1.id,
    academicYearId: ayId,
  });
  assert(
    !unauthPreview.success && unauthPreview.code === "UNAUTHORIZED",
    "T6.5: Unauthenticated previewCohortProgressionAction fails closed with UNAUTHORIZED",
    unauthPreview
  );

  const unauthExec = await executeCohortProgressionAction({
    studentIds: [admittedStudentId!],
    sourceSemesterId: sem2!.id,
    destinationAcademicYearId: ayId,
    destinationSemesterId: sem3!.id,
    destinationDivisionId: sem3Div.id,
  });
  assert(
    !unauthExec.success && unauthExec.code === "UNAUTHORIZED",
    "T6.6: Unauthenticated executeCohortProgressionAction fails closed with UNAUTHORIZED",
    unauthExec
  );

  const unauthSingle = await progressSingleStudentAction({
    studentId: admittedStudentId!,
    destinationAcademicYearId: ayId,
    destinationSemesterId: sem3!.id,
    destinationDivisionId: sem3Div.id,
  });
  assert(
    !unauthSingle.success && unauthSingle.code === "UNAUTHORIZED",
    "T6.7: Unauthenticated progressSingleStudentAction fails closed with UNAUTHORIZED",
    unauthSingle
  );

  // SUITE 7: DATABASE BASELINE INTEGRITY
  console.log("\n--- SUITE 7: Operational Database Baseline Integrity ---");
  const postTestOperationalHash = crypto
    .createHash("sha256")
    .update(fs.readFileSync(OPERATIONAL_DB_PATH))
    .digest("hex");

  assert(
    baselineOperationalHash === postTestOperationalHash,
    "T7.1: Operational database dev.db SHA-256 hash is 100% invariant throughout test execution",
    { baselineOperationalHash, postTestOperationalHash }
  );

  // Clean up isolated test records
  console.log("\n--- Clean up isolated test records ---");
  await prisma.enrolment.deleteMany({
    where: { studentId: { in: [admittedStudentId!, student2Id] } },
  });
  await prisma.student.deleteMany({
    where: { id: { in: [admittedStudentId!, student2Id] } },
  });

  console.log("  [INFO] Isolated test records cleaned up.");

  // SUMMARY
  const total = results.length;
  const passed = results.filter((r) => r.passed).length;
  const failed = results.filter((r) => !r.passed).length;

  console.log("\n========================================================");
  console.log(`TOTAL ASSERTIONS: ${total}`);
  console.log(`PASSED:           ${passed}`);
  console.log(`FAILED:           ${failed}`);
  console.log("========================================================\n");

  if (failed > 0) {
    process.exit(1);
  }
}

runSuite().catch((err) => {
  console.error("Test execution failed with unhandled exception:", err);
  process.exit(1);
});
