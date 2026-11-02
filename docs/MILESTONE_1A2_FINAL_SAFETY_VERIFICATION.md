# CampusOS — Milestone 1A.2: Final Import Safety Verification Report
**Institutional Authority:** R.P. Institute of Hospitality & Management (RPIHM), Vasai  
**Affiliation:** University of Mumbai | DTE Code: 3474 | Affiliation Circular: Aff/Recog.I/ICC/2023-24/08  
**Execution Mode:** STRICTLY READ-ONLY (Verification & Safety Design Only — No Database Writes)  
**Date of Audit:** October 30, 2026  
**Artifact Path:** `docs/MILESTONE_1A2_FINAL_SAFETY_VERIFICATION.md`  

---

## Executive Summary & Milestone 1B Authorization Status

This Milestone 1A.2 audit resolves the remaining architectural questions regarding metadata hydration, elective enrolment modeling, SQLite transaction safety, ID generation semantics, and pre/post-import verification criteria.

### Final Readiness Recommendation: **READY FOR MILESTONE 1B** (Awaiting Explicit Authorization)
* **Metadata Hydration:** Comprehensive code audit completed; single centralized enrichment utility designed without schema changes.
* **Elective Enrolment:** `model Enrolment` confirmed to be semester-level; minimum join model specified for Milestone 3.
* **SQLite Journal & Backup Consistency:** Active journal mode confirmed as `DELETE` with zero WAL/SHM sidecars; atomic snapshot via `VACUUM INTO` verified.
* **ID Generation Terminology Corrected:** Confirmed random UUID v4 with strict unique code indexing; duplicate prevention and rerun safety mathematically guaranteed.
* **Baseline Preservation:** All 7 unverified baseline subjects preserved without modification or artificial tags.

---

## 1. Metadata Hydration & Subject Retrieval Path Audit

### 1. Codebase Audit of All Subject Retrieval Paths
A comprehensive static analysis across `src/` identified every path that retrieves `Subject` records:

| File Path | Query Method | Direct / Bypassed | Purpose | Impact on Metadata |
| :--- | :--- | :---: | :--- | :--- |
| [`src/lib/dal/academicRepository.ts:265`](file:///g:/rpihm-campusos/src/lib/dal/academicRepository.ts#L265) | `prisma.subject.findMany` | **Primary** | Central catalog retrieval in `getSubjects(semesterId?)`. Called by `academic-actions.ts`. | Primary consumer of vertical, credits, and elective metadata. |
| [`src/lib/dal/examRepository.ts:547`](file:///g:/rpihm-campusos/src/lib/dal/examRepository.ts#L547) | `prisma.subject.findMany` | **Bypasses `getSubjects()`** | Fetches subjects when populating assessment components for exam sessions. | Needs subject title and credits; vertical metadata is secondary. |
| [`src/lib/dal/facultyRepository.ts:248`](file:///g:/rpihm-campusos/src/lib/dal/facultyRepository.ts#L248) | `prisma.subject.findUnique` | **Bypasses `getSubjects()`** | Validates subject existence and semester match when creating `TeachingAssignment`. | Only requires relational verification (`semesterId`). |
| [`src/lib/dal/timetableRepository.ts:161`](file:///g:/rpihm-campusos/src/lib/dal/timetableRepository.ts#L161) | `prisma.subject.findUnique` | **Bypasses `getSubjects()`** | Validates subject exists and matches division semester when creating `TimetableEntry`. | Only requires relational verification (`semesterId`). |
| [`src/components/modules/AcademicsView.tsx`](file:///g:/rpihm-campusos/src/components/modules/AcademicsView.tsx) | Server Action (`getSubjects`) | Consumes `getSubjects` | Displays curriculum table, credit totals, and course details to administrators. | Needs vertical badges (`Major`, `VSC`, `SEC`) and elective groupings. |
| [`src/components/modules/attendance/AttendanceView.tsx`](file:///g:/rpihm-campusos/src/components/modules/attendance/AttendanceView.tsx) | Via `TimetableEntry.subject` | Relational Join | Displays timetable slot subject name in attendance register. | Requires subject code and title only. |
| [`src/components/modules/examinations/ExaminationsView.tsx`](file:///g:/rpihm-campusos/src/components/modules/examinations/ExaminationsView.tsx) | Via `AssessmentComponent.subject` | Relational Join | Displays subject name in marks entry sheets and result summaries. | Requires subject code and title only. |

### 2. Recommended Metadata-Enrichment Architecture
Because DAL methods outside `academicRepository.ts` query `prisma.subject` directly, enriching only inside `getSubjects()` would create inconsistent DTO contracts.

**The Recommended Single Enrichment Utility:**
Author a lightweight, pure TypeScript utility: [`src/lib/utils/curriculumMetadata.ts`](file:///g:/rpihm-campusos/src/lib/utils/curriculumMetadata.ts):
```typescript
import { CANONICAL_CURRICULUM_MANIFEST, SubjectCurriculumMetadata } from "@/data/canonicalCurriculumManifest";

export interface EnrichedSubject<T> {
  subject: T;
  metadata: SubjectCurriculumMetadata;
  isManifestMatched: boolean;
}

export function enrichSubject<T extends { code: string }>(subject: T): T & { metadata: SubjectCurriculumMetadata; isManifestMatched: boolean } {
  const match = CANONICAL_CURRICULUM_MANIFEST[subject.code];
  if (match) {
    return {
      ...subject,
      metadata: match,
      isManifestMatched: true,
    };
  }
  // Graceful fallback for baseline prototype or custom subjects:
  return {
    ...subject,
    metadata: {
      code: subject.code,
      vertical: "Major",
      electiveGroup: null,
      electiveOption: "Compulsory",
      sourcePdf: "Unverified / Baseline Prototype",
      sourcePage: 0,
      acResolution: "Pre-NEP Seed",
      isVerified: false,
    },
    isManifestMatched: false,
  };
}
```

#### Why This Approach is Reliable:
1. **Zero Database Writes or Schema Changes:** Keeps `prisma/schema.prisma` completely intact.
2. **Missing Entries are Explicitly Detectable:** Any subject in the database not present in the canonical manifest receives `isManifestMatched: false` and `isVerified: false`. The UI can render a distinct subtle indicator (e.g., `"Institutional Seed — Unverified"`).
3. **Universally Callable:** Can be applied in `academicRepository.getSubjects()`, `examRepository`, or directly in UI view mappers.
4. **Implementation Boundary:** This approach is fully specified and ready, but **not yet implemented**, adhering to the read-only mandate.

---

## 2. Elective Enrolment Architecture & Milestone 3 Model Specification

### 1. Actual Prisma `Enrolment` Model Inspection
```prisma
model Enrolment {
  id                       String                   @id @default(uuid())
  studentId                String
  student                  Student                  @relation(fields: [studentId], references: [id], onDelete: Restrict)
  academicYearId           String
  academicYear             AcademicYear             @relation(fields: [academicYearId], references: [id], onDelete: Restrict)
  programmeId              String
  programme                Programme                @relation(fields: [programmeId], references: [id], onDelete: Restrict)
  semesterId               String
  semester                 Semester                 @relation(fields: [semesterId], references: [id], onDelete: Restrict)
  divisionId               String
  division                 Division                 @relation(fields: [divisionId], references: [id], onDelete: Restrict)
  status                   String                   @default("ENROLLED")
  enrolledAt               DateTime                 @default(now())
  updatedAt                DateTime                 @updatedAt
  AttendanceRecord         AttendanceRecord[]
  studentAssessmentEntries StudentAssessmentEntry[]
  examResultSummaries      ExamResultSummary[]
  feeInvoices              StudentFeeInvoice[]

  @@unique([studentId, academicYearId, semesterId])
}
```

### 2. Enrolment Capability Evaluation
- **Finding:** `Enrolment` associates a `Student` with a `Semester` and `Division`. It has **zero direct relations to `Subject`**.
- **Implication:** Under the current schema, all students enrolled in a semester implicitly inherit that semester's compulsory curriculum. `Enrolment` **cannot natively represent an individual student's choice between SEC Option A and SEC Option B**.

### 3. Minimum Specification for Milestone 3 (Course Registration)
In Milestone 3 (SIS Admissions & Student Lifecycle), an additive join model will be introduced without touching the `Subject` table:

```prisma
model StudentSubjectEnrolment {
  id            String    @id @default(uuid())
  enrolmentId   String
  enrolment     Enrolment @relation(fields: [enrolmentId], references: [id], onDelete: Cascade)
  subjectId     String
  subject       Subject   @relation(fields: [subjectId], references: [id], onDelete: Restrict)
  enrolmentType String    @default("COMPULSORY") // COMPULSORY, ELECTIVE_SEC
  enrolledAt    DateTime  @default(now())

  @@unique([enrolmentId, subjectId])
  @@index([subjectId])
}
```
*Current Milestone Decision:* **Zero schema changes in Milestone 1.** Both SEC Option A and Option B are imported into `Subject` as available catalog offerings. Individual student assignment is deferred to Milestone 3.

---

## 3. Database Backup, Concurrency & Rollback Safeguards

### 1. Active SQLite Journal Mode & Sidecar File Audit
Empirical inspection of `G:\rpihm-campusos\prisma\dev.db`:
- **`PRAGMA journal_mode;`** returns **`delete`**. (WAL mode is NOT active).
- **`PRAGMA synchronous;`** returns **`2` (FULL)**.
- **Sidecar Files:** Zero `dev.db-wal` or `dev.db-shm` files exist. Only `dev.db` exists on disk.

### 2. Consistent Snapshot Creation via `VACUUM INTO`
In `delete` journal mode, raw filesystem file-copying during active writes risks capturing torn pages.
To guarantee 100% page-level consistency:
* The pre-import backup will be executed using SQLite's native atomic snapshot command:
  ```sql
  VACUUM INTO 'G:\rpihm-campusos\prisma\dev.db.pre_milestone1b.bak';
  ```
* **Tested & Validated:** Tested on the baseline database; created an exact, uncorrupted, crash-consistent snapshot with `PRAGMA integrity_check` = `['ok']` and 0 foreign-key violations.

### 3. Concurrency & Locking Prevention
To prevent concurrent writes without broad process termination:
1. Verify the specific Next.js development server process (listening on port 3000) is stopped before execution. No unrelated system processes will be affected.
2. The import script will acquire an exclusive write lock at the start of the transaction:
   ```sql
   BEGIN EXCLUSIVE TRANSACTION;
   ```
   In SQLite, `BEGIN EXCLUSIVE` immediately prevents any other reader or writer from modifying the database file until the transaction completes.

### 4. Separation of Transaction Rollback vs Post-Commit Restoration
* **Engine-Level Transaction Rollback (Automatic):**
  If any error occurs during the Prisma / SQLite transaction (constraint violation, invalid foreign key, or script exception), SQLite executes `ROLLBACK`. The database engine reverses all changes in memory; the active `dev.db` file is never altered.
* **Post-Commit Database Restoration (Manual Safeguard):**
  If the transaction commits successfully, but post-commit validation fails (e.g. subject count is not 57, or foreign-key violations are found), restoration is triggered:
  1. Terminate the database connection.
  2. Restore the pre-import snapshot: `Copy-Item dev.db.pre_milestone1b.bak dev.db`.
  3. Validate restored file SHA-256 equals `59566fced813d3da161edaaaa9b7f6d621edae987e89e9c2a353eed73a11035a`.

---

## 4. ID Generation & Rerun Deduplication Guarantee

### 1. UUID v4 Terminology Correction
* Milestone 1A incorrectly used the phrase "deterministic UUID v4".
* **Correction:** UUID v4 (RFC 4122) is **cryptographically random**, generated via `crypto.randomUUID()`. Deterministic UUIDs use UUID v5 (SHA-1 hashing against a namespace).

### 2. Rerun Safety & Deduplication
Regardless of whether IDs are randomly generated or static, **rerunning the import cannot generate duplicates or overwrite existing subjects**:
1. **Prisma Pre-Check:** The script executes `prisma.subject.findUnique({ where: { code } })` for each manifest item. If the subject code exists, it is **skipped** without modification.
2. **Database-Level Constraint:** In `prisma/schema.prisma` and SQLite:
   ```sql
   CREATE UNIQUE INDEX "Subject_code_key" ON "Subject"("code");
   ```
   If an insert were attempted for an existing code, SQLite throws an immediate unique constraint error and aborts the transaction before commit.
3. **Zero Overwrite Risk:** The script uses pure `INSERT` statements, never `UPDATE` or `UPSERT`. Existing subjects are completely immutable.

---

## 5. Status of the Seven Baseline Records

The active database contains exactly 7 pre-existing subject records:
`FP-101`, `FBM-101`, `HYG-101`, `AI-101`, `IT-101`, `CS-101`, `BAK-101`.

* **Confirmed State:** These 7 records remain untouched.
* **No Artificial Tags:** They do not contain any synthetic columns (e.g., `isDemo`) or provenance registry links.
* **Status Classification:** They are officially classified as **Unverified (Prototype Seed Data)**.
* **Catalog Coexistence:** At runtime, `enrichSubject()` tags them with `isVerified: false` and `isManifestMatched: false`, ensuring administrative transparency without altering the database.

---

## 6. Milestone 1B Final Execution Sequence & Validation Criteria

### Execution Sequence:
```
[Pre-Flight 1]  Verify no dev server running on port 3000.
[Pre-Flight 2]  Execute VACUUM INTO 'prisma/dev.db.pre_milestone1b.bak'.
[Pre-Flight 3]  Compute SHA-256 of active DB & backup (Verify 59566fce...).
[Pre-Flight 4]  Run PRAGMA integrity_check & foreign_key_check on backup.
       │
       ▼
[Execution]     Execute prisma.$transaction (or atomic SQLite transaction):
                - For each of 50 manifest entries:
                  - Verify code does not exist in DB.
                  - INSERT INTO Subject (id, code, title, credits, subjectType, semesterId, createdAt, updatedAt).
                - Commit transaction.
       │
       ▼
[Post-Audit 1]  Verify SELECT COUNT(*) FROM Subject === 57 (7 baseline + 50 new).
[Post-Audit 2]  Verify PRAGMA foreign_key_check returns 0 violations.
[Post-Audit 3]  Verify PRAGMA integrity_check returns 'ok'.
[Post-Audit 4]  Verify all 50 codes exist and map to correct semesterId.
[Post-Audit 5]  Run npx tsc --noEmit (Ensure 0 TypeScript errors).
```

### Pre-Import Validation Criteria (Gate 1):
- Active DB SHA-256 matches baseline hash (`59566fce...`).
- Baseline subject count equals exactly 7.
- Zero foreign-key violations in active DB.

### Post-Import Validation Criteria (Gate 2):
- Subject table count equals exactly 57.
- Exactly 50 new subjects added; 7 baseline subjects remain identical.
- Zero foreign-key violations.
- `npx tsc --noEmit` exits with code 0.

---

## Conclusion & Awaiting Explicit Approval

All safety verifications, query path audits, enrolment analyses, SQLite snapshot procedures, and rerun deduplication guarantees are established.

**Antigravity stands ready and is awaiting your explicit instruction before performing Milestone 1B.**
