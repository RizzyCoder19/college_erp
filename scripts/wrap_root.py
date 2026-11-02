with open("src/components/auth/AnimatedLampLogin.tsx", "r", encoding="utf-8") as f:
    content = f.read()

target_start = """  return (
    <div
      className={`room ${isOn ? "on" : ""}`}
      ref={roomRef}
      data-theme={activeThemeName}
    >"""

replacement_start = """  return (
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

      <div
        className={`room ${isOn ? "on" : ""}`}
        ref={roomRef}
        data-theme={activeThemeName}
      >"""

target_end = """        </div>
      </section>
    </div>
  );
}"""

replacement_end = """        </div>
      </section>
    </div>
    </div>
  );
}"""

if target_start in content:
    content = content.replace(target_start, replacement_start)
    print("Replaced start")
else:
    print("target_start not found!")

if target_end in content:
    content = content.replace(target_end, replacement_end)
    print("Replaced end")
else:
    print("target_end not found!")

with open("src/components/auth/AnimatedLampLogin.tsx", "w", encoding="utf-8") as f:
    f.write(content)
