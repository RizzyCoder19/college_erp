const fs = require('fs');
const path = require('path');
const { spawn } = require('child_process');

async function test() {
  const edgePath = 'C:\\Program Files (x86)\\Microsoft\\Edge\\Application\\msedge.exe';
  const edgePort = 9472;
  const tempProfileDir = path.resolve('temp_edge_reproduce2');

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
    expression: "document.querySelector('.string-handle').dispatchEvent(new KeyboardEvent('keydown', { key: 'Enter', bubbles: true }))"
  });
  await new Promise(r => setTimeout(r, 800));

  // Enter admin credentials
  await cdp('Runtime.evaluate', {
    expression: `(() => {
      const setV = (el, val) => {
        if (!el) return;
        Object.getOwnPropertyDescriptor(window.HTMLInputElement.prototype, 'value').set.call(el, val);
        el.dispatchEvent(new Event('input', { bubbles: true }));
        el.dispatchEvent(new Event('change', { bubbles: true }));
      };
      setV(document.querySelector('#login-email'), 'admin.local@sample.rpihm.ac.in');
      setV(document.querySelector('#login-password'), 'RpihmAdmin_2gY5pbuPO5NYCfK79!');
      document.querySelector('#login-submit-button').click();
    })()`
  });

  // Wait for redirect to dashboard
  console.log('Waiting for welcome transition and navigation to dashboard...');
  await new Promise(r => setTimeout(r, 3500));

  // Capture immediately upon navigation (BEFORE refresh)
  const snapImmediate = await cdp('Page.captureScreenshot', { format: 'png' });
  fs.writeFileSync('reproduce_immediate_post_login.png', Buffer.from(snapImmediate.data, 'base64'));
  console.log('Saved reproduce_immediate_post_login.png');

  // Check DOM & computed styles
  const stylesImmediate = await cdp('Runtime.evaluate', {
    expression: `(() => {
      const body = document.body;
      const stylesheets = Array.from(document.querySelectorAll('link[rel=stylesheet], style')).map(s => (s.href || s.innerText || '').slice(0, 60));
      const bodyBg = window.getComputedStyle(body).backgroundColor;
      const bodyFont = window.getComputedStyle(body).fontFamily;
      const headerPos = document.querySelector('header') ? window.getComputedStyle(document.querySelector('header')).position : null;
      const headerBg = document.querySelector('header') ? window.getComputedStyle(document.querySelector('header')).backgroundColor : null;
      const sidebarBg = document.querySelector('aside') ? window.getComputedStyle(document.querySelector('aside')).backgroundColor : null;
      const rootVars = {
        fontFamily: window.getComputedStyle(document.documentElement).getPropertyValue('--font-family'),
        lampClr: window.getComputedStyle(document.documentElement).getPropertyValue('--lamp-clr'),
        navySidebar: window.getComputedStyle(document.documentElement).getPropertyValue('--navy-sidebar'),
        textMain: window.getComputedStyle(document.documentElement).getPropertyValue('--text-main'),
        textPrimary: window.getComputedStyle(document.documentElement).getPropertyValue('--text-primary'),
      };
      return {
        url: window.location.href,
        bodyBg,
        bodyFont,
        headerPos,
        headerBg,
        sidebarBg,
        rootVars,
        stylesheetsCount: stylesheets.length,
        lampStylesActive: Array.from(document.querySelectorAll('style, link')).some(s => (s.innerText || s.href || '').includes('lamp-container') || (s.innerText || s.href || '').includes('room')),
      };
    })()`,
    returnByValue: true
  });
  console.log('Immediate styles (BEFORE refresh):', JSON.stringify(stylesImmediate.result.value, null, 2));

  // Now reload page (F5 equivalent)
  console.log('Reloading page (F5)...');
  await cdp('Page.reload');
  await new Promise(r => setTimeout(r, 2000));

  const snapRefreshed = await cdp('Page.captureScreenshot', { format: 'png' });
  fs.writeFileSync('reproduce_after_refresh.png', Buffer.from(snapRefreshed.data, 'base64'));
  console.log('Saved reproduce_after_refresh.png');

  const stylesRefreshed = await cdp('Runtime.evaluate', {
    expression: `(() => {
      const body = document.body;
      const bodyBg = window.getComputedStyle(body).backgroundColor;
      const bodyFont = window.getComputedStyle(body).fontFamily;
      const headerPos = document.querySelector('header') ? window.getComputedStyle(document.querySelector('header')).position : null;
      const headerBg = document.querySelector('header') ? window.getComputedStyle(document.querySelector('header')).backgroundColor : null;
      const sidebarBg = document.querySelector('aside') ? window.getComputedStyle(document.querySelector('aside')).backgroundColor : null;
      const rootVars = {
        fontFamily: window.getComputedStyle(document.documentElement).getPropertyValue('--font-family'),
        lampClr: window.getComputedStyle(document.documentElement).getPropertyValue('--lamp-clr'),
        navySidebar: window.getComputedStyle(document.documentElement).getPropertyValue('--navy-sidebar'),
        textMain: window.getComputedStyle(document.documentElement).getPropertyValue('--text-main'),
        textPrimary: window.getComputedStyle(document.documentElement).getPropertyValue('--text-primary'),
      };
      return {
        url: window.location.href,
        bodyBg,
        bodyFont,
        headerPos,
        headerBg,
        sidebarBg,
        rootVars,
        lampStylesActive: Array.from(document.querySelectorAll('style, link')).some(s => (s.innerText || s.href || '').includes('lamp-container') || (s.innerText || s.href || '').includes('room')),
      };
    })()`,
    returnByValue: true
  });
  console.log('Refreshed styles (AFTER refresh):', JSON.stringify(stylesRefreshed.result.value, null, 2));

  edgeProc.kill();
}
test().catch(console.error);
