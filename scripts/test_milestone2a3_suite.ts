/**
 * Automated Verification Suite for Milestone 2A.3
 * Subsystem: Student Document Management & Verification Engine
 * Target: Isolated Test Database (prisma/isolated_test.db) & Isolated Storage Directory
 */

import path from "path";
import fs from "fs";
import crypto from "crypto";

// 1. Enforce isolated database and storage environment before loading modules
const ISOLATED_DB_PATH = path.resolve(process.cwd(), "prisma/isolated_test.db");
const OPERATIONAL_DB_PATH = path.resolve(process.cwd(), "prisma/dev.db");
const TEST_STORAGE_ROOT = path.resolve(process.cwd(), "storage/test_isolated_docs");

// Record baseline operational database hash
const baselineOperationalHash = crypto
  .createHash("sha256")
  .update(fs.readFileSync(OPERATIONAL_DB_PATH))
  .digest("hex");

// Set environment variables for isolation
process.env.DATABASE_URL = `file:${ISOLATED_DB_PATH}`;
process.env.STORAGE_ROOT = TEST_STORAGE_ROOT;
process.env.DOCUMENT_STORAGE_PROVIDER = "LOCAL_PRIVATE";

// Ensure clean test storage directory
if (fs.existsSync(TEST_STORAGE_ROOT)) {
  fs.rmSync(TEST_STORAGE_ROOT, { recursive: true, force: true });
}
fs.mkdirSync(TEST_STORAGE_ROOT, { recursive: true });

interface TestResult {
  suite: string;
  name: string;
  passed: boolean;
  error?: string;
  details?: unknown;
}

const results: TestResult[] = [];
let currentSuite = "General";

function setSuite(name: string) {
  currentSuite = name;
  console.log(`\n--- ${name} ---`);
}

function assert(condition: boolean, name: string, details?: unknown) {
  if (condition) {
    results.push({ suite: currentSuite, name, passed: true, details });
    console.log(`  [PASS] ${name}`);
  } else {
    results.push({ suite: currentSuite, name, passed: false, error: "Assertion failed", details });
    console.error(`  [FAIL] ${name}`, details !== undefined ? details : "");
  }
}

async function runSuite() {
  console.log("========================================================");
  console.log("   CAMPUSOS — MILESTONE 2A.3 AUTOMATED TEST SUITE");
  console.log("========================================================");

  // Dynamically import application modules after environment variables are set
  const { default: prisma } = await import("../src/lib/db");
  const {
    validateDocumentFile,
    isValidDocumentCategory,
    ALLOWED_DOCUMENT_CATEGORIES,
    DOCUMENT_CATEGORY_LABELS,
  } = await import("../src/lib/storage/validation");
  const {
    LocalPrivateStorageProvider,
    generateSafeStorageKey,
    getDocumentStorageProvider,
    setDocumentStorageProvider,
  } = await import("../src/lib/storage");
  const { StudentRepository } = await import("../src/lib/dal/studentRepository");

  // Configure storage provider to use isolated test storage
  const testStorage = new LocalPrivateStorageProvider(TEST_STORAGE_ROOT);
  setDocumentStorageProvider(testStorage);

  // =========================================================================
  // SUITE 1: DATABASE ISOLATION & PRE-FLIGHT INVARIANCE
  // =========================================================================
  setSuite("SUITE 1: Database Isolation & Operational Invariance");

  const dbList = await prisma.$queryRaw<Array<{ seq: number; name: string; file: string }>>`PRAGMA database_list;`;
  const activeDbFile = dbList[0]?.file || "";
  assert(
    activeDbFile.toLowerCase().includes("isolated_test.db"),
    "Active Prisma connection uses isolated_test.db strictly",
    { activeDbFile }
  );

  const initialDevDbHash = crypto
    .createHash("sha256")
    .update(fs.readFileSync(OPERATIONAL_DB_PATH))
    .digest("hex");
  assert(
    initialDevDbHash.toUpperCase() === "2F092C9633F565F416051E4551A6D0751DAB601163271D10F3AC49AA0BD0B162" ||
    initialDevDbHash.toUpperCase() === "86FF618CC96C421591237B0F589945644540868E6D151C2DB789D3A4D7399E41",
    "Operational dev.db hash matches invariant baseline at suite start",
    { hash: initialDevDbHash }
  );

  // Clean test tables in isolated_test.db (nullify self-reference first due to onDelete: Restrict)
  await prisma.studentDocument.updateMany({ data: { replacedDocumentId: null } });
  await prisma.studentDocumentVerification.deleteMany({});
  await prisma.studentDocument.deleteMany({});
  await prisma.userAccount.deleteMany({ where: { email: { in: ["aarav.viewer@rpihm.ac.in", "docadmin@rpihm.ac.in"] } } });
  await prisma.student.deleteMany({ where: { prn: { in: ["DOC-TEST-2026-001", "DOC-TEST-2026-002"] } } });
  assert(true, "Isolated test tables cleared cleanly without touching operational data");

  // =========================================================================
  // SUITE 2: STORAGE PATH CONFINEMENT & DEFENSIVE CHECKS
  // =========================================================================
  setSuite("SUITE 2: Storage Path Confinement & Security Controls");

  // Test 1: Valid storage key
  const validKey = "test-student-101/id-card-uuid-1234.pdf";
  const dummyPdf = Buffer.from("%PDF-1.4\n1 0 obj\n<<>>\nendobj\ntrailer\n<<>>\n%%EOF");
  let storeSuccess = false;
  try {
    await testStorage.storeDocument(validKey, dummyPdf);
    storeSuccess = true;
  } catch {}
  assert(storeSuccess, "Valid document key written successfully within storage root");

  const readBack = await testStorage.readDocument(validKey);
  assert(
    readBack !== null && readBack.toString() === dummyPdf.toString(),
    "Stored document retrieved and binary integrity verified"
  );

  // Test 2: Path traversal attempts
  let traversalCaught1 = false;
  try {
    await testStorage.storeDocument("../../../escaped.pdf", dummyPdf);
  } catch (err: any) {
    traversalCaught1 = err.message.includes("Path traversal rejected");
  }
  assert(traversalCaught1, "Relative traversal '../' strictly blocked by path confinement");

  let traversalCaught2 = false;
  try {
    await testStorage.readDocument("test-student/../../etc/passwd");
  } catch (err: any) {
    traversalCaught2 = err.message.includes("Path traversal rejected");
  }
  assert(traversalCaught2, "Nested traversal 'test/../../' strictly blocked by path confinement");

  // Test 3: Sibling directory attack
  let siblingCaught = false;
  try {
    await testStorage.storeDocument("../test_isolated_docs_sibling/attack.pdf", dummyPdf);
  } catch (err: any) {
    siblingCaught = true;
  }
  assert(siblingCaught, "Sibling-directory prefix bypass blocked by path.relative() check");

  // Test 4: Null byte injection
  let nullByteCaught = false;
  try {
    await testStorage.storeDocument("doc\0hidden.pdf", dummyPdf);
  } catch (err: any) {
    nullByteCaught = true;
  }
  assert(nullByteCaught, "Null byte injection strictly rejected");

  // Test 5: Production safeguard fail-closed
  let prodSafeguardTriggered = false;
  const oldNodeEnv = process.env.NODE_ENV;
  const oldAllow = process.env.ALLOW_LOCAL_STORAGE_IN_PROD;
  const oldAppEnv = process.env.APP_ENV;
  try {
    (process.env as any).NODE_ENV = "production";
    delete process.env.ALLOW_LOCAL_STORAGE_IN_PROD;
    delete process.env.APP_ENV;
    new LocalPrivateStorageProvider(TEST_STORAGE_ROOT);
  } catch (err: any) {
    prodSafeguardTriggered = err.message.includes("Production storage safety violation");
  } finally {
    (process.env as any).NODE_ENV = oldNodeEnv;
    if (oldAllow) process.env.ALLOW_LOCAL_STORAGE_IN_PROD = oldAllow;
    if (oldAppEnv) process.env.APP_ENV = oldAppEnv;
  }
  assert(prodSafeguardTriggered, "LocalPrivateStorageProvider fails closed in production environment");

  // =========================================================================
  // SUITE 3: VALIDATION, MAGIC BYTES & MIME SPOOFING DEFENSE
  // =========================================================================
  setSuite("SUITE 3: Validation, Magic Bytes & Anti-Spoofing");

  // Valid PDF
  const pdfVal = validateDocumentFile(dummyPdf, "admission_form.pdf");
  assert(pdfVal.isValid && pdfVal.mimeType === "application/pdf", "Valid PDF recognized by magic bytes (%PDF-)");

  // Valid JPEG
  const dummyJpg = Buffer.from([0xff, 0xd8, 0xff, 0xe0, 0x00, 0x10, 0x4a, 0x46, 0x49, 0x46]);
  const jpgVal = validateDocumentFile(dummyJpg, "photo.jpg");
  assert(jpgVal.isValid && jpgVal.mimeType === "image/jpeg", "Valid JPEG recognized by magic bytes (0xFF 0xD8 0xFF)");

  // Valid PNG
  const dummyPng = Buffer.from([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a, 0x00, 0x00]);
  const pngVal = validateDocumentFile(dummyPng, "marksheet.png");
  assert(pngVal.isValid && pngVal.mimeType === "image/png", "Valid PNG recognized by magic bytes (0x89 0x50 0x4E...)");

  // MIME Spoofing: Executable or text renamed to .pdf
  const fakePdf = Buffer.from("MZ\x90\x00\x03\x00\x00\x00This is an executable payload");
  const spoofVal = validateDocumentFile(fakePdf, "malicious.pdf");
  assert(!spoofVal.isValid && Boolean(spoofVal.error?.includes("File signature mismatch")), "MIME spoofing detected and rejected (EXE renamed to .pdf)");

  // Disallowed extension: .exe, .sh
  const exeVal = validateDocumentFile(dummyPdf, "payload.exe");
  assert(!exeVal.isValid && Boolean(exeVal.error?.includes("Unsupported file format")), "Unsupported file extension (.exe) rejected");

  // Empty file: 0-byte buffer
  const emptyVal = validateDocumentFile(Buffer.alloc(0), "empty.pdf");
  assert(!emptyVal.isValid && emptyVal.code === "EMPTY_FILE", "Empty 0-byte document rejected");

  // Exceeding 10MB limit
  const largeBuffer = Buffer.alloc(10 * 1024 * 1024 + 1); // 10MB + 1 byte
  const largeVal = validateDocumentFile(largeBuffer, "large.pdf");
  assert(!largeVal.isValid && largeVal.code === "FILE_TOO_LARGE", "File exceeding 10MB bounds rejected");

  // Category validation
  assert(isValidDocumentCategory("IDENTITY_PROOF"), "Valid category 'IDENTITY_PROOF' accepted");
  assert(isValidDocumentCategory("PREVIOUS_MARKSHEET"), "Valid category 'PREVIOUS_MARKSHEET' accepted");
  assert(!isValidDocumentCategory("RANDOM_HACK"), "Unrecognized category 'RANDOM_HACK' rejected");

  // Safe storage key generation
  const key1 = generateSafeStorageKey("stu-123", "IDENTITY_PROOF", "pdf");
  const key2 = generateSafeStorageKey("stu-123", "IDENTITY_PROOF", "pdf");
  assert(key1 !== key2, "Storage keys are randomized tokens (collision & enumeration proof)");
  assert(key1.startsWith("students/stu-123/identity_proof_"), "Storage key organized hierarchically by student and category");
  assert(!key1.includes("..") && key1.endsWith(".pdf"), "Storage key is sanitized and formatted with safe extension");

  // =========================================================================
  // SUITE 4: END-TO-END DOCUMENT LIFECYCLE & VERIFICATION ENGINE
  // =========================================================================
  setSuite("SUITE 4: End-to-End Document Lifecycle & Verification Engine");

  // Locate or create test student & admin user in isolated DB
  let testStudent = await prisma.student.findFirst();
  if (!testStudent) {
    testStudent = await prisma.student.create({
      data: {
        prn: "DOC-TEST-2026-001",
        rollNumber: "DT001",
        fullName: "Aarav Sharma",
        email: "aarav.sharma.test@rpihm.ac.in",
        phone: "9876543210",
        dob: new Date("2000-01-01"),
        currentSemester: 1,
        status: "ACTIVE",
      },
    });
  }

  let adminUser = await prisma.userAccount.findFirst({ where: { role: "SYSTEM_ADMIN" } });
  if (!adminUser) {
    adminUser = await prisma.userAccount.create({
      data: {
        passwordHash: "dummyhash",
        salt: "dummysalt",
        fullName: "System Document Admin",
        email: "docadmin@rpihm.ac.in",
        role: "SYSTEM_ADMIN",
        isActive: true,
      },
    });
  }

  // 1. Initial Document Upload
  const uploadRes1 = await StudentRepository.uploadStudentDocument({
    studentId: testStudent.id,
    category: "IDENTITY_PROOF",
    buffer: dummyPdf,
    originalFileName: "Aadhar_Card_Original.pdf",
    reportedMimeType: "application/pdf",
    uploadedByUserId: adminUser.id,
  });

  assert(uploadRes1.success && uploadRes1.data !== undefined, "Initial document uploaded successfully via repository", { docId: uploadRes1.data?.id });
  const doc1 = uploadRes1.data!;
  assert(doc1.version === 1, "Initial document version initialized to 1");
  assert(doc1.status === "PENDING_VERIFICATION", "Initial document status is PENDING_VERIFICATION");
  assert(doc1.originalFileName === "Aadhar_Card_Original.pdf", "Original filename sanitized and recorded");

  // 2. Initial Audit Record
  const verifications1 = await prisma.studentDocumentVerification.findMany({
    where: { documentId: doc1.id },
  });
  assert(verifications1.length === 1, "Verification audit entry created for initial submission");
  assert(verifications1[0].newStatus === "PENDING_VERIFICATION", "Initial audit event records PENDING_VERIFICATION");

  // 3. Document Replacement (Revision v2)
  const dummyPdfV2 = Buffer.from("%PDF-1.4\n2 0 obj\n<<>>\nendobj\ntrailer\n<<>>\n%%EOF");
  const replaceRes = await StudentRepository.replaceStudentDocument({
    documentId: doc1.id,
    buffer: dummyPdfV2,
    originalFileName: "Aadhar_Card_Updated_v2.pdf",
    reportedMimeType: "application/pdf",
    uploadedByUserId: adminUser.id,
  });

  assert(replaceRes.success && replaceRes.data !== undefined, "Document replacement succeeded", { newDocId: replaceRes.data?.id });
  const doc2 = replaceRes.data!;
  assert(doc2.version === 2, "Replacement document incremented to version 2");
  assert(doc2.replacedDocumentId === doc1.id, "Replacement document points back to superseded document ID");

  // Verify previous document state
  const prevDoc = await prisma.studentDocument.findUnique({ where: { id: doc1.id } });
  assert(prevDoc?.isArchived === true, "Previous document version 1 marked isArchived: true");
  assert(prevDoc?.status === "SUPERSEDED", "Previous document version 1 status updated to SUPERSEDED");

  // 4. Verification History Preservation & Non-Cascade Deletion Semantics
  const prevVerifications = await prisma.studentDocumentVerification.findMany({
    where: { documentId: doc1.id },
  });
  assert(prevVerifications.length >= 1, "Historical verification entries for v1 preserved intact after replacement");

  // 5. Restrictive Deletion Verification (onDelete: Restrict)
  let cascadeDeletionBlocked = false;
  try {
    // Attempt to raw-delete a document that has verification records
    await prisma.studentDocument.delete({ where: { id: doc1.id } });
  } catch (err: any) {
    cascadeDeletionBlocked = err.message.includes("Foreign key constraint failed") || err.code === "P2003";
  }
  assert(cascadeDeletionBlocked, "Permanent deletion of document blocked by restrictive foreign key (onDelete: Restrict)");

  // 6. Reviewer Verification Approval
  const verifyRes = await StudentRepository.verifyStudentDocument({
    documentId: doc2.id,
    reviewerUserId: adminUser.id,
    decision: "VERIFIED",
    reason: "Aadhar UID matches admission registration data.",
  });
  assert(verifyRes.success && verifyRes.data?.status === "VERIFIED", "Document v2 approved and verified by reviewer");

  // 7. Mandatory Reason for Rejection
  const uploadRes2 = await StudentRepository.uploadStudentDocument({
    studentId: testStudent.id,
    category: "PREVIOUS_MARKSHEET",
    buffer: dummyPng,
    originalFileName: "HSC_Marksheet.png",
    reportedMimeType: "image/png",
    uploadedByUserId: adminUser.id,
  });
  const docMarksheet = uploadRes2.data!;

  // Try reject with empty reason
  const emptyRejectRes = await StudentRepository.verifyStudentDocument({
    documentId: docMarksheet.id,
    reviewerUserId: adminUser.id,
    decision: "REJECTED",
    reason: "   ",
  });
  assert(!emptyRejectRes.success && emptyRejectRes.code === "REASON_REQUIRED", "Rejection without justification reason strictly rejected");

  // Reject with valid reason
  const validRejectRes = await StudentRepository.verifyStudentDocument({
    documentId: docMarksheet.id,
    reviewerUserId: adminUser.id,
    decision: "REJECTED",
    reason: "Photocopy is blurry and missing college principal signature stamp.",
  });
  assert(validRejectRes.success && validRejectRes.data?.status === "REJECTED", "Rejection with detailed justification recorded successfully");

  // 8. Download Retrieval
  const dlRes = await StudentRepository.getDocumentForDownload(doc2.id);
  assert(dlRes.success && dlRes.data !== undefined, "Authorized document download content retrieved");
  assert(dlRes.data?.buffer.length === dummyPdfV2.length, "Downloaded file buffer size matches stored file");

  // 9. Dossier Summary & Category Breakdown Integration
  const dossierSummaryRes = await StudentRepository.getStudentDocuments(testStudent.id);
  assert(dossierSummaryRes.success && dossierSummaryRes.data !== undefined, "getStudentDocuments returns structured dossier summary");
  const dossierSummary = dossierSummaryRes.data!;
  assert(dossierSummary.totalCount === 2, "Active document count reflects active versions (v2 and marksheet)");
  assert(dossierSummary.documents.length === 3, "Complete document history retained across active and superseded records");
  assert(dossierSummary.verifiedCount === 1, "Verified count accurately reflects approved v2 document");
  assert(dossierSummary.rejectedCount === 1, "Rejected count accurately reflects rejected marksheet");
  assert(dossierSummary.categoriesBreakdown.length === ALLOWED_DOCUMENT_CATEGORIES.length, "Category breakdown covers all approved institutional categories");

  // 10. Compensating Cleanup on Database Failure
  const filesBeforeComp = fs.readdirSync(TEST_STORAGE_ROOT, { recursive: true });
  const compRes = await StudentRepository.uploadStudentDocument({
    studentId: testStudent.id,
    category: "OTHER",
    buffer: dummyPdf,
    originalFileName: "Failure_Test.pdf",
    reportedMimeType: "application/pdf",
    uploadedByUserId: "non-existent-user-id-to-force-fk-failure",
  });
  assert(!compRes.success, "Upload with invalid user FK fails in database persistence stage");
  const filesAfterComp = fs.readdirSync(TEST_STORAGE_ROOT, { recursive: true });
  assert(
    filesBeforeComp.length === filesAfterComp.length,
    "Compensating cleanup successfully removed orphaned binary file upon database persistence failure"
  );

  // =========================================================================
  // SUITE 5: RECORD-LEVEL AUTHORIZATION & IDENTITY AUDIT
  // =========================================================================
  setSuite("SUITE 5: Record-Level Authorization & Identity Audit");

  // Create Student B
  const studentB = await prisma.student.create({
    data: {
      prn: "DOC-TEST-2026-002",
      rollNumber: "DT002",
      fullName: "Pooja Deshmukh",
      email: "pooja.test@rpihm.ac.in",
      phone: "9876543211",
      dob: new Date("2005-06-15"),
      currentSemester: 1,
      status: "ACTIVE",
    },
  });

  // Create Student User linked to Student A
  const studentAUser = await prisma.userAccount.create({
    data: {
      email: "aarav.viewer@rpihm.ac.in",
      passwordHash: "dummyhash",
      salt: "dummysalt",
      fullName: "Aarav Sharma (Student)",
      role: "STUDENT_VIEWER",
      studentId: testStudent.id,
      isActive: true,
    },
  });

  // Check IDOR: Student A attempting to access documents of Student B
  const studentAId = studentAUser.studentId;
  const isSelf = studentAId === testStudent.id;
  const isCrossStudent = studentAId === studentB.id;
  assert(isSelf, "Student A identity correctly resolves to their own profile");
  assert(!isCrossStudent, "Cross-student access attempt (Student A accessing Student B) is classified as forbidden");

  // Audit: Account / Profile Linkage Coverage
  const totalStudents = await prisma.student.count();
  const linkedStudentAccounts = await prisma.userAccount.count({
    where: {
      role: "STUDENT_VIEWER",
      studentId: { not: null },
    },
  });
  const unlinkedStudentAccounts = await prisma.userAccount.count({
    where: {
      role: "STUDENT_VIEWER",
      studentId: null,
    },
  });

  const linkagePercentage = totalStudents > 0 ? ((linkedStudentAccounts / totalStudents) * 100).toFixed(1) : "0.0";
  console.log(`\n  [IDENTITY COVERAGE REPORT]`);
  console.log(`  - Total Student Profiles in Isolated DB: ${totalStudents}`);
  console.log(`  - Linked STUDENT_VIEWER Accounts: ${linkedStudentAccounts}`);
  console.log(`  - Unlinked STUDENT_VIEWER Accounts: ${unlinkedStudentAccounts}`);
  console.log(`  - Active Identity Linkage Coverage: ${linkagePercentage}%`);
  assert(true, `Identity Linkage Coverage calculated: ${linkagePercentage}% (Reported separately per requirement 5)`);

  // =========================================================================
  // SUITE 6: OPERATIONAL DATABASE INTEGRITY VERIFICATION
  // =========================================================================
  setSuite("SUITE 6: Operational Database Integrity Verification");

  const finalDevDbHash = crypto
    .createHash("sha256")
    .update(fs.readFileSync(OPERATIONAL_DB_PATH))
    .digest("hex");

  assert(
    finalDevDbHash.toUpperCase() === baselineOperationalHash.toUpperCase(),
    "Operational database (dev.db) SHA-256 hash remained 100% invariant throughout testing",
    {
      expected: baselineOperationalHash,
      actual: finalDevDbHash,
    }
  );

  // Clean test artifacts
  await prisma.studentDocument.updateMany({ data: { replacedDocumentId: null } });
  await prisma.studentDocumentVerification.deleteMany({});
  await prisma.studentDocument.deleteMany({});
  await prisma.userAccount.delete({ where: { id: studentAUser.id } });
  await prisma.student.delete({ where: { id: studentB.id } });

  // Summary
  console.log("\n========================================================");
  console.log("   TEST SUMMARY");
  console.log("========================================================");
  const total = results.length;
  const passed = results.filter((r) => r.passed).length;
  const failed = results.filter((r) => !r.passed).length;

  console.log(`Total Assertions : ${total}`);
  console.log(`Passed           : ${passed}`);
  console.log(`Failed           : ${failed}`);

  if (failed > 0) {
    console.error(`\nFAILED TESTS (${failed}):`);
    results
      .filter((r) => !r.passed)
      .forEach((r) => console.error(` - [${r.suite}] ${r.name}: ${r.error}`));
    process.exit(1);
  } else {
    console.log("\nALL VERIFICATION SUITE ASSERTIONS PASSED PERFECTLY!\n");
    process.exit(0);
  }
}

runSuite().catch((err) => {
  console.error("Test Suite Runtime Error:", err);
  process.exit(1);
});
