"use server";

import prisma from "@/lib/db";
import { requireAuth, requirePermission } from "@/lib/auth/guards";
import { hasPermission } from "@/lib/auth/roles";
import { StudentRepository } from "@/lib/dal/studentRepository";
import { isValidDocumentCategory, DocumentCategory } from "@/lib/storage/validation";
import { getStorageStatus, StorageStatus } from "@/lib/storage";
import { Result } from "@/lib/dal/types";

/**
 * Server Action: Retrieve the current document storage configuration status.
 * Informs the UI whether document upload/replace is available or temporarily disabled.
 */
export async function getDocumentStorageStatusAction(): Promise<Result<StorageStatus>> {
  return {
    success: true,
    data: getStorageStatus(),
  };
}

/**
 * Server Action: Retrieve all documents and their verification history for a student.
 * Enforces strict record-level security:
 * - STUDENT_VIEWER can only retrieve documents for their own linked student record.
 * - ACADEMIC_ADMIN and SYSTEM_ADMIN can access all student documents.
 * - Unauthorized roles are denied with FORBIDDEN.
 */
export async function getStudentDocumentsAction(studentId: string) {
  const auth = await requireAuth();
  if (!auth.success || !auth.data) return auth as Result<never>;
  const user = auth.data;

  if (user.role === "STUDENT_VIEWER") {
    if (!user.studentId || user.studentId !== studentId) {
      return {
        success: false,
        error: "Access denied. You may only view documents associated with your personal student record.",
        code: "FORBIDDEN",
      };
    }
  } else if (!hasPermission(user.role, "VERIFY_STUDENT_DOCUMENTS")) {
    return {
      success: false,
      error: "Access denied. You do not hold administrative authorization to view student documents.",
      code: "FORBIDDEN",
    };
  }

  return StudentRepository.getStudentDocuments(studentId);
}

/**
 * Server Action: Upload a new document for a student.
 * Accepts multipart/form-data containing:
 * - studentId: target student record
 * - category: institutional category
 * - file: the binary document file
 */
export async function uploadStudentDocumentAction(formData: FormData) {
  const auth = await requireAuth();
  if (!auth.success || !auth.data) return auth as Result<never>;
  const user = auth.data;

  const studentId = formData.get("studentId");
  const categoryRaw = formData.get("category");
  const file = formData.get("file");

  if (typeof studentId !== "string" || !studentId.trim()) {
    return {
      success: false,
      error: "Student identifier is required.",
      code: "VALIDATION_FAILED",
    };
  }

  if (typeof categoryRaw !== "string" || !isValidDocumentCategory(categoryRaw)) {
    return {
      success: false,
      error: `Invalid or unapproved document category: ${String(categoryRaw)}`,
      code: "INVALID_CATEGORY",
    };
  }

  const category = categoryRaw as DocumentCategory;

  if (!file || !(file instanceof File)) {
    return {
      success: false,
      error: "Valid document file is required.",
      code: "VALIDATION_FAILED",
    };
  }

  // Record-level permission checks
  if (user.role === "STUDENT_VIEWER") {
    if (!user.studentId || user.studentId !== studentId) {
      return {
        success: false,
        error: "Access denied. You may only upload documents for your own student record.",
        code: "FORBIDDEN",
      };
    }
    if (!hasPermission(user.role, "UPLOAD_STUDENT_DOCUMENTS")) {
      return {
        success: false,
        error: "Access denied. Your student account does not have upload permissions.",
        code: "FORBIDDEN",
      };
    }
  } else if (!hasPermission(user.role, "WRITE_STUDENTS") && !hasPermission(user.role, "UPLOAD_STUDENT_DOCUMENTS")) {
    return {
      success: false,
      error: "Access denied. Insufficient administrative privileges to upload student documents.",
      code: "FORBIDDEN",
    };
  }

  // Storage availability check (production persistent cloud storage safety guard)
  const storageStatus = getStorageStatus();
  if (!storageStatus.available) {
    return {
      success: false,
      error: storageStatus.message || "Document uploads are temporarily unavailable. Persistent cloud storage has not been configured for this environment.",
      code: "STORAGE_UNAVAILABLE",
    };
  }

  try {
    const arrayBuffer = await file.arrayBuffer();
    const buffer = Buffer.from(arrayBuffer);

    return await StudentRepository.uploadStudentDocument({
      studentId,
      category,
      buffer,
      originalFileName: file.name,
      reportedMimeType: file.type,
      uploadedByUserId: user.id,
    });
  } catch (err) {
    return {
      success: false,
      error: `Failed to process document upload: ${err instanceof Error ? err.message : String(err)}`,
      code: "UPLOAD_FAILED",
    };
  }
}

/**
 * Server Action: Verify or reject a student document.
 * Requires VERIFY_STUDENT_DOCUMENTS administrative permission.
 * Non-empty institutional justification reason is required for REJECTED decisions.
 */
export async function verifyStudentDocumentAction(params: {
  documentId: string;
  decision: "VERIFIED" | "REJECTED";
  reason?: string;
}) {
  const guard = await requirePermission("VERIFY_STUDENT_DOCUMENTS");
  if (!guard.success || !guard.data) return guard as Result<never>;
  const user = guard.data;

  if (!params.documentId) {
    return {
      success: false,
      error: "Document identifier is required for verification.",
      code: "VALIDATION_FAILED",
    };
  }

  if (params.decision !== "VERIFIED" && params.decision !== "REJECTED") {
    return {
      success: false,
      error: "Invalid verification decision. Must be VERIFIED or REJECTED.",
      code: "VALIDATION_FAILED",
    };
  }

  if (params.decision === "REJECTED" && (!params.reason || !params.reason.trim())) {
    return {
      success: false,
      error: "A clear institutional reason is mandatory when rejecting a document.",
      code: "VALIDATION_FAILED",
    };
  }

  return StudentRepository.verifyStudentDocument({
    documentId: params.documentId,
    reviewerUserId: user.id,
    decision: params.decision,
    reason: params.reason,
  });
}

/**
 * Server Action: Replace an existing document with a new revision.
 * Preserves verification history: marks existing document as SUPERSEDED,
 * creates a new document version, and sets replacement linkage.
 */
export async function replaceStudentDocumentAction(formData: FormData) {
  const auth = await requireAuth();
  if (!auth.success || !auth.data) return auth as Result<never>;
  const user = auth.data;

  const documentId = formData.get("documentId");
  const file = formData.get("file");

  if (typeof documentId !== "string" || !documentId.trim()) {
    return {
      success: false,
      error: "Document identifier is required for replacement.",
      code: "VALIDATION_FAILED",
    };
  }

  if (!file || !(file instanceof File)) {
    return {
      success: false,
      error: "Valid replacement file is required.",
      code: "VALIDATION_FAILED",
    };
  }

  // Lookup existing document to verify ownership
  const existingDoc = await prisma.studentDocument.findUnique({
    where: { id: documentId },
    select: { id: true, studentId: true, isArchived: true },
  });

  if (!existingDoc || existingDoc.isArchived) {
    return {
      success: false,
      error: "The targeted document does not exist or has been archived.",
      code: "NOT_FOUND",
    };
  }

  if (user.role === "STUDENT_VIEWER") {
    if (!user.studentId || user.studentId !== existingDoc.studentId) {
      return {
        success: false,
        error: "Access denied. You may only replace documents belonging to your student profile.",
        code: "FORBIDDEN",
      };
    }
  } else if (!hasPermission(user.role, "WRITE_STUDENTS") && !hasPermission(user.role, "UPLOAD_STUDENT_DOCUMENTS")) {
    return {
      success: false,
      error: "Access denied. Insufficient administrative privileges to replace student documents.",
      code: "FORBIDDEN",
    };
  }

  // Storage availability check (production persistent cloud storage safety guard)
  const storageStatus = getStorageStatus();
  if (!storageStatus.available) {
    return {
      success: false,
      error: storageStatus.message || "Document uploads are temporarily unavailable. Persistent cloud storage has not been configured for this environment.",
      code: "STORAGE_UNAVAILABLE",
    };
  }

  try {
    const arrayBuffer = await file.arrayBuffer();
    const buffer = Buffer.from(arrayBuffer);

    return await StudentRepository.replaceStudentDocument({
      documentId,
      buffer,
      originalFileName: file.name,
      reportedMimeType: file.type,
      uploadedByUserId: user.id,
    });
  } catch (err) {
    return {
      success: false,
      error: `Failed to replace document: ${err instanceof Error ? err.message : String(err)}`,
      code: "REPLACE_FAILED",
    };
  }
}
