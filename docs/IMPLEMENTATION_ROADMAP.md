# RPIHM CampusOS -- Master ERP Implementation Roadmap

**Document Version:** 1.0.0 (Master Release)
**Classification:** Phased Engineering Delivery Plan
**Target Institute:** R. P. Institute of Hospitality & Management
**Project Path:** G:\\rpihm-campusos
**Audit Date:** October 2026

---

## 1. Phased Architecture Strategy

A successful enterprise ERP cannot be constructed by developing isolated CRUD modules that use disparate storage mechanisms. To ensure that every module operates as part of one coherent academic system, the implementation must follow a strict, dependency-aware sequence:

`
[Phase 1: DB & ORM Foundation]
        │
[Phase 2: Auth & RBAC Security]
        │
[Phase 3: Academic Master Data]
        │
[Phase 4: Student & Faculty DB Sync]
   ┌────┴────────────────────────┬────────────────────────┐
   ▼                             ▼                        ▼
[Phase 5: Admissions]    [Phase 6: Attendance]    [Phase 8: Finance]
   │                             │                        │
   │                             ▼                        │
   │                     [Phase 7: Examinations] ◄────────┘
   │                             │
   └─────────────┬───────────────┘
                 ▼
         [Phase 9: Placements]
                 │
   ┌─────────────┴───────────────┐
   ▼                             ▼
[Phase 10: Calendar & Notices]  [Phase 11: Facilities & Library]
   └─────────────┬───────────────┘
                 ▼
[Phase 12: Regulatory Reports & Hardening]
`

---

## 2. Detailed Phase Specifications

### Phase 1: Architecture, PostgreSQL & Prisma Foundation
- **Deliverables:**
  - Prisma CLI and @prisma/client installed and configured.
  - Complete schema definition in prisma/schema.prisma covering all 11 clusters.
  - Initial baseline migration init_campusos_core applied to development PostgreSQL.
  - Reusable seed script prisma/seed.ts transforming existing mockData.ts and mockFaculty.ts into deterministic database records.
  - Next.js server database client singleton with connection pooling (src/lib/db.ts).
- **Prerequisites:** Approved master data model in docs/DATA_MODEL_AND_RELATIONSHIPS.md.
- **Verification & Testing:** Run 
px prisma migrate dev, verify 0 errors, execute 
px prisma db seed, and confirm all 8 faculty profiles and student cohorts populate database tables.
- **Completion Criteria:** TypeScript queries can retrieve seeded student and faculty records from PostgreSQL in server components.

### Phase 2: Authentication, Session Management & RBAC Security
- **Deliverables:**
  - Server-side Next.js middleware (middleware.ts) enforcing encrypted JWT session cookies.
  - Password hashing via Argon2id / bcrypt.
  - Multi-tier role and permission verification helpers (hasRole, hasPermission).
  - Login / Logout server actions and authenticated route guards.
  - Connection of ProfileModal.tsx to active session context.
- **Prerequisites:** Phase 1 database tables (User, Role, Permission, RolePermission).
- **Verification & Testing:** Unit tests for middleware route protection; verify unauthenticated requests to /modules/* redirect to login; verify Student role cannot invoke Faculty actions.
- **Completion Criteria:** Session tokens securely authenticate users and enforce row-level access control on server actions.

### Phase 3: Shared Academic Master Data
- **Deliverables:**
  - Administrative management interfaces for Departments, Programmes, Semesters, Subjects, and DivisionBatches.
  - Functionalization of AcademicsView.tsx with dynamic PostgreSQL queries.
  - Programmatic curriculum and credit calculator engine.
  - Dynamic subject syllabus download streaming from secure object storage.
- **Prerequisites:** Phase 1 (Schema) and Phase 2 (Dean/Registrar RBAC).
- **Verification & Testing:** Create new 4-credit course; verify credit sum validates against university guidelines; confirm subject is selectable in curriculum picker.
- **Completion Criteria:** Academic programmes and subjects can be configured and updated without modifying source code.

### Phase 4: Database Integration for Students & Faculty Modules
- **Deliverables:**
  - Refactoring of StudentManagementView.tsx and FacultyManagementView.tsx from React local state to Next.js Server Actions.
  - Dual-mode data repository pattern (DATA_SOURCE=prisma with fallback to mock).
  - Real-time server-side pagination, sorting, and multi-field search.
  - Photo upload handling with S3 / Cloud Storage presigned URLs.
- **Prerequisites:** Phase 1 (DB), Phase 2 (RBAC), Phase 3 (Academic Master Data).
- **Verification & Testing:** Add new student and new faculty member; refresh browser; verify records persist in database and appear in directory search immediately.
- **Completion Criteria:** Student and faculty registers are 100% database-backed, transactional, and performant.

### Phase 5: Admissions & Enrollment Lifecycle
- **Deliverables:**
  - Online candidate application intake form.
  - Document upload and verification review dashboard for Admissions Office.
  - Automated PRN generator and merit rank scoring engine.
  - Direct conversion of admitted candidates into enrolled Student records in a single database transaction.
- **Prerequisites:** Phase 3 (Programmes) and Phase 4 (Student Register).
- **Verification & Testing:** Submit test application; approve admission; confirm candidate converts into enrolled student with auto-generated roll number and fee account.
- **Completion Criteria:** End-to-end applicant onboarding operates with zero manual CSV importing or data re-entry.

### Phase 6: Attendance, Timetable & Leave Management
- **Deliverables:**
  - Interactive weekly timetable builder with automated collision detection.
  - Real-time digital attendance roll-call interface optimized for mobile and tablet devices.
  - Cumulative attendance tracking engine calculating real-time percentages.
  - Student and staff leave application and multi-level approval workflow.
- **Prerequisites:** Phase 3 (Timetable slots) and Phase 4 (Students & Faculty).
- **Verification & Testing:** Mark attendance for 30 students; verify aggregate percentage updates; confirm absent notifications queue; verify leave balance decrements upon approval.
- **Completion Criteria:** Daily attendance and staff leave operate live with zero spreadsheet synchronization.

### Phase 7: Examinations, Assessments & Results
- **Deliverables:**
  - Automated examination hall ticket generator with 75% attendance and no-dues verification gates.
  - SpreadSheet-style tabular mark entry grid for internal tests, practical VIVAs, and final exams.
  - Moderation approval lockout workflow.
  - SGPA/CGPA calculation engine and official transcript PDF generator with verification QR code.
- **Prerequisites:** Phase 3 (Subjects), Phase 4 (Students), Phase 6 (Attendance eligibility), Phase 8 (No-dues clearance).
- **Verification & Testing:** Enter marks for course; verify failing mark flags; publish results; verify students can view grade cards while debarred students receive notices.
- **Completion Criteria:** Examination administration, grading, and result publication comply with University of Mumbai regulations.

### Phase 8: Fees, Payments & Financial Accounting
- **Deliverables:**
  - Programme fee structure configuration hub.
  - Student fee account billing and dues ledger.
  - Payment entry interface supporting cash, cheque, draft, and online gateway integration (Razorpay).
  - Automated tax invoice receipt generator (PDF) with sequential numbering.
  - Bank reconciliation CSV importer with automated UTR matching.
- **Prerequisites:** Phase 3 (Programmes) and Phase 4 (Students).
- **Verification & Testing:** Record partial fee payment; verify balance due decrements; verify official receipt generates; verify bank reconciliation matches transaction.
- **Completion Criteria:** Financial ledger operates with complete transactional integrity, audit logging, and zero discrepancies.

### Phase 9: Training & Placements (TPO)
- **Deliverables:**
  - Corporate partner hotel profile repository (Taj, Marriott, Oberoi, Accor).
  - Placement drive publisher with eligibility filter (minimum CGPA, zero backlogs).
  - Student application tracker and interview round status board.
  - Dream Offer enforcement policy engine.
- **Prerequisites:** Phase 4 (Students) and Phase 7 (CGPA & Marksheets).
- **Verification & Testing:** Post placement drive with 7.5 CGPA cutoff; confirm ineligible students are blocked; verify selected student receives digital offer letter.
- **Completion Criteria:** Campus recruitment operates seamlessly with transparent student tracking and NIRF data readiness.

### Phase 10: Events, Calendar & Notices/Circulars
- **Deliverables:**
  - Institutional calendar event scheduler with dynamic iCal/ICS subscription feed.
  - Notice publishing workflow with target audience filtering and attachment security.
  - Mandatory statutory notice digital read-acknowledgment modal.
  - Real-time notification popover integration with dynamic unread counter badge.
- **Prerequisites:** Phase 2 (RBAC) and Phase 4 (User Directory).
- **Verification & Testing:** Issue urgent circular to Semester 1; confirm student login triggers acknowledgment modal; verify iCal calendar feed updates.
- **Completion Criteria:** Institutional announcements, academic calendars, and statutory disclosures are unified.

### Phase 11: Facilities, Kitchen Indents & Library
- **Deliverables:**
  - Interactive visual calendar for commercial training kitchen laboratories.
  - Daily culinary store indent and grocery requisition workflow for chef instructors.
  - Equipment breakdown ticketing and maintenance audit log.
  - Library book catalog with barcode scanner integration and circulation desk.
- **Prerequisites:** Phase 3 (Curriculum) and Phase 4 (Staff & Students).
- **Verification & Testing:** Reserve Basic Training Kitchen 1; create culinary indent for 10 kg flour; attempt concurrent kitchen booking and verify collision block.
- **Completion Criteria:** Physical laboratories, perishable store indents, and library resources are managed efficiently.

### Phase 12: Institutional Reports, Accreditation & Production Hardening
- **Deliverables:**
  - Dynamic SQL report generator for NAAC, NIRF, and AISHE compliance returns.
  - Automated weekly fee defaulter and low-attendance report dispatcher.
  - Executive dashboard KPI cards connected to live database aggregates.
  - Automated daily encrypted PostgreSQL backups with point-in-time recovery (PITR).
  - End-to-end security penetration audit, rate limiting, and zero-downtime deployment plan.
- **Prerequisites:** All Phases 1 through 11.
- **Verification & Testing:** Generate complete AISHE Form-C report; verify numbers reconcile with active database rows; simulate database restore from backup snapshot.
- **Completion Criteria:** System is fully audited, secure, compliant with Indian accreditation standards, and certified for institutional go-live.

---

## 3. Strategic Recommendation: Immediate Next Phase

### Why Phase 1 (Architecture & Database Foundation) MUST Precede All Others
Before any further functional modules (such as Admissions, Attendance, or Fees) are developed, **Phase 1: Architecture, PostgreSQL & Prisma Foundation MUST be executed immediately**.

The rationale for this decision is absolute:
1. **Preventing Prototyping Debt:** Building additional modules with browser-local mock states exacerbates architectural fragmentation. Every line of prototype code written without relational backing will have to be completely rewritten later.
2. **Preserving Current Approved Implementations:** Moving immediately to Phase 1 allows us to construct the dual-mode data adapter and write prisma/seed.ts using the current approved mock datasets (mockData.ts and mockFaculty.ts). This guarantees that Chef Jean-Luc, Dr. Rajesh, and all student cohort profiles seamlessly transition to database persistence without regression.
3. **Establishing Relational Identity:** Without permanent primary keys (UUIDs) and referential integrity for programmes, departments, students, and faculty, no subsequent module (such as daily roll-call attendance or fee receipts) can link to valid foreign keys.

Executing Phase 1 establishes the single source of institutional truth upon which the entire RPIHM CampusOS ecosystem will thrive.
