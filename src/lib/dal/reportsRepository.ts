import prisma from "@/lib/db";
import { Prisma } from "@prisma/client";
import { Result } from "./types";

export interface ReportFilterOptions {
  academicYears: Array<{ id: string; code: string; name: string; isCurrent: boolean }>;
  programmes: Array<{ id: string; code: string; name: string }>;
  semesters: Array<{ id: string; semesterNumber: number; programmeId: string }>;
  divisions: Array<{ id: string; name: string; semesterId: string }>;
  examSessions: Array<{ id: string; sessionCode: string; name: string }>;
}

export interface ReportFilterParams {
  academicYearId?: string;
  programmeId?: string;
  semesterId?: string;
  divisionId?: string;
  examSessionId?: string;
}

export interface AttendanceSummaryItem {
  programmeCode: string;
  programmeName: string;
  semesterNumber: number;
  divisionName: string;
  subjectCode: string;
  subjectTitle: string;
  facultyName: string;
  totalSessions: number;
  totalMarksCount: number;
  presentCount: number;
  absentCount: number;
  lateCount: number;
  excusedCount: number;
  averageAttendanceRate: number;
}

export interface StudentAttendanceRegisterItem {
  studentId: string;
  rollNumber: string;
  prn: string;
  fullName: string;
  programmeCode: string;
  semesterNumber: number;
  divisionName: string;
  totalSessionsHeld: number;
  sessionsAttended: number; // Present + Late
  sessionsAbsent: number;
  sessionsExcused: number;
  attendancePercentage: number;
  isEligibleForExams: boolean; // Reference benchmark threshold (>= 75.0%, subject to programme/regulatory verification)
}

export interface ExamResultReportItem {
  resultId: string;
  sessionCode: string;
  sessionName: string;
  rollNumber: string;
  prn: string;
  studentName: string;
  programmeCode: string;
  semesterNumber: number;
  totalMaxMarks: number;
  totalMarksObtained: number | null;
  percentage: number | null;
  sgpa: number | null;
  letterGrade: string | null;
  resultStatus: string;
  approvalStatus: string;
  publishedAt: Date | null;
}

export interface FinanceCollectionReportItem {
  invoiceId: string;
  invoiceNumber: string;
  rollNumber: string;
  studentName: string;
  programmeCode: string;
  totalDemand: number;
  totalPaid: number;
  outstandingBalance: number;
  status: string;
  dueDate: Date;
  receiptCount: number;
  lastPaymentDate: Date | null;
}

export interface DefaulterReportItem {
  studentId: string;
  rollNumber: string;
  fullName: string;
  programmeCode: string;
  semesterNumber?: number;
  totalDemand: number;
  totalPaid: number;
  outstandingBalance: number;
  status: string;
  guardianName?: string | null;
  guardianPhone?: string | null;
}

export interface PaymentMethodDistributionItem {
  paymentMethod: string;
  receiptCount: number;
  totalCollected: number;
}

export interface FinanceCollectionReportData {
  summary: {
    totalDemand: number;
    totalPaid: number;
    outstanding: number;
    collectionRate: number;
    invoiceCount: number;
    paymentMethodDistribution: PaymentMethodDistributionItem[];
  };
  items: FinanceCollectionReportItem[];
}

export interface ProgrammeEnrolmentReportItem {
  programmeId: string;
  code: string;
  name: string;
  degreeLevel: string;
  durationYears: number;
  totalSemesters: number;
  totalEnrolled: number;
  activeEnrolments: number;
  maleCount: number;
  femaleCount: number;
  otherCount: number;
}

export class ReportsRepository {
  /**
   * Retrieves filter options populated from genuine database records.
   */
  static async getFilterOptions(): Promise<Result<ReportFilterOptions>> {
    try {
      const [academicYears, programmes, semesters, divisions, examSessions] = await Promise.all([
        prisma.academicYear.findMany({
          orderBy: { startDate: "desc" },
          select: { id: true, code: true, name: true, isCurrent: true },
        }),
        prisma.programme.findMany({
          orderBy: { code: "asc" },
          select: { id: true, code: true, name: true },
        }),
        prisma.semester.findMany({
          orderBy: [{ programmeId: "asc" }, { semesterNumber: "asc" }],
          select: { id: true, semesterNumber: true, programmeId: true },
        }),
        prisma.division.findMany({
          orderBy: { name: "asc" },
          select: { id: true, name: true, semesterId: true },
        }),
        prisma.examSession.findMany({
          orderBy: { startDate: "desc" },
          select: { id: true, sessionCode: true, name: true },
        }),
      ]);

      return {
        success: true,
        data: {
          academicYears,
          programmes,
          semesters,
          divisions,
          examSessions,
        },
      };
    } catch (error: unknown) {
      console.error("[ReportsRepository.getFilterOptions Error]:", error);
      return {
        success: false,
        error: "Failed to load report filter options from database.",
        code: "DATABASE_ERROR",
      };
    }
  }

  /**
   * Generates Attendance Summary grouped by subject, cohort, and semester.
   */
  static async getAttendanceSummaryReport(
    filters: ReportFilterParams = {}
  ): Promise<Result<AttendanceSummaryItem[]>> {
    try {
      const whereSession: Prisma.AttendanceSessionWhereInput = {};
      if (filters.semesterId && filters.semesterId !== "all") {
        whereSession.semesterId = filters.semesterId;
      }
      if (filters.divisionId && filters.divisionId !== "all") {
        whereSession.divisionId = filters.divisionId;
      }

      const sessions = await prisma.attendanceSession.findMany({
        where: whereSession,
        include: {
          subject: true,
          faculty: true,
          semester: { include: { programme: true } },
          division: true,
          attendanceRecords: true,
        },
        orderBy: { sessionDate: "desc" },
      });

      // Filter by programme if requested
      const filteredSessions = filters.programmeId && filters.programmeId !== "all"
        ? sessions.filter((s) => s.semester.programmeId === filters.programmeId)
        : sessions;

      // Group by subjectId + divisionId
      const groups = new Map<string, AttendanceSummaryItem>();

      for (const sess of filteredSessions) {
        const divisionKey = sess.divisionId || "none";
        const key = `${sess.subjectId}_${divisionKey}`;
        let item = groups.get(key);

        if (!item) {
          item = {
            programmeCode: sess.semester.programme.code,
            programmeName: sess.semester.programme.name,
            semesterNumber: sess.semester.semesterNumber,
            divisionName: sess.division?.name || "Consolidated",
            subjectCode: sess.subject.code,
            subjectTitle: sess.subject.title,
            facultyName: sess.faculty.fullName,
            totalSessions: 0,
            totalMarksCount: 0,
            presentCount: 0,
            absentCount: 0,
            lateCount: 0,
            excusedCount: 0,
            averageAttendanceRate: 0,
          };
          groups.set(key, item);
        }

        item.totalSessions += 1;
        for (const rec of sess.attendanceRecords) {
          item.totalMarksCount += 1;
          if (rec.status === "PRESENT") item.presentCount += 1;
          else if (rec.status === "ABSENT") item.absentCount += 1;
          else if (rec.status === "LATE") item.lateCount += 1;
          else if (rec.status === "EXCUSED") item.excusedCount += 1;
        }
      }

      // Calculate rates
      const results: AttendanceSummaryItem[] = Array.from(groups.values()).map((item) => {
        const attended = item.presentCount + item.lateCount;
        const rate = item.totalMarksCount > 0 ? (attended / item.totalMarksCount) * 100 : 0;
        return {
          ...item,
          averageAttendanceRate: Math.round(rate * 10) / 10,
        };
      });

      return { success: true, data: results };
    } catch (error: unknown) {
      console.error("[ReportsRepository.getAttendanceSummaryReport Error]:", error);
      return {
        success: false,
        error: "Failed to generate attendance summary report.",
        code: "DATABASE_ERROR",
      };
    }
  }

  /**
   * Generates Student Attendance Register with 75% University of Mumbai compliance status.
   */
  static async getStudentAttendanceRegister(
    filters: ReportFilterParams = {}
  ): Promise<Result<StudentAttendanceRegisterItem[]>> {
    try {
      const whereEnrolment: Prisma.EnrolmentWhereInput = {};
      if (filters.programmeId && filters.programmeId !== "all") {
        whereEnrolment.programmeId = filters.programmeId;
      }
      if (filters.semesterId && filters.semesterId !== "all") {
        whereEnrolment.semesterId = filters.semesterId;
      }
      if (filters.divisionId && filters.divisionId !== "all") {
        whereEnrolment.divisionId = filters.divisionId;
      }

      const students = await prisma.student.findMany({
        where: {
          enrolments: { some: whereEnrolment },
        },
        include: {
          enrolments: {
            where: whereEnrolment,
            include: { programme: true, semester: true, division: true },
            take: 1,
            orderBy: { enrolledAt: "desc" },
          },
          attendanceRecords: {
            include: { session: true },
          },
        },
        orderBy: { rollNumber: "asc" },
      });

      const register: StudentAttendanceRegisterItem[] = students.map((s) => {
        const activeEnrolment = s.enrolments[0];
        // Scope attendance records to the active enrolment semester if available
        const records = activeEnrolment
          ? s.attendanceRecords.filter((r) => r.session.semesterId === activeEnrolment.semesterId)
          : s.attendanceRecords;

        const totalHeld = records.length;
        const present = records.filter((r) => r.status === "PRESENT").length;
        const late = records.filter((r) => r.status === "LATE").length;
        const absent = records.filter((r) => r.status === "ABSENT").length;
        const excused = records.filter((r) => r.status === "EXCUSED").length;

        const attended = present + late;
        const percentage = totalHeld > 0 ? Math.round((attended / totalHeld) * 1000) / 10 : 0;

        return {
          studentId: s.id,
          rollNumber: s.rollNumber,
          prn: s.prn,
          fullName: s.fullName,
          programmeCode: activeEnrolment?.programme.code || "N/A",
          semesterNumber: activeEnrolment?.semester.semesterNumber || 1,
          divisionName: activeEnrolment?.division?.name || "N/A",
          totalSessionsHeld: totalHeld,
          sessionsAttended: attended,
          sessionsAbsent: absent,
          sessionsExcused: excused,
          attendancePercentage: percentage,
          // Reference benchmark: 75% attendance threshold guideline (subject to institutional/programme regulation verification)
          // Requires actual attendance sessions held (> 0) and meeting 75% threshold
          isEligibleForExams: totalHeld > 0 && percentage >= 75.0,
        };
      });

      return { success: true, data: register };
    } catch (error: unknown) {
      console.error("[ReportsRepository.getStudentAttendanceRegister Error]:", error);
      return {
        success: false,
        error: "Failed to generate student attendance register.",
        code: "DATABASE_ERROR",
      };
    }
  }

  /**
   * Generates Examination Marks & Results Report.
   */
  static async getExamResultsReport(
    filters: ReportFilterParams = {}
  ): Promise<Result<ExamResultReportItem[]>> {
    try {
      const where: Prisma.ExamResultSummaryWhereInput = {};
      if (filters.examSessionId && filters.examSessionId !== "all") {
        where.examSessionId = filters.examSessionId;
      }
      if (filters.semesterId && filters.semesterId !== "all") {
        where.semesterId = filters.semesterId;
      }

      const results = await prisma.examResultSummary.findMany({
        where,
        include: {
          examSession: true,
          student: true,
          semester: { include: { programme: true } },
        },
        orderBy: [{ examSession: { startDate: "desc" } }, { student: { rollNumber: "asc" } }],
      });

      const filtered = filters.programmeId && filters.programmeId !== "all"
        ? results.filter((r) => r.semester.programmeId === filters.programmeId)
        : results;

      const items: ExamResultReportItem[] = filtered.map((r) => ({
        resultId: r.id,
        sessionCode: r.examSession.sessionCode,
        sessionName: r.examSession.name,
        rollNumber: r.student.rollNumber,
        prn: r.student.prn,
        studentName: r.student.fullName,
        programmeCode: r.semester.programme.code,
        semesterNumber: r.semester.semesterNumber,
        totalMaxMarks: r.totalMaxMarks,
        totalMarksObtained: r.totalMarksObtained,
        percentage: r.percentage,
        sgpa: r.sgpa,
        letterGrade: r.letterGrade,
        resultStatus: r.resultStatus,
        approvalStatus: r.approvalStatus,
        publishedAt: r.publishedAt,
      }));

      return { success: true, data: items };
    } catch (error: unknown) {
      console.error("[ReportsRepository.getExamResultsReport Error]:", error);
      return {
        success: false,
        error: "Failed to generate examination results report.",
        code: "DATABASE_ERROR",
      };
    }
  }

  /**
   * Generates Fee Collection and Invoicing Summary.
   */
  static async getFinanceCollectionReport(
    filters: ReportFilterParams = {}
  ): Promise<Result<FinanceCollectionReportData>> {
    try {
      const invoices = await prisma.studentFeeInvoice.findMany({
        include: {
          student: true,
          enrolment: { include: { programme: true } },
          receipts: { orderBy: { paymentDate: "desc" } },
        },
        orderBy: { createdAt: "desc" },
      });

      const filtered = filters.programmeId && filters.programmeId !== "all"
        ? invoices.filter((i) => i.enrolment.programmeId === filters.programmeId)
        : invoices;

      let totalDemand = 0;
      let totalPaid = 0;
      const paymentMethodMap = new Map<string, { count: number; total: number }>();

      const items: FinanceCollectionReportItem[] = filtered.map((inv) => {
        const paid = inv.receipts.reduce((sum, r) => sum + r.amountPaid, 0);
        const balance = Math.max(0, inv.totalDemand - paid);
        totalDemand += inv.totalDemand;
        totalPaid += paid;

        // Tally payment methods from receipts
        for (const rec of inv.receipts) {
          const method = rec.paymentMethod || "OTHER";
          const current = paymentMethodMap.get(method) || { count: 0, total: 0 };
          current.count += 1;
          current.total += rec.amountPaid;
          paymentMethodMap.set(method, current);
        }

        return {
          invoiceId: inv.id,
          invoiceNumber: inv.invoiceNumber,
          rollNumber: inv.student.rollNumber,
          studentName: inv.student.fullName,
          programmeCode: inv.enrolment.programme.code,
          totalDemand: inv.totalDemand,
          totalPaid: paid,
          outstandingBalance: balance,
          status: inv.status,
          dueDate: inv.dueDate,
          receiptCount: inv.receipts.length,
          lastPaymentDate: inv.receipts[0]?.paymentDate || null,
        };
      });

      const outstanding = Math.max(0, totalDemand - totalPaid);
      const collectionRate = totalDemand > 0 ? Math.round((totalPaid / totalDemand) * 1000) / 10 : 0;

      const paymentMethodDistribution: PaymentMethodDistributionItem[] = Array.from(
        paymentMethodMap.entries()
      ).map(([method, data]) => ({
        paymentMethod: method,
        receiptCount: data.count,
        totalCollected: data.total,
      }));

      return {
        success: true,
        data: {
          summary: {
            totalDemand,
            totalPaid,
            outstanding,
            collectionRate,
            invoiceCount: items.length,
            paymentMethodDistribution,
          },
          items,
        },
      };
    } catch (error: unknown) {
      console.error("[ReportsRepository.getFinanceCollectionReport Error]:", error);
      return {
        success: false,
        error: "Failed to generate finance collection report.",
        code: "DATABASE_ERROR",
      };
    }
  }

  /**
   * Generates Fee Defaulter / Outstanding Dues Report.
   */
  static async getDefaultersReport(
    filters: ReportFilterParams = {}
  ): Promise<Result<DefaulterReportItem[]>> {
    try {
      const invoices = await prisma.studentFeeInvoice.findMany({
        where: {
          status: { in: ["PENDING", "PARTIALLY_PAID", "OVERDUE"] },
        },
        include: {
          student: true,
          enrolment: { include: { programme: true, semester: true } },
          receipts: true,
        },
        orderBy: { totalDemand: "desc" },
      });

      const filtered = filters.programmeId && filters.programmeId !== "all"
        ? invoices.filter((i) => i.enrolment.programmeId === filters.programmeId)
        : invoices;

      const defaulters: DefaulterReportItem[] = [];

      for (const inv of filtered) {
        const paid = inv.receipts.reduce((sum, r) => sum + r.amountPaid, 0);
        const balance = inv.totalDemand - paid;

        if (balance > 0) {
          defaulters.push({
            studentId: inv.student.id,
            rollNumber: inv.student.rollNumber,
            fullName: inv.student.fullName,
            programmeCode: inv.enrolment.programme.code,
            semesterNumber: inv.enrolment.semester?.semesterNumber,
            totalDemand: inv.totalDemand,
            totalPaid: paid,
            outstandingBalance: balance,
            status: inv.status,
            guardianName: inv.student.guardianName,
            guardianPhone: inv.student.guardianPhone,
          });
        }
      }

      return { success: true, data: defaulters };
    } catch (error: unknown) {
      console.error("[ReportsRepository.getDefaultersReport Error]:", error);
      return {
        success: false,
        error: "Failed to generate defaulters report.",
        code: "DATABASE_ERROR",
      };
    }
  }

  /**
   * Generates Programme Enrolment Summary with demographic breakdown.
   */
  static async getProgrammeEnrolmentReport(): Promise<Result<ProgrammeEnrolmentReportItem[]>> {
    try {
      const programmes = await prisma.programme.findMany({
        include: {
          semesters: true,
          enrolments: {
            include: { student: true },
          },
        },
        orderBy: { code: "asc" },
      });

      const reports: ProgrammeEnrolmentReportItem[] = programmes.map((p) => {
        // Distinct students
        const studentMap = new Map<string, { gender: string | null; status: string }>();
        for (const e of p.enrolments) {
          if (!studentMap.has(e.studentId)) {
            studentMap.set(e.studentId, {
              gender: e.student.gender,
              status: e.student.status,
            });
          }
        }

        let male = 0;
        let female = 0;
        let other = 0;
        let active = 0;

        for (const s of studentMap.values()) {
          if (s.gender?.toUpperCase() === "MALE") male += 1;
          else if (s.gender?.toUpperCase() === "FEMALE") female += 1;
          else other += 1;

          if (s.status === "ACTIVE") active += 1;
        }

        return {
          programmeId: p.id,
          code: p.code,
          name: p.name,
          degreeLevel: p.degreeLevel,
          durationYears: p.durationYears,
          totalSemesters: p.semesters.length || p.durationYears * 2,
          totalEnrolled: studentMap.size,
          activeEnrolments: active,
          maleCount: male,
          femaleCount: female,
          otherCount: other,
        };
      });

      return { success: true, data: reports };
    } catch (error: unknown) {
      console.error("[ReportsRepository.getProgrammeEnrolmentReport Error]:", error);
      return {
        success: false,
        error: "Failed to generate programme enrolment report.",
        code: "DATABASE_ERROR",
      };
    }
  }
}
