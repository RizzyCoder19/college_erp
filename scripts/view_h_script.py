with open("H:/write_exam_view.js", "r", encoding="utf-8") as f:
    lines = f.readlines()

for i in range(20, 60):
    print(f"{i+1}: {lines[i]}", end="")
