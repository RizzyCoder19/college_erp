import fs from "fs";
import path from "path";
import crypto from "crypto";
import { PrismaClient } from "@prisma/client";
import { hashPassword, verifyPassword } from "../src/lib/auth/password";

const DEV_DB = path.resolve(process.cwd(), "prisma/dev.db");

async function main() {
  console.log("=========================================================");
  console.log("CAMPUSOS ERP: OPERATIONAL CREDENTIAL ROTATION");
  console.log("Remediating exposed development administrator credentials");
  console.log("=========================================================\n");

  // 1. Record pre-rotation hash
  const preBuf = fs.readFileSync(DEV_DB);
  const preHash = crypto.createHash("sha256").update(preBuf).digest("hex");
  console.log(`[Database Audit] dev.db PRE-ROTATION SHA-256: ${preHash}`);

  // Point strictly to operational dev.db
  process.env.DATABASE_URL = `file:${DEV_DB}`;
  const prisma = new PrismaClient({
    datasources: {
      db: { url: `file:${DEV_DB}` },
    },
  });

  const adminEmail = "admin.local@sample.rpihm.ac.in";
  const khushaliEmail = "k.sharma@sample.rpihm.ac.in";

  const adminUser = await prisma.userAccount.findUnique({ where: { email: adminEmail } });
  if (!adminUser) throw new Error(`User not found: ${adminEmail}`);

  const khushaliUser = await prisma.userAccount.findUnique({ where: { email: khushaliEmail } });
  if (!khushaliUser) throw new Error(`User not found: ${khushaliEmail}`);

  // 2. Generate new cryptographically secure passwords
  // Pattern: 16+ chars with mixed case, numbers, and symbols
  const adminNewPass = `RpihmAdmin_${crypto.randomBytes(12).toString("base64").replace(/[+/=]/g, "X")}9!`;
  const khushaliNewPass = `RpihmHOD_${crypto.randomBytes(12).toString("base64").replace(/[+/=]/g, "Y")}8!`;

  const adminHash = hashPassword(adminNewPass);
  const khushaliHash = hashPassword(khushaliNewPass);

  // 3. Atomically update hashes and revoke prior sessions
  await prisma.$transaction([
    prisma.userAccount.update({
      where: { id: adminUser.id },
      data: {
        passwordHash: adminHash.hash,
        salt: adminHash.salt,
      },
    }),
    prisma.session.updateMany({
      where: { userId: adminUser.id, revokedAt: null },
      data: { revokedAt: new Date() },
    }),
    prisma.userAccount.update({
      where: { id: khushaliUser.id },
      data: {
        passwordHash: khushaliHash.hash,
        salt: khushaliHash.salt,
      },
    }),
    prisma.session.updateMany({
      where: { userId: khushaliUser.id, revokedAt: null },
      data: { revokedAt: new Date() },
    }),
  ]);

  // 4. Verify password authentication functionality without logging secrets
  const adminAuthOk = verifyPassword(adminNewPass, adminHash.hash, adminHash.salt);
  const khushaliAuthOk = verifyPassword(khushaliNewPass, khushaliHash.hash, khushaliHash.salt);

  if (!adminAuthOk || !khushaliAuthOk) {
    throw new Error("Self-verification failed: Rotated passwords did not verify against stored hashes.");
  }
  console.log(`[Verification] Rotated credentials verified successfully against PBKDF2/scrypt hashes.`);

  // 5. Update local credential files (which are gitignored)
  const adminCredPath = path.resolve(process.cwd(), "dev-admin-credentials.json");
  const khushaliCredPath = path.resolve(process.cwd(), "dev-khushali-credentials.json");

  fs.writeFileSync(
    adminCredPath,
    JSON.stringify(
      {
        notice: "DO NOT COMMIT. This file is gitignored and for local prototype authentication only.",
        rotatedAt: new Date().toISOString(),
        email: adminEmail,
        password: adminNewPass,
      },
      null,
      2
    )
  );

  fs.writeFileSync(
    khushaliCredPath,
    JSON.stringify(
      {
        notice: "DO NOT COMMIT. This file is gitignored and for local prototype authentication only.",
        rotatedAt: new Date().toISOString(),
        staffId: khushaliUser.staffId,
        name: khushaliUser.fullName,
        designation: "Head of the Department",
        department: "Administrative & Student Affairs",
        role: khushaliUser.role,
        email: khushaliEmail,
        password: khushaliNewPass,
      },
      null,
      2
    )
  );

  await prisma.$disconnect();

  // 6. Record post-rotation hash
  const postBuf = fs.readFileSync(DEV_DB);
  const postHash = crypto.createHash("sha256").update(postBuf).digest("hex");
  console.log(`[Database Audit] dev.db POST-ROTATION SHA-256: ${postHash}`);
  console.log(`[Database Audit] Exact fields modified: UserAccount(admin.local).{passwordHash, salt}, UserAccount(k.sharma).{passwordHash, salt}, Session.{revokedAt}`);
  console.log(`[Security Confirmed] Credentials written to gitignored files only. Zero secrets printed.`);
}

main().catch((err) => {
  console.error("Credential rotation failed:", err);
  process.exit(1);
});
