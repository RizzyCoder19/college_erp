const { PrismaClient } = require("@prisma/client");
const prisma = new PrismaClient();
const { StudentRepository } = require("./src/lib/dal/studentRepository");
const { FacultyRepository } = require("./src/lib/dal/facultyRepository");

async function testDirectEdits() {
  console.log("=== Testing Direct DAL Updates ===");
  
  // 1. Student Rohan K. Verma (2025IT112)
  const rohan = await prisma.student.findFirst({ where: { prn: "2025IT112" } });
  console.log("Found Rohan:", rohan.fullName, "Phone:", rohan.phone);
  
  const updateRohan = await StudentRepository.updateStudent(rohan.id, {
    phone: "+91 97180 99999"
  });
  console.log("Update Rohan (identity-only):", updateRohan.success, updateRohan.error || "");
  
  // Revert Rohan
  await StudentRepository.updateStudent(rohan.id, { phone: rohan.phone });

  // 2. Student Komal Soni (2026DS042) - Has anomaly in seed
  const komal = await prisma.student.findFirst({ where: { prn: "2026DS042" } });
  console.log("\nFound Komal:", komal.fullName, "Phone:", komal.phone);
  
  const updateKomal = await StudentRepository.updateStudent(komal.id, {
    phone: "+91 98200 88888"
  });
  console.log("Update Komal (identity-only):", updateKomal.success, updateKomal.error || "");
  if (updateKomal.success) {
    await StudentRepository.updateStudent(komal.id, { phone: komal.phone });
  }

  // 3. Faculty member Dr. Rajesh V. Nair
  const rajesh = await prisma.staff.findFirst({ where: { employeeId: "RPIHM-FAC-031" } });
  console.log("\nFound Dr. Rajesh:", rajesh.fullName, "Phone:", rajesh.phone);
  
  const updateRajesh = await FacultyRepository.updateStaff(rajesh.id, {
    phone: "+91 98334 99999"
  });
  console.log("Update Dr. Rajesh:", updateRajesh.success, updateRajesh.error || "");
  if (updateRajesh.success) {
    await FacultyRepository.updateStaff(rajesh.id, { phone: rajesh.phone });
  }

  await prisma.$disconnect();
}

testDirectEdits().catch(console.error);
