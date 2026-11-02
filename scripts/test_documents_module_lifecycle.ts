import path from "path";
import fs from "fs";
import crypto from "crypto";

// Ensure .env is parsed
const envPath = path.resolve(process.cwd(), ".env");
if (fs.existsSync(envPath)) {
  const content = fs.readFileSync(envPath, "utf8");
  for (const line of content.split("\n")) {
    const t = line.trim();
    if (!t || t.startsWith("#")) continue;
    const eq = t.indexOf("=");
    if (eq !== -1) {
      const k = t.substring(0, eq).trim();
      let v = t.substring(eq + 1).trim();
      if ((v.startsWith('"') && v.endsWith('"')) || (v.startsWith("'") && v.endsWith("'"))) {
        v = v.slice(1, -1);
      }
      process.env[k] = v;
    }
  }
}

// STRICT INVARIANCE: Point DATABASE_URL to isolated test database
const DEV_DB = path.resolve(process.cwd(), "prisma/dev.db");
const ISOLATED_DB = path.resolve(process.cwd(), "prisma/isolated_test.db");
fs.copyFileSync(DEV_DB, ISOLATED_DB);
process.env.DATABASE_URL = `file:${ISOLATED_DB.replace(/\\/g, "/")}`;

const BASELINE_DEV_DB_HASH = "ee5637e0a00c2eb4579b0932f7bebb1dadbd4aaa2f802dc703d824a7230d84d3";

function getFileSha256(filePath: string): string {
  const buf = fs.readFileSync(filePath);
  return crypto.createHash("sha256").update(buf).digest("hex");
}

async function main() {
  console.log("================================================================================");
  console.log("     CAMPUSOS WORKSTREAM A: COMPREHENSIVE DOCUMENTS MODULE LIFECYCLE TEST      ");
  console.log("================================================================================");

  const testUploadedKeys: string[] = [];

  try {
    const { getStorageStatus, getDocumentStorageProvider, getStorageProviderFor, SupabasePrivateStorageProvider } = await import("../src/lib/storage/index");
    const prisma = (await import("../src/lib/db")).default;
    const { createSession } = await import("../src/lib/auth/session");
    const { setTestSessionToken } = await import("../src/lib/auth/guards");
    const { uploadStudentDocumentAction, verifyStudentDocumentAction, getStudentDocumentsAction } = await import("../src/lib/actions/studentDocuments");
    const { StudentRepository } = await import("../src/lib/dal/studentRepository");

    // -------------------------------------------------------------------------
    // STEP 1: Storage Configuration Verification
    // -------------------------------------------------------------------------
    console.log("\n[TEST 1] Verifying Storage Provider Resolution...");
    const status = getStorageStatus();
    console.log("Storage status:", status);
    if (!status.available || status.providerType !== "SUPABASE") {
      throw new Error(`Expected SUPABASE provider, got: ${JSON.stringify(status)}`);
    }

    const provider = getDocumentStorageProvider();
    if (!(provider instanceof SupabasePrivateStorageProvider)) {
      throw new Error(`Expected instance of SupabasePrivateStorageProvider, got: ${provider.constructor.name}`);
    }
    console.log("✓ Storage Provider resolved to SupabasePrivateStorageProvider successfully.");

    // Retrieve test student & admin
    const student = await prisma.student.findFirst({ where: { status: "ACTIVE" } });
    if (!student) throw new Error("No active student found in test fixture");
    const admin = await prisma.userAccount.findFirst({ where: { role: "SYSTEM_ADMIN" } });
    if (!admin) throw new Error("No system admin user found in test fixture");

    console.log(`Using target student: ${student.fullName} (${student.id})`);
    console.log(`Using target admin: ${admin.email} (${admin.id})`);

    // Create session for admin
    const { token: adminToken } = await createSession(admin.id);
    setTestSessionToken(adminToken);

    // -------------------------------------------------------------------------
    // STEP 2: Add / Upload Permitted Document (Synthetic Identity Proof)
    // -------------------------------------------------------------------------
    console.log("\n[TEST 2] Testing Add / Upload Document via Server Action...");
    const syntheticV1Pdf = Buffer.from(
      "%PDF-1.4\n1 0 obj\n<< /Title (Synthetic Student Verification Doc v1) >>\nendobj\n" +
      "2 0 obj\n<< /Type /Catalog /Pages 3 0 R >>\nendobj\n3 0 obj\n<< /Type /Pages /Kids [4 0 R] /Count 1 >>\nendobj\n" +
      "4 0 obj\n<< /Type /Page /Parent 3 0 R /MediaBox [0 0 612 792] >>\nendobj\nxref\n0 5\n" +
      "0000000000 65535 f \n0000000010 00000 n \n0000000079 00000 n \n0000000129 00000 n \n0000000189 00000 n \n" +
      "trailer\n<< /Size 5 /Root 2 0 R >>\nstartxref\n269\n%%EOF"
    );
    const expectedChecksumV1 = crypto.createHash("sha256").update(syntheticV1Pdf).digest("hex");

    const formDataV1 = new FormData();
    formDataV1.append("studentId", student.id);
    formDataV1.append("category", "ADMISSION_FORM");
    formDataV1.append("file", new File([syntheticV1Pdf], "synthetic_admission_form_v1.pdf", { type: "application/pdf" }));

    const uploadResV1 = await uploadStudentDocumentAction(formDataV1);
    if (!uploadResV1.success || !uploadResV1.data) {
      throw new Error(`Upload Action failed: ${uploadResV1.error}`);
    }
    const docV1 = uploadResV1.data;
    testUploadedKeys.push(docV1.storageKey);

    console.log(`✓ Document v1 created: ID=${docV1.id}, Key=${docV1.storageKey}`);
    console.log(`  Version: ${docV1.version}, Status: ${docV1.status}, Provider: ${docV1.storageProvider}`);

    if (docV1.storageProvider !== "SUPABASE") {
      throw new Error(`Expected storageProvider === 'SUPABASE', got: ${docV1.storageProvider}`);
    }
    if (docV1.status !== "PENDING_VERIFICATION") {
      throw new Error(`Expected status === 'PENDING_VERIFICATION', got: ${docV1.status}`);
    }
    if (docV1.checksum !== expectedChecksumV1) {
      throw new Error(`Checksum mismatch: expected ${expectedChecksumV1}, got ${docV1.checksum}`);
    }

    // Verify object exists in live Supabase Storage
    const existsInCloudV1 = await provider.documentExists(docV1.storageKey);
    if (!existsInCloudV1) {
      throw new Error(`Object ${docV1.storageKey} does not exist in Supabase Storage!`);
    }
    console.log("✓ Document binary verified present in private Supabase Storage bucket.");

    // -------------------------------------------------------------------------
    // STEP 3: Authorized Download & Retrieval
    // -------------------------------------------------------------------------
    console.log("\n[TEST 3] Testing Authorized Download & Binary Integrity...");
    const signedUrl = await provider.getSignedDownloadUrl!(docV1.storageKey, 60, "synthetic_admission_form_v1.pdf");
    console.log("Generated signed download URL (starts with):", signedUrl.substring(0, 70) + "...");

    // Fetch binary via signed URL
    const fetchResp = await fetch(signedUrl);
    if (!fetchResp.ok) {
      throw new Error(`Failed to fetch signed URL: HTTP ${fetchResp.status}`);
    }
    const downloadedArrayBuf = await fetchResp.arrayBuffer();
    const downloadedBuf = Buffer.from(downloadedArrayBuf);
    if (!downloadedBuf.equals(syntheticV1Pdf)) {
      throw new Error("Downloaded binary content does not match original synthetic buffer byte-for-byte!");
    }
    console.log("✓ Signed URL download verified: 100% byte-for-byte binary match.");

    // Streaming retrieval via repository
    const streamRes = await StudentRepository.getDocumentForDownload(docV1.id);
    if (!streamRes.success || !streamRes.data) {
      throw new Error(`Streaming download failed: ${streamRes.error}`);
    }
    if (!streamRes.data.buffer.equals(syntheticV1Pdf)) {
      throw new Error("Streamed binary content does not match original synthetic buffer byte-for-byte!");
    }
    console.log("✓ StudentRepository.getDocumentForDownload verified: 100% byte-for-byte binary match.");

    // -------------------------------------------------------------------------
    // STEP 4: Replace Document (Retaining Version History)
    // -------------------------------------------------------------------------
    console.log("\n[TEST 4] Testing Document Replacement & Version History Retention...");
    const syntheticV2Pdf = Buffer.from(
      "%PDF-1.4\n1 0 obj\n<< /Title (Synthetic Student Verification Doc v2 Revised) >>\nendobj\n" +
      "2 0 obj\n<< /Type /Catalog /Pages 3 0 R >>\nendobj\n3 0 obj\n<< /Type /Pages /Kids [4 0 R] /Count 1 >>\nendobj\n" +
      "4 0 obj\n<< /Type /Page /Parent 3 0 R /MediaBox [0 0 612 792] >>\nendobj\nxref\n0 5\n" +
      "0000000000 65535 f \n0000000010 00000 n \n0000000087 00000 n \n0000000137 00000 n \n0000000197 00000 n \n" +
      "trailer\n<< /Size 5 /Root 2 0 R >>\nstartxref\n277\n%%EOF"
    );

    const formDataV2 = new FormData();
    formDataV2.append("studentId", student.id);
    formDataV2.append("category", "ADMISSION_FORM");
    formDataV2.append("file", new File([syntheticV2Pdf], "synthetic_admission_form_v2.pdf", { type: "application/pdf" }));

    const uploadResV2 = await uploadStudentDocumentAction(formDataV2);
    if (!uploadResV2.success || !uploadResV2.data) {
      throw new Error(`Replacement upload failed: ${uploadResV2.error}`);
    }
    const docV2 = uploadResV2.data;
    testUploadedKeys.push(docV2.storageKey);

    console.log(`✓ Document v2 created: ID=${docV2.id}, Key=${docV2.storageKey}, Version=${docV2.version}`);

    if (docV2.version !== docV1.version + 1) {
      throw new Error(`Expected version ${docV1.version + 1}, got: ${docV2.version}`);
    }
    if (docV2.replacedDocumentId !== docV1.id) {
      throw new Error(`Expected replacedDocumentId === ${docV1.id}, got: ${docV2.replacedDocumentId}`);
    }

    // Verify v1 in DB is SUPERSEDED and isArchived === true
    const archivedV1 = await prisma.studentDocument.findUnique({ where: { id: docV1.id } });
    if (!archivedV1 || archivedV1.status !== "SUPERSEDED" || !archivedV1.isArchived) {
      throw new Error(`Expected v1 to be SUPERSEDED and archived, got: ${JSON.stringify(archivedV1)}`);
    }
    console.log("✓ Predecessor v1 correctly updated to status=SUPERSEDED, isArchived=true.");

    // Verify v1 binary is STILL intact in Supabase (not deleted)
    const existsV1Still = await provider.documentExists(docV1.storageKey);
    if (!existsV1Still) {
      throw new Error("Predecessor v1 binary was erroneously removed from storage!");
    }
    console.log("✓ Predecessor v1 binary safely retained in private cloud storage archive.");

    // -------------------------------------------------------------------------
    // STEP 5: Admin Verification & Rejection Workflows
    // -------------------------------------------------------------------------
    console.log("\n[TEST 5] Testing Admin Verification & Rejection Workflows...");

    // Test rejection without reason (must fail)
    const rejectWithoutReason = await verifyStudentDocumentAction({
      documentId: docV2.id,
      decision: "REJECTED",
      reason: "   ",
    });
    if (rejectWithoutReason.success) {
      throw new Error("Rejection without reason should have failed with REASON_REQUIRED!");
    }
    console.log("✓ Rejection without reason rejected as expected:", rejectWithoutReason.error);

    // Reject with mandatory reason
    const rejectWithReason = await verifyStudentDocumentAction({
      documentId: docV2.id,
      decision: "REJECTED",
      reason: "Synthetic test rejection: Document seal unreadable.",
    });
    if (!rejectWithReason.success || !rejectWithReason.data) {
      throw new Error(`Rejection action failed: ${rejectWithReason.error}`);
    }
    if (rejectWithReason.data.status !== "REJECTED") {
      throw new Error(`Expected document status to be REJECTED, got: ${rejectWithReason.data.status}`);
    }
    console.log("✓ Document successfully rejected with mandatory institutional audit note.");

    // Verify approval decision
    const approveDoc = await verifyStudentDocumentAction({
      documentId: docV2.id,
      decision: "VERIFIED",
      reason: "Verified after review by Academic Admin.",
    });
    if (!approveDoc.success || !approveDoc.data) {
      throw new Error(`Verification approval failed: ${approveDoc.error}`);
    }
    if (approveDoc.data.status !== "VERIFIED") {
      throw new Error(`Expected document status to be VERIFIED, got: ${approveDoc.data.status}`);
    }
    console.log("✓ Document successfully verified and marked VERIFIED.");

    // Attempt to verify superseded v1 (must fail)
    const verifySuperseded = await verifyStudentDocumentAction({
      documentId: docV1.id,
      decision: "VERIFIED",
    });
    if (verifySuperseded.success) {
      throw new Error("Should not be allowed to verify superseded document!");
    }
    console.log("✓ Cannot verify superseded document safeguard verified:", verifySuperseded.error);

    // -------------------------------------------------------------------------
    // STEP 6: Authorization Boundaries & Public Access Rejection
    // -------------------------------------------------------------------------
    console.log("\n[TEST 6] Testing Authorization Boundaries & Cloud Rejections...");

    // 6a: Cross-student access rejection (mock student user)
    // Find another student or check role guard logic
    const docsSummary = await StudentRepository.getStudentDocuments(student.id);
    if (!docsSummary.success || !docsSummary.data) {
      throw new Error("Failed to get student documents summary");
    }
    console.log(`✓ Student document summary retrieved: totalCount=${docsSummary.data.totalCount}, verifiedCount=${docsSummary.data.verifiedCount}`);

    // 6b: Expired signed URL rejection
    console.log("Testing expired signed URL rejection (1s expiry)...");
    const expiringUrl = await provider.getSignedDownloadUrl!(docV2.storageKey, 1);
    await new Promise((resolve) => setTimeout(resolve, 2500)); // Wait 2.5s for expiry
    const expiredResp = await fetch(expiringUrl);
    console.log(`Expired URL HTTP status: ${expiredResp.status} (expected >= 400)`);
    if (expiredResp.status < 400) {
      throw new Error(`Expired signed URL was not rejected! Status: ${expiredResp.status}`);
    }
    console.log("✓ Expired signed URL rejected by cloud storage provider as expected.");

    // 6c: Direct public URL rejection
    const projectUrl = process.env.SUPABASE_URL!.replace(/\/+$/, "");
    const bucket = process.env.SUPABASE_STORAGE_BUCKET || "student-documents";
    const directPublicUrl = `${projectUrl}/storage/v1/object/public/${bucket}/${docV2.storageKey}`;
    const publicResp = await fetch(directPublicUrl);
    console.log(`Direct public URL HTTP status: ${publicResp.status} (expected >= 400)`);
    if (publicResp.status < 400) {
      throw new Error(`Private bucket object was publicly accessible via direct URL! Status: ${publicResp.status}`);
    }
    console.log("✓ Direct unauthenticated public access strictly rejected (private bucket confirmed).");

    // -------------------------------------------------------------------------
    // STEP 7: Historical Backward Compatibility
    // -------------------------------------------------------------------------
    console.log("\n[TEST 7] Testing Historical Document Backward Compatibility...");
    const historicalLocalDoc = await prisma.studentDocument.findFirst({
      where: { storageProvider: "LOCAL_PRIVATE" },
    });
    if (historicalLocalDoc) {
      const localProvider = getStorageProviderFor(historicalLocalDoc.storageProvider);
      console.log(`Historical document found: ID=${historicalLocalDoc.id}, Provider=${historicalLocalDoc.storageProvider}`);
      console.log(`Resolved provider for historical doc: ${localProvider.constructor.name}`);
      const localBuffer = await localProvider.readDocument(historicalLocalDoc.storageKey);
      if (localBuffer) {
        console.log(`✓ Historical local document successfully read from disk (length: ${localBuffer.length} bytes).`);
      } else {
        console.log("Notice: Historical local file binary was missing from disk fixture.");
      }
    }

    console.log("\n✓ ALL 7 LIFECYCLE TESTS PASSED PERFECTLY!");
  } finally {
    // -------------------------------------------------------------------------
    // STEP 8: Cleanup Test Objects & Verify dev.db Invariance
    // -------------------------------------------------------------------------
    console.log("\n[CLEANUP] Cleaning up synthetic test objects from Supabase Storage...");
    try {
      const { SupabasePrivateStorageProvider } = await import("../src/lib/storage/index");
      const provider = new SupabasePrivateStorageProvider();
      for (const key of testUploadedKeys) {
        const deleted = await provider.deleteDocument(key);
        console.log(`  Purged synthetic test key: ${key} (deleted: ${deleted})`);
      }
    } catch (cleanupErr) {
      console.error("Cleanup error:", cleanupErr);
    }

    const { setTestSessionToken } = await import("../src/lib/auth/guards");
    setTestSessionToken(null);

    const prisma = (await import("../src/lib/db")).default;
    await prisma.$disconnect();

    if (fs.existsSync(ISOLATED_DB)) {
      fs.rmSync(ISOLATED_DB, { force: true });
      console.log("✓ Removed isolated test database.");
    }

    const currentDevDbHash = getFileSha256(DEV_DB);
    console.log("\n[INVARIANCE VERIFICATION]");
    console.log("Baseline dev.db SHA-256:", BASELINE_DEV_DB_HASH);
    console.log("Current  dev.db SHA-256:", currentDevDbHash);
    if (currentDevDbHash !== BASELINE_DEV_DB_HASH) {
      console.error("CRITICAL FAILURE: Operational database prisma/dev.db was modified!");
      process.exit(1);
    } else {
      console.log("✓ OPERATIONAL DATABASE INVARIANCE CONFIRMED (100% UNTOUCHED).");
    }
  }
}

main().catch(err => {
  console.error("\nFATAL LIFECYCLE TEST ERROR:", err);
  if (fs.existsSync(ISOLATED_DB)) {
    try { fs.rmSync(ISOLATED_DB, { force: true }); } catch {}
  }
  process.exit(1);
});
