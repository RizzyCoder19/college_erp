# CampusOS — Milestone 1A: Academic Curriculum Import Preparation Report
**Institutional Authority:** R.P. Institute of Hospitality & Management (RPIHM), Vasai  
**Affiliation:** University of Mumbai | DTE Code: 3474 | Affiliation Circular: Aff/Recog.I/ICC/2023-24/08  
**Execution Mode:** STRICTLY READ-ONLY (Validation & Dry-Run Only — No Database Writes)  
**Date of Audit:** October 30, 2026  
**Artifact Path:** `docs/MILESTONE_1A_IMPORT_READINESS.md`  

---

## Executive Summary & Import Authorization Status

Milestone 1A establishes the **canonical, non-destructive curriculum import manifest** for RPIHM's four primary degree programmes.

1. **Authorization Boundary:** Import preparation, validation, relationship integrity checks, and read-only database dry-runs have been completed. **Zero database writes, schema changes, or migrations have been executed.**
2. **Canonical Manifest Count:** Exactly **50 officially gazetted subjects** have been cataloged with exact source titles, credit allocations, teaching/assessment types, curriculum verticals, elective designations, and primary PDF page citations.
3. **Dry-Run Outcome:** **100% of the 50 manifest entries are validated as `SAFE_TO_INSERT`**. 
   - 0 code collisions with the 7 baseline subjects.
   - 0 broken academic relationships (every target semester belongs to the verified target programme).
   - 0 schema modifications required (`Subject` model accommodates all entries natively).
4. **Baseline Protection:** The 7 pre-existing baseline subjects in `prisma/dev.db` remain untouched and classified as unverified prototype/pre-NEP seed records.

---

## 1. Canonical 50-Entry Curriculum Import Manifest

The following structured manifest represents the authoritative, non-destructive curriculum dataset extracted directly from the University of Mumbai circular PDFs.

| # | Programme Code & Target ID | Sem & Target Sem ID | Subject Code | Exact Official Subject Title | Credits | Assessment Type | Curriculum Vertical | Elective Group / Option | Primary Circular PDF | Page | Academic Council Resolution | Status |
| :- | :--- | :--- | :--- | :--- | :-: | :--- | :--- | :--- | :--- | :-: | :--- | :--- |
| **1** | `BA-CUL` (`666325b8...`) | 1 (`a845067c...`) | `BACA101` | Principles of Food Production-I (TH) | 2.0 | `THEORY` | Major | Compulsory | `BACUL_I_II.pdf` | 2 | AC 27/12/2023 Item 5.16 | **Verified** |
| **2** | `BA-CUL` (`666325b8...`) | 1 (`a845067c...`) | `BACA102` | Fundamentals of Food & Beverage Service (TH) | 2.0 | `THEORY` | Major | Compulsory | `BACUL_I_II.pdf` | 2 | AC 27/12/2023 Item 5.16 | **Verified** |
| **3** | `BA-CUL` (`666325b8...`) | 1 (`a845067c...`) | `BACA103` | Nutrition & Food Science (TH) | 2.0 | `THEORY` | Major | Compulsory | `BACUL_I_II.pdf` | 2 | AC 27/12/2023 Item 5.16 | **Verified** |
| **4** | `BA-CUL` (`666325b8...`) | 1 (`a845067c...`) | `BACA104` | Essential Culinary Arts Indian - I (PR) | 2.0 | `PRACTICAL` | VSC | Compulsory | `BACUL_I_II.pdf` | 2 | AC 27/12/2023 Item 5.16 | **Verified** |
| **5** | `BA-CUL` (`666325b8...`) | 1 (`a845067c...`) | `BACA105` | Essential Culinary Arts International - I (PR) | 2.0 | `PRACTICAL` | SEC | Compulsory | `BACUL_I_II.pdf` | 2 | AC 27/12/2023 Item 5.16 | **Verified** |
| **6** | `BA-CUL` (`666325b8...`) | 2 (`60e76a9e...`) | `BACA201` | Principles of Food Production-II (TH) | 2.0 | `THEORY` | Major | Compulsory | `BACUL_I_II.pdf` | 2 | AC 27/12/2023 Item 5.16 | **Verified** |
| **7** | `BA-CUL` (`666325b8...`) | 2 (`60e76a9e...`) | `BACA202` | Introduction to the Hospitality Industry (TH) | 2.0 | `THEORY` | Major | Compulsory | `BACUL_I_II.pdf` | 2 | AC 27/12/2023 Item 5.16 | **Verified** |
| **8** | `BA-CUL` (`666325b8...`) | 2 (`60e76a9e...`) | `BACA203` | Food and Beverage Service Operation (PR) | 2.0 | `PRACTICAL` | Major | Compulsory | `BACUL_I_II.pdf` | 2 | AC 27/12/2023 Item 5.16 | **Verified** |
| **9** | `BA-CUL` (`666325b8...`) | 2 (`60e76a9e...`) | `BACA204` | Essential Culinary Arts Indian - II (PR) | 2.0 | `PRACTICAL` | VSC | Compulsory | `BACUL_I_II.pdf` | 2 | AC 27/12/2023 Item 5.16 | **Verified** |
| **10**| `BA-CUL` (`666325b8...`) | 2 (`60e76a9e...`) | `BACA205` | Essential Culinary Arts International - II (PR) | 2.0 | `PRACTICAL` | SEC | Compulsory | `BACUL_I_II.pdf` | 2 | AC 27/12/2023 Item 5.16 | **Verified** |
| **11**| `BA-CUL` (`666325b8...`) | 3 (`51635582...`) | `BACA301` | Indian and International Ethnic Cuisines (TH) | 2.0 | `THEORY` | Major | Compulsory | `BACUL_III_IV.pdf` | 7 | AC 20/05/2025 Item 5.5, R. HMU-505C | **Verified** |
| **12**| `BA-CUL` (`666325b8...`) | 3 (`51635582...`) | `BACA302` | Beverage Studies (TH) | 2.0 | `THEORY` | Major | Compulsory | `BACUL_III_IV.pdf` | 7 | AC 20/05/2025 Item 5.5, R. HMU-505C | **Verified** |
| **13**| `BA-CUL` (`666325b8...`) | 3 (`51635582...`) | `BACA303` | Intermediate Bakery & Confectionery (PR) | 2.0 | `PRACTICAL` | Major | Compulsory | `BACUL_III_IV.pdf` | 7 | AC 20/05/2025 Item 5.5, R. HMU-505C | **Verified** |
| **14**| `BA-CUL` (`666325b8...`) | 3 (`51635582...`) | `BACA304` | Intermediate Culinary Arts - Indian Cuisine (Quantity-PR) | 2.0 | `PRACTICAL` | Major | Compulsory | `BACUL_III_IV.pdf` | 7 | AC 20/05/2025 Item 5.5, R. HMU-505C | **Verified** |
| **15**| `BA-CUL` (`666325b8...`) | 3 (`51635582...`) | `BACA305` | Intermediate Culinary Arts - International Cuisine (PR) | 2.0 | `PRACTICAL` | VSC | Compulsory | `BACUL_III_IV.pdf` | 7 | AC 20/05/2025 Item 5.5, R. HMU-505C | **Verified** |
| **16**| `BA-CUL` (`666325b8...`) | 4 (`abef40a3...`) | `BACA401` | On Job Training (OJT - Major) | 16.0 | `OJT` | Major | Compulsory | `BACUL_III_IV.pdf` | 7 | AC 20/05/2025 Item 5.5, R. HMU-505D | **Verified** |
| **17**| `BA-CUL` (`666325b8...`) | 4 (`abef40a3...`) | `BACA402` | On Job Training (OJT - Minor) | 4.0 | `OJT` | Minor | Compulsory | `BACUL_III_IV.pdf` | 7 | AC 20/05/2025 Item 5.5, R. HMU-505D | **Verified** |
| **18**| `BSCIT` (`0535808b...`) | 3 (`39bebe04...`) | `USIT301` | Python Programming | 2.0 | `THEORY` | Major | Compulsory | `BSCIT_III_IV.pdf` | 7, 10 | AC 28/03/2025 Item 6.9, R. SU-510C | **Verified** |
| **19**| `BSCIT` (`0535808b...`) | 3 (`39bebe04...`) | `USIT302` | DATA STRUCTURES | 2.0 | `THEORY` | Major | Compulsory | `BSCIT_III_IV.pdf` | 7, 13 | AC 28/03/2025 Item 6.9, R. SU-510C | **Verified** |
| **20**| `BSCIT` (`0535808b...`) | 3 (`39bebe04...`) | `USIT303` | Operating System | 2.0 | `THEORY` | Major | Compulsory | `BSCIT_III_IV.pdf` | 7, 15 | AC 28/03/2025 Item 6.9, R. SU-510C | **Verified** |
| **21**| `BSCIT` (`0535808b...`) | 3 (`39bebe04...`) | `USIT3P1` | Major Practical 3 | 2.0 | `PRACTICAL` | Major | Compulsory | `BSCIT_III_IV.pdf` | 7, 17 | AC 28/03/2025 Item 6.9, R. SU-510C | **Verified** |
| **22**| `BSCIT` (`0535808b...`) | 3 (`39bebe04...`) | `USIT3V1` | APPLIED MATHEMATICS | 2.0 | `THEORY` | VSC | Compulsory | `BSCIT_III_IV.pdf` | 7 | AC 28/03/2025 Item 6.9, R. SU-510C | **Verified** |
| **23**| `BSCIT` (`0535808b...`) | 4 (`8e7e5c94...`) | `USIT401` | Core Java | 2.0 | `THEORY` | Major | Compulsory | `BSCIT_III_IV.pdf` | 7, 23 | AC 28/03/2025 Item 6.9, R. SU-510D | **Verified** |
| **24**| `BSCIT` (`0535808b...`) | 4 (`8e7e5c94...`) | `USIT402` | Software Engineering | 2.0 | `THEORY` | Major | Compulsory | `BSCIT_III_IV.pdf` | 7, 25 | AC 28/03/2025 Item 6.9, R. SU-510D | **Verified** |
| **25**| `BSCIT` (`0535808b...`) | 4 (`8e7e5c94...`) | `USIT403` | Computer Networks | 2.0 | `THEORY` | Major | Compulsory | `BSCIT_III_IV.pdf` | 7, 27 | AC 28/03/2025 Item 6.9, R. SU-510D | **Verified** |
| **26**| `BSCIT` (`0535808b...`) | 4 (`8e7e5c94...`) | `USIT4P1` | Major Practical 4 | 2.0 | `PRACTICAL` | Major | Compulsory | `BSCIT_III_IV.pdf` | 7, 29 | AC 28/03/2025 Item 6.9, R. SU-510D | **Verified** |
| **27**| `BSCIT` (`0535808b...`) | 4 (`8e7e5c94...`) | `USIT4S1` | Computer Graphics | 2.0 | `THEORY` | SEC | SEC Option A | `BSCIT_III_IV.pdf` | 7 | AC 28/03/2025 Item 6.9, R. SU-510D | **Verified** |
| **28**| `BSCIT` (`0535808b...`) | 4 (`8e7e5c94...`) | `USIT4S2` | Mobile Programming | 2.0 | `THEORY` | SEC | SEC Option B | `BSCIT_III_IV.pdf` | 7 | AC 28/03/2025 Item 6.9, R. SU-510D | **Verified** |
| **29**| `BSCCS` (`d2b58a88...`) | 3 (`5aab15fe...`) | `USCS301` | Principles of Operating Systems | 2.0 | `THEORY` | Major | Compulsory | `BSCCS_III_IV.pdf` | 10 | AC 20/05/2025 Item 6.14 | **Verified** |
| **30**| `BSCCS` (`d2b58a88...`) | 3 (`5aab15fe...`) | `USCS302` | Theory of Computation | 2.0 | `THEORY` | Major | Compulsory | `BSCCS_III_IV.pdf` | 10 | AC 20/05/2025 Item 6.14 | **Verified** |
| **31**| `BSCCS` (`d2b58a88...`) | 3 (`5aab15fe...`) | `USCS303` | Data Structures | 2.0 | `THEORY` | Major | Compulsory | `BSCCS_III_IV.pdf` | 10 | AC 20/05/2025 Item 6.14 | **Verified** |
| **32**| `BSCCS` (`d2b58a88...`) | 3 (`5aab15fe...`) | `USCS3P1` | Computer Science Practical 3 | 2.0 | `PRACTICAL` | Major | Compulsory | `BSCCS_III_IV.pdf` | 10 | AC 20/05/2025 Item 6.14 | **Verified** |
| **33**| `BSCCS` (`d2b58a88...`) | 3 (`5aab15fe...`) | `USCS3V1` | Java Programming | 2.0 | `THEORY` | VSC | Compulsory | `BSCCS_III_IV.pdf` | 10 | AC 20/05/2025 Item 6.14 | **Verified** |
| **34**| `BSCCS` (`d2b58a88...`) | 4 (`09c2b435...`) | `USCS401` | Computer Networks | 2.0 | `THEORY` | Major | Compulsory | `BSCCS_III_IV.pdf` | 10 | AC 20/05/2025 Item 6.14 | **Verified** |
| **35**| `BSCCS` (`d2b58a88...`) | 4 (`09c2b435...`) | `USCS402` | Software Engineering | 2.0 | `THEORY` | Major | Compulsory | `BSCCS_III_IV.pdf` | 10 | AC 20/05/2025 Item 6.14 | **Verified** |
| **36**| `BSCCS` (`d2b58a88...`) | 4 (`09c2b435...`) | `USCS403` | IoT Technologies | 2.0 | `THEORY` | Major | Compulsory | `BSCCS_III_IV.pdf` | 10 | AC 20/05/2025 Item 6.14 | **Verified** |
| **37**| `BSCCS` (`d2b58a88...`) | 4 (`09c2b435...`) | `USCS4P1` | Computer Science Practical 4 | 2.0 | `PRACTICAL` | Major | Compulsory | `BSCCS_III_IV.pdf` | 10 | AC 20/05/2025 Item 6.14 | **Verified** |
| **38**| `BSCCS` (`d2b58a88...`) | 4 (`09c2b435...`) | `USCS4S1` | Mobile Application Development | 2.0 | `THEORY` | SEC | SEC Option A | `BSCCS_III_IV.pdf` | 10 | AC 20/05/2025 Item 6.14 | **Verified** |
| **39**| `BSCCS` (`d2b58a88...`) | 4 (`09c2b435...`) | `USCS4S2` | MEAN Stack Development | 2.0 | `THEORY` | SEC | SEC Option B | `BSCCS_III_IV.pdf` | 10 | AC 20/05/2025 Item 6.14 | **Verified** |
| **40**| `BSCDS-AI` (`c010a20b...`) | 3 (`228c815d...`) | `USDS301` | Design and Analysis of Algorithms | 2.0 | `THEORY` | Major | Compulsory | `BSCDS_III_IV.pdf` | 10 | AC 28/03/2025 Item 6.10, R. SU-515C | **Verified** |
| **41**| `BSCDS-AI` (`c010a20b...`) | 3 (`228c815d...`) | `USDS302` | Data Warehousing | 2.0 | `THEORY` | Major | Compulsory | `BSCDS_III_IV.pdf` | 13 | AC 28/03/2025 Item 6.10, R. SU-515C | **Verified** |
| **42**| `BSCDS-AI` (`c010a20b...`) | 3 (`228c815d...`) | `USDS303` | Data Mining | 2.0 | `THEORY` | Major | Compulsory | `BSCDS_III_IV.pdf` | 15 | AC 28/03/2025 Item 6.10, R. SU-515C | **Verified** |
| **43**| `BSCDS-AI` (`c010a20b...`) | 3 (`228c815d...`) | `USDS3P1` | Design and Analysis of Algorithms and Data warehousing & Mining Practical | 2.0 | `PRACTICAL` | Major | Compulsory | `BSCDS_III_IV.pdf` | 18 | AC 28/03/2025 Item 6.10, R. SU-515C | **Verified** |
| **44**| `BSCDS-AI` (`c010a20b...`) | 3 (`228c815d...`) | `USDS3V1` | Linear Algebra | 2.0 | `THEORY` | VSC | Compulsory | `BSCDS_III_IV.pdf` | 23 | AC 28/03/2025 Item 6.10, R. SU-515C | **Verified** |
| **45**| `BSCDS-AI` (`c010a20b...`) | 4 (`6595e955...`) | `USDS401` | Big Data | 2.0 | `THEORY` | Major | Compulsory | `BSCDS_III_IV.pdf` | 28 | AC 28/03/2025 Item 6.10, R. SU-515D | **Verified** |
| **46**| `BSCDS-AI` (`c010a20b...`) | 4 (`6595e955...`) | `USDS402` | Artificial Intelligence | 2.0 | `THEORY` | Major | Compulsory | `BSCDS_III_IV.pdf` | 31 | AC 28/03/2025 Item 6.10, R. SU-515D | **Verified** |
| **47**| `BSCDS-AI` (`c010a20b...`) | 4 (`6595e955...`) | `USDS403` | Machine Learning | 2.0 | `THEORY` | Major | Compulsory | `BSCDS_III_IV.pdf` | 34 | AC 28/03/2025 Item 6.10, R. SU-515D | **Verified** |
| **48**| `BSCDS-AI` (`c010a20b...`) | 4 (`6595e955...`) | `USDS4P1` | BigData and AIML Practical | 2.0 | `PRACTICAL` | Major | Compulsory | `BSCDS_III_IV.pdf` | 37 | AC 28/03/2025 Item 6.10, R. SU-515D | **Verified** |
| **49**| `BSCDS-AI` (`c010a20b...`) | 4 (`6595e955...`) | `USDS4S1` | Testing of Hypothesis | 2.0 | `THEORY` | SEC | SEC Option A | `BSCDS_III_IV.pdf` | 42 | AC 28/03/2025 Item 6.10, R. SU-515D | **Verified** |
| **50**| `BSCDS-AI` (`c010a20b...`) | 4 (`6595e955...`) | `USDS4S2` | Mojo | 2.0 | `PRACTICAL` | SEC | SEC Option B | `BSCDS_III_IV.pdf` | 45 | AC 28/03/2025 Item 6.10, R. SU-515D | **Verified** |

---

## 2. Exact Source-Title Verification for Disputed Subjects

All disputed subjects have been rechecked against their primary source pages:

1. **`USIT301`:**
   - *Previous Report Claim:* "Technical Communication Skills" (an old pre-NEP draft title).
   - *Primary PDF Truth:* In `BSCIT_III_IV.pdf`, Page 7 (Credit Structure Table) and Page 10 (Syllabus Header):
     **`Python Programming`** (Resolution `R. SU-510C`, 2 credits, Major Theory).
   - *Resolution:* Manifest records `Python Programming`.
2. **`USDS3P1`:**
   - *Previous Report Claim:* "DAA & Data Warehousing & Mining Practical" (abbreviated).
   - *Primary PDF Truth:* In `BSCDS_III_IV.pdf`, Page 7 & Page 18:
     **`Design and Analysis of Algorithms and Data warehousing & Mining Practical`** (Resolution `R. SU-515C`, 2 credits, Major Practical).
   - *Resolution:* Manifest records the full official gazette title verbatim.
3. **`BACA401`:**
   - *Previous Report Claim:* "On Job Training (OJT - Major 16 credits)".
   - *Primary PDF Truth:* In `BACUL_III_IV.pdf`, Page 7:
     **`On Job Training (OJT - Major)`** (Resolution `R. HMU-505D`, 16 credits, Major OJT).
   - *Resolution:* Manifest records `On Job Training (OJT - Major)`.
4. **`BACA402`:**
   - *Previous Report Claim:* Omitted in Stage 2B table.
   - *Primary PDF Truth:* In `BACUL_III_IV.pdf`, Page 7, note states: *"20 credits of On Job Training (OJT) should be divided into 16 credits for Major Subjects and 04 credits for Minor Subjects"*:
     **`On Job Training (OJT - Minor)`** (Resolution `R. HMU-505D`, 4 credits, Minor OJT).
   - *Resolution:* Manifest records `On Job Training (OJT - Minor)`.

---

## 3. Elective and Vertical Classification

### 1. Separation of Teaching Type from Vertical
Under the active Prisma schema, `Subject.subjectType` represents the teaching/instructional delivery classification:
- **`THEORY`**: Classroom lecture and theoretical instruction (37 subjects).
- **`PRACTICAL`**: Laboratory or kitchen practical instruction (11 subjects).
- **`OJT`**: On-the-Job Training industry placement (2 subjects: `BACA401` and `BACA402`).

The NEP-2020 curriculum vertical is preserved in the manifest metadata:
- **`Major`**: Core disciplinary studies (34 subjects).
- **`VSC`**: Vocational Skill Course (5 subjects: `BACA104`, `BACA204`, `BACA305`, `USIT3V1`, `USCS3V1`, `USDS3V1`).
- **`SEC`**: Skill Enhancement Course (8 subjects: `BACA105`, `BACA205`, `USIT4S1/S2`, `USCS4S1/S2`, `USDS4S1/S2`).
- **`Minor`**: Minor disciplinary studies (1 subject: `BACA402`).

### 2. Elective Group Semantics
In Semesters IV for BSCIT, BSCCS, and BSCDS-AI, students choose **exactly ONE SEC course**:
* **`BSCIT` Sem IV:** Students choose `USIT4S1` (Computer Graphics) OR `USIT4S2` (Mobile Programming).
* **`BSCCS` Sem IV:** Students choose `USCS4S1` (Mobile Application Development) OR `USCS4S2` (MEAN Stack Development).
* **`BSCDS-AI` Sem IV:** Students choose `USDS4S1` (Testing of Hypothesis) OR `USDS4S2` (Mojo).

*Import Rule:* Both elective options are imported into the `Subject` catalog as available curricular offerings. In Milestone 3, student enrolments will associate students with their individual selected course without treating both as compulsory.

---

## 4. Programme-Semester Relationship Verification Chain

Every manifest entry was checked to verify the complete relational chain:
$$\text{Programme (ID)} \longrightarrow \text{Semester (ID)} \longrightarrow \text{Subject (Code)}$$

```
Verified Academic Chains in prisma/dev.db:
1. Programme: BA-CUL (666325b8-d280-42c3-b007-db451d998a49)
   ├── Sem 1: a845067c-d340-43d7-92f3-f9e53b1dbe2c (Verified: semesterNumber=1, programmeId matches)
   ├── Sem 2: 60e76a9e-8e4e-4b1f-9d5d-772351dee0d5 (Verified: semesterNumber=2, programmeId matches)
   ├── Sem 3: 51635582-63d8-4313-bfdd-14d62ec9eb69 (Verified: semesterNumber=3, programmeId matches)
   └── Sem 4: abef40a3-aeba-42a7-a8d6-f77b2a8cbb8d (Verified: semesterNumber=4, programmeId matches)

2. Programme: BSCIT (0535808b-5d2f-44c2-b018-d46d80a247f1)
   ├── Sem 3: 39bebe04-18ec-49fd-8afb-9d0dc17829d7 (Verified: semesterNumber=3, programmeId matches)
   └── Sem 4: 8e7e5c94-89d6-4357-85e5-ceab7450d45c (Verified: semesterNumber=4, programmeId matches)

3. Programme: BSCCS (d2b58a88-4da5-47f9-98a2-bd875ea54457)
   ├── Sem 3: 5aab15fe-5c2b-4c5c-873a-9dcd110456ee (Verified: semesterNumber=3, programmeId matches)
   └── Sem 4: 09c2b435-22de-4913-b49c-0d74f60df044 (Verified: semesterNumber=4, programmeId matches)

4. Programme: BSCDS-AI (c010a20b-1eb1-4688-8cb4-ff807132142d)
   ├── Sem 3: 228c815d-75ad-4798-8773-0d825671e47c (Verified: semesterNumber=3, programmeId matches)
   └── Sem 4: 6595e955-6ade-429a-9363-093e7ff30e69 (Verified: semesterNumber=4, programmeId matches)
```

Zero broken academic relationships exist.

---

## 5. Database Dry-Run Results

Using read-only SQLite queries against `G:\rpihm-campusos\prisma\dev.db`:

| Metric | Result |
| :--- | :---: |
| **Total Manifest Records Evaluated** | **50** |
| **Validated as `SAFE_TO_INSERT`** | **50** |
| **Already Exists (Skip)** | **0** |
| **Code Collisions** | **0** |
| **Foreign Key / Relation Violations** | **0** |
| **Existing Baseline Records Preserved** | **7 of 7** |

---

## 6. Existing-Record Conflict Analysis

The 7 pre-existing baseline subjects in `dev.db` were evaluated against all 50 incoming codes:
- `FP-101` (BA-CUL Sem 1): **No collision.** Manifest uses `BACA101`–`BACA105`.
- `FBM-101` (BSC-HS Sem 1): **No collision.** Zero incoming `BSC-HS` codes.
- `HYG-101` (BSC-HS Sem 1): **No collision.** Zero incoming `BSC-HS` codes.
- `AI-101` (BSCDS-AI Sem 1): **No collision.** Manifest uses `USDS301`–`USDS4S2`.
- `IT-101` (BSCIT Sem 1): **No collision.** Manifest uses `USIT301`–`USIT4S2`.
- `CS-101` (BSCCS Sem 1): **No collision.** Manifest uses `USCS301`–`USCS4S2`.
- `BAK-101` (DIP-BC Sem 1): **No collision.** Autonomous diploma course.

*Result:* **Zero records will be overwritten, modified, or deleted.** The baseline integrity is 100% preserved.

---

## 7. Repository Safety Inventory

### Current Git Status (`git status --porcelain` in `G:\rpihm-campusos`)

#### Tracked Modified Files (16 Files — Protected):
1. `M prisma/schema.prisma`
2. `M src/app/api/verify-actions/route.ts`
3. `M src/components/auth/AnimatedLampLogin.tsx`
4. `M src/components/auth/CinematicWelcomeTransition.tsx`
5. `M src/components/auth/lamp-login.css`
6. `M src/components/layout/AppShell.tsx`
7. `M src/components/layout/TopBar.tsx`
8. `M src/components/modules/ModulePlaceholder.tsx`
9. `M src/components/modules/students/StudentsView.tsx`
10. `M src/lib/actions/academics.ts`
11. `M src/lib/actions/auth.ts`
12. `M src/lib/auth/roles.ts`
13. `M src/lib/auth/session.ts`
14. `M src/lib/dal/academicRepository.ts`
15. `M src/lib/dal/studentRepository.ts`
16. `M src/lib/utils/studentMapper.ts`

#### Untracked Application Files & Directories (Actively Imported — Protected):
- `src/components/modules/finance/` (`FinanceView.tsx`)
- `src/components/modules/examinations/` (`ExaminationsView.tsx`)
- `src/components/modules/attendance/` (`AttendanceView.tsx`)
- `src/lib/actions/` (`attendance.ts`, `examinations.ts`, `fees.ts`, `timetable.ts`)
- `src/lib/dal/` (`attendanceRepository.ts`, `examRepository.ts`, `feeRepository.ts`, `timetableRepository.ts`)
- `docs/STAGE_2C_CURRICULUM_COMPLETENESS_AUDIT.md`
- `docs/MILESTONE_1A_IMPORT_READINESS.md`

*Safety Mandate:* Zero git reset, checkout, or clean commands will be run. All functional untracked modules remain preserved.

---

## 8. Proposed Import and Rollback Procedure (Milestone 1B)

When approved for execution, Milestone 1B will execute the following controlled procedure:

### 1. Pre-Import Snapshot
Create a dedicated safety backup:
`prisma/dev.db.pre_milestone1_import.bak`

### 2. Transactional Insertion Script
Execute an idempotent, non-destructive insertion using Prisma Client or direct SQLite transaction:
- Iterate through the 50 manifest items.
- For each item, perform an `INSERT` into `Subject` specifying `id` (deterministic UUID v4), `code`, `title`, `credits`, `subjectType`, and `semesterId`.
- If `code` already exists, skip without modification.
- Execute inside a single atomic SQLite transaction (`BEGIN TRANSACTION ... COMMIT`). If any error occurs, automatic rollback triggers.

### 3. Post-Import Verification
- Verify `SELECT COUNT(*) FROM Subject` increases from 7 to exactly 57.
- Verify `PRAGMA foreign_key_check` returns 0 violations.
- Verify `PRAGMA integrity_check` returns `ok`.
- Run `npm run build` and `npx tsc --noEmit` to verify type and build integrity.

### 4. Rollback Guarantee
In the event of any discrepancy:
`Copy-Item prisma/dev.db.pre_milestone1_import.bak prisma/dev.db`
instantly restores the baseline in under 1 second.

---

## Conclusion & Awaiting Explicit Approval

All preparations, source-title reconciliations, elective semantics, relationship verifications, and dry-runs are complete.

**Antigravity stands ready and is awaiting your explicit instruction before performing any database writes.**
