with open("src/lib/dal/facultyRepository.ts", "r", encoding="utf-8") as f:
    content = f.read()

# 1. Update CreateStaffDTO
old_create_dto = """export interface CreateStaffDTO {
  employeeId: string;
  fullName: string;
  email: string;
  phone: string;
  designation: string;
  category: string;
  departmentId: string;
  dateOfJoining: Date;
  status?: string;
}"""

new_create_dto = """export interface CreateStaffDTO {
  employeeId: string;
  fullName: string;
  email: string;
  phone: string;
  designation: string;
  category: string;
  departmentId: string;
  dateOfJoining: Date;
  status?: string;
  qualification?: string;
  specialization?: string;
  officeLocation?: string;
  workloadHours?: number;
  employmentType?: string;
}"""

# 2. Update UpdateStaffDTO
old_update_dto = """export interface UpdateStaffDTO {
  fullName?: string;
  employeeId?: string;
  phone?: string;
  email?: string;
  designation?: string;
  category?: string;
  departmentId?: string;
  status?: string;
}"""

new_update_dto = """export interface UpdateStaffDTO {
  fullName?: string;
  employeeId?: string;
  phone?: string;
  email?: string;
  designation?: string;
  category?: string;
  departmentId?: string;
  status?: string;
  qualification?: string;
  specialization?: string;
  officeLocation?: string;
  workloadHours?: number;
  employmentType?: string;
}"""

# 3. Update tx / prisma.staff.create
old_create_call = """        data: {
          employeeId: cleanEmpId,
          fullName: dto.fullName.trim(),
          email: cleanEmail,
          phone: dto.phone.trim(),
          designation: dto.designation.trim(),
          category: dto.category,
          departmentId: dto.departmentId,
          dateOfJoining: dto.dateOfJoining,
          status: dto.status || "ACTIVE",
        },"""

new_create_call = """        data: {
          employeeId: cleanEmpId,
          fullName: dto.fullName.trim(),
          email: cleanEmail,
          phone: dto.phone.trim(),
          designation: dto.designation.trim(),
          category: dto.category,
          departmentId: dto.departmentId,
          dateOfJoining: dto.dateOfJoining,
          status: dto.status || "ACTIVE",
          qualification: dto.qualification?.trim() || null,
          specialization: dto.specialization?.trim() || null,
          officeLocation: dto.officeLocation?.trim() || null,
          workloadHours: dto.workloadHours !== undefined ? Number(dto.workloadHours) : null,
          employmentType: dto.employmentType?.trim() || null,
        },"""

# 4. Update staffUpdate in updateStaff
old_update_assignments = """      if (data.departmentId !== undefined) {
        staffUpdate.department = { connect: { id: data.departmentId } };
      }"""

new_update_assignments = """      if (data.departmentId !== undefined) {
        staffUpdate.department = { connect: { id: data.departmentId } };
      }
      if (data.qualification !== undefined) staffUpdate.qualification = data.qualification.trim() || null;
      if (data.specialization !== undefined) staffUpdate.specialization = data.specialization.trim() || null;
      if (data.officeLocation !== undefined) staffUpdate.officeLocation = data.officeLocation.trim() || null;
      if (data.workloadHours !== undefined) staffUpdate.workloadHours = Number(data.workloadHours);
      if (data.employmentType !== undefined) staffUpdate.employmentType = data.employmentType.trim() || null;"""

assert old_create_dto in content, "old_create_dto not found"
assert old_update_dto in content, "old_update_dto not found"
assert old_create_call in content, "old_create_call not found"
assert old_update_assignments in content, "old_update_assignments not found"

content = content.replace(old_create_dto, new_create_dto)
content = content.replace(old_update_dto, new_update_dto)
content = content.replace(old_create_call, new_create_call)
content = content.replace(old_update_assignments, new_update_assignments)

with open("src/lib/dal/facultyRepository.ts", "w", encoding="utf-8") as f:
    f.write(content)

print("Successfully updated src/lib/dal/facultyRepository.ts")
