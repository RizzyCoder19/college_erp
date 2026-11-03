# CampusOS — Production Readiness & Database Migration Plan

**Institutional Target:** R. P. Institute of Hospitality & Management (RPIHM)  
**System:** CampusOS ERP  
**Document Classification:** Architecture & Engineering Operational Deliverable  
**Current GitHub Baseline Commit:** `930a44cfc855fdba0cc1ba2dfa6cd167d541bb59` (`fix(documents): complete browser acceptance, Supabase storage adapter, and production readiness documentation`)  
**Previous Baseline Commit:** `31bb97c59f1638af651a8f75bbbcf2269e7fd303` (`feat(storage): integrate Supabase private document storage`)  
**Current Operational Database:** Local SQLite (`prisma/dev.db`, SHA-256: `415b64ac68f85d57e32b5aa5f5323cefdb2986d5c44a75e1a4f4e53f153fb3d8`, 745,472 bytes)  
- *Historical Baseline (Stage 1 closure):* `2F092C9633F565F416051E4551A6D0751DAB601163271D10F3AC49AA0BD0B162` (684,032 bytes)  
- *Pre-Migration Backup (before StudentDocument):* `DF7B49BD5E1FBF5B90A36A0658D7DC83D6B21C8948EA1805934BF03608B670ED` (684,032 bytes, preserved in `backups/dev_db_pre_student_doc_migration_20261102_1325.db`)  
- *Post-Migration Baseline (after 20261102133000):* `ee5637e0a00c2eb4579b0932f7bebb1dadbd4aaa2f802dc703d824a7230d84d3` (745,472 bytes)  
- *Latest Verified Baseline (post-browser acceptance):* `415b64ac68f85d57e32b5aa5f5323cefdb2986d5c44a75e1a4f4e53f153fb3d8` (745,472 bytes, 100% invariant)  
**Target Architecture:** Supabase PostgreSQL (Persistent Relational OLTP) + Supabase Private Storage (Object Storage) + Vercel Serverless Hosting  

---

## Executive Summary

CampusOS is currently running on a single-node SQLite operational database (`prisma/dev.db`) in local development. Milestone 2A.3 (Student Document Management) and Milestone 2A.4 Stage 2 (Private Cloud Storage Adapter) have successfully decoupled binary storage from the filesystem by implementing and verifying `SupabasePrivateStorageProvider` against a live Supabase project (`tofkfdwxsvskakuafqph`).

To prepare CampusOS for multi-tenant, concurrent, high-availability production deployment on serverless infrastructure (Vercel), the core relational database must transition from local file-based SQLite to managed PostgreSQL. This document provides an exhaustive, low-risk engineering migration and production readiness plan where zero data loss is established as the primary migration objective, strictly conditional upon verified pre-cutover backups, multi-tier reconciliation, comprehensive functional verification, and a disciplined, controlled maintenance cutover.

> [!IMPORTANT]
> **Strict Planning Boundary & Current Local Hosting Status:** This document is an architectural planning and engineering guide only. **Neither PostgreSQL migration, production database cutover, nor Vercel deployment has occurred.** CampusOS remains hosted entirely in local development on SQLite (`prisma/dev.db`), which remains 100% invariant. In compliance with strict institutional instructions, no live schema migrations, datasource modifications, or operational database alterations will be executed during this phase.

---

## 1. Existing System & Schema Analysis

### 1.1 Current Baseline Architecture
- **Web Framework:** Next.js 16.4.2 (React 19, Turbopack, App Router).
- **ORM / Query Engine:** Prisma Client v5.22.0.
- **Datasource:** SQLite (`file:./dev.db`).
- **Object Storage:** Hybrid (`SupabasePrivateStorageProvider` for persistent cloud storage; `LocalPrivateStorageProvider` for offline development/testing).
- **Authentication:** Custom session-based authentication utilizing Node.js native `crypto.scrypt` hashing with 16-byte cryptographically secure random salts and database-backed session tokens (`Session` model).

### 1.2 Operational Database Inventory (`prisma/dev.db`)
The operational SQLite database contains verified foundational institutional records:
- **13 Active Student Profiles** across 7 degree and diploma programmes.
- **14 Staff Profiles** (13 foundational staff + 1 teaching faculty Prof. Jeicy Sahaya in Technology & Computing).
- **4 Operational User Accounts** (`admin.local@sample.rpihm.ac.in` [`SYSTEM_ADMIN`], `k.sharma@sample.rpihm.ac.in` [`ACADEMIC_ADMIN`], `khan.umar.26@rpihm.ac.in` [`STUDENT_VIEWER`], and `j.sahaya@sample.rpihm.ac.in` [`FACULTY_MEMBER`]).
- **1 Academic Year** (`2026-27`), terms, departments, programmes, semesters, subjects, divisions, enrolments, timetable entries, attendance sessions/records, exam sessions, fee structures, invoices, and receipts.
- **5 Operational Student Documents:**
  - 3 historical documents recorded under `LOCAL_PRIVATE` storage provider.
  - 2 verified operational documents recorded under `SUPABASE` cloud storage provider (`HFM_UA_CA_Exam_Kit.pdf` and `1000015787.jpg`).

### 1.3 SQLite vs. PostgreSQL Compatibility Matrix

| Schema Feature / Model | Current SQLite Implementation | Target PostgreSQL Architecture | Compatibility / Migration Action |
| :--- | :--- | :--- | :--- |
| **Primary Keys** | `String @id @default(uuid())` | `String @id @default(uuid())` or `UUID` | **100% Compatible.** Retain `String @id @default(uuid())` to avoid breaking foreign key references during initial migration. |
| **Enums & Roles** | `String` with code comments (`role`, `status`, `termType`) | `String` or native `enum` | **Recommended:** Retain `String` with application-level validation for zero-drift migration. Optionally migrate to native PostgreSQL ENUMs in Phase 2B. |
| **Boolean Flags** | Stored as integer `0` or `1` in SQLite | Native `BOOLEAN` (`TRUE` / `FALSE`) | Prisma handles automatic mapping. Export scripts must preserve logical boolean values. |
| **Date & Time Fields** | ISO-8601 Strings / Milliseconds | Native `TIMESTAMPTZ` | Prisma maps `DateTime` to PostgreSQL `TIMESTAMP(3) WITH TIME ZONE`. Ensure all UTC offsets are preserved. |
| **Monetary / Decimal Values** | `Float` in SQLite (`FeeStructure`, `FeeHead`, `StudentFeeInvoice`, `FeeReceipt`) | `Decimal(12, 2)` or `Float` | **Staged:** Keep `Float` for initial verbatim migration; apply a dedicated migration to `Decimal(12, 2)` in post-migration schema hardening to prevent float precision drift. |
| **Referential Integrity** | `onDelete: Restrict / Cascade / SetNull` | Native PostgreSQL Foreign Key constraints | **Full Support.** PostgreSQL enforces foreign keys strictly at the engine level with immediate transaction rollback. |
| **Unique Indexes** | `@@unique` constraints across compound keys | Native B-tree unique indexes | **100% Compatible.** All unique indexes in `schema.prisma` translate directly. |

---

## 2. PostgreSQL Target Architecture

### 2.1 Managed Database Infrastructure
- **Provider:** Supabase Managed PostgreSQL (AWS `eu-west-1` or target production region).
- **PostgreSQL Version:** The currently connected reference project (`tofkfdwxsvskakuafqph`) reports PostgreSQL version 17 (Supabase 17.x). Note that the eventual institutional production target database instance and PostgreSQL version must be verified separately prior to deployment.
- **Connection Architecture:**
  - **Transaction Pooler (Supavisor):** Port `6543` (transaction mode) for ephemeral serverless execution on Vercel. Essential to prevent connection exhaustion during concurrent traffic spikes.
  - **Direct Connection:** Dedicated direct database endpoint (e.g., `db.[REF].supabase.co:5432` with IPv4/IPv6 support, or session mode depending on network architecture) for administrative tasks, Prisma CLI schema migrations, and ETL batch scripts.

### 2.2 Dual-URL Environment Configuration (Unverified Reference Templates)
In production Next.js / Prisma, configure two distinct connection strings in `.env`. The examples below are **unverified architectural reference templates** and must not be used without verification:
```env
# Serverless Runtime Connection Template (Pooled via Supavisor on Port 6543)
DATABASE_URL="postgresql://postgres.[REF]:[PASSWORD]@aws-0-[REGION].pooler.supabase.com:6543/postgres?pgbouncer=true&connection_limit=10"

# Direct Connection Template (Direct DB host on Port 5432 — verify exact hostname from Supabase Dashboard)
DIRECT_URL="postgresql://postgres:[PASSWORD]@db.[REF].supabase.co:5432/postgres?sslmode=require"
```

In `prisma/schema.prisma`:
```prisma
datasource db {
  provider  = "postgresql"
  url       = env("DATABASE_URL")
  directUrl = env("DIRECT_URL")
}
```

> [!WARNING]
> **Mandatory Pre-Implementation Connection Verification (Strictly Non-Executing):** 
> 1. The connection strings above are **unverified reference templates** and do not represent verified operational connection details.
> 2. **Do NOT present or assume the pooler hostname on port 5432 as a verified direct connection.** Supabase provides distinct connection strings depending on IPv4/IPv6 routing (direct host `db.[REF].supabase.co:5432` vs. Supavisor session mode pooler).
> 3. Exact hostnames, port numbers, SSL parameters (`sslmode=require`), connection limits, and Prisma ORM compatibility must be confirmed directly from the target project's Supabase Database Connection Settings panel before any connection or migration script is configured or executed.
> 4. **No database connection or migration is performed during this phase.** The system remains strictly on local SQLite (`prisma/dev.db`), which remains 100% invariant.
> 
> **Indian Institutional Data-Residency Advisory:** The current connected Supabase project (`tofkfdwxsvskakuafqph`) resides in AWS region `eu-west-1` (Ireland). **Do NOT assume** that an EU-hosted database satisfies Indian institutional data-protection (DPDP Act 2023), University of Mumbai, or state regulatory data-residency requirements for student educational records. Institutional administrators must confirm whether a project in an Indian cloud region (such as AWS `ap-south-1` Mumbai) must be provisioned before production database cutover.

---

## 3. Safe Institutional Data Migration Strategy

To pursue the objective of zero data loss and zero duplication without treating it as an unconditional guarantee, the migration is designed to execute within a **controlled institutional maintenance window with a planned operational write freeze**. Zero data loss is the explicit migration objective, conditional upon successful backup snapshots, 100% quantitative and qualitative reconciliation across all entities, post-load verification, and a controlled cutover. The process follows a strict **Extraction -> Validation -> Transform -> Load -> Reconciliation** pipeline, backed by automated rollback procedures and strict no-split-brain safeguards.

### 3.1 Migration Dependency Order (Parent-Child Topology)
Tables must be extracted and inserted strictly adhering to foreign key constraints:

```mermaid
graph TD
    AY[AcademicYear] --> AT[AcademicTerm]
    AY --> FS[FeeStructure]
    AY --> ES[ExamSession]
    DEP[Department] --> PROG[Programme]
    DEP --> STF[Staff]
    PROG --> SEM[Semester]
    PROG --> FS
    SEM --> SUB[Subject]
    SEM --> DIV[Division]
    STF --> TA[TeachingAssignment]
    SUB --> TA
    DIV --> TA
    STU[Student] --> ENR[Enrolment]
    AY --> ENR
    PROG --> ENR
    SEM --> ENR
    DIV --> ENR
    STF --> UA[UserAccount]
    STU --> UA
    UA --> SESS[Session]
    TA --> TTE[TimetableEntry]
    TTE --> AS[AttendanceSession]
    AS --> AR[AttendanceRecord]
    ENR --> AR
    ES --> AC[AssessmentComponent]
    SUB --> AC
    AC --> SAE[StudentAssessmentEntry]
    STU --> SAE
    ENR --> SAE
    ES --> ERS[ExamResultSummary]
    STU --> ERS
    SEM --> ERS
    ERS --> SRE[SubjectResultEntry]
    SUB --> SRE
    FS --> FH[FeeHead]
    FS --> SFI[StudentFeeInvoice]
    STU --> SFI
    ENR --> SFI
    SFI --> FR[FeeReceipt]
    STU --> FR
    STU --> SD[StudentDocument]
    SD --> SDV[StudentDocumentVerification]
```

### 3.2 Automated ETL Ingestion Workflow
1. **Extraction:** A standalone Node.js ETL script (`scripts/etl/export_sqlite.ts`) reads each table from `prisma/dev.db` using the SQLite Prisma Client and writes canonical JSON artifacts to `prisma/migration_snapshots/YYYYMMDD_export/`.
2. **Checksum Generation:** Compute SHA-256 hashes for each exported table JSON payload.
3. **Database Initialization:** Run `prisma migrate deploy` on the target PostgreSQL instance via `DIRECT_URL` to create identical empty tables and indexes.
4. **Batch Insertion:** Read each table snapshot in strict topological order and insert records using `prisma[model].createMany({ data, skipDuplicates: false })` wrapped in database transactions.
5. **Sequence Reset (if any):** While CampusOS uses UUIDs, reset any system sequences if auxiliary integer IDs are introduced.

---

## 4. Pre- and Post-Migration Data Validation & Reconciliation

Reconciliation is the gating criterion for cutover. Migration is considered successful **only** when 100% of the following verification checks pass:

### 4.1 Quantitative Reconciliation (Row Counts)
Every model must match exact counts before and after migration:
- `Student`: 13 records.
- `Staff`: 14 records (including 1 teaching faculty Prof. Jeicy Sahaya).
- `UserAccount`: 4 records (`admin.local@sample.rpihm.ac.in`, `k.sharma@sample.rpihm.ac.in`, `khan.umar.26@rpihm.ac.in`, and `j.sahaya@sample.rpihm.ac.in`).
- `TeachingAssignment`: 6 records.
- `StudentFeeInvoice`: exactly 2 records (`INV-2026-7759` for Khan Umar, `INV-2026-5033` for Komal Soni).
- `FeeReceipt`: exactly 3 records (`REC-2026-121403` for Khan Umar, `REC-2026-969942` and `REC-2026-948761` for Komal Soni).
- `StudentDocument`: exactly 5 operational records (3 `LOCAL_PRIVATE` + 2 `SUPABASE`).
- `Programme`, `Semester`, `Subject`, `Division`, `Enrolment`, `FeeStructure`, `ExamSession`, `ExamResultSummary`: Exact parity across all operational tables.

### 4.2 Qualitative Reconciliation (Financial & Academic Ledger Integrity)
- **Fee Ledger Balancing:**
  $$\sum \text{StudentFeeInvoice.totalDemand} \equiv \sum \text{Target Postgres Invoices.totalDemand}$$
  $$\sum \text{FeeReceipt.amountPaid} \equiv \sum \text{Target Postgres Receipts.amountPaid}$$
- **Document Metadata & Storage Keys:**
  Every `StudentDocument` record in PostgreSQL must have identical `storageKey`, `checksum`, and `storageProvider` values matching the SQLite source.
- **Password Hashes & Salt Invariance:**
  The `passwordHash` and `salt` strings for all user accounts must match character-for-character, ensuring existing administrative passwords work immediately without requiring forced password resets.

---

## 5. Environment Separation & Secret Management

```mermaid
graph LR
    subgraph Local Dev
        L_DB[(SQLite dev.db)]
        L_STOR[Supabase Dev Bucket / Local]
        L_APP[Next.js Local :3000]
    end

    subgraph Staging
        S_DB[(Supabase Postgres Staging)]
        S_STOR[Supabase Storage staging-bucket]
        S_APP[Vercel Preview Deployments]
    end

    subgraph Production
        P_DB[(Supabase Postgres Prod)]
        P_STOR[Supabase Storage student-documents]
        P_APP[Vercel Production CampusOS]
    end
```

### 5.1 Environment Isolation Policy
1. **Development (`local`):**
   - SQLite `prisma/dev.db` or isolated branch databases.
   - Credentials stored in gitignored `.env`.
   - Never shares database records or encryption keys with production.
2. **Staging / Preview (`staging`):**
   - Separate Supabase project or distinct PostgreSQL database schema (`campusos_staging`).
   - Separate Supabase Storage bucket (`student-documents-staging`).
   - Automated Vercel preview branch deployments for PR verification.
3. **Production (`production`):**
   - Dedicated production Supabase instance with Point-In-Time Recovery (PITR).
   - Dedicated private bucket (`student-documents`) with strict server-side signed URL access.

### 5.2 Secret Protection Rules
- **Zero Secrets in Code or Git:** `SUPABASE_SERVICE_ROLE_KEY`, `DATABASE_URL`, and session tokens must never appear in repository code, Git commits, documentation, or client-side JavaScript bundles.
- **Vercel Secret Scoping:** Store production database credentials strictly in Vercel Environment Variables scoped exclusively to **Production** (encrypted at rest).
- **Role Key Rotation:** Maintain a documented key rotation procedure in the institutional runbook with zero downtime.

---

## 6. Authentication, Sessions & Authorization Implications

1. **Session Continuity:**
   - Active user sessions in SQLite can either be migrated verbatim into PostgreSQL `Session` table or gracefully expired during the maintenance window, prompting administrators to re-login.
   - **Recommended:** Migrate active sessions during cutover so ongoing administrative workflows are uninterrupted.
2. **Transaction Isolation:**
   - SQLite defaults to `SERIALIZABLE` file-level locking, which can cause `database locked` errors under concurrent writes.
   - PostgreSQL uses **Multi-Version Concurrency Control (MVCC)** with `READ COMMITTED` default isolation, completely eliminating database locks during concurrent attendance recording, student document uploads, and fee collection.

---

## 7. Backup, Disaster Recovery & Rollback Strategy

### 7.1 Backup Schedule & Testing
- **Continuous WAL Archiving:** Supabase Point-in-Time Recovery (PITR) configured for 7 to 30 days retention.
- **Daily Automated Logical Backups:** Native `pg_dump` snapshots exported to cold off-site storage.
- **Quarterly Disaster Recovery Simulation:** Automated restore drill spinning up a temporary database to verify backup integrity.

### 7.2 Cutover Rollback Strategy
If post-migration reconciliation fails or a fatal application error occurs during cutover:
1. **Pre-Cutover Freeze:** SQLite `prisma/dev.db` is archived as `prisma/pre_migration_baseline.db` and marked read-only.
2. **Immediate Abort Window (T + 0 to T + 60 min):**
   - If reconciliation discrepancy $> 0$, revert Vercel environment variable `DATABASE_URL` back to previous stable database or abort traffic switch.
   - Re-enable operational write access on SQLite.
   - Purge incomplete staging records from PostgreSQL.
3. **No Split-Brain Guarantee:** Traffic is never dual-routed. Writes occur either exclusively to SQLite (pre-cutover) or exclusively to PostgreSQL (post-cutover).

---

## 8. Vercel Deployment Prerequisites & Runtime Configuration

### 8.1 Build & Runtime Requirements
- **Node.js Runtime:** Node.js 20.x or 22.x LTS.
- **Build Command:** `prisma generate && next build`
- **Install Command:** `npm ci`
- **Output Directory:** Next.js default (`.next`).

### 8.2 Mandatory Vercel Environment Variables

| Variable Name | Environment | Description | Sensitivity |
| :--- | :--- | :--- | :--- |
| `DATABASE_URL` | Staging, Prod | Supabase Pooled PostgreSQL connection string (Port 6543, `?pgbouncer=true`) | **Secret** |
| `DIRECT_URL` | Staging, Prod | Supabase Direct connection string (example: Port 5432, unverified against actual project configuration; exact port and host must be confirmed from target project dashboard) for Prisma CLI | **Secret** |
| `STORAGE_PROVIDER` | Staging, Prod | Must be explicitly set to `SUPABASE` | Public Configuration |
| `SUPABASE_URL` | Staging, Prod | HTTPS endpoint of the Supabase project | Public Configuration |
| `SUPABASE_STORAGE_BUCKET` | Staging, Prod | Private bucket name (`student-documents`) | Public Configuration |
| `SUPABASE_SERVICE_ROLE_KEY` | Staging, Prod | Server-side elevated secret key for private document storage | **Critical Secret** |
| `SESSION_SECRET` | Staging, Prod | High-entropy secret for cookie signing | **Critical Secret** |
| `NODE_ENV` | Staging, Prod | Set to `production` | Public Configuration |

---

## 9. Staged Implementation Sequence & Acceptance Criteria

```mermaid
timeline
    title CampusOS Production Readiness Roadmap
    Stage 1 : Cloud PostgreSQL Provisioning & Schema Validation
    Stage 2 : Staging Environment Setup & ETL Dry-Run
    Stage 3 : Comprehensive Verification & Pre-Migration Freeze
    Stage 4 : Production Cutover & Ledger Reconciliation
    Stage 5 : Post-Deployment Verification & Operational Handover
```

### Stage 1: Cloud PostgreSQL Provisioning & Schema Validation
- **Action:** Provision target Supabase PostgreSQL instance. Validate dual-URL connection (pooled and direct). Run `prisma migrate deploy` on empty database.
- **Acceptance:** Schema matches `prisma/schema.prisma` exactly with all indexes, foreign keys, and tables created without warning.

### Stage 2: Staging Environment Setup & ETL Dry-Run
- **Action:** Execute automated extraction from SQLite fixture. Load data into staging PostgreSQL. Verify row counts and checksums.
- **Acceptance:** 100% quantitative and qualitative parity on staging database. Zero data truncation.

### Stage 3: Staging Functional Verification
- **Action:** Point a Vercel preview deployment to the staging PostgreSQL and staging Supabase bucket. Run complete end-to-end user workflows:
  - Administrator login and session validation.
  - Student document upload, replacement, verification, and authorized download.
  - Fee invoice generation and receipt collection.
  - Attendance marking and exam result publishing.
- **Acceptance:** Zero runtime regressions, zero 500 errors, all security boundaries intact.

### Stage 4: Production Cutover
- **Action:** Schedule 30-minute institutional maintenance window. Freeze writes on SQLite. Execute production ETL ingestion. Run quantitative reconciliation script.
- **Acceptance:** Reconciled data matches SQLite baseline to the penny and byte.

### Stage 5: Post-Deployment Verification & Sign-Off
- **Action:** Update Vercel production environment variables. Verify live health check. Monitor application error telemetry for 48 hours.
- **Acceptance:** Institutional sign-off from Academic Administrator and System Administrator.

---

## 10. Institutional Decisions Requiring Approval

Before executing the migration roadmap, institutional administrators must formalize decisions on:
1. **Target Cloud Region:** Confirmation of primary hosting region (`eu-west-1` vs. `ap-south-1` Mumbai) for data sovereignty compliance.
2. **Maintenance Window:** Authorized day and time for the 30-minute operational write freeze (e.g., Sunday 02:00 IST).
3. **Historical Session Invalidation vs. Migration:** Whether active sessions should be migrated or gracefully expired requiring a fresh administrator login.
4. **Float to Decimal Transition:** Approval to execute the subsequent precision hardening migration (`Decimal(12, 2)` for fee amounts) immediately following PostgreSQL cutover.

---

*Authored by Antigravity Engineering for R. P. Institute of Hospitality & Management (CampusOS).*  
*Current Operational Baseline: Local SQLite operational records remain 100% active, invariant, and untouched in development (`prisma/dev.db` SHA-256: `415b64ac68f85d57e32b5aa5f5323cefdb2986d5c44a75e1a4f4e53f153fb3d8`). PostgreSQL migration, database cutover, and Vercel production deployment remain strictly future planned actions requiring institutional authorization.*  
*Milestone 2A.4 Documents Module Status: Final browser acceptance and Supabase private storage integration verified with 100% success across desktop and mobile workflows.*
