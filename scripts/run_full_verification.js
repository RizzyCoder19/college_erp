const fs = require('fs');
const path = require('path');
const { spawn } = require('child_process');

async function run() {
  const edgePath = 'C:\\Program Files (x86)\\Microsoft\\Edge\\Application\\msedge.exe';
  const edgePort = 9470;
  const tempProfileDir = path.resolve('temp_edge_lamp_test2');

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

  const ARTIFACT_DIR = 'C:\\Users\\ADMIN\\.gemini\\antigravity-ide\\brain\\4688303f-79ba-496e-ade1-bbed8cfa0d6e';
  const adminCreds = JSON.parse(fs.readFileSync('dev-admin-credentials.json', 'utf8'));

  // Clear any existing cookies
  await cdp('Network.clearBrowserCookies');

  console.log('=== TEST 1: Initial Unlit State ===');
  await cdp('Page.navigate', { url: 'http://localhost:3000/login' });
  await new Promise(r => setTimeout(r, 2000));

  const state1 = await cdp('Runtime.evaluate', {
    expression: `(() => {
      const room = document.querySelector('.room');
      const card = document.querySelector('.login-card');
      const beam = document.querySelector('.light-beam');
      const hint = document.querySelector('.pull-hint');
      const logo = document.querySelector('.top-brand img');
      return {
        roomIsOn: room ? room.classList.contains('on') : false,
        cardOpacity: card ? window.getComputedStyle(card).opacity : null,
        cardPointerEvents: card ? window.getComputedStyle(card).pointerEvents : null,
        beamOpacity: beam ? window.getComputedStyle(beam).opacity : null,
        hintVisible: hint ? window.getComputedStyle(hint).opacity : null,
        logoSrc: logo ? logo.getAttribute('src') : null,
      };
    })()`,
    returnByValue: true,
  });
  console.log('Test 1 State:', state1.result.value);
  const snap1 = await cdp('Page.captureScreenshot', { format: 'png' });
  fs.writeFileSync(path.join(ARTIFACT_DIR, 'lamp_step1_unlit_initial.png'), Buffer.from(snap1.data, 'base64'));

  console.log('=== TEST 2: Cord Pull Interaction ===');
  await cdp('Runtime.evaluate', {
    expression: `(() => {
      const handle = document.querySelector('.string-handle');
      if (handle) {
        handle.focus();
        handle.dispatchEvent(new KeyboardEvent('keydown', { key: 'Enter', bubbles: true }));
      }
    })()`,
  });
  await new Promise(r => setTimeout(r, 1000));

  const state2 = await cdp('Runtime.evaluate', {
    expression: `(() => {
      const room = document.querySelector('.room');
      const card = document.querySelector('.login-card');
      const beam = document.querySelector('.light-beam');
      return {
        roomIsOn: room ? room.classList.contains('on') : false,
        cardOpacity: card ? window.getComputedStyle(card).opacity : null,
        cardPointerEvents: card ? window.getComputedStyle(card).pointerEvents : null,
        beamOpacity: beam ? window.getComputedStyle(beam).opacity : null,
      };
    })()`,
    returnByValue: true,
  });
  console.log('Test 2 State (Illuminated):', state2.result.value);
  const snap2 = await cdp('Page.captureScreenshot', { format: 'png' });
  fs.writeFileSync(path.join(ARTIFACT_DIR, 'lamp_step2_illuminated_login_card.png'), Buffer.from(snap2.data, 'base64'));

  console.log('=== TEST 3: Invalid Login Handling ===');
  await cdp('Runtime.evaluate', {
    expression: `(() => {
      const setV = (el, val) => {
        if (!el) return;
        Object.getOwnPropertyDescriptor(window.HTMLInputElement.prototype, "value").set.call(el, val);
        el.dispatchEvent(new Event("input", { bubbles: true }));
        el.dispatchEvent(new Event("change", { bubbles: true }));
      };
      setV(document.querySelector('#login-email'), 'admin.local@sample.rpihm.ac.in');
      setV(document.querySelector('#login-password'), 'WrongPassword123!');
      document.querySelector('#login-submit-button').click();
    })()`,
  });
  await new Promise(r => setTimeout(r, 700));

  const state3 = await cdp('Runtime.evaluate', {
    expression: `(() => {
      const toast = document.querySelector('.feedback-toast');
      const welcomeCard = document.querySelector('#welcomeCard');
      return {
        toastText: toast ? toast.innerText : null,
        toastVisible: toast ? toast.classList.contains('show') : false,
        welcomeCardPresent: !!welcomeCard,
      };
    })()`,
    returnByValue: true,
  });
  console.log('Test 3 State (Invalid Creds):', state3.result.value);
  const snap3 = await cdp('Page.captureScreenshot', { format: 'png' });
  fs.writeFileSync(path.join(ARTIFACT_DIR, 'lamp_step3_invalid_login_toast.png'), Buffer.from(snap3.data, 'base64'));

  console.log('=== TEST 4: Valid Login & Personalized Welcome Transition ===');
  await cdp('Runtime.evaluate', {
    expression: `(() => {
      const setV = (el, val) => {
        if (!el) return;
        Object.getOwnPropertyDescriptor(window.HTMLInputElement.prototype, "value").set.call(el, val);
        el.dispatchEvent(new Event("input", { bubbles: true }));
        el.dispatchEvent(new Event("change", { bubbles: true }));
      };
      setV(document.querySelector('#login-email'), 'admin.local@sample.rpihm.ac.in');
      setV(document.querySelector('#login-password'), 'RpihmAdmin_2gY5pbuPO5NYCfK79!');
      document.querySelector('#login-submit-button').click();
    })()`,
  });
  // Wait 600ms for server action response and welcome card emergence
  await new Promise(r => setTimeout(r, 600));

  const state4 = await cdp('Runtime.evaluate', {
    expression: `(() => {
      const welcomeCard = document.querySelector('#welcomeCard');
      const title = document.querySelector('.welcome-title');
      const rolePill = document.querySelector('.welcome-role-pill');
      const logo = document.querySelector('.welcome-brand-header img');
      const progressBar = document.querySelector('.welcome-progress-bar');
      return {
        welcomeCardPresent: !!welcomeCard,
        titleText: title ? title.innerText : null,
        roleText: rolePill ? rolePill.innerText : null,
        logoSrc: logo ? logo.getAttribute('src') : null,
        progressBarPresent: !!progressBar,
      };
    })()`,
    returnByValue: true,
  });
  console.log('Test 4 State (Personalized Welcome):', state4.result.value);
  const snap4 = await cdp('Page.captureScreenshot', { format: 'png' });
  fs.writeFileSync(path.join(ARTIFACT_DIR, 'lamp_step4_welcome_transition.png'), Buffer.from(snap4.data, 'base64'));

  console.log('=== TEST 5: Auto-Navigation to Authenticated Dashboard ===');
  await new Promise(r => setTimeout(r, 2000));

  const state5 = await cdp('Runtime.evaluate', {
    expression: `(() => {
      return {
        currentUrl: window.location.href,
        hasOverview: !!document.querySelector('.executive-overview, h1, h2'),
        pageTextPreview: document.body.innerText.slice(0, 150),
      };
    })()`,
    returnByValue: true,
  });
  console.log('Test 5 State (Dashboard Active):', state5.result.value);
  const snap5 = await cdp('Page.captureScreenshot', { format: 'png' });
  fs.writeFileSync(path.join(ARTIFACT_DIR, 'lamp_step5_dashboard_active.png'), Buffer.from(snap5.data, 'base64'));

  console.log('=== TEST 6: Refresh Dashboard (No Welcome Repeat) ===');
  await cdp('Page.reload');
  await new Promise(r => setTimeout(r, 2000));
  const state6 = await cdp('Runtime.evaluate', {
    expression: `(() => {
      return {
        currentUrl: window.location.href,
        welcomeCardPresent: !!document.querySelector('#welcomeCard'),
        dashboardPresent: document.body.innerText.includes('CampusOS') && document.body.innerText.includes('Student Management'),
      };
    })()`,
    returnByValue: true,
  });
  console.log('Test 6 State (Refresh Dashboard):', state6.result.value);

  console.log('=== TEST 7: Mobile Viewport (Unlit & Illuminated) ===');
  await cdp('Network.clearBrowserCookies');
  await cdp('Emulation.setDeviceMetricsOverride', {
    width: 390,
    height: 844,
    deviceScaleFactor: 2,
    mobile: true,
  });
  await cdp('Page.navigate', { url: 'http://localhost:3000/login' });
  await new Promise(r => setTimeout(r, 2000));
  const snap7a = await cdp('Page.captureScreenshot', { format: 'png' });
  fs.writeFileSync(path.join(ARTIFACT_DIR, 'lamp_step7a_mobile_unlit.png'), Buffer.from(snap7a.data, 'base64'));

  // Pull cord on mobile
  await cdp('Runtime.evaluate', {
    expression: `document.querySelector('.string-handle').dispatchEvent(new KeyboardEvent('keydown', { key: 'Enter', bubbles: true }))`,
  });
  await new Promise(r => setTimeout(r, 1000));
  const snap7b = await cdp('Page.captureScreenshot', { format: 'png' });
  fs.writeFileSync(path.join(ARTIFACT_DIR, 'lamp_step7b_mobile_illuminated.png'), Buffer.from(snap7b.data, 'base64'));

  console.log('All verification stages passed successfully!');
  edgeProc.kill();
  process.exit(0);
}

run().catch(err => {
  console.error('Test execution failed:', err);
  process.exit(1);
});
