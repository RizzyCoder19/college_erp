const fs = require('fs');
const path = require('path');
const { spawn } = require('child_process');

const ARTIFACT_DIR = 'C:\\Users\\ADMIN\\.gemini\\antigravity-ide\\brain\\4688303f-79ba-496e-ade1-bbed8cfa0d6e';

async function run() {
  const edgePath = 'C:\\Program Files (x86)\\Microsoft\\Edge\\Application\\msedge.exe';
  const edgePort = 9480;
  const tempProfileDir = path.resolve('temp_edge_phase1_verify');

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

  console.log('----------------------------------------------------');
  console.log('TEST 1: Initial Unlit State (Authentic Lamp)');
  console.log('----------------------------------------------------');
  await cdp('Network.clearBrowserCookies');
  await cdp('Page.navigate', { url: 'http://localhost:3000/login' });
  await new Promise(r => setTimeout(r, 2000));

  const state1 = await cdp('Runtime.evaluate', {
    expression: `(() => {
      const room = document.querySelector('.room');
      const card = document.querySelector('.login-card');
      const beam = document.querySelector('.light-beam');
      const hint = document.querySelector('.pull-hint');
      const welcomeCard = document.querySelector('.welcome-card');
      return {
        roomIsOn: room ? room.classList.contains('on') : false,
        cardOpacity: card ? window.getComputedStyle(card).opacity : null,
        cardPointerEvents: card ? window.getComputedStyle(card).pointerEvents : null,
        beamOpacity: beam ? window.getComputedStyle(beam).opacity : null,
        hintVisible: !!hint,
        welcomeCardPresent: !!welcomeCard,
      };
    })()`,
    returnByValue: true,
  });
  console.log('Initial Unlit State:', JSON.stringify(state1.result.value, null, 2));

  const snap1 = await cdp('Page.captureScreenshot', { format: 'png' });
  fs.writeFileSync(path.join(ARTIFACT_DIR, 'phase1_1_unlit_initial.png'), Buffer.from(snap1.data, 'base64'));
  console.log('Saved phase1_1_unlit_initial.png');

  console.log('----------------------------------------------------');
  console.log('TEST 2: Cord Pull Interaction & Form Illumination');
  console.log('----------------------------------------------------');
  await cdp('Runtime.evaluate', {
    expression: `document.querySelector('.string-handle').dispatchEvent(new KeyboardEvent('keydown', { key: 'Enter', bubbles: true }))`
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
  console.log('Illuminated State:', JSON.stringify(state2.result.value, null, 2));

  const snap2 = await cdp('Page.captureScreenshot', { format: 'png' });
  fs.writeFileSync(path.join(ARTIFACT_DIR, 'phase1_2_illuminated_card.png'), Buffer.from(snap2.data, 'base64'));
  console.log('Saved phase1_2_illuminated_card.png');

  console.log('----------------------------------------------------');
  console.log('TEST 3: Invalid Credentials Guard');
  console.log('----------------------------------------------------');
  await cdp('Runtime.evaluate', {
    expression: `(() => {
      const setV = (el, val) => {
        if (!el) return;
        Object.getOwnPropertyDescriptor(window.HTMLInputElement.prototype, 'value').set.call(el, val);
        el.dispatchEvent(new Event('input', { bubbles: true }));
        el.dispatchEvent(new Event('change', { bubbles: true }));
      };
      setV(document.querySelector('#login-email'), 'k.sharma@sample.rpihm.ac.in');
      setV(document.querySelector('#login-password'), 'WrongPassword123!');
      document.querySelector('#login-submit-button').click();
    })()`
  });
  await new Promise(r => setTimeout(r, 800));

  const state3 = await cdp('Runtime.evaluate', {
    expression: `(() => {
      const toast = document.querySelector('.feedback-toast');
      const transitionActive = !!document.querySelector('[aria-label^="Welcome transition"]');
      return {
        toastText: toast ? toast.innerText : null,
        toastVisible: toast ? toast.classList.contains('show') : false,
        transitionActive,
      };
    })()`,
    returnByValue: true,
  });
  console.log('Invalid Credentials State:', JSON.stringify(state3.result.value, null, 2));

  const snap3 = await cdp('Page.captureScreenshot', { format: 'png' });
  fs.writeFileSync(path.join(ARTIFACT_DIR, 'phase1_3_invalid_login.png'), Buffer.from(snap3.data, 'base64'));
  console.log('Saved phase1_3_invalid_login.png');

  console.log('----------------------------------------------------');
  console.log('TEST 4: Khushali Sharma Authentication & Cinematic Welcome');
  console.log('----------------------------------------------------');
  await cdp('Runtime.evaluate', {
    expression: `(() => {
      const setV = (el, val) => {
        if (!el) return;
        Object.getOwnPropertyDescriptor(window.HTMLInputElement.prototype, 'value').set.call(el, val);
        el.dispatchEvent(new Event('input', { bubbles: true }));
        el.dispatchEvent(new Event('change', { bubbles: true }));
      };
      setV(document.querySelector('#login-password'), 'RpihmHOD_8YfWdRrq9!');
      document.querySelector('#login-submit-button').click();
    })()`
  });
  // Wait 400ms for cinematic transition to mount
  await new Promise(r => setTimeout(r, 500));

  const state4 = await cdp('Runtime.evaluate', {
    expression: `(() => {
      const transition = document.querySelector('[aria-label^="Welcome transition"]');
      const title = transition ? transition.querySelector('h1') : null;
      const subtitle = transition ? transition.querySelector('p') : null;
      const rolePill = transition ? transition.querySelector('.inline-flex') : null;
      const canvas = transition ? transition.querySelector('canvas') : null;
      return {
        transitionPresent: !!transition,
        titleText: title ? title.innerText : null,
        greetingText: subtitle ? subtitle.innerText : null,
        roleText: rolePill ? rolePill.innerText : null,
        canvasPresent: !!canvas,
      };
    })()`,
    returnByValue: true,
  });
  console.log('Cinematic Welcome Transition State:', JSON.stringify(state4.result.value, null, 2));

  const snap4 = await cdp('Page.captureScreenshot', { format: 'png' });
  fs.writeFileSync(path.join(ARTIFACT_DIR, 'phase1_4_cinematic_welcome_khushali.png'), Buffer.from(snap4.data, 'base64'));
  console.log('Saved phase1_4_cinematic_welcome_khushali.png');

  console.log('----------------------------------------------------');
  console.log('TEST 5: Immediate Post-Login Dashboard (BEFORE Refresh)');
  console.log('----------------------------------------------------');
  // Wait for 1.8s welcome transition to navigate to dashboard
  await new Promise(r => setTimeout(r, 2200));

  const state5Immediate = await cdp('Runtime.evaluate', {
    expression: `(() => {
      const body = document.body;
      const bodyBg = window.getComputedStyle(body).backgroundColor;
      const bodyFont = window.getComputedStyle(body).fontFamily;
      const headerPos = document.querySelector('header') ? window.getComputedStyle(document.querySelector('header')).position : null;
      const sidebarBg = document.querySelector('aside') ? window.getComputedStyle(document.querySelector('aside')).backgroundColor : null;
      const heroGreeting = document.querySelector('.lg\\:col-span-7 h1') ? document.querySelector('.lg\\:col-span-7 h1').innerText : null;
      const heroBadge = document.querySelector('.lg\\:col-span-7 .uppercase span:last-child') ? document.querySelector('.lg\\:col-span-7 .uppercase span:last-child').innerText : null;
      const topBarName = document.querySelector('header button span.font-bold, header button div.font-bold') ? document.querySelector('header button div.font-bold').innerText : null;
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
        sidebarBg,
        heroGreeting,
        heroBadge,
        topBarName,
        rootVars,
      };
    })()`,
    returnByValue: true,
  });
  console.log('Immediate Post-Login Dashboard State (BEFORE Refresh):', JSON.stringify(state5Immediate.result.value, null, 2));

  const snap5Immediate = await cdp('Page.captureScreenshot', { format: 'png' });
  fs.writeFileSync(path.join(ARTIFACT_DIR, 'phase1_5_dashboard_immediate.png'), Buffer.from(snap5Immediate.data, 'base64'));
  console.log('Saved phase1_5_dashboard_immediate.png');

  console.log('----------------------------------------------------');
  console.log('TEST 6: Dashboard After Manual Refresh (F5 Comparison)');
  console.log('----------------------------------------------------');
  await cdp('Page.reload');
  await new Promise(r => setTimeout(r, 2000));

  const state6Refreshed = await cdp('Runtime.evaluate', {
    expression: `(() => {
      const body = document.body;
      const bodyBg = window.getComputedStyle(body).backgroundColor;
      const bodyFont = window.getComputedStyle(body).fontFamily;
      const headerPos = document.querySelector('header') ? window.getComputedStyle(document.querySelector('header')).position : null;
      const sidebarBg = document.querySelector('aside') ? window.getComputedStyle(document.querySelector('aside')).backgroundColor : null;
      const heroGreeting = document.querySelector('.lg\\:col-span-7 h1') ? document.querySelector('.lg\\:col-span-7 h1').innerText : null;
      const heroBadge = document.querySelector('.lg\\:col-span-7 .uppercase span:last-child') ? document.querySelector('.lg\\:col-span-7 .uppercase span:last-child').innerText : null;
      const topBarName = document.querySelector('header button div.font-bold') ? document.querySelector('header button div.font-bold').innerText : null;
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
        sidebarBg,
        heroGreeting,
        heroBadge,
        topBarName,
        rootVars,
      };
    })()`,
    returnByValue: true,
  });
  console.log('Refreshed Dashboard State (AFTER Refresh):', JSON.stringify(state6Refreshed.result.value, null, 2));

  const snap6Refreshed = await cdp('Page.captureScreenshot', { format: 'png' });
  fs.writeFileSync(path.join(ARTIFACT_DIR, 'phase1_6_dashboard_refreshed.png'), Buffer.from(snap6Refreshed.data, 'base64'));
  console.log('Saved phase1_6_dashboard_refreshed.png');

  console.log('----------------------------------------------------');
  console.log('TEST 7: Mobile Viewport Responsiveness (390x844)');
  console.log('----------------------------------------------------');
  await cdp('Emulation.setDeviceMetricsOverride', {
    width: 390,
    height: 844,
    deviceScaleFactor: 2,
    mobile: true,
  });
  await cdp('Page.navigate', { url: 'http://localhost:3000/login' });
  await new Promise(r => setTimeout(r, 2000));

  const snap7Mobile = await cdp('Page.captureScreenshot', { format: 'png' });
  fs.writeFileSync(path.join(ARTIFACT_DIR, 'phase1_7_mobile_login.png'), Buffer.from(snap7Mobile.data, 'base64'));
  console.log('Saved phase1_7_mobile_login.png');

  edgeProc.kill();
  console.log('=== All Phase 1 Verification Tests Complete ===');
}

run().catch(console.error);
