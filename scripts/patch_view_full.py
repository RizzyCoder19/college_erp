with open("H:/write_exam_view.js", "r", encoding="utf-8") as f:
    orig = f.read()

# Extract code between `const code = \` and \`;`
start_marker = "const code = `"
end_marker = "`;\n\nfs.writeFileSync"
start_idx = orig.find(start_marker) + len(start_marker)
end_idx = orig.rfind(end_marker)
content = orig[start_idx:end_idx]

# Replace types in content
interfaces = """
interface AcademicYearOption {
  id: string;
  name: string;
}

interface SemesterOption {
  id: string;
  semesterNumber: number;
  termType?: string;
  programme?: { name: string; code: string };
}

interface SubjectOption {
  id: string;
  code: string;
  title: string;
  credits?: number;
  teachingAssignments?: Array<{ staff?: { fullName: string } }>;
}

interface ExamSessionOption {
  id: string;
  sessionCode: string;
  name: string;
  status: string;
  sessionType?: string;
  startDate: string | Date;
  endDate: string | Date;
  academicYear?: { name: string };
  _count?: { assessmentComponents?: number; examResultSummaries?: number };
}

interface ComponentOption {
  id: string;
  name: string;
  componentType: string;
  maxMarks: number;
  minPassingMarks: number;
  weightagePercentage: number;
  subject?: { code: string; title: string; teachingAssignments?: Array<{ staff?: { fullName: string } }> };
  _count?: { studentEntries?: number };
}

interface RosterCandidateItem {
  studentId: string;
  enrolmentId: string;
  rollNumber: string | null;
  prn: string;
  fullName: string;
  divisionName?: string | null;
  marksObtained: number | null;
  moderatedMarks: number | null;
  entryStatus: string;
  remarks: string | null;
  entryId: string | null;
  enteredBy?: string | null;
  enteredAt?: Date | null;
  moderatedBy?: string | null;
  moderatedAt?: Date | null;
  revisions?: unknown[];
}

interface SubjectResultOption {
  id: string;
  credits: number;
  gradePoint: number;
  letterGrade: string;
  status: string;
  totalMarksObtained: number | null;
  totalMaxMarks: number;
  subject?: { code: string; title: string };
}

interface StudentSummaryOption {
  id?: string;
  studentId: string;
  semesterId?: string;
  sgpa: number;
  percentage: number;
  letterGrade: string;
  resultStatus: string;
  totalMaxMarks?: number;
  totalMarksObtained?: number | null;
  publishedBy?: { fullName?: string };
  student?: { fullName: string; rollNumber: string | null; prn: string };
  semester?: { semesterNumber: number; programme?: { name: string; code: string } };
  examSession?: { name: string; sessionCode: string };
  subjectResults?: SubjectResultOption[];
}
"""

content = content.replace('type TabType = "sessions" | "marks" | "moderation" | "gradecards";', interfaces + '\ntype TabType = "sessions" | "marks" | "moderation" | "gradecards";')

content = content.replace("const [academicYears, setAcademicYears] = useState<any[]>([]);", "const [academicYears, setAcademicYears] = useState<AcademicYearOption[]>([]);")
content = content.replace("const [semesters, setSemesters] = useState<any[]>([]);", "const [semesters, setSemesters] = useState<SemesterOption[]>([]);")
content = content.replace("const [subjects, setSubjects] = useState<any[]>([]);", "const [subjects, setSubjects] = useState<SubjectOption[]>([]);")
content = content.replace("const [examSessions, setExamSessions] = useState<any[]>([]);", "const [examSessions, setExamSessions] = useState<ExamSessionOption[]>([]);")
content = content.replace("const [sessionComponents, setSessionComponents] = useState<any[]>([]);", "const [sessionComponents, setSessionComponents] = useState<ComponentOption[]>([]);")

content = content.replace(
    "const [rosterData, setRosterData] = useState<{ component?: any; roster: any[] }>({ roster: [] });",
    "const [rosterData, setRosterData] = useState<{ component?: ComponentOption; roster: RosterCandidateItem[] }>({ roster: [] });"
)
content = content.replace(
    "const [calculatedSummaries, setCalculatedSummaries] = useState<any[]>([]);",
    "const [calculatedSummaries, setCalculatedSummaries] = useState<StudentSummaryOption[]>([]);"
)
content = content.replace(
    "const [selectedModerationEntry, setSelectedModerationEntry] = useState<any | null>(null);",
    "const [selectedModerationEntry, setSelectedModerationEntry] = useState<RosterCandidateItem | null>(null);"
)
content = content.replace(
    "const [studentSummaries, setStudentSummaries] = useState<any[]>([]);",
    "const [studentSummaries, setStudentSummaries] = useState<StudentSummaryOption[]>([]);"
)
content = content.replace(
    "const [selectedStudentSummary, setSelectedStudentSummary] = useState<any | null>(null);",
    "const [selectedStudentSummary, setSelectedStudentSummary] = useState<StudentSummaryOption | null>(null);"
)
content = content.replace(
    "const [amendmentEntry, setAmendmentEntry] = useState<any | null>(null);",
    "const [amendmentEntry, setAmendmentEntry] = useState<RosterCandidateItem | null>(null);"
)

content = content.replace(
    "const initialEdits: any = {};",
    "const initialEdits: Record<string, { marksObtained: number | null; entryStatus: string; remarks: string }> = {};"
)

content = content.replace(
    "sessionType: newSessionForm.sessionType as any,",
    'sessionType: newSessionForm.sessionType as "REGULAR" | "ATKT_SUPPLEMENTARY" | "REVALUATION",'
)

content = content.replace(
    "entryStatus: edit.entryStatus as any,",
    'entryStatus: edit.entryStatus as "PENDING" | "ENTERED" | "ABSENT" | "EXEMPT" | "WITHHELD" | "MEDICAL_LEAVE",'
)

content = content.replace(
    "{selectedStudentSummary.subjectResults?.map((sr: any) => {",
    "{selectedStudentSummary.subjectResults?.map((sr: SubjectResultOption) => {"
)

content = content.replace(
    "onChange={(e) => setNewComponentForm({ ...newComponentForm, componentType: e.target.value as any })}",
    'onChange={(e) => setNewComponentForm({ ...newComponentForm, componentType: e.target.value as "THEORY_SEE" | "INTERNAL_IA" | "PRACTICAL_SEE" | "VIVA_VOCE" })}'
)

# Replace state setters with safe casting
content = content.replace(
    "if (ayRes.success && ayRes.data) setAcademicYears(ayRes.data);",
    "if (ayRes.success && ayRes.data) setAcademicYears(ayRes.data as unknown as AcademicYearOption[]);"
)
content = content.replace(
    "if (semRes.success && semRes.data) setSemesters(semRes.data);",
    "if (semRes.success && semRes.data) setSemesters(semRes.data as unknown as SemesterOption[]);"
)
content = content.replace(
    "if (subRes.success && subRes.data) setSubjects(subRes.data);",
    "if (subRes.success && subRes.data) setSubjects(subRes.data as unknown as SubjectOption[]);"
)
content = content.replace(
    "if (res.success && res.data) {\n      setExamSessions(res.data);",
    "if (res.success && res.data) {\n      setExamSessions(res.data as unknown as ExamSessionOption[]);"
)
content = content.replace(
    "if (res.success && res.data) {\n        setSessionComponents(res.data);",
    "if (res.success && res.data) {\n        setSessionComponents(res.data as unknown as ComponentOption[]);"
)
content = content.replace(
    "if (res.success && res.data) {\n        setRosterData(res.data);",
    "if (res.success && res.data) {\n        setRosterData(res.data as unknown as { component?: ComponentOption; roster: RosterCandidateItem[] });"
)
content = content.replace(
    "if (res.success && res.data) {\n        setCalculatedSummaries(res.data.summaries || []);",
    "if (res.success && res.data) {\n        setCalculatedSummaries((res.data as unknown as { summaries: StudentSummaryOption[] }).summaries || []);"
)
content = content.replace(
    "if (res.success && res.data) {\n        setStudentSummaries(res.data);",
    "if (res.success && res.data) {\n        setStudentSummaries(res.data as unknown as StudentSummaryOption[]);"
)
content = content.replace(
    "setSelectedStudentSummary(found || null);",
    "setSelectedStudentSummary((found as unknown as StudentSummaryOption) || null);"
)

with open("src/components/modules/examinations/ExaminationsView.tsx", "w", encoding="utf-8") as f:
    f.write(content)
print("Updated ExaminationsView.tsx with full typed options")
