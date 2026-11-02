const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();
async function main() {
  const user = await prisma.userAccount.findFirst();
  console.log('User email:', user.email);
  console.log('User salt:', user.salt);
  console.log('User hash:', user.passwordHash);
}
main().finally(() => prisma.$disconnect());
