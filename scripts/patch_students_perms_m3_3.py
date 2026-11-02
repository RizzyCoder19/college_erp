# -*- coding: utf-8 -*-
with open(r"G:\rpihm-campusos\src\components\modules\students\StudentsView.tsx", "r", encoding="utf-8") as f:
    content = f.read()

# 1. Add state for permissions
target_state = '  const [reconcileModalOpen, setReconcileModalOpen] = useState(false);'
replacement_state = '''  const [reconcileModalOpen, setReconcileModalOpen] = useState(false);

  // User Permissions State
  const [canWrite, setCanWrite] = useState<boolean>(true);
  const [canDelete, setCanDelete] = useState<boolean>(true);'''
assert target_state in content, "target_state not found"
content = content.replace(target_state, replacement_state, 1)

# 2. Add useEffect to load permissions
target_effect = '''  useEffect(() => {
    let active = true;
    const init = async () => {'''
replacement_effect = '''  useEffect(() => {
    getCurrentUserAction().then((res) => {
      if (res.success && res.data) {
        const r = res.data.role;
        setCanWrite(hasPermission(r, "WRITE_STUDENTS"));
        setCanDelete(hasPermission(r, "DELETE_STUDENTS"));
      }
    });
  }, []);

  useEffect(() => {
    let active = true;
    const init = async () => {'''
assert target_effect in content, "target_effect not found"
content = content.replace(target_effect, replacement_effect, 1)

# 3. Guard edit and delete buttons in desktop table
target_table_actions = '''                      <button
                        type="button"
                        onClick={() => {
                          setFormMode("edit");
                          setFormStudent(std);
                          setFormModalOpen(true);
                        }}
                        className="p-1.5 rounded-lg text-slate-500 hover:text-slate-800 hover:bg-slate-100 transition-colors cursor-pointer"
                        title="Edit Record"
                      >
                        <Icon name="pencil" className="h-4 w-4" />
                      </button>
                      <button
                        type="button"
                        onClick={() => setDeleteStudent(std)}
                        className="p-1.5 rounded-lg text-slate-400 hover:text-[#D92534] hover:bg-red-50 transition-colors cursor-pointer"
                        title="Delete Record"
                      >
                        <Icon name="trash" className="h-4 w-4" />
                      </button>'''

replacement_table_actions = '''                      {canWrite && (
                        <button
                          type="button"
                          onClick={() => {
                            setFormMode("edit");
                            setFormStudent(std);
                            setFormModalOpen(true);
                          }}
                          className="p-1.5 rounded-lg text-slate-500 hover:text-slate-800 hover:bg-slate-100 transition-colors cursor-pointer"
                          title="Edit Record"
                        >
                          <Icon name="pencil" className="h-4 w-4" />
                        </button>
                      )}
                      {canDelete && (
                        <button
                          type="button"
                          onClick={() => setDeleteStudent(std)}
                          className="p-1.5 rounded-lg text-slate-400 hover:text-[#D92534] hover:bg-red-50 transition-colors cursor-pointer"
                          title="Delete Record"
                        >
                          <Icon name="trash" className="h-4 w-4" />
                        </button>
                      )}'''
assert target_table_actions in content, "target_table_actions not found"
content = content.replace(target_table_actions, replacement_table_actions, 1)

# 4. Guard Enroll New Student button in header
target_enroll = '''                <button
                  type="button"
                  onClick={() => {
                    setFormMode("add");
                    setFormStudent(null);
                    setFormModalOpen(true);
                  }}
                  className="inline-flex items-center space-x-2 px-4 py-2.5 rounded-xl bg-[#1657D9] hover:bg-[#1248B8] text-white text-xs font-semibold shadow-xs transition-all cursor-pointer"
                >
                  <Icon name="plus" className="h-4 w-4" />
                  <span>Enroll New Student</span>
                </button>'''

replacement_enroll = '''                {canWrite && (
                  <button
                    type="button"
                    onClick={() => {
                      setFormMode("add");
                      setFormStudent(null);
                      setFormModalOpen(true);
                    }}
                    className="inline-flex items-center space-x-2 px-4 py-2.5 rounded-xl bg-[#1657D9] hover:bg-[#1248B8] text-white text-xs font-semibold shadow-xs transition-all cursor-pointer"
                  >
                    <Icon name="plus" className="h-4 w-4" />
                    <span>Enroll New Student</span>
                  </button>
                )}'''
assert target_enroll in content, "target_enroll not found"
content = content.replace(target_enroll, replacement_enroll, 1)

with open(r"G:\rpihm-campusos\src\components\modules\students\StudentsView.tsx", "w", encoding="utf-8") as f:
    f.write(content)
print("StudentsView.tsx patched successfully")
