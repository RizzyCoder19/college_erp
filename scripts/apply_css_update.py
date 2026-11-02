with open("src/components/auth/lamp-login.css", "r", encoding="utf-8") as f:
    css = f.read()

# 1. Ensure theme variables for both root and room
theme_block_old = '''#lamp-login-root[data-theme="cyber"] {
  --lamp-clr: #00e5ff;
  --lamp-glow-core: #e0f7fa;
  --lamp-glow-strong: rgba(0, 229, 255, 0.65);
  --lamp-glow-soft: rgba(0, 188, 212, 0.25);
  --lamp-beam-start: rgba(128, 243, 255, 0.85);
  --lamp-beam-mid: rgba(0, 229, 255, 0.25);
  --lamp-desk-glow: radial-gradient(ellipse at center, rgba(0, 229, 255, 0.35) 0%, rgba(0, 188, 212, 0.08) 55%, transparent 75%);
}

#lamp-login-root[data-theme="sunset"] {
  --lamp-clr: #ff5252;
  --lamp-glow-core: #ffebee;
  --lamp-glow-strong: rgba(255, 82, 82, 0.65);
  --lamp-glow-soft: rgba(233, 30, 99, 0.25);
  --lamp-beam-start: rgba(255, 138, 128, 0.85);
  --lamp-beam-mid: rgba(255, 82, 82, 0.25);
  --lamp-desk-glow: radial-gradient(ellipse at center, rgba(255, 82, 82, 0.35) 0%, rgba(233, 30, 99, 0.08) 55%, transparent 75%);
}

#lamp-login-root[data-theme="aurora"] {
  --lamp-clr: #00e676;
  --lamp-glow-core: #e8f5e9;
  --lamp-glow-strong: rgba(0, 230, 118, 0.65);
  --lamp-glow-soft: rgba(76, 175, 80, 0.25);
  --lamp-beam-start: rgba(185, 246, 202, 0.85);
  --lamp-beam-mid: rgba(0, 230, 118, 0.25);
  --lamp-desk-glow: radial-gradient(ellipse at center, rgba(0, 230, 118, 0.35) 0%, rgba(76, 175, 80, 0.08) 55%, transparent 75%);
}

#lamp-login-root[data-theme="violet"] {
  --lamp-clr: #d500f9;
  --lamp-glow-core: #f3e5f5;
  --lamp-glow-strong: rgba(213, 0, 249, 0.65);
  --lamp-glow-soft: rgba(171, 71, 188, 0.25);
  --lamp-beam-start: rgba(234, 128, 252, 0.85);
  --lamp-beam-mid: rgba(213, 0, 249, 0.25);
  --lamp-desk-glow: radial-gradient(ellipse at center, rgba(213, 0, 249, 0.35) 0%, rgba(171, 71, 188, 0.08) 55%, transparent 75%);
}'''

theme_block_new = '''#lamp-login-root[data-theme="warm"],
#lamp-login-root:not([data-theme]),
.room[data-theme="warm"] {
  --lamp-clr: #ffd54f;
  --lamp-glow-core: #fff9c4;
  --lamp-glow-strong: rgba(255, 213, 79, 0.65);
  --lamp-glow-soft: rgba(255, 193, 7, 0.25);
  --lamp-beam-start: rgba(255, 235, 150, 0.85);
  --lamp-beam-mid: rgba(255, 213, 79, 0.25);
  --lamp-desk-glow: radial-gradient(ellipse at center, rgba(255, 220, 100, 0.35) 0%, rgba(255, 180, 50, 0.08) 55%, transparent 75%);
}

#lamp-login-root[data-theme="cyber"],
.room[data-theme="cyber"] {
  --lamp-clr: #00e5ff;
  --lamp-glow-core: #e0f7fa;
  --lamp-glow-strong: rgba(0, 229, 255, 0.65);
  --lamp-glow-soft: rgba(0, 188, 212, 0.25);
  --lamp-beam-start: rgba(128, 243, 255, 0.85);
  --lamp-beam-mid: rgba(0, 229, 255, 0.25);
  --lamp-desk-glow: radial-gradient(ellipse at center, rgba(0, 229, 255, 0.35) 0%, rgba(0, 188, 212, 0.08) 55%, transparent 75%);
}

#lamp-login-root[data-theme="violet"],
.room[data-theme="violet"] {
  --lamp-clr: #d500f9;
  --lamp-glow-core: #f3e5f5;
  --lamp-glow-strong: rgba(213, 0, 249, 0.65);
  --lamp-glow-soft: rgba(171, 71, 188, 0.25);
  --lamp-beam-start: rgba(234, 128, 252, 0.85);
  --lamp-beam-mid: rgba(213, 0, 249, 0.25);
  --lamp-desk-glow: radial-gradient(ellipse at center, rgba(213, 0, 249, 0.35) 0%, rgba(171, 71, 188, 0.08) 55%, transparent 75%);
}'''

if theme_block_old in css:
    css = css.replace(theme_block_old, theme_block_new)
    print("Replaced theme color variables with multi-level scoping")
else:
    print("Warning: theme_block_old not found directly, checking...")

# 2. Replace media query block
media_old = '''@media (max-width: 950px) {
#lamp-login-root .room {
    flex-direction: column;
    overflow-y: auto;
    overflow-x: hidden;
  }

#lamp-login-root .lamp-side {
    flex: 0 0 52vh;
    min-height: 400px;
    padding-top: 20px;
  }

#lamp-login-root .login-side {
    padding: 20px 20px 60px;
    flex: 0 0 auto;
  }

#lamp-login-root .night-sky {
    display: none;
  }

#lamp-login-root .top-controls {
    top: 16px;
    right: 16px;
  }

#lamp-login-root .lamp-container {
    transform: scale(0.95);
  }

#lamp-login-root .login-card {
    max-width: 420px;
    padding: 30px 24px;
  }

#lamp-login-root .pull-hint {
    left: 50%;
    transform: translateX(-50%);
    top: 0;
  }
}'''

media_new = '''/* ===================================================
   MOBILE-FIRST SEQUENCED OPENING (VIEWPORT <= 768px)
   =================================================== */

@media (max-width: 768px) {
  #lamp-login-root .room {
    flex-direction: column;
    overflow-y: auto;
    overflow-x: hidden;
    min-height: 100vh;
    justify-content: center;
    align-items: center;
    padding: 0;
  }

  #lamp-login-root .night-sky {
    display: none;
  }

  #lamp-login-root .top-controls {
    top: 16px;
    left: 16px;
    right: 16px;
    width: auto;
  }

  /* Make cord handle touch area generous for touch devices (>= 48px) */
  #lamp-login-root .string-handle {
    min-width: 48px;
    min-height: 48px;
    display: flex;
    align-items: center;
    justify-content: center;
    touch-action: none;
  }

  #lamp-login-root .pull-hint {
    left: 50%;
    transform: translateX(-50%);
    top: 10px;
    white-space: nowrap;
    font-size: 13px;
    padding: 8px 16px;
  }

  /* --- STATE 1: CINEMATIC OPENING (Unlit, lamp centered, card hidden) --- */
  #lamp-login-root[data-mobile-phase="unlit"] .login-side,
  #lamp-login-root .room.mobile-unlit .login-side {
    display: none !important;
    opacity: 0 !important;
    pointer-events: none !important;
  }

  #lamp-login-root[data-mobile-phase="unlit"] .lamp-side,
  #lamp-login-root .room.mobile-unlit .lamp-side {
    flex: 1 1 auto;
    width: 100%;
    min-height: 85vh;
    display: flex;
    justify-content: center;
    align-items: center;
    padding: 20px 0;
    transition: opacity 0.6s ease, transform 0.6s ease;
  }

  #lamp-login-root[data-mobile-phase="unlit"] .lamp-container,
  #lamp-login-root .room.mobile-unlit .lamp-container {
    transform: scale(0.85);
    margin: auto;
  }

  /* --- STATE 2: FIRST CORD PULL (Illuminated reveal transition) --- */
  #lamp-login-root[data-mobile-phase="revealing"] .lamp-side,
  #lamp-login-root .room.mobile-revealing .lamp-side {
    flex: 0 0 35vh;
    min-height: 280px;
    opacity: 0.7;
    transform: translateY(-20px) scale(0.75);
    transition: opacity 0.8s ease, transform 0.8s ease, flex 0.8s ease;
  }

  #lamp-login-root[data-mobile-phase="revealing"] .login-side,
  #lamp-login-root .room.mobile-revealing .login-side {
    display: flex !important;
    opacity: 1 !important;
    pointer-events: auto !important;
    animation: mobileCardReveal 0.8s cubic-bezier(0.16, 1, 0.3, 1) forwards;
  }

  @keyframes mobileCardReveal {
    0% {
      opacity: 0;
      transform: translateY(40px) scale(0.94);
    }
    100% {
      opacity: 1;
      transform: translateY(0) scale(1);
    }
  }

  /* --- STATE 3: LAMP EXIT (Graceful removal, focused auth experience) --- */
  #lamp-login-root[data-mobile-phase="form-only"] .lamp-side,
  #lamp-login-root .room.mobile-form-only .lamp-side {
    display: none !important;
    height: 0 !important;
    min-height: 0 !important;
    padding: 0 !important;
    margin: 0 !important;
    overflow: hidden !important;
    pointer-events: none !important;
  }

  #lamp-login-root[data-mobile-phase="form-only"] .login-side,
  #lamp-login-root .room.mobile-form-only .login-side {
    display: flex !important;
    opacity: 1 !important;
    pointer-events: auto !important;
    width: 100% !important;
    max-width: 440px !important;
    margin: auto !important;
    padding: 30px 16px 40px !important;
    justify-content: center !important;
    align-items: center !important;
    flex: 1 1 auto !important;
  }

  #lamp-login-root[data-mobile-phase="form-only"] .login-card,
  #lamp-login-root .room.mobile-form-only .login-card {
    width: 100% !important;
    max-width: 400px !important;
    padding: 28px 20px !important;
    margin: auto !important;
    opacity: 1 !important;
    transform: none !important;
    border-radius: 24px;
    box-shadow: 0 20px 45px rgba(0, 0, 0, 0.7);
  }

  /* Mobile ergonomic input sizing & touch targets */
  #lamp-login-root[data-mobile-phase="form-only"] input,
  #lamp-login-root .room.mobile-form-only input {
    font-size: 16px !important; /* Prevents auto-zoom on iOS */
    min-height: 48px !important;
  }

  #lamp-login-root[data-mobile-phase="form-only"] .submit-btn,
  #lamp-login-root .room.mobile-form-only .submit-btn,
  #lamp-login-root[data-mobile-phase="form-only"] .tab-btn,
  #lamp-login-root .room.mobile-form-only .tab-btn {
    min-height: 48px !important;
    font-size: 15px !important;
  }
}

/* ===================================================
   DESKTOP VIEWPORTS (>= 769px): PRESERVE SIDE-BY-SIDE LAMP & COLOR CYCLING
   =================================================== */

@media (min-width: 769px) {
  #lamp-login-root .lamp-side {
    display: flex !important;
    opacity: 1 !important;
    pointer-events: auto !important;
  }
}'''

if media_old in css:
    css = css.replace(media_old, media_new)
    print("Replaced media query with sequenced mobile and desktop preserving rules")
else:
    print("Warning: media_old not found directly, checking...")

with open("src/components/auth/lamp-login.css", "w", encoding="utf-8") as f:
    f.write(css)

print("lamp-login.css updated successfully")
