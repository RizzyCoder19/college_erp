# 1. Clean StudentFormModal.tsx
with open("src/components/modules/students/StudentFormModal.tsx", "r", encoding="utf-8") as f:
    c = f.read()

import re
# Remove the setState effect
c = re.sub(r'  // eslint-disable-next-line react-hooks/set-state-in-effect\s+useEffect\(\(\) => \{\s+if \(isOpen\) \{[\s\S]*?\}\s*\}, \[isOpen, initialData, effectiveProgrammes\]\);', '', c)

with open("src/components/modules/students/StudentFormModal.tsx", "w", encoding="utf-8") as f:
    f.write(c)

# 2. Clean FacultyFormModal.tsx
with open("src/components/modules/faculty/FacultyFormModal.tsx", "r", encoding="utf-8") as f:
    c = f.read()

c = re.sub(r'  // eslint-disable-next-line react-hooks/set-state-in-effect\s+useEffect\(\(\) => \{\s+if \(isOpen\) \{[\s\S]*?\}\s*\}, \[isOpen, initialData, departments\]\);', '', c)

with open("src/components/modules/faculty/FacultyFormModal.tsx", "w", encoding="utf-8") as f:
    f.write(c)

print("Removed redundant effects")
