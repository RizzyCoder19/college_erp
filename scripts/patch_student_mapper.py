with open("src/lib/utils/studentMapper.ts", "r", encoding="utf-8") as f:
    c = f.read()

c = c.replace(
    'prn: dbStudent.prn || dbStudent.rollNumber,\n    fullName: dbStudent.fullName,',
    'prn: dbStudent.prn || dbStudent.rollNumber,\n    rollNumber: dbStudent.rollNumber,\n    fullName: dbStudent.fullName,'
)

with open("src/lib/utils/studentMapper.ts", "w", encoding="utf-8") as f:
    f.write(c)

print("Updated src/lib/utils/studentMapper.ts")
