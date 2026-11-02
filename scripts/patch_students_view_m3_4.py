with open("src/components/modules/students/StudentsView.tsx", "r", encoding="utf-8") as f:
    content = f.read()

old_add = """      const res = await createStudentAction({
        rollNumber,
        prn: cleanPrn,
        fullName: record.fullName.trim(),
        email: record.email.trim().toLowerCase(),
        phone: record.phone.trim(),
        dob: record.dateOfBirth ? new Date(record.dateOfBirth) : new Date("2006-05-15"),
        bloodGroup: record.bloodGroup || "B+",
        gender: "MALE",
        programmeId: targetProgId,
        semesterId,
        divisionId,
        academicYearId,
      });"""

new_add = """      const res = await createStudentAction({
        rollNumber,
        prn: cleanPrn,
        fullName: record.fullName.trim(),
        email: record.email.trim().toLowerCase(),
        phone: record.phone.trim(),
        dob: record.dateOfBirth ? new Date(record.dateOfBirth) : new Date("2006-05-15"),
        bloodGroup: record.bloodGroup || "B+",
        gender: "MALE",
        guardianName: record.guardianName,
        guardianRelationship: record.guardianRelationship,
        guardianPhone: record.guardianPhone,
        attendanceRate: record.attendanceRate,
        mentorFaculty: record.mentorFaculty,
        programmeId: targetProgId,
        semesterId,
        divisionId,
        academicYearId,
      });"""

old_edit = """      const res = await updateStudentAction(record.id, {
        fullName: record.fullName.trim(),
        prn: cleanPrn,
        rollNumber,
        phone: record.phone.trim(),
        email: record.email.trim().toLowerCase(),
        bloodGroup: record.bloodGroup,
        dob: record.dateOfBirth ? new Date(record.dateOfBirth) : undefined,
        status: dbStatus,
        programmeId: placementChanged ? targetProgId : undefined,
        semesterId: placementChanged ? semesterId : undefined,
        divisionId: placementChanged ? divisionId : undefined,
      });"""

new_edit = """      const res = await updateStudentAction(record.id, {
        fullName: record.fullName.trim(),
        prn: cleanPrn,
        rollNumber,
        phone: record.phone.trim(),
        email: record.email.trim().toLowerCase(),
        bloodGroup: record.bloodGroup,
        dob: record.dateOfBirth ? new Date(record.dateOfBirth) : undefined,
        status: dbStatus,
        guardianName: record.guardianName,
        guardianRelationship: record.guardianRelationship,
        guardianPhone: record.guardianPhone,
        attendanceRate: record.attendanceRate,
        mentorFaculty: record.mentorFaculty,
        programmeId: placementChanged ? targetProgId : undefined,
        semesterId: placementChanged ? semesterId : undefined,
        divisionId: placementChanged ? divisionId : undefined,
      });"""

assert old_add in content, "old_add not found"
assert old_edit in content, "old_edit not found"

content = content.replace(old_add, new_add)
content = content.replace(old_edit, new_edit)

with open("src/components/modules/students/StudentsView.tsx", "w", encoding="utf-8") as f:
    f.write(content)

print("Successfully updated src/components/modules/students/StudentsView.tsx")
