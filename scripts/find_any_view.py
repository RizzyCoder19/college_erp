with open("src/components/modules/examinations/ExaminationsView.tsx", "r", encoding="utf-8") as f:
    lines = f.readlines()

for i, l in enumerate(lines):
    if ": any" in l or "<any" in l or "any>" in l or "any[]" in l or "as any" in l or "(sr: any)" in l:
        print(f"{i+1}: {l.strip()}")
