import sys

# 1. Update CinematicWelcomeTransition.tsx
with open("src/components/auth/CinematicWelcomeTransition.tsx", "r", encoding="utf-8") as f:
    c = f.read()

# Add useCallback to imports if missing
c = c.replace('import React, { useEffect, useRef, useState } from "react";', 'import React, { useEffect, useRef, useState, useCallback } from "react";')

old_effect = '''  // Smooth progress line and completion timer
  useEffect(() => {
    const startTime = performance.now();

    const interval = setInterval(() => {
      const elapsed = performance.now() - startTime;
      const pct = Math.min(100, (elapsed / actualDuration) * 100);
      setProgress(pct);

      if (pct >= 100) {
        clearInterval(interval);
        onComplete();
      }
    }, 16);

    // Keyboard / click bypass for accessibility
    const handleKeyDown = () => onComplete();
    window.addEventListener("keydown", handleKeyDown);

    return () => {
      clearInterval(interval);
      window.removeEventListener("keydown", handleKeyDown);
    };
  }, [actualDuration, onComplete]);'''

new_effect = '''  const completedRef = useRef(false);

  const triggerCompletion = useCallback(() => {
    if (completedRef.current) return;
    completedRef.current = true;
    onComplete();
  }, [onComplete]);

  // Smooth progress line, completion timer, and mobile throttling safeguard
  useEffect(() => {
    const startTime = performance.now();

    const interval = setInterval(() => {
      const elapsed = performance.now() - startTime;
      const pct = Math.min(100, (elapsed / actualDuration) * 100);
      setProgress(pct);

      if (pct >= 100) {
        clearInterval(interval);
        triggerCompletion();
      }
    }, 16);

    // Fallback timer to guarantee transition fires even if mobile browser throttles interval
    const fallbackTimer = setTimeout(() => {
      triggerCompletion();
    }, actualDuration + 200);

    // Keyboard / click bypass for accessibility
    const handleKeyDown = () => triggerCompletion();
    window.addEventListener("keydown", handleKeyDown);

    return () => {
      clearInterval(interval);
      clearTimeout(fallbackTimer);
      window.removeEventListener("keydown", handleKeyDown);
    };
  }, [actualDuration, triggerCompletion]);'''

if old_effect in c:
    c = c.replace(old_effect, new_effect)
    print("Updated CinematicWelcomeTransition.tsx completion effect")
else:
    print("Warning: old_effect not found in CinematicWelcomeTransition.tsx")

# Add onClick to outer div
c = c.replace(
    'className="fixed inset-0 z-[99999] bg-[#04070e] text-slate-100 flex flex-col items-center justify-center p-6 select-none overflow-hidden"',
    'onClick={triggerCompletion} className="fixed inset-0 z-[99999] bg-[#04070e] text-slate-100 flex flex-col items-center justify-center p-6 select-none overflow-hidden cursor-pointer"'
)

with open("src/components/auth/CinematicWelcomeTransition.tsx", "w", encoding="utf-8") as f:
    f.write(c)

# 2. Update AnimatedLampLogin.tsx
with open("src/components/auth/AnimatedLampLogin.tsx", "r", encoding="utf-8") as f:
    a = f.read()

old_welcome_block = '''      {welcomeUser && (
        <CinematicWelcomeTransition
          user={welcomeUser}
          onComplete={() => {
            router.push("/");
            router.refresh();
          }}
        />
      )}'''

new_welcome_block = '''      {welcomeUser && (
        <CinematicWelcomeTransition
          user={welcomeUser}
          onComplete={() => {
            if (typeof window !== "undefined") {
              window.location.href = "/";
            } else {
              router.push("/");
              router.refresh();
            }
          }}
        />
      )}'''

if old_welcome_block in a:
    a = a.replace(old_welcome_block, new_welcome_block)
    print("Updated AnimatedLampLogin.tsx welcome completion callback")
else:
    print("Warning: old_welcome_block not found in AnimatedLampLogin.tsx")

# Update fallback without user object
old_fallback = '''      if (res.data?.user) {
        setWelcomeUser(res.data.user);
      } else {
        router.push("/");
        router.refresh();
      }'''

new_fallback = '''      if (res.data?.user) {
        setWelcomeUser(res.data.user);
      } else {
        if (typeof window !== "undefined") {
          window.location.href = "/";
        } else {
          router.push("/");
          router.refresh();
        }
      }'''

if old_fallback in a:
    a = a.replace(old_fallback, new_fallback)
    print("Updated fallback navigation")

with open("src/components/auth/AnimatedLampLogin.tsx", "w", encoding="utf-8") as f:
    f.write(a)

print("Applied post-login navigation fixes")
