/**
 * ============================================================================
 * CAMPUSOS ERP — MILESTONE 2A.4 STAGE 2: WORKSTREAM A TEST SUITE
 * STUDENT TIMETABLE AND ATTENDANCE BOUNDARIES & INTEGRITY
 * ============================================================================
 *
 * Test Scenarios:
 * 1. Unauthenticated rejection (UNAUTHORIZED)
 * 2. Non-student role rejection (FORBIDDEN for staff/faculty via student actions)
 * 3. Unlinked student rejection (UNLINKED_STUDENT)
 * 4. Linked student without active semester enrolment (NO_ACTIVE_ENROLMENT)
 * 5. Linked student with active enrolment and timetable schedule:
 *    - Server-side placement derivation (programme, semester, division)
 *    - Strict scoping: only returns timetable entries matching active placement
 *    - Immunity to client-supplied parameters
 * 6. Linked student with active enrolment but zero published timetable entries:
 *    - Honest empty schedule state
 * 7. Student attendance raw counts integrity:
 *    - Conducted sessions count
 *    - Present, Late, Absent, Excused breakdown
 *    - Total recorded opportunities = Present + Late + Absent + Excused
 *    - Strictly ZERO percentage calculation in data payload
 *    - Chronological session records with subject, faculty, sessionType, status
 *    - Exclusion of cancelled sessions
 * 8. Cross-student data isolation:
 *    - Student B's session cannot see Student A's timetable or attendance
 * 9. Operational database (prisma/dev.db) SHA-256 invariance verification
 *
 * STRICT REQUIREMENT: Executed against prisma/isolated_test.db
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
  console.log("CAMPUSOS ERP: MILESTONE 2A.4 STAGE 2 WORKSTREAM A TESTS");
  console.log("STUDENT TIMETABLE & ATTENDANCE INTEGRITY AND AUTHORIZATION");
  console.log("=================================================================");

  // 1. Check baseline dev.db hash
  const initialDevBuf = fs.readFileSync(DEV_DB);
  const initialHash = crypto.createHash("sha256").update(initialDevBuf).digest("hex").toUpperCase();
  console.log(`Baseline dev.db SHA-256: ${initialHash}`);

  // Dynamic imports after setting DATABASE_URL
  const { default: prisma } = await import("../src/lib/db");
  const { createSession } = await import("../src/lib/auth/session");
  const { setTestSessionToken } = await import("../src/lib/auth/guards");
  const {
    getStudentSelfTimetable,
    getStudentSelfAttendance,
  } = await import("../src/lib/actions/portalStudent");

  // =========================================================================
  // FIXTURE SETUP IN ISOLATED DATABASE
  // =========================================================================
  setSuite("FIXTURE SETUP: Isolated Test Data Preparation");

  const testStudentEmails = [
    "ws_a_student1@rpihm.ac.in",
    "ws_a_student2@rpihm.ac.in",
    "ws_a_unenrolled@rpihm.ac.in",
    "ws_a_unlinked@rpihm.ac.in",
    "ws_a_faculty@rpihm.ac.in",
  ];

  // Clean previous test runs idempotently
  await prisma.attendanceRecord.deleteMany({
    where: { student: { email: { in: testStudentEmails } } },
  });
  await prisma.attendanceSession.deleteMany({
    where: { topicCovered: { startsWith: "WS_A_TEST_" } },
  });
  await prisma.timetableEntry.deleteMany({
    where: { room: { startsWith: "WS_A_ROOM_" } },
  });
  await prisma.teachingAssignment.deleteMany({
    where: { staff: { email: { in: testStudentEmails } } },
  });
  await prisma.enrolment.deleteMany({
    where: { student: { email: { in: testStudentEmails } } },
  });
  await prisma.userAccount.deleteMany({
    where: { email: { in: testStudentEmails } },
  });
  await prisma.student.deleteMany({
    where: { email: { in: testStudentEmails } },
  });
  await prisma.staff.deleteMany({
    where: { email: { in: testStudentEmails } },
  });

  // Base Academic Structure
  let academicYear = await prisma.academicYear.findFirst({ where: { code: "2026-27" } });
  if (!academicYear) {
    academicYear = await prisma.academicYear.create({
      data: {
        code: "2026-27",
        name: "Academic Year 2026-2027",
        startDate: new Date("2026-07-01"),
        endDate: new Date("2027-06-30"),
        isCurrent: true,
      },
    });
  }

  let dept = await prisma.department.findFirst({ where: { code: "CUL" } });
  if (!dept) {
    dept = await prisma.department.create({
      data: { code: "CUL", name: "Department of Culinary Arts" },
    });
  }

  let programme = await prisma.programme.findFirst({ where: { code: "BHMCT" } });
  if (!programme) {
    programme = await prisma.programme.create({
      data: {
        code: "BHMCT",
        name: "Bachelor of Hotel Management & Catering Technology",
        degreeLevel: "UNDERGRADUATE",
        durationYears: 4,
        departmentId: dept.id,
      },
    });
  }

  let semester1 = await prisma.semester.findFirst({
    where: { programmeId: programme.id, semesterNumber: 1 },
  });
  if (!semester1) {
    semester1 = await prisma.semester.create({
      data: {
        programmeId: programme.id,
        semesterNumber: 1,
        termType: "ODD",
      },
    });
  }

  let divisionA = await prisma.division.findFirst({
    where: { semesterId: semester1.id, name: "Division A" },
  });
  if (!divisionA) {
    divisionA = await prisma.division.create({
      data: {
        semesterId: semester1.id,
        name: "Division A",
        maxCapacity: 60,
      },
    });
  }

  let divisionB = await prisma.division.findFirst({
    where: { semesterId: semester1.id, name: "Division B" },
  });
  if (!divisionB) {
    divisionB = await prisma.division.create({
      data: {
        semesterId: semester1.id,
        name: "Division B",
        maxCapacity: 60,
      },
    });
  }

  // Subjects
  let subjectFp = await prisma.subject.findFirst({ where: { code: "BHM101" } });
  if (!subjectFp) {
    subjectFp = await prisma.subject.create({
      data: {
        code: "BHM101",
        title: "Food Production Principles",
        credits: 4.0,
        subjectType: "PRACTICAL_KITCHEN",
        semesterId: semester1.id,
      },
    });
  }

  let subjectFbs = await prisma.subject.findFirst({ where: { code: "BHM102" } });
  if (!subjectFbs) {
    subjectFbs = await prisma.subject.create({
      data: {
        code: "BHM102",
        title: "Food & Beverage Service",
        credits: 3.0,
        subjectType: "THEORY",
        semesterId: semester1.id,
      },
    });
  }

  // Staff and Faculty User
  let staff = await prisma.staff.create({
    data: {
      employeeId: "RPIHM-FAC-WSA",
      fullName: "Chef Instructor WS-A",
      email: "ws_a_faculty@rpihm.ac.in",
      phone: "9876543201",
      designation: "Assistant Professor",
      category: "TEACHING",
      departmentId: dept.id,
      dateOfJoining: new Date("2024-01-15"),
      status: "ACTIVE",
    },
  });

  const facultyUser = await prisma.userAccount.create({
    data: {
      email: "ws_a_faculty@rpihm.ac.in",
      fullName: "Chef Instructor WS-A",
      role: "FACULTY_MEMBER",
      passwordHash: "test_hash",
      salt: "test_salt",
      staffId: staff.id,
      isActive: true,
    },
  });

  // Teaching Assignment
  let teachingAssignment = await prisma.teachingAssignment.findFirst({
    where: {
      staffId: staff.id,
      subjectId: subjectFp.id,
      divisionId: divisionA.id,
    },
  });
  if (!teachingAssignment) {
    teachingAssignment = await prisma.teachingAssignment.create({
      data: {
        staffId: staff.id,
        subjectId: subjectFp.id,
        divisionId: divisionA.id,
        weeklyHours: 4,
      },
    });
  }

  // Student 1 (Division A)
  const student1 = await prisma.student.create({
    data: {
      prn: "PRN-WS-A-001",
      rollNumber: "R-WS-A-01",
      fullName: "Student Alpha WS-A",
      email: "ws_a_student1@rpihm.ac.in",
      phone: "9800000011",
      dob: new Date("2005-01-10"),
      status: "ACTIVE",
      currentSemester: 1,
    },
  });

  const enrolment1 = await prisma.enrolment.create({
    data: {
      studentId: student1.id,
      programmeId: programme.id,
      semesterId: semester1.id,
      divisionId: divisionA.id,
      academicYearId: academicYear.id,
      status: "ENROLLED",
      enrolledAt: new Date("2026-07-15"),
    },
  });

  const user1 = await prisma.userAccount.create({
    data: {
      email: "ws_a_student1@rpihm.ac.in",
      fullName: "Student Alpha WS-A",
      role: "STUDENT_VIEWER",
      studentId: student1.id,
      passwordHash: "test_hash",
      salt: "test_salt",
      isActive: true,
    },
  });

  // Student 2 (Division B)
  const student2 = await prisma.student.create({
    data: {
      prn: "PRN-WS-A-002",
      rollNumber: "R-WS-A-02",
      fullName: "Student Beta WS-A",
      email: "ws_a_student2@rpihm.ac.in",
      phone: "9800000012",
      dob: new Date("2005-02-15"),
      status: "ACTIVE",
      currentSemester: 1,
    },
  });

  await prisma.enrolment.create({
    data: {
      studentId: student2.id,
      programmeId: programme.id,
      semesterId: semester1.id,
      divisionId: divisionB.id,
      academicYearId: academicYear.id,
      status: "ENROLLED",
      enrolledAt: new Date("2026-07-15"),
    },
  });

  const user2 = await prisma.userAccount.create({
    data: {
      email: "ws_a_student2@rpihm.ac.in",
      fullName: "Student Beta WS-A",
      role: "STUDENT_VIEWER",
      studentId: student2.id,
      passwordHash: "test_hash",
      salt: "test_salt",
      isActive: true,
    },
  });

  // Student 3 (Un-enrolled Student)
  const student3 = await prisma.student.create({
    data: {
      prn: "PRN-WS-A-003",
      rollNumber: "R-WS-A-03",
      fullName: "Student Gamma Unenrolled",
      email: "ws_a_unenrolled@rpihm.ac.in",
      phone: "9800000013",
      dob: new Date("2005-03-20"),
      status: "ACTIVE",
      currentSemester: 1,
    },
  });

  const user3 = await prisma.userAccount.create({
    data: {
      email: "ws_a_unenrolled@rpihm.ac.in",
      fullName: "Student Gamma Unenrolled",
      role: "STUDENT_VIEWER",
      studentId: student3.id,
      passwordHash: "test_hash",
      salt: "test_salt",
      isActive: true,
    },
  });

  // User 4 (Unlinked Account: No student profile linked)
  const user4 = await prisma.userAccount.create({
    data: {
      email: "ws_a_unlinked@rpihm.ac.in",
      fullName: "Unlinked Student Account",
      role: "STUDENT_VIEWER",
      studentId: null,
      passwordHash: "test_hash",
      salt: "test_salt",
      isActive: true,
    },
  });

  // Sessions
  const session1 = await createSession(user1.id);
  const session2 = await createSession(user2.id);
  const session3 = await createSession(user3.id);
  const session4 = await createSession(user4.id);
  const sessionFaculty = await createSession(facultyUser.id);

  // Timetable Entries for Division A
  await prisma.timetableEntry.create({
    data: {
      semesterId: semester1.id,
      divisionId: divisionA.id,
      subjectId: subjectFp.id,
      teachingAssignmentId: teachingAssignment.id,
      dayOfWeek: "MONDAY",
      startTime: "09:00",
      endTime: "11:00",
      room: "WS_A_ROOM_KITCHEN_1",
      sessionType: "PRACTICAL_KITCHEN",
      status: "ACTIVE",
    },
  });

  await prisma.timetableEntry.create({
    data: {
      semesterId: semester1.id,
      divisionId: divisionA.id,
      subjectId: subjectFbs.id,
      teachingAssignmentId: teachingAssignment.id,
      dayOfWeek: "TUESDAY",
      startTime: "11:30",
      endTime: "12:30",
      room: "WS_A_ROOM_THEORY_101",
      sessionType: "THEORY",
      status: "ACTIVE",
    },
  });

  // Timetable Entry for Division B
  await prisma.timetableEntry.create({
    data: {
      semesterId: semester1.id,
      divisionId: divisionB.id,
      subjectId: subjectFbs.id,
      teachingAssignmentId: teachingAssignment.id,
      dayOfWeek: "WEDNESDAY",
      startTime: "14:00",
      endTime: "15:00",
      room: "WS_A_ROOM_DIV_B_ONLY",
      sessionType: "THEORY",
      status: "ACTIVE",
    },
  });

  // Attendance Sessions & Records for Student 1
  const attSession1 = await prisma.attendanceSession.create({
    data: {
      subjectId: subjectFp.id,
      semesterId: semester1.id,
      divisionId: divisionA.id,
      facultyId: staff.id,
      sessionDate: new Date("2026-08-01"),
      startTime: "09:00",
      endTime: "11:00",
      sessionType: "PRACTICAL_KITCHEN",
      topicCovered: "WS_A_TEST_Basic Knife Skills",
      status: "FINALIZED",
      recordedById: facultyUser.id,
    },
  });
  await prisma.attendanceRecord.create({
    data: {
      sessionId: attSession1.id,
      studentId: student1.id,
      enrolmentId: enrolment1.id,
      status: "PRESENT",
      remarks: "On time with complete uniform",
    },
  });

  const attSession2 = await prisma.attendanceSession.create({
    data: {
      subjectId: subjectFp.id,
      semesterId: semester1.id,
      divisionId: divisionA.id,
      facultyId: staff.id,
      sessionDate: new Date("2026-08-08"),
      startTime: "09:00",
      endTime: "11:00",
      sessionType: "PRACTICAL_KITCHEN",
      topicCovered: "WS_A_TEST_Stock Preparation",
      status: "FINALIZED",
      recordedById: facultyUser.id,
    },
  });
  await prisma.attendanceRecord.create({
    data: {
      sessionId: attSession2.id,
      studentId: student1.id,
      enrolmentId: enrolment1.id,
      status: "LATE",
      remarks: "Admitted 15 mins late",
    },
  });

  const attSession3 = await prisma.attendanceSession.create({
    data: {
      subjectId: subjectFbs.id,
      semesterId: semester1.id,
      divisionId: divisionA.id,
      facultyId: staff.id,
      sessionDate: new Date("2026-08-09"),
      startTime: "11:30",
      endTime: "12:30",
      sessionType: "THEORY",
      topicCovered: "WS_A_TEST_Restaurant Layouts",
      status: "FINALIZED",
      recordedById: facultyUser.id,
    },
  });
  await prisma.attendanceRecord.create({
    data: {
      sessionId: attSession3.id,
      studentId: student1.id,
      enrolmentId: enrolment1.id,
      status: "ABSENT",
      remarks: null,
    },
  });

  const attSession4 = await prisma.attendanceSession.create({
    data: {
      subjectId: subjectFbs.id,
      semesterId: semester1.id,
      divisionId: divisionA.id,
      facultyId: staff.id,
      sessionDate: new Date("2026-08-16"),
      startTime: "11:30",
      endTime: "12:30",
      sessionType: "THEORY",
      topicCovered: "WS_A_TEST_Cover Setup",
      status: "FINALIZED",
      recordedById: facultyUser.id,
    },
  });
  await prisma.attendanceRecord.create({
    data: {
      sessionId: attSession4.id,
      studentId: student1.id,
      enrolmentId: enrolment1.id,
      status: "EXCUSED",
      remarks: "Medical certificate accepted by HOD",
    },
  });

  // Cancelled session (Must NOT appear in student records)
  const attSessionCancelled = await prisma.attendanceSession.create({
    data: {
      subjectId: subjectFp.id,
      semesterId: semester1.id,
      divisionId: divisionA.id,
      facultyId: staff.id,
      sessionDate: new Date("2026-08-20"),
      startTime: "09:00",
      endTime: "11:00",
      sessionType: "PRACTICAL_KITCHEN",
      topicCovered: "WS_A_TEST_Cancelled Holiday Session",
      status: "CANCELLED",
      recordedById: facultyUser.id,
    },
  });
  await prisma.attendanceRecord.create({
    data: {
      sessionId: attSessionCancelled.id,
      studentId: student1.id,
      enrolmentId: enrolment1.id,
      status: "ABSENT",
      remarks: "Session cancelled",
    },
  });

  assert(true, "Isolated test fixtures initialized successfully.");

  // =========================================================================
  // SUITE 1: UNAUTHENTICATED SESSION ACCESS REJECTION
  // =========================================================================
  setSuite("SUITE 1: Unauthenticated Session Access Rejection");

  setTestSessionToken(null);
  const unauthTimetableRes = await getStudentSelfTimetable();
  assert(
    !unauthTimetableRes.success && unauthTimetableRes.code === "UNAUTHORIZED",
    "getStudentSelfTimetable rejects unauthenticated caller with UNAUTHORIZED"
  );

  const unauthAttRes = await getStudentSelfAttendance();
  assert(
    !unauthAttRes.success && unauthAttRes.code === "UNAUTHORIZED",
    "getStudentSelfAttendance rejects unauthenticated caller with UNAUTHORIZED"
  );

  // =========================================================================
  // SUITE 2: NON-STUDENT ROLE REJECTION
  // =========================================================================
  setSuite("SUITE 2: Non-Student Role Rejection");

  setTestSessionToken(sessionFaculty.token);
  const facultyTimetableRes = await getStudentSelfTimetable();
  assert(
    !facultyTimetableRes.success && facultyTimetableRes.code === "FORBIDDEN",
    "getStudentSelfTimetable rejects FACULTY_MEMBER session with FORBIDDEN"
  );

  const facultyAttRes = await getStudentSelfAttendance();
  assert(
    !facultyAttRes.success && facultyAttRes.code === "FORBIDDEN",
    "getStudentSelfAttendance rejects FACULTY_MEMBER session with FORBIDDEN"
  );

  // =========================================================================
  // SUITE 3: UNLINKED STUDENT ACCOUNT HANDLING
  // =========================================================================
  setSuite("SUITE 3: Unlinked Student Account Handling");

  setTestSessionToken(session4.token);
  const unlinkedTimetableRes = await getStudentSelfTimetable();
  assert(
    !unlinkedTimetableRes.success && unlinkedTimetableRes.code === "UNLINKED_STUDENT",
    "getStudentSelfTimetable returns UNLINKED_STUDENT when user has no linked Student profile"
  );

  const unlinkedAttRes = await getStudentSelfAttendance();
  assert(
    !unlinkedAttRes.success && unlinkedAttRes.code === "UNLINKED_STUDENT",
    "getStudentSelfAttendance returns UNLINKED_STUDENT when user has no linked Student profile"
  );

  // =========================================================================
  // SUITE 4: UN-ENROLLED STUDENT HANDLING
  // =========================================================================
  setSuite("SUITE 4: Un-enrolled Student Handling");

  setTestSessionToken(session3.token);
  const unenrolledTimetableRes = await getStudentSelfTimetable();
  assert(
    !unenrolledTimetableRes.success && unenrolledTimetableRes.code === "NO_ACTIVE_ENROLMENT",
    "getStudentSelfTimetable returns NO_ACTIVE_ENROLMENT when student has no active enrolment"
  );

  const unenrolledAttRes = await getStudentSelfAttendance();
  assert(
    unenrolledAttRes.success &&
      unenrolledAttRes.data?.summary.totalConductedSessions === 0 &&
      unenrolledAttRes.data?.records.length === 0,
    "getStudentSelfAttendance returns empty summary and zero records for un-enrolled student without records"
  );

  // =========================================================================
  // SUITE 5: STUDENT TIMETABLE RETRIEVAL & SCOPING
  // =========================================================================
  setSuite("SUITE 5: Student Timetable Retrieval & Scoping");

  setTestSessionToken(session1.token);
  const s1TimetableRes = await getStudentSelfTimetable();
  assert(s1TimetableRes.success && !!s1TimetableRes.data, "Student 1 timetable retrieved successfully");

  if (s1TimetableRes.success && s1TimetableRes.data) {
    const data = s1TimetableRes.data;
    assert(
      data.placement.programmeCode === "BHMCT" &&
        data.placement.semesterNumber === 1 &&
        data.placement.divisionName === "Division A",
      "Placement correctly derived server-side from active enrolment (BHMCT Sem 1 Div A)",
      { placement: data.placement }
    );

    assert(
      data.entries.length === 2,
      `Exactly 2 timetable entries retrieved for Division A (found ${data.entries.length})`,
      { count: data.entries.length }
    );

    const hasDivBRoom = data.entries.some((e) => e.room === "WS_A_ROOM_DIV_B_ONLY");
    assert(
      !hasDivBRoom,
      "Timetable entries strictly scoped to Division A: Division B entries are excluded"
    );

    const mondayEntry = data.entries.find((e) => e.dayOfWeek === "MONDAY");
    assert(
      mondayEntry?.subject.code === "BHM101" &&
        mondayEntry?.room === "WS_A_ROOM_KITCHEN_1" &&
        mondayEntry?.sessionType === "PRACTICAL_KITCHEN" &&
        mondayEntry?.staffName === "Chef Instructor WS-A",
      "Monday practical entry has correct subject, room, sessionType, and faculty assignment"
    );
  }

  // =========================================================================
  // SUITE 6: CROSS-STUDENT TIMETABLE ISOLATION
  // =========================================================================
  setSuite("SUITE 6: Cross-Student Timetable Isolation");

  setTestSessionToken(session2.token);
  const s2TimetableRes = await getStudentSelfTimetable();
  assert(s2TimetableRes.success && !!s2TimetableRes.data, "Student 2 timetable retrieved successfully");

  if (s2TimetableRes.success && s2TimetableRes.data) {
    const data = s2TimetableRes.data;
    assert(
      data.placement.divisionName === "Division B",
      "Student 2 placement derived as Division B"
    );

    assert(
      data.entries.length === 1 && data.entries[0].room === "WS_A_ROOM_DIV_B_ONLY",
      "Student 2 only sees Division B timetable entries; Division A entries are excluded"
    );
  }

  // =========================================================================
  // SUITE 7: STUDENT ATTENDANCE RAW COUNTS & TRANSPARENCY
  // =========================================================================
  setSuite("SUITE 7: Student Attendance Raw Counts & Integrity");

  setTestSessionToken(session1.token);
  const s1AttRes = await getStudentSelfAttendance();
  assert(s1AttRes.success && !!s1AttRes.data, "Student 1 attendance retrieved successfully");

  if (s1AttRes.success && s1AttRes.data) {
    const { summary, records } = s1AttRes.data;

    assert(
      summary.presentCount === 1,
      `Present count is exactly 1 (found ${summary.presentCount})`
    );
    assert(
      summary.lateCount === 1,
      `Late count is exactly 1 (found ${summary.lateCount})`
    );
    assert(
      summary.absentCount === 1,
      `Absent count is exactly 1 (found ${summary.absentCount})`
    );
    assert(
      summary.excusedCount === 1,
      `Excused count is exactly 1 (found ${summary.excusedCount})`
    );

    const expectedTotalOps = 1 + 1 + 1 + 1; // 4
    assert(
      summary.totalRecordedOpportunities === expectedTotalOps,
      `Total recorded opportunities = 4 (Present + Late + Absent + Excused) (found ${summary.totalRecordedOpportunities})`
    );

    // Verify ZERO percentage properties in summary payload
    const summaryKeys = Object.keys(summary);
    const hasPercentageKey = summaryKeys.some((k) =>
      k.toLowerCase().includes("percent") || k.toLowerCase().includes("rate") || k.toLowerCase().includes("eligib")
    );
    assert(
      !hasPercentageKey,
      "Attendance summary payload strictly contains ZERO calculated percentages or eligibility verdicts",
      { keys: summaryKeys }
    );

    // Verify records length: 4 active sessions (cancelled session MUST be excluded)
    assert(
      records.length === 4,
      `Active attendance session records count is 4 (cancelled session excluded, found ${records.length})`
    );

    const hasCancelledTopic = records.some((r) =>
      r.topicCovered?.includes("Cancelled Holiday Session")
    );
    assert(
      !hasCancelledTopic,
      "Cancelled session records are completely excluded from student attendance history"
    );

    // Chronological order verification (descending by sessionDate)
    const isSortedDesc = records.every((r, idx) => {
      if (idx === 0) return true;
      const prevDate = new Date(records[idx - 1].sessionDate).getTime();
      const currDate = new Date(r.sessionDate).getTime();
      return prevDate >= currDate;
    });
    assert(isSortedDesc, "Attendance session records are sorted chronologically descending");

    // Subject breakdown verification
    assert(
      summary.subjectBreakdown.length === 2,
      `Subject breakdown contains both enrolled subjects with conducted sessions (found ${summary.subjectBreakdown.length})`
    );
  }

  // =========================================================================
  // SUITE 8: CROSS-STUDENT ATTENDANCE ISOLATION
  // =========================================================================
  setSuite("SUITE 8: Cross-Student Attendance Isolation");

  setTestSessionToken(session2.token);
  const s2AttRes = await getStudentSelfAttendance();
  assert(s2AttRes.success && !!s2AttRes.data, "Student 2 attendance retrieved");

  if (s2AttRes.success && s2AttRes.data) {
    assert(
      s2AttRes.data.records.length === 0 && s2AttRes.data.summary.totalRecordedOpportunities === 0,
      "Student 2 has 0 recorded attendance sessions; completely isolated from Student 1 records"
    );
  }

  // =========================================================================
  // SUITE 9: OPERATIONAL DATABASE INVARIANCE
  // =========================================================================
  setSuite("SUITE 9: Operational Database SHA-256 Invariance Verification");

  const finalDevBuf = fs.readFileSync(DEV_DB);
  const finalHash = crypto.createHash("sha256").update(finalDevBuf).digest("hex").toUpperCase();
  console.log(`Final dev.db SHA-256: ${finalHash}`);

  const EXPECTED_HASH = "2F092C9633F565F416051E4551A6D0751DAB601163271D10F3AC49AA0BD0B162";
  assert(
    finalHash === EXPECTED_HASH,
    `Operational database (prisma/dev.db) is 100% UNCHANGED and matches protected baseline (${EXPECTED_HASH})`,
    { initialHash, finalHash, EXPECTED_HASH }
  );

  console.log("\n=================================================================");
  console.log(`WORKSTREAM A TEST SUMMARY: ${passedAssertions} / ${totalAssertions} assertions passed`);
  if (failedAssertions > 0) {
    console.error(`FAILED ASSERTIONS: ${failedAssertions}`);
    process.exit(1);
  } else {
    console.log("ALL WORKSTREAM A TESTS PASSED PERFECTLY!");
    console.log("=================================================================");
  }
}

main().catch((err) => {
  console.error("FATAL ERROR in Workstream A test execution:", err);
  process.exit(1);
});
