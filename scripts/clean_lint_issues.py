# 1. Clean createBackupKey in StudentsView.tsx and FacultyView.tsx
for path in ["src/components/modules/students/StudentsView.tsx", "src/components/modules/faculty/FacultyView.tsx"]:
    with open(path, "r", encoding="utf-8") as f:
        lines = f.readlines()
    filtered = [l for l in lines if "createBackupKey" not in l]
    with open(path, "w", encoding="utf-8") as f:
        f.writelines(filtered)
    print(f"Cleaned {path}")

# 2. Fix explicit any in reconciliationEngine.ts
with open("src/lib/utils/reconciliationEngine.ts", "r", encoding="utf-8") as f:
    text = f.read()

text = text.replace(
    "export function executeSafePruning<T extends { id: string }>(params: {\n  storageKey: string;\n  requestedIds: string[];\n  rawStorageContent: string | null;\n  currentDbRecords: any[];\n  evaluator: (proto: T, live: any[]) => PrototypeComparisonItem;",
    "export function executeSafePruning<T extends { id: string }, TDb = unknown>(params: {\n  storageKey: string;\n  requestedIds: string[];\n  rawStorageContent: string | null;\n  currentDbRecords: TDb[];\n  evaluator: (proto: T, live: TDb[]) => PrototypeComparisonItem;"
)

with open("src/lib/utils/reconciliationEngine.ts", "w", encoding="utf-8") as f:
    f.write(text)
print("Updated reconciliationEngine.ts")
