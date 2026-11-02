with open("scripts/test_milestone5_examinations.ts", "r", encoding="utf-8") as f:
    lines = f.readlines()

for idx in [145, 158, 171, 187, 229, 250]:
    print(f"{idx+1}: {lines[idx].strip()}")
