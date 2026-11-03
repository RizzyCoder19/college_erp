# RPIHM CampusOS ? Product Reality Audit & Engineering Roadmap

**Document Version:** 1.0.0  
**Date:** October 19, 2026  
**Auditor:** Senior ERP Product Manager & UX Architect  
**Project Workspace:** `G:\rpihm-campusos`  
**Git Commit Baseline:** `master` @ `f894e9ec1d6e72b82108ea5b6298a758b64292f3`  
**Active Production Server:** Next.js 16.4.2 (Turbopack) on `http://localhost:3000`  
**Database:** `prisma/dev.db` (SQLite)  

---

## 1. Product Snapshot

### What CampusOS Is Today
R.P. Institute of Hospitality & Management (RPIHM) **CampusOS** is a specialized institutional ERP prototype designed to administer academic operations across dual academic streams: **Hospitality & Culinary Arts** and **Technology & Applied Sciences (Data Science/AI, IT, Computer Science)** affiliated with the University of Mumbai.

### Who It Serves
1. **Registrar & Student Affairs:** Managing student enrollment dossiers, verification, PRN generation, semester promotion, and student master records.
2. **Academic Council & Heads of Department:** Overseeing curriculum structures, programmes, course credits, divisions, and teaching allocations.
3. **Faculty & Instructors:** Viewing rosters, teaching assignments, student profiles, and personal directories.
4. **Campus Administration & Finance:** Tracking fee statuses, academic facilities, examination cycles, and institutional circulars.

### What It Demonstrably Can Do Today (Verified Working)
- **Secure Authentication & Session Guarding:** Full login lifecycle with Argon2 password hashing, HTTP-only IronSession cookies, and role-based permissions (`READ_STUDENTS`, `WRITE_STUDENTS`, `DELETE_STUDENTS`, `MANAGE_STAFF`, etc.).
- **Live Student Master Database:** Complete CRUD lifecycle for student records backed by SQLite. Live search across name, PRN, roll number, programme, and email. Filter by live academic programmes, semester, status, and fee status.
- **Student Dossier Management:** Deep student inspection modal with academic enrollment history, parent/guardian relationships, contact info, blood group, and date of birth.
- **Live Faculty Directory:** Complete CRUD lifecycle for staff records backed by SQLite. Staff directory search and detail inspection.
- **Fail-Closed Prototype Reconciliation & Safe Pruning:** Administrative tool that compares browser prototype storage against the live database, strictly classifies records (duplicate, conflict, importable), prevents overwrite through collision detection, and aborts pruning if database refresh fails.
- **Institutional Branding & Design System:** Deep navy sidebar (`#0B1528`), clean workspace (`#F4F6F9`), royal blue primary actions (`#1657D9`), RPIHM crest, and genuine campus photography.

### What Remains Mostly Presentation / Prototype Today
- **Executive Dashboard:** Displays hardcoded metric counts (e.g. 1,284 students vs. 11 actual DB students; 68 faculty vs. 12 actual DB faculty). Static activity feeds and circulars.
- **Academics Module:** Visually rich curriculum cards and credit matrices, but disconnected from the database `Programme`, `Semester`, `Division`, and `Subject` tables.
- **Global Search (Ctrl+K):** Searches only static module names and mock programmes; cannot find real students or faculty members.
- **Operational Modules (Attendance, Exams, Finance, Library, Placements, Facilities, Notices, Reports, Settings):** Present as structured "Active Preview" placeholders displaying 5 mock rows and planned capability roadmaps without database persistence.

---

## 2. Module-by-Module Reality Inventory

| Module Name | Route | Current Status | Backing Data Source | Available User Actions | Most Critical Product Gap |
| :--- | :--- | :---: | :---: | :--- | :--- |
| **Dashboard** | `/` | **Partially working** | Hybrid (Static `mockData.ts` metrics, dynamic switchboard links) | View metrics, view recent activities, view schedule, navigate via module switchboard | Hardcoded metrics (1,284 students, 68 faculty) contradict live database reality (11 students, 12 faculty). |
| **Students & Admissions** | `/modules/students` | **Verified working** | Live SQLite (`Student`, `Enrolment`, `Programme`) | Search (Name/PRN/Roll/Email), Filter (Programme/Sem/Status/Fee), Add Student, View Dossier, Edit Record, Delete Record, Reconcile Prototypes | Reconciliation warning banner intrudes into normal daily registrar workflow; fee status cannot be updated from enrollment modal. |
| **Faculty & Staff** | `/modules/faculty` | **Partially working** | Live SQLite (`Staff`, `Department`) | Search, Add Staff, View Profile, Edit Staff, Delete Staff, Reconcile Prototypes | Department filter uses mock IDs (`dept-tech`) instead of database UUIDs, causing 0 results when filtered. |
| **Academics & Programmes** | `/modules/academics` | **UI Only / Prototype** | Disconnected `mockData.ts` (`ACADEMIC_PROGRAMMES`) | Filter by degree type (UG/Diploma/Cert), search courses, inspect curriculum & credits | Disconnected from the 7 programmes, 34 semesters, and 14 divisions in SQLite; no ability to edit or add courses. |
| **Attendance & Leave** | `/modules/attendance` | **UI Only / Prototype** | `mockData.ts` (Static 5 rows) | Search mock table rows, inspect planned NEP 2020 capabilities | No attendance tracking model or daily marking sheet UI exists in the application. |
| **Examinations & Results** | `/modules/examinations` | **UI Only / Prototype** | `mockData.ts` (Static 5 rows) | Search mock schedules, view evaluation specifications | No examination grading ledger, GPA calculator, or hall-ticket workflow. |
| **Fees & Accounts** | `/modules/finance` | **UI Only / Prototype** | `mockData.ts` (Static 5 rows) | Search fee challan mock rows, inspect billing specifications | Disconnected from student records; cannot generate receipts or record fee payments. |
| **Library & Resources** | `/modules/library` | **UI Only / Prototype** | `mockData.ts` (Static 5 rows) | Search book accession mock records | Purely informational placeholder; no book circulation or cataloging system. |
| **Placements & Internships**| `/modules/placements` | **UI Only / Prototype** | `mockData.ts` (Static 5 rows) | Search placement partner mock rows | No student placement tracking or company interview logging. |
| **Campus Facilities** | `/modules/facilities` | **UI Only / Prototype** | `mockData.ts` (Static 5 rows) | Search kitchen/lab mock records | No room allocation or maintenance scheduling workflow. |
| **Academic Calendar** | `/modules/calendar` | **UI Only / Prototype** | `mockData.ts` (Static 5 rows) | Search academic term event rows | No calendar date-picker, event creation, or timetable synchronization. |
| **Notices & Communication**| `/modules/notices` | **UI Only / Prototype** | `mockData.ts` (Static 5 rows) | Search circular mock rows | Notices cannot be drafted, targeted by department, or published. |
| **Reports & Analytics** | `/modules/reports` | **UI Only / Prototype** | `mockData.ts` (Static 5 rows) | Search report catalog mock rows | No report generator or CSV/PDF export for statutory compliances. |
| **System Settings** | `/modules/settings` | **UI Only / Prototype** | `mockData.ts` (Static 5 rows) | Search configuration mock rows | Role permissions and system preferences cannot be edited from the UI. |
| **Student Self-Service Portal** | `/portal/student` | **Verified working** | Live SQLite (`Student`, `TimetableEntry`, `AttendanceRecord`, `ExamScorecard`, `StudentFeeInvoice`, `FeeReceipt`) | View personal identity, schedule, raw attendance opportunities, published exam scorecards, fee ledger, receipt voucher | Delivered and verified under Milestone 2A.4 Stage 2. Strict session derivation, zero student IDOR. |
| **Faculty Self-Service Portal** | `/portal/faculty` | **In Progress (Workstream 1 DAL Implemented; Route & UI Not Started)** | Live SQLite (`Staff`, `TeachingAssignment`, `TimetableEntry`, `AttendanceSession`) via server actions (`portalFaculty.ts`) | Server actions implemented (profile, assignments, timetable, roster, attendance ledger); route & UI not yet mounted (returns HTTP 404) | Route `/portal/faculty` and UI not started (deferred to Workstream 2); operational DB currently has 0 faculty user accounts and 0 timetable entries. |

---

## 3. User Journey Review

### Journey 1: Registrar Student Search & Dossier Inspection
- **User Goal:** Registrar needs to find student Aarav Sharma, check enrollment status, and verify guardian phone number.
- **Workflow Steps:**
  1. User navigates to `/modules/students`.
  2. Types `2026DS041` or `Aarav` into the roster search bar.
  3. Table filters instantly to Aarav Sharma's row (`FY - Div A`, `Active`, `Paid`).
  4. Clicks row: `StudentDetailModal` opens smoothly with complete dossier (PRN `2026DS041`, Roll `RPIHM-2026DS041`, guardian Sunil Sharma, phone `+91 98201 11200`).
  5. Clicks "Close" or presses Escape: Modal dismisses cleanly.
- **Experience Evaluation:** **Verified Working & Production Grade.** Fast, responsive, intuitive, and accurate.

### Journey 2: Student Record Update & Refresh Persistence
- **User Goal:** Update student Rohan K. Verma's phone number and division.
- **Workflow Steps:**
  1. Registrar searches `2025IT112` in `/modules/students`.
  2. Clicks pencil icon (Edit Record).
  3. `StudentFormModal` opens pre-populated with Rohan's details.
  4. Updates phone number to `+91 98210 99881` and selects Division.
  5. Clicks "Save Changes".
  6. Button shows loading state; invokes `updateStudentAction`.
  7. Success toast appears: `"Student record for Rohan K. Verma updated successfully in database."`
  8. Table updates immediately; reloading the page confirms persisted database state.
- **Experience Evaluation:** **Verified Working.** Fully reactive and persisted.

### Journey 3: Prototype Reconciliation Experience (Critical UX Evaluation)
- **User Goal:** Admin wants to ensure newly imported prototype data does not duplicate database records.
- **Current Experience:**
  - When prototype records exist in `localStorage`, a large amber banner (`border-amber-200 bg-amber-50/80`) occupies the entire width at the top of `/modules/students`.
  - The banner displays: `"Prototype Browser Records Detected ... 3 un-reconciled student record(s) detected in browser storage."` with a primary `"Review & Reconcile"` button.
  - Clicking opens the modal, providing field-by-field diff comparison and duplicate pruning.
- **UX Audit Finding:** **Intruding into Normal Operations.**
  - For a registrar performing day-to-day enrollment, this banner looks like an active error or system defect.
  - It pushes the table filters down and creates unnecessary visual anxiety.
- **Recommendation:**
  - Move the prototype reconciliation trigger into a secondary administrative menu or utility badge in the table action bar (e.g., `"Data Tools (3 Pending)"` or an `"Import Manager"` button).
  - Retain the full fail-closed and backup safeguards, but remove the alarming full-width warning banner from the everyday roster view.

### Journey 4: Global Search (Ctrl+K)
- **User Goal:** Admin on the dashboard presses Ctrl+K and searches `2026DS041` or `Aarav Sharma` to jump directly to his profile.
- **Workflow Steps:**
  1. User presses Ctrl+K or clicks glowing search bar in TopBar.
  2. Search modal opens with focus.
  3. User types `Aarav`.
  4. **Result:** Displays `"No matching modules or programmes found."`
- **UX Audit Finding:** **Broken Workflow Expectation.**
  - The search input placeholder explicitly promises: `"Search students, faculty, programmes, notices? (Ctrl+K)"`.
  - In reality, it only searches `MODULES_LIST` and mock `ACADEMIC_PROGRAMMES`.
  - Users expect global ERP search to locate real students, faculty members, and programmes.

---

## 5. Top 10 Product Gaps (Ranked by User Impact)

1. **Global Search Mismatch (High User Disappointment):**
   - The TopBar search bar promises institutional search across students, faculty, and programmes, but only matches module titles. Real students and faculty cannot be found from the header.
2. **Dashboard Fabricated Metrics:**
   - Executive Dashboard displays hardcoded figures ("1,284 students", "68 faculty") while the database contains 11 students and 12 faculty. Creates an immediate loss of trust for administrators.
3. **Faculty Department Filter Mismatch:**
   - The Department dropdown in Faculty Management uses hardcoded IDs (`dept-culinary`, `dept-tech`) that do not match database department UUIDs, returning 0 records whenever a department is chosen.
4. **Intrusive Reconciliation Banner on Operational Rosters:**
   - Full-width amber warning banners dominate the top of the Student and Faculty rosters, treating an administrative migration utility as a permanent emergency alert.
5. **Academics Module Disconnected from Database:**
   - The Academics view displays static mock curriculum cards while 7 active degree programmes, 34 semesters, and 14 divisions already exist in SQLite. Changes in the database are invisible in the academic view.
6. **Absence of Student Enrollment Fee Mutation:**
   - While fee status (`Paid`, `Pending`, `Partial`) is displayed in the student roster, there is no ledger or payment modal to record a tuition receipt or update fee clearance status.
7. **Complete Lack of Daily Attendance Tracking:**
   - Affiliated institutes under Mumbai University require 75% mandatory attendance. Currently, attendance is a static placeholder with no ability to mark daily lectures, practicals, or kitchen sessions.
8. **Inability to Export Filtered Rosters:**
   - Export buttons in Student and Faculty views either trigger static CSVs or mock toasts, preventing registrar staff from generating exam eligibility or division lists.
9. **No Course-to-Faculty Subject Allocation UI:**
   - While `TeachingAssignment` exists in the database schema, there is no interface for Heads of Department to assign faculty members to specific subjects, batches, or practical labs.
10. **Static Notices & Circulars:**
    - The notices module and notification popover display hardcoded announcements from `mockData.ts` without an administration screen to publish new advisories or exam schedules.

---

## 6. Recommended Engineering Roadmap

```
  +-----------------------------------------------------------------------------+
  | MILESTONE 1: Core Institutional Foundations & Navigation Consistency        |
  | Target: Synchronize filters, live dashboard counts, and unified search      |
  +-----------------------------------------------------------------------------+
                                       |
                                       v
  +-----------------------------------------------------------------------------+
  | MILESTONE 2: Academics & Department Management Integration                  |
  | Target: Connect AcademicsView to SQLite Programme, Semester & Division DAL  |
  +-----------------------------------------------------------------------------+
                                       |
                                       v
  +-----------------------------------------------------------------------------+
  | MILESTONE 3: Registrar & Student Lifecycle Enhancements                     |
  | Target: Fee clearance tracking, unobtrusive data tools, roster CSV export   |
  +-----------------------------------------------------------------------------+
                                       |
                                       v
  +-----------------------------------------------------------------------------+
  | MILESTONE 4: Daily Attendance & Practical Session Ledger                    |
  | Target: Class rosters, 75% attendance compliance, lab session marking       |
  +-----------------------------------------------------------------------------+
                                       |
                                       v
  +-----------------------------------------------------------------------------+
  | MILESTONE 5: Institutional Communications & Notices                         |
  | Target: Notice drafting, department broadcasting, real-time circular feeds  |
  +-----------------------------------------------------------------------------+
```

### Detailed Milestone Breakdown

#### Milestone 1: Core Institutional Foundations & Navigation Consistency
- **User Problem:** Users are disoriented by mismatched filters in Faculty, fabricated counts on the Dashboard, and a global search that fails to locate actual people.
- **Affected Workflows:** Dashboard `/`, Faculty Management `/modules/faculty`, Global TopBar search.
- **Expected Finished Experience:**
  - Executive Dashboard displays live database counts (querying `prisma.student.count()`, `prisma.staff.count()`, and `prisma.programme.count()`).
  - Faculty department filter loads live departments from `DepartmentRepository` and filters accurately.
  - Global Search (Ctrl+K) queries live students and faculty members alongside system modules, allowing immediate navigation to a student dossier.
- **Demonstration Criteria:** Search `Aarav` in TopBar $ightarrow$ Select Aarav Sharma $ightarrow$ Navigates directly to student dossier. Select "Technology & Computing" in Faculty $ightarrow$ Displays live faculty in that department.

#### Milestone 2: Academics & Department Management Integration
- **User Problem:** Academic heads cannot see or manage real degree programmes, credit schemes, or division assignments in the Academics view.
- **Affected Workflows:** Academics `/modules/academics`, Programme inspection, Teaching assignments.
- **Expected Finished Experience:**
  - `AcademicsView` renders the 7 real database programmes (B.Sc. Data Science, B.Sc. Hospitality, B.Sc. IT, B.A. Culinary, B.Sc. CS, etc.).
  - Shows real semester structures (34 semesters) and active divisions (Div A, Div B, Div C).
  - Ability to view subjects associated with each semester and see assigned faculty instructors.
- **Demonstration Criteria:** Adding a subject or division in the database immediately reflects in the curriculum view.

#### Milestone 3: Registrar & Student Lifecycle Enhancements
- **User Problem:** Registrar staff cannot update fee payment status, are distracted by prominent prototype reconciliation alerts, and cannot export student rosters.
- **Affected Workflows:** Students `/modules/students`, Enrollment dossiers, Reconciliation utility.
- **Expected Finished Experience:**
  - Prototype reconciliation banner converted into an unobtrusive `"Data Tools (N)"` button in the roster action bar.
  - Student detail modal includes a `"Update Fee Status"` action (`Paid`, `Pending`, `Partial`) with challan number notes.
  - Export Roster button generates a real CSV containing filtered students with PRN, roll number, programme, and contact details.
- **Demonstration Criteria:** Roster renders cleanly without warning banners. Exporting CSV downloads genuine database records.

#### Milestone 4: Daily Attendance & Practical Session Ledger
- **User Problem:** Faculty cannot record attendance or track the 75% Mumbai University mandatory attendance threshold.
- **Affected Workflows:** Attendance `/modules/attendance`, Faculty timetable views.
- **Expected Finished Experience:**
  - Introduce `AttendanceSession` and `AttendanceRecord` schema models.
  - Faculty can select Programme $ightarrow$ Semester $ightarrow$ Division $ightarrow$ Date $ightarrow$ Subject.
  - Renders student list with quick "Present / Absent / Late" toggles.
  - Automatic calculation of cumulative attendance percentage shown in student dossier.
- **Demonstration Criteria:** Marking a division absent for a lecture reduces their attendance rate in real time.

#### Milestone 5: Institutional Communications & Notices
- **User Problem:** Announcements and exam notifications are static mock text and cannot be created by administrators.
- **Affected Workflows:** Notices `/modules/notices`, TopBar notification popover.
- **Expected Finished Experience:**
  - Introduce `Notice` database model with title, content, target department/programme, urgency, and publish date.
  - Simple notice authoring modal for administrators.
  - TopBar notification bell reads unread notices from the database.
- **Demonstration Criteria:** Publishing a notice appears immediately in the TopBar notification popover for all logged-in staff.

---

## 7. Quick Wins (Immediate Value, Low Risk)

1. **Relocate Reconciliation Alert to Action Bar (1 hour):**
   - Replace the large amber hero banner in `StudentsView.tsx` and `FacultyView.tsx` with a compact badge button (`"Sync Utility (3)"`) in the secondary action toolbar. Eliminates visual anxiety while keeping all data-safety protections intact.
2. **Align Faculty Department Filter IDs (1 hour):**
   - Update `FacultyView.tsx` to load live department entities from `academicRepository` (matching the Unit 1 Programme filter fix), enabling working department filtering.
3. **Live Counter Integration on Dashboard (2 hours):**
   - Replace hardcoded `1,284` and `68` in `ExecutiveOverview.tsx` with a lightweight server action returning live counts from `prisma.student.count()` and `prisma.staff.count()`.
4. **Wire Global Search to Database (3 hours):**
   - Add a debounced server action `searchGlobalRecordsAction(query)` that queries `Student` and `Staff` tables, enabling Ctrl+K to jump directly to any student or faculty record.
5. **Real CSV Export for Students (2 hours):**
   - Connect the `"Export Roster"` button to generate a real CSV payload from the active `filteredStudents` array.

---

## 8. Risks and Unknowns

1. **University of Mumbai Regulatory Invariants:**
   - PRN (Permanent Registration Number) formatting rules and enrollment eligibility schemas must be officially validated before hardcoding validation rules.
2. **Multi-Tenancy & Role Permissions:**
   - Currently, all users authenticate as `SUPER_ADMIN`. When faculty and student logins are introduced, strict row-level security must ensure students can only view their own attendance, grades, and fees.
3. **Dual-Discipline Curriculum Complexity:**
   - Hospitality curricula require recipe kitchen logs and practical lab hours, whereas Technology curricula require coding lab credit tracking. The academic model must accommodate both without bifurcation.

---

## 9. Definition of Done for a Cohesive ERP Prototype

CampusOS will be considered a complete, coherent institutional ERP prototype when:
1. **Zero Disconnected Metrics:** Every number on the executive dashboard reflects live database state.
2. **End-to-End Core Workflows:** A student can be enrolled, assigned to a programme/division, marked present in attendance, audited for fee clearance, and exported in a roster.
3. **Unified Navigation:** Global search (Ctrl+K) resolves real people, courses, and modules instantly.
4. **No Dead-End Placeholders:** Modules without full implementation display clear capability scopes and read live contextual records where available.
5. **Data Safety & Integrity:** Zero silent failures, fail-closed server actions, and complete audit logging on all administrative mutations.
