with open("src/lib/utils/studentMapper.ts", "r", encoding="utf-8") as f:
    content = f.read()

old_block = """    attendanceRate: 88.5,
    gpa: 8.5,
    mentorFaculty: isHospitality ? "Chef Vikramaditya Kapoor" : "Prof. Snehal Kulkarni",
    guardianName: "Parent / Guardian",
    guardianRelationship: "Father",
    guardianPhone: dbStudent.phone,"""

new_block = """    attendanceRate: typeof dbStudent.attendanceRate === "number" ? dbStudent.attendanceRate : 88.5,
    gpa: 8.5,
    mentorFaculty: dbStudent.mentorFaculty || (isHospitality ? "Chef Vikramaditya Kapoor" : "Prof. Snehal Kulkarni"),
    guardianName: dbStudent.guardianName || "Parent / Guardian",
    guardianRelationship: dbStudent.guardianRelationship || "Father",
    guardianPhone: dbStudent.guardianPhone || dbStudent.phone,"""

assert old_block in content, "old_block not found in studentMapper.ts"
content = content.replace(old_block, new_block)

with open("src/lib/utils/studentMapper.ts", "w", encoding="utf-8") as f:
    f.write(content)

print("Successfully updated src/lib/utils/studentMapper.ts")
