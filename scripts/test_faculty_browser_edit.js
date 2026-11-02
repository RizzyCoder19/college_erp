const { PrismaClient } = require("@prisma/client");
const prisma = new PrismaClient();
const fs = require("fs");
const { spawn } = require("child_process");

async function testFacultyEdit() {
  console.log("=== Testing Faculty Browser Edit ===");
  const chefBefore = await prisma.staff.findFirst({ where: { employeeId: "RPIHM-FAC-012" } });
  console.log("Chef Vikramaditya before:", { id: chefBefore.id, name: chefBefore.fullName, phone: chefBefore.phone });

  const edgePath = "C:\\Program Files (x86)\\Microsoft\\Edge\\Application\\msedge.exe";
  const edgePort = 9445;
  const tempProfileDir = "G:\\rpihm-campusos\\temp_edge_fac";

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

  // Navigate to Faculty
  await cdp("Page.navigate", { url: "http://localhost:3000/modules/faculty" });
  await new Promise(r => setTimeout(r, 2500));

  // Click Edit on Chef Vikramaditya Kapoor
  const openChefEdit = await cdp("Runtime.evaluate", {
    expression: `(() => {
      const rows = Array.from(document.querySelectorAll("table tbody tr"));
      const chefRow = rows.find(r => r.innerText.includes("Chef Vikramaditya Kapoor"));
      if (!chefRow) return "Chef row not found";
      const editBtn = chefRow.querySelector("button[title='Edit Record']");
      if (!editBtn) return "Edit button not found";
      editBtn.click();
      return "Clicked edit button";
    })()`,
    returnByValue: true
  });
  console.log("Open Chef edit modal:", openChefEdit.result.value);
  await new Promise(r => setTimeout(r, 1500));

  // Change phone number & click Save
  const submitChefEdit = await cdp("Runtime.evaluate", {
    expression: `(() => {
      const modal = document.querySelector(".fixed.inset-0.z-50");
      if (!modal) return "No modal";
      const phoneInput = Array.from(modal.querySelectorAll("input")).find(i => i.placeholder.includes("98200") || i.value.includes("+91"));
      if (!phoneInput) return "Phone input not found";
      
      Object.getOwnPropertyDescriptor(window.HTMLInputElement.prototype, "value").set.call(phoneInput, "+91 98201 99999");
      phoneInput.dispatchEvent(new Event("input", { bubbles: true }));
      phoneInput.dispatchEvent(new Event("change", { bubbles: true }));

      const saveBtn = Array.from(modal.querySelectorAll("button")).find(b => b.innerText.includes("Save"));
      if (!saveBtn) return "Save button not found";
      saveBtn.click();
      return "Save clicked";
    })()`,
    returnByValue: true
  });
  console.log("Submit Chef edit:", submitChefEdit.result.value);
  await new Promise(r => setTimeout(r, 2500));

  // Check DB for Chef Vikramaditya Kapoor
  const chefAfter = await prisma.staff.findFirst({ where: { employeeId: "RPIHM-FAC-012" } });
  console.log("Chef after in DB:", { id: chefAfter.id, name: chefAfter.fullName, phone: chefAfter.phone });
  console.log("Did Chef phone persist in DB?:", chefAfter.phone === "+91 98201 99999");

  // Revert Chef phone
  await prisma.staff.update({
    where: { id: chefBefore.id },
    data: { phone: chefBefore.phone }
  });

  ws.close();
  edgeProc.kill();
  await prisma.$disconnect();
  try { fs.rmSync(tempProfileDir, { recursive: true, force: true }); } catch(e){}
}

testFacultyEdit().catch(console.error);
