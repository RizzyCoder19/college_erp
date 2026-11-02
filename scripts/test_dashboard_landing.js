const fs = require('fs');
const path = require('path');
const { spawn } = require('child_process');

async function testTiming() {
  const edgePath = 'C:\\Program Files (x86)\\Microsoft\\Edge\\Application\\msedge.exe';
  const edgePort = 9492;
  const tempProfileDir = path.resolve('temp_edge_timing');

  const edgeProc = spawn(edgePath, [
    '--headless',
    '--remote-debugging-port=' + edgePort,
    '--user-data-dir=' + tempProfileDir,
    '--disable-gpu',
    '--no-sandbox',
    '--window-size=1440,900',
  ]);

  for (let i = 0; i < 30; i++) {
    await new Promise(r => setTimeout(r, 300));
    try {
      const res = await fetch('http://localhost:' + edgePort + '/json/version');
      if (res.ok) break;
    } catch {}
  }

  const tab = await (await fetch('http://localhost:' + edgePort + '/json/new', { method: 'PUT' })).json();
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

  await cdp('Page.enable');
  await cdp('Runtime.enable');
  await cdp('Network.enable');

  await cdp('Network.clearBrowserCookies');
  await cdp('Page.navigate', { url: 'http://localhost:3000/login' });
  await new Promise(r => setTimeout(r, 1500));

  // Turn on lamp
  await cdp('Runtime.evaluate', {
    expression: 'document.querySelector(".string-handle").dispatchEvent(new KeyboardEvent("keydown", { key: "Enter", bubbles: true }))'
  });
  await new Promise(r => setTimeout(r, 800));

  // Login
  await cdp('Runtime.evaluate', {
    expression: `(() => {
      const setV = (el, val) => {
        if (!el) return;
        Object.getOwnPropertyDescriptor(window.HTMLInputElement.prototype, 'value').set.call(el, val);
        el.dispatchEvent(new Event('input', { bubbles: true }));
        el.dispatchEvent(new Event('change', { bubbles: true }));
      };
      setV(document.querySelector('#login-email'), 'k.sharma@sample.rpihm.ac.in');
      setV(document.querySelector('#login-password'), 'RpihmHOD_8YfWdRrq9!');
      document.querySelector('#login-submit-button').click();
    })()`
  });

  // Wait 3.8 seconds for complete welcome transition + Next.js router.push('/') to land on dashboard
  console.log('Waiting for welcome transition and landing...');
  await new Promise(r => setTimeout(r, 3800));

  const pageInfo = await cdp('Runtime.evaluate', {
    expression: `(() => {
      return {
        url: window.location.href,
        hasOverview: !!document.querySelector('.executive-overview, h1'),
        h1Text: document.querySelector('h1')?.innerText,
        topBarUser: document.querySelector('header button .text-slate-800, header button div')?.innerText,
      };
    })()`,
    returnByValue: true
  });
  console.log('Page info after 3.8s:', pageInfo.result.value);

  const snap = await cdp('Page.captureScreenshot', { format: 'png' });
  fs.writeFileSync('C:\\Users\\ADMIN\\.gemini\\antigravity-ide\\brain\\4688303f-79ba-496e-ade1-bbed8cfa0d6e\\phase1_5_dashboard_immediate.png', Buffer.from(snap.data, 'base64'));
  console.log('Updated phase1_5_dashboard_immediate.png');

  // Verify styles on immediate dashboard
  const immediateStyles = await cdp('Runtime.evaluate', {
    expression: `(() => {
      const body = document.body;
      return {
        bodyBg: window.getComputedStyle(body).backgroundColor,
        bodyFont: window.getComputedStyle(body).fontFamily,
        rootFont: window.getComputedStyle(document.documentElement).getPropertyValue('--font-family'),
        lampClr: window.getComputedStyle(document.documentElement).getPropertyValue('--lamp-clr'),
      };
    })()`,
    returnByValue: true
  });
  console.log('Immediate dashboard styles:', immediateStyles.result.value);

  edgeProc.kill();
}
testTiming().catch(console.error);
