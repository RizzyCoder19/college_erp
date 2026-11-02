const fs = require('fs');
const path = require('path');
const { spawn } = require('child_process');

async function run() {
  const edgePath = 'C:\\Program Files (x86)\\Microsoft\\Edge\\Application\\msedge.exe';
  const edgePort = 9485;
  const tempProfileDir = path.resolve('temp_edge_full_final');

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

  // Step 1: Unlit state
  await cdp('Network.clearBrowserCookies');
  await cdp('Page.navigate', { url: 'http://localhost:3000/login' });
  await new Promise(r => setTimeout(r, 2000));

  const s1 = await cdp('Page.captureScreenshot', { format: 'png' });
  fs.writeFileSync(path.join(ARTIFACT_DIR, 'lamp_step1_unlit_initial.png'), Buffer.from(s1.data, 'base64'));
  console.log('1. Captured unlit initial state');

  // Step 2: Pull lamp string
  await cdp('Runtime.evaluate', {
    expression: `document.querySelector('.string-handle').dispatchEvent(new KeyboardEvent('keydown', { key: 'Enter', bubbles: true }))`,
  });
  await new Promise(r => setTimeout(r, 1000));

  const s2 = await cdp('Page.captureScreenshot', { format: 'png' });
  fs.writeFileSync(path.join(ARTIFACT_DIR, 'lamp_step2_illuminated_login_card.png'), Buffer.from(s2.data, 'base64'));
  console.log('2. Captured illuminated login card');

  // Step 3: Invalid login
  await cdp('Runtime.evaluate', {
    expression: `(() => {
      const e = document.querySelector('#login-email');
      e.focus(); e.select();
      document.execCommand('insertText', false, '${adminCreds.email}');
      const p = document.querySelector('#login-password');
      p.focus(); p.select();
      document.execCommand('insertText', false, 'BadPassword999!');
      document.querySelector('#login-submit-button').click();
    })()`,
  });
  await new Promise(r => setTimeout(r, 600));

  const s3 = await cdp('Page.captureScreenshot', { format: 'png' });
  fs.writeFileSync(path.join(ARTIFACT_DIR, 'lamp_step3_invalid_login_toast.png'), Buffer.from(s3.data, 'base64'));
  console.log('3. Captured invalid login toast');

  // Step 4: Valid login -> Welcome card
  await cdp('Runtime.evaluate', {
    expression: `(() => {
      const p = document.querySelector('#login-password');
      p.focus(); p.select();
      document.execCommand('insertText', false, '${adminCreds.password}');
      document.querySelector('#login-submit-button').click();
    })()`,
  });
  await new Promise(r => setTimeout(r, 600));

  const s4 = await cdp('Page.captureScreenshot', { format: 'png' });
  fs.writeFileSync(path.join(ARTIFACT_DIR, 'lamp_step4_welcome_transition.png'), Buffer.from(s4.data, 'base64'));
  console.log('4. Captured personalized welcome transition');

  // Step 5: Dashboard redirect
  await new Promise(r => setTimeout(r, 1800));

  const s5 = await cdp('Page.captureScreenshot', { format: 'png' });
  fs.writeFileSync(path.join(ARTIFACT_DIR, 'lamp_step5_dashboard_active.png'), Buffer.from(s5.data, 'base64'));
  console.log('5. Captured authenticated dashboard');

  // Step 6: Mobile layout (Unlit & Illuminated)
  await cdp('Network.clearBrowserCookies');
  await cdp('Emulation.setDeviceMetricsOverride', {
    width: 390,
    height: 844,
    deviceScaleFactor: 2,
    mobile: true,
  });
  await cdp('Page.navigate', { url: 'http://localhost:3000/login' });
  await new Promise(r => setTimeout(r, 1500));
  const s6a = await cdp('Page.captureScreenshot', { format: 'png' });
  fs.writeFileSync(path.join(ARTIFACT_DIR, 'lamp_step6a_mobile_unlit.png'), Buffer.from(s6a.data, 'base64'));

  await cdp('Runtime.evaluate', {
    expression: `document.querySelector('.string-handle').dispatchEvent(new KeyboardEvent('keydown', { key: 'Enter', bubbles: true }))`,
  });
  await new Promise(r => setTimeout(r, 800));
  const s6b = await cdp('Page.captureScreenshot', { format: 'png' });
  fs.writeFileSync(path.join(ARTIFACT_DIR, 'lamp_step6b_mobile_illuminated.png'), Buffer.from(s6b.data, 'base64'));
  console.log('6. Captured mobile views');

  edgeProc.kill();
  console.log('All captures complete!');
  process.exit(0);
}

run().catch(e => { console.error(e); process.exit(1); });
