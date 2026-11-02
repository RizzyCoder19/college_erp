# Milestone 1E Deep Implementation Audit & Remediation Plan
## Institutional Intelligence & System Administration

**Project:** R.P. Institute of Hospitality & Management — CampusOS ERP  
**Scope:** Reports & Analytics (`/modules/reports`) and Settings & Administration (`/modules/settings`)  
**Audit Date:** October 31, 2026  
**Status:** FORENSIC AUDIT COMPLETE — REMEDIATION PLAN APPROVED  
**Operational Database Baseline:** `86ff618cc96c421591237b0f589945644540868e6d151c2db789d3a4d7399e41` (`prisma/dev.db`, 684,032 bytes)

---

## 1. Executive Summary

### 1.1 Context & Problem Statement
During initial testing of Milestone 1E, reports across several reporting surfaces appeared to produce zero records or fail to update in user workflows. While static TypeScript compilation (`npx tsc --noEmit`), ESLint checks, and synthetic backend queries succeeded, user-facing report interaction suffered from severe operational friction and apparent "failures" to produce data.

This deep forensic audit investigated the complete execution path from UI component dispatch $\to$ Next.js Server Actions $\to$ Data Access Layer (DAL) $\to$ Prisma SQLite queries $\to$ in-memory mathematical aggregations $\to$ client state synchronization $\to$ DOM table rendering and CSV exports.

### 1.2 Core Audit Findings
The investigation determined that the reporting module's apparent failures stem from six primary root causes:
1. **Coupled Cross-Tab Filter State with Non-Overlapping Cohort Data:** Filter selections (e.g., `programmeId`, `semesterId`) were stored in global component state. Because development database records for different modules belong to different programmes (`BSCDS-AI` for attendance and fees; `BA-CUL` for examinations), switching tabs preserved filters that yielded empty sets ($0$ records). Users perceived this as a silent report generation crash.
2. **Ambiguous Semester & Division Dropdown Options:** When `programmeId` was set to `"all"`, the semester dropdown rendered 38 un-scoped options ("Semester 1", "Semester 1", "Semester 1"...), allowing users to accidentally select a semester from an unlinked programme, guaranteeing zero matching records.
3. **Flawed Mathematical Denominators & Absenteeism Logic in Student Attendance Register:** For students with zero recorded sessions, the register evaluated `isEligibleForExams` as `true` (Eligible) despite $0.0\%$ attendance. Furthermore, student attendance records were queried without scoping to the selected semester/cohort.
4. **Missing Payment Method Distribution in Finance Collections:** The DAL and UI only aggregated headline sums (`totalDemand`, `totalPaid`, `outstanding`, `collectionRate`), failing to calculate and render the required payment method breakdown (UPI, NEFT, CASH, CHEQUE).
5. **CSV RFC 4180 Escaping Deficiencies:** Text fields containing commas or quotes were not escaped with standard doubled double-quotes (`""`), risking malformed CSV exports when names or remarks contain delimiters.
6. **Lack of Filter Reset, Active Filter Breadcrumbs, and Distinguishable Empty States:** The UI provided no "Clear Filters" button, no summary of active filters, and did not distinguish between a filter mismatch versus an empty database table.

---

## 2. Architecture Inventory

### 2.1 Route & Entry Point Hierarchy
- **Route:** `/modules/[slug]` via `src/app/modules/[slug]/page.tsx`
- **Dynamic Controller:** `src/components/modules/ModulePlaceholder.tsx`
  - Routes `slug === "reports"` $\to$ `<ReportsView />` (`src/components/modules/reports/ReportsView.tsx`)
  - Routes `slug === "settings"` $\to$ `<SettingsView />` (`src/components/modules/settings/SettingsView.tsx`)
- **App Shell & Layout:** `src/components/layout/AppShell.tsx`

### 2.2 Server Actions Boundary
- **Reports:** `src/lib/actions/reports.ts` (Marked `"use server"`, guarded with `requireAuth` and `requirePermission`).
- **Settings:** `src/lib/actions/settings.ts` (Marked `"use server"`, guarded with `requirePermission("ADMIN_ALL")`).

### 2.3 Data Access Layer (DAL)
- **Reports DAL:** `src/lib/dal/reportsRepository.ts` (`ReportsRepository` class with static methods).
- **Settings DAL:** `src/lib/dal/settingsRepository.ts` (`SettingsRepository` class with static methods).
- **Database Client:** `src/lib/db.ts` (Singleton Prisma client configured for SQLite).

### 2.4 Prisma Relational Models Queried
- **Academic Hierarchy:** `AcademicYear`, `AcademicTerm`, `Department`, `Programme`, `Semester`, `Division`, `Subject`
- **Identity & Staff:** `Student`, `Staff`, `UserAccount`, `Session`
- **Operations:** `Enrolment`, `AttendanceSession`, `AttendanceRecord`, `TeachingAssignment`
- **Examinations:** `ExamSession`, `AssessmentComponent`, `ExamResultSummary`, `SubjectResultEntry`
- **Finance:** `FeeStructure`, `FeeHead`, `StudentFeeInvoice`, `FeeReceipt`

---

## 3. Individual Report Audit

### Report 1 — Attendance Summary Report
- **Server Action:** `getAttendanceSummaryReportAction(filters: ReportFilterParams)`
- **Repository Method:** `ReportsRepository.getAttendanceSummaryReport(filters)`
- **Database Models Queried:** `AttendanceSession` joined with `Subject`, `Staff` (faculty), `Semester` (and `Programme`), `Division`, `AttendanceRecord`.
- **Active Filters:** `semesterId`, `divisionId`, `programmeId` (in-memory post-filter).
- **Calculations:**
  - `totalSessions`: Count of sessions held per subject-division group.
  - `totalMarksCount`: Count of individual student marks recorded.
  - `presentCount`, `lateCount`, `absentCount`, `excusedCount`.
  - `averageAttendanceRate`: `((presentCount + lateCount) / totalMarksCount) * 100` rounded to 1 decimal place.
  - *Calculation Rule Status:* Adheres to the Strict Opportunity Model (counting `EXCUSED` in the denominator). This represents the application's current operational calculation rule, not an officially approved RPIHM or University of Mumbai academic ordinance.
- **Audit Findings:**
  - *Data Availability:* 1 session exists in `dev.db` (BSCDS-AI, Semester 1, Division A, Subject: `feb4ac11...`, 2 attendance records: 1 EXCUSED, 1 ABSENT).
  - *Defects:* The UI table did not render the `Excused` count column, creating a discrepancy with CSV export. If `programmeId` is set to any programme other than `BSCDS-AI`, 0 rows are returned.
  - *Remediation:* Add `Excused` column to UI table; provide active filter badge and reset mechanism.

### Report 2 — Student Attendance Register
- **Server Action:** `getStudentAttendanceRegisterAction(filters: ReportFilterParams)`
- **Repository Method:** `ReportsRepository.getStudentAttendanceRegister(filters)`
- **Database Models Queried:** `Student` joined with `Enrolment` (`Programme`, `Semester`, `Division`), `AttendanceRecord` (with `AttendanceSession`).
- **Calculations:**
  - `totalSessionsHeld`: Count of `AttendanceRecord`s attached to the student.
  - `sessionsAttended`: `present + late`.
  - `attendancePercentage`: `(attended / totalHeld) * 100`.
  - `isEligibleForExams`: `totalHeld === 0 || percentage >= 75.0` (Reference benchmark).
  - *Reference Benchmark Status:* The 75% threshold is strictly an institutional reference calculation benchmark pending formal statutory ordinance verification.
- **Audit Findings:**
  - *Critical Flaw in Eligibility:* When `totalHeld === 0`, `isEligibleForExams` returned `true` (marked "Eligible (≥75% Ref)"). A student with zero attendance was improperly marked eligible.
  - *Cohort Scope Leak:* `s.attendanceRecords` was queried across all sessions without scoping to the student's current active semester.
  - *Remediation:* Set `isEligibleForExams: totalHeld > 0 && percentage >= 75.0`. When `totalHeld === 0`, display badge "No Sessions Logged". Scope `attendanceRecords` to matching semester.

### Report 3 — Examination Results Gazette
- **Server Action:** `getExamResultsReportAction(filters: ReportFilterParams)`
- **Repository Method:** `ReportsRepository.getExamResultsReport(filters)`
- **Database Models Queried:** `ExamResultSummary` joined with `ExamSession`, `Student`, `Semester` (`Programme`).
- **Calculations:** `totalMaxMarks`, `totalMarksObtained`, `percentage`, `sgpa`, `letterGrade`, `resultStatus`, `approvalStatus`.
- **Audit Findings:**
  - *Data Availability:* 2 records exist in `dev.db` for session `WIN-2026-REG`, students Ananya Deshmukh and Ishaan Mukherjee in `BA-CUL` Semester 1 (`approvalStatus: "DRAFT"`).
  - *Defects:* Because records belong to `BA-CUL`, selecting any other programme filter produces 0 rows. In the UI, the session filter was auto-selecting `res.data.examSessions[0].id`, but `programmeId` was retained from previous tabs.
  - *Remediation:* Provide distinct status badges for `DRAFT` vs `PUBLISHED` results to avoid confusing provisional gazettes with finalized records. Decouple or synchronize programme filters.

### Report 4 — Fee Collections Ledger
- **Server Action:** `getFinanceCollectionReportAction(filters: ReportFilterParams)`
- **Repository Method:** `ReportsRepository.getFinanceCollectionReport(filters)`
- **Database Models Queried:** `StudentFeeInvoice` joined with `Student`, `Enrolment` (`Programme`), `FeeReceipt`.
- **Calculations:**
  - `totalDemand`: Sum of `totalDemand` across invoices.
  - `totalPaid`: Sum of `amountPaid` from receipts.
  - `outstandingBalance`: `max(0, totalDemand - totalPaid)`.
  - `collectionRate`: `(totalPaid / totalDemand) * 100`.
- **Audit Findings:**
  - *Missing Payment Distribution:* The report failed to calculate breakdown of collections by `paymentMethod` (UPI, NEFT_RTGS, CASH, CHEQUE).
  - *Data Availability:* 1 invoice exists (`INV-2026-7759` for ₹50,000, fully paid via UPI, for Khan Umar in `BSCDS-AI`).
  - *Remediation:* Add payment method distribution aggregation to DAL and summary cards/table to UI.

### Report 5 — Student Fee Defaulters
- **Server Action:** `getDefaultersReportAction(filters: ReportFilterParams)`
- **Repository Method:** `ReportsRepository.getDefaultersReport(filters)`
- **Database Models Queried:** `StudentFeeInvoice` where `status IN ('PENDING', 'PARTIALLY_PAID', 'OVERDUE')`.
- **Audit Findings:**
  - *Data Availability:* Exactly 0 defaulters exist in `dev.db` because the only existing invoice is `PAID`.
  - *Defects:* The UI displayed "Zero fee defaulters found" without explaining whether this was because all existing invoices are settled or no invoices were billed.
  - *Remediation:* Clarify empty state banner: "All billed student invoices are fully cleared. No overdue or outstanding balances detected in active cohort."

### Report 6 — Programme Enrolment Matrix
- **Server Action:** `getProgrammeEnrolmentReportAction()`
- **Repository Method:** `ReportsRepository.getProgrammeEnrolmentReport()`
- **Database Models Queried:** `Programme` joined with `Semester`, `Enrolment` (with `Student`).
- **Calculations:**
  - Distinct students per programme.
  - Gender distribution (`maleCount`, `femaleCount`, `otherCount`).
  - Active enrolment count (`student.status === "ACTIVE"`).
- **Audit Findings:**
  - *Data Availability:* 7 programmes, 13 enrolled students (BSC-HS: 2, BA-CUL: 2, BSCDS-AI: 5, BSCIT: 2, BSCCS: 1, DIP-BC: 1, DIP-FP: 0).
  - *Verification:* Aggregations accurately prevent double-counting students with multiple semester enrolments by utilizing student ID `Map`.

---

## 4. Settings & Administration Audit

### A. Academic Calendar Matrix
- **Server Action:** `getAcademicCalendarSettingsAction()`
- **Repository Method:** `SettingsRepository.getAcademicCalendarSettings()`
- **Database Models Queried:** `AcademicYear` with ordered `AcademicTerm`s.
- **Audit Findings:** Retrieves the 1 configured active academic year cycle (`2026-27`, `Academic Year 2026-2027`, `isCurrent: true`) and its 2 child academic terms (`Odd Semester Term (Autumn 2026)` and `Even Semester Term (Spring 2027)`). An earlier preliminary draft reference to "2 academic years (2025-26, 2026-27)" was a reporting error that conflated the 2 semester terms with distinct year records.

### B. User Roles & Identity Administration
- **Server Action:** `getUserAccountsAdminAction()`
- **Repository Method:** `SettingsRepository.getUserAccountsAdmin()`
- **Database Models Queried:** `UserAccount` joined with `Staff`, `Student`, active `Session`s.
- **Audit Findings:** Retrieves all provisioned user accounts (exactly 2 operational accounts in `dev.db`: `admin.local@sample.rpihm.ac.in` [SYSTEM_ADMIN] and `k.sharma@sample.rpihm.ac.in` [ACADEMIC_ADMIN]) with email, role, active session counts, and linked staff entity identifier. No password hashes or secrets are exposed. An earlier preliminary draft reference citing "11 user accounts" was an unverified reporting artifact from a conceptual role-testing fixture matrix; the operational database has always had exactly 2 user accounts.

### C. System Audit Log Journal
- **Server Action:** `getSystemAuditLogsAction(limit)`
- **Repository Method:** `SettingsRepository.getSystemAuditLogs(limit)`
- **Audit Findings:** Synthesizes genuine operational events from `FeeReceipt`s, `ExamSession`s, `AttendanceSession`s, and `UserAccount`s. It is clearly documented as an **operational audit projection** providing administrative visibility, rather than an immutable, tamper-proof, or cryptographically sealed write-once audit ledger.

### D. System Health & Backups Telemetry
- **Server Action:** `getSystemHealthAndBackupsAction()`
- **Repository Method:** `SettingsRepository.getSystemHealthAndBackups()`
- **Telemetry Verified:**
  - SQLite `PRAGMA integrity_check`: `"ok"`
  - SQLite `PRAGMA foreign_key_check`: `0` violations
  - SQLite `PRAGMA journal_mode`: `"wal"`
  - `PRAGMA page_count` & `page_size`: 167 pages, 4,096 bytes
  - Table counts: 26 tables, 309 rows total
  - Backup files: 17 backups/manifests discovered with SHA-256 hashes

---

## 5. Complete File Inventory

| File Path | Role & Responsibility | Audit Status |
|:---|:---|:---|
| `src/app/modules/[slug]/page.tsx` | Route entry point, server-side auth & module access guards | Verified OK |
| `src/components/modules/ModulePlaceholder.tsx` | Dispatcher routing slug to `ReportsView` or `SettingsView` | Verified OK |
| `src/components/modules/reports/ReportsView.tsx` | Client UI for all 6 reports, filters, summaries, CSV export | **Requires Remediation** |
| `src/lib/actions/reports.ts` | Server actions for reports with RBAC permission checks | Verified OK |
| `src/lib/dal/reportsRepository.ts` | Reports Data Access Layer and aggregations | **Requires Remediation** |
| `src/components/modules/settings/SettingsView.tsx` | Client UI for 4 administrative consoles | Verified OK |
| `src/lib/actions/settings.ts` | Server actions for settings restricted to `ADMIN_ALL` | Verified OK |
| `src/lib/dal/settingsRepository.ts` | Settings Data Access Layer and SQLite PRAGMAs | Verified OK |
| `src/lib/auth/guards.ts` | Server-side session and permission verification guards | Verified OK |
| `src/lib/auth/roles.ts` | Role-to-permission mappings and module access rules | Verified OK |

---

## 6. Root-Cause Register

| Issue ID | Affected Module & File | Exact Function | Current Behavior | Expected Behavior | Root Cause | Severity |
|:---|:---|:---|:---|:---|:---|:---|
| **ISSUE-REP-01** | Reports: `ReportsView.tsx` | `ReportsView` state | Cross-tab filter persistence locks new tabs to empty cohort datasets | Switching tabs should either reset filters or indicate active filter mismatch | Global filter state shared across tabs with disjoint data | **HIGH** |
| **ISSUE-REP-02** | Reports: `ReportsView.tsx` | `availableSemesters` / `availableDivisions` | 38 identical "Semester 1" entries rendered when programme is "all" | Group semesters by programme or require programme selection | Unscoped semester/division lists | **MEDIUM** |
| **ISSUE-REP-03** | Reports: `reportsRepository.ts` | `getStudentAttendanceRegister` | Students with 0 sessions marked as "Eligible (≥75% Ref)" | Students with 0 sessions marked as "Not Evaluated / No Sessions" | `totalHeld === 0 \|\| percentage >= 75` condition | **HIGH** |
| **ISSUE-REP-04** | Reports: `reportsRepository.ts` & `ReportsView.tsx` | `getFinanceCollectionReport` | Payment method breakdown missing from finance report | Payment method breakdown aggregated and displayed | Omitted from DAL aggregation and UI summary cards | **MEDIUM** |
| **ISSUE-REP-05** | Reports: `ReportsView.tsx` | `handleExportCSV` | Unescaped double quotes in text fields | RFC 4180 compliant doubled-quote escaping (`""`) | Missing CSV string sanitization helper | **MEDIUM** |
| **ISSUE-REP-06** | Reports: `ReportsView.tsx` | `ReportsView` render | Missing "Clear Filters" button and active filter indicator | Clear filter banner showing matched records vs total records | Incomplete UI filter ergonomics | **MEDIUM** |
| **ISSUE-REP-07** | Reports: `ReportsView.tsx` | `AttendanceSummary` table | Missing `Excused` count column in UI table | Display `Excused` column matching CSV export | Table column omitted in JSX | **LOW** |

---

## 7. Database Data Availability

All queries operate on the accepted baseline operational database (`dev.db`):

| Entity / Model | Record Count | Notes & Distribution |
|:---|:---|:---|
| `AttendanceSession` | **1** | Finalized session for `BSCDS-AI` Sem 1 Div A (Subject: `feb4ac11...`) |
| `AttendanceRecord` | **2** | 1 EXCUSED (Student `75a00fcb...`), 1 ABSENT (Kane Umario) |
| `Student` | **13** | 12 MALE, 1 FEMALE; 12 ACTIVE, 1 ON_LEAVE |
| `Enrolment` | **14** | 13 students across 6 programmes (BSCDS-AI has 5 enrolments) |
| `ExamSession` | **1** | `WIN-2026-REG` (Status: PUBLISHED) |
| `ExamResultSummary` | **2** | 2 results for `BA-CUL` Sem 1 (Deshmukh, Mukherjee; DRAFT) |
| `StudentFeeInvoice` | **1** | `INV-2026-7759` for ₹50,000 (Status: PAID; Student: Khan Umar) |
| `FeeReceipt` | **1** | `REC-2026-121403` for ₹50,000 via UPI |
| `Programme` | **7** | BSC-HS, BA-CUL, BSCDS-AI, BSCIT, BSCCS, DIP-FP, DIP-BC |
| `Semester` | **38** | 6 semesters per degree programme, 2 per diploma |
| `Division` | **14** | Div A and Div B per semester |
| `AcademicYear` | **1** | Academic Year 2026-2027 (Code: `2026-27`, `isCurrent: true`) |
| `AcademicTerm` | **2** | `Odd Semester Term (Autumn 2026)` (Current) and `Even Semester Term (Spring 2027)` |
| `UserAccount` | **2** | Exactly 2 provisioned operational accounts: 1 SYSTEM_ADMIN (admin.local) and 1 ACADEMIC_ADMIN (k.sharma). (Preliminary draft reference citing 11 was an unverified conceptual distribution). |

---

## 8. Permission Audit

### Server-Side Permission Verification
- **Module Route Access (`/modules/reports`):** Checked in `src/app/modules/[slug]/page.tsx` via `hasModuleAccess(user.role, "reports")`. Required permissions: `["ADMIN_ALL", "MANAGE_ACADEMICS"]`.
  - `SYSTEM_ADMIN`: **PERMITTED**
  - `ACADEMIC_ADMIN`: **PERMITTED**
  - `FACULTY_MEMBER`: **DENIED** (Access Restricted banner)
  - `STUDENT_VIEWER`: **DENIED** (Access Restricted banner)
- **Module Route Access (`/modules/settings`):** Required permission: `["ADMIN_ALL"]`.
  - `SYSTEM_ADMIN`: **PERMITTED**
  - `ACADEMIC_ADMIN`: **DENIED** (Access Restricted banner)
  - `FACULTY_MEMBER`: **DENIED**
  - `STUDENT_VIEWER`: **DENIED**
- **Action-Level Permissions:**
  - `getAttendanceSummaryReportAction`: `VIEW_ATTENDANCE`
  - `getStudentAttendanceRegisterAction`: `VIEW_ATTENDANCE`
  - `getExamResultsReportAction`: `VIEW_RESULTS`
  - `getFinanceCollectionReportAction`: `MANAGE_FEES`
  - `getDefaultersReportAction`: `MANAGE_FEES`
  - `getProgrammeEnrolmentReportAction`: `MANAGE_ACADEMICS`
  - All Settings Actions: `ADMIN_ALL`

---

## 9. Testing & Verification Evidence Plan

The remediation plan will be validated against strict, reproducible criteria:
1. **Static Type Safety:** `npx tsc --noEmit` must pass with 0 errors.
2. **ESLint Conformance:** `npm run lint` must pass with 0 errors.
3. **Isolated Production Build:** `npm run build` must succeed against an isolated database copy.
4. **Automated Test Suite:** Integration tests (66 automated assertions passed) covering isolated database binding proof, all 6 reports, and 4 settings consoles.
5. **Real Headless Edge Browser Verification:** Capture rendered DOM output and visual screenshots using local Microsoft Edge via Chrome DevTools Protocol (CDP) on port 9596.
6. **Operational Database Invariance:** Confirm SHA-256 of `prisma/dev.db` remains `86ff618cc96c421591237b0f589945644540868e6d151c2db789d3a4d7399e41`.

---

## 10. Remediation Plan

### Change 1: Enhance `reportsRepository.ts`
- **File:** `src/lib/dal/reportsRepository.ts`
- **Modifications:**
  1. Add `paymentMethodDistribution: Array<{ method: string; count: number; totalAmount: number }>` to `FinanceCollectionReport` interface and aggregation logic.
  2. Fix `getStudentAttendanceRegister`: Update `isEligibleForExams` calculation so `totalHeld === 0` produces `false` (or a dedicated status) rather than marking zero-attendance students eligible. Filter attendance records to match the student's active semester.
  3. Ensure all calculations remain database-backed without mock data.
- **Risk:** Low (additive fields, corrected calculation logic).
- **Test:** Run automated suite verifying financial aggregations and attendance percentages.

### Change 2: Remediate `ReportsView.tsx` UI, Filter Ergonomics & CSV Export
- **File:** `src/components/modules/reports/ReportsView.tsx`
- **Modifications:**
  1. Add a "Reset Filters" action button.
  2. Add an active filter summary pill indicator (e.g. "Filters applied: 1 programme, 1 semester • 2 records found").
  3. When switching tabs, automatically reset filters to `"all"` to prevent cross-tab empty set confusion.
  4. Disambiguate semester options in dropdown by prefixing programme code when programme is `"all"` (e.g., `BSCDS-AI - Sem 1`).
  5. Add `Excused` count column to Attendance Summary table.
  6. Display Payment Method breakdown cards in Finance Collections tab.
  7. Implement RFC 4180 CSV escaping helper (`str.replace(/"/g, '""')`) for all export rows.
  8. Provide clear, informative empty states distinguishing between empty filter matches versus empty database tables.
- **Risk:** Low (contained to client presentation and filter lifecycle).
- **Test:** Browser verification of filter reset, table rendering, tab switching, and CSV export string integrity.

---

*End of Deep Implementation Audit & Remediation Plan.*
