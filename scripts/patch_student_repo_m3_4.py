with open("src/lib/dal/studentRepository.ts", "r", encoding="utf-8") as f:
    content = f.read()

# 1. Update CreateStudentDTO
old_create_dto = """export interface CreateStudentDTO {
  rollNumber: string;
  prn: string;
  fullName: string;
  email: string;
  phone: string;
  dob: Date;
  gender?: string;
  bloodGroup?: string;
  programmeId: string;
  semesterId: string;
  divisionId: string;
  academicYearId: string;
}"""

new_create_dto = """export interface CreateStudentDTO {
  rollNumber: string;
  prn: string;
  fullName: string;
  email: string;
  phone: string;
  dob: Date;
  gender?: string;
  bloodGroup?: string;
  guardianName?: string;
  guardianRelationship?: string;
  guardianPhone?: string;
  attendanceRate?: number;
  mentorFaculty?: string;
  programmeId: string;
  semesterId: string;
  divisionId: string;
  academicYearId: string;
}"""

# 2. Update UpdateStudentDTO
old_update_dto = """export interface UpdateStudentDTO {
  fullName?: string;
  prn?: string;
  rollNumber?: string;
  phone?: string;
  email?: string;
  dob?: Date;
  gender?: string;
  bloodGroup?: string;
  status?: string;
  programmeId?: string;
  semesterId?: string;
  divisionId?: string;
  academicYearId?: string;
}"""

new_update_dto = """export interface UpdateStudentDTO {
  fullName?: string;
  prn?: string;
  rollNumber?: string;
  phone?: string;
  email?: string;
  dob?: Date;
  gender?: string;
  bloodGroup?: string;
  status?: string;
  guardianName?: string;
  guardianRelationship?: string;
  guardianPhone?: string;
  attendanceRate?: number;
  mentorFaculty?: string;
  programmeId?: string;
  semesterId?: string;
  divisionId?: string;
  academicYearId?: string;
}"""

# 3. Update tx.student.create
old_create_call = """        const student = await tx.student.create({
          data: {
            rollNumber: cleanRoll,
            prn: cleanPrn,
            fullName: dto.fullName.trim(),
            email: cleanEmail,
            phone: dto.phone.trim(),
            dob: dto.dob,
            gender: dto.gender || "MALE",
            bloodGroup: dto.bloodGroup || "B+",
            status: "ACTIVE",
            currentSemester: semester.semesterNumber || 1,
          },
        });"""

new_create_call = """        const student = await tx.student.create({
          data: {
            rollNumber: cleanRoll,
            prn: cleanPrn,
            fullName: dto.fullName.trim(),
            email: cleanEmail,
            phone: dto.phone.trim(),
            dob: dto.dob,
            gender: dto.gender || "MALE",
            bloodGroup: dto.bloodGroup || "B+",
            status: "ACTIVE",
            currentSemester: semester.semesterNumber || 1,
            guardianName: dto.guardianName?.trim() || null,
            guardianRelationship: dto.guardianRelationship?.trim() || null,
            guardianPhone: dto.guardianPhone?.trim() || null,
            attendanceRate: dto.attendanceRate !== undefined ? Number(dto.attendanceRate) : null,
            mentorFaculty: dto.mentorFaculty?.trim() || null,
          },
        });"""

# 4. Update studentUpdate in updateStudent
old_update_assignments = """        if (data.bloodGroup !== undefined) studentUpdate.bloodGroup = data.bloodGroup;
        if (data.status !== undefined) studentUpdate.status = data.status.toUpperCase();"""

new_update_assignments = """        if (data.bloodGroup !== undefined) studentUpdate.bloodGroup = data.bloodGroup;
        if (data.status !== undefined) studentUpdate.status = data.status.toUpperCase();
        if (data.guardianName !== undefined) studentUpdate.guardianName = data.guardianName.trim() || null;
        if (data.guardianRelationship !== undefined) studentUpdate.guardianRelationship = data.guardianRelationship.trim() || null;
        if (data.guardianPhone !== undefined) studentUpdate.guardianPhone = data.guardianPhone.trim() || null;
        if (data.attendanceRate !== undefined) studentUpdate.attendanceRate = Number(data.attendanceRate);
        if (data.mentorFaculty !== undefined) studentUpdate.mentorFaculty = data.mentorFaculty.trim() || null;"""

assert old_create_dto in content, "old_create_dto not found"
assert old_update_dto in content, "old_update_dto not found"
assert old_create_call in content, "old_create_call not found"
assert old_update_assignments in content, "old_update_assignments not found"

content = content.replace(old_create_dto, new_create_dto)
content = content.replace(old_update_dto, new_update_dto)
content = content.replace(old_create_call, new_create_call)
content = content.replace(old_update_assignments, new_update_assignments)

with open("src/lib/dal/studentRepository.ts", "w", encoding="utf-8") as f:
    f.write(content)

print("Successfully updated src/lib/dal/studentRepository.ts")
