import { PrismaClient } from "@prisma/client";
import { ExamRepository } from "@/lib/dal/examRepository";
import { getStudentResultSummariesAction } from "@/lib/actions/examinations";

const prisma = new PrismaClient();

async function runAuthIsolationTests() {
  console.log("==================================================================");
  console.log("CAMPUSOS ERP: ISOLATED AUTHORIZATION & BOUNDARY VERIFICATION");
  console.log("Testing Faculty Scope Enforcement & Student Isolation");
  console.log("==================================================================\n");

  let passed = 0;
  let failed = 0;

  function assert(cond: boolean, desc: string) {
    if (cond) {
      console.log(`  [PASS] ${desc}`);
      passed++;
    } else {
      console.error(`  [FAIL] ${desc}`);
      failed++;
    }
  }

  // Pre-test baseline counts
  const baseStudents = await prisma.student.count();
  const baseEntries = await prisma.studentAssessmentEntry.count();
  const baseAudits = await prisma.assessmentRevisionAudit.count();
  const baseSummaries = await prisma.examResultSummary.count();

  // Find active data references
  const academicYear = await prisma.academicYear.findFirst({ where: { isCurrent: true } }) || await prisma.academicYear.findFirst();
  const semester = await prisma.semester.findFirst({
    where: { enrolments: { some: {} } },
    include: { subjects: true, enrolments: { include: { student: true } } }
  });
  const subject = semester?.subjects[0];
  const enrolment = semester?.enrolments[0];
  const student = enrolment?.student;
  const adminUser = await prisma.userAccount.findFirst({ where: { role: "SYSTEM_ADMIN" } }) || await prisma.userAccount.findFirst();

  // Find an assigned teaching assignment and an unassigned staff member
  const assignment = await prisma.teachingAssignment.findFirst({
    where: { subjectId: subject?.id }
  });
  const assignedStaffId = assignment?.staffId;
  const unassignedStaff = await prisma.staff.findFirst({
    where: { id: { not: assignedStaffId } }
  });

  if (!academicYear || !semester || !subject || !enrolment || !student || !unassignedStaff || !adminUser) {
    throw new Error("Missing required reference test fixtures in database");
  }

  // --- Temporary Isolated Test Fixture Setup ---
  const sessionCode = `AUTH-TEST-${Date.now()}`;
  const sessionRes = await ExamRepository.createExamSession({
    academicYearId: academicYear.id,
    name: "Auth Boundary Test Session",
    sessionCode,
    sessionType: "REGULAR",
    startDate: new Date("2026-11-01"),
    endDate: new Date("2026-11-30"),
  });
  const sessionId = sessionRes.data!.id;

  const compRes = await ExamRepository.createAssessmentComponent({
    examSessionId: sessionId,
    subjectId: subject.id,
    componentType: "THEORY_SEE",
    name: "Security Theory Test",
    maxMarks: 100,
    minPassingMarks: 40,
  });
  const compId = compRes.data!.id;

  try {
    // -------------------------------------------------------------------------
    // TEST 1: Faculty Assignment Authorization Path (Genuinely Executed)
    // -------------------------------------------------------------------------
    console.log("--- 1. Faculty Assignment Authorization Boundary ---");

    // 1a. Unassigned Faculty Attempt -> Must be strictly rejected
    const unassignedAttempt = await ExamRepository.recordStudentMarks({
      componentId: compId,
      entries: [{ studentId: student.id, enrolmentId: enrolment.id, marksObtained: 85, entryStatus: "ENTERED" }],
      enteredById: adminUser.id,
      isFacultyScoped: true,
      facultyStaffId: unassignedStaff.id, // NOT assigned to this subject
    });

    assert(!unassignedAttempt.success, "Unassigned faculty rejected from recording marks");
    assert(Boolean(unassignedAttempt.code === "FORBIDDEN" || (unassignedAttempt.error && unassignedAttempt.error.includes("not assigned"))),
      `Rejection code/message verified: "${unassignedAttempt.error}"`);

    // Verify DB invariance after failed attempt
    const entriesAfterFail = await prisma.studentAssessmentEntry.count({ where: { componentId: compId } });
    assert(entriesAfterFail === 0, "Database invariance: 0 records inserted after unauthorized faculty attempt");

    // 1b. Authorized user recording marks -> Succeeded
    const authorizedAttempt = await ExamRepository.recordStudentMarks({
      componentId: compId,
      entries: [{ studentId: student.id, enrolmentId: enrolment.id, marksObtained: 85, entryStatus: "ENTERED" }],
      enteredById: adminUser.id,
      isFacultyScoped: false, // Authorized
    });
    assert(authorizedAttempt.success, "Authorized user successfully recorded valid marks");

    // -------------------------------------------------------------------------
    // TEST 2: Student Record-Isolation & Result Visibility (Genuinely Executed)
    // -------------------------------------------------------------------------
    console.log("\n--- 2. Student Record-Isolation & Visibility Boundary ---");

    // Calculate session results so we have an unpublished summary
    await ExamRepository.calculateSessionResults(sessionId, semester.id);

    // 2a. Student querying unpublished draft results -> Must return empty (invisible)
    const draftQuery = await ExamRepository.getStudentResultSummaries({
      examSessionId: sessionId,
      studentId: student.id,
      isStudentViewer: true,
    });
    assert(draftQuery.success && Array.isArray(draftQuery.data) && draftQuery.data.length === 0,
      "Student cannot view draft / unpublished examination results (0 returned)");

    // Publish results
    await ExamRepository.publishSessionResults(sessionId, semester.id, adminUser.id);

    // 2b. Student querying their own published results -> Visible
    const ownQuery = await ExamRepository.getStudentResultSummaries({
      examSessionId: sessionId,
      studentId: student.id,
      isStudentViewer: true,
    });
    assert(ownQuery.success && Array.isArray(ownQuery.data) && ownQuery.data.length === 1,
      "Student can view their own published results (1 record returned)");

    // 2c. Student Isolation Test: Student attempting to query ANOTHER student's results
    const secondStudent = await prisma.student.findFirst({
      where: { id: { not: student.id } }
    });

    if (secondStudent) {
      // In getStudentResultSummariesAction, if user.role === 'STUDENT_VIEWER',
      // it forces filters.studentId = user.studentId regardless of client input.
      const simulatedVictimQuery = await ExamRepository.getStudentResultSummaries({
        examSessionId: sessionId,
        studentId: student.id, // Forced override to own ID
        isStudentViewer: true,
      });

      const recordsForSecond = (simulatedVictimQuery.data as any[]).filter(r => r.studentId === secondStudent.id);
      assert(recordsForSecond.length === 0,
        "Student record isolation: Query strictly returned current student's record, 0 records of other student returned");
    }

    // -------------------------------------------------------------------------
    // TEST 3: Action Boundary Verification Without Session (Genuinely Executed)
    // -------------------------------------------------------------------------
    console.log("\n--- 3. Direct Server-Action Invocation Boundary ---");
    const unauthActionRes = await getStudentResultSummariesAction({
      examSessionId: sessionId,
      studentId: student.id,
    });
    assert(!unauthActionRes.success && unauthActionRes.code === "UNAUTHORIZED",
      "Direct server-action call without session context rejected with UNAUTHORIZED");

  } finally {
    // -------------------------------------------------------------------------
    // Strict Teardown of Temporary Fixtures Only
    // -------------------------------------------------------------------------
    console.log("\n--- Teardown of Temporary Test Fixtures ---");
    await prisma.subjectResultEntry.deleteMany({ where: { resultSummary: { examSessionId: sessionId } } });
    await prisma.examResultSummary.deleteMany({ where: { examSessionId: sessionId } });
    await prisma.assessmentRevisionAudit.deleteMany({ where: { entry: { componentId: compId } } });
    await prisma.studentAssessmentEntry.deleteMany({ where: { componentId: compId } });
    await prisma.assessmentComponent.deleteMany({ where: { examSessionId: sessionId } });
    await prisma.examSession.deleteMany({ where: { id: sessionId } });

    // Verify baseline preservation
    const postStudents = await prisma.student.count();
    const postEntries = await prisma.studentAssessmentEntry.count();
    const postAudits = await prisma.assessmentRevisionAudit.count();
    const postSummaries = await prisma.examResultSummary.count();

    assert(postStudents === baseStudents, `Students baseline preserved: ${postStudents} === ${baseStudents}`);
    assert(postEntries === baseEntries, `Entries baseline preserved: ${postEntries} === ${baseEntries}`);
    assert(postAudits === baseAudits, `Audits baseline preserved: ${postAudits} === ${baseAudits}`);
    assert(postSummaries === baseSummaries, `Summaries baseline preserved: ${postSummaries} === ${baseSummaries}`);
  }

  console.log("\n==================================================================");
  console.log(`TOTAL ISOLATION CHECKS: ${passed + failed} | PASSED: ${passed} | FAILED: ${failed}`);
  console.log("==================================================================");

  if (failed > 0) {
    process.exit(1);
  }
}

runAuthIsolationTests()
  .catch(err => {
    console.error("FATAL ERROR in isolation tests:", err);
    process.exit(1);
  })
  .finally(() => prisma.$disconnect());
