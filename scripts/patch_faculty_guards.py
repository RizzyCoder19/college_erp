# -*- coding: utf-8 -*-
with open(r"G:\rpihm-campusos\src\components\modules\faculty\FacultyView.tsx", "r", encoding="utf-8") as f:
    content = f.read()

# 1. Desktop table edit & delete buttons
target_table = """                      <button
                        type="button"
                        onClick={() => {
                          setFormMode("edit");
                          setFormFaculty(fac);
                          setFormModalOpen(true);
                        }}
                        className="w-7 h-7 rounded-lg flex items-center justify-center text-slate-500 hover:text-amber-600 hover:bg-amber-50 transition-colors"
                        title="Edit Record"
                      >
                        <Icon name="pencil" className="w-4 h-4" />
                      </button>
                      <button
                        type="button"
                        onClick={() => setDeleteFaculty(fac)}
                        className="w-7 h-7 rounded-lg flex items-center justify-center text-slate-500 hover:text-red-600 hover:bg-red-50 transition-colors"
                        title="Delete Record"
                      >
                        <Icon name="trash" className="w-4 h-4" />
                      </button>"""

replacement_table = """                      {canWrite && (
                        <button
                          type="button"
                          onClick={() => {
                            setFormMode("edit");
                            setFormFaculty(fac);
                            setFormModalOpen(true);
                          }}
                          className="w-7 h-7 rounded-lg flex items-center justify-center text-slate-500 hover:text-amber-600 hover:bg-amber-50 transition-colors"
                          title="Edit Record"
                        >
                          <Icon name="pencil" className="w-4 h-4" />
                        </button>
                      )}
                      {canDelete && (
                        <button
                          type="button"
                          onClick={() => setDeleteFaculty(fac)}
                          className="w-7 h-7 rounded-lg flex items-center justify-center text-slate-500 hover:text-red-600 hover:bg-red-50 transition-colors"
                          title="Delete Record"
                        >
                          <Icon name="trash" className="w-4 h-4" />
                        </button>
                      )}"""

assert target_table in content, "target_table not found"
content = content.replace(target_table, replacement_table, 1)

# 2. Mobile card edit & delete buttons
target_mobile = """                <button
                  type="button"
                  onClick={() => {
                    setFormMode("edit");
                    setFormFaculty(fac);
                    setFormModalOpen(true);
                  }}
                  className="p-1 text-slate-500 hover:text-amber-600"
                  title="Edit"
                >
                  <Icon name="pencil" className="w-4 h-4" />
                </button>
                <button
                  type="button"
                  onClick={() => setDeleteFaculty(fac)}
                  className="p-1 text-slate-500 hover:text-red-600"
                  title="Delete"
                >
                  <Icon name="trash" className="w-4 h-4" />
                </button>"""

replacement_mobile = """                {canWrite && (
                  <button
                    type="button"
                    onClick={() => {
                      setFormMode("edit");
                      setFormFaculty(fac);
                      setFormModalOpen(true);
                    }}
                    className="p-1 text-slate-500 hover:text-amber-600"
                    title="Edit"
                  >
                    <Icon name="pencil" className="w-4 h-4" />
                  </button>
                )}
                {canDelete && (
                  <button
                    type="button"
                    onClick={() => setDeleteFaculty(fac)}
                    className="p-1 text-slate-500 hover:text-red-600"
                    title="Delete"
                  >
                    <Icon name="trash" className="w-4 h-4" />
                  </button>
                )}"""

assert target_mobile in content, "target_mobile not found"
content = content.replace(target_mobile, replacement_mobile, 1)

# 3. Add staff button in top bar
target_add = """              <button
                type="button"
                onClick={() => {
                  setFormMode("add");
                  setFormFaculty(null);
                  setFormModalOpen(true);
                }}
                className="inline-flex items-center space-x-1.5 px-4 py-2 text-xs font-semibold text-white bg-[#1657D9] hover:bg-blue-700 rounded-xl transition-colors shadow-sm"
              >
                <Icon name="plus" className="w-3.5 h-3.5" />
                <span>Add Staff Member</span>
              </button>"""

replacement_add = """              {canWrite && (
                <button
                  type="button"
                  onClick={() => {
                    setFormMode("add");
                    setFormFaculty(null);
                    setFormModalOpen(true);
                  }}
                  className="inline-flex items-center space-x-1.5 px-4 py-2 text-xs font-semibold text-white bg-[#1657D9] hover:bg-blue-700 rounded-xl transition-colors shadow-sm"
                >
                  <Icon name="plus" className="w-3.5 h-3.5" />
                  <span>Add Staff Member</span>
                </button>
              )}"""

assert target_add in content, "target_add not found"
content = content.replace(target_add, replacement_add, 1)

with open(r"G:\rpihm-campusos\src\components\modules\faculty\FacultyView.tsx", "w", encoding="utf-8") as f:
    f.write(content)
print("FacultyView.tsx action guards applied successfully")
