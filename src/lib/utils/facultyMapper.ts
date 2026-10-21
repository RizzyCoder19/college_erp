import { StaffWithRelations } from "@/lib/dal/facultyRepository";
import { FacultyRecord, StaffCategory, StaffStatus, EmploymentType } from "@/types/faculty";

export function mapStaffDbToRecord(dbStaff: StaffWithRelations): FacultyRecord {
  let category: StaffCategory = "Teaching Faculty";
  if (dbStaff.category === "TECHNICAL") category = "Technical Lab Staff";
  else if (dbStaff.category === "ADMINISTRATIVE") category = "Administrative Staff";
  else if (dbStaff.designation.toLowerCase().includes("chef") || dbStaff.department?.code === "CUL") {
    category = "Culinary Instructor";
  } else {
    category = "Teaching Faculty";
  }

  let status: StaffStatus = "Active";
  const stUpper = (dbStaff.status || "ACTIVE").toUpperCase();
  if (stUpper === "ACTIVE") {
    status = category === "Culinary Instructor" ? "In Lab / Kitchen" : "Active";
  } else if (stUpper === "ON_LEAVE" || stUpper === "ON LEAVE") {
    status = "On Leave";
  } else if (stUpper === "RESIGNED") {
    status = "On Leave";
  } else if (stUpper === "RETIRED") {
    status = "On Leave";
  }

  const teachingSubjects = dbStaff.teachingAssignments && dbStaff.teachingAssignments.length > 0
    ? dbStaff.teachingAssignments.map((ta) => ta.subject.title)
    : [];

  const joinedDate = dbStaff.dateOfJoining
    ? new Date(dbStaff.dateOfJoining).toISOString().split("T")[0]
    : "";

  const totalWeeklyHours = dbStaff.teachingAssignments?.reduce((acc, ta) => acc + ta.weeklyHours, 0) || 0;

  return {
    id: dbStaff.id,
    staffId: dbStaff.employeeId,
    fullName: dbStaff.fullName,
    designation: dbStaff.designation,
    department: dbStaff.department?.name || "Hospitality & Culinary Arts",
    departmentId: dbStaff.departmentId,
    category,
    employmentType: (dbStaff.employmentType as EmploymentType) || ("Full-Time Permanent" as EmploymentType),
    email: dbStaff.email,
    phone: dbStaff.phone,
    officeLocation: dbStaff.officeLocation || "",
    workloadHours: typeof dbStaff.workloadHours === "number"
      ? dbStaff.workloadHours
      : totalWeeklyHours,
    status,
    qualification: dbStaff.qualification || "",
    specialization: dbStaff.specialization || "",
    joinedDate,
    teachingSubjects,
    assignedProgrammes: dbStaff.department ? [dbStaff.department.name] : [],
    avatarInitial: dbStaff.fullName.charAt(0).toUpperCase(),
    isSampleRecord: false,
    userAccountId: dbStaff.userAccount?.id || null,
    hasUserAccount: Boolean(dbStaff.userAccount),
    userAccountRole: dbStaff.userAccount?.role || null,
    userAccountEmail: dbStaff.userAccount?.email || null,
  };
}
