# -*- coding: utf-8 -*-
with open(r"G:\rpihm-campusos\src\app\page.tsx", "r", encoding="utf-8") as f:
    content = f.read()

target = """          currentUser={{
            fullName: user.fullName,
            email: user.email,
            role: user.role,
          }}"""

replacement = """          currentUser={{
            fullName: user.fullName,
            email: user.email,
            role: user.role,
            designation: user.designation,
          }}"""

assert target in content, "target not found in page.tsx"
content = content.replace(target, replacement, 1)

with open(r"G:\rpihm-campusos\src\app\page.tsx", "w", encoding="utf-8") as f:
    f.write(content)
print("page.tsx updated successfully")
