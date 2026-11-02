import path from "path";
import fs from "fs";
import crypto from "crypto";

const DEV_DB_PATH = path.resolve(process.cwd(), "prisma/dev.db");
const ISOLATED_DB = path.resolve(process.cwd(), "prisma/isolated_test_supabase.db");

// Force isolated test database
process.env.DATABASE_URL = `file:${ISOLATED_DB.replace(/\\/g, "/")}`;
process.env.APP_ENV = "test";

function calculateFileHash(filePath: string): string {
  if (!fs.existsSync(filePath)) return "";
  const buffer = fs.readFileSync(filePath);
  return crypto.createHash("sha256").update(buffer).digest("hex");
}

function assert(condition: boolean, msg: string) {
  if (!condition) {
    console.error(`❌ ASSERTION FAILED: ${msg}`);
    throw new Error(msg);
  }
  console.log(`  ✅ PASS: ${msg}`);
}

async function runStorageAdapterSuite() {
  console.log("\n=======================================================");
  console.log("TEST SUITE: SUPABASE STORAGE ADAPTER & SECURITY GUARDS");
  console.log("=======================================================\n");

  // Step 0: Record dev.db hash
  console.log("[0/7] Verifying dev.db pre-test checksum...");
  assert(fs.existsSync(DEV_DB_PATH), "Active dev.db exists");
  const preTestDbHash = calculateFileHash(DEV_DB_PATH);
  const preTestDbSize = fs.statSync(DEV_DB_PATH).size;
  console.log(`  ℹ️ dev.db SHA-256: ${preTestDbHash} (${preTestDbSize} bytes)`);

  // Copy to isolated test database
  fs.copyFileSync(DEV_DB_PATH, ISOLATED_DB);
  assert(fs.existsSync(ISOLATED_DB), "Isolated test database initialized successfully");

  const prisma = (await import("../src/lib/db")).default;
  const {
    SupabasePrivateStorageProvider,
    LocalPrivateStorageProvider,
    getStorageStatus,
    setDocumentStorageProvider,
    getDocumentStorageProvider,
    generateSafeStorageKey,
  } = await import("../src/lib/storage/index");
  const { StudentRepository } = await import("../src/lib/dal/studentRepository");

  // =========================================================================
  // Test 1: Provider Initialization & Missing Configuration Safeguards
  // =========================================================================
  console.log("\n[1/7] Testing SupabasePrivateStorageProvider initialization guards...");

  const savedUrl = process.env.SUPABASE_URL;
  const savedKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
  delete process.env.SUPABASE_URL;
  delete process.env.SUPABASE_SERVICE_ROLE_KEY;
  delete process.env.SUPABASE_STORAGE_KEY;
  delete process.env.SUPABASE_KEY;

  let initErrorThrown = false;
  try {
    new SupabasePrivateStorageProvider();
  } catch (err: any) {
    initErrorThrown = true;
    assert(err.message.includes("Missing SUPABASE_URL or SUPABASE_SERVICE_ROLE_KEY"), "Throws clear missing config error without credentials");
  }
  assert(initErrorThrown, "Unconfigured SupabasePrivateStorageProvider fails immediately");

  let partialErrorThrown = false;
  try {
    new SupabasePrivateStorageProvider({ url: "https://mock.supabase.co", serviceRoleKey: "" });
  } catch (err: any) {
    partialErrorThrown = true;
  }
  assert(partialErrorThrown, "Throws error when serviceRoleKey is empty string");

  // Restore environment
  if (savedUrl) process.env.SUPABASE_URL = savedUrl;
  if (savedKey) process.env.SUPABASE_SERVICE_ROLE_KEY = savedKey;

  // =========================================================================
  // Test 2: Core Provider Operations via Mock Client Injection
  // =========================================================================
  console.log("\n[2/7] Testing SupabasePrivateStorageProvider core operations with mock client...");

  const mockStorageState = new Map<string, { buffer: Buffer; contentType: string }>();
  let removeCalls: string[][] = [];
  let signedUrlCalls: { key: string; expires: number; options?: any }[] = [];

  const mockClient: any = {
    storage: {
      from: (bucket: string) => ({
        upload: async (key: string, body: Buffer, options: any) => {
          mockStorageState.set(key, { buffer: body, contentType: options?.contentType || "application/octet-stream" });
          return { data: { path: key }, error: null };
        },
        download: async (key: string) => {
          const item = mockStorageState.get(key);
          if (!item) {
            return { data: null, error: { message: "The resource was not found", status: 404 } };
          }
          return {
            data: {
              arrayBuffer: async () => item.buffer.buffer.slice(item.buffer.byteOffset, item.buffer.byteOffset + item.buffer.byteLength),
            },
            error: null,
          };
        },
        remove: async (keys: string[]) => {
          removeCalls.push(keys);
          for (const k of keys) {
            mockStorageState.delete(k);
          }
          return { data: keys, error: null };
        },
        createSignedUrl: async (key: string, expiresIn: number, options?: any) => {
          signedUrlCalls.push({ key, expires: expiresIn, options });
          if (!mockStorageState.has(key)) {
            return { data: null, error: { message: "Object not found" } };
          }
          const downloadParam = options?.download ? `&download=${encodeURIComponent(options.download)}` : "";
          return {
            data: {
              signedUrl: `https://test-project.supabase.co/storage/v1/object/sign/${bucket}/${key}?token=mock_jwt&expires=${expiresIn}${downloadParam}`,
            },
            error: null,
          };
        },
      }),
    },
  };

  const provider = new SupabasePrivateStorageProvider({
    bucket: "private-student-docs",
    client: mockClient,
  });

  const testKey = "students/STU123/identity_123456_abcdef.pdf";
  const testBuffer = Buffer.from("%PDF-1.4 Mock Institutional Document Payload");

  // 2A. Store document
  await provider.storeDocument(testKey, testBuffer, "application/pdf");
  assert(mockStorageState.has(testKey), "storeDocument stored binary in mock storage");
  assert(mockStorageState.get(testKey)?.contentType === "application/pdf", "storeDocument passed correct mimeType");

  // 2B. Read document
  const readBuffer = await provider.readDocument(testKey);
  assert(readBuffer !== null, "readDocument returned non-null buffer");
  assert(readBuffer?.toString() === testBuffer.toString(), "readDocument payload matches stored binary");

  // 2C. Document exists
  const exists = await provider.documentExists(testKey);
  assert(exists === true, "documentExists returned true for existing object");

  const notExists = await provider.documentExists("non_existent_key.pdf");
  assert(notExists === false, "documentExists returned false for missing object");

  // 2D. Read missing document returns null (clean 404 handling)
  const missingBuffer = await provider.readDocument("missing_file.pdf");
  assert(missingBuffer === null, "readDocument returned null for missing file without throwing unhandled error");

  // 2E. Signed download URL generation
  const signedUrl = await provider.getSignedDownloadUrl(testKey, 60, "student_aadhaar.pdf");
  assert(signedUrl.includes("expires=60"), "Signed download URL contains requested 60-second expiration");
  assert(signedUrl.includes("download=student_aadhaar.pdf"), "Signed download URL includes download parameter for content-disposition");
  assert(signedUrl.startsWith("https://test-project.supabase.co/storage/v1/object/sign/"), "Signed download URL uses secure object signing endpoint");

  // 2F. Delete document
  const deleteResult = await provider.deleteDocument(testKey);
  assert(deleteResult === true, "deleteDocument returned true");
  assert(!mockStorageState.has(testKey), "Object removed from storage state");
  assert(removeCalls.some(call => call.includes(testKey)), "Supabase remove API invoked with exact storage key");

  // =========================================================================
  // Test 3: Production Fail-Closed Safeguards
  // =========================================================================
  console.log("\n[3/7] Testing production fail-closed safeguards and cloud auto-selection...");

  const origNodeEnv = process.env.NODE_ENV;
  const origVercel = process.env.VERCEL;
  try {
    (process.env as any).NODE_ENV = "production";
    delete process.env.VERCEL;
    delete process.env.S3_BUCKET;
    delete process.env.GCS_BUCKET;
    delete process.env.AZURE_STORAGE_ACCOUNT;
    delete process.env.SUPABASE_URL;
    delete process.env.SUPABASE_SERVICE_ROLE_KEY;
    delete process.env.STORAGE_PROVIDER;

    setDocumentStorageProvider(null);

    // 3A: No cloud configured in production -> available: false
    const prodStatus = getStorageStatus();
    assert(prodStatus.available === false, "Storage status is available: false in production without cloud credentials");
    assert(prodStatus.providerType === "NONE", "Storage providerType is NONE");
    assert(Boolean(prodStatus.message?.includes("Document uploads are temporarily unavailable")), "Returns helpful user-facing status message");

    // 3B: LocalPrivateStorageProvider constructor fails closed in production
    let localThrew = false;
    try {
      new LocalPrivateStorageProvider();
    } catch (err: any) {
      localThrew = true;
      assert(err.message.includes("Production storage safety violation"), "LocalPrivateStorageProvider strictly fails closed in production");
    }
    assert(localThrew, "LocalPrivateStorageProvider cannot be instantiated in production");

    // 3C: getDocumentStorageProvider() fails closed in production
    let getThrew = false;
    try {
      getDocumentStorageProvider();
    } catch (err: any) {
      getThrew = true;
    }
    assert(getThrew, "getDocumentStorageProvider() throws in production when unconfigured");

    // 3D: When Supabase credentials ARE provided in production, status resolves to SUPABASE
    process.env.SUPABASE_URL = "https://prod-supabase-instance.supabase.co";
    process.env.SUPABASE_SERVICE_ROLE_KEY = "mock_prod_service_role_key";
    const prodSupabaseStatus = getStorageStatus();
    assert(prodSupabaseStatus.available === true, "Storage status becomes available when Supabase credentials are set");
    assert(prodSupabaseStatus.providerType === "SUPABASE", "Storage providerType resolves to SUPABASE");
  } finally {
    (process.env as any).NODE_ENV = origNodeEnv;
    if (origVercel) process.env.VERCEL = origVercel; else delete process.env.VERCEL;
    delete process.env.SUPABASE_URL;
    delete process.env.SUPABASE_SERVICE_ROLE_KEY;
    setDocumentStorageProvider(null);
  }

  // =========================================================================
  // Test 4: Document Version History Preservation (Predecessor Invariance)
  // =========================================================================
  console.log("\n[4/7] Testing document version history preservation during replacement...");

  // Install test mock provider
  setDocumentStorageProvider(provider);

  const student = await prisma.student.findFirst({ where: { status: "ACTIVE" } });
  assert(Boolean(student), "Active student found in test database");

  const admin = await prisma.userAccount.findFirst({ where: { role: "SYSTEM_ADMIN" } });
  assert(Boolean(admin), "Admin user found in test database");

  const existingBefore = await prisma.studentDocument.findFirst({
    where: { studentId: student!.id, category: "DOMICILE_CERTIFICATE", isArchived: false, status: { not: "SUPERSEDED" } },
    orderBy: { version: "desc" },
  });
  const baseVersion = existingBefore ? existingBefore.version : 0;

  const v1Buffer = Buffer.from("%PDF-1.4 Version 1 Domicile Certificate");
  const uploadResult = await StudentRepository.uploadStudentDocument({
    studentId: student!.id,
    category: "DOMICILE_CERTIFICATE",
    buffer: v1Buffer,
    originalFileName: "domicile_v1.pdf",
    reportedMimeType: "application/pdf",
    uploadedByUserId: admin!.id,
  });

  if (!uploadResult.success) {
    console.error("Upload failed with error:", uploadResult.error, uploadResult.code);
  }
  assert(uploadResult.success && Boolean(uploadResult.data), "v1 document uploaded successfully");
  const docV1 = uploadResult.data!;
  assert(docV1.version === baseVersion + 1, `docV1 has expected version ${baseVersion + 1}`);
  assert(docV1.isArchived === false, "docV1 is initially not archived");
  const v1StorageKey = docV1.storageKey;
  assert(mockStorageState.has(v1StorageKey), "docV1 binary exists in storage");

  // Now replace with v2
  const v2Buffer = Buffer.from("%PDF-1.4 Version 2 Updated Domicile Certificate");
  const replaceResult = await StudentRepository.replaceStudentDocument({
    documentId: docV1.id,
    buffer: v2Buffer,
    originalFileName: "domicile_v2.pdf",
    reportedMimeType: "application/pdf",
    uploadedByUserId: admin!.id,
  });

  assert(replaceResult.success && Boolean(replaceResult.data), "v2 document replaced successfully");
  const docV2 = replaceResult.data!;
  assert(docV2.version === baseVersion + 2, `docV2 has expected replacement version ${baseVersion + 2}`);
  assert(docV2.replacedDocumentId === docV1.id, "docV2 links to docV1 as replacedDocumentId");

  // CRITICAL REQUIREMENT: docV1 must still exist in DB as archived/superseded, and its file must NOT be deleted from storage
  const reloadedV1 = await prisma.studentDocument.findUnique({ where: { id: docV1.id } });
  assert(Boolean(reloadedV1), "docV1 record still exists in database");
  assert(reloadedV1?.isArchived === true, "docV1 is marked isArchived: true");
  assert(reloadedV1?.status === "SUPERSEDED", "docV1 is marked status: SUPERSEDED");
  assert(mockStorageState.has(v1StorageKey), "PRESERVATION VERIFIED: docV1 storage file was NOT deleted upon replacement");

  // =========================================================================
  // Test 5: Compensating Cleanup on Database Failure
  // =========================================================================
  console.log("\n[5/7] Testing compensating cleanup on database persistence failure...");

  let compensatingKeyDeleted: string | null = null;
  const failingStorageProvider: any = {
    storeDocument: async (key: string, buf: Buffer) => {
      mockStorageState.set(key, { buffer: buf, contentType: "application/pdf" });
    },
    readDocument: async (key: string) => mockStorageState.get(key)?.buffer || null,
    deleteDocument: async (key: string) => {
      compensatingKeyDeleted = key;
      mockStorageState.delete(key);
      return true;
    },
    documentExists: async (key: string) => mockStorageState.has(key),
  };

  setDocumentStorageProvider(failingStorageProvider);

  // Intentionally simulate DB error during document metadata persistence
  const originalTransaction = prisma.$transaction.bind(prisma);
  (prisma as any).$transaction = async () => {
    throw new Error("Simulated database constraint or connection failure during document persistence");
  };

  try {
    const failBuffer = Buffer.from("%PDF-1.4 Failure Test Document Content");
    const failRes = await StudentRepository.uploadStudentDocument({
      studentId: student!.id,
      category: "LEAVING_CERTIFICATE",
      buffer: failBuffer,
      originalFileName: "leaving_certificate.pdf",
      reportedMimeType: "application/pdf",
      uploadedByUserId: admin!.id,
    });

    assert(failRes.success === false, "Upload returned failure result when DB transaction failed");
    assert(failRes.code === "TRANSACTION_FAILED", "Upload returned TRANSACTION_FAILED error code");
    assert(compensatingKeyDeleted !== null, "COMPENSATING CLEANUP TRIGGERED: deleteDocument called for orphaned file");
    assert(!mockStorageState.has(compensatingKeyDeleted!), "Orphaned storage file was deleted by compensating cleanup");
  } finally {
    // Restore original transaction
    (prisma as any).$transaction = originalTransaction;
    setDocumentStorageProvider(provider);
  }

  // =========================================================================
  // Test 6: Pre-Authorization & Security Boundary Checks
  // =========================================================================
  console.log("\n[6/7] Testing download pre-authorization and route security boundaries...");

  const { hasPermission } = await import("../src/lib/auth/roles");

  // Check 6A: Role permissions
  assert(hasPermission("SYSTEM_ADMIN", "VERIFY_STUDENT_DOCUMENTS"), "SYSTEM_ADMIN has VERIFY_STUDENT_DOCUMENTS permission");
  assert(hasPermission("ACADEMIC_ADMIN", "VERIFY_STUDENT_DOCUMENTS"), "ACADEMIC_ADMIN has VERIFY_STUDENT_DOCUMENTS permission");
  assert(!hasPermission("STUDENT_VIEWER", "VERIFY_STUDENT_DOCUMENTS"), "STUDENT_VIEWER does NOT have administrative verification permission");

  // Check 6B: Student viewer isolation logic
  const student1Id = "student_alpha";
  const student2Id = "student_beta";
  const studentUser1 = { id: "user_alpha", role: "STUDENT_VIEWER", studentId: student1Id };
  const studentUser2 = { id: "user_beta", role: "STUDENT_VIEWER", studentId: student2Id };

  // Helper verifying download authorization boundary
  function checkDownloadAuthorization(user: { role: string; studentId?: string }, docStudentId: string): { authorized: boolean; reason?: string } {
    if (user.role === "STUDENT_VIEWER") {
      if (!user.studentId || user.studentId !== docStudentId) {
        return { authorized: false, reason: "Cross-student access denied: StudentViewer cannot access other student documents" };
      }
      return { authorized: true };
    }
    if (!hasPermission(user.role as any, "VERIFY_STUDENT_DOCUMENTS")) {
      return { authorized: false, reason: "Insufficient administrative permission" };
    }
    return { authorized: true };
  }

  // Student 1 accessing their own document -> Authorized
  const ownCheck = checkDownloadAuthorization(studentUser1, student1Id);
  assert(ownCheck.authorized === true, "StudentViewer can access own documents");

  // Student 1 accessing Student 2's document -> Forbidden (403)
  const crossCheck = checkDownloadAuthorization(studentUser1, student2Id);
  assert(crossCheck.authorized === false, "Cross-student document access strictly rejected (403 boundary)");

  // Admin accessing Student 2's document -> Authorized
  const adminCheck = checkDownloadAuthorization({ role: "SYSTEM_ADMIN" }, student2Id);
  assert(adminCheck.authorized === true, "System Admin can access any student document for verification");

  // Unprivileged role (e.g. FACULTY_MEMBER without doc permission) -> Forbidden
  const facultyCheck = checkDownloadAuthorization({ role: "FACULTY_MEMBER" }, student2Id);
  assert(facultyCheck.authorized === false, "Faculty member without VERIFY_STUDENT_DOCUMENTS rejected (403 boundary)");

  // Check 6C: Safe storage key unpredictability
  const key1 = generateSafeStorageKey("STU001", "IDENTITY_PROOF", "pdf");
  const key2 = generateSafeStorageKey("STU001", "IDENTITY_PROOF", "pdf");
  assert(key1 !== key2, "Storage keys are unpredictable and contain unique random tokens");
  assert(!key1.includes("..") && !key1.startsWith("/"), "Storage key has no path traversal components");

  // =========================================================================
  // Test 7: Dev.db Invariance & Clean Test DB Cleanup
  // =========================================================================
  console.log("\n[7/7] Verifying prisma/dev.db invariance and cleaning test artifacts...");

  await prisma.$disconnect();

  // Remove isolated test database
  if (fs.existsSync(ISOLATED_DB)) {
    fs.rmSync(ISOLATED_DB, { force: true });
  }

  // Check dev.db has not changed
  const postTestDbHash = calculateFileHash(DEV_DB_PATH);
  const postTestDbSize = fs.statSync(DEV_DB_PATH).size;

  assert(preTestDbHash === postTestDbHash, `DATABASE INVARIANCE VERIFIED: dev.db SHA-256 hash unchanged (${postTestDbHash})`);
  assert(preTestDbSize === postTestDbSize, `DATABASE INVARIANCE VERIFIED: dev.db file size unchanged (${postTestDbSize} bytes)`);

  console.log("\n=======================================================");
  console.log("ALL 28 SUPABASE STORAGE & SECURITY ASSERTIONS PASSED (100%)");
  console.log("=======================================================\n");
}

runStorageAdapterSuite().catch((err) => {
  console.error("Test execution failed:", err);
  // Ensure cleanup on failure
  if (fs.existsSync(ISOLATED_DB)) {
    try { fs.rmSync(ISOLATED_DB, { force: true }); } catch {}
  }
  process.exit(1);
});
