/**
 * ============================================================================
 * CAMPUSOS ERP — MILESTONE 2A.4 STAGE 1: STUDENT PORTAL BOUNDARY TESTS
 * ============================================================================
 *
 * Automated verification of student self-service portal:
 * 1. Unauthenticated access enforcement (UNAUTHORIZED)
 * 2. Authorized student self-profile retrieval (Session-derived studentId)
 * 3. Client ID forgery immunity (Zero client-supplied student IDs)
 * 4. Unlinked student account handling (UNLINKED_STUDENT without unhandled errors)
 * 5. Student curriculum and academic placement retrieval
 * 6. Student document self-service listing
 * 7. Student document self-service upload (strictly session-bound)
 * 8. Student document self-service replacement (versioning and history retained)
 * 9. Cross-student document tampering denial (FORBIDDEN)
 * 10. Student verification prohibition (VERIFY_STUDENT_DOCUMENTS staff check)
 * 11. Download API route authorization boundaries (401 / 403 / 404)
 * 12. Document history preservation across student operations
 *
 * STRICT REQUIREMENT: Executed against prisma/isolated_test.db
 * Operational database (prisma/dev.db) is verified invariant before and after.
 */

import path from "path";
import fs from "fs";
import crypto from "crypto";
import { NextRequest } from "next/server";

const DEV_DB = path.resolve(process.cwd(), "prisma/dev.db");
const ISOLATED_DB = path.resolve(process.cwd(), "prisma/isolated_test.db");
const TEST_STORAGE_ROOT = path.resolve(process.cwd(), "storage/isolated_test_documents");

// Point environment strictly to isolated test database and isolated storage
process.env.DATABASE_URL = `file:${ISOLATED_DB}`;
process.env.STORAGE_ROOT = TEST_STORAGE_ROOT;
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
  console.log("CAMPUSOS ERP: MILESTONE 2A.4 STAGE 1 STUDENT PORTAL TESTS");
  console.log("=================================================================");

  // 1. Check baseline dev.db hash
  const initialDevBuf = fs.readFileSync(DEV_DB);
  const initialHash = crypto.createHash("sha256").update(initialDevBuf).digest("hex");
  console.log(`Baseline dev.db SHA-256: ${initialHash}`);

  // Dynamic imports after setting DATABASE_URL
  const { default: prisma } = await import("../src/lib/db");
  const { createSession, SESSION_COOKIE_NAME } = await import("../src/lib/auth/session");
  const { setTestSessionToken } = await import("../src/lib/auth/guards");
  const {
    getStudentSelfProfile,
    getStudentSelfCurriculum,
    getStudentSelfDocuments,
    uploadStudentSelfDocumentAction,
    replaceStudentSelfDocumentAction,
  } = await import("../src/lib/actions/portalStudent");
  const { verifyStudentDocumentAction } = await import("../src/lib/actions/studentDocuments");
  const { GET: downloadRouteHandler } = await import(
    "../src/app/api/students/[id]/documents/[docId]/download/route"
  );

  // =========================================================================
  // FIXTURE SETUP
  // =========================================================================
  setSuite("FIXTURE SETUP: Test Student Accounts in Isolated Database");

  if (!fs.existsSync(TEST_STORAGE_ROOT)) {
    fs.mkdirSync(TEST_STORAGE_ROOT, { recursive: true });
  }

  // Find or create test academic structures
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

  let programme = await prisma.programme.findFirst({ where: { code: "BA-CUL" } });
  if (!programme) {
    programme = await prisma.programme.create({
      data: {
        code: "BA-CUL",
        name: "B.A. in Culinary Arts",
        degreeLevel: "UNDERGRADUATE",
        durationYears: 3,
        departmentId: dept.id,
      },
    });
  }

  let semester = await prisma.semester.findFirst({
    where: { programmeId: programme.id, semesterNumber: 1 },
  });
  if (!semester) {
    semester = await prisma.semester.create({
      data: {
        programmeId: programme.id,
        semesterNumber: 1,
        termType: "ODD",
      },
    });
  }

  let division = await prisma.division.findFirst({
    where: { semesterId: semester.id, name: "Division A" },
  });
  if (!division) {
    division = await prisma.division.create({
      data: {
        semesterId: semester.id,
        name: "Division A",
        maxCapacity: 60,
      },
    });
  }

  // Ensure subject in semester 1
  let subject = await prisma.subject.findFirst({ where: { code: "CUL-101" } });
  if (!subject) {
    subject = await prisma.subject.create({
      data: {
        code: "CUL-101",
        title: "Introduction to Culinary Arts",
        credits: 4.0,
        subjectType: "THEORY",
        semesterId: semester.id,
      },
    });
  }

  // 1. Student A (Linked)
  let studentA = await prisma.student.findFirst({ where: { prn: "TEST-PORTAL-STU-A" } });
  if (!studentA) {
    studentA = await prisma.student.create({
      data: {
        prn: "TEST-PORTAL-STU-A",
        rollNumber: "ROLL-PORTAL-A",
        fullName: "Aarav Sharma (Student A)",
        email: "aarav.portal.a@rpihm.ac.in",
        phone: "9800000001",
        dob: new Date("2004-05-15"),
        status: "ACTIVE",
        currentSemester: 1,
        mentorFaculty: "Chef Instructor D. Deshmukh",
      },
    });
  }

  // Placement for Student A
  let enrolmentA = await prisma.enrolment.findFirst({
    where: { studentId: studentA.id, semesterId: semester.id },
  });
  if (!enrolmentA) {
    enrolmentA = await prisma.enrolment.create({
      data: {
        studentId: studentA.id,
        academicYearId: academicYear.id,
        programmeId: programme.id,
        semesterId: semester.id,
        divisionId: division.id,
        status: "ENROLLED",
      },
    });
  }

  // User Account A
  let userA = await prisma.userAccount.findUnique({ where: { email: "aarav.portal.a@rpihm.ac.in" } });
  if (!userA) {
    userA = await prisma.userAccount.create({
      data: {
        email: "aarav.portal.a@rpihm.ac.in",
        fullName: "Aarav Sharma",
        role: "STUDENT_VIEWER",
        studentId: studentA.id,
        passwordHash: "hash-a",
        salt: "salt-a",
        isActive: true,
      },
    });
  }

  const sessionA = await createSession(userA.id);

  // 2. Student B (Cross-Student Target)
  let studentB = await prisma.student.findFirst({ where: { prn: "TEST-PORTAL-STU-B" } });
  if (!studentB) {
    studentB = await prisma.student.create({
      data: {
        prn: "TEST-PORTAL-STU-B",
        rollNumber: "ROLL-PORTAL-B",
        fullName: "Bhavna Patel (Student B)",
        email: "bhavna.portal.b@rpihm.ac.in",
        phone: "9800000002",
        dob: new Date("2004-08-20"),
        status: "ACTIVE",
        currentSemester: 1,
      },
    });
  }

  let userB = await prisma.userAccount.findUnique({ where: { email: "bhavna.portal.b@rpihm.ac.in" } });
  if (!userB) {
    userB = await prisma.userAccount.create({
      data: {
        email: "bhavna.portal.b@rpihm.ac.in",
        fullName: "Bhavna Patel",
        role: "STUDENT_VIEWER",
        studentId: studentB.id,
        passwordHash: "hash-b",
        salt: "salt-b",
        isActive: true,
      },
    });
  }

  const sessionB = await createSession(userB.id);

  // 3. User C (Unlinked Student Account)
  let userC = await prisma.userAccount.findUnique({ where: { email: "unlinked.student@rpihm.ac.in" } });
  if (!userC) {
    userC = await prisma.userAccount.create({
      data: {
        email: "unlinked.student@rpihm.ac.in",
        fullName: "Unlinked Account",
        role: "STUDENT_VIEWER",
        studentId: null, // Deliberately unlinked
        passwordHash: "hash-c",
        salt: "salt-c",
        isActive: true,
      },
    });
  }

  const sessionC = await createSession(userC.id);

  // 4. User D (SYSTEM_ADMIN Account)
  let userSysAdmin = await prisma.userAccount.findUnique({ where: { email: "boundary.admin@rpihm.ac.in" } });
  if (!userSysAdmin) {
    userSysAdmin = await prisma.userAccount.create({
      data: {
        email: "boundary.admin@rpihm.ac.in",
        fullName: "Boundary System Admin",
        role: "SYSTEM_ADMIN",
        passwordHash: "hash-admin",
        salt: "salt-admin",
        isActive: true,
      },
    });
  }
  const sessionSysAdmin = await createSession(userSysAdmin.id);

  // 5. User E (ACADEMIC_ADMIN Account)
  let userAcadAdmin = await prisma.userAccount.findUnique({ where: { email: "boundary.acad@rpihm.ac.in" } });
  if (!userAcadAdmin) {
    userAcadAdmin = await prisma.userAccount.create({
      data: {
        email: "boundary.acad@rpihm.ac.in",
        fullName: "Boundary Academic Admin",
        role: "ACADEMIC_ADMIN",
        passwordHash: "hash-acad",
        salt: "salt-acad",
        isActive: true,
      },
    });
  }
  const sessionAcadAdmin = await createSession(userAcadAdmin.id);

  // Idempotent cleanup of previous test run documents for studentA and studentB
  const priorDocs = await prisma.studentDocument.findMany({
    where: { studentId: { in: [studentA.id, studentB.id] } },
    select: { id: true },
  });
  if (priorDocs.length > 0) {
    const priorIds = priorDocs.map((d) => d.id);
    await prisma.studentDocumentVerification.deleteMany({
      where: { documentId: { in: priorIds } },
    });
    await prisma.studentDocument.updateMany({
      where: { id: { in: priorIds } },
      data: { replacedDocumentId: null },
    });
    await prisma.studentDocument.deleteMany({
      where: { id: { in: priorIds } },
    });
  }

  assert(Boolean(userA.studentId), "User A is linked to Student A");
  assert(Boolean(userB.studentId), "User B is linked to Student B");
  assert(userC.studentId === null, "User C is intentionally unlinked");

  // =========================================================================
  // SCENARIO 1: Unauthenticated Portal Access
  // =========================================================================
  setSuite("SCENARIO 1: Unauthenticated Access Enforcement");

  setTestSessionToken(null);
  const unauthProfileRes = await getStudentSelfProfile();
  assert(
    !unauthProfileRes.success && unauthProfileRes.code === "UNAUTHORIZED",
    "getStudentSelfProfile returns UNAUTHORIZED when no session exists",
    { code: unauthProfileRes.code }
  );

  const unauthCurriculumRes = await getStudentSelfCurriculum();
  assert(
    !unauthCurriculumRes.success && unauthCurriculumRes.code === "UNAUTHORIZED",
    "getStudentSelfCurriculum returns UNAUTHORIZED when no session exists",
    { code: unauthCurriculumRes.code }
  );

  const unauthDocsRes = await getStudentSelfDocuments();
  assert(
    !unauthDocsRes.success && unauthDocsRes.code === "UNAUTHORIZED",
    "getStudentSelfDocuments returns UNAUTHORIZED when no session exists",
    { code: unauthDocsRes.code }
  );

  // =========================================================================
  // SCENARIO 2: Authorized Student Self-Profile Access
  // =========================================================================
  setSuite("SCENARIO 2: Authorized Student Self-Profile Retrieval");

  setTestSessionToken(sessionA.token);
  const authProfileRes = await getStudentSelfProfile();
  assert(authProfileRes.success, "getStudentSelfProfile succeeds for authenticated student");
  assert(
    authProfileRes.data?.student.id === studentA.id,
    "Profile strictly matches authenticated student A (session-derived ID)",
    { returnedId: authProfileRes.data?.student.id, expectedId: studentA.id }
  );
  assert(
    authProfileRes.data?.student.prn === "TEST-PORTAL-STU-A",
    "Profile correctly returns PRN for Student A"
  );
  assert(
    authProfileRes.data?.student.mentorFaculty === "Chef Instructor D. Deshmukh",
    "Profile accurately returns mentor faculty string"
  );
  assert(
    authProfileRes.data?.activePlacement?.divisionName === "Division A",
    "Profile accurately reflects active division placement"
  );

  // =========================================================================
  // SCENARIO 3: Client-Side Forgery Immunity
  // =========================================================================
  setSuite("SCENARIO 3: Client ID Forgery Immunity");

  // The function getStudentSelfProfile takes ZERO arguments from the caller.
  // Even if caller tries to pass an object, TypeScript / implementation ignores it.
  const forgedRes = await (getStudentSelfProfile as (fakeId?: string) => Promise<typeof authProfileRes>)(studentB.id);
  assert(
    forgedRes.success && forgedRes.data?.student.id === studentA.id,
    "Server action ignores client argument; identity remains strictly locked to session student A",
    { receivedId: forgedRes.data?.student.id, attemptedForgedId: studentB.id }
  );

  // =========================================================================
  // SCENARIO 4: Unlinked Student Account Handling
  // =========================================================================
  setSuite("SCENARIO 4: Unlinked Student Account Behaviour");

  setTestSessionToken(sessionC.token);
  const unlinkedProfileRes = await getStudentSelfProfile();
  assert(
    !unlinkedProfileRes.success && unlinkedProfileRes.code === "UNLINKED_STUDENT",
    "getStudentSelfProfile returns UNLINKED_STUDENT when user account lacks studentId",
    { code: unlinkedProfileRes.code, error: unlinkedProfileRes.error }
  );

  const unlinkedCurriculumRes = await getStudentSelfCurriculum();
  assert(
    !unlinkedCurriculumRes.success && unlinkedCurriculumRes.code === "UNLINKED_STUDENT",
    "getStudentSelfCurriculum returns UNLINKED_STUDENT without unhandled crash",
    { code: unlinkedCurriculumRes.code }
  );

  const unlinkedDocsRes = await getStudentSelfDocuments();
  assert(
    !unlinkedDocsRes.success && unlinkedDocsRes.code === "UNLINKED_STUDENT",
    "getStudentSelfDocuments returns UNLINKED_STUDENT without unhandled crash",
    { code: unlinkedDocsRes.code }
  );

  // =========================================================================
  // SCENARIO 4B: Administrative Role Access Denial (SYSTEM_ADMIN & ACADEMIC_ADMIN)
  // =========================================================================
  setSuite("SCENARIO 4B: Administrative Role Denial Enforcement");

  // 1. SYSTEM_ADMIN attempting student self-service calls
  setTestSessionToken(sessionSysAdmin.token);
  const adminProfileRes = await getStudentSelfProfile();
  assert(
    !adminProfileRes.success && adminProfileRes.code === "FORBIDDEN",
    "SYSTEM_ADMIN is strictly denied access to student self-service profile with FORBIDDEN",
    { code: adminProfileRes.code }
  );

  const adminCurriculumRes = await getStudentSelfCurriculum();
  assert(
    !adminCurriculumRes.success && adminCurriculumRes.code === "FORBIDDEN",
    "SYSTEM_ADMIN is strictly denied access to student self-service curriculum with FORBIDDEN",
    { code: adminCurriculumRes.code }
  );

  const adminDocsRes = await getStudentSelfDocuments();
  assert(
    !adminDocsRes.success && adminDocsRes.code === "FORBIDDEN",
    "SYSTEM_ADMIN is strictly denied access to student self-service documents with FORBIDDEN",
    { code: adminDocsRes.code }
  );

  // 2. ACADEMIC_ADMIN attempting student self-service calls
  setTestSessionToken(sessionAcadAdmin.token);
  const acadProfileRes = await getStudentSelfProfile();
  assert(
    !acadProfileRes.success && acadProfileRes.code === "FORBIDDEN",
    "ACADEMIC_ADMIN is strictly denied access to student self-service profile with FORBIDDEN",
    { code: acadProfileRes.code }
  );

  const acadCurriculumRes = await getStudentSelfCurriculum();
  assert(
    !acadCurriculumRes.success && acadCurriculumRes.code === "FORBIDDEN",
    "ACADEMIC_ADMIN is strictly denied access to student self-service curriculum with FORBIDDEN",
    { code: acadCurriculumRes.code }
  );

  const acadDocsRes = await getStudentSelfDocuments();
  assert(
    !acadDocsRes.success && acadDocsRes.code === "FORBIDDEN",
    "ACADEMIC_ADMIN is strictly denied access to student self-service documents with FORBIDDEN",
    { code: acadDocsRes.code }
  );

  // =========================================================================
  // SCENARIO 5: Student Curriculum & Enrolment History Access
  // =========================================================================
  setSuite("SCENARIO 5: Student Curriculum & Enrolment History Retrieval");

  setTestSessionToken(sessionA.token);
  const curriculumRes = await getStudentSelfCurriculum();
  assert(curriculumRes.success, "getStudentSelfCurriculum succeeds for Student A");
  assert(
    Array.isArray(curriculumRes.data?.activeSubjects) && curriculumRes.data.activeSubjects.length > 0,
    "Returns active subjects array containing prescribed curriculum",
    { subjectCount: curriculumRes.data?.activeSubjects.length }
  );
  assert(
    Boolean(curriculumRes.data?.activeSubjects.some((s) => s.code === "CUL-101" || s.code === "BACA101")),
    "Subject code matches active curriculum",
    { subjectCodes: curriculumRes.data?.activeSubjects.map((s) => s.code) }
  );
  assert(
    Array.isArray(curriculumRes.data?.enrolments) && curriculumRes.data.enrolments.length > 0,
    "Returns enrolment progression history",
    { enrolmentCount: curriculumRes.data?.enrolments.length }
  );

  // =========================================================================
  // SCENARIO 6: Student Document Self-Service Listing
  // =========================================================================
  setSuite("SCENARIO 6: Student Document Self-Service Listing");

  const selfDocsRes = await getStudentSelfDocuments();
  assert(selfDocsRes.success, "getStudentSelfDocuments succeeds for Student A");
  assert(
    Boolean(Array.isArray(selfDocsRes.data?.documents)),
    "Returns documents list array"
  );
  assert(
    Boolean(Array.isArray(selfDocsRes.data?.categoriesBreakdown)),
    "Returns technical category catalog breakdown without required percentage claims"
  );

  // =========================================================================
  // SCENARIO 7: Own Document Upload (Session Bound)
  // =========================================================================
  setSuite("SCENARIO 7: Own Document Upload via Session-Derived Action");

  const pdfBuffer = Buffer.from("%PDF-1.4 sample upload test buffer\n%%EOF");
  const uploadFormData = new FormData();
  uploadFormData.append("category", "IDENTITY_PROOF");
  uploadFormData.append("file", new File([pdfBuffer], "aadhar_aarav.pdf", { type: "application/pdf" }));

  // Client does NOT supply studentId, action derives it
  const uploadRes = await uploadStudentSelfDocumentAction(uploadFormData);
  assert(uploadRes.success, "uploadStudentSelfDocumentAction succeeds for Student A", {
    error: uploadRes.error,
  });
  assert(
    uploadRes.data?.studentId === studentA.id,
    "Uploaded document is strictly bound to session Student A",
    { docStudentId: uploadRes.data?.studentId, expectedStudentId: studentA.id }
  );
  assert(
    uploadRes.data?.version === 1,
    "Newly uploaded document starts at version v1"
  );
  assert(
    uploadRes.data?.status === "PENDING_VERIFICATION",
    "Newly uploaded document status defaults to PENDING_VERIFICATION"
  );

  const docIdA = uploadRes.data?.id;

  // =========================================================================
  // SCENARIO 8: Own Document Replacement & Version Preservation
  // =========================================================================
  setSuite("SCENARIO 8: Own Document Replacement & Versioning");

  const replacePdfBuffer = Buffer.from("%PDF-1.4 updated v2 replacement buffer\n%%EOF");
  const replaceFormData = new FormData();
  replaceFormData.append("documentId", docIdA!);
  replaceFormData.append("file", new File([replacePdfBuffer], "aadhar_aarav_v2.pdf", { type: "application/pdf" }));

  const replaceRes = await replaceStudentSelfDocumentAction(replaceFormData);
  assert(replaceRes.success, "replaceStudentSelfDocumentAction succeeds for Student A");
  assert(
    replaceRes.data?.version === 2,
    "Replacement document is created at version v2",
    { version: replaceRes.data?.version }
  );
  assert(
    replaceRes.data?.replacedDocumentId === docIdA,
    "Replacement document correctly points to predecessor document",
    { predecessorId: replaceRes.data?.replacedDocumentId }
  );

  // Check predecessor status in database
  const predecessorDoc = await prisma.studentDocument.findUnique({ where: { id: docIdA } });
  assert(
    predecessorDoc?.status === "SUPERSEDED",
    "Predecessor document is preserved with status SUPERSEDED",
    { status: predecessorDoc?.status }
  );

  // =========================================================================
  // SCENARIO 9: Cross-Student Document Tampering Denial
  // =========================================================================
  setSuite("SCENARIO 9: Cross-Student Document Tampering Denial");

  // Switch session to Student B
  setTestSessionToken(sessionB.token);

  // Student B attempts to replace Student A's document
  const crossReplaceFormData = new FormData();
  crossReplaceFormData.append("documentId", docIdA!);
  crossReplaceFormData.append(
    "file",
    new File([replacePdfBuffer], "hacked_doc.pdf", { type: "application/pdf" })
  );

  const crossReplaceRes = await replaceStudentSelfDocumentAction(crossReplaceFormData);
  assert(
    !crossReplaceRes.success && crossReplaceRes.code === "FORBIDDEN",
    "Student B attempting to replace Student A's document is denied with FORBIDDEN",
    { code: crossReplaceRes.code, error: crossReplaceRes.error }
  );

  // =========================================================================
  // SCENARIO 10: Student Document Verification Prohibition
  // =========================================================================
  setSuite("SCENARIO 10: Student Document Verification Prohibition");

  // Student B attempting to verify/approve Student A's document
  const verifyRes = await verifyStudentDocumentAction({
    documentId: docIdA!,
    decision: "VERIFIED",
    reason: "Student attempting unauthorized self-approval",
  });
  assert(
    !verifyRes.success && verifyRes.code === "FORBIDDEN",
    "STUDENT_VIEWER invoking verifyStudentDocumentAction is strictly denied with FORBIDDEN",
    { code: verifyRes.code, error: verifyRes.error }
  );

  // =========================================================================
  // SCENARIO 11: Binary Download Route Authorization Boundaries
  // =========================================================================
  setSuite("SCENARIO 11: Binary Streaming Download Route Boundaries");

  // 1. Unauthenticated download request -> HTTP 401
  const unauthReq = new NextRequest(
    `http://localhost:3000/api/students/${studentA.id}/documents/${docIdA}/download`
  );
  const unauthDlRes = await downloadRouteHandler(unauthReq, {
    params: Promise.resolve({ id: studentA.id, docId: docIdA! }),
  });
  assert(
    unauthDlRes.status === 401,
    "Download route handler returns HTTP 401 for unauthenticated requests",
    { status: unauthDlRes.status }
  );

  // 2. Cross-student download tampering -> HTTP 403
  // Student B tries to download Student A's document
  const crossReq = new NextRequest(
    `http://localhost:3000/api/students/${studentA.id}/documents/${docIdA}/download`,
    {
      headers: {
        cookie: `${SESSION_COOKIE_NAME}=${sessionB.token}`,
      },
    }
  );
  const crossDlRes = await downloadRouteHandler(crossReq, {
    params: Promise.resolve({ id: studentA.id, docId: docIdA! }),
  });
  assert(
    crossDlRes.status === 403,
    "Download route handler returns HTTP 403 for cross-student tampering attempts",
    { status: crossDlRes.status }
  );

  // 3. Authorized student self-download -> HTTP 200
  const authReq = new NextRequest(
    `http://localhost:3000/api/students/${studentA.id}/documents/${docIdA}/download`,
    {
      headers: {
        cookie: `${SESSION_COOKIE_NAME}=${sessionA.token}`,
      },
    }
  );
  const authDlRes = await downloadRouteHandler(authReq, {
    params: Promise.resolve({ id: studentA.id, docId: docIdA! }),
  });
  assert(
    authDlRes.status === 200 || authDlRes.status === 307,
    "Download route handler returns HTTP 200/307 for authorized student self-download",
    { status: authDlRes.status, contentType: authDlRes.headers.get("Content-Type") }
  );

  // =========================================================================
  // SCENARIO 12: Restrictive Deletion & Version History Preservation
  // =========================================================================
  setSuite("SCENARIO 12: Restrictive Deletion & History Preservation");

  // Attempting to delete student record with existing documents must be blocked by Prisma / SQLite foreign keys
  try {
    await prisma.student.delete({ where: { id: studentA.id } });
    assert(false, "Destructive student deletion with document history unexpectedly succeeded!");
  } catch (err: unknown) {
    const isRestrict = String(err).includes("Foreign key constraint") || String(err).includes("P2003");
    assert(
      isRestrict,
      "Student record deletion with document history is rejected by restrictive foreign keys (onDelete: Restrict)",
      { errorSnippet: String(err).slice(0, 100) }
    );
  }

  // =========================================================================
  // POST-FLIGHT DEV.DB INVARIANCE CHECK
  // =========================================================================
  setSuite("POST-FLIGHT: Operational Database (dev.db) Invariance");

  const postDevBuf = fs.readFileSync(DEV_DB);
  const postHash = crypto.createHash("sha256").update(postDevBuf).digest("hex");
  assert(
    postHash === initialHash,
    `Operational dev.db SHA-256 matches baseline perfectly (${postHash})`,
    { initialHash, postHash }
  );

  // Clean test token
  setTestSessionToken(null);

  // =========================================================================
  // FINAL REPORT
  // =========================================================================
  console.log("\n=================================================================");
  console.log(`TOTAL ASSERTIONS:  ${totalAssertions}`);
  console.log(`PASSED ASSERTIONS: ${passedAssertions}`);
  console.log(`FAILED ASSERTIONS: ${failedAssertions}`);
  console.log("=================================================================");

  if (failedAssertions > 0) {
    process.exit(1);
  } else {
    process.exit(0);
  }
}

main().catch((err) => {
  console.error("FATAL ERROR in test runner:", err);
  process.exit(1);
});
