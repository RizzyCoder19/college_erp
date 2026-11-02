with open("src/components/modules/examinations/ExaminationsView.tsx", "r", encoding="utf-8") as f:
    lines = f.readlines()

for i in range(108, 132):
    print(f"{i+1}: {lines[i]}", end="")
