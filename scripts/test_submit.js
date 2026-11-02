const fs = require('fs');
const path = require('path');
const { spawn } = require('child_process');

async function testSubmit() {
  const edgePort = 9475;
  const tempProfileDir = path.resolve('temp_edge_submit_test');

  const edgeProc = spawn('C:\\Program Files (x86)\\Microsoft\\Edge\\Application\\msedge.exe', [
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
  await new Promise(r => setTimeout(r, 2000));

  // Turn on lamp
  await cdp('Runtime.evaluate', {
    expression: `document.querySelector('.string-handle').dispatchEvent(new KeyboardEvent('keydown', { key: 'Enter', bubbles: true }))`,
  });
  await new Promise(r => setTimeout(r, 800));

  // Type credentials using execCommand
  const adminCreds = JSON.parse(fs.readFileSync('dev-admin-credentials.json', 'utf8'));

  await cdp('Runtime.evaluate', {
    expression: `(() => {
      const emailInput = document.querySelector('#login-email');
      emailInput.focus();
      emailInput.select();
      document.execCommand('insertText', false, 'admin.local@sample.rpihm.ac.in');

      const passInput = document.querySelector('#login-password');
      passInput.focus();
      passInput.select();
      document.execCommand('insertText', false, 'RpihmAdmin_2gY5pbuPO5NYCfK79!');

      document.querySelector('#login-submit-button').click();
    })()`,
  });

  console.log('Submitted. Waiting 800ms for welcome card...');
  await new Promise(r => setTimeout(r, 800));

  const check = await cdp('Runtime.evaluate', {
    expression: `(() => {
      const welcomeCard = document.querySelector('#welcomeCard');
      const toast = document.querySelector('.feedback-toast');
      return {
        welcomeCardPresent: !!welcomeCard,
        welcomeTitle: welcomeCard ? document.querySelector('.welcome-title')?.innerText : null,
        welcomeRole: welcomeCard ? document.querySelector('.welcome-role-pill')?.innerText : null,
        toastText: toast ? toast.innerText : null,
        currentUrl: window.location.href,
      };
    })()`,
    returnByValue: true,
  });

  console.log('Result at 800ms:', check.result.value);

  // Capture screenshot of the Welcome Card
  const ARTIFACT_DIR = 'C:\\Users\\ADMIN\\.gemini\\antigravity-ide\\brain\\4688303f-79ba-496e-ade1-bbed8cfa0d6e';
  const snap = await cdp('Page.captureScreenshot', { format: 'png' });
  fs.writeFileSync(path.join(ARTIFACT_DIR, 'lamp_step4_welcome_transition.png'), Buffer.from(snap.data, 'base64'));
  console.log('Saved lamp_step4_welcome_transition.png');

  // Wait for redirect to dashboard
  await new Promise(r => setTimeout(r, 1500));
  const finalCheck = await cdp('Runtime.evaluate', {
    expression: `(() => {
      return {
        currentUrl: window.location.href,
        hasDashboard: document.body.innerText.includes('CampusOS'),
      };
    })()`,
    returnByValue: true,
  });
  console.log('Result after transition:', finalCheck.result.value);

  edgeProc.kill();
  process.exit(0);
}

testSubmit().catch(e => { console.error(e); process.exit(1); });
