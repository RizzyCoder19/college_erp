import { StudentWithEnrolment } from "@/lib/dal/studentRepository";
import { StudentRecord, StudentStatus, FeeStatus, EnrolmentHistoryItem } from "@/types/student";

export function mapStudentDbToRecord(dbStudent: StudentWithEnrolment): StudentRecord {
  // Sort enrolments by enrolledAt descending to determine latest active placement
  const sortedEnrolments = (dbStudent.enrolments || []).slice().sort((a, b) => {
    return new Date(b.enrolledAt).getTime() - new Date(a.enrolledAt).getTime();
  });

  const latestEnrolment = sortedEnrolments.length > 0 ? sortedEnrolments[0] : null;
  const semNum = latestEnrolment?.semester?.semesterNumber || dbStudent.currentSemester || 1;
  const yearGroup: "FY" | "SY" | "TY" = semNum <= 2 ? "FY" : semNum <= 4 ? "SY" : "TY";
  const divName = (latestEnrolment?.division?.name as "Div A" | "Div B" | "Div C") || "Div A";

  let enrollmentStatus: StudentStatus = "Active";
  const stUpper = (dbStudent.status || "ACTIVE").toUpperCase();
  if (stUpper === "ACTIVE") enrollmentStatus = "Active";
  else if (stUpper === "ON_LEAVE" || stUpper === "ON LEAVE" || stUpper === "INACTIVE") enrollmentStatus = "On Leave";
  else if (stUpper === "GRADUATED" || stUpper === "ALUMNI") enrollmentStatus = "Graduated";
  else if (stUpper === "PENDING_VERIFICATION" || stUpper === "PENDING VERIFICATION" || stUpper === "SUSPENDED") enrollmentStatus = "Pending Verification";

  const progCode = latestEnrolment?.programme?.code || "";
  const isHospitality = progCode.includes("HS") || progCode.includes("CUL") || progCode.includes("FP") || progCode.includes("BC");
  const department = latestEnrolment?.programme
    ? (isHospitality ? "Hospitality & Culinary Arts" : "Technology & Computing")
    : "General Academics";

  const formattedAdmissionDate = latestEnrolment?.enrolledAt
    ? new Date(latestEnrolment.enrolledAt).toLocaleDateString("en-IN", {
        day: "2-digit",
        month: "short",
        year: "numeric",
      })
    : "Admitted";

  const formattedDob = dbStudent.dob
    ? new Date(dbStudent.dob).toISOString().split("T")[0]
    : "";

  // Map historical enrolments & detect any existing relational anomalies
  const enrolmentHistory: EnrolmentHistoryItem[] = sortedEnrolments.map((enr, idx) => {
    const isProgMismatch = Boolean(enr.semester?.programmeId && enr.programmeId && enr.semester.programmeId !== enr.programmeId);
    const isDivMismatch = Boolean(enr.division?.semesterId && enr.semesterId && enr.division.semesterId !== enr.semesterId);
    const hasHierarchyAnomaly = isProgMismatch || isDivMismatch;

    let anomalyMessage: string | undefined = undefined;
    if (isProgMismatch) {
      anomalyMessage = `Semester record belongs to a different programme than the registered programme.`;
    } else if (isDivMismatch) {
      anomalyMessage = `Assigned division belongs to a different semester record in active institutional database.`;
    }

    return {
      id: enr.id,
      academicYearCode: enr.academicYear?.code || "AY 2026-27",
      programmeCode: enr.programme?.code || "PROG",
      programmeName: enr.programme?.name || "Academic Programme",
      semesterNumber: enr.semester?.semesterNumber || 1,
      divisionName: enr.division?.name || "Div A",
      status: enr.status || "ENROLLED",
      enrolledAt: new Date(enr.enrolledAt).toLocaleDateString("en-IN", {
        day: "2-digit",
        month: "short",
        year: "numeric",
      }),
      isCurrent: idx === 0,
      hasHierarchyAnomaly,
      anomalyMessage,
    };
  });

  const hasAnyAnomaly = enrolmentHistory.some((e) => e.hasHierarchyAnomaly);

  return {
    id: dbStudent.id,
    prn: dbStudent.prn || dbStudent.rollNumber,
    rollNumber: dbStudent.rollNumber,
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
    feeStatus: (() => {
      if (dbStudent.feeInvoices && dbStudent.feeInvoices.length > 0) {
        let demand = 0;
        let paid = 0;
        for (const inv of dbStudent.feeInvoices) {
          demand += inv.totalDemand;
          paid += inv.receipts.reduce((s: number, r: { amountPaid: number }) => s + r.amountPaid, 0);
        }
        if (paid >= demand && demand > 0) return "Paid" as FeeStatus;
        if (paid > 0) return "Partial" as FeeStatus;
        return "Pending" as FeeStatus;
      }
      return "Not configured" as FeeStatus;
    })(),
    attendanceRate: typeof dbStudent.attendanceRate === "number" ? dbStudent.attendanceRate : 0,
    gpa: undefined,
    mentorFaculty: dbStudent.mentorFaculty || "",
    guardianName: dbStudent.guardianName || "",
    guardianRelationship: dbStudent.guardianRelationship || "",
    guardianPhone: dbStudent.guardianPhone || "",
    dateOfBirth: formattedDob,
    bloodGroup: dbStudent.bloodGroup || "",
    isFictionalSample: false,
    enrolmentHistory,
    hasAnomaly: hasAnyAnomaly,
  };
}
