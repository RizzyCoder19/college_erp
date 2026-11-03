import fs from "fs";
import path from "path";
import crypto from "crypto";
// Use built-in crypto.randomUUID
const uuidv4 = () => crypto.randomUUID();
import { PrismaClient } from "@prisma/client";
import { hashPassword, verifyPassword } from "../src/lib/auth/password";

const DEV_DB_PATH = path.resolve(process.cwd(), "prisma/dev.db");
const BACKUP_PATH = path.resolve(process.cwd(), "backups/dev_db_pre_targeted_provisioning_20261103.db");
const ISOLATED_DB_PATH = path.resolve(process.cwd(), "prisma/isolated_test.db");

const EXPECTED_INITIAL_HASH = "415b64ac68f85d57e32b5aa5f5323cefdb2986d5c44a75e1a4f4e53f153fb3d8";
const EXPECTED_INITIAL_SIZE = 745472;

function computeHash(filePath: string): { hash: string; size: number } {
  const data = fs.readFileSync(filePath);
  const hash = crypto.createHash("sha256").update(data).digest("hex");
  return { hash, size: data.length };
}

async function main() {
  console.log("=================================================================");
  console.log("CAMPUSOS ERP: TARGETED STUDENT & FACULTY ACCOUNT PROVISIONING");
  console.log("=================================================================\n");

  // STEP 1: Verify operational DB and backup baseline
  console.log("[STEP 1: Database Pre-Flight Check]");
  const devCheck = computeHash(DEV_DB_PATH);
  console.log(`  Current dev.db SHA-256: ${devCheck.hash} (${devCheck.size} bytes)`);
  if (devCheck.hash !== EXPECTED_INITIAL_HASH || devCheck.size !== EXPECTED_INITIAL_SIZE) {
    throw new Error(`dev.db does not match expected baseline! Aborting.`);
  }

  if (!fs.existsSync(BACKUP_PATH)) {
    throw new Error(`Backup file ${BACKUP_PATH} does not exist! Aborting.`);
  }
  const backupCheck = computeHash(BACKUP_PATH);
  console.log(`  Backup dev.db SHA-256: ${backupCheck.hash} (${backupCheck.size} bytes)`);
  if (backupCheck.hash !== EXPECTED_INITIAL_HASH) {
    throw new Error(`Backup hash does not match current dev.db! Aborting.`);
  }
  console.log("  PASS: Pre-flight baseline & backup verified.\n");

  // STEP 2: Generate secure credentials
  console.log("[STEP 2: Credential Generation]");
  const khanPassword = "KhanUmar_2026!kS9xQ7";
  const sahayaPassword = "JeicySahaya_2026!vT4wZ8";

  const khanHash = hashPassword(khanPassword);
  const sahayaHash = hashPassword(sahayaPassword);
  console.log("  PASS: Cryptographically secure random salts and scrypt hashes generated.\n");

  // Target IDs and Details
  const khanStudentId = "a82797f8-ae30-42a6-ace7-c1aea744e7e8";
  const khanEmail = "khan.umar.26@rpihm.ac.in";
  const khanUserAccountId = uuidv4();

  const sahayaStaffId = uuidv4();
  const sahayaEmail = "j.sahaya@sample.rpihm.ac.in";
  const sahayaEmployeeId = "RPIHM-FAC-075";
  const sahayaDepartmentId = "055f71a9-5d76-43a8-9b0e-4d46248d9898"; // Technology & Computing
  const sahayaAssignmentId = uuidv4();
  const daaSubjectId = "1b9b24a6-fcf2-50ec-b3f8-366a888b8caf"; // USDS301
  const sem3DivAId = "9c02a675-8078-4173-aa02-d0c192437caf"; // Div A
  const sahayaUserAccountId = uuidv4();

  // STEP 3: Dry-run against isolated test DB
  console.log("[STEP 3: Isolated Database Dry-Run Validation]");
  // Copy current dev.db state to isolated test db for dry-run
  fs.copyFileSync(DEV_DB_PATH, ISOLATED_DB_PATH);
  const isolatedPrisma = new PrismaClient({
    datasources: { db: { url: `file:${ISOLATED_DB_PATH}` } },
  });

  try {
    await isolatedPrisma.$transaction(async (tx) => {
      // 1. Update Khan Umar email & create UserAccount
      await tx.student.update({
        where: { id: khanStudentId },
        data: { email: khanEmail },
      });
      await tx.userAccount.create({
        data: {
          id: khanUserAccountId,
          email: khanEmail,
          passwordHash: khanHash.hash,
          salt: khanHash.salt,
          fullName: "Khan Umar",
          role: "STUDENT_VIEWER",
          isActive: true,
          studentId: khanStudentId,
        },
      });

      // 2. Create Staff for Prof. Jeicy Sahaya
      await tx.staff.create({
        data: {
          id: sahayaStaffId,
          employeeId: sahayaEmployeeId,
          fullName: "Prof. Jeicy Sahaya",
          email: sahayaEmail,
          phone: "+91 98205 11223",
          designation: "Assistant Professor",
          category: "TEACHING",
          departmentId: sahayaDepartmentId,
          dateOfJoining: new Date("2024-01-15"),
          status: "ACTIVE",
          qualification: "M.Tech in Computer Science & Engineering",
          specialization: "Design & Analysis of Algorithms, Data Science",
          workloadHours: 4,
        },
      });

      // 3. Create Teaching Assignment for DAA Div A
      await tx.teachingAssignment.create({
        data: {
          id: sahayaAssignmentId,
          staffId: sahayaStaffId,
          subjectId: daaSubjectId,
          divisionId: sem3DivAId,
          weeklyHours: 4,
        },
      });

      // 4. Create UserAccount for Prof. Jeicy Sahaya
      await tx.userAccount.create({
        data: {
          id: sahayaUserAccountId,
          email: sahayaEmail,
          passwordHash: sahayaHash.hash,
          salt: sahayaHash.salt,
          fullName: "Prof. Jeicy Sahaya",
          role: "FACULTY_MEMBER",
          isActive: true,
          staffId: sahayaStaffId,
        },
      });
    });

    // Verify dry-run constraints
    const testKhanUser = await isolatedPrisma.userAccount.findUnique({
      where: { email: khanEmail },
      include: { student: true },
    });
    const testSahayaUser = await isolatedPrisma.userAccount.findUnique({
      where: { email: sahayaEmail },
      include: { staff: { include: { teachingAssignments: true } } },
    });

    if (!testKhanUser || testKhanUser.role !== "STUDENT_VIEWER" || testKhanUser.studentId !== khanStudentId) {
      throw new Error("Isolated dry-run failed for Khan Umar user account!");
    }
    if (!testSahayaUser || testSahayaUser.role !== "FACULTY_MEMBER" || testSahayaUser.staffId !== sahayaStaffId) {
      throw new Error("Isolated dry-run failed for Prof. Jeicy Sahaya user account!");
    }
    if (testSahayaUser.staff?.teachingAssignments.length !== 1) {
      throw new Error("Teaching assignment linkage dry-run failed!");
    }

    // Verify password check
    if (!verifyPassword(khanPassword, testKhanUser.passwordHash, testKhanUser.salt)) {
      throw new Error("Khan password verification failed in dry-run!");
    }
    if (!verifyPassword(sahayaPassword, testSahayaUser.passwordHash, testSahayaUser.salt)) {
      throw new Error("Sahaya password verification failed in dry-run!");
    }

    console.log("  PASS: Isolated dry-run transaction, relational integrity & password checks succeeded.\n");
  } finally {
    await isolatedPrisma.$disconnect();
  }

  // STEP 4: Operational Provisioning on prisma/dev.db
  console.log("[STEP 4: Executing Operational Provisioning on prisma/dev.db]");
  const devPrisma = new PrismaClient({
    datasources: { db: { url: `file:${DEV_DB_PATH}` } },
  });

  try {
    await devPrisma.$transaction(async (tx) => {
      // 1. Update Khan Umar email on Student record
      await tx.student.update({
        where: { id: khanStudentId },
        data: { email: khanEmail },
      });

      // 2. Create UserAccount for Khan Umar
      await tx.userAccount.create({
        data: {
          id: khanUserAccountId,
          email: khanEmail,
          passwordHash: khanHash.hash,
          salt: khanHash.salt,
          fullName: "Khan Umar",
          role: "STUDENT_VIEWER",
          isActive: true,
          studentId: khanStudentId,
        },
      });

      // 3. Create Staff for Prof. Jeicy Sahaya
      await tx.staff.create({
        data: {
          id: sahayaStaffId,
          employeeId: sahayaEmployeeId,
          fullName: "Prof. Jeicy Sahaya",
          email: sahayaEmail,
          phone: "+91 98205 11223",
          designation: "Assistant Professor",
          category: "TEACHING",
          departmentId: sahayaDepartmentId,
          dateOfJoining: new Date("2024-01-15"),
          status: "ACTIVE",
          qualification: "M.Tech in Computer Science & Engineering",
          specialization: "Design & Analysis of Algorithms, Data Science",
          workloadHours: 4,
        },
      });

      // 4. Create Teaching Assignment for DAA Div A
      await tx.teachingAssignment.create({
        data: {
          id: sahayaAssignmentId,
          staffId: sahayaStaffId,
          subjectId: daaSubjectId,
          divisionId: sem3DivAId,
          weeklyHours: 4,
        },
      });

      // 5. Create UserAccount for Prof. Jeicy Sahaya
      await tx.userAccount.create({
        data: {
          id: sahayaUserAccountId,
          email: sahayaEmail,
          passwordHash: sahayaHash.hash,
          salt: sahayaHash.salt,
          fullName: "Prof. Jeicy Sahaya",
          role: "FACULTY_MEMBER",
          isActive: true,
          staffId: sahayaStaffId,
        },
      });
    });

    console.log("  PASS: Operational transaction committed successfully.\n");
  } catch (err) {
    console.error("  CRITICAL ERROR DURING OPERATIONAL PROVISIONING. RESTORING BACKUP...", err);
    fs.copyFileSync(BACKUP_PATH, DEV_DB_PATH);
    throw err;
  } finally {
    await devPrisma.$disconnect();
  }

  // STEP 5: Store credentials in gitignored local files
  console.log("[STEP 5: Storing Credentials in Gitignored Files]");
  const studentCredsFile = path.resolve(process.cwd(), "dev-student-khan-credentials.json");
  const facultyCredsFile = path.resolve(process.cwd(), "dev-faculty-sahaya-credentials.json");

  fs.writeFileSync(
    studentCredsFile,
    JSON.stringify(
      {
        notice: "DO NOT COMMIT. This file is gitignored and for local prototype authentication only.",
        provisionedAt: new Date().toISOString(),
        studentId: khanStudentId,
        fullName: "Khan Umar",
        prn: "2026DS041",
        rollNumber: "RPIHM-2026DS041",
        programme: "B.Sc. Data Science with AI (Semester 3, Div A)",
        role: "STUDENT_VIEWER",
        email: khanEmail,
        password: khanPassword,
      },
      null,
      2
    )
  );

  fs.writeFileSync(
    facultyCredsFile,
    JSON.stringify(
      {
        notice: "DO NOT COMMIT. This file is gitignored and for local prototype authentication only.",
        provisionedAt: new Date().toISOString(),
        staffId: sahayaStaffId,
        fullName: "Prof. Jeicy Sahaya",
        employeeId: sahayaEmployeeId,
        designation: "Assistant Professor",
        department: "Technology & Computing",
        teachingAssignment: "USDS301: Design and Analysis of Algorithms (Semester 3, Div A)",
        role: "FACULTY_MEMBER",
        email: sahayaEmail,
        password: sahayaPassword,
      },
      null,
      2
    )
  );

  console.log(`  PASS: Saved ${studentCredsFile}`);
  console.log(`  PASS: Saved ${facultyCredsFile}\n`);

  // STEP 6: Post-provisioning database verification
  console.log("[STEP 6: Post-Provisioning Invariants & Verification]");
  const postPrisma = new PrismaClient({
    datasources: { db: { url: `file:${DEV_DB_PATH}` } },
  });

  try {
    const totalUsers = await postPrisma.userAccount.count();
    const totalStudents = await postPrisma.student.count();
    const totalStaff = await postPrisma.staff.count();
    const totalAssignments = await postPrisma.teachingAssignment.count();

    console.log(`  Total UserAccounts: ${totalUsers} (expected 4: 2 admins + 1 student + 1 faculty)`);
    console.log(`  Total Students: ${totalStudents} (expected 13)`);
    console.log(`  Total Staff: ${totalStaff} (expected 14: 13 existing + 1 new Prof. Jeicy Sahaya)`);
    console.log(`  Total Teaching Assignments: ${totalAssignments} (expected 6: 5 existing + 1 DAA)`);

    if (totalUsers !== 4 || totalStudents !== 13 || totalStaff !== 14 || totalAssignments !== 6) {
      throw new Error("Post-provisioning record counts do not match expectations!");
    }

    const verifiedKhanUser = await postPrisma.userAccount.findUnique({
      where: { email: khanEmail },
      include: { student: true },
    });
    const verifiedSahayaUser = await postPrisma.userAccount.findUnique({
      where: { email: sahayaEmail },
      include: { staff: { include: { teachingAssignments: true } } },
    });

    if (!verifiedKhanUser || !verifyPassword(khanPassword, verifiedKhanUser.passwordHash, verifiedKhanUser.salt)) {
      throw new Error("Khan Umar credentials failed verification!");
    }
    if (!verifiedSahayaUser || !verifyPassword(sahayaPassword, verifiedSahayaUser.passwordHash, verifiedSahayaUser.salt)) {
      throw new Error("Prof. Jeicy Sahaya credentials failed verification!");
    }

    const postDevCheck = computeHash(DEV_DB_PATH);
    console.log(`\n  Final dev.db SHA-256: ${postDevCheck.hash} (${postDevCheck.size} bytes)`);

    console.log("\n=================================================================");
    console.log("PROVISIONING COMPLETED & VERIFIED SUCCESSFULLY");
    console.log("=================================================================");
  } finally {
    await postPrisma.$disconnect();
  }
}

main().catch((err) => {
  console.error("FATAL ERROR:", err);
  process.exit(1);
});
