const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function main() {
  console.log("=== Testing Student Persistence Repair ===");
  const student = await prisma.student.findFirst({
    where: { rollNumber: "RPIHM-2026DS041" },
    include: { enrolments: { include: { academicYear: true, programme: true, semester: true, division: true } } }
  });

  if (!student) throw new Error("Sample student Aarav Sharma not found");
  console.log("Found student:", student.fullName, "Roll:", student.rollNumber);

  // Update with verified test data
  const testGuardian = "Ramesh Sharma (Father)";
  const testRel = "Father";
  const testPhone = "+91 98201 99999";
  const testAttendance = 94.5;
  const testMentor = "Prof. Snehal Kulkarni";

  const { StudentRepository } = require("./src/lib/dal/studentRepository");
  const updateRes = await StudentRepository.updateStudent(student.id, {
    guardianName: testGuardian,
    guardianRelationship: testRel,
    guardianPhone: testPhone,
    attendanceRate: testAttendance,
    mentorFaculty: testMentor
  });

  if (!updateRes.success) throw new Error("Student update failed: " + updateRes.error);

  // Read directly from fresh database query
  const freshStudent = await prisma.student.findUnique({
    where: { id: student.id },
    include: { enrolments: { include: { academicYear: true, programme: true, semester: true, division: true } } }
  });

  console.log("Fresh DB read after update:", {
    guardianName: freshStudent.guardianName,
    guardianRelationship: freshStudent.guardianRelationship,
    guardianPhone: freshStudent.guardianPhone,
    attendanceRate: freshStudent.attendanceRate,
    mentorFaculty: freshStudent.mentorFaculty
  });

  if (freshStudent.guardianName !== testGuardian) throw new Error("guardianName persistence mismatch");
  if (freshStudent.guardianRelationship !== testRel) throw new Error("guardianRelationship persistence mismatch");
  if (freshStudent.guardianPhone !== testPhone) throw new Error("guardianPhone persistence mismatch");
  if (freshStudent.attendanceRate !== testAttendance) throw new Error("attendanceRate persistence mismatch");
  if (freshStudent.mentorFaculty !== testMentor) throw new Error("mentorFaculty persistence mismatch");

  // Check mapper output
  const { mapStudentDbToRecord } = require("./src/lib/utils/studentMapper");
  const mapped = mapStudentDbToRecord(freshStudent);
  console.log("Mapped StudentRecord:", {
    guardianName: mapped.guardianName,
    guardianPhone: mapped.guardianPhone,
    attendanceRate: mapped.attendanceRate,
    mentorFaculty: mapped.mentorFaculty
  });

  if (mapped.guardianName !== testGuardian) throw new Error("Mapper discarded guardianName");
  if (mapped.attendanceRate !== testAttendance) throw new Error("Mapper discarded attendanceRate");
  if (mapped.mentorFaculty !== testMentor) throw new Error("Mapper discarded mentorFaculty");

  console.log(">> Student persistence test PASSED!\n");

  console.log("=== Testing Faculty Persistence Repair ===");
  const staff = await prisma.staff.findFirst({
    where: { employeeId: "RPIHM-FAC-012" },
    include: { department: true, userAccount: true, teachingAssignments: { include: { subject: true, division: true } } }
  });

  if (!staff) throw new Error("Sample staff RPIHM-FAC-012 not found");
  console.log("Found staff:", staff.fullName, "ID:", staff.employeeId);

  const testQual = "Grand Diplome de Cuisine, Paris";
  const testSpec = "Classical French Haute Cuisine & Modern Gastronomy";
  const testOffice = "Culinary Complex - Executive Kitchen 102";
  const testHours = 24;
  const testEmpType = "Full-Time Permanent";

  const { FacultyRepository } = require("./src/lib/dal/facultyRepository");
  const staffUpdateRes = await FacultyRepository.updateStaff(staff.id, {
    qualification: testQual,
    specialization: testSpec,
    officeLocation: testOffice,
    workloadHours: testHours,
    employmentType: testEmpType
  });

  if (!staffUpdateRes.success) throw new Error("Staff update failed: " + staffUpdateRes.error);

  // Read directly from fresh DB query
  const freshStaff = await prisma.staff.findUnique({
    where: { id: staff.id },
    include: { department: true, userAccount: true, teachingAssignments: { include: { subject: true, division: true } } }
  });

  console.log("Fresh DB read after staff update:", {
    qualification: freshStaff.qualification,
    specialization: freshStaff.specialization,
    officeLocation: freshStaff.officeLocation,
    workloadHours: freshStaff.workloadHours,
    employmentType: freshStaff.employmentType
  });

  if (freshStaff.qualification !== testQual) throw new Error("qualification persistence mismatch");
  if (freshStaff.specialization !== testSpec) throw new Error("specialization persistence mismatch");
  if (freshStaff.officeLocation !== testOffice) throw new Error("officeLocation persistence mismatch");
  if (freshStaff.workloadHours !== testHours) throw new Error("workloadHours persistence mismatch");
  if (freshStaff.employmentType !== testEmpType) throw new Error("employmentType persistence mismatch");

  // Check mapper output
  const { mapStaffDbToRecord } = require("./src/lib/utils/facultyMapper");
  const mappedStaff = mapStaffDbToRecord(freshStaff);
  console.log("Mapped FacultyRecord:", {
    qualification: mappedStaff.qualification,
    specialization: mappedStaff.specialization,
    officeLocation: mappedStaff.officeLocation,
    workloadHours: mappedStaff.workloadHours,
    employmentType: mappedStaff.employmentType
  });

  if (mappedStaff.qualification !== testQual) throw new Error("Mapper discarded qualification");
  if (mappedStaff.specialization !== testSpec) throw new Error("Mapper discarded specialization");
  if (mappedStaff.officeLocation !== testOffice) throw new Error("Mapper discarded officeLocation");
  if (mappedStaff.workloadHours !== testHours) throw new Error("Mapper discarded workloadHours");

  console.log(">> Faculty persistence test PASSED!\n");

  console.log("=== ALL PERSISTENCE TESTS PASSED CLEANLY! ===");
}

main().catch(console.error).finally(() => prisma.$disconnect());
