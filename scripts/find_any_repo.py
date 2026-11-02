with open("src/lib/dal/examRepository.ts", "r", encoding="utf-8") as f:
    lines = f.readlines()

for i, l in enumerate(lines):
    if ": any" in l or "<any" in l or "any>" in l or "any[]" in l or "as any" in l:
        print(f"{i+1}: {l.strip()}")
