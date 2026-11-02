with open("src/lib/dal/academicRepository.ts", "r", encoding="utf-8") as f:
    acad = f.read()

acad = acad.replace(
    "static async getSemesters(programmeId?: string): Promise<Result<any[]>> {",
    "static async getSemesters(programmeId?: string): Promise<Result<unknown[]>> {"
)

with open("src/lib/dal/academicRepository.ts", "w", encoding="utf-8") as f:
    f.write(acad)
print("Updated academicRepository.ts getSemesters")
