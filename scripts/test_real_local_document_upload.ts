import fs from "fs";
import path from "path";
import prisma from "../src/lib/db";
import { StudentRepository } from "../src/lib/dal/studentRepository";

async function run() {
  console.log("=== CHECK 2: REAL LOCAL DOCUMENT UPLOAD & STUDENT DOSSIER VERIFICATION ===\n");

  // 1. Find Aarav Sharma
  const student = await prisma.student.findFirst({
    where: { fullName: "Aarav Sharma" },
  });
  if (!student) {
    throw new Error("Student Aarav Sharma not found");
  }

  // Find admin user for uploader
  const adminUser = await prisma.userAccount.findFirst({
    where: { role: "SYSTEM_ADMIN" },
  });
  if (!adminUser) {
    throw new Error("Admin user not found");
  }

  // Snapshot student record before upload
  const studentBefore = JSON.stringify(student);
  console.log(`[1] Found student: ${student.fullName} (ID: ${student.id}, Roll: ${student.rollNumber})`);

  // Count existing documents for student
  const existingDocsBefore = await prisma.studentDocument.count({
    where: { studentId: student.id },
  });
  console.log(`[2] Existing student documents before test: ${existingDocsBefore}`);

  // Create a valid PDF buffer (magic bytes %PDF-1.4)
  const pdfContent = Buffer.from(
    "%PDF-1.4\n1 0 obj\n<< /Title (Student Identity Card) /Author (Institutional Admin) >>\nendobj\ntrailer\n<< /Root 1 0 R >>\n%%EOF"
  );

  // 2. Upload document using local storage provider
  console.log("[3] Uploading real local document via StudentRepository.uploadStudentDocument...");
  const uploadRes = await StudentRepository.uploadStudentDocument({
    studentId: student.id,
    category: "IDENTITY_PROOF",
    buffer: pdfContent,
    originalFileName: "aarav_aadhaar_card_local.pdf",
    reportedMimeType: "application/pdf",
    uploadedByUserId: adminUser.id,
  });

  if (!uploadRes.success || !uploadRes.data) {
    throw new Error(`Document upload failed: ${uploadRes.error}`);
  }
  const uploadedDoc = uploadRes.data;
  console.log(`  ✅ Upload succeeded! Document ID: ${uploadedDoc.id}`);
  console.log(`  - Category: ${uploadedDoc.category}`);
  console.log(`  - Storage Key: ${uploadedDoc.storageKey}`);
  console.log(`  - Storage Provider: ${uploadedDoc.storageProvider}`);
  console.log(`  - Status: ${uploadedDoc.status}`);
  console.log(`  - Version: ${uploadedDoc.version}`);

  // 3. Confirm file exists on local disk
  const localFilePath = path.resolve(process.cwd(), "storage/private_documents", uploadedDoc.storageKey);
  if (!fs.existsSync(localFilePath)) {
    throw new Error(`Uploaded file not found on disk at: ${localFilePath}`);
  }
  const diskBytes = fs.readFileSync(localFilePath);
  if (!diskBytes.equals(pdfContent)) {
    throw new Error("Disk content does not match uploaded PDF buffer");
  }
  console.log(`  ✅ Verified local storage file on disk (${diskBytes.length} bytes) at ${uploadedDoc.storageKey}`);

  // 4. Confirm document appears in Student Dossier
  console.log("\n[4] Querying 360-degree Student Dossier via StudentRepository.getStudentDossier360...");
  const dossierRes = await StudentRepository.getStudentDossier360(student.id);
  if (!dossierRes.success || !dossierRes.data) {
    throw new Error(`Failed to load student dossier: ${dossierRes.error}`);
  }

  const dossier = dossierRes.data;
  const docsSummary = dossier.documentsSummary;
  if (!docsSummary) {
    throw new Error("Student dossier missing documentsSummary field");
  }

  console.log(`  - Total documents in dossier: ${docsSummary.totalCount}`);
  console.log(`  - Pending documents: ${docsSummary.pendingCount}`);
  console.log(`  - Verified documents: ${docsSummary.verifiedCount}`);

  const foundInDossier = docsSummary.documents.find((d) => d.id === uploadedDoc.id);
  if (!foundInDossier) {
    throw new Error(`Uploaded document ${uploadedDoc.id} not found in student dossier documents list`);
  }
  console.log(`  ✅ PASS: Uploaded document found in student dossier!`);
  console.log(`     Title: ${foundInDossier.originalFileName}`);
  console.log(`     Category: ${foundInDossier.category}`);
  console.log(`     Status: ${foundInDossier.status}`);

  // Check categoriesBreakdown
  const categoryItem = docsSummary.categoriesBreakdown.find((c) => c.category === "IDENTITY_PROOF");
  if (!categoryItem || !categoryItem.isUploaded || categoryItem.document?.id !== uploadedDoc.id) {
    throw new Error("Category breakdown for IDENTITY_PROOF does not match uploaded document");
  }
  console.log(`  ✅ PASS: Category breakdown indicates IDENTITY_PROOF is uploaded`);

  // 5. Confirm existing student record was NOT altered
  console.log("\n[5] Verifying existing Student record invariance...");
  const studentAfter = await prisma.student.findFirst({
    where: { id: student.id },
  });
  const studentAfterStr = JSON.stringify(studentAfter);
  if (studentBefore !== studentAfterStr) {
    throw new Error("CRITICAL: Existing Student record was altered during document upload!");
  }
  console.log("  ✅ PASS: Student record is 100% invariant (no existing records modified or deleted)");

  console.log("\n=======================================================");
  console.log("CHECK 2 PASSED: REAL LOCAL DOCUMENT UPLOAD VERIFIED IN DOSSIER");
  console.log("=======================================================\n");
}

run()
  .catch((e) => {
    console.error("FAILED:", e);
    process.exit(1);
  })
  .finally(() => prisma.$disconnect());
