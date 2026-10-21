import { PrismaClient } from "@prisma/client";
import { AcademicRepository } from "../src/lib/dal/academicRepository";
import { FacultyRepository } from "../src/lib/dal/facultyRepository";
import { StudentRepository } from "../src/lib/dal/studentRepository";

const prisma = new PrismaClient();

interface TestResult {
  name: string;
  passed: boolean;
  details: string;
}

const results: TestResult[] = [];

function record(name: string, passed: boolean, details: string) {
  results.push({ name, passed, details });
  console.log(`[${passed ? "✓ PASS" : "✗ FAIL"}] ${name}: ${details}`);
}

async function runPhase31Suite() {
  console.log("================================================================================");
  console.log("   CAMPUSOS PHASE 3.1: ACADEMIC SETUP & WORKFLOW VERIFICATION SUITE            ");
  console.log("================================================================================\n");

  // Step 0: Preflight Counts
  const initialCounts = {
    students: await prisma.student.count(),
    staff: await prisma.staff.count(),
    programmes: await prisma.programme.count(),
    semesters: await prisma.semester.count(),
    divisions: await prisma.division.count(),
    enrolments: await prisma.enrolment.count(),
    assignments: await prisma.teachingAssignment.count(),
  };

  console.log("[Baseline Database Counts]");
  console.log(`  - Students:             ${initialCounts.students}`);
  console.log(`  - Staff:                ${initialCounts.staff}`);
  console.log(`  - Programmes:           ${initialCounts.programmes}`);
  console.log(`  - Semesters:            ${initialCounts.semesters}`);
  console.log(`  - Divisions:            ${initialCounts.divisions}`);
  console.log(`  - Enrolments:           ${initialCounts.enrolments}`);
  console.log(`  - Teaching Assignments: ${initialCounts.assignments}`);

  // 1. Komal Soni Anomaly Audit
  console.log("\n--- TEST 1: Komal Soni Anomaly State Audit ---");
  const komal = await prisma.student.findFirst({
    where: { prn: "2026DS042" },
    include: {
      enrolments: {
        include: {
          semester: true,
          division: { include: { semester: true } },
          programme: true,
        },
      },
    },
  });

  const enr = komal?.enrolments[0];
  const isKomalAnomalyPreserved =
    komal &&
    komal.currentSemester === 3 &&
    enr &&
    enr.semester.semesterNumber === 3 &&
    enr.division &&
    enr.division.semester.semesterNumber === 1;

  record(
    "Komal Soni Record Preserved Safely",
    Boolean(isKomalAnomalyPreserved),
    `PRN=2026DS042, Sem=3, Enrolment Sem=${enr?.semester.semesterNumber}, Division belongs to Sem=${enr?.division?.semester.semesterNumber}. Intact and preserved.`
  );

  // 2. Division Creation Workflow Tests
  console.log("\n--- TEST 2: Division Creation Validation & Workflow ---");
  const bscProg = await prisma.programme.findUnique({
    where: { code: "BSCDS-AI" },
    include: { semesters: { orderBy: { semesterNumber: "asc" } } },
  });
  if (!bscProg) throw new Error("BSCDS-AI programme not found.");

  const sem3 = bscProg.semesters.find((s) => s.semesterNumber === 3);
  if (!sem3) throw new Error("Semester 3 not found in BSCDS-AI.");

  // Test 2a: Rejection of invalid capacity
  const invalidCapRes = await AcademicRepository.createDivision({
    semesterId: sem3.id,
    name: "Div A",
    maxCapacity: -5,
  });
  record(
    "Rejection of Invalid Capacity (< 1)",
    !invalidCapRes.success && invalidCapRes.code === "INVALID_CAPACITY",
    `Error returned: "${invalidCapRes.error}" (Code: ${invalidCapRes.code})`
  );

  // Test 2b: Rejection of empty name
  const emptyNameRes = await AcademicRepository.createDivision({
    semesterId: sem3.id,
    name: "   ",
    maxCapacity: 60,
  });
  record(
    "Rejection of Empty Division Name",
    !emptyNameRes.success && emptyNameRes.code === "INVALID_DIVISION_NAME",
    `Error returned: "${emptyNameRes.error}" (Code: ${emptyNameRes.code})`
  );

  // Test 2c: Legitimate division creation in Semester 3
  const validDivRes = await AcademicRepository.createDivision({
    semesterId: sem3.id,
    name: "Div A",
    maxCapacity: 60,
  });
  const createdDivId = validDivRes.data?.id;
  record(
    "Valid Division Creation under Semester 3",
    validDivRes.success && Boolean(createdDivId),
    `Created Division ID=${createdDivId}, Name="Div A", Capacity=60 under Semester 3.`
  );

  // Test 2d: Rejection of duplicate division name in the same semester
  const dupDivRes = await AcademicRepository.createDivision({
    semesterId: sem3.id,
    name: "Div A",
    maxCapacity: 60,
  });
  record(
    "Rejection of Duplicate Division in Same Semester",
    !dupDivRes.success && dupDivRes.code === "DUPLICATE_DIVISION",
    `Error returned: "${dupDivRes.error}" (Code: ${dupDivRes.code})`
  );

  // 3. Teaching Assignments: With & Without Division
  console.log("\n--- TEST 3: Teaching Assignments (Cohort-Wide vs Division-Specific) ---");
  const staff = await prisma.staff.findFirst();
  if (!staff) throw new Error("No staff record found.");

  const sem1 = bscProg.semesters.find((s) => s.semesterNumber === 1);
  if (!sem1) throw new Error("Semester 1 not found.");

  const subject = await prisma.subject.findFirst({ where: { semesterId: sem1.id } });
  if (!subject) throw new Error("No subject found for Semester 1.");

  // Test 3a: Assign faculty without division (Cohort-wide / Theory Lecture)
  const cohortAssignRes = await FacultyRepository.assignTeachingSubject(
    staff.id,
    subject.id,
    null, // No division!
    4
  );
  const cohortAssignId = cohortAssignRes.data?.id;
  record(
    "Teaching Assignment without Division (Cohort-Wide)",
    cohortAssignRes.success && Boolean(cohortAssignId) && cohortAssignRes.data?.divisionId === null,
    `Assignment ID=${cohortAssignId}, Staff=${staff.fullName}, Subject=${subject.title}, Division=null (Cohort-Wide).`
  );

  // Clean up cohort assignment
  if (cohortAssignId) {
    await FacultyRepository.removeTeachingAssignment(cohortAssignId);
  }

  // Test 3b: Incompatible division assignment (Sem 3 division assigned to Sem 1 subject!)
  if (createdDivId) {
    const incompatibleAssignRes = await FacultyRepository.assignTeachingSubject(
      staff.id,
      subject.id, // Subject in Sem 1
      createdDivId, // Division in Sem 3!
      4
    );
    record(
      "Rejection of Incompatible Subject-Division Semester",
      !incompatibleAssignRes.success && incompatibleAssignRes.code === "SUBJECT_DIVISION_SEMESTER_MISMATCH",
      `Error returned: "${incompatibleAssignRes.error}" (Code: ${incompatibleAssignRes.code})`
    );
  }

  // 4. Safe Deletion of Division vs Protection When In Use
  console.log("\n--- TEST 4: Division Deletion Protection & Teardown ---");
  if (createdDivId) {
    // Delete the temporary test division
    const deleteRes = await AcademicRepository.deleteDivision(createdDivId);
    const dbCheck = await prisma.division.findUnique({ where: { id: createdDivId } });
    record(
      "Clean Deletion of Unused Division",
      deleteRes.success && dbCheck === null,
      `Division ${createdDivId} deleted successfully.`
    );
  }

  // Test 4b: Attempt to delete division that has active enrolments (e.g. Sem 1 Div A)
  const sem1DivA = await prisma.division.findFirst({
    where: { name: "Div A", semesterId: sem1.id },
  });
  if (sem1DivA) {
    const deleteUsedRes = await AcademicRepository.deleteDivision(sem1DivA.id);
    record(
      "Prevention of Deleting Division with Active Enrolments",
      !deleteUsedRes.success && deleteUsedRes.code === "DIVISION_IN_USE",
      `Error returned: "${deleteUsedRes.error}" (Code: ${deleteUsedRes.code})`
    );
  }

  // Step 5: Verify Invariant Database Counts
  console.log("\n--- TEST 5: Database Baseline Invariance ---");
  const finalCounts = {
    students: await prisma.student.count(),
    staff: await prisma.staff.count(),
    programmes: await prisma.programme.count(),
    semesters: await prisma.semester.count(),
    divisions: await prisma.division.count(),
    enrolments: await prisma.enrolment.count(),
    assignments: await prisma.teachingAssignment.count(),
  };

  const invariant =
    finalCounts.students === initialCounts.students &&
    finalCounts.staff === initialCounts.staff &&
    finalCounts.programmes === initialCounts.programmes &&
    finalCounts.semesters === initialCounts.semesters &&
    finalCounts.divisions === initialCounts.divisions &&
    finalCounts.enrolments === initialCounts.enrolments &&
    finalCounts.assignments === initialCounts.assignments;

  record(
    "Baseline Database Invariance Preserved",
    invariant,
    `Final: Students=${finalCounts.students}, Staff=${finalCounts.staff}, Programmes=${finalCounts.programmes}, Semesters=${finalCounts.semesters}, Divisions=${finalCounts.divisions}, Enrolments=${finalCounts.enrolments}, Assignments=${finalCounts.assignments}.`
  );

  console.log("\n================================================================================");
  const totalPassed = results.filter((r) => r.passed).length;
  console.log(`TOTAL TESTS: ${results.length} | PASSED: ${totalPassed} | FAILED: ${results.length - totalPassed}`);
  console.log("================================================================================\n");

  if (totalPassed !== results.length) {
    process.exit(1);
  }
}

runPhase31Suite()
  .catch((err) => {
    console.error("FATAL ERROR IN TEST SUITE:", err);
    process.exit(1);
  })
  .finally(() => prisma.$disconnect());
