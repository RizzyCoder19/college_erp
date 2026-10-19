// scripts/reset_admin_password.js - Administrator Password Reset & Recovery
// Resets password and revokes all active sessions without printing credentials to logs

const { PrismaClient } = require("@prisma/client");
const crypto = require("crypto");
const fs = require("fs");
const path = require("path");

const prisma = new PrismaClient();

function hashPassword(password) {
  const salt = crypto.randomBytes(16).toString("hex");
  const hash = crypto.scryptSync(password, salt, 64).toString("hex");
  return { hash, salt };
}

async function main() {
  console.log("=== RPIHM CampusOS Administrator Password Recovery ===");

  const email = (process.argv[2] || process.env.BOOTSTRAP_ADMIN_EMAIL || "admin.local@sample.rpihm.ac.in").trim().toLowerCase();

  const user = await prisma.userAccount.findUnique({
    where: { email },
  });

  if (!user) {
    console.error(`[Recovery Error] No user account found with email: ${email}`);
    process.exit(1);
  }

  // Generate new secure password
  const randomBytes = crypto.randomBytes(12).toString("base64").replace(/[+/=]/g, "B");
  const newPassword = `RpihmReset_${randomBytes}8!`;

  const { hash, salt } = hashPassword(newPassword);

  // Update password and revoke all active sessions atomically
  await prisma.$transaction([
    prisma.userAccount.update({
      where: { id: user.id },
      data: { passwordHash: hash, salt },
    }),
    prisma.session.updateMany({
      where: { userId: user.id, revokedAt: null },
      data: { revokedAt: new Date() },
    }),
  ]);

  const credPath = path.join(__dirname, "..", "dev-admin-credentials.json");
  const credData = {
    notice: "DO NOT COMMIT. This file is gitignored and for local prototype authentication only.",
    resetAt: new Date().toISOString(),
    email,
    password: newPassword,
  };
  fs.writeFileSync(credPath, JSON.stringify(credData, null, 2), "utf8");

  console.log(`[Recovery Success] Password successfully reset for user: ${email}`);
  console.log(`  - All prior active sessions have been revoked.`);
  console.log(`  - New credentials written to: dev-admin-credentials.json (Git-ignored)`);
}

main()
  .catch((err) => {
    console.error("[Recovery Error]:", err.message);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });