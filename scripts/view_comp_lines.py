with open("scripts/test_milestone5_examinations.ts", "r", encoding="utf-8") as f:
    lines = f.readlines()

for i in range(140, 195):
    if "componentId" in lines[i]:
        print(f"{i+1}: {lines[i].strip()}")
