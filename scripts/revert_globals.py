with open("src/app/globals.css", "r", encoding="utf-8") as f:
    c = f.read()

idx = c.find("/* COZY ANIMATED LAMP LOGIN INTEGRATION */")
if idx != -1:
    c = c[:idx].rstrip() + "\n"
    with open("src/app/globals.css", "w", encoding="utf-8") as f:
        f.write(c)
    print("Removed appended lamp css from globals.css")
