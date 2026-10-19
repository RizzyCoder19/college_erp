const { spawn } = require("child_process");
const fs = require("fs");
const path = require("path");
const { PrismaClient } = require("@prisma/client");
const crypto = require("crypto");

const prisma = new PrismaClient();

async function createAdminSession() {
  const admin = await prisma.userAccount.findFirst({ where: { role: "SYSTEM_ADMIN" } });
  const rawToken = crypto.randomBytes(32).toString("hex");
  const tokenHash = crypto.createHash("sha256").update(rawToken).digest("hex");
  await prisma.session.create({
    data: {
      userId: admin.id,
      tokenHash,
      expiresAt: new Date(Date.now() + 24 * 60 * 60 * 1000),
    },
  });
  return rawToken;
}

function cdpSend(ws, method, params = {}) {
  return new Promise((resolve, reject) => {
    const id = Math.floor(Math.random() * 1000000);
    const handler = (evt) => {
      const msg = JSON.parse(evt.data);
      if (msg.id === id) {
        ws.removeEventListener("message", handler);
        if (msg.error) reject(msg.error);
        else resolve(msg.result);
      }
    };
    ws.addEventListener("message", handler);
    ws.send(JSON.stringify({ id, method, params }));
  });
}

async function capture() {
  const sessionToken = await createAdminSession();
  console.log("Created admin session token:", sessionToken.slice(0, 10) + "...");

  const edgePath = "C:\\Program Files (x86)\\Microsoft\\Edge\\Application\\msedge.exe";
  const edgeProc = spawn(edgePath, [
    "--headless",
    "--remote-debugging-port=9222",
    "--disable-gpu",
    "--no-sandbox",
    "--window-size=1440,900"
  ]);

  // Wait for CDP to be ready
  let version = null;
  for (let i = 0; i < 20; i++) {
    await new Promise((r) => setTimeout(r, 500));
    try {
      const res = await fetch("http://localhost:9222/json/version");
      version = await res.json();
      break;
    } catch (e) {}
  }

  if (!version) {
    edgeProc.kill();
    throw new Error("Edge CDP did not start in time.");
  }

  console.log("Edge CDP is ready. Connecting via WebSocket...");
  const newTabRes = await fetch("http://localhost:9222/json/new", { method: "PUT" });
  const tab = await newTabRes.json();
  const ws = new WebSocket(tab.webSocketDebuggerUrl);

  await new Promise((resolve) => ws.addEventListener("open", resolve));
  console.log("Connected to browser page WebSocket.");

  await cdpSend(ws, "Network.enable");
  await cdpSend(ws, "Page.enable");

  // Set auth cookie
  await cdpSend(ws, "Network.setCookie", {
    name: "session_token",
    value: sessionToken,
    domain: "localhost",
    path: "/",
    httpOnly: true,
    sameSite: "Lax"
  });

  // 1. Capture Students module
  console.log("Navigating to http://localhost:3000/modules/students...");
  await cdpSend(ws, "Page.navigate", { url: "http://localhost:3000/modules/students" });
  await new Promise((r) => setTimeout(r, 4000)); // Wait for data fetch & hydration

  const studentScreenshot = await cdpSend(ws, "Page.captureScreenshot", { format: "png" });
  fs.writeFileSync("students_module_live.png", Buffer.from(studentScreenshot.data, "base64"));
  console.log("Saved students_module_live.png (" + fs.statSync("students_module_live.png").size + " bytes)");

  // 2. Capture Faculty module
  console.log("Navigating to http://localhost:3000/modules/faculty...");
  await cdpSend(ws, "Page.navigate", { url: "http://localhost:3000/modules/faculty" });
  await new Promise((r) => setTimeout(r, 4000)); // Wait for data fetch & hydration

  const facultyScreenshot = await cdpSend(ws, "Page.captureScreenshot", { format: "png" });
  fs.writeFileSync("faculty_module_live.png", Buffer.from(facultyScreenshot.data, "base64"));
  console.log("Saved faculty_module_live.png (" + fs.statSync("faculty_module_live.png").size + " bytes)");

  ws.close();
  edgeProc.kill();
  await prisma.$disconnect();
  console.log("Capture process finished successfully.");
}

capture().catch((err) => {
  console.error("Capture failed:", err);
  process.exit(1);
});
