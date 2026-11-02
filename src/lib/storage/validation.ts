import path from "path";
import crypto from "crypto";

export const MAX_DOCUMENT_FILE_SIZE = 10 * 1024 * 1024; // 10 MB

export const ALLOWED_DOCUMENT_CATEGORIES = [
  "IDENTITY_PROOF",
  "PHOTOGRAPH",
  "PREVIOUS_MARKSHEET",
  "LEAVING_CERTIFICATE",
  "MIGRATION_CERTIFICATE",
  "CASTE_CERTIFICATE",
  "DOMICILE_CERTIFICATE",
  "ADMISSION_FORM",
  "OTHER",
] as const;

export type DocumentCategory = (typeof ALLOWED_DOCUMENT_CATEGORIES)[number];

export const DOCUMENT_CATEGORY_LABELS: Record<DocumentCategory, string> = {
  IDENTITY_PROOF: "Identity Proof (Aadhaar / Passport / Voter ID)",
  PHOTOGRAPH: "Passport-size Photograph",
  PREVIOUS_MARKSHEET: "Previous Academic Marksheet / Passing Certificate",
  LEAVING_CERTIFICATE: "Leaving / Transfer Certificate (LC/TC)",
  MIGRATION_CERTIFICATE: "Migration Certificate",
  CASTE_CERTIFICATE: "Caste Certificate",
  DOMICILE_CERTIFICATE: "Domicile / Nationality Certificate",
  ADMISSION_FORM: "Institutional Admission Application Form",
  OTHER: "Other Supporting Document",
};

export interface FileValidationResult {
  isValid: boolean;
  error?: string;
  code?: string;
  mimeType?: string;
  sanitizedOriginalName?: string;
  checksum?: string;
  extension?: string;
}

/**
 * Validates a binary buffer against allowed file types, magic bytes signatures,
 * size boundaries, and MIME consistency. Prevents MIME spoofing and executable uploads.
 */
export function validateDocumentFile(
  buffer: Buffer,
  originalFileName: string,
  _reportedMimeType?: string
): FileValidationResult {
  // 1. Check file size
  if (!buffer || buffer.length === 0) {
    return {
      isValid: false,
      error: "The uploaded file is empty (0 bytes). Please select a valid document.",
      code: "EMPTY_FILE",
    };
  }

  if (buffer.length > MAX_DOCUMENT_FILE_SIZE) {
    const sizeMb = (buffer.length / (1024 * 1024)).toFixed(2);
    return {
      isValid: false,
      error: `File size exceeds the 10 MB limit (${sizeMb} MB detected). Please compress the document before uploading.`,
      code: "FILE_TOO_LARGE",
    };
  }

  // 2. Sanitize and inspect original filename
  if (!originalFileName || typeof originalFileName !== "string") {
    return {
      isValid: false,
      error: "Invalid or missing filename.",
      code: "INVALID_FILENAME",
    };
  }

  const rawExt = path.extname(originalFileName).toLowerCase();
  const baseName = path.basename(originalFileName, rawExt).slice(0, 100);
  const sanitizedOriginalName = `${baseName.replace(/[^a-zA-Z0-9_\-.\s]/g, "_")}${rawExt}`.trim();

  const allowedExtensions = [".pdf", ".jpg", ".jpeg", ".png"];
  if (!allowedExtensions.includes(rawExt)) {
    return {
      isValid: false,
      error: `Unsupported file format '${rawExt}'. Only PDF, JPEG, and PNG documents are accepted for institutional records.`,
      code: "UNSUPPORTED_FORMAT",
    };
  }

  // 3. Inspect magic bytes signature
  let detectedMime = "";
  let canonicalExt = "";

  // Check PDF signature: %PDF- (0x25, 0x50, 0x44, 0x46, 0x2D)
  if (
    buffer.length >= 5 &&
    buffer[0] === 0x25 &&
    buffer[1] === 0x50 &&
    buffer[2] === 0x44 &&
    buffer[3] === 0x46 &&
    buffer[4] === 0x2d
  ) {
    detectedMime = "application/pdf";
    canonicalExt = ".pdf";
  }
  // Check JPEG signature: 0xFF, 0xD8, 0xFF
  else if (
    buffer.length >= 3 &&
    buffer[0] === 0xff &&
    buffer[1] === 0xd8 &&
    buffer[2] === 0xff
  ) {
    detectedMime = "image/jpeg";
    canonicalExt = rawExt === ".jpeg" ? ".jpeg" : ".jpg";
  }
  // Check PNG signature: 0x89, 0x50, 0x4E, 0x47, 0x0D, 0x0A, 0x1A, 0x0A
  else if (
    buffer.length >= 8 &&
    buffer[0] === 0x89 &&
    buffer[1] === 0x50 &&
    buffer[2] === 0x4e &&
    buffer[3] === 0x47 &&
    buffer[4] === 0x0d &&
    buffer[5] === 0x0a &&
    buffer[6] === 0x1a &&
    buffer[7] === 0x0a
  ) {
    detectedMime = "image/png";
    canonicalExt = ".png";
  } else {
    return {
      isValid: false,
      error: "File signature mismatch. The file content does not match a genuine PDF, JPEG, or PNG document.",
      code: "INVALID_FILE_SIGNATURE",
    };
  }

  // 4. Verify MIME consistency and prevent MIME spoofing
  if (rawExt === ".pdf" && detectedMime !== "application/pdf") {
    return {
      isValid: false,
      error: "MIME spoofing detected. File has a .pdf extension but content is not a valid PDF document.",
      code: "MIME_SPOOFING_DETECTED",
    };
  }

  if ((rawExt === ".jpg" || rawExt === ".jpeg") && detectedMime !== "image/jpeg") {
    return {
      isValid: false,
      error: "MIME spoofing detected. File has a JPEG extension but content is not a valid JPEG image.",
      code: "MIME_SPOOFING_DETECTED",
    };
  }

  if (rawExt === ".png" && detectedMime !== "image/png") {
    return {
      isValid: false,
      error: "MIME spoofing detected. File has a .png extension but content is not a valid PNG image.",
      code: "MIME_SPOOFING_DETECTED",
    };
  }

  // Compute SHA-256 binary checksum
  const checksum = crypto.createHash("sha256").update(buffer).digest("hex");

  return {
    isValid: true,
    mimeType: detectedMime,
    sanitizedOriginalName,
    checksum,
    extension: canonicalExt,
  };
}

/**
 * Validates whether a category is one of the allowed institutional document categories.
 */
export function isValidDocumentCategory(category: string): category is DocumentCategory {
  return ALLOWED_DOCUMENT_CATEGORIES.includes(category as DocumentCategory);
}
