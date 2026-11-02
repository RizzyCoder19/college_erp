const fs = require('fs');

let comp = fs.readFileSync('src/components/dashboard/ExecutiveOverview.tsx', 'utf8');

// 1. Update ExecutiveOverviewProps
comp = comp.replace(
  `  currentUser?: {
    fullName: string;
    email: string;
    role: string;
    designation?: string | null;
  };`,
  `  currentUser?: {
    fullName: string;
    email: string;
    role: string;
    designation?: string | null;
    isFirstLogin?: boolean;
  };`
);

// 2. Add timeGreeting state inside ExecutiveOverview
comp = comp.replace(
  `export const ExecutiveOverview: React.FC<ExecutiveOverviewProps> = ({
  initialMetrics,
  integrityAnomalies,
  currentUser,
}) => {`,
  `export const ExecutiveOverview: React.FC<ExecutiveOverviewProps> = ({
  initialMetrics,
  integrityAnomalies,
  currentUser,
}) => {
  const [timeGreeting, setTimeGreeting] = React.useState("Good day");
  React.useEffect(() => {
    const hour = new Date().getHours();
    if (hour >= 5 && hour < 12) {
      setTimeGreeting("Good morning");
    } else if (hour >= 12 && hour < 17) {
      setTimeGreeting("Good afternoon");
    } else {
      setTimeGreeting("Good evening");
    }
  }, []);`
);

// 3. Update Banner Content
const oldBanner = `              <div>
                <div className="flex items-center space-x-2 text-xs font-bold text-[#D92534] tracking-wider uppercase">
                  <span className="w-5 h-[2.5px] bg-[#D92534]"></span>
                  <span>WELCOME TO</span>
                </div>

                <h1 className="text-3xl sm:text-4xl font-extrabold tracking-tight text-[#0F172A] mt-1 font-serif">
                  RPIHM <span className="text-[#D92534]">CampusOS</span>
                </h1>

                <h2 className="text-base sm:text-lg font-bold text-slate-800 mt-1">
                  R. P. Institute of Hospitality & Management, Vasai
                </h2>

                <p className="text-sm text-slate-600 mt-2 max-w-xl leading-relaxed">
                  A unified academic and administrative platform for a smarter, well-connected campus experience.
                </p>
              </div>`;

const newBanner = `              <div>
                <div className="flex items-center space-x-2 text-xs font-bold text-[#D92534] tracking-wider uppercase">
                  <span className="w-5 h-[2.5px] bg-[#D92534]"></span>
                  <span>{currentUser?.isFirstLogin ? "WELCOME TO CAMPUSOS" : "WELCOME BACK"}</span>
                </div>

                <h1 className="text-3xl sm:text-4xl font-extrabold tracking-tight text-[#0F172A] mt-1 font-serif">
                  {currentUser?.isFirstLogin ? (
                    <>Welcome to <span className="text-[#D92534]">CampusOS</span>, {currentUser.fullName}</>
                  ) : (
                    <>{timeGreeting}, <span className="text-[#D92534]">{currentUser?.fullName || "Administrator"}</span></>
                  )}
                </h1>

                <h2 className="text-base sm:text-lg font-bold text-slate-800 mt-1 flex items-center gap-2">
                  <span>R. P. Institute of Hospitality & Management, Vasai</span>
                  {currentUser?.designation && (
                    <span className="text-xs px-2.5 py-0.5 rounded-full bg-slate-100 text-slate-700 border border-slate-200 font-medium">
                      {currentUser.designation}
                    </span>
                  )}
                </h2>

                <p className="text-sm text-slate-600 mt-2 max-w-xl leading-relaxed">
                  {currentUser?.isFirstLogin
                    ? "Your institutional workspace has been initialized for Academic Year 2026–27. Explore the academic and operations switchboard below."
                    : "Active session verified. Real-time institutional status across curriculum, faculty assignments, and student cohorts."}
                </p>
              </div>`;

comp = comp.replace(oldBanner, newBanner);

fs.writeFileSync('src/components/dashboard/ExecutiveOverview.tsx', comp, 'utf8');
console.log('Successfully updated ExecutiveOverview.tsx');
