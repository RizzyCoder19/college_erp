with open("scripts/test_milestone5_examinations.ts", "r", encoding="utf-8") as f:
    lines = f.readlines()

for i in range(120, 131):
    print(f"{i+1}: {lines[i]}", end="")
