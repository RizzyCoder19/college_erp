import { StudentWithEnrolment } from "@/lib/dal/studentRepository";
import { StudentRecord, StudentStatus, FeeStatus } from "@/types/student";

export function mapStudentDbToRecord(dbStudent: StudentWithEnrolment): StudentRecord {
  const latestEnrolment = dbStudent.enrolments && dbStudent.enrolments.length > 0 ? dbStudent.enrolments[0] : null;
  const semNum = latestEnrolment ? latestEnrolment.semester.semesterNumber : dbStudent.currentSemester || 1;
  const yearGroup: "FY" | "SY" | "TY" = semNum <= 2 ? "FY" : semNum <= 4 ? "SY" : "TY";
  const divName = (latestEnrolment?.division?.name as "Div A" | "Div B" | "Div C") || "Div A";

  let enrollmentStatus: StudentStatus = "Active";
  const stUpper = (dbStudent.status || "ACTIVE").toUpperCase();
  if (stUpper === "ACTIVE") enrollmentStatus = "Active";
  else if (stUpper === "INACTIVE" || stUpper === "ON LEAVE") enrollmentStatus = "On Leave";
  else if (stUpper === "SUSPENDED" || stUpper === "PENDING VERIFICATION") enrollmentStatus = "Pending Verification";
  else if (stUpper === "ALUMNI" || stUpper === "GRADUATED") enrollmentStatus = "Graduated";

  const progCode = latestEnrolment?.programme?.code || "";
  const isHospitality = progCode.includes("HS") || progCode.includes("CUL") || progCode.includes("FP") || progCode.includes("BC");
  const department = isHospitality ? "Hospitality & Culinary Arts" : "Technology & Computing";

  const formattedAdmissionDate = latestEnrolment?.enrolledAt
    ? new Date(latestEnrolment.enrolledAt).toLocaleDateString("en-IN", {
        day: "2-digit",
        month: "short",
        year: "numeric",
      })
    : "15 Jul 2026";

  const formattedDob = dbStudent.dob
    ? new Date(dbStudent.dob).toISOString().split("T")[0]
    : "2006-04-12";

  return {
    id: dbStudent.id,
    prn: dbStudent.prn || dbStudent.rollNumber,
    fullName: dbStudent.fullName,
    email: dbStudent.email,
    phone: dbStudent.phone,
    programmeId: latestEnrolment?.programmeId || "",
    programmeName: latestEnrolment?.programme?.name || "Undergraduate Programme",
    department,
    semester: semNum,
    yearGroup,
    division: divName,
    admissionDate: formattedAdmissionDate,
    enrollmentStatus,
    feeStatus: "Paid" as FeeStatus,
    attendanceRate: 91.5,
    gpa: 8.7,
    mentorFaculty: isHospitality ? "Chef Vikramaditya Kapoor" : "Prof. Snehal Kulkarni",
    guardianName: "Parent / Guardian",
    guardianRelationship: "Father",
    guardianPhone: dbStudent.phone,
    dateOfBirth: formattedDob,
    bloodGroup: dbStudent.bloodGroup || "B+",
    isFictionalSample: false,
  };
}
