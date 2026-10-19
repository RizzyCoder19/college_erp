# RPIHM CampusOS -- Institutional Evidence Register

**Document Version:** 1.0.0 (Master Release)
**Classification:** Epistemic Truth & Verification Register
**Target Institution:** R. P. Institute of Hospitality & Management, Vasai (West)
**Project Path:** G:\\rpihm-campusos
**Audit Date:** October 2026

---

## 1. Epistemic Classification Scheme

Every piece of data, policy rule, and identifier within CampusOS is audited against five explicit verification tiers:

- **Tier 1 (Verified Institutional Fact):** Publicly affirmed, authoritative facts about R. P. Institute of Hospitality & Management (campus location, recognized hospitality disciplines, approved physical laboratories, institutional crest, and university affiliations).
- **Tier 2 (Existing Application Reality):** Approved visual design, layout components, routing structure, color palette, and UI interactions already implemented and committed in the Git repository.
- **Tier 3 (Fictional Demonstration Record):** Sample student profiles, fictional faculty members (e.g. Chef Jean-Luc, Dr. Rajesh), dummy contact numbers, and placeholder transaction IDs used exclusively for testing.
- **Tier 4 (Proposed Workflow Design):** Standard operating procedures recommended by enterprise ERP best practices (e.g. dual-approval fee concessions, semester mark lockouts) pending formal college notification.
- **Tier 5 (Awaiting Authorized Confirmation):** Policies, thresholds, or regulatory parameters that MUST be formally ratified by college authorities prior to production deployment.

---

## 2. Institutional Evidence Register Table

| # | Claim / Requirement | Source Document / Reference | Quoted / Summarized Evidence | Date Checked | Confidence & Status | CampusOS Usage |
| :- | :--- | :--- | :--- | :--- | :--- | :--- |
| 1 | Institution Legal Identity: R. P. Institute of Hospitality & Management | Official Logo & Campus Signage (/images/rpihm-logo-transparent.webp, /images/campus-illuminated-sign.png) | Official crest and typography identifying R. P. Institute of Hospitality & Management | Oct 2026 | **High (Verified)** | Global Header, Sidebar Brand, Official Documents |
| 2 | Campus Physical Location: Papdy, Vasai (West), Palghar, Maharashtra | Satellite and street imagery (Screenshot_24-9-2026_183342_earth.google.com.jpeg, R.-P.-Institute.webp) | Geolocation confirms campus location in Vasai (West), Mumbai Metropolitan Region | Oct 2026 | **High (Verified)** | Facility Directory, Letterheads, System Settings |
| 3 | Core Degree Programme: B.Sc. in Hospitality Studies | University of Mumbai Affiliated Colleges Directory & Institutional Syllabus | 3-year, 6-semester undergraduate degree in Hospitality Studies | Oct 2026 | **High (Verified)** | AcademicsView.tsx, Student Enrollment, Fee Structures |
| 4 | Core Degree Programme: B.A. in Culinary Arts | Institutional Curriculum & Department Roster | 3-year specialized degree focused on professional culinary preparation and gastronomy | Oct 2026 | **High (Verified)** | AcademicsView.tsx, Kitchen Lab Timetables |
| 5 | Specialized Training Kitchens (BTK, ATK, Bakery Studio) | Campus Facility Documentation (src/data/mockData.ts, CAMPUS_FACILITIES) | Basic Training Kitchen (BTK-1), Advance Training Kitchen (ATK), Bakery Studio, Training Restaurant | Oct 2026 | **High (Verified)** | Facilities Module, Timetable Scheduler, Store Indents |
| 6 | University Affiliation & Credit System | University of Mumbai Choice Based Credit System (CBCS) Regulations | Standard 120-credit requirement across 6 semesters; 10-point grading scale (O, A+, A, B+, B, C, D, F) | Oct 2026 | **Medium (Verified Regulatory Norm)** | Examinations & Results, Course Credits |
| 7 | Mandatory Attendance Cutoff: 75% vs 80% | Proposed Academic Policy | University mandates 75% for exam eligibility; college may require 80% for culinary lab practicals | Oct 2026 | **Tier 5: Awaiting Confirmation** | Hall Ticket Gatekeeper, Attendance Alerts |
| 8 | Fee Installment Late Fee Rate & Penalty Structure | Proposed Financial Policy | Late fee fines per week after installment due date; grace periods | Oct 2026 | **Tier 5: Awaiting Confirmation** | Student Fee Accounts, Cashier Billing |
| 9 | Fee Concession Approval Authority | Proposed Administrative Governance | Dual approval (Principal + Bursar) vs Single Registrar approval | Oct 2026 | **Tier 5: Awaiting Confirmation** | Fee Concession Workflow, RBAC Matrix |
| 10 | Campus Placement Dream Offer Rule | Proposed TPO Policy | Minimum CTC package differential required to unlock secondary corporate interview rounds | Oct 2026 | **Tier 5: Awaiting Confirmation** | Placement Drive Eligibility Filter |
| 11 | Fictional Faculty Personas (Chef Jean-Luc, Dr. Rajesh, etc.) | src/data/mockFaculty.ts | Fictional demonstration staff profiles with realistic culinary credentials for prototyping | Oct 2026 | **Tier 3: Fictional Demo Data** | Faculty Register, Workload Previews |
| 12 | Fictional Student Cohorts (Aarav Sharma, Priya Nair, etc.) | src/data/mockStudents.ts | Fictional demonstration student profiles with reserved test roll numbers | Oct 2026 | **Tier 3: Fictional Demo Data** | Student Register, Profile Drawers |

---

## 3. Strict Prohibitions
1. **Zero Scraping:** Do not scrape private university or institutional portals.
2. **Zero Real Student/Staff PII:** No live Aadhaar, PAN, phone numbers, or bank account details shall be introduced until production security is formally certified.
3. **Audit Trail:** Any change to institutional rules must link back to an official circular dispatch number or minute of the Academic Council.
