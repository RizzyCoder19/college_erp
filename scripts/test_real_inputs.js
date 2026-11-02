const { spawn } = require('child_process');
const fs = require('fs');
const path = require('path');

const creds = JSON.parse(fs.readFileSync('dev-admin-credentials.json', 'utf-8'));

async function testRealInputs() {
  const edgePort = 9499;
  const tempProfileDir = path.resolve('temp_edge_real_test');
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

  await cdp('Page.navigate', { url: 'http://localhost:3001/login' });
  await new Promise(r => setTimeout(r, 2000));

  // Pull cord
  await cdp('Runtime.evaluate', {
    expression: "document.querySelector('.string-handle').dispatchEvent(new KeyboardEvent('keydown', { key: ' ' }))"
  });
  await new Promise(r => setTimeout(r, 1200));

  // Fill real inputs
  const fillResult = await cdp('Runtime.evaluate', {
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
        const submitBtn = document.querySelector('.submit-btn');

        if (email && pass && submitBtn) {
          setReactInput(email, ${JSON.stringify(creds.email)});
          setReactInput(pass, ${JSON.stringify(creds.password)});
          submitBtn.click();
          return { found: true, email: email.value };
        }
        return { found: false };
      })()
    `,
    returnByValue: true,
  });
  console.log("Input fill and click result:", fillResult.result.value);

  // Wait 1.5 seconds for welcome transition to mount
  await new Promise(r => setTimeout(r, 1500));

  const welcomeDiag = await cdp('Runtime.evaluate', {
    expression: `
      (() => {
        const welcome = document.querySelector('.animate-fadeIn');
        return {
          hasWelcome: !!welcome,
          welcomeHeading: welcome ? welcome.querySelector('h1')?.textContent : null,
          role: welcome ? welcome.querySelector('.font-semibold')?.textContent : null,
          greeting: welcome ? welcome.querySelector('p')?.textContent : null,
        };
      })()
    `,
    returnByValue: true,
  });
  console.log("Welcome transition state:", welcomeDiag.result.value);

  // Wait for transition completion and navigation to /
  console.log("Waiting for navigation to finish...");
  await new Promise(r => setTimeout(r, 3000));

  const postNavDiag = await cdp('Runtime.evaluate', {
    expression: `
      ({
        url: window.location.href,
        title: document.title,
        sidebar: !!document.querySelector('aside'),
        header: !!document.querySelector('header'),
        main: !!document.querySelector('main')
      })
    `,
    returnByValue: true,
  });
  console.log("Post-navigation ERP workspace status:", postNavDiag.result.value);

  const cookies = await cdp('Network.getCookies', { urls: ['http://localhost:3001/'] });
  console.log("Session cookies:", cookies.cookies.map(c => ({ name: c.name, expires: c.expires })));

  ws.close();
  edgeProc.kill();
}

testRealInputs().catch(console.error);
