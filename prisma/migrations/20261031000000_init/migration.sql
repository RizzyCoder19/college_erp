-- CreateTable
CREATE TABLE "AcademicTerm" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "academicYearId" TEXT NOT NULL,
    "termType" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "startDate" DATETIME NOT NULL,
    "endDate" DATETIME NOT NULL,
    "isCurrent" BOOLEAN NOT NULL DEFAULT false,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" DATETIME NOT NULL,
    FOREIGN KEY ("academicYearId") REFERENCES "AcademicYear" ("id") ON DELETE CASCADE ON UPDATE CASCADE
);

-- CreateTable
CREATE TABLE "AcademicYear" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "code" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "startDate" DATETIME NOT NULL,
    "endDate" DATETIME NOT NULL,
    "isCurrent" BOOLEAN NOT NULL DEFAULT false,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" DATETIME NOT NULL
);

-- CreateTable
CREATE TABLE "AssessmentComponent" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "examSessionId" TEXT NOT NULL,
    "subjectId" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "componentType" TEXT NOT NULL,
    "maxMarks" REAL NOT NULL,
    "minPassingMarks" REAL,
    "weightagePercentage" REAL,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" DATETIME NOT NULL,
    FOREIGN KEY ("subjectId") REFERENCES "Subject" ("id") ON DELETE RESTRICT ON UPDATE CASCADE,
    FOREIGN KEY ("examSessionId") REFERENCES "ExamSession" ("id") ON DELETE CASCADE ON UPDATE CASCADE
);

-- CreateTable
CREATE TABLE "AssessmentRevisionAudit" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "entryId" TEXT NOT NULL,
    "previousScore" REAL,
    "newScore" REAL,
    "previousStatus" TEXT NOT NULL,
    "newStatus" TEXT NOT NULL,
    "reason" TEXT NOT NULL,
    "revisedById" TEXT NOT NULL,
    "revisedAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY ("revisedById") REFERENCES "UserAccount" ("id") ON DELETE RESTRICT ON UPDATE CASCADE,
    FOREIGN KEY ("entryId") REFERENCES "StudentAssessmentEntry" ("id") ON DELETE CASCADE ON UPDATE CASCADE
);

-- CreateTable
CREATE TABLE "AttendanceRecord" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "sessionId" TEXT NOT NULL,
    "studentId" TEXT NOT NULL,
    "enrolmentId" TEXT NOT NULL,
    "status" TEXT NOT NULL DEFAULT 'PRESENT',
    "remarks" TEXT,
    "markedAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "amendedById" TEXT,
    "amendedAt" DATETIME,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" DATETIME NOT NULL,
    FOREIGN KEY ("amendedById") REFERENCES "UserAccount" ("id") ON DELETE SET NULL ON UPDATE CASCADE,
    FOREIGN KEY ("enrolmentId") REFERENCES "Enrolment" ("id") ON DELETE RESTRICT ON UPDATE CASCADE,
    FOREIGN KEY ("studentId") REFERENCES "Student" ("id") ON DELETE RESTRICT ON UPDATE CASCADE,
    FOREIGN KEY ("sessionId") REFERENCES "AttendanceSession" ("id") ON DELETE CASCADE ON UPDATE CASCADE
);

-- CreateTable
CREATE TABLE "AttendanceSession" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "timetableEntryId" TEXT,
    "semesterId" TEXT NOT NULL,
    "divisionId" TEXT,
    "subjectId" TEXT NOT NULL,
    "facultyId" TEXT NOT NULL,
    "sessionDate" DATETIME NOT NULL,
    "startTime" TEXT NOT NULL,
    "endTime" TEXT NOT NULL,
    "sessionType" TEXT NOT NULL DEFAULT 'THEORY',
    "status" TEXT NOT NULL DEFAULT 'DRAFT',
    "topicCovered" TEXT,
    "recordedById" TEXT NOT NULL,
    "finalizedAt" DATETIME,
    "amendedById" TEXT,
    "amendedAt" DATETIME,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" DATETIME NOT NULL,
    FOREIGN KEY ("amendedById") REFERENCES "UserAccount" ("id") ON DELETE SET NULL ON UPDATE CASCADE,
    FOREIGN KEY ("recordedById") REFERENCES "UserAccount" ("id") ON DELETE RESTRICT ON UPDATE CASCADE,
    FOREIGN KEY ("facultyId") REFERENCES "Staff" ("id") ON DELETE RESTRICT ON UPDATE CASCADE,
    FOREIGN KEY ("subjectId") REFERENCES "Subject" ("id") ON DELETE RESTRICT ON UPDATE CASCADE,
    FOREIGN KEY ("divisionId") REFERENCES "Division" ("id") ON DELETE SET NULL ON UPDATE CASCADE,
    FOREIGN KEY ("semesterId") REFERENCES "Semester" ("id") ON DELETE RESTRICT ON UPDATE CASCADE,
    FOREIGN KEY ("timetableEntryId") REFERENCES "TimetableEntry" ("id") ON DELETE SET NULL ON UPDATE CASCADE
);

-- CreateTable
CREATE TABLE "Department" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "code" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "hodStaffId" TEXT,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" DATETIME NOT NULL
);

-- CreateTable
CREATE TABLE "Division" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "name" TEXT NOT NULL,
    "semesterId" TEXT NOT NULL,
    "maxCapacity" INTEGER NOT NULL DEFAULT 60,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" DATETIME NOT NULL,
    FOREIGN KEY ("semesterId") REFERENCES "Semester" ("id") ON DELETE RESTRICT ON UPDATE CASCADE
);

-- CreateTable
CREATE TABLE "Enrolment" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "studentId" TEXT NOT NULL,
    "academicYearId" TEXT NOT NULL,
    "programmeId" TEXT NOT NULL,
    "semesterId" TEXT NOT NULL,
    "divisionId" TEXT NOT NULL,
    "status" TEXT NOT NULL DEFAULT 'ENROLLED',
    "enrolledAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" DATETIME NOT NULL,
    FOREIGN KEY ("divisionId") REFERENCES "Division" ("id") ON DELETE RESTRICT ON UPDATE CASCADE,
    FOREIGN KEY ("semesterId") REFERENCES "Semester" ("id") ON DELETE RESTRICT ON UPDATE CASCADE,
    FOREIGN KEY ("programmeId") REFERENCES "Programme" ("id") ON DELETE RESTRICT ON UPDATE CASCADE,
    FOREIGN KEY ("academicYearId") REFERENCES "AcademicYear" ("id") ON DELETE RESTRICT ON UPDATE CASCADE,
    FOREIGN KEY ("studentId") REFERENCES "Student" ("id") ON DELETE RESTRICT ON UPDATE CASCADE
);

-- CreateTable
CREATE TABLE "ExamResultSummary" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "examSessionId" TEXT NOT NULL,
    "studentId" TEXT NOT NULL,
    "enrolmentId" TEXT NOT NULL,
    "semesterId" TEXT NOT NULL,
    "totalMaxMarks" REAL NOT NULL,
    "totalMarksObtained" REAL,
    "percentage" REAL,
    "sgpa" REAL,
    "letterGrade" TEXT,
    "resultStatus" TEXT NOT NULL DEFAULT 'PROVISIONAL',
    "approvalStatus" TEXT NOT NULL DEFAULT 'DRAFT',
    "publishedAt" DATETIME,
    "publishedById" TEXT,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" DATETIME NOT NULL,
    FOREIGN KEY ("publishedById") REFERENCES "UserAccount" ("id") ON DELETE SET NULL ON UPDATE CASCADE,
    FOREIGN KEY ("semesterId") REFERENCES "Semester" ("id") ON DELETE RESTRICT ON UPDATE CASCADE,
    FOREIGN KEY ("enrolmentId") REFERENCES "Enrolment" ("id") ON DELETE RESTRICT ON UPDATE CASCADE,
    FOREIGN KEY ("studentId") REFERENCES "Student" ("id") ON DELETE RESTRICT ON UPDATE CASCADE,
    FOREIGN KEY ("examSessionId") REFERENCES "ExamSession" ("id") ON DELETE CASCADE ON UPDATE CASCADE
);

-- CreateTable
CREATE TABLE "ExamSession" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "academicYearId" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "sessionCode" TEXT NOT NULL,
    "sessionType" TEXT NOT NULL DEFAULT 'REGULAR',
    "startDate" DATETIME NOT NULL,
    "endDate" DATETIME NOT NULL,
    "status" TEXT NOT NULL DEFAULT 'PLANNING',
    "publishedAt" DATETIME,
    "publishedById" TEXT,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" DATETIME NOT NULL,
    FOREIGN KEY ("publishedById") REFERENCES "UserAccount" ("id") ON DELETE SET NULL ON UPDATE CASCADE,
    FOREIGN KEY ("academicYearId") REFERENCES "AcademicYear" ("id") ON DELETE RESTRICT ON UPDATE CASCADE
);

-- CreateTable
CREATE TABLE "FeeHead" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "feeStructureId" TEXT NOT NULL,
    "headName" TEXT NOT NULL,
    "amount" REAL NOT NULL,
    "isOptional" BOOLEAN NOT NULL DEFAULT false,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" DATETIME NOT NULL,
    FOREIGN KEY ("feeStructureId") REFERENCES "FeeStructure" ("id") ON DELETE CASCADE ON UPDATE CASCADE
);

-- CreateTable
CREATE TABLE "FeeReceipt" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "receiptNumber" TEXT NOT NULL,
    "invoiceId" TEXT NOT NULL,
    "studentId" TEXT NOT NULL,
    "amountPaid" REAL NOT NULL,
    "paymentDate" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "paymentMethod" TEXT NOT NULL,
    "transactionReference" TEXT NOT NULL,
    "payerName" TEXT,
    "remarks" TEXT,
    "collectedById" TEXT NOT NULL,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" DATETIME NOT NULL,
    FOREIGN KEY ("collectedById") REFERENCES "UserAccount" ("id") ON DELETE RESTRICT ON UPDATE CASCADE,
    FOREIGN KEY ("studentId") REFERENCES "Student" ("id") ON DELETE RESTRICT ON UPDATE CASCADE,
    FOREIGN KEY ("invoiceId") REFERENCES "StudentFeeInvoice" ("id") ON DELETE RESTRICT ON UPDATE CASCADE
);

-- CreateTable
CREATE TABLE "FeeStructure" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "academicYearId" TEXT NOT NULL,
    "programmeId" TEXT NOT NULL,
    "semesterNumber" INTEGER NOT NULL,
    "name" TEXT NOT NULL,
    "totalAmount" REAL NOT NULL,
    "isActive" BOOLEAN NOT NULL DEFAULT true,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" DATETIME NOT NULL,
    FOREIGN KEY ("programmeId") REFERENCES "Programme" ("id") ON DELETE RESTRICT ON UPDATE CASCADE,
    FOREIGN KEY ("academicYearId") REFERENCES "AcademicYear" ("id") ON DELETE RESTRICT ON UPDATE CASCADE
);

-- CreateTable
CREATE TABLE "Programme" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "code" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "degreeLevel" TEXT NOT NULL,
    "durationYears" INTEGER NOT NULL DEFAULT 3,
    "departmentId" TEXT NOT NULL,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" DATETIME NOT NULL,
    FOREIGN KEY ("departmentId") REFERENCES "Department" ("id") ON DELETE RESTRICT ON UPDATE CASCADE
);

-- CreateTable
CREATE TABLE "Semester" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "programmeId" TEXT NOT NULL,
    "semesterNumber" INTEGER NOT NULL,
    "termType" TEXT NOT NULL,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" DATETIME NOT NULL,
    FOREIGN KEY ("programmeId") REFERENCES "Programme" ("id") ON DELETE CASCADE ON UPDATE CASCADE
);

-- CreateTable
CREATE TABLE "Session" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "tokenHash" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "expiresAt" DATETIME NOT NULL,
    "revokedAt" DATETIME,
    "ipAddress" TEXT,
    "userAgent" TEXT,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" DATETIME NOT NULL,
    FOREIGN KEY ("userId") REFERENCES "UserAccount" ("id") ON DELETE CASCADE ON UPDATE CASCADE
);

-- CreateTable
CREATE TABLE "Staff" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "employeeId" TEXT NOT NULL,
    "fullName" TEXT NOT NULL,
    "email" TEXT NOT NULL,
    "phone" TEXT NOT NULL,
    "designation" TEXT NOT NULL,
    "category" TEXT NOT NULL,
    "departmentId" TEXT NOT NULL,
    "dateOfJoining" DATETIME NOT NULL,
    "status" TEXT NOT NULL DEFAULT 'ACTIVE',
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" DATETIME NOT NULL,
    "qualification" TEXT,
    "specialization" TEXT,
    "officeLocation" TEXT,
    "workloadHours" INTEGER,
    "employmentType" TEXT,
    FOREIGN KEY ("departmentId") REFERENCES "Department" ("id") ON DELETE RESTRICT ON UPDATE CASCADE
);

-- CreateTable
CREATE TABLE "Student" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "rollNumber" TEXT NOT NULL,
    "prn" TEXT NOT NULL,
    "fullName" TEXT NOT NULL,
    "email" TEXT NOT NULL,
    "phone" TEXT NOT NULL,
    "dob" DATETIME NOT NULL,
    "gender" TEXT,
    "bloodGroup" TEXT,
    "status" TEXT NOT NULL DEFAULT 'ACTIVE',
    "currentSemester" INTEGER NOT NULL DEFAULT 1,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" DATETIME NOT NULL,
    "guardianName" TEXT,
    "guardianRelationship" TEXT,
    "guardianPhone" TEXT,
    "attendanceRate" REAL,
    "mentorFaculty" TEXT
);

-- CreateTable
CREATE TABLE "StudentAssessmentEntry" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "componentId" TEXT NOT NULL,
    "studentId" TEXT NOT NULL,
    "enrolmentId" TEXT NOT NULL,
    "marksObtained" REAL,
    "entryStatus" TEXT NOT NULL DEFAULT 'PENDING',
    "isPassed" BOOLEAN,
    "remarks" TEXT,
    "enteredById" TEXT NOT NULL,
    "enteredAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "moderatedMarks" REAL,
    "moderatedById" TEXT,
    "moderatedAt" DATETIME,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" DATETIME NOT NULL,
    FOREIGN KEY ("moderatedById") REFERENCES "UserAccount" ("id") ON DELETE SET NULL ON UPDATE CASCADE,
    FOREIGN KEY ("enteredById") REFERENCES "UserAccount" ("id") ON DELETE RESTRICT ON UPDATE CASCADE,
    FOREIGN KEY ("enrolmentId") REFERENCES "Enrolment" ("id") ON DELETE RESTRICT ON UPDATE CASCADE,
    FOREIGN KEY ("studentId") REFERENCES "Student" ("id") ON DELETE RESTRICT ON UPDATE CASCADE,
    FOREIGN KEY ("componentId") REFERENCES "AssessmentComponent" ("id") ON DELETE CASCADE ON UPDATE CASCADE
);

-- CreateTable
CREATE TABLE "StudentFeeInvoice" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "invoiceNumber" TEXT NOT NULL,
    "studentId" TEXT NOT NULL,
    "enrolmentId" TEXT NOT NULL,
    "feeStructureId" TEXT NOT NULL,
    "totalDemand" REAL NOT NULL,
    "dueDate" DATETIME NOT NULL,
    "status" TEXT NOT NULL DEFAULT 'PENDING',
    "remarks" TEXT,
    "generatedById" TEXT,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" DATETIME NOT NULL,
    FOREIGN KEY ("generatedById") REFERENCES "UserAccount" ("id") ON DELETE SET NULL ON UPDATE CASCADE,
    FOREIGN KEY ("feeStructureId") REFERENCES "FeeStructure" ("id") ON DELETE RESTRICT ON UPDATE CASCADE,
    FOREIGN KEY ("enrolmentId") REFERENCES "Enrolment" ("id") ON DELETE RESTRICT ON UPDATE CASCADE,
    FOREIGN KEY ("studentId") REFERENCES "Student" ("id") ON DELETE RESTRICT ON UPDATE CASCADE
);

-- CreateTable
CREATE TABLE "Subject" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "code" TEXT NOT NULL,
    "title" TEXT NOT NULL,
    "credits" REAL NOT NULL DEFAULT 4.0,
    "subjectType" TEXT NOT NULL DEFAULT 'THEORY',
    "semesterId" TEXT NOT NULL,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" DATETIME NOT NULL,
    FOREIGN KEY ("semesterId") REFERENCES "Semester" ("id") ON DELETE RESTRICT ON UPDATE CASCADE
);

-- CreateTable
CREATE TABLE "SubjectResultEntry" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "resultSummaryId" TEXT NOT NULL,
    "subjectId" TEXT NOT NULL,
    "totalMaxMarks" REAL NOT NULL,
    "totalMarksObtained" REAL,
    "credits" REAL NOT NULL,
    "gradePoint" REAL,
    "letterGrade" TEXT,
    "status" TEXT NOT NULL DEFAULT 'PENDING',
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" DATETIME NOT NULL,
    FOREIGN KEY ("subjectId") REFERENCES "Subject" ("id") ON DELETE RESTRICT ON UPDATE CASCADE,
    FOREIGN KEY ("resultSummaryId") REFERENCES "ExamResultSummary" ("id") ON DELETE CASCADE ON UPDATE CASCADE
);

-- CreateTable
CREATE TABLE "TeachingAssignment" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "staffId" TEXT NOT NULL,
    "subjectId" TEXT NOT NULL,
    "divisionId" TEXT,
    "weeklyHours" INTEGER NOT NULL DEFAULT 4,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" DATETIME NOT NULL,
    FOREIGN KEY ("divisionId") REFERENCES "Division" ("id") ON DELETE SET NULL ON UPDATE CASCADE,
    FOREIGN KEY ("subjectId") REFERENCES "Subject" ("id") ON DELETE RESTRICT ON UPDATE CASCADE,
    FOREIGN KEY ("staffId") REFERENCES "Staff" ("id") ON DELETE RESTRICT ON UPDATE CASCADE
);

-- CreateTable
CREATE TABLE "TimetableEntry" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "semesterId" TEXT NOT NULL,
    "divisionId" TEXT,
    "subjectId" TEXT NOT NULL,
    "teachingAssignmentId" TEXT NOT NULL,
    "dayOfWeek" TEXT NOT NULL,
    "startTime" TEXT NOT NULL,
    "endTime" TEXT NOT NULL,
    "room" TEXT,
    "sessionType" TEXT NOT NULL DEFAULT 'THEORY',
    "status" TEXT NOT NULL DEFAULT 'ACTIVE',
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" DATETIME NOT NULL,
    FOREIGN KEY ("teachingAssignmentId") REFERENCES "TeachingAssignment" ("id") ON DELETE RESTRICT ON UPDATE CASCADE,
    FOREIGN KEY ("subjectId") REFERENCES "Subject" ("id") ON DELETE RESTRICT ON UPDATE CASCADE,
    FOREIGN KEY ("divisionId") REFERENCES "Division" ("id") ON DELETE SET NULL ON UPDATE CASCADE,
    FOREIGN KEY ("semesterId") REFERENCES "Semester" ("id") ON DELETE RESTRICT ON UPDATE CASCADE
);

-- CreateTable
CREATE TABLE "UserAccount" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "email" TEXT NOT NULL,
    "passwordHash" TEXT NOT NULL,
    "salt" TEXT NOT NULL,
    "fullName" TEXT NOT NULL,
    "role" TEXT NOT NULL DEFAULT 'STUDENT_VIEWER',
    "isActive" BOOLEAN NOT NULL DEFAULT true,
    "staffId" TEXT,
    "studentId" TEXT,
    "lastLoginAt" DATETIME,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" DATETIME NOT NULL,
    FOREIGN KEY ("studentId") REFERENCES "Student" ("id") ON DELETE SET NULL ON UPDATE CASCADE,
    FOREIGN KEY ("staffId") REFERENCES "Staff" ("id") ON DELETE SET NULL ON UPDATE CASCADE
);

-- CreateIndex
CREATE INDEX "AcademicTerm_academicYearId_idx" ON "AcademicTerm"("academicYearId" ASC);

-- CreateIndex
CREATE UNIQUE INDEX "AcademicYear_code_key" ON "AcademicYear"("code" ASC);

-- CreateIndex
CREATE UNIQUE INDEX "AssessmentComponent_examSessionId_subjectId_componentType_key" ON "AssessmentComponent"("examSessionId" ASC, "subjectId" ASC, "componentType" ASC);

-- CreateIndex
CREATE INDEX "AssessmentComponent_subjectId_idx" ON "AssessmentComponent"("subjectId" ASC);

-- CreateIndex
CREATE INDEX "AssessmentComponent_examSessionId_idx" ON "AssessmentComponent"("examSessionId" ASC);

-- CreateIndex
CREATE INDEX "AssessmentRevisionAudit_revisedById_idx" ON "AssessmentRevisionAudit"("revisedById" ASC);

-- CreateIndex
CREATE INDEX "AssessmentRevisionAudit_entryId_idx" ON "AssessmentRevisionAudit"("entryId" ASC);

-- CreateIndex
CREATE UNIQUE INDEX "AttendanceRecord_sessionId_studentId_key" ON "AttendanceRecord"("sessionId" ASC, "studentId" ASC);

-- CreateIndex
CREATE INDEX "AttendanceRecord_status_idx" ON "AttendanceRecord"("status" ASC);

-- CreateIndex
CREATE INDEX "AttendanceRecord_enrolmentId_idx" ON "AttendanceRecord"("enrolmentId" ASC);

-- CreateIndex
CREATE INDEX "AttendanceRecord_studentId_idx" ON "AttendanceRecord"("studentId" ASC);

-- CreateIndex
CREATE INDEX "AttendanceRecord_sessionId_idx" ON "AttendanceRecord"("sessionId" ASC);

-- CreateIndex
CREATE UNIQUE INDEX "AttendanceSession_timetableEntryId_sessionDate_key" ON "AttendanceSession"("timetableEntryId" ASC, "sessionDate" ASC);

-- CreateIndex
CREATE INDEX "AttendanceSession_status_idx" ON "AttendanceSession"("status" ASC);

-- CreateIndex
CREATE INDEX "AttendanceSession_facultyId_idx" ON "AttendanceSession"("facultyId" ASC);

-- CreateIndex
CREATE INDEX "AttendanceSession_subjectId_idx" ON "AttendanceSession"("subjectId" ASC);

-- CreateIndex
CREATE INDEX "AttendanceSession_divisionId_idx" ON "AttendanceSession"("divisionId" ASC);

-- CreateIndex
CREATE INDEX "AttendanceSession_semesterId_idx" ON "AttendanceSession"("semesterId" ASC);

-- CreateIndex
CREATE INDEX "AttendanceSession_sessionDate_idx" ON "AttendanceSession"("sessionDate" ASC);

-- CreateIndex
CREATE UNIQUE INDEX "Department_hodStaffId_key" ON "Department"("hodStaffId" ASC);

-- CreateIndex
CREATE UNIQUE INDEX "Department_code_key" ON "Department"("code" ASC);

-- CreateIndex
CREATE UNIQUE INDEX "Division_semesterId_name_key" ON "Division"("semesterId" ASC, "name" ASC);

-- CreateIndex
CREATE INDEX "Division_semesterId_idx" ON "Division"("semesterId" ASC);

-- CreateIndex
CREATE UNIQUE INDEX "Enrolment_studentId_academicYearId_semesterId_key" ON "Enrolment"("studentId" ASC, "academicYearId" ASC, "semesterId" ASC);

-- CreateIndex
CREATE INDEX "Enrolment_divisionId_idx" ON "Enrolment"("divisionId" ASC);

-- CreateIndex
CREATE INDEX "Enrolment_programmeId_idx" ON "Enrolment"("programmeId" ASC);

-- CreateIndex
CREATE INDEX "Enrolment_academicYearId_idx" ON "Enrolment"("academicYearId" ASC);

-- CreateIndex
CREATE UNIQUE INDEX "ExamResultSummary_examSessionId_studentId_semesterId_key" ON "ExamResultSummary"("examSessionId" ASC, "studentId" ASC, "semesterId" ASC);

-- CreateIndex
CREATE INDEX "ExamResultSummary_approvalStatus_idx" ON "ExamResultSummary"("approvalStatus" ASC);

-- CreateIndex
CREATE INDEX "ExamResultSummary_semesterId_idx" ON "ExamResultSummary"("semesterId" ASC);

-- CreateIndex
CREATE INDEX "ExamResultSummary_studentId_idx" ON "ExamResultSummary"("studentId" ASC);

-- CreateIndex
CREATE INDEX "ExamResultSummary_examSessionId_idx" ON "ExamResultSummary"("examSessionId" ASC);

-- CreateIndex
CREATE INDEX "ExamSession_status_idx" ON "ExamSession"("status" ASC);

-- CreateIndex
CREATE INDEX "ExamSession_academicYearId_idx" ON "ExamSession"("academicYearId" ASC);

-- CreateIndex
CREATE UNIQUE INDEX "ExamSession_sessionCode_key" ON "ExamSession"("sessionCode" ASC);

-- CreateIndex
CREATE INDEX "FeeHead_feeStructureId_idx" ON "FeeHead"("feeStructureId" ASC);

-- CreateIndex
CREATE INDEX "FeeReceipt_paymentDate_idx" ON "FeeReceipt"("paymentDate" ASC);

-- CreateIndex
CREATE INDEX "FeeReceipt_studentId_idx" ON "FeeReceipt"("studentId" ASC);

-- CreateIndex
CREATE INDEX "FeeReceipt_invoiceId_idx" ON "FeeReceipt"("invoiceId" ASC);

-- CreateIndex
CREATE UNIQUE INDEX "FeeReceipt_transactionReference_key" ON "FeeReceipt"("transactionReference" ASC);

-- CreateIndex
CREATE UNIQUE INDEX "FeeReceipt_receiptNumber_key" ON "FeeReceipt"("receiptNumber" ASC);

-- CreateIndex
CREATE UNIQUE INDEX "FeeStructure_academicYearId_programmeId_semesterNumber_key" ON "FeeStructure"("academicYearId" ASC, "programmeId" ASC, "semesterNumber" ASC);

-- CreateIndex
CREATE INDEX "FeeStructure_programmeId_idx" ON "FeeStructure"("programmeId" ASC);

-- CreateIndex
CREATE INDEX "FeeStructure_academicYearId_idx" ON "FeeStructure"("academicYearId" ASC);

-- CreateIndex
CREATE INDEX "Programme_departmentId_idx" ON "Programme"("departmentId" ASC);

-- CreateIndex
CREATE UNIQUE INDEX "Programme_code_key" ON "Programme"("code" ASC);

-- CreateIndex
CREATE UNIQUE INDEX "Semester_programmeId_semesterNumber_key" ON "Semester"("programmeId" ASC, "semesterNumber" ASC);

-- CreateIndex
CREATE INDEX "Semester_programmeId_idx" ON "Semester"("programmeId" ASC);

-- CreateIndex
CREATE INDEX "Session_userId_idx" ON "Session"("userId" ASC);

-- CreateIndex
CREATE INDEX "Session_tokenHash_idx" ON "Session"("tokenHash" ASC);

-- CreateIndex
CREATE UNIQUE INDEX "Session_tokenHash_key" ON "Session"("tokenHash" ASC);

-- CreateIndex
CREATE INDEX "Staff_category_idx" ON "Staff"("category" ASC);

-- CreateIndex
CREATE INDEX "Staff_departmentId_idx" ON "Staff"("departmentId" ASC);

-- CreateIndex
CREATE UNIQUE INDEX "Staff_email_key" ON "Staff"("email" ASC);

-- CreateIndex
CREATE UNIQUE INDEX "Staff_employeeId_key" ON "Staff"("employeeId" ASC);

-- CreateIndex
CREATE INDEX "Student_status_idx" ON "Student"("status" ASC);

-- CreateIndex
CREATE UNIQUE INDEX "Student_email_key" ON "Student"("email" ASC);

-- CreateIndex
CREATE UNIQUE INDEX "Student_prn_key" ON "Student"("prn" ASC);

-- CreateIndex
CREATE UNIQUE INDEX "Student_rollNumber_key" ON "Student"("rollNumber" ASC);

-- CreateIndex
CREATE UNIQUE INDEX "StudentAssessmentEntry_componentId_studentId_key" ON "StudentAssessmentEntry"("componentId" ASC, "studentId" ASC);

-- CreateIndex
CREATE INDEX "StudentAssessmentEntry_enrolmentId_idx" ON "StudentAssessmentEntry"("enrolmentId" ASC);

-- CreateIndex
CREATE INDEX "StudentAssessmentEntry_studentId_idx" ON "StudentAssessmentEntry"("studentId" ASC);

-- CreateIndex
CREATE INDEX "StudentAssessmentEntry_componentId_idx" ON "StudentAssessmentEntry"("componentId" ASC);

-- CreateIndex
CREATE UNIQUE INDEX "StudentFeeInvoice_studentId_feeStructureId_key" ON "StudentFeeInvoice"("studentId" ASC, "feeStructureId" ASC);

-- CreateIndex
CREATE INDEX "StudentFeeInvoice_status_idx" ON "StudentFeeInvoice"("status" ASC);

-- CreateIndex
CREATE INDEX "StudentFeeInvoice_feeStructureId_idx" ON "StudentFeeInvoice"("feeStructureId" ASC);

-- CreateIndex
CREATE INDEX "StudentFeeInvoice_enrolmentId_idx" ON "StudentFeeInvoice"("enrolmentId" ASC);

-- CreateIndex
CREATE INDEX "StudentFeeInvoice_studentId_idx" ON "StudentFeeInvoice"("studentId" ASC);

-- CreateIndex
CREATE UNIQUE INDEX "StudentFeeInvoice_invoiceNumber_key" ON "StudentFeeInvoice"("invoiceNumber" ASC);

-- CreateIndex
CREATE INDEX "Subject_semesterId_idx" ON "Subject"("semesterId" ASC);

-- CreateIndex
CREATE UNIQUE INDEX "Subject_code_key" ON "Subject"("code" ASC);

-- CreateIndex
CREATE UNIQUE INDEX "SubjectResultEntry_resultSummaryId_subjectId_key" ON "SubjectResultEntry"("resultSummaryId" ASC, "subjectId" ASC);

-- CreateIndex
CREATE INDEX "SubjectResultEntry_subjectId_idx" ON "SubjectResultEntry"("subjectId" ASC);

-- CreateIndex
CREATE INDEX "SubjectResultEntry_resultSummaryId_idx" ON "SubjectResultEntry"("resultSummaryId" ASC);

-- CreateIndex
CREATE UNIQUE INDEX "TeachingAssignment_staffId_subjectId_divisionId_key" ON "TeachingAssignment"("staffId" ASC, "subjectId" ASC, "divisionId" ASC);

-- CreateIndex
CREATE INDEX "TeachingAssignment_subjectId_idx" ON "TeachingAssignment"("subjectId" ASC);

-- CreateIndex
CREATE INDEX "TeachingAssignment_staffId_idx" ON "TeachingAssignment"("staffId" ASC);

-- CreateIndex
CREATE INDEX "TimetableEntry_dayOfWeek_idx" ON "TimetableEntry"("dayOfWeek" ASC);

-- CreateIndex
CREATE INDEX "TimetableEntry_teachingAssignmentId_idx" ON "TimetableEntry"("teachingAssignmentId" ASC);

-- CreateIndex
CREATE INDEX "TimetableEntry_subjectId_idx" ON "TimetableEntry"("subjectId" ASC);

-- CreateIndex
CREATE INDEX "TimetableEntry_divisionId_idx" ON "TimetableEntry"("divisionId" ASC);

-- CreateIndex
CREATE INDEX "TimetableEntry_semesterId_idx" ON "TimetableEntry"("semesterId" ASC);

-- CreateIndex
CREATE INDEX "UserAccount_role_idx" ON "UserAccount"("role" ASC);

-- CreateIndex
CREATE UNIQUE INDEX "UserAccount_studentId_key" ON "UserAccount"("studentId" ASC);

-- CreateIndex
CREATE UNIQUE INDEX "UserAccount_staffId_key" ON "UserAccount"("staffId" ASC);

-- CreateIndex
CREATE UNIQUE INDEX "UserAccount_email_key" ON "UserAccount"("email" ASC);
