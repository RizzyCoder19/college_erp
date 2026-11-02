const { PrismaClient } = require('@prisma/client');
const crypto = require('crypto');
const prisma = new PrismaClient();
const adminCreds = JSON.parse(require('fs').readFileSync('dev-admin-credentials.json', 'utf8'));

async function testAuth() {
  const user = await prisma.userAccount.findUnique({
    where: { email: adminCreds.email.toLowerCase() },
  });
  console.log('User found:', !!user);
  if (user) {
    const salt = Buffer.from(user.salt, 'hex');
    const derivedKey = crypto.scryptSync(adminCreds.password, salt, 64);
    const hash = derivedKey.toString('hex');
    console.log('Password matches hash:', hash === user.passwordHash);
  }
}
testAuth().finally(() => prisma.$disconnect());
