const fs = require('fs');

let code = fs.readFileSync('src/components/auth/AnimatedLampLogin.tsx', 'utf8').replace(/\r\n/g, '\n');

// 1. Replace InstituteCrest import with Image and AuthenticatedUser
code = code.replace(
  'import { InstituteCrest } from "@/components/brand/InstituteCrest";',
  'import Image from "next/image";\nimport type { AuthenticatedUser } from "@/lib/actions/auth";'
);

// 2. THEMES & WelcomeData interface (already applied or ensure clean)
if (!code.includes('interface WelcomeData')) {
  code = code.replace(
    'const THEMES = ["warm", "cyber", "sunset", "aurora", "violet"];',
    'const THEMES = ["warm", "cyber", "violet"];\n\ninterface WelcomeData {\n  user: AuthenticatedUser;\n  greeting: string;\n}'
  );
}

// 3. State initialization: unlit lamp, themeIndex -1, welcomeData
const oldStates = `  // Lamp state
  const [isOn, setIsOn] = useState(true);
  const [themeIndex, setThemeIndex] = useState(0); // 0 = warm default`;

const newStates = `  const [isShaking, setIsShaking] = useState(false);

  // Lamp state (Initially unlit as authored in original source)
  const [isOn, setIsOn] = useState(false);
  const [themeIndex, setThemeIndex] = useState(-1); // -1 = OFF

  // Personalized post-login welcome transition
  const [isWelcoming, setIsWelcoming] = useState(false);
  const [welcomeData, setWelcomeData] = useState<WelcomeData | null>(null);`;

console.log('Match oldStates:', code.includes(oldStates));
code = code.replace(oldStates, newStates);

// 4. handleSubmit: Welcome transition logic
const oldSubmit = `      playSound("success");
      showToast("Welcome back! Access granted. Redirecting to CampusOS...", "success");

      setTimeout(() => {
        router.push("/");
        router.refresh();
      }, 700);`;

const newSubmit = `      playSound("success");

      // Calculate time greeting at the exact transition point
      const hour = new Date().getHours();
      let greeting = "Good evening";
      if (hour >= 5 && hour < 12) {
        greeting = "Good morning";
      } else if (hour >= 12 && hour < 17) {
        greeting = "Good afternoon";
      }

      if (res.data?.user) {
        setWelcomeData({
          user: res.data.user,
          greeting,
        });
        setIsWelcoming(true);

        const prefersReducedMotion = typeof window !== "undefined" && window.matchMedia("(prefers-reduced-motion: reduce)").matches;
        const transitionDuration = prefersReducedMotion ? 400 : 1800;

        setTimeout(() => {
          router.push("/");
          router.refresh();
        }, transitionDuration);
      } else {
        router.push("/");
        router.refresh();
      }`;

console.log('Match oldSubmit:', code.includes(oldSubmit));
code = code.replace(oldSubmit, newSubmit);

// 5. Replace makeshift crest in header with authoritative branding
const oldHeader = `        <div style={{ display: "flex", alignItems: "center", gap: "12px", opacity: 0.9 }}>
          <InstituteCrest size={34} />
          <div style={{ display: "flex", flexDirection: "column" }}>
            <span style={{ fontSize: "12px", fontWeight: 700, color: "#fff", letterSpacing: "0.02em" }}>
              R. P. Institute of Hospitality & Management
            </span>
            <span style={{ fontSize: "10px", color: "#8b949e" }}>
              CampusOS ERP ? Secure Institutional Access
            </span>
          </div>
        </div>`;

const newHeader = `        <div className="top-brand">
          <Image
            src="/images/rpihm-logo-transparent.webp"
            alt="R. P. Institute of Hospitality & Management"
            width={170}
            height={42}
            className="top-brand-logo"
            priority
          />
          <div className="top-brand-text hidden sm:flex">
            <div className="top-brand-title-row">
              <span className="top-brand-title">CampusOS</span>
              <span className="top-brand-badge">ERP</span>
            </div>
            <span className="top-brand-sub">Academic & Administrative ERP</span>
          </div>
        </div>`;

console.log('Match oldHeader:', code.includes(oldHeader));
code = code.replace(oldHeader, newHeader);

// 6. Add pull-hint inside lamp-container
const oldHandle = `          {/* Pull Switch Handle Bead */}
          <div
            className="string-handle"`;

const newHandle = `          {/* Hint badge showing how to turn on the lamp (hidden when lamp is on) */}
          <div className="pull-hint" aria-hidden="true">
            <span>💡 Pull cord to turn on</span>
          </div>

          {/* Pull Switch Handle Bead */}
          <div
            className="string-handle"`;

console.log('Match oldHandle:', code.includes(oldHandle));
code = code.replace(oldHandle, newHandle);

// 7. Right column: Welcome card conditional rendering
const oldSection = `      {/* Glassmorphic Authentication Card */}
      <section className="login-side">
        <div className="login-card glass" ref={loginCardRef}>`;

const newSection = `      {/* Glassmorphic Authentication Card or Personalized Welcome Screen */}
      <section className="login-side">
        {isWelcoming && welcomeData ? (
          <div className="welcome-card glass" id="welcomeCard">
            <div className="card-glow-overlay" style={{ opacity: 0.45 }}></div>
            <div className="glass-line"></div>

            {/* Authoritative Institution Header */}
            <div className="welcome-brand-header">
              <Image
                src="/images/rpihm-logo-transparent.webp"
                alt="R. P. Institute of Hospitality & Management"
                width={190}
                height={48}
                className="h-10 w-auto object-contain filter drop-shadow-md mx-auto"
                priority
              />
              <div className="flex items-center justify-center gap-1.5 mt-2.5">
                <span className="text-sm font-bold text-white tracking-tight">CampusOS</span>
                <span className="text-[10px] font-semibold px-1.5 py-0.5 rounded bg-blue-500/20 text-blue-300 border border-blue-400/30">
                  ERP
                </span>
              </div>
              <p className="text-[11px] text-slate-400 font-medium text-center mt-0.5">
                R. P. Institute of Hospitality & Management
              </p>
            </div>

            {/* Personalized User Greeting */}
            <div className="welcome-greeting-section">
              <div className="welcome-avatar-circle">
                <span className="welcome-initials">
                  {welcomeData.user.fullName
                    .split(" ")
                    .map((n) => n[0])
                    .join("")
                    .toUpperCase()
                    .slice(0, 2)}
                </span>
              </div>
              <h2 className="welcome-title">
                {welcomeData.greeting}, <span className="welcome-name">{welcomeData.user.fullName}</span>
              </h2>
              <div className="welcome-role-pill">
                <span>
                  {welcomeData.user.designation ||
                    (welcomeData.user.role === "SYSTEM_ADMIN" ? "System Administrator" : welcomeData.user.role)}
                </span>
                {welcomeData.user.departmentName && (
                  <span className="welcome-dept">• Dept. of {welcomeData.user.departmentName}</span>
                )}
              </div>
              <p className="welcome-status-text">
                Session verified • Initializing your institutional workspace...
              </p>
            </div>

            {/* Luminous Progress Indicator */}
            <div className="welcome-progress-track">
              <div className="welcome-progress-bar"></div>
            </div>

            <div className="welcome-footer-note">
              <span>Secure Session Active</span>
              <span className="welcome-dot">•</span>
              <span>CampusOS v0.1.0</span>
            </div>
          </div>
        ) : (
          <div className="login-card glass" ref={loginCardRef}>`;

console.log('Match oldSection:', code.includes(oldSection));
code = code.replace(oldSection, newSection);

// Close parenthesis for the ternary operator before closing section
const oldClosing = `          {/* Feedback Toast Notification */}
          <div className={\`feedback-toast \${toast.type} \${toast.show ? "show" : ""}\`}>
            <span className="toast-icon">{toast.type === "success" ? "✨" : "⚠️"}</span>
            <span className="toast-text">{toast.text}</span>
          </div>
        </div>
      </section>`;

const newClosing = `          {/* Feedback Toast Notification */}
          <div className={\`feedback-toast \${toast.type} \${toast.show ? "show" : ""}\`}>
            <span className="toast-icon">{toast.type === "success" ? "✨" : "⚠️"}</span>
            <span className="toast-text">{toast.text}</span>
          </div>
        </div>
        )}
      </section>`;

console.log('Match oldClosing:', code.includes(oldClosing));
code = code.replace(oldClosing, newClosing);

fs.writeFileSync('src/components/auth/AnimatedLampLogin.tsx', code, 'utf8');
console.log('Finished updating AnimatedLampLogin.tsx');
