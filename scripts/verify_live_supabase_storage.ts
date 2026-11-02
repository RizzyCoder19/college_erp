import path from "path";
import fs from "fs";
import crypto from "crypto";
import { createClient } from "@supabase/supabase-js";

// Load environment variables natively from local .env
const envPath = path.resolve(process.cwd(), ".env");
if (fs.existsSync(envPath)) {
  const envContent = fs.readFileSync(envPath, "utf8");
  for (const line of envContent.split("\n")) {
    const trimmed = line.trim();
    if (!trimmed || trimmed.startsWith("#")) continue;
    const eqIdx = trimmed.indexOf("=");
    if (eqIdx !== -1) {
      const key = trimmed.substring(0, eqIdx).trim();
      let val = trimmed.substring(eqIdx + 1).trim();
      if ((val.startsWith('"') && val.endsWith('"')) || (val.startsWith("'") && val.endsWith("'"))) {
        val = val.slice(1, -1);
      }
      process.env[key] = val;
    }
  }
}

const DEV_DB_PATH = path.resolve(process.cwd(), "prisma/dev.db");

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

async function runLiveVerification() {
  console.log("\n=======================================================");
  console.log("CAMPUSOS: LIVE SUPABASE PRIVATE STORAGE VERIFICATION");
  console.log("=======================================================\n");

  // Step 0: dev.db invariance pre-check
  const preTestDbHash = calculateFileHash(DEV_DB_PATH);
  const preTestDbSize = fs.existsSync(DEV_DB_PATH) ? fs.statSync(DEV_DB_PATH).size : 0;
  console.log(`[0/5] dev.db baseline: SHA-256=${preTestDbHash} (${preTestDbSize} bytes)`);

  // Step 1: Environment credential inspection
  console.log("\n[1/5] Verifying local environment credentials...");
  const supabaseUrl = process.env.SUPABASE_URL?.trim();
  const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY?.trim();
  const bucketName = process.env.SUPABASE_STORAGE_BUCKET?.trim() || "student-documents";

  assert(Boolean(supabaseUrl), "SUPABASE_URL is configured");
  assert(Boolean(serviceRoleKey && !serviceRoleKey.startsWith("<")), "SUPABASE_SERVICE_ROLE_KEY is configured with real key");
  assert(bucketName === "student-documents", "SUPABASE_STORAGE_BUCKET is 'student-documents'");

  // Step 2: Initialize Supabase client
  console.log("\n[2/5] Initializing Supabase client with server-side service role...");
  const supabase = createClient(supabaseUrl!, serviceRoleKey!, {
    auth: {
      persistSession: false,
      autoRefreshToken: false,
    },
  });

  // Step 3: Bucket configuration & inspection
  console.log("\n[3/5] Inspecting & configuring private storage bucket 'student-documents'...");
  const { data: existingBucket, error: getBucketError } = await supabase.storage.getBucket(bucketName);

  if (getBucketError && (getBucketError.message?.includes("not found") || (getBucketError as any).status === 404)) {
    console.log(`  ℹ️ Bucket '${bucketName}' not found. Creating private bucket...`);
    const { data: createData, error: createError } = await supabase.storage.createBucket(bucketName, {
      public: false,
      fileSizeLimit: 10 * 1024 * 1024, // 10MB
      allowedMimeTypes: ["application/pdf", "image/jpeg", "image/png"],
    });
    if (createError) {
      throw new Error(`Failed to create bucket '${bucketName}': ${createError.message}`);
    }
    console.log(`  ✅ Successfully created private bucket: ${bucketName}`);
  } else if (getBucketError) {
    throw new Error(`Error inspecting bucket '${bucketName}': ${getBucketError.message}`);
  } else {
    console.log(`  ℹ️ Bucket '${bucketName}' already exists. Verifying configuration...`);
    assert(existingBucket.public === false, "Bucket public access is strictly OFF (private)");
    
    // Ensure 10MB limit and allowed MIME types are strictly configured
    const { error: updateError } = await supabase.storage.updateBucket(bucketName, {
      public: false,
      fileSizeLimit: 10 * 1024 * 1024,
      allowedMimeTypes: ["application/pdf", "image/jpeg", "image/png"],
    });
    if (updateError) {
      console.warn(`  ⚠️ Warning updating bucket settings: ${updateError.message}`);
    } else {
      console.log(`  ✅ Bucket configuration verified: public=false, limit=10MB, allowedMimeTypes=[pdf, jpeg, png]`);
    }
  }

  // Step 4: Live Cloud Synthetic Upload, Read, Signed URL, and Cleanup
  console.log("\n[4/5] Executing live cloud test with synthetic document...");
  const { SupabasePrivateStorageProvider } = await import("../src/lib/storage/index");
  const provider = new SupabasePrivateStorageProvider({
    url: supabaseUrl,
    serviceRoleKey: serviceRoleKey,
    bucket: bucketName,
  });

  const testKey = `synthetic_tests/cloud_verify_${Date.now()}_${crypto.randomBytes(4).toString("hex")}.pdf`;
  const syntheticContent = "%PDF-1.4\n1 0 obj << /Title (CampusOS Synthetic Cloud Verification) >> endobj\ntrailer << /Size 1 >>\nstartxref\n50\n%%EOF";
  const syntheticBuffer = Buffer.from(syntheticContent);

  // 4A. Upload
  console.log(`  Uploading synthetic test object to '${testKey}'...`);
  await provider.storeDocument(testKey, syntheticBuffer, "application/pdf");
  console.log("  ✅ Object uploaded successfully.");

  // 4B. Exists
  const exists = await provider.documentExists(testKey);
  assert(exists === true, "documentExists confirms object is present in private bucket");

  // 4C. Read
  const downloaded = await provider.readDocument(testKey);
  assert(downloaded !== null, "readDocument successfully retrieved object from private cloud bucket");
  assert(downloaded?.toString() === syntheticContent, "Retrieved object content matches synthetic test payload bit-for-bit");

  // 4D. Signed download URL
  const signedUrl = await provider.getSignedDownloadUrl(testKey, 60, "synthetic_test.pdf");
  assert(Boolean(signedUrl && signedUrl.startsWith("http")), "getSignedDownloadUrl generated valid URL");
  console.log(`  Generated 60s signed download URL: ${signedUrl.substring(0, 80)}...`);

  const fetchRes = await fetch(signedUrl);
  assert(fetchRes.status === 200, `Signed download URL responded with HTTP 200 (status: ${fetchRes.status})`);
  const fetchedBytes = Buffer.from(await fetchRes.arrayBuffer());
  assert(fetchedBytes.toString() === syntheticContent, "Fetched bytes via signed URL match uploaded synthetic payload");

  // 4D2. Verify signed URL expires after configured lifetime
  console.log("  Testing short-lived signed URL expiration (1 second)...");
  const shortSignedUrl = await provider.getSignedDownloadUrl(testKey, 1, "expiring_test.pdf");
  await new Promise((resolve) => setTimeout(resolve, 2500));
  const expiredRes = await fetch(shortSignedUrl);
  assert(expiredRes.status === 400 || expiredRes.status === 403 || expiredRes.status === 401, `Expired signed URL strictly rejected with HTTP ${expiredRes.status}`);
  console.log(`  ✅ Expired signed URL rejected as expected (HTTP ${expiredRes.status}).`);

  // 4E. Verify unauthorized direct access fails
  const directPublicUrl = `${supabaseUrl}/storage/v1/object/public/${bucketName}/${testKey}`;
  const directRes = await fetch(directPublicUrl);
  assert(directRes.status === 400 || directRes.status === 404 || directRes.status === 403, `Unauthorized direct public URL rejected with HTTP ${directRes.status}`);

  // 4F. Compensating deletion of synthetic test object
  console.log(`  Deleting synthetic test object from '${testKey}'...`);
  const deleted = await provider.deleteDocument(testKey);
  assert(deleted === true, "deleteDocument returned true");

  const existsAfterDelete = await provider.documentExists(testKey);
  assert(existsAfterDelete === false, "documentExists confirms synthetic object is purged from cloud bucket");
  console.log("  ✅ Synthetic test object cleanly purged. No test artifacts remain in cloud.");

  // Step 5: Database invariance check
  console.log("\n[5/5] Checking dev.db invariance...");
  const postTestDbHash = calculateFileHash(DEV_DB_PATH);
  assert(preTestDbHash === postTestDbHash, `DATABASE INVARIANCE VERIFIED: dev.db untouched (hash: ${postTestDbHash})`);

  console.log("\n=======================================================");
  console.log("ALL LIVE SUPABASE CLOUD CHECKS PASSED (100%)");
  console.log("=======================================================\n");
}

runLiveVerification().catch((err) => {
  console.error("Live verification failed:", err);
  process.exit(1);
});
