const fs = require('fs');
const path = require('path');
const crypto = require('crypto');
const { spawn } = require('child_process');
const { PrismaClient } = require('@prisma/client');

const prisma = new PrismaClient();
const ARTIFACT_DIR = path.resolve('C:/Users/ADMIN/.gemini/antigravity-ide/brain/4688303f-79ba-496e-ade1-bbed8cfa0d6e');
const BASE_URL = 'http://localhost:3001';

async function captureDossier() {
  const adminUser = await prisma.userAccount.findFirst({
    where: { role: 'SYSTEM_ADMIN' },
  });

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

  const edgePath = 'C:\\Program Files (x86)\\Microsoft\\Edge\\Application\\msedge.exe';
  const edgePort = 9597;
  const tempProfileDir = path.resolve('temp_edge_dossier_cap');

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

    await send('Page.enable');
    await send('DOM.enable');
    await send('Runtime.enable');
    await send('Network.enable');

    await send('Network.setCookie', {
      name: 'rpihm_session_token',
      value: rawToken,
      domain: 'localhost',
      path: '/',
      httpOnly: true,
      secure: false,
      sameSite: 'Lax',
    });

    console.log('Navigating directly to Students module...');
    await send('Page.navigate', { url: `${BASE_URL}/modules/students` });
    await delay(4000);

    // Click specifically on button[title="View Full Dossier"]
    const evalResult = await send('Runtime.evaluate', {
      expression: `
        (() => {
          const btn = document.querySelector('button[title="View Full Dossier"]');
          if (btn) {
            btn.click();
            return { clicked: true, title: btn.title };
          }
          return { clicked: false };
        })()
      `,
      returnByValue: true,
    });
    console.log('Click result:', evalResult.result.value);

    await delay(2500);

    const { data } = await send('Page.captureScreenshot', { format: 'png' });
    const outPath = path.join(ARTIFACT_DIR, 'milestone6_student_dossier_ledger.png');
    fs.writeFileSync(outPath, Buffer.from(data, 'base64'));
    console.log(`Saved screenshot to: ${outPath}`);

    ws.close();
  } finally {
    edgeProc.kill('SIGKILL');
    await prisma.session.delete({ where: { id: session.id } }).catch(() => {});
    await prisma.$disconnect();
    try {
      fs.rmSync(tempProfileDir, { recursive: true, force: true });
    } catch {}
  }
}

captureDossier().catch(console.error);
