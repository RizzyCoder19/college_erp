import re

# -------------------------------------------------------------
# 1. Update src/lib/dal/examRepository.ts
# -------------------------------------------------------------
with open('src/lib/dal/examRepository.ts', 'r', encoding='utf-8') as f:
    repo = f.read()

old_import = '''import prisma from "@/lib/db";
import { Prisma } from "@prisma/client";
import { Result } from "./types";'''

new_import = '''import prisma from "@/lib/db";
import {
  ExamSession,
  AssessmentComponent,
  StudentAssessmentEntry,
  Prisma,
} from "@prisma/client";
import { Result } from "./types";

export type ExamSessionWithRelations = Prisma.ExamSessionGetPayload<{
  include: {
    academicYear: true;
    publishedBy: { select: { fullName: true; email: true } };
    _count: {
      select: {
        assessmentComponents: true;
        examResultSummaries: true;
      };
    };
  };
}>;

export type ExamSessionDetailWithRelations = Prisma.ExamSessionGetPayload<{
  include: {
    academicYear: true;
    publishedBy: { select: { fullName: true; email: true } };
    assessmentComponents: {
      include: {
        subject: { include: { semester: { include: { programme: true } } } };
        _count: { select: { studentEntries: true } };
      };
    };
  };
}>;

export type AssessmentComponentWithRelations = Prisma.AssessmentComponentGetPayload<{
  include: {
    subject: {
      include: {
        semester: { include: { programme: true } };
        teachingAssignments: { include: { staff: true; division: true } };
      };
    };
    _count: { select: { studentEntries: true } };
  };
}>;

export interface ExamRosterAuditItem {
  id: string;
  previousMarks: number | null;
  newMarks: number;
  reason: string;
  revisedAt: Date;
  revisedBy: { fullName: string };
}

export interface ExamRosterItem {
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
}

export interface ExamRosterResult {
  component: Prisma.AssessmentComponentGetPayload<{
    include: {
      subject: { include: { semester: { include: { programme: true } } } };
      examSession: true;
    };
  }>;
  roster: ExamRosterItem[];
}

export type ExamResultSummaryWithRelations = Prisma.ExamResultSummaryGetPayload<{
  include: {
    student: true;
    semester: { include: { programme: true } };
    examSession: true;
    subjectResults: {
      include: { subject: true };
    };
  };
}>;

export interface CalculatedSubjectResult {
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
}'''

repo = repo.replace(old_import, new_import)
repo = repo.replace(
    'static async getExamSessions(academicYearId?: string): Promise<Result<any[]>> {',
    'static async getExamSessions(academicYearId?: string): Promise<Result<ExamSessionWithRelations[]>> {'
)
repo = repo.replace(
    'static async getExamSessionById(id: string): Promise<Result<any>> {',
    'static async getExamSessionById(id: string): Promise<Result<ExamSessionDetailWithRelations>> {'
)
repo = repo.replace(
    'static async createExamSession(dto: CreateExamSessionDTO): Promise<Result<any>> {',
    'static async createExamSession(dto: CreateExamSessionDTO): Promise<Result<ExamSession>> {'
)
repo = repo.replace(
    'static async updateExamSessionStatus(id: string, status: string, publishedById?: string): Promise<Result<any>> {',
    'static async updateExamSessionStatus(id: string, status: string, publishedById?: string): Promise<Result<ExamSession>> {'
)
repo = repo.replace(
    'static async createAssessmentComponent(dto: CreateAssessmentComponentDTO): Promise<Result<any>> {',
    'static async createAssessmentComponent(dto: CreateAssessmentComponentDTO): Promise<Result<AssessmentComponent>> {'
)
repo = repo.replace(
    'static async getComponentsForSession(examSessionId: string, subjectId?: string): Promise<Result<any[]>> {',
    'static async getComponentsForSession(examSessionId: string, subjectId?: string): Promise<Result<AssessmentComponentWithRelations[]>> {'
)
repo = repo.replace(
    'static async getExamRosterForComponent(componentId: string): Promise<Result<any>> {',
    'static async getExamRosterForComponent(componentId: string): Promise<Result<ExamRosterResult>> {'
)
repo = repo.replace(
    'const entryMap = new Map<string, any>();',
    'const entryMap = new Map<string, typeof entries[0]>();'
)
repo = repo.replace(
    'static async recordStudentMarks(dto: RecordMarksDTO): Promise<Result<any>> {',
    'static async recordStudentMarks(dto: RecordMarksDTO): Promise<Result<{ count: number }>> {'
)
repo = repo.replace(
    'static async moderateStudentMarks(dto: ModerateMarksDTO): Promise<Result<any>> {',
    'static async moderateStudentMarks(dto: ModerateMarksDTO): Promise<Result<StudentAssessmentEntry>> {'
)
repo = repo.replace(
    'static async calculateSessionResults(examSessionId: string, semesterId: string): Promise<Result<any>> {',
    'static async calculateSessionResults(examSessionId: string, semesterId: string): Promise<Result<{ summariesCount: number; subjectResultsCount: number }>> {'
)
repo = repo.replace(
    'const studentMap = new Map<string, Map<string, any[]>>();',
    'const studentMap = new Map<string, Map<string, typeof entries>>();'
)
repo = repo.replace(
    'const calculatedSummaries: any[] = [];',
    'const calculatedSummaries: CalculatedSummary[] = [];'
)
repo = repo.replace(
    'const subjectResultsToSave: any[] = [];',
    'const subjectResultsToSave: CalculatedSubjectResult[] = [];'
)
repo = repo.replace(
    'const entry = compEntries.find((e: any) => e.componentId === comp.id);',
    'const entry = compEntries.find((e) => e.componentId === comp.id);'
)
repo = repo.replace(
    'static async publishSessionResults(examSessionId: string, semesterId: string, publishedById: string): Promise<Result<any>> {',
    'static async publishSessionResults(examSessionId: string, semesterId: string, publishedById: string): Promise<Result<{ publishedCount: number }>> {'
)
repo = re.sub(
    r'(static async getStudentResultSummaries\(filters: \{[\s\S]*?\}\): Promise<Result<)any\[\](>> \{)',
    r'\g<1>ExamResultSummaryWithRelations[]\g<2>',
    repo
)
repo = repo.replace(
    'static async amendPublishedMark(dto: AmendPublishedMarkDTO): Promise<Result<any>> {',
    'static async amendPublishedMark(dto: AmendPublishedMarkDTO): Promise<Result<StudentAssessmentEntry>> {'
)

with open('src/lib/dal/examRepository.ts', 'w', encoding='utf-8') as f:
    f.write(repo)
print('Updated examRepository.ts')

# -------------------------------------------------------------
# 2. Update src/lib/actions/examinations.ts
# -------------------------------------------------------------
with open('src/lib/actions/examinations.ts', 'r', encoding='utf-8') as f:
    acts = f.read()

acts_old_imports = '''import {
  ExamRepository,
  CreateExamSessionDTO,
  CreateAssessmentComponentDTO,
  MarkEntryDTO,
} from "@/lib/dal/examRepository";'''

acts_new_imports = '''import {
  ExamRepository,
  CreateExamSessionDTO,
  CreateAssessmentComponentDTO,
  MarkEntryDTO,
  ExamSessionWithRelations,
  ExamSessionDetailWithRelations,
  AssessmentComponentWithRelations,
  ExamRosterResult,
  ExamResultSummaryWithRelations,
} from "@/lib/dal/examRepository";
import {
  ExamSession,
  AssessmentComponent,
  StudentAssessmentEntry,
} from "@prisma/client";'''

acts = acts.replace(acts_old_imports, acts_new_imports)

acts = acts.replace(
    'export async function getExamSessionsAction(academicYearId?: string): Promise<Result<any[]>> {',
    'export async function getExamSessionsAction(academicYearId?: string): Promise<Result<ExamSessionWithRelations[]>> {'
)
acts = acts.replace(
    'export async function getExamSessionByIdAction(id: string): Promise<Result<any>> {',
    'export async function getExamSessionByIdAction(id: string): Promise<Result<ExamSessionDetailWithRelations | null>> {'
)
acts = acts.replace(
    'export async function createExamSessionAction(dto: CreateExamSessionDTO): Promise<Result<any>> {',
    'export async function createExamSessionAction(dto: CreateExamSessionDTO): Promise<Result<ExamSession>> {'
)
acts = acts.replace(
    'export async function updateExamSessionStatusAction(id: string, status: string): Promise<Result<any>> {',
    'export async function updateExamSessionStatusAction(id: string, status: string): Promise<Result<ExamSession>> {'
)
acts = acts.replace(
    'export async function createAssessmentComponentAction(dto: CreateAssessmentComponentDTO): Promise<Result<any>> {',
    'export async function createAssessmentComponentAction(dto: CreateAssessmentComponentDTO): Promise<Result<AssessmentComponent>> {'
)
acts = acts.replace(
    'export async function getComponentsForSessionAction(examSessionId: string, subjectId?: string): Promise<Result<any[]>> {',
    'export async function getComponentsForSessionAction(examSessionId: string, subjectId?: string): Promise<Result<AssessmentComponentWithRelations[]>> {'
)
acts = acts.replace(
    'export async function getExamRosterForComponentAction(componentId: string): Promise<Result<any>> {',
    'export async function getExamRosterForComponentAction(componentId: string): Promise<Result<ExamRosterResult>> {'
)
acts = acts.replace(
    '}): Promise<Result<any>> {\n  const guard = await requirePermission("ENTER_MARKS");',
    '}): Promise<Result<{ count: number }>> {\n  const guard = await requirePermission("ENTER_MARKS");'
)
acts = acts.replace(
    '}): Promise<Result<any>> {\n  const guard = await requirePermission("MODERATE_MARKS");',
    '}): Promise<Result<StudentAssessmentEntry>> {\n  const guard = await requirePermission("MODERATE_MARKS");'
)
acts = acts.replace(
    '): Promise<Result<any>> {\n  const guard = await requirePermission("MANAGE_EXAMS");',
    '): Promise<Result<{ summariesCount: number; subjectResultsCount: number }>> {\n  const guard = await requirePermission("MANAGE_EXAMS");'
)
acts = acts.replace(
    '): Promise<Result<any>> {\n  const guard = await requirePermission("PUBLISH_RESULTS");',
    '): Promise<Result<{ publishedCount: number }>> {\n  const guard = await requirePermission("PUBLISH_RESULTS");'
)
acts = acts.replace(
    '}): Promise<Result<any[]>> {\n  const guard = await requireAuth();',
    '}): Promise<Result<ExamResultSummaryWithRelations[]>> {\n  const guard = await requireAuth();'
)
acts = acts.replace(
    '}): Promise<Result<any>> {\n  const guard = await requirePermission("PUBLISH_RESULTS");',
    '}): Promise<Result<StudentAssessmentEntry>> {\n  const guard = await requirePermission("PUBLISH_RESULTS");'
)

with open('src/lib/actions/examinations.ts', 'w', encoding='utf-8') as f:
    f.write(acts)
print('Updated examinations.ts')

# -------------------------------------------------------------
# 3. Update src/components/modules/examinations/ExaminationsView.tsx
# -------------------------------------------------------------
with open('src/components/modules/examinations/ExaminationsView.tsx', 'r', encoding='utf-8') as f:
    view = f.read()

view_old_import = '''import { Result } from "@/lib/dal/types";'''
view_new_import = '''import { Result } from "@/lib/dal/types";
import {
  ExamSessionWithRelations,
  AssessmentComponentWithRelations,
  ExamRosterResult,
  ExamRosterItem,
  ExamResultSummaryWithRelations,
} from "@/lib/dal/examRepository";
import {
  AcademicYearWithTerms,
  SemesterWithProgramme,
  SubjectWithRelations,
} from "@/lib/dal/academicRepository";'''

view = view.replace(view_old_import, view_new_import)

view = view.replace('const [academicYears, setAcademicYears] = useState<any[]>([]);', 'const [academicYears, setAcademicYears] = useState<AcademicYearWithTerms[]>([]);')
view = view.replace('const [semesters, setSemesters] = useState<any[]>([]);', 'const [semesters, setSemesters] = useState<SemesterWithProgramme[]>([]);')
view = view.replace('const [subjects, setSubjects] = useState<any[]>([]);', 'const [subjects, setSubjects] = useState<SubjectWithRelations[]>([]);')
view = view.replace('const [examSessions, setExamSessions] = useState<any[]>([]);', 'const [examSessions, setExamSessions] = useState<ExamSessionWithRelations[]>([]);')
view = view.replace('const [sessionComponents, setSessionComponents] = useState<any[]>([]);', 'const [sessionComponents, setSessionComponents] = useState<AssessmentComponentWithRelations[]>([]);')

view = view.replace(
    'const [rosterData, setRosterData] = useState<{ component?: any; roster: any[] }>({ roster: [] });',
    'const [rosterData, setRosterData] = useState<ExamRosterResult>({ component: undefined as unknown as ExamRosterResult["component"], roster: [] });'
)
view = view.replace(
    'const [calculatedSummaries, setCalculatedSummaries] = useState<any[]>([]);',
    'const [calculatedSummaries, setCalculatedSummaries] = useState<ExamResultSummaryWithRelations[]>([]);'
)
view = view.replace(
    'const [selectedModerationEntry, setSelectedModerationEntry] = useState<any | null>(null);',
    'const [selectedModerationEntry, setSelectedModerationEntry] = useState<ExamRosterItem | null>(null);'
)
view = view.replace(
    'const [studentSummaries, setStudentSummaries] = useState<any[]>([]);',
    'const [studentSummaries, setStudentSummaries] = useState<ExamResultSummaryWithRelations[]>([]);'
)
view = view.replace(
    'const [selectedStudentSummary, setSelectedStudentSummary] = useState<any | null>(null);',
    'const [selectedStudentSummary, setSelectedStudentSummary] = useState<ExamResultSummaryWithRelations | null>(null);'
)
view = view.replace(
    'const [amendmentEntry, setAmendmentEntry] = useState<any | null>(null);',
    'const [amendmentEntry, setAmendmentEntry] = useState<ExamRosterItem | null>(null);'
)
view = view.replace(
    'const initialEdits: any = {};',
    'const initialEdits: Record<string, { marksObtained: number | null; entryStatus: string; remarks: string }> = {};'
)
view = view.replace(
    'sessionType: newSessionForm.sessionType as any,',
    'sessionType: newSessionForm.sessionType as "REGULAR" | "ATKT_SUPPLEMENTARY" | "REVALUATION",'
)
view = view.replace(
    'entryStatus: edit.entryStatus as any,',
    'entryStatus: edit.entryStatus as "PENDING" | "ENTERED" | "ABSENT" | "EXEMPT" | "WITHHELD" | "MEDICAL_LEAVE",'
)
view = view.replace(
    '{selectedStudentSummary.subjectResults?.map((sr: any) => {',
    '{selectedStudentSummary.subjectResults?.map((sr) => {'
)
view = view.replace(
    'onChange={(e) => setNewComponentForm({ ...newComponentForm, componentType: e.target.value as any })}',
    'onChange={(e) => setNewComponentForm({ ...newComponentForm, componentType: e.target.value as "THEORY_SEE" | "INTERNAL_IA" | "PRACTICAL_SEE" | "VIVA_VOCE" })}'
)

with open('src/components/modules/examinations/ExaminationsView.tsx', 'w', encoding='utf-8') as f:
    f.write(view)
print('Updated ExaminationsView.tsx')
