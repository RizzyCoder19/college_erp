const fs = require('fs');
const path = require('path');
const crypto = require('crypto');
const { spawn } = require('child_process');
const { PrismaClient } = require('@prisma/client');

const prisma = new PrismaClient();
const ARTIFACT_DIR = path.resolve('C:/Users/ADMIN/.gemini/antigravity-ide/brain/4688303f-79ba-496e-ade1-bbed8cfa0d6e');
const BASE_URL = 'http://localhost:3001';

async function runBrowserAcceptance() {
  const adminUser = await prisma.userAccount.findFirst({
    where: { role: 'SYSTEM_ADMIN' },
  });

  if (!adminUser) {
    throw new Error('No admin user found.');
  }

  // Create active session token
  const rawToken = crypto.randomBytes(32).toString('hex');
  const tokenHash = crypto.createHash('sha256').update(rawToken).digest('hex');
  const expiresAt = new Date(Date.now() + 7 * 24 * 3600 * 1000);

  const session = await prisma.session.create({
    data: {
      userId: adminUser.id,
      tokenHash,
      expiresAt,
    },
  });

  console.log(`Created test session for admin: ${adminUser.email}`);

  const edgePath = 'C:\\Program Files (x86)\\Microsoft\\Edge\\Application\\msedge.exe';
  const edgePort = 9596;
  const tempProfileDir = path.resolve('temp_edge_m6_verify');

  console.log(`Starting headless Edge on port ${edgePort}...`);
  const edgeProc = spawn(edgePath, [
    '--headless',
    '--remote-debugging-port=' + edgePort,
    '--user-data-dir=' + tempProfileDir,
    '--disable-gpu',
    '--no-sandbox',
    '--window-size=1440,900',
  ]);

  try {
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

    let msgId = 1;
    function send(method, params = {}) {
      return new Promise((resolve, reject) => {
        const id = msgId++;
        const timeout = setTimeout(() => reject(new Error(`Timeout: ${method}`)), 20000);
        const h = (event) => {
          const msg = JSON.parse(event.data);
          if (msg.id === id) {
            clearTimeout(timeout);
            ws.removeEventListener('message', h);
            if (msg.error) reject(new Error(msg.error.message));
            else resolve(msg.result);
          }
        };
        ws.addEventListener('message', h);
        ws.send(JSON.stringify({ id, method, params }));
      });
    }

    function delay(ms) {
      return new Promise((resolve) => setTimeout(resolve, ms));
    }

    async function capture(filename) {
      const { data } = await send('Page.captureScreenshot', { format: 'png' });
      const outPath = path.join(ARTIFACT_DIR, filename);
      fs.writeFileSync(outPath, Buffer.from(data, 'base64'));
      console.log(`Captured: ${filename}`);
      return outPath;
    }

    await send('Page.enable');
    await send('DOM.enable');
    await send('Runtime.enable');
    await send('Network.enable');

    // Set authenticated cookie directly
    await send('Network.setCookie', {
      name: 'rpihm_session_token',
      value: rawToken,
      domain: 'localhost',
      path: '/',
      httpOnly: true,
      secure: false,
      sameSite: 'Lax',
    });

    console.log('\n--- 1. Navigating to Finance Module (Desktop 1440x900) ---');
    await send('Page.navigate', { url: `${BASE_URL}/modules/finance` });
    await delay(3500);
    await capture('milestone6_finance_desktop_overview.png');

    // Inspect tabs and switch to Fee Structures tab
    console.log('\n--- 2. Switching to Fee Structures Tab ---');
    await send('Runtime.evaluate', {
      expression: `
        (() => {
          const buttons = Array.from(document.querySelectorAll('button'));
          const structBtn = buttons.find(b => b.textContent.includes('Fee Structures') || b.textContent.includes('Structures'));
          if (structBtn) structBtn.click();
        })()
      `,
    });
    await delay(1500);
    await capture('milestone6_finance_desktop_structures.png');

    // Click "Create Fee Structure" modal button
    console.log('\n--- 3. Opening Fee Structure Creation Modal ---');
    await send('Runtime.evaluate', {
      expression: `
        (() => {
          const buttons = Array.from(document.querySelectorAll('button'));
          const createBtn = buttons.find(b => b.textContent.includes('Create Fee Structure') || b.textContent.includes('New Structure'));
          if (createBtn) createBtn.click();
        })()
      `,
    });
    await delay(1500);
    await capture('milestone6_finance_desktop_modal.png');

    // Close modal
    await send('Runtime.evaluate', {
      expression: `
        (() => {
          const buttons = Array.from(document.querySelectorAll('button'));
          const closeBtn = buttons.find(b => b.textContent.includes('Cancel') || b.textContent.includes('Close') || b.textContent.includes('✕'));
          if (closeBtn) closeBtn.click();
        })()
      `,
    });
    await delay(1000);

    // Switch to Defaulters Roster tab
    console.log('\n--- 4. Switching to Defaulters Roster Tab ---');
    await send('Runtime.evaluate', {
      expression: `
        (() => {
          const buttons = Array.from(document.querySelectorAll('button'));
          const defBtn = buttons.find(b => b.textContent.includes('Defaulter') || b.textContent.includes('Defaulters'));
          if (defBtn) defBtn.click();
        })()
      `,
    });
    await delay(1500);
    await capture('milestone6_finance_desktop_defaulters.png');

    // Switch to POS Collection tab
    console.log('\n--- 5. Switching to Cashier POS Tab ---');
    await send('Runtime.evaluate', {
      expression: `
        (() => {
          const buttons = Array.from(document.querySelectorAll('button'));
          const posBtn = buttons.find(b => b.textContent.includes('POS') || b.textContent.includes('Collection'));
          if (posBtn) posBtn.click();
        })()
      `,
    });
    await delay(1500);
    await capture('milestone6_finance_desktop_pos.png');

    // Navigate to Students module & open student detail modal
    console.log('\n--- 6. Navigating to Students Module & Inspecting Dossier Ledger ---');
    await send('Page.navigate', { url: `${BASE_URL}/modules/students` });
    await delay(3500);

    // Click on the first student card / row to open dossier
    await send('Runtime.evaluate', {
      expression: `
        (() => {
          const dossierBtn = document.querySelector('button[title="View Full Dossier"]') || document.querySelector('button.p-1\\\\.5');
          if (dossierBtn) {
            dossierBtn.click();
          } else {
            const anyBtn = document.querySelector('table tbody tr button');
            if (anyBtn) anyBtn.click();
          }
        })()
      `,
    });
    await delay(2500);
    await capture('milestone6_student_dossier_ledger.png');

    // 7. Mobile Viewport (390x844)
    console.log('\n--- 7. Emulating Mobile Viewport (390x844) ---');
    await send('Emulation.setDeviceMetricsOverride', {
      width: 390,
      height: 844,
      deviceScaleFactor: 2,
      mobile: true,
    });
    await delay(1000);

    await send('Page.navigate', { url: `${BASE_URL}/modules/finance` });
    await delay(3500);
    await capture('milestone6_finance_mobile_overview.png');

    // Switch to POS tab on mobile
    await send('Runtime.evaluate', {
      expression: `
        (() => {
          const buttons = Array.from(document.querySelectorAll('button'));
          const posBtn = buttons.find(b => b.textContent.includes('POS') || b.textContent.includes('Collection'));
          if (posBtn) posBtn.click();
        })()
      `,
    });
    await delay(1500);
    await capture('milestone6_finance_mobile_pos.png');

    console.log('\n==================================================================');
    console.log('BROWSER ACCEPTANCE TESTING COMPLETE - ALL SCREENSHOTS SAVED');
    console.log('==================================================================\n');

    ws.close();
  } finally {
    edgeProc.kill();
    // Clean up temporary session
    await prisma.session.delete({
      where: { id: session.id },
    });
    await prisma.$disconnect();
  }
}

runBrowserAcceptance().catch((err) => {
  console.error('Browser Acceptance Fatal Error:', err);
  process.exit(1);
});
