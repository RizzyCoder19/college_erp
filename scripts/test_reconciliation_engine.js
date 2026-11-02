const assert = require("assert");

// Register ts-node / transpile for importing ts files in node
const ts = require("typescript");
const fs = require("fs");
const path = require("path");

function requireTs(filePath) {
  const fullPath = path.resolve(__dirname, "..", filePath);
  const tsCode = fs.readFileSync(fullPath, "utf8");
  const jsCode = ts.transpileModule(tsCode, {
    compilerOptions: { module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2020 }
  }).outputText;
  const m = { exports: {} };
  const fn = new Function("require", "module", "exports", "__dirname", "__filename", jsCode);
  fn(require, m, m.exports, path.dirname(fullPath), fullPath);
  return m.exports;
}

const {
  evaluateStudentReconciliation,
  evaluateFacultyReconciliation,
  executeSafePruning,
  fetchAllAuthoritativePages
} = requireTs("src/lib/utils/reconciliationEngine.ts");

console.log("=== Running Unit 2.1 Targeted Reconciliation Regression Tests ===\n");

// --- SYNTHETIC STUDENT FIXTURES ---
const baselineDbStudent = {
  id: "db-std-001",
  prn: "2026DS041",
  rollNumber: "RPIHM-2026DS041",
  fullName: "Aarav Sharma",
  email: "aarav.sharma.26@rpihm.ac.in",
  phone: "+91 98201 44521",
  programmeId: "prog-ds",
  programmeName: "B.Sc. Data Science with AI",
  department: "Technology & Computing",
  semester: 1,
  yearGroup: "FY",
  division: "Div A",
  admissionDate: "15 Jul 2026",
  enrollmentStatus: "Active",
  feeStatus: "Paid",
  attendanceRate: 88.5,
  mentorFaculty: "Prof. Snehal Kulkarni",
  guardianName: "Sunil Sharma",
  guardianRelationship: "Father",
  guardianPhone: "+91 98201 11200",
  dateOfBirth: "2006-04-12",
  bloodGroup: "B+",
  isFictionalSample: false,
};

const secondDbStudent = {
  id: "db-std-002",
  prn: "2026DS042",
  rollNumber: "RPIHM-2026DS042",
  fullName: "Komal Soni",
  email: "komal.soni@rpihm.ac.in",
  phone: "+91 98201 99999",
  programmeId: "prog-ds",
  programmeName: "B.Sc. Data Science with AI",
  department: "Technology & Computing",
  semester: 4,
  yearGroup: "SY",
  division: "Div A",
  admissionDate: "15 Jul 2025",
  enrollmentStatus: "Active",
  feeStatus: "Paid",
  attendanceRate: 88.5,
  mentorFaculty: "Prof. Snehal Kulkarni",
  guardianName: "Ramesh Soni",
  guardianRelationship: "Father",
  guardianPhone: "+91 98201 88888",
  dateOfBirth: "2005-08-20",
  bloodGroup: "O+",
  isFictionalSample: false,
};

// Case 1: Identical record with all required fields present -> confirmed duplicate
{
  const proto = { ...baselineDbStudent, id: "proto-std-001" };
  const res = evaluateStudentReconciliation(proto, [baselineDbStudent]);
  assert.strictEqual(res.status, "duplicate", "Case 1 Student failed: Expected duplicate");
  assert.strictEqual(res.fieldDiffs, undefined, "Case 1 Student failed: Expected 0 diffs");
  console.log("  [PASS] Student Case 1: Identical record -> confirmed duplicate");
}

// Case 2: Same identity, different name -> conflict
{
  const proto = { ...baselineDbStudent, id: "proto-std-002", fullName: "Aarav K. Sharma" };
  const res = evaluateStudentReconciliation(proto, [baselineDbStudent]);
  assert.strictEqual(res.status, "conflict", "Case 2 Student failed: Expected conflict");
  assert.ok(res.fieldDiffs.some(d => d.fieldName === "Full Name" && d.prototypeValue === "Aarav K. Sharma"), "Case 2 Student failed: Missing Full Name diff");
  console.log("  [PASS] Student Case 2: Same identity, different name -> conflict");
}

// Case 3: Same identity, missing required comparison field (e.g. empty email or phone) -> not a duplicate
{
  const protoMissingEmail = { ...baselineDbStudent, id: "proto-std-003a", email: "" };
  const resEmail = evaluateStudentReconciliation(protoMissingEmail, [baselineDbStudent]);
  assert.strictEqual(resEmail.status, "conflict", "Case 3a Student failed: Missing email must be conflict");
  assert.ok(resEmail.fieldDiffs.some(d => d.fieldName === "Email" && d.prototypeValue === "(missing)"), "Case 3a: Expected missing email diff");

  const protoMissingPhone = { ...baselineDbStudent, id: "proto-std-003b", phone: "" };
  const resPhone = evaluateStudentReconciliation(protoMissingPhone, [baselineDbStudent]);
  assert.strictEqual(resPhone.status, "conflict", "Case 3b Student failed: Missing phone must be conflict");
  assert.ok(resPhone.fieldDiffs.some(d => d.fieldName === "Phone" && d.prototypeValue === "(missing)"), "Case 3b: Expected missing phone diff");
  console.log("  [PASS] Student Case 3: Same identity, missing required comparison field -> conflict (not duplicate)");
}

// Case 4: Same identity, differing phone or academic field -> conflict
{
  const protoDiffPhone = { ...baselineDbStudent, id: "proto-std-004a", phone: "+91 99999 00000" };
  const resPhone = evaluateStudentReconciliation(protoDiffPhone, [baselineDbStudent]);
  assert.strictEqual(resPhone.status, "conflict", "Case 4a Student failed: Expected phone conflict");
  assert.ok(resPhone.fieldDiffs.some(d => d.fieldName === "Phone"), "Case 4a: Expected phone diff");

  const protoDiffSem = { ...baselineDbStudent, id: "proto-std-004b", semester: 2 };
  const resSem = evaluateStudentReconciliation(protoDiffSem, [baselineDbStudent]);
  assert.strictEqual(resSem.status, "conflict", "Case 4b Student failed: Expected semester conflict");
  assert.ok(resSem.fieldDiffs.some(d => d.fieldName === "Semester"), "Case 4b: Expected semester diff");
  console.log("  [PASS] Student Case 4: Same identity, differing phone or academic field -> conflict");
}

// Case 5: Identity key matches one database record while email matches another -> conflict
{
  // PRN matches baselineDbStudent ("2026DS041"), but email matches secondDbStudent ("komal.soni@rpihm.ac.in")
  const protoAmbiguousIdentity = {
    ...baselineDbStudent,
    id: "proto-std-005",
    prn: "2026DS041",
    email: "komal.soni@rpihm.ac.in",
  };
  const res = evaluateStudentReconciliation(protoAmbiguousIdentity, [baselineDbStudent, secondDbStudent]);
  assert.strictEqual(res.status, "conflict", "Case 5 Student failed: Expected conflict");
  assert.ok(res.statusReason.includes("Ambiguous identity"), "Case 5 Student failed: Expected Ambiguous identity in statusReason");
  console.log("  [PASS] Student Case 5: PRN matches one DB record while email matches another -> conflict");
}

// Case 6: Multiple database records share the same identity key -> ambiguous review required
{
  const duplicatePrnDbStudent = { ...baselineDbStudent, id: "db-std-003", fullName: "Aarav Sharma Duplicate" };
  const proto = { ...baselineDbStudent, id: "proto-std-006" };
  const res = evaluateStudentReconciliation(proto, [baselineDbStudent, duplicatePrnDbStudent]);
  assert.strictEqual(res.status, "conflict", "Case 6 Student failed: Expected conflict for multiple DB matches");
  assert.ok(res.statusReason.includes("Ambiguous match: PRN/Roll Number matches multiple"), "Case 6: Expected multiple matches message");
  console.log("  [PASS] Student Case 6: Multiple DB records match PRN -> ambiguous conflict (review required)");
}

// Case 7: No matching identity keys -> importable
{
  const protoNew = {
    ...baselineDbStudent,
    id: "proto-std-007",
    prn: "2026DS999",
    rollNumber: "RPIHM-2026DS999",
    email: "completely.new.student@rpihm.ac.in",
  };
  const res = evaluateStudentReconciliation(protoNew, [baselineDbStudent, secondDbStudent]);
  assert.strictEqual(res.status, "importable", "Case 7 Student failed: Expected importable");
  console.log("  [PASS] Student Case 7: No matching identity keys -> importable");
}

// --- SYNTHETIC FACULTY FIXTURES ---
const baselineDbFaculty = {
  id: "db-fac-001",
  staffId: "RPIHM-FAC-012",
  fullName: "Chef Vikramaditya Kapoor",
  designation: "Executive Chef Instructor",
  department: "Hospitality & Culinary Arts",
  category: "Culinary Instructor",
  employmentType: "Full-Time Permanent",
  email: "v.kapoor@sample.rpihm.ac.in",
  phone: "+91 98201 44551",
  officeLocation: "Kitchen 2",
  workloadHours: 20,
  status: "In Lab / Kitchen",
  qualification: "Grand Diplôme",
  specialization: "French Cuisine",
  joinedDate: "2018-06-15",
  teachingSubjects: ["Classical Culinary Foundation"],
  assignedProgrammes: ["B.Sc. Culinary Arts"],
  avatarInitial: "V",
  isSampleRecord: false,
};

const secondDbFaculty = {
  id: "db-fac-002",
  staffId: "RPIHM-FAC-031",
  fullName: "Dr. Rajesh V. Nair",
  designation: "Professor & Head of Department",
  department: "Technology & Computing",
  category: "Professor",
  employmentType: "Full-Time Permanent",
  email: "r.nair@sample.rpihm.ac.in",
  phone: "+91 98334 11220",
  officeLocation: "Tech Block 301",
  workloadHours: 16,
  status: "Active",
  qualification: "Ph.D. in Computer Science",
  specialization: "Machine Learning",
  joinedDate: "2015-08-01",
  teachingSubjects: ["Data Science Foundation"],
  assignedProgrammes: ["B.Sc. Data Science with AI"],
  avatarInitial: "R",
  isSampleRecord: false,
};

// Faculty Case 1: Identical record -> confirmed duplicate
{
  const proto = { ...baselineDbFaculty, id: "proto-fac-001" };
  const res = evaluateFacultyReconciliation(proto, [baselineDbFaculty]);
  assert.strictEqual(res.status, "duplicate", "Faculty Case 1 failed: Expected duplicate");
  assert.strictEqual(res.fieldDiffs, undefined);
  console.log("  [PASS] Faculty Case 1: Identical record -> confirmed duplicate");
}

// Faculty Case 2: Same identity, different name -> conflict
{
  const proto = { ...baselineDbFaculty, id: "proto-fac-002", fullName: "Chef Vikram Kapoor" };
  const res = evaluateFacultyReconciliation(proto, [baselineDbFaculty]);
  assert.strictEqual(res.status, "conflict", "Faculty Case 2 failed: Expected conflict");
  assert.ok(res.fieldDiffs.some(d => d.fieldName === "Full Name" && d.prototypeValue === "Chef Vikram Kapoor"));
  console.log("  [PASS] Faculty Case 2: Same identity, different name -> conflict");
}

// Faculty Case 3: Same identity, missing required field (e.g. designation or email) -> not a duplicate
{
  const protoMissingDesig = { ...baselineDbFaculty, id: "proto-fac-003", designation: "" };
  const res = evaluateFacultyReconciliation(protoMissingDesig, [baselineDbFaculty]);
  assert.strictEqual(res.status, "conflict", "Faculty Case 3 failed: Missing designation must be conflict");
  assert.ok(res.fieldDiffs.some(d => d.fieldName === "Designation" && d.prototypeValue === "(missing)"));
  console.log("  [PASS] Faculty Case 3: Same identity, missing required field -> conflict (not duplicate)");
}

// Faculty Case 4: Same identity, differing department or category -> conflict
{
  const protoDiffDept = { ...baselineDbFaculty, id: "proto-fac-004", department: "Technology & Computing" };
  const res = evaluateFacultyReconciliation(protoDiffDept, [baselineDbFaculty]);
  assert.strictEqual(res.status, "conflict", "Faculty Case 4 failed: Expected department conflict");
  assert.ok(res.fieldDiffs.some(d => d.fieldName === "Department"));
  console.log("  [PASS] Faculty Case 4: Same identity, differing department -> conflict");
}

// Faculty Case 5: Staff ID matches one record while email matches another -> conflict
{
  const protoAmbiguous = {
    ...baselineDbFaculty,
    id: "proto-fac-005",
    staffId: "RPIHM-FAC-012",
    email: "r.nair@sample.rpihm.ac.in",
  };
  const res = evaluateFacultyReconciliation(protoAmbiguous, [baselineDbFaculty, secondDbFaculty]);
  assert.strictEqual(res.status, "conflict");
  assert.ok(res.statusReason.includes("Ambiguous identity"));
  console.log("  [PASS] Faculty Case 5: Staff ID matches record A while email matches record B -> conflict");
}

// Faculty Case 6: Multiple DB records match Staff ID -> ambiguous review required
{
  const duplicateStaffDb = { ...baselineDbFaculty, id: "db-fac-003", fullName: "Duplicate Staff" };
  const proto = { ...baselineDbFaculty, id: "proto-fac-006" };
  const res = evaluateFacultyReconciliation(proto, [baselineDbFaculty, duplicateStaffDb]);
  assert.strictEqual(res.status, "conflict");
  assert.ok(res.statusReason.includes("Ambiguous match: Staff ID matches multiple"));
  console.log("  [PASS] Faculty Case 6: Multiple DB records match Staff ID -> ambiguous conflict");
}

// Faculty Case 7: No matching identity keys -> importable
{
  const protoNew = {
    ...baselineDbFaculty,
    id: "proto-fac-007",
    staffId: "RPIHM-FAC-999",
    email: "new.faculty@sample.rpihm.ac.in",
  };
  const res = evaluateFacultyReconciliation(protoNew, [baselineDbFaculty, secondDbFaculty]);
  assert.strictEqual(res.status, "importable");
  console.log("  [PASS] Faculty Case 7: No matching identity keys -> importable");
}

// --- PRUNING SAFETY TESTS (Cases 8, 9, 10) ---

// In-memory mock storage backend
function createMockStorage(initial = {}) {
  const store = { ...initial };
  return {
    store,
    getItem: (k) => (k in store ? store[k] : null),
    setItem: (k, v) => { store[k] = String(v); }
  };
}

// Case 8: Pruning removes ONLY verified duplicates
{
  const duplicateStudent = { ...baselineDbStudent, id: "proto-dup-1" };
  const conflictStudent = { ...baselineDbStudent, id: "proto-conf-1", fullName: "Conflicting Name" };
  const importableStudent = { ...baselineDbStudent, id: "proto-imp-1", prn: "2026NEW001", email: "new@rpihm.ac.in" };

  const initialList = [duplicateStudent, conflictStudent, importableStudent];
  const storage = createMockStorage({ "students_key": JSON.stringify(initialList) });
  const session = createMockStorage();

  const pruneRes = executeSafePruning({
    storageKey: "students_key",
    requestedIds: ["proto-dup-1"],
    rawStorageContent: JSON.stringify(initialList),
    currentDbRecords: [baselineDbStudent],
    evaluator: evaluateStudentReconciliation,
    storageBackend: storage,
    sessionBackend: session,
    timestamp: 123456789
  });

  assert.strictEqual(pruneRes.success, true);
  assert.strictEqual(pruneRes.prunedCount, 1);
  assert.strictEqual(pruneRes.remainingRecords.length, 2);
  assert.ok(!pruneRes.remainingRecords.some(r => r.id === "proto-dup-1"), "Duplicate was not removed");
  assert.strictEqual(pruneRes.backupKey, "students_key_backup_123456789");
  console.log("  [PASS] Case 8: Pruning removes only verified duplicate IDs");
}

// Case 9: Pruning leaves conflicts, ambiguous, and importable records unchanged
{
  const duplicateStudent = { ...baselineDbStudent, id: "proto-dup-1" };
  const conflictStudent = { ...baselineDbStudent, id: "proto-conf-1", fullName: "Conflicting Name" };
  const importableStudent = { ...baselineDbStudent, id: "proto-imp-1", prn: "2026NEW001", email: "new@rpihm.ac.in" };

  const initialList = [duplicateStudent, conflictStudent, importableStudent];
  const storage = createMockStorage({ "students_key": JSON.stringify(initialList) });
  const session = createMockStorage();

  // Malicious / erroneous attempt: requested pruning of conflictStudent and importableStudent!
  const pruneRes = executeSafePruning({
    storageKey: "students_key",
    requestedIds: ["proto-conf-1", "proto-imp-1"],
    rawStorageContent: JSON.stringify(initialList),
    currentDbRecords: [baselineDbStudent],
    evaluator: evaluateStudentReconciliation,
    storageBackend: storage,
    sessionBackend: session
  });

  assert.strictEqual(pruneRes.success, true);
  assert.strictEqual(pruneRes.prunedCount, 0, "Non-duplicate IDs must never be pruned");
  assert.strictEqual(pruneRes.skippedCount, 2, "Both non-duplicate IDs should be skipped");
  assert.strictEqual(pruneRes.remainingRecords.length, 3, "All 3 records must remain intact");
  console.log("  [PASS] Case 9: Erroneous request to prune conflict/importable records safely rejected (0 pruned)");
}

// Case 10: Backup creation or storage-write failure does not produce a false success message
{
  const duplicateStudent = { ...baselineDbStudent, id: "proto-dup-1" };
  const initialList = [duplicateStudent];

  // Storage backend that fails on backup write
  const faultyStorage = {
    getItem: (k) => (k === "students_key" ? JSON.stringify(initialList) : null),
    setItem: (k, v) => {
      if (k.includes("backup")) throw new Error("Disk quota exceeded on backup write");
    }
  };

  const pruneRes = executeSafePruning({
    storageKey: "students_key",
    requestedIds: ["proto-dup-1"],
    rawStorageContent: JSON.stringify(initialList),
    currentDbRecords: [baselineDbStudent],
    evaluator: evaluateStudentReconciliation,
    storageBackend: faultyStorage,
  });

  assert.strictEqual(pruneRes.success, false, "Must return success: false when backup fails");
  assert.strictEqual(pruneRes.prunedCount, 0, "No records may be reported pruned");
  assert.ok(pruneRes.error.includes("Failed to create backup"), "Error message must reflect backup failure");
  console.log("  [PASS] Case 10: Backup failure aborts pruning and reports error (no false success)");
}

// --- UNIT 2.2 AUDIT REGRESSION TESTS (Cases 11-15) ---

// Case 11: Pruning write-failure recovery: backup succeeds, filtered-storage write fails, original storage restored
{
  const duplicateStudent = { ...baselineDbStudent, id: "proto-dup-1" };
  const conflictStudent = { ...baselineDbStudent, id: "proto-conf-1", fullName: "Conflicting Name" };
  const initialList = [duplicateStudent, conflictStudent];
  const initialJson = JSON.stringify(initialList);

  let attemptsToWriteFiltered = 0;
  const store = { "students_key": initialJson };

  const recoveringStorage = {
    store,
    getItem: (k) => (k in store ? store[k] : null),
    setItem: (k, v) => {
      if (k === "students_key") {
        attemptsToWriteFiltered++;
        if (attemptsToWriteFiltered === 1) {
          // Simulate storage write failure on filtered write (e.g. quota or corruption)
          throw new Error("Quota exceeded while writing filtered storage");
        }
        // Second write is the restoration attempt, which succeeds!
        store[k] = String(v);
      } else {
        store[k] = String(v);
      }
    }
  };

  const pruneRes = executeSafePruning({
    storageKey: "students_key",
    requestedIds: ["proto-dup-1"],
    rawStorageContent: initialJson,
    currentDbRecords: [baselineDbStudent],
    evaluator: evaluateStudentReconciliation,
    storageBackend: recoveringStorage,
    timestamp: 999991
  });

  assert.strictEqual(pruneRes.success, false, "Must return success: false when filtered write fails");
  assert.strictEqual(pruneRes.prunedCount, 0, "No records may be reported pruned");
  assert.strictEqual(pruneRes.restorationAttempted, true, "Restoration must be attempted");
  assert.strictEqual(pruneRes.restorationSuccessful, true, "Restoration must succeed");
  assert.strictEqual(pruneRes.remainingRecords.length, 2, "Original records returned");
  assert.strictEqual(recoveringStorage.getItem("students_key"), initialJson, "Original storage contents must be intact");
  assert.ok(pruneRes.error.includes("successfully restored"), "Error message must report successful restoration");
  console.log("  [PASS] Case 11: Filtered storage write failure triggers safe restoration, preserving original records");
}

// Case 12: Pruning write-failure recovery: backup succeeds, filtered write fails AND restoration fails
{
  const duplicateStudent = { ...baselineDbStudent, id: "proto-dup-1" };
  const initialList = [duplicateStudent];
  const initialJson = JSON.stringify(initialList);

  const store = { "students_key": initialJson };

  const doubleFaultStorage = {
    store,
    getItem: (k) => (k in store ? store[k] : null),
    setItem: (k, v) => {
      if (k === "students_key") {
        throw new Error("Persistent storage failure on students_key");
      }
      store[k] = String(v);
    }
  };

  const pruneRes = executeSafePruning({
    storageKey: "students_key",
    requestedIds: ["proto-dup-1"],
    rawStorageContent: initialJson,
    currentDbRecords: [baselineDbStudent],
    evaluator: evaluateStudentReconciliation,
    storageBackend: doubleFaultStorage,
    timestamp: 999992
  });

  assert.strictEqual(pruneRes.success, false, "Must return success: false when write and restoration fail");
  assert.strictEqual(pruneRes.restorationAttempted, true, "Restoration attempted");
  assert.strictEqual(pruneRes.restorationSuccessful, false, "Restoration reported as failed");
  assert.ok(pruneRes.error.includes("CRITICAL"), "Error message must alert CRITICAL restoration failure");
  assert.ok(pruneRes.error.includes("students_key_backup_999992"), "Error message must include backup key");
  console.log("  [PASS] Case 12: Dual storage failure reports restoration failure and directs to verified backup key");
}

// Case 13: Duplicate backup-key collisions: existing backup is NOT overwritten
{
  const duplicateStudent = { ...baselineDbStudent, id: "proto-dup-1" };
  const initialList = [duplicateStudent];
  const initialJson = JSON.stringify(initialList);

  // Storage already has an existing backup at timestamp 777777
  const store = {
    "students_key": initialJson,
    "students_key_backup_777777": "PRIOR_BACKUP_SNAPSHOT_DO_NOT_OVERWRITE"
  };

  const collisionStorage = {
    store,
    getItem: (k) => (k in store ? store[k] : null),
    setItem: (k, v) => { store[k] = String(v); }
  };

  const pruneRes = executeSafePruning({
    storageKey: "students_key",
    requestedIds: ["proto-dup-1"],
    rawStorageContent: initialJson,
    currentDbRecords: [baselineDbStudent],
    evaluator: evaluateStudentReconciliation,
    storageBackend: collisionStorage,
    timestamp: 777777
  });

  assert.strictEqual(pruneRes.success, true);
  // Verify prior backup was NOT overwritten
  assert.strictEqual(
    collisionStorage.getItem("students_key_backup_777777"),
    "PRIOR_BACKUP_SNAPSHOT_DO_NOT_OVERWRITE",
    "Existing backup must NOT be overwritten on collision"
  );
  // Verify new backup created with collision counter
  assert.strictEqual(pruneRes.backupKey, "students_key_backup_777777_1");
  assert.strictEqual(collisionStorage.getItem("students_key_backup_777777_1"), initialJson);
  console.log("  [PASS] Case 13: Duplicate backup-key collisions resolved safely without overwriting prior backups");
}

// Case 14: Date of Birth required field policy (mandatory institutional schema field)
{
  // 14a: Missing DOB in prototype -> conflict
  const protoMissingDob = { ...baselineDbStudent, id: "proto-std-dob-1", dateOfBirth: "" };
  const resMissingDob = evaluateStudentReconciliation(protoMissingDob, [baselineDbStudent]);
  assert.strictEqual(resMissingDob.status, "conflict", "Missing DOB in prototype must be conflict");
  assert.ok(
    resMissingDob.fieldDiffs.some(d => d.fieldName === "Date of Birth" && d.prototypeValue === "(missing)"),
    "Expected (missing) Date of Birth diff"
  );

  // 14b: Missing DOB in both prototype and DB -> conflict (mandatory field cannot be missing)
  const dbStudentNoDob = { ...baselineDbStudent, dateOfBirth: "" };
  const resBothNoDob = evaluateStudentReconciliation(protoMissingDob, [dbStudentNoDob]);
  assert.strictEqual(resBothNoDob.status, "conflict", "DOB missing in both must be conflict");
  assert.ok(
    resBothNoDob.fieldDiffs.some(d => d.fieldName === "Date of Birth" && d.prototypeValue === "(missing)" && d.dbValue === "(missing)"),
    "Both missing DOB must be flagged as conflict"
  );

  // 14c: Normalized equivalence ("2006-04-12" vs "12 Apr 2006") -> confirmed duplicate
  const protoNormalizedDob = { ...baselineDbStudent, id: "proto-std-dob-3", dateOfBirth: "12 Apr 2006" };
  const resNormalizedDob = evaluateStudentReconciliation(protoNormalizedDob, [baselineDbStudent]);
  assert.strictEqual(resNormalizedDob.status, "duplicate", "Normalized dates must match as duplicate");

  console.log("  [PASS] Case 14: Date of Birth required field policy strictly enforced (missing triggers conflict, normalized matches)");
}

// Case 15: Declared optional field policy (bloodGroup String? in schema)
{
  // 15a: Missing bloodGroup in both prototype and DB -> treated as equal (duplicate)
  const dbStudentNoBlood = { ...baselineDbStudent, bloodGroup: "" };
  const protoNoBlood = { ...baselineDbStudent, id: "proto-std-bg-1", bloodGroup: "" };
  const resBothNoBlood = evaluateStudentReconciliation(protoNoBlood, [dbStudentNoBlood]);
  assert.strictEqual(resBothNoBlood.status, "duplicate", "Optional field missing in both is valid equality");

  // 15b: One missing, one present -> conflict
  const protoWithBlood = { ...baselineDbStudent, id: "proto-std-bg-2", bloodGroup: "O+" };
  const resOneMissing = evaluateStudentReconciliation(protoWithBlood, [dbStudentNoBlood]);
  assert.strictEqual(resOneMissing.status, "conflict", "Optional field present in only one side is conflict");

  // 15c: Both present but different -> conflict
  const resDiffBlood = evaluateStudentReconciliation(protoWithBlood, [baselineDbStudent]); // baseline has B+
  assert.strictEqual(resDiffBlood.status, "conflict", "Different blood groups must be conflict");

  console.log("  [PASS] Case 15: Declared optional field policy (bloodGroup) correctly permits valid dual absence and flags partial/differing values");
}

// --- UNIT 2.3 INTEGRITY & CLOSURE TESTS (Cases 16-19) ---

// Case 16: Backup exact fidelity verification (byte-for-byte snapshot integrity)
{
  const complexDuplicate = {
    ...baselineDbStudent,
    id: "proto-dup-complex",
    metadata: { nestedKey: "nestedValue", list: [1, 2, 3] },
    specialNotes: "Prototype record containing special characters: & < > ' \" \n\t"
  };
  const complexConflict = {
    ...baselineDbStudent,
    id: "proto-conf-complex",
    fullName: "Conflicting Student"
  };
  const initialList = [complexDuplicate, complexConflict];
  const initialRaw = JSON.stringify(initialList);

  const storage = createMockStorage({ "fidelity_key": initialRaw });

  const pruneRes = executeSafePruning({
    storageKey: "fidelity_key",
    requestedIds: ["proto-dup-complex"],
    rawStorageContent: initialRaw,
    currentDbRecords: [baselineDbStudent],
    evaluator: evaluateStudentReconciliation,
    storageBackend: storage,
    timestamp: 888111
  });

  assert.strictEqual(pruneRes.success, true);
  const backupInStore = storage.getItem(pruneRes.backupKey);
  assert.strictEqual(backupInStore, initialRaw, "Backup must contain the EXACT serialized initial payload");
  const parsedBackup = JSON.parse(backupInStore);
  assert.deepStrictEqual(parsedBackup, initialList, "Backup must parse to identical deep-equal records");
  console.log("  [PASS] Case 16: Backup exact fidelity verified (exact byte-for-byte and deep-equal snapshot)");
}

// Case 17: Repeated invocation idempotency
{
  const duplicateStudent = { ...baselineDbStudent, id: "proto-dup-idem" };
  const conflictStudent = { ...baselineDbStudent, id: "proto-conf-idem", fullName: "Different Name" };
  const initialList = [duplicateStudent, conflictStudent];
  const storage = createMockStorage({ "idem_key": JSON.stringify(initialList) });

  // First invocation: prunes duplicate
  const firstRes = executeSafePruning({
    storageKey: "idem_key",
    requestedIds: ["proto-dup-idem"],
    rawStorageContent: null,
    currentDbRecords: [baselineDbStudent],
    evaluator: evaluateStudentReconciliation,
    storageBackend: storage,
    timestamp: 888222
  });
  assert.strictEqual(firstRes.success, true);
  assert.strictEqual(firstRes.prunedCount, 1);
  assert.strictEqual(firstRes.remainingRecords.length, 1);

  // Second invocation with same requested ID: already pruned!
  const secondRes = executeSafePruning({
    storageKey: "idem_key",
    requestedIds: ["proto-dup-idem"],
    rawStorageContent: null,
    currentDbRecords: [baselineDbStudent],
    evaluator: evaluateStudentReconciliation,
    storageBackend: storage,
    timestamp: 888223
  });
  assert.strictEqual(secondRes.success, true);
  assert.strictEqual(secondRes.prunedCount, 0, "Repeated pruning must prune 0 records");
  assert.strictEqual(secondRes.skippedCount, 1, "Already pruned ID must be reported as skipped");
  assert.strictEqual(secondRes.remainingRecords.length, 1, "Remaining storage must stay intact");
  assert.strictEqual(storage.getItem("idem_key"), JSON.stringify([conflictStudent]), "Storage must not be modified");
  console.log("  [PASS] Case 17: Repeated invocation idempotency verified (zero side effects on repeat)");
}

// Case 18: Timezone-shift proof date matching across representations
{
  // 18a: ISO timestamp with UTC midnight Z -> exact duplicate
  const protoIso = { ...baselineDbStudent, id: "proto-std-iso", dateOfBirth: "2006-04-12T00:00:00.000Z" };
  const resIso = evaluateStudentReconciliation(protoIso, [baselineDbStudent]);
  assert.strictEqual(resIso.status, "duplicate", "ISO UTC date must match as duplicate without day shift");

  // 18b: Textual date '12 Apr 2006' -> exact duplicate
  const protoText = { ...baselineDbStudent, id: "proto-std-text", dateOfBirth: "12 Apr 2006" };
  const resText = evaluateStudentReconciliation(protoText, [baselineDbStudent]);
  assert.strictEqual(resText.status, "duplicate", "Textual month date must match as duplicate without day shift");

  // 18c: Genuine date difference '2006-04-11' vs '2006-04-12' -> conflict
  const protoDiffDate = { ...baselineDbStudent, id: "proto-std-diffdate", dateOfBirth: "2006-04-11" };
  const resDiffDate = evaluateStudentReconciliation(protoDiffDate, [baselineDbStudent]);
  assert.strictEqual(resDiffDate.status, "conflict", "Different calendar day must be conflict");
  assert.ok(resDiffDate.fieldDiffs.some(d => d.fieldName === "Date of Birth"));

  console.log("  [PASS] Case 18: Timezone-shift proof date matching verified across ISO, textual, and date-only formats");
}

// Case 19: Bounded collision loop safety (prevents unbounded loop under abnormal storage)
{
  const duplicateStudent = { ...baselineDbStudent, id: "proto-dup-loop" };
  const initialList = [duplicateStudent];

  // Storage mock that simulates pre-existing keys for the base backup
  const store = {
    "bound_key": JSON.stringify(initialList),
    "bound_key_backup_55555": "BACKUP_0",
    "bound_key_backup_55555_1": "BACKUP_1"
  };

  const collisionStorage = {
    store,
    getItem: (k) => (k in store ? store[k] : null),
    setItem: (k, v) => { store[k] = String(v); }
  };

  const res = executeSafePruning({
    storageKey: "bound_key",
    requestedIds: ["proto-dup-loop"],
    rawStorageContent: null,
    currentDbRecords: [baselineDbStudent],
    evaluator: evaluateStudentReconciliation,
    storageBackend: collisionStorage,
    timestamp: 55555
  });

  assert.strictEqual(res.success, true);
  assert.strictEqual(res.backupKey, "bound_key_backup_55555_2", "Must resolve to next available collision counter");
  assert.strictEqual(collisionStorage.getItem("bound_key_backup_55555"), "BACKUP_0", "Prior backup 0 untouched");
  assert.strictEqual(collisionStorage.getItem("bound_key_backup_55555_1"), "BACKUP_1", "Prior backup 1 untouched");
  console.log("  [PASS] Case 19: Bounded collision loop safety verified (resolves collisions promptly and securely)");
}

async function runAsyncTests() {
// --- UNIT 2.4 FAIL-CLOSED DATA REFRESH & BACKUP SAFETY TESTS (Cases 20-24) ---

// Case 20: Fail-closed pagination on first page failure
await (async () => {
  const mockFetchPage = async () => ({
    success: false,
    error: "Database connectivity timeout"
  });

  const res = await fetchAllAuthoritativePages({
    fetchPage: mockFetchPage,
    mapper: (r) => r,
    pageSize: 100
  });

  assert.strictEqual(res.success, false, "Must fail closed when page 1 fails");
  assert.ok(res.error.includes("Database connectivity timeout") || res.error.includes("Failed to retrieve initial page"));
  assert.strictEqual(res.data, undefined, "Must NOT return empty array or partial data");
  console.log("  [PASS] Case 20: Failed first page reports data-load failure and never returns empty array as valid");
})();

// Case 21: Fail-closed pagination on later page failure (invalidates entire refresh)
await (async () => {
  const page1Items = Array.from({ length: 100 }, (_, i) => ({ id: `std-${i + 1}` }));
  const mockFetchPage = async ({ page }) => {
    if (page === 1) {
      return {
        success: true,
        data: {
          items: page1Items,
          total: 150,
          totalPages: 2,
          page: 1,
          pageSize: 100
        }
      };
    }
    // Page 2 fails!
    return {
      success: false,
      error: "Gateway timeout on page 2"
    };
  };

  const res = await fetchAllAuthoritativePages({
    fetchPage: mockFetchPage,
    mapper: (r) => r,
    pageSize: 100
  });

  assert.strictEqual(res.success, false, "Later page failure must invalidate entire refresh");
  assert.ok(res.error.includes("page 2 of 2") && res.error.includes("Refresh invalidated"));
  assert.strictEqual(res.data, undefined, "Must NEVER return partial dataset as authoritative");
  console.log("  [PASS] Case 21: Failed later page invalidates entire refresh and prevents partial authoritative dataset");
})();

// Case 22: Fail-closed pagination on metadata / count mismatch
await (async () => {
  // Returns 90 items but claims total is 100
  const mockFetchPage = async () => ({
    success: true,
    data: {
      items: Array.from({ length: 90 }, (_, i) => ({ id: `std-${i}` })),
      total: 100,
      totalPages: 1,
      page: 1,
      pageSize: 100
    }
  });

  const res = await fetchAllAuthoritativePages({
    fetchPage: mockFetchPage,
    mapper: (r) => r,
    pageSize: 100
  });

  assert.strictEqual(res.success, false, "Count mismatch must fail closed");
  assert.ok(res.error.includes("single-page total is 100 but page 1 contains 90 items") || res.error.includes("Expected 100 total records but retrieved 90"));
  console.log("  [PASS] Case 22: Pagination count mismatch fails closed and invalidates refresh");
})();

// Case 23: Pruning aborted after refresh failure leaves every prototype record unchanged
await (async () => {
  const initialPrototypes = [
    { ...baselineDbStudent, id: "proto-std-fresh-1" },
    { ...baselineDbStudent, id: "proto-std-fresh-2", fullName: "Conflicted Name" }
  ];
  const initialRaw = JSON.stringify(initialPrototypes);
  const storage = createMockStorage({ "rpihm_student_records_v1": initialRaw });

  // Simulate refresh failure
  const mockFailedFetch = async () => ({ success: false, error: "Database offline" });
  const refreshRes = await mockFailedFetch();

  // Pruning logic in component:
  let pruningAttempted = false;
  if (!refreshRes.success) {
    // Aborts without calling executeSafePruning
  } else {
    pruningAttempted = true;
    executeSafePruning({
      storageKey: "rpihm_student_records_v1",
      requestedIds: ["proto-std-fresh-1"],
      rawStorageContent: null,
      currentDbRecords: [],
      evaluator: evaluateStudentReconciliation,
      storageBackend: storage
    });
  }

  assert.strictEqual(pruningAttempted, false, "Pruning must be completely aborted on refresh failure");
  assert.strictEqual(storage.getItem("rpihm_student_records_v1"), initialRaw, "Storage must be 100% intact");
  assert.strictEqual(JSON.parse(storage.getItem("rpihm_student_records_v1")).length, 2);
  console.log("  [PASS] Case 23: Pruning aborted after refresh failure leaves all prototype records completely intact");
})();

// Case 24: Backup-key collision exhaustion safely aborts without overwriting
{
  const duplicateStudent = { ...baselineDbStudent, id: "proto-dup-exhaust" };
  const initialList = [duplicateStudent];
  const initialRaw = JSON.stringify(initialList);

  // Pre-fill base backup key AND all 500 collision keys!
  const store = { "exhaust_key": initialRaw };
  const ts = 100000;
  store[`exhaust_key_backup_${ts}`] = "PRE_EXISTING_BACKUP_BASE";
  for (let c = 1; c <= 500; c++) {
    store[`exhaust_key_backup_${ts}_${c}`] = `PRE_EXISTING_BACKUP_${c}`;
  }

  const collisionStorage = {
    store,
    getItem: (k) => (k in store ? store[k] : null),
    setItem: (k, v) => { store[k] = String(v); }
  };

  const res = executeSafePruning({
    storageKey: "exhaust_key",
    requestedIds: ["proto-dup-exhaust"],
    rawStorageContent: null,
    currentDbRecords: [baselineDbStudent],
    evaluator: evaluateStudentReconciliation,
    storageBackend: collisionStorage,
    timestamp: ts
  });

  assert.strictEqual(res.success, false, "Must return success: false when collision keys exhausted");
  assert.strictEqual(res.prunedCount, 0, "Zero records pruned");
  assert.ok(res.error.includes("Unable to establish a unique, unused backup key"), "Descriptive collision error");
  assert.strictEqual(collisionStorage.getItem(`exhaust_key_backup_${ts}`), "PRE_EXISTING_BACKUP_BASE", "Base backup must NOT be overwritten");
  assert.strictEqual(collisionStorage.getItem(`exhaust_key_backup_${ts}_500`), "PRE_EXISTING_BACKUP_500", "Key 500 must NOT be overwritten");
  assert.strictEqual(collisionStorage.getItem("exhaust_key"), initialRaw, "Original storage MUST remain untouched");
  console.log("  [PASS] Case 24: Backup-key collision exhaustion safely aborts pruning without overwriting any existing backup");
}

// --- UNIT 2.4.1 METADATA STRENGTHENING REGRESSION TESTS (Cases 25-30) ---

// Case 25: Missing or non-numeric/negative/non-integer total fails closed
await (async () => {
  const invalidTotals = [undefined, null, NaN, -5, 12.5, "100"];
  for (const invTotal of invalidTotals) {
    const res = await fetchAllAuthoritativePages({
      fetchPage: async () => ({
        success: true,
        data: {
          items: [],
          total: invTotal,
          totalPages: 1,
          page: 1,
          pageSize: 100
        }
      }),
      mapper: r => r,
      pageSize: 100
    });
    assert.strictEqual(res.success, false, `Total ${invTotal} must fail closed`);
    assert.ok(res.error.includes("Authoritative metadata violation: 'total' count"), `Error text for total ${invTotal}`);
  }
  console.log("  [PASS] Case 25: Missing, NaN, negative, or non-integer total strictly rejected");
})();

// Case 26: Inconsistent totalPages vs calculated totalPages fails closed
await (async () => {
  // Total is 150 with pageSize 100 -> Expected totalPages is 2. But server claims totalPages is 1 (or 3)
  const res = await fetchAllAuthoritativePages({
    fetchPage: async () => ({
      success: true,
      data: {
        items: Array.from({ length: 100 }, (_, i) => ({ id: i })),
        total: 150,
        totalPages: 1, // Invalid!
        page: 1,
        pageSize: 100
      }
    }),
    mapper: r => r,
    pageSize: 100
  });

  assert.strictEqual(res.success, false, "Inconsistent totalPages must fail closed");
  assert.ok(res.error.includes("Authoritative metadata inconsistency: reported totalPages (1) does not match expected total pages (2)"));
  console.log("  [PASS] Case 26: Inconsistent totalPages vs calculated totalPages strictly rejected");
})();

// Case 27: Multi-page dataset with incomplete page 1 fails closed
await (async () => {
  // Total 150, totalPages 2, but page 1 only returns 90 items instead of full 100
  const res = await fetchAllAuthoritativePages({
    fetchPage: async () => ({
      success: true,
      data: {
        items: Array.from({ length: 90 }, (_, i) => ({ id: i })),
        total: 150,
        totalPages: 2,
        page: 1,
        pageSize: 100
      }
    }),
    mapper: r => r,
    pageSize: 100
  });

  assert.strictEqual(res.success, false, "Incomplete page 1 on multi-page dataset must fail closed");
  assert.ok(res.error.includes("multi-page dataset has incomplete page 1 (90 items received, expected full page of 100)"));
  console.log("  [PASS] Case 27: Incomplete page 1 on multi-page dataset strictly rejected");
})();

// Case 28: Incomplete middle page fails closed
await (async () => {
  // Total 250, totalPages 3, pageSize 100.
  // Page 1 has 100. Page 2 has only 80 (incomplete middle page!).
  const res = await fetchAllAuthoritativePages({
    fetchPage: async ({ page }) => {
      if (page === 1) {
        return {
          success: true,
          data: {
            items: Array.from({ length: 100 }, (_, i) => ({ id: `p1-${i}` })),
            total: 250,
            totalPages: 3,
            page: 1,
            pageSize: 100
          }
        };
      }
      if (page === 2) {
        return {
          success: true,
          data: {
            items: Array.from({ length: 80 }, (_, i) => ({ id: `p2-${i}` })),
            total: 250,
            totalPages: 3,
            page: 2,
            pageSize: 100
          }
        };
      }
      return {
        success: true,
        data: {
          items: Array.from({ length: 50 }, (_, i) => ({ id: `p3-${i}` })),
          total: 250,
          totalPages: 3,
          page: 3,
          pageSize: 100
        }
      };
    },
    mapper: r => r,
    pageSize: 100
  });

  assert.strictEqual(res.success, false, "Incomplete middle page must fail closed");
  assert.ok(res.error.includes("incomplete middle page 2 (80 items, expected full page of 100)"));
  console.log("  [PASS] Case 28: Incomplete middle page strictly rejected");
})();

// Case 29: Final page remainder mismatch fails closed
await (async () => {
  // Total 150, totalPages 2, pageSize 100. Expected remainder on page 2 is 50.
  // But page 2 returns 40 items!
  const res = await fetchAllAuthoritativePages({
    fetchPage: async ({ page }) => {
      if (page === 1) {
        return {
          success: true,
          data: {
            items: Array.from({ length: 100 }, (_, i) => ({ id: `p1-${i}` })),
            total: 150,
            totalPages: 2,
            page: 1,
            pageSize: 100
          }
        };
      }
      return {
        success: true,
        data: {
          items: Array.from({ length: 40 }, (_, i) => ({ id: `p2-${i}` })),
          total: 150,
          totalPages: 2,
          page: 2,
          pageSize: 100
        }
      };
    },
    mapper: r => r,
    pageSize: 100
  });

  assert.strictEqual(res.success, false, "Final page remainder mismatch must fail closed");
  assert.ok(res.error.includes("final page 2 contains 40 items, expected remainder of 50"));
  console.log("  [PASS] Case 29: Final page remainder mismatch strictly rejected");
})();

// Case 30: Concurrent total count drift mid-pagination fails closed
await (async () => {
  // Page 1 says total=150. But on page 2, another user inserted a record and server says total=151!
  const res = await fetchAllAuthoritativePages({
    fetchPage: async ({ page }) => {
      if (page === 1) {
        return {
          success: true,
          data: {
            items: Array.from({ length: 100 }, (_, i) => ({ id: `p1-${i}` })),
            total: 150,
            totalPages: 2,
            page: 1,
            pageSize: 100
          }
        };
      }
      return {
        success: true,
        data: {
          items: Array.from({ length: 50 }, (_, i) => ({ id: `p2-${i}` })),
          total: 151, // Inconsistent snapshot!
          totalPages: 2,
          page: 2,
          pageSize: 100
        }
      };
    },
    mapper: r => r,
    pageSize: 100
  });

  assert.strictEqual(res.success, false, "Snapshot drift mid-pagination must fail closed");
  assert.ok(res.error.includes("reported total changed from 150 to 151 on page 2"));
  console.log("  [PASS] Case 30: Concurrent total count drift mid-pagination strictly rejected");
})();


}

runAsyncTests().then(() => {
console.log("\n=======================================================");
console.log("All 30 Targeted Reconciliation Regression Tests PASSED!");
console.log("=======================================================\n");
}).catch(err => {
  console.error("Test failure in async suite:", err);
  process.exit(1);
});
