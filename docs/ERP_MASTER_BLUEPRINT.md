# RPIHM CampusOS — Master ERP Architecture Blueprint & Functionalization Plan

**Institution:** R. P. Institute of Hospitality & Management, Vasai  
**Affiliations:** University of Mumbai (Degree Programmes) • MSBTE/DTE (Diploma & Certificate Courses)  
**System Designation:** CampusOS Integrated Academic & Administrative ERP  
**Project Path:** `\G:\Rpihm-campusos`  
**Document Version:** 1.0.0 (Master Blueprint & Functionalization Plan)  
**Date:** October 2026  
**Status:** Complete Architecture & Implementation Baseline  

---

## 1. Executive Summary & Institutional Mission

PPIHM CampusOS is an institutional Enterprise Resource Planning (ERP) platform achieving end-to-end digital automation for **R. P. Institute of Hospitality & Management, Vasai, Maharashtra**. The institution uniquely integrates two distinct academic faculties:
1. **School of Technology & Computing:** (e.g., B.Sc. Data Science with AI, B.Sc. Information Technology, B.Sc. Computer Science).
2. **School of Hospitality & Culinary Arts:** (e.g., B.Sc. Hospitality Studies, B.A. Culinary Arts, Diploma in Bakery & Confectionery, Certificate in Food & Beverage Service).

The frontend visual design language, navigation shell, typography, authentic animated glowing search bar, logo presentation, campus photographic camouflage backdrops, and natural scrolling behavior are **frozen and approved**.

The existing **Student Management** (`/modules/students`) and **Faculty & Staff Management** (`/modules/faculty`) sub-systems represent the foundational modules of the system. This blueprint defines how all 13 modules, plus the executive dashboard, global search, and shell services, will transition from isolated prototype views and client-side mocks into a fully functional, database-backed, multi-user institutional ERP.

---

## 2. Technical Environment & Repository Audit

### 2.1 Software & Runtime Versions
- **Host Operating System:** Microsoft Windows (NTFS Volume `G:`, 127 GB capacity, ~4.2 GB free)
- **Node.js Runtime:** `v24.19.0`
- **Package Manager:** `npm 11.17.0` (Strict `package-lock.json` v3 consistency)
- **Framework:** **Next.js 16.4.2** (Turbopack engine, React Server Components & App Router)
- **UI Library:** **React 19.3.0** / **React-DOM 19.3.0**
- **Language:** **TypeScript 5.9.3** (Strict typechecking enabled in `tsconfig.json`)
- **Styling Engine:** **Tailwind CSS v4.3.3** utilizing the official `@tailwindcs/turbopack` plugin
- **Linter:** **ESLint 9.39.5** with Flat Config (`eslint.config.mjs`, `eslint-config-next`)
- **Current Database / ORM:** None currently installed; client-side `localStorage` is currently utilized for prototype persistence.

### 2.2 Git Repository State
- **Active Branch:** `master`
- **Current Commit HEAD:** `afe0608` (`feat: implement Faculty & Staff Management module (Phase 2)`)
- **Parent Commits:**
  - `1898474` — `feat(students): implement phase 1 student management module with full CRUD, search, and filters`
  - `f73537c` • `feat(header): stretch glowing search bar and blend seamlessly with white executive header`
  - `c6c4fae` • `feat(header): replace top search bar with authentic glowing animated search bar`
  - `99979e9` • `chore: standardize lockfile and npmrc for NTFS environment`
  - `e713316` — `chore: initialize RPIHM CampusOS Next.js foundation`
- **Working Tree Cleanliness:** Clean working tree for all tracked codebase files. Untracked items are strictly external institutional reference assets and campus site photographs.

### 2.3 Script & Build Verification
- `npm run lint`: **Exit code 0** (0 errors, 0 warnings across all files).
- `npm run build`: **Exit code 0** (All 18 static/prerendered routes compile in 2.5s via Turbopack).

---

## 3. Frozen UI/UX Design System Rules

All subsequent functional engineering across every module must strictly adhere to the established visual design system without introducing divergent UI patterns:
1. **Master Shell (AppShell.tsx):** Fixed left navigation drawer (`Sidebar.tsx`) styled in institutional deep navy (`#0B1528`) with gold-bordered active indicators and responsive mobile drawer toggle.
2. **Executive Header (TopBar.tsx):** Sticky top bar (`h-16`, white background, `border-b border-slate-200/80`) hosting the custom multi-layered glowing animated search bar (`#poda`), academic session selector (`2026 – 27`), interactive notifications popover, and user profile drawer.
3. **Campus Camouflage & Imagery:** Photographic textures of R.P. Institute campus signage (`/images/campus-illuminated-sign.png`) embedded as subtle background overlays with frosted white gradients and smooth CSS `group-hover:scale-108` zoom transitions.
4. **Natural Page Scrolling:** Single-axis vertical scrolling without nested scroll-traps or broken viewport heights.
5. **Color Palette:**
   - Primary Institutional Blue: `#1657D9` (Hover: `#1D4ED8a)
   - Accent Crimson / Seal Red: `#D92534`
   - Slate Text & Borders: `text-slate-900` (headings), `text-slate-600` (body), `border-slate-200`
   - Surface Cards: Crisp white (`##FFFFFF`) with soft shadows (`shadow-2xs` to `shadow-xs`) and `rounded-2xl` corners.

---

## 4. Comprehensive Inventory & Audit of Every Existing Module

The ERP consists of 13 official operational modules, plus the executive dashboard and global shell components. Below is the exhaustive audit of every component under the 10 mandated criteria.

### 4.1 Module 1: Students & Admissions
1. **Route & Entry Component:** `/modules/students` ↑ `StudentsView.tsx` (dispatched from `ModulePlaceholder.tsx`).
2. **Existing UI & Interactions:** Executive metrics strip (Total, Fist-Year, Attendance Avg, Fees Cleared), instant keyword search, dropdown filters (Programme, Semester, Status, Fee Status), CSV export, responsive desktop table and mobile cards, Student Academic Dossier modal (`StudentDetailModal.tsx`), validated Add/Edit Student modal (`StudentFormModal.tsx`), and confirmation deletion modal (`DeleteConfirmModal.tsx`).
3. **Existing Data Source:** Initialized from `INITIAL_STUDENT_RECORDS` (`src/data/mockStudents.ts`) and hydrated client-side via `localStorage` key `rpihm_student_records_v1`.
4. **What Currently Works:** Full client-side CRUD (Add, Edit, View, Delete), keyword search, multi-attribute filtering, CSV download, reset demo roster, modal open/close with Escape key, and form validation.
5. **What is Placeholder / Simulated:** Storage is strictly client-local. PRN numbers are pseudo-randomly assigned. No university online eligibility sync or biometric/photo uploads.
6. **Required Records & Relationships:** `Student` entity linked to `Programme`s, `Department`s, `Guardian`s, `StudentFeeAccount`, `AttendanceRecord`, `StudentMarks`, and `MentorFaculty` (Staff).
7. **Dependencies on Other Modules:** Relies on `Academics & Programmes` (for programme/semester codes), `Faculty & Staff` (for mentor assignments), and feeds `Fees & Finance`, `Attendance & Leave`, and `Examinations & Results`.
8. **Validation & Permission Requirements:** Full name (min 3 chars), PRN uniqueness, valid email, 10-digit phone, mandatory guardian details, valid programme selection. Permissions: Registrar / Admissions Officer (write), HOD/Faculty (read-only), Accounts (read fee flags).
9. **Remaining Implementation Work:** Migration to PostgreSQL/Prisma, server actions, document upload (domicile/caste certificates), university registration portal integration, QR-code ID generation.
10. **Practical Acceptance Test:** Create a student record for Pooja Deshmukh under B.Sc. Data Science; verify immediate appearance in table, persistence across browser refresh, searchability via Global Search (Ctrl+K), and correct foreign key association to programme.

### 4.2 Module 2: Academics & Programmes
1. **Route & Entry Component:** `/modules/academics` ↑ `AcademicsView.tsx`.
2. **Existing UI & Interactions:** Breadcrumb navigation, camouflage banner, programme counts by degree type (UG, Diploma, Certificate), degree category tabs, search input, programme grid with affiliated body badges, Department Leadership card, Affiliation notices, and Syllabus Dossier modal.
3. **Existing Data Source:** Read-only array `ACADEMIC_PROGRAMMES` in `src/data/mockData.ts`.
4. **What Currently Works:** Filter tabs (All, Undergraduate, Diploma, Certificate), keyword search filtering across programme code, name, and department, modal inspection of individual programme details.
5. **What is Placeholder / Simulated:** "Syllabus Handbook (PDF)", "Exam Scheme Regulations", and "Open Syllabus Dossier" trigger browser alert() notifications. No CRUD capability exists to create, modify, or retire programmes or define course syllabus structures.
6. **Required Records & Relationships:** `Programme` entity linked to `Department`, `DegreeType`, `AffiliatedBody`, `Semester`, `Subject` / `Course`, and `Division`.
7. **Dependencies on Other Modules:** Core foundation for `Students`, `Faculty`, `Attendance`, `Examinations`, `Facilities`, and `Fees`.
8. **Validation & Permission Requirements:** Unique programme code (e.g., BSCDS-AI, BSCHS), non-empty name, duration in years, affiliating university selection, total credits. Permissions: Academic Council / Registrar (Institution Write), Faculty/Students (Read-only).
9. **Remaining Implementation Work:** Implement full CRUD for programmes, semester structure mapping, course/subject catalog builder with credit allocations (Theory, Practical, Tutorial), and downloadable syllabus handbook generator.
10. **Practical Acceptance Test:** Add a new 2-year "Postgraduate Diploma in Luxury Culinary Management" under Hospitality; verify it appears under Diploma filters, registers in the global search modal, and enables student admissions mapping.

### 4.3 Module 3: Faculty & Staff
1. **Route & Entry Component:** `/modules/faculty` — `FacultyView.tsx` (dispatched from `ModulePlaceholder.tsx`).
2. **Existing UI & Interactions:** Header banner with metrics strip (Total Staff, Teaching Faculty, Active, Average Workload), multi-attribute filter bar (search, department, staff category, status, employment type), responsive desktop table and mobile card view, Academic Dossier modal (`FacultyDetailModal.tsx`), validated Add/Edit Staff modal (`FacultyFormModal.tsx`), and deletion safety modal (`DeleteFacultyModal.tsx`).
3. **Existing Data Source:** `INITIAL_FACULTY_RECORDS` in `src/data/mockFaculty.ts`, hydrated client-side via `localStorage` key `rpihm_faculty_records_v1`.
4. **What Currently Works:** Full client-side CRUD, search across subjects, qualifications, names, and IDs, filter combinations, CSV roster export, reset demo roster, and global search synchronization.
5. **What is Placeholder / Simulated:** Persistence is client-local. Teaching subject associations and programme assignments are stored as comma-separated text strings rather than relational foreign keys.
6. **Required Records & Relationships:** `StaffMember` entity linked to `Department`, `StaffCategory`, `EmploymentType`, `TeachingAssignment`, `LabFacility` (as in-charge), and `ClassSession` (as instructor).
7. **Dependencies on Other Modules:** Supplies instructors for `Academics`, `Attendance`, `Facilities`, `Examinations`, and student mentors in `Students`.
8. **Validation & Permission Requirements:** Full name (min 3 chars), unique Staff ID (`RPIHM-FAC-XXX`), official designation, department assignment, email format, phone (min 8 digits), weekly workload (1‑60 hrs). Permissions: HR / Principal / Registrar (write), Department Heads (manage workloads), Faculty (edit own bio/cabin).
9. **Remaining Implementation Work:** PostgreSQL schema integration, relational linking to subjects/programmes, leave balance tracking, biometric attendance feed, and timetable allocation.
10. **Practical Acceptance Test:** Register a new culinary instructor Chef Antoine Mercier in Bakery & Confectionery with 20 hrs workload; verify appearance in roster, persistence across browser reloads, and inclusion in Global Search.

### 4.4 Module 4: Attendance & Leave
1. **Route & Entry Component:** `/modules/attendance` — `ModulePlaceholder.tsx` (slug `attendance`).:2. **Existing UI & Interactions:** Metric cards (Average Daily Attendance: 91.2%, Faculty Present: 98.4%, Biometric Sync: Active), 2-tab switcher (Module Records vs Planned Specifications), mock records table with row filter, and "Inspect" button.
3. **Existing Data Source:** Static table rows in `MODULES_LIST` (`src/data/mockData.ts`).
4. **What Currently Works:** Tab switching between records and planned specifications; row text filtering; responsive layout.
5. **What is Placeholder / Simulated:** Entire module is a prototype stub. "Inspect" buttons trigger browser alert dialogs. No daily session attendance marking, student attendance ledgers, or leave applications exist.
6. **Required Records & Relationships:** `ClassSession` (date, time slot, room/lab, subject, faculty), `StudentAttendance` (session, student, status: Present/Absent/Late/Excused), `LeaveRequest` (student/staff, reason, medical certificate, status: Pending/Approved/Rejected).
7. **Dependencies on Other Modules:** Strongly dependent on `Academics` (subjects/divisions), `Students` (enrolled roster), `Faculty` (assigned teacher), and `Facilities` (lab/room assignment).
8. **Validation & Permission Requirements:** Session date cannot be in the future; attendance records locked 24 hours post-session; medical leave requires documentary attachment. Permissions: Faculty (mark daily session), Students (view own percentage & submit leave), HOD/Registrar (attendance condonation & leave approval).
9. **Remaining Implementation Work:** Daily attendance grid with batch-marking for classes and kitchen labs; University of Mumbai 75% theory / 85% practical threshold warning system; medical leave submission workflow; monthly detention list generator.
10. **Practical Acceptance Test:** Select B.Sc. Hospitality Studies FY Div A; open todays Continental Kitchen practical; mark 3 students absent; verify cumulative attendance percentages recalculate instantly and display on the student dossier.

### 4.5 Module 5: Examinations & Results
1. **Route & Entry Component:** `/modules/examinations` • `ModulePlaceholder.tsx` (slug `examinations`).:2. **Existing UI & Interactions:** Metric cards (Semester Exam Window: Dec 2026, Hall Tickets Issued: 94%, Results Published: AY 2025-26), 2-tab switcher, mock table showing examination notifications, and "Inspect" action.
3. **Existing Data Source:** Static mock records in `MODULES_LIST` (`src/data/mockData.ts`).
4. **What Currently Works:** Static tabular rendering, text filtering, specification tab inspection.
5. **What is Placeholder / Simulated:** Completely non-functional stub. No examination session scheduling, hall ticket generation, marks entry, grade calculation (CBCS 10-point scale), or grade card publishing.
6. **Required Records & Relationships:** `ExaminationSession`, `ExamSchedule`, `AssessmentComponent` (Internal Continuous Assessment, Practical / Kitchen Viva, Semester End Theory), `StudentMarks`, `GradeCard`, `GraceMarksRule`.
7. **Dependencies on Other Modules:** `Academics` (syllabus scheme & passing rules), `Students` (eligibility & hall tickets), `Attendance` (minimum 75% attendance gating for exam eligibility), `Fees` (fee clearance gating).
8. **Validation & Permission Requirements:** Marks entered cannot exceed max marks; duplicate marks prohibited; marks submission requires dual-verification (teacher + external moderator). Permissions: Controller of Examinations (CoE) & Examination Cell (Admin), Faculty (enter marks), Students (view published grade cards).
9. **Remaining Implementation Work:** Assessment scheme builder; faculty marks entry spreadsheet with autosave; University of Mumbai 10-point SGPA/CGPA grade point engine; hall ticket generator with candidate photo & seat number; revaluation/re-checking application tracker.
10. **Practical Acceptance Test:** Enter internal marks (20) and semester theory marks (60) for a student in Cloud Architecture; verify total marks (80/100) automatically computes grade 'O' (10 grade points), updates SGPA, and produces a printable PDF grade card.

### 4.6 Module 6: Fees & Finance
1. **Route & Entry Component:** `/modules/finance` ↑ `ModulePlaceholder.tsx` (slug `finance`).
2. **Existing UI & Interactions:** Metric cards (Collection Target: ₹4.82 Cr, Collected YTD: 78.4%, Defaulters Notice: Active), 2-tab switcher, mock table showing fee installment status per student cohort, text search.
3. **Existing Data Source:** Static mock records in `MODULES_LIST` (`src/data/mockData.ts`).
4. **What Currently Works:** Static table display and row filtering.
5. **What is Placeholder / Simulated:** Entire financial system is a stub. No ledger accounts, fee receipt generation, payment gateway stubs, scholarship/concession adjustments, or bank reconciliation.
6. **Required Records & Relationships:** `FeeStructure` (programme, year, category: tuition, lab, library, caution deposit), `StudentFeeAccount`, `FeeInvoice`, `FeePayment` (receipt number, transaction ID, payment mode, amount, date), `FeeConcession` (caste scholarship, merit waiver).
7. **Dependencies on Other Modules:** Strongly dependent on `Students` (enrolled roster & category) and `Academics` (programme fee structure); blocks `Examinations` (hall ticket issuance) and `Students` (admission confirmation).
8. **Validation & Permission Requirements:** Payment amounts must match invoice installment; receipts must have tamper-proof serial numbers; fee waivers require Principal authorization. Permissions: Bursar / Accounts Office (full write), Students/Parents (view invoices & download receipts), Management (financial reports).
9. **Remaining Implementation Work:** Multi-head fee structure configuration (Tuition, Kitchen Consumables Lab Fee, IT Lab Fee, University Exam Fee); installment payment ledger; PDF receipt generator with digital seal; outstanding dues aging report.
10. **Practical Acceptance Test:** Issue an invoice of  45,000 for B.Sc. Culinary Arts Term 1; record a simulated payment of  45,000 via NEFT; verify student fee status updates from 'Pending' to 'Paid' and generates official receipt #RPIHM-RCP-2026-084.

### 4.7 Module 7: Library & Resources
1. **Route & Entry Component:** `/modules/library` • `ModulePlaceholder.tsx` (slug `library`).
2. **Existing UI & Interactions:** Metric cards (Catalogued Titles: 14,200, Digital Journals: 2,400, Active Borrowers: 412), 2-tab switcher, mock accession table showing books like Larousse Gastronomique and AI A Modern Approach.
3. **Existing Data Source:** Static records in `MODULES_LIST` (`src/data/mockData.ts`).
4. **What Currently Works:** Searchable view of 4 sample culinary and technology books; specification tab.
5. **What is Placeholder / Simulated:** Non-functional placeholder. No book borrowing, barcode scanning, due date reminders, fine calculations, or DELNET journal integration.
6. **Required Records & Relationships:** `LibraryBook` (ISBN, title, author, edition, category), `BookCopy` (accession number, shelf location, status), `BookIssueRecord` (borrower student/staff, issue date, due date, return date, overdue fine).
7. **Dependencies on Other Modules:** `Students` and `Faculty` (borrower identification via PRN/Staff ID).
8. **Validation & Permission Requirements:** Max 3 books per student, 6 per faculty; maximum 14-day borrowing duration; fine calculated at  5/day overdue. Permissions: Chief Librarian (issue/return/catalog), Students/Faculty (search OPAC & reserve).
9. **Remaining Implementation Work:** Digital OPAC (Online Public Access Catalog) with category filters; issue/return barcode scanner interface; automated overdue notification engine.
10. **Practical Acceptance Test:** Issue copy #ACC-0842 of "Modern Cookery by Thangam Philip" to student Aarav Sharma; verify status changes to "Issued" with return date 14 days ahead, and prevents issuing more than the student borrowing limit.

### 4.8 Module 8: Placements & Industry
1. **Route & Entry Component:** `/modules/placements` ↑ `ModulePlaceholder.tsx` (slug `placements`).
2. **Existing UI & Interactions:** Metric cards (Recruiting Partners: 84+, Placement Rate: 94.8%, Highest Package:  14.5 LPA), 2-tab switcher, mock table showing campus drive schedules for Marriott, Taj Hotels, Oberoi, Infosys, and TCS.
3. **Existing Data Source:** Static mock records in `MODULES_LIST` (`src/data/mockData.ts`).
4. **What Currently Works:** Text filtering across drive listings and specification tab viewing.
5. **What is Placeholder / Simulated:** Simulated placeholder. No student resume repository, job application submission, eligibility shortlisting, interview round tracking, or offer letter tracking.
6. **Required Records & Relationships:** `RecruitingCompany`, `PlacementDrive`, `JbOpening` (role, CTC package, minimum CGPA eligibility, eligible programmes), `StudentApplication`, `InterviewRound`, `PlacementOffer`.
7. **Dependencies on Other Modules:** `Students` (academic records & eligibility), `Academics` (programme filtering), `Examinations` (CGPA validation).
8. **Validation & Permission Requirements:** Student cannot apply if CGPA is below company cutoff; student limited to 1 dream offer policy. Permissions: Training & Placement Officer (TPO") (manage drives/offers), Students (apply & upload resume).
9. **Remaining Implementation Work:** Drive announcement portal; student application and resume builder; eligibility auto-screening engine based on student CGPA and attendance; placement statistics dashboard.
10. **Practical Acceptance Test:** Post a drive for "Taj Hotels — Management Trainee" requiring min 7.5 CGPA; verify eligible TY Hospitality students can apply, while ineligible or non-final year students receive a clear criteria restriction notice.

### 4.9 Module 9: Hospitality Labs & Facilities
1. **Route & Entry Component:** `/modules/facilities` — `ModulePlaceholder.tsx` (slug `facilities`).:2. **Existing UI & Interactions:** Metric cards (Operational Labs: 16, Active Today: 14, Hygiene Rating: A+), 2-tab switcher, mock table listing Basic Training Kitchen 1, Advance Training Kitchen, Bakery Studio, Grand Heritage Training Restaurant, and IT/AI Lab 1.
3. **Existing Data Source:** Static mock records in `MODULES_LIST` and `CAMPUS_FACILITIESc (`src/data/mockData.ts`).
4. **What Currently Works:** Tab switching, row filtering, inspection alert dialogs.
5. **What is Placeholder / Simulated:** Entire lab booking, inventory requisition, and maintenance workflow is a prototype stub.
6. **Required Records & Relationships:** `FacilityRoom` / `Lab` (code, name, category, capacity, workstation count), `LabEquipment`, `FacilityBooking` (time slot, batch, faculty in charge, session topic), `MaintenanceTicket`, `CulinaryIndent` (daily food items requisition).
7. **Dependencies on Other Modules:** `Academics` (practical curriculum), `Faculty` (lab in-charge), `Students` (batch workstation allocation), and `Timetable`.
8. ***Validation & Permission Requirements:** Dual booking of same lab at same time slot prohibited; kitchen sanitization windows must be respected; equipment breakdown triggers instant maintenance notice. Permissions: Lab Assistants & Chefs (indents/maintenance), Estates Officer (full oversight).
9. **Remaining Implementation Work:** Visual lab schedule calendar; daily culinary perishable store requisition/indent ledger; computer lab GPU workstation status monitor; facility booking reservation conflict checker.
10. **Practical Acceptance Test:** Attempt to schedule BTK-1 (Basic Training Kitchen) on Wednesday 10:00 AM for B.A. Culinary Arts while already booked by B.Sc. Hospitality; verify system rejects with a timetable collision error.



### 4.10. Module 10: Events & Academic Calendar (Slug: `calendar`)
1. **Route & Entry Component:** `/modules/calendar` (`type=modules slug=calendar`).
2. **Existing UI & Interactions:** Monthly/Weekly filterable grid view, event category chips (Academic, Hospitality Workshop, Exam, Cultural, Holiday), "Create Event" modal trigger.
3. **Existing Data Source:** `src/data/mockData.ts` (`CALENDAR_EVENTS`).
4. **What Currently Works:** Date browsing, event category filtering, clicking an event displays a detailed preview flyout with time, venue, coordinator, and guest speaker.
5. **What is Placeholder / Simulated:** Event creation persistence, Google Calendar / iCal export sync, student attendance RSVP, and certificate generation.
6. **Required Records & Relationships:** `CampusEvent` (id, title, slug, description, category, start_time, end_time, venue_id, organizer_id, is_published), `EventRegistration` (id, event_id, student_id, registered_at, is_present), `AcademicTermCalendar` (term_name, start_date, end_date, exam_start_date).
7. **Dependencies on Other Modules:** `Facilities` (venue reservation), `Faculty & Staff` (event coordinator), `Students` (attendees), `Notices` (announcement broadcast).
8. **Validation & Permission Requirements:** Venue collision validation with facility bookings; events cannot override university exam lockdown windows without Registrar approval. Permissions: Event Coordinator (create draft), Principal / Registrar (approve & publish).
9. **Remaining Implementation Work:** iCal/ICS sync endpoint; automated reminders via email; venue clash detector; workshop certificate generation workflow.
10. **Practical Acceptance Test:** Schedule "Annual Chef Conclave" in Grand Heritage Training Restaurant; confirm facility reservation is created, notice circular is queued, in-app calendar updates, and iCal feed includes the event.

---


### 4.11. Module 11: Notices & Circulars (Slug: `notices`)
1. **Route & Entry Component:** `/modules/notices` -> `ModulePlaceholder.tsx` (slug `notices`).
2. **Existing UI & Interactions:** Filterable circular board with target audience badges (All, Faculty, Students, H.S. Only), priority chips (Urgent, Routine, Statutory), attachment links, search bar, "Draft Notice" action.
3. **Existing Data Source:** `CAMPUS_NOTICES` in `src/data/mockData.ts`.
4. **What Currently Works:** Category and audience filtering, full-text client search, previewing notice text in a reading pane with downloadable PDF mock buttons.
5. **What is Placeholder / Simulated:** Publishing workflow, rich-text editor, file upload to S3/Cloud Storage, push notifications, read-receipt acknowledgments.
6. **Required Records & Relationships:** `Notice` (id, reference_no, title, body_html, issued_by_id, department_id, priority, target_audience, publish_at, expires_at, is_pinned, is_statutory), `NoticeAttachment` (id, notice_id, file_url, file_name, file_size, mime_type), `NoticeAcknowledgment` (id, notice_id, user_id, read_at).
7. **Dependencies on Other Modules:** `Faculty & Staff` (issuing authority), `Academics & Students` (targeted audience by cohort/department), `TopBar` (counter badge).
8. **Validation & Permission Requirements:** Unique institutional reference number (e.g., `RPIHM/CIR/2026/042`); statutory circulars require mandatory digital acknowledgment. Permissions: Department Staff (draft), HOD / Registrar / Principal (approval & broadcast).
9. **Remaining Implementation Work:** Role-based delivery routing; automated archival upon expiry; email & SMS webhooks; attachment presigned URL security.
10. **Practical Acceptance Test:** Issue an urgent circular "Food Production Uniform Code & Grooming Audit" targeted only at Hospitality semester 1 students; verify student portal displays an unavoidable read-acknowledgment modal on next login.

---

### 4.12. Module 12: Reports & Analytics (Slug: `reports`)
1. **Route & Entry Component:** `/modules/reports` -> `ModulePlaceholder.tsx` (slug `reports`).
2. **Existing UI & Interactions:** Report catalog categorized by NAAC, NIRF, AISHE, Fee Defaulters, Low Attendance, Placement Dossiers, custom date range picker, "Generate Report" button with spinner.
3. **Existing Data Source:** Aggregated static mock statistics in `src/data/mockData.ts` and `ExecutiveOverview.tsx`.
4. **What Currently Works:** Report card browsing, parameter selection dropdowns, download trigger with browser mock alert.
5. **What is Placeholder / Simulated:** Dynamic SQL aggregations, PDF rendering engines (Puppeteer/React-PDF), Excel streaming exports, scheduled email delivery to Governing Council.
6. **Required Records & Relationships:** `SavedReportDefinition` (id, title, slug, category, sql_template, parameter_schema), `ReportExecutionLog` (id, report_id, executed_by_id, duration_ms, output_format, file_url, created_at).
7. **Dependencies on Other Modules:** Cross-cutting integration across ALL 12 modules (Students, Faculty, Attendance, Exams, Finance, Placements, Library).
8. **Validation & Permission Requirements:** Data masking of sensitive student PII and staff salary; rate limiting of report generation. Permissions: Executive Council, Principal, IQAC Coordinator, Registrar (full), Department HODs (department-scoped).
9. **Remaining Implementation Work:** PostgreSQL materialized views for institutional KPIs; server-side streaming CSV generator; PDF templates with official RPIHM letterhead and detailed queries.
10. **Practical Acceptance Test:** Generate "AISHE Form-C Staff-Student Ratio & Infrastructure Report"; verify system queries database records, computes compliant ratios, and generates a formatted PDF with institutional verification hash.

---

### 4.13. Module 13: System Settings & Governance (Slug: `settings`)
1. **Route & Entry Component:** `/modules/settings` -> `ModulePlaceholder.tsx` (slug `settings`).
2. **Existing UI & Interactions:** 5-tab configuration hub (General Campus Info, Academic Term Setup, User Roles & RBAC Matrix, Security & Backup Logs, Email/SMS Gateway Integrations).
3. **Existing Data Source:** `SYSTEM_SETTINGS` in `src/data/mockData.ts`.
4. **What Currently Works:** Tab switching, toggle switches for maintenance mode and 2FA, previewing mock audit trail table with IP addresses.
5. **What is Placeholder / Simulated:** Database backup snapshot trigger, SMTP credential saving, OAuth SSO configuration, live audit log stream.
6. **Required Records & Relationships:** `SystemSetting` (key, value_json, category, is_secret, updated_by_id, updated_at), `AuditLog` (id, user_id, action_type, entity_name, entity_id, old_values_json, new_values_json, ip_address, created_at), `Role`, `Permission`, `RolePermissionMapping`.
7. **Dependencies on Other Modules:** Global foundational dependency; provides authorization boundaries, academic constants, and notification gateways for all modules.
8. **Validation & Permission Requirements:** Super Admin authentication with hardware 2FA required for system configuration changes; immutable audit trail (no UPDATE or DELETE queries permitted on `AuditLog`). Permissions: Super Administrator only.
9. **Remaining Implementation Work:** True database audit trail middleware; automated daily pg_dump backup rotation to encrypted S3; SMTP verification handshake; health monitor.
10. **Practical Acceptance Test:** Modify the academic grading scheme threshold in Settings; verify examination mark validations use the updated threshold and an immutable entry is logged in `AuditLog`.

---

### 4.14. Executive Overview Dashboard & Shell Audit
1. **Components:** `ExecutiveOverview.tsx`, `TopBar.tsx`, `Sidebar.tsx`, `GlobalSearchModal.tsx`, `NotificationPopover.tsx`, `ProfileModal.tsx`, `ModuleSaveBar.tsx`, `ModulePreviewModal.tsx`.
2. **Existing UI & Interactions:**
   - Real-time animated KPI metric cards with sparkline trends.
   - Quick Action buttons ("New Student", "New Faculty", "Record Fee", "Mark Attendance").
   - Campus photo cards highlighting flagship facilities with subtle camouflage-hover zoom.
   - Glowing search bar (`#poda` container) with shortcut `Ctrl+K` opening `GlobalSearchModal`.
   - Notification bell popover with unread counter badge.
   - Profile avatar trigger opening authenticated session modal with credentials and role badge.
3. **Existing Data Source:** Consolidated mock records from `mockData.ts`, `mockFaculty.ts`, and local React states.
4. **Current Status & Transition:**
   - The UI/UX design, animations, colors, shadows, and responsive layouts are 100% frozen and approved.
   - The transition requires connecting the Quick Action buttons to operational modals (or deep-linked routes), and populating KPI cards via cached server-side aggregations.

---

## 5. Persistence & Database Migration Strategy

### 5.1. Current Prototype Limitations
Currently, student and faculty records are loaded from browser memory and typed TypeScript mock objects (`src/data/mockData.ts`, `src/data/mockFaculty.ts`). This architecture has inherent institutional limitations:
- Changes do not persist across user sessions or browser cache resets.
- Multi-user concurrency causes race conditions and data divergence.
- Lack of relational integrity constraints permits orphaned or corrupted entries.
- Search is client-side, making scaling to thousands of historical student records impossible.

### 5.2. Recommended Production Stack
To ensure enterprise-grade reliability, compliance, and developer velocity while strictly maintaining the existing Next.js 16 (App Router), React 19, and TypeScript stack:
- **Database Engine:** PostgreSQL 16+ (or managed Cloud PostgreSQL on AWS RDS / GCP Cloud SQL / Supabase / Neon).
- **ORM & Schema Management:** Prisma ORM 5.x / 6.x.
  - *Rationale:* Prisma delivers type-safe TypeScript query generation matching our strict domain models, declarative schema migrations with `prisma migrate`, built-in connection pooling, and automated TypeScript definitions.
- **Data Access Pattern:** Next.js Server Actions and dedicated service repositories (`src/services/` or `src/lib/dal/`) executed exclusively in Node server context.
- **Connection Pooling:** PgBouncer or Prisma Accelerate for serverless / App Router connection efficiency.

### 5.3. Zero-Downtime Migration & Data Preservation Plan
To safely graduate from mock prototypes to the PostgreSQL database without breaking existing approved UI:
1. **Dual-Mode Data Layer (Adapter Pattern):**
  - Create a clean Data Access Layer interface (e.g., `IStudentRepository`, `IFacultyRepository`).
  - Implement `PrismaStudentRepository` alongside `MockStudentRepository`.
  - Control data sourcing via environment variable `DATA_SOURCE=prisma` (with fallback to `mock` during offline testing).
2. **Seed Script Architecture (`prisma/seed.ts`):**
  - The seed script ingests the current approved datasets in `mockData.ts` and `mockFaculty.ts` and transforms them into relational database rows with deterministic UUIDs.
  - Preserves all 8+ comprehensive faculty profiles (Chef Jean-Luc, Dr. Rajesh, Prof. Ananya, etc.) and all student cohorts.
3. **Database Setup Sequence:**
  - `npm install @prisma/client` & `npm install -D prisma`
  - `npx prisma init`
  - `npx prisma migrate dev --name init_campusos_core`
  - `npx prisma db seed`

### 5.4. Transactional Integrity & Error Handling
All operations involving financial ledgers, enrollment creation, course registration, and mark publishing MUST be executed inside explicit database transactions (`prisma.$transaction`).
- **Rollback Guarantee:** If a student fee record is inserted but payment gateway transaction logging fails, the entire transaction rolls back.
- **Consistent API Responses:** Standardized server action response envelope (`ActionResponse<T>`).

### 5.5. Backup, Disaster Recovery & Archival
- **Automated Daily Backups:** Point-in-time recovery (PITR) enabled with 30-day retention.
- **Disaster Recovery Target:** RPO < 15 minutes; RTO < 1 hour.
- **Audit Table Immutability:** Sensitive audit logs (`audit_logs`) and financial transaction tables enforce append-only policies via PostgreSQL row-level triggers preventing UPDATE and DELETE.

---

## 6. Authentication & Authorization Architecture (RBAC)

### 6.1. Role Hierarchy Matrix
The ERP enforces a strict institutional Role-Based Access Control (RBAC) model:

| Role Code | Role Name | Primary Responsibilities | Scope of Access |
| :--- | :--- | :--- | :--- |
| **`SUPER_ADMIN`** | System Administrator | IT Infrastructure, backup, RBAC, system config | Global (Unrestricted) |
| **`PRINCIPAL`** | Principal / Director | Executive governance, staff appraisal, policy approval | Institutional Read-All, Executive Approval |
| **`REGISTRAR`** | Academic Registrar | Admissions, enrollment, examinations, official transcripts | All Academic & Student records |
| **`HOD`** | Head of Department | Departmental timetable, subject allocation, lab oversight | Departmental Students, Faculty & Facilities |
| **`FACULTY`** | Faculty / Chef Instructor | Attendance entry, internal marks, teaching logs | Assigned subjects, divisions & mentor batches |
| **`BURSAR`** | Finance Officer / Cashier | Fee collection, receipts, defaulter tracking, reconciliation | Financial ledgers, fee structures, receipts |
| **`TPO`** | Training & Placement Officer | Corporate tie-ups, drives, student placement dossiers | Placement records, student resumes, company logs |
| **`LIBRARIAN`** | Head Librarian | Book catalog, circulation, fines, inventory | Library circulation, student/staff clearance |
| **`LAB_TECH`** | Lab Assistant / Storekeeper | Kitchen store indents, equipment maintenance, lab setups | Facilities, equipment, perishable store requests |
| **`STUDENT`** | Enrolled Student | View grades, attendance, notices, fee receipts, timetable | Self-scoped records only (Strict Row Isolation) |

### 6.2. Server-Side Enforcement (Defense-in-Depth)
1. **Next.js Middleware (`middleware.ts`):** Validates encrypted JWT session cookie on every request. Rejects unauthorized attempts before route rendering.
2. **Server Action & API Authorization Guards:** Role and permission validation per action, row-level scoping (e.g. Faculty can only mark attendance for their assigned subjects/divisions).
3. **Database Row-Level Security (RLS) / Scoped Queries:** Student users query exclusively with automatic `WHERE student_id = :authenticatedStudentId` isolation.

---

## 7. Institutional Accuracy, Evidence & Regulatory Distinctions

### 7.1. Epistemic Rigor & Truth Categorization
To safeguard academic credibility and prevent regulatory non-compliance, all data within RPIHM CampusOS is strictly categorized across five operational tiers:
1. **Verified Institutional Information:** Publicly affirmed facts regarding R. P. Institute of Hospitality & Management (campus location, recognized hospitality disciplines, executive management structure, approved lab facilities like Basic Training Kitchen, Advance Training Kitchen, Bakery Studio, Grand Heritage Training Restaurant).
2. **Existing Implementation Realities:** Approved frontend components, styling, routing, color palettes, and UI patterns currently committed in the Git repository.
3. **Fictional Demonstration Data:** Sample student profiles, fictional faculty members (e.g., Chef Jean-Luc, Dr. Rajesh), simulated phone numbers, and placeholder transaction IDs used exclusively for testing and workflow demonstration.
4. **Proposed Workflows:** Standard operating procedures recommended by enterprise ERP best practices (e.g., dual-approval fee concessions, semester mark lockouts) pending formal college notification.
5. **Rules Requiring Formal Institutional Confirmation:** Parameters that MUST be explicitly ratified by college authorities prior to production deployment (e.g., mandatory attendance percentage threshold [75% vs 80%], passing grade thresholds, fee installment late fee fine rates, refund policies).

### 7.2. Accreditation & Compliance Readiness
The schema and module architecture are designed to natively output reporting datasets compliant with:
- **University of Mumbai / Affiliating University Norms:** Academic terms, credit structures, external examination rosters.
- **NAAC (National Assessment and Accreditation Council):** Student progression, mentor-mentee logs, faculty publications, infrastructure utilization.
- **NIRF (National Institutional Ranking Framework):** Placement statistics, median salary, student diversity, faculty qualification ratios.
- **AISHE (All India Survey on Higher Education):** Annual institutional data returns.
