const fs = require('fs');
const path = require('path');
const crypto = require('crypto');
const { spawn } = require('child_process');
const { PrismaClient } = require('@prisma/client');

const prisma = new PrismaClient();
const ARTIFACT_DIR = path.resolve('C:/Users/ADMIN/.gemini/antigravity-ide/brain/4688303f-79ba-496e-ade1-bbed8cfa0d6e');
const BASE_URL = 'http://localhost:3005';

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
  const edgePort = 9598;
  const tempProfileDir = path.resolve('temp_edge_m6_completion_v2');

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
    await capture('m6_completion_finance_overview.png');

    // Switch to POS / Collection tab
    console.log('\n--- 2. Switching to Cashier POS Tab ---');
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
    await capture('m6_completion_pos_initial.png');

    // Test live student autocomplete search
    console.log('\n--- 3. Testing Live Student Autocomplete Search ("Aarav") ---');
    await send('Runtime.evaluate', {
      expression: `
        (() => {
          const searchInput = document.querySelector('input[placeholder*="Search by Student Name"]');
          if (searchInput) {
            searchInput.focus();
            const nativeInputValueSetter = Object.getOwnPropertyDescriptor(window.HTMLInputElement.prototype, 'value').set;
            nativeInputValueSetter.call(searchInput, 'Aarav');
            searchInput.dispatchEvent(new Event('input', { bubbles: true }));
          }
        })()
      `,
    });
    await delay(1500);
    await capture('m6_completion_search_dropdown.png');

    // Click first search result to select student and load fee ledger
    console.log('\n--- 4. Selecting Student from Autocomplete Search ---');
    await send('Runtime.evaluate', {
      expression: `
        (() => {
          const resultItems = Array.from(document.querySelectorAll('div.cursor-pointer'));
          const aaravItem = resultItems.find(el => el.textContent.includes('Aarav'));
          if (aaravItem) {
            aaravItem.click();
          } else {
            const retrieveBtn = document.querySelector('button[type="submit"]');
            if (retrieveBtn) retrieveBtn.click();
          }
        })()
      `,
    });
    await delay(2500);
    await capture('m6_completion_selected_student_ledger.png');

    // Switch to Fee Structures tab
    console.log('\n--- 5. Switching to Fee Structures Tab ---');
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
    await capture('m6_completion_fee_structures.png');

    // Switch to Defaulters Roster tab
    console.log('\n--- 6. Switching to Defaulters Roster Tab ---');
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
    await capture('m6_completion_defaulters_roster.png');

    // Navigate to Students module & open student detail modal
    console.log('\n--- 7. Navigating to Students Module & Inspecting Dossier Financial View ---');
    await send('Page.navigate', { url: `${BASE_URL}/modules/students` });
    await delay(3500);
    await capture('m6_completion_students_register.png');

    // Click on the first student to open full dossier
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

    // Scroll down inside the modal to reveal Financial Ledger & Fee Clearance section
    await send('Runtime.evaluate', {
      expression: `
        (() => {
          const allScrollables = Array.from(document.querySelectorAll('.overflow-y-auto'));
          const modalBody = allScrollables[allScrollables.length - 1];
          if (modalBody) {
            modalBody.scrollTop = modalBody.scrollHeight;
          }
        })()
      `,
    });
    await delay(1000);
    await capture('m6_completion_student_dossier_financial.png');

    // 8. Mobile Viewport (390x844)
    console.log('\n--- 8. Emulating Mobile Viewport (390x844) ---');
    await send('Emulation.setDeviceMetricsOverride', {
      width: 390,
      height: 844,
      deviceScaleFactor: 2,
      mobile: true,
    });
    await delay(1000);

    await send('Page.navigate', { url: `${BASE_URL}/modules/finance` });
    await delay(3500);
    await capture('m6_completion_mobile_finance.png');

    // Switch to POS on mobile
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
    await capture('m6_completion_mobile_pos.png');

    console.log('\n==================================================================');
    console.log('BROWSER VERIFICATION COMPLETE - ALL EVIDENCE RECORDED');
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
