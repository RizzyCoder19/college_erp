# -*- coding: utf-8 -*-
with open("src/components/dashboard/ExecutiveOverview.tsx", "r", encoding="utf-8") as f:
    content = f.read()

target_props = """  integrityAnomalies?: Array<{
    studentId: string;
    studentName: string;
    prn: string;
    description: string;
    anomalyType: string;
  }>;"""

replacement_props = """  integrityAnomalies?: Array<{
    enrolmentId: string;
    studentRoll: string;
    studentPrn: string;
    programmeCode: string;
    semesterNumber: number;
    divisionName: string;
    issueType: string;
    description: string;
  }>;"""

if target_props in content:
    content = content.replace(target_props, replacement_props, 1)

target_render = """                        <div className="flex items-center space-x-2">
                          <strong className="text-amber-950 font-semibold">{anom.studentName}</strong>
                          <span className="font-mono text-[10px] px-1.5 py-0.2 rounded bg-amber-200/60 text-amber-900">
                            PRN: {anom.prn}
                          </span>
                        </div>"""

replacement_render = """                        <div className="flex items-center space-x-2">
                          <strong className="text-amber-950 font-semibold">{anom.studentRoll}</strong>
                          <span className="font-mono text-[10px] px-1.5 py-0.5 rounded bg-amber-200/60 text-amber-900">
                            PRN: {anom.studentPrn}
                          </span>
                          <span className="text-[10px] text-amber-700 font-mono">
                            {anom.programmeCode} - Sem {anom.semesterNumber} ({anom.divisionName})
                          </span>
                        </div>"""

if target_render in content:
    content = content.replace(target_render, replacement_render, 1)

with open("src/components/dashboard/ExecutiveOverview.tsx", "w", encoding="utf-8") as f:
    f.write(content)

print("SUCCESS: Updated ExecutiveOverview.tsx types and render")
