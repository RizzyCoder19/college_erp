with open("src/components/modules/students/StudentsView.tsx", "r", encoding="utf-8") as f:
    content = f.read()

# 1. Imports
target_import = 'import { getStudentsAction, createStudentAction, updateStudentAction, deleteStudentAction } from "@/lib/actions/students";'
replacement_import = '''import { getStudentsAction, createStudentAction, updateStudentAction, deleteStudentAction } from "@/lib/actions/students";
import { getCurrentUserAction } from "@/lib/actions/auth";
import { hasPermission } from "@/lib/auth/roles";'''

if target_import in content:
    content = content.replace(target_import, replacement_import, 1)

# 2. State & effect for currentUser
target_state = '  const [selectedFee, setSelectedFee] = useState<string>("all");'
replacement_state = '''  const [selectedFee, setSelectedFee] = useState<string>("all");
  const [currentUserRole, setCurrentUserRole] = useState<string | null>(null);

  useEffect(() => {
    getCurrentUserAction().then((res) => {
      if (res.success && res.data) {
        setCurrentUserRole(res.data.role);
      }
    });
  }, []);

  const canWriteStudents = currentUserRole ? hasPermission(currentUserRole, "WRITE_STUDENTS") : true;
  const canDeleteStudents = currentUserRole ? hasPermission(currentUserRole, "DELETE_STUDENTS") : true;'''

if target_state in content:
    content = content.replace(target_state, replacement_state, 1)

# 3. Enroll button title & disabled
target_enroll = '''                  <button
                    type="button"
                    onClick={() => {
                      setFormMode("add");
                      setFormStudent(null);
                      setFormModalOpen(true);
                    }}
                    className="inline-flex items-center space-x-2 px-3.5 py-2 rounded-xl bg-[#1657D9] hover:bg-[#1248B8] text-white text-xs font-semibold shadow-xs transition-colors cursor-pointer"
                  >'''

replacement_enroll = '''                  <button
                    type="button"
                    disabled={!canWriteStudents}
                    title={canWriteStudents ? "Enroll New Student Record" : "Access Denied: Write authorization required for this account"}
                    onClick={() => {
                      if (!canWriteStudents) return;
                      setFormMode("add");
                      setFormStudent(null);
                      setFormModalOpen(true);
                    }}
                    className={`inline-flex items-center space-x-2 px-3.5 py-2 rounded-xl bg-[#1657D9] hover:bg-[#1248B8] text-white text-xs font-semibold shadow-xs transition-colors ${
                      !canWriteStudents ? "opacity-60 cursor-not-allowed" : "cursor-pointer"
                    }`}
                  >'''

if target_enroll in content:
    content = content.replace(target_enroll, replacement_enroll, 1)

# 4. Table edit button
target_table_edit = '''                        <button
                          type="button"
                          onClick={() => {
                            setFormMode("edit");
                            setFormStudent(student);
                            setFormModalOpen(true);
                          }}
                          className="p-1.5 rounded-lg text-slate-500 hover:text-slate-800 hover:bg-slate-100 transition-colors cursor-pointer"
                          title="Edit Record"
                        >'''

replacement_table_edit = '''                        <button
                          type="button"
                          disabled={!canWriteStudents}
                          onClick={() => {
                            if (!canWriteStudents) return;
                            setFormMode("edit");
                            setFormStudent(student);
                            setFormModalOpen(true);
                          }}
                          className={`p-1.5 rounded-lg text-slate-500 hover:text-slate-800 hover:bg-slate-100 transition-colors ${
                            !canWriteStudents ? "opacity-40 cursor-not-allowed" : "cursor-pointer"
                          }`}
                          title={canWriteStudents ? "Edit Record" : "Access Denied: Write authorization required"}
                        >'''

if target_table_edit in content:
    content = content.replace(target_table_edit, replacement_table_edit, 1)

with open("src/components/modules/students/StudentsView.tsx", "w", encoding="utf-8") as f:
    f.write(content)

print("SUCCESS: Updated StudentsView.tsx with permission awareness")
