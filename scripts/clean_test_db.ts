import { PrismaClient } from "@prisma/client";
const prisma = new PrismaClient();

async function clean() {
  await prisma.session.deleteMany({ where: { user: { email: { contains: "joshi" } } } });
  await prisma.userAccount.deleteMany({ where: { email: { contains: "joshi" } } });
  await prisma.staff.deleteMany({ where: { email: { contains: "joshi" } } });
  
  const staffCount = await prisma.staff.count();
  const userCount = await prisma.userAccount.count();
  console.log("Cleaned. Staff count:", staffCount, "User count:", userCount);
}

clean().then(() => {
  prisma.$disconnect();
  process.exit(0);
});
