with open("scripts/test_milestone5_examinations.ts", "r", encoding="utf-8") as f:
    test = f.read()

test = test.replace("const componentId = compRes.data?.id;", "const componentId = compRes.data!.id;")

with open("scripts/test_milestone5_examinations.ts", "w", encoding="utf-8") as f:
    f.write(test)
print("Updated componentId to non-null")
