process.env.DATABASE_URL = "file:./isolated_test.db";

async function runMilestone1ESuite() {
  const { prisma } = await import("@/lib/db");
  const { ReportsRepository } = await import("@/lib/dal/reportsRepository");
  const { SettingsRepository } = await import("@/lib/dal/settingsRepository");
  const { hasModuleAccess, hasPermission } = await import("@/lib/auth/roles");

  console.log("==================================================================");
  console.log("CAMPUSOS ERP: MILESTONE 1E AUTOMATED VERIFICATION SUITE");
  console.log("Institutional Intelligence & Administration (Isolated DB)");
  console.log("==================================================================\n");

  let passed = 0;
  let failed = 0;

  function assert(cond: boolean, desc: string) {
    if (cond) {
      console.log(`  [PASS] ${desc}`);
      passed++;
    } else {
      console.error(`  [FAIL] ${desc}`);
      failed++;
    }
  }

  // -------------------------------------------------------------------------
  // 1. Preflight Database Verification on Isolated Copy
  // -------------------------------------------------------------------------
  console.log("--- 1. Preflight Invariance Checks on Isolated Copy ---");
  const dbList = await prisma.$queryRawUnsafe<Array<{ seq: number; name: string; file: string }>>("PRAGMA database_list;");
  assert(
    Boolean(dbList[0]?.file && dbList[0].file.endsWith("isolated_test.db")),
    `Shared Prisma client confirmed bound to isolated_test.db (${dbList[0]?.file})`
  );

  const integrity = await prisma.$queryRawUnsafe<Array<{ integrity_check: string }>>("PRAGMA integrity_check;");
  assert(integrity[0]?.integrity_check === "ok", "Isolated SQLite integrity PRAGMA returned 'ok'");

  const fkCheck = await prisma.$queryRawUnsafe<any[]>("PRAGMA foreign_key_check;");
  assert(fkCheck.length === 0, "Foreign-key check returned 0 violations");

  const subjectCount = await prisma.subject.count();
  assert(subjectCount === 57, `Subject count preserved at 57 (got ${subjectCount})`);

  const studentCount = await prisma.student.count();
  assert(studentCount === 13, `Student count preserved at 13 (got ${studentCount})`);

  // -------------------------------------------------------------------------
  // 2. Reports & Analytics: Repository Methods & Calculations
  // -------------------------------------------------------------------------
  console.log("\n--- 2. Reports & Analytics DAL & Calculations ---");

  // 2.1 Filter Options
  const filterRes = await ReportsRepository.getFilterOptions();
  assert(filterRes.success === true, "ReportsRepository.getFilterOptions() returned success");
  assert((filterRes.data?.academicYears.length || 0) > 0, "Filter options contain academic years");
  assert((filterRes.data?.programmes.length || 0) > 0, "Filter options contain programmes");
  assert((filterRes.data?.semesters.length || 0) > 0, "Filter options contain semesters");

  // 2.2 Attendance Summary
  const attSummaryRes = await ReportsRepository.getAttendanceSummaryReport({});
  assert(attSummaryRes.success === true, "ReportsRepository.getAttendanceSummaryReport() succeeded");
  assert(Array.isArray(attSummaryRes.data), "Attendance summary returned an array");
  if (attSummaryRes.data && attSummaryRes.data.length > 0) {
    const item = attSummaryRes.data[0];
    assert(typeof item.subjectCode === "string", "Summary item contains subjectCode");
    assert(typeof item.averageAttendanceRate === "number", "Summary item calculates averageAttendanceRate");
  }

  // 2.3 Student Attendance Register & Benchmark Threshold (75%)
  const attRegRes = await ReportsRepository.getStudentAttendanceRegister({});
  assert(attRegRes.success === true, "ReportsRepository.getStudentAttendanceRegister() succeeded");
  assert((attRegRes.data?.length || 0) > 0, `Attendance register loaded ${attRegRes.data?.length} students`);
  if (attRegRes.data && attRegRes.data.length > 0) {
    const s = attRegRes.data[0];
    assert(typeof s.attendancePercentage === "number", "Attendance percentage is calculated");
    assert(typeof s.isEligibleForExams === "boolean", "Exam eligibility benchmark is evaluated");
  }

  // 2.4 Examination Results Gazette
  const examRes = await ReportsRepository.getExamResultsReport({});
  assert(examRes.success === true, "ReportsRepository.getExamResultsReport() succeeded");
  assert(Array.isArray(examRes.data), "Exam results returned an array");
  if (examRes.data && examRes.data.length > 0) {
    const e = examRes.data[0];
    assert(typeof e.rollNumber === "string", "Exam result contains rollNumber");
    assert(typeof e.resultStatus === "string", "Exam result contains resultStatus");
  }

  // 2.5 Fee Collection Summary & Metrics
  const finRes = await ReportsRepository.getFinanceCollectionReport({});
  assert(finRes.success === true, "ReportsRepository.getFinanceCollectionReport() succeeded");
  assert(typeof finRes.data?.summary.totalDemand === "number", "Collection summary computes totalDemand");
  assert(typeof finRes.data?.summary.totalPaid === "number", "Collection summary computes totalPaid");
  assert(typeof finRes.data?.summary.collectionRate === "number", "Collection summary computes collectionRate");
  assert(Array.isArray(finRes.data?.summary.paymentMethodDistribution), "Collection summary includes paymentMethodDistribution");
  if (finRes.data && finRes.data.summary.paymentMethodDistribution.length > 0) {
    const pm = finRes.data.summary.paymentMethodDistribution[0];
    assert(typeof pm.paymentMethod === "string", "Payment method distribution item has paymentMethod");
    assert(typeof pm.totalCollected === "number", "Payment method distribution item computes totalCollected");
  }
  assert(Array.isArray(finRes.data?.items), "Finance report includes invoice items array");

  // 2.6 Defaulters Report
  const defRes = await ReportsRepository.getDefaultersReport({});
  assert(defRes.success === true, "ReportsRepository.getDefaultersReport() succeeded");
  assert(Array.isArray(defRes.data), "Defaulters report returned array");
  if (defRes.data && defRes.data.length > 0) {
    const d = defRes.data[0];
    assert(d.outstandingBalance > 0, "Defaulter item has positive outstanding balance");
  }

  // 2.7 Programme Enrolment Demographics
  const progRes = await ReportsRepository.getProgrammeEnrolmentReport();
  assert(progRes.success === true, "ReportsRepository.getProgrammeEnrolmentReport() succeeded");
  assert((progRes.data?.length || 0) > 0, `Programme enrolment loaded ${progRes.data?.length} programmes`);
  if (progRes.data && progRes.data.length > 0) {
    const p = progRes.data[0];
    assert(typeof p.code === "string", "Programme report contains code");
    assert(typeof p.maleCount === "number", "Programme report computes maleCount");
    assert(typeof p.femaleCount === "number", "Programme report computes femaleCount");
  }

  // -------------------------------------------------------------------------
  // 3. Settings & Administration: DAL & Telemetry
  // -------------------------------------------------------------------------
  console.log("\n--- 3. Settings & Administration DAL & Telemetry ---");

  // 3.1 Academic Calendar Settings
  const calRes = await SettingsRepository.getAcademicCalendarSettings();
  assert(calRes.success === true, "SettingsRepository.getAcademicCalendarSettings() succeeded");
  assert((calRes.data?.length || 0) > 0, `Academic calendar loaded ${calRes.data?.length} academic years`);
  if (calRes.data && calRes.data.length > 0) {
    const y = calRes.data[0];
    assert(Array.isArray(y.terms), "Academic year includes terms array");
  }

  // 3.2 User Accounts Administration
  const usersRes = await SettingsRepository.getUserAccountsAdmin();
  assert(usersRes.success === true, "SettingsRepository.getUserAccountsAdmin() succeeded");
  assert((usersRes.data?.length || 0) > 0, `User accounts loaded ${usersRes.data?.length} accounts`);
  if (usersRes.data && usersRes.data.length > 0) {
    const u = usersRes.data[0];
    assert(typeof u.email === "string", "User account contains email");
    assert(typeof u.role === "string", "User account contains role");
    assert(typeof u.activeSessionCount === "number", "User account contains activeSessionCount");
  }

  // 3.3 Audit Logs
  const auditRes = await SettingsRepository.getSystemAuditLogs(20);
  assert(auditRes.success === true, "SettingsRepository.getSystemAuditLogs() succeeded");
  assert(Array.isArray(auditRes.data), "Audit logs returned an array");
  if (auditRes.data && auditRes.data.length > 0) {
    const log = auditRes.data[0];
    assert(typeof log.title === "string", "Audit log item has title");
    assert(typeof log.actorName === "string", "Audit log item has actorName");
  }

  // 3.4 System Health & Backups
  const healthRes = await SettingsRepository.getSystemHealthAndBackups();
  assert(healthRes.success === true, "SettingsRepository.getSystemHealthAndBackups() succeeded");
  assert(healthRes.data?.integrityCheck === "ok", "Database PRAGMA integrity is 'ok'");
  assert(healthRes.data?.foreignKeyViolations === 0, "Database PRAGMA foreign key check is 0");
  assert(typeof healthRes.data?.fileSizeBytes === "number", "Database size reported in bytes");
  assert(typeof healthRes.data?.sha256Hash === "string", "Database SHA-256 hash reported");
  assert((healthRes.data?.tableCounts.length || 0) === 26, `Reported ${healthRes.data?.tableCounts.length} core tables`);
  assert(Array.isArray(healthRes.data?.backupSnapshots), "Backup snapshots returned array");

  // -------------------------------------------------------------------------
  // 4. Role-Based Module Access & Permission Boundaries
  // -------------------------------------------------------------------------
  console.log("\n--- 4. Role-Based Module Access Boundaries ---");

  // System Admin access
  assert(hasModuleAccess("SYSTEM_ADMIN", "reports") === true, "SYSTEM_ADMIN has access to reports");
  assert(hasModuleAccess("SYSTEM_ADMIN", "settings") === true, "SYSTEM_ADMIN has access to settings");

  // Academic Admin access
  assert(hasModuleAccess("ACADEMIC_ADMIN", "reports") === true, "ACADEMIC_ADMIN has access to reports");
  assert(hasModuleAccess("ACADEMIC_ADMIN", "settings") === false, "ACADEMIC_ADMIN is DENIED settings access");

  // Faculty Member access
  assert(hasModuleAccess("FACULTY_MEMBER", "reports") === false, "FACULTY_MEMBER is DENIED reports access");
  assert(hasModuleAccess("FACULTY_MEMBER", "settings") === false, "FACULTY_MEMBER is DENIED settings access");

  // Student Viewer access
  assert(hasModuleAccess("STUDENT_VIEWER", "reports") === false, "STUDENT_VIEWER is DENIED reports access");
  assert(hasModuleAccess("STUDENT_VIEWER", "settings") === false, "STUDENT_VIEWER is DENIED settings access");

  // Permission Checks
  assert(hasPermission("SYSTEM_ADMIN", "ADMIN_ALL") === true, "SYSTEM_ADMIN holds ADMIN_ALL");
  assert(hasPermission("ACADEMIC_ADMIN", "ADMIN_ALL") === false, "ACADEMIC_ADMIN lacks ADMIN_ALL");
  assert(hasPermission("ACADEMIC_ADMIN", "MANAGE_ACADEMICS") === true, "ACADEMIC_ADMIN holds MANAGE_ACADEMICS");

  await prisma.$disconnect();

  console.log("\n==================================================================");
  console.log(`MILESTONE 1E TEST SUMMARY: ${passed} PASSED, ${failed} FAILED`);
  console.log("==================================================================");

  if (failed > 0) {
    process.exit(1);
  }
}

runMilestone1ESuite().catch((e) => {
  console.error("Fatal test suite error:", e);
  process.exit(1);
});
