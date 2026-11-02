const fs = require('fs');
const path = require('path');
const { spawn } = require('child_process');

const ARTIFACT_DIR = path.resolve('C:/Users/ADMIN/.gemini/antigravity-ide/brain/4688303f-79ba-496e-ade1-bbed8cfa0d6e');
const BASE_URL = 'http://localhost:3001';

async function auditRemainingModules() {
  const creds = JSON.parse(fs.readFileSync('dev-admin-credentials.json', 'utf-8'));
  const edgePort = 9491;
  const tempProfileDir = path.resolve('temp_edge_modules_audit');

  const edgeProc = spawn('C:\\Program Files (x86)\\Microsoft\\Edge\\Application\\msedge.exe', [
    '--headless',
    '--remote-debugging-port=' + edgePort,
    '--user-data-dir=' + tempProfileDir,
    '--disable-gpu',
    '--no-sandbox',
    '--window-size=1440,900',
  ]);

  for (let i = 0; i < 30; i++) {
    await new Promise((r) => setTimeout(r, 300));
    try {
      const res = await fetch(`http://localhost:${edgePort}/json/version`);
      if (res.ok) break;
    } catch {}
  }

  const tab = await (await fetch(`http://localhost:${edgePort}/json/new`, { method: 'PUT' })).json();
  const ws = new WebSocket(tab.webSocketDebuggerUrl);
  await new Promise((r) => ws.addEventListener('open', r));

  function cdp(method, params = {}) {
    return new Promise((resolve, reject) => {
      const id = Math.floor(Math.random() * 1e6);
      const h = (e) => {
        const m = JSON.parse(e.data);
        if (m.id === id) {
          ws.removeEventListener('message', h);
          if (m.error) reject(m.error);
          else resolve(m.result);
        }
      };
      ws.addEventListener('message', h);
      ws.send(JSON.stringify({ id, method, params }));
    });
  }

  function delay(ms) {
    return new Promise((resolve) => setTimeout(resolve, ms));
  }

  async function captureScreenshot(filename) {
    const { data } = await cdp('Page.captureScreenshot', { format: 'png' });
    const buf = Buffer.from(data, 'base64');
    const targetPath = path.join(ARTIFACT_DIR, filename);
    fs.writeFileSync(targetPath, buf);
    console.log(`  [CAPTURED] ${filename} (${buf.length} bytes)`);
    return targetPath;
  }

  async function setViewport(width, height) {
    await cdp('Emulation.setDeviceMetricsOverride', {
      width,
      height,
      deviceScaleFactor: 2,
      mobile: width < 768,
      fitWindow: false,
    });
    await delay(350);
  }

  await cdp('Page.enable');
  await cdp('Runtime.enable');
  await cdp('Network.enable');

  await setViewport(390, 844);
  await cdp('Page.navigate', { url: `${BASE_URL}/login` });
  await delay(2000);

  // Pull cord
  await cdp('Runtime.evaluate', {
    expression: "document.querySelector('.string-handle').dispatchEvent(new KeyboardEvent('keydown', { key: ' ' }))"
  });
  await delay(1200);

  // Fill credentials and click submit
  await cdp('Runtime.evaluate', {
    expression: `
      (() => {
        function setReactInput(input, value) {
          const setter = Object.getOwnPropertyDescriptor(window.HTMLInputElement.prototype, 'value').set;
          setter.call(input, value);
          input.dispatchEvent(new Event('input', { bubbles: true }));
          input.dispatchEvent(new Event('change', { bubbles: true }));
        }

        const email = document.getElementById('login-email');
        const pass = document.getElementById('login-password');
        const submitBtn = document.querySelector('button[type=\"submit\"]');

        if (email && pass && submitBtn) {
          setReactInput(email, ${JSON.stringify(creds.email)});
          setReactInput(pass, ${JSON.stringify(creds.password)});
          submitBtn.click();
        }
      })()
    `,
  });

  // Wait for login and navigation to /
  await delay(3500);

  const modules = [
    { slug: 'attendance', name: 'Attendance & Timetable' },
    { slug: 'examinations', name: 'Examinations & Results' },
  ];

  for (const mod of modules) {
    console.log(`\nNavigating to ${mod.name} (/modules/${mod.slug})...`);
    await cdp('Page.navigate', { url: `${BASE_URL}/modules/${mod.slug}` });
    await delay(2500);

    await captureScreenshot(`gate_mobile_module_${mod.slug}.png`);

    const check = await cdp('Runtime.evaluate', {
      expression: `
        ({
          module: '${mod.slug}',
          title: document.title,
          scrollWidth: document.documentElement.scrollWidth,
          clientWidth: document.documentElement.clientWidth,
          hasWindowOverflow: document.documentElement.scrollWidth > document.documentElement.clientWidth,
          hasTable: !!document.querySelector('table'),
          hasCards: !!document.querySelector('.grid, .space-y-4, .space-y-6, .flex-col')
        })
      `,
      returnByValue: true,
    });
    console.log(`  [MODULE ${mod.name}]:`, check.result.value);
  }

  ws.close();
  edgeProc.kill();
  console.log('\nAudit of remaining modules completed successfully');
}

auditRemainingModules().catch(console.error);
