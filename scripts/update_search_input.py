with open("src/components/modules/students/StudentsView.tsx", "r", encoding="utf-8") as f:
    content = f.read()

# Replace input with id="student-search-input"
target = """              <input
                type="text"
                placeholder="Search students by name, PRN, programme, email"""

# Find the exact placeholder line
idx = content.find('placeholder="Search students by name, PRN, programme, email')
if idx != -1:
    line_start = content.rfind("<input", 0, idx)
    line_end = content.find("/>", idx) + 2
    old_input = content[line_start:line_end]
    new_input = """<input
                id="student-search-input"
                type="text"
                placeholder="Search students by name, PRN, roll number, programme, email..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="w-full pl-9 pr-3.5 py-2 text-xs rounded-xl bg-white border border-slate-200 text-slate-900 placeholder:text-slate-400 focus:outline-none focus:ring-1 focus:ring-[#1657D9]"
              />"""
    content = content[:line_start] + new_input + content[line_end:]
    print("Replaced student search input")
else:
    print("Warning: search input placeholder not found")

with open("src/components/modules/students/StudentsView.tsx", "w", encoding="utf-8") as f:
    f.write(content)
print("Saved StudentsView.tsx")
