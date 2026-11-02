"use client";

import React, { useState, useEffect, useRef, useCallback } from "react";
import { useRouter } from "next/navigation";
import { loginAction, getCurrentUserAction } from "@/lib/actions/auth";
import Image from "next/image";
import type { AuthenticatedUser } from "@/lib/auth/session";
import { CinematicWelcomeTransition } from "./CinematicWelcomeTransition";
import "./lamp-login.css";

const THEMES = ["warm", "cyber", "violet"];

interface WelcomeData {
  user: AuthenticatedUser;
  greeting: string;
}
const DEFAULT_LENGTH = 95;

interface FireflyData {
  id: number;
  width: number;
  height: number;
  duration: string;
  delay: string;
  x1: string;
  y1: string;
  x2: string;
  y2: string;
  x3: string;
  y3: string;
  x4: string;
  y4: string;
}

export function AnimatedLampLogin() {
  const router = useRouter();

  // Mode and form states
  const [currentMode, setCurrentMode] = useState<"signin" | "signup">("signin");
  const [fullName, setFullName] = useState("");
  const [email, setEmail] = useState("admin.local@sample.rpihm.ac.in");
  const [password, setPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [rememberMe, setRememberMe] = useState(true);
  const [isSubmitting, setIsSubmitting] = useState(false);

  const [isShaking, setIsShaking] = useState(false);

  // Lamp state (Initially unlit as authored in original source)
  const [isOn, setIsOn] = useState(false);
  const [themeIndex, setThemeIndex] = useState(-1); // -1 = OFF
  const [mobilePhase, setMobilePhase] = useState<"unlit" | "revealing" | "form-only">("unlit");

  // Post-login cinematic welcome transition user state
  const [welcomeUser, setWelcomeUser] = useState<AuthenticatedUser | null>(null);
  const [soundEnabled, setSoundEnabled] = useState(true);
  const [fireflies, setFireflies] = useState<FireflyData[]>([]);

  // Toast feedback
  const [toast, setToast] = useState<{ show: boolean; text: string; type: "success" | "error" }>({
    show: false,
    text: "",
    type: "success",
  });

  // DOM Refs
  const roomRef = useRef<HTMLDivElement>(null);
  const lampHeadRef = useRef<HTMLDivElement>(null);
  const lightBeamRef = useRef<HTMLDivElement>(null);
  const handleRef = useRef<HTMLDivElement>(null);
  const pathRef = useRef<SVGPathElement>(null);
  const loginCardRef = useRef<HTMLDivElement>(null);

  // Physics refs
  const isDraggingRef = useRef(false);
  const startXRef = useRef(0);
  const startYRef = useRef(0);
  const curXRef = useRef(0);
  const curYRef = useRef(0);
  const springAnimIdRef = useRef<number | null>(null);

  // Audio Context Ref
  const audioCtxRef = useRef<AudioContext | null>(null);

  const initAudio = useCallback(() => {
    if (!audioCtxRef.current && typeof window !== "undefined") {
      const AudioCtx = window.AudioContext || (window as unknown as { webkitAudioContext: typeof AudioContext }).webkitAudioContext;
      if (AudioCtx) {
        audioCtxRef.current = new AudioCtx();
      }
    }
    if (audioCtxRef.current && audioCtxRef.current.state === "suspended") {
      audioCtxRef.current.resume();
    }
  }, []);

  const playSound = useCallback((type: "pull" | "switch" | "tap" | "success") => {
    if (!soundEnabled) return;
    initAudio();
    const ctx = audioCtxRef.current;
    if (!ctx) return;

    const now = ctx.currentTime;

    if (type === "pull") {
      const osc = ctx.createOscillator();
      const gain = ctx.createGain();
      osc.type = "triangle";
      osc.frequency.setValueAtTime(320, now);
      osc.frequency.exponentialRampToValueAtTime(140, now + 0.05);

      gain.gain.setValueAtTime(0.2, now);
      gain.gain.exponentialRampToValueAtTime(0.01, now + 0.05);

      osc.connect(gain);
      gain.connect(ctx.destination);
      osc.start(now);
      osc.stop(now + 0.05);
    } else if (type === "switch") {
      const osc = ctx.createOscillator();
      const gain = ctx.createGain();
      osc.type = "square";
      osc.frequency.setValueAtTime(isOn ? 1200 : 700, now);
      osc.frequency.exponentialRampToValueAtTime(isOn ? 300 : 200, now + 0.06);

      gain.gain.setValueAtTime(0.35, now);
      gain.gain.exponentialRampToValueAtTime(0.001, now + 0.07);

      osc.connect(gain);
      gain.connect(ctx.destination);
      osc.start(now);
      osc.stop(now + 0.07);

      if (!isOn) {
        // Filament hum when turning ON
        const humOsc = ctx.createOscillator();
        const humGain = ctx.createGain();
        humOsc.type = "sine";
        humOsc.frequency.setValueAtTime(120, now);
        humGain.gain.setValueAtTime(0.12, now);
        humGain.gain.exponentialRampToValueAtTime(0.001, now + 0.25);

        humOsc.connect(humGain);
        humGain.connect(ctx.destination);
        humOsc.start(now);
        humOsc.stop(now + 0.25);
      }
    } else if (type === "tap") {
      const osc = ctx.createOscillator();
      const gain = ctx.createGain();
      osc.type = "sine";
      osc.frequency.setValueAtTime(540, now);
      gain.gain.setValueAtTime(0.15, now);
      gain.gain.exponentialRampToValueAtTime(0.001, now + 0.04);

      osc.connect(gain);
      gain.connect(ctx.destination);
      osc.start(now);
      osc.stop(now + 0.04);
    } else if (type === "success") {
      [523.25, 659.25, 783.99, 1046.5].forEach((freq, i) => {
        const osc = ctx.createOscillator();
        const gain = ctx.createGain();
        osc.type = "sine";
        osc.frequency.setValueAtTime(freq, now + i * 0.08);

        gain.gain.setValueAtTime(0, now + i * 0.08);
        gain.gain.linearRampToValueAtTime(0.2, now + i * 0.08 + 0.02);
        gain.gain.exponentialRampToValueAtTime(0.001, now + i * 0.08 + 0.4);

        osc.connect(gain);
        gain.connect(ctx.destination);
        osc.start(now + i * 0.08);
        osc.stop(now + i * 0.08 + 0.45);
      });
    }
  }, [soundEnabled, initAudio, isOn]);

  const showToast = useCallback((text: string, type: "success" | "error" = "success") => {
    setToast({ show: true, text, type });
    setTimeout(() => {
      setToast((prev) => ({ ...prev, show: false }));
    }, 3500);
  }, []);

  // Update SVG string visual
  const updateStringVisual = useCallback((x: number, y: number) => {
    if (pathRef.current) {
      pathRef.current.setAttribute(
        "d",
        `M 0 0 Q ${x * 0.3} ${(DEFAULT_LENGTH + y) * 0.5} ${x} ${DEFAULT_LENGTH + y}`
      );
    }
    if (handleRef.current) {
      handleRef.current.style.transform = `translate(${x}px, ${y}px)`;
    }
  }, []);

  // Spring harmonic rebound
  const startSpringPhysics = useCallback((initialX: number, initialY: number) => {
    if (springAnimIdRef.current) {
      cancelAnimationFrame(springAnimIdRef.current);
    }

    let x = initialX;
    let y = initialY;
    let vx = 0;
    let vy = 0;
    const stiffness = 0.16;
    const damping = 0.78;

    function step() {
      const ax = -stiffness * x;
      const ay = -stiffness * y;

      vx = (vx + ax) * damping;
      vy = (vy + ay) * damping;

      x += vx;
      y += vy;

      updateStringVisual(x, y);

      if (Math.abs(x) > 0.1 || Math.abs(y) > 0.1 || Math.abs(vx) > 0.1 || Math.abs(vy) > 0.1) {
        springAnimIdRef.current = requestAnimationFrame(step);
      } else {
        updateStringVisual(0, 0);
      }
    }

    springAnimIdRef.current = requestAnimationFrame(step);
  }, [updateStringVisual]);

  // Lamp theme cycle
  const triggerPullAction = useCallback(() => {
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
  }, [playSound]);

  // Generate fireflies when turned on
  useEffect(() => {
    if (isOn) {
      const items: FireflyData[] = [];
      for (let i = 0; i < 30; i++) {
        const size = Math.random() * 4 + 3;
        items.push({
          id: i,
          width: size,
          height: size,
          duration: `${Math.random() * 25 + 25}s`,
          delay: `-${Math.random() * 20}s`,
          x1: `${Math.random() * 100}vw`,
          y1: `${Math.random() * 100}vh`,
          x2: `${Math.random() * 100}vw`,
          y2: `${Math.random() * 100}vh`,
          x3: `${Math.random() * 100}vw`,
          y3: `${Math.random() * 100}vh`,
          x4: `${Math.random() * 100}vw`,
          y4: `${Math.random() * 100}vh`,
        });
      }
      setFireflies(items);
    } else {
      setFireflies([]);
    }
  }, [isOn]);

  // Pointer event listeners on pull string
  const onPointerDown = useCallback((e: React.PointerEvent) => {
    isDraggingRef.current = true;
    if (springAnimIdRef.current) {
      cancelAnimationFrame(springAnimIdRef.current);
    }
    handleRef.current?.classList.add("dragging");
    startXRef.current = e.clientX;
    startYRef.current = e.clientY;
    curXRef.current = 0;
    curYRef.current = 0;
    (e.target as HTMLElement).setPointerCapture?.(e.pointerId);
    playSound("pull");
  }, [playSound]);

  const onPointerMove = useCallback((e: React.PointerEvent) => {
    if (!isDraggingRef.current) return;
    const rawDx = (e.clientX - startXRef.current) * 0.35;
    const rawDy = Math.max(0, e.clientY - startYRef.current) * 0.75;

    curXRef.current = Math.max(-40, Math.min(40, rawDx));
    curYRef.current = Math.min(180, rawDy);

    updateStringVisual(curXRef.current, curYRef.current);
  }, [updateStringVisual]);

  const onPointerUp = useCallback(() => {
    if (!isDraggingRef.current) return;
    isDraggingRef.current = false;
    handleRef.current?.classList.remove("dragging");

    const triggered = curYRef.current > 35;
    if (triggered) {
      triggerPullAction();
    }

    startSpringPhysics(curXRef.current, curYRef.current);
  }, [triggerPullAction, startSpringPhysics]);

  // 3D Parallax & Mouse Spotlight Tracking
  useEffect(() => {
    const handleMouseMove = (e: MouseEvent) => {
      const { innerWidth, innerHeight } = window;
      const normX = (e.clientX / innerWidth - 0.5) * 2;

      if (lampHeadRef.current && lightBeamRef.current) {
        const rotateZ = normX * 4.5;
        const skewX = normX * 2;
        lampHeadRef.current.style.transform = `rotate(${rotateZ}deg) skewX(${skewX}deg)`;
        lightBeamRef.current.style.transform = `rotate(${rotateZ * 0.7}deg) translateX(${normX * 12}px)`;
      }

      if (loginCardRef.current) {
        const rect = loginCardRef.current.getBoundingClientRect();
        const cardX = ((e.clientX - rect.left) / rect.width) * 100;
        const cardY = ((e.clientY - rect.top) / rect.height) * 100;
        loginCardRef.current.style.setProperty("--mouse-x", `${cardX}%`);
        loginCardRef.current.style.setProperty("--mouse-y", `${cardY}%`);
      }
    };

    window.addEventListener("mousemove", handleMouseMove);
    return () => window.removeEventListener("mousemove", handleMouseMove);
  }, []);

  // Calculate password strength
  const calculatePasswordStrength = (val: string) => {
    if (!val) return { active: false, score: 0, text: "", color: "#f85149", width: "0%" };
    let score = 0;
    if (val.length >= 6) score++;
    if (val.length >= 10) score++;
    if (/[A-Z]/.test(val)) score++;
    if (/[0-9]/.test(val)) score++;
    if (/[^A-Za-z0-9]/.test(val)) score++;

    if (score <= 2) {
      return { active: true, score, text: "Weak password", color: "#f85149", width: "33%" };
    } else if (score <= 4) {
      return { active: true, score, text: "Moderate password", color: "#e3b341", width: "66%" };
    } else {
      return { active: true, score, text: "Strong password", color: "#3fb950", width: "100%" };
    }
  };

  const pwdStrength = calculatePasswordStrength(password);

  // Form Submission
  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!email.trim() || !password.trim()) {
      loginCardRef.current?.classList.add("shake");
      showToast("Please enter your email and password", "error");
      setTimeout(() => loginCardRef.current?.classList.remove("shake"), 500);
      return;
    }

    if (currentMode === "signup") {
      loginCardRef.current?.classList.add("shake");
      showToast(
        "Self-registration is disabled. Staff accounts must be provisioned by an authorized administrator.",
        "error"
      );
      setTimeout(() => loginCardRef.current?.classList.remove("shake"), 500);
      return;
    }

    setIsSubmitting(true);

    try {
      const res = await loginAction({
        email: email.trim().toLowerCase(),
        password,
      });

      if (!res.success) {
        setIsSubmitting(false);
        loginCardRef.current?.classList.add("shake");
        showToast(res.error || "Authentication failed. Please verify credentials.", "error");
        setTimeout(() => loginCardRef.current?.classList.remove("shake"), 500);
        return;
      }

      playSound("success");

      if (res.data?.user) {
        setWelcomeUser(res.data.user);
      } else {
        if (typeof window !== "undefined") {
          window.location.href = "/";
        } else {
          router.push("/");
          router.refresh();
        }
      }
    } catch {
      setIsSubmitting(false);
      loginCardRef.current?.classList.add("shake");
      showToast("Connection error. Please try again.", "error");
      setTimeout(() => loginCardRef.current?.classList.remove("shake"), 500);
    }
  };

  const activeThemeName = themeIndex >= 0 && themeIndex < THEMES.length ? THEMES[themeIndex] : undefined;

  return (
    <div id="lamp-login-root" data-theme={activeThemeName} data-mobile-phase={mobilePhase} className="relative w-full h-full min-h-screen overflow-hidden">
      {welcomeUser && (
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
      )}

      <div
        className={`room ${isOn ? "on" : ""} mobile-${mobilePhase}`}
        ref={roomRef}
        data-theme={activeThemeName}
        data-mobile-phase={mobilePhase}
      >
      {/* Night Sky Backdrop */}
      <div className="night-sky">
        <div className="stars-cluster"></div>
        <div className="ambient-window">
          <div className="window-frame"></div>
          <div className="window-pane">
            <div className="window-glow"></div>
          </div>
        </div>
      </div>

      <div className="room-light"></div>

      {/* Floating Fireflies Container */}
      <div className="fireflies">
        {fireflies.map((f) => (
          <span
            key={f.id}
            className="firefly"
            style={
              {
                width: `${f.width}px`,
                height: `${f.height}px`,
                "--duration": f.duration,
                "--delay": f.delay,
                "--x1": f.x1,
                "--y1": f.y1,
                "--x2": f.x2,
                "--y2": f.y2,
                "--x3": f.x3,
                "--y3": f.y3,
                "--x4": f.x4,
                "--y4": f.y4,
              } as React.CSSProperties
            }
          />
        ))}
      </div>

      {/* Top Controls: Institutional Branding & Sound Toggle */}
      <header className="top-controls">
        <div className="top-brand">
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
        </div>

        {/* Sound FX Toggle Button */}
        <button
          className="sound-toggle"
          type="button"
          aria-label="Toggle Sound Effects"
          title={soundEnabled ? "Sound Effects (ON)" : "Sound Effects (OFF)"}
          onClick={() => {
            setSoundEnabled(!soundEnabled);
            if (!soundEnabled) playSound("tap");
          }}
        >
          {soundEnabled ? (
            <svg className="sound-icon sound-on" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
              <polygon points="11 5 6 9 2 9 2 15 6 15 11 19 11 5"></polygon>
              <path d="M19.07 4.93a10 10 0 0 1 0 14.14M15.54 8.46a5 5 0 0 1 0 7.08"></path>
            </svg>
          ) : (
            <svg className="sound-icon sound-off" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
              <polygon points="11 5 6 9 2 9 2 15 6 15 11 19 11 5"></polygon>
              <line x1="23" y1="9" x2="17" y2="15"></line>
              <line x1="17" y1="9" x2="23" y2="15"></line>
            </svg>
          )}
        </button>
      </header>

      {/* Interactive Lamp Area */}
      <section className="lamp-side">
        <div className="lamp-container">
          <div className="lamp-glow"></div>

          {/* Lamp Head Assembly */}
          <div className="lamp-top-finial"></div>
          <div className="lamp-head" ref={lampHeadRef}>
            <div className="lamp-inner-bulb"></div>
          </div>

          {/* Volumetric Light Beam */}
          <div className="light-beam" ref={lightBeamRef}>
            <div className="dust-motes"></div>
          </div>

          {/* Lamp Hardware */}
          <div className="lamp-neck-joint"></div>
          <div className="lamp-stem"></div>
          <div className="lamp-joint"></div>
          <div className="lamp-base">
            <div className="base-ridge"></div>
          </div>
          <div className="desk-surface"></div>

          {/* Pull Switch String (Harmonic Spring SVG Path) */}
          <svg className="string-svg" aria-hidden="true">
            <path ref={pathRef} d="M 0 0 L 0 95"></path>
          </svg>

          {/* Hint badge showing how to turn on the lamp (hidden when lamp is on) */}
          <div className="pull-hint" aria-hidden="true">
            <span>💡 Pull cord to turn on</span>
          </div>

          {/* Pull Switch Handle Bead */}
          <div
            className="string-handle"
            ref={handleRef}
            tabIndex={0}
            role="button"
            aria-label="Pull lamp switch string to toggle light and colors"
            onPointerDown={onPointerDown}
            onPointerMove={onPointerMove}
            onPointerUp={onPointerUp}
            onPointerCancel={onPointerUp}
            onKeyDown={(e) => {
              if (e.key === "Enter" || e.key === " ") {
                e.preventDefault();
                triggerPullAction();
                startSpringPhysics(0, 45);
              }
            }}
          >
            <div className="handle-bead"></div>
          </div>
        </div>
      </section>

      {/* Glassmorphic Authentication Card */}
      <section className="login-side">
        <div className="login-card glass" ref={loginCardRef}>
          <div className="card-glow-overlay"></div>
          <div className="glass-line"></div>

          {/* Form Switcher Tabs */}
          <div className={`form-tabs ${currentMode === "signup" ? "signup-active" : ""}`} role="tablist">
            <div className="tab-slider"></div>
            <button
              className={`tab-btn ${currentMode === "signin" ? "active" : ""}`}
              type="button"
              role="tab"
              aria-selected={currentMode === "signin"}
              onClick={() => {
                setCurrentMode("signin");
                playSound("tap");
              }}
            >
              Sign In
            </button>
            <button
              className={`tab-btn ${currentMode === "signup" ? "active" : ""}`}
              type="button"
              role="tab"
              aria-selected={currentMode === "signup"}
              onClick={() => {
                setCurrentMode("signup");
                playSound("tap");
              }}
            >
              Create Account
            </button>
          </div>

          {/* Card Header */}
          <div className="login-heading">
            <h2>{currentMode === "signin" ? "Welcome Back" : "Institutional Access"}</h2>
            <p>
              {currentMode === "signin"
                ? "Enter your credentials to access your ERP workspace"
                : "Account provisioning is restricted to authorized administrators"}
            </p>
          </div>

          {/* Authentication Form */}
          <form
            className={`auth-form ${currentMode === "signup" ? "mode-signup" : ""}`}
            onSubmit={handleSubmit}
            autoComplete="on"
          >
            <div className="inputs">
              {/* Full Name (for Sign Up preview mode) */}
              <label className="input-wrap signup-only-field">
                <span className="input-icon">
                  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                    <path d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2"></path>
                    <circle cx="12" cy="7" r="4"></circle>
                  </svg>
                </span>
                <input
                  type="text"
                  placeholder="Full Name"
                  value={fullName}
                  onChange={(e) => setFullName(e.target.value)}
                  autoComplete="name"
                />
              </label>

              {/* Email Address */}
              <label className="input-wrap">
                <span className="input-icon">
                  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                    <path d="M4 4h16c1.1 0 2 .9 2 2v12c0 1.1-.9 2-2 2H4c-1.1 0-2-.9-2-2V6c0-1.1.9-2 2-2z"></path>
                    <polyline points="22,6 12,13 2,6"></polyline>
                  </svg>
                </span>
                <input
                  type="email"
                  id="login-email"
                  placeholder="Institutional Email"
                  required
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  autoComplete="email"
                />
              </label>

              {/* Password with Visibility Toggle */}
              <label className="input-wrap password-wrap">
                <span className="input-icon">
                  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                    <rect x="3" y="11" width="18" height="11" rx="2" ry="2"></rect>
                    <path d="M7 11V7a5 5 0 0 1 10 0v4"></path>
                  </svg>
                </span>
                <input
                  type={showPassword ? "text" : "password"}
                  id="login-password"
                  placeholder="Password"
                  required
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  autoComplete="current-password"
                />
                <button
                  type="button"
                  className="toggle-password"
                  aria-label="Toggle password visibility"
                  onClick={() => {
                    setShowPassword(!showPassword);
                    playSound("tap");
                  }}
                >
                  {showPassword ? (
                    <svg className="eye-hide" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                      <path d="M17.94 17.94A10.07 10.07 0 0 1 12 20c-7 0-11-8-11-8a18.45 18.45 0 0 1 5.06-5.94M9.9 4.24A9.12 9.12 0 0 1 12 4c7 0 11 8 11 8a18.5 18.5 0 0 1-2.16 3.19m-6.72-1.07a3 3 0 1 1-4.24-4.24"></path>
                      <line x1="1" y1="1" x2="23" y2="23"></line>
                    </svg>
                  ) : (
                    <svg className="eye-show" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                      <path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z"></path>
                      <circle cx="12" cy="12" r="3"></circle>
                    </svg>
                  )}
                </button>
              </label>

              {/* Password Strength Meter */}
              <div className={`password-meter ${pwdStrength.active ? "active" : ""}`}>
                <div className="meter-bar">
                  <span
                    className="meter-fill"
                    style={{ width: pwdStrength.width, backgroundColor: pwdStrength.color }}
                  ></span>
                </div>
                <span className="meter-text" style={{ color: pwdStrength.color }}>
                  {pwdStrength.text}
                </span>
              </div>
            </div>

            {/* Options Row (Remember me) */}
            <div className="options-row">
              <label className="remember-label">
                <input
                  type="checkbox"
                  checked={rememberMe}
                  onChange={(e) => setRememberMe(e.target.checked)}
                />
                <span className="checkbox-custom"></span>
                <span className="remember-text">Remember session</span>
              </label>
              <span
                style={{ fontSize: "11px", color: "#8b949e", cursor: "pointer" }}
                onClick={() => showToast("Contact IT Administrator to reset your password.", "error")}
              >
                Forgot password?
              </span>
            </div>

            {/* Submit Button */}
            <button id="login-submit-button" className="sign-in-btn" type="submit" disabled={isSubmitting}>
              {isSubmitting ? (
                <div className="btn-loader">
                  <span className="spinner"></span>
                </div>
              ) : (
                <span className="btn-text">
                  {currentMode === "signin" ? "Sign In to CampusOS" : "Request Account Provisioning"}
                </span>
              )}
            </button>

            {/* Institutional Dev Note */}
            <div style={{ marginTop: "14px", textAlign: "center", fontSize: "11px", color: "#6e7681" }}>
              <span>Protected Institutional System ? Pull lamp string to cycle light & themes</span>
            </div>
          </form>

          {/* Feedback Toast Notification */}
          <div className={`feedback-toast ${toast.type} ${toast.show ? "show" : ""}`}>
            <span className="toast-icon">{toast.type === "success" ? "??" : "??"}</span>
            <span className="toast-text">{toast.text}</span>
          </div>
        </div>
      </section>
    </div>
    </div>
  );
}
