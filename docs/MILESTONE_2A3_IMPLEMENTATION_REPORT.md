# CAMPUSOS ERP — MILESTONE 2A.3 IMPLEMENTATION REPORT
## Student Document Management & Verification Engine (Hardened & Reconciled)
**Subsystem:** Student Information System (SIS)  
**Milestone:** 2A.3  
**Status:** **CLOSED AND ACCEPTED FOR DEVELOPMENT AND ISOLATED VERIFICATION**  
*(Production document storage and institutional policy approval remain pending. Sensitive-document production rollout: Not Approved)*  
**Date:** November 1, 2026  
**Engineer:** Lead Implementation Engineer (Antigravity)  
**Product Direction:** ChatGPT (Product Architect & Creative Director)

---

## 1. Executive Summary & Subsystem Status

Milestone 2A.3 establishes an institutional-grade **Student Document Management & Verification Engine** integrated into the 360° Student Dossier (`/modules/students/[id]`). This capability empowers authorized institutional staff (`SYSTEM_ADMIN`, `ACADEMIC_ADMIN`) to securely receive, inspect, approve, reject with mandatory justification, replace with version superseding, and audit student verification credentials (Aadhaar cards, HSC/SSC marksheets, transfer certificates, migration certificates, caste certificates, etc.).

All code development and test executions were conducted strictly against `prisma/isolated_test.db` and isolated storage (`storage/isolated_test_documents`). The operational production baseline database (`prisma/dev.db`) was preserved with cryptographic invariance throughout all testing and browser verification journeys:
- **`prisma/dev.db` SHA-256 Baseline:** `86ff618cc96c421591237b0f589945644540868e6d151c2db789d3a4d7399e41`
- **`prisma/dev.db` SHA-256 Post-Run:** `86ff618cc96c421591237b0f589945644540868e6d151c2db789d3a4d7399e41` (Invariant)
- **Primary Automated Test Suite:** 53 / 53 Assertions Passed (0 Failures)
- **Boundary-Level Authorization Suite:** 30 / 30 Assertions Passed (0 Failures)
- **Closure Checks Verification Suite:** 10 / 10 Assertions Passed (0 Failures)
- **Combined Automated Verification:** **93 / 93 Assertions Passed (100% Pass Rate)**
- **Real Browser Verification (CDP):** 15 High-Resolution Screenshots Captured
- **Static Analysis & Production Gates:** 0 TypeScript Errors (`tsc --noEmit`), 0 ESLint Errors (`npm run lint`), Turbopack Production Build Succeeded (`npm run build`).

### Institutional Readiness Classification
- **Development implementation:** Delivered.
- **Isolated functional verification:** Reported passed.
- **Production storage integration:** Pending (requires persistent cloud storage adapter).
- **Institutional policy approval:** Pending (programme-specific document requirements not yet codified).
- **Sensitive-document production rollout:** **NOT APPROVED** (requires production infrastructure controls).

---

## 2. Stage 0 Architecture Review: Required Corrections & Hardening

### 2.1 Correction 1: Preserving Verification History & Restrictive Deletion (`onDelete: Restrict`)
- **Foreign Key Restrictive Deletion:** The relationships `StudentDocument.student -> Student` and `StudentDocumentVerification.document -> StudentDocument` are configured with `onDelete: Restrict`. 
  - Destructive deletion of a student record with associated documents throws a foreign key constraint violation (`Foreign key constraint violated: \`foreign key\`` / `P2003`), preventing accidental cascading destruction of institutional compliance history.
  - Student records with document history must be archived/deactivated (`status: INACTIVE` or `ALUMNI`) rather than destructively removed.
- **Non-Destructive Replacement & Versioning:** When an updated document is uploaded, the existing active document is preserved with `isArchived: true` and `status: SUPERSEDED`. The new document record increments `version: 2` and sets `replacedDocumentId` pointing back to its predecessor.
- **Audit Decision Preservation:** All historical verification decisions (`VERIFIED`, `REJECTED`, `PENDING_VERIFICATION`) and reviewer notes remain permanently preserved in the `StudentDocumentVerification` audit log.

### 2.2 Correction 2: Strict Storage Path Confinement (`path.relative`)
- Path traversal attacks are systematically thwarted using `path.relative(this.storageRoot, targetPath)`.
- Keys containing `..`, null bytes (`\0`), absolute paths (`C:\...` or `/...`), or resolving outside the normalized root are rejected immediately with `SecurityError: Path traversal attempt detected`.
- Storage keys are generated server-side using cryptographically random hex tokens: `students/{studentId}/{category}_{randomBytes(16)}.{ext}`. Client-provided filenames are never trusted as filesystem storage paths.

### 2.3 Correction 3: Filesystem / Database Consistency & Compensating Cleanup
- Prisma transactions cannot roll back external filesystem writes. An explicit multi-phase compensating sequence is implemented:
  1. **Pre-flight Validation:** Buffer size, magic bytes signature, and MIME type consistency validated.
  2. **Storage Write:** Binary written to private storage root under a randomized token key.
  3. **Metadata Transaction:** Prisma transaction creates `StudentDocument` and initial `StudentDocumentVerification` audit entry.
  4. **Compensating Rollback:** If the database transaction fails (e.g. foreign key error or timeout), the file is removed from private storage via `storageProvider.deleteDocument(storageKey)`.
  5. **Actionable Alert:** If storage deletion fails during rollback, an actionable structured alert `[ORPHAN_STORAGE_ALERT]` is emitted with document ID, storage key, and student ID for automated reconciliation. Cross-system ACID atomicity is never falsely claimed.

### 2.4 Correction 4: Production Storage Safeguards & Serverless Decoupling
- **Vercel Ephemeral Filesystem Safeguard:** CampusOS is deployed through Vercel's serverless infrastructure where local disk persistence cannot be assumed.
- Provider-independent interface `DocumentStorageProvider` created in `src/lib/storage/index.ts`.
- `LocalPrivateStorageProvider` fails closed in production:
  ```typescript
  if (process.env.NODE_ENV === "production" && !process.env.ALLOW_LOCAL_STORAGE_IN_PROD && process.env.APP_ENV !== "test") {
    throw new Error("Production storage safety violation: LocalPrivateStorageProvider cannot be used in production on ephemeral serverless hosting without verified cloud storage configuration.");
  }
  ```

### 2.5 Correction 5: Permission Matrix Reconciliation & Active Role Alignment
- **Active Role Architecture Source of Truth:**
  The system strictly enforces the four active institutional roles defined in `src/lib/auth/roles.ts`:
  1. `SYSTEM_ADMIN`: Global institutional administration; holds `UPLOAD_STUDENT_DOCUMENTS`, `VERIFY_STUDENT_DOCUMENTS`, `ADMIN_ALL`.
  2. `ACADEMIC_ADMIN`: Academic institutional administration; holds `UPLOAD_STUDENT_DOCUMENTS`, `VERIFY_STUDENT_DOCUMENTS`, `MANAGE_ACADEMICS`.
  3. `FACULTY_MEMBER`: Teaching faculty; **DOES NOT HOLD** document upload, verification, or blanket document access permissions. Scoped strictly to classroom operations (`RECORD_ATTENDANCE`, `ENTER_MARKS`, `VIEW_RESULTS`).
  4. `STUDENT_VIEWER`: Student personal portal; holds `UPLOAD_STUDENT_DOCUMENTS` strictly scoped to `session.studentId === requestedStudentId`. Students are **strictly prohibited** from verifying or rejecting documents.
- **Planned Roles Kept Distinct:** Roles such as `HOD` (Head of Department) and `FINANCE_OFFICER` are cataloged in the IAM roadmap for Milestone 2B and are not activated prematurely. Registrar and Academic Coordinator designations map onto `SYSTEM_ADMIN` and `ACADEMIC_ADMIN` operational roles.

---

## 3. Student Identity Coverage Audit & Reconciliation

A comprehensive read-only audit of both the operational database and isolated test database was conducted:

| Metric | Operational Database (`prisma/dev.db`) | Isolated Test Database (`prisma/isolated_test.db`) |
| :--- | :---: | :---: |
| **Total Student Records** | **13** | **13** |
| **Total UserAccount Records** | **2** | **3** |
| **Accounts with Role `STUDENT_VIEWER`** | **0** | **1** |
| **Student Profiles Linked to UserAccount** | **0 (0.0%)** | **1 (7.7%)** |
| **Unlinked Student Profiles** | **13 (100.0%)** | **12 (92.3%)** |
| **Orphaned Student Links** | **0** | **0** |
| **Duplicate Identity Links** | **0** | **0** |

### Clarification of Coverage Discrepancy
- The operational database (`dev.db`) contains exactly **13 student records** across 7 programmes and **2 staff accounts** (`admin.local@sample.rpihm.ac.in` and `k.sharma@sample.rpihm.ac.in`). Exactly **0 out of 13 operational students** have linked login accounts.
- The isolated test database (`isolated_test.db`) contains 13 baseline student records plus 1 test student account (`student.viewer.doc@sample.rpihm.ac.in`) linked to Khan Umar (`2026DS041`) for automated test fixtures (7.7% linkage).
- An earlier report cited "1 of 14" because a transient test student (`DOC-TEST-2026-002`, Pooja Deshmukh) was temporarily created during test suite execution prior to cleanup. The actual baseline student count in both databases is consistently **13**.
- **No student accounts were modified or created in `prisma/dev.db`.** Bulk student account onboarding remains formally phased for Milestone 2B.

---

## 4. Configurable Document Categories (Non-Mandatory Technical Catalog)

The nine institutional document categories represent a **configurable technical catalog**, not an assumed mandatory compliance checklist:
1. `IDENTITY_PROOF` — Aadhaar / Passport / Voter ID
2. `PASSPORT_PHOTO` — Passport-Size Photograph
3. `PREVIOUS_MARKSHEET` — Previous Academic Marksheet / Passing Certificate
4. `LEAVING_CERTIFICATE` — Leaving / Transfer Certificate (LC/TC)
5. `MIGRATION_CERTIFICATE` — Migration Certificate
6. `CASTE_CERTIFICATE` — Caste / Category Certificate
7. `DOMICILE_CERTIFICATE` — Domicile / Nationality Certificate
8. `ADMISSION_APPLICATION` — Institutional Admission Application Form
9. `OTHER` — Other Supporting Document

### UI Non-Mandatory Alignment
- In `StudentDocumentsTab.tsx`, the section header is presented as **"Configurable Document Categories"** with an institutional policy note:  
  *"Institutional technical categories. Unprovided categories are optional/unconfigured unless mandated by specific programme admission policy."*
- Unprovided categories display status **"Not Uploaded (Optional)"** rather than "Missing", ensuring students and administrators are not falsely warned of a compliance failure when an optional category (e.g. Caste Certificate or Migration Certificate) is not required for a general-category student.

---

## 5. Boundary-Level Authorization Test Results

A dedicated boundary test suite ([scripts/test_boundary_authorization_suite.ts](file:///g:/rpihm-campusos/scripts/test_boundary_authorization_suite.ts)) was executed against the HTTP download route handler (`/api/students/[id]/documents/[docId]/download`) and server actions (`uploadStudentDocumentAction`, `verifyStudentDocumentAction`, `replaceStudentDocumentAction`, `getStudentDocumentsAction`).

### Boundary Test Suite Execution Summary
- **Total Assertions:** 30
- **Passed:** 30
- **Failed:** 0
- **Pass Rate:** 100.0%

```
=================================================================
CAMPUSOS ERP: MILESTONE 2A.3 BOUNDARY AUTHORIZATION TEST SUITE
=================================================================
Baseline dev.db SHA-256: 86ff618cc96c421591237b0f589945644540868e6d151c2db789d3a4d7399e41

[FIXTURE SETUP: Test Identities in Isolated Database]
  PASS: Authenticated session tokens created for all test personas
  PASS: Document seeded for Student A
  PASS: Document seeded for Student B

[SCENARIO 1: Unauthenticated Download Protection]
  PASS: Unauthenticated download request rejected with HTTP 401 Unauthorized

[SCENARIO 2: Student Self-Service Download (Authorized)]
  PASS: Student A downloading their own document succeeds with HTTP 200 OK
  PASS: Downloaded file has correct Content-Type header
  PASS: Content-Disposition includes safe filename

[SCENARIO 3: Tampered Student ID in Download URL]
  PASS: Tampered student ID in URL rejected with HTTP 404/403

[SCENARIO 4: Cross-Student IDOR Download Attempt]
  PASS: Student A attempting to download Student B document rejected with HTTP 403 Forbidden
  PASS: Rejection error explicitly cites cross-student access denial

[SCENARIO 5: Cross-Student Upload Tampering]
  PASS: Student A attempting to upload document for Student B rejected with FORBIDDEN
  PASS: Error message confirms self-student record confinement

[SCENARIO 6: Student Verification Escalation Attempt]
  PASS: Student attempting to approve/verify document rejected with FORBIDDEN
  PASS: Error message confirms missing VERIFY_STUDENT_DOCUMENTS privilege

[SCENARIO 7: Faculty Unauthorized Verification Attempt]
  PASS: Faculty attempting to verify student document rejected with FORBIDDEN
  PASS: Error confirms faculty lacks document verification permission

[SCENARIO 8: Authorized Staff Verification (Allowed)]
  PASS: Authorized Administrator successfully verifies document
  PASS: Document status updated to VERIFIED in database

[SCENARIO 9: Forged Reviewer Identity Parameter Ignored]
  PASS: Verification action succeeds using authenticated session
  PASS: Verification audit entry created
  PASS: Reviewer identity strictly taken from session (adminUser.id), forged client ID ignored

[SCENARIO 10: Cross-Student Document Replacement Blocked]
  PASS: Student A attempting to replace Student B document rejected with FORBIDDEN
  PASS: Error confirms profile ownership check

[SCENARIO 11: Faculty Blanket Document Access Denied]
  PASS: Faculty denied download of student document with HTTP 403 Forbidden
  PASS: Faculty denied student documents list with FORBIDDEN

[SCENARIO 12: Restrictive Deletion Semantics (Student Deletion Blocked)]
  PASS: Destructive deletion of student with documents blocked by restrictive foreign key
  PASS: Prisma throws restrictive foreign key constraint failure (onDelete: Restrict)
  PASS: Student A record preserved intact in database
  PASS: Student A document records preserved intact in database

Post-Run dev.db SHA-256: 86ff618cc96c421591237b0f589945644540868e6d151c2db789d3a4d7399e41
  PASS: Operational database (dev.db) remained completely invariant throughout boundary test suite

=================================================================
BOUNDARY SUITE RESULTS: 30/30 Passed (0 Failed)
=================================================================
```

---

## 6. Primary Automated Test Suite Results

The primary automated test suite ([scripts/test_milestone2a3_suite.ts](file:///g:/rpihm-campusos/scripts/test_milestone2a3_suite.ts)) was executed against `prisma/isolated_test.db` and isolated storage.

### Primary Suite Execution Summary
- **Total Assertions:** 53
- **Passed:** 53
- **Failed:** 0
- **Pass Rate:** 100.0%

All 53 assertions passed covering:
- Production Storage Safeguards & Decoupling (5 assertions)
- Storage Path Confinement & Traversal Defenses (13 assertions)
- Binary Inspection, Magic Bytes & File Validation (13 assertions)
- End-to-End Document Lifecycle & Verification Engine (19 assertions)
- Record-Level Authorization & Identity Audit (3 assertions)

---

## 7. Real Browser Verification Journey (CDP)

15 high-resolution screenshots were captured via Microsoft Edge CDP ([scripts/run_browser_verification_m2a3.ts](file:///g:/rpihm-campusos/scripts/run_browser_verification_m2a3.ts)):

| ID | Screenshot Filename | Verification Subject & Visual Details |
| :---: | :--- | :--- |
| **01** | `m2a3_01_student_dossier_tab_nav.png` | 360° Dossier rendering "Documents & Verification" in TabBar with counter badge. |
| **02** | `m2a3_02_documents_tab_empty_state.png` | 4 KPI summary cards (Total: 0, Verified: 0, Pending: 0, Rejected: 0) and empty document table. |
| **03** | `m2a3_03_upload_document_modal.png` | Category selector, drag-and-drop zone, file size bounds guidance. |
| **04** | `m2a3_04_document_pending_review.png` | Active document row displaying version `v1` and amber `PENDING_VERIFICATION` badge. |
| **05** | `m2a3_05_category_checklist_updated.png` | Configurable category cards showing 1 of 9 provided, Identity Proof highlighted in amber. |
| **06** | `m2a3_06_verification_modal_approve.png` | Institutional verification modal with Approve/Reject decision radio buttons. |
| **07** | `m2a3_07_verified_status_badge.png` | Green `VERIFIED` status badge rendered, Verified KPI counter incremented to `1`. |
| **08** | `m2a3_08_rejection_modal_with_reason.png` | Rejection flow with mandatory justification field highlighted with red border. |
| **09** | `m2a3_09_rejected_status_badge.png` | Red `REJECTED` status badge rendered, Rejected KPI counter incremented to `1`. |
| **10** | `m2a3_10_replace_modal_history_notice.png` | Revision modal with notice: "Replacing this document will archive Version 1 and retain its full verification history." |
| **11** | `m2a3_11_replacement_v2_created.png` | New active document row created at `v2` in `PENDING_VERIFICATION` pointing to superseded predecessor. |
| **12** | `m2a3_12_superseded_version_preserved.png` | Filtering by "Superseded" shows Version 1 intact with gray `SUPERSEDED` badge and audit trail button. |
| **13** | `m2a3_13_audit_trail_timeline.png` | Chronological audit timeline drawer displaying reviewer names, timestamps, and notes. |
| **14** | `m2a3_14_student_viewer_permissions.png` | Logged in as student: verification actions hidden, self-service upload/view only. |
| **15** | `m2a3_15_mobile_responsive_documents.png` | Responsive 390×844 mobile viewport with 2×2 KPI grid and touch-friendly actions. |

---

## 8. Production Deployment Prerequisites & Future Cloud Storage Roadmap

Before document management can be approved for production rollout with genuine institutional student documents, the following technical and operational requirements must be satisfied:

1. **Persistent Cloud Storage Integration:**
   - Implement an S3-compatible or Google Cloud Storage provider implementing `DocumentStorageProvider`.
   - Execute automated end-to-end cloud upload, retrieval, and compensating cleanup verification.
   - Configure IAM bucket policies with zero public read access (private bucket only).
2. **Encryption at Rest & Key Management:**
   - Server-side encryption (SSE-KMS or AES-256) enabled on the storage bucket.
   - Checksum validation (SHA-256) enforced during upload and streaming retrieval.
3. **Malware Scanning & Upload Security:**
   - Integrate an asynchronous antivirus / malware scanner (e.g. ClamAV daemon, AWS GuardDuty for S3, or VirusTotal API) before documents are marked accessible for review.
4. **Institutional Retention & Archival Policy:**
   - Formulate official RPIHM Document Retention Policy (e.g. mandatory retention for 5 years post-graduation).
   - Configure lifecycle rules for superseded revisions.
5. **Backup & Disaster Recovery:**
   - Multi-region or version-enabled bucket replication with point-in-time recovery testing.
6. **Access Auditing & Monitoring:**
   - Structured audit logging for all document downloads, including client IP, user ID, timestamp, and document checksum.

---

## 9. Verification & Compliance Sign-Off

- **Cryptographic Baseline Invariance:** `prisma/dev.db` SHA-256 remained strictly `86ff618cc96c421591237b0f589945644540868e6d151c2db789d3a4d7399e41` before and after all test suites and browser executions.
- **Quality Gates:**
  - Prisma Schema Validation: Valid (`npx prisma validate`).
  - TypeScript Compilation: 0 errors (`npx tsc --noEmit`).
  - ESLint Static Analysis: 0 errors (`npm run lint`).
  - Turbopack Production Build: Compiled cleanly (`npm run build`).
- **Automated Assertions:** 93 / 93 Passed (100% Pass Rate across Unit, Lifecycle, Boundary Authorization, and Closure Check suites).
- **Milestone 2A.3 Status:** Closed and accepted for development and isolated verification. Production document storage and institutional policy approval remain pending.

---

## 10. Milestone 2A.3 Final Closure Checks & Hardening

Following architectural review for milestone closure, four specific checks were executed and hardened:

### 10.1 Unbypassable Production Local-Storage Restriction
- **Implementation:** [`src/lib/storage/index.ts`](file:///g:/rpihm-campusos/src/lib/storage/index.ts).
- **Hardening:** `LocalPrivateStorageProvider` constructor unconditionally verifies environment markers (`NODE_ENV === "production"`, `VERCEL === "1"`, or `VERCEL_ENV`). No configuration or combination of environment variables—including `APP_ENV=test` or `ALLOW_LOCAL_STORAGE_IN_PROD=1`—can bypass this restriction. In any production environment, attempting to instantiate the local storage provider throws an unrecoverable `Security violation` error immediately, ensuring serverless instances fail closed.
- **Verification:** Tested in `scripts/test_closure_checks.ts` (Subtests 1A, 1B, 1C, 1D). All bypass attempts rejected.

### 10.2 Symlink Escape Protection
- **Implementation:** [`src/lib/storage/index.ts`](file:///g:/rpihm-campusos/src/lib/storage/index.ts) `resolveSafePath`.
- **Hardening:** In addition to lexical `path.relative` checking, `resolveSafePath` performs physical symlink escape defense:
  1. Inspects existing target files using `fs.realpathSync` to ensure real physical paths do not resolve outside `storageRoot`.
  2. For non-existent targets (during write operations), walks up directory ancestors and verifies each existing ancestor via `fs.lstatSync().isSymbolicLink()` and `fs.realpathSync()`.
  3. Prohibits reading, writing, or deleting across symbolic links or Windows directory junctions.
- **Verification:** Tested in `scripts/test_closure_checks.ts` (Subtest 2). Read, write, and delete operations targeting external symlinks/junctions threw `Security violation: Path resolves outside root directory`.

### 10.3 Test Hook (`setTestSessionToken`) Production Lockdown
- **Implementation:** [`src/lib/auth/guards.ts`](file:///g:/rpihm-campusos/src/lib/auth/guards.ts).
- **Hardening:**
  1. `setTestSessionToken` throws a `Security violation` error immediately if invoked when `NODE_ENV === "production"` or `VERCEL === "1"`.
  2. `getCurrentUser` strictly ignores `testSessionToken` when `NODE_ENV === "production"`. In production, user session identity is derived exclusively from verified HTTP session cookies.
- **Verification:** Tested in `scripts/test_closure_checks.ts` (Subtests 3A, 3B). Invocation throws in production, and `getCurrentUser` returns null when ignoring test tokens.

### 10.4 Roadmap & Blueprint Reconciliation
- **Implementation:** [`docs/PHASE_2A_SIS_DISCOVERY_AND_BLUEPRINT.md`](file:///g:/rpihm-campusos/docs/PHASE_2A_SIS_DISCOVERY_AND_BLUEPRINT.md).
- **Hardening:** Stale Mermaid Gantt chart and duplicate milestone descriptions were completely reconciled into a clean, unified Phase 2A roadmap:
  - **Milestone 2A.1:** Foundational SIS Core & 360° Student Dossier — Delivered and accepted.
  - **Milestone 2A.2:** Student Admission, Enrolment & Cohort Progression — Delivered and accepted.
  - **Milestone 2A.3:** Student Document Management & Verification Engine — Closed and accepted for development and isolated verification. Production document storage and institutional policy approval remain pending.
  - **Milestone 2A.4:** Student & Faculty Self-Service Portals — Planned, not started.
  - **Milestone 2B:** Institutional IAM & Bulk Onboarding — Planned, not started.

### 10.5 Closure Verification Suite Results
- Script: [`scripts/test_closure_checks.ts`](file:///g:/rpihm-campusos/scripts/test_closure_checks.ts).
- Results: **10 / 10 assertions passed (0 failed)**.
- Post-run `prisma/dev.db` hash: `86ff618cc96c421591237b0f589945644540868e6d151c2db789d3a4d7399e41` (100% invariant).

