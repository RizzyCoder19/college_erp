with open("src/components/dashboard/ExecutiveOverview.tsx", "r", encoding="utf-8") as f:
    content = f.read()

target_props = """export interface ExecutiveOverviewProps {
  initialMetrics?: {
    studentCount: number;
    staffCount: number;
    programmeCount: number;
    divisionCount: number;
  };
}

export const ExecutiveOverview: React.FC<ExecutiveOverviewProps> = ({ initialMetrics }) => {"""

replacement_props = """export interface ExecutiveOverviewProps {
  initialMetrics?: {
    studentCount: number;
    staffCount: number;
    programmeCount: number;
    divisionCount: number;
  };
  integrityAnomalies?: Array<{
    studentId: string;
    studentName: string;
    prn: string;
    description: string;
    anomalyType: string;
  }>;
  currentUser?: {
    fullName: string;
    email: string;
    role: string;
  };
}

export const ExecutiveOverview: React.FC<ExecutiveOverviewProps> = ({
  initialMetrics,
  integrityAnomalies,
  currentUser,
}) => {"""

if target_props in content:
    content = content.replace(target_props, replacement_props, 1)

target_insert = """      {/* 2. Concise Row of Readable Summary Metrics with Camouflage Hover Zoom */}
      <AnimatedReveal delay={100}>
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
          {summaryMetrics.map((metric, idx) => (
            <div
              key={metric.id}
              style={{ transitionDelay: `${idx * 60}ms` }}
              className="relative overflow-hidden rounded-2xl bg-white p-5 border border-slate-200/90 shadow-xs hover:border-[#1657D9]/40 hover:shadow-md transition-all flex flex-col justify-between group"
            >
              {/* Subtle campus camouflage backdrop with hover zoom */}
              <div className="absolute inset-0 z-0 opacity-0 group-hover:opacity-[0.07] transition-opacity duration-500 overflow-hidden pointer-events-none">
                <Image
                  src="/images/campus-illuminated-sign.png"
                  alt=""
                  fill
                  sizes="300px"
                  className="object-cover transition-transform duration-700 ease-out group-hover:scale-115"
                />
              </div>

              <div className="relative z-10 flex items-start justify-between">
                <div>
                  <div className="flex items-center space-x-1.5">
                    <span className="text-xs font-semibold text-slate-500 block">
                      {metric.label}
                    </span>
                    <span className="inline-flex items-center px-1.5 py-0.5 rounded text-[9px] font-bold bg-emerald-50 text-emerald-700 border border-emerald-200/60">
                      Live DB
                    </span>
                  </div>
                  <div className="mt-2 text-2xl sm:text-3xl font-extrabold text-[#0F172A] tracking-tight">
                    {metric.value}
                  </div>
                </div>

                <div className="p-2.5 rounded-xl bg-blue-50 text-[#1657D9] border border-blue-100 group-hover:bg-[#1657D9] group-hover:text-white transition-colors">
                  <Icon name={metric.icon} className="h-5 w-5" />
                </div>
              </div>

              <div className="relative z-10 mt-3 pt-2.5 border-t border-slate-100 text-xs text-slate-500">
                {metric.caption}
              </div>
            </div>
          ))}
        </div>
      </AnimatedReveal>"""

replacement_insert = target_insert + """

      {/* 2.5 Daily Operations & Academic Integrity Monitor Card */}
      <AnimatedReveal delay={150}>
        <div className="rounded-2xl bg-white border border-slate-200/90 shadow-xs p-5 relative overflow-hidden group">
          <div className="flex flex-col md:flex-row items-start md:items-center justify-between gap-4 pb-4 border-b border-slate-100">
            <div className="flex items-center space-x-3">
              <div className="p-2.5 rounded-xl bg-blue-50 text-[#1657D9] border border-blue-100">
                <Icon name="shield-check" className="h-5 w-5" />
              </div>
              <div>
                <div className="flex items-center space-x-2">
                  <h3 className="text-sm font-bold text-slate-900 font-serif">
                    Daily Administrative Operations & Integrity Monitor
                  </h3>
                  <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-emerald-50 text-emerald-700 border border-emerald-200">
                    Active System
                  </span>
                </div>
                <p className="text-xs text-slate-500 mt-0.5">
                  Real-time database integrity audit, role authorizations, and operational navigation shortcuts
                </p>
              </div>
            </div>

            <div className="flex items-center space-x-2">
              <span className="text-xs font-semibold text-slate-600 bg-slate-100 px-3 py-1 rounded-lg border border-slate-200">
                Active Session: <strong className="text-slate-900">{currentUser?.role || "Authorized User"}</strong>
              </span>
            </div>
          </div>

          <div className="grid grid-cols-1 lg:grid-cols-12 gap-4 mt-4">
            {/* Left: Integrity Exceptions / Status */}
            <div className="lg:col-span-7 space-y-2">
              <span className="text-[11px] font-bold uppercase tracking-wider text-slate-400 block mb-1">
                Academic Placement Consistency Audit
              </span>

              {integrityAnomalies && integrityAnomalies.length > 0 ? (
                integrityAnomalies.map((anom, idx) => (
                  <div
                    key={idx}
                    className="p-3.5 rounded-xl bg-amber-50/70 border border-amber-200 text-xs flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3"
                  >
                    <div className="flex items-start space-x-2.5">
                      <span className="w-2 h-2 rounded-full bg-amber-500 mt-1 shrink-0"></span>
                      <div>
                        <div className="flex items-center space-x-2">
                          <strong className="text-amber-950 font-semibold">{anom.studentName}</strong>
                          <span className="font-mono text-[10px] px-1.5 py-0.2 rounded bg-amber-200/60 text-amber-900">
                            PRN: {anom.prn}
                          </span>
                        </div>
                        <p className="text-amber-800 text-[11px] mt-0.5">{anom.description}</p>
                      </div>
                    </div>
                    <Link
                      href="/modules/students"
                      className="inline-flex items-center space-x-1 px-3 py-1.5 rounded-lg bg-amber-600 hover:bg-amber-700 text-white font-semibold text-[11px] shadow-2xs transition-colors shrink-0"
                    >
                      <span>Review in Roster</span>
                      <Icon name="arrow-right" className="h-3 w-3" />
                    </Link>
                  </div>
                ))
              ) : (
                <div className="p-3.5 rounded-xl bg-emerald-50/60 border border-emerald-200 text-xs text-emerald-800 flex items-center space-x-2">
                  <span className="w-2 h-2 rounded-full bg-emerald-500"></span>
                  <span>All active student enrolments conform to configured institutional placement hierarchies.</span>
                </div>
              )}
            </div>

            {/* Right: Operational Shortcuts */}
            <div className="lg:col-span-5 space-y-2">
              <span className="text-[11px] font-bold uppercase tracking-wider text-slate-400 block mb-1">
                Authorized Quick Workflows
              </span>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                <Link
                  href="/modules/students"
                  className="p-3 rounded-xl bg-slate-50 hover:bg-blue-50/60 border border-slate-200 hover:border-blue-200 transition-all group flex items-center space-x-2.5"
                >
                  <div className="p-2 rounded-lg bg-white text-[#1657D9] shadow-2xs group-hover:bg-[#1657D9] group-hover:text-white transition-colors">
                    <Icon name="users" className="h-4 w-4" />
                  </div>
                  <div>
                    <span className="text-xs font-bold text-slate-800 group-hover:text-[#1657D9] block">
                      Student Dossiers
                    </span>
                    <span className="text-[10px] text-slate-400 block">Manage & verify enrolments</span>
                  </div>
                </Link>

                <Link
                  href="/modules/faculty"
                  className="p-3 rounded-xl bg-slate-50 hover:bg-blue-50/60 border border-slate-200 hover:border-blue-200 transition-all group flex items-center space-x-2.5"
                >
                  <div className="p-2 rounded-lg bg-white text-[#1657D9] shadow-2xs group-hover:bg-[#1657D9] group-hover:text-white transition-colors">
                    <Icon name="briefcase" className="h-4 w-4" />
                  </div>
                  <div>
                    <span className="text-xs font-bold text-slate-800 group-hover:text-[#1657D9] block">
                      Faculty Directory
                    </span>
                    <span className="text-[10px] text-slate-400 block">Staff & teaching assignments</span>
                  </div>
                </Link>

                <Link
                  href="/modules/academics"
                  className="p-3 rounded-xl bg-slate-50 hover:bg-blue-50/60 border border-slate-200 hover:border-blue-200 transition-all group flex items-center space-x-2.5 sm:col-span-2"
                >
                  <div className="p-2 rounded-lg bg-white text-[#1657D9] shadow-2xs group-hover:bg-[#1657D9] group-hover:text-white transition-colors">
                    <Icon name="academic-cap" className="h-4 w-4" />
                  </div>
                  <div>
                    <span className="text-xs font-bold text-slate-800 group-hover:text-[#1657D9] block">
                      Academic Programmes Console
                    </span>
                    <span className="text-[10px] text-slate-400 block">7 programmes, semesters, cohorts & curriculum</span>
                  </div>
                </Link>
              </div>
            </div>
          </div>
        </div>
      </AnimatedReveal>"""

if target_insert in content:
    content = content.replace(target_insert, replacement_insert, 1)

with open("src/components/dashboard/ExecutiveOverview.tsx", "w", encoding="utf-8") as f:
    f.write(content)

print("SUCCESS: Updated ExecutiveOverview.tsx with daily operations and integrity monitor")
