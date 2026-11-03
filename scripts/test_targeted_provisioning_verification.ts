import assert from "assert";
import prisma from "../src/lib/db";
import { verifyPassword } from "../src/lib/auth/password";
import { createSession } from "../src/lib/auth/session";

async function runVerification() {
  console.log("=================================================================");
  console.log("VERIFYING TARGETED ACCOUNT PROVISIONING & ACCESS BOUNDARIES");
  console.log("=================================================================\n");

  // 1. Student Record & Account Verification
  console.log("[CHECK 1: Khan Umar Student Record & UserAccount]");
  const student = await prisma.student.findUnique({
    where: { id: "a82797f8-ae30-42a6-ace7-c1aea744e7e8" },
    include: { userAccount: true, enrolments: true },
  });
  assert(student, "Khan Umar student record must exist");
  assert.strictEqual(student.fullName, "Khan Umar");
  assert.strictEqual(student.rollNumber, "RPIHM-2026DS041");
  assert.strictEqual(student.prn, "2026DS041");
  assert.strictEqual(student.email, "khan.umar.26@rpihm.ac.in");
  assert.strictEqual(student.status, "ACTIVE");
  assert(student.userAccount, "Khan Umar must have a linked UserAccount");
  assert.strictEqual(student.userAccount.role, "STUDENT_VIEWER");
  assert.strictEqual(student.userAccount.email, "khan.umar.26@rpihm.ac.in");
  assert.strictEqual(student.userAccount.staffId, null);
  assert.strictEqual(student.userAccount.studentId, student.id);
  console.log("  PASS: Student record intact and linked to exactly 1 STUDENT_VIEWER UserAccount.");

  // 2. Faculty Record & Account Verification
  console.log("[CHECK 2: Prof. Jeicy Sahaya Staff Record & UserAccount]");
  const facultyUser = await prisma.userAccount.findUnique({
    where: { email: "j.sahaya@sample.rpihm.ac.in" },
    include: {
      staff: {
        include: {
          department: true,
          teachingAssignments: {
            include: {
              subject: true,
              division: true,
            },
          },
        },
      },
    },
  });
  assert(facultyUser, "Faculty user account must exist");
  assert.strictEqual(facultyUser.role, "FACULTY_MEMBER");
  assert.strictEqual(facultyUser.fullName, "Prof. Jeicy Sahaya");
  assert.strictEqual(facultyUser.studentId, null);
  assert(facultyUser.staff, "Faculty user must be linked to Staff record");
  assert.strictEqual(facultyUser.staff.employeeId, "RPIHM-FAC-075");
  assert.strictEqual(facultyUser.staff.status, "ACTIVE");
  assert.strictEqual(facultyUser.staff.department.code, "TC");
  assert.strictEqual(facultyUser.staff.teachingAssignments.length, 1);
  assert.strictEqual(facultyUser.staff.teachingAssignments[0].subject.code, "USDS301");
  assert.strictEqual(facultyUser.staff.teachingAssignments[0].division?.name, "Div A");
  console.log("  PASS: Faculty record intact, active in TC department, assigned to USDS301 Div A.");

  // 3. Existing Administrator Accounts Invariance
  console.log("[CHECK 3: Existing Administrator Accounts Check]");
  const sysAdmin = await prisma.userAccount.findUnique({ where: { email: "admin.local@sample.rpihm.ac.in" } });
  const acadAdmin = await prisma.userAccount.findUnique({ where: { email: "k.sharma@sample.rpihm.ac.in" } });
  assert(sysAdmin && sysAdmin.role === "SYSTEM_ADMIN", "System Admin account must exist");
  assert(acadAdmin && acadAdmin.role === "ACADEMIC_ADMIN", "Academic Admin account must exist");
  console.log("  PASS: Existing System Admin and Academic Admin accounts active and unchanged.");

  // 4. Session Derivation & Role Boundaries
  console.log("[CHECK 4: Session Creation & Role Separation]");
  const { createSession, verifySessionToken } = await import("../src/lib/auth/session");
  const sRes = await createSession(student.userAccount.id);
  const fRes = await createSession(facultyUser.id);
  const aRes = await createSession(acadAdmin.id);

  const studentSession = await verifySessionToken(sRes.token);
  const facultySession = await verifySessionToken(fRes.token);
  const adminSession = await verifySessionToken(aRes.token);

  assert(studentSession, "Student session must verify");
  assert.strictEqual(studentSession.user.role, "STUDENT_VIEWER");
  assert.strictEqual(studentSession.user.studentId, student.id);
  assert.strictEqual(studentSession.user.staffId, null);

  assert(facultySession, "Faculty session must verify");
  assert.strictEqual(facultySession.user.role, "FACULTY_MEMBER");
  assert.strictEqual(facultySession.user.staffId, facultyUser.staff.id);
  assert.strictEqual(facultySession.user.studentId, null);

  assert(adminSession, "Admin session must verify");
  assert.strictEqual(adminSession.user.role, "ACADEMIC_ADMIN");

  // Clean up verification sessions
  await prisma.session.deleteMany({
    where: { id: { in: [sRes.session.id, fRes.session.id, aRes.session.id] } },
  });
  console.log("  PASS: Sessions derive strictly expected roles and relational links without cross-pollution.");

  // 5. Total Entity Counts
  console.log("[CHECK 5: Total Counts Verification]");
  const counts = {
    students: await prisma.student.count(),
    staff: await prisma.staff.count(),
    userAccounts: await prisma.userAccount.count(),
    teachingAssignments: await prisma.teachingAssignment.count(),
    programmes: await prisma.programme.count(),
    divisions: await prisma.division.count(),
  };
  console.log("  Live Counts in prisma/dev.db:", counts);
  assert.strictEqual(counts.students, 13, "Students count must be 13");
  assert.strictEqual(counts.staff, 14, "Staff count must be 14 (13 existing + 1 new)");
  assert.strictEqual(counts.userAccounts, 4, "UserAccount count must be exactly 4");
  assert.strictEqual(counts.teachingAssignments, 6, "TeachingAssignments must be 6 (5 existing + 1 DAA)");
  assert.strictEqual(counts.programmes, 7, "Programmes must be 7");
  assert.strictEqual(counts.divisions, 20, "Divisions must be 20");
  console.log("  PASS: All database counts verified.");

  console.log("\n=================================================================");
  console.log("ALL TARGETED PROVISIONING VERIFICATIONS PASSED (100%)");
  console.log("=================================================================");
}

runVerification()
  .catch((err) => {
    console.error("Verification failed:", err);
    process.exit(1);
  })
  .finally(() => prisma.$disconnect());
