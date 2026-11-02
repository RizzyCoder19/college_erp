import { PrismaClient } from "@prisma/client";
import { ExamRepository } from "@/lib/dal/examRepository";
import { hasPermission } from "@/lib/auth/roles";

const prisma = new PrismaClient();

async function runTestSuite() {
  console.log("==================================================================");
  console.log("CAMPUSOS ERP: MILESTONE 5 AUTOMATED VERIFICATION SUITE");
  console.log("Examination & Results Subsystem, CBCS Calculation & Auditability");
  console.log("==================================================================\n");

  let passed = 0;
  let failed = 0;

  function assert(condition: boolean, desc: string) {
    if (condition) {
      console.log(`  [PASS] ${desc}`);
      passed++;
    } else {
      console.error(`  [FAIL] ${desc}`);
      failed++;
    }
  }

  // -------------------------------------------------------------
  // Test 1: Preflight Baseline Database Counts
  // -------------------------------------------------------------
  console.log("--- 1. Baseline Preflight Checks ---");
  const baselineStudents = await prisma.student.count();
  const baselineStaff = await prisma.staff.count();
  const baselineProgrammes = await prisma.programme.count();
  const baselineSemesters = await prisma.semester.count();
  const baselineDivisions = await prisma.division.count();
  const baselineEnrolments = await prisma.enrolment.count();
  const baselineAssignments = await prisma.teachingAssignment.count();
  const baselineAccounts = await prisma.userAccount.count();

  assert(baselineStudents === 13, `Baseline students count = 13 (found ${baselineStudents})`);
  assert(baselineStaff === 13, `Baseline staff count = 13 (found ${baselineStaff})`);
  assert(baselineProgrammes === 7, `Baseline programmes count = 7 (found ${baselineProgrammes})`);
  assert(baselineSemesters === 34, `Baseline semesters count = 34 (found ${baselineSemesters})`);
  assert(baselineDivisions === 20, `Baseline divisions count = 20 (found ${baselineDivisions})`);
  assert(baselineEnrolments === 14, `Baseline enrolments count = 14 (found ${baselineEnrolments})`);
  assert(baselineAssignments === 5, `Baseline teaching assignments count = 5 (found ${baselineAssignments})`);
  assert(baselineAccounts === 2, `Baseline user accounts count = 2 (found ${baselineAccounts})`);

  // -------------------------------------------------------------
  // Test 2: RBAC Role & Permission Matrix
  // -------------------------------------------------------------
  console.log("\n--- 2. RBAC Permissions Matrix ---");
  assert(hasPermission("SYSTEM_ADMIN", "MANAGE_EXAMS"), "SYSTEM_ADMIN has MANAGE_EXAMS");
  assert(hasPermission("SYSTEM_ADMIN", "PUBLISH_RESULTS"), "SYSTEM_ADMIN has PUBLISH_RESULTS");
  assert(hasPermission("ACADEMIC_ADMIN", "MANAGE_EXAMS"), "ACADEMIC_ADMIN has MANAGE_EXAMS");
  assert(hasPermission("ACADEMIC_ADMIN", "MODERATE_MARKS"), "ACADEMIC_ADMIN has MODERATE_MARKS");
  assert(hasPermission("FACULTY_MEMBER", "ENTER_MARKS"), "FACULTY_MEMBER has ENTER_MARKS");
  assert(!hasPermission("FACULTY_MEMBER", "MANAGE_EXAMS"), "FACULTY_MEMBER denied MANAGE_EXAMS");
  assert(!hasPermission("FACULTY_MEMBER", "PUBLISH_RESULTS"), "FACULTY_MEMBER denied PUBLISH_RESULTS");
  assert(hasPermission("STUDENT_VIEWER", "VIEW_RESULTS"), "STUDENT_VIEWER has VIEW_RESULTS");
  assert(!hasPermission("STUDENT_VIEWER", "ENTER_MARKS"), "STUDENT_VIEWER denied ENTER_MARKS");

  // Reference IDs for testing
  const academicYear = await prisma.academicYear.findFirst({ where: { isCurrent: true } }) || await prisma.academicYear.findFirst();
  const semester = await prisma.semester.findFirst({
    where: { enrolments: { some: {} } },
    include: { subjects: true },
  });
  const subject = semester?.subjects[0];
  const adminAccount = await prisma.userAccount.findFirst({ where: { role: "SYSTEM_ADMIN" } });
  const facultyStaff = await prisma.staff.findFirst();

  if (!academicYear || !semester || !subject || !adminAccount || !facultyStaff) {
    throw new Error("Missing required reference data in database");
  }

  // -------------------------------------------------------------
  // Test 3: Examination Session Creation & Constraint Validation
  // -------------------------------------------------------------
  console.log("\n--- 3. Examination Session Lifecycle ---");
  const testSessionCode = `TEST-WIN-${Date.now()}`;
  const sessionRes = await ExamRepository.createExamSession({
    academicYearId: academicYear.id,
    name: "Winter 2026 Test Session",
    sessionCode: testSessionCode,
    sessionType: "REGULAR",
    startDate: new Date("2026-11-15"),
    endDate: new Date("2026-12-05"),
    status: "PLANNING",
  });
  assert(sessionRes.success && !!sessionRes.data?.id, "Created examination session successfully");
  const sessionId = sessionRes.data!.id;

  // Duplicate sessionCode should fail
  const duplicateRes = await ExamRepository.createExamSession({
    academicYearId: academicYear.id,
    name: "Duplicate Session",
    sessionCode: testSessionCode,
    startDate: new Date("2026-11-15"),
    endDate: new Date("2026-12-05"),
  });
  assert(!duplicateRes.success, "Duplicate sessionCode rejected by repository validation");

  // -------------------------------------------------------------
  // Test 4: Assessment Component Definition & Max Marks Validation
  // -------------------------------------------------------------
  console.log("\n--- 4. Assessment Component Definition ---");
  const invalidCompRes = await ExamRepository.createAssessmentComponent({
    examSessionId: sessionId!,
    subjectId: subject.id,
    name: "Invalid Zero Component",
    componentType: "THEORY_SEE",
    maxMarks: 0,
  });
  assert(!invalidCompRes.success, "Zero/negative maxMarks rejected with validation error");

  const compRes = await ExamRepository.createAssessmentComponent({
    examSessionId: sessionId!,
    subjectId: subject.id,
    name: "Theory Semester End Examination",
    componentType: "THEORY_SEE",
    maxMarks: 75.0,
    minPassingMarks: 30.0,
    weightagePercentage: 75.0,
  });
  assert(compRes.success && !!compRes.data?.id, "Created Theory SEE component (Max: 75.0, Pass: 30.0)");
  const componentId = compRes.data!.id;

  // -------------------------------------------------------------
  // Test 5: Roster Loading & Enrolment Linkage
  // -------------------------------------------------------------
  console.log("\n--- 5. Candidate Roster & Enrolment Mapping ---");
  const rosterRes = await ExamRepository.getExamRosterForComponent(componentId!);
  if (!rosterRes.success || !rosterRes.data) throw new Error('Failed to load roster');
  assert(rosterRes.success, "Loaded candidate roster for component");
  assert(rosterRes.data!.roster.length > 0, `Roster contains ${rosterRes.data!.roster.length} active candidates`);

  const studentA = rosterRes.data!.roster[0];
  const studentB = rosterRes.data!.roster[1] || studentA;

  // -------------------------------------------------------------
  // Test 6: Mark Entry Validations (Range, Non-Numeric, Null vs Zero)
  // -------------------------------------------------------------
  console.log("\n--- 6. Mark Entry Validations ---");
  // 6a: Reject negative marks
  const negativeMarkRes = await ExamRepository.recordStudentMarks({
    componentId,
    enteredById: adminAccount.id,
    entries: [{
      studentId: studentA.studentId,
      enrolmentId: studentA.enrolmentId,
      marksObtained: -10,
      entryStatus: "ENTERED",
    }],
  });
  assert(!negativeMarkRes.success && negativeMarkRes.code === "VALIDATION_ERROR", "Negative marks (-10) strictly rejected");

  // 6b: Reject score exceeding maxMarks
  const exceededMarkRes = await ExamRepository.recordStudentMarks({
    componentId,
    enteredById: adminAccount.id,
    entries: [{
      studentId: studentA.studentId,
      enrolmentId: studentA.enrolmentId,
      marksObtained: 85, // max is 75
      entryStatus: "ENTERED",
    }],
  });
  assert(!exceededMarkRes.success && exceededMarkRes.code === "VALIDATION_ERROR", "Score exceeding max marks (85/75) strictly rejected");

  // 6c: Valid mark entry for candidate
  const validMarkRes = await ExamRepository.recordStudentMarks({
    componentId,
    enteredById: adminAccount.id,
    entries: [
      {
        studentId: studentA.studentId,
        enrolmentId: studentA.enrolmentId,
        marksObtained: 62.5,
        entryStatus: "ENTERED",
        remarks: "Good theory performance",
      },
    ],
  });
  assert(validMarkRes.success, "Valid mark (62.5 ENTERED) recorded in transaction");

  // 6d: Row-level security: Cross-faculty entry attempt
  const crossFacultyRes = await ExamRepository.recordStudentMarks({
    componentId,
    enteredById: adminAccount.id,
    isFacultyScoped: true,
    facultyStaffId: "unassigned-random-faculty-id",
    entries: [{
      studentId: studentA.studentId,
      enrolmentId: studentA.enrolmentId,
      marksObtained: 50,
      entryStatus: "ENTERED",
    }],
  });
  assert(!crossFacultyRes.success && crossFacultyRes.code === "CROSS_FACULTY_VIOLATION", "Cross-faculty marks entry rejected with CROSS_FACULTY_VIOLATION");

  // -------------------------------------------------------------
  // Test 7: Moderation with Mandatory Audit
  // -------------------------------------------------------------
  console.log("\n--- 7. Moderation & Auditability ---");
  const rosterAfterEntry = await ExamRepository.getExamRosterForComponent(componentId!);
  const entryA = rosterAfterEntry.data!.roster.find((r: any) => r.studentId === studentA.studentId);

  const modRes = await ExamRepository.moderateStudentMarks({
    entryId: entryA!.entryId!,
    moderatedMarks: 65.0,
    moderatedById: adminAccount.id,
    reason: "Subject Board moderation adjustment for question paper ambiguity",
  });
  assert(modRes.success, "Score moderated from 62.5 to 65.0 with justification");

  const auditRecord = await prisma.assessmentRevisionAudit.findFirst({
    where: { entryId: entryA!.entryId! },
  });
  assert(!!auditRecord, "AssessmentRevisionAudit record created");
  assert(auditRecord?.previousScore === 62.5 && auditRecord?.newScore === 65.0, "Audit record correctly tracked previous (62.5) and new (65.0) scores");

  // -------------------------------------------------------------
  // Test 8: Calculation Engine (10-Point CBCS SGPA)
  // -------------------------------------------------------------
  console.log("\n--- 8. Calculation Engine (CBCS SGPA) ---");
  const calcRes = await ExamRepository.calculateSessionResults(sessionId!, semester.id);
  assert(calcRes.success, `SGPA calculation ran successfully (${calcRes.data!.studentsCalculated} students evaluated)`);

  const calculatedA = calcRes.data!.summaries.find((s: any) => s.studentId === studentA.studentId);
  assert(Boolean(calculatedA && calculatedA.sgpa > 0), `Candidate A SGPA computed: ${calculatedA?.sgpa} (Grade: ${calculatedA?.letterGrade})`);
  assert(calculatedA?.resultStatus !== undefined, `Result status assigned: ${calculatedA?.resultStatus}`);

  // -------------------------------------------------------------
  // Test 9: CoE Publication Gatekeeper
  // -------------------------------------------------------------
  console.log("\n--- 9. CoE Publication Gatekeeper ---");
  // Pre-publication: Student query must return 0 results
  const prePubStudentRes = await ExamRepository.getStudentResultSummaries({
    examSessionId: sessionId!,
    studentId: studentA.studentId,
    isStudentViewer: true,
  });
  assert(prePubStudentRes.data?.length === 0, "Unpublished results are completely invisible to student role");

  // Publish session results
  const pubRes = await ExamRepository.publishSessionResults(sessionId!, semester.id, adminAccount.id);
  assert(pubRes.success, "Session results successfully published via CoE Gate");

  // Post-publication: Regular mark entry must now be LOCKED
  const lockedEntryRes = await ExamRepository.recordStudentMarks({
    componentId,
    enteredById: adminAccount.id,
    entries: [{
      studentId: studentA.studentId,
      enrolmentId: studentA.enrolmentId,
      marksObtained: 70,
      entryStatus: "ENTERED",
    }],
  });
  assert(!lockedEntryRes.success && lockedEntryRes.code === "SESSION_LOCKED", "Regular mark edits locked after publication (SESSION_LOCKED)");

  // Post-publication: Student query now returns grade card
  const postPubStudentRes = await ExamRepository.getStudentResultSummaries({
    examSessionId: sessionId!,
    studentId: studentA.studentId,
    isStudentViewer: true,
  });
  assert(postPubStudentRes.data?.length === 1, "Published grade card now visible to student viewer");
  assert(postPubStudentRes.data?.[0].approvalStatus === "PUBLISHED", "Result status is officially PUBLISHED");

  // -------------------------------------------------------------
  // Test 10: Post-Publication Audited Amendment
  // -------------------------------------------------------------
  console.log("\n--- 10. Post-Publication Audited Amendment ---");
  const amendRes = await ExamRepository.amendPublishedMark({
    entryId: entryA!.entryId!,
    newScore: 68.0,
    reason: "Statutory revaluation grievance approved by Board of Examinations",
    revisedById: adminAccount.id,
  });
  assert(amendRes.success, "Post-publication mark amended to 68.0 with mandatory BoE reason");

  const postAmendAudit = await prisma.assessmentRevisionAudit.findMany({
    where: { entryId: entryA!.entryId! },
    orderBy: { revisedAt: "desc" },
  });
  assert(postAmendAudit.length >= 2, `Multiple audit revisions captured (${postAmendAudit.length} total)`);
  assert(postAmendAudit[0].reason.includes("Statutory revaluation"), "Amendment audit reason persisted");

  // -------------------------------------------------------------
  // Test 11: Teardown & Database Invariance Verification
  // -------------------------------------------------------------
  console.log("\n--- 11. Teardown & Database Invariance Check ---");
  // Cascading cleanup of test session
  await prisma.subjectResultEntry.deleteMany({
    where: { resultSummary: { examSessionId: sessionId } },
  });
  await prisma.examResultSummary.deleteMany({
    where: { examSessionId: sessionId },
  });
  await prisma.assessmentRevisionAudit.deleteMany({
    where: { entry: { component: { examSessionId: sessionId } } },
  });
  await prisma.studentAssessmentEntry.deleteMany({
    where: { component: { examSessionId: sessionId } },
  });
  await prisma.assessmentComponent.deleteMany({
    where: { examSessionId: sessionId },
  });
  await prisma.examSession.delete({
    where: { id: sessionId },
  });

  const finalStudents = await prisma.student.count();
  const finalStaff = await prisma.staff.count();
  const finalProgrammes = await prisma.programme.count();
  const finalSemesters = await prisma.semester.count();
  const finalDivisions = await prisma.division.count();
  const finalEnrolments = await prisma.enrolment.count();
  const finalAssignments = await prisma.teachingAssignment.count();
  const finalAccounts = await prisma.userAccount.count();

  assert(finalStudents === baselineStudents, `Students count preserved: ${finalStudents} === ${baselineStudents}`);
  assert(finalStaff === baselineStaff, `Staff count preserved: ${finalStaff} === ${baselineStaff}`);
  assert(finalProgrammes === baselineProgrammes, `Programmes count preserved: ${finalProgrammes} === ${baselineProgrammes}`);
  assert(finalSemesters === baselineSemesters, `Semesters count preserved: ${finalSemesters} === ${baselineSemesters}`);
  assert(finalDivisions === baselineDivisions, `Divisions count preserved: ${finalDivisions} === ${baselineDivisions}`);
  assert(finalEnrolments === baselineEnrolments, `Enrolments count preserved: ${finalEnrolments} === ${baselineEnrolments}`);
  assert(finalAssignments === baselineAssignments, `Assignments count preserved: ${finalAssignments} === ${baselineAssignments}`);
  assert(finalAccounts === baselineAccounts, `Accounts count preserved: ${finalAccounts} === ${baselineAccounts}`);

  console.log("\n==================================================================");
  console.log(`TEST RESULTS: ${passed} PASSED, ${failed} FAILED`);
  console.log("==================================================================");

  if (failed > 0) {
    process.exit(1);
  }
}

runTestSuite()
  .catch((e) => {
    console.error("Test suite crashed:", e);
    process.exit(1);
  })
  .finally(() => prisma.$disconnect());
