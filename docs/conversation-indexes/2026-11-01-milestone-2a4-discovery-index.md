# CAMPUSOS — CONVERSATION REPORT INDEX
**Cycle:** Milestone 2A.4 — Student & Faculty Self-Service Portals (Stage 0: Discovery, Workflow Mapping & Architecture Blueprint)  
**Date:** 2026-11-01  
**Scope:** Stage 0 Read-Only Architecture Inspection, Operational Database Identity & Data Availability Audit, Real User Workflow Mapping (Student & Faculty Workspaces), Feature Readiness & Authorization Matrix Formulation, Zero-Schema-Change Technical Architecture, Testing Strategy, Phased Implementation Plan, and Next Implementation Stage Prompt.  
**Database Protection Status:** Cryptographically Invariant (SHA-256: `86FF618CC96C421591237B0F589945644540868E6D151C2DB789D3A4D7399E41`, 684,032 bytes)  
**Source Code Changes:** 0 (Strict read-only discovery mandate maintained)

---

## 1. Primary Documentation Deliverables

| # | Document Title | Exact Filename | Full Project Path | Status | Brief Description | Working Relative Markdown Link |
| :- | :--- | :--- | :--- | :--- | :--- | :--- |
| 1 | **Phase 2A.4 Self-Service Portals Architecture Blueprint** | `PHASE_2A4_SELF_SERVICE_PORTALS_BLUEPRINT.md` | `docs/PHASE_2A4_SELF_SERVICE_PORTALS_BLUEPRINT.md` | **CREATED** | Comprehensive 14-section architectural blueprint detailing discovery findings, identity and data audits, complete workflow maps for Student and Faculty workspaces, feature readiness matrix, authorization security boundaries, UX design specifications, technical architecture (0 schema changes required), testing strategy, 4-stage implementation roadmap, institutional decision log, acceptance criteria, and ready-to-paste Stage 1 execution prompt. | [Open Milestone 2A.4 Blueprint](../PHASE_2A4_SELF_SERVICE_PORTALS_BLUEPRINT.md) |
| 2 | **Conversation Report Index (Milestone 2A.4 Discovery)** | `2026-11-01-milestone-2a4-discovery-index.md` | `docs/conversation-indexes/2026-11-01-milestone-2a4-discovery-index.md` | **CREATED** | Dedicated navigation index cataloging the discovery deliverables, audited models, inspected operational database records, authorization guard analysis, and quality gates for Milestone 2A.4 Stage 0. | [Open Conversation Index](2026-11-01-milestone-2a4-discovery-index.md) |

---

## 2. Audited Repository Source Artifacts & Data Flow

| # | Layer / Component | Project-Relative File Path | Discovered Operational State & Reusability |
| :- | :--- | :--- | :--- |
| 1 | **Prisma Relational Schema** | [`prisma/schema.prisma`](file:///g:/rpihm-campusos/prisma/schema.prisma) | Contains all required domain models: `UserAccount`, `Session`, `Student`, `StaffProfile`, `TeachingAssignment`, `AttendanceSession`, `AttendanceRecord`, `ExamResultSummary`, `StudentFeeInvoice`, `FeeReceipt`, `StudentDocument`. **Zero schema changes required.** |
| 2 | **Authentication & Sessions** | [`src/lib/auth/session.ts`](file:///g:/rpihm-campusos/src/lib/auth/session.ts) | Encrypted HTTP-only cookie-based sessions (`campusos_session`). Single central identity foundation used across all roles. |
| 3 | **RBAC & Authorization Matrix** | [`src/lib/auth/roles.ts`](file:///g:/rpihm-campusos/src/lib/auth/roles.ts) | Active roles strictly `SYSTEM_ADMIN`, `ACADEMIC_ADMIN`, `FACULTY_MEMBER`, `STUDENT_VIEWER`. Planned roles (`HOD`, `FINANCE_OFFICER`) kept inert. Strict permission bitmasks and sets. |
| 4 | **Authorization Route & DAL Guards** | [`src/lib/auth/guards.ts`](file:///g:/rpihm-campusos/src/lib/auth/guards.ts) | Core authorization functions: `getCurrentUser()`, `requireAuth()`, `requirePermission()`, `hasPermission()`, `setTestSessionToken()`. Enforces server-side authorization on every action. |
| 5 | **Student Data Access Layer (DAL)** | [`src/lib/dal/studentRepository.ts`](file:///g:/rpihm-campusos/src/lib/dal/studentRepository.ts) | Highly mature repository with record-level boundary checks. `getStudentById` and `getStudentDossier360` strictly enforce `STUDENT_VIEWER` ID scoping (cross-student access blocked with `403`). |
| 6 | **Attendance Data Access Layer (DAL)** | [`src/lib/dal/attendanceRepository.ts`](file:///g:/rpihm-campusos/src/lib/dal/attendanceRepository.ts) | Full session and register management. Reusable query functions exist; needs dedicated `getStudentAttendanceSummary` to calculate accurate rates without fetching entire admin registers. |
| 7 | **Examinations Data Access Layer (DAL)**| [`src/lib/dal/examRepository.ts`](file:///g:/rpihm-campusos/src/lib/dal/examRepository.ts) | Already has built-in draft protection: `if (isStudentViewer) where.approvalStatus = "PUBLISHED"`. Ensures draft exam results are never leaked to students. |
| 8 | **Finance Data Access Layer (DAL)** | [`src/lib/dal/feeRepository.ts`](file:///g:/rpihm-campusos/src/lib/dal/feeRepository.ts) | `getStudentFeeLedger` strictly denies `FACULTY_MEMBER` and restricts `STUDENT_VIEWER` to own record. Financial access fully segregated. |
| 9 | **Timetable Data Access Layer (DAL)** | [`src/lib/dal/timetableRepository.ts`](file:///g:/rpihm-campusos/src/lib/dal/timetableRepository.ts) | Table exists, repository query functions exist. 0 records in operational DB. Must display honest empty state. |
| 10 | **Shared Layout & AppShell** | [`src/components/layout/AppShell.tsx`](file:///g:/rpihm-campusos/src/components/layout/AppShell.tsx) | Central responsive shell with collapsible sidebar, topbar, mobile drawer, and user profile popover. Role-aware navigation ready. |

---

## 3. Operational Database Audit (`prisma/dev.db`)

Inspected read-only via isolated script without altering a single byte:

| Entity | Operational Count in `dev.db` | Linkage / Operational Status | Portal Handling Strategy |
| :--- | :--- | :--- | :--- |
| **Students** | 13 | 0 linked to UserAccounts; 13 unlinked | No mass provisioning in 2A.4. Isolated test accounts used for portal verification. |
| **User Accounts** | 2 | `admin.local` (`SYSTEM_ADMIN`), `k.sharma` (`ACADEMIC_ADMIN`) | Preserved exactly. No operational accounts created or modified. |
| **Staff Profiles** | 13 | 1 linked (`k.sharma`); 12 unlinked | Preserved. Faculty portal tested with isolated test account. |
| **Teaching Assignments** | 5 | 4 faculty members mapped across 5 subjects/divisions | Faculty workspace queries these assignments to restrict division/attendance scope. |
| **Timetable Entries** | 0 | Model exists; Table empty | Honest empty state: *"No timetable has been published for your division/teaching schedule."* |
| **Attendance Sessions** | 1 | AI-101 Div A, 2026-10-07 | Honest data rendering: Student shows 1 session; non-assigned faculty sees 0 sessions. |
| **Attendance Records** | 2 | Linked to 2 students | Accurate individual calculations; no hardcoded 75% benchmarks shown as real student statistics. |
| **Exam Result Summaries** | 2 | Both in `DRAFT` approval status | Draft protection enforced: Student sees honest empty state: *"Results have not been published."* |
| **Fee Invoices** | 1 | `INV-2026-7759`, Khan Umar, ₹50,000, Status: `PAID` | Student sees genuine ledger. Non-invoiced students see honest zero-invoice empty state. |
| **Student Documents** | 0 (dev.db baseline) | Fully verified in `isolated_test.db` | Honest empty state: *"No documents submitted."* Student can submit documents. |
| **Announcements / Notices** | 0 | No DB model; mock placeholder only in `mockData.ts` | **Unsupported in 2A.4.** Never fabricate fake notices or news items. |

---

## 4. Quality & Safety Verification Gates

| Verification Gate | Command Executed | Expected Baseline | Actual Result | Verification Status |
| :--- | :--- | :--- | :--- | :--- |
| **Operational DB Hash** | `(Get-FileHash prisma/dev.db).Hash` | `86FF618CC96C421591237B0F589945644540868E6D151C2DB789D3A4D7399E41` | `86FF618CC96C421591237B0F589945644540868E6D151C2DB789D3A4D7399E41` | **VERIFIED INVARIANT** |
| **Operational DB Size** | `(Get-Item prisma/dev.db).Length` | `684032` bytes | `684032` bytes | **VERIFIED INVARIANT** |
| **Source Code Modifications**| `git diff src/ prisma/` | 0 new edits in Milestone 2A.4 Stage 0 | 0 edits | **VERIFIED CLEAN** |
| **Account Provisioning** | Direct DB count check | 2 accounts in `dev.db` | 2 accounts in `dev.db` (0 new) | **VERIFIED ZERO PROVISIONING** |
| **Database Migrations** | `prisma migrate status` | No new migrations executed | 0 migrations | **VERIFIED UNCHANGED** |

---

## 5. Stage 1 Pre-Implementation Corrections & Final Consistency Resolutions

The following corrections and reconciliations have been incorporated directly into `docs/PHASE_2A4_SELF_SERVICE_PORTALS_BLUEPRINT.md`:

1. **Session-Derived Student Identity:**
   - `getStudentSelfProfile()` and all student self-service server actions (`src/lib/actions/portalStudent.ts`) accept **zero client-supplied student IDs**.
   - Student identity is derived exclusively from the authenticated server session, enforcing `STUDENT_VIEWER` role and valid `studentId` linkage.
   - Unlinked accounts return `{ success: false, error: "UNLINKED_STUDENT" }`.
2. **Attendance Policy Attribution:**
   - Retained 75% strictly as an **advisory ERP guidance reference**; removed unverified attribution to an institutional handbook.
   - Prohibited implementing exam eligibility disqualifications or presenting compliance status as an official institutional verdict.
3. **Document Requirement Status & Technical Catalog:**
   - Institutional document categories and mandatory submission lists are unapproved.
   - Removed all claims of "required credentials", "mandatory completion", and completion fractions (e.g. `2 / 3 Verified`).
   - Supported categories are presented as a neutral technical catalog, displaying actual document statuses without required totals.
4. **Verified Profile & Curriculum Data Sources:**
   - Profile Photo: Not in data model; rendered via initials avatar from full name.
   - Mentor Faculty: Derived from `Student.mentorFaculty`; displays mentor name if assigned, or displays honest *"Unassigned"* status.
   - Current Placement: Programme Name, Current Semester (`Student.currentSemester`), and Division (`Enrolment.division.name`).
   - Curriculum: Displays subject code, title, credits, and course type; omitted unavailable syllabus breakdown/topics.
5. **Strict Stage 1 Acceptance Criteria Pruning:**
   - Pruned Stage 1 criteria to strictly match Stage 1 scope: Session identity, profile overview, academic curriculum, and secure document self-service.
   - Removed Stage 2 functionality (fee ledger, timetable, attendance ledger, published exam results) from Stage 1 acceptance criteria.
6. **Comprehensive Document Operation Security:**
   - Server-side student ownership enforced across all 5 operations: listing, uploading, replacing, downloading, and audit viewing.
   - Student verification/approval prohibited; `STUDENT_VIEWER` calling `verifyStudentDocumentAction()` returns `403 FORBIDDEN`.
   - Version history and audit preservation enforced (`onDelete: Restrict`).
7. **Actual Authorization Boundary Testing:**
   - Unauthenticated page access -> **HTTP 307 Redirect** to `/login`.
   - Server action unauthenticated -> `{ success: false, error: "UNAUTHORIZED" }` / `UnauthorizedError`.
   - Server action cross-role / forbidden -> `{ success: false, error: "FORBIDDEN" }`.
   - Download API route handler (`/api/students/[id]/documents/[docId]/download`) -> **HTTP 401 Unauthorized** (unauthenticated), **HTTP 403 Forbidden** (cross-student tampering).
8. **Strict Scope Discipline:**
   - Stage 1 is restricted strictly to Student Self-Service Foundation, Academic Profile, and Secure Document Self-Service.
   - Faculty portal implementation is deferred to Stage 3.
   - Zero operational account provisioning; zero database writes to `dev.db`.


