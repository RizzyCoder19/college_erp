const { PrismaClient } = require('@prisma/client');
const crypto = require('crypto');
const prisma = new PrismaClient();
const adminCreds = JSON.parse(require('fs').readFileSync('dev-admin-credentials.json', 'utf8'));

function verifyPassword(password, expectedHash, salt) {
  const candidateHash = crypto.scryptSync(password, salt, 64).toString("hex");
  return candidateHash === expectedHash;
}

async function main() {
  const user = await prisma.userAccount.findFirst();
  console.log('Matches dev-admin-credentials:', verifyPassword(adminCreds.password, user.passwordHash, user.salt));
}
main().finally(() => prisma.$disconnect());
