import prisma from "@/lib/db";
import { Student, Enrolment, Programme, Semester, Division, AcademicYear, Prisma, StudentDocument } from "@prisma/client";
import { Result, PaginatedResult } from "./types";
import {
  validateDocumentFile,
  isValidDocumentCategory,
  DocumentCategory,
  ALLOWED_DOCUMENT_CATEGORIES,
  DOCUMENT_CATEGORY_LABELS,
} from "@/lib/storage/validation";
import {
  getDocumentStorageProvider,
  generateSafeStorageKey,
  getStorageStatus,
} from "@/lib/storage";

export interface StudentDocumentVerificationDTO {
  id: string;
  documentId: string;
  reviewerUserId: string;
  reviewerName: string;
  previousStatus: string;
  newStatus: string;
  reason: string | null;
  createdAt: Date;
}

export interface StudentDocumentDTO {
  id: string;
  studentId: string;
  category: DocumentCategory;
  categoryLabel: string;
  originalFileName: string;
  mimeType: string;
  fileSize: number;
  storageProvider: string;
  storageKey: string;
  checksum: string;
  status: string;
  version: number;
  isArchived: boolean;
  uploadedByUserId: string;
  uploadedByUserName: string;
  replacedDocumentId: string | null;
  createdAt: Date;
  updatedAt: Date;
  verifications: StudentDocumentVerificationDTO[];
}

export interface StudentDocumentsSummary {
  totalCount: number;
  verifiedCount: number;
  pendingCount: number;
  rejectedCount: number;
  documents: StudentDocumentDTO[];
  categoriesBreakdown: Array<{
    category: DocumentCategory;
    label: string;
    document: StudentDocumentDTO | null;
    status: "UPLOADED" | "VERIFIED" | "REJECTED" | "MISSING";
    isUploaded: boolean;
  }>;
}

export interface CreateStudentDTO {
  rollNumber: string;
  prn: string;
  fullName: string;
  email: string;
  phone: string;
  dob: Date;
  gender?: string;
  bloodGroup?: string;
  status?: string;
  guardianName?: string;
  guardianRelationship?: string;
  guardianPhone?: string;
  attendanceRate?: number;
  mentorFaculty?: string;
  programmeId: string;
  semesterId: string;
  divisionId: string;
  academicYearId: string;
}

export interface CohortProgressionCandidate {
  id: string;
  fullName: string;
  rollNumber: string;
  prn: string;
  currentSemester: number;
  currentDivisionName: string;
  currentEnrolmentId: string;
  attendanceRate: number | null;
  feeStatus: string;
  studentStatus: string;
  isEligible: boolean;
  ineligibilityReason?: string;
  hasExistingDestinationEnrolment: boolean;
}

export interface CohortProgressionPreviewData {
  sourceProgramme: { id: string; code: string; name: string };
  sourceSemester: { id: string; semesterNumber: number };
  sourceDivision?: { id: string; name: string } | null;
  sourceAcademicYear: { id: string; code: string; name: string };
  destinationSemester: { id: string; semesterNumber: number } | null;
  isFinalSemester: boolean;
  availableDestinationDivisions: Array<{ id: string; name: string; maxCapacity: number }>;
  destinationAcademicYear: { id: string; code: string; name: string } | null;
  candidates: CohortProgressionCandidate[];
  summary: {
    totalCandidates: number;
    eligibleCount: number;
    ineligibleCount: number;
  };
}

export interface ExecuteCohortProgressionParams {
  studentIds: string[];
  sourceSemesterId: string;
  destinationAcademicYearId: string;
  destinationSemesterId: string;
  destinationDivisionId: string;
}

export interface CohortProgressionResult {
  totalProcessed: number;
  successfulIds: string[];
  failedRecords: Array<{ id: string; reason: string }>;
  destinationSemesterNumber: number;
  destinationDivisionName: string;
}


export interface UpdateStudentDTO {
  fullName?: string;
  prn?: string;
  rollNumber?: string;
  phone?: string;
  email?: string;
  dob?: Date;
  gender?: string;
  bloodGroup?: string;
  status?: string;
  guardianName?: string;
  guardianRelationship?: string;
  guardianPhone?: string;
  attendanceRate?: number;
  mentorFaculty?: string;
  programmeId?: string;
  semesterId?: string;
  divisionId?: string;
  academicYearId?: string;
}

export interface StudentFilterParams {
  search?: string;
  programmeId?: string;
  status?: string;
  page?: number;
  pageSize?: number;
  allowedStudentIds?: string[];
  allowedDivisionIds?: string[];
}

export type StudentWithEnrolment = Prisma.StudentGetPayload<{
  include: {
    enrolments: {
      include: {
        academicYear: true;
        programme: true;
        semester: true;
        division: true;
      };
    };
  };
}> & {
  feeInvoices?: Array<{
    totalDemand: number;
    receipts: Array<{ amountPaid: number }>;
  }>;
};

export interface StudentDossier360Data {
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
    guardianName: string | null;
    guardianRelationship: string | null;
    guardianPhone: string | null;
    attendanceRate: number | null;
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
    hasAnomaly: boolean;
    anomalyDescription?: string;
  } | null;
  enrolments: Array<{
    id: string;
    status: string;
    enrolledAt: Date;
    hasAnomaly: boolean;
    anomalyDescription?: string;
    programme: {
      id: string;
      code: string;
      name: string;
    };
    semester: {
      id: string;
      semesterNumber: number;
    };
    division: {
      id: string;
      name: string;
    };
    academicYear: {
      id: string;
      code: string;
      name: string;
      isCurrent: boolean;
    };
  }>;
  attendance: {
    summary: {
      sessionsHeld: number;
      presentCount: number;
      lateCount: number;
      absentCount: number;
      excusedCount: number;
      attendedCount: number;
      ratePercentage: number | null;
      isShortage: boolean;
      policyNote: string;
    };
    records: Array<{
      id: string;
      status: string;
      markedAt: Date;
      remarks: string | null;
      session: {
        id: string;
        sessionDate: Date;
        startTime: string;
        endTime: string;
        sessionType: string;
        status: string;
        topicCovered: string | null;
        subject: {
          id: string;
          code: string;
          name: string;
        };
        faculty: {
          id: string;
          fullName: string;
        };
        division: {
          id: string;
          name: string;
        } | null;
        semester: {
          id: string;
          semesterNumber: number;
        };
      };
    }>;
  };
  finance: {
    summary: {
      totalBilled: number;
      totalPaid: number;
      outstandingBalance: number;
      paymentEfficiency: number;
      status: "CLEARED" | "PARTIAL" | "PENDING" | "UNINVOICED";
    };
    invoices: Array<{
      id: string;
      invoiceNumber: string;
      totalDemand: number;
      dueDate: Date;
      status: string;
      remarks: string | null;
      createdAt: Date;
      feeStructure: {
        id: string;
        name: string;
        totalAmount: number;
        feeHeads: Array<{
          id: string;
          headName: string;
          amount: number;
        }>;
      };
      receipts: Array<{
        id: string;
        receiptNumber: string;
        amountPaid: number;
        paymentDate: Date;
        paymentMethod: string;
        transactionReference: string;
      }>;
    }>;
    receipts: Array<{
      id: string;
      receiptNumber: string;
      invoiceNumber: string;
      amountPaid: number;
      paymentDate: Date;
      paymentMethod: string;
      transactionReference: string;
      payerName: string | null;
      remarks: string | null;
    }>;
  };
  examinations: {
    summaries: Array<{
      id: string;
      examSessionId: string;
      examSessionName: string;
      sessionCode: string;
      sessionType: string;
      semesterNumber: number;
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
        subjectName: string;
        credits: number;
        totalMaxMarks: number;
        totalMarksObtained: number | null;
        gradePoint: number | null;
        letterGrade: string | null;
        status: string;
      }>;
    }>;
    assessmentEntries: Array<{
      id: string;
      componentName: string;
      componentType: string;
      maxMarks: number;
      marksObtained: number | null;
      entryStatus: string;
      isPassed: boolean | null;
      subjectCode: string;
      subjectName: string;
      examSessionName: string;
    }>;
  };
  documentsSummary?: StudentDocumentsSummary;
}


export interface StudentCreationResult {
  student: Student;
  enrolment: Enrolment;
}

export interface EnrolmentPlacementValidationParams {
  programmeId: string;
  semesterId: string;
  divisionId: string;
  academicYearId?: string;
}

export interface ValidatedEnrolmentEntities {
  academicYear: AcademicYear;
  programme: Programme;
  semester: Semester;
  division: Division;
}

/**
 * Shared server-side validator for academic placement hierarchy.
 * Enforces relational integrity across AcademicYear, Programme, Semester, and Division:
 * 1. Programme exists in institutional database.
 * 2. Semester exists and strictly belongs to the selected programme (semester.programmeId === programme.id).
 * 3. Division exists and strictly belongs to the selected semester (division.semesterId === semester.id).
 * 4. Academic year exists and is verified.
 */
export async function validateEnrolmentPlacement(
  params: EnrolmentPlacementValidationParams,
  client: Prisma.TransactionClient | typeof prisma = prisma
): Promise<Result<ValidatedEnrolmentEntities>> {
  // 1. Validate Programme
  if (!params.programmeId) {
    return { success: false, error: "Programme ID is required for academic placement.", code: "INVALID_PROGRAMME" };
  }
  const programme = await client.programme.findUnique({
    where: { id: params.programmeId },
  });
  if (!programme) {
    return {
      success: false,
      error: `Selected programme (ID: ${params.programmeId}) does not exist in institutional database.`,
      code: "PROGRAMME_NOT_FOUND",
    };
  }

  // 2. Validate Semester
  if (!params.semesterId) {
    return { success: false, error: "Semester ID is required for academic placement.", code: "INVALID_SEMESTER" };
  }
  const semester = await client.semester.findUnique({
    where: { id: params.semesterId },
  });
  if (!semester) {
    return {
      success: false,
      error: `Selected semester (ID: ${params.semesterId}) does not exist in institutional database.`,
      code: "SEMESTER_NOT_FOUND",
    };
  }
  if (semester.programmeId !== programme.id) {
    return {
      success: false,
      error: `Semester ${semester.semesterNumber} does not belong to programme "${programme.name}" (${programme.code}).`,
      code: "SEMESTER_PROGRAMME_MISMATCH",
    };
  }

  // 3. Validate Division
  if (!params.divisionId) {
    return { success: false, error: "Division ID is required for academic placement.", code: "INVALID_DIVISION" };
  }
  const division = await client.division.findUnique({
    where: { id: params.divisionId },
  });
  if (!division) {
    return {
      success: false,
      error: `Selected division (ID: ${params.divisionId}) does not exist in institutional database.`,
      code: "DIVISION_NOT_FOUND",
    };
  }
  if (division.semesterId !== semester.id) {
    return {
      success: false,
      error: `Division "${division.name}" belongs to a different semester and cannot be assigned to Semester ${semester.semesterNumber}.`,
      code: "DIVISION_SEMESTER_MISMATCH",
    };
  }

  // 4. Validate Academic Year
  let academicYear: AcademicYear | null = null;
  if (params.academicYearId) {
    academicYear = await client.academicYear.findUnique({
      where: { id: params.academicYearId },
    });
    if (!academicYear) {
      return {
        success: false,
        error: `Specified academic year (ID: ${params.academicYearId}) does not exist in institutional database.`,
        code: "ACADEMIC_YEAR_NOT_FOUND",
      };
    }
  } else {
    academicYear = await client.academicYear.findFirst({
      where: { isCurrent: true },
    });
    if (!academicYear) {
      academicYear = await client.academicYear.findFirst({
        orderBy: { startDate: "desc" },
      });
    }
    if (!academicYear) {
      return {
        success: false,
        error: "No active academic year configured in institutional database.",
        code: "ACADEMIC_YEAR_NOT_FOUND",
      };
    }
  }

  return {
    success: true,
    data: {
      academicYear,
      programme,
      semester,
      division,
    },
  };
}

export class StudentRepository {
  /**
   * Retrieves paginated students with active enrolments, programme, and division details.
   */
  static async getStudents(params: StudentFilterParams = {}): Promise<Result<PaginatedResult<StudentWithEnrolment>>> {
    try {
      const page = Math.max(1, params.page || 1);
      const pageSize = Math.max(1, Math.min(100, params.pageSize || 20));
      const skip = (page - 1) * pageSize;

      const where: Prisma.StudentWhereInput = {};

      if (params.status && params.status !== "all") {
        where.status = params.status;
      }

      if (params.programmeId && params.programmeId !== "all") {
        where.enrolments = {
          some: { programmeId: params.programmeId },
        };
      }

      if (params.search && params.search.trim()) {
        const q = params.search.trim();
        where.OR = [
          { fullName: { contains: q } },
          { rollNumber: { contains: q } },
          { prn: { contains: q } },
          { email: { contains: q } },
        ];
      }

      if (params.allowedStudentIds !== undefined) {
        where.id = { in: params.allowedStudentIds };
      }

      if (params.allowedDivisionIds !== undefined) {
        const existingSome = (where.enrolments as Prisma.EnrolmentListRelationFilter)?.some || {};
        where.enrolments = {
          some: {
            ...existingSome,
            divisionId: { in: params.allowedDivisionIds },
          },
        };
      }

      const [total, items] = await Promise.all([
        prisma.student.count({ where }),
        prisma.student.findMany({
          where,
          skip,
          take: pageSize,
          orderBy: { rollNumber: "asc" },
          include: {
            enrolments: {
              include: {
                academicYear: true,
                programme: true,
                semester: true,
                division: true,
              },
              orderBy: { enrolledAt: "desc" },
            },
          },
        }),
      ]);

      return {
        success: true,
        data: {
          items,
          total,
          page,
          pageSize,
          totalPages: Math.ceil(total / pageSize),
        },
      };
    } catch (error: unknown) {
      const message = error instanceof Error ? error.message : "Failed to fetch students";
      return { success: false, error: message };
    }
  }

  /**
   * Retrieves single student by ID with complete enrolment history.
   */
  static async getStudentById(id: string): Promise<Result<StudentWithEnrolment>> {
    try {
      let student = await prisma.student.findUnique({
        where: { id },
        include: {
          enrolments: {
            include: {
              academicYear: true,
              programme: true,
              semester: true,
              division: true,
            },
            orderBy: { enrolledAt: "desc" },
          },
          feeInvoices: {
            include: {
              receipts: true,
            },
          },
        },
      });

      if (!student) {
        student = await prisma.student.findFirst({
          where: {
            OR: [{ prn: id }, { rollNumber: id }],
          },
          include: {
            enrolments: {
              include: {
                academicYear: true,
                programme: true,
                semester: true,
                division: true,
              },
              orderBy: { enrolledAt: "desc" },
            },
            feeInvoices: {
              include: {
                receipts: true,
              },
            },
          },
        });
      }

      if (!student) {
        return { success: false, error: "Student not found in institutional database", code: "NOT_FOUND" };
      }

      return { success: true, data: student };
    } catch (error: unknown) {
      const message = error instanceof Error ? error.message : "Failed to fetch student";
      return { success: false, error: message };
    }
  }

  /**
   * Retrieves complete 360-degree student dossier across all institutional relations:
   * Master details, chronological enrolments, attendance sessions, fee ledger & receipts,
   * examination summaries and assessment entries.
   * Scoped to student ID, PRN, or Roll Number.
   */
  static async getStudentDossier360(id: string): Promise<Result<StudentDossier360Data>> {
    try {
      // 1. Locate student by UUID or unique identifiers (PRN / Roll Number)
      let student = await prisma.student.findUnique({
        where: { id },
      });
      if (!student) {
        student = await prisma.student.findFirst({
          where: {
            OR: [{ prn: id }, { rollNumber: id }],
          },
        });
      }

      if (!student) {
        return {
          success: false,
          error: `Student '${id}' was not found in the institutional database.`,
          code: "NOT_FOUND",
        };
      }

      const targetId = student.id;

      // 2. Execute parallel relational queries for enrolments, attendance, fees, exams, and documents
      const [
        enrolments,
        attendanceRecords,
        invoices,
        receipts,
        examSummaries,
        assessmentEntries,
        documentsRes,
      ] = await Promise.all([
        // Enrolment history
        prisma.enrolment.findMany({
          where: { studentId: targetId },
          include: {
            academicYear: true,
            programme: true,
            semester: true,
            division: true,
          },
          orderBy: { enrolledAt: "desc" },
        }),
        // Attendance records
        prisma.attendanceRecord.findMany({
          where: { studentId: targetId },
          include: {
            session: {
              include: {
                subject: true,
                faculty: true,
                division: true,
                semester: true,
              },
            },
          },
          orderBy: { session: { sessionDate: "desc" } },
        }),
        // Fee invoices
        prisma.studentFeeInvoice.findMany({
          where: { studentId: targetId },
          include: {
            feeStructure: {
              include: {
                feeHeads: true,
              },
            },
            receipts: {
              orderBy: { paymentDate: "desc" },
            },
          },
          orderBy: { createdAt: "desc" },
        }),
        // Fee receipts
        prisma.feeReceipt.findMany({
          where: { studentId: targetId },
          include: {
            invoice: {
              select: { invoiceNumber: true },
            },
          },
          orderBy: { paymentDate: "desc" },
        }),
        // Exam Result Summaries
        prisma.examResultSummary.findMany({
          where: { studentId: targetId },
          include: {
            examSession: true,
            semester: true,
            subjectResults: {
              include: { subject: true },
            },
          },
          orderBy: { createdAt: "desc" },
        }),
        // Assessment Component Entries
        prisma.studentAssessmentEntry.findMany({
          where: { studentId: targetId },
          include: {
            component: {
              include: {
                subject: true,
                examSession: true,
              },
            },
          },
          orderBy: { createdAt: "desc" },
        }),
        this.getStudentDocuments(targetId),
      ]);

      // 3. Process Enrolments & Hierarchy Anomaly Checks
      const mappedEnrolments = enrolments.map((e) => {
        let hasAnomaly = false;
        let anomalyDescription: string | undefined = undefined;

        if (e.semester.programmeId !== e.programmeId) {
          hasAnomaly = true;
          anomalyDescription = `Semester ${e.semester.semesterNumber} belongs to programme ${e.semester.programmeId}, differing from enrolment programme ${e.programme.code}.`;
        } else if (e.division.semesterId !== e.semesterId) {
          hasAnomaly = true;
          anomalyDescription = `Division '${e.division.name}' belongs to a different semester than Semester ${e.semester.semesterNumber}.`;
        }

        return {
          id: e.id,
          status: e.status,
          enrolledAt: e.enrolledAt,
          hasAnomaly,
          anomalyDescription,
          programme: {
            id: e.programme.id,
            code: e.programme.code,
            name: e.programme.name,
          },
          semester: {
            id: e.semester.id,
            semesterNumber: e.semester.semesterNumber,
          },
          division: {
            id: e.division.id,
            name: e.division.name,
          },
          academicYear: {
            id: e.academicYear.id,
            code: e.academicYear.code,
            name: e.academicYear.name,
            isCurrent: e.academicYear.isCurrent,
          },
        };
      });

      // Active placement is the latest enrolment record
      const activeEnrolment = mappedEnrolments[0] || null;
      const activePlacement = activeEnrolment
        ? {
            programmeId: activeEnrolment.programme.id,
            programmeCode: activeEnrolment.programme.code,
            programmeName: activeEnrolment.programme.name,
            semesterId: activeEnrolment.semester.id,
            semesterNumber: activeEnrolment.semester.semesterNumber,
            divisionId: activeEnrolment.division.id,
            divisionName: activeEnrolment.division.name,
            academicYearId: activeEnrolment.academicYear.id,
            academicYearCode: activeEnrolment.academicYear.code,
            academicYearName: activeEnrolment.academicYear.name,
            status: activeEnrolment.status,
            hasAnomaly: activeEnrolment.hasAnomaly,
            anomalyDescription: activeEnrolment.anomalyDescription,
          }
        : null;

      // 4. Calculate Attendance Metrics (Strict Opportunity Model)
      const sessionsHeld = attendanceRecords.length;
      const presentCount = attendanceRecords.filter((r) => r.status === "PRESENT").length;
      const lateCount = attendanceRecords.filter((r) => r.status === "LATE").length;
      const absentCount = attendanceRecords.filter((r) => r.status === "ABSENT").length;
      const excusedCount = attendanceRecords.filter((r) => r.status === "EXCUSED").length;
      const attendedCount = presentCount + lateCount;
      const totalOpportunity = presentCount + lateCount + absentCount + excusedCount;

      const ratePercentage =
        totalOpportunity > 0
          ? Math.round(((presentCount + lateCount) / totalOpportunity) * 1000) / 10
          : null;
      const isShortage = ratePercentage !== null && ratePercentage < 75;

      const mappedAttendanceRecords = attendanceRecords.map((r) => ({
        id: r.id,
        status: r.status,
        markedAt: r.markedAt,
        remarks: r.remarks,
        session: {
          id: r.session.id,
          sessionDate: r.session.sessionDate,
          startTime: r.session.startTime,
          endTime: r.session.endTime,
          sessionType: r.session.sessionType,
          status: r.session.status,
          topicCovered: r.session.topicCovered,
          subject: {
            id: r.session.subject.id,
            code: r.session.subject.code,
            name: r.session.subject.title,
          },
          faculty: {
            id: r.session.faculty.id,
            fullName: r.session.faculty.fullName,
          },
          division: r.session.division
            ? {
                id: r.session.division.id,
                name: r.session.division.name,
              }
            : null,
          semester: {
            id: r.session.semester.id,
            semesterNumber: r.session.semester.semesterNumber,
          },
        },
      }));

      // 5. Calculate Finance Metrics (No double counting)
      const totalBilled = invoices.reduce((sum, inv) => sum + inv.totalDemand, 0);
      const totalPaid = receipts.reduce((sum, rec) => sum + rec.amountPaid, 0);
      const outstandingBalance = Math.max(0, totalBilled - totalPaid);
      const paymentEfficiency =
        totalBilled > 0
          ? Math.min(100, Math.round((totalPaid / totalBilled) * 1000) / 10)
          : totalPaid > 0
          ? 100
          : 0;

      let feeStatus: "CLEARED" | "PARTIAL" | "PENDING" | "UNINVOICED" = "UNINVOICED";
      if (invoices.length > 0) {
        if (outstandingBalance === 0 && totalPaid > 0) {
          feeStatus = "CLEARED";
        } else if (totalPaid > 0) {
          feeStatus = "PARTIAL";
        } else {
          feeStatus = "PENDING";
        }
      }

      const mappedInvoices = invoices.map((inv) => ({
        id: inv.id,
        invoiceNumber: inv.invoiceNumber,
        totalDemand: inv.totalDemand,
        dueDate: inv.dueDate,
        status: inv.status,
        remarks: inv.remarks,
        createdAt: inv.createdAt,
        feeStructure: {
          id: inv.feeStructure.id,
          name: inv.feeStructure.name,
          totalAmount: inv.feeStructure.totalAmount,
          feeHeads: inv.feeStructure.feeHeads.map((h) => ({
            id: h.id,
            headName: h.headName,
            amount: h.amount,
          })),
        },
        receipts: inv.receipts.map((rec) => ({
          id: rec.id,
          receiptNumber: rec.receiptNumber,
          amountPaid: rec.amountPaid,
          paymentDate: rec.paymentDate,
          paymentMethod: rec.paymentMethod,
          transactionReference: rec.transactionReference,
        })),
      }));

      const mappedReceipts = receipts.map((rec) => ({
        id: rec.id,
        receiptNumber: rec.receiptNumber,
        invoiceNumber: rec.invoice.invoiceNumber,
        amountPaid: rec.amountPaid,
        paymentDate: rec.paymentDate,
        paymentMethod: rec.paymentMethod,
        transactionReference: rec.transactionReference,
        payerName: rec.payerName,
        remarks: rec.remarks,
      }));

      // 6. Process Examinations & Results
      const mappedExamSummaries = examSummaries.map((s) => ({
        id: s.id,
        examSessionId: s.examSessionId,
        examSessionName: s.examSession.name,
        sessionCode: s.examSession.sessionCode,
        sessionType: s.examSession.sessionType,
        semesterNumber: s.semester.semesterNumber,
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
          subjectName: sr.subject.title,
          credits: sr.credits,
          totalMaxMarks: sr.totalMaxMarks,
          totalMarksObtained: sr.totalMarksObtained,
          gradePoint: sr.gradePoint,
          letterGrade: sr.letterGrade,
          status: sr.status,
        })),
      }));

      const mappedAssessmentEntries = assessmentEntries.map((ae) => ({
        id: ae.id,
        componentName: ae.component.name,
        componentType: ae.component.componentType,
        maxMarks: ae.component.maxMarks,
        marksObtained: ae.marksObtained,
        entryStatus: ae.entryStatus,
        isPassed: ae.isPassed,
        subjectCode: ae.component.subject.code,
        subjectName: ae.component.subject.title,
        examSessionName: ae.component.examSession.name,
      }));

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
            guardianName: student.guardianName,
            guardianRelationship: student.guardianRelationship,
            guardianPhone: student.guardianPhone,
            attendanceRate: student.attendanceRate,
            mentorFaculty: student.mentorFaculty,
            createdAt: student.createdAt,
            updatedAt: student.updatedAt,
          },
          activePlacement,
          enrolments: mappedEnrolments,
          attendance: {
            summary: {
              sessionsHeld,
              presentCount,
              lateCount,
              absentCount,
              excusedCount,
              attendedCount,
              ratePercentage,
              isShortage,
              policyNote:
                "Calculation Note: Rate = (Present + Late) / Total Opportunities (Held). Excused sessions are included in total opportunities denominator. 75% threshold serves as an institutional advisory guideline.",
            },
            records: mappedAttendanceRecords,
          },
          finance: {
            summary: {
              totalBilled,
              totalPaid,
              outstandingBalance,
              paymentEfficiency,
              status: feeStatus,
            },
            invoices: mappedInvoices,
            receipts: mappedReceipts,
          },
          examinations: {
            summaries: mappedExamSummaries,
            assessmentEntries: mappedAssessmentEntries,
          },
          documentsSummary: documentsRes.success ? documentsRes.data : undefined,
        },
      };
    } catch (error: unknown) {
      const message = error instanceof Error ? error.message : "Failed to load 360-degree student dossier";
      return { success: false, error: message };
    }
  }


  /**
   * Creates a student record and their initial academic enrolment in a single atomic transaction.
   * Enforces server-side enrolment hierarchy validation before committing.
   */
  static async createStudentWithEnrolment(dto: CreateStudentDTO): Promise<Result<StudentCreationResult>> {
    try {
      const cleanPrn = dto.prn.trim().toUpperCase();
      const cleanEmail = dto.email.trim().toLowerCase();
      const cleanRoll = dto.rollNumber.trim();

      const existing = await prisma.student.findFirst({
        where: {
          OR: [{ rollNumber: cleanRoll }, { prn: cleanPrn }, { email: cleanEmail }],
        },
      });

      if (existing) {
        if (existing.rollNumber === cleanRoll) {
          return { success: false, error: `Roll number ${cleanRoll} is already registered.`, code: "DUPLICATE_ROLL" };
        }
        if (existing.prn === cleanPrn) {
          return { success: false, error: `PRN ${cleanPrn} is already registered.`, code: "DUPLICATE_PRN" };
        }
        if (existing.email.toLowerCase() === cleanEmail) {
          return { success: false, error: `Email ${cleanEmail} is already registered.`, code: "DUPLICATE_EMAIL" };
        }
      }

      const result = await prisma.$transaction(async (tx) => {
        // Workstream A: Server-side validation of enrolment hierarchy
        const validation = await validateEnrolmentPlacement(
          {
            programmeId: dto.programmeId,
            semesterId: dto.semesterId,
            divisionId: dto.divisionId,
            academicYearId: dto.academicYearId,
          },
          tx
        );

        if (!validation.success || !validation.data) {
          throw new Error(validation.error || "Enrolment hierarchy validation failed.");
        }

        const { academicYear, programme, semester, division } = validation.data;

        const student = await tx.student.create({
          data: {
            rollNumber: cleanRoll,
            prn: cleanPrn,
            fullName: dto.fullName.trim(),
            email: cleanEmail,
            phone: dto.phone.trim(),
            dob: dto.dob,
            gender: dto.gender || null,
            bloodGroup: dto.bloodGroup?.trim() || null,
            status: dto.status ? dto.status.trim().toUpperCase() : "ACTIVE",
            currentSemester: semester.semesterNumber || 1,
            guardianName: dto.guardianName?.trim() || null,
            guardianRelationship: dto.guardianRelationship?.trim() || null,
            guardianPhone: dto.guardianPhone?.trim() || null,
            attendanceRate: dto.attendanceRate !== undefined ? Number(dto.attendanceRate) : null,
            mentorFaculty: dto.mentorFaculty?.trim() || null,
          },
        });

        const enrolment = await tx.enrolment.create({
          data: {
            studentId: student.id,
            academicYearId: academicYear.id,
            programmeId: programme.id,
            semesterId: semester.id,
            divisionId: division.id,
            status: "ENROLLED",
          },
        });

        return { student, enrolment };
      });

      return { success: true, data: result };
    } catch (error: unknown) {
      const message = error instanceof Error ? error.message : "Failed to create student and enrolment";
      return { success: false, error: message };
    }
  }

  /**
   * Updates student details and manages academic placement history.
   * - Preserves academic history when changing semesters/terms by archiving previous placements as COMPLETED.
   * - Allows in-place division corrections within the active semester without erasing history.
   * - Protects identity-only edits from touching enrolment records.
   * - Enforces server-side enrolment hierarchy validation for all placement transitions.
   */
  static async updateStudent(id: string, data: UpdateStudentDTO): Promise<Result<StudentWithEnrolment>> {
    try {
      // 1. Resolve student by ID or fallback to stable unique identifiers
      let student = await prisma.student.findUnique({
        where: { id },
        include: {
          enrolments: {
            include: {
              academicYear: true,
              programme: true,
              semester: true,
              division: true,
            },
            orderBy: { enrolledAt: "desc" },
          },
          feeInvoices: {
            include: {
              receipts: true,
            },
          },
        },
      });

      if (!student) {
        student = await prisma.student.findFirst({
          where: {
            OR: [
              { prn: id },
              { rollNumber: id },
              data.prn ? { prn: data.prn.trim().toUpperCase() } : undefined,
              data.email ? { email: data.email.trim().toLowerCase() } : undefined,
            ].filter(Boolean) as Prisma.StudentWhereInput[],
          },
          include: {
            enrolments: {
              include: {
                academicYear: true,
                programme: true,
                semester: true,
                division: true,
              },
              orderBy: { enrolledAt: "desc" },
            },
            feeInvoices: {
              include: {
                receipts: true,
              },
            },
          },
        });
      }

      if (!student) {
        return { success: false, error: "Student record not found in institutional database.", code: "NOT_FOUND" };
      }

      const targetId = student.id;

      // 2. Validate uniqueness constraints against other students
      const conflictConditions: Prisma.StudentWhereInput[] = [];
      const cleanPrn = data.prn ? data.prn.trim().toUpperCase() : undefined;
      const cleanEmail = data.email ? data.email.trim().toLowerCase() : undefined;
      const cleanRoll = data.rollNumber ? data.rollNumber.trim() : undefined;

      if (cleanPrn && cleanPrn !== student.prn) {
        conflictConditions.push({ prn: cleanPrn });
      }
      if (cleanEmail && cleanEmail !== student.email.toLowerCase()) {
        conflictConditions.push({ email: cleanEmail });
      }
      if (cleanRoll && cleanRoll !== student.rollNumber) {
        conflictConditions.push({ rollNumber: cleanRoll });
      }

      if (conflictConditions.length > 0) {
        const conflict = await prisma.student.findFirst({
          where: {
            id: { not: targetId },
            OR: conflictConditions,
          },
        });

        if (conflict) {
          if (cleanPrn && conflict.prn === cleanPrn) {
            return {
              success: false,
              error: `PRN "${cleanPrn}" is already registered to student "${conflict.fullName}".`,
              code: "DUPLICATE_PRN",
            };
          }
          if (cleanEmail && conflict.email.toLowerCase() === cleanEmail) {
            return {
              success: false,
              error: `Email address "${cleanEmail}" is already in use by student "${conflict.fullName}".`,
              code: "DUPLICATE_EMAIL",
            };
          }
          if (cleanRoll && conflict.rollNumber === cleanRoll) {
            return {
              success: false,
              error: `Roll number "${cleanRoll}" is already assigned to student "${conflict.fullName}".`,
              code: "DUPLICATE_ROLL",
            };
          }
        }
      }

      // 3. Atomically update student record and manage academic history inside a transaction
      const updated = await prisma.$transaction(async (tx) => {
        const studentUpdate: Prisma.StudentUpdateInput = {};
        if (data.fullName !== undefined) studentUpdate.fullName = data.fullName.trim();
        if (cleanPrn !== undefined) studentUpdate.prn = cleanPrn;
        if (cleanRoll !== undefined) studentUpdate.rollNumber = cleanRoll;
        if (data.phone !== undefined) studentUpdate.phone = data.phone.trim();
        if (cleanEmail !== undefined) studentUpdate.email = cleanEmail;
        if (data.dob !== undefined) studentUpdate.dob = data.dob;
        if (data.gender !== undefined) studentUpdate.gender = data.gender;
        if (data.bloodGroup !== undefined) studentUpdate.bloodGroup = data.bloodGroup ? data.bloodGroup.trim() : null;
        if (data.status !== undefined) studentUpdate.status = data.status.toUpperCase();
        if (data.guardianName !== undefined) studentUpdate.guardianName = data.guardianName ? data.guardianName.trim() : null;
        if (data.guardianRelationship !== undefined) studentUpdate.guardianRelationship = data.guardianRelationship ? data.guardianRelationship.trim() : null;
        if (data.guardianPhone !== undefined) studentUpdate.guardianPhone = data.guardianPhone ? data.guardianPhone.trim() : null;
        if (data.attendanceRate !== undefined) studentUpdate.attendanceRate = data.attendanceRate !== null && !isNaN(Number(data.attendanceRate)) ? Number(data.attendanceRate) : null;
        if (data.mentorFaculty !== undefined) studentUpdate.mentorFaculty = data.mentorFaculty ? data.mentorFaculty.trim() : null;

        // Academic Placement Handling:
        // Distinguish Identity-Only updates vs In-Place Correction vs New Historical Placement
        const latestEnrolment = student.enrolments && student.enrolments.length > 0 ? student.enrolments[0] : null;

        const placementActuallyChanged =
          Boolean(data.programmeId && data.programmeId !== latestEnrolment?.programmeId) ||
          Boolean(data.semesterId && data.semesterId !== latestEnrolment?.semesterId) ||
          Boolean(data.divisionId && data.divisionId !== latestEnrolment?.divisionId);

        if (placementActuallyChanged) {
          const targetProgId = data.programmeId || latestEnrolment?.programmeId;
          const targetSemId = data.semesterId || latestEnrolment?.semesterId;
          const targetDivId = data.divisionId || latestEnrolment?.divisionId;
          const targetAyId = data.academicYearId || latestEnrolment?.academicYearId;

          if (!targetProgId || !targetSemId || !targetDivId) {
            throw new Error("Complete academic placement (programme, semester, and division) is required.");
          }

          // Workstream A: Server-side validation of hierarchy for changed placement
          const validation = await validateEnrolmentPlacement(
            {
              programmeId: targetProgId,
              semesterId: targetSemId,
              divisionId: targetDivId,
              academicYearId: targetAyId,
            },
            tx
          );

          if (!validation.success || !validation.data) {
            throw new Error(validation.error || "Invalid academic placement hierarchy.");
          }

          const { academicYear, programme, semester, division } = validation.data;

          if (
            latestEnrolment &&
            latestEnrolment.programmeId === programme.id &&
            latestEnrolment.semesterId === semester.id &&
            latestEnrolment.academicYearId === academicYear.id &&
            latestEnrolment.divisionId !== division.id
          ) {
            // In-place division correction within the exact same semester & academic term
            await tx.enrolment.update({
              where: { id: latestEnrolment.id },
              data: { divisionId: division.id },
            });
          } else {
            // New Academic Placement (e.g. new semester or programme change):
            // Check if an enrolment already exists for (studentId, academicYearId, semesterId)
            const existingForTerm = await tx.enrolment.findUnique({
              where: {
                studentId_academicYearId_semesterId: {
                  studentId: targetId,
                  academicYearId: academicYear.id,
                  semesterId: semester.id,
                },
              },
            });

            if (existingForTerm) {
              // Reactivate / update that term's enrolment
              await tx.enrolment.update({
                where: { id: existingForTerm.id },
                data: {
                  programmeId: programme.id,
                  divisionId: division.id,
                  status: "ENROLLED",
                },
              });
            } else {
              // Mark prior active enrolments as COMPLETED to preserve history
              if (latestEnrolment && latestEnrolment.status === "ENROLLED") {
                await tx.enrolment.update({
                  where: { id: latestEnrolment.id },
                  data: { status: "COMPLETED" },
                });
              }

              // Create a brand new enrolment record for the new academic placement
              await tx.enrolment.create({
                data: {
                  studentId: targetId,
                  academicYearId: academicYear.id,
                  programmeId: programme.id,
                  semesterId: semester.id,
                  divisionId: division.id,
                  status: "ENROLLED",
                  enrolledAt: new Date(),
                },
              });
            }

            studentUpdate.currentSemester = semester.semesterNumber;
          }
        }

        return tx.student.update({
          where: { id: targetId },
          data: studentUpdate,
          include: {
            enrolments: {
              include: {
                academicYear: true,
                programme: true,
                semester: true,
                division: true,
              },
              orderBy: { enrolledAt: "desc" },
            },
            feeInvoices: {
              include: {
                receipts: true,
              },
            },
          },
        });
      });

      return { success: true, data: updated };
    } catch (error: unknown) {
      const message = error instanceof Error ? error.message : "Failed to update student record";
      return { success: false, error: message };
    }
  }

  /**
   * Diagnostic check for enrolment hierarchy consistency.
   * Identifies semester/programme mismatches and division/semester mismatches
   * without modifying any records.
   */
  static async diagnoseEnrolmentIntegrity(): Promise<Result<{
    totalEnrolmentsChecked: number;
    anomalyCount: number;
    anomalies: Array<{
      enrolmentId: string;
      studentRoll: string;
      studentPrn: string;
      programmeCode: string;
      semesterNumber: number;
      divisionName: string;
      issueType: "SEMESTER_PROGRAMME_MISMATCH" | "DIVISION_SEMESTER_MISMATCH" | "CONTRADICTORY_CURRENT_ENROLMENTS";
      description: string;
    }>;
  }>> {
    try {
      const enrolments = await prisma.enrolment.findMany({
        include: {
          student: true,
          programme: true,
          semester: true,
          division: true,
          academicYear: true,
        },
      });

      const anomalies: Array<{
        enrolmentId: string;
        studentRoll: string;
        studentPrn: string;
        programmeCode: string;
        semesterNumber: number;
        divisionName: string;
        issueType: "SEMESTER_PROGRAMME_MISMATCH" | "DIVISION_SEMESTER_MISMATCH" | "CONTRADICTORY_CURRENT_ENROLMENTS";
        description: string;
      }> = [];

      for (const e of enrolments) {
        if (e.semester.programmeId !== e.programmeId) {
          anomalies.push({
            enrolmentId: e.id,
            studentRoll: e.student.rollNumber,
            studentPrn: e.student.prn,
            programmeCode: e.programme.code,
            semesterNumber: e.semester.semesterNumber,
            divisionName: e.division.name,
            issueType: "SEMESTER_PROGRAMME_MISMATCH",
            description: `Semester belongs to a different programme than the registered programme.`,
          });
        }

        if (e.division.semesterId !== e.semesterId) {
          anomalies.push({
            enrolmentId: e.id,
            studentRoll: e.student.rollNumber,
            studentPrn: e.student.prn,
            programmeCode: e.programme.code,
            semesterNumber: e.semester.semesterNumber,
            divisionName: e.division.name,
            issueType: "DIVISION_SEMESTER_MISMATCH",
            description: `Division '${e.division.name}' belongs to a different semester than the enrolment record.`,
          });
        }
      }

      return {
        success: true,
        data: {
          totalEnrolmentsChecked: enrolments.length,
          anomalyCount: anomalies.length,
          anomalies,
        },
      };
    } catch (error: unknown) {
      const message = error instanceof Error ? error.message : "Failed to run enrolment diagnostics";
      return { success: false, error: message };
    }
  }

  /**
   * Deletes a student and associated enrolments in a transaction.
   */
  static async deleteStudent(id: string): Promise<Result<boolean>> {
    try {
      let student = await prisma.student.findUnique({ where: { id } });
      if (!student) {
        student = await prisma.student.findFirst({
          where: { OR: [{ prn: id }, { rollNumber: id }] },
        });
      }
      if (!student) {
        return { success: false, error: "Student not found", code: "NOT_FOUND" };
      }

      const targetId = student.id;

      await prisma.$transaction(async (tx) => {
        await tx.enrolment.deleteMany({ where: { studentId: targetId } });
        await tx.student.delete({ where: { id: targetId } });
      });
      return { success: true, data: true };
    } catch (error: unknown) {
      const message = error instanceof Error ? error.message : "Failed to delete student";
      return { success: false, error: message };
    }
  }

  /**
   * Previews cohort progression candidates and evaluates eligibility without committing changes.
   */
  static async previewCohortProgression(params: {
    programmeId: string;
    semesterId: string;
    divisionId?: string;
    academicYearId: string;
  }): Promise<Result<CohortProgressionPreviewData>> {
    try {
      const { programmeId, semesterId, divisionId, academicYearId } = params;

      const [programme, currentSemester, sourceAy, sourceDiv] = await Promise.all([
        prisma.programme.findUnique({
          where: { id: programmeId },
          include: {
            semesters: {
              orderBy: { semesterNumber: "asc" },
              include: { divisions: { orderBy: { name: "asc" } } },
            },
          },
        }),
        prisma.semester.findUnique({ where: { id: semesterId } }),
        prisma.academicYear.findUnique({ where: { id: academicYearId } }),
        divisionId ? prisma.division.findUnique({ where: { id: divisionId } }) : null,
      ]);

      if (!programme) {
        return { success: false, error: "Programme not found in institutional database.", code: "PROGRAMME_NOT_FOUND" };
      }
      if (!currentSemester) {
        return { success: false, error: "Semester not found in institutional database.", code: "SEMESTER_NOT_FOUND" };
      }
      if (!sourceAy) {
        return { success: false, error: "Academic year not found in institutional database.", code: "AY_NOT_FOUND" };
      }

      const nextSemNumber = currentSemester.semesterNumber + 1;
      const destinationSemester = programme.semesters.find((s) => s.semesterNumber === nextSemNumber) || null;
      const isFinalSemester = !destinationSemester;

      const availableDestinationDivisions = destinationSemester
        ? destinationSemester.divisions.map((d) => ({
            id: d.id,
            name: d.name,
            maxCapacity: d.maxCapacity,
          }))
        : [];

      let destinationAy = sourceAy;
      if (currentSemester.semesterNumber % 2 === 0) {
        const nextAy = await prisma.academicYear.findFirst({
          where: {
            startDate: { gt: sourceAy.endDate },
          },
          orderBy: { startDate: "asc" },
        });
        if (nextAy) {
          destinationAy = nextAy;
        }
      }

      const enrolmentWhere: Prisma.EnrolmentWhereInput = {
        programmeId,
        semesterId,
        academicYearId,
        status: "ENROLLED",
      };
      if (divisionId) {
        enrolmentWhere.divisionId = divisionId;
      }

      const activeEnrolments = await prisma.enrolment.findMany({
        where: enrolmentWhere,
        include: {
          student: {
            include: {
              feeInvoices: {
                include: { receipts: true },
              },
            },
          },
          division: true,
        },
        orderBy: { student: { rollNumber: "asc" } },
      });

      const candidateStudentIds = activeEnrolments.map((e) => e.student.id);

      let existingDestinationEnrolments: Array<{ studentId: string }> = [];
      if (destinationSemester) {
        existingDestinationEnrolments = await prisma.enrolment.findMany({
          where: {
            studentId: { in: candidateStudentIds },
            semesterId: destinationSemester.id,
            academicYearId: destinationAy.id,
          },
          select: { studentId: true },
        });
      }
      const existingDestinationSet = new Set(existingDestinationEnrolments.map((e) => e.studentId));

      const candidates: CohortProgressionCandidate[] = activeEnrolments.map((e) => {
        const std = e.student;
        const totalBilled = std.feeInvoices.reduce((sum, inv) => sum + inv.totalDemand, 0);
        const totalPaid = std.feeInvoices.reduce(
          (sum, inv) => sum + inv.receipts.reduce((rSum, r) => rSum + r.amountPaid, 0),
          0
        );
        const feeStatus =
          totalBilled === 0
            ? "UNINVOICED"
            : totalPaid >= totalBilled
            ? "CLEARED"
            : totalPaid > 0
            ? "PARTIAL"
            : "PENDING";

        let isEligible = true;
        let ineligibilityReason: string | undefined = undefined;

        if (std.status === "INACTIVE" || std.status === "SUSPENDED") {
          isEligible = false;
          ineligibilityReason = `Student status is ${std.status}`;
        } else if (existingDestinationSet.has(std.id)) {
          isEligible = false;
          ineligibilityReason = `Already enrolled in destination term (Sem ${destinationSemester?.semesterNumber})`;
        } else if (isFinalSemester) {
          isEligible = false;
          ineligibilityReason = "Student has completed final curriculum semester (Graduation review required)";
        }

        return {
          id: std.id,
          fullName: std.fullName,
          rollNumber: std.rollNumber,
          prn: std.prn,
          currentSemester: std.currentSemester,
          currentDivisionName: e.division.name,
          currentEnrolmentId: e.id,
          attendanceRate: std.attendanceRate,
          feeStatus,
          studentStatus: std.status,
          isEligible,
          ineligibilityReason,
          hasExistingDestinationEnrolment: existingDestinationSet.has(std.id),
        };
      });

      return {
        success: true,
        data: {
          sourceProgramme: { id: programme.id, code: programme.code, name: programme.name },
          sourceSemester: { id: currentSemester.id, semesterNumber: currentSemester.semesterNumber },
          sourceDivision: sourceDiv ? { id: sourceDiv.id, name: sourceDiv.name } : null,
          sourceAcademicYear: { id: sourceAy.id, code: sourceAy.code, name: sourceAy.name },
          destinationSemester: destinationSemester
            ? { id: destinationSemester.id, semesterNumber: destinationSemester.semesterNumber }
            : null,
          isFinalSemester,
          availableDestinationDivisions,
          destinationAcademicYear: destinationAy
            ? { id: destinationAy.id, code: destinationAy.code, name: destinationAy.name }
            : null,
          candidates,
          summary: {
            totalCandidates: candidates.length,
            eligibleCount: candidates.filter((c) => c.isEligible).length,
            ineligibleCount: candidates.filter((c) => !c.isEligible).length,
          },
        },
      };
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : "Failed to preview cohort progression";
      return { success: false, error: msg };
    }
  }

  /**
   * Executes transactional batch progression of selected students into destination semester and division.
   * Atomically archives prior active enrolments as COMPLETED and establishes new active ENROLLED records.
   */
  static async executeCohortProgression(
    params: ExecuteCohortProgressionParams
  ): Promise<Result<CohortProgressionResult>> {
    try {
      const {
        studentIds,
        sourceSemesterId,
        destinationAcademicYearId,
        destinationSemesterId,
        destinationDivisionId,
      } = params;

      if (!studentIds || studentIds.length === 0) {
        return { success: false, error: "No students selected for cohort progression.", code: "NO_STUDENTS_SELECTED" };
      }

      const destSemester = await prisma.semester.findUnique({
        where: { id: destinationSemesterId },
        include: { programme: true },
      });
      if (!destSemester) {
        return { success: false, error: "Destination semester not found in database.", code: "SEMESTER_NOT_FOUND" };
      }

      const destDivision = await prisma.division.findUnique({
        where: { id: destinationDivisionId },
      });
      if (!destDivision || destDivision.semesterId !== destSemester.id) {
        return {
          success: false,
          error: "Selected destination division does not belong to the destination semester.",
          code: "DIVISION_SEMESTER_MISMATCH",
        };
      }

      const destAy = await prisma.academicYear.findUnique({
        where: { id: destinationAcademicYearId },
      });
      if (!destAy) {
        return { success: false, error: "Destination academic year not found.", code: "ACADEMIC_YEAR_NOT_FOUND" };
      }

      const result = await prisma.$transaction(async (tx) => {
        const successfulIds: string[] = [];
        const failedRecords: Array<{ id: string; reason: string }> = [];

        for (const studentId of studentIds) {
          const student = await tx.student.findUnique({
            where: { id: studentId },
            include: {
              enrolments: {
                where: { semesterId: sourceSemesterId, status: "ENROLLED" },
              },
            },
          });

          if (!student) {
            failedRecords.push({ id: studentId, reason: "Student record not found" });
            continue;
          }

          if (student.status === "SUSPENDED" || student.status === "INACTIVE") {
            failedRecords.push({ id: studentId, reason: `Student status is ${student.status}` });
            continue;
          }

          const existingDest = await tx.enrolment.findUnique({
            where: {
              studentId_academicYearId_semesterId: {
                studentId,
                academicYearId: destinationAcademicYearId,
                semesterId: destinationSemesterId,
              },
            },
          });

          if (existingDest) {
            failedRecords.push({ id: studentId, reason: "Already enrolled in destination academic term" });
            continue;
          }

          // Archive source active enrolment(s) as COMPLETED
          await tx.enrolment.updateMany({
            where: {
              studentId,
              semesterId: sourceSemesterId,
              status: "ENROLLED",
            },
            data: { status: "COMPLETED" },
          });

          // Create new destination enrolment
          await tx.enrolment.create({
            data: {
              studentId,
              academicYearId: destinationAcademicYearId,
              programmeId: destSemester.programmeId,
              semesterId: destinationSemesterId,
              divisionId: destinationDivisionId,
              status: "ENROLLED",
            },
          });

          // Update student currentSemester
          await tx.student.update({
            where: { id: studentId },
            data: {
              currentSemester: destSemester.semesterNumber,
            },
          });

          successfulIds.push(studentId);
        }

        return {
          totalProcessed: studentIds.length,
          successfulIds,
          failedRecords,
          destinationSemesterNumber: destSemester.semesterNumber,
          destinationDivisionName: destDivision.name,
        };
      });

      return { success: true, data: result };
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : "Transactional cohort progression failed";
      return { success: false, error: msg };
    }
  }

  /**
   * Advances a single student to a new semester and division, archiving prior active placement.
   */
  static async progressSingleStudent(params: {
    studentId: string;
    destinationAcademicYearId: string;
    destinationSemesterId: string;
    destinationDivisionId: string;
  }): Promise<Result<StudentWithEnrolment>> {
    try {
      const { studentId, destinationAcademicYearId, destinationSemesterId, destinationDivisionId } = params;

      const student = await prisma.student.findUnique({
        where: { id: studentId },
        include: {
          enrolments: {
            orderBy: { enrolledAt: "desc" },
            include: { semester: true },
          },
        },
      });

      if (!student) {
        return { success: false, error: "Student not found in institutional database.", code: "NOT_FOUND" };
      }

      const destSemester = await prisma.semester.findUnique({
        where: { id: destinationSemesterId },
        include: { programme: true },
      });
      if (!destSemester) {
        return { success: false, error: "Destination semester not found.", code: "SEMESTER_NOT_FOUND" };
      }

      const destDivision = await prisma.division.findUnique({
        where: { id: destinationDivisionId },
      });
      if (!destDivision || destDivision.semesterId !== destSemester.id) {
        return { success: false, error: "Division does not match destination semester.", code: "DIVISION_SEMESTER_MISMATCH" };
      }

      const result = await prisma.$transaction(async (tx) => {
        // Archive prior active enrolments as COMPLETED
        const activeEnrolments = student.enrolments.filter((e) => e.status === "ENROLLED");
        for (const enr of activeEnrolments) {
          await tx.enrolment.update({
            where: { id: enr.id },
            data: { status: "COMPLETED" },
          });
        }

        // Check if enrolment for this destination term already exists
        const existing = await tx.enrolment.findUnique({
          where: {
            studentId_academicYearId_semesterId: {
              studentId,
              academicYearId: destinationAcademicYearId,
              semesterId: destinationSemesterId,
            },
          },
        });

        if (existing) {
          await tx.enrolment.update({
            where: { id: existing.id },
            data: {
              divisionId: destinationDivisionId,
              status: "ENROLLED",
            },
          });
        } else {
          await tx.enrolment.create({
            data: {
              studentId,
              academicYearId: destinationAcademicYearId,
              programmeId: destSemester.programmeId,
              semesterId: destinationSemesterId,
              divisionId: destinationDivisionId,
              status: "ENROLLED",
            },
          });
        }

        const updatedStudent = await tx.student.update({
          where: { id: studentId },
          data: {
            currentSemester: destSemester.semesterNumber,
          },
          include: {
            enrolments: {
              include: {
                academicYear: true,
                programme: true,
                semester: true,
                division: true,
              },
              orderBy: { enrolledAt: "desc" },
            },
            feeInvoices: {
              include: {
                receipts: true,
              },
            },
          },
        });

        return updatedStudent;
      });

      return { success: true, data: result };
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : "Failed to progress student";
      return { success: false, error: msg };
    }
  }

  // ==========================================
  // MILESTONE 2A.3: STUDENT DOCUMENT MANAGEMENT
  // ==========================================

  /**
   * Retrieves all documents, verification history, and category breakdowns for a student.
   */
  static async getStudentDocuments(studentId: string): Promise<Result<StudentDocumentsSummary>> {
    try {
      const student = await prisma.student.findUnique({ where: { id: studentId } });
      if (!student) {
        return { success: false, error: `Student '${studentId}' not found.`, code: "NOT_FOUND" };
      }

      const rawDocs = await prisma.studentDocument.findMany({
        where: { studentId },
        include: {
          uploadedByUser: { select: { id: true, fullName: true, role: true } },
          verifications: {
            include: {
              reviewer: { select: { id: true, fullName: true, role: true } },
            },
            orderBy: { createdAt: "desc" },
          },
        },
        orderBy: [{ isArchived: "asc" }, { createdAt: "desc" }],
      });

      const documents: StudentDocumentDTO[] = rawDocs.map((d) => ({
        id: d.id,
        studentId: d.studentId,
        category: d.category as DocumentCategory,
        categoryLabel: DOCUMENT_CATEGORY_LABELS[d.category as DocumentCategory] || d.category,
        originalFileName: d.originalFileName,
        mimeType: d.mimeType,
        fileSize: d.fileSize,
        storageProvider: d.storageProvider,
        storageKey: d.storageKey,
        checksum: d.checksum,
        status: d.status,
        version: d.version,
        isArchived: d.isArchived,
        uploadedByUserId: d.uploadedByUserId,
        uploadedByUserName: d.uploadedByUser.fullName,
        replacedDocumentId: d.replacedDocumentId,
        createdAt: d.createdAt,
        updatedAt: d.updatedAt,
        verifications: d.verifications.map((v) => ({
          id: v.id,
          documentId: v.documentId,
          reviewerUserId: v.reviewerUserId,
          reviewerName: v.reviewer.fullName,
          previousStatus: v.previousStatus,
          newStatus: v.newStatus,
          reason: v.reason,
          createdAt: v.createdAt,
        })),
      }));

      const activeDocs = documents.filter((d) => !d.isArchived && d.status !== "SUPERSEDED");

      const totalCount = activeDocs.length;
      const verifiedCount = activeDocs.filter((d) => d.status === "VERIFIED").length;
      const pendingCount = activeDocs.filter((d) => d.status === "PENDING_VERIFICATION").length;
      const rejectedCount = activeDocs.filter((d) => d.status === "REJECTED").length;

      const categoriesBreakdown = ALLOWED_DOCUMENT_CATEGORIES.map((cat) => {
        const found = activeDocs.find((d) => d.category === cat) || null;
        let catStatus: "UPLOADED" | "VERIFIED" | "REJECTED" | "MISSING" = "MISSING";
        if (found) {
          if (found.status === "VERIFIED") catStatus = "VERIFIED";
          else if (found.status === "REJECTED") catStatus = "REJECTED";
          else catStatus = "UPLOADED";
        }
        return {
          category: cat,
          label: DOCUMENT_CATEGORY_LABELS[cat],
          document: found,
          status: catStatus,
          isUploaded: found !== null,
        };
      });

      return {
        success: true,
        data: {
          totalCount,
          verifiedCount,
          pendingCount,
          rejectedCount,
          documents,
          categoriesBreakdown,
        },
      };
    } catch (err) {
      const msg = err instanceof Error ? err.message : "Failed to retrieve student documents";
      return { success: false, error: msg };
    }
  }

  /**
   * Uploads an institutional document for a student with validating magic bytes,
   * safe key generation, private file storage, database metadata persistence,
   * and compensating cleanup upon database transaction failure.
   */
  static async uploadStudentDocument(params: {
    studentId: string;
    category: DocumentCategory;
    buffer: Buffer;
    originalFileName: string;
    reportedMimeType?: string;
    uploadedByUserId: string;
  }): Promise<Result<StudentDocument>> {
    const { studentId, category, buffer, originalFileName, reportedMimeType, uploadedByUserId } = params;

    // 1. File validation
    const validation = validateDocumentFile(buffer, originalFileName, reportedMimeType);
    if (!validation.isValid || !validation.mimeType || !validation.checksum || !validation.sanitizedOriginalName || !validation.extension) {
      return { success: false, error: validation.error || "File validation failed", code: validation.code || "VALIDATION_FAILED" };
    }

    // 2. Category validation
    if (!isValidDocumentCategory(category)) {
      return { success: false, error: `Invalid document category '${category}'.`, code: "INVALID_CATEGORY" };
    }

    // 3. Verify student exists
    const student = await prisma.student.findUnique({ where: { id: studentId } });
    if (!student) {
      return { success: false, error: `Student '${studentId}' not found in institutional database.`, code: "STUDENT_NOT_FOUND" };
    }

    // 4. Verify uploader user exists
    const uploader = await prisma.userAccount.findUnique({ where: { id: uploadedByUserId } });
    if (!uploader) {
      return { success: false, error: "Uploader user account not found.", code: "USER_NOT_FOUND" };
    }

    // 5. Generate safe, unpredictable internal storage key
    const storageKey = generateSafeStorageKey(studentId, category, validation.extension);
    const storage = getDocumentStorageProvider();

    // 6. Write binary to private storage
    try {
      await storage.storeDocument(storageKey, buffer, validation.mimeType);
    } catch (storageErr) {
      const msg = storageErr instanceof Error ? storageErr.message : "Storage write failure";
      return { success: false, error: `Failed to write file to private storage: ${msg}`, code: "STORAGE_WRITE_FAILED" };
    }

    // 7. Persist metadata via Prisma transaction with compensating cleanup
    try {
      const result = await prisma.$transaction(async (tx) => {
        // Check for existing active document in same category
        const existingActive = await tx.studentDocument.findFirst({
          where: {
            studentId,
            category,
            isArchived: false,
            status: { not: "SUPERSEDED" },
          },
          orderBy: { version: "desc" },
        });

        let nextVersion = 1;
        let replacedDocId: string | null = null;

        if (existingActive) {
          nextVersion = existingActive.version + 1;
          replacedDocId = existingActive.id;
          await tx.studentDocument.update({
            where: { id: existingActive.id },
            data: {
              isArchived: true,
              status: "SUPERSEDED",
            },
          });
        }

        const newDoc = await tx.studentDocument.create({
          data: {
            studentId,
            category,
            originalFileName: validation.sanitizedOriginalName!,
            mimeType: validation.mimeType!,
            fileSize: buffer.length,
            storageProvider: getStorageStatus().providerType || "LOCAL_PRIVATE",
            storageKey,
            checksum: validation.checksum!,
            status: "PENDING_VERIFICATION",
            version: nextVersion,
            isArchived: false,
            uploadedByUserId,
            replacedDocumentId: replacedDocId,
          },
        });

        // Create initial verification audit entry
        await tx.studentDocumentVerification.create({
          data: {
            documentId: newDoc.id,
            reviewerUserId: uploadedByUserId,
            previousStatus: existingActive ? "SUPERSEDED" : "NONE",
            newStatus: "PENDING_VERIFICATION",
            reason: existingActive ? `Uploaded replacement version ${nextVersion}` : "Initial document submission",
          },
        });

        return newDoc;
      });

      return { success: true, data: result };
    } catch (dbError) {
      // COMPENSATING CLEANUP: Remove stored file since metadata persistence failed
      console.error("[STORAGE_COMPENSATION] Database transaction failed. Initiating compensating cleanup for:", storageKey);
      try {
        const deleted = await storage.deleteDocument(storageKey);
        if (!deleted) {
          console.warn(`[ORPHAN_STORAGE_ALERT] File at '${storageKey}' could not be deleted after DB failure. Student ID: ${studentId}`);
        }
      } catch (cleanupErr) {
        console.error(`[ORPHAN_STORAGE_ALERT] Compensating cleanup error for '${storageKey}':`, cleanupErr);
      }
      const msg = dbError instanceof Error ? dbError.message : "Database error persisting document metadata";
      return { success: false, error: msg, code: "TRANSACTION_FAILED" };
    }
  }

  /**
   * Performs an authorized verification or rejection decision on a document.
   * Enforces that rejection reasons are mandatory and non-empty.
   * Records decision in append-only StudentDocumentVerification audit model.
   */
  static async verifyStudentDocument(params: {
    documentId: string;
    reviewerUserId: string;
    decision: "VERIFIED" | "REJECTED";
    reason?: string;
  }): Promise<Result<StudentDocument>> {
    const { documentId, reviewerUserId, decision, reason } = params;

    if (decision !== "VERIFIED" && decision !== "REJECTED") {
      return { success: false, error: "Decision must be either 'VERIFIED' or 'REJECTED'.", code: "INVALID_DECISION" };
    }

    if (decision === "REJECTED" && (!reason || reason.trim().length === 0)) {
      return { success: false, error: "A rejection reason is mandatory when rejecting an institutional document.", code: "REASON_REQUIRED" };
    }

    const reviewer = await prisma.userAccount.findUnique({ where: { id: reviewerUserId } });
    if (!reviewer) {
      return { success: false, error: "Reviewer user account not found.", code: "USER_NOT_FOUND" };
    }

    const doc = await prisma.studentDocument.findUnique({ where: { id: documentId } });
    if (!doc) {
      return { success: false, error: "Document not found.", code: "NOT_FOUND" };
    }

    if (doc.status === "SUPERSEDED") {
      return { success: false, error: "Cannot verify or reject a superseded historical document version.", code: "SUPERSEDED_DOCUMENT" };
    }

    const previousStatus = doc.status;

    try {
      const result = await prisma.$transaction(async (tx) => {
        const updatedDoc = await tx.studentDocument.update({
          where: { id: documentId },
          data: {
            status: decision,
          },
        });

        await tx.studentDocumentVerification.create({
          data: {
            documentId,
            reviewerUserId,
            previousStatus,
            newStatus: decision,
            reason: reason?.trim() || null,
          },
        });

        return updatedDoc;
      });

      return { success: true, data: result };
    } catch (err) {
      const msg = err instanceof Error ? err.message : "Failed to record document verification";
      return { success: false, error: msg };
    }
  }

  /**
   * Replaces an existing document with a new binary version.
   * Links to the previous version via replacedDocumentId and archives the previous document.
   */
  static async replaceStudentDocument(params: {
    documentId: string;
    buffer: Buffer;
    originalFileName: string;
    reportedMimeType?: string;
    uploadedByUserId: string;
  }): Promise<Result<StudentDocument>> {
    const { documentId, buffer, originalFileName, reportedMimeType, uploadedByUserId } = params;

    const existingDoc = await prisma.studentDocument.findUnique({ where: { id: documentId } });
    if (!existingDoc) {
      return { success: false, error: "Target document to replace was not found.", code: "NOT_FOUND" };
    }

    return this.uploadStudentDocument({
      studentId: existingDoc.studentId,
      category: existingDoc.category as DocumentCategory,
      buffer,
      originalFileName,
      reportedMimeType,
      uploadedByUserId,
    });
  }

  /**
   * Retrieves a document record and reads its binary buffer from private storage for authorized download.
   */
  static async getDocumentForDownload(documentId: string): Promise<Result<{
    document: StudentDocument;
    buffer: Buffer;
  }>> {
    try {
      const doc = await prisma.studentDocument.findUnique({
        where: { id: documentId },
        include: { student: true },
      });
      if (!doc) {
        return { success: false, error: "Document not found.", code: "NOT_FOUND" };
      }

      const storage = getDocumentStorageProvider();
      const buffer = await storage.readDocument(doc.storageKey);
      if (!buffer) {
        return {
          success: false,
          error: "Document binary file not found in storage archive.",
          code: "STORAGE_FILE_MISSING",
        };
      }

      return {
        success: true,
        data: {
          document: doc,
          buffer,
        },
      };
    } catch (err) {
      const msg = err instanceof Error ? err.message : "Failed to read document";
      return { success: false, error: msg };
    }
  }
}



