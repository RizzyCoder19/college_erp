const { spawn } = require("child_process");
const fs = require("fs");

async function testFormInit() {
  const edgeProc = spawn("C:\\Program Files (x86)\\Microsoft\\Edge\\Application\\msedge.exe", [
    "--headless", "--remote-debugging-port=9238", "--disable-gpu", "--no-sandbox"
  ]);

  for (let i = 0; i < 20; i++) {
    await new Promise(r => setTimeout(r, 400));
    try { await fetch("http://localhost:9238/json/version"); break; } catch(e){}
  }

  const tab = await (await fetch("http://localhost:9238/json/new", { method: "PUT" })).json();
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
  await new Promise(r => setTimeout(r, 1500));
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
  for (let i = 0; i < 15; i++) {
    await new Promise(r => setTimeout(r, 400));
    const loc = await cdp("Runtime.evaluate", { expression: "window.location.href", returnByValue: true });
    if (loc.result.value && !loc.result.value.includes("/login")) break;
  }

  // Navigate to students
  await cdp("Page.navigate", { url: "http://localhost:3000/modules/students" });
  await new Promise(r => setTimeout(r, 3500));

  // Test 1: Click Edit on Row 1
  const editRow1 = await cdp("Runtime.evaluate", {
    expression: `(() => {
      const editButtons = Array.from(document.querySelectorAll("button[title='Edit Record']"));
      if (editButtons.length > 0) editButtons[0].click();
      return { clicked: editButtons.length > 0 };
    })()`,
    returnByValue: true
  });
  console.log("Clicked Edit Row 1:", editRow1.result.value);
  await new Promise(r => setTimeout(r, 1000));

  const modal1Data = await cdp("Runtime.evaluate", {
    expression: `(() => {
      const modal = document.querySelector("[role='dialog']");
      if (!modal) return { open: false };
      const nameInput = modal.querySelector("input[value]") || modal.querySelectorAll("input")[0];
      const prnInput = modal.querySelectorAll("input")[1];
      const closeBtn = modal.querySelector("button[aria-label='Close']") || Array.from(modal.querySelectorAll("button")).find(b => b.innerText === "Cancel");
      const nameVal = nameInput?.value;
      const prnVal = prnInput?.value;
      if (closeBtn) closeBtn.click();
      return { open: true, nameVal, prnVal };
    })()`,
    returnByValue: true
  });
  console.log("Modal 1 (Record 1 Edit):", modal1Data.result.value);
  await new Promise(r => setTimeout(r, 1000));

  // Test 2: Click Edit on Row 2
  const editRow2 = await cdp("Runtime.evaluate", {
    expression: `(() => {
      const editButtons = Array.from(document.querySelectorAll("button[title='Edit Record']"));
      if (editButtons.length > 1) editButtons[1].click();
      return { clicked: editButtons.length > 1 };
    })()`,
    returnByValue: true
  });
  console.log("Clicked Edit Row 2:", editRow2.result.value);
  await new Promise(r => setTimeout(r, 1000));

  const modal2Data = await cdp("Runtime.evaluate", {
    expression: `(() => {
      const modal = document.querySelector("[role='dialog']");
      if (!modal) return { open: false };
      const nameInput = modal.querySelector("input[value]") || modal.querySelectorAll("input")[0];
      const prnInput = modal.querySelectorAll("input")[1];
      const closeBtn = modal.querySelector("button[aria-label='Close']") || Array.from(modal.querySelectorAll("button")).find(b => b.innerText === "Cancel");
      const nameVal = nameInput?.value;
      const prnVal = prnInput?.value;
      if (closeBtn) closeBtn.click();
      return { open: true, nameVal, prnVal };
    })()`,
    returnByValue: true
  });
  console.log("Modal 2 (Record 2 Edit):", modal2Data.result.value);
  await new Promise(r => setTimeout(r, 1000));

  // Test 3: Click 'Enroll New Student' (Add Mode)
  const clickNew = await cdp("Runtime.evaluate", {
    expression: `(() => {
      const addBtn = Array.from(document.querySelectorAll("button")).find(b => b.innerText.includes("Enroll New Student"));
      if (addBtn) addBtn.click();
      return { clicked: Boolean(addBtn) };
    })()`,
    returnByValue: true
  });
  console.log("Clicked Enroll New Student:", clickNew.result.value);
  await new Promise(r => setTimeout(r, 1000));

  const modalAddData = await cdp("Runtime.evaluate", {
    expression: `(() => {
      const modal = document.querySelector("[role='dialog']");
      if (!modal) return { open: false };
      const nameInput = modal.querySelectorAll("input")[0];
      const prnInput = modal.querySelectorAll("input")[1];
      const closeBtn = modal.querySelector("button[aria-label='Close']") || Array.from(modal.querySelectorAll("button")).find(b => b.innerText === "Cancel");
      const nameVal = nameInput?.value;
      const prnVal = prnInput?.value;
      if (closeBtn) closeBtn.click();
      return { open: true, nameVal, prnVal };
    })()`,
    returnByValue: true
  });
  console.log("Modal Add (Fresh):", modalAddData.result.value);

  ws.close();
  edgeProc.kill();
}

testFormInit().then(() => process.exit(0)).catch(e => {
  console.error("Test failed:", e);
  process.exit(1);
});
