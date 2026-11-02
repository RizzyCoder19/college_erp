const assert = require("assert");
const { PrismaClient } = require("@prisma/client");
const prisma = new PrismaClient();

const {
  validateEnrolmentPlacement,
  StudentRepository,
} = require("../src/lib/dal/studentRepository");

async function runMilestone31Verification() {
  console.log("================================================================================");
  console.log("   RPIHM CampusOS: Milestone 3.1 Enrolment Integrity & Academic History Suite   ");
  console.log("================================================================================");

  // 0. Baseline Counts
  const baselineStudents = await prisma.student.count();
  const baselineEnrolments = await prisma.enrolment.count();
  const baselineStaff = await prisma.staff.count();
  const baselineProgrammes = await prisma.programme.count();
  const baselineDivisions = await prisma.division.count();

  console.log(`[Baseline State]`);
  console.log(`  - Students:   ${baselineStudents}`);
  console.log(`  - Enrolments: ${baselineEnrolments}`);
  console.log(`  - Programmes: ${baselineProgrammes}`);
  console.log(`  - Divisions:  ${baselineDivisions}`);

  // Fetch valid reference entities
  const progBSCDS = await prisma.programme.findUnique({
    where: { code: "BSCDS-AI" },
    include: { semesters: { include: { divisions: true } } },
  });
  const progCUL = await prisma.programme.findUnique({
    where: { code: "BA-CUL" },
    include: { semesters: { include: { divisions: true } } },
  });
  const currentAY = await prisma.academicYear.findFirst({ where: { isCurrent: true } });

  assert(progBSCDS && progCUL && currentAY, "Prerequisites must exist in database");

  const bscdsSem1 = progBSCDS.semesters.find((s: any) => s.semesterNumber === 1);
  const bscdsSem2 = progBSCDS.semesters.find((s: any) => s.semesterNumber === 2);
  const bscdsDivA = bscdsSem1.divisions.find((d: any) => d.name === "Div A");
  const bscdsDivB = bscdsSem1.divisions.find((d: any) => d.name === "Div B");
  const culSem1 = progCUL.semesters.find((s: any) => s.semesterNumber === 1);
  const culDivA = culSem1.divisions.find((d: any) => d.name === "Div A");

  // Create temporary division for Semester 2 for testing advancement
  const tempDivSem2 = await prisma.division.create({
    data: {
      name: "Div A",
      semesterId: bscdsSem2.id,
      maxCapacity: 60,
    },
  });

  // =========================================================================
  // TEST 1: Workstream A - Server-Side Hierarchy Validation
  // =========================================================================
  console.log("\n[Test 1] Workstream A: Hierarchy Validation Tests");

  // 1a. Valid combination
  const validRes = await validateEnrolmentPlacement({
    programmeId: progBSCDS.id,
    semesterId: bscdsSem1.id,
    divisionId: bscdsDivA.id,
    academicYearId: currentAY.id,
  });
  console.log("  1a. Valid combination result:", validRes.success ? "PASS" : "FAIL");
  assert(validRes.success, "Valid combination must succeed");

  // 1b. Semester / Programme Mismatch (Semester 1 of BA-CUL paired with Programme BSCDS-AI)
  const mismatchSemRes = await validateEnrolmentPlacement({
    programmeId: progBSCDS.id,
    semesterId: culSem1.id,
    divisionId: culDivA.id,
    academicYearId: currentAY.id,
  });
  console.log("  1b. Semester/Programme mismatch rejected:", !mismatchSemRes.success ? "PASS" : "FAIL");
  assert(!mismatchSemRes.success, "Must reject semester belonging to different programme");
  assert.strictEqual(mismatchSemRes.code, "SEMESTER_PROGRAMME_MISMATCH");

  // 1c. Division / Semester Mismatch (Division A of Semester 1 paired with Semester 2)
  const mismatchDivRes = await validateEnrolmentPlacement({
    programmeId: progBSCDS.id,
    semesterId: bscdsSem2.id,
    divisionId: bscdsDivA.id, // belongs to Sem 1!
    academicYearId: currentAY.id,
  });
  console.log("  1c. Division/Semester mismatch rejected:", !mismatchDivRes.success ? "PASS" : "FAIL");
  assert(!mismatchDivRes.success, "Must reject division belonging to different semester");
  assert.strictEqual(mismatchDivRes.code, "DIVISION_SEMESTER_MISMATCH");

  // =========================================================================
  // TEST 2: Workstream B - Preserving Academic History on Placement Transition
  // =========================================================================
  console.log("\n[Test 2] Workstream B: Preserving Academic History");

  // Create isolated temporary student
  const testStudentDto = {
    rollNumber: "TEST-TEMP-001",
    prn: "TESTPRN001",
    fullName: "Integration Test Student",
    email: "test.student.integration@rpihm.ac.in",
    phone: "+91 99999 11111",
    dob: new Date("2005-05-15"),
    bloodGroup: "O+",
    gender: "MALE",
    programmeId: progBSCDS.id,
    semesterId: bscdsSem1.id,
    divisionId: bscdsDivA.id,
    academicYearId: currentAY.id,
  };

  const createRes = await StudentRepository.createStudentWithEnrolment(testStudentDto);
  assert(createRes.success, "Isolated test student must be created successfully");
  const testStudentId = createRes.data.student.id;

  try {
    // Verify initial enrolment
    const initialFetch = await StudentRepository.getStudentById(testStudentId);
    assert(initialFetch.success);
    assert.strictEqual(initialFetch.data.enrolments.length, 1);
    assert.strictEqual(initialFetch.data.enrolments[0].semester.semesterNumber, 1);
    assert.strictEqual(initialFetch.data.enrolments[0].status, "ENROLLED");
    console.log("  2a. Initial placement created: Semester 1 (ENROLLED)");

    // Perform Identity-Only update (e.g. phone number and blood group)
    const idUpdateRes = await StudentRepository.updateStudent(testStudentId, {
      phone: "+91 99999 22222",
      bloodGroup: "AB+",
      programmeId: progBSCDS.id,
      semesterId: bscdsSem1.id,
      divisionId: bscdsDivA.id,
    });
    assert(idUpdateRes.success);
    assert.strictEqual(idUpdateRes.data.enrolments.length, 1, "Identity-only edit must NOT spawn new enrolments");
    assert.strictEqual(idUpdateRes.data.enrolments[0].status, "ENROLLED");
    console.log("  2b. Identity-only edit verified: 0 spurious enrolments spawned");

    // Perform In-Place Division Correction (Div A -> Div B within same Sem 1)
    const divCorrectionRes = await StudentRepository.updateStudent(testStudentId, {
      programmeId: progBSCDS.id,
      semesterId: bscdsSem1.id,
      divisionId: bscdsDivB.id,
    });
    assert(divCorrectionRes.success);
    assert.strictEqual(divCorrectionRes.data.enrolments.length, 1, "In-place division correction must not spawn new term");
    assert.strictEqual(divCorrectionRes.data.enrolments[0].divisionId, bscdsDivB.id);
    console.log("  2c. In-place division correction verified: active enrolment updated in-place");

    // Perform Academic Placement Transition: Advance to Semester 2!
    const advanceRes = await StudentRepository.updateStudent(testStudentId, {
      programmeId: progBSCDS.id,
      semesterId: bscdsSem2.id,
      divisionId: tempDivSem2.id,
    });
    assert(advanceRes.success, "Advancing placement must succeed");

    const historyFetch = await StudentRepository.getStudentById(testStudentId);
    assert.strictEqual(historyFetch.data.enrolments.length, 2, "Student must now have exactly 2 enrolment records");

    const sem2Enr = historyFetch.data.enrolments.find((e: any) => e.semester.semesterNumber === 2);
    const sem1Enr = historyFetch.data.enrolments.find((e: any) => e.semester.semesterNumber === 1);

    assert(sem2Enr && sem1Enr, "Both Semester 1 and Semester 2 enrolments must exist");
    assert.strictEqual(sem2Enr.status, "ENROLLED", "New Semester 2 enrolment must be active");
    assert.strictEqual(sem1Enr.status, "COMPLETED", "Previous Semester 1 enrolment must be preserved as COMPLETED");
    assert.strictEqual(historyFetch.data.currentSemester, 2, "Student currentSemester must be updated to 2");
    console.log("  2d. Academic History Preservation Verified:");
    console.log(`      - Sem 1 status: ${sem1Enr.status} (Preserved!)`);
    console.log(`      - Sem 2 status: ${sem2Enr.status} (Active current placement)`);

    // =========================================================================
    // TEST 3: Transaction Rollback on Invalid Hierarchy Transition
    // =========================================================================
    console.log("\n[Test 3] Transaction Rollback on Invalid Placement");
    const failedTransition = await StudentRepository.updateStudent(testStudentId, {
      fullName: "TAMPERED NAME",
      programmeId: progBSCDS.id,
      semesterId: bscdsSem2.id,
      divisionId: bscdsDivA.id, // Division A of Sem 1! Mismatched!
    });

    assert(!failedTransition.success, "Invalid transition must fail");
    console.log(`  3a. Error safely returned: "${failedTransition.error}"`);

    // Verify student was NOT partially updated
    const afterFailed = await StudentRepository.getStudentById(testStudentId);
    assert.strictEqual(afterFailed.data.fullName, "Integration Test Student", "Full name must NOT be partially updated");
    assert.strictEqual(afterFailed.data.enrolments.length, 2, "Enrolments count must remain exactly 2");
    console.log("  3b. Transaction rollback verified: zero partial state left in database");

  } finally {
    // Clean up isolated test student, their enrolments, and temporary division
    await prisma.enrolment.deleteMany({ where: { studentId: testStudentId } });
    await prisma.student.delete({ where: { id: testStudentId } });
    await prisma.division.delete({ where: { id: tempDivSem2.id } });
    console.log("  [Cleanup] Isolated test student and temporary division cleanly removed");
  }

  // =========================================================================
  // TEST 4: Workstream E - Diagnostic Integrity Check
  // =========================================================================
  console.log("\n[Test 4] Workstream E: Enrolment Diagnostic Audit");
  const diagRes = await StudentRepository.diagnoseEnrolmentIntegrity();
  assert(diagRes.success, "Diagnostic check must execute successfully");
  console.log(`  - Total enrolments audited: ${diagRes.data.totalEnrolmentsChecked}`);
  console.log(`  - Anomaly count:            ${diagRes.data.anomalyCount}`);

  // Confirm that the known Komal Soni mismatch is surfaced accurately
  const komalAnomaly = diagRes.data.anomalies.find((a: any) => a.studentRoll === "RPIHM-2026DS042" || a.studentPrn === "2026DS042");
  assert(komalAnomaly, "Diagnostic must surface existing Komal Soni mismatch");
  assert.strictEqual(komalAnomaly.issueType, "DIVISION_SEMESTER_MISMATCH");
  console.log(`  - Surfaced known baseline anomaly: [${komalAnomaly.studentRoll}] ${komalAnomaly.description}`);

  // =========================================================================
  // TEST 5: Baseline Invariants Verification
  // =========================================================================
  const finalStudents = await prisma.student.count();
  const finalEnrolments = await prisma.enrolment.count();
  const finalStaff = await prisma.staff.count();
  const finalDivisions = await prisma.division.count();

  console.log("\n[Database Invariants Verification]");
  console.log(`  - Students:   final=${finalStudents}, baseline=${baselineStudents}`);
  console.log(`  - Enrolments: final=${finalEnrolments}, baseline=${baselineEnrolments}`);
  console.log(`  - Staff:      final=${finalStaff}, baseline=${baselineStaff}`);
  console.log(`  - Divisions:  final=${finalDivisions}, baseline=${baselineDivisions}`);

  assert.strictEqual(finalStudents, baselineStudents, "Student count must remain strictly invariant");
  assert.strictEqual(finalEnrolments, baselineEnrolments, "Enrolment count must remain strictly invariant");
  assert.strictEqual(finalStaff, baselineStaff, "Staff count must remain strictly invariant");
  assert.strictEqual(finalDivisions, baselineDivisions, "Division count must remain strictly invariant");

  console.log("\n>>> ALL 5 VERIFICATION STAGES PASSED WITH ZERO ERRORS! <<<");

  await prisma.$disconnect();
}

runMilestone31Verification().catch(err => {
  console.error("TEST FAILED:", err);
  process.exit(1);
});
