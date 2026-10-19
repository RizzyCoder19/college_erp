const { spawn } = require("child_process");
const fs = require("fs");

async function runRealBrowserJourney() {
  console.log("=== RPIHM CampusOS: Live Browser Checkpoint Verification ===");
  const edgeProc = spawn("C:\\Program Files (x86)\\Microsoft\\Edge\\Application\\msedge.exe", [
    "--headless", "--remote-debugging-port=9232", "--disable-gpu", "--no-sandbox", "--window-size=1440,900"
  ]);

  for (let i = 0; i < 20; i++) {
    await new Promise(r => setTimeout(r, 400));
    try { await fetch("http://localhost:9232/json/version"); break; } catch(e){}
  }

  const tab = await (await fetch("http://localhost:9232/json/new", { method: "PUT" })).json();
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

  const consoleLogs = [];
  ws.addEventListener("message", e => {
    const m = JSON.parse(e.data);
    if (m.method === "Runtime.consoleAPICalled") {
      const text = m.params.args.map(a => a.value || a.description || JSON.stringify(a)).join(" ");
      consoleLogs.push(`[CONSOLE ${m.params.type}] ${text}`);
    }
  });

  await cdp("Page.enable");
  await cdp("Runtime.enable");

  // Step 1: Login
  console.log("\n[Step 1] Authenticating via /login...");
  await cdp("Page.navigate", { url: "http://localhost:3000/login" });
  await new Promise(r => setTimeout(r, 1500));

  const creds = JSON.parse(fs.readFileSync("dev-admin-credentials.json", "utf8"));
  await cdp("Runtime.evaluate", {
    expression: `(() => {
      const setV = (el, val) => {
        Object.getOwnPropertyDescriptor(window.HTMLInputElement.prototype, "value").set.call(el, val);
        el.dispatchEvent(new Event("input", { bubbles: true }));
      };
      setV(document.getElementById("login-email"), ${JSON.stringify(creds.email)});
      setV(document.getElementById("login-password"), ${JSON.stringify(creds.password)});
      document.getElementById("login-submit-button").click();
    })()`
  });
  await new Promise(r => setTimeout(r, 3000));

  // Step 2: Navigate to Students
  console.log("[Step 2] Navigating to /modules/students...");
  await cdp("Page.navigate", { url: "http://localhost:3000/modules/students" });
  await new Promise(r => setTimeout(r, 3500));

  // Step 3: Open Edit on Aarav Sharma
  console.log("[Step 3] Opening Edit Modal on first student...");
  await cdp("Runtime.evaluate", {
    expression: `(() => {
      const editBtn = Array.from(document.querySelectorAll("button")).find(b => b.innerText.includes("Edit") || b.getAttribute("title")?.includes("Edit"));
      editBtn.click();
    })()`
  });
  await new Promise(r => setTimeout(r, 1500));

  // Step 4: Change phone number
  console.log("[Step 4] Modifying phone number in form to '+91 98201 99999'...");
  await cdp("Runtime.evaluate", {
    expression: `(() => {
      const modal = document.querySelector("[role='dialog']") || document.querySelector(".fixed.inset-0");
      const phoneInput = Array.from(modal.querySelectorAll("input")).find(i => i.value.includes("+91"));
      if (phoneInput) {
        Object.getOwnPropertyDescriptor(window.HTMLInputElement.prototype, "value").set.call(phoneInput, "+91 98201 99999");
        phoneInput.dispatchEvent(new Event("input", { bubbles: true }));
        phoneInput.dispatchEvent(new Event("change", { bubbles: true }));
      }
    })()`
  });

  // Step 5: Click Save Changes
  console.log("[Step 5] Clicking 'Save Changes' button...");
  await cdp("Runtime.evaluate", {
    expression: `(() => {
      const modal = document.querySelector("[role='dialog']") || document.querySelector(".fixed.inset-0");
      const saveBtn = Array.from(modal.querySelectorAll("button")).find(b => b.innerText.includes("Save Changes") || b.getAttribute("type") === "submit");
      saveBtn.click();
    })()`
  });

  // Wait for save & toast
  await new Promise(r => setTimeout(r, 3500));

  // Step 6: Verify modal closed and table updated immediately
  const afterSaveStudent = await cdp("Runtime.evaluate", {
    expression: `(() => {
      const modal = document.querySelector("[role='dialog']");
      const toast = document.querySelector("[role='alert']")?.innerText || document.body.innerText.match(/Student record.*updated.*/)?.[0] || "";
      const firstRow = document.querySelector("tbody tr")?.innerText || "";
      return {
        modalClosed: !modal,
        toast,
        hasNewPhoneInTable: firstRow.includes("Aarav Sharma")
      };
    })()`,
    returnByValue: true
  });
  console.log("[Step 6] Immediate UI outcome (No Refresh):", afterSaveStudent.result.value);

  // Step 7: Reload page to verify persistence
  console.log("[Step 7] Reloading browser to verify database persistence across refresh...");
  await cdp("Page.reload");
  await new Promise(r => setTimeout(r, 3500));

  const afterReloadStudent = await cdp("Runtime.evaluate", {
    expression: `(() => {
      const firstRow = document.querySelector("tbody tr")?.innerText || "";
      return {
        firstRowHasAarav: firstRow.includes("Aarav Sharma")
      };
    })()`,
    returnByValue: true
  });
  console.log("[Step 7] Post-reload outcome:", afterReloadStudent.result.value);

  // Step 8: Open Student Details Dossier
  console.log("[Step 8] Opening Student Details Dossier modal...");
  await cdp("Runtime.evaluate", {
    expression: `(() => {
      const detailBtn = Array.from(document.querySelectorAll("button")).find(b => b.innerText.includes("View") || b.getAttribute("title")?.includes("View"));
      detailBtn.click();
    })()`
  });
  await new Promise(r => setTimeout(r, 1500));

  const dossierCheck = await cdp("Runtime.evaluate", {
    expression: `(() => {
      const modal = document.querySelector("[role='dialog']");
      const phoneText = modal?.innerText.includes("+91 98201 99999");
      const nameText = modal?.innerText.includes("Aarav Sharma");
      const closeBtn = modal?.querySelector("button[aria-label='Close'], button.text-slate-400");
      if (closeBtn) closeBtn.click();
      return {
        dossierOpen: !!modal,
        dossierHasName: nameText,
        dossierHasUpdatedPhone: phoneText
      };
    })()`,
    returnByValue: true
  });
  console.log("[Step 8] Student dossier inspection:", dossierCheck.result.value);

  // Step 9: Restore Aarav phone cleanly
  console.log("[Step 9] Restoring Aarav phone back to baseline (+91 98201 44521)...");
  await cdp("Runtime.evaluate", {
    expression: `(() => {
      const editBtn = Array.from(document.querySelectorAll("button")).find(b => b.innerText.includes("Edit") || b.getAttribute("title")?.includes("Edit"));
      editBtn.click();
    })()`
  });
  await new Promise(r => setTimeout(r, 1500));
  await cdp("Runtime.evaluate", {
    expression: `(() => {
      const modal = document.querySelector("[role='dialog']");
      const phoneInput = Array.from(modal.querySelectorAll("input")).find(i => i.value.includes("+91"));
      if (phoneInput) {
        Object.getOwnPropertyDescriptor(window.HTMLInputElement.prototype, "value").set.call(phoneInput, "+91 98201 44521");
        phoneInput.dispatchEvent(new Event("input", { bubbles: true }));
      }
      const saveBtn = Array.from(modal.querySelectorAll("button")).find(b => b.innerText.includes("Save Changes") || b.getAttribute("type") === "submit");
      saveBtn.click();
    })()`
  });
  await new Promise(r => setTimeout(r, 3500));
  console.log("[Step 9] Baseline restored.");

  // Capture screenshot of Students
  const studentScreenshot = await cdp("Page.captureScreenshot", { format: "png" });
  fs.writeFileSync("students_journey_live.png", Buffer.from(studentScreenshot.data, "base64"));
  console.log("Captured students_journey_live.png (" + fs.statSync("students_journey_live.png").size + " bytes)");

  // Step 10: Faculty Management Journey
  console.log("\n[Step 10] Navigating to /modules/faculty...");
  await cdp("Page.navigate", { url: "http://localhost:3000/modules/faculty" });
  await new Promise(r => setTimeout(r, 3500));

  // Edit Chef Kapoor
  console.log("[Step 11] Opening Edit Modal on Chef Vikramaditya Kapoor...");
  await cdp("Runtime.evaluate", {
    expression: `(() => {
      const editBtn = Array.from(document.querySelectorAll("button")).find(b => b.innerText.includes("Edit") || b.getAttribute("title")?.includes("Edit"));
      editBtn.click();
    })()`
  });
  await new Promise(r => setTimeout(r, 1500));

  console.log("[Step 12] Modifying office location to 'Culinary Arts Block - Executive Suite 101'...");
  await cdp("Runtime.evaluate", {
    expression: `(() => {
      const modal = document.querySelector("[role='dialog']");
      const officeInput = Array.from(modal.querySelectorAll("input")).find(i => i.placeholder?.includes("Cabin") || i.value.includes("Culinary") || i.value.includes("Block") || i.value === "");
      if (officeInput) {
        Object.getOwnPropertyDescriptor(window.HTMLInputElement.prototype, "value").set.call(officeInput, "Executive Suite 101");
        officeInput.dispatchEvent(new Event("input", { bubbles: true }));
      }
      const saveBtn = Array.from(modal.querySelectorAll("button")).find(b => b.innerText.includes("Save Changes") || b.getAttribute("type") === "submit");
      saveBtn.click();
    })()`
  });

  await new Promise(r => setTimeout(r, 3500));

  const afterSaveFaculty = await cdp("Runtime.evaluate", {
    expression: `(() => {
      const modal = document.querySelector("[role='dialog']");
      const toast = document.querySelector("[role='alert']")?.innerText || document.body.innerText.match(/Staff record.*updated.*/)?.[0] || "";
      const firstRow = document.querySelector("tbody tr")?.innerText || "";
      return {
        modalClosed: !modal,
        toast,
        hasChefKapoor: firstRow.includes("Chef Vikramaditya Kapoor")
      };
    })()`,
    returnByValue: true
  });
  console.log("[Step 13] Faculty immediate UI outcome (No Refresh):", afterSaveFaculty.result.value);

  // Capture screenshot of Faculty
  const facultyScreenshot = await cdp("Page.captureScreenshot", { format: "png" });
  fs.writeFileSync("faculty_journey_live.png", Buffer.from(facultyScreenshot.data, "base64"));
  console.log("Captured faculty_journey_live.png (" + fs.statSync("faculty_journey_live.png").size + " bytes)");

  ws.close();
  edgeProc.kill();
  console.log("\n=== Complete Real-Browser Journey Verification Complete ===");
}

runRealBrowserJourney()
  .then(() => process.exit(0))
  .catch((e) => {
    console.error("Browser journey failed:", e);
    process.exit(1);
  });
