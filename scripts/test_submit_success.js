const { spawn } = require('child_process');
const fs = require('fs');
const path = require('path');

const creds = JSON.parse(fs.readFileSync('dev-admin-credentials.json', 'utf-8'));

async function testSubmitSuccess() {
  const edgePort = 9493;
  const tempProfileDir = path.resolve('temp_edge_success_test');
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

  // Fill real inputs and click button[type="submit"]
  const submitResult = await cdp('Runtime.evaluate', {
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
          return { clicked: true, email: email.value };
        }
        return { clicked: false };
      })()
    `,
    returnByValue: true,
  });
  console.log("Submit result:", submitResult.result.value);

  // Wait 1 second and check welcome screen
  await new Promise(r => setTimeout(r, 1000));

  const welcomeStatus = await cdp('Runtime.evaluate', {
    expression: `
      (() => {
        const h1 = document.querySelector('h1');
        return {
          h1: h1 ? h1.innerText : null,
          role: document.querySelector('.font-semibold')?.innerText,
          greeting: document.querySelector('p.text-xs')?.innerText
        };
      })()
    `,
    returnByValue: true,
  });
  console.log("Welcome Screen rendered:", welcomeStatus.result.value);

  // Wait for transition completion and navigation
  console.log("Waiting for welcome animation to complete and navigate to dashboard...");
  await new Promise(r => setTimeout(r, 3000));

  const postNav = await cdp('Runtime.evaluate', {
    expression: `
      ({
        url: window.location.href,
        title: document.title,
        sidebar: !!document.querySelector('aside'),
        header: !!document.querySelector('header'),
        main: !!document.querySelector('main'),
        bodySummary: document.body.innerText.slice(0, 200)
      })
    `,
    returnByValue: true,
  });
  console.log("Post-navigation Status:", postNav.result.value);

  const cookies = await cdp('Network.getCookies', { urls: ['http://localhost:3001/'] });
  console.log("Stored cookies count:", cookies.cookies.length);
  if (cookies.cookies.length > 0) {
    console.log("Cookie name:", cookies.cookies[0].name, "Secure:", cookies.cookies[0].secure);
  }

  ws.close();
  edgeProc.kill();
}

testSubmitSuccess().catch(console.error);
