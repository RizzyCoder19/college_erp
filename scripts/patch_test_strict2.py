with open("scripts/test_milestone5_examinations.ts", "r", encoding="utf-8") as f:
    test = f.read()

test = test.replace("const sessionId = sessionRes.data?.id;", "const sessionId = sessionRes.data!.id;")
test = test.replace("sessionId = sessionRes.data!.id;", "const sessionId = sessionRes.data!.id;")
test = test.replace("const componentId = componentRes.data?.id;", "const componentId = componentRes.data!.id;")
test = test.replace("componentId = componentRes.data!.id;", "const componentId = componentRes.data!.id;")
test = test.replace("assert(calculatedA && calculatedA.sgpa > 0,", "assert(Boolean(calculatedA && calculatedA.sgpa > 0),")

with open("scripts/test_milestone5_examinations.ts", "w", encoding="utf-8") as f:
    f.write(test)
print("Updated test_milestone5_examinations.ts with strict types")
