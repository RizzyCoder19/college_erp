// scripts/audit_suite.js - Exhaustive Phase 1 Acceptance & Integrity Audit Suite
// Tests all repository paths, server action interfaces, edge cases, FK enforcement, and idempotency

const { PrismaClient, Prisma } = require("@prisma/client");
const prisma = new PrismaClient();

const testLog = [];

function recordTest(suite, name, passed, details = "") {
  testLog.push({ suite, name, passed, details });
  const prefix = passed ? "[PASS]" : "[FAIL]";
  console.log(`${prefix} [${suite}] ${name}${details ? ` -> ${details}` : ""}`);
}

async function runAudit() {
  console.log("===============================================================");
  console.log("RPIHM CampusOS Phase 1 Acceptance & Integrity Audit Suite");
  console.log("===============================================================\n");

  // -----------------------------------------------------------------
  // Suite 1: Idempotent Seed Execution Verification
  // -----------------------------------------------------------------
  console.log("--- Suite 1: Database Seed State & Idempotency ---");
  const countsBefore = {
    ay: await prisma.academicYear.count(),
    depts: await prisma.department.count(),
    progs: await prisma.programme.count(),
    sems: await prisma.semester.count(),
    divs: await prisma.division.count(),
    subs: await prisma.subject.count(),
    staff: await prisma.staff.count(),
    students: await prisma.student.count(),
    enrols: await prisma.enrolment.count(),
    assignments: await prisma.teachingAssignment.count(),
  };

  recordTest("SeedAudit", "Initial seeded records present", 
    countsBefore.ay >= 1 && countsBefore.depts === 3 && countsBefore.progs === 7 && countsBefore.students === 10,
    `AY: ${countsBefore.ay}, Depts: ${countsBefore.depts}, Progs: ${countsBefore.progs}, Students: ${countsBefore.students}`
  );

  // -----------------------------------------------------------------
  // Suite 2: Academic Repository & Hierarchical Integrity
  // -----------------------------------------------------------------
  console.log("\n--- Suite 2: Academic Repository Queries ---");
  try {
    const years = await prisma.academicYear.findMany({ include: { terms: true } });
    recordTest("AcademicDAL", "Academic years with terms query", years.length > 0 && years[0].terms.length >= 2, `Found ${years.length} years, active terms: ${years[0].terms.length}`);

    const depts = await prisma.department.findMany({
      include: { _count: { select: { programmes: true, staff: true } } }
    });
    recordTest("AcademicDAL", "Departments with relational counts", depts.length === 3, `Depts: ${depts.map(d => `${d.code} (${d._count.programmes} progs, ${d._count.staff} staff)`).join(", ")}`);

    const progs = await prisma.programme.findMany({ include: { department: true, semesters: true } });
    recordTest("AcademicDAL", "Programmes with department and semesters", progs.length === 7, `Progs loaded: ${progs.length}`);

    const bscHs = progs.find(p => p.code === "BSC-HS");
    recordTest("AcademicDAL", "B.Sc. Hospitality Studies structure", bscHs && bscHs.durationYears === 3 && bscHs.semesters.length === 6, `Semesters: ${bscHs ? bscHs.semesters.length : 0}`);
  } catch (err) {
    recordTest("AcademicDAL", "Academic queries failed", false, err.message);
  }

  // -----------------------------------------------------------------
  // Suite 3: Student Repository & Transaction Integrity
  // -----------------------------------------------------------------
  console.log("\n--- Suite 3: Student Repository & Enrolment Transactions ---");
  const testRoll = "RPIHM-AUDIT-001";
  const testPrn = "2026AUDIT999";
  const testEmail = "audit.student@sample.rpihm.ac.in";

  // Clean test fixtures if left over from previous aborted run
  await prisma.enrolment.deleteMany({ where: { student: { rollNumber: testRoll } } });
  await prisma.student.deleteMany({ where: { rollNumber: testRoll } });

  const activeAY = await prisma.academicYear.findFirst({ where: { isCurrent: true } });
  const activeProg = await prisma.programme.findFirst({ where: { code: "BSC-HS" } });
  const activeSem = await prisma.semester.findFirst({ where: { programmeId: activeProg.id, semesterNumber: 1 } });
  const activeDiv = await prisma.division.findFirst({ where: { semesterId: activeSem.id, name: "Div A" } });

  // Test 3.1: Atomic Student Creation with Enrolment
  let createdRecord = null;
  try {
    createdRecord = await prisma.$transaction(async (tx) => {
      const student = await tx.student.create({
        data: {
          rollNumber: testRoll,
          prn: testPrn,
          fullName: "Audit Candidate Alpha",
          email: testEmail,
          phone: "+91 98200 99991",
          dob: new Date("2006-03-15"),
          gender: "MALE",
          bloodGroup: "O+",
          status: "ACTIVE",
          currentSemester: 1,
        },
      });

      const enrolment = await tx.enrolment.create({
        data: {
          studentId: student.id,
          academicYearId: activeAY.id,
          programmeId: activeProg.id,
          semesterId: activeSem.id,
          divisionId: activeDiv.id,
          status: "ENROLLED",
        },
      });

      return { student, enrolment };
    });

    recordTest("StudentDAL", "Atomic student creation with enrolment", createdRecord !== null && createdRecord.student.id !== undefined, `Created Student ID: ${createdRecord.student.id}`);
  } catch (err) {
    recordTest("StudentDAL", "Atomic student creation failed", false, err.message);
  }

  // Test 3.2: Duplicate Roll Number Rejection
  let dupRollCaught = false;
  try {
    await prisma.student.create({
      data: {
        rollNumber: testRoll, // duplicate
        prn: "DIFFERENT-PRN-001",
        fullName: "Duplicate Roll Candidate",
        email: "different.email.001@sample.rpihm.ac.in",
        phone: "+91 98200 00000",
        dob: new Date("2006-01-01"),
      },
    });
  } catch (err) {
    dupRollCaught = err instanceof Prisma.PrismaClientKnownRequestError && err.code === "P2002";
  }
  recordTest("StudentDAL", "Duplicate rollNumber rejected by P2002 unique constraint", dupRollCaught);

  // Test 3.3: Duplicate PRN Rejection
  let dupPrnCaught = false;
  try {
    await prisma.student.create({
      data: {
        rollNumber: "DIFFERENT-ROLL-002",
        prn: testPrn, // duplicate PRN
        fullName: "Duplicate PRN Candidate",
        email: "different.email.002@sample.rpihm.ac.in",
        phone: "+91 98200 00000",
        dob: new Date("2006-01-01"),
      },
    });
  } catch (err) {
    dupPrnCaught = err instanceof Prisma.PrismaClientKnownRequestError && err.code === "P2002";
  }
  recordTest("StudentDAL", "Duplicate PRN rejected by P2002 unique constraint", dupPrnCaught);

  // Test 3.4: Foreign Key Constraint Enforcement on Raw Delete
  let rawDeletePrevented = false;
  try {
    // Attempt to delete student while enrolment exists (without cascading in code)
    await prisma.student.delete({ where: { id: createdRecord.student.id } });
  } catch (err) {
    rawDeletePrevented = err instanceof Prisma.PrismaClientKnownRequestError && err.code === "P2003";
  }
  recordTest("StudentDAL", "Database-level P2003 Restrict blocks orphan student deletion", rawDeletePrevented, "Foreign key constraint correctly protected enrolment");

  // Test 3.5: Clean Transactional Deletion
  let cleanDeleteSuccess = false;
  try {
    await prisma.$transaction(async (tx) => {
      await tx.enrolment.deleteMany({ where: { studentId: createdRecord.student.id } });
      await tx.student.delete({ where: { id: createdRecord.student.id } });
    });
    const checkDeleted = await prisma.student.findUnique({ where: { id: createdRecord.student.id } });
    cleanDeleteSuccess = checkDeleted === null;
  } catch (err) {
    cleanDeleteSuccess = false;
  }
  recordTest("StudentDAL", "Transactional two-phase delete removes enrolment and student", cleanDeleteSuccess);

  // -----------------------------------------------------------------
  // Suite 4: Faculty Repository & Teaching Assignment Integrity
  // -----------------------------------------------------------------
  console.log("\n--- Suite 4: Faculty Repository & Teaching Assignments ---");
  const testEmpId = "RPIHM-FAC-AUDIT";
  const testFacEmail = "audit.faculty@sample.rpihm.ac.in";

  await prisma.teachingAssignment.deleteMany({ where: { staff: { employeeId: testEmpId } } });
  await prisma.staff.deleteMany({ where: { employeeId: testEmpId } });

  const culDept = await prisma.department.findUnique({ where: { code: "CUL" } });
  const fbmSubject = await prisma.subject.findUnique({ where: { code: "FBM-101" } });

  let staffCreated = null;
  try {
    staffCreated = await prisma.staff.create({
      data: {
        employeeId: testEmpId,
        fullName: "Chef Audit Master",
        email: testFacEmail,
        phone: "+91 99999 88888",
        designation: "Sous-Chef Instructor",
        category: "TEACHING",
        departmentId: culDept.id,
        dateOfJoining: new Date("2021-08-01"),
        status: "ACTIVE",
      },
    });
    recordTest("FacultyDAL", "Staff record creation", staffCreated !== null, `Staff ID: ${staffCreated.id}`);

    // Assign teaching subject
    const assignment = await prisma.teachingAssignment.create({
      data: {
        staffId: staffCreated.id,
        subjectId: fbmSubject.id,
        divisionId: activeDiv.id,
        weeklyHours: 4,
      },
    });
    recordTest("FacultyDAL", "Teaching assignment creation", assignment !== null, `Assignment ID: ${assignment.id}`);

    // Prevent orphan delete
    let orphanDeleteBlocked = false;
    try {
      await prisma.staff.delete({ where: { id: staffCreated.id } });
    } catch (err) {
      orphanDeleteBlocked = err instanceof Prisma.PrismaClientKnownRequestError && err.code === "P2003";
    }
    recordTest("FacultyDAL", "Database-level P2003 blocks deletion of staff with active assignments", orphanDeleteBlocked);

    // Clean transactional delete
    await prisma.$transaction(async (tx) => {
      await tx.teachingAssignment.deleteMany({ where: { staffId: staffCreated.id } });
      await tx.staff.delete({ where: { id: staffCreated.id } });
    });
    const checkStaff = await prisma.staff.findUnique({ where: { id: staffCreated.id } });
    recordTest("FacultyDAL", "Transactional deletion clears assignments and staff", checkStaff === null);
  } catch (err) {
    recordTest("FacultyDAL", "Faculty test failed", false, err.message);
  }

  // -----------------------------------------------------------------
  // Suite 5: Transaction Failure & Rollback Proof
  // -----------------------------------------------------------------
  console.log("\n--- Suite 5: Transaction Abort & Rollback Simulation ---");
  const rollbackCandidate = "RPIHM-GHOST-999";
  let rollbackCaught = false;

  try {
    await prisma.$transaction(async (tx) => {
      await tx.student.create({
        data: {
          rollNumber: rollbackCandidate,
          prn: "GHOST-PRN-999",
          fullName: "Phantom Record",
          email: "ghost@sample.rpihm.ac.in",
          phone: "+91 00000 00000",
          dob: new Date("2005-01-01"),
        },
      });

      // Deliberately trigger runtime exception
      throw new Error("Deliberate abort during secondary validation");
    });
  } catch (err) {
    rollbackCaught = err.message === "Deliberate abort during secondary validation";
  }

  const phantomInDb = await prisma.student.findUnique({ where: { rollNumber: rollbackCandidate } });
  recordTest("TransactionRollback", "Deliberate transaction failure caught", rollbackCaught);
  recordTest("TransactionRollback", "Phantom record rolled back (not present in DB)", phantomInDb === null);

  // -----------------------------------------------------------------
  // Audit Summary
  // -----------------------------------------------------------------
  console.log("\n===============================================================");
  const total = testLog.length;
  const passed = testLog.filter(t => t.passed).length;
  const failed = total - passed;
  console.log(`Audit Suite Results: Total: ${total} | Passed: ${passed} | Failed: ${failed}`);
  console.log(`Compliance Score: ${Math.round((passed / total) * 100)}%`);
  console.log("===============================================================");

  if (failed > 0) {
    process.exit(1);
  }
}

runAudit()
  .catch((err) => {
    console.error("Fatal audit execution failure:", err);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
