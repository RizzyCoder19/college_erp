import prisma from "@/lib/db";
import { Prisma } from "@prisma/client";
import { Result } from "./types";

export interface CreateExamSessionDTO {
  academicYearId: string;
  name: string;
  sessionCode: string;
  sessionType?: "REGULAR" | "ATKT_SUPPLEMENTARY" | "REVALUATION";
  startDate: string | Date;
  endDate: string | Date;
  status?: string;
}

export interface CreateAssessmentComponentDTO {
  examSessionId: string;
  subjectId: string;
  name: string;
  componentType: "THEORY_SEE" | "INTERNAL_IA" | "PRACTICAL_SEE" | "VIVA_VOCE";
  maxMarks: number;
  minPassingMarks?: number;
  weightagePercentage?: number;
}

export interface MarkEntryDTO {
  studentId: string;
  enrolmentId: string;
  marksObtained: number | null; // null = unentered/pending
  entryStatus: "PENDING" | "ENTERED" | "ABSENT" | "EXEMPT" | "WITHHELD" | "MEDICAL_LEAVE";
  remarks?: string;
}

export interface RecordMarksDTO {
  componentId: string;
  entries: MarkEntryDTO[];
  enteredById: string;
  isFacultyScoped?: boolean;
  facultyStaffId?: string;
}

export interface ModerateMarksDTO {
  entryId: string;
  moderatedMarks: number;
  moderatedById: string;
  reason: string;
}

export interface AmendPublishedMarkDTO {
  entryId: string;
  newScore: number;
  reason: string;
  revisedById: string;
}

// 10-point Mumbai University CBCS conversion helper
export function computeGradePoint(percentage: number): { gradePoint: number; letterGrade: string } {
  if (percentage >= 80) return { gradePoint: 10, letterGrade: "O" };
  if (percentage >= 70) return { gradePoint: 9, letterGrade: "A+" };
  if (percentage >= 60) return { gradePoint: 8, letterGrade: "A" };
  if (percentage >= 55) return { gradePoint: 7, letterGrade: "B+" };
  if (percentage >= 50) return { gradePoint: 6, letterGrade: "B" };
  if (percentage >= 45) return { gradePoint: 5, letterGrade: "C" };
  if (percentage >= 40) return { gradePoint: 4, letterGrade: "D" };
  return { gradePoint: 0, letterGrade: "F" };
}

export interface CalculatedSubjectResult {
  subjectId: string;
  totalMaxMarks: number;
  totalMarksObtained: number | null;
  credits: number;
  gradePoint: number;
  letterGrade: string;
  status: string;
}

export interface CalculatedSummary {
  enrolmentId: string;
  studentId: string;
  semesterId: string;
  totalMaxMarks: number;
  totalMarksObtained: number;
  percentage: number;
  sgpa: number;
  letterGrade: string;
  resultStatus: string;
  subjectResults: CalculatedSubjectResult[];
}

export class ExamRepository {
  /**
   * Fetches all examination sessions, optionally filtered by academic year.
   */
  static async getExamSessions(academicYearId?: string): Promise<Result<unknown[]>> {
    try {
      const where: Prisma.ExamSessionWhereInput = {};
      if (academicYearId) where.academicYearId = academicYearId;

      const sessions = await prisma.examSession.findMany({
        where,
        include: {
          academicYear: true,
          publishedBy: { select: { fullName: true, email: true } },
          _count: {
            select: {
              assessmentComponents: true,
              examResultSummaries: true,
            },
          },
        },
        orderBy: { startDate: "desc" },
      });
      return { success: true, data: sessions };
    } catch (error) {
      console.error("[ExamRepository.getExamSessions]", error);
      return { success: false, error: (error as Error).message };
    }
  }

  /**
   * Fetches a single examination session with components and stats.
   */
  static async getExamSessionById(id: string): Promise<Result<unknown>> {
    try {
      const session = await prisma.examSession.findUnique({
        where: { id },
        include: {
          academicYear: true,
          publishedBy: { select: { fullName: true, email: true } },
          assessmentComponents: {
            include: {
              subject: { include: { semester: { include: { programme: true } } } },
              _count: { select: { studentEntries: true } },
            },
            orderBy: [{ subject: { code: "asc" } }, { componentType: "asc" }],
          },
        },
      });

      if (!session) {
        return { success: false, error: "Exam session not found", code: "NOT_FOUND" };
      }
      return { success: true, data: session };
    } catch (error) {
      console.error("[ExamRepository.getExamSessionById]", error);
      return { success: false, error: (error as Error).message };
    }
  }

  /**
   * Creates an examination session.
   */
  static async createExamSession(dto: CreateExamSessionDTO): Promise<Result<{ id: string; [key: string]: unknown }>> {
    try {
      if (!dto.name || !dto.sessionCode || !dto.academicYearId) {
        return { success: false, error: "Name, session code, and academic year are required" };
      }

      const existing = await prisma.examSession.findUnique({
        where: { sessionCode: dto.sessionCode },
      });
      if (existing) {
        return { success: false, error: "An exam session with this code already exists" };
      }

      const session = await prisma.examSession.create({
        data: {
          academicYearId: dto.academicYearId,
          name: dto.name,
          sessionCode: dto.sessionCode,
          sessionType: dto.sessionType || "REGULAR",
          startDate: new Date(dto.startDate),
          endDate: new Date(dto.endDate),
          status: dto.status || "PLANNING",
        },
      });
      return { success: true, data: session };
    } catch (error) {
      console.error("[ExamRepository.createExamSession]", error);
      return { success: false, error: (error as Error).message };
    }
  }

  /**
   * Updates an examination session's status.
   */
  static async updateExamSessionStatus(id: string, status: string, publishedById?: string): Promise<Result<unknown>> {
    try {
      const updateData: Prisma.ExamSessionUpdateInput = { status };
      if (status === "PUBLISHED" && publishedById) {
        updateData.publishedAt = new Date();
        updateData.publishedBy = { connect: { id: publishedById } };
      }

      const updated = await prisma.examSession.update({
        where: { id },
        data: updateData,
      });
      return { success: true, data: updated };
    } catch (error) {
      console.error("[ExamRepository.updateExamSessionStatus]", error);
      return { success: false, error: (error as Error).message };
    }
  }

  /**
   * Creates an assessment component for a subject in a session.
   */
  static async createAssessmentComponent(dto: CreateAssessmentComponentDTO): Promise<Result<{ id: string; [key: string]: unknown }>> {
    try {
      if (dto.maxMarks <= 0) {
        return { success: false, error: "Maximum marks must be greater than zero" };
      }

      const existing = await prisma.assessmentComponent.findUnique({
        where: {
          examSessionId_subjectId_componentType: {
            examSessionId: dto.examSessionId,
            subjectId: dto.subjectId,
            componentType: dto.componentType,
          },
        },
      });
      if (existing) {
        return { success: false, error: "This assessment component already exists for this subject and session" };
      }

      const component = await prisma.assessmentComponent.create({
        data: {
          examSessionId: dto.examSessionId,
          subjectId: dto.subjectId,
          name: dto.name,
          componentType: dto.componentType,
          maxMarks: dto.maxMarks,
          minPassingMarks: dto.minPassingMarks ?? null,
          weightagePercentage: dto.weightagePercentage ?? null,
        },
      });
      return { success: true, data: component };
    } catch (error) {
      console.error("[ExamRepository.createAssessmentComponent]", error);
      return { success: false, error: (error as Error).message };
    }
  }

  /**
   * Gets assessment components for a session, optionally filtered by subject.
   */
  static async getComponentsForSession(examSessionId: string, subjectId?: string): Promise<Result<unknown[]>> {
    try {
      const where: Prisma.AssessmentComponentWhereInput = { examSessionId };
      if (subjectId) where.subjectId = subjectId;

      const components = await prisma.assessmentComponent.findMany({
        where,
        include: {
          subject: {
            include: {
              semester: { include: { programme: true } },
              teachingAssignments: { include: { staff: true, division: true } },
            },
          },
          _count: { select: { studentEntries: true } },
        },
        orderBy: [{ subject: { code: "asc" } }, { componentType: "asc" }],
      });
      return { success: true, data: components };
    } catch (error) {
      console.error("[ExamRepository.getComponentsForSession]", error);
      return { success: false, error: (error as Error).message };
    }
  }

  /**
   * Retrieves student roster for a component with current mark entries.
   * Joins Enrolment with Student and any existing StudentAssessmentEntry.
   */
  static async getExamRosterForComponent(componentId: string): Promise<Result<{ component?: unknown; roster: Array<{ studentId: string; enrolmentId: string; rollNumber: string | null; prn: string; fullName: string; marksObtained: number | null; moderatedMarks: number | null; entryStatus: string; remarks: string | null; entryId: string | null }> }>> {
    try {
      const component = await prisma.assessmentComponent.findUnique({
        where: { id: componentId },
        include: {
          subject: {
            include: {
              semester: { include: { programme: true } },
              teachingAssignments: { include: { staff: true, division: true } },
            },
          },
          examSession: true,
        },
      });

      if (!component) {
        return { success: false, error: "Assessment component not found", code: "NOT_FOUND" };
      }

      // Find all students enrolled in this semester and academic year
      const enrolments = await prisma.enrolment.findMany({
        where: {
          semesterId: component.subject.semesterId,
          academicYearId: component.examSession.academicYearId,
          status: "ENROLLED",
        },
        include: {
          student: true,
          division: true,
        },
        orderBy: [{ division: { name: "asc" } }, { student: { rollNumber: "asc" } }],
      });

      // Find all existing mark entries for this component
      const entries = await prisma.studentAssessmentEntry.findMany({
        where: { componentId },
        include: {
          enteredBy: { select: { fullName: true } },
          moderatedBy: { select: { fullName: true } },
          revisionAudits: {
            include: { revisedBy: { select: { fullName: true } } },
            orderBy: { revisedAt: "desc" },
          },
        },
      });

      const entryMap = new Map<string, (typeof entries)[0]>();
      for (const entry of entries) {
        entryMap.set(entry.studentId, entry);
      }

      // Merge enrolled students with their entries
      const roster = enrolments.map((enr) => {
        const existingEntry = entryMap.get(enr.studentId);
        return {
          studentId: enr.student.id,
          rollNumber: enr.student.rollNumber,
          prn: enr.student.prn,
          fullName: enr.student.fullName,
          divisionName: enr.division.name,
          enrolmentId: enr.id,
          entryId: existingEntry ? existingEntry.id : null,
          marksObtained: existingEntry ? existingEntry.marksObtained : null,
          entryStatus: existingEntry ? existingEntry.entryStatus : "PENDING",
          moderatedMarks: existingEntry ? existingEntry.moderatedMarks : null,
          remarks: existingEntry ? existingEntry.remarks : null,
          enteredBy: existingEntry?.enteredBy?.fullName ?? null,
          enteredAt: existingEntry?.enteredAt ?? null,
          moderatedBy: existingEntry?.moderatedBy?.fullName ?? null,
          moderatedAt: existingEntry?.moderatedAt ?? null,
          revisions: existingEntry?.revisionAudits ?? [],
        };
      });

      return {
        success: true,
        data: {
          component,
          roster,
        },
      };
    } catch (error) {
      console.error("[ExamRepository.getExamRosterForComponent]", error);
      return { success: false, error: (error as Error).message };
    }
  }

  /**
   * Records student assessment marks in transaction with strict validation:
   * - 0 <= marksObtained <= component.maxMarks
   * - Null marks are distinct from 0
   * - Faculty-scoped checks ensure faculty is assigned to the subject
   */
  static async recordStudentMarks(dto: RecordMarksDTO): Promise<Result<unknown>> {
    try {
      const component = await prisma.assessmentComponent.findUnique({
        where: { id: dto.componentId },
        include: {
          subject: {
            include: {
              teachingAssignments: true,
            },
          },
          examSession: true,
        },
      });

      if (!component) {
        return { success: false, error: "Assessment component not found", code: "NOT_FOUND" };
      }

      // Cannot enter marks if session is already PUBLISHED or ARCHIVED
      if (component.examSession.status === "PUBLISHED" || component.examSession.status === "ARCHIVED") {
        return {
          success: false,
          error: `Cannot modify marks for session with status '${component.examSession.status}'. Use formal amendment.`,
          code: "SESSION_LOCKED",
        };
      }

      // If caller is faculty-scoped, check teaching assignment
      if (dto.isFacultyScoped) {
        if (!dto.facultyStaffId) {
          return { success: false, error: "Faculty staff ID required for faculty mark entry", code: "FORBIDDEN" };
        }
        const hasAssignment = component.subject.teachingAssignments.some(
          (ta) => ta.staffId === dto.facultyStaffId
        );
        if (!hasAssignment) {
          return {
            success: false,
            error: "Faculty is not assigned to teach this subject. Marks entry unauthorized.",
            code: "CROSS_FACULTY_VIOLATION",
          };
        }
      }

      // Validate entries
      for (const entry of dto.entries) {
        if (entry.marksObtained !== null && entry.marksObtained !== undefined) {
          if (entry.marksObtained < 0) {
            return {
              success: false,
              error: `Invalid negative mark '${entry.marksObtained}' for student '${entry.studentId}'. Marks cannot be negative.`,
              code: "VALIDATION_ERROR",
            };
          }
          if (entry.marksObtained > component.maxMarks) {
            return {
              success: false,
              error: `Marks obtained (${entry.marksObtained}) exceeds maximum allowable marks (${component.maxMarks}) for component '${component.name}'.`,
              code: "VALIDATION_ERROR",
            };
          }
        }
      }

      // Upsert entries in transaction
      const results = await prisma.$transaction(
        dto.entries.map((entry) => {
          return prisma.studentAssessmentEntry.upsert({
            where: {
              componentId_studentId: {
                componentId: dto.componentId,
                studentId: entry.studentId,
              },
            },
            create: {
              componentId: dto.componentId,
              studentId: entry.studentId,
              enrolmentId: entry.enrolmentId,
              marksObtained: entry.marksObtained,
              entryStatus: entry.entryStatus,
              remarks: entry.remarks ?? null,
              enteredById: dto.enteredById,
            },
            update: {
              marksObtained: entry.marksObtained,
              entryStatus: entry.entryStatus,
              remarks: entry.remarks ?? null,
              enteredById: dto.enteredById,
              enteredAt: new Date(),
            },
          });
        })
      );

      return { success: true, data: { count: results.length } };
    } catch (error) {
      console.error("[ExamRepository.recordStudentMarks]", error);
      return { success: false, error: (error as Error).message };
    }
  }

  /**
   * Moderates a mark entry by adjusting the moderatedMarks field and logging an audit record.
   */
  static async moderateStudentMarks(dto: ModerateMarksDTO): Promise<Result<unknown>> {
    try {
      const entry = await prisma.studentAssessmentEntry.findUnique({
        where: { id: dto.entryId },
        include: {
          component: { include: { examSession: true } },
        },
      });

      if (!entry) {
        return { success: false, error: "Assessment entry not found", code: "NOT_FOUND" };
      }

      if (dto.moderatedMarks < 0 || dto.moderatedMarks > entry.component.maxMarks) {
        return {
          success: false,
          error: `Moderated marks (${dto.moderatedMarks}) must be between 0 and ${entry.component.maxMarks}`,
        };
      }

      if (!dto.reason || dto.reason.trim().length < 5) {
        return { success: false, error: "A valid justification is required for mark moderation" };
      }

      const updated = await prisma.$transaction(async (tx) => {
        // Record audit
        await tx.assessmentRevisionAudit.create({
          data: {
            entryId: entry.id,
            previousScore: entry.moderatedMarks ?? entry.marksObtained,
            newScore: dto.moderatedMarks,
            previousStatus: entry.entryStatus,
            newStatus: entry.entryStatus,
            reason: `[MODERATION] ${dto.reason.trim()}`,
            revisedById: dto.moderatedById,
          },
        });

        // Update entry
        return tx.studentAssessmentEntry.update({
          where: { id: entry.id },
          data: {
            moderatedMarks: dto.moderatedMarks,
            moderatedById: dto.moderatedById,
            moderatedAt: new Date(),
          },
        });
      });

      return { success: true, data: updated };
    } catch (error) {
      console.error("[ExamRepository.moderateStudentMarks]", error);
      return { success: false, error: (error as Error).message };
    }
  }

  /**
   * Calculation engine:
   * Aggregates subject assessment components for enrolled students in a semester,
   * calculates subject grades using 10-point CBCS scale, computes SGPA = sum(C_i * GP_i) / sum(C_i),
   * and saves provisional ExamResultSummary and SubjectResultEntry records.
   */
  static async calculateSessionResults(examSessionId: string, semesterId: string): Promise<Result<{ studentsCalculated: number; summaries: CalculatedSummary[] }>> {
    try {
      const session = await prisma.examSession.findUnique({
        where: { id: examSessionId },
      });
      if (!session) {
        return { success: false, error: "Exam session not found", code: "NOT_FOUND" };
      }

      // Get subjects for this semester
      const subjects = await prisma.subject.findMany({
        where: { semesterId },
        include: {
          assessmentComponents: {
            where: { examSessionId },
          },
        },
      });

      if (subjects.length === 0) {
        return { success: false, error: "No subjects found for this semester" };
      }

      // Get all enrolled students for this semester and session academic year
      const enrolments = await prisma.enrolment.findMany({
        where: {
          semesterId,
          academicYearId: session.academicYearId,
          status: "ENROLLED",
        },
        include: { student: true },
      });

      if (enrolments.length === 0) {
        return { success: false, error: "No active student enrolments found for this semester" };
      }

      // Collect all component IDs for this session & semester subjects
      const componentIds = subjects.flatMap((s) => s.assessmentComponents.map((c) => c.id));

      const entries = await prisma.studentAssessmentEntry.findMany({
        where: {
          componentId: { in: componentIds },
        },
        include: { component: true },
      });

      // Group entries by studentId -> subjectId -> list of component entries
      const studentMap = new Map<string, Map<string, typeof entries>>();
      for (const entry of entries) {
        if (!studentMap.has(entry.studentId)) {
          studentMap.set(entry.studentId, new Map());
        }
        const subjMap = studentMap.get(entry.studentId)!;
        const subId = entry.component.subjectId;
        if (!subjMap.has(subId)) {
          subjMap.set(subId, []);
        }
        subjMap.get(subId)!.push(entry);
      }

      const calculatedSummaries: CalculatedSummary[] = [];

      for (const enr of enrolments) {
        const studentId = enr.student.id;
        const subjMap = studentMap.get(studentId) || new Map();

        let totalSemesterMax = 0;
        let totalSemesterObtained = 0;
        let totalCredits = 0;
        let weightedGradePoints = 0;
        let failCount = 0;
        let hasPendingMarks = false;

        const subjectResultsToSave: CalculatedSubjectResult[] = [];

        for (const subj of subjects) {
          const compEntries = subjMap.get(subj.id) || [];
          let subjectMax = 0;
          let subjectObtained = 0;
          let subjectStatus = "PASS";
          let anyEntered = false;

          for (const comp of subj.assessmentComponents) {
            subjectMax += comp.maxMarks;
            type CompItem = { componentId: string; marksObtained: number | null; moderatedMarks: number | null; entryStatus: string };
            const entry = (compEntries as CompItem[]).find((e: CompItem) => e.componentId === comp.id);
            if (entry) {
              const effectiveMark = entry.moderatedMarks ?? entry.marksObtained;
              if (effectiveMark !== null) {
                subjectObtained += effectiveMark;
                anyEntered = true;
              } else if (entry.entryStatus === "ABSENT") {
                subjectStatus = "ABSENT";
              } else if (entry.entryStatus === "WITHHELD") {
                subjectStatus = "WITHHELD";
              } else {
                hasPendingMarks = true;
              }
            } else {
              hasPendingMarks = true;
            }
          }

          if (subjectMax === 0) {
            // Default max marks if components not yet configured
            subjectMax = 100;
          }

          totalSemesterMax += subjectMax;
          totalSemesterObtained += subjectObtained;

          const subjectPercentage = subjectMax > 0 ? (subjectObtained / subjectMax) * 100 : 0;
          const { gradePoint, letterGrade } = computeGradePoint(subjectPercentage);

          if (subjectPercentage < 40 && subjectStatus === "PASS") {
            subjectStatus = "FAIL";
            failCount++;
          } else if (subjectStatus === "ABSENT" || subjectStatus === "WITHHELD") {
            failCount++;
          }

          const credits = subj.credits || 4.0;
          totalCredits += credits;
          weightedGradePoints += credits * gradePoint;

          subjectResultsToSave.push({
            subjectId: subj.id,
            totalMaxMarks: subjectMax,
            totalMarksObtained: anyEntered ? subjectObtained : null,
            credits,
            gradePoint,
            letterGrade,
            status: subjectStatus,
          });
        }

        // SGPA Calculation: zero-safe
        const sgpa = totalCredits > 0 ? Number((weightedGradePoints / totalCredits).toFixed(2)) : 0.0;
        const semesterPercentage = totalSemesterMax > 0 ? Number(((totalSemesterObtained / totalSemesterMax) * 100).toFixed(2)) : 0.0;
        const { letterGrade: overallGrade } = computeGradePoint(semesterPercentage);

        let resultStatus = "PROVISIONAL";
        if (hasPendingMarks) {
          resultStatus = "INCOMPLETE";
        } else if (failCount === 0) {
          resultStatus = "PASSED";
        } else if (failCount <= 2) {
          resultStatus = "ATKT";
        } else {
          resultStatus = "FAILED";
        }

        calculatedSummaries.push({
          enrolmentId: enr.id,
          studentId: enr.student.id,
          semesterId,
          totalMaxMarks: totalSemesterMax,
          totalMarksObtained: totalSemesterObtained,
          percentage: semesterPercentage,
          sgpa,
          letterGrade: overallGrade,
          resultStatus,
          subjectResults: subjectResultsToSave,
        });
      }

      // Save summaries and subject results in transaction
      await prisma.$transaction(async (tx) => {
        for (const item of calculatedSummaries) {
          const summary = await tx.examResultSummary.upsert({
            where: {
              examSessionId_studentId_semesterId: {
                examSessionId,
                studentId: item.studentId,
                semesterId: item.semesterId,
              },
            },
            create: {
              examSessionId,
              studentId: item.studentId,
              enrolmentId: item.enrolmentId,
              semesterId: item.semesterId,
              totalMaxMarks: item.totalMaxMarks,
              totalMarksObtained: item.totalMarksObtained,
              percentage: item.percentage,
              sgpa: item.sgpa,
              letterGrade: item.letterGrade,
              resultStatus: item.resultStatus,
              approvalStatus: "DRAFT",
            },
            update: {
              totalMaxMarks: item.totalMaxMarks,
              totalMarksObtained: item.totalMarksObtained,
              percentage: item.percentage,
              sgpa: item.sgpa,
              letterGrade: item.letterGrade,
              resultStatus: item.resultStatus,
            },
          });

          // Delete existing subject results for clean recalculation
          await tx.subjectResultEntry.deleteMany({
            where: { resultSummaryId: summary.id },
          });

          // Create new subject results
          for (const sr of item.subjectResults) {
            await tx.subjectResultEntry.create({
              data: {
                resultSummaryId: summary.id,
                subjectId: sr.subjectId,
                totalMaxMarks: sr.totalMaxMarks,
                totalMarksObtained: sr.totalMarksObtained,
                credits: sr.credits,
                gradePoint: sr.gradePoint,
                letterGrade: sr.letterGrade,
                status: sr.status,
              },
            });
          }
        }
      });

      return {
        success: true,
        data: {
          studentsCalculated: calculatedSummaries.length,
          summaries: calculatedSummaries,
        },
      };
    } catch (error) {
      console.error("[ExamRepository.calculateSessionResults]", error);
      return { success: false, error: (error as Error).message };
    }
  }

  /**
   * Publishes semester examination results:
   * Sets approvalStatus = 'PUBLISHED', publishedAt = now, publishedById.
   * Locks the session evaluation state.
   */
  static async publishSessionResults(examSessionId: string, semesterId: string, publishedById: string): Promise<Result<unknown>> {
    try {
      const now = new Date();
      await prisma.$transaction(async (tx) => {
        // Update summaries for this session and semester
        await tx.examResultSummary.updateMany({
          where: { examSessionId, semesterId },
          data: {
            approvalStatus: "PUBLISHED",
            publishedAt: now,
            publishedById,
          },
        });

        // Update exam session status
        await tx.examSession.update({
          where: { id: examSessionId },
          data: {
            status: "PUBLISHED",
            publishedAt: now,
            publishedById,
          },
        });
      });

      return { success: true, data: { publishedAt: now } };
    } catch (error) {
      console.error("[ExamRepository.publishSessionResults]", error);
      return { success: false, error: (error as Error).message };
    }
  }

  /**
   * Retrieves result summaries.
   * If isStudentViewer is true, unpublished results are strictly hidden.
   */
  static async getStudentResultSummaries(filters: {
    examSessionId?: string;
    studentId?: string;
    semesterId?: string;
    isStudentViewer?: boolean;
  }): Promise<Result<Array<{ id: string; [key: string]: unknown }>>> {
    try {
      const where: Prisma.ExamResultSummaryWhereInput = {};
      if (filters.examSessionId) where.examSessionId = filters.examSessionId;
      if (filters.studentId) where.studentId = filters.studentId;
      if (filters.semesterId) where.semesterId = filters.semesterId;

      if (filters.isStudentViewer) {
        where.approvalStatus = "PUBLISHED";
      }

      const summaries = await prisma.examResultSummary.findMany({
        where,
        include: {
          student: true,
          semester: { include: { programme: true } },
          examSession: true,
          subjectResults: {
            include: { subject: true },
            orderBy: { subject: { code: "asc" } },
          },
          publishedBy: { select: { fullName: true } },
        },
        orderBy: [{ student: { rollNumber: "asc" } }],
      });

      return { success: true, data: summaries };
    } catch (error) {
      console.error("[ExamRepository.getStudentResultSummaries]", error);
      return { success: false, error: (error as Error).message };
    }
  }

  /**
   * Post-publication amendment with mandatory audit justification.
   */
  static async amendPublishedMark(dto: AmendPublishedMarkDTO): Promise<Result<unknown>> {
    try {
      if (!dto.reason || dto.reason.trim().length < 5) {
        return { success: false, error: "A mandatory justification reason is required for post-publication amendments" };
      }

      const entry = await prisma.studentAssessmentEntry.findUnique({
        where: { id: dto.entryId },
        include: {
          component: { include: { examSession: true, subject: true } },
          enrolment: true,
        },
      });

      if (!entry) {
        return { success: false, error: "Assessment entry not found", code: "NOT_FOUND" };
      }

      if (dto.newScore < 0 || dto.newScore > entry.component.maxMarks) {
        return {
          success: false,
          error: `Amended score (${dto.newScore}) must be between 0 and ${entry.component.maxMarks}`,
        };
      }

      const updated = await prisma.$transaction(async (tx) => {
        // Record audit
        await tx.assessmentRevisionAudit.create({
          data: {
            entryId: entry.id,
            previousScore: entry.moderatedMarks ?? entry.marksObtained,
            newScore: dto.newScore,
            previousStatus: entry.entryStatus,
            newStatus: "ENTERED",
            reason: `[POST-PUB AMENDMENT] ${dto.reason.trim()}`,
            revisedById: dto.revisedById,
          },
        });

        // Update score
        return tx.studentAssessmentEntry.update({
          where: { id: entry.id },
          data: {
            marksObtained: dto.newScore,
            moderatedMarks: dto.newScore, // synchronize
            entryStatus: "ENTERED",
            enteredAt: new Date(),
          },
        });
      });

      // Recalculate results for that student
      await ExamRepository.calculateSessionResults(
        entry.component.examSessionId,
        entry.component.subject.semesterId
      );

      return { success: true, data: updated };
    } catch (error) {
      console.error("[ExamRepository.amendPublishedMark]", error);
      return { success: false, error: (error as Error).message };
    }
  }
}
