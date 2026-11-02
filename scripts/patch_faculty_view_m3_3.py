# -*- coding: utf-8 -*-
with open(r"G:\rpihm-campusos\src\components\modules\faculty\FacultyView.tsx", "r", encoding="utf-8") as f:
    content = f.read()

# 1. Add import for StaffProvisionModal
target_import = 'import { DeleteFacultyModal } from "./DeleteFacultyModal";'
replacement_import = '''import { DeleteFacultyModal } from "./DeleteFacultyModal";
import { StaffProvisionModal } from "./StaffProvisionModal";'''
assert target_import in content, "target_import not found"
content = content.replace(target_import, replacement_import, 1)

# 2. Add state for provisioning and permissions
target_state = '  const [toastMessage, setToastMessage] = useState<string | null>(null);'
replacement_state = '''  const [toastMessage, setToastMessage] = useState<string | null>(null);

  // User Permissions and Account Provisioning State
  const [currentUserRole, setCurrentUserRole] = useState<string | null>(null);
  const [canWrite, setCanWrite] = useState<boolean>(true);
  const [canDelete, setCanDelete] = useState<boolean>(true);
  const [canManageAccounts, setCanManageAccounts] = useState<boolean>(false);
  const [provisionModalOpen, setProvisionModalOpen] = useState<boolean>(false);
  const [preselectedProvisionStaff, setPreselectedProvisionStaff] = useState<FacultyRecord | null>(null);'''
assert target_state in content, "target_state not found"
content = content.replace(target_state, replacement_state, 1)

# 3. Add useEffect to load currentUser permissions
target_effect = '''  useEffect(() => {
    let active = true;
    const init = async () => {'''
replacement_effect = '''  useEffect(() => {
    getCurrentUserAction().then((res) => {
      if (res.success && res.data) {
        const r = res.data.role;
        setCurrentUserRole(r);
        setCanWrite(hasPermission(r, "WRITE_FACULTY"));
        setCanDelete(hasPermission(r, "DELETE_FACULTY"));
        setCanManageAccounts(hasPermission(r, "ADMIN_ALL"));
      }
    });
  }, []);

  useEffect(() => {
    let active = true;
    const init = async () => {'''
assert target_effect in content, "target_effect not found"
content = content.replace(target_effect, replacement_effect, 1)

# 4. Add Top Action Bar button for Provision Account
target_topbtn = '''              <button
                type="button"
                onClick={() => {
                  setFormMode("add");
                  setFormFaculty(null);
                  setFormModalOpen(true);
                }}'''

replacement_topbtn = '''              {canManageAccounts && (
                <button
                  type="button"
                  onClick={() => {
                    setPreselectedProvisionStaff(null);
                    setProvisionModalOpen(true);
                  }}
                  className="inline-flex items-center space-x-1.5 px-3 py-2 text-xs font-semibold text-slate-800 bg-white hover:bg-slate-50 border border-slate-300 rounded-xl transition-colors shadow-2xs cursor-pointer"
                  title="Provision a login account for an institutional staff member"
                >
                  <Icon name="key" className="w-3.5 h-3.5 text-[#1657D9]" />
                  <span>Provision Account</span>
                </button>
              )}

              <button
                type="button"
                onClick={() => {
                  setFormMode("add");
                  setFormFaculty(null);
                  setFormModalOpen(true);
                }}'''
assert target_topbtn in content, "target_topbtn not found"
content = content.replace(target_topbtn, replacement_topbtn, 1)

# 5. Add Account Status pill in table row under designation
target_row_designation = '''                        <div className="text-[11px] text-slate-500">{fac.designation}</div>
                      </div>
                    </div>
                  </td>'''

replacement_row_designation = '''                        <div className="text-[11px] text-slate-500">{fac.designation}</div>
                        {fac.hasUserAccount ? (
                          <span className="inline-flex items-center gap-1 mt-0.5 px-1.5 py-0.2 rounded text-[10px] font-semibold bg-emerald-50 text-emerald-700 border border-emerald-200">
                            <span className="w-1 h-1 rounded-full bg-emerald-500"></span>
                            {fac.userAccountRole === "ACADEMIC_ADMIN" ? "HOD / Academic Admin" : fac.userAccountRole}
                          </span>
                        ) : (
                          <span className="inline-flex items-center gap-1 mt-0.5 px-1.5 py-0.2 rounded text-[10px] font-medium bg-slate-100 text-slate-500 border border-slate-200">
                            No Login Account
                          </span>
                        )}
                      </div>
                    </div>
                  </td>'''
assert target_row_designation in content, "target_row_designation not found"
content = content.replace(target_row_designation, replacement_row_designation, 1)

# 6. Add Provision Key button in Actions column
target_actions = '''                      <button
                        type="button"
                        onClick={() => setDetailFaculty(fac)}
                        className="w-7 h-7 rounded-lg flex items-center justify-center text-slate-500 hover:text-[#1657D9] hover:bg-blue-50 transition-colors"
                        title="View Academic Dossier"
                      >
                        <Icon name="eye" className="w-4 h-4" />
                      </button>'''

replacement_actions = '''                      <button
                        type="button"
                        onClick={() => setDetailFaculty(fac)}
                        className="w-7 h-7 rounded-lg flex items-center justify-center text-slate-500 hover:text-[#1657D9] hover:bg-blue-50 transition-colors"
                        title="View Academic Dossier"
                      >
                        <Icon name="eye" className="w-4 h-4" />
                      </button>
                      {canManageAccounts && !fac.hasUserAccount && (
                        <button
                          type="button"
                          onClick={() => {
                            setPreselectedProvisionStaff(fac);
                            setProvisionModalOpen(true);
                          }}
                          className="w-7 h-7 rounded-lg flex items-center justify-center text-slate-500 hover:text-[#1657D9] hover:bg-blue-50 transition-colors cursor-pointer"
                          title="Provision User Account"
                        >
                          <Icon name="key" className="w-4 h-4 text-[#1657D9]" />
                        </button>
                      )}'''
assert target_actions in content, "target_actions not found"
content = content.replace(target_actions, replacement_actions, 1)

# 7. Render StaffProvisionModal before closing div
target_modal = '''      {/* Prototype Data Reconciliation Modal */}'''
replacement_modal = '''      <StaffProvisionModal
        isOpen={provisionModalOpen}
        onClose={() => setProvisionModalOpen(false)}
        onSuccess={() => {
          showToast("Staff user account provisioned successfully.");
          loadData();
        }}
        preselectedStaff={preselectedProvisionStaff}
        allStaff={facultyList}
      />

      {/* Prototype Data Reconciliation Modal */}'''
assert target_modal in content, "target_modal not found"
content = content.replace(target_modal, replacement_modal, 1)

with open(r"G:\rpihm-campusos\src\components\modules\faculty\FacultyView.tsx", "w", encoding="utf-8") as f:
    f.write(content)
print("FacultyView.tsx patched successfully")
