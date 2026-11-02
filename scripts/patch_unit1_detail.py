with open("src/components/modules/students/StudentDetailModal.tsx", "r", encoding="utf-8") as f:
    code = f.read()

code = code.replace(
    'PRN: {student.prn}',
    'PRN: {student.prn}{student.rollNumber && student.rollNumber !== student.prn ? ` ? Roll: ${student.rollNumber}` : ""}'
)

with open("src/components/modules/students/StudentDetailModal.tsx", "w", encoding="utf-8") as f:
    f.write(code)

print("Updated StudentDetailModal.tsx successfully")
