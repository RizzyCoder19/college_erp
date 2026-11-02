with open("src/lib/dal/examRepository.ts", "r", encoding="utf-8") as f:
    repo = f.read()

calc_interfaces = """export interface CalculatedSubjectResult {
  subjectId: string;
  totalMaxMarks: number;
  totalMarksObtained: number | null;
  credits: number;
  gradePoint: number;
  letterGrade: string;
  status: string;
}

export interface CalculatedSummary {
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

repo = repo.replace("export class ExamRepository {", calc_interfaces + "\nexport class ExamRepository {")
repo = repo.replace("Promise<Result<any[]>>", "Promise<Result<unknown[]>>")
repo = repo.replace("Promise<Result<any>>", "Promise<Result<unknown>>")
repo = repo.replace("const entryMap = new Map<string, any>();", "const entryMap = new Map<string, (typeof entries)[0]>();")
repo = repo.replace("const studentMap = new Map<string, Map<string, any[]>>();", "const studentMap = new Map<string, Map<string, typeof entries>>();")
repo = repo.replace("const calculatedSummaries: any[] = [];", "const calculatedSummaries: CalculatedSummary[] = [];")
repo = repo.replace("const subjectResultsToSave: any[] = [];", "const subjectResultsToSave: CalculatedSubjectResult[] = [];")
repo = repo.replace(
    "const entry = compEntries.find((e) => e.componentId === comp.id);",
    "type CompItem = { componentId: string; marksObtained: number | null; moderatedMarks: number | null; entryStatus: string };\n            const entry = (compEntries as CompItem[]).find((e: CompItem) => e.componentId === comp.id);"
)
repo = repo.replace(
    "const entry = compEntries.find((e: any) => e.componentId === comp.id);",
    "type CompItem = { componentId: string; marksObtained: number | null; moderatedMarks: number | null; entryStatus: string };\n            const entry = (compEntries as CompItem[]).find((e: CompItem) => e.componentId === comp.id);"
)

with open("src/lib/dal/examRepository.ts", "w", encoding="utf-8") as f:
    f.write(repo)
print("Updated examRepository.ts with top-level interfaces")
