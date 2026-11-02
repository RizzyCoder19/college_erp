const fs = require('fs');
const path = require('path');
const { spawn } = require('child_process');

const ARTIFACT_DIR = path.resolve('C:/Users/ADMIN/.gemini/antigravity-ide/brain/4688303f-79ba-496e-ade1-bbed8cfa0d6e');
const BASE_URL = 'http://localhost:3001';

async function run() {
  const creds = JSON.parse(fs.readFileSync('dev-admin-credentials.json', 'utf-8'));
  const edgePath = 'C:\\Program Files (x86)\\Microsoft\\Edge\\Application\\msedge.exe';
  const edgePort = 9497;
  const tempProfileDir = path.resolve('temp_edge_gate_real');

  console.log(`Starting headless Edge on port ${edgePort}...`);
  const edgeProc = spawn(edgePath, [
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

  async function pullCord() {
    await cdp('Runtime.evaluate', {
      expression: `
        (() => {
          const handle = document.querySelector('.string-handle');
          if (handle) {
            handle.dispatchEvent(new KeyboardEvent('keydown', { key: ' ', bubbles: true }));
          }
        })()
      `,
    });
    await delay(700);
  }

  await cdp('Page.enable');
  await cdp('DOM.enable');
  await cdp('Runtime.enable');

  console.log('\n=============================================================');
  console.log('TESTING AUTHENTIC LOGIN & MOBILE ERP NAVIGATION (390x844)');
  console.log('=============================================================');

  await setViewport(390, 844);
  await cdp('Page.navigate', { url: `${BASE_URL}/login` });
  await delay(2000);

  // Pull cord to illuminate and reveal form
  await pullCord();
  await delay(1500);

  // Fill in React-controlled inputs using native descriptor setter
  console.log('Injecting authentic credentials into React state...');
  await cdp('Runtime.evaluate', {
    expression: `
      (() => {
        function setReactInput(input, value) {
          const setter = Object.getOwnPropertyDescriptor(window.HTMLInputElement.prototype, 'value').set;
          setter.call(input, value);
          input.dispatchEvent(new Event('input', { bubbles: true }));
          input.dispatchEvent(new Event('change', { bubbles: true }));
        }

        const email = document.getElementById('emailInput');
        const pass = document.getElementById('passwordInput');
        const submitBtn = document.querySelector('.submit-btn');

        if (email && pass && submitBtn) {
          setReactInput(email, ${JSON.stringify(creds.email)});
          setReactInput(pass, ${JSON.stringify(creds.password)});
          submitBtn.click();
        }
      })()
    `,
  });

  // Capture welcome transition immediately after submit
  await delay(800);
  await captureScreenshot('gate_mobile_welcome_live.png');

  // Wait for the welcome progress to finish (1800ms + 1000ms navigation)
  console.log('Waiting for welcome transition to complete and navigate...');
  await delay(2600);

  const finalUrl = await cdp('Runtime.evaluate', {
    expression: 'window.location.href',
    returnByValue: true,
  });
  console.log('URL after welcome transition:', finalUrl.result.value);

  // Capture authenticated mobile dashboard
  await captureScreenshot('gate_mobile_dashboard_live.png');

  const dashCheck = await cdp('Runtime.evaluate', {
    expression: `
      ({
        url: window.location.href,
        title: document.title,
        scrollWidth: document.documentElement.scrollWidth,
        clientWidth: document.documentElement.clientWidth,
        hasWindowOverflow: document.documentElement.scrollWidth > document.documentElement.clientWidth,
        topBarVisible: !!document.querySelector('header'),
        mainContentVisible: !!document.querySelector('main')
      })
    `,
    returnByValue: true,
  });
  console.log('[STATUS Mobile Dashboard Authenticated]:', dashCheck.result.value);

  console.log('\n=============================================================');
  console.log('AUDITING ALL KEY MODULES ON MOBILE (390x844)');
  console.log('=============================================================');

  const modules = [
    { slug: 'students', name: 'Students Directory' },
    { slug: 'faculty', name: 'Faculty Directory' },
    { slug: 'academics', name: 'Academic Setup' },
    { slug: 'timetable', name: 'Timetable Management' },
    { slug: 'attendance', name: 'Attendance Tracking' },
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
          hasCards: !!document.querySelector('.grid, .space-y-4, .space-y-6')
        })
      `,
      returnByValue: true,
    });
    console.log(`  [MODULE ${mod.name}]:`, check.result.value);
  }

  ws.close();
  edgeProc.kill();
  console.log('\n=============================================================');
  console.log('ALL MODULE AUDITS FINISHED SUCCESSFULLY');
  console.log('=============================================================');
}

run().catch((err) => {
  console.error('ERROR:', err);
  process.exit(1);
});
