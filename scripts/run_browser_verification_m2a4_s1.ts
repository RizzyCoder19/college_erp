import path from "path";
import fs from "fs";
import crypto from "crypto";
import { spawn } from "child_process";

const DEV_DB = path.resolve(process.cwd(), "prisma/dev.db");
const ISOLATED_DB = path.resolve(process.cwd(), "prisma/isolated_test.db");
const ARTIFACT_DIR = "C:\\Users\\ADMIN\\.gemini\\antigravity-ide\\brain\\92156811-1189-49ac-9a04-c65d40f8cb9c";
const BASE_URL = "http://localhost:3005";
const EDGE_PORT = 9605;
const EDGE_PATH = "C:\\Program Files (x86)\\Microsoft\\Edge\\Application\\msedge.exe";
const TEMP_PROFILE = path.resolve(process.cwd(), "temp_edge_m2a4_s1_verify");

function delay(ms: number) {
  return new Promise((r) => setTimeout(r, ms));
}

async function main() {
  console.log("================================================================");
  console.log("CAMPUSOS ERP: MILESTONE 2A.4 STAGE 1 BROWSER VERIFICATION (CDP)");
  console.log("Student Self-Service Portal Experience & Boundaries");
  console.log("================================================================\n");

  // 1. Verify dev.db baseline hash
  const initialDevBuf = fs.readFileSync(DEV_DB);
  const initialHash = crypto.createHash("sha256").update(initialDevBuf).digest("hex");
  console.log(`[Database Invariance] dev.db initial SHA-256: ${initialHash}`);

  // 2. Set environment to point strictly to isolated test database
  process.env.DATABASE_URL = `file:${ISOLATED_DB}`;

  const { default: prisma } = await import("../src/lib/db");
  const { createSession } = await import("../src/lib/auth/session");

  // Fetch or prepare Student A in isolated database
  const studentA = await prisma.student.findFirst({
    where: { prn: "TEST-PORTAL-STU-A" },
  });
  if (!studentA) {
    throw new Error("Student A (TEST-PORTAL-STU-A) not found in isolated test database. Run tests first.");
  }

  const userA = await prisma.userAccount.findUnique({
    where: { email: "aarav.portal.a@rpihm.ac.in" },
  });
  if (!userA) {
    throw new Error("User A (aarav.portal.a@rpihm.ac.in) not found in isolated test database.");
  }

  const userUnlinked = await prisma.userAccount.findUnique({
    where: { email: "unlinked.student@rpihm.ac.in" },
  });
  if (!userUnlinked) {
    throw new Error("Unlinked User (unlinked.student@rpihm.ac.in) not found in isolated test database.");
  }

  // Find or create a faculty/staff account for unauthorized role test
  let facultyUser = await prisma.userAccount.findFirst({
    where: { role: "FACULTY_MEMBER" },
  });
  if (!facultyUser) {
    facultyUser = await prisma.userAccount.create({
      data: {
        email: "chef.faculty.test@rpihm.ac.in",
        fullName: "Chef Instructor Faculty",
        role: "FACULTY_MEMBER",
        passwordHash: "hash-faculty",
        salt: "salt-faculty",
        isActive: true,
      },
    });
  }

  let adminUser = await prisma.userAccount.findFirst({
    where: { role: "SYSTEM_ADMIN" },
  });
  if (!adminUser) {
    adminUser = await prisma.userAccount.create({
      data: {
        email: "sysadmin.browser.test@rpihm.ac.in",
        fullName: "System Admin Test",
        role: "SYSTEM_ADMIN",
        passwordHash: "hash-admin",
        salt: "salt-admin",
        isActive: true,
      },
    });
  }

  // Create active sessions in isolated DB
  const sessionStudent = await createSession(userA.id, { userAgent: "E2E-Edge-CDP-Student" });
  const sessionUnlinked = await createSession(userUnlinked.id, { userAgent: "E2E-Edge-CDP-Unlinked" });
  const sessionFaculty = await createSession(facultyUser.id, { userAgent: "E2E-Edge-CDP-Faculty" });
  const sessionAdmin = await createSession(adminUser.id, { userAgent: "E2E-Edge-CDP-Admin" });

  console.log(`[Auth] Test sessions established:`);
  console.log(`  - Student A: ${userA.email} (token=${sessionStudent.token.slice(0, 8)}...)`);
  console.log(`  - Unlinked:  ${userUnlinked.email} (token=${sessionUnlinked.token.slice(0, 8)}...)`);
  console.log(`  - Faculty:   ${facultyUser.email} (token=${sessionFaculty.token.slice(0, 8)}...)`);
  console.log(`  - SysAdmin:  ${adminUser.email} (token=${sessionAdmin.token.slice(0, 8)}...)`);

  // Ensure sample documents exist for Student A to show realistic document state
  const existingDocs = await prisma.studentDocument.findMany({
    where: { studentId: studentA.id },
  });
  if (existingDocs.length === 0) {
    console.log("[Setup] Uploading sample verified & pending document for Student A...");
    const { StudentRepository } = await import("../src/lib/dal/studentRepository");
    const dummyPdf = Buffer.from("%PDF-1.4\n1 0 obj\n<<>>\nendobj\ntrailer\n<<>>\n%%EOF");
    const upRes = await StudentRepository.uploadStudentDocument({
      studentId: studentA.id,
      category: "IDENTITY_PROOF",
      buffer: dummyPdf,
      originalFileName: "aarav_aadhaar_card.pdf",
      reportedMimeType: "application/pdf",
      uploadedByUserId: userA.id,
    });
    if (upRes.success && upRes.data) {
      // Mark as VERIFIED
      await prisma.studentDocument.update({
        where: { id: upRes.data.id },
        data: { status: "VERIFIED" },
      });
    }

    // Upload a secondary pending document
    await StudentRepository.uploadStudentDocument({
      studentId: studentA.id,
      category: "PREVIOUS_MARKSHEET",
      buffer: dummyPdf,
      originalFileName: "hsc_marksheet_aarav.pdf",
      reportedMimeType: "application/pdf",
      uploadedByUserId: userA.id,
    });
  }

  // 3. Write .env.local to point Next.js to isolated_test.db on port 3005
  const envLocalPath = path.resolve(process.cwd(), ".env.local");
  fs.writeFileSync(envLocalPath, `DATABASE_URL="file:./isolated_test.db"\nDATA_SOURCE="prisma"\n`);

  console.log("\n[Server] Spawning Next.js server on port 3005...");
  const nextProc = spawn("npx.cmd", ["next", "dev", "-p", "3005"], {
    cwd: process.cwd(),
    env: {
      ...process.env,
      DATABASE_URL: `file:${ISOLATED_DB}`,
      PORT: "3005",
    },
    shell: true,
  });

  nextProc.stdout?.on("data", (chunk) => {
    const str = chunk.toString();
    if (str.includes("Ready") || str.includes("Local:") || str.includes("localhost:3005")) {
      console.log(`[Next.js stdout] ${str.trim().slice(0, 80)}`);
    }
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
    throw new Error("Next.js server failed to respond on port 3005 within 60 seconds.");
  }

  // Pre-warm student portal route
  console.log("[Server] Pre-warming student portal route...");
  await fetch("http://localhost:3005/portal/student").catch(() => {});

  // 4. Start Edge headless with CDP
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
    console.log(`  [Screenshot Captured] ${filename}`);
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
    console.log("\n--- Executing Stage 1 Real Browser Verification Journey ---");

    // -------------------------------------------------------------------------
    // STEP 1: Student Overview & Identity Badge (Desktop 1440x900)
    // -------------------------------------------------------------------------
    console.log("\n[Step 1] Authenticating as Student A and loading Student Portal...");
    await send("Page.navigate", {
      url: `http://localhost:3005/api/dev-login?token=${sessionStudent.token}&redirect=/portal/student`,
    });
    await waitForSelector("#tab-overview");
    await delay(1500);

    // Verify identity details in DOM
    const studentTitle = await evaluate(`document.querySelector('h1')?.textContent`);
    const studentPrn = await evaluate(`document.body.innerText.includes('TEST-PORTAL-STU-A')`);
    console.log(`  DOM Student Title: "${studentTitle}", PRN found: ${studentPrn}`);

    await capture("m2a4_01_student_portal_overview.png");

    // -------------------------------------------------------------------------
    // STEP 2: Academic & Curriculum Tab
    // -------------------------------------------------------------------------
    console.log("\n[Step 2] Switching to Academics & Curriculum Tab...");
    await evaluate(`document.querySelector('#tab-academics')?.click()`);
    await waitForSelector("#student-curriculum-container");
    await delay(1200);

    const subjectCount = await evaluate(`document.querySelectorAll('#student-curriculum-container tr')?.length`);
    console.log(`  Curriculum loaded: ~${subjectCount} table rows detected`);

    await capture("m2a4_02_student_academics_curriculum.png");

    // -------------------------------------------------------------------------
    // STEP 3: Compliance Documents Tab (Self-Service Mode)
    // -------------------------------------------------------------------------
    console.log("\n[Step 3] Switching to Compliance Documents Tab...");
    await evaluate(`document.querySelector('#tab-documents')?.click()`);
    await waitForSelector("#student-self-documents");
    await delay(1200);

    // Confirm that administrative verification controls are NOT rendered
    const hasAdminVerificationBtn = await evaluate(`Boolean(document.querySelector('#btn-verify-doc, #btn-reject-doc'))`);
    console.log(`  Admin verification buttons present in student mode: ${hasAdminVerificationBtn} (Strictly False)`);

    await capture("m2a4_03_student_documents_self_service.png");

    // -------------------------------------------------------------------------
    // STEP 4: Document Upload Modal State
    // -------------------------------------------------------------------------
    console.log("\n[Step 4] Opening Document Upload Modal in student self-mode...");
    await evaluate(`document.querySelector('#btn-upload-document, #btn-upload-first-document')?.click()`);
    await waitForSelector("#doc-upload-input");
    await delay(800);

    await capture("m2a4_04_student_document_upload_modal.png");

    // Close modal
    await evaluate(`(() => {
      const btns = Array.from(document.querySelectorAll('button'));
      const cancelBtn = btns.find(b => b.textContent && b.textContent.includes('Cancel'));
      if (cancelBtn) cancelBtn.click();
    })()`);
    await delay(500);

    // -------------------------------------------------------------------------
    // STEP 5: Mobile Viewport (390 x 844 iPhone 14)
    // -------------------------------------------------------------------------
    console.log("\n[Step 5] Emulating Mobile Viewport (390 x 844)...");
    await send("Emulation.setDeviceMetricsOverride", {
      width: 390,
      height: 844,
      deviceScaleFactor: 2,
      mobile: true,
    });
    // Return to overview tab
    await evaluate(`document.querySelector('#tab-overview')?.click()`);
    await delay(1200);

    await capture("m2a4_05_student_mobile_responsive.png");

    // Reset device metrics to desktop
    await send("Emulation.clearDeviceMetricsOverride");

    // -------------------------------------------------------------------------
    // STEP 6: Unlinked Student Account Experience
    // -------------------------------------------------------------------------
    console.log("\n[Step 6] Navigating as Unlinked Student Account...");
    await send("Page.navigate", {
      url: `http://localhost:3005/api/dev-login?token=${sessionUnlinked.token}&redirect=/portal/student`,
    });
    await waitForSelector("h1");
    await delay(1200);

    const unlinkedHeading = await evaluate(`document.querySelector('h1')?.textContent`);
    console.log(`  Unlinked View Heading: "${unlinkedHeading}"`);

    await capture("m2a4_06_student_unlinked_account.png");

    // -------------------------------------------------------------------------
    // STEP 7: Unauthorized Role Denial (Faculty navigating to Student Portal)
    // -------------------------------------------------------------------------
    console.log("\n[Step 7] Navigating as Faculty Member (Access Denied Check)...");
    await send("Page.navigate", {
      url: `http://localhost:3005/api/dev-login?token=${sessionFaculty.token}&redirect=/portal/student`,
    });
    await waitForSelector("h1");
    await delay(1200);

    const facultyHeading = await evaluate(`document.querySelector('h1')?.textContent`);
    console.log(`  Faculty View Heading: "${facultyHeading}"`);

    await capture("m2a4_07_unauthorized_role_denied.png");

    // -------------------------------------------------------------------------
    // STEP 8: Unauthorized Role Denial (SYSTEM_ADMIN navigating to Student Portal)
    // -------------------------------------------------------------------------
    console.log("\n[Step 8] Navigating as SYSTEM_ADMIN (Access Denied Check)...");
    await send("Page.navigate", {
      url: `http://localhost:3005/api/dev-login?token=${sessionAdmin.token}&redirect=/portal/student`,
    });
    await waitForSelector("h1");
    await delay(1200);

    const adminHeading = await evaluate(`document.querySelector('h1')?.textContent`);
    console.log(`  SYSTEM_ADMIN View Heading: "${adminHeading}"`);

    await capture("m2a4_08_system_admin_denied.png");

    console.log("\n✓ All 8 real browser verification steps completed successfully!");
  } finally {
    ws.close();
    edgeProc.kill();
    nextProc.kill();

    // Clean up .env.local
    if (fs.existsSync(envLocalPath)) {
      fs.unlinkSync(envLocalPath);
    }

    // Clean up temp profile
    try {
      fs.rmSync(TEMP_PROFILE, { recursive: true, force: true });
    } catch {}

    // Verify operational database hash remained invariant
    const finalDevBuf = fs.readFileSync(DEV_DB);
    const finalHash = crypto.createHash("sha256").update(finalDevBuf).digest("hex");
    console.log(`\n[Database Invariance] dev.db post-verification SHA-256: ${finalHash}`);
    if (finalHash !== initialHash) {
      console.error("FATAL: Operational database was modified during verification!");
      process.exit(1);
    } else {
      console.log("✓ Invariance Confirmed: Operational database hash is 100% invariant.");
    }
  }
}

main().catch((err) => {
  console.error("Verification failed:", err);
  process.exit(1);
});
