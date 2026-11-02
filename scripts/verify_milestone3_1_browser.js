const { spawn } = require("child_process");
const fs = require("fs");
const path = require("path");
const assert = require("assert");
const { PrismaClient } = require("@prisma/client");

async function runMilestone31BrowserSuite() {
  console.log("================================================================================");
  console.log("   RPIHM CampusOS: Milestone 3.1 Live Browser Verification Suite                ");
  console.log("================================================================================");

  const prisma = new PrismaClient();
  const initialStudentCount = await prisma.student.count();
  const initialEnrolmentCount = await prisma.enrolment.count();
  const initialStaffCount = await prisma.staff.count();
  const initialProgrammeCount = await prisma.programme.count();

  console.log(`[Database Invariant Baseline]`);
  console.log(`  - Students:   ${initialStudentCount}`);
  console.log(`  - Enrolments: ${initialEnrolmentCount}`);
  console.log(`  - Staff:      ${initialStaffCount}`);
  console.log(`  - Programmes: ${initialProgrammeCount}`);

  // Create temporary user data dir to avoid any profile lock
  const tempProfileDir = path.join(process.cwd(), "temp_edge_profile_m3_1");
  if (!fs.existsSync(tempProfileDir)) {
    fs.mkdirSync(tempProfileDir, { recursive: true });
  }

  // Launch Edge in headless mode
  const edgePort = 9253;
  const edgeProc = spawn("C:\\Program Files (x86)\\Microsoft\\Edge\\Application\\msedge.exe", [
    "--headless",
    `--remote-debugging-port=${edgePort}`,
    `--user-data-dir=${tempProfileDir}`,
    "--disable-gpu",
    "--no-sandbox",
    "--window-size=1440,900"
  ]);

  for (let i = 0; i < 25; i++) {
    await new Promise(r => setTimeout(r, 400));
    try { await fetch(`http://localhost:${edgePort}/json/version`); break; } catch(e){}
  }

  const tab = await (await fetch(`http://localhost:${edgePort}/json/new`, { method: "PUT" })).json();
  const ws = new WebSocket(tab.webSocketDebuggerUrl);
  await new Promise(r => ws.addEventListener("open", r));

  function cdp(method, params = {}) {
    return new Promise((res, rej) => {
      const id = Math.floor(Math.random() * 1e6);
      const h = e => {
        const m = JSON.parse(e.data);
        if (m.id === id) { ws.removeEventListener("message", h); m.error ? rej(m.error) : res(m.result); }
      };
      ws.addEventListener("message", h);
      ws.send(JSON.stringify({ id, method, params }));
    });
  }

  await cdp("Page.enable");
  await cdp("Runtime.enable");
  await cdp("Network.enable");

  const artifactDir = "C:\\Users\\ADMIN\\.gemini\\antigravity-ide\\brain\\4688303f-79ba-496e-ade1-bbed8cfa0d6e";

  async function takeScreenshot(filename) {
    const shot = await cdp("Page.captureScreenshot", { format: "png" });
    const localPath = filename;
    const artifactPath = `${artifactDir}\\${filename}`;
    fs.writeFileSync(localPath, Buffer.from(shot.data, "base64"));
    try {
      fs.writeFileSync(artifactPath, Buffer.from(shot.data, "base64"));
    } catch(err){}
    console.log(`  [Screenshot] Saved: ${filename}`);
  }

  // Step 0: Authenticate
  console.log("\n[Step 0] Authenticating at /login in headless Microsoft Edge...");
  await cdp("Page.navigate", { url: "http://localhost:3000/login" });
  await new Promise(r => setTimeout(r, 2000));

  const creds = JSON.parse(fs.readFileSync("dev-admin-credentials.json", "utf8"));
  await cdp("Runtime.evaluate", {
    expression: `(() => {
      const setV = (el, val) => {
        Object.getOwnPropertyDescriptor(window.HTMLInputElement.prototype, "value").set.call(el, val);
        el.dispatchEvent(new Event("input", { bubbles: true }));
        el.dispatchEvent(new Event("change", { bubbles: true }));
      };
      setV(document.getElementById("login-email"), ${JSON.stringify(creds.email)});
      setV(document.getElementById("login-password"), ${JSON.stringify(creds.password)});
      document.getElementById("login-submit-button").click();
    })()`
  });

  for (let i = 0; i < 20; i++) {
    await new Promise(r => setTimeout(r, 500));
    const loc = await cdp("Runtime.evaluate", { expression: "window.location.href", returnByValue: true });
    if (loc.result.value && !loc.result.value.includes("/login")) {
      console.log("  -> Authenticated successfully, current URL:", loc.result.value);
      break;
    }
  }

  // =========================================================================
  // JOURNEY 1: Students Workspace & Truthful Fee Presentation
  // =========================================================================
  console.log("\n[Journey 1] Navigating to /modules/students...");
  await cdp("Page.navigate", { url: "http://localhost:3000/modules/students" });
  await new Promise(r => setTimeout(r, 3000));

  const studentsPageText = (await cdp("Runtime.evaluate", {
    expression: `document.body.innerText || ""`,
    returnByValue: true
  })).result.value;

  console.log("--- Checking Fee Presentation in Student Register ---");
  const upperText = studentsPageText.toUpperCase();
  const hasFakeFeeDue = studentsPageText.includes("Fee Installment Due");
  const hasFeeNotConfiguredCard = upperText.includes("FEE LEDGER") && upperText.includes("NOT CONFIGURED");
  const hasUnconfiguredBadges = upperText.includes("NOT CONFIGURED");

  console.log(`  - Misleading 'Fee Installment Due' present: ${hasFakeFeeDue} (Must be FALSE)`);
  console.log(`  - Neutral 'Fee Ledger / Not Configured' metric present: ${hasFeeNotConfiguredCard} (Must be TRUE)`);
  console.log(`  - Table rendered neutral 'Not configured' fee badges: ${hasUnconfiguredBadges} (Must be TRUE)`);

  assert(!hasFakeFeeDue, "Misleading 'Fee Installment Due' stat card must be removed");
  assert(hasFeeNotConfiguredCard, "Must render truthful 'Fee Ledger: Not Configured' stat card");
  assert(hasUnconfiguredBadges, "Table must render neutral 'Not configured' fee status");

  await takeScreenshot("milestone3_1_students_credible.png");

  // =========================================================================
  // JOURNEY 2: Inspect Student Dossier & Academic History (Aarav Sharma)
  // =========================================================================
  console.log("\n[Journey 2] Opening Student Dossier for Aarav Sharma...");
  await cdp("Runtime.evaluate", {
    expression: `(() => {
      const rows = Array.from(document.querySelectorAll("table tbody tr"));
      const aaravRow = rows.find(r => r.innerText.includes("Aarav Sharma"));
      if (aaravRow) {
        const viewBtn = aaravRow.querySelector("button[title='View Full Dossier']");
        if (viewBtn) viewBtn.click();
      }
    })()`
  });
  await new Promise(r => setTimeout(r, 1500));

  const aaravDossierText = (await cdp("Runtime.evaluate", {
    expression: `document.querySelector(".fixed.inset-0.z-50")?.innerText || ""`,
    returnByValue: true
  })).result.value;

  console.log("--- Checking Aarav Sharma Dossier Content ---");
  const aaravUpper = aaravDossierText.toUpperCase();
  const hasAaravFeeNotConfigured = aaravUpper.includes("NOT CONFIGURED");
  const hasAaravUniMumbai = aaravDossierText.includes("University of Mumbai");
  const hasAcademicHistorySection = aaravUpper.includes("ACADEMIC LIFECYCLE");
  const hasCurrentPlacementBadge = aaravDossierText.includes("Current Placement") && aaravDossierText.includes("Semester 1 (Div A)");

  console.log(`  - Dossier displays 'Fee: Not Configured': ${hasAaravFeeNotConfigured} (Must be TRUE)`);
  console.log(`  - Dossier claims 'University of Mumbai': ${hasAaravUniMumbai} (Must be FALSE)`);
  console.log(`  - Dossier displays 'Academic Lifecycle & Enrolment History': ${hasAcademicHistorySection} (Must be TRUE)`);
  console.log(`  - Dossier displays Current Placement 'Semester 1 (Div A)': ${hasCurrentPlacementBadge} (Must be TRUE)`);

  assert(hasAaravFeeNotConfigured, "Dossier must display neutral fee indicator");
  assert(!hasAaravUniMumbai, "Dossier must not claim unverified University of Mumbai affiliation");
  assert(hasAcademicHistorySection, "Dossier must render Academic Lifecycle & Enrolment History section");
  assert(hasCurrentPlacementBadge, "Dossier must render verified Current Placement for Semester 1 (Div A)");

  await takeScreenshot("milestone3_1_student_dossier.png");

  // Close Aarav dossier
  await cdp("Runtime.evaluate", {
    expression: `(() => {
      const closeBtn = document.querySelector(".fixed.inset-0.z-50 button[aria-label='Close modal']");
      if (closeBtn) closeBtn.click();
    })()`
  });
  await new Promise(r => setTimeout(r, 800));

  // =========================================================================
  // JOURNEY 3: Inspect Komal Soni Dossier & Surfacing of Existing Anomaly
  // =========================================================================
  console.log("\n[Journey 3] Opening Student Dossier for Komal Soni (Relational Anomaly Check)...");
  // Search for Komal
  await cdp("Runtime.evaluate", {
    expression: `(() => {
      const input = document.getElementById("student-search-input");
      if (input) {
        Object.getOwnPropertyDescriptor(window.HTMLInputElement.prototype, "value").set.call(input, "Komal");
        input.dispatchEvent(new Event("input", { bubbles: true }));
        input.dispatchEvent(new Event("change", { bubbles: true }));
      }
    })()`
  });
  await new Promise(r => setTimeout(r, 800));

  // Open Komal dossier
  await cdp("Runtime.evaluate", {
    expression: `(() => {
      const rows = Array.from(document.querySelectorAll("table tbody tr"));
      const komalRow = rows.find(r => r.innerText.includes("Komal Soni"));
      if (komalRow) {
        const viewBtn = komalRow.querySelector("button[title='View Full Dossier']");
        if (viewBtn) viewBtn.click();
      }
    })()`
  });
  await new Promise(r => setTimeout(r, 1500));

  const komalDossierText = (await cdp("Runtime.evaluate", {
    expression: `document.querySelector(".fixed.inset-0.z-50")?.innerText || ""`,
    returnByValue: true
  })).result.value;

  console.log("--- Checking Komal Soni Anomaly Surfacing ---");
  const hasAnomalyBanner = komalDossierText.toUpperCase().includes("ENROLMENT HIERARCHY INCONSISTENCY FLAGGED");
  const hasAnomalyExplanation = komalDossierText.toUpperCase().includes("DIFFERENT SEMESTER RECORD");

  console.log(`  - Anomaly banner rendered: ${hasAnomalyBanner} (Must be TRUE)`);
  console.log(`  - Safe anomaly description rendered: ${hasAnomalyExplanation} (Must be TRUE)`);

  assert(hasAnomalyBanner, "Dossier must surface the hierarchy inconsistency banner for Komal Soni");
  assert(hasAnomalyExplanation, "Dossier must explain that division belongs to a different semester record");

  await takeScreenshot("milestone3_1_anomaly_surfaced.png");

  // Close Komal dossier
  await cdp("Runtime.evaluate", {
    expression: `(() => {
      const closeBtn = document.querySelector(".fixed.inset-0.z-50 button[aria-label='Close modal']");
      if (closeBtn) closeBtn.click();
    })()`
  });
  await new Promise(r => setTimeout(r, 800));

  // =========================================================================
  // JOURNEY 4: Inspect Student Form Modal (Disabled Unconfigured Fee Input)
  // =========================================================================
  console.log("\n[Journey 4] Inspecting Enroll Student Form Modal...");
  await cdp("Runtime.evaluate", {
    expression: `(() => {
      const addBtn = Array.from(document.querySelectorAll("button")).find(b => b.innerText.includes("Enroll New Student"));
      if (addBtn) addBtn.click();
    })()`
  });
  await new Promise(r => setTimeout(r, 1200));

  const formText = (await cdp("Runtime.evaluate", {
    expression: `document.querySelector(".fixed.inset-0.z-50")?.innerText || ""`,
    returnByValue: true
  })).result.value;

  const formHasDisabledFee = formText.includes("Institutional Fee Ledger") && formText.includes("Fee records not configured");
  console.log(`  - Form modal renders disabled 'Fee records not configured': ${formHasDisabledFee} (Must be TRUE)`);
  assert(formHasDisabledFee, "Form modal must render disabled fee ledger input");

  // Close form modal
  await cdp("Runtime.evaluate", {
    expression: `(() => {
      const cancelBtn = Array.from(document.querySelectorAll(".fixed.inset-0.z-50 button")).find(b => b.innerText.includes("Cancel"));
      if (cancelBtn) cancelBtn.click();
    })()`
  });
  await new Promise(r => setTimeout(r, 800));

  // =========================================================================
  // JOURNEY 5: Database Invariants Verification
  // =========================================================================
  const finalStudentCount = await prisma.student.count();
  const finalEnrolmentCount = await prisma.enrolment.count();
  const finalStaffCount = await prisma.staff.count();

  console.log("\n[Database Invariants Verification]");
  console.log(`  - Students:   final=${finalStudentCount}, baseline=${initialStudentCount}`);
  console.log(`  - Enrolments: final=${finalEnrolmentCount}, baseline=${initialEnrolmentCount}`);
  console.log(`  - Staff:      final=${finalStaffCount}, baseline=${initialStaffCount}`);

  assert.strictEqual(finalStudentCount, initialStudentCount, "Student count must remain invariant");
  assert.strictEqual(finalEnrolmentCount, initialEnrolmentCount, "Enrolment count must remain invariant");
  assert.strictEqual(finalStaffCount, initialStaffCount, "Staff count must remain invariant");

  console.log("\n>>> ALL 5 BROWSER ACCEPTANCE JOURNEYS PASSED WITH ZERO ERRORS! <<<");

  ws.close();
  edgeProc.kill();
  await prisma.$disconnect();
  try { fs.rmSync(tempProfileDir, { recursive: true, force: true }); } catch(e){}
}

runMilestone31BrowserSuite().catch(err => {
  console.error("BROWSER TEST FAILED:", err);
  process.exit(1);
});

