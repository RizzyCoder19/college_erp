with open("src/components/modules/students/StudentsView.tsx", "r", encoding="utf-8") as f:
    code = f.read()

# 1. Update matchesSearch in filteredStudents
old_search = """      const matchesSearch =
        searchQuery.trim() === "" ||
        std.fullName.toLowerCase().includes(searchQuery.toLowerCase()) ||
        std.prn.toLowerCase().includes(searchQuery.toLowerCase()) ||
        std.programmeName.toLowerCase().includes(searchQuery.toLowerCase()) ||
        std.email.toLowerCase().includes(searchQuery.toLowerCase());"""

new_search = """      const matchesSearch =
        searchQuery.trim() === "" ||
        std.fullName.toLowerCase().includes(searchQuery.toLowerCase()) ||
        std.prn.toLowerCase().includes(searchQuery.toLowerCase()) ||
        (Boolean(std.rollNumber) && std.rollNumber!.toLowerCase().includes(searchQuery.toLowerCase())) ||
        std.programmeName.toLowerCase().includes(searchQuery.toLowerCase()) ||
        std.email.toLowerCase().includes(searchQuery.toLowerCase());"""

code = code.replace(old_search, new_search)

# 2. Update matchesProgramme in filteredStudents
old_prog_match = """      const matchesProgramme =
        selectedProgramme === "all" || std.programmeId === selectedProgramme;"""

new_prog_match = """      const selectedProgObj = programmes.find((p) => p.id === selectedProgramme);
      const matchesProgramme =
        selectedProgramme === "all" ||
        std.programmeId === selectedProgramme ||
        (Boolean(selectedProgObj) && selectedProgObj!.name.toLowerCase() === std.programmeName.toLowerCase());"""

code = code.replace(old_prog_match, new_prog_match)

# 3. Update Programme <select> options to use live programmes
old_select_opts = """                <option value="all">All Programmes</option>
                {ACADEMIC_PROGRAMMES.map((prog) => (
                  <option key={prog.id} value={prog.id}>
                    {prog.code} ({prog.name.slice(0, 24)}?)
                  </option>
                ))}"""

new_select_opts = """                <option value="all">All Programmes</option>
                {(programmes && programmes.length > 0 ? programmes : ACADEMIC_PROGRAMMES).map((prog) => (
                  <option key={prog.id} value={prog.id}>
                    {prog.code} ({prog.name.length > 24 ? prog.name.slice(0, 24) + "?" : prog.name})
                  </option>
                ))}"""

code = code.replace(old_select_opts, new_select_opts)

# 4. Update PRN / Roll column in table
old_td = """                  <td className="py-3.5 px-4 font-mono font-bold text-xs text-[#1657D9]">
                    {std.prn}
                  </td>"""

new_td = """                  <td className="py-3.5 px-4 font-mono font-bold text-xs text-[#1657D9]">
                    <div>{std.prn}</div>
                    {std.rollNumber && std.rollNumber !== std.prn && (
                      <div className="font-mono font-normal text-[10px] text-slate-400 mt-0.5">
                        {std.rollNumber}
                      </div>
                    )}
                  </td>"""

code = code.replace(old_td, new_td)

with open("src/components/modules/students/StudentsView.tsx", "w", encoding="utf-8") as f:
    f.write(code)

print("Updated StudentsView.tsx successfully")
