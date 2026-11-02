with open("src/lib/dal/examRepository.ts", "r", encoding="utf-8") as f:
    repo = f.read()

# Fix ExamRosterItem
old_roster_item = """export interface ExamRosterItem {
  studentId: string;
  rollNumber: string | null;
  prn: string;
  fullName: string;
  divisionName: string | null;
  enrolmentId: string;
  entryId: string | null;
  marksObtained: number | null;
  moderatedMarks: number | null;
  effectiveMarks: number | null;
  entryStatus: string;
  remarks: string | null;
  audits: ExamRosterAuditItem[];
}"""

new_roster_item = """export interface ExamRosterItem {
  studentId: string;
  rollNumber: string | null;
  prn: string;
  fullName: string;
  divisionName: string | null;
  enrolmentId: string;
  entryId: string | null;
  marksObtained: number | null;
  entryStatus: string;
  moderatedMarks: number | null;
  remarks: string | null;
  enteredBy: string | null;
  enteredAt: Date | null;
  moderatedBy: string | null;
  moderatedAt: Date | null;
  revisions: unknown[];
}"""

repo = repo.replace(old_roster_item, new_roster_item)

# Fix calculateSessionResults and publishSessionResults return types
repo = repo.replace(
    'static async calculateSessionResults(examSessionId: string, semesterId: string): Promise<Result<{ summariesCount: number; subjectResultsCount: number }>> {',
    'static async calculateSessionResults(examSessionId: string, semesterId: string): Promise<Result<{ studentsCalculated: number; summaries: CalculatedSummary[] }>> {'
)
repo = repo.replace(
    'static async publishSessionResults(examSessionId: string, semesterId: string, publishedById: string): Promise<Result<{ publishedCount: number }>> {',
    'static async publishSessionResults(examSessionId: string, semesterId: string, publishedById: string): Promise<Result<{ publishedAt: Date }>> {'
)

# Fix studentMap and compEntries find typing
old_student_map = "const studentMap = new Map<string, Map<string, typeof entries>>();"
new_student_map = """type StudentAssessmentEntryWithComp = Prisma.StudentAssessmentEntryGetPayload<{ include: { component: true } }>;
      const studentMap = new Map<string, Map<string, StudentAssessmentEntryWithComp[]>>();"""
repo = repo.replace(old_student_map, new_student_map)

repo = repo.replace(
    "const entry = compEntries.find((e) => e.componentId === comp.id);",
    "const entry = compEntries.find((e: StudentAssessmentEntryWithComp) => e.componentId === comp.id);"
)

with open("src/lib/dal/examRepository.ts", "w", encoding="utf-8") as f:
    f.write(repo)
print("Updated examRepository.ts")

# 2. Update examinations.ts
with open("src/lib/actions/examinations.ts", "r", encoding="utf-8") as f:
    acts = f.read()

acts = acts.replace(
    '): Promise<Result<{ summariesCount: number; subjectResultsCount: number }>> {\n  const guard = await requirePermission("MANAGE_EXAMS");',
    '): Promise<Result<{ studentsCalculated: number; summaries: unknown[] }>> {\n  const guard = await requirePermission("MANAGE_EXAMS");'
)
acts = acts.replace(
    '): Promise<Result<{ publishedCount: number }>> {\n  const guard = await requirePermission("PUBLISH_RESULTS");',
    '): Promise<Result<{ publishedAt: Date }>> {\n  const guard = await requirePermission("PUBLISH_RESULTS");'
)
acts = acts.replace(
    '}): Promise<Result<{ publishedCount: number }>> {\n  const guard = await requirePermission("PUBLISH_RESULTS");\n  if (!guard.success || !guard.data) return guard as Result<never>;\n  return ExamRepository.amendPublishedMark({',
    '}): Promise<Result<StudentAssessmentEntry>> {\n  const guard = await requirePermission("PUBLISH_RESULTS");\n  if (!guard.success || !guard.data) return guard as Result<never>;\n  return ExamRepository.amendPublishedMark({'
)

with open("src/lib/actions/examinations.ts", "w", encoding="utf-8") as f:
    f.write(acts)
print("Updated examinations.ts")

# 3. Update ExaminationsView.tsx
with open("src/components/modules/examinations/ExaminationsView.tsx", "r", encoding="utf-8") as f:
    view = f.read()

# Add missing imports if not present
if "ExamSessionWithRelations" not in view:
    import_block = """import {
  ExamSessionWithRelations,
  AssessmentComponentWithRelations,
  ExamRosterResult,
  ExamRosterItem,
  ExamResultSummaryWithRelations,
  CalculatedSummary,
} from "@/lib/dal/examRepository";
import {
  AcademicYearWithTerms,
  SemesterWithProgramme,
  SubjectWithRelations,
} from "@/lib/dal/academicRepository";
"""
    view = view.replace('type TabType = "sessions" | "marks" | "moderation" | "gradecards";', import_block + '\ntype TabType = "sessions" | "marks" | "moderation" | "gradecards";')

view = view.replace(
    'const [calculatedSummaries, setCalculatedSummaries] = useState<ExamResultSummaryWithRelations[]>([]);',
    'const [calculatedSummaries, setCalculatedSummaries] = useState<CalculatedSummary[]>([]);'
)

# Fix newComponentForm typing
view = view.replace(
    """  const [newComponentForm, setNewComponentForm] = useState({
    subjectId: "",
    name: "Theory End-Semester Exam",
    componentType: "THEORY_SEE" as const,
    maxMarks: 75,
    minPassingMarks: 30,
    weightagePercentage: 75,
  });""",
    """  const [newComponentForm, setNewComponentForm] = useState<{
    subjectId: string;
    name: string;
    componentType: "THEORY_SEE" | "INTERNAL_IA" | "PRACTICAL_SEE" | "VIVA_VOCE";
    maxMarks: number;
    minPassingMarks: number;
    weightagePercentage: number;
  }>({
    subjectId: "",
    name: "Theory End-Semester Exam",
    componentType: "THEORY_SEE",
    maxMarks: 75,
    minPassingMarks: 30,
    weightagePercentage: 75,
  });"""
)

view = repo.replace(
    "{rosterData.roster.map((item) => {",
    "{rosterData.roster.map((item: ExamRosterItem) => {"
)

with open("src/components/modules/examinations/ExaminationsView.tsx", "w", encoding="utf-8") as f:
    f.write(view)
print("Updated ExaminationsView.tsx")
