# RPIHM CampusOS -- Master End-to-End Workflow Dependencies

**Document Version:** 1.0.0 (Master Release)
**Classification:** Enterprise Operational Workflow Specification
**Target Institute:** R. P. Institute of Hospitality & Management
**Project Path:** G:\\rpihm-campusos
**Audit Date:** October 2026

---

## 1. Workflow Architecture & Inter-Module Orchestration

In an integrated academic ERP, no module operates in isolation. Student attendance depends on academic timetable slots; hall ticket issuance depends on fee clearance and attendance thresholds; kitchen indents depend on practical curriculum timetables; and NAAC/NIRF reporting aggregates live data across all 13 modules.

`mermaid
flowchart TD
    subgraph AcademicsCore [Academics & Structure]
        DEPT[Department] --> PROG[Programme]
        PROG --> SEM[Semester]
        SEM --> SUBJ[Subject]
        SEM --> DIV[Division / Batch]
    end

    subgraph StaffMgmt [Staff & HR]
        STAFF[Faculty / Chef Instructor]
        SUBJ --> ASSIGN[Teaching Assignment]
        STAFF --> ASSIGN
    end

    subgraph Admissions [Admissions & Students]
        APP[Applicant] --> ADM[Admission Decision]
        ADM --> STU[Student Profile]
        DIV --> STU
        STU --> ACC[Fee Account]
    end

    subgraph Scheduling [Scheduling & Operations]
        ASSIGN --> SESS[Class Session]
        DIV --> SESS
        FAC[Kitchen Lab / Room] --> SESS
        SESS --> ATT[Daily Attendance]
        SESS --> INDENT[Culinary Store Indent]
    end

    subgraph Exams [Examinations & Grading]
        SUBJ --> COMP[Assessment Component]
        STU --> MARK[Student Mark]
        COMP --> MARK
        ATT --> ELIG[Hall Ticket Eligibility >= 75%]
        ACC --> ELIG
        ELIG --> MARK
        MARK --> TRANS[Official Transcript / SGPA]
    end

    subgraph Finance [Fees & Accounts]
        PROG --> FSTRUC[Fee Structure]
        FSTRUC --> ACC
        ACC --> TRANSAC[Payment Transaction]
        TRANSAC --> REC[Tax Receipt]
    end

    subgraph Career [Placements & Career]
        STU --> PLAC_APP[Drive Application]
        TRANS --> PLAC_APP
        COMP_IND[Recruiter Partner] --> PLAC_DRIVE[Placement Drive]
        PLAC_DRIVE --> PLAC_APP
        PLAC_APP --> OFFER[Selection Offer]
    end

    subgraph Regulatory [Accreditation & Analytics]
        STU --> REPOP[NAAC / NIRF / AISHE Reports]
        STAFF --> REPOP
        ATT --> REPOP
        TRANS --> REPOP
        REC --> REPOP
        OFFER --> REPOP
    end
`

---

## 2. End-to-End Workflow Specifications

### Workflow 1: Applicant -> Admission -> Enrollment -> Student Record
- **Preconditions:** Academic year initialized; Programme and Fee Structure active; Admission Quota defined.
- **Step-by-Step Lifecycle:**
  1. *Candidate Application:* Candidate submits personal details, 12th standard aggregate, and programme preference.
  2. *Document Verification:* Admissions Officer validates mark sheet, identity proof, and caste certificate.
  3. *Admission Offer:* System verifies seat matrix capacity; generates provisional admission offer letter.
  4. *Fee Payment:* Candidate pays admission confirmation deposit.
  5. *Enrollment Transaction:* System generates permanent PRN (202601640001XXXX), assigns sequential Roll Number (RPIHM-2026-NNN), initializes StudentFeeAccount, and assigns candidate to DivisionBatch.
- **Postconditions:** Active student record visible in student register; parent credentials generated; student portal access enabled.
- **Failure / Rollback:** If seat capacity is exceeded during concurrent checkouts, transaction rolls back with a clean error.
- **Rule Requiring Confirmation (Tier 6):** Confirm whether university PRN is generated automatically by college or imported post-admissions from University of Mumbai portal.

### Workflow 2: Programme/Subject/Division -> Timetable -> Session -> Attendance
- **Preconditions:** Subjects mapped to semesters; faculty assigned to subjects; division batches configured; kitchen labs unreserved.
- **Step-by-Step Lifecycle:**
  1. *Timetable Construction:* HOD schedules weekly sessions linking Subject, Faculty, Batch, and Lab Room.
  2. *Collision Check:* System validates zero dual-booking of faculty or facility rooms.
  3. *Session Conduction:* Chef instructor or faculty conducts session; launches digital roll-call interface.
  4. *Attendance Entry:* Faculty marks students as Present, Absent, Late, or Excused; submits session log within 24 hours.
  5. *Aggregate Update:* System immediately updates student cumulative attendance percentage.
- **Postconditions:** Attendance logs immutable after 24 hours without HOD authorization; absentee SMS/Email alerts triggered to guardians.
- **Failure / Rollback:** Network disconnection during mobile roll-call retains local draft in browser storage until reconnecting.
- **Rule Requiring Confirmation (Tier 6):** Confirm grace period allowed for faculty to rectify erroneous attendance marks (24 hours vs 48 hours).

### Workflow 3: Examination Schedule -> Mark Entry -> Moderation -> Result Publication
- **Preconditions:** Academic term active; assessment components configured (Internal Test, Practical VIVA, Final Theory); minimum attendance verified.
- **Step-by-Step Lifecycle:**
  1. *Eligibility Verification:* System evaluates each student against the 75% attendance threshold and zero fee arrears gate.
  2. *Hall Ticket Generation:* Eligible students receive watermarked digital Hall Tickets with QR verification code.
  3. *Exam Conduction & Mark Entry:* Faculty enters raw marks in secure spreadsheet grid; system rejects values exceeding maximum marks.
  4. *Moderation & Lockout:* Examination Committee reviews outliers; applies approved moderation; signs off digitally.
  5. *Publication Transaction:* Exam Controller clicks Publish Results; marks become read-only; SGPA/CGPA computed; transcripts generated.
- **Postconditions:** Students can view semester grade cards; debarred students receive formal notices; academic transcripts locked.
- **Failure / Rollback:** Out-of-range mark entries trigger instant field-level rejection; publication failure preserves unmoderated state.
- **Rule Requiring Confirmation (Tier 6):** Confirm whether fee defaulters are strictly debarred from appearing in examinations or permitted with provisional undertakings.

### Workflow 4: Fee Structure -> Student Dues -> Payment Entry -> Receipt -> Reconciliation
- **Preconditions:** Academic year fee structure approved by Governing Council; student accounts billed.
- **Step-by-Step Lifecycle:**
  1. *Billing Generation:* System automatically calculates semester dues based on enrolled programme and category.
  2. *Payment Processing:* Cashier accepts cash/cheque/draft, or student pays online via payment gateway.
  3. *Transactional Ledger Entry:* System executes atomic transaction inserting FeeTransaction, reducing StudentFeeAccount balanceDue, and generating sequential tax invoice receipt number (RPIHM-REC-2026-NNNN).
  4. *Receipt Issuance:* System generates signed PDF receipt with GST breakdown and sends SMS/email confirmation.
  5. *Bank Reconciliation:* Finance officer imports daily bank scroll CSV; system matches UTR numbers automatically.
- **Postconditions:** Student fee clearance flag updated; examination hall ticket hold released if zero dues.
- **Failure / Rollback:** If payment gateway times out, webhook reconciliation updates state asynchronously upon bank confirmation.
- **Rule Requiring Confirmation (Tier 6):** Confirm whether fee concessions require dual sign-off (Principal + Bursar) or single administrator approval.

### Workflow 5: Staff Record -> Teaching Assignment -> Scheduled Class
- **Preconditions:** Faculty onboarded; department assigned; subjects created in academic catalog.
- **Step-by-Step Lifecycle:**
  1. *Faculty Workload Mapping:* HOD allocates subjects to faculty members based on academic specialization.
  2. *Workload Ceiling Validation:* System verifies total assigned weekly hours do not exceed statutory limits (e.g., 16 hours for Assistant Professor, 14 hours for Associate Professor).
  3. *Classroom & Lab Allocation:* Session scheduler maps class to a physical lecture hall or kitchen laboratory.
  4. *Conflict Detector:* System verifies instructor is not assigned to two different classes in the same time slot.
  5. *Publish Schedule:* Weekly timetable appears in faculty and student personal dashboard calendars.
- **Postconditions:** Faculty teaching register created; session tracking enabled for attendance entry.
- **Failure / Rollback:** Collision alert blocks timetable creation until the conflicting time slot is resolved.
- **Rule Requiring Confirmation (Tier 6):** Confirm institutional maximum weekly workload hours for culinary chef instructors versus theoretical faculty.

### Workflow 6: Notice Draft -> Department Review -> Broadcast Publication -> Expiry
- **Preconditions:** Author possesses valid staff login; target cohorts defined (All, Faculty, Specific Programme/Semester).
- **Step-by-Step Lifecycle:**
  1. *Notice Drafting:* Staff author drafts circular text, selects priority (Routine, Urgent, Statutory), and uploads attachments.
  2. *Sequential Dispatch Number:* System assigns institutional reference code (RPIHM/CIR/2026/NNN).
  3. *Administrative Approval:* HOD or Registrar approves draft for campus-wide dissemination.
  4. *Broadcast Dispatch:* System pushes notice to web portal, updates notification bell badge count, and sends push alerts.
  5. *Mandatory Acknowledgment:* For statutory notices, students/faculty must acknowledge before accessing standard ERP modules.
  6. *Automated Archival:* Notice moves to archives automatically upon reaching expiry date.
- **Postconditions:** Immutable audit entry logged; read-receipt timestamps recorded per recipient user.
- **Failure / Rollback:** Attachment virus scan failure prevents notice publication.
- **Rule Requiring Confirmation (Tier 6):** Confirm which administrative roles hold direct publishing authority without requiring secondary approval.

### Workflow 7: Placement Opportunity -> Student Application -> Selection Outcome
- **Preconditions:** Corporate recruiter profile created; placement drive criteria defined (minimum CGPA, backlog policy).
- **Step-by-Step Lifecycle:**
  1. *Drive Notification:* TPO creates placement drive for Taj Hotels / Marriott International; system notifies eligible students.
  2. *Eligibility Filter:* System cross-references student current CGPA and active backlog status; locks ineligibles.
  3. *Application Submission:* Eligible students review JD and submit applications with attached PDF resumes.
  4. *Shortlisting & Rounds:* Recruiter marks candidates through interview rounds (Shortlisted, Group Discussion, Technical VIVA, HR).
  5. *Offer Letter Issuance:* Selected candidates receive digital offer letters; system records offered CTC package.
  6. *Dream Offer Lockout:* Accepted offer locks student from lower CTC drives based on institutional placement policy.
- **Postconditions:** Student placement dossier updated; placement statistics feed into NIRF/NAAC dashboards.
- **Failure / Rollback:** Student withdrawal after accepting offer requires formal TPO sanction and reason logging.
- **Rule Requiring Confirmation (Tier 6):** Confirm minimum CTC differential required to qualify as a secondary 'Dream Offer'.

### Workflow 8: Events and Registrations -> Attendance or Workshop Participation
- **Preconditions:** Campus event scheduled; venue reserved; capacity limit configured.
- **Step-by-Step Lifecycle:**
  1. *Event Scheduling:* Coordinator schedules Masterclass with Guest Executive Chef; reserves Grand Heritage Restaurant.
  2. *Registration Window:* Student portal opens registration; counters track remaining capacity in real time.
  3. *Registration Confirmation:* Registered students receive digital passes with personalized QR codes.
  4. *Session Check-In:* On event day, coordinator scans attendee QR passes; system logs timestamped attendance.
  5. *Certificate Issuance:* Verified attendees receive automated digital Certificates of Participation with verification hash.
- **Postconditions:** Co-curricular activity credits added to student institutional profile.
- **Failure / Rollback:** Venue double-booking blocks event creation until venue conflict is resolved.
- **Rule Requiring Confirmation (Tier 6):** Confirm whether non-academic workshops grant mandatory credit points towards degree completion.

### Workflow 9: Shared Operational Records -> Regulatory Reports and Analytics
- **Preconditions:** Active transactional records populated across students, faculty, exams, finance, and facilities.
- **Step-by-Step Lifecycle:**
  1. *Report Parameter Selection:* IQAC Coordinator selects report type (AISHE Form-C, NIRF Placement Dossier, NAAC Criterion 2).
  2. *Materialized View Query:* Database executes read-optimized aggregation query cross-referencing staff-student ratios, placement medians, and female enrollment percentages.
  3. *Data Masking:* System redacts student PII (phone numbers, parent income) and staff individual salaries.
  4. *Document Compilation:* Server compiles report into official PDF letterhead layout with cryptographic hash and verification timestamp.
  5. *Executive Dispatch:* Report is archived in institutional records repository and shared with Governing Council.
- **Postconditions:** Immutable execution log created in ReportExecutionLog tracking user ID and query runtime.
- **Failure / Rollback:** Missing prerequisite data fields trigger non-fatal validation warnings identifying incomplete student cohorts.
- **Rule Requiring Confirmation (Tier 6):** Confirm whether institutional salary bands must be completely masked or aggregated by designation tier.

---

## 3. Master Cross-Module Dependency Matrix

| Producing Module | Consuming Module | Shared Data Assets | Inter-Module Impact if Offline |
| :--- | :--- | :--- | :--- |
| **Academics Core** | Students, Attendance, Exams, Finance | Programmes, Semesters, Subjects, Credits | Complete halt of student enrollment, scheduling, and billing |
| **Staff & HR** | Academics, Attendance, Facilities, Notices | Staff Profiles, Designations, Teaching Loads | Inability to assign classes, mark attendance, or issue indents |
| **Attendance** | Examinations, Reports | Session Attendance Logs, Aggregate Percentages | Inability to generate exam hall tickets or NAAC Criterion 2 |
| **Fees & Finance** | Examinations, Students | Fee Accounts, Dues Balance, Payment Receipts | Inability to enforce no-dues clearance for exam hall tickets |
| **Facilities** | Academics, Attendance, Events | Lab Rooms, Commercial Kitchens, Equipment | Timetable collision risks and failure of culinary practicals |
| **Examinations** | Placements, Reports | Verified Marks, SGPA/CGPA, Transcripts | Inability to verify recruiter eligibility or compute NIRF stats |
| **Security & RBAC** | All 12 Modules | Session Tokens, User Roles, Permissions | Complete denial of access and breakdown of authorization |
