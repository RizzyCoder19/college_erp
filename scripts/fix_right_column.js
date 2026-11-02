const fs = require("fs");
let code = fs.readFileSync("src/components/modules/AcademicsView.tsx", "utf8");

const oldSectionRegex = /<div className="relative z-10 p-5 space-y-4 text-xs">[\s\S]*?{\/\* Quick Info Box \*\/}/;

const newSection = `<div className="relative z-10 p-5 space-y-4 text-xs">
              <div>
                <span className="text-[11px] font-bold text-slate-400 uppercase tracking-wider block mb-2">
                  Academic Departments ({departments.length})
                </span>
                <div className="space-y-2">
                  {departments.map((dept) => (
                    <div
                      key={dept.id}
                      className="p-2.5 rounded-xl bg-slate-50 border border-slate-200/80 flex items-center justify-between"
                    >
                      <div>
                        <span className="font-semibold text-xs text-slate-800 block">
                          {dept.name}
                        </span>
                        <span className="text-[10px] font-mono text-slate-400">
                          Code: {dept.code}
                        </span>
                      </div>
                      <div className="text-right">
                        <span className="text-xs font-bold text-[#1657D9] block">
                          {dept._count?.programmes ?? 0} {dept._count?.programmes === 1 ? "Programme" : "Programmes"}
                        </span>
                        <span className="text-[10px] text-slate-500 block">
                          {dept._count?.staff ?? 0} Faculty / Staff
                        </span>
                      </div>
                    </div>
                  ))}
                </div>
              </div>

              <div className="pt-3 border-t border-slate-100">
                <span className="text-[11px] font-bold text-slate-400 uppercase tracking-wider block mb-1">
                  Affiliation & Regulatory Framework
                </span>
                <p className="text-slate-600 leading-relaxed text-[11px]">
                  Affiliation and external regulatory details are not configured in the active database. Current records represent verified internal institutional curriculum offerings.
                </p>
              </div>

              <div className="pt-3 border-t border-slate-100">
                <span className="text-[11px] font-bold text-slate-400 uppercase tracking-wider block mb-2">
                  Curriculum Structure Invariants
                </span>
                <div className="space-y-2">
                  <div className="p-2.5 rounded-xl bg-slate-50 border border-slate-200 text-slate-700">
                    <span className="font-semibold text-xs block text-slate-800">Course Credits & Classification</span>
                    <span className="text-[11px] text-slate-500 block mt-0.5">Subjects define academic credit weightings and course types (Theory / Practical)</span>
                  </div>
                  <div className="p-2.5 rounded-xl bg-slate-50 border border-slate-200 text-slate-700">
                    <span className="font-semibold text-xs block text-slate-800">Faculty Contact Hours</span>
                    <span className="text-[11px] text-slate-500 block mt-0.5">Teaching assignments record weekly instructional contact hours per subject</span>
                  </div>
                </div>
              </div>
            </div>
          </div>

          {/* Quick Info Box */}`;

if (oldSectionRegex.test(code)) {
  code = code.replace(oldSectionRegex, newSection);
  console.log("-> Fixed right column tags cleanly");
} else {
  console.log("WARN: oldSectionRegex did not match");
}

// Update Quick Info Box header
code = code.replace(
  /<span>Academic Invariants \([^)]+\)<\/span>/,
  `<span>Academic Invariants ({currentAcademicYear ? \`AY \${currentAcademicYear.code}\` : "Current Session"})</span>`
);

fs.writeFileSync("src/components/modules/AcademicsView.tsx", code, "utf8");
console.log("Saved AcademicsView.tsx");
