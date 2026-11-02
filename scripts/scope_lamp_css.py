import re

with open("src/components/auth/lamp-login.css", "r", encoding="utf-8") as f:
    content = f.read()

# Replace :root with #lamp-login-root
content = content.replace(":root {", "#lamp-login-root {")

# Replace [data-theme="..."] with #lamp-login-root[data-theme="..."]
content = re.sub(r'\[data-theme="([^"]+)"\]', r'#lamp-login-root[data-theme="\1"]', content)

# Remove any old welcome-card embedded styles from lamp-login.css to avoid dead code
# Find where welcome card was added
if "/* Welcome Post-Login Card" in content:
    idx = content.find("/* Welcome Post-Login Card")
    content = content[:idx]

# Scope .room, .lamp-side, button, etc. under #lamp-login-root
lines = content.split("\n")
scoped_lines = []

in_keyframes = False
for line in lines:
    stripped = line.strip()
    if "@keyframes" in stripped:
        in_keyframes = True
        scoped_lines.append(line)
        continue
    if in_keyframes:
        if stripped == "}":
            in_keyframes = False
        scoped_lines.append(line)
        continue
    
    # Check if selector line
    if stripped.endswith("{") and not stripped.startswith("@") and not stripped.startswith("#lamp-login-root"):
        selectors = stripped[:-1].split(",")
        new_selectors = []
        for s in selectors:
            s_clean = s.strip()
            if not s_clean:
                continue
            if s_clean.startswith("#lamp-login-root"):
                new_selectors.append(s_clean)
            else:
                new_selectors.append(f"#lamp-login-root {s_clean}")
        scoped_lines.append(",\n".join(new_selectors) + " {")
    else:
        scoped_lines.append(line)

scoped_css = "\n".join(scoped_lines)

with open("src/components/auth/lamp-login.css", "w", encoding="utf-8") as f:
    f.write(scoped_css)

print("Scoping complete. Total lines:", len(scoped_lines))
