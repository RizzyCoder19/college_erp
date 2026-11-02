with open("src/components/modules/students/StudentsView.tsx", "r", encoding="utf-8") as f:
    content = f.read()

content = content.replace("selectedProgObj!.code.toLowerCase() === std.programmeCode.toLowerCase()", "false")
content = content.replace("selectedProgObj!.code.toLowerCase() === updatedRecord.programmeCode.toLowerCase()", "false")

with open("src/components/modules/students/StudentsView.tsx", "w", encoding="utf-8") as f:
    f.write(content)
print("Updated StudentsView.tsx")
