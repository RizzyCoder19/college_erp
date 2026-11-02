process.env.DATABASE_URL = "file:./isolated_test.db";

async function verifyIsolationProof() {
  const { prisma } = await import("@/lib/db");
  const dbs = await prisma.$queryRawUnsafe<Array<{ seq: number; name: string; file: string }>>("PRAGMA database_list;");
  console.log("==================================================================");
  console.log("PROOF OF ISOLATION: SHARED PRISMA CLIENT IN @/lib/db");
  console.log("==================================================================");
  console.log("process.env.DATABASE_URL is set to:", process.env.DATABASE_URL);
  console.log("SQLite PRAGMA database_list returned:", dbs);
  
  const connectedFile = dbs[0]?.file || "";
  const isIsolated = connectedFile.endsWith("isolated_test.db");
  console.log(`Connected to isolated database: ${isIsolated} (${connectedFile})`);

  const { ReportsRepository } = await import("@/lib/dal/reportsRepository");
  const attRes = await ReportsRepository.getAttendanceSummaryReport({});
  console.log("ReportsRepository.getAttendanceSummaryReport query succeeded:", attRes.success);
}

verifyIsolationProof().catch(console.error);
