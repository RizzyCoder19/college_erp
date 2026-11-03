/**
 * ============================================================================
 * CAMPUSOS ERP — MILESTONE 2A.4 STAGE 3: WORKSTREAM 2 TEST SUITE
 * FACULTY PORTAL WORKSPACE, AUTHORIZATION, AND ISOLATION
 * ============================================================================
 */

import path from "path";
import fs from "fs";
import crypto from "crypto";

const DEV_DB = path.resolve(process.cwd(), "prisma/dev.db");
const ISOLATED_DB = path.resolve(process.cwd(), "prisma/isolated_test.db");

// Force isolated test database before any modules are loaded
process.env.DATABASE_URL = `file:${ISOLATED_DB}`;
process.env.APP_ENV = "test";

let totalAssertions = 0;
let passedAssertions = 0;
let failedAssertions = 0;

function setSuite(name: string) {
  console.log(`\n[${name}]`);
}

function assert(condition: boolean, description: string, details?: Record<string, unknown>) {
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
  console.log("CAMPUSOS ERP: MILESTONE 2A.4 STAGE 3 WORKSTREAM 2 TESTS");
  console.log("FACULTY PORTAL WORKSPACE, AUTHORIZATION & PRIVACY");
  console.log("=================================================================");

  // 1. Record baseline dev.db hash
  const initialDevBuf = fs.readFileSync(DEV_DB);
  const initialHash = crypto.createHash("sha256").update(initialDevBuf).digest("hex");
  console.log(`Baseline dev.db SHA-256: ${initialHash} (${initialDevBuf.length} bytes)`);

  // =========================================================================
  // SUITE 1: Workstream 2 Code & Contract Verification
  // =========================================================================
  setSuite("SUITE 1: Workstream 2 Route & Component Contracts");

  const facultyPagePath = path.resolve(process.cwd(), "src/app/portal/faculty/page.tsx");
  const facultyViewPath = path.resolve(process.cwd(), "src/components/modules/portal/FacultyPortalView.tsx");
  const rootPagePath = path.resolve(process.cwd(), "src/app/page.tsx");
  const sidebarPath = path.resolve(process.cwd(), "src/components/layout/Sidebar.tsx");

  assert(fs.existsSync(facultyPagePath), "src/app/portal/faculty/page.tsx exists");
  assert(fs.existsSync(facultyViewPath), "src/components/modules/portal/FacultyPortalView.tsx exists");

  const facultyPageContent = fs.readFileSync(facultyPagePath, "utf-8");
  assert(facultyPageContent.includes("FACULTY_MEMBER"), "Faculty page enforces role FACULTY_MEMBER");
  assert(facultyPageContent.includes("Workspace Access Denied"), "Faculty page renders Workspace Access Denied on unauthorized role");
  assert(facultyPageContent.includes("Staff Profile Not Linked"), "Faculty page handles unlinked staff profiles safely");
  assert(facultyPageContent.includes("Staff Account Inactive"), "Faculty page handles inactive staff profiles safely");
  assert(facultyPageContent.includes("getFacultySelfProfile"), "Faculty page calls getFacultySelfProfile server action");

  const rootPageContent = fs.readFileSync(rootPagePath, "utf-8");
  assert(rootPageContent.includes('user.role === "FACULTY_MEMBER"'), "Root page checks user.role === 'FACULTY_MEMBER'");
  assert(rootPageContent.includes('redirect("/portal/faculty")'), "Root page redirects faculty to /portal/faculty");

  const sidebarContent = fs.readFileSync(sidebarPath, "utf-8");
  assert(sidebarContent.includes('currentUser?.role === "FACULTY_MEMBER"'), "Sidebar detects FACULTY_MEMBER role");
  assert(sidebarContent.includes("/portal/faculty"), "Sidebar detects /portal/faculty pathname");
  assert(sidebarContent.includes("FACULTY WORKSPACE"), "Sidebar renders dedicated FACULTY WORKSPACE header");
  assert(sidebarContent.includes("/portal/faculty?tab=overview"), "Sidebar includes Overview link");
  assert(sidebarContent.includes("/portal/faculty?tab=classes"), "Sidebar includes Assigned Classes link");
  assert(sidebarContent.includes("/portal/faculty?tab=timetable"), "Sidebar includes Timetable link");
  assert(sidebarContent.includes("/portal/faculty?tab=roster"), "Sidebar includes Class Rosters link");
  assert(sidebarContent.includes("/portal/faculty?tab=attendance"), "Sidebar includes Attendance History link");
  assert(sidebarContent.includes("/portal/faculty?tab=curriculum"), "Sidebar includes Course Curriculum link");
  assert(sidebarContent.includes("isPortalUser"), "Sidebar suppresses administrative modules for portal users");

  const facultyViewContent = fs.readFileSync(facultyViewPath, "utf-8");
  assert(facultyViewContent.includes("getFacultySelfTeachingAssignments"), "FacultyPortalView imports getFacultySelfTeachingAssignments");
  assert(facultyViewContent.includes("getFacultySelfTimetable"), "FacultyPortalView imports getFacultySelfTimetable");
  assert(facultyViewContent.includes("getFacultyClassRoster"), "FacultyPortalView imports getFacultyClassRoster");
  assert(facultyViewContent.includes("getFacultyAttendanceSessions"), "FacultyPortalView imports getFacultyAttendanceSessions");
  assert(facultyViewContent.includes("Read-Only Mode"), "FacultyPortalView enforces Read-Only Mode for attendance");

  // =========================================================================
  // SUITE 2: Isolated Test Database Initialization
  // =========================================================================
  setSuite("SUITE 2: Isolated Test Database & Session Boundaries");

  // Switch to isolated test DB
  process.env.DATABASE_URL = `file:${ISOLATED_DB}`;
  process.env.APP_ENV = "test";

  const { default: prisma } = await import("../src/lib/db");
  const { createSession } = await import("../src/lib/auth/session");
  const { setTestSessionToken } = await import("../src/lib/auth/guards");
  const {
    getFacultySelfProfile,
    getFacultySelfTeachingAssignments,
    getFacultySelfTimetable,
    getFacultyClassRoster,
    getFacultyAttendanceSessions,
  } = await import("../src/lib/actions/portalFaculty");
  const { getStudentSelfProfile } = await import("../src/lib/actions/portalStudent");

  const testEmails = [
    "ws2_faculty@sample.rpihm.ac.in",
    "ws2_faculty_unlinked@sample.rpihm.ac.in",
    "ws2_faculty_inactive@sample.rpihm.ac.in",
    "ws2_student@rpihm.ac.in",
    "ws2_admin@sample.rpihm.ac.in",
  ];

  // Clean scoped previous test runs
  await prisma.session.deleteMany({ where: { user: { email: { in: testEmails } } } });
  await prisma.attendanceRecord.deleteMany({ where: { student: { email: { in: testEmails } } } });
  await prisma.attendanceSession.deleteMany({ where: { faculty: { email: { in: testEmails } } } });
  await prisma.timetableEntry.deleteMany({ where: { teachingAssignment: { staff: { email: { in: testEmails } } } } });
  await prisma.teachingAssignment.deleteMany({ where: { staff: { email: { in: testEmails } } } });
  await prisma.userAccount.deleteMany({ where: { email: { in: testEmails } } });
  await prisma.enrolment.deleteMany({ where: { student: { email: { in: testEmails } } } });
  await prisma.student.deleteMany({ where: { email: { in: testEmails } } });
  await prisma.staff.deleteMany({ where: { email: { in: testEmails } } });

  // Query existing reference academic data in isolated test database
  const department = await prisma.department.findFirstOrThrow();
  const programme = await prisma.programme.findFirstOrThrow();
  const semester = await prisma.semester.findFirstOrThrow({ where: { programmeId: programme.id } });
  const division = await prisma.division.findFirstOrThrow({ where: { semesterId: semester.id } });
  const subject = await prisma.subject.findFirstOrThrow({ where: { semesterId: semester.id } });
  const academicYear = await prisma.academicYear.findFirstOrThrow();

  // Seed Faculty Staff & Account
  const facultyStaff = await prisma.staff.create({
    data: {
      employeeId: "WS2-FAC-075",
      fullName: "Prof. Jeicy Sahaya Test",
      email: "ws2_faculty@sample.rpihm.ac.in",
      phone: "+91 98200 75001",
      designation: "Assistant Professor",
      category: "TEACHING",
      departmentId: department.id,
      dateOfJoining: new Date("2026-01-15"),
      status: "ACTIVE",
    },
  });

  const facultyUser = await prisma.userAccount.create({
    data: {
      email: "ws2_faculty@sample.rpihm.ac.in",
      fullName: "Prof. Jeicy Sahaya Test",
      passwordHash: "$2b$10$abcdefghijklmnopqrstuvwxyz123456",
      salt: "test_salt_123",
      role: "FACULTY_MEMBER",
      staffId: facultyStaff.id,
    },
  });

  // Seed Unlinked Faculty Account
  const unlinkedUser = await prisma.userAccount.create({
    data: {
      email: "ws2_faculty_unlinked@sample.rpihm.ac.in",
      fullName: "Unlinked Faculty",
      passwordHash: "$2b$10$abcdefghijklmnopqrstuvwxyz123456",
      salt: "test_salt_123",
      role: "FACULTY_MEMBER",
      staffId: null,
    },
  });

  // Seed Inactive Faculty Staff & Account
  const inactiveStaff = await prisma.staff.create({
    data: {
      employeeId: "WS2-FAC-INACTIVE",
      fullName: "Inactive Faculty",
      email: "ws2_faculty_inactive@sample.rpihm.ac.in",
      phone: "+91 98200 99999",
      designation: "Lecturer",
      category: "TEACHING",
      departmentId: department.id,
      dateOfJoining: new Date("2025-01-15"),
      status: "ON_LEAVE",
    },
  });

  const inactiveUser = await prisma.userAccount.create({
    data: {
      email: "ws2_faculty_inactive@sample.rpihm.ac.in",
      fullName: "Inactive Faculty",
      passwordHash: "$2b$10$abcdefghijklmnopqrstuvwxyz123456",
      salt: "test_salt_123",
      role: "FACULTY_MEMBER",
      staffId: inactiveStaff.id,
    },
  });

  // Seed Student & Account
  const testStudent = await prisma.student.create({
    data: {
      rollNumber: "WS2-2026DS041",
      prn: "WS2-PRN-041",
      fullName: "Khan Umar Test",
      email: "ws2_student@rpihm.ac.in",
      phone: "+91 98200 41001",
      dob: new Date("2005-04-12"),
      gender: "MALE",
      bloodGroup: "O_POS",
      guardianName: "Guardian Umar",
      guardianPhone: "+91 98200 41002",
      guardianRelationship: "FATHER",
      status: "ACTIVE",
      currentSemester: semester.semesterNumber,
    },
  });

  const studentUser = await prisma.userAccount.create({
    data: {
      email: "ws2_student@rpihm.ac.in",
      fullName: "Khan Umar Test",
      passwordHash: "$2b$10$abcdefghijklmnopqrstuvwxyz123456",
      salt: "test_salt_123",
      role: "STUDENT_VIEWER",
      studentId: testStudent.id,
    },
  });

  // Enrol student in division
  await prisma.enrolment.create({
    data: {
      studentId: testStudent.id,
      academicYearId: academicYear.id,
      programmeId: programme.id,
      semesterId: semester.id,
      divisionId: division.id,
      status: "ENROLLED",
    },
  });

  // Assign subject to faculty
  const assignment = await prisma.teachingAssignment.create({
    data: {
      staffId: facultyStaff.id,
      subjectId: subject.id,
      divisionId: division.id,
      weeklyHours: 4,
    },
  });

  // Seed Academic Admin User
  const adminUser = await prisma.userAccount.create({
    data: {
      email: "ws2_admin@sample.rpihm.ac.in",
      fullName: "Academic Admin",
      passwordHash: "$2b$10$abcdefghijklmnopqrstuvwxyz123456",
      salt: "test_salt_123",
      role: "ACADEMIC_ADMIN",
    },
  });

  // Create test sessions
  const fSession = await createSession(facultyUser.id);
  const uSession = await createSession(unlinkedUser.id);
  const iSession = await createSession(inactiveUser.id);
  const sSession = await createSession(studentUser.id);
  const aSession = await createSession(adminUser.id);

  assert(!!fSession.token, "Faculty test session created");
  assert(!!uSession.token, "Unlinked faculty test session created");
  assert(!!iSession.token, "Inactive faculty test session created");
  assert(!!sSession.token, "Student test session created");
  assert(!!aSession.token, "Admin test session created");

  // =========================================================================
  // SUITE 3: Role & Boundary Isolation Tests
  // =========================================================================
  setSuite("SUITE 3: Role-Based Authorization & Denial Gates");

  // 1. Unauthenticated checks
  setTestSessionToken(null);
  const unauthRes = await getFacultySelfProfile();
  assert(!unauthRes.success && unauthRes.code === "UNAUTHORIZED", "Unauthenticated request rejected with UNAUTHORIZED");

  // 2. Unlinked & Inactive accounts
  setTestSessionToken(uSession.token);
  const unlinkedRes = await getFacultySelfProfile();
  assert(!unlinkedRes.success && unlinkedRes.code === "UNLINKED_STAFF_PROFILE", "Unlinked staff profile rejected with UNLINKED_STAFF_PROFILE");

  setTestSessionToken(iSession.token);
  const inactiveRes = await getFacultySelfProfile();
  assert(!inactiveRes.success && inactiveRes.code === "INACTIVE_STAFF_ACCOUNT", "Inactive staff profile rejected with INACTIVE_STAFF_ACCOUNT");

  // 3. Student accessing Faculty actions -> FORBIDDEN
  setTestSessionToken(sSession.token);
  const sProfRes = await getFacultySelfProfile();
  assert(!sProfRes.success && sProfRes.code === "FORBIDDEN", "Student accessing getFacultySelfProfile returns FORBIDDEN");

  const sAssignRes = await getFacultySelfTeachingAssignments();
  assert(!sAssignRes.success && sAssignRes.code === "FORBIDDEN", "Student accessing getFacultySelfTeachingAssignments returns FORBIDDEN");

  const sRosterRes = await getFacultyClassRoster(assignment.id);
  assert(!sRosterRes.success && sRosterRes.code === "FORBIDDEN", "Student accessing getFacultyClassRoster returns FORBIDDEN");

  // 4. Admin accessing Faculty actions -> FORBIDDEN
  setTestSessionToken(aSession.token);
  const aProfRes = await getFacultySelfProfile();
  assert(!aProfRes.success && aProfRes.code === "FORBIDDEN", "Academic Admin accessing getFacultySelfProfile returns FORBIDDEN");

  // 5. Faculty accessing Student actions -> FORBIDDEN
  setTestSessionToken(fSession.token);
  const fStudentRes = await getStudentSelfProfile();
  assert(!fStudentRes.success && fStudentRes.code === "FORBIDDEN", "Faculty accessing getStudentSelfProfile returns FORBIDDEN");

  // =========================================================================
  // SUITE 4: Active Faculty Profile & Workload Verification
  // =========================================================================
  setSuite("SUITE 4: Active Faculty Data Scoping & Privacy Enforcement");

  setTestSessionToken(fSession.token);
  const profileRes = await getFacultySelfProfile();
  assert(profileRes.success, "Faculty profile retrieves successfully");
  assert(profileRes.data?.staff.fullName === "Prof. Jeicy Sahaya Test", "Faculty profile matches fullName");
  assert(profileRes.data?.staff.employeeId === "WS2-FAC-075", "Faculty profile matches employeeId");
  assert(profileRes.data?.workloadSummary.activeAssignmentsCount === 1, "Workload assignments count is 1");
  assert(profileRes.data?.workloadSummary.prescribedWeeklyHours === 4, "Workload prescribed weekly hours is 4");
  assert(profileRes.data?.workloadSummary.scheduledTimetableHours === 0, "Scheduled timetable hours is 0 (empty schedule)");
  assert(profileRes.data?.workloadSummary.totalRecordedSessionsCount === 0, "Recorded sessions count is 0");

  const assignmentsRes = await getFacultySelfTeachingAssignments();
  assert(assignmentsRes.success, "Teaching assignments retrieve successfully");
  assert(assignmentsRes.data?.length === 1, "Faculty has exactly 1 teaching assignment");
  assert(assignmentsRes.data?.[0].weeklyHours === 4, "Assigned weekly hours is 4");
  assert(assignmentsRes.data?.[0].enrolledStudentsCount >= 1, "Enrolled students count reflects active enrolments");

  const timetableRes = await getFacultySelfTimetable();
  assert(timetableRes.success, "Timetable retrieves successfully");
  assert(Array.isArray(timetableRes.data) && timetableRes.data.length === 0, "Timetable is honest empty array (0 slots)");

  const rosterRes = await getFacultyClassRoster(assignment.id);
  assert(rosterRes.success, "Class roster retrieves successfully");
  assert(rosterRes.data?.totalCount >= 1, "Roster contains enrolled student");

  const foundStudent = rosterRes.data?.students.find(s => s.rollNumber === "WS2-2026DS041");
  assert(!!foundStudent, "Roster student is found by rollNumber");
  assert(foundStudent?.fullName === "Khan Umar Test", "Roster student name matches");
  assert(foundStudent?.prn === "WS2-PRN-041", "Roster student PRN matches");
  assert(foundStudent?.status === "ENROLLED", "Roster student status is ENROLLED");

  // STRICT PRIVACY ASSERTIONS: Verify ZERO PII leakage
  const studentItem = foundStudent as unknown as Record<string, unknown>;
  assert(studentItem.gender === undefined, "Gender is strictly EXCLUDED from roster");
  assert(studentItem.phone === undefined, "Personal phone is strictly EXCLUDED from roster");
  assert(studentItem.email === undefined, "Personal email is strictly EXCLUDED from roster");
  assert(studentItem.dateOfBirth === undefined, "Date of birth is strictly EXCLUDED from roster");
  assert(studentItem.bloodGroup === undefined, "Blood group is strictly EXCLUDED from roster");
  assert(studentItem.guardianName === undefined, "Guardian name is strictly EXCLUDED from roster");
  assert(studentItem.guardianPhone === undefined, "Guardian phone is strictly EXCLUDED from roster");
  assert(studentItem.guardianRelationship === undefined, "Guardian relationship is strictly EXCLUDED from roster");
  assert(studentItem.address === undefined, "Personal address is strictly EXCLUDED from roster");

  const sessionsRes = await getFacultyAttendanceSessions();
  assert(sessionsRes.success, "Attendance sessions retrieve successfully");
  assert(Array.isArray(sessionsRes.data) && sessionsRes.data.length === 0, "Attendance sessions is honest empty array (0 sessions)");

  // Clean up test sessions from isolated DB
  await prisma.session.deleteMany({ where: { user: { email: { in: testEmails } } } });

  // =========================================================================
  // SUITE 5: Operational Database dev.db Invariance Check
  // =========================================================================
  setSuite("SUITE 5: Operational Database dev.db Invariance Verification");

  const finalDevBuf = fs.readFileSync(DEV_DB);
  const finalHash = crypto.createHash("sha256").update(finalDevBuf).digest("hex");
  console.log(`Final dev.db SHA-256: ${finalHash} (${finalDevBuf.length} bytes)`);

  assert(initialHash === finalHash, "dev.db SHA-256 hash is 100% invariant");
  assert(initialDevBuf.length === finalDevBuf.length, "dev.db byte size is 100% invariant");

  // Summary
  console.log("\n=================================================================");
  console.log(`WORKSTREAM 2 TEST SUMMARY: ${passedAssertions}/${totalAssertions} ASSERTIONS PASSED`);
  if (failedAssertions > 0) {
    console.error(`FAILED ASSERTIONS: ${failedAssertions}`);
    process.exit(1);
  } else {
    console.log("ALL ASSERTIONS PASSED WITH 100% ISOLATION & COMPLIANCE.");
    console.log("=================================================================\n");
  }
}

main()
  .catch((err) => {
    console.error("Test execution failed:", err);
    process.exit(1);
  });
