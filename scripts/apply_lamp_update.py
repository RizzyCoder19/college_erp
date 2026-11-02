import sys

# 1. Update AnimatedLampLogin.tsx
with open("src/components/auth/AnimatedLampLogin.tsx", "r", encoding="utf-8") as f:
    c = f.read()

# Add mobilePhase state
old_state = 'const [isOn, setIsOn] = useState(false);\n  const [themeIndex, setThemeIndex] = useState(-1); // -1 = OFF'
new_state = '''const [isOn, setIsOn] = useState(false);
  const [themeIndex, setThemeIndex] = useState(-1); // -1 = OFF
  const [mobilePhase, setMobilePhase] = useState<"unlit" | "revealing" | "form-only">("unlit");'''

if old_state in c:
    c = c.replace(old_state, new_state)
    print("Added mobilePhase state")
else:
    print("Warning: old_state not found in AnimatedLampLogin.tsx")

# Update triggerPullAction to cycle themes and advance mobile phase
old_trigger = '''  const triggerPullAction = useCallback(() => {
    setThemeIndex((prevIdx) => {
      const nextIdx = (prevIdx + 1) % (THEMES.length + 1);

      if (nextIdx === THEMES.length) {
        // Turn OFF
        setIsOn(false);
        playSound("switch");
        return -1;
      } else {
        setIsOn(true);
        playSound("switch");
        return nextIdx;
      }
    });
  }, [playSound]);'''

new_trigger = '''  const triggerPullAction = useCallback(() => {
    setThemeIndex((prevIdx) => {
      const nextIdx = (prevIdx + 1) % (THEMES.length + 1);

      if (nextIdx === THEMES.length) {
        // Turn OFF after cycling through themes (warm -> cyber -> violet -> OFF)
        setIsOn(false);
        playSound("switch");
        return -1;
      } else {
        // Turn ON and apply next theme (wraparound to 0 = warm)
        setIsOn(true);
        playSound("switch");
        return nextIdx;
      }
    });

    // Advance mobile sequence: unlit -> revealing -> form-only
    setMobilePhase((prev) => {
      if (prev === "unlit") {
        setTimeout(() => {
          setMobilePhase("form-only");
        }, 1000);
        return "revealing";
      }
      return prev;
    });
  }, [playSound]);'''

if old_trigger in c:
    c = c.replace(old_trigger, new_trigger)
    print("Updated triggerPullAction for cycling and mobile phase")
else:
    print("Warning: old_trigger not found in AnimatedLampLogin.tsx")

# Ensure data-mobile-phase and data-theme are set on root and room
c = c.replace(
    '<div id="lamp-login-root" data-theme={activeThemeName} className="relative w-full h-full min-h-screen overflow-hidden">',
    '<div id="lamp-login-root" data-theme={activeThemeName} data-mobile-phase={mobilePhase} className="relative w-full h-full min-h-screen overflow-hidden">'
)

old_room = '''      <div
        className={`room ${isOn ? "on" : ""}`}
        ref={roomRef}
        data-theme={activeThemeName}
      >'''

new_room = '''      <div
        className={`room ${isOn ? "on" : ""} mobile-${mobilePhase}`}
        ref={roomRef}
        data-theme={activeThemeName}
        data-mobile-phase={mobilePhase}
      >'''

if old_room in c:
    c = c.replace(old_room, new_room)
    print("Updated room container with data-mobile-phase")
else:
    print("Note: old_room was slightly different, checking...")

with open("src/components/auth/AnimatedLampLogin.tsx", "w", encoding="utf-8") as f:
    f.write(c)

print("AnimatedLampLogin.tsx patched successfully")
