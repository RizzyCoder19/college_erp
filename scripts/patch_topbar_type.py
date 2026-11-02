# -*- coding: utf-8 -*-
with open(r"G:\rpihm-campusos\src\components\layout\TopBar.tsx", "r", encoding="utf-8") as f:
    content = f.read()

target = 'const [currentUser, setCurrentUser] = useState<{ fullName: string; role: string } | null>(null);'
replacement = 'const [currentUser, setCurrentUser] = useState<{ fullName: string; role: string; designation?: string | null } | null>(null);'

assert target in content, "target not found"
content = content.replace(target, replacement, 1)

with open(r"G:\rpihm-campusos\src\components\layout\TopBar.tsx", "w", encoding="utf-8") as f:
    f.write(content)
print("TopBar.tsx patched successfully")
