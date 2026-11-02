const fs = require('fs');

let code = fs.readFileSync('src/components/auth/AnimatedLampLogin.tsx', 'utf8');

// 1. Add import for CinematicWelcomeTransition
code = code.replace(
  'import type { AuthenticatedUser } from "@/lib/auth/session";',
  'import type { AuthenticatedUser } from "@/lib/auth/session";\nimport { CinematicWelcomeTransition } from "./CinematicWelcomeTransition";'
);

// 2. Replace welcomeData state with welcomeUser state
code = code.replace(
  `  // Personalized post-login welcome transition
  const [isWelcoming, setIsWelcoming] = useState(false);
  const [welcomeData, setWelcomeData] = useState<WelcomeData | null>(null);`,
  `  // Post-login cinematic welcome transition user state
  const [welcomeUser, setWelcomeUser] = useState<AuthenticatedUser | null>(null);`
);

// 3. In handleSubmit, set welcomeUser
const oldSubmitTarget = `      // Calculate time greeting at the exact transition point
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
        const transitionDuration = prefersReducedMotion ? 1200 : 2000;

        setTimeout(() => {
          router.push("/");
          router.refresh();
        }, transitionDuration);
      } else {
        router.push("/");
        router.refresh();
      }`;

const newSubmitReplacement = `      if (res.data?.user) {
        setWelcomeUser(res.data.user);
      } else {
        router.push("/");
        router.refresh();
      }`;

code = code.replace(oldSubmitTarget, newSubmitReplacement);

// 4. Update return to wrap in #lamp-login-root and show CinematicWelcomeTransition
code = code.replace(
  `  return (
    <main
      className={\`room \${isOn ? "on" : ""}\`}
      ref={roomRef}
      data-theme={themeIndex >= 0 ? THEMES[themeIndex] : undefined}
    >`,
  `  return (
    <div id="lamp-login-root" className="relative w-full h-full min-h-screen overflow-hidden">
      {welcomeUser && (
        <CinematicWelcomeTransition
          user={welcomeUser}
          onComplete={() => {
            router.push("/");
            router.refresh();
          }}
        />
      )}

      <main
        className={\`room \${isOn ? "on" : ""}\`}
        ref={roomRef}
        data-theme={themeIndex >= 0 ? THEMES[themeIndex] : undefined}
      >`
);

// 5. Close the #lamp-login-root div before export end
code = code.replace(
  `      {/* Dynamic Toast Feedback Overlay */}
      <div className={\`feedback-toast \${toast.show ? "show" : ""} \${toast.type}\`} role="alert">
        {toast.text}
      </div>
    </main>
  );`,
  `      {/* Dynamic Toast Feedback Overlay */}
      <div className={\`feedback-toast \${toast.show ? "show" : ""} \${toast.type}\`} role="alert">
        {toast.text}
      </div>
    </main>
    </div>
  );`
);

// 6. In <section className="login-side">, remove the welcome-card block and keep only login-card
const oldLoginSide = `      {/* Glassmorphic Authentication Card or Personalized Welcome Screen */}
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
                    .map((n: string) => n[0])
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

const newLoginSide = `      {/* Glassmorphic Authentication Card */}
      <section className="login-side">
        <div className="login-card glass" ref={loginCardRef}>`;

code = code.replace(oldLoginSide, newLoginSide);

// Also remove the closing parenthesis/ternary from the end of login card
const oldEndCard = `            <div className="footer-links">
              <span>Authorized Personnel Only</span>
              <span className="dot">•</span>
              <span>Privacy Policy</span>
            </div>
          </div>
        )}
      </section>`;

const newEndCard = `            <div className="footer-links">
              <span>Authorized Personnel Only</span>
              <span className="dot">•</span>
              <span>Privacy Policy</span>
            </div>
          </div>
      </section>`;

code = code.replace(oldEndCard, newEndCard);

fs.writeFileSync('src/components/auth/AnimatedLampLogin.tsx', code, 'utf8');
console.log('Successfully updated AnimatedLampLogin.tsx');
