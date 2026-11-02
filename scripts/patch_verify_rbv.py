with open(r"G:\rpihm-campusos\scripts\verify_milestone3_3_full.ts", "r", encoding="utf-8") as f:
    content = f.read()

content = content.replace('await cdp("Runtime.evaluate", {', 'await cdp("Runtime.evaluate", { returnByValue: true,')

with open(r"G:\rpihm-campusos\scripts\verify_milestone3_3_full.ts", "w", encoding="utf-8") as f:
    f.write(content)
print("verify_milestone3_3_full.ts patched with returnByValue: true")
