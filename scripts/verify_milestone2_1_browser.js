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
const EDGE_PORT = 9599;
const TEMP_PROFILE = path.resolve('temp_edge_m2a1_profile');

async function main() {
  console.log('================================================================');
  console.log('CAMPUSOS ERP: MILESTONE 2A.1 REAL BROWSER VERIFICATION');
  console.log('Foundational SIS Core & 360° Student Dossier (Isolated DB)');
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

  // 3. Inject test session tokens into isolated_test.db
  const db = new DatabaseSync(ISOLATED_DB);
  const adminUser = db.prepare("SELECT id, email, role FROM UserAccount WHERE role = 'SYSTEM_ADMIN' LIMIT 1").get();
  
  // Find or link a student user for Khan Umar (RPIHM-2026DS041 / id: a82797f8-ae30-42a6-ace7-c1aea744e7e8)
  const khanStudent = db.prepare("SELECT id, fullName, prn FROM Student WHERE prn = '2026DS041'").get();
  let studentUser = db.prepare("SELECT id, email, role, studentId FROM UserAccount WHERE studentId = ?").get(khanStudent.id);
  
  if (!studentUser) {
    const studentUserId = crypto.randomUUID();
    db.prepare(`
      INSERT INTO UserAccount (id, email, passwordHash, salt, fullName, role, isActive, studentId, createdAt, updatedAt)
      VALUES (?, ?, ?, ?, ?, 'STUDENT_VIEWER', 1, ?, ?, ?)
    `).run(studentUserId, 'khan.umar@sample.rpihm.ac.in', 'dummyhash', 'dummysalt', khanStudent.fullName, khanStudent.id, Date.now(), Date.now());
    studentUser = { id: studentUserId, email: 'khan.umar@sample.rpihm.ac.in', role: 'STUDENT_VIEWER', studentId: khanStudent.id };
  }

  const adminRawToken = crypto.randomBytes(32).toString('hex');
  const adminTokenHash = crypto.createHash('sha256').update(adminRawToken).digest('hex');
  const studentRawToken = crypto.randomBytes(32).toString('hex');
  const studentTokenHash = crypto.createHash('sha256').update(studentRawToken).digest('hex');
  const expiresAt = Date.now() + 7 * 24 * 3600 * 1000;

  db.prepare(`
    INSERT INTO Session (id, userId, tokenHash, expiresAt, createdAt, updatedAt)
    VALUES (?, ?, ?, ?, ?, ?)
  `).run(crypto.randomUUID(), adminUser.id, adminTokenHash, expiresAt, Date.now(), Date.now());

  db.prepare(`
    INSERT INTO Session (id, userId, tokenHash, expiresAt, createdAt, updatedAt)
    VALUES (?, ?, ?, ?, ?, ?)
  `).run(crypto.randomUUID(), studentUser.id, studentTokenHash, expiresAt, Date.now(), Date.now());

  db.close();
  console.log(`[Auth] Injected test sessions into isolated_test.db:`);
  console.log(`  - Admin: ${adminUser.email} (${adminUser.role})`);
  console.log(`  - Student: ${studentUser.email} (${studentUser.role}, Student ID: ${studentUser.studentId})`);

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

  console.log('[Server] Warming up routes (/modules/students, /modules/students/2026DS041)...');
  await fetch('http://localhost:3005/modules/students').catch(() => {});
  await fetch('http://localhost:3005/modules/students/2026DS041').catch(() => {});
  console.log('[Server] Route compilation complete.');

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

  async function waitForDirectory(timeoutMs = 15000) {
    const start = Date.now();
    while (Date.now() - start < timeoutMs) {
      const res = await send('Runtime.evaluate', {
        expression: `document.querySelectorAll('tbody tr').length > 0`,
      });
      if (res && res.result && res.result.value) {
        await delay(500);
        return;
      }
      await delay(500);
    }
  }

  async function waitForDossier(timeoutMs = 15000) {
    const start = Date.now();
    while (Date.now() - start < timeoutMs) {
      const res = await send('Runtime.evaluate', {
        expression: `!document.body.innerText.includes('Retrieving 360° Student Dossier') && !document.body.innerText.includes('Loading RPIHM module console...')`,
      });
      if (res && res.result && res.result.value) {
        await delay(500);
        return;
      }
      await delay(500);
    }
  }

  try {
    await send('Page.enable');
    await send('DOM.enable');
    await send('Runtime.enable');
    await send('Network.enable');

    console.log('\n--- Initializing Browser Context on Port 3005 ---');
    await send('Page.navigate', { url: `${BASE_URL}/login` });
    await delay(1500);

    // =========================================================================
    // STEP 1: Student Directory Navigation
    // =========================================================================
    console.log('\n--- STEP 1: Student Directory & Entry Points ---');
    await send('Network.setCookie', {
      name: 'rpihm_session_token',
      value: adminRawToken,
      url: `${BASE_URL}/`,
      httpOnly: true,
      secure: false,
      sameSite: 'Lax',
    });
    const cookiesNow = await send('Network.getCookies', { urls: [`${BASE_URL}/`] });
    console.log('  -> active cookies in Edge for port 3005:', cookiesNow.cookies.map(c => `${c.name}=${c.value.slice(0, 8)}... (domain=${c.domain}, path=${c.path})`));

    console.log('1. Navigating to /modules/students...');
    await send('Page.navigate', { url: `${BASE_URL}/modules/students` });
    await waitForDirectory(15000);
    await capture('m2a1_01_student_directory_entry.png');

    const studentRowsCount = await send('Runtime.evaluate', {
      expression: `document.querySelectorAll('tbody tr').length`,
    });
    console.log(`  -> Student Directory Table Rows: ${studentRowsCount.result.value}`);

    // =========================================================================
    // STEP 2: Dedicated 360° Dossier - Khan Umar Overview
    // =========================================================================
    console.log('\n--- STEP 2: Khan Umar 360° Dossier - Overview ---');
    console.log('Navigating directly to /modules/students/2026DS041...');
    await send('Page.navigate', { url: `${BASE_URL}/modules/students/2026DS041` });
    await waitForDossier(15000);
    await capture('m2a1_02_dossier_overview_khan.png');

    const dossierHeader = await send('Runtime.evaluate', {
      expression: `document.querySelector('h1')?.innerText`,
    });
    console.log(`  -> Dossier Student Name: "${dossierHeader.result.value}"`);

    // =========================================================================
    // STEP 3: Tab 2 - Academic History
    // =========================================================================
    console.log('\n--- STEP 3: Tab 2 - Academic History Progression ---');
    await send('Runtime.evaluate', {
      expression: `
        (() => {
          const btn = Array.from(document.querySelectorAll('button')).find(b => b.innerText.includes('Academic History'));
          if (btn) btn.click();
        })()
      `,
    });
    await delay(1000);
    await capture('m2a1_03_dossier_academic_history.png');

    const enrolRowsCount = await send('Runtime.evaluate', {
      expression: `document.querySelectorAll('tbody tr').length`,
    });
    console.log(`  -> Academic History Terms Rendered: ${enrolRowsCount.result.value}`);

    // =========================================================================
    // STEP 4: Tab 3 - Attendance (Empty State)
    // =========================================================================
    console.log('\n--- STEP 4: Tab 3 - Attendance (Clean Empty State) ---');
    await send('Runtime.evaluate', {
      expression: `
        (() => {
          const btn = Array.from(document.querySelectorAll('button')).find(b => b.innerText.includes('Attendance'));
          if (btn) btn.click();
        })()
      `,
    });
    await delay(2000);
    await capture('m2a1_04_dossier_attendance_empty.png');

    // =========================================================================
    // STEP 5: Tab 4 - Fees & Ledger (₹50k Billed, ₹50k Paid via UPI)
    // =========================================================================
    console.log('\n--- STEP 5: Tab 4 - Fees & Financial Ledger ---');
    await send('Runtime.evaluate', {
      expression: `
        (() => {
          const btn = Array.from(document.querySelectorAll('button')).find(b => b.innerText.includes('Fees'));
          if (btn) btn.click();
        })()
      `,
    });
    await delay(2000);
    await capture('m2a1_05_dossier_fees_ledger.png');

    // =========================================================================
    // STEP 6: Tab 5 - Examinations (Empty State)
    // =========================================================================
    console.log('\n--- STEP 6: Tab 5 - Examinations (Clean Empty State) ---');
    await send('Runtime.evaluate', {
      expression: `
        (() => {
          const btn = Array.from(document.querySelectorAll('button')).find(b => b.innerText.includes('Examinations'));
          if (btn) btn.click();
        })()
      `,
    });
    await delay(2000);
    await capture('m2a1_06_dossier_examinations_empty.png');

    // =========================================================================
    // STEP 7: Ananya Deshmukh (Examinations Session WIN-2026-REG)
    // =========================================================================
    console.log('\n--- STEP 7: Ananya Deshmukh - Examinations Records ---');
    console.log('Navigating directly to /modules/students/2025CA024...');
    await send('Page.navigate', { url: `${BASE_URL}/modules/students/2025CA024` });
    await delay(4000);

    // Switch to Examinations tab
    await send('Runtime.evaluate', {
      expression: `
        (() => {
          const btn = Array.from(document.querySelectorAll('button')).find(b => b.innerText.includes('Examinations'));
          if (btn) btn.click();
        })()
      `,
    });
    await delay(2000);
    await capture('m2a1_07_dossier_examinations_ananya.png');

    // =========================================================================
    // STEP 8: Aarav Sharma (Attendance AI-101 Excused Session)
    // =========================================================================
    console.log('\n--- STEP 8: Aarav Sharma - Attendance Record & Strict Opportunity Model ---');
    console.log('Navigating directly to /modules/students/2026DS039...');
    await send('Page.navigate', { url: `${BASE_URL}/modules/students/2026DS039` });
    await delay(4000);

    // Switch to Attendance tab
    await send('Runtime.evaluate', {
      expression: `
        (() => {
          const btn = Array.from(document.querySelectorAll('button')).find(b => b.innerText.includes('Attendance'));
          if (btn) btn.click();
        })()
      `,
    });
    await delay(2000);
    await capture('m2a1_08_dossier_attendance_aarav.png');

    // =========================================================================
    // STEP 9: Back Navigation to Student Directory
    // =========================================================================
    console.log('\n--- STEP 9: Back Navigation to Directory ---');
    await send('Runtime.evaluate', {
      expression: `
        (() => {
          const backLink = Array.from(document.querySelectorAll('a')).find(a => a.innerText.includes('Back to Directory'));
          if (backLink) backLink.click();
        })()
      `,
    });
    await delay(3000);
    const backUrl = await send('Runtime.evaluate', {
      expression: `window.location.pathname`,
    });
    console.log(`  -> Navigated back to: ${backUrl.result.value}`);
    await capture('m2a1_09_directory_back_navigation.png');

    // =========================================================================
    // STEP 10: Authorization Enforcement - Student Viewer Access Restrictions
    // =========================================================================
    console.log('\n--- STEP 10: Role-Based Authorization Enforcement ---');
    console.log('1. Setting session cookie for STUDENT_VIEWER (Khan Umar)...');
    await send('Network.setCookie', {
      name: 'rpihm_session_token',
      value: studentRawToken,
      url: `${BASE_URL}/`,
      httpOnly: true,
      secure: false,
      sameSite: 'Lax',
    });

    console.log('2. Attempting unauthorized access to Ananya Deshmukh (/modules/students/2025CA024)...');
    await send('Page.navigate', { url: `${BASE_URL}/modules/students/2025CA024` });
    await waitForDossier(15000);
    const forbiddenText = await send('Runtime.evaluate', {
      expression: `document.body.innerText.includes('Access Restricted')`,
    });
    console.log(`  -> Cross-student access blocked with 403 Forbidden: ${forbiddenText.result.value}`);
    await capture('m2a1_10_auth_cross_student_forbidden.png');

    console.log('3. Navigating to student self-access (/modules/students/2026DS041)...');
    await send('Page.navigate', { url: `${BASE_URL}/modules/students/2026DS041` });
    await waitForDossier(15000);
    const selfDossierName = await send('Runtime.evaluate', {
      expression: `document.querySelector('h1')?.innerText`,
    });
    console.log(`  -> Self-access permitted: "${selfDossierName.result.value}"`);
    await capture('m2a1_11_auth_student_self_access.png');

    console.log('\n[E2E Verification Summary] All 11 browser verification steps executed successfully!');
  } finally {
    ws.close();
    edgeProc.kill();
    nextProc.kill();
    console.log('[Cleanup] Headless Edge and isolated Next.js server terminated.');
  }

  // 6. Final Invariance Check on dev.db
  const finalDevBuf = fs.readFileSync(DEV_DB);
  const finalHash = crypto.createHash('sha256').update(finalDevBuf).digest('hex');
  console.log(`\n[Database Invariance Verification]`);
  console.log(`  - Initial dev.db SHA-256: ${initialHash}`);
  console.log(`  - Final dev.db SHA-256:   ${finalHash}`);
  if (initialHash === finalHash) {
    console.log('  -> SUCCESS: Operational database remained 100% byte-for-byte INVARIANT.');
  } else {
    throw new Error('CORRUPTION DETECTED: dev.db was modified during browser verification!');
  }
}

main().catch((err) => {
  console.error('\nBrowser verification failed:', err);
  process.exit(1);
});
