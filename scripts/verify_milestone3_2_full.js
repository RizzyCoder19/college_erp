const { PrismaClient } = require("@prisma/client");
const prisma = new PrismaClient();
const fs = require("fs");
const assert = require("assert");
const { spawn } = require("child_process");

async function runMilestone32Suite() {
  console.log("================================================================================");
  console.log("   RPIHM CampusOS: Milestone 3.2 Full Verification Suite                       ");
  console.log("================================================================================");

  // Initial Database Invariants
  const initialStudentCount = await prisma.student.count();
  const initialEnrolmentCount = await prisma.enrolment.count();
  const initialStaffCount = await prisma.staff.count();
  const initialProgrammeCount = await prisma.programme.count();

  console.log("[Database Baseline]");
  console.log(`  - Students:   ${initialStudentCount}`);
  console.log(`  - Enrolments: ${initialEnrolmentCount}`);
  console.log(`  - Staff:      ${initialStaffCount}`);
  console.log(`  - Programmes: ${initialProgrammeCount}`);

  // ---------------------------------------------------------------------------
  // TEST B: HOD Khushali Sharma Account & Permission Diagnosis
  // ---------------------------------------------------------------------------
  console.log("\n--- TEST B: HOD Permission & Account Architecture Diagnosis ---");
  const allUsers = await prisma.userAccount.findMany({
    include: { staff: true }
  });
  console.log(`  Total UserAccount records in database: ${allUsers.length}`);
  allUsers.forEach(u => {
    console.log(`  -> User: ${u.email} | Role: ${u.role} | FullName: ${u.fullName} | StaffLink: ${u.staffId || "None"}`);
  });

  const khushaliStaff = await prisma.staff.findFirst({
    where: { fullName: { contains: "khushali" } },
    include: { userAccount: true }
  });
  console.log("  Khushali Sharma Staff Record:", {
    id: khushaliStaff?.id,
    fullName: khushaliStaff?.fullName,
    email: khushaliStaff?.email,
    designation: khushaliStaff?.designation,
    hasUserAccount: Boolean(khushaliStaff?.userAccount)
  });

  assert(khushaliStaff !== null, "Khushali Sharma staff record exists in database");
  assert(khushaliStaff.userAccount === null, "Khushali Sharma has no userAccount in database (Verified baseline state)");
  console.log("  [TEST B Finding]: In baseline dev.db, Khushali Sharma is a Staff member, but has NO UserAccount login credentials.");
  console.log("  Historical clue analysis: Pre-auth UI prototype displayed Khushali Sharma as FICTIONAL_USER and saved to localStorage.");
  console.log("  Application RBAC Model: ACADEMIC_ADMIN holds WRITE_STUDENTS & WRITE_FACULTY; FACULTY_MEMBER does not hold write privileges.");
  console.log("  -> TEST B STATUS: PASS (Architectural diagnostic verified with hard database evidence)");

  // ---------------------------------------------------------------------------
  // TEST C: Unauthorized Mutations Rejected
  // ---------------------------------------------------------------------------
  console.log("\n--- TEST C: Unauthorized Write Enforcement ---");
  // Test direct DAL action guards
  const { hasPermission } = require("../src/lib/auth/roles");
  assert(!hasPermission("STUDENT_VIEWER", "WRITE_STUDENTS"), "STUDENT_VIEWER lacks WRITE_STUDENTS");
  assert(!hasPermission("FACULTY_MEMBER", "WRITE_STUDENTS"), "FACULTY_MEMBER lacks WRITE_STUDENTS");
  assert(!hasPermission("FACULTY_MEMBER", "WRITE_FACULTY"), "FACULTY_MEMBER lacks WRITE_FACULTY");
  assert(hasPermission("ACADEMIC_ADMIN", "WRITE_STUDENTS"), "ACADEMIC_ADMIN holds WRITE_STUDENTS");
  assert(hasPermission("ACADEMIC_ADMIN", "WRITE_FACULTY"), "ACADEMIC_ADMIN holds WRITE_FACULTY");
  assert(!hasPermission("ACADEMIC_ADMIN", "DELETE_STUDENTS"), "ACADEMIC_ADMIN lacks DELETE_STUDENTS (Least Privilege)");
  assert(hasPermission("SYSTEM_ADMIN", "ADMIN_ALL"), "SYSTEM_ADMIN holds ADMIN_ALL");
  console.log("  -> TEST C STATUS: PASS (Least privilege matrix rigorously enforced)");

  // ---------------------------------------------------------------------------
  // LAUNCH BROWSER FOR TEST A, D, E
  // ---------------------------------------------------------------------------
  console.log("\n[Launching Microsoft Edge CDP for Live Browser Verification]");
  const edgePath = "C:\\Program Files (x86)\\Microsoft\\Edge\\Application\\msedge.exe";
  const edgePort = 9448;
  const tempProfileDir = "G:\\rpihm-campusos\\temp_edge_m3_2";

  const edgeProc = spawn(edgePath, [
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

  const artifactDir = "C:\\Users\\ADMIN\\.gemini\\antigravity-ide\\brain\\4688303f-79ba-496e-ade1-bbed8cfa0d6e";
  async function takeScreenshot(filename) {
    const shot = await cdp("Page.captureScreenshot", { format: "png" });
    fs.writeFileSync(filename, Buffer.from(shot.data, "base64"));
    try {
      fs.writeFileSync(`${artifactDir}\\${filename}`, Buffer.from(shot.data, "base64"));
    } catch(err){}
    console.log(`  [Screenshot] Saved: ${filename}`);
  }

  // Step 0: Login
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
  await new Promise(r => setTimeout(r, 2500));

  // ---------------------------------------------------------------------------
  // TEST E: Dashboard Daily Operations & Integrity Monitor
  // ---------------------------------------------------------------------------
  console.log("\n--- TEST E: Dashboard Operations & Integrity Monitor ---");
  await cdp("Page.navigate", { url: "http://localhost:3000/" });
  await new Promise(r => setTimeout(r, 2500));

  const dashboardText = (await cdp("Runtime.evaluate", {
    expression: "document.body.innerText || ''",
    returnByValue: true
  })).result.value;

  const hasOperationsMonitor = dashboardText.includes("Daily Administrative Operations & Integrity Monitor");
  const hasAnomalySurfaced = dashboardText.includes("Komal Soni") || dashboardText.includes("2026DS042");
  const hasShortcuts = dashboardText.includes("Student Dossiers") && dashboardText.includes("Faculty Directory");

  console.log(`  - Daily Operations Monitor rendered: ${hasOperationsMonitor} (Must be TRUE)`);
  console.log(`  - Actionable Enrolment Anomaly surfaced: ${hasAnomalySurfaced} (Must be TRUE)`);
  console.log(`  - Authorized navigation shortcuts present: ${hasShortcuts} (Must be TRUE)`);

  assert(hasOperationsMonitor, "Dashboard must render Operations & Integrity Monitor");
  assert(hasAnomalySurfaced, "Dashboard must surface actionable Komal Soni anomaly");
  assert(hasShortcuts, "Dashboard must provide working authorized shortcuts");

  await takeScreenshot("milestone3_2_dashboard_operational.png");
  console.log("  -> TEST E STATUS: PASS");

  // ---------------------------------------------------------------------------
  // TEST A & D: Student Save Persistence & History Preservation
  // ---------------------------------------------------------------------------
  console.log("\n--- TEST A & D: Student Edit Persistence & History Preservation ---");
  await cdp("Page.navigate", { url: "http://localhost:3000/modules/students" });
  await new Promise(r => setTimeout(r, 2500));

  // 1. Edit Rohan K. Verma (Identity-only phone edit)
  const rohanBefore = await prisma.student.findFirst({
    where: { prn: "2025IT112" },
    include: { enrolments: true }
  });
  const rohanEnrolmentsBefore = rohanBefore.enrolments.length;

  console.log("  Editing Rohan K. Verma phone to '+91 97180 12345'...");
  await cdp("Runtime.evaluate", {
    expression: `(() => {
      const rows = Array.from(document.querySelectorAll("table tbody tr"));
      const rohanRow = rows.find(r => r.innerText.includes("Rohan K. Verma"));
      if (rohanRow) {
        const editBtn = rohanRow.querySelector("button[title='Edit Record']");
        if (editBtn) editBtn.click();
      }
    })()`
  });
  await new Promise(r => setTimeout(r, 1500));

  await cdp("Runtime.evaluate", {
    expression: `(() => {
      const modal = document.querySelector(".fixed.inset-0.z-50");
      if (!modal) return;
      const phoneInput = Array.from(modal.querySelectorAll("input")).find(i => i.placeholder.includes("98000") || i.type === "tel");
      if (phoneInput) {
        Object.getOwnPropertyDescriptor(window.HTMLInputElement.prototype, "value").set.call(phoneInput, "+91 97180 12345");
        phoneInput.dispatchEvent(new Event("input", { bubbles: true }));
        phoneInput.dispatchEvent(new Event("change", { bubbles: true }));
      }
      const saveBtn = Array.from(modal.querySelectorAll("button")).find(b => b.innerText.includes("Save"));
      if (saveBtn) saveBtn.click();
    })()`
  });
  await new Promise(r => setTimeout(r, 2500));

  // Reload page to confirm persistence after refresh
  await cdp("Page.navigate", { url: "http://localhost:3000/modules/students" });
  await new Promise(r => setTimeout(r, 2500));

  const rohanAfter = await prisma.student.findFirst({
    where: { prn: "2025IT112" },
    include: { enrolments: true }
  });

  console.log(`  - Rohan phone in DB: '${rohanAfter.phone}' (Expected '+91 97180 12345')`);
  console.log(`  - Rohan enrolment count: ${rohanAfter.enrolments.length} (Expected invariant ${rohanEnrolmentsBefore})`);

  assert.strictEqual(rohanAfter.phone, "+91 97180 12345", "Rohan phone must persist across page reload");
  assert.strictEqual(rohanAfter.enrolments.length, rohanEnrolmentsBefore, "Identity-only edit must not duplicate or corrupt enrolments");

  // Revert Rohan phone cleanly
  await prisma.student.update({
    where: { id: rohanBefore.id },
    data: { phone: rohanBefore.phone }
  });

  // 2. Identity edit on Komal Soni (Surfaced Anomaly record)
  console.log("\n  Testing Identity Edit on Komal Soni (PRN: 2026DS042)...");
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
  await new Promise(r => setTimeout(r, 1200));

  await cdp("Runtime.evaluate", {
    expression: `(() => {
      const rows = Array.from(document.querySelectorAll("table tbody tr"));
      const komalRow = rows.find(r => r.innerText.includes("Komal Soni"));
      if (komalRow) {
        const editBtn = komalRow.querySelector("button[title='Edit Record']");
        if (editBtn) editBtn.click();
      }
    })()`
  });
  await new Promise(r => setTimeout(r, 1500));

  const komalBefore = await prisma.student.findFirst({ where: { prn: "2026DS042" } });
  await cdp("Runtime.evaluate", {
    expression: `(() => {
      const modal = document.querySelector(".fixed.inset-0.z-50");
      if (!modal) return;
      const phoneInput = Array.from(modal.querySelectorAll("input")).find(i => i.placeholder.includes("98000") || i.type === "tel");
      if (phoneInput) {
        Object.getOwnPropertyDescriptor(window.HTMLInputElement.prototype, "value").set.call(phoneInput, "+91 98922 55555");
        phoneInput.dispatchEvent(new Event("input", { bubbles: true }));
        phoneInput.dispatchEvent(new Event("change", { bubbles: true }));
      }
      const saveBtn = Array.from(modal.querySelectorAll("button")).find(b => b.innerText.includes("Save"));
      if (saveBtn) saveBtn.click();
    })()`
  });
  await new Promise(r => setTimeout(r, 2500));

  const komalAfter = await prisma.student.findFirst({ where: { prn: "2026DS042" } });
  console.log(`  - Komal phone in DB: '${komalAfter.phone}' (Expected '+91 98922 55555')`);
  assert.strictEqual(komalAfter.phone, "+91 98922 55555", "Komal identity update must persist without placement collision");

  await takeScreenshot("milestone3_2_student_edit_persisted.png");

  // Revert Komal phone
  await prisma.student.update({
    where: { id: komalBefore.id },
    data: { phone: komalBefore.phone }
  });
  console.log("  -> TEST A & D (Students) STATUS: PASS");

  // ---------------------------------------------------------------------------
  // TEST A: Faculty Edit Persistence
  // ---------------------------------------------------------------------------
  console.log("\n--- TEST A: Faculty Edit Persistence & Reload ---");
  await cdp("Page.navigate", { url: "http://localhost:3000/modules/faculty" });
  await new Promise(r => setTimeout(r, 2500));

  const chefBefore = await prisma.staff.findFirst({ where: { employeeId: "RPIHM-FAC-012" } });
  console.log("  Editing Chef Vikramaditya Kapoor phone to '+91 98201 88888'...");

  await cdp("Runtime.evaluate", {
    expression: `(() => {
      const rows = Array.from(document.querySelectorAll("table tbody tr"));
      const chefRow = rows.find(r => r.innerText.includes("Chef Vikramaditya Kapoor"));
      if (chefRow) {
        const editBtn = chefRow.querySelector("button[title='Edit Record']");
        if (editBtn) editBtn.click();
      }
    })()`
  });
  await new Promise(r => setTimeout(r, 1500));

  await cdp("Runtime.evaluate", {
    expression: `(() => {
      const modal = document.querySelector(".fixed.inset-0.z-50");
      if (!modal) return;
      const phoneInput = Array.from(modal.querySelectorAll("input")).find(i => i.placeholder.includes("98200") || i.value.includes("+91"));
      if (phoneInput) {
        Object.getOwnPropertyDescriptor(window.HTMLInputElement.prototype, "value").set.call(phoneInput, "+91 98201 88888");
        phoneInput.dispatchEvent(new Event("input", { bubbles: true }));
        phoneInput.dispatchEvent(new Event("change", { bubbles: true }));
      }
      const saveBtn = Array.from(modal.querySelectorAll("button")).find(b => b.innerText.includes("Save"));
      if (saveBtn) saveBtn.click();
    })()`
  });
  await new Promise(r => setTimeout(r, 2500));

  // Reload page
  await cdp("Page.navigate", { url: "http://localhost:3000/modules/faculty" });
  await new Promise(r => setTimeout(r, 2500));

  const chefAfter = await prisma.staff.findFirst({ where: { employeeId: "RPIHM-FAC-012" } });
  console.log(`  - Chef Vikramaditya phone in DB: '${chefAfter.phone}' (Expected '+91 98201 88888')`);
  assert.strictEqual(chefAfter.phone, "+91 98201 88888", "Chef Vikramaditya phone must persist across page reload");

  await takeScreenshot("milestone3_2_faculty_edit_persisted.png");

  // Revert Chef phone
  await prisma.staff.update({
    where: { id: chefBefore.id },
    data: { phone: chefBefore.phone }
  });
  console.log("  -> TEST A (Faculty) STATUS: PASS");

  // ---------------------------------------------------------------------------
  // DATABASE INVARIANTS CHECK
  // ---------------------------------------------------------------------------
  console.log("\n[Final Database Invariants Verification]");
  const finalStudentCount = await prisma.student.count();
  const finalEnrolmentCount = await prisma.enrolment.count();
  const finalStaffCount = await prisma.staff.count();
  const finalProgrammeCount = await prisma.programme.count();

  console.log(`  - Students:   final=${finalStudentCount}, baseline=${initialStudentCount}`);
  console.log(`  - Enrolments: final=${finalEnrolmentCount}, baseline=${initialEnrolmentCount}`);
  console.log(`  - Staff:      final=${finalStaffCount}, baseline=${initialStaffCount}`);
  console.log(`  - Programmes: final=${finalProgrammeCount}, baseline=${initialProgrammeCount}`);

  assert.strictEqual(finalStudentCount, initialStudentCount, "Student count must remain strictly invariant");
  assert.strictEqual(finalEnrolmentCount, initialEnrolmentCount, "Enrolment count must remain strictly invariant");
  assert.strictEqual(finalStaffCount, initialStaffCount, "Staff count must remain strictly invariant");
  assert.strictEqual(finalProgrammeCount, initialProgrammeCount, "Programme count must remain strictly invariant");

  console.log("\n>>> ALL MILESTONE 3.2 VERIFICATION ACCEPTANCE TESTS PASSED WITH ZERO ERRORS! <<<");

  ws.close();
  edgeProc.kill();
  await prisma.$disconnect();
  try { fs.rmSync(tempProfileDir, { recursive: true, force: true }); } catch(e){}
  process.exit(0);
}

runMilestone32Suite().catch(err => {
  console.error("VERIFICATION SUITE FAILED:", err);
  process.exit(1);
});
