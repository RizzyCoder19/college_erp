with open("src/lib/dal/examRepository.ts", "r", encoding="utf-8") as f:
    repo = f.read()

repo = repo.replace(
    "static async createExamSession(dto: CreateExamSessionDTO): Promise<Result<unknown>> {",
    "static async createExamSession(dto: CreateExamSessionDTO): Promise<Result<{ id: string; [key: string]: unknown }>> {"
)
repo = repo.replace(
    "static async createAssessmentComponent(dto: CreateAssessmentComponentDTO): Promise<Result<unknown>> {",
    "static async createAssessmentComponent(dto: CreateAssessmentComponentDTO): Promise<Result<{ id: string; [key: string]: unknown }>> {"
)
repo = repo.replace(
    "static async getExamRosterForComponent(componentId: string): Promise<Result<unknown>> {",
    "static async getExamRosterForComponent(componentId: string): Promise<Result<{ component?: unknown; roster: Array<{ studentId: string; enrolmentId: string; rollNumber: string | null; prn: string; fullName: string; marksObtained: number | null; moderatedMarks: number | null; entryStatus: string; remarks: string | null; entryId: string | null }> }>> {"
)
repo = repo.replace(
    "static async calculateSessionResults(examSessionId: string, semesterId: string): Promise<Result<unknown>> {",
    "static async calculateSessionResults(examSessionId: string, semesterId: string): Promise<Result<{ studentsCalculated: number; summaries: CalculatedSummary[] }>> {"
)
repo = repo.replace(
    "static async getStudentResultSummaries(filters: {\n    examSessionId?: string;\n    studentId?: string;\n    semesterId?: string;\n    isStudentViewer?: boolean;\n  }): Promise<Result<unknown[]>> {",
    "static async getStudentResultSummaries(filters: {\n    examSessionId?: string;\n    studentId?: string;\n    semesterId?: string;\n    isStudentViewer?: boolean;\n  }): Promise<Result<Array<{ id: string; [key: string]: unknown }>>> {"
)

with open("src/lib/dal/examRepository.ts", "w", encoding="utf-8") as f:
    f.write(repo)
print("Updated examRepository.ts with exact test-compatible return types")
