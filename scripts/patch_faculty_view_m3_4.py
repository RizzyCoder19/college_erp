with open("src/components/modules/faculty/FacultyView.tsx", "r", encoding="utf-8") as f:
    content = f.read()

old_add = """      const res = await createStaffAction({
        employeeId: record.staffId.trim().toUpperCase(),
        fullName: record.fullName.trim(),
        email: record.email.trim().toLowerCase(),
        phone: record.phone.trim(),
        designation: record.designation.trim(),
        category,
        departmentId,
        dateOfJoining: record.joinedDate ? new Date(record.joinedDate) : new Date("2020-01-01"),
        status: "ACTIVE",
      });"""

new_add = """      const res = await createStaffAction({
        employeeId: record.staffId.trim().toUpperCase(),
        fullName: record.fullName.trim(),
        email: record.email.trim().toLowerCase(),
        phone: record.phone.trim(),
        designation: record.designation.trim(),
        category,
        departmentId,
        dateOfJoining: record.joinedDate ? new Date(record.joinedDate) : new Date("2020-01-01"),
        status: "ACTIVE",
        qualification: record.qualification,
        specialization: record.specialization,
        officeLocation: record.officeLocation,
        workloadHours: record.workloadHours,
        employmentType: record.employmentType,
      });"""

old_edit = """      let departmentId = departments.length > 0 ? departments[0].id : "";
      const matchedDept = departments.find(
        (d) =>
          d.name.toLowerCase() === record.department.toLowerCase() ||
          d.code.toLowerCase() === record.department.toLowerCase()
      );
      if (matchedDept) departmentId = matchedDept.id;

      let category = "TEACHING";
      if (record.category === "Technical Lab Staff") category = "TECHNICAL";
      else if (record.category === "Administrative Staff") category = "ADMINISTRATIVE";

      const res = await updateStaffAction(record.id, {
        fullName: record.fullName.trim(),
        employeeId: record.staffId.trim().toUpperCase(),
        phone: record.phone.trim(),
        email: record.email.trim().toLowerCase(),
        designation: record.designation.trim(),
        category,
        departmentId,
        status: record.status.toUpperCase() === "ON LEAVE" ? "ON_LEAVE" : "ACTIVE",
      });"""

new_edit = """      let departmentId = record.departmentId || (departments.length > 0 ? departments[0].id : "");
      const matchedDept = departments.find(
        (d) =>
          d.id === record.departmentId ||
          d.name.toLowerCase() === record.department.toLowerCase() ||
          d.code.toLowerCase() === record.department.toLowerCase()
      );
      if (matchedDept) departmentId = matchedDept.id;

      let category = "TEACHING";
      if (record.category === "Technical Lab Staff") category = "TECHNICAL";
      else if (record.category === "Administrative Staff") category = "ADMINISTRATIVE";

      const res = await updateStaffAction(record.id, {
        fullName: record.fullName.trim(),
        employeeId: record.staffId.trim().toUpperCase(),
        phone: record.phone.trim(),
        email: record.email.trim().toLowerCase(),
        designation: record.designation.trim(),
        category,
        departmentId,
        status: record.status.toUpperCase() === "ON LEAVE" ? "ON_LEAVE" : "ACTIVE",
        qualification: record.qualification,
        specialization: record.specialization,
        officeLocation: record.officeLocation,
        workloadHours: record.workloadHours,
        employmentType: record.employmentType,
      });"""

assert old_add in content, "old_add not found"
assert old_edit in content, "old_edit not found"

content = content.replace(old_add, new_add)
content = content.replace(old_edit, new_edit)

with open("src/components/modules/faculty/FacultyView.tsx", "w", encoding="utf-8") as f:
    f.write(content)

print("Successfully updated src/components/modules/faculty/FacultyView.tsx")
