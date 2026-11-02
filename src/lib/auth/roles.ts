/**
 * Demonstrative development roles for RPIHM CampusOS prototype.
 * NOTE: These roles represent functional ERP prototypes and do not imply
 * that individual institutional designations confer verified administrative authority.
 */
export type Role = "SYSTEM_ADMIN" | "ACADEMIC_ADMIN" | "FACULTY_MEMBER" | "STUDENT_VIEWER";

export type Permission =
  | "READ_STUDENTS"
  | "WRITE_STUDENTS"
  | "DELETE_STUDENTS"
  | "READ_FACULTY"
  | "WRITE_FACULTY"
  | "DELETE_FACULTY"
  | "MANAGE_ACADEMICS"
  | "ADMIN_ALL"
  | "RECORD_ATTENDANCE"
  | "EDIT_FINALIZED_ATTENDANCE"
  | "VIEW_ATTENDANCE"
  | "MANAGE_EXAMS"
  | "ENTER_MARKS"
  | "MODERATE_MARKS"
  | "PUBLISH_RESULTS"
  | "VIEW_RESULTS"
  | "MANAGE_FEES"
  | "COLLECT_FEES"
  | "VIEW_FEES"
  | "UPLOAD_STUDENT_DOCUMENTS"
  | "VERIFY_STUDENT_DOCUMENTS";

const ROLE_PERMISSIONS: Record<Role, readonly Permission[]> = {
  SYSTEM_ADMIN: [
    "ADMIN_ALL",
    "READ_STUDENTS",
    "WRITE_STUDENTS",
    "DELETE_STUDENTS",
    "READ_FACULTY",
    "WRITE_FACULTY",
    "DELETE_FACULTY",
    "MANAGE_ACADEMICS",
    "RECORD_ATTENDANCE",
    "EDIT_FINALIZED_ATTENDANCE",
    "VIEW_ATTENDANCE",
    "MANAGE_EXAMS",
    "ENTER_MARKS",
    "MODERATE_MARKS",
    "PUBLISH_RESULTS",
    "VIEW_RESULTS",
    "MANAGE_FEES",
    "COLLECT_FEES",
    "VIEW_FEES",
    "UPLOAD_STUDENT_DOCUMENTS",
    "VERIFY_STUDENT_DOCUMENTS",
  ],
  ACADEMIC_ADMIN: [
    "READ_STUDENTS",
    "WRITE_STUDENTS",
    "READ_FACULTY",
    "WRITE_FACULTY",
    "MANAGE_ACADEMICS",
    "RECORD_ATTENDANCE",
    "EDIT_FINALIZED_ATTENDANCE",
    "VIEW_ATTENDANCE",
    "MANAGE_EXAMS",
    "ENTER_MARKS",
    "MODERATE_MARKS",
    "PUBLISH_RESULTS",
    "VIEW_RESULTS",
    "MANAGE_FEES",
    "COLLECT_FEES",
    "VIEW_FEES",
    "UPLOAD_STUDENT_DOCUMENTS",
    "VERIFY_STUDENT_DOCUMENTS",
  ],
  FACULTY_MEMBER: [
    "READ_STUDENTS",
    "READ_FACULTY",
    "RECORD_ATTENDANCE",
    "VIEW_ATTENDANCE",
    "ENTER_MARKS",
    "VIEW_RESULTS",
  ],
  STUDENT_VIEWER: [
    "READ_STUDENTS",
    "VIEW_ATTENDANCE",
    "VIEW_RESULTS",
    "VIEW_FEES",
    "UPLOAD_STUDENT_DOCUMENTS",
  ],
};

/**
 * Checks whether a given role holds a specific permission.
 */
export function hasPermission(role: string, permission: Permission): boolean {
  const typedRole = role as Role;
  const permissions = ROLE_PERMISSIONS[typedRole];
  if (!permissions) {
    return false;
  }
  return permissions.includes("ADMIN_ALL") || permissions.includes(permission);
}

/**
 * Module-level required permissions mapping.
 * Enforces server-side authorization boundaries before any module data is retrieved.
 */
export const MODULE_REQUIRED_PERMISSIONS: Record<string, Permission[]> = {
  students: ["READ_STUDENTS"],
  academics: ["MANAGE_ACADEMICS", "READ_STUDENTS"],
  faculty: ["READ_FACULTY"],
  attendance: ["VIEW_ATTENDANCE", "RECORD_ATTENDANCE"],
  timetable: ["VIEW_ATTENDANCE", "MANAGE_ACADEMICS"],
  examinations: ["VIEW_RESULTS", "MANAGE_EXAMS"],
  finance: ["VIEW_FEES", "MANAGE_FEES", "COLLECT_FEES"],
  fees: ["VIEW_FEES", "MANAGE_FEES", "COLLECT_FEES"],
  reports: ["ADMIN_ALL", "MANAGE_ACADEMICS"],
  settings: ["ADMIN_ALL"],
  placements: ["READ_STUDENTS"],
  facilities: ["READ_FACULTY", "MANAGE_ACADEMICS"],
  calendar: ["READ_STUDENTS", "READ_FACULTY", "MANAGE_ACADEMICS"],
  notices: ["READ_STUDENTS", "READ_FACULTY", "MANAGE_ACADEMICS"],
};

/**
 * Checks whether a role holds authorization to access a given module.
 */
export function hasModuleAccess(role: string, moduleSlug: string): boolean {
  if (role === "SYSTEM_ADMIN") return true;
  const required = MODULE_REQUIRED_PERMISSIONS[moduleSlug];
  if (!required || required.length === 0) return true;
  return required.some((perm) => hasPermission(role, perm));
}
