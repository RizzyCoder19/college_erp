const fs = require('fs');
const creds = JSON.parse(fs.readFileSync('dev-admin-credentials.json', 'utf-8'));

async function inspectSubmit() {
  const edgePort = 9496;
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

  await cdp('Page.navigate', { url: 'http://localhost:3001/login' });
  await new Promise(r => setTimeout(r, 2000));

  // Pull cord
  await cdp('Runtime.evaluate', {
    expression: "document.querySelector('.string-handle').dispatchEvent(new KeyboardEvent('keydown', { key: ' ' }))"
  });
  await new Promise(r => setTimeout(r, 1500));

  // Type credentials and CLICK submit button
  const evalResult = await cdp('Runtime.evaluate', {
    expression: `
      (() => {
        const email = document.getElementById('emailInput');
        const pass = document.getElementById('passwordInput');
        const submitBtn = document.querySelector('.submit-btn');
        if (email && pass && submitBtn) {
          email.value = ${JSON.stringify(creds.email)};
          email.dispatchEvent(new Event('input', { bubbles: true }));
          email.dispatchEvent(new Event('change', { bubbles: true }));

          pass.value = ${JSON.stringify(creds.password)};
          pass.dispatchEvent(new Event('input', { bubbles: true }));
          pass.dispatchEvent(new Event('change', { bubbles: true }));

          submitBtn.click();
          return "Clicked submitBtn";
        }
        return "Elements not found";
      })()
    `,
    returnByValue: true
  });
  console.log("Submit trigger result:", evalResult.result.value);

  // Wait 4 seconds and check URL and cookies
  await new Promise(r => setTimeout(r, 4000));

  const cookiesResult = await cdp('Network.getCookies', { urls: ['http://localhost:3001'] });
  console.log("Cookies:", cookiesResult.cookies.map(c => ({ name: c.name, value: c.value.slice(0, 10) + '...' })));

  const urlResult = await cdp('Runtime.evaluate', { expression: 'window.location.href', returnByValue: true });
  console.log("Final URL:", urlResult.result.value);

  ws.close();
}

inspectSubmit().catch(console.error);
