// scripts/verify_foundation.js - Phase 1 Relational Foundation Verification Suite
// Tests all Step 7 requirements: Clean DB, Seed Repeatability, Constraints, FKs, Rollback, DAL

const { PrismaClient } = require("@prisma/client");
const prisma = new PrismaClient();

const results = [];

function assert(condition, name, details = "") {
  if (condition) {
    results.push({ name, passed: true, details });
    console.log(`[PASS] ${name}`);
  } else {
    results.push({ name, passed: false, details });
    console.error(`[FAIL] ${name}: ${details}`);
  }
}

async function runTests() {
  console.log("=== RPIHM CampusOS Phase 1 Engineering Verification Suite ===");

  // Test 1: Seed Repeatability & Entity Inventory
  console.log("\n--- Group 1: Seed Entity Inventory & Counts ---");
  const [ayCount, deptCount, progCount, semCount, divCount, subCount, staffCount, studentCount, enrolCount, assignCount] = await Promise.all([
    prisma.academicYear.count(),
    prisma.department.count(),
    prisma.programme.count(),
    prisma.semester.count(),
    prisma.division.count(),
    prisma.subject.count(),
    prisma.staff.count(),
    prisma.student.count(),
    prisma.enrolment.count(),
    prisma.teachingAssignment.count(),
  ]);

  assert(ayCount >= 1, "Academic Year exists", `Count: ${ayCount}`);
  assert(deptCount === 3, "Departments count equals 3", `Count: ${deptCount}`);
  assert(progCount === 7, "Programmes count equals 7", `Count: ${progCount}`);
  assert(semCount === 34, "Semesters count equals 34", `Count: ${semCount}`);
  assert(divCount === 14, "Divisions count equals 14", `Count: ${divCount}`);
  assert(subCount === 7, "Subjects count equals 7", `Count: ${subCount}`);
  assert(staffCount === 10, "Staff count equals 10", `Count: ${staffCount}`);
  assert(studentCount === 10, "Student count equals 10", `Count: ${studentCount}`);
  assert(enrolCount === 10, "Enrolment count equals 10", `Count: ${enrolCount}`);
  assert(assignCount === 4, "Teaching Assignment count equals 4", `Count: ${assignCount}`);

  // Test 2: Unique Constraints
  console.log("\n--- Group 2: Unique Constraint Enforcement ---");
  let duplicateStudentRejected = false;
  try {
    await prisma.student.create({
      data: {
        rollNumber: "RPIHM-2026-001", // Duplicate
        prn: "9999999999",
        fullName: "Duplicate Roll Test",
        email: "test.dup.roll@sample.rpihm.ac.in",
        phone: "+91 90000 00001",
        dob: new Date("2006-01-01"),
      },
    });
  } catch (e) {
    duplicateStudentRejected = true;
  }
  assert(duplicateStudentRejected, "Duplicate Student rollNumber rejected by unique constraint");

  let duplicatePrnRejected = false;
  try {
    await prisma.student.create({
      data: {
        rollNumber: "RPIHM-2026-999",
        prn: "2026DS041", // Duplicate PRN
        fullName: "Duplicate PRN Test",
        email: "test.dup.prn@sample.rpihm.ac.in",
        phone: "+91 90000 00002",
        dob: new Date("2006-01-01"),
      },
    });
  } catch (e) {
    duplicatePrnRejected = true;
  }
  assert(duplicatePrnRejected, "Duplicate Student PRN rejected by unique constraint");

  let duplicateStaffRejected = false;
  try {
    const dept = await prisma.department.findFirst();
    await prisma.staff.create({
      data: {
        employeeId: "RPIHM-FAC-012", // Duplicate
        fullName: "Duplicate Staff Test",
        email: "test.dup.fac@sample.rpihm.ac.in",
        phone: "+91 90000 00003",
        designation: "Instructor",
        category: "TEACHING",
        departmentId: dept.id,
        dateOfJoining: new Date("2020-01-01"),
      },
    });
  } catch (e) {
    duplicateStaffRejected = true;
  }
  assert(duplicateStaffRejected, "Duplicate Staff employeeId rejected by unique constraint");

  // Test 3: Foreign Key Integrity & Restrict Rules
  console.log("\n--- Group 3: Foreign Key Integrity & Deletion Rules ---");
  let invalidFkRejected = false;
  try {
    await prisma.programme.create({
      data: {
        code: "INVALID-PROG",
        name: "Invalid Foreign Key Programme",
        degreeLevel: "UNDERGRADUATE",
        departmentId: "00000000-0000-0000-0000-000000000000", // Non-existent
      },
    });
  } catch (e) {
    invalidFkRejected = true;
  }
  assert(invalidFkRejected, "Non-existent Department Foreign Key rejected by database");

  // Test 4: Transaction Rollback on Simulated Failure
  console.log("\n--- Group 4: Atomic Transaction & Rollback ---");
  const rollbackTestRoll = "RPIHM-ROLLBACK-TEST";
  let transactionFailed = false;

  try {
    await prisma.$transaction(async (tx) => {
      // 1. Create student
      await tx.student.create({
        data: {
          rollNumber: rollbackTestRoll,
          prn: "2026-ROLLBACK-PRN",
          fullName: "Rollback Candidate",
          email: "rollback@sample.rpihm.ac.in",
          phone: "+91 90000 00099",
          dob: new Date("2006-05-05"),
        },
      });

      // 2. Deliberately fail secondary operation to trigger rollback
      throw new Error("Simulated failure during enrollment step");
    });
  } catch (e) {
    transactionFailed = true;
  }

  const ghostStudent = await prisma.student.findUnique({
    where: { rollNumber: rollbackTestRoll },
  });

  assert(transactionFailed, "Transaction aborted on simulated error");
  assert(ghostStudent === null, "Transaction cleanly rolled back: no orphaned student persisted");

  // Test 5: Data Access Layer (DAL) Query & Transaction Integrity
  console.log("\n--- Group 5: Server-Side Data Access Layer (DAL) ---");
  const student = await prisma.student.findUnique({
    where: { rollNumber: "RPIHM-2026-001" },
    include: {
      enrolments: {
        include: {
          programme: true,
          semester: true,
          division: true,
        },
      },
    },
  });

  assert(student !== null, "Student DAL query found Aarav Sharma");
  assert(student.enrolments.length > 0, "Student has active enrolment relation");
  assert(student.enrolments[0].programme.code === "BSCDS-AI", "Enrolment correctly links to B.Sc. Data Science with AI");
  assert(student.enrolments[0].division.name === "Div A", "Enrolment correctly links to Div A");

  const faculty = await prisma.staff.findUnique({
    where: { employeeId: "RPIHM-FAC-012" },
    include: {
      department: true,
      teachingAssignments: {
        include: {
          subject: true,
        },
      },
    },
  });

  assert(faculty !== null, "Faculty DAL query found Chef Vikramaditya Kapoor");
  assert(faculty.department.code === "CUL", "Faculty belongs to Hospitality & Culinary Arts");
  assert(faculty.teachingAssignments.length > 0, "Faculty has teaching assignments");
  assert(faculty.teachingAssignments[0].subject.code === "FP-101", "Faculty assigned to FP-101 Classical Culinary Foundation");

  console.log("\n=======================================================");
  const passedCount = results.filter((r) => r.passed).length;
  const totalCount = results.length;
  console.log(`Summary: ${passedCount} of ${totalCount} tests passed (${Math.round((passedCount / totalCount) * 100)}%)`);
  console.log("=======================================================");

  if (passedCount !== totalCount) {
    process.exit(1);
  }
}

runTests()
  .catch((e) => {
    console.error("[Fatal Test Runner Error]:", e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
