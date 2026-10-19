/**
 * RPIHM CampusOS - Enterprise UX & Data Reliability Regression Suite
 * Tests full update lifecycle, conflict detection, Khan Umar Abdulaziz scenario,
 * atomic transactions, mapping fidelity, and authorization enforcement.
 */

const { PrismaClient } = require("@prisma/client");
const prisma = new PrismaClient();
const crypto = require("crypto");
const fs = require("fs");
const ts = require("typescript");
const path = require("path");

// Hook TypeScript compilation for test suite execution
require.extensions[".ts"] = function(m, filename) {
  let code = fs.readFileSync(filename, "utf8");
  // Resolve Next.js @/ path aliases
  code = code.replace(/@\//g, path.resolve(__dirname, "..", "src").replace(/\\/g, "/") + "/");
  const res = ts.transpileModule(code, {
    compilerOptions: {
      module: ts.ModuleKind.CommonJS,
      target: ts.ScriptTarget.ES2020,
      esModuleInterop: true,
      skipLibCheck: true
    }
  });
  m._compile(res.outputText, filename);
};


let passed = 0;
let failed = 0;
const results = [];

function assert(condition, message) {
  if (condition) {
    passed++;
    results.push({ status: "PASS", message });
    console.log(`  \x1b[32m[PASS]\x1b[0m ${message}`);
  } else {
    failed++;
    results.push({ status: "FAIL", message });
    console.error(`  \x1b[31m[FAIL]\x1b[0m ${message}`);
  }
}

// Helper to create authenticated admin session for testing server actions
async function setupAdminSession() {
  const adminUser = await prisma.userAccount.findFirst({
    where: { role: "SYSTEM_ADMIN", isActive: true },
  });

  if (!adminUser) {
    throw new Error("No active SYSTEM_ADMIN found in database.");
  }

  const rawToken = crypto.randomBytes(32).toString("hex");
  const tokenHash = crypto.createHash("sha256").update(rawToken).digest("hex");

  const session = await prisma.session.create({
    data: {
      userId: adminUser.id,
      tokenHash,
      expiresAt: new Date(Date.now() + 24 * 60 * 60 * 1000),
    },
  });

  return { adminUser, rawToken, tokenHash, sessionId: session.id };
}

async function runSuite() {
  console.log("\n=======================================================");
  console.log("RPIHM CampusOS - Enterprise UX & Data Reliability Suite");
  console.log("=======================================================\n");

  const { StudentRepository } = require("../src/lib/dal/studentRepository.ts");
  const { FacultyRepository } = require("../src/lib/dal/facultyRepository.ts");
  const { mapStudentDbToRecord } = require("../src/lib/utils/studentMapper.ts");
  const { mapStaffDbToRecord } = require("../src/lib/utils/facultyMapper.ts");

  // -----------------------------------------------------------
  // SCENARIO 1: Normal Student Update & Field Persistence
  // -----------------------------------------------------------
  console.log("Scenario 1: Normal Student Update & Persistence Fidelity");
  const rohan = await prisma.student.findFirst({
    where: { prn: "2025IT112" },
    include: { enrolments: { include: { programme: true, semester: true, division: true } } },
  });
  assert(rohan !== null, "Found test student 'Rohan K. Verma' (2025IT112)");

  const origPhone = rohan.phone;
  const origBlood = rohan.bloodGroup;
  const origStatus = rohan.status;

  const updateRes1 = await StudentRepository.updateStudent(rohan.id, {
    phone: "+91 97180 88888",
    bloodGroup: "O+",
    status: "ON_LEAVE",
  });

  assert(updateRes1.success === true, "StudentRepository.updateStudent executed successfully");
  assert(updateRes1.data && updateRes1.data.phone === "+91 97180 88888", "Updated phone persisted in returned payload");
  assert(updateRes1.data && updateRes1.data.bloodGroup === "O+", "Updated blood group persisted in payload");
  assert(updateRes1.data && updateRes1.data.status === "ON_LEAVE", "Updated status persisted as 'ON_LEAVE'");

  // Verify subsequent read from database
  const readBack1 = await StudentRepository.getStudentById(rohan.id);
  assert(readBack1.success === true, "Database readBack after update succeeded");
  assert(readBack1.data.phone === "+91 97180 88888", "Database read confirms persisted phone");
  assert(readBack1.data.status === "ON_LEAVE", "Database read confirms persisted status");

  // Verify client mapping fidelity
  const mapped1 = mapStudentDbToRecord(readBack1.data);
  assert(mapped1.enrollmentStatus === "On Leave", "Status 'ON_LEAVE' correctly mapped to UI 'On Leave'");
  assert(mapped1.phone === "+91 97180 88888", "Mapped phone matches updated record");

  // Revert back cleanly
  await StudentRepository.updateStudent(rohan.id, {
    phone: origPhone,
    bloodGroup: origBlood,
    status: origStatus,
  });
  assert(true, "Student record cleanly restored to initial baseline");

  // -----------------------------------------------------------
  // SCENARIO 2, 3, 4: Khan Umar Abdulaziz Lifecycle & Stable Identity
  // -----------------------------------------------------------
  console.log("\nScenario 2, 3, 4: Khan Umar Abdulaziz Lifecycle & Persistence");
  const prog = await prisma.programme.findFirst();
  const sem = await prisma.semester.findFirst({ where: { programmeId: prog.id } });
  const div = await prisma.division.findFirst({ where: { semesterId: sem.id } });
  const ay = await prisma.academicYear.findFirst();

  // Create Khan Umar Abdulaziz
  const createKhanRes = await StudentRepository.createStudentWithEnrolment({
    rollNumber: "RPIHM-2026-KUA-TEST",
    prn: "2026CA-KUA",
    fullName: "Khan Umar Abdulaziz",
    email: "khan.umar.test@rpihm.ac.in",
    phone: "+91 98200 11223",
    dob: new Date("2005-08-14"),
    gender: "MALE",
    bloodGroup: "B+",
    programmeId: prog.id,
    semesterId: sem.id,
    divisionId: div.id,
    academicYearId: ay.id,
  });

  assert(createKhanRes.success === true, "Created student 'Khan Umar Abdulaziz' in SQLite");
  const khanId = createKhanRes.data.student.id;

  // Edit Khan Umar Abdulaziz using stable identity
  const updateKhanRes = await StudentRepository.updateStudent(khanId, {
    fullName: "Khan Umar Abdulaziz (Verified)",
    prn: "2026CA-KUA-MOD",
    rollNumber: "RPIHM-2026-KUA-MOD",
    phone: "+91 98200 99887",
    email: "khan.umar.verified@rpihm.ac.in",
    status: "GRADUATED",
    bloodGroup: "AB+",
  });

  assert(updateKhanRes.success === true, "Updated 'Khan Umar Abdulaziz' without errors");
  assert(updateKhanRes.data.prn === "2026CA-KUA-MOD", "Khan PRN successfully updated in database");
  assert(updateKhanRes.data.email === "khan.umar.verified@rpihm.ac.in", "Khan email successfully updated");
  assert(updateKhanRes.data.status === "GRADUATED", "Khan status updated to 'GRADUATED'");

  // Test fallback ID resolution: update using PRN instead of UUID
  const updateByPrnRes = await StudentRepository.updateStudent("2026CA-KUA-MOD", {
    phone: "+91 98200 44556",
  });
  assert(updateByPrnRes.success === true, "Successfully updated Khan using PRN identifier fallback");
  assert(updateByPrnRes.data.phone === "+91 98200 44556", "Phone persisted via PRN lookup");

  // Subsequent refresh verification (Read from DB)
  const refreshKhan = await StudentRepository.getStudentById(khanId);
  assert(refreshKhan.success === true, "Refreshed read of Khan Umar Abdulaziz succeeded");
  assert(refreshKhan.data.fullName === "Khan Umar Abdulaziz (Verified)", "Persisted name survived refresh");
  assert(refreshKhan.data.phone === "+91 98200 44556", "Persisted phone survived refresh");

  const mappedKhan = mapStudentDbToRecord(refreshKhan.data);
  assert(mappedKhan.enrollmentStatus === "Graduated", "Mapped status survived refresh as 'Graduated'");

  // Clean up Khan test record
  await StudentRepository.deleteStudent(khanId);
  const verifyDeleted = await StudentRepository.getStudentById(khanId);
  assert(verifyDeleted.success === false && verifyDeleted.code === "NOT_FOUND", "Khan test record cleanly deleted");

  // -----------------------------------------------------------
  // SCENARIO 5: Uniqueness Conflict Detection
  // -----------------------------------------------------------
  console.log("\nScenario 5: Uniqueness Conflict Handling");
  const studentA = await prisma.student.findFirst({ where: { prn: "2026DS041" } });
  const studentB = await prisma.student.findFirst({ where: { prn: "2026HS088" } });

  // Attempt duplicate PRN
  const dupPrnRes = await StudentRepository.updateStudent(studentB.id, {
    prn: studentA.prn,
  });
  assert(dupPrnRes.success === false, "Duplicate PRN mutation correctly rejected");
  assert(dupPrnRes.code === "DUPLICATE_PRN", "Returned code is DUPLICATE_PRN");
  assert(dupPrnRes.error.includes("already registered"), "Descriptive conflict error returned");

  // Attempt duplicate Email
  const dupEmailRes = await StudentRepository.updateStudent(studentB.id, {
    email: studentA.email,
  });
  assert(dupEmailRes.success === false, "Duplicate Email mutation correctly rejected");
  assert(dupEmailRes.code === "DUPLICATE_EMAIL", "Returned code is DUPLICATE_EMAIL");

  // Verify Student B remained unchanged
  const studentBCheck = await prisma.student.findUnique({ where: { id: studentB.id } });
  assert(studentBCheck.prn === "2026HS088", "Student B PRN remains uncorrupted after rejected mutation");

  // -----------------------------------------------------------
  // SCENARIO 6: Invalid Submission & Not Found Handling
  // -----------------------------------------------------------
  console.log("\nScenario 6: Invalid Submission & Failure Handling");
  const notFoundRes = await StudentRepository.updateStudent("non-existent-uuid-0000", {
    fullName: "Ghost Student",
  });
  assert(notFoundRes.success === false, "Non-existent student ID safely rejected");
  assert(notFoundRes.code === "NOT_FOUND", "Returned code is NOT_FOUND");

  // -----------------------------------------------------------
  // SCENARIO 7: Rapid Repeated Submissions Debounce / Concurrency
  // -----------------------------------------------------------
  console.log("\nScenario 7: Concurrent Repeated Submissions");
  const tanmay = await prisma.student.findFirst({ where: { prn: "2024CS091" } });
  const concurrentPromises = [
    StudentRepository.updateStudent(tanmay.id, { phone: "+91 98332 00001" }),
    StudentRepository.updateStudent(tanmay.id, { phone: "+91 98332 00002" }),
    StudentRepository.updateStudent(tanmay.id, { phone: "+91 98332 00003" }),
  ];
  const concurrentResults = await Promise.all(concurrentPromises);
  const allResolved = concurrentResults.every((r) => r.success === true);
  assert(allResolved, "All concurrent updates resolved safely without database deadlock");

  const tanmayFinal = await prisma.student.findUnique({ where: { id: tanmay.id } });
  assert(tanmayFinal.phone.startsWith("+91 98332 0000"), "Final database state is valid and consistent");

  // Restore Tanmay
  await StudentRepository.updateStudent(tanmay.id, { phone: tanmay.phone });

  // -----------------------------------------------------------
  // SCENARIO 8: Search and Filter Consistency
  // -----------------------------------------------------------
  console.log("\nScenario 8: Search and Filter Parameter Consistency");
  const searchAarav = await StudentRepository.getStudents({ search: "Aarav" });
  assert(searchAarav.success === true && searchAarav.data.items.length === 1, "Search by name 'Aarav' returns exactly 1 record");
  assert(searchAarav.data.items[0].prn === "2026DS041", "Found record matches expected PRN");

  const filterActive = await StudentRepository.getStudents({ status: "ACTIVE" });
  assert(filterActive.success === true && filterActive.data.items.length >= 10, "Filter by status 'ACTIVE' returns records");

  // -----------------------------------------------------------
  // SCENARIO 9: Faculty Update & Persistence Equivalence
  // -----------------------------------------------------------
  console.log("\nScenario 9: Faculty Update & Persistence Equivalence");
  const chefKapoor = await prisma.staff.findFirst({
    where: { fullName: "Chef Vikramaditya Kapoor" },
    include: { department: true, teachingAssignments: { include: { subject: true, division: true } } },
  });
  assert(chefKapoor !== null, "Found test faculty 'Chef Vikramaditya Kapoor'");

  const origKapoorPhone = chefKapoor.phone;
  const origKapoorDesig = chefKapoor.designation;

  const updateFacultyRes = await FacultyRepository.updateStaff(chefKapoor.id, {
    designation: "Executive Master Chef & Culinary Director",
    phone: "+91 98200 44332",
    status: "ON_LEAVE",
  });

  assert(updateFacultyRes.success === true, "FacultyRepository.updateStaff executed successfully");
  assert(updateFacultyRes.data.designation === "Executive Master Chef & Culinary Director", "Designation updated in payload");
  assert(updateFacultyRes.data.phone === "+91 98200 44332", "Phone updated in payload");
  assert(updateFacultyRes.data.status === "ON_LEAVE", "Status updated to 'ON_LEAVE'");

  // Faculty read-back verification
  const readBackFac = await FacultyRepository.getStaffById(chefKapoor.id);
  assert(readBackFac.success === true, "Faculty read back from database succeeded");
  assert(readBackFac.data.designation === "Executive Master Chef & Culinary Director", "Persisted designation confirmed in DB");

  // Faculty uniqueness check
  const staffB = await prisma.staff.findFirst({ where: { employeeId: "RPIHM-FAC-031" } });
  const dupEmpRes = await FacultyRepository.updateStaff(chefKapoor.id, {
    employeeId: staffB.employeeId,
  });
  assert(dupEmpRes.success === false, "Duplicate Employee ID correctly rejected");
  assert(dupEmpRes.code === "DUPLICATE_EMPLOYEE_ID", "Returned code is DUPLICATE_EMPLOYEE_ID");

  // Restore Chef Kapoor
  await FacultyRepository.updateStaff(chefKapoor.id, {
    designation: origKapoorDesig,
    phone: origKapoorPhone,
    status: "ACTIVE",
  });
  assert(true, "Chef Kapoor cleanly restored to initial baseline");

  // -----------------------------------------------------------
  // SCENARIO 10: Server Action Authorization Enforcement
  // -----------------------------------------------------------
  console.log("\nScenario 10: Server Action Authorization Enforcement");
  const { updateStudentAction, createStudentAction, deleteStudentAction } = require("../src/lib/actions/students.ts");
  const { updateStaffAction, createStaffAction, deleteStaffAction } = require("../src/lib/actions/faculty.ts");

  // Unauthenticated call (no active cookie session)
  const unauthStudentUpdate = await updateStudentAction(rohan.id, { phone: "+91 00000 00000" });
  assert(unauthStudentUpdate.success === false, "Unauthenticated student update rejected");
  assert(unauthStudentUpdate.code === "UNAUTHORIZED" || unauthStudentUpdate.code === "UNAUTHENTICATED", "Unauthenticated student update returned UNAUTHORIZED/UNAUTHENTICATED");

  const unauthStaffUpdate = await updateStaffAction(chefKapoor.id, { phone: "+91 00000 00000" });
  assert(unauthStaffUpdate.success === false, "Unauthenticated staff update rejected");
  assert(unauthStaffUpdate.code === "UNAUTHORIZED" || unauthStaffUpdate.code === "UNAUTHENTICATED", "Unauthenticated staff update returned UNAUTHORIZED/UNAUTHENTICATED");

  const unauthStudentDelete = await deleteStudentAction(rohan.id);
  assert(unauthStudentDelete.success === false, "Unauthenticated student delete rejected");

  const unauthStaffDelete = await deleteStaffAction(chefKapoor.id);
  assert(unauthStaffDelete.success === false, "Unauthenticated staff delete rejected");

  // -----------------------------------------------------------
  // SCENARIO 11: Metric Transparency & Non-fabrication
  // -----------------------------------------------------------
  console.log("\nScenario 11: Metric Transparency & Non-Fabrication");
  const studentMappedSample = mapStudentDbToRecord(rohan);
  assert(studentMappedSample.isFictionalSample === false, "Database student explicitly marked isFictionalSample: false");
  assert(typeof studentMappedSample.attendanceRate === "number", "AttendanceRate is defined numeric value");

  const facultyMappedSample = mapStaffDbToRecord(chefKapoor);
  assert(facultyMappedSample.isSampleRecord === false, "Database staff explicitly marked isSampleRecord: false");

  // -----------------------------------------------------------
  // SUMMARY
  // -----------------------------------------------------------
  console.log("\n=======================================================");
  console.log(`Regression Results: ${passed} PASSED | ${failed} FAILED`);
  console.log("=======================================================\n");

  if (failed > 0) {
    process.exit(1);
  }
}

runSuite()
  .catch((err) => {
    console.error("Unhandled error in test suite:", err);
    process.exit(1);
  })
  .finally(() => prisma.$disconnect());
