const { spawn } = require('child_process');
const fs = require('fs');
const path = require('path');

const creds = JSON.parse(fs.readFileSync('dev-admin-credentials.json', 'utf-8'));

async function diagnose() {
  const edgePort = 9498;
  const tempProfileDir = path.resolve('temp_edge_diag');
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

  await cdp('Page.enable');
  await cdp('Runtime.enable');
  await cdp('Network.enable');

  // Listen to network responses
  ws.addEventListener('message', (e) => {
    const m = JSON.parse(e.data);
    if (m.method === 'Network.responseReceived') {
      const resp = m.params.response;
      if (resp.headers['set-cookie'] || resp.headers['Set-Cookie']) {
        console.log('Set-Cookie detected in HTTP response:', resp.headers['set-cookie'] || resp.headers['Set-Cookie']);
      }
    }
  });

  await cdp('Page.navigate', { url: 'http://localhost:3001/login' });
  await new Promise(r => setTimeout(r, 2000));

  // Pull cord
  await cdp('Runtime.evaluate', {
    expression: "document.querySelector('.string-handle').dispatchEvent(new KeyboardEvent('keydown', { key: ' ' }))"
  });
  await new Promise(r => setTimeout(r, 1200));

  // Inspect form submission by calling the server action directly or triggering submit
  const submitDiag = await cdp('Runtime.evaluate', {
    expression: `
      (async () => {
        function setReactInput(input, value) {
          const setter = Object.getOwnPropertyDescriptor(window.HTMLInputElement.prototype, 'value').set;
          setter.call(input, value);
          input.dispatchEvent(new Event('input', { bubbles: true }));
          input.dispatchEvent(new Event('change', { bubbles: true }));
        }

        const email = document.getElementById('emailInput');
        const pass = document.getElementById('passwordInput');
        const form = document.querySelector('.auth-form');

        setReactInput(email, ${JSON.stringify(creds.email)});
        setReactInput(pass, ${JSON.stringify(creds.password)});

        return {
          emailVal: email.value,
          passVal: pass.value.length,
          hasSubmitBtn: !!document.querySelector('.submit-btn')
        };
      })()
    `,
    returnByValue: true,
    awaitPromise: true,
  });
  console.log('Inputs filled diagnosis:', submitDiag.result.value);

  // Click submit button
  await cdp('Runtime.evaluate', {
    expression: "document.querySelector('.submit-btn').click()"
  });

  // Wait 1.5 seconds and check what is on the DOM
  await new Promise(r => setTimeout(r, 1500));

  const domDiag = await cdp('Runtime.evaluate', {
    expression: `
      (() => {
        const welcome = document.querySelector('.welcome-card');
        const toast = document.querySelector('.feedback-toast');
        const err = document.querySelector('.error-banner, [role=\"alert\"]');
        return {
          hasWelcome: !!welcome,
          welcomeText: welcome ? welcome.innerText : null,
          toastText: toast ? toast.innerText : null,
          toastClasses: toast ? toast.className : null,
          currentUrl: window.location.href
        };
      })()
    `,
    returnByValue: true,
  });
  console.log('Post-click DOM diagnosis:', domDiag.result.value);

  // Check cookies via CDP
  const cookies = await cdp('Network.getCookies', { urls: ['http://localhost:3001/'] });
  console.log('Stored cookies:', cookies.cookies.map(c => ({ name: c.name, domain: c.domain, path: c.path, secure: c.secure, httpOnly: c.httpOnly })));

  ws.close();
  edgeProc.kill();
}

diagnose().catch(console.error);
