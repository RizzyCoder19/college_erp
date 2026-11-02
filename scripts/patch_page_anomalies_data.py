with open("src/app/page.tsx", "r", encoding="utf-8") as f:
    content = f.read()

target = "const anomalies = anomaliesRes.success && anomaliesRes.data ? anomaliesRes.data : [];"
replacement = "const anomalies = anomaliesRes.success && anomaliesRes.data?.anomalies ? anomaliesRes.data.anomalies : [];"

if target in content:
    content = content.replace(target, replacement, 1)
    with open("src/app/page.tsx", "w", encoding="utf-8") as f:
        f.write(content)
    print("SUCCESS: Updated src/app/page.tsx")
else:
    print("Target not found in src/app/page.tsx")
