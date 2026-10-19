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
  | "ADMIN_ALL";

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
  ],
  ACADEMIC_ADMIN: [
    "READ_STUDENTS",
    "WRITE_STUDENTS",
    "READ_FACULTY",
    "WRITE_FACULTY",
    "MANAGE_ACADEMICS",
  ],
  FACULTY_MEMBER: [
    "READ_STUDENTS",
    "READ_FACULTY",
  ],
  STUDENT_VIEWER: [
    "READ_STUDENTS",
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