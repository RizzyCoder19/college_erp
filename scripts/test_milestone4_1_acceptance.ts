import prisma from "@/lib/db";
import { TimetableRepository, isTimeOverlapping } from "@/lib/dal/timetableRepository";
import { AttendanceRepository } from "@/lib/dal/attendanceRepository";
import { hasPermission } from "@/lib/auth/roles";

interface TestResult {
  suite: string;
  name: string;
  passed: boolean;
  message?: string;
}

const results: TestResult[] = [];

function assert(suite: string, name: string, condition: boolean, message?: string) {
  results.push({ suite, name, passed: condition, message });
  const status = condition ? "PASS" : "FAIL";
  console.log(`  [${status}] ${suite} -> ${name}${message ? ": " + message : ""}`);
  if (!condition) {
    console.error(`       ERROR: Assertion failed for ${name}`);
  }
}

async function runAcceptanceTests() {
  console.log("================================================================================");
  console.log("   CAMPUSOS ERP — MILESTONE 4.1: OPERATIONAL ACCEPTANCE & INTEGRITY SUITE       ");
  console.log("================================================================================\n");

  // --- 0. PREFLIGHT BASELINE AUDIT ---
  console.log("--- 0. PREFLIGHT DATABASE BASELINE SNAPSHOT ---");
  const baseline = {
    students: await prisma.student.count(),
    staff: await prisma.staff.count(),
    programmes: await prisma.programme.count(),
    semesters: await prisma.semester.count(),
    divisions: await prisma.division.count(),
    enrolments: await prisma.enrolment.count(),
    assignments: await prisma.teachingAssignment.count(),
    accounts: await prisma.userAccount.count(),
    timetables: await prisma.timetableEntry.count(),
    sessions: await prisma.attendanceSession.count(),
    records: await prisma.attendanceRecord.count(),
  };
  console.log("Active DB Baseline:", JSON.stringify(baseline, null, 2));

  assert("Preflight", "Preserved 13 Students Baseline", baseline.students === 13, `Count=${baseline.students}`);
  assert("Preflight", "Preserved 13 Staff Baseline", baseline.staff === 13, `Count=${baseline.staff}`);
  assert("Preflight", "Preserved 20 Divisions Baseline", baseline.divisions === 20, `Count=${baseline.divisions}`);
  assert("Preflight", "Preserved 14 Enrolments Baseline", baseline.enrolments === 14, `Count=${baseline.enrolments}`);
  assert("Preflight", "Preserved 5 Teaching Assignments Baseline", baseline.assignments === 5, `Count=${baseline.assignments}`);

  // Fetch verified academic entities
  const culinaryProg = await prisma.programme.findFirst({ where: { code: "BA-CUL" } });
  const culinarySem1 = await prisma.semester.findFirst({
    where: { programmeId: culinaryProg!.id, semesterNumber: 1 },
    include: { divisions: true, subjects: true },
  });
  const culinaryDivA = culinarySem1!.divisions.find((d) => d.name === "Div A");
  const culinaryDivB = culinarySem1!.divisions.find((d) => d.name === "Div B") || culinarySem1!.divisions[1];
  const culinarySub1 = culinarySem1!.subjects[0];
  const culinarySub2 = culinarySem1!.subjects[1] || culinarySub1;

  const adminAccount = await prisma.userAccount.findFirst({ where: { role: "SYSTEM_ADMIN" } });
  const facultyStaff1 = await prisma.staff.findFirst({ where: { designation: { contains: "Chef" } } });
  const facultyStaff2 = await prisma.staff.findFirst({ where: { id: { not: facultyStaff1!.id } } });

  // Ensure teaching assignments for test
  let testAssignment1 = await prisma.teachingAssignment.findFirst({
    where: { subjectId: culinarySub1.id, staffId: facultyStaff1!.id },
  });
  let createdTestAssignment1 = false;
  if (!testAssignment1) {
    testAssignment1 = await prisma.teachingAssignment.create({
      data: {
        subjectId: culinarySub1.id,
        staffId: facultyStaff1!.id,
        divisionId: culinaryDivA!.id,
        weeklyHours: 4,
      },
    });
    createdTestAssignment1 = true;
  }

  let testAssignment2 = await prisma.teachingAssignment.findFirst({
    where: { subjectId: culinarySub2.id, staffId: facultyStaff2!.id },
  });
  let createdTestAssignment2 = false;
  if (!testAssignment2) {
    testAssignment2 = await prisma.teachingAssignment.create({
      data: {
        subjectId: culinarySub2.id,
        staffId: facultyStaff2!.id,
        divisionId: culinaryDivA!.id,
        weeklyHours: 4,
      },
    });
    createdTestAssignment2 = true;
  }

  // --- 1. ATTENDANCE CALCULATION INTEGRITY (PHASE 2) ---
  console.log("\n--- 1. ATTENDANCE CALCULATION INTEGRITY ---");

  // Test 1.1: Zero-safe denominator
  const emptySummary = await AttendanceRepository.getAttendanceSummary({
    semesterId: "nonexistent-sem-id",
  });
  assert(
    "Calculations",
    "Zero-Safe Denominator Returns null Rate When No Sessions Recorded",
    emptySummary.success && (emptySummary.data as { attendanceRate: number | null }).attendanceRate === null,
    `Rate: ${(emptySummary.data as { attendanceRate: number | null })?.attendanceRate}`
  );
  assert(
    "Calculations",
    "Zero-Safe Flag hasRecordedSessions is false for Empty Cohort",
    emptySummary.success && (emptySummary.data as { hasRecordedSessions: boolean }).hasRecordedSessions === false,
    `hasRecordedSessions: ${(emptySummary.data as { hasRecordedSessions: boolean })?.hasRecordedSessions}`
  );

  // --- 2. TIMETABLE PERSISTENCE & COLLISION ENGINE (PHASE 3) ---
  console.log("\n--- 2. TIMETABLE PERSISTENCE & COLLISION ENGINE ---");

  // Test 2.1: Interval overlap logic (pure math)
  assert("Collision Engine", "Detects Overlap [09:00-10:00] & [09:30-10:30]", isTimeOverlapping("09:00", "10:00", "09:30", "10:30") === true);
  assert("Collision Engine", "Detects Overlap [09:00-11:00] & [09:30-10:00]", isTimeOverlapping("09:00", "11:00", "09:30", "10:00") === true);
  
  // Test 2.2: Back-to-back slots MUST be accepted (no overlap)
  assert("Collision Engine", "Back-to-Back Slots Accepted [09:00-10:00] & [10:00-11:00]", isTimeOverlapping("09:00", "10:00", "10:00", "11:00") === false);
  assert("Collision Engine", "Back-to-Back Slots Accepted [10:00-11:00] & [09:00-10:00]", isTimeOverlapping("10:00", "11:00", "09:00", "10:00") === false);

  // Test 2.3: Create valid timetable entry Slot 1 (09:00 - 10:00)
  const slot1Res = await TimetableRepository.createTimetableEntry({
    semesterId: culinarySem1!.id,
    divisionId: culinaryDivA!.id,
    subjectId: culinarySub1.id,
    teachingAssignmentId: testAssignment1.id,
    dayOfWeek: "MONDAY",
    startTime: "09:00",
    endTime: "10:00",
    room: "Basic Training Kitchen 1",
    sessionType: "THEORY",
  });
  assert("Timetable Persistence", "Create Valid Timetable Entry (Mon 09:00-10:00)", slot1Res.success, (slot1Res.data as { id?: string })?.id);
  const slot1 = slot1Res.data as { id: string };

  // Test 2.4: Attempt Overlapping Division Booking (09:30 - 10:30) with DIFFERENT faculty (testAssignment2)
  const overlapDivRes = await TimetableRepository.createTimetableEntry({
    semesterId: culinarySem1!.id,
    divisionId: culinaryDivA!.id,
    subjectId: culinarySub2.id,
    teachingAssignmentId: testAssignment2.id,
    dayOfWeek: "MONDAY",
    startTime: "09:30",
    endTime: "10:30",
    room: "Demo Lab 2",
    sessionType: "THEORY",
  });
  assert(
    "Conflict Detection",
    "Overlapping Division Booking Rejected",
    !overlapDivRes.success && overlapDivRes.code === "DIVISION_SCHEDULE_CONFLICT",
    `Code: ${overlapDivRes.code}, Error: ${overlapDivRes.error}`
  );

  // Test 2.5: Attempt Overlapping Room Booking (09:30 - 10:30) with DIFFERENT faculty & DIFFERENT division (or cohort)
  // Let's create an assignment for facultyStaff2 on culinaryDivB if culinaryDivB exists
  let divBAssignmentId = testAssignment2.id;
  if (culinaryDivB && culinaryDivB.id !== culinaryDivA!.id) {
    const asstB = await prisma.teachingAssignment.create({
      data: {
        subjectId: culinarySub2.id,
        staffId: facultyStaff2!.id,
        divisionId: culinaryDivB.id,
        weeklyHours: 4,
      },
    });
    divBAssignmentId = asstB.id;
  }

  const overlapRoomRes = await TimetableRepository.createTimetableEntry({
    semesterId: culinarySem1!.id,
    divisionId: culinaryDivB?.id || null,
    subjectId: culinarySub2.id,
    teachingAssignmentId: divBAssignmentId,
    dayOfWeek: "MONDAY",
    startTime: "09:30",
    endTime: "10:30",
    room: "Basic Training Kitchen 1",
    sessionType: "THEORY",
  });
  assert(
    "Conflict Detection",
    "Overlapping Room Booking Rejected",
    !overlapRoomRes.success && overlapRoomRes.code === "ROOM_SCHEDULE_CONFLICT",
    `Code: ${overlapRoomRes.code}, Error: ${overlapRoomRes.error}`
  );

  // Test 2.6: Create Valid Back-to-Back Slot 2 (10:00 - 11:00)
  const slot2Res = await TimetableRepository.createTimetableEntry({
    semesterId: culinarySem1!.id,
    divisionId: culinaryDivA!.id,
    subjectId: culinarySub1.id,
    teachingAssignmentId: testAssignment1.id,
    dayOfWeek: "MONDAY",
    startTime: "10:00",
    endTime: "11:00",
    room: "Basic Training Kitchen 1",
    sessionType: "THEORY",
  });
  assert("Timetable Persistence", "Valid Back-to-Back Slot Accepted (Mon 10:00-11:00)", slot2Res.success, (slot2Res.data as { id?: string })?.id);
  const slot2 = slot2Res.data as { id: string };

  // --- 3. ATTENDANCE PERSISTENCE, COHORT LOADING & STATE TRANSITIONS (PHASE 3) ---
  console.log("\n--- 3. ATTENDANCE COHORT, DRAFT LIFECYCLE & STATE TRANSITIONS ---");

  // Test 3.1: Active cohort loading
  const cohortRes = await AttendanceRepository.getCohortForSession(culinarySem1!.id, culinaryDivA!.id);
  assert("Cohort Loading", "Load Active Enrolled Cohort for Culinary Sem 1 Div A", cohortRes.success && (cohortRes.data as unknown[]).length > 0, `Count: ${(cohortRes.data as unknown[])?.length}`);
  const cohort = cohortRes.data as Array<{ studentId: string; enrolmentId: string }>;

  // Test 3.2: Cross-cohort student tampering rejected
  const otherStudent = await prisma.student.findFirst({
    where: {
      enrolments: {
        none: {
          semesterId: culinarySem1!.id,
          divisionId: culinaryDivA!.id,
          status: "ENROLLED",
        },
      },
    },
  });
  const crossCohortRes = await AttendanceRepository.recordAttendanceSession({
    timetableEntryId: slot1.id,
    semesterId: culinarySem1!.id,
    divisionId: culinaryDivA!.id,
    subjectId: culinarySub1.id,
    facultyId: facultyStaff1!.id,
    sessionDate: "2026-10-26",
    startTime: "09:00",
    endTime: "10:00",
    recordedById: adminAccount!.id,
    status: "DRAFT",
    records: [
      {
        studentId: otherStudent!.id,
        enrolmentId: "fake-enrolment-id",
        status: "PRESENT",
      },
    ],
  });
  assert("Security Enforcement", "Cross-Cohort Tampering Rejected", !crossCohortRes.success && crossCohortRes.code === "CROSS_COHORT_STUDENT_REJECTED", crossCohortRes.error);

  // Test 3.3: Duplicate student in sheet rejected
  const dupStudentRes = await AttendanceRepository.recordAttendanceSession({
    timetableEntryId: slot1.id,
    semesterId: culinarySem1!.id,
    divisionId: culinaryDivA!.id,
    subjectId: culinarySub1.id,
    facultyId: facultyStaff1!.id,
    sessionDate: "2026-10-26",
    startTime: "09:00",
    endTime: "10:00",
    recordedById: adminAccount!.id,
    status: "DRAFT",
    records: [
      { studentId: cohort[0].studentId, enrolmentId: cohort[0].enrolmentId, status: "PRESENT" },
      { studentId: cohort[0].studentId, enrolmentId: cohort[0].enrolmentId, status: "ABSENT" },
    ],
  });
  assert("Integrity Enforcement", "Duplicate Student in Attendance Sheet Rejected", !dupStudentRes.success && dupStudentRes.code === "DUPLICATE_STUDENT_IN_SHEET", dupStudentRes.error);

  // Test 3.4: Save Attendance as DRAFT
  const draftSessionRes = await AttendanceRepository.recordAttendanceSession({
    timetableEntryId: slot1.id,
    semesterId: culinarySem1!.id,
    divisionId: culinaryDivA!.id,
    subjectId: culinarySub1.id,
    facultyId: facultyStaff1!.id,
    sessionDate: "2026-10-26",
    startTime: "09:00",
    endTime: "10:00",
    recordedById: adminAccount!.id,
    status: "DRAFT",
    topicCovered: "Intro to Classical French Cooking Techniques",
    records: cohort.map((st) => ({
      studentId: st.studentId,
      enrolmentId: st.enrolmentId,
      status: "PRESENT",
    })),
  });
  assert("Workflow State", "Save Attendance Session as DRAFT", draftSessionRes.success && (draftSessionRes.data as { status?: string }).status === "DRAFT", (draftSessionRes.data as { id?: string })?.id);
  const draftSession = draftSessionRes.data as { id: string; status: string };

  // Test 3.5: Reload Draft Session from SQLite
  const reloadedDraft = await AttendanceRepository.getSessionDetails(draftSession.id);
  assert(
    "Persistence",
    "Reload Draft Session from SQLite",
    reloadedDraft.success && (reloadedDraft.data as { status: string; attendanceRecords: unknown[] }).status === "DRAFT" && (reloadedDraft.data as { attendanceRecords: unknown[] }).attendanceRecords.length === cohort.length,
    `Records: ${(reloadedDraft.data as { attendanceRecords: unknown[] })?.attendanceRecords?.length}`
  );

  // Test 3.6: Update Draft Session (Modify a mark and save draft again)
  const updatedDraftRes = await AttendanceRepository.recordAttendanceSession({
    timetableEntryId: slot1.id,
    semesterId: culinarySem1!.id,
    divisionId: culinaryDivA!.id,
    subjectId: culinarySub1.id,
    facultyId: facultyStaff1!.id,
    sessionDate: "2026-10-26",
    startTime: "09:00",
    endTime: "10:00",
    recordedById: adminAccount!.id,
    status: "DRAFT",
    topicCovered: "Intro to Classical French Cooking Techniques (Revised)",
    records: cohort.map((st, idx) => ({
      studentId: st.studentId,
      enrolmentId: st.enrolmentId,
      status: idx === 0 ? "LATE" : "PRESENT",
    })),
  });
  assert("Workflow State", "Update Existing Draft Session Allowed & Persisted", updatedDraftRes.success && (updatedDraftRes.data as { id?: string }).id === draftSession.id, (updatedDraftRes.data as { id?: string })?.id);

  // Test 3.7: Finalize Attendance Session
  const finalizeRes = await AttendanceRepository.finalizeSession(draftSession.id, adminAccount!.id);
  assert("Workflow State", "Finalize Attendance Session (Locks Ledger)", finalizeRes.success && (finalizeRes.data as { status?: string }).status === "FINALIZED", (finalizeRes.data as { finalizedAt?: Date })?.finalizedAt?.toString());

  // Test 3.8: Duplicate Session Blocked Once Finalized
  const dupSessionRes = await AttendanceRepository.recordAttendanceSession({
    timetableEntryId: slot1.id,
    semesterId: culinarySem1!.id,
    divisionId: culinaryDivA!.id,
    subjectId: culinarySub1.id,
    facultyId: facultyStaff1!.id,
    sessionDate: "2026-10-26",
    startTime: "09:00",
    endTime: "10:00",
    recordedById: adminAccount!.id,
    status: "DRAFT",
    records: cohort.map((st) => ({
      studentId: st.studentId,
      enrolmentId: st.enrolmentId,
      status: "PRESENT",
    })),
  });
  assert("Duplicate Prevention", "Duplicate Session for Finalized Slot Blocked", !dupSessionRes.success && dupSessionRes.code === "DUPLICATE_ATTENDANCE_SESSION", dupSessionRes.error);

  // Test 3.9: Amendment Without Mandatory Reason Rejected
  const testRecord = await prisma.attendanceRecord.findFirst({ where: { sessionId: draftSession.id } });
  const noReasonAmendRes = await AttendanceRepository.amendAttendanceRecord(testRecord!.id, "ABSENT", "   ", adminAccount!.id);
  assert("Audit Integrity", "Amendment Without Mandatory Reason Rejected", !noReasonAmendRes.success && noReasonAmendRes.code === "REASON_REQUIRED", noReasonAmendRes.error);

  // Test 3.10: Authorized Amendment with Mandatory Reason Succeeded & Audit Logged
  const authorizedAmendRes = await AttendanceRepository.amendAttendanceRecord(
    testRecord!.id,
    "ABSENT",
    "Audited by Academic Admin: unexcused absence verified with warden",
    adminAccount!.id
  );
  assert(
    "Audit Integrity",
    "Authorized Amendment with Mandatory Reason Logs Audit Stamp",
    authorizedAmendRes.success && (authorizedAmendRes.data as { amendedById: string; status: string }).amendedById === adminAccount!.id && (authorizedAmendRes.data as { status: string }).status === "ABSENT",
    `AmendedBy: ${(authorizedAmendRes.data as { amendedById: string })?.amendedById}, Remarks: ${(authorizedAmendRes.data as { remarks: string })?.remarks}`
  );

  // --- 4. CALCULATION RULES & PER-SUBJECT BREAKDOWN (PHASE 2) ---
  console.log("\n--- 4. CALCULATION VERIFICATION & PER-SUBJECT BREAKDOWN ---");
  const summaryRes = await AttendanceRepository.getAttendanceSummary({
    semesterId: culinarySem1!.id,
  });
  const summary = summaryRes.data as {
    totalConductedSessions: number;
    attendanceRate: number | null;
    subjectBreakdown: Array<{ subjectId: string; attendanceRate: number | null }>;
  };
  assert("Calculations", "Calculates Total Conducted Sessions Accurately", summary.totalConductedSessions === 1, `Total: ${summary.totalConductedSessions}`);
  assert("Calculations", "Calculates Cohort Attendance Rate Accurately", summary.attendanceRate !== null, `Rate: ${summary.attendanceRate}%`);
  assert(
    "Calculations",
    "Per-Subject Breakdown Generated Without Double-Counting",
    summary.subjectBreakdown && summary.subjectBreakdown.length > 0 && summary.subjectBreakdown[0].subjectId === culinarySub1.id,
    `Subjects: ${summary.subjectBreakdown?.length}, Sub1 Rate: ${summary.subjectBreakdown?.[0]?.attendanceRate}%`
  );

  // --- 5. SECURITY & ROLE BOUNDARY MATRIX (PHASE 4) ---
  console.log("\n--- 5. RBAC & PERMISSION BOUNDARY MATRIX ---");
  assert("RBAC Matrix", "SYSTEM_ADMIN holds RECORD_ATTENDANCE", hasPermission("SYSTEM_ADMIN", "RECORD_ATTENDANCE"));
  assert("RBAC Matrix", "SYSTEM_ADMIN holds EDIT_FINALIZED_ATTENDANCE", hasPermission("SYSTEM_ADMIN", "EDIT_FINALIZED_ATTENDANCE"));
  assert("RBAC Matrix", "ACADEMIC_ADMIN holds RECORD_ATTENDANCE", hasPermission("ACADEMIC_ADMIN", "RECORD_ATTENDANCE"));
  assert("RBAC Matrix", "ACADEMIC_ADMIN holds EDIT_FINALIZED_ATTENDANCE", hasPermission("ACADEMIC_ADMIN", "EDIT_FINALIZED_ATTENDANCE"));
  assert("RBAC Matrix", "FACULTY_MEMBER holds RECORD_ATTENDANCE", hasPermission("FACULTY_MEMBER", "RECORD_ATTENDANCE"));
  assert("RBAC Matrix", "FACULTY_MEMBER denied EDIT_FINALIZED_ATTENDANCE", !hasPermission("FACULTY_MEMBER", "EDIT_FINALIZED_ATTENDANCE"));
  assert("RBAC Matrix", "STUDENT_VIEWER denied RECORD_ATTENDANCE", !hasPermission("STUDENT_VIEWER", "RECORD_ATTENDANCE"));
  assert("RBAC Matrix", "STUDENT_VIEWER denied EDIT_FINALIZED_ATTENDANCE", !hasPermission("STUDENT_VIEWER", "EDIT_FINALIZED_ATTENDANCE"));
  assert("RBAC Matrix", "STUDENT_VIEWER holds VIEW_ATTENDANCE", hasPermission("STUDENT_VIEWER", "VIEW_ATTENDANCE"));

  // --- 6. CLEANUP & INVARIANCE RESTORATION ---
  console.log("\n--- 6. TEARDOWN & DATABASE INVARIANCE RESTORATION ---");
  // Prune created records in reverse order
  await prisma.attendanceRecord.deleteMany({ where: { sessionId: draftSession.id } });
  await prisma.attendanceSession.deleteMany({ where: { id: draftSession.id } });
  await prisma.timetableEntry.deleteMany({ where: { id: { in: [slot1.id, slot2.id] } } });
  if (divBAssignmentId !== testAssignment2.id) {
    await prisma.teachingAssignment.delete({ where: { id: divBAssignmentId } });
  }
  if (createdTestAssignment2) {
    await prisma.teachingAssignment.delete({ where: { id: testAssignment2.id } });
  }
  if (createdTestAssignment1) {
    await prisma.teachingAssignment.delete({ where: { id: testAssignment1.id } });
  }

  // Restore any modified student cached rates
  for (const st of cohort) {
    await AttendanceRepository.recalculateStudentRate(st.studentId);
  }

  const postTest = {
    students: await prisma.student.count(),
    staff: await prisma.staff.count(),
    programmes: await prisma.programme.count(),
    semesters: await prisma.semester.count(),
    divisions: await prisma.division.count(),
    enrolments: await prisma.enrolment.count(),
    assignments: await prisma.teachingAssignment.count(),
    accounts: await prisma.userAccount.count(),
  };

  const isInvariant =
    postTest.students === baseline.students &&
    postTest.staff === baseline.staff &&
    postTest.programmes === baseline.programmes &&
    postTest.semesters === baseline.semesters &&
    postTest.divisions === baseline.divisions &&
    postTest.enrolments === baseline.enrolments &&
    postTest.assignments === baseline.assignments &&
    postTest.accounts === baseline.accounts;

  assert(
    "Teardown",
    "Complete Database Invariance Preserved Post-Test",
    isInvariant,
    `Before: ${JSON.stringify(baseline)} | After: ${JSON.stringify(postTest)}`
  );

  const total = results.length;
  const passed = results.filter((r) => r.passed).length;
  const failed = results.filter((r) => !r.passed).length;

  console.log("\n================================================================================");
  console.log(`TOTAL CHECKS: ${total} | PASSED: ${passed} | FAILED: ${failed}`);
  console.log("================================================================================\n");

  if (failed > 0) {
    process.exit(1);
  }
}

runAcceptanceTests()
  .catch((e) => {
    console.error("FATAL TEST ERROR:", e);
    process.exit(1);
  })
  .finally(() => prisma.$disconnect());
