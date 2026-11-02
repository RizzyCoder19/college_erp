import sqlite3
conn = sqlite3.connect("prisma/dev.db")
c = conn.cursor()
rows = c.execute("SELECT id, email, fullName, role, isActive, staffId, lastLoginAt FROM UserAccount").fetchall()
print(f"Total user accounts: {len(rows)}")
for r in rows:
    print(f"  ID: {r[0]}, Email: {r[1]}, Name: {r[2]}, Role: {r[3]}, Active: {bool(r[4])}, LastLogin: {r[6]}")
conn.close()
