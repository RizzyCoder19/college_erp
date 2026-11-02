with open("src/lib/dal/examRepository.ts", "r", encoding="utf-8") as f:
    lines = f.readlines()

for i in range(298, 330):
    print(f"{i+1}: {lines[i]}", end="")
