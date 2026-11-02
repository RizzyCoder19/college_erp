with open("src/lib/dal/examRepository.ts", "r", encoding="utf-8") as f:
    repo = f.read()

# Define CalculatedSubjectResult and CalculatedSummary before calculateSessionResults
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

repo = repo.replace(
    "const calculatedSummaries: Record<string, unknown>[] = [];",
    "const calculatedSummaries: CalculatedSummary[] = [];"
)
repo = repo.replace(
    "const subjectResultsToSave: Record<string, unknown>[] = [];",
    "const subjectResultsToSave: CalculatedSubjectResult[] = [];"
)

with open("src/lib/dal/examRepository.ts", "w", encoding="utf-8") as f:
    f.write(repo)
print("Updated examRepository.ts with CalculatedSummary")
