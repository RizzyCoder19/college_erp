with open('prisma/schema.prisma', 'r', encoding='utf-8') as f:
    content = f.read()

# Add examSessions to AcademicYear
if 'examSessions ExamSession[]' not in content:
    content = content.replace(
        '  terms      AcademicTerm[]\n  enrolments Enrolment[]',
        '  terms      AcademicTerm[]\n  enrolments Enrolment[]\n  examSessions ExamSession[]'
    )

# Add examResultSummaries to Semester
if 'examResultSummaries ExamResultSummary[]' not in content:
    content = content.replace(
        '  attendanceSessions AttendanceSession[]\n  createdAt          DateTime            @default(now())',
        '  attendanceSessions AttendanceSession[]\n  examResultSummaries ExamResultSummary[]\n  createdAt          DateTime            @default(now())'
    )

# Add assessmentComponents and subjectResults to Subject
if 'assessmentComponents AssessmentComponent[]' not in content:
    content = content.replace(
        '  teachingAssignments TeachingAssignment[]\n  createdAt           DateTime             @default(now())',
        '  teachingAssignments TeachingAssignment[]\n  assessmentComponents AssessmentComponent[]\n  subjectResults      SubjectResultEntry[]\n  createdAt           DateTime             @default(now())'
    )

# Add studentAssessmentEntries and examResultSummaries to Student
if 'studentAssessmentEntries StudentAssessmentEntry[]' not in content:
    content = content.replace(
        '  attendanceRecords    AttendanceRecord[]\n  userAccount          UserAccount?',
        '  attendanceRecords    AttendanceRecord[]\n  studentAssessmentEntries StudentAssessmentEntry[]\n  examResultSummaries  ExamResultSummary[]\n  userAccount          UserAccount?'
    )

# Add studentAssessmentEntries and examResultSummaries to Enrolment
if 'studentAssessmentEntries StudentAssessmentEntry[]' not in content:
    content = content.replace(
        '  AttendanceRecord AttendanceRecord[]\n\n  @@unique([studentId, academicYearId, semesterId])',
        '  AttendanceRecord AttendanceRecord[]\n  studentAssessmentEntries StudentAssessmentEntry[]\n  examResultSummaries  ExamResultSummary[]\n\n  @@unique([studentId, academicYearId, semesterId])'
    )

# Add exam relations to UserAccount
if 'publishedExamSessions' not in content:
    content = content.replace(
        '  amendedAttendanceRecords   AttendanceRecord[]  @relation("RecordAmendedBy")\n  createdAt                  DateTime            @default(now())',
        '  amendedAttendanceRecords   AttendanceRecord[]  @relation("RecordAmendedBy")\n  publishedExamSessions      ExamSession[]       @relation("SessionPublishedBy")\n  enteredAssessmentMarks     StudentAssessmentEntry[] @relation("MarksEnteredBy")\n  moderatedAssessmentMarks   StudentAssessmentEntry[] @relation("MarksModeratedBy")\n  publishedExamResults       ExamResultSummary[] @relation("ResultPublishedBy")\n  assessmentRevisionAudits   AssessmentRevisionAudit[]\n  createdAt                  DateTime            @default(now())'
    )

# Append new models
if 'model ExamSession {' not in content:
    new_models = \"\"\"
// -------------------------------------------------------------
// 6. Examination & Results Models (Milestone 5)
// -------------------------------------------------------------

model ExamSession {
  id                   String                @id @default(uuid())
  academicYearId       String
  academicYear         AcademicYear          @relation(fields: [academicYearId], references: [id], onDelete: Restrict)
  name                 String
  sessionCode          String                @unique
  sessionType          String                @default("REGULAR") // REGULAR, ATKT_SUPPLEMENTARY, REVALUATION
  startDate            DateTime
  endDate              DateTime
  status               String                @default("PLANNING") // PLANNING, ACTIVE, EVALUATION, MODERATION, APPROVED, PUBLISHED, ARCHIVED
  publishedAt          DateTime?
  publishedById        String?
  publishedBy          UserAccount?          @relation("SessionPublishedBy", fields: [publishedById], references: [id], onDelete: SetNull)
  assessmentComponents AssessmentComponent[]
  examResultSummaries  ExamResultSummary[]
  createdAt            DateTime              @default(now())
  updatedAt            DateTime              @updatedAt

  @@index([academicYearId])
  @@index([status])
}

model AssessmentComponent {
  id                  String                   @id @default(uuid())
  examSessionId       String
  examSession         ExamSession              @relation(fields: [examSessionId], references: [id], onDelete: Cascade)
  subjectId           String
  subject             Subject                  @relation(fields: [subjectId], references: [id], onDelete: Restrict)
  name                String
  componentType       String // THEORY_SEE, INTERNAL_IA, PRACTICAL_SEE, VIVA_VOCE
  maxMarks            Float
  minPassingMarks     Float?
  weightagePercentage Float?
  studentEntries      StudentAssessmentEntry[]
  createdAt           DateTime                 @default(now())
  updatedAt           DateTime                 @updatedAt

  @@unique([examSessionId, subjectId, componentType])
  @@index([examSessionId])
  @@index([subjectId])
}

model StudentAssessmentEntry {
  id             String                    @id @default(uuid())
  componentId    String
  component      AssessmentComponent       @relation(fields: [componentId], references: [id], onDelete: Cascade)
  studentId      String
  student        Student                   @relation(fields: [studentId], references: [id], onDelete: Restrict)
  enrolmentId    String
  enrolment      Enrolment                 @relation(fields: [enrolmentId], references: [id], onDelete: Restrict)
  marksObtained  Float?
  entryStatus    String                    @default("PENDING") // PENDING, ENTERED, ABSENT, EXEMPT, WITHHELD, MEDICAL_LEAVE
  isPassed       Boolean?
  remarks        String?
  enteredById    String
  enteredBy      UserAccount               @relation("MarksEnteredBy", fields: [enteredById], references: [id], onDelete: Restrict)
  enteredAt      DateTime                  @default(now())
  moderatedMarks Float?
  moderatedById  String?
  moderatedBy    UserAccount?              @relation("MarksModeratedBy", fields: [moderatedById], references: [id], onDelete: SetNull)
  moderatedAt    DateTime?
  revisionAudits AssessmentRevisionAudit[]
  createdAt      DateTime                  @default(now())
  updatedAt      DateTime                  @updatedAt

  @@unique([componentId, studentId])
  @@index([componentId])
  @@index([studentId])
  @@index([enrolmentId])
}

model ExamResultSummary {
  id                 String               @id @default(uuid())
  examSessionId      String
  examSession        ExamSession          @relation(fields: [examSessionId], references: [id], onDelete: Cascade)
  studentId          String
  student            Student              @relation(fields: [studentId], references: [id], onDelete: Restrict)
  enrolmentId        String
  enrolment          Enrolment            @relation(fields: [enrolmentId], references: [id], onDelete: Restrict)
  semesterId         String
  semester           Semester             @relation(fields: [semesterId], references: [id], onDelete: Restrict)
  totalMaxMarks      Float
  totalMarksObtained Float?
  percentage         Float?
  sgpa               Float?
  letterGrade        String?
  resultStatus       String               @default("PROVISIONAL") // PROVISIONAL, PASSED, ATKT, FAILED, WITHHELD, INCOMPLETE
  approvalStatus     String               @default("DRAFT") // DRAFT, UNDER_REVIEW, APPROVED, PUBLISHED
  publishedAt        DateTime?
  publishedById      String?
  publishedBy        UserAccount?         @relation("ResultPublishedBy", fields: [publishedById], references: [id], onDelete: SetNull)
  subjectResults     SubjectResultEntry[]
  createdAt          DateTime             @default(now())
  updatedAt          DateTime             @updatedAt

  @@unique([examSessionId, studentId, semesterId])
  @@index([examSessionId])
  @@index([studentId])
  @@index([semesterId])
  @@index([approvalStatus])
}

model SubjectResultEntry {
  id                 String            @id @default(uuid())
  resultSummaryId    String
  resultSummary      ExamResultSummary @relation(fields: [resultSummaryId], references: [id], onDelete: Cascade)
  subjectId          String
  subject            Subject           @relation(fields: [subjectId], references: [id], onDelete: Restrict)
  totalMaxMarks      Float
  totalMarksObtained Float?
  credits            Float
  gradePoint         Float?
  letterGrade        String?
  status             String            @default("PENDING") // PENDING, PASS, FAIL, ABSENT, WITHHELD
  createdAt          DateTime          @default(now())
  updatedAt          DateTime          @updatedAt

  @@unique([resultSummaryId, subjectId])
  @@index([resultSummaryId])
  @@index([subjectId])
}

model AssessmentRevisionAudit {
  id             String                 @id @default(uuid())
  entryId        String
  entry          StudentAssessmentEntry @relation(fields: [entryId], references: [id], onDelete: Cascade)
  previousScore  Float?
  newScore       Float?
  previousStatus String
  newStatus      String
  reason         String
  revisedById    String
  revisedBy      UserAccount            @relation(fields: [revisedById], references: [id], onDelete: Restrict)
  revisedAt      DateTime               @default(now())

  @@index([entryId])
  @@index([revisedById])
}
\"\"\"
    content = content.rstrip() + "\n" + new_models

with open('prisma/schema.prisma', 'w', encoding='utf-8') as f:
    f.write(content)

print('Schema patched successfully')
