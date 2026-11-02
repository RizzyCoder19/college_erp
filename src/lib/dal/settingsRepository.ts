import fs from "fs";
import path from "path";
import crypto from "crypto";
import prisma from "@/lib/db";
import { Result } from "./types";

export interface AcademicTermItem {
  id: string;
  academicYearId: string;
  termType: string;
  name: string;
  startDate: Date;
  endDate: Date;
  isCurrent: boolean;
}

export interface AcademicYearItem {
  id: string;
  code: string;
  name: string;
  startDate: Date;
  endDate: Date;
  isCurrent: boolean;
  terms: AcademicTermItem[];
}

export interface UserAccountAdminItem {
  id: string;
  email: string;
  fullName: string;
  role: string;
  isActive: boolean;
  linkedType: "STAFF" | "STUDENT" | "NONE";
  linkedIdentifier?: string;
  departmentName?: string;
  activeSessionCount: number;
  lastLoginAt: Date | null;
  createdAt: Date;
}

export interface AuditLogItem {
  id: string;
  eventType: "FINANCE_RECEIPT" | "EXAM_PUBLISH" | "ATTENDANCE_SESSION" | "USER_ACCOUNT";
  title: string;
  description: string;
  actorName: string;
  timestamp: Date;
  metadata?: Record<string, unknown>;
}

export interface BackupSnapshotItem {
  filename: string;
  sizeBytes: number;
  modifiedAt: Date;
  sha256Hash?: string;
}

export interface TableCountItem {
  tableName: string;
  rowCount: number;
}

export interface SystemHealthAndBackupInfo {
  databasePath: string;
  fileSizeBytes: number;
  sha256Hash: string;
  integrityCheck: string;
  foreignKeyViolations: number;
  journalMode: string;
  pageSize: number;
  pageCount: number;
  totalActiveSessions: number;
  tableCounts: TableCountItem[];
  backupSnapshots: BackupSnapshotItem[];
}

export class SettingsRepository {
  /**
   * Retrieves academic years and terms.
   */
  static async getAcademicCalendarSettings(): Promise<Result<AcademicYearItem[]>> {
    try {
      const years = await prisma.academicYear.findMany({
        include: {
          terms: { orderBy: { startDate: "asc" } },
        },
        orderBy: { startDate: "desc" },
      });

      return {
        success: true,
        data: years.map((y) => ({
          id: y.id,
          code: y.code,
          name: y.name,
          startDate: y.startDate,
          endDate: y.endDate,
          isCurrent: y.isCurrent,
          terms: y.terms.map((t) => ({
            id: t.id,
            academicYearId: t.academicYearId,
            termType: t.termType,
            name: t.name,
            startDate: t.startDate,
            endDate: t.endDate,
            isCurrent: t.isCurrent,
          })),
        })),
      };
    } catch (error: unknown) {
      console.error("[SettingsRepository.getAcademicCalendarSettings Error]:", error);
      return {
        success: false,
        error: "Failed to retrieve academic calendar settings.",
        code: "DATABASE_ERROR",
      };
    }
  }

  /**
   * Retrieves user accounts, roles, and session activity.
   */
  static async getUserAccountsAdmin(): Promise<Result<UserAccountAdminItem[]>> {
    try {
      const users = await prisma.userAccount.findMany({
        include: {
          staff: { include: { department: true } },
          student: true,
          sessions: {
            where: {
              expiresAt: { gt: new Date() },
              revokedAt: null,
            },
            select: { id: true },
          },
        },
        orderBy: [{ role: "asc" }, { fullName: "asc" }],
      });

      const items: UserAccountAdminItem[] = users.map((u) => {
        let linkedType: "STAFF" | "STUDENT" | "NONE" = "NONE";
        let linkedIdentifier: string | undefined;
        let departmentName: string | undefined;

        if (u.staff) {
          linkedType = "STAFF";
          linkedIdentifier = u.staff.employeeId;
          departmentName = u.staff.department?.name;
        } else if (u.student) {
          linkedType = "STUDENT";
          linkedIdentifier = u.student.rollNumber;
        }

        return {
          id: u.id,
          email: u.email,
          fullName: u.fullName,
          role: u.role,
          isActive: u.isActive,
          linkedType,
          linkedIdentifier,
          departmentName,
          activeSessionCount: u.sessions.length,
          lastLoginAt: u.lastLoginAt,
          createdAt: u.createdAt,
        };
      });

      return { success: true, data: items };
    } catch (error: unknown) {
      console.error("[SettingsRepository.getUserAccountsAdmin Error]:", error);
      return {
        success: false,
        error: "Failed to load user accounts for administration.",
        code: "DATABASE_ERROR",
      };
    }
  }

  /**
   * Retrieves aggregated chronological operational audit events.
   */
  static async getSystemAuditLogs(limit: number = 50): Promise<Result<AuditLogItem[]>> {
    try {
      const [receipts, examSessions, attendanceSessions, userAccounts] = await Promise.all([
        prisma.feeReceipt.findMany({
          take: limit,
          orderBy: { createdAt: "desc" },
          include: {
            collectedBy: { select: { fullName: true } },
            student: { select: { rollNumber: true, fullName: true } },
          },
        }),
        prisma.examSession.findMany({
          take: limit,
          orderBy: { updatedAt: "desc" },
          include: {
            publishedBy: { select: { fullName: true } },
          },
        }),
        prisma.attendanceSession.findMany({
          take: limit,
          orderBy: { sessionDate: "desc" },
          include: {
            recordedBy: { select: { fullName: true } },
            faculty: { select: { fullName: true } },
            subject: { select: { code: true } },
            division: { select: { name: true } },
          },
        }),
        prisma.userAccount.findMany({
          take: limit,
          orderBy: { createdAt: "desc" },
          select: {
            id: true,
            fullName: true,
            email: true,
            role: true,
            createdAt: true,
          },
        }),
      ]);

      const logs: AuditLogItem[] = [];

      for (const r of receipts) {
        logs.push({
          id: `receipt_${r.id}`,
          eventType: "FINANCE_RECEIPT",
          title: `Fee Receipt Issued (${r.receiptNumber})`,
          description: `₹${r.amountPaid.toLocaleString("en-IN")} collected from ${r.student.fullName} (${r.student.rollNumber}) via ${r.paymentMethod}. Ref: ${r.transactionReference}`,
          actorName: r.collectedBy?.fullName || "Administrative Staff",
          timestamp: r.createdAt,
          metadata: { amount: r.amountPaid, ref: r.transactionReference },
        });
      }

      for (const es of examSessions) {
        logs.push({
          id: `exam_${es.id}`,
          eventType: "EXAM_PUBLISH",
          title: `Exam Session Created / Updated (${es.sessionCode})`,
          description: `${es.name} [Status: ${es.status}]`,
          actorName: es.publishedBy?.fullName || "Academic Office",
          timestamp: es.updatedAt,
          metadata: { sessionCode: es.sessionCode, status: es.status },
        });
      }

      for (const att of attendanceSessions) {
        const divisionName = att.division?.name || "Consolidated Division";
        logs.push({
          id: `att_${att.id}`,
          eventType: "ATTENDANCE_SESSION",
          title: `Attendance Session Logged (${att.subject.code} - ${divisionName})`,
          description: `Session recorded on ${new Date(att.sessionDate).toLocaleDateString("en-IN")} with status ${att.status}. Faculty: ${att.faculty.fullName}`,
          actorName: att.recordedBy?.fullName || att.faculty.fullName,
          timestamp: new Date(att.sessionDate),
          metadata: { subject: att.subject.code, division: divisionName },
        });
      }

      for (const u of userAccounts) {
        logs.push({
          id: `user_${u.id}`,
          eventType: "USER_ACCOUNT",
          title: `Account Provisioned (${u.email})`,
          description: `User ${u.fullName} created with security role ${u.role}.`,
          actorName: "System Administrator",
          timestamp: u.createdAt,
          metadata: { role: u.role, email: u.email },
        });
      }

      // Sort chronological descending
      logs.sort((a, b) => b.timestamp.getTime() - a.timestamp.getTime());

      return {
        success: true,
        data: logs.slice(0, limit),
      };
    } catch (error: unknown) {
      console.error("[SettingsRepository.getSystemAuditLogs Error]:", error);
      return {
        success: false,
        error: "Failed to load system audit logs.",
        code: "DATABASE_ERROR",
      };
    }
  }

  /**
   * Retrieves operational database health, SQLite PRAGMA telemetry, and backup snapshots.
   */
  static async getSystemHealthAndBackups(): Promise<Result<SystemHealthAndBackupInfo>> {
    try {
      const dbPath = path.resolve(process.cwd(), "prisma/dev.db");
      let fileSizeBytes = 0;
      let sha256Hash = "";

      if (fs.existsSync(dbPath)) {
        const stats = fs.statSync(dbPath);
        fileSizeBytes = stats.size;
        const fileBuf = fs.readFileSync(dbPath);
        sha256Hash = crypto.createHash("sha256").update(fileBuf).digest("hex");
      }

      // SQLite PRAGMA Checks
      const integrityRows = await prisma.$queryRawUnsafe<Array<{ integrity_check: string }>>(
        "PRAGMA integrity_check;"
      );
      const integrityCheck = integrityRows[0]?.integrity_check || "unknown";

      const fkRows = await prisma.$queryRawUnsafe<
        Array<{ table: string; rowid: number; parent: string; fkid: number }>
      >("PRAGMA foreign_key_check;");
      const foreignKeyViolations = fkRows.length;

      const journalRows = await prisma.$queryRawUnsafe<Array<{ journal_mode: string }>>(
        "PRAGMA journal_mode;"
      );
      const journalMode = journalRows[0]?.journal_mode || "unknown";

      const pageCountRows = await prisma.$queryRawUnsafe<Array<{ page_count: number }>>(
        "PRAGMA page_count;"
      );
      const pageCount = Number(pageCountRows[0]?.page_count || 0);

      const pageSizeRows = await prisma.$queryRawUnsafe<Array<{ page_size: number }>>(
        "PRAGMA page_size;"
      );
      const pageSize = Number(pageSizeRows[0]?.page_size || 4096);

      // Active Sessions
      const totalActiveSessions = await prisma.session.count({
        where: {
          expiresAt: { gt: new Date() },
          revokedAt: null,
        },
      });

      // Table Row Counts
      const tableRows = await prisma.$queryRawUnsafe<Array<{ name: string }>>(
        "SELECT name FROM sqlite_master WHERE type='table' AND name NOT LIKE 'sqlite_%' AND name NOT LIKE '_prisma%' ORDER BY name ASC;"
      );

      const tableCounts: TableCountItem[] = [];
      for (const t of tableRows) {
        const countRows = await prisma.$queryRawUnsafe<Array<{ count: number }>>(
          `SELECT count(*) as count FROM "${t.name}";`
        );
        tableCounts.push({
          tableName: t.name,
          rowCount: Number(countRows[0]?.count || 0),
        });
      }

      // Backup Files Discovery
      const prismaDir = path.resolve(process.cwd(), "prisma");
      const backupSnapshots: BackupSnapshotItem[] = [];

      if (fs.existsSync(prismaDir)) {
        const files = fs.readdirSync(prismaDir);
        for (const file of files) {
          if (file.endsWith(".bak") || file.endsWith(".manifest.json")) {
            const filePath = path.join(prismaDir, file);
            const st = fs.statSync(filePath);
            let snapHash: string | undefined;
            if (st.size < 10 * 1024 * 1024) {
              const buf = fs.readFileSync(filePath);
              snapHash = crypto.createHash("sha256").update(buf).digest("hex");
            }
            backupSnapshots.push({
              filename: file,
              sizeBytes: st.size,
              modifiedAt: st.mtime,
              sha256Hash: snapHash,
            });
          }
        }
      }

      // Sort backup files newest first
      backupSnapshots.sort((a, b) => b.modifiedAt.getTime() - a.modifiedAt.getTime());

      return {
        success: true,
        data: {
          databasePath: "prisma/dev.db",
          fileSizeBytes,
          sha256Hash,
          integrityCheck,
          foreignKeyViolations,
          journalMode,
          pageSize,
          pageCount,
          totalActiveSessions,
          tableCounts,
          backupSnapshots,
        },
      };
    } catch (error: unknown) {
      console.error("[SettingsRepository.getSystemHealthAndBackups Error]:", error);
      return {
        success: false,
        error: "Failed to retrieve system health and backup telemetry.",
        code: "DATABASE_ERROR",
      };
    }
  }
}
