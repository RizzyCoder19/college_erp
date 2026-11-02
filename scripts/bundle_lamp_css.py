with open("src/components/auth/AnimatedLampLogin.tsx", "r", encoding="utf-8") as f:
    c = f.read()

c = c.replace('import "./lamp-login.css";', '// lamp-login.css bundled in globals.css')

with open("src/components/auth/AnimatedLampLogin.tsx", "w", encoding="utf-8") as f:
    f.write(c)

with open("src/components/auth/lamp-login.css", "r", encoding="utf-8") as f:
    lamp_css = f.read()

with open("src/app/globals.css", "r", encoding="utf-8") as f:
    globals_css = f.read()

if "/* COZY ANIMATED LAMP LOGIN" not in globals_css:
    with open("src/app/globals.css", "a", encoding="utf-8") as f:
        f.write("\n\n/* COZY ANIMATED LAMP LOGIN INTEGRATION */\n" + lamp_css)
    print("Appended lamp-login.css to globals.css")
else:
    print("Already in globals.css")
