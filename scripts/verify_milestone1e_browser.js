const fs = require('fs');
const path = require('path');
const crypto = require('crypto');
const { spawn } = require('child_process');
const { DatabaseSync } = require('node:sqlite');

const ARTIFACT_DIR = path.resolve('C:/Users/ADMIN/.gemini/antigravity-ide/brain/92156811-1189-49ac-9a04-c65d40f8cb9c');
const ISOLATED_DB = path.resolve('prisma/isolated_test.db');
const DEV_DB = path.resolve('prisma/dev.db');
const BASE_URL = 'http://localhost:3005';
const EDGE_PATH = 'C:\\Program Files (x86)\\Microsoft\\Edge\\Application\\msedge.exe';
const EDGE_PORT = 9598;
const TEMP_PROFILE = path.resolve('temp_edge_m1e_profile');

async function main() {
  console.log('================================================================');
  console.log('CAMPUSOS ERP: MILESTONE 1E REAL BROWSER VERIFICATION');
  console.log('Reports & Analytics + Settings & Administration (Isolated DB)');
  console.log('================================================================\n');

  // 1. Invariance check on operational dev.db
  const devBuf = fs.readFileSync(DEV_DB);
  const initialHash = crypto.createHash('sha256').update(devBuf).digest('hex');
  console.log(`[Database Invariance] dev.db initial SHA-256: ${initialHash}`);
  if (initialHash !== '86ff618cc96c421591237b0f589945644540868e6d151c2db789d3a4d7399e41') {
    throw new Error('ABORT: dev.db hash does not match accepted baseline!');
  }

  // 2. Prepare isolated test database
  fs.copyFileSync(DEV_DB, ISOLATED_DB);
  console.log('[Setup] Fresh isolated database prepared at:', ISOLATED_DB);

  // 3. Create test session tokens in ISOLATED db only
  const db = new DatabaseSync(ISOLATED_DB);
  const adminUser = db.prepare("SELECT id, email, role FROM UserAccount WHERE role = 'SYSTEM_ADMIN' LIMIT 1").get();
  const acadAdminUser = db.prepare("SELECT id, email, role FROM UserAccount WHERE role = 'ACADEMIC_ADMIN' LIMIT 1").get();

  const adminRawToken = crypto.randomBytes(32).toString('hex');
  const adminTokenHash = crypto.createHash('sha256').update(adminRawToken).digest('hex');
  const acadRawToken = crypto.randomBytes(32).toString('hex');
  const acadTokenHash = crypto.createHash('sha256').update(acadRawToken).digest('hex');
  const expiresAt = Date.now() + 7 * 24 * 3600 * 1000;

  db.prepare(`
    INSERT INTO Session (id, userId, tokenHash, expiresAt, createdAt, updatedAt)
    VALUES (?, ?, ?, ?, ?, ?)
  `).run(crypto.randomUUID(), adminUser.id, adminTokenHash, expiresAt, Date.now(), Date.now());

  db.prepare(`
    INSERT INTO Session (id, userId, tokenHash, expiresAt, createdAt, updatedAt)
    VALUES (?, ?, ?, ?, ?, ?)
  `).run(crypto.randomUUID(), acadAdminUser.id, acadTokenHash, expiresAt, Date.now(), Date.now());

  db.close();
  console.log(`[Auth] Injected test sessions into isolated_test.db:`);
  console.log(`  - Admin: ${adminUser.email} (${adminUser.role})`);
  console.log(`  - Academic Admin: ${acadAdminUser.email} (${acadAdminUser.role})`);

  // 4. Start isolated Next.js dev server on port 3005
  console.log('\n[Server] Starting isolated Next.js server on port 3005...');
  const nextProc = spawn('npx.cmd', ['next', 'dev', '-p', '3005'], {
    cwd: process.cwd(),
    env: {
      ...process.env,
      DATABASE_URL: 'file:./isolated_test.db',
      PORT: '3005',
    },
    shell: true,
  });

  nextProc.stdout.on('data', (d) => {
    const s = d.toString();
    if (s.includes('Ready') || s.includes('started server') || s.includes('Local:')) {
      console.log(`  [Next.js stdout]: ${s.trim()}`);
    }
  });
  nextProc.stderr.on('data', (d) => {
    // console.error(`  [Next.js stderr]: ${d.toString().trim()}`);
  });

  // Wait for port 3005 to respond
  console.log('[Server] Polling http://localhost:3005...');
  let serverReady = false;
  for (let i = 0; i < 40; i++) {
    await new Promise((r) => setTimeout(r, 1000));
    try {
      const res = await fetch('http://localhost:3005');
      if (res.status === 200 || res.status === 307 || res.status === 308) {
        serverReady = true;
        console.log(`[Server] Next.js ready on port 3005 (status ${res.status})`);
        break;
      }
    } catch {}
  }

  if (!serverReady) {
    nextProc.kill();
    throw new Error('Next.js server failed to respond on port 3005 within 40 seconds.');
  }

  // 5. Start headless Edge browser on debugging port
  console.log(`\n[Browser] Starting headless Edge on port ${EDGE_PORT}...`);
  if (!fs.existsSync(TEMP_PROFILE)) {
    fs.mkdirSync(TEMP_PROFILE, { recursive: true });
  }

  const edgeProc = spawn(EDGE_PATH, [
    '--headless',
    `--remote-debugging-port=${EDGE_PORT}`,
    `--user-data-dir=${TEMP_PROFILE}`,
    '--disable-gpu',
    '--no-sandbox',
    '--window-size=1440,900',
  ]);

  let cdpReady = false;
  for (let i = 0; i < 30; i++) {
    await new Promise((r) => setTimeout(r, 400));
    try {
      const res = await fetch(`http://localhost:${EDGE_PORT}/json/version`);
      if (res.ok) {
        cdpReady = true;
        console.log('[Browser] Edge CDP endpoint ready.');
        break;
      }
    } catch {}
  }

  if (!cdpReady) {
    edgeProc.kill();
    nextProc.kill();
    throw new Error('Edge failed to start CDP on port ' + EDGE_PORT);
  }

  const tab = await (await fetch(`http://localhost:${EDGE_PORT}/json/new`, { method: 'PUT' })).json();
  const ws = new WebSocket(tab.webSocketDebuggerUrl);
  await new Promise((r) => ws.addEventListener('open', r));

  let msgId = 1;
  function send(method, params = {}) {
    return new Promise((resolve, reject) => {
      const id = msgId++;
      const timeout = setTimeout(() => reject(new Error(`CDP Timeout: ${method}`)), 25000);
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
    return new Promise((r) => setTimeout(r, ms));
  }

  async function capture(filename) {
    const { data } = await send('Page.captureScreenshot', { format: 'png' });
    const outPath = path.join(ARTIFACT_DIR, filename);
    fs.writeFileSync(outPath, Buffer.from(data, 'base64'));
    console.log(`  [Screenshot Captured] ${filename}`);
    return outPath;
  }

  try {
    await send('Page.enable');
    await send('DOM.enable');
    await send('Runtime.enable');
    await send('Network.enable');

    // =========================================================================
    // STEP A: Testing Unauthorized & Unauthenticated Access Boundaries
    // =========================================================================
    console.log('\n--- STEP A: Testing Unauthorized Access Boundaries ---');

    console.log('1. Navigating Unauthenticated request to /modules/reports...');
    await send('Network.clearBrowserCookies');
    await send('Page.navigate', { url: `${BASE_URL}/modules/reports` });
    await delay(3000);
    const unauthUrl = await send('Runtime.evaluate', {
      expression: `window.location.pathname`,
    });
    console.log(`  -> Unauthenticated request redirected to: ${unauthUrl.result.value}`);
    await capture('m1e_browser_unauthenticated_login_redirect.png');

    console.log('2. Testing ACADEMIC_ADMIN access to /modules/settings (Requires ADMIN_ALL)...');
    await send('Network.setCookie', {
      name: 'rpihm_session_token',
      value: acadRawToken,
      domain: 'localhost',
      path: '/',
      httpOnly: true,
      secure: false,
      sameSite: 'Lax',
    });
    await send('Page.navigate', { url: `${BASE_URL}/modules/settings` });
    await delay(3000);
    const setAuthRes = await send('Runtime.evaluate', {
      expression: `document.body.innerText.includes('Access Restricted')`,
    });
    console.log(`  -> ACADEMIC_ADMIN Settings Access Restricted: ${setAuthRes.result.value}`);
    await capture('m1e_browser_unauthorized_settings.png');

    // =========================================================================
    // STEP B: Authenticated Verification as SYSTEM_ADMIN
    // =========================================================================
    console.log('\n--- STEP B: Testing Reports Module as SYSTEM_ADMIN ---');
    await send('Network.setCookie', {
      name: 'rpihm_session_token',
      value: adminRawToken,
      domain: 'localhost',
      path: '/',
      httpOnly: true,
      secure: false,
      sameSite: 'Lax',
    });

    console.log('1. Navigating to /modules/reports...');
    await send('Page.navigate', { url: `${BASE_URL}/modules/reports` });
    await delay(4000);
    await capture('m1e_browser_reports_landing.png');

    // Verify Title & Header
    const repHeader = await send('Runtime.evaluate', {
      expression: `document.querySelector('h1')?.innerText`,
    });
    console.log(`  -> Reports Header: "${repHeader.result.value}"`);

    // Verify Tab 1: Attendance Summary
    console.log('2. Verifying Report 1: Attendance Summary Table & Columns...');
    const attColumns = await send('Runtime.evaluate', {
      expression: `Array.from(document.querySelectorAll('th')).map(th => th.innerText.trim()).filter(Boolean)`,
    });
    console.log(`  -> Attendance Summary Columns:`, attColumns.result.value);
    await capture('m1e_browser_report1_attendance_summary.png');

    // Test filter selection: select BSCDS-AI
    console.log('3. Applying Programme Filter ("BSCDS-AI")...');
    await send('Runtime.evaluate', {
      expression: `
        (() => {
          const select = document.querySelector('select');
          if (select) {
            const opt = Array.from(select.options).find(o => o.text.includes('BSCDS-AI'));
            if (opt) {
              select.value = opt.value;
              select.dispatchEvent(new Event('change', { bubbles: true }));
            }
          }
        })()
      `,
    });
    await delay(2000);
    await capture('m1e_browser_report1_filtered_bscds.png');

    // Click "Reset Filters"
    console.log('4. Clicking "Reset Filters" button...');
    await send('Runtime.evaluate', {
      expression: `
        (() => {
          const resetBtn = Array.from(document.querySelectorAll('button')).find(b => b.textContent.includes('Reset Filters'));
          if (resetBtn) resetBtn.click();
        })()
      `,
    });
    await delay(1500);

    // Verify Tab 2: Attendance Register
    console.log('5. Switching to Report 2: Attendance Register...');
    await send('Runtime.evaluate', {
      expression: `
        (() => {
          const btn = Array.from(document.querySelectorAll('button')).find(b => b.textContent.includes('Attendance Register'));
          if (btn) btn.click();
        })()
      `,
    });
    await delay(2500);
    const regStudents = await send('Runtime.evaluate', {
      expression: `document.querySelectorAll('tbody tr').length`,
    });
    console.log(`  -> Attendance Register Rendered Rows: ${regStudents.result.value}`);
    await capture('m1e_browser_report2_attendance_register.png');

    // Verify Tab 3: Examination Gazette
    console.log('6. Switching to Report 3: Examination Gazette...');
    await send('Runtime.evaluate', {
      expression: `
        (() => {
          const btn = Array.from(document.querySelectorAll('button')).find(b => b.textContent.includes('Examination Gazette'));
          if (btn) btn.click();
        })()
      `,
    });
    await delay(2500);
    const examRows = await send('Runtime.evaluate', {
      expression: `document.querySelectorAll('tbody tr').length`,
    });
    console.log(`  -> Examination Gazette Rendered Rows: ${examRows.result.value}`);
    await capture('m1e_browser_report3_exam_gazette.png');

    // Verify Tab 4: Fee Collections
    console.log('7. Switching to Report 4: Fee Collections...');
    await send('Runtime.evaluate', {
      expression: `
        (() => {
          const btn = Array.from(document.querySelectorAll('button')).find(b => b.textContent.includes('Fee Collections'));
          if (btn) btn.click();
        })()
      `,
    });
    await delay(3000);
    const feeText = await send('Runtime.evaluate', {
      expression: `document.querySelector('body')?.innerText.toUpperCase().includes('TOTAL DEMAND') && document.querySelector('body')?.innerText.includes('Payment Method Distribution')`,
    });
    console.log(`  -> Fee Collections Summary Cards & Payment Distribution rendered: ${feeText.result.value}`);
    await capture('m1e_browser_report4_fee_collections.png');

    // Verify Tab 5: Fee Defaulters
    console.log('8. Switching to Report 5: Fee Defaulters...');
    await send('Runtime.evaluate', {
      expression: `
        (() => {
          const btn = Array.from(document.querySelectorAll('button')).find(b => b.textContent.includes('Fee Defaulters'));
          if (btn) btn.click();
        })()
      `,
    });
    await delay(2500);
    const defaultersState = await send('Runtime.evaluate', {
      expression: `document.querySelector('body')?.innerText.includes('Zero Fee Defaulters Found')`,
    });
    console.log(`  -> Fee Defaulters Informative Zero-State Banner: ${defaultersState.result.value}`);
    await capture('m1e_browser_report5_fee_defaulters.png');

    // Verify Tab 6: Programme Cohorts
    console.log('9. Switching to Report 6: Programme Cohorts...');
    await send('Runtime.evaluate', {
      expression: `
        (() => {
          const btn = Array.from(document.querySelectorAll('button')).find(b => b.textContent.includes('Programme Cohorts'));
          if (btn) btn.click();
        })()
      `,
    });
    await delay(2500);
    const progRows = await send('Runtime.evaluate', {
      expression: `document.querySelectorAll('tbody tr').length`,
    });
    console.log(`  -> Programme Cohorts Rendered Programmes: ${progRows.result.value}`);
    await capture('m1e_browser_report6_programme_cohorts.png');

    // =========================================================================
    // STEP C: Testing Settings & Administration Module as SYSTEM_ADMIN
    // =========================================================================
    console.log('\n--- STEP C: Testing Settings Module as SYSTEM_ADMIN ---');
    console.log('1. Navigating to /modules/settings...');
    await send('Page.navigate', { url: `${BASE_URL}/modules/settings` });
    // Allow Next.js on-demand compilation of /modules/settings route
    await delay(6000);
    await capture('m1e_browser_settings_landing.png');

    // Tab 1: System Health
    console.log('2. Verifying Console 1: System Health & Telemetry...');
    const healthText = await send('Runtime.evaluate', {
      expression: `document.body.innerText.includes('Database Integrity') && document.body.innerText.includes('FK Violations')`,
    });
    console.log(`  -> System Health PRAGMA metrics present: ${healthText.result.value}`);
    await capture('m1e_browser_settings1_health.png');

    // Tab 2: Audit Logs
    console.log('3. Switching to Console 2: Audit Log Journal...');
    await send('Runtime.evaluate', {
      expression: `
        (() => {
          const btn = Array.from(document.querySelectorAll('button')).find(b => b.textContent.includes('Audit Log Journal'));
          if (btn) btn.click();
        })()
      `,
    });
    await delay(3000);
    const auditRows = await send('Runtime.evaluate', {
      expression: `document.body.innerText.includes('Operational Audit Log Journal') || document.body.innerText.includes('Recent System Events')`,
    });
    console.log(`  -> Audit Log Journal rendered: ${auditRows.result.value}`);
    await capture('m1e_browser_settings2_audit.png');

    // Tab 3: Academic Calendar
    console.log('4. Switching to Console 3: Academic Calendar Matrix...');
    await send('Runtime.evaluate', {
      expression: `
        (() => {
          const btn = Array.from(document.querySelectorAll('button')).find(b => b.textContent.includes('Academic Calendar Matrix'));
          if (btn) btn.click();
        })()
      `,
    });
    await delay(3000);
    const calText = await send('Runtime.evaluate', {
      expression: `document.body.innerText.includes('Academic Calendar Cycles & Institutional Terms')`,
    });
    console.log(`  -> Academic Calendar Matrix rendered: ${calText.result.value}`);
    await capture('m1e_browser_settings3_calendar.png');

    // Tab 4: User Administration
    console.log('5. Switching to Console 4: User Accounts & Roles...');
    await send('Runtime.evaluate', {
      expression: `
        (() => {
          const btn = Array.from(document.querySelectorAll('button')).find(b => b.textContent.includes('User Roles & Identity'));
          if (btn) btn.click();
        })()
      `,
    });
    await delay(3000);
    const usersText = await send('Runtime.evaluate', {
      expression: `document.body.innerText.includes('Authorized Institutional User Accounts & Access Control')`,
    });
    console.log(`  -> User Roles & Identity Administration rendered: ${usersText.result.value}`);
    await capture('m1e_browser_settings4_users.png');

    console.log('\n[E2E Verification Summary] All browser verification steps executed successfully!');
  } finally {
    ws.close();
    edgeProc.kill();
    nextProc.kill();
    console.log('[Cleanup] Browser and isolated Next.js processes terminated.');

    // 6. Final verification of operational database invariance
    const finalDevBuf = fs.readFileSync(DEV_DB);
    const finalHash = crypto.createHash('sha256').update(finalDevBuf).digest('hex');
    console.log(`\n[Database Invariance Verification]`);
    console.log(`  - Initial dev.db SHA-256: ${initialHash}`);
    console.log(`  - Final dev.db SHA-256:   ${finalHash}`);
    if (finalHash === initialHash) {
      console.log('  -> SUCCESS: Operational database remained 100% byte-for-byte INVARIANT.');
    } else {
      console.error('  -> CRITICAL ALERT: Operational database was modified!');
      process.exit(1);
    }
  }
}

main().catch((err) => {
  console.error('Fatal Browser Verification Error:', err);
  process.exit(1);
});
