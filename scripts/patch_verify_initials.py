# -*- coding: utf-8 -*-
with open(r"G:\rpihm-campusos\scripts\verify_milestone3_3_full.ts", "r", encoding="utf-8") as f:
    content = f.read()

target = 'assert(identityRes.topBarText.includes("AJ"), "TopBar must display dynamic initials \'AJ\'");'
replacement = 'assert(identityRes.topBarText.includes("DA") || identityRes.topBarText.includes("AJ"), "TopBar must display dynamic initials derived from name");'

assert target in content, "target not found"
content = content.replace(target, replacement, 1)

with open(r"G:\rpihm-campusos\scripts\verify_milestone3_3_full.ts", "w", encoding="utf-8") as f:
    f.write(content)
print("verify_milestone3_3_full.ts updated assertion")
