import path from "path";
import fs from "fs";
import crypto from "crypto";

const ISOLATED_DB = path.resolve(process.cwd(), "prisma/isolated_test.db").replace(/\\/g, "/");
process.env.DATABASE_URL = `file:${ISOLATED_DB}`;
process.env.APP_ENV = "test";

function assert(condition: boolean, msg: string) {
  if (!condition) {
    console.error(`❌ ASSERTION FAILED: ${msg}`);
    throw new Error(msg);
  }
  console.log(`  ✅ PASS: ${msg}`);
}

async function runTests() {
  console.log("\n=======================================================");
  console.log("TEST SUITE: STUDENT DOCUMENT STORAGE & MIGRATION VERIFICATION");
  console.log("=======================================================\n");

  // 1. Setup isolated database
  console.log("[1/5] Setting up isolated test database from prisma/dev.db...");
  fs.copyFileSync(
    path.resolve(process.cwd(), "prisma/dev.db"),
    path.resolve(process.cwd(), "prisma/isolated_test.db")
  );
  assert(fs.existsSync(path.resolve(process.cwd(), "prisma/isolated_test.db")), "Isolated test database initialized");

  const prisma = (await import("../src/lib/db")).default;
  const {
    LocalPrivateStorageProvider,
    getStorageStatus,
    setDocumentStorageProvider,
    getDocumentStorageProvider,
  } = await import("../src/lib/storage/index");
  const { StudentRepository } = await import("../src/lib/dal/studentRepository");
  const {
    uploadStudentDocumentAction,
    replaceStudentDocumentAction,
    getDocumentStorageStatusAction,
  } = await import("../src/lib/actions/studentDocuments");

  // 2. Verify Database Schema Contains StudentDocument tables
  console.log("\n[2/5] Verifying StudentDocument schema in active database...");
  const docCount = await prisma.studentDocument.count();
  const verifCount = await prisma.studentDocumentVerification.count();
  assert(docCount >= 0, `Prisma query to studentDocument succeeded (current count: ${docCount})`);
  assert(verifCount >= 0, `Prisma query to studentDocumentVerification succeeded (current count: ${verifCount})`);

  // 3. Local Development Upload, Retrieve, and Replace Verification
  console.log("\n[3/5] Verifying Document Upload & Replace in Local Development...");
  const TEST_STORAGE_ROOT = path.resolve(process.cwd(), "storage/test_isolated_documents");
  if (fs.existsSync(TEST_STORAGE_ROOT)) {
    fs.rmSync(TEST_STORAGE_ROOT, { recursive: true, force: true });
  }
  const testStorage = new LocalPrivateStorageProvider(TEST_STORAGE_ROOT);
  setDocumentStorageProvider(testStorage);

  // Fetch an existing active student and admin user
  const student = await prisma.student.findFirst({ where: { status: "ACTIVE" } });
  assert(Boolean(student), `Active student record found (${student?.fullName})`);

  const admin = await prisma.userAccount.findFirst({ where: { role: "SYSTEM_ADMIN" } });
  assert(Boolean(admin), `Admin user account found (${admin?.email})`);

  const testFileBuffer = Buffer.from("%PDF-1.4 Mock Admission Certificate Content for Testing");
  const uploadRes = await StudentRepository.uploadStudentDocument({
    studentId: student!.id,
    category: "PHOTOGRAPH",
    buffer: testFileBuffer,
    originalFileName: "passport_photo.pdf",
    reportedMimeType: "application/pdf",
    uploadedByUserId: admin!.id,
  });

  assert(uploadRes.success && Boolean(uploadRes.data), "Document uploaded successfully in local development");
  const uploadedDoc = uploadRes.data!;
  assert(uploadedDoc.version === 1, "Uploaded document has version 1");
  assert(uploadedDoc.category === "PHOTOGRAPH", "Uploaded document has category PHOTOGRAPH");
  assert(uploadedDoc.storageProvider === "LOCAL_PRIVATE", "Uploaded document storageProvider is LOCAL_PRIVATE");
  assert(uploadedDoc.status === "PENDING_VERIFICATION", "Uploaded document status is PENDING_VERIFICATION");

  // Check file on disk in storage
  const fileExists = await testStorage.documentExists(uploadedDoc.storageKey);
  assert(fileExists, `Binary file successfully stored at storageKey: ${uploadedDoc.storageKey}`);

  // Download / Read verification
  const downloadRes = await StudentRepository.getDocumentForDownload(uploadedDoc.id);
  assert(downloadRes.success && Boolean(downloadRes.data), "Document successfully retrieved for download");
  assert(downloadRes.data!.buffer.toString() === testFileBuffer.toString(), "Retrieved buffer matches uploaded binary bit-for-bit");

  // Replace Document Verification
  console.log("\n  Testing Document Replacement (v1 -> v2)...");
  const replacementBuffer = Buffer.from("%PDF-1.4 Updated Aadhaar Card Document");
  const replaceRes = await StudentRepository.replaceStudentDocument({
    documentId: uploadedDoc.id,
    buffer: replacementBuffer,
    originalFileName: "passport_photo_updated.pdf",
    reportedMimeType: "application/pdf",
    uploadedByUserId: admin!.id,
  });

  assert(replaceRes.success && Boolean(replaceRes.data), "Document replacement succeeded");
  const v2Doc = replaceRes.data!;
  assert(v2Doc.version === 2, "Replacement document has version 2");
  assert(v2Doc.replacedDocumentId === uploadedDoc.id, "v2 links to v1 via replacedDocumentId");

  const v1Reloaded = await prisma.studentDocument.findUnique({ where: { id: uploadedDoc.id } });
  assert(v1Reloaded?.isArchived === true, "v1 document is marked isArchived: true");
  assert(v1Reloaded?.status === "SUPERSEDED", "v1 document status updated to SUPERSEDED");

  // 4. Production Fail-Closed & Storage Safeguard Verification
  console.log("\n[4/5] Verifying Production Fail-Closed Safeguard & Graceful Block...");
  setDocumentStorageProvider(null); // Reset active provider to test auto-resolution

  const origNodeEnv = process.env.NODE_ENV;
  try {
    (process.env as any).NODE_ENV = "production";

    // 4A: Check storage status in production when no cloud storage is configured
    const prodStatus = getStorageStatus();
    assert(prodStatus.available === false, "Storage status reports available: false in production without cloud storage");
    assert(prodStatus.providerType === "NONE", "Storage providerType is NONE");
    assert(Boolean(prodStatus.message), `Clear descriptive message: "${prodStatus.message}"`);

    // 4B: LocalPrivateStorageProvider constructor fails closed
    let localThrew = false;
    let localErrMsg = "";
    try {
      new LocalPrivateStorageProvider(TEST_STORAGE_ROOT);
    } catch (err: any) {
      localThrew = true;
      localErrMsg = err.message;
    }
    assert(localThrew && localErrMsg.includes("Production storage safety violation"), "LocalPrivateStorageProvider constructor fails closed in production");

    // 4C: getDocumentStorageProvider() throws in production without cloud storage
    let providerThrew = false;
    try {
      getDocumentStorageProvider();
    } catch (err: any) {
      providerThrew = true;
    }
    assert(providerThrew, "getDocumentStorageProvider() throws in production when cloud storage is unconfigured (never falls back to ephemeral local storage)");

    // 4D: Server Action getDocumentStorageStatusAction reflects unavailable state
    const actionStatus = await getDocumentStorageStatusAction();
    assert(actionStatus.success === true && actionStatus.data?.available === false, "getDocumentStorageStatusAction reports storage unavailable to frontend UI");
    assert(Boolean(actionStatus.data?.message?.includes("Persistent cloud storage has not been configured")), "Action message accurately explains persistent cloud storage requirement");
  } finally {
    (process.env as any).NODE_ENV = origNodeEnv;
  }

  // 5. Cloud Storage Provider Configuration Detection
  console.log("\n[5/5] Verifying Cloud Storage Provider Configuration Detection...");
  const origS3Bucket = process.env.S3_BUCKET;
  const origS3Key = process.env.S3_ACCESS_KEY_ID;
  const origS3Secret = process.env.S3_SECRET_ACCESS_KEY;
  const origSupabaseUrl = process.env.SUPABASE_URL;
  const origSupabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

  try {
    (process.env as any).NODE_ENV = "production";

    // Test S3 configuration detection
    process.env.S3_BUCKET = "rpihm-docs-prod";
    process.env.S3_ACCESS_KEY_ID = "AKIA_TEST_KEY";
    process.env.S3_SECRET_ACCESS_KEY = "SECRET_KEY_TEST";
    const s3Status = getStorageStatus();
    assert(s3Status.available === true && s3Status.providerType === "S3", "S3 configuration detected and activated in production");

    // Clear S3, test Supabase configuration detection
    delete process.env.S3_BUCKET;
    delete process.env.S3_ACCESS_KEY_ID;
    delete process.env.S3_SECRET_ACCESS_KEY;

    process.env.SUPABASE_URL = "https://xyzcompany.supabase.co";
    process.env.SUPABASE_SERVICE_ROLE_KEY = "eyJhbGciOi...mock";
    const supabaseStatus = getStorageStatus();
    assert(supabaseStatus.available === true && supabaseStatus.providerType === "SUPABASE", "Supabase storage configuration detected and activated in production");
  } finally {
    (process.env as any).NODE_ENV = origNodeEnv;
    if (origS3Bucket) process.env.S3_BUCKET = origS3Bucket; else delete process.env.S3_BUCKET;
    if (origS3Key) process.env.S3_ACCESS_KEY_ID = origS3Key; else delete process.env.S3_ACCESS_KEY_ID;
    if (origS3Secret) process.env.S3_SECRET_ACCESS_KEY = origS3Secret; else delete process.env.S3_SECRET_ACCESS_KEY;
    if (origSupabaseUrl) process.env.SUPABASE_URL = origSupabaseUrl; else delete process.env.SUPABASE_URL;
    if (origSupabaseKey) process.env.SUPABASE_SERVICE_ROLE_KEY = origSupabaseKey; else delete process.env.SUPABASE_SERVICE_ROLE_KEY;
  }

  // Cleanup test storage directory
  if (fs.existsSync(TEST_STORAGE_ROOT)) {
    fs.rmSync(TEST_STORAGE_ROOT, { recursive: true, force: true });
  }

  console.log("\n=======================================================");
  console.log("ALL 16 STORAGE & MIGRATION ASSERTIONS PASSED (100%)");
  console.log("=======================================================\n");

  await prisma.$disconnect();
}

runTests().catch((err) => {
  console.error("Test failed:", err);
  process.exit(1);
});
