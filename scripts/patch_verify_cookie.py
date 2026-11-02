# -*- coding: utf-8 -*-
with open(r"G:\rpihm-campusos\scripts\verify_milestone3_3_full.ts", "r", encoding="utf-8") as f:
    content = f.read()

target1 = """  await cdp("Page.enable");
  await cdp("Runtime.enable");"""

replacement1 = """  await cdp("Page.enable");
  await cdp("Runtime.enable");
  await cdp("Network.enable");"""

assert target1 in content, "target1 not found"
content = content.replace(target1, replacement1, 1)

target2 = """  // --- Step 4.1: Log in as the Newly Provisioned ACADEMIC_ADMIN ---
  console.log("\\n--- TEST 4: Authenticating as Provisioned ACADEMIC_ADMIN ---");
  await cdp("Page.navigate", { url: "http://localhost:3000/login" });"""

replacement2 = """  // --- Step 4.1: Log in as the Newly Provisioned ACADEMIC_ADMIN ---
  console.log("\\n--- TEST 4: Authenticating as Provisioned ACADEMIC_ADMIN ---");
  await cdp("Network.clearBrowserCookies");
  await cdp("Page.navigate", { url: "http://localhost:3000/login" });"""

assert target2 in content, "target2 not found"
content = content.replace(target2, replacement2, 1)

target3 = """  // --- Step 4.3: Switch to SYSTEM_ADMIN and inspect Khushali Sharma Row & Provisioning Modal ---
  console.log("\\n--- TEST 6: System Admin Faculty Directory & Khushali Sharma Modal Inspection ---");
  await cdp("Page.navigate", { url: "http://localhost:3000/login" });"""

replacement3 = """  // --- Step 4.3: Switch to SYSTEM_ADMIN and inspect Khushali Sharma Row & Provisioning Modal ---
  console.log("\\n--- TEST 6: System Admin Faculty Directory & Khushali Sharma Modal Inspection ---");
  await cdp("Network.clearBrowserCookies");
  await cdp("Page.navigate", { url: "http://localhost:3000/login" });"""

assert target3 in content, "target3 not found"
content = content.replace(target3, replacement3, 1)

with open(r"G:\rpihm-campusos\scripts\verify_milestone3_3_full.ts", "w", encoding="utf-8") as f:
    f.write(content)
print("verify_milestone3_3_full.ts patched with Network.clearBrowserCookies")
