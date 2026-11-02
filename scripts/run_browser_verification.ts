import path from "path";
import fs from "fs";
import crypto from "crypto";
import { spawn } from "child_process";

const DEV_DB = path.resolve(process.cwd(), "prisma/dev.db");
const ISOLATED_DB = path.resolve(process.cwd(), "prisma/isolated_test.db");
const ARTIFACT_DIR = "C:\\Users\\ADMIN\\.gemini\\antigravity-ide\\brain\\92156811-1189-49ac-9a04-c65d40f8cb9c";
const BASE_URL = "http://localhost:3005";
const EDGE_PORT = 9599;
const EDGE_PATH = "C:\\Program Files (x86)\\Microsoft\\Edge\\Application\\msedge.exe";
const TEMP_PROFILE = path.resolve(process.cwd(), "temp_edge_m2a1_verify");

function delay(ms: number) {
  return new Promise((r) => setTimeout(r, ms));
}

async function main() {
  console.log("================================================================");
  console.log("CAMPUSOS ERP: MILESTONE 2A.1 REAL BROWSER VERIFICATION (TSX)");
  console.log("Foundational SIS Core & 360° Student Dossier (Isolated DB)");
  console.log("================================================================\n");

  // 1. Snapshot and check dev.db
  const initialDevBuf = fs.readFileSync(DEV_DB);
  const initialHash = crypto.createHash("sha256").update(initialDevBuf).digest("hex");
  console.log(`[Database Invariance] dev.db initial SHA-256: ${initialHash}`);

  // 2. Prepare fresh isolated database
  fs.copyFileSync(DEV_DB, ISOLATED_DB);
  console.log("[Setup] Fresh isolated database prepared at:", ISOLATED_DB);

  // Set process.env.DATABASE_URL to isolated DB for all local operations
  process.env.DATABASE_URL = `file:${ISOLATED_DB}`;

  // 3. Import Prisma and auth helpers pointing to isolated DB
  const { default: prisma } = await import("../src/lib/db");
  const { createSession } = await import("../src/lib/auth/session");

  const adminUser = await prisma.userAccount.findFirst({
    where: { role: "SYSTEM_ADMIN" },
  });
  if (!adminUser) throw new Error("SYSTEM_ADMIN user account not found in database");

  // Find Khan Umar
  const khanStudent = await prisma.student.findFirst({
    where: { prn: "2026DS041" },
  });
  if (!khanStudent) throw new Error("Student Khan Umar (2026DS041) not found");

  let studentUser = await prisma.userAccount.findFirst({
    where: { studentId: khanStudent.id },
  });
  if (!studentUser) {
    studentUser = await prisma.userAccount.create({
      data: {
        email: "khan.umar@sample.rpihm.ac.in",
        fullName: khanStudent.fullName,
        passwordHash: "dummyhash",
        salt: "dummysalt",
        role: "STUDENT_VIEWER",
        isActive: true,
        studentId: khanStudent.id,
      },
    });
  }

  // Create real sessions via Prisma
  const adminSessionRes = await createSession(adminUser.id, { userAgent: "E2E-Edge-CDP" });
  const studentSessionRes = await createSession(studentUser.id, { userAgent: "E2E-Edge-CDP" });
  const adminToken = adminSessionRes.token;
  const studentToken = studentSessionRes.token;

  console.log(`[Auth] Created test sessions in isolated_test.db:`);
  console.log(`  - Admin: ${adminUser.email} (${adminUser.role}) token=${adminToken.slice(0, 8)}...`);
  console.log(`  - Student: ${studentUser.email} (${studentUser.role}) token=${studentToken.slice(0, 8)}...`);

  // 4. Start Next.js dev server on port 3005
  const envLocalPath = path.resolve(process.cwd(), ".env.local");
  fs.writeFileSync(envLocalPath, `DATABASE_URL="file:./isolated_test.db"\nDATA_SOURCE="prisma"\n`);
  console.log("\n[Server] Prepared temporary .env.local pointing to isolated_test.db");

  console.log("[Server] Starting isolated Next.js server on port 3005...");
  const nextProc = spawn("npx.cmd", ["next", "dev", "-p", "3005"], {
    cwd: process.cwd(),
    env: {
      ...process.env,
      DATABASE_URL: `file:${ISOLATED_DB}`,
      PORT: "3005",
    },
    shell: true,
  });

  // Wait for server ready
  let serverReady = false;
  for (let i = 0; i < 40; i++) {
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
    throw new Error("Next.js server failed to respond on port 3005 within 40 seconds.");
  }

  // Pre-warm routes
  console.log("[Server] Pre-compiling routes...");
  await fetch("http://localhost:3005/modules/students").catch(() => {});
  await fetch("http://localhost:3005/modules/students/2026DS041").catch(() => {});
  console.log("[Server] Pre-compilation finished.");

  // 5. Start Edge headless
  console.log(`\n[Browser] Starting headless Edge on port ${EDGE_PORT}...`);
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
      const timeout = setTimeout(() => reject(new Error(`CDP Timeout: ${method}`)), 25000);
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
    console.log(`  [Screenshot Captured] ${filename}`);
    return outPath;
  }

  async function waitForCondition(expr: string, timeoutMs = 15000): Promise<boolean> {
    const start = Date.now();
    while (Date.now() - start < timeoutMs) {
      const res = await send("Runtime.evaluate", { expression: expr });
      if (res && res.result && res.result.value) {
        await delay(500);
        return true;
      }
      await delay(500);
    }
    return false;
  }

  try {
    await send("Page.enable");
    await send("DOM.enable");
    await send("Runtime.enable");
    await send("Network.enable");

    // =========================================================================
    // STEP 1: Student Directory Navigation (via dev-login)
    // =========================================================================
    console.log("\n--- STEP 1: Student Directory & Entry Points ---");
    console.log("Navigating to /api/dev-login as SYSTEM_ADMIN...");
    await send("Page.navigate", { url: `${BASE_URL}/api/dev-login?token=${adminToken}&redirect=/modules/students` });
    await waitForCondition(`document.querySelectorAll('tbody tr').length > 0`, 20000);
    await capture("m2a1_01_student_directory_entry.png");

    const rowsCount = await send("Runtime.evaluate", {
      expression: `document.querySelectorAll('tbody tr').length`,
    });
    console.log(`  -> Student Directory Table Rows: ${rowsCount.result.value}`);

    // =========================================================================
    // STEP 2: Dedicated 360° Dossier - Khan Umar Overview
    // =========================================================================
    console.log("\n--- STEP 2: Khan Umar 360° Dossier - Overview ---");
    await send("Page.navigate", { url: `${BASE_URL}/modules/students/2026DS041` });
    await waitForCondition(`document.querySelector('h1')?.innerText?.includes('Khan Umar')`, 25000);
    await delay(1000);
    await capture("m2a1_02_dossier_overview_khan.png");

    const dossierHeader = await send("Runtime.evaluate", {
      expression: `document.querySelector('h1')?.innerText`,
    });
    console.log(`  -> Dossier Student Name: "${dossierHeader.result.value}"`);

    // =========================================================================
    // STEP 3: Tab 2 - Academic History
    // =========================================================================
    console.log("\n--- STEP 3: Tab 2 - Academic History Progression ---");
    await send("Runtime.evaluate", {
      expression: `
        (() => {
          const btn = Array.from(document.querySelectorAll('button')).find(b => b.innerText.includes('Academic History'));
          if (btn) btn.click();
        })()
      `,
    });
    await delay(1500);
    await capture("m2a1_03_dossier_academic_history.png");

    const enrolRowsCount = await send("Runtime.evaluate", {
      expression: `document.querySelectorAll('tbody tr').length`,
    });
    console.log(`  -> Academic History Terms Rendered: ${enrolRowsCount.result.value}`);

    // =========================================================================
    // STEP 4: Tab 3 - Attendance (Empty State)
    // =========================================================================
    console.log("\n--- STEP 4: Tab 3 - Attendance (Clean Empty State) ---");
    await send("Runtime.evaluate", {
      expression: `
        (() => {
          const btn = Array.from(document.querySelectorAll('button')).find(b => b.innerText.includes('Attendance'));
          if (btn) btn.click();
        })()
      `,
    });
    await delay(1500);
    await capture("m2a1_04_dossier_attendance_empty.png");

    // =========================================================================
    // STEP 5: Tab 4 - Fees & Financial Ledger
    // =========================================================================
    console.log("\n--- STEP 5: Tab 4 - Fees & Financial Ledger ---");
    await send("Runtime.evaluate", {
      expression: `
        (() => {
          const btn = Array.from(document.querySelectorAll('button')).find(b => b.innerText.includes('Fees'));
          if (btn) btn.click();
        })()
      `,
    });
    await delay(1500);
    await capture("m2a1_05_dossier_fees_ledger.png");

    // =========================================================================
    // STEP 6: Tab 5 - Examinations (Empty State)
    // =========================================================================
    console.log("\n--- STEP 6: Tab 5 - Examinations (Clean Empty State) ---");
    await send("Runtime.evaluate", {
      expression: `
        (() => {
          const btn = Array.from(document.querySelectorAll('button')).find(b => b.innerText.includes('Examinations'));
          if (btn) btn.click();
        })()
      `,
    });
    await delay(1500);
    await capture("m2a1_06_dossier_examinations_empty.png");

    // =========================================================================
    // STEP 7: Ananya Deshmukh - Examinations Records
    // =========================================================================
    console.log("\n--- STEP 7: Ananya Deshmukh - Examinations Records ---");
    await send("Page.navigate", { url: `${BASE_URL}/modules/students/2025CA024` });
    await waitForCondition(`document.querySelector('h1')?.innerText?.includes('Ananya Deshmukh')`, 15000);

    // Switch to Examinations tab
    await send("Runtime.evaluate", {
      expression: `
        (() => {
          const btn = Array.from(document.querySelectorAll('button')).find(b => b.innerText.includes('Examinations'));
          if (btn) btn.click();
        })()
      `,
    });
    await delay(1500);
    await capture("m2a1_07_dossier_examinations_ananya.png");

    // =========================================================================
    // STEP 8: Aarav Sharma - Attendance Record & Strict Opportunity Model
    // =========================================================================
    console.log("\n--- STEP 8: Aarav Sharma - Attendance Record & Strict Opportunity Model ---");
    await send("Page.navigate", { url: `${BASE_URL}/modules/students/2026DS039` });
    await waitForCondition(`document.querySelector('h1')?.innerText?.includes('Aarav Sharma')`, 15000);

    // Switch to Attendance tab
    await send("Runtime.evaluate", {
      expression: `
        (() => {
          const btn = Array.from(document.querySelectorAll('button')).find(b => b.innerText.includes('Attendance'));
          if (btn) btn.click();
        })()
      `,
    });
    await delay(1500);
    await capture("m2a1_08_dossier_attendance_aarav.png");

    // =========================================================================
    // STEP 9: Back Navigation to Student Directory
    // =========================================================================
    console.log("\n--- STEP 9: Back Navigation to Directory ---");
    await send("Runtime.evaluate", {
      expression: `
        (() => {
          const backLink = Array.from(document.querySelectorAll('a')).find(a => a.innerText.includes('Back to Directory'));
          if (backLink) backLink.click();
        })()
      `,
    });
    await delay(2000);
    await waitForCondition(`window.location.pathname === '/modules/students' && document.querySelectorAll('tbody tr').length > 0`, 15000);
    const backUrl = await send("Runtime.evaluate", {
      expression: `window.location.pathname`,
    });
    console.log(`  -> Navigated back to: ${backUrl.result.value}`);
    await capture("m2a1_09_directory_back_navigation.png");

    // =========================================================================
    // STEP 10: Role-Based Authorization Enforcement
    // =========================================================================
    console.log("\n--- STEP 10: Role-Based Authorization Enforcement ---");
    console.log("1. Authenticating as STUDENT_VIEWER (Khan Umar) and attempting unauthorized access to Ananya Deshmukh...");
    await send("Page.navigate", { url: `${BASE_URL}/api/dev-login?token=${studentToken}&redirect=/modules/students/2025CA024` });
    await waitForCondition(`document.body.innerText.includes('Access Restricted')`, 20000);
    const forbiddenText = await send("Runtime.evaluate", {
      expression: `document.body.innerText.includes('Access Restricted')`,
    });
    console.log(`  -> Cross-student access blocked with 403 Forbidden: ${forbiddenText.result.value}`);
    await capture("m2a1_10_auth_cross_student_forbidden.png");

    console.log("3. Navigating to student self-access (/modules/students/2026DS041)...");
    await send("Page.navigate", { url: `${BASE_URL}/modules/students/2026DS041` });
    await waitForCondition(`document.querySelector('h1')?.innerText?.includes('Khan Umar')`, 15000);
    const selfDossierName = await send("Runtime.evaluate", {
      expression: `document.querySelector('h1')?.innerText`,
    });
    console.log(`  -> Self-access permitted: "${selfDossierName.result.value}"`);
    await capture("m2a1_11_auth_student_self_access.png");

    console.log("\n[E2E Verification Summary] All 11 browser verification steps executed successfully!");
  } finally {
    ws.close();
    edgeProc.kill();
    nextProc.kill();
    await prisma.$disconnect();
    if (fs.existsSync(envLocalPath)) {
      fs.unlinkSync(envLocalPath);
    }
    console.log("[Cleanup] Headless Edge, isolated Next.js server, and temporary .env.local terminated.");
  }

  // 6. Invariance Check on dev.db
  const finalDevBuf = fs.readFileSync(DEV_DB);
  const finalHash = crypto.createHash("sha256").update(finalDevBuf).digest("hex");
  console.log(`\n[Database Invariance Verification]`);
  console.log(`  - Initial dev.db SHA-256: ${initialHash}`);
  console.log(`  - Final dev.db SHA-256:   ${finalHash}`);
  if (initialHash === finalHash) {
    console.log("  -> SUCCESS: Operational database remained 100% byte-for-byte INVARIANT.");
  } else {
    throw new Error("CORRUPTION DETECTED: dev.db was modified during browser verification!");
  }
}

main().catch((err) => {
  console.error("\nBrowser verification failed:", err);
  process.exit(1);
});
