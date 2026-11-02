/**
 * ============================================================================
 * CAMPUSOS ERP — MILESTONE 2A.3 BOUNDARY-LEVEL AUTHORIZATION & HARDENING SUITE
 * ============================================================================
 *
 * Verifies real boundary-level authorization across:
 * 1. Authenticated HTTP Download Route Handler (`/api/students/[id]/documents/[docId]/download`)
 * 2. Server Actions (`uploadStudentDocumentAction`, `verifyStudentDocumentAction`,
 *    `replaceStudentDocumentAction`, `getStudentDocumentsAction`)
 * 3. Restrictive Deletion Semantics (`StudentDocument.student -> Student` onDelete: Restrict)
 *
 * Tested strictly against isolated database: prisma/isolated_test.db
 * Operational database (prisma/dev.db) is verified invariant.
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
let currentSuite = "";

function setSuite(name: string) {
  currentSuite = name;
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
  console.log("CAMPUSOS ERP: MILESTONE 2A.3 BOUNDARY AUTHORIZATION TEST SUITE");
  console.log("=================================================================");

  // 1. Check baseline dev.db hash
  const initialDevBuf = fs.readFileSync(DEV_DB);
  const initialHash = crypto.createHash("sha256").update(initialDevBuf).digest("hex");
  console.log(`Baseline dev.db SHA-256: ${initialHash}`);

  // Dynamic imports after setting DATABASE_URL
  const { default: prisma } = await import("../src/lib/db");
  const { createSession, SESSION_COOKIE_NAME } = await import("../src/lib/auth/session");
  const { setTestSessionToken } = await import("../src/lib/auth/guards");
  const { StudentRepository } = await import("../src/lib/dal/studentRepository");
  const {
    uploadStudentDocumentAction,
    verifyStudentDocumentAction,
    replaceStudentDocumentAction,
    getStudentDocumentsAction,
  } = await import("../src/lib/actions/studentDocuments");
  const { GET: downloadRouteHandler } = await import(
    "../src/app/api/students/[id]/documents/[docId]/download/route"
  );

  // =========================================================================
  // SETUP TEST IDENTITIES & RECORDS IN ISOLATED DATABASE
  // =========================================================================
  setSuite("FIXTURE SETUP: Test Identities in Isolated Database");

  // Ensure clean storage root
  if (!fs.existsSync(TEST_STORAGE_ROOT)) {
    fs.mkdirSync(TEST_STORAGE_ROOT, { recursive: true });
  }

  // 1. Student A
  let studentA = await prisma.student.findFirst({ where: { prn: "TEST-AUTH-STU-A" } });
  if (!studentA) {
    studentA = await prisma.student.create({
      data: {
        prn: "TEST-AUTH-STU-A",
        rollNumber: "ROLL-AUTH-A",
        fullName: "Aarav Sharma (Student A)",
        email: "aarav.auth.a@rpihm.ac.in",
        phone: "9100000001",
        dob: new Date("2004-01-01"),
        currentSemester: 1,
        status: "ACTIVE",
      },
    });
  }

  // 2. Student B
  let studentB = await prisma.student.findFirst({ where: { prn: "TEST-AUTH-STU-B" } });
  if (!studentB) {
    studentB = await prisma.student.create({
      data: {
        prn: "TEST-AUTH-STU-B",
        rollNumber: "ROLL-AUTH-B",
        fullName: "Bhavna Patel (Student B)",
        email: "bhavna.auth.b@rpihm.ac.in",
        phone: "9100000002",
        dob: new Date("2004-02-02"),
        currentSemester: 1,
        status: "ACTIVE",
      },
    });
  }

  // 3. UserAccount for Student A (STUDENT_VIEWER)
  let studentAUser = await prisma.userAccount.findFirst({ where: { email: "aarav.auth.a@rpihm.ac.in" } });
  if (!studentAUser) {
    studentAUser = await prisma.userAccount.create({
      data: {
        email: "aarav.auth.a@rpihm.ac.in",
        passwordHash: "dummyhash",
        salt: "dummysalt",
        fullName: "Aarav Sharma",
        role: "STUDENT_VIEWER",
        studentId: studentA.id,
        isActive: true,
      },
    });
  }

  // 4. UserAccount for Student B (STUDENT_VIEWER)
  let studentBUser = await prisma.userAccount.findFirst({ where: { email: "bhavna.auth.b@rpihm.ac.in" } });
  if (!studentBUser) {
    studentBUser = await prisma.userAccount.create({
      data: {
        email: "bhavna.auth.b@rpihm.ac.in",
        passwordHash: "dummyhash",
        salt: "dummysalt",
        fullName: "Bhavna Patel",
        role: "STUDENT_VIEWER",
        studentId: studentB.id,
        isActive: true,
      },
    });
  }

  // 5. Faculty Member (FACULTY_MEMBER)
  let facultyUser = await prisma.userAccount.findFirst({ where: { email: "prof.mehta.auth@rpihm.ac.in" } });
  if (!facultyUser) {
    facultyUser = await prisma.userAccount.create({
      data: {
        email: "prof.mehta.auth@rpihm.ac.in",
        passwordHash: "dummyhash",
        salt: "dummysalt",
        fullName: "Prof. Rajesh Mehta",
        role: "FACULTY_MEMBER",
        isActive: true,
      },
    });
  }

  // 6. Authorized Staff Admin (SYSTEM_ADMIN)
  let adminUser = await prisma.userAccount.findFirst({ where: { role: "SYSTEM_ADMIN" } });
  if (!adminUser) {
    adminUser = await prisma.userAccount.create({
      data: {
        email: "admin.auth@rpihm.ac.in",
        passwordHash: "dummyhash",
        salt: "dummysalt",
        fullName: "System Admin",
        role: "SYSTEM_ADMIN",
        isActive: true,
      },
    });
  }

  // Generate real authenticated sessions
  const studentASession = await createSession(studentAUser.id, { userAgent: "BoundaryTest-StudentA" });
  const studentBSession = await createSession(studentBUser.id, { userAgent: "BoundaryTest-StudentB" });
  const facultySession = await createSession(facultyUser.id, { userAgent: "BoundaryTest-Faculty" });
  const adminSession = await createSession(adminUser.id, { userAgent: "BoundaryTest-Admin" });

  assert(Boolean(studentASession.token && studentBSession.token && facultySession.token && adminSession.token), "Authenticated session tokens created for all test personas");

  // Seed sample document for Student A
  const samplePdf = Buffer.from("%PDF-1.4\n%Boundary Auth Test Doc A\n%%EOF");
  const docARes = await StudentRepository.uploadStudentDocument({
    studentId: studentA.id,
    category: "IDENTITY_PROOF",
    buffer: samplePdf,
    originalFileName: "StudentA_Aadhaar.pdf",
    reportedMimeType: "application/pdf",
    uploadedByUserId: adminUser.id,
  });
  const docA = docARes.data!;
  assert(Boolean(docA && docA.id), "Document seeded for Student A", { docId: docA.id });

  // Seed sample document for Student B
  const docBRes = await StudentRepository.uploadStudentDocument({
    studentId: studentB.id,
    category: "IDENTITY_PROOF",
    buffer: samplePdf,
    originalFileName: "StudentB_Aadhaar.pdf",
    reportedMimeType: "application/pdf",
    uploadedByUserId: adminUser.id,
  });
  const docB = docBRes.data!;
  assert(Boolean(docB && docB.id), "Document seeded for Student B", { docId: docB.id });

  // Helper to make NextRequest to download route handler
  function makeDownloadReq(studentId: string, docId: string, token?: string): NextRequest {
    const url = `http://localhost:3000/api/students/${studentId}/documents/${docId}/download`;
    const headers: Record<string, string> = {};
    if (token) {
      headers["cookie"] = `${SESSION_COOKIE_NAME}=${token}`;
    }
    return new NextRequest(url, { headers });
  }

  // =========================================================================
  // SCENARIO 1: Unauthenticated download -> rejected (401)
  // =========================================================================
  setSuite("SCENARIO 1: Unauthenticated Download Protection");
  {
    const req = makeDownloadReq(studentA.id, docA.id); // No token
    const res = await downloadRouteHandler(req, {
      params: Promise.resolve({ id: studentA.id, docId: docA.id }),
    });
    assert(res.status === 401, "Unauthenticated download request rejected with HTTP 401 Unauthorized", { status: res.status });
  }

  // =========================================================================
  // SCENARIO 2: Student A downloading their own document -> allowed (200)
  // =========================================================================
  setSuite("SCENARIO 2: Student Self-Service Download (Authorized)");
  {
    const req = makeDownloadReq(studentA.id, docA.id, studentASession.token);
    const res = await downloadRouteHandler(req, {
      params: Promise.resolve({ id: studentA.id, docId: docA.id }),
    });
    assert(res.status === 200, "Student A downloading their own document succeeds with HTTP 200 OK", { status: res.status });
    assert(res.headers.get("Content-Type") === "application/pdf", "Downloaded file has correct Content-Type header");
    assert(res.headers.get("Content-Disposition")?.includes("StudentA_Aadhaar.pdf") ?? false, "Content-Disposition includes safe filename");
  }

  // =========================================================================
  // SCENARIO 3: Student A changing student ID in URL -> rejected (404/403)
  // =========================================================================
  setSuite("SCENARIO 3: Tampered Student ID in Download URL");
  {
    // Student A requests their docA, but passes studentB's studentId in URL path
    const req = makeDownloadReq(studentB.id, docA.id, studentASession.token);
    const res = await downloadRouteHandler(req, {
      params: Promise.resolve({ id: studentB.id, docId: docA.id }),
    });
    // Route checks: document.studentId !== requestedStudentId -> 404 (or studentId !== user.studentId -> 403)
    assert(res.status === 404 || res.status === 403, "Tampered student ID in URL rejected with HTTP 404/403", { status: res.status });
  }

  // =========================================================================
  // SCENARIO 4: Student A changing document ID to Student B's document -> rejected (403/404)
  // =========================================================================
  setSuite("SCENARIO 4: Cross-Student IDOR Download Attempt");
  {
    // Student A attempts to download docB belonging to Student B
    const req = makeDownloadReq(studentB.id, docB.id, studentASession.token);
    const res = await downloadRouteHandler(req, {
      params: Promise.resolve({ id: studentB.id, docId: docB.id }),
    });
    assert(res.status === 403, "Student A attempting to download Student B document rejected with HTTP 403 Forbidden", { status: res.status });
    const json = await res.json();
    assert(json.error?.includes("Access denied") ?? false, "Rejection error explicitly cites cross-student access denial");
  }

  // =========================================================================
  // SCENARIO 5: Student A attempting to upload for Student B -> rejected (403)
  // =========================================================================
  setSuite("SCENARIO 5: Cross-Student Upload Tampering");
  {
    setTestSessionToken(studentASession.token);
    const formData = new FormData();
    formData.append("studentId", studentB.id); // Targeted student is Student B
    formData.append("category", "IDENTITY_PROOF");
    formData.append("file", new File([samplePdf], "Hacked_Doc.pdf", { type: "application/pdf" }));

    const res = await uploadStudentDocumentAction(formData);
    assert(!res.success && res.code === "FORBIDDEN", "Student A attempting to upload document for Student B rejected with FORBIDDEN", { res });
    assert(res.error?.includes("Access denied. You may only upload documents for your own student record.") ?? false, "Error message confirms self-student record confinement");
  }

  // =========================================================================
  // SCENARIO 6: Student attempting verification -> rejected (403)
  // =========================================================================
  setSuite("SCENARIO 6: Student Verification Escalation Attempt");
  {
    setTestSessionToken(studentASession.token);
    const res = await verifyStudentDocumentAction({
      documentId: docA.id,
      decision: "VERIFIED",
      reason: "Self-approving my own document",
    });
    assert(!res.success && res.code === "FORBIDDEN", "Student attempting to approve/verify document rejected with FORBIDDEN", { res });
    assert(res.error?.includes("VERIFY_STUDENT_DOCUMENTS") ?? false, "Error message confirms missing VERIFY_STUDENT_DOCUMENTS privilege");
  }

  // =========================================================================
  // SCENARIO 7: Unauthorized faculty attempting verification -> rejected (403)
  // =========================================================================
  setSuite("SCENARIO 7: Faculty Unauthorized Verification Attempt");
  {
    setTestSessionToken(facultySession.token);
    const res = await verifyStudentDocumentAction({
      documentId: docA.id,
      decision: "VERIFIED",
      reason: "Faculty attempting verification without institutional role",
    });
    assert(!res.success && res.code === "FORBIDDEN", "Faculty attempting to verify student document rejected with FORBIDDEN", { res });
    assert(res.error?.includes("VERIFY_STUDENT_DOCUMENTS") ?? false, "Error confirms faculty lacks document verification permission");
  }

  // =========================================================================
  // SCENARIO 8: Authorized staff verification -> allowed
  // =========================================================================
  setSuite("SCENARIO 8: Authorized Staff Verification (Allowed)");
  {
    setTestSessionToken(adminSession.token);
    const res = await verifyStudentDocumentAction({
      documentId: docA.id,
      decision: "VERIFIED",
      reason: "Institutional verification approved by Administrator.",
    });
    assert(res.success && res.data?.status === "VERIFIED", "Authorized Administrator successfully verifies document", { status: res.data?.status });

    const updatedDoc = await prisma.studentDocument.findUnique({ where: { id: docA.id } });
    assert(updatedDoc?.status === "VERIFIED", "Document status updated to VERIFIED in database");
  }

  // =========================================================================
  // SCENARIO 9: Forged reviewer identity supplied by client -> ignored
  // =========================================================================
  setSuite("SCENARIO 9: Forged Reviewer Identity Parameter Ignored");
  {
    setTestSessionToken(adminSession.token);
    // Client maliciously passes a forged reviewerUserId in params
    const forgedParams: any = {
      documentId: docB.id,
      decision: "VERIFIED",
      reason: "UID match confirmed",
      reviewerUserId: "forged-attacker-user-id-9999",
    };

    const res = await verifyStudentDocumentAction(forgedParams);
    assert(res.success, "Verification action succeeds using authenticated session");

    // Inspect the actual recorded reviewer in the verification audit entry
    const verificationEntry = await prisma.studentDocumentVerification.findFirst({
      where: { documentId: docB.id, newStatus: "VERIFIED" },
      orderBy: { createdAt: "desc" },
    });

    assert(verificationEntry !== null, "Verification audit entry created");
    assert(
      verificationEntry?.reviewerUserId === adminUser.id,
      "Reviewer identity strictly taken from session (adminUser.id), forged client ID ignored",
      { actual: verificationEntry?.reviewerUserId, forgedAttempt: "forged-attacker-user-id-9999" }
    );
  }

  // =========================================================================
  // SCENARIO 10: Replacing another student's document -> rejected (403)
  // =========================================================================
  setSuite("SCENARIO 10: Cross-Student Document Replacement Blocked");
  {
    setTestSessionToken(studentASession.token);
    const formData = new FormData();
    formData.append("documentId", docB.id); // docB belongs to Student B!
    formData.append("file", new File([samplePdf], "Replacement_Attempt.pdf", { type: "application/pdf" }));

    const res = await replaceStudentDocumentAction(formData);
    assert(!res.success && res.code === "FORBIDDEN", "Student A attempting to replace Student B document rejected with FORBIDDEN", { res });
    assert(res.error?.includes("Access denied. You may only replace documents belonging to your student profile.") ?? false, "Error confirms profile ownership check");
  }

  // =========================================================================
  // SCENARIO 11: Faculty Blanket Document Access Defense (403)
  // =========================================================================
  setSuite("SCENARIO 11: Faculty Blanket Document Access Denied");
  {
    // Faculty requests student document download
    const req = makeDownloadReq(studentA.id, docA.id, facultySession.token);
    const res = await downloadRouteHandler(req, {
      params: Promise.resolve({ id: studentA.id, docId: docA.id }),
    });
    assert(res.status === 403, "Faculty denied download of student document with HTTP 403 Forbidden", { status: res.status });

    // Faculty requests student documents list
    setTestSessionToken(facultySession.token);
    const listRes = await getStudentDocumentsAction(studentA.id);
    assert(!listRes.success && listRes.code === "FORBIDDEN", "Faculty denied student documents list with FORBIDDEN", { listRes });
  }

  // =========================================================================
  // SCENARIO 12: Restrictive Deletion Semantics (onDelete: Restrict)
  // =========================================================================
  setSuite("SCENARIO 12: Restrictive Deletion Semantics (Student Deletion Blocked)");
  {
    let studentDeletionBlocked = false;
    let errorMessage = "";
    let errorCode = "";
    try {
      // Attempt to delete Student A, who has associated document records in StudentDocument
      await prisma.student.delete({ where: { id: studentA.id } });
    } catch (err: any) {
      studentDeletionBlocked = true;
      errorMessage = err.message || "";
      errorCode = err.code || "";
    }

    assert(studentDeletionBlocked, "Destructive deletion of student with documents blocked by restrictive foreign key", { errorMessage });
    assert(
      errorMessage.toLowerCase().includes("foreign key constraint") || errorCode === "P2003",
      "Prisma throws restrictive foreign key constraint failure (onDelete: Restrict)",
      { errorMessage, errorCode }
    );

    // Verify Student and Documents still exist in database
    const studentCheck = await prisma.student.findUnique({ where: { id: studentA.id } });
    const docCheck = await prisma.studentDocument.findUnique({ where: { id: docA.id } });
    assert(studentCheck !== null, "Student A record preserved intact in database");
    assert(docCheck !== null, "Student A document records preserved intact in database");
  }

  // Clean up session token override
  setTestSessionToken(null);

  // Clean up test records in isolated database
  // Need to set replacedDocumentId null before deleting documents due to onDelete: Restrict
  await prisma.studentDocument.updateMany({
    where: { studentId: { in: [studentA.id, studentB.id] } },
    data: { replacedDocumentId: null },
  });
  await prisma.studentDocumentVerification.deleteMany({
    where: { document: { studentId: { in: [studentA.id, studentB.id] } } },
  });
  await prisma.studentDocument.deleteMany({
    where: { studentId: { in: [studentA.id, studentB.id] } },
  });
  await prisma.session.deleteMany({
    where: { userId: { in: [studentAUser.id, studentBUser.id, facultyUser.id] } },
  });
  await prisma.userAccount.deleteMany({
    where: { id: { in: [studentAUser.id, studentBUser.id, facultyUser.id] } },
  });
  await prisma.student.deleteMany({
    where: { id: { in: [studentA.id, studentB.id] } },
  });

  // Verify post-run dev.db hash invariance
  const finalDevBuf = fs.readFileSync(DEV_DB);
  const finalHash = crypto.createHash("sha256").update(finalDevBuf).digest("hex");
  console.log(`\nPost-Run dev.db SHA-256: ${finalHash}`);
  assert(initialHash === finalHash, "Operational database (dev.db) remained completely invariant throughout boundary test suite");

  console.log("\n=================================================================");
  console.log(`BOUNDARY SUITE RESULTS: ${passedAssertions}/${totalAssertions} Passed (${failedAssertions} Failed)`);
  console.log("=================================================================");

  if (failedAssertions > 0) {
    process.exit(1);
  }
}

main().catch((err) => {
  console.error("Unhandled error in boundary test suite:", err);
  process.exit(1);
});
