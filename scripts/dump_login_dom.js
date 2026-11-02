const { spawn } = require('child_process');
const path = require('path');

async function dumpDom() {
  const edgePort = 9494;
  const tempProfileDir = path.resolve('temp_edge_dump');
  const edgeProc = spawn('C:\\Program Files (x86)\\Microsoft\\Edge\\Application\\msedge.exe', [
    '--headless',
    '--remote-debugging-port=' + edgePort,
    '--user-data-dir=' + tempProfileDir,
    '--disable-gpu',
    '--no-sandbox',
  ]);

  for (let i = 0; i < 30; i++) {
    await new Promise(r => setTimeout(r, 300));
    try {
      const res = await fetch(`http://localhost:${edgePort}/json/version`);
      if (res.ok) break;
    } catch {}
  }

  const tab = await (await fetch(`http://localhost:${edgePort}/json/new`, { method: 'PUT' })).json();
  const ws = new WebSocket(tab.webSocketDebuggerUrl);
  await new Promise(r => ws.addEventListener('open', r));

  function cdp(method, params = {}) {
    return new Promise((res, rej) => {
      const id = Math.floor(Math.random() * 1e6);
      const h = (e) => {
        const m = JSON.parse(e.data);
        if (m.id === id) {
          ws.removeEventListener('message', h);
          m.error ? rej(m.error) : res(m.result);
        }
      };
      ws.addEventListener('message', h);
      ws.send(JSON.stringify({ id, method, params }));
    });
  }

  await cdp('Page.navigate', { url: 'http://localhost:3001/login' });
  await new Promise(r => setTimeout(r, 2000));

  const info = await cdp('Runtime.evaluate', {
    expression: `
      (() => {
        const inputs = Array.from(document.querySelectorAll('input')).map(i => ({ id: i.id, type: i.type, name: i.name, placeholder: i.placeholder, className: i.className }));
        const buttons = Array.from(document.querySelectorAll('button')).map(b => ({ className: b.className, text: b.innerText, type: b.type }));
        const forms = Array.from(document.querySelectorAll('form')).map(f => ({ className: f.className, id: f.id }));
        return { inputs, buttons, forms, bodyText: document.body.innerText.slice(0, 300) };
      })()
    `,
    returnByValue: true,
  });
  console.log("DOM Elements:", JSON.stringify(info.result.value, null, 2));

  ws.close();
  edgeProc.kill();
}

dumpDom().catch(console.error);
