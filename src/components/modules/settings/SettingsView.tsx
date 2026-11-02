"use client";

import React, { useState, useEffect, useTransition } from "react";
import {
  getSystemHealthAndBackupsAction,
  getSystemAuditLogsAction,
  getAcademicCalendarSettingsAction,
  getUserAccountsAdminAction,
} from "@/lib/actions/settings";
import type {
  SystemHealthAndBackupInfo,
  AuditLogItem,
  AcademicYearItem,
  UserAccountAdminItem,
} from "@/lib/dal/settingsRepository";

type SettingsTab = "HEALTH" | "AUDIT_LOGS" | "ACADEMIC_YEARS" | "USERS";

function SvgIcon({ name, className = "w-4 h-4" }: { name: string; className?: string }) {
  switch (name) {
    case "server":
      return (
        <svg className={className} fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.8}>
          <path strokeLinecap="round" strokeLinejoin="round" d="M5.25 14.25h13.5m-13.5 0a3 3 0 01-3-3m3 3a3 3 0 100 6h13.5a3 3 0 100-6m-16.5-3a3 3 0 013-3h13.5a3 3 0 013 3m-19.5 0a4.5 4.5 0 01.9-2.7L5.75 5.1a3 3 0 012.4-1.35h7.7a3 3 0 012.4 1.35l2.1 3.15c.6.9.9 1.8.9 2.7m-16.5 0h16.5" />
        </svg>
      );
    case "database":
      return (
        <svg className={className} fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.8}>
          <path strokeLinecap="round" strokeLinejoin="round" d="M20.25 6.375c0 2.278-3.694 4.125-8.25 4.125S3.75 8.653 3.75 6.375m16.5 0c0-2.278-3.694-4.125-8.25-4.125S3.75 4.097 3.75 6.375m16.5 0v11.25c0 2.278-3.694 4.125-8.25 4.125s-8.25-1.847-8.25-4.125V6.375m16.5 5.625c0 2.278-3.694 4.125-8.25 4.125s-8.25-1.847-8.25-4.125" />
        </svg>
      );
    case "shield-check":
      return (
        <svg className={className} fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.8}>
          <path strokeLinecap="round" strokeLinejoin="round" d="M9 12.75L11.25 15 15 9.75m-3-7.036A11.959 11.959 0 013.598 6 11.99 11.99 0 003 9.749c0 5.592 3.824 10.29 9 11.623 5.176-1.332 9-6.03 9-11.622 0-1.31-.21-2.571-.598-3.751h-.152c-3.196 0-6.1-1.248-8.25-3.285z" />
        </svg>
      );
    case "activity":
      return (
        <svg className={className} fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.8}>
          <path strokeLinecap="round" strokeLinejoin="round" d="M2.25 18L9 11.25l4.306 4.307a11.95 11.95 0 015.814-5.519l2.74-1.22m0 0l-5.94-2.28m5.94 2.28l-2.28 5.941" />
        </svg>
      );
    case "calendar":
      return (
        <svg className={className} fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.8}>
          <path strokeLinecap="round" strokeLinejoin="round" d="M6.75 3v2.25M17.25 3v2.25M3 18.75V7.5a2.25 2.25 0 012.25-2.25h13.5A2.25 2.25 0 0121 7.5v11.25m-18 0A2.25 2.25 0 005.25 21h13.5A2.25 2.25 0 0021 18.75m-18 0v-7.5A2.25 2.25 0 015.25 9h13.5A2.25 2.25 0 0121 9v7.5" />
        </svg>
      );
    case "users":
      return (
        <svg className={className} fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.8}>
          <path strokeLinecap="round" strokeLinejoin="round" d="M15 19.128a9.38 9.38 0 002.625.372 9.337 9.337 0 004.121-.952 4.125 4.125 0 00-7.533-2.493M15 19.128v-.003c0-1.113-.285-2.16-.786-3.07M15 19.128v.106A12.318 12.318 0 018.624 21c-2.331 0-4.512-.645-6.374-1.766l-.001-.109a6.375 6.375 0 0111.964-3.07M12 6.375a3.375 3.375 0 11-6.75 0 3.375 3.375 0 016.75 0zm8.25 2.25a2.625 2.625 0 11-5.25 0 2.625 2.625 0 015.25 0z" />
        </svg>
      );
    case "refresh":
      return (
        <svg className={className} fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.8}>
          <path strokeLinecap="round" strokeLinejoin="round" d="M16.023 9.348h4.992v-.001M2.985 19.644v-4.992m0 0h4.992m-4.993 0l3.181 3.183a8.25 8.25 0 0013.803-3.7M4.031 9.865a8.25 8.25 0 0113.803-3.7l3.181 3.182m0-4.991v4.99" />
        </svg>
      );
    case "alert":
      return (
        <svg className={className} fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.8}>
          <path strokeLinecap="round" strokeLinejoin="round" d="M12 9v3.75m-9.303 3.376c-.866 1.5.217 3.374 1.948 3.374h14.71c1.73 0 2.813-1.874 1.948-3.374L13.949 3.378c-.866-1.5-3.032-1.5-3.898 0L2.697 16.126zM12 15.75h.007v.008H12v-.008z" />
        </svg>
      );
    case "check":
      return (
        <svg className={className} fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
          <path strokeLinecap="round" strokeLinejoin="round" d="M4.5 12.75l6 6 9-13.5" />
        </svg>
      );
    default:
      return (
        <svg className={className} fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.8}>
          <path strokeLinecap="round" strokeLinejoin="round" d="M9.594 3.94c.09-.542.56-.94 1.11-.94h2.593c.55 0 1.02.398 1.11.94l.213 1.281c.063.374.313.686.645.87.074.04.147.083.22.127.324.196.72.257 1.075.124l1.217-.456a1.125 1.125 0 011.37.49l1.296 2.247a1.125 1.125 0 01-.26 1.431l-1.003.827c-.293.24-.438.613-.431.992a6.759 6.759 0 010 .255c-.007.378.138.75.43.99l1.005.828c.424.35.534.954.26 1.43l-1.298 2.247a1.125 1.125 0 01-1.369.491l-1.217-.456c-.355-.133-.75-.072-1.076.124a6.57 6.57 0 01-.22.128c-.331.183-.581.495-.644.869l-.213 1.28c-.09.543-.56.941-1.11.941h-2.594c-.55 0-1.02-.398-1.11-.94l-.213-1.281c-.062-.374-.312-.686-.644-.87a6.52 6.52 0 01-.22-.127c-.325-.196-.72-.257-1.076-.124l-1.217.456a1.125 1.125 0 01-1.369-.49l-1.297-2.247a1.125 1.125 0 01.26-1.431l1.004-.827c.292-.24.437-.613.43-.992a6.932 6.932 0 010-.255c.007-.378-.138-.75-.43-.99l-1.004-.828a1.125 1.125 0 01-.26-1.43l1.297-2.247a1.125 1.125 0 011.37-.491l1.216.456c.356.133.751.072 1.076-.124.072-.044.146-.087.22-.128.332-.183.582-.495.644-.869l.214-1.281z" />
          <path strokeLinecap="round" strokeLinejoin="round" d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
        </svg>
      );
  }
}

export default function SettingsView() {
  const [activeTab, setActiveTab] = useState<SettingsTab>("HEALTH");
  const [isPending, startTransition] = useTransition();

  const [healthInfo, setHealthInfo] = useState<SystemHealthAndBackupInfo | null>(null);
  const [academicYears, setAcademicYears] = useState<AcademicYearItem[]>([]);
  const [userAccounts, setUserAccounts] = useState<UserAccountAdminItem[]>([]);
  const [auditLogs, setAuditLogs] = useState<AuditLogItem[]>([]);

  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  const fetchTabData = React.useCallback(() => {
    setErrorMessage(null);
    startTransition(async () => {
      try {
        if (activeTab === "HEALTH") {
          const res = await getSystemHealthAndBackupsAction();
          if (res.success && res.data) setHealthInfo(res.data);
          else setErrorMessage(res.error || "Failed to load health metrics.");
        } else if (activeTab === "ACADEMIC_YEARS") {
          const res = await getAcademicCalendarSettingsAction();
          if (res.success && res.data) setAcademicYears(res.data);
          else setErrorMessage(res.error || "Failed to load academic calendar settings.");
        } else if (activeTab === "USERS") {
          const res = await getUserAccountsAdminAction();
          if (res.success && res.data) setUserAccounts(res.data);
          else setErrorMessage(res.error || "Failed to load user accounts.");
        } else if (activeTab === "AUDIT_LOGS") {
          const res = await getSystemAuditLogsAction();
          if (res.success && res.data) setAuditLogs(res.data);
          else setErrorMessage(res.error || "Failed to load audit logs.");
        }
      } catch (err: unknown) {
        setErrorMessage(err instanceof Error ? err.message : "Failed to load settings data.");
      }
    });
  }, [activeTab]);

  useEffect(() => {
    fetchTabData();
  }, [fetchTabData]);

  // Total record sum calculated from tableCounts
  const totalSystemRecords = React.useMemo(() => {
    if (!healthInfo) return 0;
    return healthInfo.tableCounts.reduce((acc, t) => acc + t.rowCount, 0);
  }, [healthInfo]);

  return (
    <div className="space-y-6">
      {/* Settings Top Header Card */}
      <div className="bg-white rounded-xl border border-slate-200 shadow-xs p-6">
        <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4">
          <div>
            <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-slate-100 border border-slate-200 text-slate-800 text-xs font-semibold mb-2">
              <SvgIcon name="shield-check" className="w-3.5 h-3.5 text-blue-600" />
              Administrative Governance & Security Operations
            </div>
            <h1 className="text-2xl font-bold text-[#0B192C]">
              Institutional System Administration & Configurations
            </h1>
            <p className="text-sm text-slate-500 mt-1">
              R.P. Institute of Hospitality & Management • Operational Infrastructure & Identity Controls
            </p>
          </div>

          <div className="flex items-center gap-3">
            <button
              onClick={fetchTabData}
              disabled={isPending}
              className="inline-flex items-center gap-1.5 px-3.5 py-2 rounded-lg border border-slate-200 bg-white text-slate-700 text-xs font-medium hover:bg-slate-50 shadow-2xs transition-colors disabled:opacity-50"
            >
              <SvgIcon name="refresh" className={`w-3.5 h-3.5 ${isPending ? "animate-spin text-blue-600" : ""}`} />
              Refresh Status
            </button>
          </div>
        </div>
      </div>

      {/* Navigation Tabs */}
      <div className="bg-white rounded-xl border border-slate-200 p-1.5 shadow-xs">
        <div className="flex flex-wrap gap-1">
          <button
            onClick={() => setActiveTab("HEALTH")}
            className={`flex items-center gap-2 px-4 py-2 rounded-lg text-xs font-semibold transition-all ${
              activeTab === "HEALTH"
                ? "bg-[#071322] text-white shadow-xs"
                : "text-slate-600 hover:text-slate-900 hover:bg-slate-100"
            }`}
          >
            <SvgIcon name="server" className="w-3.5 h-3.5" />
            System Health & Telemetry
          </button>
          <button
            onClick={() => setActiveTab("AUDIT_LOGS")}
            className={`flex items-center gap-2 px-4 py-2 rounded-lg text-xs font-semibold transition-all ${
              activeTab === "AUDIT_LOGS"
                ? "bg-[#071322] text-white shadow-xs"
                : "text-slate-600 hover:text-slate-900 hover:bg-slate-100"
            }`}
          >
            <SvgIcon name="activity" className="w-3.5 h-3.5" />
            Audit Log Journal
          </button>
          <button
            onClick={() => setActiveTab("ACADEMIC_YEARS")}
            className={`flex items-center gap-2 px-4 py-2 rounded-lg text-xs font-semibold transition-all ${
              activeTab === "ACADEMIC_YEARS"
                ? "bg-[#071322] text-white shadow-xs"
                : "text-slate-600 hover:text-slate-900 hover:bg-slate-100"
            }`}
          >
            <SvgIcon name="calendar" className="w-3.5 h-3.5" />
            Academic Calendar Matrix
          </button>
          <button
            onClick={() => setActiveTab("USERS")}
            className={`flex items-center gap-2 px-4 py-2 rounded-lg text-xs font-semibold transition-all ${
              activeTab === "USERS"
                ? "bg-[#071322] text-white shadow-xs"
                : "text-slate-600 hover:text-slate-900 hover:bg-slate-100"
            }`}
          >
            <SvgIcon name="users" className="w-3.5 h-3.5" />
            User Roles & Identity
          </button>
        </div>
      </div>

      {/* Error feedback banner */}
      {errorMessage && (
        <div className="p-4 rounded-xl bg-red-50 border border-red-200 text-red-700 text-xs flex items-center gap-2">
          <SvgIcon name="alert" className="w-4 h-4 shrink-0 text-red-600" />
          <span>{errorMessage}</span>
        </div>
      )}

      {/* Loading state indicator */}
      {isPending && (
        <div className="flex items-center justify-center py-12">
          <div className="inline-flex items-center gap-2 px-4 py-2 rounded-full bg-slate-100 border border-slate-200 text-slate-600 text-xs font-medium">
            <SvgIcon name="refresh" className="w-3.5 h-3.5 animate-spin text-blue-600" />
            <span>Loading administrative configuration...</span>
          </div>
        </div>
      )}

      {/* 1. HEALTH TAB */}
      {activeTab === "HEALTH" && healthInfo && (
        <div className="space-y-6">
          {/* Metrics Overview Grid */}
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
            <div className="bg-white p-5 rounded-xl border border-slate-200 shadow-xs">
              <div className="text-[11px] font-semibold text-slate-500 uppercase">Database Integrity</div>
              <div className="mt-2 flex items-center gap-2">
                <span className={`w-2.5 h-2.5 rounded-full ${healthInfo.integrityCheck === "ok" ? "bg-emerald-500" : "bg-red-500"}`}></span>
                <span className="text-lg font-bold text-slate-900 uppercase">{healthInfo.integrityCheck}</span>
              </div>
              <div className="text-xs text-slate-500 mt-1 font-mono">
                FK Violations: {healthInfo.foreignKeyViolations}
              </div>
            </div>

            <div className="bg-white p-5 rounded-xl border border-slate-200 shadow-xs">
              <div className="text-[11px] font-semibold text-slate-500 uppercase">Operational Records</div>
              <div className="mt-2 text-2xl font-bold text-[#0B192C]">
                {totalSystemRecords.toLocaleString("en-IN")}
              </div>
              <div className="text-xs text-slate-500 mt-1 font-mono">
                Across {healthInfo.tableCounts.length} Domain Tables
              </div>
            </div>

            <div className="bg-white p-5 rounded-xl border border-slate-200 shadow-xs">
              <div className="text-[11px] font-semibold text-slate-500 uppercase">Database Storage</div>
              <div className="mt-2 text-2xl font-bold text-blue-700">
                {(healthInfo.fileSizeBytes / 1024).toFixed(1)} KB
              </div>
              <div className="text-xs text-slate-500 mt-1 font-mono">
                Journal: {healthInfo.journalMode.toUpperCase()} • Page: {healthInfo.pageSize}B
              </div>
            </div>

            <div className="bg-white p-5 rounded-xl border border-slate-200 shadow-xs">
              <div className="text-[11px] font-semibold text-slate-500 uppercase">Active HTTP Sessions</div>
              <div className="mt-2 text-2xl font-bold text-emerald-700">
                {healthInfo.totalActiveSessions}
              </div>
              <div className="text-xs text-slate-500 mt-1 font-mono">
                Active Authenticated Tokens
              </div>
            </div>
          </div>

          {/* Cryptographic SHA-256 Hash Card */}
          <div className="bg-white rounded-xl border border-slate-200 shadow-xs p-6">
            <h2 className="text-sm font-bold text-slate-900 mb-2 flex items-center gap-2">
              <SvgIcon name="shield-check" className="w-4 h-4 text-[#1657D9]" />
              Operational Database SHA-256 Baseline Checksum
            </h2>
            <p className="text-xs text-slate-500 mb-3">
              Cryptographically verified live hash of <code className="text-blue-700 font-mono font-semibold">{healthInfo.databasePath}</code>.
            </p>
            <div className="p-3.5 bg-slate-50 rounded-lg border border-slate-200 font-mono text-xs text-slate-800 break-all select-all">
              {healthInfo.sha256Hash}
            </div>
          </div>

          {/* Table Row Counts Cardinality Matrix */}
          <div className="bg-white rounded-xl border border-slate-200 shadow-xs p-6">
            <h2 className="text-sm font-bold text-slate-900 mb-1">
              Prisma Relational Domain Tables ({healthInfo.tableCounts.length} Tables)
            </h2>
            <p className="text-xs text-slate-500 mb-4">
              Direct row counts queried via read-only SQLite PRAGMA telemetries.
            </p>
            <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-6 gap-3">
              {healthInfo.tableCounts.map((t) => (
                <div key={t.tableName} className="p-3 bg-slate-50/80 rounded-lg border border-slate-200">
                  <div className="text-[11px] text-slate-500 font-medium truncate" title={t.tableName}>
                    {t.tableName}
                  </div>
                  <div className="text-base font-bold text-slate-900 mt-0.5">
                    {t.rowCount.toLocaleString("en-IN")}
                  </div>
                </div>
              ))}
            </div>
          </div>

          {/* Verified Backup Snapshots List */}
          <div className="bg-white rounded-xl border border-slate-200 shadow-xs p-6">
            <h2 className="text-sm font-bold text-slate-900 mb-1">
              Verified Database Snapshots & Manifests
            </h2>
            <p className="text-xs text-slate-500 mb-4">
              Cryptographically verifiable backup files preserved in repository directory.
            </p>
            {healthInfo.backupSnapshots.length === 0 ? (
              <div className="p-4 bg-slate-50 text-center text-xs text-slate-400 rounded-lg border border-slate-200">
                No backup snapshot files found in the database directory.
              </div>
            ) : (
              <div className="overflow-x-auto">
                <table className="w-full text-left text-xs border-collapse">
                  <thead>
                    <tr className="bg-slate-100 text-slate-600 uppercase tracking-wider text-[11px] font-semibold">
                      <th className="py-2.5 px-3">Snapshot File</th>
                      <th className="py-2.5 px-3">Size</th>
                      <th className="py-2.5 px-3">Last Modified</th>
                      <th className="py-2.5 px-3 font-mono">SHA-256 Checksum</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100 text-slate-700">
                    {healthInfo.backupSnapshots.map((snap) => (
                      <tr key={snap.filename} className="hover:bg-slate-50 transition-colors">
                        <td className="py-2.5 px-3 font-mono font-bold text-blue-700">{snap.filename}</td>
                        <td className="py-2.5 px-3">{(snap.sizeBytes / 1024).toFixed(1)} KB</td>
                        <td className="py-2.5 px-3 text-slate-500">
                          {new Date(snap.modifiedAt).toLocaleString("en-IN")}
                        </td>
                        <td className="py-2.5 px-3 font-mono text-[11px] text-slate-600 truncate max-w-xs" title={snap.sha256Hash}>
                          {snap.sha256Hash || "N/A"}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </div>
        </div>
      )}

      {/* 2. AUDIT LOGS TAB */}
      {activeTab === "AUDIT_LOGS" && (
        <div className="bg-white rounded-xl border border-slate-200 shadow-xs overflow-hidden">
          <div className="p-4 border-b border-slate-200 bg-slate-50/50 flex items-center justify-between">
            <div>
              <h2 className="font-bold text-slate-900 text-sm">
                Operational Audit Log Journal (Recent System Events)
              </h2>
              <p className="text-xs text-slate-500 mt-0.5">
                Aggregated chronological operational activity across finance, examinations, attendance, and identity.
              </p>
            </div>
            <span className="text-xs font-semibold px-2.5 py-1 rounded-full bg-slate-100 text-slate-700 border border-slate-200">
              {auditLogs.length} Events Logged
            </span>
          </div>

          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs border-collapse">
              <thead>
                <tr className="bg-slate-100 text-slate-600 uppercase tracking-wider text-[11px] font-semibold">
                  <th className="py-3 px-4">Timestamp</th>
                  <th className="py-3 px-4">Event Category</th>
                  <th className="py-3 px-4">Event Title & Details</th>
                  <th className="py-3 px-4">Recorded By / Actor</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 text-slate-700">
                {auditLogs.length === 0 ? (
                  <tr>
                    <td colSpan={4} className="py-12 text-center text-slate-400">
                      Zero audit log events recorded in active database.
                    </td>
                  </tr>
                ) : (
                  auditLogs.map((log) => (
                    <tr key={log.id} className="hover:bg-slate-50 transition-colors">
                      <td className="py-3 px-4 font-mono text-slate-500 whitespace-nowrap">
                        {new Date(log.timestamp).toLocaleString("en-IN")}
                      </td>
                      <td className="py-3 px-4">
                        <span
                          className={`inline-block px-2.5 py-0.5 rounded-full text-[10px] font-bold ${
                            log.eventType === "FINANCE_RECEIPT"
                              ? "bg-emerald-50 text-emerald-700 border border-emerald-200"
                              : log.eventType === "EXAM_PUBLISH"
                              ? "bg-blue-50 text-blue-700 border border-blue-200"
                              : log.eventType === "ATTENDANCE_SESSION"
                              ? "bg-amber-50 text-amber-700 border border-amber-200"
                              : "bg-purple-50 text-purple-700 border border-purple-200"
                          }`}
                        >
                          {log.eventType.replace("_", " ")}
                        </span>
                      </td>
                      <td className="py-3 px-4">
                        <div className="font-semibold text-slate-900">{log.title}</div>
                        <div className="text-slate-600 text-[11px] mt-0.5">{log.description}</div>
                      </td>
                      <td className="py-3 px-4 font-medium text-slate-700">{log.actorName}</td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* 3. ACADEMIC YEARS TAB */}
      {activeTab === "ACADEMIC_YEARS" && (
        <div className="bg-white rounded-xl border border-slate-200 shadow-xs overflow-hidden">
          <div className="p-4 border-b border-slate-200 bg-slate-50/50 flex items-center justify-between">
            <div>
              <h2 className="font-bold text-slate-900 text-sm">
                Academic Calendar Cycles & Institutional Terms
              </h2>
              <p className="text-xs text-slate-500 mt-0.5">
                Active and historical academic cycles configured in the institutional database.
              </p>
            </div>
            <span className="text-xs font-semibold px-2.5 py-1 rounded-full bg-slate-100 text-slate-700 border border-slate-200">
              {academicYears.length} Cycles
            </span>
          </div>

          <div className="p-6 space-y-6">
            {academicYears.map((y) => (
              <div key={y.id} className="border border-slate-200 rounded-xl overflow-hidden shadow-2xs">
                <div className="p-4 bg-slate-50/80 border-b border-slate-200 flex flex-col sm:flex-row sm:items-center justify-between gap-2">
                  <div>
                    <div className="flex items-center gap-2">
                      <span className="font-mono font-bold text-blue-700 text-sm">{y.code}</span>
                      <span className="font-bold text-slate-900 text-sm">— {y.name}</span>
                    </div>
                    <div className="text-xs text-slate-500 mt-0.5">
                      {new Date(y.startDate).toLocaleDateString("en-IN", { day: "numeric", month: "short", year: "numeric" })}
                      {" "}to{" "}
                      {new Date(y.endDate).toLocaleDateString("en-IN", { day: "numeric", month: "short", year: "numeric" })}
                    </div>
                  </div>
                  <span
                    className={`inline-block px-3 py-1 rounded-full text-xs font-bold ${
                      y.isCurrent
                        ? "bg-emerald-50 text-emerald-700 border border-emerald-200"
                        : "bg-slate-100 text-slate-600 border border-slate-200"
                    }`}
                  >
                    {y.isCurrent ? "ACTIVE CURRENT CYCLE" : "ARCHIVED / HISTORICAL"}
                  </span>
                </div>

                <div className="p-4">
                  <h3 className="text-xs font-bold text-slate-700 uppercase tracking-wider mb-3">
                    Configured Academic Terms ({y.terms.length} Terms)
                  </h3>
                  {y.terms.length === 0 ? (
                    <div className="text-xs text-slate-400 py-3 text-center">No term periods defined for this cycle.</div>
                  ) : (
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                      {y.terms.map((term) => (
                        <div key={term.id} className="p-3 bg-white rounded-lg border border-slate-200 flex items-center justify-between">
                          <div>
                            <div className="font-semibold text-slate-900 text-xs">{term.name}</div>
                            <div className="text-[11px] text-slate-500 mt-0.5">
                              {term.termType} • {new Date(term.startDate).toLocaleDateString("en-IN")} to {new Date(term.endDate).toLocaleDateString("en-IN")}
                            </div>
                          </div>
                          {term.isCurrent && (
                            <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-blue-50 text-blue-700 border border-blue-200">
                              Active Term
                            </span>
                          )}
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* 4. USER ACCOUNTS TAB */}
      {activeTab === "USERS" && (
        <div className="bg-white rounded-xl border border-slate-200 shadow-xs overflow-hidden">
          <div className="p-4 border-b border-slate-200 bg-slate-50/50 flex items-center justify-between">
            <div>
              <h2 className="font-bold text-slate-900 text-sm">
                Authorized Institutional User Accounts & Access Control
              </h2>
              <p className="text-xs text-slate-500 mt-0.5">
                Staff and administrator accounts provisioned for CampusOS access.
              </p>
            </div>
            <span className="text-xs font-semibold px-2.5 py-1 rounded-full bg-slate-100 text-slate-700 border border-slate-200">
              {userAccounts.length} User Accounts
            </span>
          </div>

          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs border-collapse">
              <thead>
                <tr className="bg-slate-100 text-slate-600 uppercase tracking-wider text-[11px] font-semibold">
                  <th className="py-3 px-4">User & Linked Profile</th>
                  <th className="py-3 px-4">Email Address</th>
                  <th className="py-3 px-4">Role Designation</th>
                  <th className="py-3 px-4 text-center">Active Sessions</th>
                  <th className="py-3 px-4 text-center">Account Status</th>
                  <th className="py-3 px-4 text-right">Last Login</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 text-slate-700">
                {userAccounts.map((u) => (
                  <tr key={u.id} className="hover:bg-slate-50 transition-colors">
                    <td className="py-3 px-4">
                      <div className="font-bold text-slate-900">{u.fullName}</div>
                      {u.linkedType === "STAFF" && (
                        <div className="text-[11px] text-slate-500">
                          Staff ID: <span className="font-mono font-semibold">{u.linkedIdentifier}</span>
                          {u.departmentName && ` • ${u.departmentName}`}
                        </div>
                      )}
                      {u.linkedType === "STUDENT" && (
                        <div className="text-[11px] text-slate-500">
                          Student Roll: <span className="font-mono font-semibold">{u.linkedIdentifier}</span>
                        </div>
                      )}
                    </td>
                    <td className="py-3 px-4 font-mono text-slate-600">{u.email}</td>
                    <td className="py-3 px-4">
                      <span className="px-2.5 py-0.5 rounded-full text-xs font-semibold bg-blue-50 text-blue-700 border border-blue-200">
                        {u.role}
                      </span>
                    </td>
                    <td className="py-3 px-4 text-center font-bold text-slate-800">
                      {u.activeSessionCount}
                    </td>
                    <td className="py-3 px-4 text-center">
                      <span
                        className={`inline-block px-2.5 py-0.5 rounded-full text-xs font-bold ${
                          u.isActive
                            ? "bg-emerald-50 text-emerald-700 border border-emerald-200"
                            : "bg-red-50 text-red-700 border border-red-200"
                        }`}
                      >
                        {u.isActive ? "ACTIVE" : "SUSPENDED"}
                      </span>
                    </td>
                    <td className="py-3 px-4 text-right font-mono text-slate-500">
                      {u.lastLoginAt ? new Date(u.lastLoginAt).toLocaleString("en-IN") : "Never"}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}
    </div>
  );
}
