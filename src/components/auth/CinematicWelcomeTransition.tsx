"use client";

import React, { useEffect, useRef, useState } from "react";
import Image from "next/image";
import { AuthenticatedUser } from "@/lib/auth/session";

interface CinematicWelcomeTransitionProps {
  user: AuthenticatedUser;
  onComplete: () => void;
  durationMs?: number;
}

interface Particle {
  x: number;
  y: number;
  size: number;
  speedY: number;
  speedX: number;
  opacity: number;
  fadeSpeed: number;
  color: string;
}

export const CinematicWelcomeTransition: React.FC<CinematicWelcomeTransitionProps> = ({
  user,
  onComplete,
  durationMs = 2000,
}) => {
  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const [greeting, setGreeting] = useState("Welcome");
  const [progress, setProgress] = useState(0);

  // Time greeting calculated client-side at transition time
  useEffect(() => {
    const hour = new Date().getHours();
    if (hour >= 5 && hour < 12) {
      setGreeting("Good morning");
    } else if (hour >= 12 && hour < 17) {
      setGreeting("Good afternoon");
    } else {
      setGreeting("Good evening");
    }
  }, []);

  // Check reduced motion preference
  const prefersReducedMotion =
    typeof window !== "undefined" &&
    window.matchMedia("(prefers-reduced-motion: reduce)").matches;

  const actualDuration = prefersReducedMotion ? 600 : durationMs;

  // Background ash & ember particles canvas
  useEffect(() => {
    if (prefersReducedMotion) return;

    const canvas = canvasRef.current;
    if (!canvas) return;

    const ctx = canvas.getContext("2d");
    if (!ctx) return;

    let animationFrameId: number;
    let width = (canvas.width = window.innerWidth);
    let height = (canvas.height = window.innerHeight);

    const handleResize = () => {
      if (!canvas) return;
      width = canvas.width = window.innerWidth;
      height = canvas.height = window.innerHeight;
    };
    window.addEventListener("resize", handleResize);

    // Subtle palette: glowing amber, gold, fading charcoal ash
    const colors = [
      "rgba(245, 158, 11, ",  // amber
      "rgba(217, 119, 6, ",   // dark amber
      "rgba(251, 191, 36, ",  // soft gold
      "rgba(148, 163, 184, ", // ash gray
      "rgba(203, 213, 225, ", // pale smoke
    ];

    const particleCount = 35;
    const particles: Particle[] = [];

    for (let i = 0; i < particleCount; i++) {
      particles.push({
        x: Math.random() * width,
        y: Math.random() * height,
        size: Math.random() * 2.2 + 0.8,
        speedY: -(Math.random() * 0.45 + 0.2),
        speedX: (Math.random() - 0.5) * 0.3,
        opacity: Math.random() * 0.5 + 0.1,
        fadeSpeed: Math.random() * 0.003 + 0.001,
        color: colors[Math.floor(Math.random() * colors.length)],
      });
    }

    const render = () => {
      ctx.clearRect(0, 0, width, height);

      for (let i = 0; i < particles.length; i++) {
        const p = particles[i];
        p.y += p.speedY;
        p.x += p.speedX;
        p.opacity += p.fadeSpeed;

        if (p.opacity > 0.65 || p.opacity < 0.08) {
          p.fadeSpeed = -p.fadeSpeed;
        }

        // Wrap around top
        if (p.y < -10) {
          p.y = height + 10;
          p.x = Math.random() * width;
        }
        if (p.x < -10) p.x = width + 10;
        if (p.x > width + 10) p.x = -10;

        ctx.beginPath();
        ctx.arc(p.x, p.y, p.size, 0, Math.PI * 2);
        ctx.fillStyle = p.color + Math.max(0, Math.min(1, p.opacity)) + ")";
        ctx.fill();

        // Very faint ember halo for larger particles
        if (p.size > 2) {
          ctx.beginPath();
          ctx.arc(p.x, p.y, p.size * 2.5, 0, Math.PI * 2);
          ctx.fillStyle = p.color + (p.opacity * 0.15) + ")";
          ctx.fill();
        }
      }

      animationFrameId = requestAnimationFrame(render);
    };

    render();

    return () => {
      window.removeEventListener("resize", handleResize);
      cancelAnimationFrame(animationFrameId);
    };
  }, [prefersReducedMotion]);

  // Smooth progress line and completion timer
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
  }, [actualDuration, onComplete]);

  const roleDisplay =
    user.role === "SYSTEM_ADMIN"
      ? "System Administrator"
      : user.role === "ACADEMIC_ADMIN"
      ? "Academic Administrator"
      : user.role === "FACULTY_MEMBER"
      ? "Faculty Member"
      : "Student Viewer";

  return (
    <div
      className="fixed inset-0 z-[99999] bg-[#04070e] text-slate-100 flex flex-col items-center justify-center p-6 select-none overflow-hidden"
      role="status"
      aria-live="polite"
      aria-label={`Welcome transition for ${user.fullName}`}
    >
      {/* Background drifting embers canvas */}
      <canvas
        ref={canvasRef}
        className="absolute inset-0 pointer-events-none z-0"
        aria-hidden="true"
      />

      {/* Subtle radial atmosphere: deep navy center fading to obsidian black */}
      <div
        className="absolute inset-0 pointer-events-none z-0 opacity-80"
        style={{
          background:
            "radial-gradient(ellipse at 50% 50%, rgba(11, 21, 40, 0.75) 0%, rgba(4, 7, 14, 0.98) 75%)",
        }}
      />

      {/* Content Container */}
      <div className="relative z-10 max-w-lg w-full flex flex-col items-center text-center space-y-6 animate-fadeIn">
        {/* Institutional Branding */}
        <div className="flex flex-col items-center space-y-2">
          <div className="relative w-44 h-12 flex items-center justify-center filter drop-shadow-[0_0_12px_rgba(255,255,255,0.08)]">
            <Image
              src="/images/rpihm-logo-transparent.webp"
              alt="R. P. Institute of Hospitality & Management"
              fill
              className="object-contain"
              priority
            />
          </div>
          <div className="flex items-center space-x-2 text-[10px] uppercase tracking-[0.25em] font-medium text-amber-200/60">
            <span>RPIHM CampusOS</span>
            <span className="text-amber-500/40">•</span>
            <span>Academic ERP</span>
          </div>
        </div>

        {/* User Identity Card */}
        <div className="pt-2 pb-1 space-y-2.5">
          <p className="text-xs font-medium tracking-widest uppercase text-amber-400/90 drop-shadow-[0_0_8px_rgba(245,158,11,0.3)]">
            {greeting}
          </p>

          <h1 className="text-3xl sm:text-4xl font-serif font-bold text-white tracking-tight drop-shadow-[0_2px_14px_rgba(255,255,255,0.15)]">
            {user.fullName}
          </h1>

          <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-white/[0.06] border border-white/10 backdrop-blur-md text-xs text-slate-300">
            <span className="h-1.5 w-1.5 rounded-full bg-amber-400 shadow-[0_0_6px_#f59e0b]"></span>
            <span className="font-semibold text-slate-200">{roleDisplay}</span>
            {user.designation && (
              <>
                <span className="text-slate-600">•</span>
                <span className="text-slate-300">{user.designation}</span>
              </>
            )}
            {user.departmentName && (
              <>
                <span className="text-slate-600">•</span>
                <span className="text-slate-400">Dept. of {user.departmentName}</span>
              </>
            )}
          </div>
        </div>

        {/* Slender luminous progress indicator */}
        <div className="w-48 sm:w-56 pt-2 flex flex-col items-center space-y-2">
          <div className="w-full h-[2px] bg-white/10 rounded-full overflow-hidden relative">
            <div
              className="h-full bg-gradient-to-r from-amber-500 via-amber-300 to-amber-500 rounded-full shadow-[0_0_8px_#f59e0b] transition-all duration-75 ease-linear"
              style={{ width: `${progress}%` }}
            />
          </div>
          <span className="text-[10px] tracking-widest text-slate-500 uppercase font-mono">
            Entering Academic Workspace...
          </span>
        </div>
      </div>
    </div>
  );
};
