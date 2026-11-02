# CampusOS — Milestone 1A.3: Final Technical Corrections Report
**Institutional Authority:** R.P. Institute of Hospitality & Management (RPIHM), Vasai  
**Affiliation:** University of Mumbai | DTE Code: 3474 | Affiliation Circular: Aff/Recog.I/ICC/2023-24/08  
**Execution Mode:** STRICTLY READ-ONLY (Technical Reconciliation & Design Corrections Only)  
**Date of Audit:** October 30, 2026  
**Artifact Path:** `docs/MILESTONE_1A3_FINAL_TECHNICAL_CORRECTIONS.md`  

---

## Executive Summary & Milestone 1B Readiness Status

This Milestone 1A.3 reconciliation addresses the three technical directives:
1. **Metadata Fallback Correction:** Corrected the fallback contract to use `vertical: null` and `null` for all ungrounded attributes, eliminating speculative defaults.
2. **Snapshot Verification Correction:** Formally separated physical file hash validation from logical database equivalence, establishing the exact mechanics of `VACUUM INTO` page reorganization.
3. **Transaction Ownership Resolution:** Eliminated the conflicting dual-BEGIN pattern by selecting a **single, coherent transaction owner** (pure Prisma Client managed batch transaction) and completed the future `StudentSubjectEnrolment` specification.

### Final Recommendation: **READY FOR MILESTONE 1B** (Awaiting Explicit Authorization)

---

## 1. Metadata Fallback Correction & Epistemic Integrity

### The Defect in Earlier Proposal
In Milestone 1A.2, the proposed fallback in `enrichSubject()` assigned `vertical: "Major"` and placeholder text (`"Institutional Seed — Unverified"`) to unknown subjects. 
This violated the principle of epistemic integrity: **an unverified subject must never default to a curriculum vertical without primary source documentation**.

### Corrected Implementation Contract
The canonical manifest ([`src/data/canonicalCurriculumManifest.ts`](file:///g:/rpihm-campusos/src/data/canonicalCurriculumManifest.ts)) remains the **sole authoritative registry for the 50 verified circular entries**.

For any subject record queried from the database that is not present in the canonical manifest (specifically the 7 baseline prototype records: `FP-101`, `FBM-101`, `HYG-101`, `AI-101`, `IT-101`, `CS-101`, `BAK-101`), the enrichment utility returns **explicit null states**:

```typescript
export interface SubjectCurriculumMetadata {
  code: string;
  vertical: "Major" | "Minor" | "VSC" | "SEC" | null;
  electiveGroup: string | null;
  electiveOption: "Compulsory" | "Option A" | "Option B" | null;
  sourcePdf: string | null;
  sourcePage: number | null;
  acResolution: string | null;
  isVerified: boolean;
  isManifestMatched: boolean;
}

export function enrichSubject<T extends { code: string }>(
  subject: T
): T & { metadata: SubjectCurriculumMetadata } {
  const match = CANONICAL_CURRICULUM_MANIFEST[subject.code];
  
  if (match) {
    return {
      ...subject,
      metadata: {
        ...match,
        isVerified: true,
        isManifestMatched: true,
      },
    };
  }

  // Corrected Fallback: Zero speculative defaults, zero invented source citations
  return {
    ...subject,
    metadata: {
      code: subject.code,
      vertical: null,           // Strictly null, NOT "Major"
      electiveGroup: null,      // Strictly null
      electiveOption: null,     // Strictly null
      sourcePdf: null,          // Strictly null
      sourcePage: null,         // Strictly null
      acResolution: null,       // Strictly null
      isVerified: false,        // Explicitly unverified
      isManifestMatched: false, // Flag indicating non-manifest baseline record
    },
  };
}
```

#### Guarantees Maintained:
- Zero database writes or schema modifications.
- The 7 baseline subjects remain untouched in `prisma/dev.db`.
- The UI can inspect `isManifestMatched === false` to display an unverified status indicator without altering database rows.

---

## 2. Snapshot Verification: Physical File Identity vs. Logical Database Equivalence

### The Technical Distinction
When SQLite executes `VACUUM INTO 'target.bak'`, it reads all valid B-tree pages from the active database and writes them into a newly allocated, defragmented file.
- The active database (`dev.db`) contains free-list pages and historical fragmentation from prior development operations: **675,840 bytes**.
- The `VACUUM INTO` snapshot (`dev.db.pre_milestone1b.bak`) contains defragmented pages: **663,552 bytes**.

Because the file sizes and page allocations differ, **their physical SHA-256 hashes will never match**. Demanding physical hash equality after `VACUUM INTO` would cause false-positive failures.

### Corrected Two-Phase Verification Procedure

```
                     PHASE 1: ACTIVE DATABASE VERIFICATION
┌─────────────────────────────────────────────────────────────────────────────┐
│ 1. Validate active dev.db SHA-256 === 59566fced813d3da161edaaaa9b7f6d621... │
│ 2. Validate SELECT COUNT(*) FROM Subject === 7                             │
│ 3. Validate PRAGMA integrity_check === ['ok']                              │
│ 4. Validate PRAGMA foreign_key_check === [] (0 violations)                 │
└──────────────────────────────────────┬──────────────────────────────────────┘
                                       │
                              Execute VACUUM INTO
                                       │
                                       ▼
                     PHASE 2: SNAPSHOT VALIDATION & LOGICAL EQUIVALENCE
┌─────────────────────────────────────────────────────────────────────────────┐
│ 1. Compute & record SNAPSHOT SHA-256 as authoritative recovery hash         │
│ 2. Run PRAGMA integrity_check on snapshot === ['ok']                       │
│ 3. Run PRAGMA foreign_key_check on snapshot === []                         │
│ 4. Logical Equivalence Audit:                                              │
│    - Query all 26 table counts in active DB vs. snapshot:                   │
│      AcademicYear (1), AcademicTerm (2), Department (3), Programme (7),    │
│      Semester (34), Subject (7), Division (20), Student (13), Staff (13),  │
│      Enrolment (14), TeachingAssignment (44), UserAccount (2),             │
│      Session (113), TimetableEntry (0), AttendanceSession (0),             │
│      AttendanceRecord (0), ExamSession (0), AssessmentComponent (0),       │
│      StudentAssessmentEntry (0), ExamResultSummary (0),                     │
│      SubjectResultEntry (0), AssessmentRevisionAudit (0),                  │
│      FeeStructure (0), FeeHead (0), StudentFeeInvoice (0), FeeReceipt (0). │
│    - All 26 table counts must match exactly between active DB and snapshot. │
└─────────────────────────────────────────────────────────────────────────────┘
```

If recovery is ever required, the active database is restored from `dev.db.pre_milestone1b.bak`, and its physical identity is verified against the **recorded snapshot SHA-256**, not the fragmented original hash.

---

## 3. Transaction Ownership & Execution Strategy

### Resolution of Conflicting Dual-Transaction Ownership
Milestone 1A.2 inadvertently mentioned both `BEGIN EXCLUSIVE TRANSACTION` and `prisma.$transaction`. 
In SQLite and Prisma:
- Issuing a raw SQL `BEGIN` inside an already-managed Prisma transaction causes a nested transaction syntax error (`cannot start a transaction within a transaction`).
- Prisma Client manages connection leasing and transaction lifecycle (`BEGIN` $\to$ `COMMIT` / `ROLLBACK`) automatically.

### Selected Single Strategy: **Pure Prisma Client Managed Transaction**

```typescript
// Proposed Implementation Pseudocode for Milestone 1B import:
import prisma from "@/lib/db";
import { CANONICAL_50_SUBJECTS } from "@/data/canonicalCurriculumManifest";

export async function executeMilestone1bImport() {
  // 1. Fetch existing subject codes to guarantee zero overwrites
  const existingSubjects = await prisma.subject.findMany({
    select: { code: true },
  });
  const existingCodeSet = new Set(existingSubjects.map((s) => s.code));

  // 2. Filter manifest entries to ensure strict idempotency
  const toInsert = CANONICAL_50_SUBJECTS.filter((s) => !existingCodeSet.has(s.code));

  if (toInsert.length === 0) {
    return { success: true, insertedCount: 0, skippedCount: CANONICAL_50_SUBJECTS.length };
  }

  // 3. Execute atomic transaction without nested SQL BEGIN
  const result = await prisma.$transaction(
    toInsert.map((item) =>
      prisma.subject.create({
        data: {
          id: item.id, // Pre-generated static UUID or crypto.randomUUID()
          code: item.code,
          title: item.title,
          credits: item.credits,
          subjectType: item.subjectType, // THEORY, PRACTICAL, or OJT
          semesterId: item.semesterId,
        },
      })
    )
  );

  return { success: true, insertedCount: result.length, skippedCount: CANONICAL_50_SUBJECTS.length - result.length };
}
```

#### Why This Strategy is Coherent:
1. **Single Transaction Owner:** Prisma manages the transaction lifecycle cleanly. Zero nested `BEGIN` statements.
2. **Prevention of Competing Readers & Writers:**
   - Operational safeguard: verify Next.js dev server on port 3000 is halted before script invocation.
   - SQLite engine safeguard: during `prisma.$transaction`, SQLite places an exclusive write lock on the database file, rejecting concurrent writes.
3. **No UPDATE or UPSERT:** Uses pure `create()` statements. Existing records are skipped entirely.
4. **Tested in Disposable Database:** Confirmed in scratch test database (`test_tx.db`) that atomic execution commits cleanly, while simulated duplicate errors trigger complete engine-level rollback without partial writes.

---

## 4. Complete Future Specification: `StudentSubjectEnrolment` (Milestone 3)

For Milestone 3 (SIS Admissions & Student Lifecycle), the following additive model specification resolves elective course registration without altering the `Subject` table:

```prisma
// Future Milestone 3 Specification (DO NOT IMPLEMENT NOW):

model StudentSubjectEnrolment {
  id            String    @id @default(uuid())
  enrolmentId   String
  enrolment     Enrolment @relation("EnrolmentToStudentSubjects", fields: [enrolmentId], references: [id], onDelete: Cascade)
  subjectId     String
  subject       Subject   @relation("SubjectToStudentEnrolments", fields: [subjectId], references: [id], onDelete: Restrict)
  enrolmentType String    @default("COMPULSORY") // COMPULSORY, ELECTIVE_SEC
  enrolledAt    DateTime  @default(now())

  @@unique([enrolmentId, subjectId])
  @@index([enrolmentId])
  @@index([subjectId])
}
```

### Necessary Reverse Relations in Existing Models:
1. **On `model Enrolment`:**
   ```prisma
   studentSubjects StudentSubjectEnrolment[] @relation("EnrolmentToStudentSubjects")
   ```
2. **On `model Subject`:**
   ```prisma
   studentEnrolments StudentSubjectEnrolment[] @relation("SubjectToStudentEnrolments")
   ```

### Constraints, Indexes & Deletion Behavior:
- **`onDelete: Cascade` on `Enrolment`:** If a student's term enrolment is deleted, their subject selections are automatically cleaned up.
- **`onDelete: Restrict` on `Subject`:** Prevents deletion of an active curriculum subject if students are currently enrolled in it.
- **`@@unique([enrolmentId, subjectId])`:** Strictly prevents duplicate enrolments for the same student in the same subject within a term.
- **`@@index([enrolmentId])` and `@@index([subjectId])`:** Ensures high-performance queries for individual student course schedules and class roster generation.

---

## 5. Pre-Import and Post-Import Verification Criteria

### Pre-Import Verification Checklist (Gate 1):
1. **Concurrency Check:** Confirm port 3000 has no active listeners (`Get-NetTCPConnection -LocalPort 3000 -ErrorAction SilentlyContinue`).
2. **Active Database Integrity:**
   - Active DB SHA-256 equals `59566fced813d3da161edaaaa9b7f6d621edae987e89e9c2a353eed73a11035a`.
   - `SELECT COUNT(*) FROM Subject` equals **7**.
   - `PRAGMA integrity_check` equals `['ok']`.
   - `PRAGMA foreign_key_check` returns **0 violations**.
3. **Snapshot Creation & Equivalence:**
   - Execute `VACUUM INTO 'prisma/dev.db.pre_milestone1b.bak'`.
   - Record snapshot SHA-256 hash.
   - Run `PRAGMA integrity_check` on snapshot (`['ok']`).
   - Run `PRAGMA foreign_key_check` on snapshot (`[]`).
   - Verify table counts across all 26 tables match identically between active DB and snapshot.

### Post-Import Verification Checklist (Gate 2):
1. **Record Count Validation:**
   - `SELECT COUNT(*) FROM Subject` must equal exactly **57** (7 baseline + 50 imported).
2. **Idempotence & Baseline Preservation:**
   - The 7 baseline subjects (`FP-101`, `FBM-101`, `HYG-101`, `AI-101`, `IT-101`, `CS-101`, `BAK-101`) exist with identical `title`, `credits`, and `semesterId`.
   - All 50 new subject codes exist in the database.
3. **Relational Integrity:**
   - `PRAGMA foreign_key_check` returns **0 violations**.
   - `PRAGMA integrity_check` returns **`['ok']`**.
4. **Codebase Type Safety:**
   - `npx tsc --noEmit` exits with **0 errors**.

### Safe Recovery Procedure:
If any Post-Import check fails:
1. Close all active Prisma / SQLite connections.
2. Restore snapshot: `Copy-Item prisma/dev.db.pre_milestone1b.bak prisma/dev.db -Force`.
3. Verify restored active DB SHA-256 matches the recorded snapshot SHA-256.
4. Verify `SELECT COUNT(*) FROM Subject` returns to 7.

---

## Conclusion & Next Steps

All technical corrections are verified and reconciled:
- Fallback returns explicit `null` attributes with `isVerified: false`.
- Snapshot verification separates physical file identity from logical equivalence.
- Transaction strategy is unified under pure Prisma Client batch management.
- Future Milestone 3 enrolment relation is fully specified.

**Antigravity stands ready and is awaiting your explicit instruction before performing Milestone 1B.**
