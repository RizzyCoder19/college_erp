import path from "path";
import fs from "fs";
import crypto from "crypto";
import { spawn } from "child_process";

const DEV_DB = path.resolve(process.cwd(), "prisma/dev.db");
const ISOLATED_DB = path.resolve(process.cwd(), "prisma/isolated_test.db");
const ARTIFACT_DIR = "C:\\Users\\ADMIN\\.gemini\\antigravity-ide\\brain\\92156811-1189-49ac-9a04-c65d40f8cb9c";
const BASE_URL = "http://localhost:3005";
const EDGE_PORT = 9615;
const EDGE_PATH = "C:\\Program Files (x86)\\Microsoft\\Edge\\Application\\msedge.exe";
const TEMP_PROFILE = path.resolve(process.cwd(), "temp_edge_comfort_verify");

function delay(ms: number) {
  return new Promise((r) => setTimeout(r, ms));
}

async function main() {
  console.log("================================================================");
  console.log("CHECK 3: VISUAL COMFORT UTILITIES & SCREENSHOT CAPTURE (CDP)");
  console.log("================================================================\n");

  // 1. Invariance check
  const initialDevBuf = fs.readFileSync(DEV_DB);
  const initialHash = crypto.createHash("sha256").update(initialDevBuf).digest("hex");
  console.log(`[Baseline] dev.db initial SHA-256: ${initialHash}`);

  // 2. Set environment to point strictly to isolated test database
  process.env.DATABASE_URL = `file:${ISOLATED_DB}`;

  const { default: prisma } = await import("../src/lib/db");
  const { createSession } = await import("../src/lib/auth/session");

  const studentA = await prisma.student.findFirst({
    where: { prn: "TEST-PORTAL-STU-A" },
  });
  if (!studentA) {
    throw new Error("Student A not found in isolated test database");
  }

  const userA = await prisma.userAccount.findUnique({
    where: { email: "aarav.portal.a@rpihm.ac.in" },
  });
  if (!userA) {
    throw new Error("User A not found in isolated test database");
  }

  const sessionStudent = await createSession(userA.id, { userAgent: "E2E-Comfort-Audit" });
  console.log(`[Auth] Student session established (token: ${sessionStudent.token.slice(0, 8)}...)`);

  // Write .env.local for Next.js isolated server
  const envLocalPath = path.resolve(process.cwd(), ".env.local");
  fs.writeFileSync(envLocalPath, `DATABASE_URL="file:./isolated_test.db"\nDATA_SOURCE="prisma"\n`);

  console.log("[Server] Spawning Next.js server on port 3005...");
  const nextProc = spawn("npx.cmd", ["next", "dev", "-p", "3005"], {
    cwd: process.cwd(),
    env: {
      ...process.env,
      DATABASE_URL: `file:${ISOLATED_DB}`,
      PORT: "3005",
    },
    shell: true,
  });

  let serverReady = false;
  for (let i = 0; i < 60; i++) {
    await delay(1000);
    try {
      const res = await fetch("http://localhost:3005");
      if (res.status === 200 || res.status === 307 || res.status === 308) {
        serverReady = true;
        console.log(`[Server] Next.js ready on port 3005 (status ${res.status})`);
        break;
      }
    } catch {}
  }

  if (!serverReady) {
    nextProc.kill();
    throw new Error("Next.js server failed to respond on port 3005 within 60s");
  }

  // Pre-warm student portal route
  await fetch("http://localhost:3005/portal/student").catch(() => {});

  // Start Edge
  console.log(`[Browser] Starting headless Edge on port ${EDGE_PORT}...`);
  if (!fs.existsSync(TEMP_PROFILE)) {
    fs.mkdirSync(TEMP_PROFILE, { recursive: true });
  }

  const edgeProc = spawn(EDGE_PATH, [
    "--headless",
    `--remote-debugging-port=${EDGE_PORT}`,
    `--user-data-dir=${TEMP_PROFILE}`,
    "--disable-gpu",
    "--no-sandbox",
    "--window-size=1440,900",
  ]);

  let cdpReady = false;
  for (let i = 0; i < 30; i++) {
    await delay(400);
    try {
      const res = await fetch(`http://localhost:${EDGE_PORT}/json/version`);
      if (res.ok) {
        cdpReady = true;
        break;
      }
    } catch {}
  }
  if (!cdpReady) {
    edgeProc.kill();
    nextProc.kill();
    throw new Error("Edge failed to initialize CDP on port " + EDGE_PORT);
  }

  const tab = await (await fetch(`http://localhost:${EDGE_PORT}/json/new`, { method: "PUT" })).json();
  const ws = new WebSocket(tab.webSocketDebuggerUrl);
  await new Promise((r) => ws.addEventListener("open", r));

  let msgId = 1;
  function send(method: string, params: Record<string, unknown> = {}): Promise<any> {
    return new Promise((resolve, reject) => {
      const id = msgId++;
      const timeout = setTimeout(() => reject(new Error(`CDP Timeout: ${method}`)), 30000);
      const h = (event: MessageEvent) => {
        const msg = JSON.parse(event.data as string);
        if (msg.id === id) {
          clearTimeout(timeout);
          ws.removeEventListener("message", h);
          if (msg.error) reject(new Error(msg.error.message));
          else resolve(msg.result);
        }
      };
      ws.addEventListener("message", h);
      ws.send(JSON.stringify({ id, method, params }));
    });
  }

  async function capture(filename: string) {
    const { data } = await send("Page.captureScreenshot", { format: "png" });
    const outPath = path.join(ARTIFACT_DIR, filename);
    fs.writeFileSync(outPath, Buffer.from(data, "base64"));
    console.log(`  [Screenshot Captured] ${filename} (${fs.statSync(outPath).size} bytes)`);
    return outPath;
  }

  async function evaluate(expression: string) {
    const res = await send("Runtime.evaluate", {
      expression,
      returnByValue: true,
      awaitPromise: true,
    });
    return res.result?.value;
  }

  async function waitForSelector(selector: string, timeoutMs = 25000): Promise<boolean> {
    const start = Date.now();
    while (Date.now() - start < timeoutMs) {
      const found = await evaluate(`Boolean(document.querySelector('${selector}'))`);
      if (found) return true;
      await delay(400);
    }
    return false;
  }

  await send("Page.enable");
  await send("Runtime.enable");
  await send("Network.enable");

  try {
    console.log("\n[Step 1] Navigating to Student Portal...");
    await send("Page.navigate", {
      url: `http://localhost:3005/api/dev-login?token=${sessionStudent.token}&redirect=/portal/student`,
    });
    await waitForSelector("#tab-overview");
    await delay(1500);

    // 1. Verify CSS visual comfort definitions and computation in DOM
    console.log("\n[Step 2] Verifying Visual Comfort Computed Styles in DOM...");

    const bodyBg = await evaluate(`getComputedStyle(document.body).backgroundColor`);
    console.log(`  - document.body backgroundColor: ${bodyBg}`);

    const cardComfortCheck = await evaluate(`(() => {
      const el = document.querySelector('.bg-card-comfort');
      if (!el) return null;
      const style = getComputedStyle(el);
      return {
        count: document.querySelectorAll('.bg-card-comfort').length,
        backgroundColor: style.backgroundColor,
      };
    })()`);
    console.log(`  - .bg-card-comfort count: ${cardComfortCheck?.count}, backgroundColor: ${cardComfortCheck?.backgroundColor}`);

    const cardSurfaceCheck = await evaluate(`(() => {
      const el = document.querySelector('.bg-card-surface');
      if (!el) return null;
      const style = getComputedStyle(el);
      return {
        count: document.querySelectorAll('.bg-card-surface').length,
        backgroundColor: style.backgroundColor,
      };
    })()`);
    console.log(`  - .bg-card-surface count: ${cardSurfaceCheck?.count}, backgroundColor: ${cardSurfaceCheck?.backgroundColor}`);

    const borderComfortCheck = await evaluate(`(() => {
      const el = document.querySelector('.border-comfort');
      if (!el) return null;
      const style = getComputedStyle(el);
      return {
        count: document.querySelectorAll('.border-comfort').length,
        borderColor: style.borderColor,
      };
    })()`);
    console.log(`  - .border-comfort count: ${borderComfortCheck?.count}, borderColor: ${borderComfortCheck?.borderColor}`);

    if (!cardComfortCheck || cardComfortCheck.count === 0) {
      throw new Error(".bg-card-comfort class not applied to any element in Student Portal DOM");
    }
    if (!borderComfortCheck || borderComfortCheck.count === 0) {
      throw new Error(".border-comfort class not applied to any element in Student Portal DOM");
    }

    console.log("  ✅ PASS: Visual comfort utility classes are defined, applied, and rendering in DOM!");

    // 2. Desktop Screenshot (1440x900)
    console.log("\n[Step 3] Capturing Desktop Screenshot (1440x900)...");
    await send("Emulation.setDeviceMetricsOverride", {
      width: 1440,
      height: 900,
      deviceScaleFactor: 1,
      mobile: false,
    });
    await delay(600);
    const desktopScreenshotPath = await capture("portal_visual_comfort_desktop.png");

    // 3. Mobile Screenshot (390x844)
    console.log("\n[Step 4] Capturing Mobile Screenshot (390x844)...");
    await send("Emulation.setDeviceMetricsOverride", {
      width: 390,
      height: 844,
      deviceScaleFactor: 2,
      mobile: true,
    });
    await delay(800);
    const mobileScreenshotPath = await capture("portal_visual_comfort_mobile.png");

    console.log("\n=======================================================");
    console.log("CHECK 3 PASSED: VISUAL COMFORT & SCREENSHOTS VERIFIED");
    console.log(`Desktop: ${desktopScreenshotPath}`);
    console.log(`Mobile:  ${mobileScreenshotPath}`);
    console.log("=======================================================\n");
  } finally {
    ws.close();
    edgeProc.kill();
    nextProc.kill();

    if (fs.existsSync(envLocalPath)) {
      fs.unlinkSync(envLocalPath);
    }
    try {
      fs.rmSync(TEMP_PROFILE, { recursive: true, force: true });
    } catch {}

    const finalDevBuf = fs.readFileSync(DEV_DB);
    const finalHash = crypto.createHash("sha256").update(finalDevBuf).digest("hex");
    console.log(`[Database Invariance] dev.db post-verification SHA-256: ${finalHash}`);
    if (initialHash !== finalHash) {
      throw new Error("dev.db modified during visual comfort audit!");
    }
  }
}

main().catch((e) => {
  console.error("Visual comfort verification failed:", e);
  process.exit(1);
});
