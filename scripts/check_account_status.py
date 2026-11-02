import sqlite3
conn = sqlite3.connect("prisma/dev.db")
c = conn.cursor()
row = c.execute("SELECT id, email, fullName, role, isActive, staffId, lastLoginAt FROM UserAccount WHERE email = ?", ("admin@rpihm.edu.in",)).fetchone()
if row:
    print("Found account:")
    print("  ID:", row[0])
    print("  Email:", row[1])
    print("  Full Name:", row[2])
    print("  Role:", row[3])
    print("  Is Active:", bool(row[4]))
    print("  Staff ID:", row[5])
    print("  Last Login At:", row[6])
    sessions = c.execute("SELECT COUNT(*), MAX(createdAt) FROM Session WHERE userId = ? AND revokedAt IS NULL", (row[0],)).fetchone()
    print("  Active Valid Sessions in DB:", sessions[0])
    print("  Latest Session Created At:", sessions[1])
else:
    print("Account not found")
conn.close()
