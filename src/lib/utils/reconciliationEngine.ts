import { StudentRecord } from "@/types/student";
import { FacultyRecord } from "@/types/faculty";

export interface PrototypeComparisonFieldDiff {
  fieldName: string;
  prototypeValue: string;
  dbValue: string;
}

export interface PrototypeComparisonItem {
  id: string;
  primaryKey: string;
  name: string;
  email: string;
  secondaryInfo: string;
  status: "duplicate" | "conflict" | "importable";
  statusReason: string;
  fieldDiffs?: PrototypeComparisonFieldDiff[];
  rawRecord: unknown;
  matchedDbRecord?: unknown;
}

export interface SafePruningResult<T> {
  success: boolean;
  prunedCount: number;
  skippedCount: number;
  backupKey: string;
  remainingRecords: T[];
  restorationAttempted?: boolean;
  restorationSuccessful?: boolean;
  error?: string;
}

export type AuthoritativeFetchResult<T> =
  | { success: true; data: T[]; total: number }
  | { success: false; error: string };

/**
 * Safely fetches all authoritative database records across pages using an authorized paginated server action.
 * Fail-closed behavior:
 * - A failed first page returns { success: false, error } (never an empty array).
 * - A failed later page invalidates the entire refresh and returns { success: false, error }.
 * - Validates that retrieved records match the total reported count across pages.
 */
export async function fetchAllAuthoritativePages<TDb, TRecord>(params: {
  fetchPage: (pagination: { page: number; pageSize: number }) => Promise<{
    success: boolean;
    data?: {
      items: TDb[];
      total: number;
      totalPages: number;
      page: number;
      pageSize: number;
    };
    error?: string;
  }>;
  mapper: (dbRecord: TDb) => TRecord;
  pageSize?: number;
}): Promise<AuthoritativeFetchResult<TRecord>> {
  const requestedPageSize = params.pageSize || 100;
  if (!Number.isInteger(requestedPageSize) || requestedPageSize <= 0) {
    return {
      success: false,
      error: `Invalid requested pageSize configuration (${requestedPageSize}). Must be a positive integer.`,
    };
  }

  // 1. Fetch first page
  let firstPageRes;
  try {
    firstPageRes = await params.fetchPage({ page: 1, pageSize: requestedPageSize });
  } catch (err) {
    return {
      success: false,
      error: `Network or runtime error fetching page 1: ${err instanceof Error ? err.message : String(err)}`,
    };
  }

  if (!firstPageRes || !firstPageRes.success || !firstPageRes.data) {
    return {
      success: false,
      error: firstPageRes?.error || "Failed to retrieve initial page of authoritative records.",
    };
  }

  const meta1 = firstPageRes.data;

  // Metadata Validation on Page 1
  if (!Array.isArray(meta1.items)) {
    return {
      success: false,
      error: "Authoritative metadata violation: 'items' property is missing or not an array on page 1.",
    };
  }

  if (typeof meta1.total !== "number" || Number.isNaN(meta1.total) || !Number.isInteger(meta1.total) || meta1.total < 0) {
    return {
      success: false,
      error: "Authoritative metadata violation: 'total' count is missing, non-numeric, negative, or non-integer on page 1.",
    };
  }

  if (typeof meta1.totalPages !== "number" || Number.isNaN(meta1.totalPages) || !Number.isInteger(meta1.totalPages) || meta1.totalPages < 0) {
    return {
      success: false,
      error: "Authoritative metadata violation: 'totalPages' is missing, non-numeric, negative, or non-integer on page 1.",
    };
  }

  if (meta1.page !== 1) {
    return {
      success: false,
      error: `Authoritative metadata violation: returned page (${meta1.page}) does not match requested page (1).`,
    };
  }

  if (typeof meta1.pageSize !== "number" || meta1.pageSize !== requestedPageSize) {
    return {
      success: false,
      error: `Authoritative metadata violation: returned pageSize (${meta1.pageSize}) does not match requested pageSize (${requestedPageSize}).`,
    };
  }

  const total = meta1.total;
  const totalPages = meta1.totalPages;

  // Relationship check between total, requestedPageSize, and totalPages
  const expectedTotalPages = total === 0 ? (totalPages === 0 || totalPages === 1 ? totalPages : -1) : Math.ceil(total / requestedPageSize);
  if (expectedTotalPages === -1 || (total > 0 && totalPages !== expectedTotalPages)) {
    return {
      success: false,
      error: `Authoritative metadata inconsistency: reported totalPages (${totalPages}) does not match expected total pages (${expectedTotalPages}) for total (${total}) and pageSize (${requestedPageSize}).`,
    };
  }

  // Validate page 1 item count
  if (total === 0) {
    if (meta1.items.length !== 0) {
      return {
        success: false,
        error: `Authoritative data violation: total is 0 but page 1 contains ${meta1.items.length} items.`,
      };
    }
    return { success: true, data: [], total: 0 };
  }

  if (totalPages === 1) {
    if (meta1.items.length !== total) {
      return {
        success: false,
        error: `Authoritative data violation: single-page total is ${total} but page 1 contains ${meta1.items.length} items.`,
      };
    }
  } else {
    // Multi-page dataset: page 1 must be full
    if (meta1.items.length !== requestedPageSize) {
      return {
        success: false,
        error: `Authoritative data violation: multi-page dataset has incomplete page 1 (${meta1.items.length} items received, expected full page of ${requestedPageSize}).`,
      };
    }
  }

  const allDb: TDb[] = [...meta1.items];

  // 2. Fetch subsequent pages fail-closed
  for (let p = 2; p <= totalPages; p++) {
    let nextRes;
    try {
      nextRes = await params.fetchPage({ page: p, pageSize: requestedPageSize });
    } catch (err) {
      return {
        success: false,
        error: `Network error retrieving page ${p} of ${totalPages}: ${err instanceof Error ? err.message : String(err)}. Refresh invalidated.`,
      };
    }

    if (!nextRes || !nextRes.success || !nextRes.data) {
      return {
        success: false,
        error: `Failed to retrieve page ${p} of ${totalPages}: ${nextRes?.error || "Empty or invalid response"}. Refresh invalidated.`,
      };
    }

    const metaP = nextRes.data;
    if (!Array.isArray(metaP.items)) {
      return {
        success: false,
        error: `Authoritative metadata violation: 'items' property is missing or not an array on page ${p}. Refresh invalidated.`,
      };
    }

    if (metaP.total !== total) {
      return {
        success: false,
        error: `Authoritative pagination snapshot inconsistency: reported total changed from ${total} to ${metaP.total} on page ${p}. Refresh invalidated.`,
      };
    }

    if (metaP.totalPages !== totalPages) {
      return {
        success: false,
        error: `Authoritative pagination snapshot inconsistency: reported totalPages changed from ${totalPages} to ${metaP.totalPages} on page ${p}. Refresh invalidated.`,
      };
    }

    if (metaP.page !== p) {
      return {
        success: false,
        error: `Authoritative pagination error: returned page (${metaP.page}) does not match requested page (${p}). Refresh invalidated.`,
      };
    }

    if (metaP.pageSize !== requestedPageSize) {
      return {
        success: false,
        error: `Authoritative pagination error: returned pageSize (${metaP.pageSize}) does not match requested pageSize (${requestedPageSize}) on page ${p}. Refresh invalidated.`,
      };
    }

    // Incomplete middle page check
    if (p < totalPages) {
      if (metaP.items.length !== requestedPageSize) {
        return {
          success: false,
          error: `Authoritative pagination violation: incomplete middle page ${p} (${metaP.items.length} items, expected full page of ${requestedPageSize}). Refresh invalidated.`,
        };
      }
    } else {
      // Final page remainder check
      const expectedRemainder = total - (totalPages - 1) * requestedPageSize;
      if (metaP.items.length !== expectedRemainder) {
        return {
          success: false,
          error: `Authoritative pagination violation: final page ${p} contains ${metaP.items.length} items, expected remainder of ${expectedRemainder}. Refresh invalidated.`,
        };
      }
    }

    allDb.push(...metaP.items);
  }

  // 3. Final completeness check
  if (allDb.length !== total) {
    return {
      success: false,
      error: `Integrity error: Expected ${total} total records but retrieved ${allDb.length}. Refresh invalidated.`,
    };
  }

  return {
    success: true,
    data: allDb.map(params.mapper),
    total,
  };
}

export function normalizePhone(phone: unknown): string {
  if (!phone) return "";
  return String(phone).replace(/\D/g, "").slice(-10);
}

export function normalizeDate(val: unknown): string {
  if (!val) return "";
  const s = String(val).trim();
  const mIso = s.match(/^(\d{4})-(\d{1,2})-(\d{1,2})/);
  if (mIso) {
    return `${mIso[1]}-${mIso[2].padStart(2, "0")}-${mIso[3].padStart(2, "0")}`;
  }
  const mText = s.match(/^(\d{1,2})\s+([A-Za-z]{3,9})\s+(\d{4})/);
  if (mText) {
    const months: Record<string, number> = { jan: 1, feb: 2, mar: 3, apr: 4, may: 5, jun: 6, jul: 7, aug: 8, sep: 9, oct: 10, nov: 11, dec: 12 };
    const mon = months[mText[2].slice(0, 3).toLowerCase()];
    if (mon) {
      return `${mText[3]}-${String(mon).padStart(2, "0")}-${mText[1].padStart(2, "0")}`;
    }
  }
  const d = new Date(s);
  if (isNaN(d.getTime())) return s.toLowerCase();
  if (s.endsWith("Z")) {
    return `${d.getUTCFullYear()}-${String(d.getUTCMonth() + 1).padStart(2, "0")}-${String(d.getUTCDate()).padStart(2, "0")}`;
  }
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`;
}

export function compareRequiredField(
  fieldName: string,
  protoVal: unknown,
  dbVal: unknown,
  normalizer?: (v: unknown) => string
): PrototypeComparisonFieldDiff | null {
  const normProto = normalizer ? normalizer(protoVal) : String(protoVal || "").trim();
  const normDb = normalizer ? normalizer(dbVal) : String(dbVal || "").trim();

  if (!normProto && !normDb) {
    return {
      fieldName,
      prototypeValue: "(missing)",
      dbValue: "(missing)",
    };
  }

  if (!normProto || !normDb) {
    return {
      fieldName,
      prototypeValue: normProto ? String(protoVal) : "(missing)",
      dbValue: normDb ? String(dbVal) : "(missing)",
    };
  }

  if (normProto !== normDb) {
    return {
      fieldName,
      prototypeValue: String(protoVal),
      dbValue: String(dbVal),
    };
  }

  return null;
}

export function compareOptionalField(
  fieldName: string,
  protoVal: unknown,
  dbVal: unknown,
  normalizer?: (v: unknown) => string
): PrototypeComparisonFieldDiff | null {
  const normProto = normalizer ? normalizer(protoVal) : String(protoVal || "").trim();
  const normDb = normalizer ? normalizer(dbVal) : String(dbVal || "").trim();

  if (!normProto && !normDb) {
    return null;
  }

  if (!normProto || !normDb) {
    return {
      fieldName,
      prototypeValue: normProto ? String(protoVal) : "(missing)",
      dbValue: normDb ? String(dbVal) : "(missing)",
    };
  }

  if (normProto !== normDb) {
    return {
      fieldName,
      prototypeValue: String(protoVal),
      dbValue: String(dbVal),
    };
  }

  return null;
}

export function evaluateStudentReconciliation(
  proto: StudentRecord,
  liveStudents: StudentRecord[]
): PrototypeComparisonItem {
  const cleanProtoPrn = proto.prn ? proto.prn.trim().toUpperCase() : "";
  const cleanProtoRoll = proto.rollNumber ? proto.rollNumber.trim().toUpperCase() : "";
  const cleanProtoEmail = proto.email ? proto.email.trim().toLowerCase() : "";

  // 1. Identity Key Search
  const prnMatches = liveStudents.filter((s) => {
    const sPrn = s.prn ? s.prn.trim().toUpperCase() : "";
    const sRoll = s.rollNumber ? s.rollNumber.trim().toUpperCase() : "";
    return (
      (cleanProtoPrn !== "" && (sPrn === cleanProtoPrn || sRoll === cleanProtoPrn)) ||
      (cleanProtoRoll !== "" && (sPrn === cleanProtoRoll || sRoll === cleanProtoRoll))
    );
  });

  const emailMatches = liveStudents.filter((s) => {
    const sEmail = s.email ? s.email.trim().toLowerCase() : "";
    return cleanProtoEmail !== "" && sEmail === cleanProtoEmail;
  });

  // 2. Multiple Identity Matches Check (Ambiguity Rule B)
  if (prnMatches.length > 1) {
    return {
      id: proto.id,
      primaryKey: proto.prn || proto.rollNumber || "UNKNOWN",
      name: proto.fullName || "(Unknown Name)",
      email: proto.email || "",
      secondaryInfo: proto.programmeName || "",
      status: "conflict",
      statusReason: `Ambiguous match: PRN/Roll Number matches multiple (${prnMatches.length}) database records: ${prnMatches.map((m) => `${m.fullName} [${m.prn}]`).join(", ")}`,
      fieldDiffs: [
        {
          fieldName: "Multiple Database Matches",
          prototypeValue: `PRN: ${proto.prn || proto.rollNumber}`,
          dbValue: `${prnMatches.length} conflicting database records found`,
        },
      ],
      rawRecord: proto,
    };
  }

  if (emailMatches.length > 1) {
    return {
      id: proto.id,
      primaryKey: proto.prn || proto.rollNumber || "UNKNOWN",
      name: proto.fullName || "(Unknown Name)",
      email: proto.email || "",
      secondaryInfo: proto.programmeName || "",
      status: "conflict",
      statusReason: `Ambiguous match: Email matches multiple (${emailMatches.length}) database records: ${emailMatches.map((m) => `${m.fullName} [${m.email}]`).join(", ")}`,
      fieldDiffs: [
        {
          fieldName: "Multiple Database Matches",
          prototypeValue: `Email: ${proto.email}`,
          dbValue: `${emailMatches.length} conflicting database records found`,
        },
      ],
      rawRecord: proto,
    };
  }

  // 3. Identity Discrepancy (PRN matches record A while Email matches record B)
  const prnMatch = prnMatches[0];
  const emailMatch = emailMatches[0];

  if (prnMatch && emailMatch && prnMatch.id !== emailMatch.id) {
    return {
      id: proto.id,
      primaryKey: proto.prn || proto.rollNumber || "UNKNOWN",
      name: proto.fullName || "(Unknown Name)",
      email: proto.email || "",
      secondaryInfo: proto.programmeName || "",
      status: "conflict",
      statusReason: `Ambiguous identity: PRN matches "${prnMatch.fullName}" (${prnMatch.prn}) but email matches "${emailMatch.fullName}" (${emailMatch.email})`,
      fieldDiffs: [
        {
          fieldName: "Identity Conflict",
          prototypeValue: `PRN: ${proto.prn}, Email: ${proto.email}`,
          dbValue: `DB Records: ${prnMatch.prn} vs ${emailMatch.email}`,
        },
      ],
      rawRecord: proto,
      matchedDbRecord: prnMatch,
    };
  }

  // 4. No matching identity keys -> Importable (Rule C)
  const dbMatch = prnMatch || emailMatch;
  if (!dbMatch) {
    return {
      id: proto.id,
      primaryKey: proto.prn || proto.rollNumber || "NEW",
      name: proto.fullName || "(Unnamed)",
      email: proto.email || "",
      secondaryInfo: proto.programmeName || "",
      status: "importable",
      statusReason: "New prototype student ready to import into database",
      rawRecord: proto,
    };
  }

  // 5. Unambiguous match -> Comprehensive Field Comparison (Rule A)
  const diffs: PrototypeComparisonFieldDiff[] = [];

  const nameDiff = compareRequiredField("Full Name", proto.fullName, dbMatch.fullName);
  if (nameDiff) diffs.push(nameDiff);

  const emailDiff = compareRequiredField("Email", proto.email, dbMatch.email, (v: unknown) => String(v || "").toLowerCase());
  if (emailDiff) diffs.push(emailDiff);

  const phoneDiff = compareRequiredField("Phone", proto.phone, dbMatch.phone, normalizePhone);
  if (phoneDiff) diffs.push(phoneDiff);

  const progDiff = compareRequiredField("Programme", proto.programmeName, dbMatch.programmeName);
  if (progDiff) diffs.push(progDiff);

  const semDiff = compareRequiredField("Semester", proto.semester, dbMatch.semester);
  if (semDiff) diffs.push(semDiff);

  const divDiff = compareRequiredField("Division", proto.division, dbMatch.division);
  if (divDiff) diffs.push(divDiff);

  const statusDiff = compareRequiredField("Status", proto.enrollmentStatus, dbMatch.enrollmentStatus);
  if (statusDiff) diffs.push(statusDiff);

  const feeDiff = compareRequiredField("Fee Status", proto.feeStatus, dbMatch.feeStatus);
  if (feeDiff) diffs.push(feeDiff);

  // Optional fields comparison
  const dobDiff = compareRequiredField("Date of Birth", proto.dateOfBirth, dbMatch.dateOfBirth, normalizeDate);
  if (dobDiff) diffs.push(dobDiff);

  const bloodDiff = compareOptionalField("Blood Group", proto.bloodGroup, dbMatch.bloodGroup);
  if (bloodDiff) diffs.push(bloodDiff);

  if (diffs.length > 0) {
    return {
      id: proto.id,
      primaryKey: proto.prn || proto.rollNumber || dbMatch.prn,
      name: proto.fullName || dbMatch.fullName,
      email: proto.email || dbMatch.email,
      secondaryInfo: proto.programmeName || dbMatch.programmeName,
      status: "conflict",
      statusReason: `Matching DB record for "${dbMatch.fullName}" (${dbMatch.prn}) has ${diffs.length} field difference(s)`,
      fieldDiffs: diffs,
      rawRecord: proto,
      matchedDbRecord: dbMatch,
    };
  }

  return {
    id: proto.id,
    primaryKey: proto.prn || proto.rollNumber || dbMatch.prn,
    name: proto.fullName || dbMatch.fullName,
    email: proto.email || dbMatch.email,
    secondaryInfo: proto.programmeName || dbMatch.programmeName,
    status: "duplicate",
    statusReason: `Confirmed duplicate: matches database record for "${dbMatch.fullName}" (${dbMatch.prn})`,
    rawRecord: proto,
    matchedDbRecord: dbMatch,
  };
}

/**
 * Evaluates a single faculty prototype record against live database staff.
 */
export function evaluateFacultyReconciliation(
  proto: FacultyRecord,
  liveFaculty: FacultyRecord[]
): PrototypeComparisonItem {
  const cleanProtoStaffId = proto.staffId ? proto.staffId.trim().toUpperCase() : "";
  const cleanProtoEmail = proto.email ? proto.email.trim().toLowerCase() : "";

  // 1. Identity Key Search
  const staffIdMatches = liveFaculty.filter((f) => {
    const sId = f.staffId ? f.staffId.trim().toUpperCase() : "";
    return cleanProtoStaffId !== "" && sId === cleanProtoStaffId;
  });

  const emailMatches = liveFaculty.filter((f) => {
    const sEmail = f.email ? f.email.trim().toLowerCase() : "";
    return cleanProtoEmail !== "" && sEmail === cleanProtoEmail;
  });

  // 2. Multiple Identity Matches Check (Ambiguity Rule B)
  if (staffIdMatches.length > 1) {
    return {
      id: proto.id,
      primaryKey: proto.staffId || "UNKNOWN",
      name: proto.fullName || "(Unknown Name)",
      email: proto.email || "",
      secondaryInfo: proto.department || "",
      status: "conflict",
      statusReason: `Ambiguous match: Staff ID matches multiple (${staffIdMatches.length}) database records: ${staffIdMatches.map((m) => `${m.fullName} [${m.staffId}]`).join(", ")}`,
      fieldDiffs: [
        {
          fieldName: "Multiple Database Matches",
          prototypeValue: `Staff ID: ${proto.staffId}`,
          dbValue: `${staffIdMatches.length} conflicting database records found`,
        },
      ],
      rawRecord: proto,
    };
  }

  if (emailMatches.length > 1) {
    return {
      id: proto.id,
      primaryKey: proto.staffId || "UNKNOWN",
      name: proto.fullName || "(Unknown Name)",
      email: proto.email || "",
      secondaryInfo: proto.department || "",
      status: "conflict",
      statusReason: `Ambiguous match: Email matches multiple (${emailMatches.length}) database records: ${emailMatches.map((m) => `${m.fullName} [${m.email}]`).join(", ")}`,
      fieldDiffs: [
        {
          fieldName: "Multiple Database Matches",
          prototypeValue: `Email: ${proto.email}`,
          dbValue: `${emailMatches.length} conflicting database records found`,
        },
      ],
      rawRecord: proto,
    };
  }

  // 3. Identity Discrepancy (Staff ID matches A while Email matches B)
  const staffIdMatch = staffIdMatches[0];
  const emailMatch = emailMatches[0];

  if (staffIdMatch && emailMatch && staffIdMatch.id !== emailMatch.id) {
    return {
      id: proto.id,
      primaryKey: proto.staffId || "UNKNOWN",
      name: proto.fullName || "(Unknown Name)",
      email: proto.email || "",
      secondaryInfo: proto.department || "",
      status: "conflict",
      statusReason: `Ambiguous identity: Staff ID matches "${staffIdMatch.fullName}" (${staffIdMatch.staffId}) but email matches "${emailMatch.fullName}" (${emailMatch.email})`,
      fieldDiffs: [
        {
          fieldName: "Identity Conflict",
          prototypeValue: `Staff ID: ${proto.staffId}, Email: ${proto.email}`,
          dbValue: `DB Records: ${staffIdMatch.staffId} vs ${emailMatch.email}`,
        },
      ],
      rawRecord: proto,
      matchedDbRecord: staffIdMatch,
    };
  }

  // 4. No matching identity keys -> Importable (Rule C)
  const dbMatch = staffIdMatch || emailMatch;
  if (!dbMatch) {
    return {
      id: proto.id,
      primaryKey: proto.staffId || "NEW",
      name: proto.fullName || "(Unnamed)",
      email: proto.email || "",
      secondaryInfo: proto.department || "",
      status: "importable",
      statusReason: "New prototype staff record ready to import into database",
      rawRecord: proto,
    };
  }

  // 5. Unambiguous match -> Comprehensive Field Comparison (Rule A)
  const diffs: PrototypeComparisonFieldDiff[] = [];

  const nameDiff = compareRequiredField("Full Name", proto.fullName, dbMatch.fullName);
  if (nameDiff) diffs.push(nameDiff);

  const emailDiff = compareRequiredField("Email", proto.email, dbMatch.email, (v: unknown) => String(v || "").toLowerCase());
  if (emailDiff) diffs.push(emailDiff);

  const phoneDiff = compareRequiredField("Phone", proto.phone, dbMatch.phone, normalizePhone);
  if (phoneDiff) diffs.push(phoneDiff);

  const deptDiff = compareRequiredField("Department", proto.department, dbMatch.department);
  if (deptDiff) diffs.push(deptDiff);

  const desigDiff = compareRequiredField("Designation", proto.designation, dbMatch.designation);
  if (desigDiff) diffs.push(desigDiff);

  const catDiff = compareRequiredField("Category", proto.category, dbMatch.category);
  if (catDiff) diffs.push(catDiff);

  const empDiff = compareRequiredField("Employment Type", proto.employmentType, dbMatch.employmentType);
  if (empDiff) diffs.push(empDiff);

  const statusDiff = compareRequiredField("Status", proto.status, dbMatch.status);
  if (statusDiff) diffs.push(statusDiff);

  if (diffs.length > 0) {
    return {
      id: proto.id,
      primaryKey: proto.staffId || dbMatch.staffId,
      name: proto.fullName || dbMatch.fullName,
      email: proto.email || dbMatch.email,
      secondaryInfo: proto.department || dbMatch.department,
      status: "conflict",
      statusReason: `Matching DB record for "${dbMatch.fullName}" (${dbMatch.staffId}) has ${diffs.length} field difference(s)`,
      fieldDiffs: diffs,
      rawRecord: proto,
      matchedDbRecord: dbMatch,
    };
  }

  return {
    id: proto.id,
    primaryKey: proto.staffId || dbMatch.staffId,
    name: proto.fullName || dbMatch.fullName,
    email: proto.email || dbMatch.email,
    secondaryInfo: proto.department || dbMatch.department,
    status: "duplicate",
    statusReason: `Confirmed duplicate: matches database record for "${dbMatch.fullName}" (${dbMatch.staffId})`,
    rawRecord: proto,
    matchedDbRecord: dbMatch,
  };
}

/**
 * Execution-time safe pruning validator and handler.
 * Revalidates every requested ID using the latest data, creates and verifies backup,
 * and only removes confirmed duplicates.
 */
export function executeSafePruning<T extends { id: string }, TDb>(params: {
  storageKey: string;
  requestedIds: string[];
  rawStorageContent: string | null;
  currentDbRecords: TDb[];
  evaluator: (proto: T, live: TDb[]) => PrototypeComparisonItem;
  storageBackend?: {
    getItem: (key: string) => string | null;
    setItem: (key: string, value: string) => void;
  };
  sessionBackend?: {
    setItem: (key: string, value: string) => void;
  };
  timestamp?: number;
}): SafePruningResult<T> {
  const { storageKey, requestedIds, rawStorageContent, currentDbRecords, evaluator } = params;
  const storage = params.storageBackend || (typeof localStorage !== "undefined" ? localStorage : null);
  const session = params.sessionBackend || (typeof sessionStorage !== "undefined" ? sessionStorage : null);

  if (!storage) {
    return {
      success: false,
      prunedCount: 0,
      skippedCount: requestedIds.length,
      backupKey: "",
      remainingRecords: [],
      error: "Storage backend is unavailable.",
    };
  }

  let currentRecords: T[] = [];
  try {
    const raw = rawStorageContent !== null ? rawStorageContent : storage.getItem(storageKey);
    if (raw) {
      currentRecords = JSON.parse(raw);
    }
  } catch (e) {
    return {
      success: false,
      prunedCount: 0,
      skippedCount: requestedIds.length,
      backupKey: "",
      remainingRecords: [],
      error: `Failed to parse storage data: ${e instanceof Error ? e.message : String(e)}`,
    };
  }

  // 1. Re-validate every requested ID at execution time
  const verifiedDuplicateIds: string[] = [];
  const skippedIds: string[] = [];

  for (const id of requestedIds) {
    const record = currentRecords.find((r) => r.id === id);
    if (!record) {
      skippedIds.push(id);
      continue;
    }

    // Re-evaluate against current DB records
    const evaluation = evaluator(record, currentDbRecords);
    if (evaluation.status === "duplicate") {
      verifiedDuplicateIds.push(id);
    } else {
      // Record changed or is not a duplicate
      skippedIds.push(id);
    }
  }

  if (verifiedDuplicateIds.length === 0) {
    return {
      success: true,
      prunedCount: 0,
      skippedCount: skippedIds.length,
      backupKey: "",
      remainingRecords: currentRecords,
    };
  }

  // 2. Create and Verify Recoverable Backup (with strict fail-closed collision safety)
  const ts = params.timestamp || Date.now();
  const candidateKey = `${storageKey}_backup_${ts}`;
  let uniqueBackupKey: string | null = null;
  const maxCollisionAttempts = 500;

  for (let c = 0; c <= maxCollisionAttempts; c++) {
    const key = c === 0 ? candidateKey : `${storageKey}_backup_${ts}_${c}`;
    if (storage.getItem(key) === null) {
      uniqueBackupKey = key;
      break;
    }
  }

  if (!uniqueBackupKey) {
    return {
      success: false,
      prunedCount: 0,
      skippedCount: requestedIds.length,
      backupKey: "",
      remainingRecords: currentRecords,
      error: "Backup creation aborted: Unable to establish a unique, unused backup key in storage. Pruning aborted without modifying storage.",
    };
  }

  const backupKey = uniqueBackupKey;
  const serializedCurrent = JSON.stringify(currentRecords);

  try {
    storage.setItem(backupKey, serializedCurrent);
    // Verification of backup write
    const readBackBackup = storage.getItem(backupKey);
    if (!readBackBackup || readBackBackup !== serializedCurrent) {
      return {
        success: false,
        prunedCount: 0,
        skippedCount: requestedIds.length,
        backupKey: "",
        remainingRecords: currentRecords,
        error: "Backup verification failed: could not confirm backup integrity in storage.",
      };
    }

    if (session) {
      session.setItem(`last_${storageKey}_backup`, backupKey);
    }
  } catch (err) {
    return {
      success: false,
      prunedCount: 0,
      skippedCount: requestedIds.length,
      backupKey: "",
      remainingRecords: currentRecords,
      error: `Failed to create backup: ${err instanceof Error ? err.message : String(err)}`,
    };
  }

  // 3. Write Filtered Storage (Preserving conflicts, ambiguous, and unverified records)
  const remaining = currentRecords.filter((r) => !verifiedDuplicateIds.includes(r.id));
  const serializedRemaining = JSON.stringify(remaining);

  let filteredWriteSucceeded = false;
  try {
    storage.setItem(storageKey, serializedRemaining);
    // Verification of filtered write
    const readBackRemaining = storage.getItem(storageKey);
    if (readBackRemaining && readBackRemaining === serializedRemaining) {
      filteredWriteSucceeded = true;
    }
  } catch {
    filteredWriteSucceeded = false;
  }

  if (!filteredWriteSucceeded) {
    // Write or readback verification failed! Attempt safe restoration of original storage
    let restoredSuccessfully = false;
    try {
      storage.setItem(storageKey, serializedCurrent);
      const readBackRestored = storage.getItem(storageKey);
      if (readBackRestored === serializedCurrent) {
        restoredSuccessfully = true;
      }
    } catch {
      restoredSuccessfully = false;
    }

    return {
      success: false,
      prunedCount: 0,
      skippedCount: requestedIds.length,
      backupKey,
      remainingRecords: currentRecords,
      restorationAttempted: true,
      restorationSuccessful: restoredSuccessfully,
      error: restoredSuccessfully
        ? "Filtered storage persistence verification failed. Original storage was successfully restored from backup."
        : `CRITICAL: Filtered storage persistence failed AND storage restoration failed. Original records are preserved in backup at "${backupKey}".`,
    };
  }

  return {
    success: true,
    prunedCount: verifiedDuplicateIds.length,
    skippedCount: skippedIds.length,
    backupKey,
    remainingRecords: remaining,
  };
}
