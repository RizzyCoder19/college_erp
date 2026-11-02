
const fs = require('fs');
const path = require('path');
const { spawn } = require('child_process');

async function run() {
  const edgePath = 'C:\\Program Files (x86)\\Microsoft\\Edge\\Application\\msedge.exe';
  const edgePort = 9460;
  const tempProfileDir = path.resolve('temp_edge_screenshot');

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
  const ARTIFACT_DIR = 'C:\\Users\\ADMIN\\.gemini\\antigravity-ide\\brain\\4688303f-79ba-496e-ade1-bbed8cfa0d6e';

  // Navigate to login
  await cdp('Page.navigate', { url: 'http://localhost:3000/login' });
  await new Promise(r => setTimeout(r, 3000));
  const snap1 = await cdp('Page.captureScreenshot', { format: 'png' });
  fs.writeFileSync(path.join(ARTIFACT_DIR, 'milestone3_4_animated_lamp_login.png'), Buffer.from(snap1.data, 'base64'));
  console.log('Saved milestone3_4_animated_lamp_login.png');

  // Log in as system admin
  const adminCreds = JSON.parse(fs.readFileSync('dev-admin-credentials.json', 'utf8'));
  await cdp('Runtime.evaluate', {
    expression: '(() => {' +
      'const setV = (el, val) => {' +
        'if (!el) return;' +
        'Object.getOwnPropertyDescriptor(window.HTMLInputElement.prototype, "value").set.call(el, val);' +
        'el.dispatchEvent(new Event("input", { bubbles: true }));' +
        'el.dispatchEvent(new Event("change", { bubbles: true }));' +
      '};' +
      'setV(document.getElementById("login-email"), ' + JSON.stringify(adminCreds.email) + ');' +
      'setV(document.getElementById("login-password"), ' + JSON.stringify(adminCreds.password) + ');' +
      'document.getElementById("login-submit-button").click();' +
    '})()'
  });
  await new Promise(r => setTimeout(r, 3500));

  // Navigate to Students
  await cdp('Page.navigate', { url: 'http://localhost:3000/modules/students' });
  await new Promise(r => setTimeout(r, 3000));
  const snap2 = await cdp('Page.captureScreenshot', { format: 'png' });
  fs.writeFileSync(path.join(ARTIFACT_DIR, 'milestone3_4_students_workspace.png'), Buffer.from(snap2.data, 'base64'));
  console.log('Saved milestone3_4_students_workspace.png');

  // Navigate to Faculty
  await cdp('Page.navigate', { url: 'http://localhost:3000/modules/faculty' });
  await new Promise(r => setTimeout(r, 3000));
  const snap3 = await cdp('Page.captureScreenshot', { format: 'png' });
  fs.writeFileSync(path.join(ARTIFACT_DIR, 'milestone3_4_faculty_workspace.png'), Buffer.from(snap3.data, 'base64'));
  console.log('Saved milestone3_4_faculty_workspace.png');

  ws.close();
  edgeProc.kill();
  try { fs.rmSync(tempProfileDir, { recursive: true, force: true }); } catch {}
  console.log('Evidence capture complete!');
}

run().catch(console.error);
