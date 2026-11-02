# -*- coding: utf-8 -*-
with open(r"G:\rpihm-campusos\src\lib\dal\facultyRepository.ts", "r", encoding="utf-8") as f:
    content = f.read()

# Replace any remaining include that lacks userAccount: true
target = """        include: {
          department: true,
          teachingAssignments: {
            include: {
              subject: true,
              division: true,
            },
          },
        },"""

replacement = """        include: {
          department: true,
          userAccount: true,
          teachingAssignments: {
            include: {
              subject: true,
              division: true,
            },
          },
        },"""

content = content.replace(target, replacement)

with open(r"G:\rpihm-campusos\src\lib\dal\facultyRepository.ts", "w", encoding="utf-8") as f:
    f.write(content)
print("facultyRepository.ts patched successfully")
