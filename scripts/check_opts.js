const { spawn } = require("child_process");
const fs = require("fs");

async function checkOptions() {
  const edgeProc = spawn("C:\\Program Files (x86)\\Microsoft\\Edge\\Application\\msedge.exe", [
    "--headless", "--remote-debugging-port=9234", "--disable-gpu", "--no-sandbox"
  ]);

  for (let i = 0; i < 20; i++) {
    await new Promise(r => setTimeout(r, 400));
    try { await fetch("http://localhost:9234/json/version"); break; } catch(e){}
  }

  const tab = await (await fetch("http://localhost:9234/json/new", { method: "PUT" })).json();
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

  await cdp("Page.navigate", { url: "http://localhost:3000/modules/students" });
  await new Promise(r => setTimeout(r, 3500));

  const opts = await cdp("Runtime.evaluate", {
    expression: `(() => {
      const progSelect = Array.from(document.querySelectorAll("select")).find(s => {
        return Array.from(s.options).some(o => o.text.includes("All Programmes"));
      });
      return Array.from(progSelect.options).map(o => ({ value: o.value, text: o.text }));
    })()`,
    returnByValue: true
  });

  console.log("Rendered Programme Options in Browser:", opts.result.value);

  ws.close();
  edgeProc.kill();
}
checkOptions();
