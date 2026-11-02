const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function main() {
  const tables = await prisma.$queryRawUnsafe("SELECT name FROM sqlite_master WHERE type='table' ORDER BY name");
  console.log("Tables in database:", tables);

  const studentCols = await prisma.$queryRawUnsafe("PRAGMA table_info(Student)");
  console.log("\nStudent table columns:", studentCols);

  const staffCols = await prisma.$queryRawUnsafe("PRAGMA table_info(Staff)");
  console.log("\nStaff table columns:", staffCols);

  const userCols = await prisma.$queryRawUnsafe("PRAGMA table_info(UserAccount)");
  console.log("\nUserAccount table columns:", userCols);
}

main().catch(console.error).finally(() => prisma.$disconnect());
