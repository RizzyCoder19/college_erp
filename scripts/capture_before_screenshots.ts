import path from "path";
import fs from "fs";
import { spawn } from "child_process";
import prisma from "../src/lib/db";
import { createSession, SESSION_COOKIE_NAME } from "../src/lib/auth/session";

const ARTIFACT_DIR = "C:\\Users\\ADMIN\\.gemini\\antigravity-ide\\brain\\92156811-1189-49ac-9a04-c65d40f8cb9c";
const BASE_URL = "http://localhost:3000";
const EDGE_PORT = 9644;
const EDGE_PATH = "C:\\Program Files (x86)\\Microsoft\\Edge\\Application\\msedge.exe";

function delay(ms: number) {
  return new Promise((r) => setTimeout(r, ms));
}

async function main() {
  console.log("================================================================");
  console.log("CAPTURING GENUINE BEFORE SCREENSHOTS VIA EDGE CDP (REFINED)");
  console.log("================================================================\n");

  const studentUser = await prisma.userAccount.findUnique({
    where: { email: "khan.umar.26@rpihm.ac.in" },
  });
  if (!studentUser) throw new Error("Khan Umar user account not found.");

  const facultyUser = await prisma.userAccount.findUnique({
    where: { email: "j.sahaya@sample.rpihm.ac.in" },
  });
  if (!facultyUser) throw new Error("Prof. Jeicy Sahaya user account not found.");

  const studentSession = await createSession(studentUser.id, { userAgent: "Screenshot-Before-Student" });
  const facultySession = await createSession(facultyUser.id, { userAgent: "Screenshot-Before-Faculty" });

  console.log(`[Sessions] Student token: ${studentSession.token.slice(0, 8)}... | Faculty token: ${facultySession.token.slice(0, 8)}...`);

  // Start Edge
  const edgeProc = spawn(EDGE_PATH, [
    "--headless",
    `--remote-debugging-port=${EDGE_PORT}`,
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
    throw new Error("Edge failed to initialize CDP on port " + EDGE_PORT);
  }

  const tab = await (await fetch(`http://localhost:${EDGE_PORT}/json/new`, { method: "PUT" })).json();
  const ws = new WebSocket(tab.webSocketDebuggerUrl);
  await new Promise((r) => ws.addEventListener("open", r));

  let msgId = 1;
  function send(method: string, params: Record<string, unknown> = {}): Promise<any> {
    return new Promise((resolve, reject) => {
      const id = msgId++;
      const timeout = setTimeout(() => reject(new Error(`CDP Timeout: ${method}`)), 35000);
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

  await send("Network.enable");
  await send("Page.enable");

  async function setAuthCookie(token: string) {
    await send("Network.setCookie", {
      name: SESSION_COOKIE_NAME,
      value: token,
      domain: "localhost",
      path: "/",
      httpOnly: true,
      sameSite: "Lax",
    });
  }

  async function capturePage(url: string, filename: string, isMobile = false) {
    if (isMobile) {
      await send("Emulation.setDeviceMetricsOverride", {
        width: 390,
        height: 844,
        deviceScaleFactor: 2,
        mobile: true,
      });
    } else {
      await send("Emulation.setDeviceMetricsOverride", {
        width: 1440,
        height: 900,
        deviceScaleFactor: 1,
        mobile: false,
      });
    }
    await send("Page.navigate", { url });
    await delay(3500); // Allow full SSR and Suspense hydration

    const screenshot = await send("Page.captureScreenshot", { format: "png" });
    const fullPath = path.join(ARTIFACT_DIR, filename);
    fs.writeFileSync(fullPath, Buffer.from(screenshot.data, "base64"));
    const size = fs.statSync(fullPath).size;
    console.log(`  ✓ Captured ${filename} (${size} bytes)`);
  }

  // 1. Student Portal - Khan Umar
  console.log("\n[1/4] Capturing Student Portal (Desktop)...");
  await setAuthCookie(studentSession.token);

  await capturePage(`${BASE_URL}/portal/student?tab=overview`, "before_student_overview_desktop.png", false);
  await capturePage(`${BASE_URL}/portal/student?tab=academics`, "before_student_academics_desktop.png", false);
  await capturePage(`${BASE_URL}/portal/student?tab=fees`, "before_student_fees_desktop.png", false);
  await capturePage(`${BASE_URL}/portal/student?tab=timetable`, "before_student_timetable_desktop.png", false);

  console.log("\n[2/4] Capturing Student Portal (Mobile 390x844)...");
  await capturePage(`${BASE_URL}/portal/student?tab=overview`, "before_student_overview_mobile.png", true);
  await capturePage(`${BASE_URL}/portal/student?tab=academics`, "before_student_academics_mobile.png", true);
  await capturePage(`${BASE_URL}/portal/student?tab=fees`, "before_student_fees_mobile.png", true);
  await capturePage(`${BASE_URL}/portal/student?tab=timetable`, "before_student_timetable_mobile.png", true);

  // Unauthorized Access: Student trying to view Faculty Portal
  console.log("\n[Unauthorized] Capturing Student -> Faculty Access Denied...");
  await capturePage(`${BASE_URL}/portal/faculty`, "before_unauthorized_access_desktop.png", false);
  await capturePage(`${BASE_URL}/portal/faculty`, "before_unauthorized_access_mobile.png", true);

  // 2. Faculty Portal - Prof. Jeicy Sahaya
  console.log("\n[3/4] Capturing Faculty Portal (Desktop)...");
  await setAuthCookie(facultySession.token);

  await capturePage(`${BASE_URL}/portal/faculty?tab=overview`, "before_faculty_overview_desktop.png", false);
  await capturePage(`${BASE_URL}/portal/faculty?tab=assignments`, "before_faculty_assignments_desktop.png", false);
  await capturePage(`${BASE_URL}/portal/faculty?tab=timetable`, "before_faculty_timetable_desktop.png", false);
  await capturePage(`${BASE_URL}/portal/faculty?tab=roster`, "before_faculty_roster_desktop.png", false);

  console.log("\n[4/4] Capturing Faculty Portal (Mobile 390x844)...");
  await capturePage(`${BASE_URL}/portal/faculty?tab=overview`, "before_faculty_overview_mobile.png", true);
  await capturePage(`${BASE_URL}/portal/faculty?tab=assignments`, "before_faculty_assignments_mobile.png", true);
  await capturePage(`${BASE_URL}/portal/faculty?tab=timetable`, "before_faculty_timetable_mobile.png", true);
  await capturePage(`${BASE_URL}/portal/faculty?tab=roster`, "before_faculty_roster_mobile.png", true);

  ws.close();
  edgeProc.kill();
  console.log("\nAll 18 before screenshots captured successfully!");
}

main().catch((err) => {
  console.error("FATAL:", err);
  process.exit(1);
});
