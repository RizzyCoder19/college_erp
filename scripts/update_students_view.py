# -*- coding: utf-8 -*-
with open("src/components/modules/students/StudentsView.tsx", "r", encoding="utf-8") as f:
    content = f.read()

target_1 = """      const selectedProgObj = programmes.find((p) => p.id === selectedProgramme);
      const matchesProgramme =
        selectedProgramme === "all" ||
        std.programmeId === selectedProgramme ||
        (Boolean(selectedProgObj) && selectedProgObj!.name.toLowerCase() === std.programmeName.toLowerCase());"""

replace_1 = """      const selectedProgObj = programmes.find((p) => p.id === selectedProgramme);
      const matchesProgramme =
        selectedProgramme === "all" ||
        std.programmeId === selectedProgramme ||
        (Boolean(selectedProgObj) && (
          selectedProgObj!.name.toLowerCase() === std.programmeName.toLowerCase() ||
          selectedProgObj!.code.toLowerCase() === std.programmeCode.toLowerCase()
        )) ||
        (selectedProgramme === "prog-ds" && (
          std.programmeName.toLowerCase().includes("data science") ||
          std.programmeId === "c010a20b-1eb1-4688-8cb4-ff807132142d"
        ));"""

if target_1 in content:
    content = content.replace(target_1, replace_1)
    print("Replaced target_1")
else:
    print("Warning: target_1 not found")

target_2 = """      const matchesSearch =
        searchQuery.trim() === "" ||
        updatedRecord.fullName.toLowerCase().includes(searchQuery.toLowerCase()) ||
        updatedRecord.prn.toLowerCase().includes(searchQuery.toLowerCase()) ||
        updatedRecord.programmeName.toLowerCase().includes(searchQuery.toLowerCase()) ||
        updatedRecord.email.toLowerCase().includes(searchQuery.toLowerCase());
      const matchesProg = selectedProgramme === "all" || updatedRecord.programmeId === selectedProgramme;"""

replace_2 = """      const matchesSearch =
        searchQuery.trim() === "" ||
        updatedRecord.fullName.toLowerCase().includes(searchQuery.toLowerCase()) ||
        updatedRecord.prn.toLowerCase().includes(searchQuery.toLowerCase()) ||
        (Boolean(updatedRecord.rollNumber) && updatedRecord.rollNumber!.toLowerCase().includes(searchQuery.toLowerCase())) ||
        updatedRecord.programmeName.toLowerCase().includes(searchQuery.toLowerCase()) ||
        updatedRecord.email.toLowerCase().includes(searchQuery.toLowerCase());
      const selectedProgObj = programmes.find((p) => p.id === selectedProgramme);
      const matchesProg =
        selectedProgramme === "all" ||
        updatedRecord.programmeId === selectedProgramme ||
        (Boolean(selectedProgObj) && (
          selectedProgObj!.name.toLowerCase() === updatedRecord.programmeName.toLowerCase() ||
          selectedProgObj!.code.toLowerCase() === updatedRecord.programmeCode.toLowerCase()
        )) ||
        (selectedProgramme === "prog-ds" && (
          updatedRecord.programmeName.toLowerCase().includes("data science") ||
          updatedRecord.programmeId === "c010a20b-1eb1-4688-8cb4-ff807132142d"
        ));"""

if target_2 in content:
    content = content.replace(target_2, replace_2)
    print("Replaced target_2")
else:
    print("Warning: target_2 not found")

target_3 = """              <select
                value={selectedProgramme}
                onChange={(e) => setSelectedProgramme(e.target.value)}
                className="w-full px-2.5 py-1.5 rounded-lg bg-white border border-slate-200 text-slate-800 focus:outline-none focus:ring-1 focus:ring-[#1657D9] cursor-pointer"
              >
                <option value="all">All Programmes</option>
                {ACADEMIC_PROGRAMMES.map((prog) => (
                  <option key={prog.id} value={prog.id}>
                    {prog.code} ({prog.name.slice(0, 24)}…)
                  </option>
                ))}
              </select>"""

replace_3 = """              <select
                id="student-programme-filter"
                value={selectedProgramme}
                onChange={(e) => setSelectedProgramme(e.target.value)}
                className="w-full px-2.5 py-1.5 rounded-lg bg-white border border-slate-200 text-slate-800 focus:outline-none focus:ring-1 focus:ring-[#1657D9] cursor-pointer"
              >
                <option value="all">All Programmes</option>
                {programmes && programmes.length > 0
                  ? programmes.map((prog) => (
                      <option key={prog.id} value={prog.id}>
                        {prog.code} ({prog.name.length > 24 ? `${prog.name.slice(0, 24)}...` : prog.name})
                      </option>
                    ))
                  : ACADEMIC_PROGRAMMES.map((prog) => (
                      <option key={prog.id} value={prog.id}>
                        {prog.code} ({prog.name.length > 24 ? `${prog.name.slice(0, 24)}...` : prog.name})
                      </option>
                    ))}
              </select>"""

if target_3 in content:
    content = content.replace(target_3, replace_3)
    print("Replaced target_3")
else:
    # Try finding with any ellipsis
    for opt in ["\u2026", "…"]:
        t = target_3.replace("…", opt)
        if t in content:
            content = content.replace(t, replace_3)
            print(f"Replaced target_3 with {opt}")
            break
    else:
        print("Warning: target_3 not found")

with open("src/components/modules/students/StudentsView.tsx", "w", encoding="utf-8") as f:
    f.write(content)
print("Successfully saved StudentsView.tsx")
