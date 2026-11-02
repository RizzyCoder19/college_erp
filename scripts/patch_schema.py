with open("prisma/schema.prisma", "r", encoding="utf-8") as f:
    content = f.read()

old_student = """  currentSemester Int          @default(1)
  enrolments      Enrolment[]"""

new_student = """  currentSemester Int          @default(1)
  guardianName    String?
  guardianRelationship String?
  guardianPhone   String?
  attendanceRate  Float?
  mentorFaculty   String?
  enrolments      Enrolment[]"""

old_staff = """  status              String               @default("ACTIVE") // ACTIVE, ON_LEAVE
  teachingAssignments TeachingAssignment[]"""

new_staff = """  status              String               @default("ACTIVE") // ACTIVE, ON_LEAVE
  qualification       String?
  specialization      String?
  officeLocation      String?
  workloadHours       Int?
  employmentType      String?
  teachingAssignments TeachingAssignment[]"""

if old_student in content and old_staff in content:
    content = content.replace(old_student, new_student)
    content = content.replace(old_staff, new_staff)
    with open("prisma/schema.prisma", "w", encoding="utf-8") as f:
        f.write(content)
    print("Successfully patched schema.prisma")
else:
    print("Match not found in schema.prisma")
