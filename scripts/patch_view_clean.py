with open("src/components/modules/examinations/ExaminationsView.tsx", "r", encoding="utf-8") as f:
    view = f.read()

# Types definitions at top
interfaces = """
interface ExamReferenceItem {
  id: string;
  name?: string;
  code?: string;
  title?: string;
  semesterNumber?: number;
  programme?: { name: string; code: string };
  semesterId?: string;
  status?: string;
  startDate?: string | Date;
  endDate?: string | Date;
  academicYear?: { name: string };
  componentType?: string;
  maxMarks?: number;
  minPassingMarks?: number;
  weightagePercentage?: number;
  subject?: { code: string; title: string };
}

interface RosterCandidate {
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
  revisions?: unknown[];
}

interface SubjectResultDisplay {
  id: string;
  credits: number;
  gradePoint: number;
  letterGrade: string;
  status: string;
  totalMarksObtained: number | null;
  totalMaxMarks: number;
  subject?: { code: string; title: string };
}

interface StudentSummaryDisplay {
  id?: string;
  studentId: string;
  semesterId?: string;
  sgpa: number;
  percentage: number;
  letterGrade: string;
  resultStatus: string;
  student?: { fullName: string; rollNumber: string | null; prn: string };
  semester?: { semesterNumber: number; programme?: { name: string; code: string } };
  subjectResults?: SubjectResultDisplay[];
}
"""

view = view.replace('type TabType = "sessions" | "marks" | "moderation" | "gradecards";', interfaces + '\ntype TabType = "sessions" | "marks" | "moderation" | "gradecards";')

view = view.replace("const [academicYears, setAcademicYears] = useState<any[]>([]);", "const [academicYears, setAcademicYears] = useState<ExamReferenceItem[]>([]);")
view = view.replace("const [semesters, setSemesters] = useState<any[]>([]);", "const [semesters, setSemesters] = useState<ExamReferenceItem[]>([]);")
view = view.replace("const [subjects, setSubjects] = useState<any[]>([]);", "const [subjects, setSubjects] = useState<ExamReferenceItem[]>([]);")
view = view.replace("const [examSessions, setExamSessions] = useState<any[]>([]);", "const [examSessions, setExamSessions] = useState<ExamReferenceItem[]>([]);")
view = view.replace("const [sessionComponents, setSessionComponents] = useState<any[]>([]);", "const [sessionComponents, setSessionComponents] = useState<ExamReferenceItem[]>([]);")

view = view.replace(
    "const [rosterData, setRosterData] = useState<{ component?: any; roster: any[] }>({ roster: [] });",
    "const [rosterData, setRosterData] = useState<{ component?: ExamReferenceItem; roster: RosterCandidate[] }>({ roster: [] });"
)

view = view.replace(
    "const [calculatedSummaries, setCalculatedSummaries] = useState<any[]>([]);",
    "const [calculatedSummaries, setCalculatedSummaries] = useState<StudentSummaryDisplay[]>([]);"
)
view = view.replace(
    "const [selectedModerationEntry, setSelectedModerationEntry] = useState<any | null>(null);",
    "const [selectedModerationEntry, setSelectedModerationEntry] = useState<RosterCandidate | null>(null);"
)
view = view.replace(
    "const [studentSummaries, setStudentSummaries] = useState<any[]>([]);",
    "const [studentSummaries, setStudentSummaries] = useState<StudentSummaryDisplay[]>([]);"
)
view = view.replace(
    "const [selectedStudentSummary, setSelectedStudentSummary] = useState<any | null>(null);",
    "const [selectedStudentSummary, setSelectedStudentSummary] = useState<StudentSummaryDisplay | null>(null);"
)
view = view.replace(
    "const [amendmentEntry, setAmendmentEntry] = useState<any | null>(null);",
    "const [amendmentEntry, setAmendmentEntry] = useState<RosterCandidate | null>(null);"
)

view = view.replace(
    "const initialEdits: any = {};",
    "const initialEdits: Record<string, { marksObtained: number | null; entryStatus: string; remarks: string }> = {};"
)

view = view.replace(
    "sessionType: newSessionForm.sessionType as any,",
    'sessionType: newSessionForm.sessionType as "REGULAR" | "ATKT_SUPPLEMENTARY" | "REVALUATION",'
)

view = view.replace(
    "entryStatus: edit.entryStatus as any,",
    'entryStatus: edit.entryStatus as "PENDING" | "ENTERED" | "ABSENT" | "EXEMPT" | "WITHHELD" | "MEDICAL_LEAVE",'
)

view = view.replace(
    "{selectedStudentSummary.subjectResults?.map((sr: any) => {",
    "{selectedStudentSummary.subjectResults?.map((sr: SubjectResultDisplay) => {"
)

view = view.replace(
    "onChange={(e) => setNewComponentForm({ ...newComponentForm, componentType: e.target.value as any })}",
    'onChange={(e) => setNewComponentForm({ ...newComponentForm, componentType: e.target.value as "THEORY_SEE" | "INTERNAL_IA" | "PRACTICAL_SEE" | "VIVA_VOCE" })}'
)

with open("src/components/modules/examinations/ExaminationsView.tsx", "w", encoding="utf-8") as f:
    f.write(view)
print("Updated ExaminationsView.tsx with clean interfaces")
