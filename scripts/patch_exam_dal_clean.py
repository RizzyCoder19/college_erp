with open("src/lib/dal/examRepository.ts", "r", encoding="utf-8") as f:
    repo = f.read()

repo = repo.replace("Promise<Result<any[]>>", "Promise<Result<unknown[]>>")
repo = repo.replace("Promise<Result<any>>", "Promise<Result<unknown>>")
repo = repo.replace("const entryMap = new Map<string, any>();", "const entryMap = new Map<string, (typeof entries)[0]>();")
repo = repo.replace("const studentMap = new Map<string, Map<string, any[]>>();", "const studentMap = new Map<string, Map<string, typeof entries>>();")
repo = repo.replace("const calculatedSummaries: any[] = [];", "const calculatedSummaries: Record<string, unknown>[] = [];")
repo = repo.replace("const subjectResultsToSave: any[] = [];", "const subjectResultsToSave: Record<string, unknown>[] = [];")

with open("src/lib/dal/examRepository.ts", "w", encoding="utf-8") as f:
    f.write(repo)
print("Updated examRepository.ts with clean types")
