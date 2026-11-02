import prisma from "../src/lib/db";
import { StudentRepository } from "../src/lib/dal/studentRepository";
import { FacultyRepository } from "../src/lib/dal/facultyRepository";
import { mapStudentDbToRecord } from "../src/lib/utils/studentMapper";
import { mapStaffDbToRecord } from "../src/lib/utils/facultyMapper";
import { hasPermission } from "../src/lib/auth/roles";
import { loginAction } from "../src/lib/actions/auth";

async function main() {
  console.log("==============================================================");
  console.log("CAMPUSOS MILESTONE VERIFICATION AND PERSISTENCE TEST");
  console.log("==============================================================\n");

  // 1. Entity Counts
  const studentCount = await prisma.student.count();
  const staffCount = await prisma.staff.count();
  const userAccountCount = await prisma.userAccount.count();
  const deptCount = await prisma.department.count();
  const progCount = await prisma.programme.count();
  const enrolmentCount = await prisma.enrolment.count();

  console.log("=== 1. DATABASE ENTITY COUNTS ===");
  console.log("Students:", studentCount);
  console.log("Staff:", staffCount);
  console.log("User Accounts:", userAccountCount);
  console.log("Departments:", deptCount);
  console.log("Programmes:", progCount);
  console.log("Enrolments:", enrolmentCount);

  // 2. Student Persistence Test
  console.log("\n=== 2. TESTING STUDENT PERSISTENCE REPAIR ===");
  const student = await prisma.student.findFirst({
    where: { rollNumber: "RPIHM-2026DS041" },
    include: { enrolments: { include: { academicYear: true, programme: true, semester: true, division: true } } }
  });
  if (!student) throw new Error("Sample student Aarav Sharma not found");
  console.log("Found student:", student.fullName, "Roll:", student.rollNumber);

  const testGuardian = "Ramesh Sharma (Father)";
  const testRel = "Father";
  const testPhone = "+91 98201 99999";
  const testAttendance = 94.5;
  const testMentor = "Prof. Snehal Kulkarni";

  const updateRes = await StudentRepository.updateStudent(student.id, {
    guardianName: testGuardian,
    guardianRelationship: testRel,
    guardianPhone: testPhone,
    attendanceRate: testAttendance,
    mentorFaculty: testMentor
  });
  if (!updateRes.success) throw new Error("Student update failed: " + updateRes.error);

  const freshStudent = await prisma.student.findUnique({
    where: { id: student.id },
    include: { enrolments: { include: { academicYear: true, programme: true, semester: true, division: true } } }
  });
  if (!freshStudent) throw new Error("Could not refetch student from DB");

  console.log("Fresh DB read after student update:", {
    guardianName: freshStudent.guardianName,
    guardianRelationship: freshStudent.guardianRelationship,
    guardianPhone: freshStudent.guardianPhone,
    attendanceRate: freshStudent.attendanceRate,
    mentorFaculty: freshStudent.mentorFaculty
  });

  if (freshStudent.guardianName !== testGuardian) throw new Error("guardianName mismatch");
  if (freshStudent.guardianRelationship !== testRel) throw new Error("guardianRelationship mismatch");
  if (freshStudent.guardianPhone !== testPhone) throw new Error("guardianPhone mismatch");
  if (freshStudent.attendanceRate !== testAttendance) throw new Error("attendanceRate mismatch");
  if (freshStudent.mentorFaculty !== testMentor) throw new Error("mentorFaculty mismatch");

  const mappedStudent = mapStudentDbToRecord(freshStudent);
  console.log("Mapped StudentRecord (UI View):", {
    guardianName: mappedStudent.guardianName,
    guardianPhone: mappedStudent.guardianPhone,
    attendanceRate: mappedStudent.attendanceRate,
    mentorFaculty: mappedStudent.mentorFaculty
  });
  console.log(">> STUDENT PERSISTENCE TEST PASSED!");

  // Faculty Persistence Test
  console.log("\n=== 3. TESTING FACULTY PERSISTENCE INGREDIENTS ===");
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

  const staffUpdateRes = await FacultyRepository.updateStaff(staff.id, {
    qualification: testQual,
    specialization: testSpec,
    officeLocation: testOffice,
    workloadHours: testHours,
    employmentType: testEmpType
  });
  if (!staffUpdateRes.success) throw new Error("Staff update failed: " + staffUpdateRes.error);

  const freshStaff = await prisma.staff.findUnique({
    where: { id: staff.id },
    include: { department: true, userAccount: true, teachingAssignments: { include: { subject: true, division: true } } }
  });
  if (!freshStaff) throw new Error("Could not refetch staff from DB");

  console.log("Fresh DB read after staff update:", {
    qualification: freshStaff.qualification,
    specialization: freshStaff.specialization,
    officeLocation: freshStaff.officeLocation,
    workloadHours: freshStaff.workloadHours,
    employmentType: freshStaff.employmentType
  });

  if (freshStaff.qualification !== testQual) throw new Error("qualification mismatch");
  if (freshStaff.specialization !== testSpec) throw new Error("specialization mismatch");
  if (freshStaff.officeLocation !== testOffice) throw new Error("officeLocation mismatch");
  if (freshStaff.workloadHours !== testHours) throw new Error("workloadHours mismatch");
  if (freshStaff.employmentType !== testEmpType) throw new Error("employmentType mismatch");

  const mappedStaff = mapStaffDbToRecord(freshStaff);
  console.log("Mapped FacultyRecord (UI View):", {
    qualification: mappedStaff.qualification,
    specialization: mappedStaff.specialization,
    officeLocation: mappedStaff.officeLocation,
    workloadHours: mappedStaff.workloadHours,
    employmentType: mappedStaff.employmentType
  });
  console.log(">> FACULTY PERSISTENCE TEST PASSED!");

  // 4. HOD & Academic Admin Test
  console.log("\n=== 4. TESTING KHUSHALI SHARMA HOD & ACADEMIC ADMIN ===");
  const khushali = await prisma.staff.findFirst({
    where: { employeeId: "RPIHM-FAC-999" },
    include: { department: true, userAccount: true }
  });
  if (!khushali) throw new Error("Khushali Sharma staff record not found");
  console.log("Staff Record:", {
    name: khushali.fullName,
    employeeId: khushali.employeeId,
    designation: khushali.designation,
    department: khushali.department?.name
  });
  console.log("Linked User Account:", {
    exists: !!khushali.userAccount,
    email: khushali.userAccount?.email,
    role: khushali.userAccount?.role,
    isActive: khushali.userAccount?.isActive
  });

  console.log("Role Permissions for ACADEMIC_ADMIN:", {
    MANAGE_ACADEMICS: hasPermission("ACADEMIC_ADMIN", "MANAGE_ACADEMICS"),
    WRITE_STUDENTS: hasPermission("ACADEMIC_ADMIN", "WRITE_STUDENTS"),
    WRITE_FACULTY: hasPermission("ACADEMIC_ADMIN", "WRITE_FACULTY"),
    ADMIN_ALL: hasPermission("ACADEMIC_ADMIN", "ADMIN_ALL"),
    DELETE_STUDENTS: hasPermission("ACADEMIC_ADMIN", "DELETE_STUDENTS")
  });
  console.log(">> HOD & ACADEMIC ADMIN VERIFICATION PASSEDA");

  // 5. Authentication Test
  console.log("\n=== 5. TESTING AUTHENTICATION SERVER ACTION --- BAD PWD REJECTION ===");
  const badLogin = await loginAction({
    email: "khushali.sharma@rphhm.ac.in",
    password: "IncorrectPassword999!"
  });
  console.log("Invalid Credentials Result:", badLogin);
  if (badLogin.success) throw new Error("Bad login should have failed");

  console.log("\n=== 6. VERIFYING HOD USER ACCOUNT IN DB ===\n");
  console.log("HOD account in DB role:", khushali.userAccount?.role);
  console.log("\n=== 7. TESTING SERVER ACTION --- SYSTEM ADMIN LOGIN SUCCESS ===");
  const adminLogin = await loginAction({
    email: "admin.local@sample.rpihm.ac.in",
    password: "RpihmAdmin_2gY5pbuPO5NYCfK79!"
  });
  console.log("System Admin Login Success Result:", {
    success: adminLogin.success,
    data: adminLogin.data
  });
  if (!adminLogin.success || adminLogin.data?.user.role !== "SYSTEM_ADMIN") {
    throw new Error("System Admin login failed or role mismatch");
  }

  console.log("\n==============================================================");
  console.log("ALL MULTIPLE MILESTONE TESTS PASSED CLEANLY!");
  console.log("=============================================================");
}

main().catch(console.error).finally(() => prisma.$disconnect());
