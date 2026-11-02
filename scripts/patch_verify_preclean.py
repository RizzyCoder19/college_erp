# -*- coding: utf-8 -*-
with open(r"G:\rpihm-campusos\scripts\verify_milestone3_3_full.ts", "r", encoding="utf-8") as f:
    content = f.read()

# Make sure before creating testStaff we also clean up any existing "a.joshi.test"
target = """  // Create isolated test staff member
  const testStaff = await prisma.staff.create({"""

replacement = """  // Clean any residual test records first
  await prisma.session.deleteMany({ where: { user: { email: { contains: "joshi" } } } });
  await prisma.userAccount.deleteMany({ where: { email: { contains: "joshi" } } });
  await prisma.staff.deleteMany({ where: { email: { contains: "joshi" } } });

  // Create isolated test staff member
  const testStaff = await prisma.staff.create({"""

assert target in content, "target not found"
content = content.replace(target, replacement, 1)

with open(r"G:\rpihm-campusos\scripts\verify_milestone3_3_full.ts", "w", encoding="utf-8") as f:
    f.write(content)
print("verify_milestone3_3_full.ts updated with pre-clean")
