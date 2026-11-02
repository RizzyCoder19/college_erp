const { PrismaClient } = require("@prisma/client");
const prisma = new PrismaClient();

async function main() {
  const users = await prisma.userAccount.findMany({
    include: {
      staff: true,
      student: true
    }
  });
  console.log(`=== USER ACCOUNTS IN DB (${users.length}) ===`);
  for (const u of users) {
    console.log({
      id: u.id,
      email: u.email,
      fullName: u.fullName,
      role: u.role,
      isActive: u.isActive,
      staffId: u.staffId,
      staffName: u.staff?.fullName,
      staffDesignation: u.staff?.designation,
      staffDept: u.staff?.departmentId,
      studentId: u.studentId
    });
  }
  await prisma.$disconnect();
}

main().catch(console.error);
