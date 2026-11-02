import sqlite3
conn = sqlite3.connect("prisma/dev.db")
c = conn.cursor()
tables = ["Student", "Staff", "Programme", "Semester", "Division", "Enrolment", "TeachingAssignment", "UserAccount"]
print("CURRENT ACTIVE DATABASE RECORD COUNTS:")
for t in tables:
    count = c.execute(f"SELECT COUNT(*) FROM {t}").fetchone()[0]
    print(f"  {t}: {count}")
conn.close()
