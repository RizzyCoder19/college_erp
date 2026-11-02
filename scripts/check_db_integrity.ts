import { PrismaClient } from "@prisma/client";
import fs from "fs";
import crypto from "crypto";
import path from "path";

async function check() {
  const devDbPath = path.resolve(process.cwd(), "prisma/dev.db");
  const buf = fs.readFileSync(devDbPath);
  const hash = crypto.createHash("sha256").update(buf).digest("hex").toUpperCase();
  console.log("Operational dev.db SHA-256:", hash);

  const prisma = new PrismaClient();
  try {
    const integrity = await prisma.$queryRawUnsafe("PRAGMA integrity_check;");
    console.log("PRAGMA integrity_check result:", JSON.stringify(integrity));

    const fkCheck = await prisma.$queryRawUnsafe("PRAGMA foreign_key_check;");
    console.log("PRAGMA foreign_key_check result:", JSON.stringify(fkCheck));

    const users = await prisma.userAccount.findMany({
      select: { id: true, email: true, role: true, studentId: true }
    });
    console.log("dev.db users count:", users.length, users);

    const students = await prisma.student.count();
    console.log("dev.db students count:", students);
  } finally {
    await prisma.$disconnect();
  }
}

check().catch(console.error);
