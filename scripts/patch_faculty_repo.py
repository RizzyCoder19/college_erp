with open(r"G:\rpihm-campusos\src\lib\dal\facultyRepository.ts", "r", encoding="utf-8") as f:
    content = f.read()

target1 = """export type StaffWithRelations = Prisma.StaffGetPayload<{
  include: {
    department: true;
    teachingAssignments: {
      include: {
        subject: true;
        division: true;
      };
    };
  };
}>;"""

replacement1 = """export type StaffWithRelations = Prisma.StaffGetPayload<{
  include: {
    department: true;
    userAccount: true;
    teachingAssignments: {
      include: {
        subject: true;
        division: true;
      };
    };
  };
}>;"""

assert target1 in content, "target1 not found"
content = content.replace(target1, replacement1, 1)

target2 = """          include: {
            department: true,
            teachingAssignments: {
              include: {
                subject: true,
                division: true,
              },
            },
          },"""

replacement2 = """          include: {
            department: true,
            userAccount: true,
            teachingAssignments: {
              include: {
                subject: true,
                division: true,
              },
            },
          },"""

assert target2 in content, "target2 not found"
# Replace in all places in facultyRepository (getStaff, getStaffById twice)
content = content.replace(target2, replacement2)

with open(r"G:\rpihm-campusos\src\lib\dal\facultyRepository.ts", "w", encoding="utf-8") as f:
    f.write(content)
print("facultyRepository.ts updated successfully")
