import { PrismaClient } from "@prisma/client";

async function audit(name: string, url: string) {
  const p = new PrismaClient({ datasources: { db: { url } } });
  const students = await p.student.findMany({
    select: {
      id: true,
      prn: true,
      rollNumber: true,
      fullName: true,
      userAccount: { select: { id: true, email: true, role: true } },
    },
  });
  const accounts = await p.userAccount.findMany({
    select: { id: true, email: true, role: true, studentId: true, staffId: true },
  });
  const linked = accounts.filter((a) => a.studentId !== null);
  const unlinkedStudents = students.filter((s) => !s.userAccount);
  const orphanedStudentAccounts = accounts.filter(
    (a) => a.studentId && !students.some((s) => s.id === a.studentId)
  );

  console.log(`=== ${name} (${url}) ===`);
  console.log(`Total Students: ${students.length}`);
  console.log(`Total UserAccounts: ${accounts.length}`);
  console.log(
    `Accounts with role STUDENT_VIEWER: ${accounts.filter((a) => a.role === "STUDENT_VIEWER").length}`
  );
  console.log(`Accounts linked to Student Profile: ${linked.length}`);
  console.log(`Unlinked Student Profiles: ${unlinkedStudents.length}`);
  console.log(`Orphaned Student Links: ${orphanedStudentAccounts.length}`);
  console.log("UserAccounts summary:", accounts.map((a) => ({ email: a.email, role: a.role, studentId: a.studentId, staffId: a.staffId })));
  console.log("Student PRNs:", students.map((s) => s.prn));
  await p.$disconnect();
}

import path from "path";

async function main() {
  const devDbPath = `file:${path.resolve(process.cwd(), "prisma/dev.db")}`;
  const isolatedDbPath = `file:${path.resolve(process.cwd(), "prisma/isolated_test.db")}`;
  await audit("OPERATIONAL DATABASE (dev.db)", devDbPath);
  console.log("");
  await audit("ISOLATED TEST DATABASE (isolated_test.db)", isolatedDbPath);
}

main().catch(console.error);
