const { PrismaClient } = require("@prisma/client");
const prisma = new PrismaClient();

async function main() {
  const staff = await prisma.staff.findMany({
    include: {
      department: true,
      userAccount: true
    }
  });
  console.log(`=== STAFF IN DB (${staff.length}) ===`);
  for (const s of staff) {
    console.log({
      id: s.id,
      fullName: s.fullName,
      email: s.email,
      designation: s.designation,
      dept: s.department?.name,
      userAccount: s.userAccount ? { id: s.userAccount.id, email: s.userAccount.email, role: s.userAccount.role } : null
    });
  }
  await prisma.$disconnect();
}

main().catch(console.error);
