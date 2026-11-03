"use server";

import prisma from "@/lib/db";
import { StudentDocument } from "@prisma/client";
import { getCurrentUser } from "@/lib/auth/guards";
import { StudentRepository, StudentDocumentsSummary } from "@/lib/dal/studentRepository";
import { AcademicRepository, SubjectWithRelations } from "@/lib/dal/academicRepository";
import { TimetableRepository } from "@/lib/dal/timetableRepository";
import { AttendanceRepository } from "@/lib/dal/attendanceRepository";
import { FeeRepository } from "@/lib/dal/feeRepository";
import { isValidDocumentCategory, DocumentCategory } from "@/lib/storage/validation";
import { getStorageStatus } from "@/lib/storage";
import { Result } from "@/lib/dal/types";

export interface StudentSelfProfileData {
  student: {
    id: string;
    rollNumber: string;
    prn: string;
    fullName: string;
    email: string;
    phone: string;
    dob: Date;
    gender: string | null;
    bloodGroup: string | null;
    status: string;
    currentSemester: number;
    mentorFaculty: string | null;
    createdAt: Date;
    updatedAt: Date;
  };
  activePlacement: {
    programmeId: string;
    programmeCode: string;
    programmeName: string;
    semesterId: string;
    semesterNumber: number;
    divisionId: string;
    divisionName: string;
    academicYearId: string;
    academicYearCode: string;
    academicYearName: string;
    status: string;
  } | null;
  documentsSummary: {
    totalCount: number;
    verifiedCount: number;
    pendingCount: number;
    rejectedCount: number;
  };
}

export interface StudentSelfCurriculumData {
  activeSubjects: Array<{
    id: string;
    code: string;
    title: string;
    credits: number;
    subjectType: string;
    semesterNumber: number;
  }>;
  enrolments: Array<{
    id: string;
    status: string;
    enrolledAt: Date;
    programme: {
      code: string;
      name: string;
    };
    semester: {
      semesterNumber: number;
    };
    division: {
      name: string;
    };
    academicYear: {
      code: string;
      name: string;
      isCurrent: boolean;
    };
  }>;
}

export interface StudentSelfTimetableData {
  placement: {
    programmeName: string;
    programmeCode: string;
    semesterNumber: number;
    divisionName: string;
    academicYearName: string;
  };
  entries: Array<{
    id: string;
    dayOfWeek: string;
    startTime: string;
    endTime: string;
    room: string | null;
    sessionType: string;
    status: string;
    subject: {
      code: string;
      title: string;
      credits: number;
      subjectType: string;
    };
    staffName: string;
  }>;
}

export interface StudentSelfAttendanceData {
  summary: {
    totalConductedSessions: number;
    totalRecords: number;
    presentCount: number;
    lateCount: number;
    absentCount: number;
    excusedCount: number;
    totalRecordedOpportunities: number;
    subjectBreakdown: Array<{
      subjectId: string;
      subjectCode: string;
      subjectTitle: string;
      conductedSessions: number;
      presentCount: number;
      lateCount: number;
      absentCount: number;
      excusedCount: number;
    }>;
  };
  records: Array<{
    id: string;
    sessionDate: Date;
    startTime: string;
    endTime: string;
    sessionType: string;
    topicCovered: string | null;
    subjectCode: string;
    subjectTitle: string;
    facultyName: string;
    status: string;
    remarks: string | null;
  }>;
}

export interface StudentSelfExamResultsData {
  results: Array<{
    id: string;
    examSession: {
      id: string;
      name: string;
      sessionCode: string;
      sessionType: string;
      startDate: Date;
      endDate: Date;
    };
    semester: {
      semesterNumber: number;
      programmeName: string;
      programmeCode: string;
    };
    totalMaxMarks: number;
    totalMarksObtained: number | null;
    percentage: number | null;
    sgpa: number | null;
    letterGrade: string | null;
    resultStatus: string;
    approvalStatus: string;
    publishedAt: Date | null;
    subjectResults: Array<{
      id: string;
      subjectCode: string;
      subjectTitle: string;
      subjectType: string;
      credits: number;
      totalMaxMarks: number;
      totalMarksObtained: number | null;
      gradePoint: number | null;
      letterGrade: string | null;
      status: string;
    }>;
  }>;
}

export interface StudentSelfFeeLedgerData {
  summary: {
    totalDemand: number;
    totalPaid: number;
    outstandingBalance: number;
    overpaymentCredit: number;
    feeClearanceStatus: "CLEARED" | "PARTIALLY_CLEARED" | "PENDING_DUES" | "NOT_INVOICED";
  };
  invoices: Array<{
    id: string;
    invoiceNumber: string;
    structureName: string;
    totalDemand: number;
    totalPaid: number;
    outstandingBalance: number;
    status: string;
    dueDate: Date;
    createdAt: Date;
    feeHeads: Array<{ headName: string; amount: number }>;
    receipts: Array<{
      id: string;
      receiptNumber: string;
      amountPaid: number;
      paymentDate: Date;
      paymentMethod: string;
      transactionReference: string;
      payerName: string | null;
      remarks: string | null;
      collectedByName: string;
    }>;
  }>;
}

/**
 * Validates the authenticated session and confirms active student identity.
 * Strictly derives the studentId from the server session; rejects unlinked accounts.
 */
async function requireStudentSession(): Promise<Result<{ studentId: string; userId: string; fullName: string }>> {
  const user = await getCurrentUser();
  if (!user) {
    return {
      success: false,
      error: "Authentication required. Please sign in to access student self-service.",
      code: "UNAUTHORIZED",
    };
  }

  // Strictly STUDENT_VIEWER accounts may access student self-service facilities
  if (user.role !== "STUDENT_VIEWER") {
    return {
      success: false,
      error: "Access denied. Only authenticated student accounts may access this portal.",
      code: "FORBIDDEN",
    };
  }

  if (!user.studentId) {
    return {
      success: false,
      error: "Your user account is not currently linked to an active student dossier. Please contact the Registrar Office or Academic Administration.",
      code: "UNLINKED_STUDENT",
    };
  }

  return {
    success: true,
    data: {
      studentId: user.studentId,
      userId: user.id,
      fullName: user.fullName,
    },
  };
}

/**
 * Server Action: Retrieve the authenticated student's profile and active placement.
 * Accepts ZERO student ID parameters from client; derives identity strictly from session.
 */
export async function getStudentSelfProfile(): Promise<Result<StudentSelfProfileData>> {
  const sessionRes = await requireStudentSession();
  if (!sessionRes.success || !sessionRes.data) {
    return sessionRes as Result<never>;
  }

  const { studentId } = sessionRes.data;

  // Retrieve comprehensive dossier and document counts in parallel
  const [dossierRes, docsRes] = await Promise.all([
    StudentRepository.getStudentDossier360(studentId),
    StudentRepository.getStudentDocuments(studentId),
  ]);

  if (!dossierRes.success || !dossierRes.data) {
    return {
      success: false,
      error: dossierRes.error || "Unable to retrieve student profile.",
      code: dossierRes.code || "PROFILE_NOT_FOUND",
    };
  }

  const docsSummary = docsRes.success && docsRes.data
    ? {
        totalCount: docsRes.data.totalCount,
        verifiedCount: docsRes.data.verifiedCount,
        pendingCount: docsRes.data.pendingCount,
        rejectedCount: docsRes.data.rejectedCount,
      }
    : {
        totalCount: 0,
        verifiedCount: 0,
        pendingCount: 0,
        rejectedCount: 0,
      };

  const { student, activePlacement } = dossierRes.data;

  return {
    success: true,
    data: {
      student: {
        id: student.id,
        rollNumber: student.rollNumber,
        prn: student.prn,
        fullName: student.fullName,
        email: student.email,
        phone: student.phone,
        dob: student.dob,
        gender: student.gender,
        bloodGroup: student.bloodGroup,
        status: student.status,
        currentSemester: student.currentSemester,
        mentorFaculty: student.mentorFaculty,
        createdAt: student.createdAt,
        updatedAt: student.updatedAt,
      },
      activePlacement: activePlacement
        ? {
            programmeId: activePlacement.programmeId,
            programmeCode: activePlacement.programmeCode,
            programmeName: activePlacement.programmeName,
            semesterId: activePlacement.semesterId,
            semesterNumber: activePlacement.semesterNumber,
            divisionId: activePlacement.divisionId,
            divisionName: activePlacement.divisionName,
            academicYearId: activePlacement.academicYearId,
            academicYearCode: activePlacement.academicYearCode,
            academicYearName: activePlacement.academicYearName,
            status: activePlacement.status,
          }
        : null,
      documentsSummary: docsSummary,
    },
  };
}

/**
 * Server Action: Retrieve the authenticated student's curriculum subjects and enrolment timeline.
 * Zero client ID input; derives target semester from the session student's active placement.
 */
export async function getStudentSelfCurriculum(): Promise<Result<StudentSelfCurriculumData>> {
  const sessionRes = await requireStudentSession();
  if (!sessionRes.success || !sessionRes.data) {
    return sessionRes as Result<never>;
  }

  const { studentId } = sessionRes.data;

  const dossierRes = await StudentRepository.getStudentDossier360(studentId);
  if (!dossierRes.success || !dossierRes.data) {
    return {
      success: false,
      error: dossierRes.error || "Unable to retrieve enrolment curriculum records.",
      code: dossierRes.code || "DOSSIER_NOT_FOUND",
    };
  }

  const { activePlacement, enrolments } = dossierRes.data;

  let activeSubjects: StudentSelfCurriculumData["activeSubjects"] = [];

  if (activePlacement?.semesterId) {
    const subjectsRes = await AcademicRepository.getSubjects(activePlacement.semesterId);
    if (subjectsRes.success && subjectsRes.data) {
      activeSubjects = subjectsRes.data.map((sub: SubjectWithRelations) => ({
        id: sub.id,
        code: sub.code,
        title: sub.title,
        credits: sub.credits,
        subjectType: sub.subjectType,
        semesterNumber: sub.semester ? sub.semester.semesterNumber : activePlacement.semesterNumber,
      }));
    }
  }

  const formattedEnrolments = enrolments.map((enr) => ({
    id: enr.id,
    status: enr.status,
    enrolledAt: enr.enrolledAt,
    programme: {
      code: enr.programme.code,
      name: enr.programme.name,
    },
    semester: {
      semesterNumber: enr.semester.semesterNumber,
    },
    division: {
      name: enr.division.name,
    },
    academicYear: {
      code: enr.academicYear.code,
      name: enr.academicYear.name,
      isCurrent: enr.academicYear.isCurrent,
    },
  }));

  return {
    success: true,
    data: {
      activeSubjects,
      enrolments: formattedEnrolments,
    },
  };
}

/**
 * Server Action: Retrieve all submitted compliance documents for the authenticated student.
 * Zero client ID input; derives student ID strictly from server session.
 */
export async function getStudentSelfDocuments(): Promise<Result<StudentDocumentsSummary>> {
  const sessionRes = await requireStudentSession();
  if (!sessionRes.success || !sessionRes.data) {
    return sessionRes as Result<never>;
  }

  return StudentRepository.getStudentDocuments(sessionRes.data.studentId);
}

/**
 * Server Action: Upload a new compliance document on behalf of the authenticated student.
 * Client cannot supply or override studentId; target record is locked to session identity.
 */
export async function uploadStudentSelfDocumentAction(formData: FormData): Promise<Result<StudentDocument>> {
  const sessionRes = await requireStudentSession();
  if (!sessionRes.success || !sessionRes.data) {
    return sessionRes as Result<never>;
  }

  const { studentId, userId } = sessionRes.data;

  const categoryRaw = formData.get("category");
  const file = formData.get("file");

  if (typeof categoryRaw !== "string" || !isValidDocumentCategory(categoryRaw)) {
    return {
      success: false,
      error: `Invalid or unapproved document category: ${String(categoryRaw)}`,
      code: "INVALID_CATEGORY",
    };
  }

  const category = categoryRaw as DocumentCategory;

  if (!file || !(file instanceof File)) {
    return {
      success: false,
      error: "A valid document file is required.",
      code: "VALIDATION_FAILED",
    };
  }

  try {
    const arrayBuffer = await file.arrayBuffer();
    const buffer = Buffer.from(arrayBuffer);

    return await StudentRepository.uploadStudentDocument({
      studentId,
      category,
      buffer,
      originalFileName: file.name,
      reportedMimeType: file.type,
      uploadedByUserId: userId,
    });
  } catch (err) {
    return {
      success: false,
      error: `Failed to upload document: ${err instanceof Error ? err.message : String(err)}`,
      code: "UPLOAD_FAILED",
    };
  }
}

/**
 * Server Action: Replace an existing document with a new revision for the authenticated student.
 * Verifies document belongs to authenticated student before proceeding.
 * Preserves verification history: marks existing doc as SUPERSEDED, creates v(N+1).
 */
export async function replaceStudentSelfDocumentAction(
  formData: FormData
): Promise<Result<StudentDocument>> {
  const sessionRes = await requireStudentSession();
  if (!sessionRes.success || !sessionRes.data) {
    return sessionRes as Result<never>;
  }

  const { studentId, userId } = sessionRes.data;

  const documentId = formData.get("documentId");
  const file = formData.get("file");

  if (typeof documentId !== "string" || !documentId.trim()) {
    return {
      success: false,
      error: "Document identifier is required for replacement.",
      code: "VALIDATION_FAILED",
    };
  }

  if (!file || !(file instanceof File)) {
    return {
      success: false,
      error: "A valid replacement file is required.",
      code: "VALIDATION_FAILED",
    };
  }

  // Lookup existing document to verify student ownership strictly
  const existingDoc = await prisma.studentDocument.findUnique({
    where: { id: documentId },
    select: { id: true, studentId: true, isArchived: true },
  });

  if (!existingDoc) {
    return {
      success: false,
      error: "The targeted document does not exist.",
      code: "NOT_FOUND",
    };
  }

  if (existingDoc.studentId !== studentId) {
    return {
      success: false,
      error: "Access denied. You may only replace documents belonging to your personal student profile.",
      code: "FORBIDDEN",
    };
  }

  if (existingDoc.isArchived) {
    return {
      success: false,
      error: "The targeted document has already been superseded or archived.",
      code: "NOT_FOUND",
    };
  }

  // Storage availability check (production persistent cloud storage safety guard)
  const storageStatus = getStorageStatus();
  if (!storageStatus.available) {
    return {
      success: false,
      error: storageStatus.message || "Document uploads are temporarily unavailable. Persistent cloud storage has not been configured for this environment.",
      code: "STORAGE_UNAVAILABLE",
    };
  }

  try {
    const arrayBuffer = await file.arrayBuffer();
    const buffer = Buffer.from(arrayBuffer);

    return await StudentRepository.replaceStudentDocument({
      documentId,
      buffer,
      originalFileName: file.name,
      reportedMimeType: file.type,
      uploadedByUserId: userId,
    });
  } catch (err) {
    return {
      success: false,
      error: `Failed to replace document: ${err instanceof Error ? err.message : String(err)}`,
      code: "REPLACE_FAILED",
    };
  }
}

/**
 * Retrieves the authenticated student's weekly class timetable.
 * Strictly derives placement (semester, division) from the student's active enrolment.
 * Rejects client-supplied IDs and prevents arbitrary placement fallbacks.
 */
export async function getStudentSelfTimetable(): Promise<Result<StudentSelfTimetableData>> {
  const sessionResult = await requireStudentSession();
  if (!sessionResult.success || !sessionResult.data) {
    return {
      success: false,
      error: sessionResult.error,
      code: sessionResult.code,
    };
  }

  const { studentId } = sessionResult.data;

  // Resolve student's active enrolment strictly
  const activeEnrolment = await prisma.enrolment.findFirst({
    where: {
      studentId,
      status: "ENROLLED",
    },
    include: {
      semester: {
        include: { programme: true },
      },
      division: true,
      academicYear: true,
    },
    orderBy: { enrolledAt: "desc" },
  });

  if (!activeEnrolment) {
    return {
      success: false,
      error: "No active semester enrolment found for your account. Please contact the Academic Office.",
      code: "NO_ACTIVE_ENROLMENT",
    };
  }

  // Retrieve timetable strictly scoped to this active placement
  const timetableRes = await TimetableRepository.getTimetable({
    semesterId: activeEnrolment.semesterId,
    divisionId: activeEnrolment.divisionId,
  });

  if (!timetableRes.success || !timetableRes.data) {
    return {
      success: false,
      error: timetableRes.error || "Failed to retrieve timetable schedule.",
      code: timetableRes.code || "TIMETABLE_FETCH_FAILED",
    };
  }

  const rawEntries = timetableRes.data as Array<{
    id: string;
    dayOfWeek: string;
    startTime: string;
    endTime: string;
    room: string | null;
    sessionType: string;
    status: string;
    subject: {
      code: string;
      title: string;
      credits: number;
      subjectType: string;
    } | null;
    teachingAssignment: {
      staff: {
        fullName: string;
      } | null;
    } | null;
  }>;

  const entries = rawEntries.map((e) => ({
    id: e.id,
    dayOfWeek: e.dayOfWeek,
    startTime: e.startTime,
    endTime: e.endTime,
    room: e.room,
    sessionType: e.sessionType || "THEORY",
    status: e.status,
    subject: {
      code: e.subject?.code || "SUBJ",
      title: e.subject?.title || "Subject",
      credits: e.subject?.credits || 0,
      subjectType: e.subject?.subjectType || "THEORY",
    },
    staffName: e.teachingAssignment?.staff?.fullName || "Unassigned",
  }));

  return {
    success: true,
    data: {
      placement: {
        programmeName: activeEnrolment.semester.programme.name,
        programmeCode: activeEnrolment.semester.programme.code,
        semesterNumber: activeEnrolment.semester.semesterNumber,
        divisionName: activeEnrolment.division?.name || "Cohort-Wide",
        academicYearName: activeEnrolment.academicYear.name,
      },
      entries,
    },
  };
}

/**
 * Retrieves the authenticated student's raw attendance metrics and chronological ledger.
 * Exclusively provides raw counts (Held, Present, Late, Absent, Excused) and session records.
 * Zero percentage or eligibility badges calculated for student presentation.
 */
export async function getStudentSelfAttendance(): Promise<Result<StudentSelfAttendanceData>> {
  const sessionResult = await requireStudentSession();
  if (!sessionResult.success || !sessionResult.data) {
    return {
      success: false,
      error: sessionResult.error,
      code: sessionResult.code,
    };
  }

  const { studentId } = sessionResult.data;

  // Resolve student's active enrolment
  const activeEnrolment = await prisma.enrolment.findFirst({
    where: {
      studentId,
      status: "ENROLLED",
    },
    select: {
      id: true,
      semesterId: true,
      divisionId: true,
    },
  });

  if (!activeEnrolment) {
    return {
      success: true,
      data: {
        summary: {
          totalConductedSessions: 0,
          totalRecords: 0,
          presentCount: 0,
          lateCount: 0,
          absentCount: 0,
          excusedCount: 0,
          totalRecordedOpportunities: 0,
          subjectBreakdown: [],
        },
        records: [],
      },
    };
  }

  // Retrieve raw attendance summary via AttendanceRepository strictly scoped to active placement
  const summaryRes = await AttendanceRepository.getAttendanceSummary({
    studentId,
    semesterId: activeEnrolment.semesterId,
    divisionId: activeEnrolment.divisionId,
  });
  if (!summaryRes.success || !summaryRes.data) {
    return {
      success: false,
      error: summaryRes.error || "Failed to retrieve attendance summary.",
      code: summaryRes.code || "ATTENDANCE_FETCH_FAILED",
    };
  }

  const rawSummary = summaryRes.data as {
    totalConductedSessions: number;
    totalRecords: number;
    presentCount: number;
    lateCount: number;
    absentCount: number;
    excusedCount: number;
    subjectBreakdown: Array<{
      subjectId: string;
      subjectCode: string;
      subjectTitle: string;
      conductedSessions: number;
      presentCount: number;
      lateCount: number;
      absentCount: number;
      excusedCount: number;
    }>;
  };

  // Retrieve chronological session attendance records for this student in their active semester
  const rawRecords = await prisma.attendanceRecord.findMany({
    where: {
      studentId,
      session: {
        status: { not: "CANCELLED" },
        semesterId: activeEnrolment.semesterId,
      },
    },
    include: {
      session: {
        include: {
          subject: true,
          faculty: true,
        },
      },
    },
    orderBy: [
      { session: { sessionDate: "desc" } },
      { session: { startTime: "desc" } },
    ],
  });

  const records = rawRecords.map((r) => ({
    id: r.id,
    sessionDate: r.session.sessionDate,
    startTime: r.session.startTime,
    endTime: r.session.endTime,
    sessionType: r.session.sessionType || "THEORY",
    topicCovered: r.session.topicCovered || null,
    subjectCode: r.session.subject.code,
    subjectTitle: r.session.subject.title,
    facultyName: r.session.faculty.fullName,
    status: r.status,
    remarks: r.remarks || null,
  }));

  const totalRecordedOpportunities =
    rawSummary.presentCount + rawSummary.lateCount + rawSummary.absentCount + rawSummary.excusedCount;

  return {
    success: true,
    data: {
      summary: {
        totalConductedSessions: rawSummary.totalConductedSessions,
        totalRecords: rawSummary.totalRecords,
        presentCount: rawSummary.presentCount,
        lateCount: rawSummary.lateCount,
        absentCount: rawSummary.absentCount,
        excusedCount: rawSummary.excusedCount,
        totalRecordedOpportunities,
        subjectBreakdown: rawSummary.subjectBreakdown.map((sb) => ({
          subjectId: sb.subjectId,
          subjectCode: sb.subjectCode,
          subjectTitle: sb.subjectTitle,
          conductedSessions: sb.conductedSessions,
          presentCount: sb.presentCount,
          lateCount: sb.lateCount,
          absentCount: sb.absentCount,
          excusedCount: sb.excusedCount,
        })),
      },
      records,
    },
  };
}

/**
 * Server Action: Retrieves officially published examination results for the authenticated student.
 * STRICT ENFORCEMENT: approvalStatus === 'PUBLISHED' is applied unconditionally server-side.
 * Draft, under-review, or unpublished results are never exposed to the student.
 * Identity is derived exclusively from server session; no client parameter accepted.
 */
export async function getStudentSelfExamResults(): Promise<Result<StudentSelfExamResultsData>> {
  const sessionResult = await requireStudentSession();
  if (!sessionResult.success || !sessionResult.data) {
    return {
      success: false,
      error: sessionResult.error,
      code: sessionResult.code,
    };
  }

  const { studentId } = sessionResult.data;

  // Retrieve examination summaries strictly with approvalStatus = 'PUBLISHED'
  const rawSummaries = await prisma.examResultSummary.findMany({
    where: {
      studentId,
      approvalStatus: "PUBLISHED",
    },
    include: {
      examSession: true,
      semester: {
        include: {
          programme: true,
        },
      },
      subjectResults: {
        include: {
          subject: true,
        },
        orderBy: {
          subject: { code: "asc" },
        },
      },
    },
    orderBy: [
      { examSession: { startDate: "desc" } },
      { publishedAt: "desc" },
    ],
  });

  const results = rawSummaries.map((s) => ({
    id: s.id,
    examSession: {
      id: s.examSession.id,
      name: s.examSession.name,
      sessionCode: s.examSession.sessionCode,
      sessionType: s.examSession.sessionType,
      startDate: s.examSession.startDate,
      endDate: s.examSession.endDate,
    },
    semester: {
      semesterNumber: s.semester.semesterNumber,
      programmeName: s.semester.programme.name,
      programmeCode: s.semester.programme.code,
    },
    totalMaxMarks: s.totalMaxMarks,
    totalMarksObtained: s.totalMarksObtained,
    percentage: s.percentage,
    sgpa: s.sgpa,
    letterGrade: s.letterGrade,
    resultStatus: s.resultStatus,
    approvalStatus: s.approvalStatus,
    publishedAt: s.publishedAt,
    subjectResults: s.subjectResults.map((sr) => ({
      id: sr.id,
      subjectCode: sr.subject.code,
      subjectTitle: sr.subject.title,
      subjectType: sr.subject.subjectType,
      credits: sr.credits,
      totalMaxMarks: sr.totalMaxMarks,
      totalMarksObtained: sr.totalMarksObtained,
      gradePoint: sr.gradePoint,
      letterGrade: sr.letterGrade,
      status: sr.status,
    })),
  }));

  return {
    success: true,
    data: { results },
  };
}

/**
 * Server Action: Retrieves the authenticated student's fee ledger and payment receipts.
 * Strictly resolves identity from server session; client cannot supply studentId.
 * Adheres to financial aggregation rules:
 * - Total demand = sum of invoice totalDemand
 * - Total paid = sum of qualifying persisted receipts (anti-double-counting)
 * - Outstanding balance = Math.max(0, totalDemand - totalPaid)
 * - 4 approved derived fee clearance states: NOT_INVOICED, CLEARED, PARTIALLY_CLEARED, PENDING_DUES.
 */
export async function getStudentSelfFeeLedger(): Promise<Result<StudentSelfFeeLedgerData>> {
  const sessionResult = await requireStudentSession();
  if (!sessionResult.success || !sessionResult.data) {
    return {
      success: false,
      error: sessionResult.error,
      code: sessionResult.code,
    };
  }

  const { studentId } = sessionResult.data;

  // Retrieve fee ledger strictly scoped to session-derived studentId via FeeRepository
  const ledgerRes = await FeeRepository.getStudentFeeLedger(studentId);
  if (!ledgerRes.success || !ledgerRes.data) {
    return {
      success: false,
      error: ledgerRes.error || "Failed to retrieve student fee ledger.",
      code: ledgerRes.code || "FEE_LEDGER_ERROR",
    };
  }

  const ledger = ledgerRes.data;

  // Derive overpayment credit if totalPaid exceeds totalDemand
  const overpaymentCredit = Math.max(0, ledger.totalPaid - ledger.totalDemand);

  const invoices = ledger.invoices.map((inv) => ({
    id: inv.invoiceId,
    invoiceNumber: inv.invoiceNumber,
    structureName: inv.structureName,
    totalDemand: inv.totalDemand,
    totalPaid: inv.totalPaid,
    outstandingBalance: inv.outstandingBalance,
    status: inv.status,
    dueDate: inv.dueDate,
    createdAt: inv.createdAt,
    feeHeads: inv.feeHeads,
    receipts: inv.receipts.map((r) => ({
      id: r.id,
      receiptNumber: r.receiptNumber,
      amountPaid: r.amountPaid,
      paymentDate: r.paymentDate,
      paymentMethod: r.paymentMethod,
      transactionReference: r.transactionReference,
      payerName: r.payerName || null,
      remarks: r.remarks || null,
      collectedByName: r.collectedByName || "Finance Office",
    })),
  }));

  return {
    success: true,
    data: {
      summary: {
        totalDemand: ledger.totalDemand,
        totalPaid: ledger.totalPaid,
        outstandingBalance: ledger.outstandingBalance,
        overpaymentCredit,
        feeClearanceStatus: ledger.feeClearanceStatus,
      },
      invoices,
    },
  };
}

/**
 * Server Action: Retrieves verified details of a specific payment receipt.
 * Enforces cross-student boundary: only the student who owns the receipt may view it.
 */
export async function getStudentSelfReceipt(receiptId: string): Promise<Result<{
  id: string;
  receiptNumber: string;
  amountPaid: number;
  paymentDate: Date;
  paymentMethod: string;
  transactionReference: string;
  payerName: string | null;
  remarks: string | null;
  collectedByName: string;
  invoice: {
    invoiceNumber: string;
    totalDemand: number;
    feeStructureName: string;
  };
  student: {
    fullName: string;
    rollNumber: string;
    prn: string;
  };
}>> {
  const sessionResult = await requireStudentSession();
  if (!sessionResult.success || !sessionResult.data) {
    return {
      success: false,
      error: sessionResult.error,
      code: sessionResult.code,
    };
  }

  const { studentId } = sessionResult.data;

  if (typeof receiptId !== "string" || !receiptId.trim()) {
    return {
      success: false,
      error: "Receipt identifier is required.",
      code: "VALIDATION_FAILED",
    };
  }

  const receipt = await prisma.feeReceipt.findUnique({
    where: { id: receiptId.trim() },
    include: {
      invoice: {
        include: {
          feeStructure: true,
        },
      },
      student: true,
      collectedBy: {
        select: {
          fullName: true,
        },
      },
    },
  });

  if (!receipt) {
    return {
      success: false,
      error: "Receipt not found.",
      code: "NOT_FOUND",
    };
  }

  // Cross-student access protection: verify that receipt belongs to authenticated student
  if (receipt.studentId !== studentId) {
    return {
      success: false,
      error: "Access denied. You may only view receipts issued to your personal student profile.",
      code: "FORBIDDEN",
    };
  }

  return {
    success: true,
    data: {
      id: receipt.id,
      receiptNumber: receipt.receiptNumber,
      amountPaid: receipt.amountPaid,
      paymentDate: receipt.paymentDate,
      paymentMethod: receipt.paymentMethod,
      transactionReference: receipt.transactionReference,
      payerName: receipt.payerName,
      remarks: receipt.remarks,
      collectedByName: receipt.collectedBy?.fullName || "Finance Office",
      invoice: {
        invoiceNumber: receipt.invoice.invoiceNumber,
        totalDemand: receipt.invoice.totalDemand,
        feeStructureName: receipt.invoice.feeStructure.name,
      },
      student: {
        fullName: receipt.student.fullName,
        rollNumber: receipt.student.rollNumber,
        prn: receipt.student.prn,
      },
    },
  };
}

