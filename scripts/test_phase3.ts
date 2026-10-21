import { PrismaClient } from "@prisma/client";
import { StudentRepository, validateEnrolmentPlacement } from "../src/lib/dal/studentRepository";
import { FacultyRepository } from "../src/lib/dal/facultyRepository";

const prisma = new PrismaClient();

interface TestReport {
  name: string;
  passed: boolean;
  details: string;
}

const reports: TestReport[] = [];

function record(name: string, passed: boolean, details: string) {
  reports.push({ name, passed, details });
  const status = passed ? "✓ PASS" : "✗ FAIL";
  console.log(`[${status}] ${name}: ${details}`);
}

async function runPhase3Verification() {
  console.log("================================================================================");
  console.log("   CAMPUSOS PHASE 3 — ACADEMIC INTEGRITY & ENROLMENT HISTORY VERIFICATION SUITE   ");
  console.log("================================================================================\n");

  // Step 0: Baseline & Anomaly Safety Verification
  console.log("--- Step 0: Preflight Database State & Anomaly Verification ---");
  const studentCount = await prisma.student.count();
  const staffCount = await prisma.staff.count();
  const enrolmentCount = await prisma.enrolment.count();
  const assignmentCount = await prisma.teachingAssignment.count();

  console.log(`Baseline Counts: Students=${studentCount}, Staff=${staffCount}, Enrolments=${enrolmentCount}, TeachingAssignments=${assignmentCount}`);

  // Inspect Komal Soni
  const komal = await prisma.student.findFirst({
    where: { prn: "2026DS042" },
    include: {
      enrolments: {
        include: {
          semester: true,
          division: { include: { semester: true } },
          programme: true,
          academicYear: true,
        },
      },
    },
  });

  if (komal && komal.enrolments.length > 0) {
    const enr = komal.enrolments[0];
    const isMismatch = enr.division && enr.division.semesterId !== enr.semesterId;
    record(
      "Preflight: Komal Soni Anomaly Preserved Safely",
      Boolean(isMismatch && komal.currentSemester === 3),
      `Student PRN=${komal.prn}, currentSemester=${komal.currentSemester}, Enrolment Semester=${enr.semester.semesterNumber} (${enr.semesterId}), Division belongs to Semester=${enr.division?.semester.semesterNumber} (${enr.division?.semesterId}). Confirmed untouched.`
    );
  } else {
    record("Preflight: Komal Soni Anomaly Preserved Safely", false, "Komal Soni record not found in database.");
  }

  // Fetch active academic year and test programme
  const academicYear = await prisma.academicYear.findFirst({ where: { isCurrent: true } });
  if (!academicYear) throw new Error("No active academic year found in database.");

  const bscdsProg = await prisma.programme.findUnique({
    where: { code: "BSCDS-AI" },
    include: {
      semesters: {
        include: { divisions: true, subjects: true },
        orderBy: { semesterNumber: "asc" },
      },
    },
  });
  if (!bscdsProg) throw new Error("BSCDS-AI programme not found.");

  const culProg = await prisma.programme.findUnique({
    where: { code: "BA-CUL" },
    include: {
      semesters: {
        include: { divisions: true, subjects: true },
        orderBy: { semesterNumber: "asc" },
      },
    },
  });
  if (!culProg) throw new Error("BA-CUL programme not found.");

  const bscSem1 = bscdsProg.semesters[0]; // Sem 1
  const bscSem2 = bscdsProg.semesters[1]; // Sem 2
  const bscDivA = bscSem1.divisions.find((d) => d.name === "Div A")!;
  const bscDivB = bscSem1.divisions.find((d) => d.name === "Div B")!;
  const culSem1 = culProg.semesters[0]; // Sem 1

  console.log("\n--- Step 1: Placement Validation Engine Tests ---");

  // Test 1: Rejection of Invalid Programme-Semester Combination
  const test1 = await validateEnrolmentPlacement({
    programmeId: bscdsProg.id,
    semesterId: culSem1.id, // Semester from BA-CUL with BSCDS-AI programme!
    divisionId: bscDivA.id,
    academicYearId: academicYear.id,
  });
  record(
    "Test 1: Rejection of Programme-Semester Mismatch",
    !test1.success && test1.code === "SEMESTER_PROGRAMME_MISMATCH",
    `Error returned: "${test1.error}" (Code: ${test1.code})`
  );

  // Test 2: Rejection of Division Belonging to Another Semester
  const test2 = await validateEnrolmentPlacement({
    programmeId: bscdsProg.id,
    semesterId: bscSem2.id, // Semester 2
    divisionId: bscDivA.id, // Belongs to Semester 1!
    academicYearId: academicYear.id,
  });
  record(
    "Test 2: Rejection of Division-Semester Mismatch",
    !test2.success && test2.code === "DIVISION_SEMESTER_MISMATCH",
    `Error returned: "${test2.error}" (Code: ${test2.code})`
  );

  console.log("\n--- Step 2: Student Creation with Valid Placement ---");
  const testStudentPRN = `TEST-PHASE3-${Date.now().toString().slice(-4)}`;
  const testStudentRoll = `RPIHM-T3-${Date.now().toString().slice(-4)}`;
  const testStudentEmail = `test.placement.${Date.now()}@rpihm.ac.in`;

  const createRes = await StudentRepository.createStudentWithEnrolment({
    fullName: "Arjun Ramesh Test",
    prn: testStudentPRN,
    rollNumber: testStudentRoll,
    email: testStudentEmail,
    phone: "+91 9820011223",
    dob: new Date(2004, 5, 15),
    gender: "MALE",
    bloodGroup: "O+",
    programmeId: bscdsProg.id,
    semesterId: bscSem1.id,
    divisionId: bscDivA.id,
    academicYearId: academicYear.id,
    guardianName: "Ramesh Test",
    guardianRelationship: "Father",
    guardianPhone: "+91 9820011224",
    mentorFaculty: "Prof. Snehal Kulkarni",
    attendanceRate: 91.5,
  });

  let testStudentId = "";
  if (createRes.success && createRes.data) {
    testStudentId = createRes.data.student.id;
    record(
      "Test 3: Valid Student Creation with Enrolment Placement",
      true,
      `Student created with ID=${testStudentId}, PRN=${testStudentPRN}, active enrolment created in Sem 1 Div A.`
    );
  } else {
    record("Test 3: Valid Student Creation with Enrolment Placement", false, `Failed: ${createRes.error}`);
    return;
  }

  console.log("\n--- Step 3: Identity-Only Edit Separation ---");
  // Test 4: Identity-only edit leaves enrolment records untouched
  const enrsBefore = await prisma.enrolment.findMany({ where: { studentId: testStudentId } });
  const enrBeforeId = enrsBefore[0].id;
  const enrBeforeDate = enrsBefore[0].enrolledAt.getTime();

  const idEditRes = await StudentRepository.updateStudent(testStudentId, {
    fullName: "Arjun R. Test Updated",
    guardianName: "Dr. Ramesh Test Updated",
    guardianPhone: "+91 9820099999",
    mentorFaculty: "Prof. Snehal Kulkarni",
  });

  const enrsAfter = await prisma.enrolment.findMany({ where: { studentId: testStudentId } });
  const idEditPassed =
    idEditRes.success &&
    enrsAfter.length === 1 &&
    enrsAfter[0].id === enrBeforeId &&
    enrsAfter[0].enrolledAt.getTime() === enrBeforeDate &&
    idEditRes.data?.guardianName === "Dr. Ramesh Test Updated";

  record(
    "Test 4: Identity-Only Edit Preserves Enrolment Intact",
    Boolean(idEditPassed),
    `Enrolment count=${enrsAfter.length}, Enrolment ID unchanged=${enrsAfter[0].id === enrBeforeId}, enrolledAt untouched=${enrsAfter[0].enrolledAt.getTime() === enrBeforeDate}. Guardian updated to "${idEditRes.data?.guardianName}".`
  );

  console.log("\n--- Step 4: In-Place Division Correction (Same Semester) ---");
  // Test 5: Changing division within the same semester updates divisionId without archiving or creating a new enrolment
  const divChangeRes = await StudentRepository.updateStudent(testStudentId, {
    programmeId: bscdsProg.id,
    semesterId: bscSem1.id,
    divisionId: bscDivB.id, // Switch to Div B
    academicYearId: academicYear.id,
  });

  const enrsAfterDiv = await prisma.enrolment.findMany({ where: { studentId: testStudentId } });
  const divChangePassed =
    divChangeRes.success &&
    enrsAfterDiv.length === 1 &&
    enrsAfterDiv[0].id === enrBeforeId &&
    enrsAfterDiv[0].divisionId === bscDivB.id &&
    enrsAfterDiv[0].status === "ENROLLED";

  record(
    "Test 5: In-Place Division Correction Within Semester",
    Boolean(divChangePassed),
    `Enrolment count remained 1, ID unchanged, Division updated to Div B (${bscDivB.id}), status remains ENROLLED.`
  );

  console.log("\n--- Step 5: Academic Progression & History Preservation ---");
  // Test 6: Advance student to Semester 2 (provision a temporary division for Sem 2)
  const tempSem2Div = await prisma.division.create({
    data: {
      name: "Div A",
      semesterId: bscSem2.id, // Semester 2
      maxCapacity: 60,
    },
  });

  const progressionRes = await StudentRepository.updateStudent(testStudentId, {
    programmeId: bscdsProg.id,
    semesterId: bscSem2.id,
    divisionId: tempSem2Div.id,
    academicYearId: academicYear.id,
  });

  const enrsAfterProg = await prisma.enrolment.findMany({
    where: { studentId: testStudentId },
    include: { semester: true, division: true },
    orderBy: { enrolledAt: "asc" },
  });

  const sem1Enr = enrsAfterProg.find((e) => e.semester.semesterNumber === 1);
  const sem2Enr = enrsAfterProg.find((e) => e.semester.semesterNumber === 2);

  const progPassed =
    progressionRes.success &&
    enrsAfterProg.length === 2 &&
    sem1Enr?.status === "COMPLETED" &&
    sem2Enr?.status === "ENROLLED" &&
    sem2Enr?.divisionId === tempSem2Div.id &&
    progressionRes.data?.currentSemester === 2;

  record(
    "Test 6: Progression Preserves Previous Placement as COMPLETED",
    Boolean(progPassed),
    `Total enrolments=${enrsAfterProg.length}. Sem 1 Status=${sem1Enr?.status} (Division=${sem1Enr?.division?.name}). Sem 2 Status=${sem2Enr?.status} (Division=${sem2Enr?.division?.name}). currentSemester=${progressionRes.data?.currentSemester}.`
  );

  console.log("\n--- Step 6: Preservation of Placement After Failed Mutation ---");
  // Test 7: Attempt an invalid progression / division edit, assert failure and that placements are untouched
  const failedAttemptRes = await StudentRepository.updateStudent(testStudentId, {
    programmeId: bscdsProg.id,
    semesterId: bscSem2.id,
    divisionId: "invalid-division-id-xyz",
    academicYearId: academicYear.id,
  });

  const enrsAfterFailed = await prisma.enrolment.findMany({
    where: { studentId: testStudentId },
    include: { semester: true, division: true },
    orderBy: { enrolledAt: "asc" },
  });

  const failedTestPassed =
    !failedAttemptRes.success &&
    enrsAfterFailed.length === 2 &&
    enrsAfterFailed.find((e) => e.semester.semesterNumber === 2)?.status === "ENROLLED" &&
    enrsAfterFailed.find((e) => e.semester.semesterNumber === 1)?.status === "COMPLETED";

  record(
    "Test 7: Failed Mutation Leaves Valid Placement Intact",
    Boolean(failedTestPassed),
    `Mutation properly rejected: "${failedAttemptRes.error}". Active Sem 2 and historical Sem 1 enrolments remain completely intact.`
  );

  console.log("\n--- Step 7: Teaching Assignment Relational Compatibility ---");
  // Fetch a staff member and a subject in Semester 1
  const staff = await prisma.staff.findFirst();
  if (!staff) throw new Error("No staff found for teaching assignment test.");

  const sem1Subject = bscSem1.subjects[0];
  if (!sem1Subject) throw new Error("No subject found in Semester 1.");

  // Test 8a: Rejection of teaching assignment with division from another semester
  const test8a = await FacultyRepository.assignTeachingSubject(
    staff.id,
    sem1Subject.id,
    tempSem2Div.id, // Division belongs to Sem 2, but subject belongs to Sem 1!
    4
  );
  record(
    "Test 8a: Rejection of Subject-Division Semester Mismatch",
    !test8a.success && test8a.code === "SUBJECT_DIVISION_SEMESTER_MISMATCH",
    `Error returned: "${test8a.error}" (Code: ${test8a.code})`
  );

  // Test 8b: Valid teaching assignment with compatible division
  const test8b = await FacultyRepository.assignTeachingSubject(
    staff.id,
    sem1Subject.id,
    bscDivA.id, // Division belongs to Sem 1!
    6
  );
  const assignmentId = test8b.data?.id;
  record(
    "Test 8b: Valid Relational Teaching Assignment Created",
    test8b.success && Boolean(assignmentId),
    `Assignment ID=${assignmentId}, staff=${staff.fullName}, subject=${sem1Subject.title}, division=Div A, hours=6.`
  );

  // Test 8c: Removal of teaching assignment
  if (assignmentId) {
    const test8c = await FacultyRepository.removeTeachingAssignment(assignmentId);
    const dbCheck = await prisma.teachingAssignment.findUnique({ where: { id: assignmentId } });
    record(
      "Test 8c: Removal of Teaching Assignment",
      test8c.success && dbCheck === null,
      `Assignment ${assignmentId} successfully removed from institutional database.`
    );
  }

  console.log("\n--- Step 8: Safe Fixture Teardown & Baseline Invariance ---");
  // Clean up temporary test student and enrolments
  await prisma.enrolment.deleteMany({ where: { studentId: testStudentId } });
  await prisma.student.delete({ where: { id: testStudentId } });
  await prisma.division.delete({ where: { id: tempSem2Div.id } });

  const finalStudentCount = await prisma.student.count();
  const finalStaffCount = await prisma.staff.count();
  const finalEnrolmentCount = await prisma.enrolment.count();
  const finalAssignmentCount = await prisma.teachingAssignment.count();

  const countsMatch =
    finalStudentCount === studentCount &&
    finalStaffCount === staffCount &&
    finalEnrolmentCount === enrolmentCount &&
    finalAssignmentCount === assignmentCount;

  record(
    "Test 9: Test Teardown Preserved Baseline Invariance",
    countsMatch,
    `Final Counts: Students=${finalStudentCount} (orig ${studentCount}), Staff=${finalStaffCount} (orig ${staffCount}), Enrolments=${finalEnrolmentCount} (orig ${enrolmentCount}), Assignments=${finalAssignmentCount} (orig ${assignmentCount}).`
  );

  console.log("\n================================================================================");
  const totalPassed = reports.filter((r) => r.passed).length;
  console.log(`TOTAL TESTS: ${reports.length} | PASSED: ${totalPassed} | FAILED: ${reports.length - totalPassed}`);
  console.log("================================================================================\n");

  if (totalPassed !== reports.length) {
    process.exit(1);
  }
}

runPhase3Verification()
  .catch((err) => {
    console.error("FATAL ERROR IN TEST SUITE:", err);
    process.exit(1);
  })
  .finally(() => prisma.$disconnect());
