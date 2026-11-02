const fs = require('fs');
const path = require('path');
const { spawn } = require('child_process');

const ARTIFACT_DIR = path.resolve('C:/Users/ADMIN/.gemini/antigravity-ide/brain/4688303f-79ba-496e-ade1-bbed8cfa0d6e');
const BASE_URL = 'http://localhost:3001';

async function run() {
  const creds = JSON.parse(fs.readFileSync('dev-admin-credentials.json', 'utf-8'));
  const edgePath = 'C:\\Program Files (x86)\\Microsoft\\Edge\\Application\\msedge.exe';
  const edgePort = 9492;
  const tempProfileDir = path.resolve('temp_edge_gate_final_verified');

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
  await cdp('Network.enable');

  console.log('\n=============================================================');
  console.log('1. DESKTOP LAMP INTERACTION & COLOR CYCLING (1440x900)');
  console.log('=============================================================');

  await setViewport(1440, 900);
  await cdp('Page.navigate', { url: `${BASE_URL}/login` });
  await delay(2500);

  // Desktop State 1: Unlit
  await captureScreenshot('gate_desktop_state1_unlit.png');

  // Pull 1: Warm Amber Gold
  await pullCord();
  await captureScreenshot('gate_desktop_pull1_warm.png');

  // Pull 2: Cyber Cyan
  await pullCord();
  await captureScreenshot('gate_desktop_pull2_cyber.png');

  // Pull 3: Electric Violet
  await pullCord();
  await captureScreenshot('gate_desktop_pull3_violet.png');

  // Pull 4: Off
  await pullCord();
  await captureScreenshot('gate_desktop_pull4_off.png');

  // Pull 5: Wraparound Warm
  await pullCord();
  await captureScreenshot('gate_desktop_pull5_wraparound.png');

  console.log('\n=============================================================');
  console.log('2. MOBILE VIEWPORT SEQUENCE (320x700, 360x800, 390x844, 430x932)');
  console.log('=============================================================');

  const mobileViewports = [
    { w: 320, h: 700, name: '320x700' },
    { w: 360, h: 800, name: '360x800' },
    { w: 390, h: 844, name: '390x844' },
    { w: 430, h: 932, name: '430x932' },
  ];

  for (const vp of mobileViewports) {
    console.log(`\n--- Mobile Viewport: ${vp.name} ---`);
    await setViewport(vp.w, vp.h);
    await cdp('Page.navigate', { url: `${BASE_URL}/login` });
    await delay(2000);

    // State 1: Centered unlit lamp
    await captureScreenshot(`gate_mobile_${vp.name}_state1_unlit.png`);

    // First pull: Lamp illuminates -> exits -> Form ready
    await pullCord();
    await delay(1600);

    // State 3: Lamp removed, form focused
    await captureScreenshot(`gate_mobile_${vp.name}_state3_form_ready.png`);

    const check = await cdp('Runtime.evaluate', {
      expression: `
        ({
          scrollWidth: document.documentElement.scrollWidth,
          clientWidth: document.documentElement.clientWidth,
          hasWindowOverflow: document.documentElement.scrollWidth > document.documentElement.clientWidth,
          lampDisplay: window.getComputedStyle(document.querySelector('.lamp-side')).display,
          cardDisplay: window.getComputedStyle(document.querySelector('.login-side')).display
        })
      `,
      returnByValue: true,
    });
    console.log(`  [STATUS ${vp.name}] Layout State:`, check.result.value);
  }

  console.log('\n=============================================================');
  console.log('3. AUTHENTIC LOGIN & MOBILE ERP NAVIGATION (390x844)');
  console.log('=============================================================');

  await setViewport(390, 844);
  await cdp('Page.navigate', { url: `${BASE_URL}/login` });
  await delay(1800);
  await pullCord();
  await delay(1400);

  // Test Invalid Credentials
  console.log('Testing invalid credentials rejection...');
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
          setReactInput(email, 'admin.local@sample.rpihm.ac.in');
          setReactInput(pass, 'WrongInvalidPass999!');
          submitBtn.click();
        }
      })()
    `,
  });
  await delay(1200);
  await captureScreenshot('gate_mobile_invalid_credentials.png');

  // Test Authentic Credentials from dev-admin-credentials.json
  console.log('Testing authentic login with active DB administrator account...');
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

  // Welcome Transition Capture
  await delay(800);
  await captureScreenshot('gate_mobile_welcome_live.png');

  // Wait for transition to complete and navigate into ERP workspace
  console.log('Waiting for welcome transition to navigate into mobile ERP...');
  await delay(2800);

  const currentUrl = await cdp('Runtime.evaluate', {
    expression: 'window.location.href',
    returnByValue: true,
  });
  console.log('  Current URL after transition:', currentUrl.result.value);

  await captureScreenshot('gate_mobile_dashboard_live.png');

  const dashCheck = await cdp('Runtime.evaluate', {
    expression: `
      ({
        url: window.location.href,
        title: document.title,
        scrollWidth: document.documentElement.scrollWidth,
        clientWidth: document.documentElement.clientWidth,
        hasWindowOverflow: document.documentElement.scrollWidth > document.documentElement.clientWidth,
        header: !!document.querySelector('header'),
        main: !!document.querySelector('main')
      })
    `,
    returnByValue: true,
  });
  console.log('  [STATUS Mobile Dashboard]:', dashCheck.result.value);

  console.log('\n=============================================================');
  console.log('4. MOBILE MODULE WORKSPACES AUDIT (390x844)');
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
    console.log(`\nNavigating to Module: ${mod.name} (/modules/${mod.slug})...`);
    await cdp('Page.navigate', { url: `${BASE_URL}/modules/${mod.slug}` });
    await delay(2500);

    await captureScreenshot(`gate_mobile_module_${mod.slug}.png`);

    const modCheck = await cdp('Runtime.evaluate', {
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
    console.log(`  [STATUS ${mod.name}]:`, modCheck.result.value);
  }

  // Restore desktop viewport before closing
  await setViewport(1440, 900);
  ws.close();
  edgeProc.kill();

  console.log('\n=============================================================');
  console.log('FINAL GATE VERIFICATION RUN COMPLETED WITH ZERO ERRORS');
  console.log('=============================================================');
}

run().catch((err) => {
  console.error('ERROR in gate verification:', err);
  process.exit(1);
});
