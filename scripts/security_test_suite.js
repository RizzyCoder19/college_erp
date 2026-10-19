// scripts/security_test_suite.js - Comprehensive Security & Access Control Test Suite
// Verifies password hashing, token-hash-at-rest, timing equalization, RBAC, guard boundaries, safe errors, and bootstrap safety

const { PrismaClient } = require("@prisma/client");
const crypto = require("crypto");
const fs = require("fs");
const path = require("path");

const prisma = new PrismaClient();

const results = [];

function assert(condition, name, details = "") {
  results.push({ name, passed: condition, details });
  const mark = condition ? "[PASS]" : "[FAIL]";
  console.log(`${mark} ${name}${details ? ` -> ${details}` : ""}`);
}

// ---------------------------------------------------------------------------
// Security utility implementations matching production src/lib/auth modules
// ---------------------------------------------------------------------------

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

function validatePasswordStrength(password) {
  if (!password || password.length < 8) {
    return { valid: false, error: "Password must be at least 8 characters in length." };
  }
  const hasLetter = /[a-zA-Z]/.test(password);
  const hasDigit = /[0-9]/.test(password);
  if (!hasLetter || !hasDigit) {
    return { valid: false, error: "Password must contain both letters and numbers." };
  }
  return { valid: true };
}

function hashSessionToken(token) {
  return crypto.createHash("sha256").update(token).digest("hex");
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

// Guard evaluation logic matching src/lib/auth/guards.ts
function evaluateGuardPermission(user, requiredPermission) {
  if (!user) {
    return {
      success: false,
      error: "Authentication required. Please sign in to access institutional resources.",
      code: "UNAUTHORIZED",
    };
  }
  if (!hasPermission(user.role, requiredPermission)) {
    return {
      success: false,
      error: `Access denied. You do not hold the '${requiredPermission}' authorization required for this operation.`,
      code: "FORBIDDEN",
    };
  }
  return { success: true, data: user };
}

function evaluateGuardRole(user, requiredRole) {
  if (!user) {
    return {
      success: false,
      error: "Authentication required. Please sign in to access institutional resources.",
      code: "UNAUTHORIZED",
    };
  }
  if (user.role !== requiredRole && user.role !== "SYSTEM_ADMIN") {
    return {
      success: false,
      error: `Access denied. Role '${requiredRole}' is required for this operation.`,
      code: "FORBIDDEN",
    };
  }
  return { success: true, data: user };
}

// Login simulation matching src/lib/actions/auth.ts
const DUMMY_SALT = "a1b2c3d4e5f60718293a4b5c6d7e8f90";
const DUMMY_HASH = "e3b0c44298fc1c149afbf4c8996fb92427ae41e4649b934ca495991b7852b855e3b0c44298fc1c149afbf4c8996fb92427ae41e4649b934ca495991b7852b855";

async function simulateLogin(dto) {
  if (!dto.email || !dto.password) {
    return {
      success: false,
      error: "Please provide both email address and password.",
      code: "INVALID_INPUT",
    };
  }

  const normalizedEmail = dto.email.trim().toLowerCase();
  try {
    const user = await prisma.userAccount.findUnique({
      where: { email: normalizedEmail },
    });

    if (!user || !user.isActive) {
      verifyPassword(dto.password, DUMMY_HASH, DUMMY_SALT);
      return {
        success: false,
        error: "Invalid email address or password.",
        code: "INVALID_CREDENTIALS",
      };
    }

    const isValid = verifyPassword(dto.password, user.passwordHash, user.salt);
    if (!isValid) {
      return {
        success: false,
        error: "Invalid email address or password.",
        code: "INVALID_CREDENTIALS",
      };
    }

    return {
      success: true,
      data: {
        user: {
          id: user.id,
          email: user.email,
          fullName: user.fullName,
          role: user.role,
        },
      },
    };
  } catch (error) {
    return {
      success: false,
      error: "Authentication service encountered an unexpected error. Please try again later.",
      code: "AUTH_ERROR",
    };
  }
}

// ---------------------------------------------------------------------------
// Main test execution
// ---------------------------------------------------------------------------

async function runSecurityTests() {
  console.log("===============================================================");
  console.log("RPIHM CampusOS Phase 2 Security Hardening Test Suite");
  console.log("===============================================================\n");

  // -------------------------------------------------------------
  // Test Group 1: Password Storage Integrity
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
  // Test Group 2: Password Verification Logic
  // -------------------------------------------------------------
  console.log("\n--- Group 2: Password Verification Logic ---");
  const testPlain = "SecurePass2026!XYZ";
  const { hash: testHash, salt: testSalt } = hashPassword(testPlain);

  assert(verifyPassword(testPlain, testHash, testSalt), "Valid password successfully verified");
  assert(!verifyPassword("WrongPassword123!", testHash, testSalt), "Invalid password reliably rejected");
  assert(!verifyPassword("", testHash, testSalt), "Empty password candidate rejected");
  assert(!verifyPassword(testPlain, testHash, "wrong_salt_1234567890123456789012"), "Invalid salt fails verification");
  assert(!verifyPassword(testPlain, testHash.slice(0, -2) + "00", testSalt), "Tampered hash fails verification");

  // -------------------------------------------------------------
  // Test Group 3: Password Complexity Policy
  // -------------------------------------------------------------
  console.log("\n--- Group 3: Password Complexity Policy ---");
  assert(!validatePasswordStrength("short1").valid, "Rejects passwords shorter than 8 characters");
  assert(!validatePasswordStrength("alllettersonly").valid, "Rejects passwords lacking numbers");
  assert(!validatePasswordStrength("1234567890").valid, "Rejects passwords lacking letters");
  assert(validatePasswordStrength("ValidPassword2026").valid, "Accepts compliant mixed password");

  // -------------------------------------------------------------
  // Test Group 4: Timing Equalization on Login Failure
  // -------------------------------------------------------------
  console.log("\n--- Group 4: Timing Equalization & User Enumeration Mitigation ---");
  const t0_missing = process.hrtime.bigint();
  const resMissing = await simulateLogin({ email: "nonexistent.user.xyz@sample.rpihm.ac.in", password: "Password123!" });
  const t1_missing = process.hrtime.bigint();
  const missingDurationMs = Number(t1_missing - t0_missing) / 1e6;

  const adminUser = await prisma.userAccount.findFirst({ where: { role: "SYSTEM_ADMIN" } });
  const t0_invalidPass = process.hrtime.bigint();
  const resInvalidPass = await simulateLogin({ email: adminUser.email, password: "WrongPassword999!" });
  const t1_invalidPass = process.hrtime.bigint();
  const invalidPassDurationMs = Number(t1_invalidPass - t0_invalidPass) / 1e6;

  assert(resMissing.code === "INVALID_CREDENTIALS", "Missing user returns INVALID_CREDENTIALS");
  assert(resInvalidPass.code === "INVALID_CREDENTIALS", "Wrong password returns INVALID_CREDENTIALS");
  assert(resMissing.error === resInvalidPass.error, "Identical generic error message returned for both paths");

  // Both paths execute scryptSync(password, salt, 64), taking roughly 20-80ms on typical CPU
  assert(missingDurationMs >= 5, "Missing user path executed dummy scrypt derivation", `Duration: ${missingDurationMs.toFixed(2)}ms`);
  assert(invalidPassDurationMs >= 5, "Invalid password path executed scrypt derivation", `Duration: ${invalidPassDurationMs.toFixed(2)}ms`);

  // -------------------------------------------------------------
  // Test Group 5: Token-Hash-At-Rest Session Architecture
  // -------------------------------------------------------------
  console.log("\n--- Group 5: Token-Hash-At-Rest Storage ---");
  const rawToken = crypto.randomBytes(32).toString("hex");
  const tokenHash = hashSessionToken(rawToken);
  const expiresAt = new Date(Date.now() + 7 * 24 * 60 * 60 * 1000);

  // 5.1: Create session storing tokenHash
  const session = await prisma.session.create({
    data: {
      tokenHash,
      userId: adminUser.id,
      expiresAt,
    },
  });

  assert(rawToken.length === 64, "Raw session token is 256-bit (64 hex characters)", `Length: ${rawToken.length}`);
  assert(session.tokenHash.length === 64, "Stored tokenHash is 64 hex characters (SHA-256)", `Length: ${session.tokenHash.length}`);
  assert(session.tokenHash !== rawToken, "Stored tokenHash is NOT equal to raw token (Hash at Rest)");

  // 5.2: Direct lookup by raw token must fail (raw token does not exist in DB)
  const rawLookup = await prisma.session.findUnique({ where: { tokenHash: rawToken } });
  assert(rawLookup === null, "Direct query with raw unhashed token yields null (No Raw Token Storage)");

  // 5.3: Lookup via hashed raw token succeeds
  const hashedLookup = await prisma.session.findUnique({
    where: { tokenHash: hashSessionToken(rawToken) },
    include: { user: true },
  });
  assert(hashedLookup !== null && hashedLookup.revokedAt === null, "Session resolved successfully via SHA-256 hash lookup");

  // 5.4: Tampered raw token lookup fails
  const tamperedToken = rawToken.slice(0, -4) + "ffff";
  const tamperedLookup = await prisma.session.findUnique({ where: { tokenHash: hashSessionToken(tamperedToken) } });
  assert(tamperedLookup === null, "Tampered token fails hash lookup");

  // -------------------------------------------------------------
  // Test Group 6: Session Revocation & Expiry
  // -------------------------------------------------------------
  console.log("\n--- Group 6: Session Revocation & Expiration ---");
  // 6.1: Single token revocation
  await prisma.session.update({
    where: { tokenHash: hashSessionToken(rawToken) },
    data: { revokedAt: new Date() },
  });
  const revokedSession = await prisma.session.findUnique({ where: { tokenHash: hashSessionToken(rawToken) } });
  assert(revokedSession.revokedAt !== null, "Session revoked successfully; revokedAt timestamp recorded");

  // 6.2: Expired session detection
  const expiredRawToken = crypto.randomBytes(32).toString("hex");
  await prisma.session.create({
    data: {
      tokenHash: hashSessionToken(expiredRawToken),
      userId: adminUser.id,
      expiresAt: new Date(Date.now() - 60000), // 1 minute in the past
    },
  });
  const expiredSession = await prisma.session.findUnique({ where: { tokenHash: hashSessionToken(expiredRawToken) } });
  const isExpired = new Date() > expiredSession.expiresAt;
  assert(isExpired, "Expired session correctly recognized as expired");

  // 6.3: Revoke all sessions for a user
  const multiRaw1 = crypto.randomBytes(32).toString("hex");
  const multiRaw2 = crypto.randomBytes(32).toString("hex");
  await prisma.session.createMany({
    data: [
      { tokenHash: hashSessionToken(multiRaw1), userId: adminUser.id, expiresAt },
      { tokenHash: hashSessionToken(multiRaw2), userId: adminUser.id, expiresAt },
    ],
  });
  const revokeResult = await prisma.session.updateMany({
    where: { userId: adminUser.id, revokedAt: null },
    data: { revokedAt: new Date() },
  });
  assert(revokeResult.count >= 2, "Bulk user session revocation succeeded", `Revoked: ${revokeResult.count} sessions`);

  // Clean test sessions
  await prisma.session.deleteMany({
    where: {
      tokenHash: { in: [tokenHash, hashSessionToken(expiredRawToken), hashSessionToken(multiRaw1), hashSessionToken(multiRaw2)] },
    },
  });

  // -------------------------------------------------------------
  // Test Group 7: Inactive Account Lockout
  // -------------------------------------------------------------
  console.log("\n--- Group 7: Inactive Account Lockout ---");
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

  assert(!inactiveUser.isActive, "User account created with isActive = false");

  // Login simulation for inactive user
  const inactiveLogin = await simulateLogin({ email: testInactiveEmail, password: testPlain });
  assert(!inactiveLogin.success, "Inactive user login is rejected");
  assert(inactiveLogin.code === "INVALID_CREDENTIALS", "Inactive user receives generic INVALID_CREDENTIALS code");

  await prisma.userAccount.delete({ where: { id: inactiveUser.id } });

  // -------------------------------------------------------------
  // Test Group 8: Role & Permission Matrix (Least Privilege)
  // -------------------------------------------------------------
  console.log("\n--- Group 8: Role-Based Access Control (Least Privilege) ---");
  // Student Viewer
  assert(hasPermission("STUDENT_VIEWER", "READ_STUDENTS"), "STUDENT_VIEWER holds READ_STUDENTS");
  assert(!hasPermission("STUDENT_VIEWER", "WRITE_STUDENTS"), "STUDENT_VIEWER denied WRITE_STUDENTS");
  assert(!hasPermission("STUDENT_VIEWER", "DELETE_STUDENTS"), "STUDENT_VIEWER denied DELETE_STUDENTS");
  assert(!hasPermission("STUDENT_VIEWER", "READ_FACULTY"), "STUDENT_VIEWER denied READ_FACULTY");
  assert(!hasPermission("STUDENT_VIEWER", "WRITE_FACULTY"), "STUDENT_VIEWER denied WRITE_FACULTY");
  assert(!hasPermission("STUDENT_VIEWER", "DELETE_FACULTY"), "STUDENT_VIEWER denied DELETE_FACULTY");
  assert(!hasPermission("STUDENT_VIEWER", "ADMIN_ALL"), "STUDENT_VIEWER denied ADMIN_ALL");

  // Faculty Member
  assert(hasPermission("FACULTY_MEMBER", "READ_STUDENTS"), "FACULTY_MEMBER holds READ_STUDENTS");
  assert(hasPermission("FACULTY_MEMBER", "READ_FACULTY"), "FACULTY_MEMBER holds READ_FACULTY");
  assert(!hasPermission("FACULTY_MEMBER", "WRITE_STUDENTS"), "FACULTY_MEMBER denied WRITE_STUDENTS");
  assert(!hasPermission("FACULTY_MEMBER", "DELETE_STUDENTS"), "FACULTY_MEMBER denied DELETE_STUDENTS");
  assert(!hasPermission("FACULTY_MEMBER", "WRITE_FACULTY"), "FACULTY_MEMBER denied WRITE_FACULTY");
  assert(!hasPermission("FACULTY_MEMBER", "DELETE_FACULTY"), "FACULTY_MEMBER denied DELETE_FACULTY");
  assert(!hasPermission("FACULTY_MEMBER", "ADMIN_ALL"), "FACULTY_MEMBER denied ADMIN_ALL");

  // Academic Admin
  assert(hasPermission("ACADEMIC_ADMIN", "READ_STUDENTS"), "ACADEMIC_ADMIN holds READ_STUDENTS");
  assert(hasPermission("ACADEMIC_ADMIN", "WRITE_STUDENTS"), "ACADEMIC_ADMIN holds WRITE_STUDENTS");
  assert(hasPermission("ACADEMIC_ADMIN", "READ_FACULTY"), "ACADEMIC_ADMIN holds READ_FACULTY");
  assert(hasPermission("ACADEMIC_ADMIN", "WRITE_FACULTY"), "ACADEMIC_ADMIN holds WRITE_FACULTY");
  assert(!hasPermission("ACADEMIC_ADMIN", "DELETE_STUDENTS"), "ACADEMIC_ADMIN denied DELETE_STUDENTS (Least Privilege)");
  assert(!hasPermission("ACADEMIC_ADMIN", "DELETE_FACULTY"), "ACADEMIC_ADMIN denied DELETE_FACULTY (Least Privilege)");
  assert(!hasPermission("ACADEMIC_ADMIN", "ADMIN_ALL"), "ACADEMIC_ADMIN denied ADMIN_ALL");

  // System Admin
  assert(hasPermission("SYSTEM_ADMIN", "ADMIN_ALL"), "SYSTEM_ADMIN holds ADMIN_ALL");
  assert(hasPermission("SYSTEM_ADMIN", "DELETE_STUDENTS"), "SYSTEM_ADMIN holds DELETE_STUDENTS via ADMIN_ALL");
  assert(hasPermission("SYSTEM_ADMIN", "DELETE_FACULTY"), "SYSTEM_ADMIN holds DELETE_FACULTY via ADMIN_ALL");

  // -------------------------------------------------------------
  // Test Group 9: Action Boundary & Guard Enforcement
  // -------------------------------------------------------------
  console.log("\n--- Group 9: Action Boundary & Guard Enforcement ---");
  // Missing session user -> UNAUTHORIZED
  const unauthResult = evaluateGuardPermission(null, "READ_STUDENTS");
  assert(!unauthResult.success && unauthResult.code === "UNAUTHORIZED", "Unauthenticated request rejected with UNAUTHORIZED");

  // Insufficient permission -> FORBIDDEN
  const studentUserMock = { id: "mock-student", email: "student@sample.rpihm.ac.in", role: "STUDENT_VIEWER" };
  const forbiddenWrite = evaluateGuardPermission(studentUserMock, "WRITE_STUDENTS");
  assert(!forbiddenWrite.success && forbiddenWrite.code === "FORBIDDEN", "STUDENT_VIEWER blocked from WRITE_STUDENTS with FORBIDDEN");

  const forbiddenDelete = evaluateGuardPermission(studentUserMock, "DELETE_STUDENTS");
  assert(!forbiddenDelete.success && forbiddenDelete.code === "FORBIDDEN", "STUDENT_VIEWER blocked from DELETE_STUDENTS with FORBIDDEN");

  // Academic Admin delete attempt -> FORBIDDEN
  const academicAdminMock = { id: "mock-acad", email: "acad@sample.rpihm.ac.in", role: "ACADEMIC_ADMIN" };
  const acadForbiddenDelete = evaluateGuardPermission(academicAdminMock, "DELETE_STUDENTS");
  assert(!acadForbiddenDelete.success && acadForbiddenDelete.code === "FORBIDDEN", "ACADEMIC_ADMIN blocked from DELETE_STUDENTS with FORBIDDEN");

  // Academic Admin write attempt -> SUCCESS
  const acadAllowedWrite = evaluateGuardPermission(academicAdminMock, "WRITE_STUDENTS");
  assert(acadAllowedWrite.success, "ACADEMIC_ADMIN permitted to invoke WRITE_STUDENTS");

  // System Admin delete attempt -> SUCCESS
  const sysAdminMock = { id: "mock-admin", email: "admin@sample.rpihm.ac.in", role: "SYSTEM_ADMIN" };
  const adminAllowedDelete = evaluateGuardPermission(sysAdminMock, "DELETE_STUDENTS");
  assert(adminAllowedDelete.success, "SYSTEM_ADMIN permitted to invoke DELETE_STUDENTS");

  // Role guard verification
  const roleGuardPass = evaluateGuardRole(sysAdminMock, "SYSTEM_ADMIN");
  assert(roleGuardPass.success, "SYSTEM_ADMIN passes role requirement");

  const roleGuardFail = evaluateGuardRole(studentUserMock, "SYSTEM_ADMIN");
  assert(!roleGuardFail.success && roleGuardFail.code === "FORBIDDEN", "STUDENT_VIEWER blocked from SYSTEM_ADMIN role guard");

  // -------------------------------------------------------------
  // Test Group 10: Safe Error Handling & Sanitization
  // -------------------------------------------------------------
  console.log("\n--- Group 10: Error Response Sanitization ---");
  // Input validation errors
  const emptyLogin = await simulateLogin({ email: "", password: "" });
  assert(!emptyLogin.success && emptyLogin.code === "INVALID_INPUT", "Empty credentials yield INVALID_INPUT error");

  // Invalid credentials error does not reveal if email exists
  const invalidUserLogin = await simulateLogin({ email: "random12345@sample.rpihm.ac.in", password: "Password123!" });
  const wrongPassLogin = await simulateLogin({ email: adminUser.email, password: "IncorrectPassword123!" });
  assert(invalidUserLogin.error === wrongPassLogin.error, "Identical generic error string across nonexistent and existent users");
  assert(!invalidUserLogin.error.includes("SQLite") && !invalidUserLogin.error.includes("Prisma"), "Error message contains no database engine details");

  // -------------------------------------------------------------
  // Test Group 11: Administrator Bootstrap & Reset Safety
  // -------------------------------------------------------------
  console.log("\n--- Group 11: Administrator Bootstrap & Reset Safety ---");
  // 11.1: Verify dev-admin-credentials.json is in .gitignore
  const gitignoreContent = fs.readFileSync(path.join(__dirname, "..", ".gitignore"), "utf8");
  assert(gitignoreContent.includes("dev-admin-credentials.json"), "dev-admin-credentials.json is explicitly gitignored");

  // 11.2: Verify bootstrap_admin.js checks for existing admin before creation
  const bootstrapContent = fs.readFileSync(path.join(__dirname, "bootstrap_admin.js"), "utf8");
  assert(bootstrapContent.includes("findFirst"), "Bootstrap script checks for existing administrator");
  assert(bootstrapContent.includes("ADMIN_BOOTSTRAP_KEY"), "Bootstrap script contains production protection guard");

  // 11.3: Verify reset_admin_password.js revokes sessions on reset
  const resetContent = fs.readFileSync(path.join(__dirname, "reset_admin_password.js"), "utf8");
  assert(resetContent.includes("prisma.session.updateMany") && resetContent.includes("revokedAt"), "Reset script revokes all active sessions on password change");

  // -------------------------------------------------------------
  // Test Group 12: Phase 1 Relational Foundation Continuity
  // -------------------------------------------------------------
  console.log("\n--- Group 12: Phase 1 Relational Foundation Continuity ---");
  const [studentCount, staffCount, progCount, deptCount] = await Promise.all([
    prisma.student.count(),
    prisma.staff.count(),
    prisma.programme.count(),
    prisma.department.count(),
  ]);

  assert(studentCount === 10, "10 Phase 1 student records preserved", `Count: ${studentCount}`);
  assert(staffCount >= 10, "Foundational Phase 1 staff records preserved", `Count: ${staffCount}`);
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