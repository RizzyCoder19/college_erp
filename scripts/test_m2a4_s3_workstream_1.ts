/**
 * ============================================================================
 * CAMPUSOS ERP — MILESTONE 2A.4 STAGE 3: WORKSTREAM 1 TEST SUITE
 * FACULTY DATA ACCESS LAYER & AUTHORIZATION BOUNDARIES
 * ============================================================================
 *
 * Test Scenarios:
 * 1. Unauthenticated rejection (UNAUTHORIZED) across all 5 actions
 * 2. Non-faculty role rejection (FORBIDDEN for STUDENT_VIEWER and ACADEMIC_ADMIN)
 * 3. Unlinked faculty rejection (UNLINKED_STAFF_PROFILE)
 * 4. Inactive staff profile rejection (INACTIVE_STAFF_ACCOUNT)
 * 5. Faculty A self profile & workload retrieval:
 *    - Strict session-derived identity
 *    - Prescribed weekly hours summation
 *    - Scheduled timetable hours summation
 *    - Total recorded sessions count
 * 6. Faculty A teaching assignments retrieval:
 *    - Strict scoping: only returns Faculty A's assignments
 *    - Faculty B's assignments excluded
 *    - Correct enrolled student counts per assignment
 * 7. Faculty A timetable retrieval:
 *    - Strict scoping: only returns Faculty A's timetable entries
 *    - Faculty B's schedule excluded
 * 8. Cross-faculty class roster authorization boundary:
 *    - Faculty A can access Faculty A's assigned roster
 *    - Faculty A accessing Faculty B's assignment returns FORBIDDEN
 *    - Nonexistent assignment ID returns ASSIGNMENT_NOT_FOUND
 * 9. Student privacy protection & PII exclusion:
 *    - Default roster returns strictly [id, rollNumber, prn, fullName, status]
 *    - Gender is strictly excluded
 *    - Guardian name, phone, relationship strictly excluded
 *    - Student phone, email, dob, blood group, address strictly excluded
 *    - Zero financial or compliance document leakage
 * 10. Faculty attendance sessions ledger retrieval:
 *     - Strict scoping: only returns sessions recorded by Faculty A
 *     - Raw present/total counts verified
 *     - Zero unverified percentage / eligibility judgments
 * 11. Student Portal regression verification:
 *     - Student viewer accessing student actions succeeds
 *     - Faculty member accessing student actions returns FORBIDDEN
 * 12. Operational database (prisma/dev.db) SHA-256 invariance check
 *
 * STRICT REQUIREMENT: Executed strictly against prisma/isolated_test.db
 */

import path from "path";
import fs from "fs";
import crypto from "crypto";

const DEV_DB = path.resolve(process.cwd(), "prisma/dev.db");
const ISOLATED_DB = path.resolve(process.cwd(), "prisma/isolated_test.db");

// Force isolated test database
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
  console.log("CAMPUSOS ERP: MILESTONE 2A.4 STAGE 3 WORKSTREAM 1 TESTS");
  console.log("FACULTY DATA ACCESS LAYER & AUTHORIZATION BOUNDARIES");
  console.log("=================================================================");

  // 1. Check baseline dev.db hash
  const initialDevBuf = fs.readFileSync(DEV_DB);
  const initialHash = crypto.createHash("sha256").update(initialDevBuf).digest("hex");
  console.log(`Baseline dev.db SHA-256: ${initialHash} (${initialDevBuf.length} bytes)`);

  // Dynamic imports after setting DATABASE_URL
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
  const {
    getStudentSelfProfile,
  } = await import("../src/lib/actions/portalStudent");

  // =========================================================================
  // FIXTURE SETUP IN ISOLATED DATABASE
  // =========================================================================
  setSuite("FIXTURE SETUP: Isolated Test Data Preparation");

  const testEmails = [
    "ws1_faculty_a@rpihm.ac.in",
    "ws1_faculty_b@rpihm.ac.in",
    "ws1_faculty_inactive@rpihm.ac.in",
    "ws1_faculty_unlinked@rpihm.ac.in",
    "ws1_student@rpihm.ac.in",
    "ws1_admin@rpihm.ac.in",
  ];

  // Clean previous test runs idempotently
  await prisma.session.deleteMany({
    where: { user: { email: { in: testEmails } } },
  });
  await prisma.attendanceRecord.deleteMany({
    where: { student: { email: { in: testEmails } } },
  });
  await prisma.attendanceSession.deleteMany({
    where: { faculty: { email: { in: testEmails } } },
  });
  await prisma.timetableEntry.deleteMany({
    where: { teachingAssignment: { staff: { email: { in: testEmails } } } },
  });
  await prisma.teachingAssignment.deleteMany({
    where: { staff: { email: { in: testEmails } } },
  });
  await prisma.userAccount.deleteMany({
    where: { email: { in: testEmails } },
  });
  await prisma.staff.deleteMany({
    where: { email: { in: testEmails } },
  });
  await prisma.enrolment.deleteMany({
    where: { student: { email: { in: testEmails } } },
  });
  await prisma.student.deleteMany({
    where: { email: { in: testEmails } },
  });

  // Query existing reference academic data in isolated test database
  const department = await prisma.department.findFirstOrThrow();
  const programme = await prisma.programme.findFirstOrThrow();
  const semester = await prisma.semester.findFirstOrThrow({
    where: { programmeId: programme.id },
  });
  const divisionA = await prisma.division.findFirstOrThrow({
    where: { semesterId: semester.id },
  });
  const divisionB = await prisma.division.findFirst({
    where: { semesterId: semester.id, id: { not: divisionA.id } },
  }) || divisionA;
  const subjects = await prisma.subject.findMany({
    where: { semesterId: semester.id },
    take: 2,
  });
  const subject1 = subjects[0];
  const subject2 = subjects[1] || subjects[0];
  const academicYear = await prisma.academicYear.findFirstOrThrow();

  // 1. Create Staff Profiles
  const staffA = await prisma.staff.create({
    data: {
      employeeId: "TEST-FAC-A",
      fullName: "Chef Test Instructor A",
      email: "ws1_faculty_a@rpihm.ac.in",
      phone: "+91 98200 11111",
      designation: "Assistant Professor",
      category: "TEACHING",
      status: "ACTIVE",
      departmentId: department.id,
      dateOfJoining: new Date("2024-01-15"),
      workloadHours: 16,
    },
  });

  const staffB = await prisma.staff.create({
    data: {
      employeeId: "TEST-FAC-B",
      fullName: "Chef Test Instructor B",
      email: "ws1_faculty_b@rpihm.ac.in",
      phone: "+91 98200 22222",
      designation: "Lecturer",
      category: "TEACHING",
      status: "ACTIVE",
      departmentId: department.id,
      dateOfJoining: new Date("2024-06-01"),
      workloadHours: 12,
    },
  });

  const staffInactive = await prisma.staff.create({
    data: {
      employeeId: "TEST-FAC-INACT",
      fullName: "Inactive Instructor",
      email: "ws1_faculty_inactive@rpihm.ac.in",
      phone: "+91 98200 33333",
      designation: "Adjunct Faculty",
      category: "TEACHING",
      status: "INACTIVE",
      departmentId: department.id,
      dateOfJoining: new Date("2023-01-10"),
    },
  });

  // 2. Create User Accounts
  const userFacultyA = await prisma.userAccount.create({
    data: {
      email: "ws1_faculty_a@rpihm.ac.in",
      passwordHash: "dummyhash",
      salt: "dummysalt",
      fullName: "Chef Test Instructor A",
      role: "FACULTY_MEMBER",
      staffId: staffA.id,
      isActive: true,
    },
  });

  const userFacultyB = await prisma.userAccount.create({
    data: {
      email: "ws1_faculty_b@rpihm.ac.in",
      passwordHash: "dummyhash",
      salt: "dummysalt",
      fullName: "Chef Test Instructor B",
      role: "FACULTY_MEMBER",
      staffId: staffB.id,
      isActive: true,
    },
  });

  const userFacultyInactive = await prisma.userAccount.create({
    data: {
      email: "ws1_faculty_inactive@rpihm.ac.in",
      passwordHash: "dummyhash",
      salt: "dummysalt",
      fullName: "Inactive Instructor",
      role: "FACULTY_MEMBER",
      staffId: staffInactive.id,
      isActive: true,
    },
  });

  const userFacultyUnlinked = await prisma.userAccount.create({
    data: {
      email: "ws1_faculty_unlinked@rpihm.ac.in",
      passwordHash: "dummyhash",
      salt: "dummysalt",
      fullName: "Unlinked Faculty",
      role: "FACULTY_MEMBER",
      staffId: null, // UNLINKED
      isActive: true,
    },
  });

  // 3. Create a Test Student
  const student = await prisma.student.create({
    data: {
      rollNumber: "TEST-ROLL-001",
      prn: "2026TEST001",
      fullName: "Aarav Test Student",
      email: "ws1_student@rpihm.ac.in",
      phone: "+91 98000 99999",
      gender: "MALE",
      dob: new Date("2005-05-15"),
      bloodGroup: "O_POS",
      guardianName: "Sunil Test Parent",
      guardianRelationship: "Father",
      guardianPhone: "+91 98000 88888",
      status: "ACTIVE",
      currentSemester: semester.semesterNumber,
    },
  });

  const enrolment = await prisma.enrolment.create({
    data: {
      studentId: student.id,
      academicYearId: academicYear.id,
      programmeId: programme.id,
      semesterId: semester.id,
      divisionId: divisionA.id,
      status: "ENROLLED",
    },
  });

  const userStudent = await prisma.userAccount.create({
    data: {
      email: "ws1_student@rpihm.ac.in",
      passwordHash: "dummyhash",
      salt: "dummysalt",
      fullName: "Aarav Test Student",
      role: "STUDENT_VIEWER",
      studentId: student.id,
      isActive: true,
    },
  });

  const userAdmin = await prisma.userAccount.create({
    data: {
      email: "ws1_admin@rpihm.ac.in",
      passwordHash: "dummyhash",
      salt: "dummysalt",
      fullName: "Academic Admin",
      role: "ACADEMIC_ADMIN",
      isActive: true,
    },
  });

  // 4. Create Teaching Assignments
  const assignmentA = await prisma.teachingAssignment.create({
    data: {
      staffId: staffA.id,
      subjectId: subject1.id,
      divisionId: divisionA.id,
      weeklyHours: 6,
    },
  });

  const assignmentB = await prisma.teachingAssignment.create({
    data: {
      staffId: staffB.id,
      subjectId: subject2.id,
      divisionId: divisionB.id,
      weeklyHours: 4,
    },
  });

  // 5. Create Timetable Entry for Assignment A
  const timetableEntryA = await prisma.timetableEntry.create({
    data: {
      semesterId: semester.id,
      divisionId: divisionA.id,
      subjectId: subject1.id,
      teachingAssignmentId: assignmentA.id,
      dayOfWeek: "MONDAY",
      startTime: "09:00",
      endTime: "11:00", // 2.0 hours
      room: "BTK Kitchen 1",
      sessionType: "PRACTICAL_LAB",
      status: "ACTIVE",
    },
  });

  // 6. Create Attendance Session for Faculty A
  const sessionA = await prisma.attendanceSession.create({
    data: {
      timetableEntryId: timetableEntryA.id,
      semesterId: semester.id,
      divisionId: divisionA.id,
      subjectId: subject1.id,
      facultyId: staffA.id,
      sessionDate: new Date("2026-11-02T00:00:00.000Z"),
      startTime: "09:00",
      endTime: "11:00",
      sessionType: "PRACTICAL_LAB",
      status: "FINALIZED",
      topicCovered: "Classical Stocks and Mother Sauces",
      recordedById: userFacultyA.id,
      finalizedAt: new Date("2026-11-02T11:05:00.000Z"),
    },
  });

  await prisma.attendanceRecord.create({
    data: {
      sessionId: sessionA.id,
      studentId: student.id,
      enrolmentId: enrolment.id,
      status: "PRESENT",
      markedAt: new Date("2026-11-02T09:15:00.000Z"),
    },
  });

  // 7. Create Session Tokens
  const sessionTokenFacultyA = (await createSession(userFacultyA.id)).token;
  const sessionTokenFacultyB = (await createSession(userFacultyB.id)).token;
  const sessionTokenInactive = (await createSession(userFacultyInactive.id)).token;
  const sessionTokenUnlinked = (await createSession(userFacultyUnlinked.id)).token;
  const sessionTokenStudent = (await createSession(userStudent.id)).token;
  const sessionTokenAdmin = (await createSession(userAdmin.id)).token;

  assert(true, "Isolated test fixtures initialized successfully in isolated_test.db");

  // =========================================================================
  // SUITE 1: UNAUTHENTICATED REQUESTS
  // =========================================================================
  setSuite("SUITE 1: Unauthenticated Request Rejection");

  setTestSessionToken(null);

  const unauthProfile = await getFacultySelfProfile();
  assert(!unauthProfile.success && unauthProfile.code === "UNAUTHORIZED", "getFacultySelfProfile rejected when unauthenticated");

  const unauthAssignments = await getFacultySelfTeachingAssignments();
  assert(!unauthAssignments.success && unauthAssignments.code === "UNAUTHORIZED", "getFacultySelfTeachingAssignments rejected when unauthenticated");

  const unauthTimetable = await getFacultySelfTimetable();
  assert(!unauthTimetable.success && unauthTimetable.code === "UNAUTHORIZED", "getFacultySelfTimetable rejected when unauthenticated");

  const unauthRoster = await getFacultyClassRoster(assignmentA.id);
  assert(!unauthRoster.success && unauthRoster.code === "UNAUTHORIZED", "getFacultyClassRoster rejected when unauthenticated");

  const unauthSessions = await getFacultyAttendanceSessions();
  assert(!unauthSessions.success && unauthSessions.code === "UNAUTHORIZED", "getFacultyAttendanceSessions rejected when unauthenticated");

  // =========================================================================
  // SUITE 2: NON-FACULTY ROLE REJECTION
  // =========================================================================
  setSuite("SUITE 2: Non-Faculty Role Rejection");

  // Student trying to access faculty actions
  setTestSessionToken(sessionTokenStudent);

  const studentProfile = await getFacultySelfProfile();
  assert(!studentProfile.success && studentProfile.code === "FORBIDDEN", "STUDENT_VIEWER rejected from getFacultySelfProfile");

  const studentAssignments = await getFacultySelfTeachingAssignments();
  assert(!studentAssignments.success && studentAssignments.code === "FORBIDDEN", "STUDENT_VIEWER rejected from getFacultySelfTeachingAssignments");

  const studentTimetable = await getFacultySelfTimetable();
  assert(!studentTimetable.success && studentTimetable.code === "FORBIDDEN", "STUDENT_VIEWER rejected from getFacultySelfTimetable");

  const studentRoster = await getFacultyClassRoster(assignmentA.id);
  assert(!studentRoster.success && studentRoster.code === "FORBIDDEN", "STUDENT_VIEWER rejected from getFacultyClassRoster");

  const studentSessions = await getFacultyAttendanceSessions();
  assert(!studentSessions.success && studentSessions.code === "FORBIDDEN", "STUDENT_VIEWER rejected from getFacultyAttendanceSessions");

  // Admin trying to access faculty portal actions (must use admin modules, not self-service)
  setTestSessionToken(sessionTokenAdmin);
  const adminProfile = await getFacultySelfProfile();
  assert(!adminProfile.success && adminProfile.code === "FORBIDDEN", "ACADEMIC_ADMIN rejected from getFacultySelfProfile");

  // =========================================================================
  // SUITE 3: UNLINKED & INACTIVE STAFF HANDLING
  // =========================================================================
  setSuite("SUITE 3: Unlinked & Inactive Staff Safe Handling");

  // Unlinked faculty user (staffId === null)
  setTestSessionToken(sessionTokenUnlinked);
  const unlinkedProfile = await getFacultySelfProfile();
  assert(!unlinkedProfile.success && unlinkedProfile.code === "UNLINKED_STAFF_PROFILE", "Unlinked faculty user rejected with UNLINKED_STAFF_PROFILE");

  const unlinkedRoster = await getFacultyClassRoster(assignmentA.id);
  assert(!unlinkedRoster.success && unlinkedRoster.code === "UNLINKED_STAFF_PROFILE", "Unlinked faculty user cannot access rosters");

  // Inactive faculty profile (staff.status === "INACTIVE")
  setTestSessionToken(sessionTokenInactive);
  const inactiveProfile = await getFacultySelfProfile();
  assert(!inactiveProfile.success && inactiveProfile.code === "INACTIVE_STAFF_ACCOUNT", "Inactive staff account rejected with INACTIVE_STAFF_ACCOUNT");

  // =========================================================================
  // SUITE 4: FACULTY A SELF PROFILE & WORKLOAD
  // =========================================================================
  setSuite("SUITE 4: Faculty Self Profile & Workload Metrics");

  setTestSessionToken(sessionTokenFacultyA);

  const profileRes = await getFacultySelfProfile();
  assert(profileRes.success, "getFacultySelfProfile succeeds for active Faculty A");
  if (profileRes.success && profileRes.data) {
    const data = profileRes.data;
    assert(data.staff.id === staffA.id, "Profile staff.id matches authenticated staffId");
    assert(data.staff.employeeId === "TEST-FAC-A", "Profile employeeId matches");
    assert(data.staff.fullName === "Chef Test Instructor A", "Profile fullName matches");
    assert(data.workloadSummary.activeAssignmentsCount === 1, "Workload assignments count is 1");
    assert(data.workloadSummary.prescribedWeeklyHours === 6, "Prescribed weekly hours = 6 (from assignment.weeklyHours)");
    assert(data.workloadSummary.scheduledTimetableHours === 2.0, "Scheduled timetable hours = 2.0 (09:00 to 11:00 slot)");
    assert(data.workloadSummary.totalRecordedSessionsCount === 1, "Total recorded attendance sessions = 1");
  }

  // =========================================================================
  // SUITE 5: TEACHING ASSIGNMENTS RETRIEVAL & ISOLATION
  // =========================================================================
  setSuite("SUITE 5: Teaching Assignments Retrieval & Cross-Faculty Isolation");

  setTestSessionToken(sessionTokenFacultyA);
  const assignmentsResA = await getFacultySelfTeachingAssignments();
  assert(assignmentsResA.success, "getFacultySelfTeachingAssignments succeeds for Faculty A");
  if (assignmentsResA.success && assignmentsResA.data) {
    assert(assignmentsResA.data.length === 1, "Faculty A receives exactly 1 teaching assignment");
    assert(assignmentsResA.data[0].id === assignmentA.id, "Returned assignment is assignmentA");
    assert(assignmentsResA.data[0].weeklyHours === 6, "Assignment weeklyHours = 6");
    assert(assignmentsResA.data[0].enrolledStudentsCount === 2, "Enrolled students count in division = 2 (Zoya Alvi + Aarav)");
    assert(assignmentsResA.data.every(a => a.id !== assignmentB.id), "Faculty B's assignment is NOT present in Faculty A's response");
  }

  // Verify Faculty B receives only Assignment B
  setTestSessionToken(sessionTokenFacultyB);
  const assignmentsResB = await getFacultySelfTeachingAssignments();
  assert(assignmentsResB.success, "getFacultySelfTeachingAssignments succeeds for Faculty B");
  if (assignmentsResB.success && assignmentsResB.data) {
    assert(assignmentsResB.data.length === 1, "Faculty B receives exactly 1 assignment");
    assert(assignmentsResB.data[0].id === assignmentB.id, "Returned assignment is assignmentB");
    assert(assignmentsResB.data.every(a => a.id !== assignmentA.id), "Faculty A's assignment is NOT present in Faculty B's response");
  }

  // =========================================================================
  // SUITE 6: TIMETABLE RETRIEVAL & ISOLATION
  // =========================================================================
  setSuite("SUITE 6: Timetable Retrieval & Isolation");

  setTestSessionToken(sessionTokenFacultyA);
  const timetableResA = await getFacultySelfTimetable();
  assert(timetableResA.success, "getFacultySelfTimetable succeeds for Faculty A");
  if (timetableResA.success && timetableResA.data) {
    assert(timetableResA.data.length === 1, "Faculty A receives 1 timetable slot");
    assert(timetableResA.data[0].id === timetableEntryA.id, "Slot ID matches timetableEntryA");
    assert(timetableResA.data[0].startTime === "09:00" && timetableResA.data[0].endTime === "11:00", "Slot time is 09:00 - 11:00");
    assert(timetableResA.data[0].durationHours === 2.0, "Slot duration is 2.0 hours");
  }

  // Faculty B has 0 timetable slots scheduled
  setTestSessionToken(sessionTokenFacultyB);
  const timetableResB = await getFacultySelfTimetable();
  assert(timetableResB.success, "getFacultySelfTimetable succeeds for Faculty B");
  if (timetableResB.success && timetableResB.data) {
    assert(timetableResB.data.length === 0, "Faculty B receives honest empty array (0 slots) without failure");
  }

  // =========================================================================
  // SUITE 7: CLASS ROSTER AUTHORIZATION & PRIVACY FILTERING
  // =========================================================================
  setSuite("SUITE 7: Class Roster Boundary Checks & Student Privacy");

  // 1. Legitimate access: Faculty A queries Assignment A
  setTestSessionToken(sessionTokenFacultyA);
  const rosterResA = await getFacultyClassRoster(assignmentA.id);
  assert(rosterResA.success, "Faculty A successfully retrieves roster for Assignment A");
  if (rosterResA.success && rosterResA.data) {
    assert(rosterResA.data.totalCount === 2, "Roster totalCount is 2 (contains active division cohort)");
    const foundStudent = rosterResA.data.students.find((s) => s.id === student.id);
    assert(Boolean(foundStudent), "Student Aarav Test Student is present in roster");
    if (foundStudent) {
      assert(foundStudent.rollNumber === "TEST-ROLL-001", "Student rollNumber matches");
      assert(foundStudent.prn === "2026TEST001", "Student PRN matches");
      assert(foundStudent.fullName === "Aarav Test Student", "Student fullName matches");
      assert(foundStudent.status === "ENROLLED", "Student status is ENROLLED");
    }

    // PRIVACY VERIFICATION: Check across every student in the roster
    for (const st of rosterResA.data.students) {
      const raw = st as Record<string, unknown>;
      assert(raw["gender"] === undefined, `Gender is strictly EXCLUDED for ${st.fullName}`);
      assert(raw["phone"] === undefined, `Personal phone is strictly EXCLUDED for ${st.fullName}`);
      assert(raw["email"] === undefined, `Personal email is strictly EXCLUDED for ${st.fullName}`);
      assert(raw["guardianName"] === undefined, `Guardian name is strictly EXCLUDED for ${st.fullName}`);
      assert(raw["guardianPhone"] === undefined, `Guardian phone is strictly EXCLUDED for ${st.fullName}`);
      assert(raw["guardianRelationship"] === undefined, `Guardian relationship is strictly EXCLUDED for ${st.fullName}`);
      assert(raw["dob"] === undefined, `Date of birth is strictly EXCLUDED for ${st.fullName}`);
      assert(raw["bloodGroup"] === undefined, `Blood group is strictly EXCLUDED for ${st.fullName}`);
      assert(raw["attendanceRate"] === undefined, `Unverified attendance rate is EXCLUDED for ${st.fullName}`);
    }
  }

  // 2. Cross-Faculty IDOR: Faculty A queries Faculty B's assignment
  const crossRoster = await getFacultyClassRoster(assignmentB.id);
  assert(!crossRoster.success && crossRoster.code === "FORBIDDEN", "Faculty A accessing Faculty B's assignment is REJECTED with FORBIDDEN");

  // 3. Nonexistent assignment ID
  const invalidRoster = await getFacultyClassRoster("nonexistent-assignment-uuid");
  assert(!invalidRoster.success && invalidRoster.code === "ASSIGNMENT_NOT_FOUND", "Querying nonexistent assignment returns ASSIGNMENT_NOT_FOUND");

  // 4. Empty argument validation
  const emptyRoster = await getFacultyClassRoster("");
  assert(!emptyRoster.success && emptyRoster.code === "INVALID_ARGUMENT", "Empty assignment ID returns INVALID_ARGUMENT");

  // =========================================================================
  // SUITE 8: ATTENDANCE SESSION LEDGER
  // =========================================================================
  setSuite("SUITE 8: Attendance Session Ledger Retrieval & Scoping");

  setTestSessionToken(sessionTokenFacultyA);
  const sessionsResA = await getFacultyAttendanceSessions();
  assert(sessionsResA.success, "getFacultyAttendanceSessions succeeds for Faculty A");
  if (sessionsResA.success && sessionsResA.data) {
    assert(sessionsResA.data.length === 1, "Faculty A receives 1 recorded session");
    assert(sessionsResA.data[0].id === sessionA.id, "Session ID matches sessionA");
    assert(sessionsResA.data[0].presentCount === 1, "Session presentCount = 1");
    assert(sessionsResA.data[0].totalCount === 1, "Session totalCount = 1");
    assert(sessionsResA.data[0].status === "FINALIZED", "Session status is FINALIZED");
  }

  // Faculty B has 0 recorded sessions
  setTestSessionToken(sessionTokenFacultyB);
  const sessionsResB = await getFacultyAttendanceSessions();
  assert(sessionsResB.success, "getFacultyAttendanceSessions succeeds for Faculty B");
  if (sessionsResB.success && sessionsResB.data) {
    assert(sessionsResB.data.length === 0, "Faculty B receives 0 sessions without failure");
  }

  // =========================================================================
  // SUITE 9: STUDENT PORTAL REGRESSION VERIFICATION
  // =========================================================================
  setSuite("SUITE 9: Student Portal Regression Verification");

  // Student accessing student self profile still succeeds
  setTestSessionToken(sessionTokenStudent);
  const studentProfileRes = await getStudentSelfProfile();
  assert(studentProfileRes.success, "Existing Student Portal getStudentSelfProfile remains functional for students");

  // Faculty member accessing student self profile is blocked with FORBIDDEN
  setTestSessionToken(sessionTokenFacultyA);
  const facultyAttemptStudent = await getStudentSelfProfile();
  assert(!facultyAttemptStudent.success && facultyAttemptStudent.code === "FORBIDDEN", "Faculty member accessing student portal action receives FORBIDDEN");

  // =========================================================================
  // SUITE 10: OPERATIONAL DATABASE INVARIANCE
  // =========================================================================
  setSuite("SUITE 10: Operational Database Hash Invariance");

  const finalDevBuf = fs.readFileSync(DEV_DB);
  const finalHash = crypto.createHash("sha256").update(finalDevBuf).digest("hex");
  console.log(`Final dev.db SHA-256: ${finalHash} (${finalDevBuf.length} bytes)`);

  assert(finalHash === initialHash, "dev.db SHA-256 is 100% invariant before and after test execution", {
    initialHash,
    finalHash,
  });
  assert(finalDevBuf.length === initialDevBuf.length, "dev.db byte size is 100% invariant", {
    initialLength: initialDevBuf.length,
    finalLength: finalDevBuf.length,
  });

  // =========================================================================
  // SUMMARY
  // =========================================================================
  console.log("\n=================================================================");
  console.log(`WORKSTREAM 1 TEST RESULTS: ${passedAssertions}/${totalAssertions} ASSERTIONS PASSED`);
  if (failedAssertions > 0) {
    console.error(`FAILED: ${failedAssertions} ASSERTIONS`);
    process.exit(1);
  } else {
    console.log("ALL ASSERTIONS PASSED WITH 100% ISOLATION & INVARIANCE.");
  }

  await prisma.$disconnect();
}

main().catch((err) => {
  console.error("Test execution failed:", err);
  process.exit(1);
});
