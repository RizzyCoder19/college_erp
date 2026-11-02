const fs = require('fs');
const path = require('path');
const { spawn } = require('child_process');

async function testSubmit() {
  const edgePath = 'C:\\Program Files (x86)\\Microsoft\\Edge\\Application\\msedge.exe';
  const edgePort = 9485;
  const tempProfileDir = path.resolve('temp_edge_submit_inspect');

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

  await cdp('Network.clearBrowserCookies');
  await cdp('Page.navigate', { url: 'http://localhost:3000/login' });
  await new Promise(r => setTimeout(r, 2000));

  // Turn on lamp
  await cdp('Runtime.evaluate', {
    expression: `document.querySelector('.string-handle').dispatchEvent(new KeyboardEvent('keydown', { key: 'Enter', bubbles: true }))`
  });
  await new Promise(r => setTimeout(r, 800));

  // Submit Khushali's credentials
  const res = await cdp('Runtime.evaluate', {
    expression: `(() => {
      const emailInput = document.querySelector('#login-email');
      const passInput = document.querySelector('#login-password');
      const setV = (el, val) => {
        if (!el) return;
        Object.getOwnPropertyDescriptor(window.HTMLInputElement.prototype, 'value').set.call(el, val);
        el.dispatchEvent(new Event('input', { bubbles: true }));
        el.dispatchEvent(new Event('change', { bubbles: true }));
      };
      setV(emailInput, 'k.sharma@sample.rpihm.ac.in');
      setV(passInput, 'RpihmHOD_8YfWdRrq9!');
      document.querySelector('#login-submit-button').click();
      return { emailVal: emailInput.value, passVal: passInput.value };
    })()`,
    returnByValue: true
  });
  console.log('Inputs filled:', res.result.value);

  // Wait 1.5 seconds and check DOM
  await new Promise(r => setTimeout(r, 1500));

  const afterState = await cdp('Runtime.evaluate', {
    expression: `(() => {
      const toast = document.querySelector('.feedback-toast');
      const transition = document.querySelector('[aria-label^="Welcome transition"]');
      return {
        url: window.location.href,
        toastText: toast ? toast.innerText : null,
        toastClass: toast ? toast.className : null,
        transitionFound: !!transition,
        bodyHtmlSnippet: document.body.innerHTML.slice(0, 300),
      };
    })()`,
    returnByValue: true
  });
  console.log('After submit state:', afterState.result.value);

  edgeProc.kill();
}
testSubmit().catch(console.error);
