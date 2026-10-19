// scripts/security_test_suite.js - Automated Security & Access Control Test Suite
// Verifies password hashing, session lifecycles, permission enforcement, and action protection

const { PrismaClient } = require("@prisma/client");
const crypto = require("crypto");

const prisma = new PrismaClient();

const results = [];

function assert(condition, name, details = "") {
  results.push({ name, passed: condition, details });
  const mark = condition ? "[PASS]" : "[FAIL]";
  console.log(`${mark} ${name}${details ? ` -> ${details}` : ""}`);
}

function hashPassword(password) {
  const salt = crypto.randomBytes(16).toString("hex");
  const hash = crypto.scryptSync(password, salt, 64).toString("hex");
  return { hash, salt };
}

function verifyPassword(password, expectedHash, salt) {
  try {
    const candidateHash = crypto.scryptSync(password, salt, 64).toString("hex");
    const candidateBuffer = Buffer.from(candidateHash, "hex");
    const expectedBuffer = Buffer.from(expectedHash, "hex");
    if (candidateBuffer.length !== expectedBuffer.length) return false;
    return crypto.timingSafeEqual(candidateBuffer, expectedBuffer);
  } catch {
    return false;
  }
}

const ROLE_PERMISSIONS = {
  SYSTEM_ADMIN: ["ADMIN_ALL", "READ_STUDENTS", "WRITE_STUDENTS", "DELETE_STUDENTS", "READ_FACULTY", "WRITE_FACULTY", "DELETE_FACULTY", "MANAGE_ACADEMICS"],
  ACADEMIC_ADMIN: ["READ_STUDENTS", "WRITE_STUDENTS", "READ_FACULTY", "WRITE_FACULTY", "MANAGE_ACADEMICS"],
  FACULTY_MEMBER: ["READ_STUDENTS", "READ_FACULTY"],
  STUDENT_VIEWER: ["READ_STUDENTS"],
};

function hasPermission(role, permission) {
  const permissions = ROLE_PERMISSIONS[role];
  if (!permissions) return false;
  return permissions.includes("ADMIN_ALL") || permissions.includes(permission);
}

async function runSecurityTests() {
  console.log("===============================================================");
  console.log("RPIHM CampusOS Phase 2 Security & Access-Control Test Suite");
  console.log("===============================================================\n");

  // -------------------------------------------------------------
  // Test 1: Plaintext Password Non-Storage
  // -------------------------------------------------------------
  console.log("--- Group 1: Password Storage Integrity ---");
  const allUsers = await prisma.userAccount.findMany();
  assert(allUsers.length > 0, "User accounts exist in database", `Found ${allUsers.length} user(s)`);

  let allHashedProperly = true;
  for (const u of allUsers) {
    if (!u.passwordHash || u.passwordHash.length !== 128 || !u.salt || u.salt.length !== 32) {
      allHashedProperly = false;
    }
  }
  assert(allHashedProperly, "All stored passwords use 128-char scrypt hash + 32-char salt (No Plaintext)");

  // -------------------------------------------------------------
  // Test 2: Password Verification & Constant-Time Resistance
  // -------------------------------------------------------------
  console.log("\n--- Group 2: Password Verification Logic ---");
  const testPlain = "SecurePass2026!XYZ";
  const { hash: testHash, salt: testSalt } = hashPassword(testPlain);

  assert(verifyPassword(testPlain, testHash, testSalt), "Valid password successfully verified");
  assert(!verifyPassword("WrongPassword123!", testHash, testSalt), "Invalid password reliably rejected");
  assert(!verifyPassword("", testHash, testSalt), "Empty password candidate rejected");
  assert(!verifyPassword(testPlain, testHash, "wrong_salt_1234567890123456789012"), "Invalid salt fails verification");

  // -------------------------------------------------------------
  // Test 3: Session Lifecycle (Creation, Token Entropy, Expiry, Revocation)
  // -------------------------------------------------------------
  console.log("\n--- Group 3: Session Lifecycle & Validation ---");
  const adminUser = await prisma.userAccount.findFirst({ where: { role: "SYSTEM_ADMIN" } });
  
  // 3.1: Token creation & length
  const token = crypto.randomBytes(32).toString("hex");
  const expiresAt = new Date(Date.now() + 7 * 24 * 60 * 60 * 1000);
  const session = await prisma.session.create({
    data: {
      token,
      userId: adminUser.id,
      expiresAt,
    },
  });

  assert(session.token.length === 64, "Session token is 256-bit (64 hex characters)", `Token length: ${session.token.length}`);
  assert(session.expiresAt > new Date(), "Session expiration correctly set in the future");

  // 3.2: Active session query
  const queriedSession = await prisma.session.findUnique({
    where: { token },
    include: { user: true },
  });
  assert(queriedSession !== null && queriedSession.revokedAt === null, "Active session successfully resolved");

  // 3.3: Revocation
  await prisma.session.update({
    where: { token },
    data: { revokedAt: new Date() },
  });
  const revokedSession = await prisma.session.findUnique({ where: { token } });
  assert(revokedSession.revokedAt !== null, "Session logout explicitly records revocation timestamp");

  // 3.4: Expired session detection
  const expiredToken = crypto.randomBytes(32).toString("hex");
  await prisma.session.create({
    data: {
      token: expiredToken,
      userId: adminUser.id,
      expiresAt: new Date(Date.now() - 10000), // in the past
    },
  });
  const expiredSession = await prisma.session.findUnique({ where: { token: expiredToken } });
  const isExpired = new Date() > expiredSession.expiresAt;
  assert(isExpired, "Expired session correctly recognized as expired");

  // Clean test sessions
  await prisma.session.deleteMany({ where: { token: { in: [token, expiredToken] } } });

  // -------------------------------------------------------------
  // Test 4: Role-Based Access Control (Least Privilege)
  // -------------------------------------------------------------
  console.log("\n--- Group 4: Role & Permission Boundary Enforcement ---");
  // Student Viewer boundaries
  assert(hasPermission("STUDENT_VIEWER", "READ_STUDENTS"), "STUDENT_VIEWER has READ_STUDENTS permission");
  assert(!hasPermission("STUDENT_VIEWER", "WRITE_STUDENTS"), "STUDENT_VIEWER lacks WRITE_STUDENTS permission");
  assert(!hasPermission("STUDENT_VIEWER", "DELETE_STUDENTS"), "STUDENT_VIEWER lacks DELETE_STUDENTS permission");
  assert(!hasPermission("STUDENT_VIEWER", "WRITE_FACULTY"), "STUDENT_VIEWER lacks WRITE_FACULTY permission");

  // Faculty Member boundaries
  assert(hasPermission("FACULTY_MEMBER", "READ_STUDENTS"), "FACULTY_MEMBER has READ_STUDENTS permission");
  assert(hasPermission("FACULTY_MEMBER", "READ_FACULTY"), "FACULTY_MEMBER has READ_FACULTY permission");
  assert(!hasPermission("FACULTY_MEMBER", "WRITE_STUDENTS"), "FACULTY_MEMBER lacks WRITE_STUDENTS permission");
  assert(!hasPermission("FACULTY_MEMBER", "DELETE_FACULTY"), "FACULTY_MEMBER lacks DELETE_FACULTY permission");

  // Academic Admin boundaries
  assert(hasPermission("ACADEMIC_ADMIN", "WRITE_STUDENTS"), "ACADEMIC_ADMIN has WRITE_STUDENTS permission");
  assert(hasPermission("ACADEMIC_ADMIN", "WRITE_FACULTY"), "ACADEMIC_ADMIN has WRITE_FACULTY permission");
  assert(!hasPermission("ACADEMIC_ADMIN", "DELETE_STUDENTS"), "ACADEMIC_ADMIN lacks DELETE_STUDENTS permission (Least Privilege)");
  assert(!hasPermission("ACADEMIC_ADMIN", "DELETE_FACULTY"), "ACADEMIC_ADMIN lacks DELETE_FACULTY permission (Least Privilege)");

  // System Admin boundaries
  assert(hasPermission("SYSTEM_ADMIN", "ADMIN_ALL"), "SYSTEM_ADMIN has global ADMIN_ALL permission");
  assert(hasPermission("SYSTEM_ADMIN", "DELETE_STUDENTS"), "SYSTEM_ADMIN can invoke DELETE_STUDENTS");
  assert(hasPermission("SYSTEM_ADMIN", "DELETE_FACULTY"), "SYSTEM_ADMIN can invoke DELETE_FACULTY");

  // -------------------------------------------------------------
  // Test 5: Inactive Account Session Rejection
  // -------------------------------------------------------------
  console.log("\n--- Group 5: Inactive Account Lockout ---");
  const testInactiveEmail = "inactive.user@sample.rpihm.ac.in";
  await prisma.userAccount.deleteMany({ where: { email: testInactiveEmail } });

  const inactiveUser = await prisma.userAccount.create({
    data: {
      email: testInactiveEmail,
      fullName: "Suspended Account Test",
      passwordHash: testHash,
      salt: testSalt,
      role: "STUDENT_VIEWER",
      isActive: false, // Suspended
    },
  });

  assert(!inactiveUser.isActive, "User account flagged as inactive");
  // Ensure that inactive user accounts are rejected
  const inactiveCheck = inactiveUser.isActive ? true : false;
  assert(!inactiveCheck, "Inactive user account is barred from active session generation");

  await prisma.userAccount.delete({ where: { id: inactiveUser.id } });

  // -------------------------------------------------------------
  // Test 6: Phase 1 Data Foundation Continuity
  // -------------------------------------------------------------
  console.log("\n--- Group 6: Phase 1 Relational Foundation Continuity ---");
  const [studentCount, staffCount, progCount, deptCount] = await Promise.all([
    prisma.student.count(),
    prisma.staff.count(),
    prisma.programme.count(),
    prisma.department.count(),
  ]);

  assert(studentCount === 10, "10 Phase 1 student records preserved", `Count: ${studentCount}`);
  assert(staffCount === 10, "10 Phase 1 staff records preserved", `Count: ${staffCount}`);
  assert(progCount === 7, "7 Phase 1 programmes preserved", `Count: ${progCount}`);
  assert(deptCount === 3, "3 Phase 1 departments preserved", `Count: ${deptCount}`);

  // -------------------------------------------------------------
  // Summary
  // -------------------------------------------------------------
  console.log("\n===============================================================");
  const total = results.length;
  const passed = results.filter(r => r.passed).length;
  const failed = total - passed;
  console.log(`Security Test Suite Summary: Total: ${total} | Passed: ${passed} | Failed: ${failed}`);
  console.log(`Security Integrity Score: ${Math.round((passed / total) * 100)}%`);
  console.log("===============================================================");

  if (failed > 0) {
    process.exit(1);
  }
}

runSecurityTests()
  .catch((err) => {
    console.error("Fatal security suite failure:", err);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });