with open("src/components/modules/faculty/FacultyView.tsx", "r", encoding="utf-8") as f:
    content = f.read()

# 1. Imports
target_import = 'import { getStaffAction, createStaffAction, updateStaffAction, deleteStaffAction } from "@/lib/actions/faculty";'
replacement_import = '''import { getStaffAction, createStaffAction, updateStaffAction, deleteStaffAction } from "@/lib/actions/faculty";
import { getCurrentUserAction } from "@/lib/actions/auth";
import { hasPermission } from "@/lib/auth/roles";'''

if target_import in content:
    content = content.replace(target_import, replacement_import, 1)

# 2. State & effect for currentUser
target_state = '  const [selectedStatus, setSelectedStatus] = useState<string>("all");'
replacement_state = '''  const [selectedStatus, setSelectedStatus] = useState<string>("all");
  const [currentUserRole, setCurrentUserRole] = useState<string | null>(null);

  useEffect(() => {
    getCurrentUserAction().then((res) => {
      if (res.success && res.data) {
        setCurrentUserRole(res.data.role);
      }
    });
  }, []);

  const canWriteFaculty = currentUserRole ? hasPermission(currentUserRole, "WRITE_FACULTY") : true;
  const canDeleteFaculty = currentUserRole ? hasPermission(currentUserRole, "DELETE_FACULTY") : true;'''

if target_state in content:
    content = content.replace(target_state, replacement_state, 1)

# 3. Add button title & disabled
target_add = '''                <button
                  onClick={() => {
                    setFormFaculty(null);
                    setFormMode("add");
                    setFormModalOpen(true);
                  }}
                  className="px-3.5 py-1.5 rounded-xl bg-[#1657D9] hover:bg-[#1248B8] text-white text-xs font-semibold shadow-xs flex items-center space-x-1.5 cursor-pointer transition-colors"
                >'''

replacement_add = '''                <button
                  disabled={!canWriteFaculty}
                  title={canWriteFaculty ? "Add Staff Member" : "Access Denied: Write authorization required for this account"}
                  onClick={() => {
                    if (!canWriteFaculty) return;
                    setFormFaculty(null);
                    setFormMode("add");
                    setFormModalOpen(true);
                  }}
                  className={`px-3.5 py-1.5 rounded-xl bg-[#1657D9] hover:bg-[#1248B8] text-white text-xs font-semibold shadow-xs flex items-center space-x-1.5 transition-colors ${
                    !canWriteFaculty ? "opacity-60 cursor-not-allowed" : "cursor-pointer"
                  }`}
                >'''

if target_add in content:
    content = content.replace(target_add, replacement_add, 1)

# 4. Table edit button
target_table_edit = '''                        <button
                          type="button"
                          onClick={() => {
                            setFormFaculty(staff);
                            setFormMode("edit");
                            setFormModalOpen(true);
                          }}
                          className="w-7 h-7 rounded-lg flex items-center justify-center text-slate-500 hover:text-amber-600 hover:bg-amber-50 transition-colors"
                          title="Edit Record"
                        >'''

replacement_table_edit = '''                        <button
                          type="button"
                          disabled={!canWriteFaculty}
                          onClick={() => {
                            if (!canWriteFaculty) return;
                            setFormFaculty(staff);
                            setFormMode("edit");
                            setFormModalOpen(true);
                          }}
                          className={`w-7 h-7 rounded-lg flex items-center justify-center text-slate-500 hover:text-amber-600 hover:bg-amber-50 transition-colors ${
                            !canWriteFaculty ? "opacity-40 cursor-not-allowed" : "cursor-pointer"
                          }`}
                          title={canWriteFaculty ? "Edit Record" : "Access Denied: Write authorization required"}
                        >'''

if target_table_edit in content:
    content = content.replace(target_table_edit, replacement_table_edit, 1)

with open("src/components/modules/faculty/FacultyView.tsx", "w", encoding="utf-8") as f:
    f.write(content)

print("SUCCESS: Updated FacultyView.tsx with permission awareness")
