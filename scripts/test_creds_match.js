const fs = require('fs');
const crypto = require('crypto');
const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function check() {
  const creds = JSON.parse(fs.readFileSync('dev-admin-credentials.json', 'utf-8'));
  const user = await prisma.userAccount.findUnique({
    where: { email: creds.email }
  });
  if (!user) {
    console.log('User not found:', creds.email);
    return;
  }
  const computedHash = crypto.scryptSync(creds.password, user.salt, 64).toString('hex');
  const matches = crypto.timingSafeEqual(Buffer.from(computedHash, 'hex'), Buffer.from(user.passwordHash, 'hex'));
  console.log('User Found:');
  console.log('  Email:', user.email);
  console.log('  Full Name:', user.fullName);
  console.log('  Role:', user.role);
  console.log('  Is Active:', user.isActive);
  console.log('  Password Hash Matches Active DB:', matches);
  await prisma.$disconnect();
}
check().catch(console.error);
