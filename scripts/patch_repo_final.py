with open("src/lib/dal/examRepository.ts", "r", encoding="utf-8") as f:
    repo = f.read()

calc_interfaces = """interface CalculatedSubjectResult {
  subjectId: string;
  totalMaxMarks: number;
  totalMarksObtained: number | null;
  credits: number;
  gradePoint: number;
  letterGrade: string;
  status: string;
}

interface CalculatedSummary {
  enrolmentId: string;
  studentId: string;
  semesterId: string;
  totalMaxMarks: number;
  totalMarksObtained: number;
  percentage: number;
  sgpa: number;
  letterGrade: string;
  resultStatus: string;
  subjectResults: CalculatedSubjectResult[];
}
"""

if "interface CalculatedSummary" not in repo:
    repo = repo.replace("  static async calculateSessionResults(", calc_interfaces + "\n  static async calculateSessionResults(")

repo = repo.replace("Promise<Result<any[]>>", "Promise<Result<unknown[]>>")
repo = repo.replace("Promise<Result<any>>", "Promise<Result<unknown>>")
repo = repo.replace("const entryMap = new Map<string, any>();", "const entryMap = new Map<string, (typeof entries)[0]>();")
repo = repo.replace("const studentMap = new Map<string, Map<string, any[]>>();", "const studentMap = new Map<string, Map<string, typeof entries>>();")
repo = repo.replace("const calculatedSummaries: any[] = [];", "const calculatedSummaries: CalculatedSummary[] = [];")
repo = repo.replace("const subjectResultsToSave: any[] = [];", "const subjectResultsToSave: CalculatedSubjectResult[] = [];")
repo = repo.replace(
    "const entry = compEntries.find((e: any) => e.componentId === comp.id);",
    "type CompEntryItem = { componentId: string; marksObtained: number | null; moderatedMarks: number | null; entryStatus: string };\n            const entry = (compEntries as CompEntryItem[]).find((e: CompEntryItem) => e.componentId === comp.id);"
)

with open("src/lib/dal/examRepository.ts", "w", encoding="utf-8") as f:
    f.write(repo)
print("Updated examRepository.ts cleanly")
