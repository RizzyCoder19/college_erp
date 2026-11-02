with open("src/lib/utils/facultyMapper.ts", "r", encoding="utf-8") as f:
    content = f.read()

# Replace the block from employmentType to specialization
import re

old_pattern = r'employmentType:\s*"Full-Time Permanent"\s*as\s*EmploymentType,\s*email:\s*dbStaff\.email,\s*phone:\s*dbStaff\.phone,\s*officeLocation:\s*dbStaff\.department\?\.code\s*===\s*"CUL"[\s\S]*?specialization:\s*dbStaff\.department\?\.name\s*\|\|\s*"Hospitality & Management",'

new_block = """employmentType: (dbStaff.employmentType as EmploymentType) || ("Full-Time Permanent" as EmploymentType),
    email: dbStaff.email,
    phone: dbStaff.phone,
    officeLocation: dbStaff.officeLocation || (dbStaff.department?.code === "CUL"
      ? "Culinary Complex • Master Production Kitchen"
      : "Academic Block A • Faculty Cabin"),
    workloadHours: typeof dbStaff.workloadHours === "number"
      ? dbStaff.workloadHours
      : (totalWeeklyHours > 0 ? totalWeeklyHours : 18),
    status,
    qualification: dbStaff.qualification || (dbStaff.designation.includes("Dr.") ? "Ph.D. / Master of Science" : "Master of Science / Grand Diplome"),
    specialization: dbStaff.specialization || (dbStaff.department?.name || "Hospitality & Management"),"""

content, count = re.subn(old_pattern, new_block, content)
assert count == 1, f"Regex substitution failed, count={count}"

with open("src/lib/utils/facultyMapper.ts", "w", encoding="utf-8") as f:
    f.write(content)

print("Successfully updated src/lib/utils/facultyMapper.ts")
