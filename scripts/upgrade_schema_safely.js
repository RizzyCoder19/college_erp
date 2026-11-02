const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function main() {
  console.log("Checking current table structure...");
  
  const studentCols = await prisma.$queryRawUnsafe("PRAGMA table_info(Student)");
  const studentColNames = studentCols.map(c => c.name);
  console.log("Existing Student columns:", studentColNames);

  const staffCols = await prisma.$queryRawUnsafe("PRAGMA table_info(Staff)");
  const staffColNames = staffCols.map(c => c.name);
  console.log("Existing Staff columns:", staffColNames);

  // Safely add Student columns if missing
  const studentAdditions = [
    { name: "guardianName", type: "TEXT" },
    { name: "guardianRelationship", type: "TEXT" },
    { name: "guardianPhone", type: "TEXT" },
    { name: "attendanceRate", type: "REAL" },
    { name: "mentorFaculty", type: "TEXT" }
  ];

  for (const col of studentAdditions) {
    if (!studentColNames.includes(col.name)) {
      console.log(`Adding column Student.${col.name} (${col.type})...`);
      await prisma.$queryRawUnsafe(`ALTER TABLE "Student" ADD COLUMN "${col.name}" ${col.type}`);
    } else {
      console.log(`Student.${col.name} already exists.`);
    }
  }

  // Safely add Staff columns if missing
  const staffAdditions = [
    { name: "qualification", type: "TEXT" },
    { name: "specialization", type: "TEXT" },
    { name: "officeLocation", type: "TEXT" },
    { name: "workloadHours", type: "INTEGER" },
    { name: "employmentType", type: "TEXT" }
  ];

  for (const col of staffAdditions) {
    if (!staffColNames.includes(col.name)) {
      console.log(`Adding column Staff.${col.name} (${col.type})...`);
      await prisma.$queryRawUnsafe(`ALTER TABLE "Staff" ADD COLUMN "${col.name}" ${col.type}`);
    } else {
      console.log(`Staff.${col.name} already exists.`);
    }
  }

  console.log("\nVerifying updated Student columns:");
  const updatedStudentCols = await prisma.$queryRawUnsafe("PRAGMA table_info(Student)");
  console.log(updatedStudentCols.map(c => `${c.name} (${c.type})`));

  console.log("\nVerifying updated Staff columns:");
  const updatedStaffCols = await prisma.$queryRawUnsafe("PRAGMA table_info(Staff)");
  console.log(updatedStaffCols.map(c => `${c.name} (${c.type})`));

  console.log("\nVerifying data counts:");
  const studentCount = await prisma.student.count();
  const staffCount = await prisma.staff.count();
  const userCount = await prisma.userAccount.count();
  const enrolmentCount = await prisma.enrolment.count();
  console.log({ studentCount, staffCount, userCount, enrolmentCount });
}

main()
  .catch(console.error)
  .finally(() => prisma.$disconnect());
