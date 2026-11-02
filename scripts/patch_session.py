import sys

with open(r"G:\rpihm-campusos\src\lib\auth\session.ts", "r", encoding="utf-8") as f:
    content = f.read()

target1 = """export interface AuthenticatedUser {
  id: string;
  email: string;
  fullName: string;
  role: string;
  staffId: string | null;
  studentId: string | null;
}"""

replacement1 = """export interface AuthenticatedUser {
  id: string;
  email: string;
  fullName: string;
  role: string;
  staffId: string | null;
  studentId: string | null;
  designation?: string | null;
  departmentName?: string | null;
}"""

assert target1 in content, "target1 not found"
content = content.replace(target1, replacement1, 1)

target2 = """    const session = await prisma.session.findUnique({
      where: { tokenHash },
      include: {
        user: true,
      },
    });"""

replacement2 = """    const session = await prisma.session.findUnique({
      where: { tokenHash },
      include: {
        user: {
          include: {
            staff: {
              include: {
                department: true,
              },
            },
          },
        },
      },
    });"""

assert target2 in content, "target2 not found"
content = content.replace(target2, replacement2, 1)

target3 = """    const user: AuthenticatedUser = {
      id: session.user.id,
      email: session.user.email,
      fullName: session.user.fullName,
      role: session.user.role,
      staffId: session.user.staffId,
      studentId: session.user.studentId,
    };"""

replacement3 = """    const staff = (session.user as any).staff;
    const user: AuthenticatedUser = {
      id: session.user.id,
      email: session.user.email,
      fullName: session.user.fullName,
      role: session.user.role,
      staffId: session.user.staffId,
      studentId: session.user.studentId,
      designation: staff?.designation || (session.user.role === "SYSTEM_ADMIN" ? "System Administrator" : null),
      departmentName: staff?.department?.name || null,
    };"""

assert target3 in content, "target3 not found"
content = content.replace(target3, replacement3, 1)

with open(r"G:\rpihm-campusos\src\lib\auth\session.ts", "w", encoding="utf-8") as f:
    f.write(content)
print("session.ts updated successfully")
