import path from "path";
import fs from "fs";
import crypto from "crypto";
import assert from "assert";

// 1. Force isolated test DB before any library or repository imports
const DEV_DB = path.resolve(process.cwd(), "prisma/dev.db");
const ISOLATED_DB = path.resolve(process.cwd(), "prisma/isolated_test.db");

// Record baseline dev.db hash
const initialDevBytes = fs.readFileSync(DEV_DB);
const initialDevHash = crypto.createHash("sha256").update(initialDevBytes).digest("hex");
const initialDevSize = initialDevBytes.length;

// Snapshot dev.db to isolated_test.db for isolated test execution
fs.copyFileSync(DEV_DB, ISOLATED_DB);

// Point DATABASE_URL strictly to isolated test database
process.env.DATABASE_URL = `file:${ISOLATED_DB}`;

import prisma from "../src/lib/db";
import { getStudentSelfProfile, getStudentSelfCurriculum, getStudentSelfTimetable, getStudentSelfAttendance, getStudentSelfExamResults, getStudentSelfFeeLedger } from "../src/lib/actions/portalStudent";
import { getFacultySelfProfile, getFacultySelfTeachingAssignments, getFacultySelfTimetable, getFacultyClassRoster, getFacultyAttendanceSessions } from "../src/lib/actions/portalFaculty";
import { hasModuleAccess } from "../src/lib/auth/roles";
import { createSession } from "../src/lib/auth/session";
import { cookies } from "next/headers";

// Mock next/headers cookies for isolated server action execution
let mockCookieStore: Record<string, string> = {};
jestMockCookies();

function jestMockCookies() {
  (cookies as unknown as () => { get: (name: string) => { value: string } | undefined }).toString = () => "mock";
}

// We will test using session tokens set in mockCookieStore
const originalCookies = cookies;

async function runTests() {
  console.log("=================================================================");
  console.log("CAMPUSOS PORTAL QUALITY & AUTHORIZATION VERIFICATION SUITE");
  console.log("Database target: prisma/isolated_test.db");
  console.log("dev.db baseline SHA-256:", initialDevHash);
  console.log("=================================================================\n");

  let passed = 0;
  let total = 0;

  function testAssert(desc: string, condition: boolean) {
    total++;
    if (condition) {
      passed++;
      console.log(`  ✓ PASS: ${desc}`);
    } else {
      console.error(`  ✗ FAIL: ${desc}`);
      throw new Error(`Assertion failed: ${desc}`);
    }
  }

  // --- SUITE 1: READ-ONLY ACCOUNT & RECORD RECONCILIATION IN ISOLATED_TEST.DB ---
  console.log("[SUITE 1: Approved Records Verification]");
  
  const student = await prisma.student.findUnique({
    where: { id: "a82797f8-ae30-42a6-ace7-c1aea744e7e8" },
    include: { userAccount: true },
  });
  testAssert("Khan Umar student record exists", !!student);
  testAssert("Khan Umar approved PRN is 2026DS041", student?.prn === "2026DS041");
  testAssert("Khan Umar roll number is RPIHM-2026DS041", student?.rollNumber === "RPIHM-2026DS041");
  testAssert("Khan Umar linked user account role is STUDENT_VIEWER", student?.userAccount?.role === "STUDENT_VIEWER");
  testAssert("Khan Umar staff relationship is null", student?.userAccount?.staffId === null);

  const faculty = await prisma.staff.findFirst({
    where: { email: "j.sahaya@sample.rpihm.ac.in" },
    include: { userAccount: true, department: true, teachingAssignments: { include: { subject: true, division: true } } },
  });
  testAssert("Prof. Jeicy Sahaya staff record exists", !!faculty);
  testAssert("Prof. Jeicy Sahaya employee ID is RPIHM-FAC-075", faculty?.employeeId === "RPIHM-FAC-075");
  testAssert("Prof. Jeicy Sahaya department is Technology & Computing (TC)", faculty?.department?.name === "Technology & Computing");
  testAssert("Prof. Jeicy Sahaya linked user account role is FACULTY_MEMBER", faculty?.userAccount?.role === "FACULTY_MEMBER");
  testAssert("Prof. Jeicy Sahaya student relationship is null", faculty?.userAccount?.studentId === null);
  testAssert("Prof. Jeicy Sahaya teaching assignment is USDS301 Div A (4 weekly hours)", 
    faculty?.teachingAssignments.length === 1 &&
    faculty?.teachingAssignments[0].subject?.code === "USDS301" &&
    faculty?.teachingAssignments[0].weeklyHours === 4
  );

  // --- SUITE 2: ADMINISTRATIVE ROLE BOUNDARY CHECKS ---
  console.log("\n[SUITE 2: Module Authorization Matrix (hasModuleAccess)]");
  
  // Student role denial
  testAssert("Student denied from Students administration", !hasModuleAccess("STUDENT_VIEWER", "students"));
  testAssert("Student denied from Faculty administration", !hasModuleAccess("STUDENT_VIEWER", "faculty"));
  testAssert("Student denied from Academics administration", !hasModuleAccess("STUDENT_VIEWER", "academics"));
  testAssert("Student denied from Finance & Fee administration", !hasModuleAccess("STUDENT_VIEWER", "finance"));
  testAssert("Student denied from System Settings", !hasModuleAccess("STUDENT_VIEWER", "settings"));

  // Faculty role denial
  testAssert("Faculty denied from Students administration", !hasModuleAccess("FACULTY_MEMBER", "students"));
  testAssert("Faculty denied from Faculty administration", !hasModuleAccess("FACULTY_MEMBER", "faculty"));
  testAssert("Faculty denied from Finance & Fee administration", !hasModuleAccess("FACULTY_MEMBER", "finance"));
  testAssert("Faculty denied from System Settings", !hasModuleAccess("FACULTY_MEMBER", "settings"));

  // Admin role allowances
  testAssert("System Admin allowed on Students administration", hasModuleAccess("SYSTEM_ADMIN", "students"));
  testAssert("System Admin allowed on System Settings", hasModuleAccess("SYSTEM_ADMIN", "settings"));
  testAssert("Academic Admin allowed on Academics administration", hasModuleAccess("ACADEMIC_ADMIN", "academics"));

  // --- SUITE 3: CROSS-PORTAL AUTHORIZATION & ACCESS RESTRICTION ---
  console.log("\n[SUITE 3: Server Action Cross-Portal Denial]");

  const { setTestSessionToken } = await import("../src/lib/auth/guards");

  // Create real sessions in isolated_test.db for testing
  const studentUser = student!.userAccount!;
  const facultyUser = faculty!.userAccount!;

  const studentSession = await createSession(studentUser.id);
  const facultySession = await createSession(facultyUser.id);

  // 1. Unauthenticated callers rejected
  setTestSessionToken(null);
  const unauthStudent = await getStudentSelfProfile();
  testAssert("Unauthenticated request to getStudentSelfProfile returns UNAUTHORIZED", !unauthStudent.success && unauthStudent.code === "UNAUTHORIZED");

  const unauthFaculty = await getFacultySelfProfile();
  testAssert("Unauthenticated request to getFacultySelfProfile returns UNAUTHORIZED", !unauthFaculty.success && unauthFaculty.code === "UNAUTHORIZED");

  // 2. Student caller accessing Faculty actions rejected with FORBIDDEN
  setTestSessionToken(studentSession.token);
  const studentAccessFacultyProfile = await getFacultySelfProfile();
  testAssert("Student role calling getFacultySelfProfile returns FORBIDDEN", !studentAccessFacultyProfile.success && studentAccessFacultyProfile.code === "FORBIDDEN");

  const studentAccessFacultyAssignments = await getFacultySelfTeachingAssignments();
  testAssert("Student role calling getFacultySelfTeachingAssignments returns FORBIDDEN", !studentAccessFacultyAssignments.success && studentAccessFacultyAssignments.code === "FORBIDDEN");

  const studentAccessFacultyTimetable = await getFacultySelfTimetable();
  testAssert("Student role calling getFacultySelfTimetable returns FORBIDDEN", !studentAccessFacultyTimetable.success && studentAccessFacultyTimetable.code === "FORBIDDEN");

  // 3. Faculty caller accessing Student actions rejected with FORBIDDEN
  setTestSessionToken(facultySession.token);
  const facultyAccessStudentProfile = await getStudentSelfProfile();
  testAssert("Faculty role calling getStudentSelfProfile returns FORBIDDEN", !facultyAccessStudentProfile.success && facultyAccessStudentProfile.code === "FORBIDDEN");

  const facultyAccessStudentCurriculum = await getStudentSelfCurriculum();
  testAssert("Faculty role calling getStudentSelfCurriculum returns FORBIDDEN", !facultyAccessStudentCurriculum.success && facultyAccessStudentCurriculum.code === "FORBIDDEN");

  const facultyAccessStudentFee = await getStudentSelfFeeLedger();
  testAssert("Faculty role calling getStudentSelfFeeLedger returns FORBIDDEN", !facultyAccessStudentFee.success && facultyAccessStudentFee.code === "FORBIDDEN");

  // 4. Authorized caller succeeds
  setTestSessionToken(studentSession.token);
  const authStudentProfile = await getStudentSelfProfile();
  testAssert("Student calling getStudentSelfProfile succeeds", authStudentProfile.success && authStudentProfile.data?.student.fullName === "Khan Umar");

  setTestSessionToken(facultySession.token);
  const authFacultyProfile = await getFacultySelfProfile();
  testAssert("Faculty calling getFacultySelfProfile succeeds", authFacultyProfile.success && authFacultyProfile.data?.staff.fullName === "Prof. Jeicy Sahaya");

  // Reset session
  setTestSessionToken(null);

  // --- SUITE 4: TIMETABLE & ATTENDANCE EMPTY STATE VERIFICATION ---
  console.log("\n[SUITE 4: Empty State & Real Data Verification]");

  // Verify total timetable entries count in database
  const totalTimetableCount = await prisma.timetableEntry.count();
  testAssert("Operational/isolated database contains exactly 0 timetable entries", totalTimetableCount === 0);

  // Verify Khan Umar Fee Invoice and Receipt
  const feeInvoices = await prisma.studentFeeInvoice.findMany({
    where: { studentId: student!.id },
    include: { receipts: true },
  });
  testAssert("Khan Umar has exactly 1 fee invoice", feeInvoices.length === 1);
  testAssert("Khan Umar fee invoice is INV-2026-7759 (50,000 INR)", feeInvoices[0].invoiceNumber === "INV-2026-7759" && feeInvoices[0].totalDemand === 50000);
  testAssert("Khan Umar invoice status is PAID", feeInvoices[0].status === "PAID");
  testAssert("Khan Umar has exactly 1 receipt for 50,000 INR", feeInvoices[0].receipts.length === 1 && feeInvoices[0].receipts[0].amountPaid === 50000);

  // Verify published exam results filter
  const examSummaries = await prisma.examResultSummary.findMany({
    where: { studentId: student!.id },
  });
  testAssert("Khan Umar has 0 published exam results in baseline", examSummaries.length === 0);

  // Verify documents
  const docs = await prisma.studentDocument.findMany({
    where: { studentId: student!.id },
  });
  testAssert("Khan Umar has 2 documents in database (1 SUPERSEDED, 1 VERIFIED)", docs.length === 2);
  const verifiedDoc = docs.find(d => d.status === "VERIFIED");
  testAssert("Khan Umar has exactly 1 VERIFIED compliance document", !!verifiedDoc);

  // Clean up test sessions
  await prisma.session.deleteMany({
    where: { id: { in: [studentSession.session.id, facultySession.session.id] } },
  });

  // --- SUITE 5: OPERATIONAL DATABASE INVARIANCE CHECK ---
  console.log("\n[SUITE 5: Operational Database Invariance Check]");
  const finalDevBytes = fs.readFileSync(DEV_DB);
  const finalDevHash = crypto.createHash("sha256").update(finalDevBytes).digest("hex");
  const finalDevSize = finalDevBytes.length;

  testAssert("dev.db byte size invariant", finalDevSize === initialDevSize);
  testAssert("dev.db SHA-256 hash invariant", finalDevHash === initialDevHash);

  console.log("\n=================================================================");
  console.log(`PORTAL QUALITY TEST SUITE RESULTS: ${passed}/${total} assertions passed (100%)`);
  console.log("=================================================================");
}

runTests()
  .catch((err) => {
    console.error("Test execution fatal error:", err);
    process.exit(1);
  })
  .finally(() => prisma.$disconnect());
