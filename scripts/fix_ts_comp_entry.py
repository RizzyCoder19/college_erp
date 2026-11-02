with open("src/lib/dal/examRepository.ts", "r", encoding="utf-8") as f:
    repo = f.read()

repo = repo.replace(
    "const entry = compEntries.find((e) => e.componentId === comp.id);",
    "type CompEntryItem = { componentId: string; marksObtained: number | null; moderatedMarks: number | null; entryStatus: string };\n            const entry = (compEntries as CompEntryItem[]).find((e: CompEntryItem) => e.componentId === comp.id);"
)

with open("src/lib/dal/examRepository.ts", "w", encoding="utf-8") as f:
    f.write(repo)
print("Updated compEntries typing")
