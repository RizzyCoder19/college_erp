# -*- coding: utf-8 -*-
with open(r"G:\rpihm-campusos\src\components\dashboard\ExecutiveOverview.tsx", "r", encoding="utf-8") as f:
    content = f.read()

target1 = """  currentUser?: {
    fullName: string;
    email: string;
    role: string;
  };"""

replacement1 = """  currentUser?: {
    fullName: string;
    email: string;
    role: string;
    designation?: string | null;
  };"""

assert target1 in content, "target1 not found"
content = content.replace(target1, replacement1, 1)

target2 = """            <div className="flex items-center space-x-2">
              <span className="text-xs font-semibold text-slate-600 bg-slate-100 px-3 py-1 rounded-lg border border-slate-200">
                Active Session: <strong className="text-slate-900">{currentUser?.role || "Authorized User"}</strong>
              </span>
            </div>"""

replacement2 = """            <div className="flex items-center space-x-2">
              <span className="text-xs font-semibold text-slate-600 bg-slate-100 px-3 py-1 rounded-lg border border-slate-200">
                Active Session:{" "}
                <strong className="text-slate-900">
                  {currentUser
                    ? `${currentUser.fullName} (${currentUser.role === "SYSTEM_ADMIN" ? "System Admin" : currentUser.role === "ACADEMIC_ADMIN" ? "Academic Admin" : currentUser.role})${currentUser.designation ? ` - ${currentUser.designation}` : ""}`
                    : "Authorized User"}
                </strong>
              </span>
            </div>"""

assert target2 in content, "target2 not found"
content = content.replace(target2, replacement2, 1)

with open(r"G:\rpihm-campusos\src\components\dashboard\ExecutiveOverview.tsx", "w", encoding="utf-8") as f:
    f.write(content)
print("ExecutiveOverview.tsx updated successfully")
