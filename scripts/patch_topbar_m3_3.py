with open(r"G:\rpihm-campusos\src\components\layout\TopBar.tsx", "r", encoding="utf-8") as f:
    content = f.read()

# Remove import { FICTIONAL_USER }
content = content.replace('import { FICTIONAL_USER } from "@/data/mockData";\n', '')
content = content.replace('import { FICTIONAL_USER } from "@/data/mockData";', '')

target = """: "KS"}
            </div>
            <div className="hidden xl:block">
              <div className="text-[13px] font-bold text-slate-800 leading-tight">
                {currentUser ? currentUser.fullName : FICTIONAL_USER.name}
              </div>
              <div className="text-[11px] text-slate-400 font-medium">
                {currentUser ? `Authorized (${currentUser.role})` : FICTIONAL_USER.designation}
              </div>"""

replacement = """: "GU"}
            </div>
            <div className="hidden xl:block">
              <div className="text-[13px] font-bold text-slate-800 leading-tight">
                {currentUser ? currentUser.fullName : "Guest Session"}
              </div>
              <div className="text-[11px] text-slate-400 font-medium">
                {currentUser
                  ? currentUser.designation || (currentUser.role === "SYSTEM_ADMIN" ? "System Administrator" : currentUser.role === "ACADEMIC_ADMIN" ? "Academic Administrator" : "Institutional User")
                  : "Unauthenticated"}
              </div>"""

assert target in content, "target not found in TopBar.tsx"
content = content.replace(target, replacement, 1)

with open(r"G:\rpihm-campusos\src\components\layout\TopBar.tsx", "w", encoding="utf-8") as f:
    f.write(content)
print("TopBar.tsx updated successfully")
