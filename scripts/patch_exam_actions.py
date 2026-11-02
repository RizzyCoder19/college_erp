with open("src/lib/actions/examinations.ts", "r", encoding="utf-8") as f:
    acts = f.read()

acts = acts.replace("Promise<Result<any[]>>", "Promise<Result<unknown[]>>")
acts = acts.replace("Promise<Result<any>>", "Promise<Result<unknown>>")

with open("src/lib/actions/examinations.ts", "w", encoding="utf-8") as f:
    f.write(acts)
print("Updated examinations.ts with unknown")
