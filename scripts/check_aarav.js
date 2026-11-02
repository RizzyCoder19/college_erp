const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function check() {
  const dbStudent = await prisma.student.findFirst({
    where: { OR: [{ prn: '2026DS041' }, { rollNumber: 'RPIHM-2026DS041' }] },
    include: {
      enrolments: {
        include: { academicYear: true, programme: true, semester: true, division: true }
      }
    }
  });
  const enrol = dbStudent?.enrolments?.[0];
  console.log('DB Student:', {
    prn: dbStudent?.prn,
    rollNumber: dbStudent?.rollNumber,
    fullName: dbStudent?.fullName,
    email: dbStudent?.email,
    phone: dbStudent?.phone,
    programme: enrol?.programme?.name,
    semester: enrol?.semester?.semesterNumber,
    division: enrol?.division?.name,
    status: dbStudent?.status
  });
}
check().finally(() => prisma.$disconnect());
