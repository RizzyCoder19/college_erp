# RPIHM CampusOS -- Master Module & Feature Coverage Matrix

**Document Version:** 1.0.0 (Master Audit)
**Classification:** Functional Coverage Matrix & UI Control Inventory
**Target Institute:** R. P. Institute of Hospitality & Management
**Project Path:** G:\rpihm-campusos
**Git Commit Reference:** fe0608 (clean tree)
**Audit Date:** October 2026

---

## 1. Six-Tier Functional Classification System

Every screen, view, modal, button, and data flow in RPIHM CampusOS is categorized into one of six strict operational tiers. A successful production build or an HTTP 200 response does NOT equate to a functioning workflow:

1. **Implemented and Verified (Tier 1):** Code is written, interactive, validated against strict TypeScript types, persists within the session state, and has been verified via actual user workflow testing.
2. **Implemented but Not Yet Interaction-Tested (Tier 2):** Component exists and compiles cleanly, but complex edge-case interactions have not yet been validated.
3. **Partially Implemented (Tier 3):** UI exists and client-side interactions work (e.g. filtering, search, tab switching), but backend persistence, editing, or deep workflow logic is simulated.
4. **Static or Placeholder Only (Tier 4):** Static mock data rendered via ModulePlaceholder.tsx; action buttons trigger simulated browser toasts or alerts.
5. **Not Implemented (Tier 5):** Feature is necessary for institutional operations but has zero frontend or backend implementation.
6. **Requires Institutional Confirmation (Tier 6):** Policy, calculation formula, or institutional regulation that MUST be formally ratified by RPIHM authorities prior to implementation.

---

## 2. Module-by-Module Coverage Matrix

| Module / Subsystem | Feature / Screen | Status Tier | Code Location / Evidence | Target Phase |
| :--- | :--- | :--- | :--- | :--- |
| **Global Shell** | Animated Glowing Search (#poda) | **Tier 1: Implemented & Verified** | TopBar.tsx, globals.css | Frozen Core |
| **Global Shell** | Command Palette Modal (Ctrl+K) | **Tier 1: Implemented & Verified** | GlobalSearchModal.tsx | Frozen Core |
| **Global Shell** | Sidebar Module Switchboard | **Tier 1: Implemented & Verified** | Sidebar.tsx, ModuleSwitchboard.tsx | Frozen Core |
| **Global Shell** | Notification Popover Drawer | **Tier 3: Partially Implemented** | NotificationPopover.tsx (mock data) | Phase 10 |
| **Global Shell** | Profile / Session Modal | **Tier 3: Partially Implemented** | ProfileModal.tsx (hardcoded admin role) | Phase 2 |
| **Executive Overview** | KPI Metric Cards & Sparklines | **Tier 3: Partially Implemented** | ExecutiveOverview.tsx (static aggregates) | Phase 12 |
| **Executive Overview** | Quick Action Launchpads | **Tier 3: Partially Implemented** | ExecutiveOverview.tsx (opens modals) | Phase 4-8 |
| **Executive Overview** | Campus Photo Showcase | **Tier 1: Implemented & Verified** | ExecutiveOverview.tsx (frozen zoom) | Frozen Core |
| **Student Management** | Searchable Student Register | **Tier 1: Implemented & Verified** | StudentManagementView.tsx | Phase 4 (DB) |
| **Student Management** | Add Student Modal & Validation | **Tier 1: Implemented & Verified** | StudentManagementView.tsx | Phase 4 (DB) |
| **Student Management** | Student Profile Flyout Drawer | **Tier 1: Implemented & Verified** | StudentManagementView.tsx | Phase 4 (DB) |
| **Student Management** | PostgreSQL Relational Persistence | **Tier 5: Not Implemented** | Client React state only | Phase 4 |
| **Student Management** | Admission Quota & Documents | **Tier 6: Requires Confirmation** | Needs MU / DTE quota rules | Phase 5 |
| **Faculty & Staff** | Searchable Faculty Directory | **Tier 1: Implemented & Verified** | FacultyManagementView.tsx | Phase 4 (DB) |
| **Faculty & Staff** | Category Tabs & Dept Filter | **Tier 1: Implemented & Verified** | FacultyManagementView.tsx | Phase 4 (DB) |
| **Faculty & Staff** | Add Faculty Modal & Validation | **Tier 1: Implemented & Verified** | FacultyManagementView.tsx | Phase 4 (DB) |
| **Faculty & Staff** | Comprehensive Profile Drawer (4 Tabs) | **Tier 1: Implemented & Verified** | FacultyManagementView.tsx | Phase 4 (DB) |
| **Faculty & Staff** | Biometric Punch Integration | **Tier 5: Not Implemented** | Zero hardware/biometric API link | Phase 6 |
| **Academics** | Programme Cards & Credit Counts | **Tier 3: Partially Implemented** | AcademicsView.tsx (hardcoded stats) | Phase 3 |
| **Academics** | Syllabus PDF Preview Triggers | **Tier 4: Static / Placeholder** | AcademicsView.tsx (simulated alerts) | Phase 3 |
| **Academics** | Add Programme / Course Modal | **Tier 5: Not Implemented** | Zero modal or creation action | Phase 3 |
| **Attendance & Leave** | Daily Attendance Summary Cards | **Tier 4: Static / Placeholder** | ModulePlaceholder.tsx (attendance slug) | Phase 6 |
| **Attendance & Leave** | Leave Approval Action Buttons | **Tier 4: Static / Placeholder** | ModulePlaceholder.tsx (simulated toast) | Phase 6 |
| **Attendance & Leave** | Session-Based Roll Call Sheet | **Tier 5: Not Implemented** | Zero session marking grid | Phase 6 |
| **Attendance & Leave** | 75% Mandatory Threshold Action | **Tier 6: Requires Confirmation** | Needs college debarment rule | Phase 6 |
| **Examinations** | Timetable Overview Table | **Tier 4: Static / Placeholder** | ModulePlaceholder.tsx (examinations slug) | Phase 7 |
| **Examinations** | Mark Entry Grid (Internal/Practical) | **Tier 5: Not Implemented** | Zero tabular mark entry sheet | Phase 7 |
| **Examinations** | SGPA/CGPA Grading Formula | **Tier 6: Requires Confirmation** | Needs MU 10-point credit scale | Phase 7 |
| **Fees & Finance** | Financial KPI Cards & Ledger Table | **Tier 4: Static / Placeholder** | ModulePlaceholder.tsx (finance slug) | Phase 8 |
| **Fees & Finance** | Record Payment Modal Trigger | **Tier 4: Static / Placeholder** | ModulePlaceholder.tsx (simulated alert) | Phase 8 |
| **Fees & Finance** | Razorpay / Bank Webhook Integration | **Tier 5: Not Implemented** | Zero gateway connector | Phase 8 |
| **Fees & Finance** | Fee Concession Approval Policy | **Tier 6: Requires Confirmation** | Needs Governing Council policy | Phase 8 |
| **Library** | Catalog Browsing & Availability | **Tier 4: Static / Placeholder** | ModulePlaceholder.tsx (library slug) | Phase 11 |
| **Library** | Book Issue / Return Circulation Desk | **Tier 5: Not Implemented** | Zero circulation workflow | Phase 11 |
| **Placements** | Placement KPI Banner & Partners | **Tier 4: Static / Placeholder** | ModulePlaceholder.tsx (placements slug) | Phase 9 |
| **Placements** | Student Drive Application Tracker | **Tier 5: Not Implemented** | Zero application flow | Phase 9 |
| **Facilities** | Kitchen Lab Inventory & Hygiene | **Tier 4: Static / Placeholder** | ModulePlaceholder.tsx (facilities slug) | Phase 11 |
| **Facilities** | Daily Perishable Store Indent | **Tier 5: Not Implemented** | Zero store requisition engine | Phase 11 |
| **Calendar & Events** | Monthly Calendar Grid & Filters | **Tier 4: Static / Placeholder** | ModulePlaceholder.tsx (calendar slug) | Phase 10 |
| **Calendar & Events** | iCal / Google Calendar Feed Sync | **Tier 5: Not Implemented** | Zero ICS feed endpoint | Phase 10 |
| **Notices & Circulars** | Filterable Circular Board | **Tier 4: Static / Placeholder** | ModulePlaceholder.tsx (notices slug) | Phase 10 |
| **Notices & Circulars** | Mandatory Digital Acknowledgment | **Tier 5: Not Implemented** | Zero read-receipt logic | Phase 10 |
| **Reports & Analytics** | Regulatory Report Catalog Cards | **Tier 4: Static / Placeholder** | ModulePlaceholder.tsx (reports slug) | Phase 12 |
| **Reports & Analytics** | Live SQL Aggregations & PDF Export | **Tier 5: Not Implemented** | Zero reporting engine | Phase 12 |
| **Settings & Config** | 5-Tab Governance Hub UI | **Tier 4: Static / Placeholder** | ModulePlaceholder.tsx (settings slug) | Phase 1-2 |
| **Settings & Config** | Immutable Database Audit Log | **Tier 5: Not Implemented** | Zero DB trigger / append log | Phase 1 |

---

## 3. Comprehensive Inventory of Non-Functioning and Simulated UI Controls

The following table explicitly catalogs every visible button, dropdown filter, modal trigger, export control, and status toggle across all views that does NOT yet perform live database persistence or transactional execution:

| # | Screen / Location | Visible UI Control | Advertised Action | Current Prototype Behavior | Required Relational Action | Remediation Phase |
| :- | :--- | :--- | :--- | :--- | :--- | :--- |
| 1 | ExecutiveOverview.tsx | 'Record Fee' Quick Action | Open fee collection modal | Simulated alert modal | Deep link to FeeCollectionModal with student billing lookup | Phase 8 |
| 2 | ExecutiveOverview.tsx | 'Mark Attendance' Quick Action | Launch daily attendance sheet | Simulated alert modal | Navigate to attendance view with today active session filter | Phase 6 |
| 3 | AcademicsView.tsx | 'Download Syllabus' buttons | Download official course syllabus PDF | Simulated alert dialog | Stream verified PDF asset from AWS S3 or Cloud Storage | Phase 3 |
| 4 | AcademicsView.tsx | 'Edit Course Structure' | Modify semester subject allocation | Non-interactive static button | Open CourseStructureModal guarded by Academic Dean RBAC | Phase 3 |
| 5 | ModulePlaceholder.tsx (Attendance) | 'Approve Leave' button | Approve staff/student leave | Browser alert notification | Mutate LeaveApplication status to APPROVED with audit note | Phase 6 |
| 6 | ModulePlaceholder.tsx (Attendance) | 'Reject Leave' button | Reject leave request | Browser alert notification | Mutate LeaveApplication status to REJECTED with reason prompt | Phase 6 |
| 7 | ModulePlaceholder.tsx (Examinations) | 'Publish Results' button | Publish semester grade sheets | Simulated confirmation toast | Lock raw marks and generate official transcripts in transaction | Phase 7 |
| 8 | ModulePlaceholder.tsx (Examinations) | 'Download Timetable' | Export PDF exam schedule | Non-functional link | Generate university-format PDF timetable with QR code | Phase 7 |
| 9 | ModulePlaceholder.tsx (Finance) | 'Record Payment' action | Log student tuition payment | Simulated alert dialog | Launch PaymentEntryModal, calculate dues, issue receipt | Phase 8 |
| 10 | ModulePlaceholder.tsx (Finance) | 'Download Statement' | Export student fee ledger CSV/PDF | Simulated toast | Stream transactional receipt history with GST tax invoice | Phase 8 |
| 11 | ModulePlaceholder.tsx (Library) | 'Reserve Book' button | Place hold on library title | Simulated notification | Insert into BookReservation table and alert librarian | Phase 11 |
| 12 | ModulePlaceholder.tsx (Placements) | 'Apply for Drive' button | Submit student application | Simulated alert dialog | Validate eligibility criteria (CGPA/backlogs) and attach resume | Phase 9 |
| 13 | ModulePlaceholder.tsx (Facilities) | 'Request Lab Indent' | Order groceries for kitchen practical | Simulated toast | Submit KitchenIndent with chef digital signature to Storekeeper | Phase 11 |
| 14 | ModulePlaceholder.tsx (Facilities) | 'Report Equipment Issue' | Log broken oven / workstation | Simulated alert dialog | Create MaintenanceTicket and notify Estate Officer | Phase 11 |
| 15 | ModulePlaceholder.tsx (Calendar) | 'Export iCal' action | Sync calendar with Outlook/Google | Simulated download alert | Generate dynamic .ics subscription feed with live token | Phase 10 |
| 16 | ModulePlaceholder.tsx (Notices) | 'Draft Notice' button | Author institutional circular | Non-interactive button | Open NoticeEditorModal with rich text, target cohort, attachments | Phase 10 |
| 17 | ModulePlaceholder.tsx (Reports) | 'Generate Report' button | Run NAAC / AISHE compliance query | Progress spinner simulation | Execute server action, query materialized views, render PDF/Excel | Phase 12 |
| 18 | ModulePlaceholder.tsx (Settings) | 'Trigger Backup Snapshot' | Create database dump | Simulated progress bar | Trigger encrypted PostgreSQL pg_dump and upload to S3 | Phase 1 |
| 19 | ModulePlaceholder.tsx (Settings) | 'Save SMTP Configuration' | Persist email server credentials | Simulated toast | Test SMTP handshake and encrypt credentials in SystemSetting | Phase 2 |
| 20 | NotificationPopover.tsx | 'Clear All Notifications' | Dismiss all active alerts | Local state clear only | Mutate unread notification records in database | Phase 10 |

---

## 4. Key Institutional Policies Requiring Ratification (Tier 6)

1. **Mandatory Attendance Cutoff:** Confirm whether the strict examination debarment threshold is **75%** (standard University of Mumbai) or **80%** (internal hospitality practical standard).
2. **Passing Marks and Grace Mark Policy:** Confirm maximum allowed internal assessment weightage (20% or 40%) and rules governing condonation/grace marks.
3. **Fee Installment Fine Structure:** Confirm exact daily or weekly late fee penalty rates, grace periods, and debarment consequences for fee defaulters.
4. **Placement Policy:** Confirm whether the 'One Student One Dream Offer' policy is strictly enforced or if students may accept multiple corporate offers.
