with open("src/types/student.ts", "r", encoding="utf-8") as f:
    c = f.read()

c = c.replace(
    'prn: string; // Permanent Registration Number / Roll No\n  fullName: string;',
    'prn: string; // Permanent Registration Number\n  rollNumber?: string; // Institutional Roll Number\n  fullName: string;'
)

with open("src/types/student.ts", "w", encoding="utf-8") as f:
    f.write(c)

print("Updated src/types/student.ts")
