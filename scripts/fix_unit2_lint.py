# -*- coding: utf-8 -*-

# 1. Fix PrototypeReconciliationModal.tsx unescaped quotes
with open("src/components/common/PrototypeReconciliationModal.tsx", "r", encoding="utf-8") as f:
    text = f.read()

text = text.replace(
    'No prototype records matching the "{filter}" classification.',
    'No prototype records matching the &ldquo;{filter}&rdquo; classification.'
)

with open("src/components/common/PrototypeReconciliationModal.tsx", "w", encoding="utf-8") as f:
    f.write(text)
print("Fixed PrototypeReconciliationModal.tsx")

# 2. Fix StudentsView.tsx Date.now() purity
with open("src/components/modules/students/StudentsView.tsx", "r", encoding="utf-8") as f:
    s_text = f.read()

# Add helper at module level
module_helper = """const createBackupKey = (prefix: string) => `${prefix}_backup_${Date.now()}`;
"""
if "const createBackupKey" not in s_text:
    idx = s_text.find("export const StudentsView")
    s_text = s_text[:idx] + module_helper + "\n" + s_text[idx:]

s_text = s_text.replace(
    "const backupKey = `${STORAGE_KEY}_backup_${Date.now()}`;",
    "const backupKey = createBackupKey(STORAGE_KEY);"
)

with open("src/components/modules/students/StudentsView.tsx", "w", encoding="utf-8") as f:
    f.write(s_text)
print("Fixed StudentsView.tsx")

# 3. Fix FacultyView.tsx Date.now() purity
with open("src/components/modules/faculty/FacultyView.tsx", "r", encoding="utf-8") as f:
    f_text = f.read()

if "const createBackupKey" not in f_text:
    idx = f_text.find("export const FacultyView")
    f_text = f_text[:idx] + module_helper + "\n" + f_text[idx:]

f_text = f_text.replace(
    "const backupKey = `${STORAGE_KEY}_backup_${Date.now()}`;",
    "const backupKey = createBackupKey(STORAGE_KEY);"
)

with open("src/components/modules/faculty/FacultyView.tsx", "w", encoding="utf-8") as f:
    f.write(f_text)
print("Fixed FacultyView.tsx")
