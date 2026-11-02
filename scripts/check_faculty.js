const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function check() {
  const staff = await prisma.staff.findMany({
    include: { department: true }
  });
  console.log('Total DB Staff:', staff.length);
  for (const s of staff) {
    console.log({
      employeeId: s.employeeId,
      fullName: s.fullName,
      email: s.email,
      phone: s.phone,
      designation: s.designation,
      department: s.department?.name,
      status: s.status
    });
  }
}
check().finally(() => prisma.$disconnect());
