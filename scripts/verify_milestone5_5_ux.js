const fs = require('fs');
const path = require('path');
const { spawn } = require('child_process');

const ARTIFACT_DIR = path.resolve('C:/Users/ADMIN/.gemini/antigravity-ide/brain/4688303f-79ba-496e-ade1-bbed8cfa0d6e');
const BASE_URL = 'http://localhost:3001';

async function run() {
  const edgePath = 'C:\\Program Files (x86)\\Microsoft\\Edge\\Application\\msedge.exe';
  const edgePort = 9495;
  const tempProfileDir = path.resolve('temp_edge_m5_5_ux');

  console.log(`Starting headless Edge on port ${edgePort}...`);
  const edgeProc = spawn(edgePath, [
    '--headless',
    '--remote-debugging-port=' + edgePort,
    '--user-data-dir=' + tempProfileDir,
    '--disable-gpu',
    '--no-sandbox',
    '--window-size=1440,900',
  ]);

  // Wait for Edge CDP to become available
  for (let i = 0; i < 30; i++) {
    await new Promise((r) => setTimeout(r, 300));
    try {
      const res = await fetch(`http://localhost:${edgePort}/json/version`);
      if (res.ok) break;
    } catch {}
  }

  const tab = await (await fetch(`http://localhost:${edgePort}/json/new`, { method: 'PUT' })).json();
  const ws = new WebSocket(tab.webSocketDebuggerUrl);
  await new Promise((r) => ws.addEventListener('open', r));

  function cdp(method, params = {}) {
    return new Promise((resolve, reject) => {
      const id = Math.floor(Math.random() * 1e6);
      const h = (e) => {
        const m = JSON.parse(e.data);
        if (m.id === id) {
          ws.removeEventListener('message', h);
          if (m.error) reject(m.error);
          else resolve(m.result);
        }
      };
      ws.addEventListener('message', h);
      ws.send(JSON.stringify({ id, method, params }));
    });
  }

  function delay(ms) {
    return new Promise((resolve) => setTimeout(resolve, ms));
  }

  async function captureScreenshot(filename) {
    const { data } = await cdp('Page.captureScreenshot', { format: 'png' });
    const buf = Buffer.from(data, 'base64');
    const targetPath = path.join(ARTIFACT_DIR, filename);
    fs.writeFileSync(targetPath, buf);
    console.log(`[CAPTURED] ${filename} (${buf.length} bytes)`);
    return targetPath;
  }

  async function setViewport(width, height) {
    await cdp('Emulation.setDeviceMetricsOverride', {
      width,
      height,
      deviceScaleFactor: 2,
      mobile: width < 768,
      fitWindow: false,
    });
    await delay(350);
  }

  async function pullCord() {
    await cdp('Runtime.evaluate', {
      expression: `
        (() => {
          const handle = document.querySelector('.string-handle');
          if (handle) {
            handle.dispatchEvent(new KeyboardEvent('keydown', { key: ' ', bubbles: true }));
          }
        })()
      `,
    });
    await delay(700);
  }

  await cdp('Page.enable');
  await cdp('DOM.enable');
  await cdp('Runtime.enable');

  console.log('\n======================================================');
  console.log('PART 1: DESKTOP ORIGINAL LAMP COLOR CYCLING');
  console.log('======================================================');

  await setViewport(1440, 900);
  await cdp('Page.navigate', { url: `${BASE_URL}/login` });
  await delay(2500);

  // Desktop State 1: Unlit lamp initial state
  await captureScreenshot('lamp_desktop_unlit.png');

  // Pull 1: Warm Amber Gold
  await pullCord();
  await captureScreenshot('lamp_desktop_pull1_warm.png');

  // Pull 2: Cyber Cyan
  await pullCord();
  await captureScreenshot('lamp_desktop_pull2_cyber.png');

  // Pull 3: Electric Violet
  await pullCord();
  await captureScreenshot('lamp_desktop_pull3_violet.png');

  // Pull 4: Off
  await pullCord();
  await captureScreenshot('lamp_desktop_pull4_off.png');

  // Pull 5: Wraparound to Warm Amber Gold
  await pullCord();
  await captureScreenshot('lamp_desktop_pull5_wraparound.png');

  console.log('\n======================================================');
  console.log('PART 2: MOBILE VIEWPORTS SEQUENCED OPENING');
  console.log('======================================================');

  const mobileViewports = [
    { w: 390, h: 844, name: '390x844' },
    { w: 320, h: 700, name: '320x700' },
    { w: 360, h: 800, name: '360x800' },
    { w: 430, h: 932, name: '430x932' },
  ];

  for (const vp of mobileViewports) {
    console.log(`\n--- Testing Mobile Viewport: ${vp.name} ---`);
    await setViewport(vp.w, vp.h);
    await cdp('Page.navigate', { url: `${BASE_URL}/login` });
    await delay(2000);

    // State 1: Unlit lamp centered, card hidden
    await captureScreenshot(`lamp_mobile_${vp.name}_state1_unlit.png`);

    // First cord pull: illuminates lamp, triggers reveal -> lamp exits layout
    await pullCord();
    // Wait for the smooth reveal and exit transition (1000ms transition + 600ms cushion)
    await delay(1600);

    // State 3: Lamp removed from layout, login form focused & ready
    await captureScreenshot(`lamp_mobile_${vp.name}_state3_form_ready.png`);

    // Verify horizontal overflow on the login page
    const overflowCheck = await cdp('Runtime.evaluate', {
      expression: `
        ({
          scrollWidth: document.documentElement.scrollWidth,
          clientWidth: document.documentElement.clientWidth,
          hasWindowOverflow: document.documentElement.scrollWidth > document.documentElement.clientWidth,
          lampDisplay: window.getComputedStyle(document.querySelector('.lamp-side')).display,
          cardDisplay: window.getComputedStyle(document.querySelector('.login-side')).display
        })
      `,
      returnByValue: true,
    });
    console.log(`[VERIFY ${vp.name}] Layout State:`, overflowCheck.result.value);

    // For 390x844, also test invalid login feedback and full authentication transition
    if (vp.name === '390x844') {
      console.log('Testing invalid credentials feedback on 390x844...');
      await cdp('Runtime.evaluate', {
        expression: `
          (() => {
            const email = document.getElementById('emailInput');
            const pass = document.getElementById('passwordInput');
            const form = document.querySelector('.auth-form');
            if (email && pass && form) {
              email.focus();
              document.execCommand('selectAll', false, null);
              document.execCommand('insertText', false, 'admin@rpihm.edu.in');
              pass.focus();
              document.execCommand('selectAll', false, null);
              document.execCommand('insertText', false, 'WrongPassword123');
              form.dispatchEvent(new Event('submit', { bubbles: true, cancelable: true }));
            }
          })()
        `,
      });
      await delay(1200);
      await captureScreenshot('lamp_mobile_390x844_invalid_feedback.png');

      console.log('Testing authentic login & mobile transition on 390x844...');
      await cdp('Runtime.evaluate', {
        expression: `
          (() => {
            const email = document.getElementById('emailInput');
            const pass = document.getElementById('passwordInput');
            const form = document.querySelector('.auth-form');
            if (email && pass && form) {
              email.focus();
              document.execCommand('selectAll', false, null);
              document.execCommand('insertText', false, 'admin@rpihm.edu.in');
              pass.focus();
              document.execCommand('selectAll', false, null);
              document.execCommand('insertText', false, 'RpihmAdmin@2026');
              form.dispatchEvent(new Event('submit', { bubbles: true, cancelable: true }));
            }
          })()
        `,
      });
      await delay(900);
      await captureScreenshot('lamp_mobile_390x844_welcome.png');

      // Wait for redirect to dashboard
      await delay(3500);
      await captureScreenshot('mobile_dashboard_authenticated.png');

      // Check mobile dashboard overflow
      const dashOverflow = await cdp('Runtime.evaluate', {
        expression: `
          ({
            scrollWidth: document.documentElement.scrollWidth,
            clientWidth: document.documentElement.clientWidth,
            hasWindowOverflow: document.documentElement.scrollWidth > document.documentElement.clientWidth,
            title: document.title
          })
        `,
        returnByValue: true,
      });
      console.log('[VERIFY Dashboard 390x844]:', dashOverflow.result.value);
    }
  }

  // Restore desktop viewport before ending
  await setViewport(1440, 900);
  ws.close();
  edgeProc.kill();
  console.log('\n======================================================');
  console.log('ALL VERIFICATION STEPS COMPLETED SUCCESSFULLY');
  console.log('======================================================');
}

run().catch((err) => {
  console.error('ERROR in verification:', err);
  process.exit(1);
});
