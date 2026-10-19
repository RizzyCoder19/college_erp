// scripts/bootstrap_admin.js - Safe Development Administrator Bootstrap
// Configures initial local administrator without exposing secrets or hardcoding credentials

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
  console.log("=== RPIHM CampusOS Administrator Bootstrap ===");

  // Safety check: Prevent accidental execution in production without explicit clearance
  if (process.env.NODE_ENV === "production" && !process.env.ADMIN_BOOTSTRAP_KEY) {
    console.error("[SECURITY ERROR] Automatic administrator bootstrapping is blocked in production mode.");
    console.error("Set ADMIN_BOOTSTRAP_KEY to authorize manual production bootstrap.");
    process.exit(1);
  }

  // 1. Check if an administrator already exists
  const existingAdmin = await prisma.userAccount.findFirst({
    where: { role: "SYSTEM_ADMIN" },
  });

  if (existingAdmin) {
    console.log(`[Bootstrap Info] A System Administrator account is already registered (${existingAdmin.email}).`);
    console.log("To reset an existing administrator password, run the reset procedure with explicit confirmation.");
    process.exit(0);
  }

  // 2. Read or generate credentials securely
  const email = (process.env.BOOTSTRAP_ADMIN_EMAIL || "admin.local@sample.rpihm.ac.in").trim().toLowerCase();
  let password = process.env.BOOTSTRAP_ADMIN_PASSWORD;
  let generatedLocally = false;

  if (!password) {
    // Generate a secure random password (16 chars, letters + numbers)
    const randomBytes = crypto.randomBytes(12).toString("base64").replace(/[+/=]/g, "A");
    password = `RpihmAdmin_${randomBytes}9!`;
    generatedLocally = true;
  }

  // 3. Hash and store
  const { hash, salt } = hashPassword(password);

  const admin = await prisma.userAccount.create({
    data: {
      email,
      fullName: "RPIHM System Administrator (Prototype)",
      passwordHash: hash,
      salt,
      role: "SYSTEM_ADMIN",
      isActive: true,
    },
  });

  console.log(`[Bootstrap Success] Administrator account created successfully.`);
  console.log(`  - Account ID: ${admin.id}`);
  console.log(`  - Email: ${admin.email}`);
  console.log(`  - Role: ${admin.role}`);

  if (generatedLocally) {
    // Write credentials ONLY to gitignored local file, NEVER log password to console
    const credPath = path.join(__dirname, "..", "dev-admin-credentials.json");
    const credData = {
      notice: "DO NOT COMMIT. This file is gitignored and for local prototype authentication only.",
      createdAt: new Date().toISOString(),
      email,
      password,
    };
    fs.writeFileSync(credPath, JSON.stringify(credData, null, 2), "utf8");
    console.log(`  - Credentials written to: dev-admin-credentials.json (Git-ignored)`);
    console.log(`  - NOTICE: Passwords are NEVER printed in stdout/terminal logs.`);
  } else {
    console.log(`  - Password provisioned via environment variable.`);
  }
}

main()
  .catch((err) => {
    console.error("[Bootstrap Error]:", err.message);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });