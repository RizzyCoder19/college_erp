const { PrismaClient } = require("@prisma/client");
const prisma = new PrismaClient();
const fs = require("fs");
const { spawn } = require("child_process");

async function reproduce() {
  console.log("=== STEP 1: Check Baseline in DB ===");
  const rohanBefore = await prisma.student.findFirst({ where: { prn: "2025IT112" } });
  console.log("Rohan before:", { id: rohanBefore.id, name: rohanBefore.fullName, phone: rohanBefore.phone });

  const komalBefore = await prisma.student.findFirst({ where: { prn: "2026DS042" } });
  console.log("Komal before:", { id: komalBefore.id, name: komalBefore.fullName, phone: komalBefore.phone });

  console.log("\n=== STEP 2: Launch Headless Edge & Login ===");
  const edgePath = "C:\\Program Files (x86)\\Microsoft\\Edge\\Application\\msedge.exe";
  const edgePort = 9444;
  const tempProfileDir = "G:\\rpihm-campusos\\temp_edge_reproduce";

  const edgeProc = spawn(edgePath, [
    "--headless",
    `--remote-debugging-port=${edgePort}`,
    `--user-data-dir=${tempProfileDir}`,
    "--disable-gpu",
    "--no-sandbox",
    "--window-size=1440,900"
  ]);

  for (let i = 0; i < 25; i++) {
    await new Promise(r => setTimeout(r, 400));
    try { await fetch(`http://localhost:${edgePort}/json/version`); break; } catch(e){}
  }

  const tab = await (await fetch(`http://localhost:${edgePort}/json/new`, { method: "PUT" })).json();
  const ws = new WebSocket(tab.webSocketDebuggerUrl);
  await new Promise(r => ws.addEventListener("open", r));

  function cdp(method, params = {}) {
    return new Promise((res, rej) => {
      const id = Math.floor(Math.random() * 1e6);
      const h = e => {
        const m = JSON.parse(e.data);
        if (m.id === id) { ws.removeEventListener("message", h); m.error ? rej(m.error) : res(m.result); }
      };
      ws.addEventListener("message", h);
      ws.send(JSON.stringify({ id, method, params }));
    });
  }

  await cdp("Page.enable");
  await cdp("Runtime.enable");

  // Login
  await cdp("Page.navigate", { url: "http://localhost:3000/login" });
  await new Promise(r => setTimeout(r, 2000));

  const creds = JSON.parse(fs.readFileSync("dev-admin-credentials.json", "utf8"));
  await cdp("Runtime.evaluate", {
    expression: `(() => {
      const setV = (el, val) => {
        Object.getOwnPropertyDescriptor(window.HTMLInputElement.prototype, "value").set.call(el, val);
        el.dispatchEvent(new Event("input", { bubbles: true }));
        el.dispatchEvent(new Event("change", { bubbles: true }));
      };
      setV(document.getElementById("login-email"), ${JSON.stringify(creds.email)});
      setV(document.getElementById("login-password"), ${JSON.stringify(creds.password)});
      document.getElementById("login-submit-button").click();
    })()`
  });
  await new Promise(r => setTimeout(r, 2000));

  // Navigate to Students
  console.log("\n=== STEP 3: Navigate to /modules/students ===");
  await cdp("Page.navigate", { url: "http://localhost:3000/modules/students" });
  await new Promise(r => setTimeout(r, 2500));

  // Try to Edit Rohan K. Verma
  console.log("\n=== STEP 4: Attempt Edit on Rohan K. Verma (2025IT112) ===");
  const openRohanEdit = await cdp("Runtime.evaluate", {
    expression: `(() => {
      const rows = Array.from(document.querySelectorAll("table tbody tr"));
      const rohanRow = rows.find(r => r.innerText.includes("Rohan K. Verma"));
      if (!rohanRow) return "Rohan row not found";
      const editBtn = rohanRow.querySelector("button[title='Edit Record']");
      if (!editBtn) return "Edit button not found";
      editBtn.click();
      return "Clicked edit button";
    })()`,
    returnByValue: true
  });
  console.log("Open Rohan edit modal:", openRohanEdit.result.value);
  await new Promise(r => setTimeout(r, 1500));

  // Check modal content & change phone
  const modalText = await cdp("Runtime.evaluate", {
    expression: `document.querySelector(".fixed.inset-0.z-50")?.innerText || "No modal found"`,
    returnByValue: true
  });
  console.log("Modal rendered for Rohan:", modalText.result.value.includes("Edit Dossier: Rohan K. Verma"));

  // Change phone number & click Save
  const submitRohanEdit = await cdp("Runtime.evaluate", {
    expression: `(() => {
      const modal = document.querySelector(".fixed.inset-0.z-50");
      if (!modal) return "No modal";
      const phoneInput = Array.from(modal.querySelectorAll("input")).find(i => i.placeholder.includes("98000") || i.type === "tel");
      if (!phoneInput) return "Phone input not found";
      
      Object.getOwnPropertyDescriptor(window.HTMLInputElement.prototype, "value").set.call(phoneInput, "+91 97180 77777");
      phoneInput.dispatchEvent(new Event("input", { bubbles: true }));
      phoneInput.dispatchEvent(new Event("change", { bubbles: true }));

      const saveBtn = Array.from(modal.querySelectorAll("button")).find(b => b.innerText.includes("Save"));
      if (!saveBtn) return "Save button not found";
      saveBtn.click();
      return "Save clicked";
    })()`,
    returnByValue: true
  });
  console.log("Submit Rohan edit:", submitRohanEdit.result.value);
  await new Promise(r => setTimeout(r, 2500));

  // Check DB for Rohan
  const rohanAfter = await prisma.student.findFirst({ where: { prn: "2025IT112" } });
  console.log("Rohan after:", { id: rohanAfter.id, name: rohanAfter.fullName, phone: rohanAfter.phone });
  console.log("Did Rohan's phone change in DB?:", rohanAfter.phone === "+91 97180 77777");

  // Revert Rohan in DB
  await prisma.student.update({
    where: { id: rohanBefore.id },
    data: { phone: rohanBefore.phone }
  });

  // Try to Edit Komal Soni
  console.log("\n=== STEP 5: Attempt Edit on Komal Soni (2026DS042) ===");
  // Clear search or search for Komal
  await cdp("Runtime.evaluate", {
    expression: `(() => {
      const input = document.getElementById("student-search-input");
      if (input) {
        Object.getOwnPropertyDescriptor(window.HTMLInputElement.prototype, "value").set.call(input, "Komal");
        input.dispatchEvent(new Event("input", { bubbles: true }));
        input.dispatchEvent(new Event("change", { bubbles: true }));
      }
    })()`
  });
  await new Promise(r => setTimeout(r, 1000));

  const openKomalEdit = await cdp("Runtime.evaluate", {
    expression: `(() => {
      const rows = Array.from(document.querySelectorAll("table tbody tr"));
      const komalRow = rows.find(r => r.innerText.includes("Komal Soni"));
      if (!komalRow) return "Komal row not found";
      const editBtn = komalRow.querySelector("button[title='Edit Record']");
      if (!editBtn) return "Edit button not found";
      editBtn.click();
      return "Clicked Komal edit button";
    })()`,
    returnByValue: true
  });
  console.log("Open Komal edit modal:", openKomalEdit.result.value);
  await new Promise(r => setTimeout(r, 1500));

  // Change Komal phone number & click Save
  const submitKomalEdit = await cdp("Runtime.evaluate", {
    expression: `(() => {
      const modal = document.querySelector(".fixed.inset-0.z-50");
      if (!modal) return "No modal";
      const phoneInput = Array.from(modal.querySelectorAll("input")).find(i => i.placeholder.includes("98000") || i.type === "tel");
      if (!phoneInput) return "Phone input not found";
      
      Object.getOwnPropertyDescriptor(window.HTMLInputElement.prototype, "value").set.call(phoneInput, "+91 98922 77777");
      phoneInput.dispatchEvent(new Event("input", { bubbles: true }));
      phoneInput.dispatchEvent(new Event("change", { bubbles: true }));

      const saveBtn = Array.from(modal.querySelectorAll("button")).find(b => b.innerText.includes("Save"));
      if (!saveBtn) return "Save button not found";
      saveBtn.click();
      return "Save clicked";
    })()`,
    returnByValue: true
  });
  console.log("Submit Komal edit:", submitKomalEdit.result.value);
  await new Promise(r => setTimeout(r, 2500));

  // Check what modal says (error?)
  const komalModalText = await cdp("Runtime.evaluate", {
    expression: `document.querySelector(".fixed.inset-0.z-50")?.innerText || "Modal closed"`,
    returnByValue: true
  });
  console.log("Komal modal state after save:", komalModalText.result.value.includes("Error") || komalModalText.result.value.includes("Division") ? "ERROR DISPLAYED: " + komalModalText.result.value.split("\n").filter(l => l.includes("Division") || l.includes("Error") || l.includes("Semester")) : "Modal dismissed or success");

  const komalAfter = await prisma.student.findFirst({ where: { prn: "2026DS042" } });
  console.log("Komal after:", { id: komalAfter.id, name: komalAfter.fullName, phone: komalAfter.phone });
  console.log("Did Komal's phone change in DB?:", komalAfter.phone === "+91 98922 77777");

  ws.close();
  edgeProc.kill();
  await prisma.$disconnect();
  try { fs.rmSync(tempProfileDir, { recursive: true, force: true }); } catch(e){}
}

reproduce().catch(console.error);
