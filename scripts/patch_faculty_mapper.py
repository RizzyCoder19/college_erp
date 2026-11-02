with open(r"G:\rpihm-campusos\src\lib\utils\facultyMapper.ts", "r", encoding="utf-8") as f:
    content = f.read()

target = """    avatarInitial: dbStaff.fullName.charAt(0).toUpperCase(),
    isSampleRecord: false,
  };"""

replacement = """    avatarInitial: dbStaff.fullName.charAt(0).toUpperCase(),
    isSampleRecord: false,
    userAccountId: dbStaff.userAccount?.id || null,
    hasUserAccount: Boolean(dbStaff.userAccount),
    userAccountRole: dbStaff.userAccount?.role || null,
    userAccountEmail: dbStaff.userAccount?.email || null,
  };"""

assert target in content, "target not found"
content = content.replace(target, replacement, 1)

with open(r"G:\rpihm-campusos\src\lib\utils\facultyMapper.ts", "w", encoding="utf-8") as f:
    f.write(content)
print("facultyMapper.ts updated successfully")
