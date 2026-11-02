with open("src/components/layout/TopBar.tsx", "r", encoding="utf-8") as f:
    content = f.read()

target = """            <div className="w-9 h-9 rounded-full bg-[#0B1528] text-white font-bold text-xs flex items-center justify-center shadow-xs border border-slate-200">
              KS
            </div>"""

replacement = """            <div className="w-9 h-9 rounded-full bg-[#0B1528] text-white font-bold text-xs flex items-center justify-center shadow-xs border border-slate-200">
              {currentUser
                ? currentUser.fullName
                    .split(" ")
                    .filter(Boolean)
                    .map((n) => n[0])
                    .slice(0, 2)
                    .join("")
                    .toUpperCase()
                : "KS"}
            </div>"""

if target in content:
    content = content.replace(target, replacement)
    with open("src/components/layout/TopBar.tsx", "w", encoding="utf-8") as f:
        f.write(content)
    print("SUCCESS: Updated TopBar.tsx initials")
else:
    print("ERROR: Target block not found in TopBar.tsx")
