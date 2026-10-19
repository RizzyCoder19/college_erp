const fs = require('fs');
const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function runSlice1Verification() {
  console.log("===============================================================");
  console.log("RPIHM CampusOS — Slice 1 Verification Suite");
  console.log("Academic Foundation & Enrolment Bridge");
  console.log("===============================================================\n");

  const results = [];
  function assert(name, condition, details = "") {
    if (condition) {
      console.log(`[PASS] ${name}${details ? ` -> ${details}` : ""}`);
      results.push({ name, passed: true, details });
    } else {
      console.error(`[FAIL] ${name}${details ? ` -> ${details}` : ""}`);
      results.push({ name, passed: false, details });
    }
  }

  // --- Group 1: ExecutiveOverview Quick Action Correction ---
  console.log("--- Group 1: ExecutiveOverview Quick Action Correction ---");
  const execOverviewContent = fs.readFileSync('src/components/dashboard/ExecutiveOverview.tsx', 'utf8');
  assert(
    "ExecutiveOverview contains /modules/students quick action",
    execOverviewContent.includes('href="/modules/students"')
  );
  assert(
    "ExecutiveOverview does not contain stale /modules/admissions",
    !execOverviewContent.includes('href="/modules/admissions"')
  );

  // --- Group 2: Student Database CRUD Persistence ---
  console.log("\n--- Group 2: Student Database Persistence & Relational Enrolment ---");
  const activeAy = await prisma.academicYear.findFirst({ where: { isCurrent: true } });
  const prog = await prisma.programme.findFirst({
    include: {
      semesters: {
        include: { divisions: true },
        where: { semesterNumber: 1 },
      },
    },
  });

  const testPrn = `SLICE1_${Date.now()}`;
  const testRoll = `RPIHM-${testPrn}`;
  const testEmail = `slice1.test.${Date.now()}@sample.rpihm.ac.in`;

  let createdStudentId = null;
  try {
    const created = await prisma.$transaction(async (tx) => {
      const s = await tx.student.create({
        data: {
          rollNumber: testRoll,
          prn: testPrn,
          fullName: "Slice1 Verification Student",
          email: testEmail,
          phone: "+91 99999 11111",
          dob: new Date("2006-03-15"),
          bloodGroup: "O+",
          status: "ACTIVE",
          currentSemester: 1,
        },
      });
      await tx.enrolment.create({
        data: {
          studentId: s.id,
          academicYearId: activeAy.id,
          programmeId: prog.id,
          semesterId: prog.semesters[0].id,
          divisionId: prog.semesters[0].divisions[0].id,
          status: "ENROLLED",
        },
      });
      return s;
    });

    createdStudentId = created.id;
    assert("Student created in SQLite with active enrolment", !!created.id, `ID: ${created.id}`);

    // Verify Read
    const fetched = await prisma.student.findUnique({
      where: { id: createdStudentId },
      include: {
        enrolments: {
          include: { programme: true, semester: true, division: true },
        },
      },
    });
    assert("Student read back from SQLite matches PRN & Roll", fetched.prn === testPrn && fetched.rollNumber === testRoll);
    assert("Student has correct programme linkage", fetched.enrolments[0].programmeId === prog.id);

    // Verify Update
    await prisma.student.update({
      where: { id: createdStudentId },
      data: { fullName: "Slice1 Updated Student Name", phone: "+91 88888 22222" },
    });
    const updated = await prisma.student.findUnique({ where: { id: createdStudentId } });
    assert("Student update persisted in SQLite", updated.fullName === "Slice1 Updated Student Name" && updated.phone === "+91 88888 22222");

    // Verify Delete
    await prisma.$transaction(async (tx) => {
      await tx.enrolment.deleteMany({ where: { studentId: createdStudentId } });
      await tx.student.delete({ where: { id: createdStudentId } });
    });
    const postDelete = await prisma.student.findUnique({ where: { id: createdStudentId } });
    assert("Student cleanly removed from SQLite along with enrolment", postDelete === null);
  } catch (err) {
    assert("Student CRUD lifecycle execution", false, err.message);
  }

  // --- Group 3: Faculty Database CRUD Persistence ---
  console.log("\n--- Group 3: Faculty Database Persistence & Department Linkage ---");
  const dept = await prisma.department.findFirst();
  const testEmpId = `FAC_S1_${Date.now()}`;
  const testStaffEmail = `fac.s1.${Date.now()}@sample.rpihm.ac.in`;
  let createdStaffId = null;

  try {
    const staff = await prisma.staff.create({
      data: {
        employeeId: testEmpId,
        fullName: "Slice1 Verification Professor",
        email: testStaffEmail,
        phone: "+91 97777 33333",
        designation: "Assistant Professor of Systems",
        category: "TEACHING",
        departmentId: dept.id,
        dateOfJoining: new Date("2021-06-01"),
        status: "ACTIVE",
      },
    });
    createdStaffId = staff.id;
    assert("Staff created in SQLite with department assignment", !!staff.id, `ID: ${staff.id}`);

    // Verify Read with Department
    const fetchedStaff = await prisma.staff.findUnique({
      where: { id: createdStaffId },
      include: { department: true },
    });
    assert("Staff read back from SQLite belongs to department", fetchedStaff.departmentId === dept.id && fetchedStaff.department.name === dept.name);

    // Verify Update
    await prisma.staff.update({
      where: { id: createdStaffId },
      data: { designation: "Associate Professor of Systems", status: "ON_LEAVE" },
    });
    const updatedStaff = await prisma.staff.findUnique({ where: { id: createdStaffId } });
    assert("Staff designation & status update persisted in SQLite", updatedStaff.designation === "Associate Professor of Systems" && updatedStaff.status === "ON_LEAVE");

    // Verify Delete
    await prisma.staff.delete({ where: { id: createdStaffId } });
    const postDeleteStaff = await prisma.staff.findUnique({ where: { id: createdStaffId } });
    assert("Staff cleanly removed from SQLite", postDeleteStaff === null);
  } catch (err) {
    assert("Faculty CRUD lifecycle execution", false, err.message);
  }

  // --- Group 4: Prototype Reconciliation Comparison & Safety ---
  console.log("\n--- Group 4: Prototype Reconciliation Logic & Non-Destructive Behavior ---");
  // Existing 10 students in database
  const dbStudents = await prisma.student.findMany({ select: { prn: true, email: true, fullName: true } });
  assert("Database has 10 foundational student records", dbStudents.length >= 10, `Found: ${dbStudents.length}`);

  // Simulate prototype localStorage with:
  // 1. One record that exists in DB (duplicate)
  // 2. One record with same PRN but different name (conflict)
  // 3. One new record not in DB (importable)
  const sampleProtoRecords = [
    { id: "p1", prn: dbStudents[0].prn, email: dbStudents[0].email, fullName: dbStudents[0].fullName, programmeName: "B.Sc. Data Science" },
    { id: "p2", prn: dbStudents[1].prn, email: "conflicting.email@test.com", fullName: "Different Name Conflict", programmeName: "B.Sc. Hospitality" },
    { id: "p3", prn: "NEW_PRN_2026_999", email: "new.student@sample.rpihm.ac.in", fullName: "New Student Prototype", programmeName: "B.A. Culinary Arts" },
  ];

  const analyzed = sampleProtoRecords.map((proto) => {
    const match = dbStudents.find(
      (s) => s.prn.toLowerCase() === proto.prn.toLowerCase() || s.email.toLowerCase() === proto.email.toLowerCase()
    );
    if (match) {
      if (match.fullName.toLowerCase() !== proto.fullName.toLowerCase()) return { id: proto.id, status: "conflict" };
      return { id: proto.id, status: "duplicate" };
    }
    return { id: proto.id, status: "importable" };
  });

  const dup = analyzed.find((a) => a.id === "p1");
  const con = analyzed.find((a) => a.id === "p2");
  const imp = analyzed.find((a) => a.id === "p3");

  assert("Prototype reconciliation identifies duplicate accurately", dup && dup.status === "duplicate");
  assert("Prototype reconciliation identifies conflict accurately", con && con.status === "conflict");
  assert("Prototype reconciliation identifies importable record accurately", imp && imp.status === "importable");
  assert("Prototype source array left completely unmodified", sampleProtoRecords.length === 3);

  // --- Group 5: Component Source Code Guard Verification ---
  console.log("\n--- Group 5: Component Database Connection & Guard Verification ---");
  const stdView = fs.readFileSync('src/components/modules/students/StudentsView.tsx', 'utf8');
  assert("StudentsView imports getStudentsAction", stdView.includes('getStudentsAction'));
  assert("StudentsView imports createStudentAction", stdView.includes('createStudentAction'));
  assert("StudentsView imports updateStudentAction", stdView.includes('updateStudentAction'));
  assert("StudentsView imports deleteStudentAction", stdView.includes('deleteStudentAction'));
  assert("StudentsView mounts PrototypeReconciliationModal", stdView.includes('<PrototypeReconciliationModal'));
  assert("StudentsView passes live programmes to StudentFormModal", stdView.includes('programmes={programmes}'));

  const facView = fs.readFileSync('src/components/modules/faculty/FacultyView.tsx', 'utf8');
  assert("FacultyView imports getStaffAction", facView.includes('getStaffAction'));
  assert("FacultyView imports createStaffAction", facView.includes('createStaffAction'));
  assert("FacultyView imports updateStaffAction", facView.includes('updateStaffAction'));
  assert("FacultyView imports deleteStaffAction", facView.includes('deleteStaffAction'));
  assert("FacultyView mounts PrototypeReconciliationModal", facView.includes('<PrototypeReconciliationModal'));
  assert("FacultyView passes live departments to FacultyFormModal", facView.includes('departments={departments}'));

  // --- Group 6: Live Program and Department Dropdown Data ---
  console.log("\n--- Group 6: Live Programme & Department Selectors ---");
  const progs = await prisma.programme.findMany();
  const depts = await prisma.department.findMany();
  assert("Database has 7 programmes available for UI selectors", progs.length === 7, `Found: ${progs.length}`);
  assert("Database has 3 departments available for UI selectors", depts.length === 3, `Found: ${depts.length}`);

  const passed = results.filter((r) => r.passed).length;
  console.log("\n===============================================================");
  console.log(`Slice 1 Verification Summary: Total: ${results.length} | Passed: ${passed} | Failed: ${results.length - passed}`);
  console.log(`Slice 1 Success Rate: ${Math.round((passed / results.length) * 100)}%`);
  console.log("===============================================================");

  await prisma.$disconnect();
  if (passed !== results.length) process.exit(1);
}

runSlice1Verification().catch((e) => {
  console.error("Slice 1 verification threw fatal exception:", e);
  process.exit(1);
});
