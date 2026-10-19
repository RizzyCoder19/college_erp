# RPIHM CampusOS -- Master Data Model and Relational Architecture

**Document Version:** 1.0.0 (Master Release)
**Classification:** Enterprise Relational Schema Specification
**Target Database:** PostgreSQL 16+ with Prisma ORM 5.x / 6.x
**Target Institute:** R. P. Institute of Hospitality & Management
**Project Path:** G:\rpihm-campusos
**Audit Date:** October 2026

---

## 1. Relational Architecture Principles

The RPIHM CampusOS relational data architecture is engineered to guarantee strict ACID compliance, data normalization (3NF), zero data loss, and complete referential integrity across all 13 modules.

1. **Deterministic Primary Keys:** All primary keys utilize globally unique UUIDv4 identifiers to allow decoupled distributed client generation, seamless migrations, and security against integer enumeration attacks.
2. **Referential Integrity and Cascades:**
   - Critical historical records (e.g., student marks, financial transactions, fee receipts, published notices) enforce ON DELETE RESTRICT. Deleting a student who has historical examination or financial records is strictly prohibited.
   - Child metadata and join tables (e.g., StudentDocument, StaffQualification, IndentItem) enforce ON DELETE CASCADE.
3. **Audit Immutability:** Financial ledgers (FeeTransaction) and system logs (AuditLog) are append-only. Zero UPDATE or DELETE operations are permitted on ledger tables.
4. **Optimistic Locking:** Volatile entities like FacilityBooking and BookCopy include an @updatedAt timestamp and integer version column to prevent concurrent double-booking.

---

## 2. Master Entity-Relationship Diagram (Mermaid ERD)

`mermaid
erDiagram
    DEPARTMENT ||--o{ PROGRAMME : offers
    DEPARTMENT ||--o{ STAFF : employs
    PROGRAMME ||--o{ SEMESTER : contains
    SEMESTER ||--o{ SUBJECT : includes
    SEMESTER ||--o{ DIVISION_BATCH : groups
    DEPARTMENT ||--o{ FACILITY_ROOM : manages
    
    STUDENT ||--o{ ADMISSION_RECORD : has
    STUDENT }|--|| DIVISION_BATCH : enrolled_in
    STUDENT ||--o{ GUARDIAN : has
    STUDENT ||--o{ STUDENT_DOCUMENT : owns
    STUDENT ||--o{ STUDENT_ATTENDANCE : attends
    STUDENT ||--o{ STUDENT_MARK : achieves
    STUDENT ||--o{ STUDENT_FEE_ACCOUNT : billed
    STUDENT ||--o{ PLACEMENT_APPLICATION : applies
    STUDENT ||--o{ BOOK_CIRCULATION : borrows
    
    STAFF ||--o{ STAFF_QUALIFICATION : holds
    STAFF ||--o{ TEACHING_ASSIGNMENT : assigned
    STAFF ||--o{ CLASS_SESSION : conducts
    STAFF ||--o{ NOTICE : issues
    STAFF ||--o{ KITCHEN_INDENT : requests
    
    SUBJECT ||--o{ TEACHING_ASSIGNMENT : teaches
    SUBJECT ||--o{ CLASS_SESSION : schedules
    SUBJECT ||--o{ ASSESSMENT_COMPONENT : evaluates
    
    CLASS_SESSION ||--o{ STUDENT_ATTENDANCE : records
    CLASS_SESSION }|--|| FACILITY_ROOM : hosted_in
    
    ASSESSMENT_COMPONENT ||--o{ STUDENT_MARK : graded
    EXAM_PERIOD ||--o{ ASSESSMENT_COMPONENT : scheduled_in
    
    STUDENT_FEE_ACCOUNT ||--o{ FEE_TRANSACTION : pays
    FEE_TRANSACTION ||--|| FEE_RECEIPT : generates
    FEE_STRUCTURE }|--|| PROGRAMME : defines
    
    FACILITY_ROOM ||--o{ FACILITY_BOOKING : reserves
    FACILITY_ROOM ||--o{ KITCHEN_INDENT : indents
    KITCHEN_INDENT ||--o{ INDENT_ITEM : contains
    
    BOOK_TITLE ||--o{ BOOK_COPY : has
    BOOK_COPY ||--o{ BOOK_CIRCULATION : loans
    
    CAMPUS_EVENT ||--o{ EVENT_REGISTRATION : registers
    NOTICE ||--o{ NOTICE_ATTACHMENT : attaches
    NOTICE ||--o{ NOTICE_ACKNOWLEDGMENT : acknowledges
    
    USER ||--o{ AUDIT_LOG : generates
    USER }|--|| ROLE : assigned
    ROLE ||--o{ ROLE_PERMISSION : maps
    PERMISSION ||--o{ ROLE_PERMISSION : granted
`

---

## 3. Relational Schema Specifications by Functional Cluster

### 3.1. Cluster 1: Core Academic Structure
Defines the institutional academic hierarchy from departments to divisions:

`prisma
model Department {
  id          String       @id @default(uuid())
  code        String       @unique // e.g., 'CUL', 'HOSP', 'MGMT'
  name        String       // e.g., 'Department of Culinary Arts'
  hodId       String?      @unique
  programmes  Programme[]
  staff       Staff[]
  facilities  FacilityRoom[]
  createdAt   DateTime     @default(now())
  updatedAt   DateTime     @updatedAt
}

model Programme {
  id             String          @id @default(uuid())
  code           String          @unique // e.g., 'BSC-HS', 'BA-CUL'
  name           String          // e.g., 'B.Sc. in Hospitality Studies'
  degreeLevel    String          // 'UNDERGRADUATE', 'POSTGRADUATE', 'DIPLOMA'
  durationYears  Int             @default(3)
  departmentId   String
  department     Department      @relation(fields: [departmentId], references: [id], onDelete: Restrict)
  semesters      Semester[]
  feeStructures  FeeStructure[]
  createdAt      DateTime        @default(now())
}

model Semester {
  id              String          @id @default(uuid())
  programmeId     String
  programme       Programme       @relation(fields: [programmeId], references: [id], onDelete: Cascade)
  semesterNumber  Int             // 1 to 6
  academicTerm    String          // 'ODD', 'EVEN'
  subjects        Subject[]
  divisions       DivisionBatch[]
  
  @@unique([programmeId, semesterNumber])
}

model Subject {
  id                   String                @id @default(uuid())
  code                 String                @unique // e.g., 'FP-101', 'FBM-202'
  title                String
  credits              Decimal               @db.Decimal(4, 2)
  subjectType          String                // 'THEORY', 'PRACTICAL_KITCHEN', 'RESTAURANT_LAB'
  semesterId           String
  semester             Semester              @relation(fields: [semesterId], references: [id], onDelete: Restrict)
  teachingAssignments  TeachingAssignment[]
  classSessions        ClassSession[]
  assessments          AssessmentComponent[]
}

model DivisionBatch {
  id           String      @id @default(uuid())
  name         String      // 'Div-A', 'Batch-K1'
  semesterId   String
  semester     Semester    @relation(fields: [semesterId], references: [id], onDelete: Restrict)
  maxCapacity  Int         @default(60)
  students     Student[]
  classSessions ClassSession[]
}
`

### 3.2. Cluster 2: Students and Admissions
Manages students, permanent identity, guardians, and verified documents:

`prisma
model Student {
  id                 String                  @id @default(uuid())
  rollNumber         String                  @unique // 'RPIHM-2026-001'
  prn                String                  @unique // University PRN: '2026016400012345'
  fullName           String
  email              String                  @unique
  phone              String
  dob                DateTime
  bloodGroup         String?
  status             String                  @default('ACTIVE') // 'ACTIVE', 'DEBARRED', 'ALUMNI'
  divisionBatchId    String
  divisionBatch      DivisionBatch           @relation(fields: [divisionBatchId], references: [id], onDelete: Restrict)
  guardians          Guardian[]
  documents          StudentDocument[]
  admissionRecord    AdmissionRecord?
  attendanceLogs     StudentAttendance[]
  marks              StudentMark[]
  feeAccounts        StudentFeeAccount[]
  placementApps      StudentPlacementApplication[]
  bookLoans          BookCirculation[]
  createdAt          DateTime                @default(now())
  updatedAt          DateTime                @updatedAt

  @@index([divisionBatchId])
  @@index([status])
}

model Guardian {
  id           String   @id @default(uuid())
  studentId    String
  student      Student  @relation(fields: [studentId], references: [id], onDelete: Cascade)
  fullName     String
  relationship String   // 'FATHER', 'MOTHER', 'SPONSOR'
  phone        String
  email        String?
  address      String?
}

model StudentDocument {
  id           String   @id @default(uuid())
  studentId    String
  student      Student  @relation(fields: [studentId], references: [id], onDelete: Cascade)
  docType      String   // 'AADHAAR', '12TH_MARKSHEET', 'CASTE_CERT'
  fileUrl      String
  isVerified   Boolean  @default(false)
  verifiedAt   DateTime?
}

model AdmissionRecord {
  id             String    @id @default(uuid())
  studentId      String    @unique
  student        Student   @relation(fields: [studentId], references: [id], onDelete: Cascade)
  admissionDate  DateTime  @default(now())
  quotaCategory  String    // 'GENERAL', 'MANAGEMENT', 'OBC', 'SPORTS'
  previousSchool String?
  meritRank      Int?
}
`

### 3.3. Cluster 3: Faculty, Staff and Workload
Models teaching cadres, culinary chef instructors, qualifications, and workloads:

`prisma
model Staff {
  id                   String                @id @default(uuid())
  employeeId           String                @unique // 'RPIHM-FAC-014'
  fullName             String
  email                String                @unique
  phone                String
  designation          String                // 'Executive Chef Instructor', 'Associate Professor'
  category             String                // 'TEACHING', 'TECHNICAL_CHEF', 'ADMINISTRATIVE'
  departmentId         String
  department           Department            @relation(fields: [departmentId], references: [id], onDelete: Restrict)
  dateOfJoining        DateTime
  status               String                @default('ACTIVE')
  qualifications       StaffQualification[]
  teachingAssignments  TeachingAssignment[]
  conductedSessions    ClassSession[]
  kitchenIndents       KitchenIndent[]
  issuedNotices        Notice[]
  createdAt            DateTime              @default(now())

  @@index([departmentId])
  @@index([category])
}

model StaffQualification {
  id             String  @id @default(uuid())
  staffId        String
  staff          Staff   @relation(fields: [staffId], references: [id], onDelete: Cascade)
  degree         String  // 'Master in Culinary Arts', 'BHM'
  institution    String
  yearOfPassing  Int
  specialization String?
}

model TeachingAssignment {
  id          String   @id @default(uuid())
  staffId     String
  staff       Staff    @relation(fields: [staffId], references: [id], onDelete: Restrict)
  subjectId   String
  subject     Subject  @relation(fields: [subjectId], references: [id], onDelete: Restrict)
  weeklyHours Int      @default(4)

  @@unique([staffId, subjectId])
}
`

### 3.4. Cluster 4: Scheduling and Attendance
Coordinates classroom sessions, kitchen practicals, and student attendance:

`prisma
model ClassSession {
  id              String              @id @default(uuid())
  subjectId       String
  subject         Subject             @relation(fields: [subjectId], references: [id], onDelete: Restrict)
  staffId         String
  staff           Staff               @relation(fields: [staffId], references: [id], onDelete: Restrict)
  divisionBatchId String
  divisionBatch   DivisionBatch       @relation(fields: [divisionBatchId], references: [id], onDelete: Restrict)
  facilityRoomId  String
  facilityRoom    FacilityRoom        @relation(fields: [facilityRoomId], references: [id], onDelete: Restrict)
  sessionDate     DateTime            @db.Date
  startTime       String              // '09:00'
  endTime         String              // '11:00'
  topicCovered    String?
  attendanceLogs  StudentAttendance[]
  
  @@index([sessionDate, facilityRoomId])
  @@index([subjectId, divisionBatchId])
}

model StudentAttendance {
  id         String       @id @default(uuid())
  sessionId  String
  session    ClassSession @relation(fields: [sessionId], references: [id], onDelete: Cascade)
  studentId  String
  student    Student      @relation(fields: [studentId], references: [id], onDelete: Restrict)
  status     String       // 'PRESENT', 'ABSENT', 'LATE', 'EXCUSED'
  markedAt   DateTime     @default(now())

  @@unique([sessionId, studentId])
  @@index([studentId, status])
}
`

### 3.5. Cluster 5: Examinations, Assessments and Results
Manages exam cycles, component marks, and university transcripts:

`prisma
model ExamPeriod {
  id          String                @id @default(uuid())
  termName    String                // 'Winter 2026 Finals'
  startDate   DateTime              @db.Date
  endDate     DateTime              @db.Date
  isPublished Boolean               @default(false)
  assessments AssessmentComponent[]
}

model AssessmentComponent {
  id           String        @id @default(uuid())
  examPeriodId String
  examPeriod   ExamPeriod    @relation(fields: [examPeriodId], references: [id], onDelete: Restrict)
  subjectId    String
  subject      Subject       @relation(fields: [subjectId], references: [id], onDelete: Restrict)
  name         String        // 'Internal Theory', 'Kitchen VIVA', 'University Final'
  maxMarks     Decimal       @db.Decimal(5, 2)
  passingMarks Decimal       @db.Decimal(5, 2)
  weightagePct Decimal       @db.Decimal(5, 2)
  studentMarks StudentMark[]

  @@unique([examPeriodId, subjectId, name])
}

model StudentMark {
  id            String              @id @default(uuid())
  componentId   String
  component     AssessmentComponent @relation(fields: [componentId], references: [id], onDelete: Restrict)
  studentId     String
  student       Student             @relation(fields: [studentId], references: [id], onDelete: Restrict)
  marksObtained Decimal?            @db.Decimal(5, 2)
  isAbsent      Boolean             @default(false)
  isModerated   Boolean             @default(false)
  moderatedBy   String?
  gradeEarned   String?             // 'O', 'A+', 'B', 'F'

  @@unique([componentId, studentId])
  @@index([studentId])
}
`

### 3.6. Cluster 6: Fees and Financial Accounts
Maintains strict accounting ledgers, installment dues, and receipts:

`prisma
model FeeStructure {
  id             String    @id @default(uuid())
  programmeId    String
  programme      Programme @relation(fields: [programmeId], references: [id], onDelete: Restrict)
  semesterNumber Int
  academicYear   String    // '2026-27'
  tuitionFee     Decimal   @db.Decimal(10, 2)
  kitchenLabFee  Decimal   @db.Decimal(10, 2)
  libraryDeposit Decimal   @db.Decimal(10, 2)
  examFee        Decimal   @db.Decimal(10, 2)
  totalPayable   Decimal   @db.Decimal(10, 2)

  @@unique([programmeId, semesterNumber, academicYear])
}

model StudentFeeAccount {
  id             String           @id @default(uuid())
  studentId      String
  student        Student          @relation(fields: [studentId], references: [id], onDelete: Restrict)
  academicYear   String
  totalBilled    Decimal          @db.Decimal(10, 2)
  concessions    Decimal          @default(0.00) @db.Decimal(10, 2)
  netPayable     Decimal          @db.Decimal(10, 2)
  balanceDue     Decimal          @db.Decimal(10, 2)
  transactions   FeeTransaction[]

  @@unique([studentId, academicYear])
  @@index([balanceDue])
}

model FeeTransaction {
  id             String            @id @default(uuid())
  accountId      String
  account        StudentFeeAccount @relation(fields: [accountId], references: [id], onDelete: Restrict)
  referenceNo    String            @unique // Bank / Gateway UTR
  amountPaid     Decimal           @db.Decimal(10, 2)
  paymentMode    String            // 'NEFT', 'UPI', 'CARD', 'DEMAND_DRAFT'
  transactionDate DateTime         @default(now())
  status         String            @default('SUCCESS')
  receipt        FeeReceipt?

  @@index([transactionDate])
}

model FeeReceipt {
  id            String         @id @default(uuid())
  transactionId String         @unique
  transaction   FeeTransaction @relation(fields: [transactionId], references: [id], onDelete: Restrict)
  receiptNumber String         @unique // 'RPIHM-REC-2026-0849'
  generatedAt   DateTime       @default(now())
  pdfUrl        String?
}
`

### 3.7. Cluster 7: Placements and Career Services
Coordinates corporate hospitality recruiters, interview rounds, and job offers:

`prisma
model RecruitingCompany {
  id             String           @id @default(uuid())
  name           String           // 'Taj Hotels Resorts and Palaces'
  website        String?
  hrContactName  String
  hrContactEmail String
  placementDrives PlacementDrive[]
}

model PlacementDrive {
  id               String                        @id @default(uuid())
  companyId        String
  company          RecruitingCompany             @relation(fields: [companyId], references: [id], onDelete: Restrict)
  title            String                        // 'Management Trainee Batch 2026'
  minCgpa          Decimal                       @db.Decimal(4, 2)
  ctcOffered       Decimal                       @db.Decimal(10, 2)
  driveDate        DateTime                      @db.Date
  applications     StudentPlacementApplication[]
}

model StudentPlacementApplication {
  id               String         @id @default(uuid())
  driveId          String
  drive            PlacementDrive @relation(fields: [driveId], references: [id], onDelete: Restrict)
  studentId        String
  student          Student        @relation(fields: [studentId], references: [id], onDelete: Restrict)
  stage            String         @default('APPLIED') // 'SHORTLISTED', 'TECHNICAL_VIVA', 'OFFERED'
  resumeUrl        String?
  appliedAt        DateTime       @default(now())

  @@unique([driveId, studentId])
}
`

### 3.8. Cluster 8: Facilities, Training Kitchens and Store Indents
Models commercial hospitality kitchens, equipment status, and daily food indents:

`prisma
model FacilityRoom {
  id            String            @id @default(uuid())
  code          String            @unique // 'BTK-1', 'ATK-2', 'REST-GH'
  name          String            // 'Basic Training Kitchen 1'
  category      String            // 'KITCHEN_LAB', 'RESTAURANT_LAB', 'COMPUTER_LAB'
  capacity      Int               @default(30)
  departmentId  String
  department    Department        @relation(fields: [departmentId], references: [id], onDelete: Restrict)
  sessions      ClassSession[]
  bookings      FacilityBooking[]
  indents       KitchenIndent[]
}

model FacilityBooking {
  id             String       @id @default(uuid())
  facilityRoomId String
  facilityRoom   FacilityRoom @relation(fields: [facilityRoomId], references: [id], onDelete: Restrict)
  date           DateTime     @db.Date
  startTime      String
  endTime        String
  purpose        String
  bookedBy       String

  @@index([facilityRoomId, date])
}

model KitchenIndent {
  id             String       @id @default(uuid())
  facilityRoomId String
  facilityRoom   FacilityRoom @relation(fields: [facilityRoomId], references: [id], onDelete: Restrict)
  staffId        String
  staff          Staff        @relation(fields: [staffId], references: [id], onDelete: Restrict)
  dateRequired   DateTime     @db.Date
  status         String       @default('DRAFT') // 'APPROVED', 'ISSUED'
  items          IndentItem[]
}

model IndentItem {
  id         String        @id @default(uuid())
  indentId   String
  indent     KitchenIndent @relation(fields: [indentId], references: [id], onDelete: Cascade)
  itemName   String        // 'Basmati Rice', 'Butter Unsalted'
  quantity   Decimal       @db.Decimal(8, 2)
  unit       String        // 'KG', 'LITER', 'PACK'
}
`

### 3.9. Cluster 9: Library, Communication and Campus Life
Models learning resource circulation, events, and statutory circulars:

`prisma
model BookTitle {
  id          String     @id @default(uuid())
  isbn        String     @unique
  title       String
  author      String
  publisher   String?
  category    String     // 'Culinary Arts', 'Food Safety'
  copies      BookCopy[]
}

model BookCopy {
  id          String            @id @default(uuid())
  bookTitleId String
  bookTitle   BookTitle         @relation(fields: [bookTitleId], references: [id], onDelete: Restrict)
  accessionNo String            @unique
  status      String            @default('AVAILABLE') // 'ISSUED', 'LOST'
  loans       BookCirculation[]
}

model BookCirculation {
  id         String    @id @default(uuid())
  copyId     String
  copy       BookCopy  @relation(fields: [copyId], references: [id], onDelete: Restrict)
  studentId  String
  student    Student   @relation(fields: [studentId], references: [id], onDelete: Restrict)
  issuedAt   DateTime  @default(now())
  dueDate    DateTime  @db.Date
  returnedAt DateTime?
}

model Notice {
  id              String                 @id @default(uuid())
  referenceNo     String                 @unique // 'RPIHM/CIR/2026/042'
  title           String
  bodyHtml        String
  issuedById      String
  issuedBy        Staff                  @relation(fields: [issuedById], references: [id], onDelete: Restrict)
  priority        String                 @default('ROUTINE') // 'URGENT', 'STATUTORY'
  targetAudience  String                 @default('ALL')
  isStatutory     Boolean                @default(false)
  createdAt       DateTime               @default(now())
  attachments     NoticeAttachment[]
  acknowledgments NoticeAcknowledgment[]
}

model NoticeAttachment {
  id        String @id @default(uuid())
  noticeId  String
  notice    Notice @relation(fields: [noticeId], references: [id], onDelete: Cascade)
  fileUrl   String
  fileName  String
}

model NoticeAcknowledgment {
  id        String   @id @default(uuid())
  noticeId  String
  notice    Notice   @relation(fields: [noticeId], references: [id], onDelete: Cascade)
  userId    String
  readAt    DateTime @default(now())

  @@unique([noticeId, userId])
}

model CampusEvent {
  id            String              @id @default(uuid())
  title         String
  category      String              // 'ACADEMIC', 'HOSPITALITY_WORKSHOP', 'CULTURAL'
  startTime     DateTime
  endTime       DateTime
  venueName     String
  registrations EventRegistration[]
}

model EventRegistration {
  id        String      @id @default(uuid())
  eventId   String
  event     CampusEvent @relation(fields: [eventId], references: [id], onDelete: Cascade)
  studentId String
  status    String      @default('REGISTERED')

  @@unique([eventId, studentId])
}
`

### 3.10. Cluster 10: Security, RBAC and System Audit
Provides institutional security boundaries and an immutable compliance audit trail:

`prisma
model User {
  id           String     @id @default(uuid())
  username     String     @unique
  email        String     @unique
  passwordHash String
  roleId       String
  role         Role       @relation(fields: [roleId], references: [id], onDelete: Restrict)
  isActive     Boolean    @default(true)
  lastLoginAt  DateTime?
  auditLogs    AuditLog[]
}

model Role {
  id          String           @id @default(uuid())
  name        String           @unique // 'SUPER_ADMIN', 'REGISTRAR', 'FACULTY'
  permissions RolePermission[]
  users       User[]
}

model Permission {
  id    String           @id @default(uuid())
  slug  String           @unique // 'attendance:record', 'fee:collect', 'grade:publish'
  roles RolePermission[]
}

model RolePermission {
  roleId       String
  role         Role       @relation(fields: [roleId], references: [id], onDelete: Cascade)
  permissionId String
  permission   Permission @relation(fields: [permissionId], references: [id], onDelete: Cascade)

  @@id([roleId, permissionId])
}

model AuditLog {
  id            String   @id @default(uuid())
  userId        String?
  user          User?    @relation(fields: [userId], references: [id], onDelete: SetNull)
  actionType    String   // 'CREATE', 'UPDATE', 'DELETE', 'LOGIN'
  entityName    String   // 'StudentMark', 'FeeTransaction'
  entityId      String?
  oldValuesJson String?  // Stringified JSON
  newValuesJson String?  // Stringified JSON
  ipAddress     String?
  createdAt     DateTime @default(now())

  @@index([entityName, entityId])
  @@index([createdAt])
}

model SystemSetting {
  key         String   @id
  valueJson   String
  category    String   // 'ACADEMIC', 'SECURITY', 'GATEWAY'
  isSecret    Boolean  @default(false)
  updatedAt   DateTime @updatedAt
}
`

---

## 4. Transactional Boundaries (ACID Zones)

To prevent data corruption, the following critical workflows MUST execute inside prisma.:

1. **Student Enrollment Transaction:** Create Student, generate unique PRN and RollNumber, link AdmissionRecord, initialize StudentFeeAccount, and assign to DivisionBatch.
2. **Fee Payment and Receipt Transaction:** Insert FeeTransaction, decrement StudentFeeAccount.balanceDue, generate unique sequential FeeReceipt, and trigger audit log entry.
3. **Examination Result Publishing Transaction:** Validate raw mark thresholds, lock AssessmentComponent, compute SGPA/CGPA, mutate StudentMark.isModerated to true, and create audit trail snapshot.
4. **Kitchen Lab Scheduling and Indent Transaction:** Reserve FacilityBooking, verify zero time-slot collisions, lock workstation inventory, and create draft KitchenIndent.
