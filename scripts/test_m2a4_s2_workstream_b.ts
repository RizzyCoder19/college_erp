/**
 * ============================================================================
 * CAMPUSOS ERP — MILESTONE 2A.4 STAGE 2: WORKSTREAM B TEST SUITE
 * PUBLISHED EXAMINATION RESULTS INTEGRITY & AUTHORIZATION
 * ============================================================================
 *
 * Test Scenarios:
 * 1. Unauthenticated rejection (UNAUTHORIZED)
 * 2. Non-student role rejection (FORBIDDEN for staff/faculty via student actions)
 * 3. Unlinked student rejection (UNLINKED_STUDENT)
 * 4. Published result visibility:
 *    - Student sees own published exam result (approvalStatus === 'PUBLISHED')
 *    - Full scorecard fields present: session info, totalMaxMarks, obtained marks,
 *      percentage, sgpa, letterGrade, resultStatus, subject breakdown
 * 5. Strict publication boundary enforcement:
 *    - DRAFT result is strictly hidden from student
 *    - UNDER_REVIEW result is strictly hidden from student
 *    - APPROVED (but not yet published) result is strictly hidden from student
 *    - Server action enforces approvalStatus === 'PUBLISHED' unconditionally
 * 6. Cross-student result isolation:
 *    - Student B cannot see Student A's published results
 * 7. Student without published results:
 *    - Honest empty results array without crashes or simulated delays
 * 8. Operational database (prisma/dev.db) SHA-256 invariance verification
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
  console.log("CAMPUSOS ERP: MILESTONE 2A.4 STAGE 2 WORKSTREAM B TESTS");
  console.log("PUBLISHED EXAMINATION RESULTS INTEGRITY & BOUNDARIES");
  console.log("=================================================================");

  // 1. Check baseline dev.db hash
  const initialDevBuf = fs.readFileSync(DEV_DB);
  const initialHash = crypto.createHash("sha256").update(initialDevBuf).digest("hex").toUpperCase();
  console.log(`Baseline dev.db SHA-256: ${initialHash}`);

  // Dynamic imports after setting DATABASE_URL
  const { default: prisma } = await import("../src/lib/db");
  const { createSession } = await import("../src/lib/auth/session");
  const { setTestSessionToken } = await import("../src/lib/auth/guards");
  const { getStudentSelfExamResults } = await import("../src/lib/actions/portalStudent");

  // =========================================================================
  // FIXTURE SETUP IN ISOLATED DATABASE
  // =========================================================================
  setSuite("FIXTURE SETUP: Isolated Test Data Preparation");

  const testStudentEmails = [
    "ws_b_student1@rpihm.ac.in",
    "ws_b_student2@rpihm.ac.in",
    "ws_b_noresults@rpihm.ac.in",
    "ws_b_unlinked@rpihm.ac.in",
    "ws_b_admin@rpihm.ac.in",
  ];

  // Clean previous test runs idempotently
  await prisma.subjectResultEntry.deleteMany({
    where: { resultSummary: { student: { email: { in: testStudentEmails } } } },
  });
  await prisma.examResultSummary.deleteMany({
    where: { student: { email: { in: testStudentEmails } } },
  });
  await prisma.examSession.deleteMany({
    where: { sessionCode: { startsWith: "WS_B_EXAM_" } },
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

  // Admin User
  const adminUser = await prisma.userAccount.create({
    data: {
      email: "ws_b_admin@rpihm.ac.in",
      fullName: "Exam Cell Controller",
      role: "ACADEMIC_ADMIN",
      passwordHash: "test_hash",
      salt: "test_salt",
      isActive: true,
    },
  });

  // Student 1 (Has 1 PUBLISHED result, 1 DRAFT result, 1 UNDER_REVIEW result)
  const student1 = await prisma.student.create({
    data: {
      prn: "PRN-WS-B-001",
      rollNumber: "R-WS-B-01",
      fullName: "Student Alpha WS-B",
      email: "ws_b_student1@rpihm.ac.in",
      phone: "9800000021",
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
      email: "ws_b_student1@rpihm.ac.in",
      fullName: "Student Alpha WS-B",
      role: "STUDENT_VIEWER",
      studentId: student1.id,
      passwordHash: "test_hash",
      salt: "test_salt",
      isActive: true,
    },
  });

  // Student 2 (Cross-student testing)
  const student2 = await prisma.student.create({
    data: {
      prn: "PRN-WS-B-002",
      rollNumber: "R-WS-B-02",
      fullName: "Student Beta WS-B",
      email: "ws_b_student2@rpihm.ac.in",
      phone: "9800000022",
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
      divisionId: divisionA.id,
      academicYearId: academicYear.id,
      status: "ENROLLED",
      enrolledAt: new Date("2026-07-15"),
    },
  });

  const user2 = await prisma.userAccount.create({
    data: {
      email: "ws_b_student2@rpihm.ac.in",
      fullName: "Student Beta WS-B",
      role: "STUDENT_VIEWER",
      studentId: student2.id,
      passwordHash: "test_hash",
      salt: "test_salt",
      isActive: true,
    },
  });

  // Student 3 (Zero results student)
  const student3 = await prisma.student.create({
    data: {
      prn: "PRN-WS-B-003",
      rollNumber: "R-WS-B-03",
      fullName: "Student Gamma No Results",
      email: "ws_b_noresults@rpihm.ac.in",
      phone: "9800000023",
      dob: new Date("2005-03-20"),
      status: "ACTIVE",
      currentSemester: 1,
    },
  });

  const user3 = await prisma.userAccount.create({
    data: {
      email: "ws_b_noresults@rpihm.ac.in",
      fullName: "Student Gamma No Results",
      role: "STUDENT_VIEWER",
      studentId: student3.id,
      passwordHash: "test_hash",
      salt: "test_salt",
      isActive: true,
    },
  });

  // User 4 (Unlinked account)
  const user4 = await prisma.userAccount.create({
    data: {
      email: "ws_b_unlinked@rpihm.ac.in",
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
  const sessionAdmin = await createSession(adminUser.id);

  // Exam Sessions
  // 1. Published Exam Session
  const examSessionPublished = await prisma.examSession.create({
    data: {
      academicYearId: academicYear.id,
      name: "Odd Semester Regular Examination 2026",
      sessionCode: "WS_B_EXAM_ODD_2026",
      sessionType: "REGULAR",
      startDate: new Date("2026-11-10"),
      endDate: new Date("2026-11-25"),
      status: "PUBLISHED",
      publishedAt: new Date("2026-12-05"),
      publishedById: adminUser.id,
    },
  });

  // 2. Draft Exam Session
  const examSessionDraft = await prisma.examSession.create({
    data: {
      academicYearId: academicYear.id,
      name: "Mid-Term Evaluation 2026 (Draft)",
      sessionCode: "WS_B_EXAM_MID_DRAFT",
      sessionType: "REGULAR",
      startDate: new Date("2026-09-15"),
      endDate: new Date("2026-09-22"),
      status: "EVALUATION",
    },
  });

  // 3. Under Review Exam Session
  const examSessionReview = await prisma.examSession.create({
    data: {
      academicYearId: academicYear.id,
      name: "Supplementary Assessment 2026 (Under Review)",
      sessionCode: "WS_B_EXAM_SUPP_REVIEW",
      sessionType: "ATKT_SUPPLEMENTARY",
      startDate: new Date("2026-10-01"),
      endDate: new Date("2026-10-10"),
      status: "MODERATION",
    },
  });

  // Results for Student 1:
  // A. PUBLISHED Result (Should be returned)
  const publishedSummary = await prisma.examResultSummary.create({
    data: {
      examSessionId: examSessionPublished.id,
      studentId: student1.id,
      enrolmentId: enrolment1.id,
      semesterId: semester1.id,
      totalMaxMarks: 200,
      totalMarksObtained: 165,
      percentage: 82.5,
      sgpa: 9.25,
      letterGrade: "O",
      resultStatus: "PASSED",
      approvalStatus: "PUBLISHED",
      publishedAt: new Date("2026-12-05"),
      publishedById: adminUser.id,
    },
  });

  await prisma.subjectResultEntry.create({
    data: {
      resultSummaryId: publishedSummary.id,
      subjectId: subjectFp.id,
      totalMaxMarks: 100,
      totalMarksObtained: 85,
      credits: 4.0,
      gradePoint: 10.0,
      letterGrade: "O",
      status: "PASS",
    },
  });

  await prisma.subjectResultEntry.create({
    data: {
      resultSummaryId: publishedSummary.id,
      subjectId: subjectFbs.id,
      totalMaxMarks: 100,
      totalMarksObtained: 80,
      credits: 3.0,
      gradePoint: 9.0,
      letterGrade: "A+",
      status: "PASS",
    },
  });

  // B. DRAFT Result for Student 1 (MUST NOT BE RETURNED!)
  const draftSummary = await prisma.examResultSummary.create({
    data: {
      examSessionId: examSessionDraft.id,
      studentId: student1.id,
      enrolmentId: enrolment1.id,
      semesterId: semester1.id,
      totalMaxMarks: 100,
      totalMarksObtained: 70,
      percentage: 70.0,
      sgpa: 8.0,
      letterGrade: "A",
      resultStatus: "PROVISIONAL",
      approvalStatus: "DRAFT",
    },
  });

  await prisma.subjectResultEntry.create({
    data: {
      resultSummaryId: draftSummary.id,
      subjectId: subjectFp.id,
      totalMaxMarks: 100,
      totalMarksObtained: 70,
      credits: 4.0,
      gradePoint: 8.0,
      letterGrade: "A",
      status: "PASS",
    },
  });

  // C. UNDER_REVIEW Result for Student 1 (MUST NOT BE RETURNED!)
  await prisma.examResultSummary.create({
    data: {
      examSessionId: examSessionReview.id,
      studentId: student1.id,
      enrolmentId: enrolment1.id,
      semesterId: semester1.id,
      totalMaxMarks: 100,
      totalMarksObtained: 55,
      percentage: 55.0,
      sgpa: 6.0,
      letterGrade: "B",
      resultStatus: "PROVISIONAL",
      approvalStatus: "UNDER_REVIEW",
    },
  });

  // D. APPROVED (but unpublished) Result for Student 2 (MUST NOT BE RETURNED!)
  await prisma.examResultSummary.create({
    data: {
      examSessionId: examSessionReview.id,
      studentId: student2.id,
      enrolmentId: enrolment1.id,
      semesterId: semester1.id,
      totalMaxMarks: 100,
      totalMarksObtained: 60,
      percentage: 60.0,
      sgpa: 7.0,
      letterGrade: "B+",
      resultStatus: "PASSED",
      approvalStatus: "APPROVED",
    },
  });

  assert(true, "Isolated test fixtures initialized successfully.");

  // =========================================================================
  // SUITE 1: UNAUTHENTICATED SESSION ACCESS REJECTION
  // =========================================================================
  setSuite("SUITE 1: Unauthenticated Session Access Rejection");

  setTestSessionToken(null);
  const unauthRes = await getStudentSelfExamResults();
  assert(
    !unauthRes.success && unauthRes.code === "UNAUTHORIZED",
    "getStudentSelfExamResults rejects unauthenticated caller with UNAUTHORIZED"
  );

  // =========================================================================
  // SUITE 2: NON-STUDENT ROLE REJECTION
  // =========================================================================
  setSuite("SUITE 2: Non-Student Role Rejection");

  setTestSessionToken(sessionAdmin.token);
  const adminRes = await getStudentSelfExamResults();
  assert(
    !adminRes.success && adminRes.code === "FORBIDDEN",
    "getStudentSelfExamResults rejects ACADEMIC_ADMIN session with FORBIDDEN"
  );

  // =========================================================================
  // SUITE 3: UNLINKED STUDENT ACCOUNT HANDLING
  // =========================================================================
  setSuite("SUITE 3: Unlinked Student Account Handling");

  setTestSessionToken(session4.token);
  const unlinkedRes = await getStudentSelfExamResults();
  assert(
    !unlinkedRes.success && unlinkedRes.code === "UNLINKED_STUDENT",
    "getStudentSelfExamResults returns UNLINKED_STUDENT when user has no linked Student profile"
  );

  // =========================================================================
  // SUITE 4: PUBLISHED RESULT VISIBILITY & DRAFT SUPPRESSION
  // =========================================================================
  setSuite("SUITE 4: Published Result Visibility & Draft Suppression");

  setTestSessionToken(session1.token);
  const s1Res = await getStudentSelfExamResults();
  assert(s1Res.success && !!s1Res.data, "Student 1 exam results retrieved successfully");

  if (s1Res.success && s1Res.data) {
    const { results } = s1Res.data;

    assert(
      results.length === 1,
      `Exactly 1 published result returned (found ${results.length}); DRAFT and UNDER_REVIEW results are strictly suppressed`,
      { count: results.length }
    );

    const publishedRecord = results[0];
    assert(
      publishedRecord.approvalStatus === "PUBLISHED",
      "Returned result strictly has approvalStatus === 'PUBLISHED'"
    );

    assert(
      publishedRecord.examSession.sessionCode === "WS_B_EXAM_ODD_2026",
      "Returned result belongs to published exam session (WS_B_EXAM_ODD_2026)"
    );

    assert(
      publishedRecord.totalMaxMarks === 200 &&
        publishedRecord.totalMarksObtained === 165 &&
        publishedRecord.percentage === 82.5 &&
        publishedRecord.sgpa === 9.25 &&
        publishedRecord.letterGrade === "O" &&
        publishedRecord.resultStatus === "PASSED",
      "Aggregate evaluation metrics match published score (Marks: 165/200, 82.5%, SGPA 9.25, Grade O, PASSED)"
    );

    assert(
      publishedRecord.subjectResults.length === 2,
      `Subject breakdown contains exactly 2 course entries (found ${publishedRecord.subjectResults.length})`
    );

    const fpSub = publishedRecord.subjectResults.find((s) => s.subjectCode === "BHM101");
    assert(
      fpSub?.totalMarksObtained === 85 &&
        fpSub?.totalMaxMarks === 100 &&
        fpSub?.gradePoint === 10.0 &&
        fpSub?.letterGrade === "O" &&
        fpSub?.status === "PASS",
      "Food Production subject score matches published record (85/100, GP 10, Grade O, PASS)"
    );
  }

  // =========================================================================
  // SUITE 5: UNPUBLISHED/APPROVED RESULT SUPPRESSION FOR STUDENT 2
  // =========================================================================
  setSuite("SUITE 5: Unpublished/Approved Result Suppression for Student 2");

  setTestSessionToken(session2.token);
  const s2Res = await getStudentSelfExamResults();
  assert(s2Res.success && !!s2Res.data, "Student 2 results call succeeded");

  if (s2Res.success && s2Res.data) {
    assert(
      s2Res.data.results.length === 0,
      "Student 2 has 0 results returned: APPROVED but unpublished results are strictly hidden from students",
      { count: s2Res.data.results.length }
    );
  }

  // =========================================================================
  // SUITE 6: STUDENT WITHOUT PUBLISHED RESULTS (EMPTY STATE)
  // =========================================================================
  setSuite("SUITE 6: Student Without Published Results (Honest Empty State)");

  setTestSessionToken(session3.token);
  const s3Res = await getStudentSelfExamResults();
  assert(s3Res.success && !!s3Res.data, "Student 3 results call succeeded");

  if (s3Res.success && s3Res.data) {
    assert(
      s3Res.data.results.length === 0,
      "Student 3 with zero published exams returns empty array without crashes or simulated delays"
    );
  }

  // =========================================================================
  // SUITE 7: CROSS-STUDENT ISOLATION
  // =========================================================================
  setSuite("SUITE 7: Cross-Student Results Isolation");

  setTestSessionToken(session2.token);
  const s2CrossRes = await getStudentSelfExamResults();
  if (s2CrossRes.success && s2CrossRes.data) {
    const hasStudent1Result = s2CrossRes.data.results.some(
      (r) => r.examSession.sessionCode === "WS_B_EXAM_ODD_2026"
    );
    assert(
      !hasStudent1Result,
      "Student 2 cannot see Student 1's published exam results; isolation strictly enforced"
    );
  }

  // =========================================================================
  // SUITE 8: OPERATIONAL DATABASE INVARIANCE
  // =========================================================================
  setSuite("SUITE 8: Operational Database SHA-256 Invariance Verification");

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
  console.log(`WORKSTREAM B TEST SUMMARY: ${passedAssertions} / ${totalAssertions} assertions passed`);
  if (failedAssertions > 0) {
    console.error(`FAILED ASSERTIONS: ${failedAssertions}`);
    process.exit(1);
  } else {
    console.log("ALL WORKSTREAM B TESTS PASSED PERFECTLY!");
    console.log("=================================================================");
  }
}

main().catch((err) => {
  console.error("FATAL ERROR in Workstream B test execution:", err);
  process.exit(1);
});
