with open("scripts/test_milestone5_examinations.ts", "r", encoding="utf-8") as f:
    test = f.read()

test = test.replace("const const sessionId", "const sessionId")
test = test.replace("const const componentId", "const componentId")

with open("scripts/test_milestone5_examinations.ts", "w", encoding="utf-8") as f:
    f.write(test)
print("Fixed duplicate const in test script")
