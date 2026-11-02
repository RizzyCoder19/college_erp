const { PrismaClient } = require('@prisma/client');
const crypto = require('crypto');
const fs = require('fs');

const prisma = new PrismaClient();

function hashPassword(password) {
  const salt = crypto.randomBytes(16).toString('hex');
  const hash = crypto.scryptSync(password, salt, 64).toString('hex');
  return { hash, salt };
}

async function main() {
  const staffId = '0f277036-c468-4b4d-82ba-d6e6133c6344';
  const staff = await prisma.staff.findUnique({
    where: { id: staffId },
    include: { department: true, userAccount: true }
  });

  if (!staff) {
    console.error('Staff record not found!');
    process.exit(1);
  }

  console.log('Found staff:', staff.fullName, staff.email, staff.designation);

  // Normalize staff name and designation
  await prisma.staff.update({
    where: { id: staffId },
    data: {
      fullName: 'Khushali Sharma',
      designation: 'Head of the Department',
      specialization: 'Food Production & Culinary Administration',
      qualification: 'M.Sc. in Hospitality Administration, CHE',
    }
  });

  // Check if userAccount already exists
  let userAccount = await prisma.userAccount.findUnique({
    where: { email: staff.email.toLowerCase() }
  });

  // Generate secure password: 16 chars with uppercase, lowercase, numbers, symbol
  const rawPw = 'RpihmHOD_' + crypto.randomBytes(6).toString('base64url') + '9!';
  const { hash, salt } = hashPassword(rawPw);

  if (userAccount) {
    console.log('UserAccount already exists, updating role and password...');
    userAccount = await prisma.userAccount.update({
      where: { id: userAccount.id },
      data: {
        fullName: 'Khushali Sharma',
        role: 'ACADEMIC_ADMIN',
        staffId: staff.id,
        passwordHash: hash,
        salt,
        isActive: true,
      }
    });
  } else {
    console.log('Creating UserAccount for Khushali Sharma...');
    userAccount = await prisma.userAccount.create({
      data: {
        email: staff.email.toLowerCase(),
        fullName: 'Khushali Sharma',
        role: 'ACADEMIC_ADMIN',
        staffId: staff.id,
        passwordHash: hash,
        salt,
        isActive: true,
      }
    });
  }

  // Save development credentials safely into gitignored file
  const creds = {
    notice: 'DO NOT COMMIT. This file is gitignored and for local prototype authentication only.',
    createdAt: new Date().toISOString(),
    staffId: staff.id,
    name: 'Khushali Sharma',
    designation: 'Head of the Department',
    department: staff.department ? staff.department.name : 'Administrative & Student Affairs',
    role: 'ACADEMIC_ADMIN',
    email: staff.email.toLowerCase(),
    password: rawPw,
  };

  fs.writeFileSync('dev-khushali-credentials.json', JSON.stringify(creds, null, 2), 'utf8');
  console.log('Saved credentials to dev-khushali-credentials.json');
  console.log('Provisioning successful for Khushali Sharma (ACADEMIC_ADMIN)');
}

main()
  .catch(console.error)
  .finally(() => prisma['$disconnect']());
