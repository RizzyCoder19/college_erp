import { PrismaClient } from "@prisma/client";
import { StudentRepository } from "../src/lib/dal/studentRepository";

const prisma = new PrismaClient();

async function testKomalWithPlacement() {
  const komal = await prisma.student.findFirst({
    where: { prn: "2026DS042" },
    include: { enrolments: true }
  });
  if (!komal) throw new Error("Komal not found");
  
  const latestEnrolment = komal.enrolments[0];
  console.log("Komal latest enrolment:", {
    prog: latestEnrolment.programmeId,
    sem: latestEnrolment.semesterId,
    div: latestEnrolment.divisionId
  });

  // Call updateStudent with the same placement parameters
  const res = await StudentRepository.updateStudent(komal.id, {
    phone: "+91 98922 99999",
    programmeId: latestEnrolment.programmeId,
    semesterId: latestEnrolment.semesterId,
    divisionId: latestEnrolment.divisionId
  });

  console.log("Update Komal with unchanged placement params:", res.success, res.error || "");

  // Revert
  await StudentRepository.updateStudent(komal.id, { phone: komal.phone });
  await prisma.$disconnect();
}

testKomalWithPlacement().catch(console.error);
