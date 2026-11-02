const { spawn } = require("child_process");
const fs = require("fs");

async function test() {
  const edgeProc = spawn("C:\\Program Files (x86)\\Microsoft\\Edge\\Application\\msedge.exe", [
    "--headless", "--remote-debugging-port=9235", "--disable-gpu", "--no-sandbox"
  ]);
  for (let i = 0; i < 20; i++) {
    await new Promise(r => setTimeout(r, 300));
    try { await fetch("http://localhost:9235/json/version"); break; } catch(e){}
  }
  const tab = await (await fetch("http://localhost:9235/json/new", { method: "PUT" })).json();
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

  await cdp("Page.navigate", { url: "http://localhost:3000/login" });
  await new Promise(r => setTimeout(r, 2000));

  const creds = JSON.parse(fs.readFileSync("dev-admin-credentials.json", "utf8"));
  console.log("Logging in as:", creds.email);
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

  // Wait for navigation / redirect
  for (let i = 0; i < 15; i++) {
    await new Promise(r => setTimeout(r, 500));
    const info = await cdp("Runtime.evaluate", {
      expression: "({ url: window.location.href, title: document.title, body: document.body.innerText.slice(0, 100) })",
      returnByValue: true
    });
    console.log("Poll", i, info.result.value);
    if (!info.result.value.url.includes("/login")) break;
  }

  // Navigate to students
  await cdp("Page.navigate", { url: "http://localhost:3000/modules/students" });
  await new Promise(r => setTimeout(r, 4000));
  const stdInfo = await cdp("Runtime.evaluate", {
    expression: "({ url: window.location.href, title: document.title, selects: document.querySelectorAll('select').length, rows: document.querySelectorAll('tbody tr').length })",
    returnByValue: true
  });
  console.log("Students page info:", stdInfo.result.value);

  ws.close();
  edgeProc.kill();
}
test().catch(console.error);
