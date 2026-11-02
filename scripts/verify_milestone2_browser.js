const { spawn } = require("child_process");
const fs = require("fs");
const assert = require("assert");
const { PrismaClient } = require("@prisma/client");

async function runMilestone2AcceptanceSuite() {
  console.log("================================================================================");
  console.log("       RPIHM CampusOS: Milestone 2 Connected Academic Structure Suite           ");
  console.log("================================================================================");

  const prisma = new PrismaClient();
  const initialStudentCount = await prisma.student.count();
  const initialStaffCount = await prisma.staff.count();
  const initialProgrammeCount = await prisma.programme.count();
  const initialSemesterCount = await prisma.semester.count();
  const initialDivisionCount = await prisma.division.count();
  const initialSubjectCount = await prisma.subject.count();
  const initialEnrolmentCount = await prisma.enrolment.count();

  console.log(`[Database Invariant Baseline]`);
  console.log(`  - Students:   ${initialStudentCount}`);
  console.log(`  - Faculty:    ${initialStaffCount}`);
  console.log(`  - Programmes: ${initialProgrammeCount}`);
  console.log(`  - Semesters:  ${initialSemesterCount}`);
  console.log(`  - Divisions:  ${initialDivisionCount}`);
  console.log(`  - Subjects:   ${initialSubjectCount}`);
  console.log(`  - Enrolments: ${initialEnrolmentCount}`);

  // Launch Edge in headless mode
  const edgeProc = spawn("C:\\Program Files (x86)\\Microsoft\\Edge\\Application\\msedge.exe", [
    "--headless", "--remote-debugging-port=9246", "--disable-gpu", "--no-sandbox", "--window-size=1440,900"
  ]);

  for (let i = 0; i < 25; i++) {
    await new Promise(r => setTimeout(r, 400));
    try { await fetch("http://localhost:9246/json/version"); break; } catch(e){}
  }

  const tab = await (await fetch("http://localhost:9246/json/new", { method: "PUT" })).json();
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
  // JOURNEY 1: Open Academics Workspace & Verify Live Metrics
  // =========================================================================
  console.log("\n[Journey 1] Open Academics workspace at /modules/academics...");
  await cdp("Page.navigate", { url: "http://localhost:3000/modules/academics" });
  await new Promise(r => setTimeout(r, 3000));

  const metricsEval = await cdp("Runtime.evaluate", {
    expression: `(() => {
      const cards = Array.from(document.querySelectorAll(".grid.grid-cols-2.sm\\\\:grid-cols-4 > div"));
      return cards.map(c => {
        const val = c.querySelector(".text-2xl, .text-3xl, .text-xl, .font-extrabold")?.innerText?.trim();
        const label = c.querySelector(".text-xs")?.innerText?.trim();
        const sub = c.querySelector(".text-\\\\[11px\\\\]")?.innerText?.trim();
        return { val, label, sub };
      });
    })()`,
    returnByValue: true
  });

  console.log("  Academics Live Metrics:", JSON.stringify(metricsEval.result.value, null, 2));
  assert(metricsEval.result.value && metricsEval.result.value.length === 4, "Must render exactly 4 live academic metric cards");

  const progCard = metricsEval.result.value.find(m => m.sub && m.sub.includes("TOTAL PROGRAMMES"));
  assert(progCard, "Must find Academic Programmes metric");
  console.log(`  -> Programmes: rendered="${progCard.val}", expected="${initialProgrammeCount}"`);
  assert(progCard.val.includes(initialProgrammeCount.toString()), "Programmes count must match SQLite (7)");

  const cohortCard = metricsEval.result.value.find(m => m.sub && m.sub.includes("UNDERGRADUATE"));
  assert(cohortCard, "Must find Active Cohorts metric");
  console.log(`  -> Undergraduate Programmes: rendered="${cohortCard.val}", expected=5`);
  assert.strictEqual(cohortCard.val, "5", "Undergraduate count must be 5");

  const subjCard = metricsEval.result.value.find(m => m.sub && m.sub.includes("DIPLOMA"));
  assert(subjCard, "Must find Active Subjects metric");
  console.log(`  -> Diploma Tracks: rendered="${subjCard.val}", expected=2`);
  assert.strictEqual(subjCard.val, "2", "Diploma tracks must be 2");

  const enrCard = metricsEval.result.value.find(m => m.sub && m.sub.includes("CERTIFICATES"));
  assert(enrCard, "Must find Enrolled Students metric");
  console.log(`  -> Skill Certificates: rendered="${enrCard.val}", expected=0`);
  assert.strictEqual(enrCard.val, "0", "Certificates must be 0");

  await takeScreenshot("milestone2_academics_live.png");

  // =========================================================================
  // JOURNEY 2: Verify Programme Directory Cards
  // =========================================================================
  console.log("\n[Journey 2] Verifying Live Programme Cards Directory...");
  const cardsEval = await cdp("Runtime.evaluate", {
    expression: `(() => {
      const cards = Array.from(document.querySelectorAll(".space-y-3\\\\.5 > div"));
      return cards.map(c => {
        const code = c.querySelector(".font-mono")?.innerText?.trim();
        const name = c.querySelector("h3")?.innerText?.trim();
        const dept = c.querySelector(".text-\\\\[11px\\\\]")?.innerText?.trim();
        return { code, name, dept };
      });
    })()`,
    returnByValue: true
  });

  console.log(`  Found ${cardsEval.result.value.length} Programme Cards in directory:`);
  cardsEval.result.value.forEach(c => console.log(`   - [${c.code}] ${c.name}`));
  assert.strictEqual(cardsEval.result.value.length, 7, "All 7 real database programmes must render");

  // =========================================================================
  // JOURNEY 3: Search for a Real Programme & Inspect Details
  // =========================================================================
  console.log("\n[Journey 3] Searching for 'Data Science' / 'BSCDS-AI'...");
  await cdp("Runtime.evaluate", {
    expression: `(() => {
      const input = document.getElementById("academics-programme-search");
      if (input) {
        Object.getOwnPropertyDescriptor(window.HTMLInputElement.prototype, "value").set.call(input, "Data Science");
        input.dispatchEvent(new Event("input", { bubbles: true }));
        input.dispatchEvent(new Event("change", { bubbles: true }));
      }
    })()`
  });
  await new Promise(r => setTimeout(r, 800));

  const filteredCards = await cdp("Runtime.evaluate", {
    expression: `(() => {
      const cards = Array.from(document.querySelectorAll(".space-y-3\\\\.5 > div"));
      return cards.map(c => ({
        code: c.querySelector(".font-mono")?.innerText?.trim(),
        name: c.querySelector("h3")?.innerText?.trim()
      }));
    })()`,
    returnByValue: true
  });

  console.log("  Filtered Programme Cards:", JSON.stringify(filteredCards.result.value));
  assert.strictEqual(filteredCards.result.value.length, 1, "Exactly 1 card matches 'Data Science'");
  assert.strictEqual(filteredCards.result.value[0].code, "BSCDS-AI", "Filtered card must be BSCDS-AI");

  // Open the Curriculum Dossier Modal for BSCDS-AI
  console.log("  Clicking 'Inspect Curriculum' button...");
  await cdp("Runtime.evaluate", {
    expression: `(() => {
      const btn = Array.from(document.querySelectorAll("button")).find(b => b.innerText.includes("Inspect Curriculum"));
      if (btn) btn.click();
    })()`
  });
  await new Promise(r => setTimeout(r, 2000));

  await takeScreenshot("milestone2_programme_dossier.png");

  // Verify Dossier Modal Content
  const modalData = await cdp("Runtime.evaluate", {
    expression: `(() => {
      const modal = document.querySelector(".fixed.inset-0.z-50");
      if (!modal) return null;
      const title = modal.querySelector("h2")?.innerText?.trim();
      const code = modal.querySelector(".font-mono")?.innerText?.trim();
      const tabs = Array.from(modal.querySelectorAll(".scrollbar-thin button")).map(b => b.innerText.trim());
      const divisions = Array.from(modal.querySelectorAll(".grid-cols-1.lg\\\\:grid-cols-2 > div:first-child .shadow-xs")).map(d => d.innerText.trim().replace(/\\n+/g, " | "));
      const subjects = Array.from(modal.querySelectorAll(".grid-cols-1.lg\\\\:grid-cols-2 > div:last-child .shadow-xs")).map(s => s.innerText.trim().replace(/\\n+/g, " | "));
      const students = Array.from(modal.querySelectorAll("table tbody tr")).map(r => {
        const cells = Array.from(r.querySelectorAll("td")).map(c => c.innerText.trim());
        return { name: cells[0], prn: cells[1], roll: cells[2], status: cells[3] };
      });
      return { title, code, tabs, divisions, subjects, students };
    })()`,
    returnByValue: true
  });

  console.log("  Dossier Modal Data for BSCDS-AI Sem 1:", JSON.stringify({
    title: modalData.result.value.title,
    code: modalData.result.value.code,
    semesterTabsCount: modalData.result.value.tabs.length,
    divisionsCount: modalData.result.value.divisions.length,
    subjects: modalData.result.value.subjects,
    enrolledStudents: modalData.result.value.students
  }, null, 2));

  assert.strictEqual(modalData.result.value.code, "BSCDS-AI");
  assert.strictEqual(modalData.result.value.tabs.length, 6, "BSCDS-AI must have 6 registered semesters");
  assert.strictEqual(modalData.result.value.divisions.length, 2, "Sem 1 has Div A and Div B");
  assert(modalData.result.value.subjects.some(s => s.includes("AI-101")), "Sem 1 has AI-101 Artificial Intelligence Foundations");
  assert(modalData.result.value.subjects.some(s => s.includes("Snehal Kulkarni")), "AI-101 has assigned faculty Snehal Kulkarni");
  assert.strictEqual(modalData.result.value.students.length, 2, "Sem 1 has exactly 2 enrolled students (Aarav Sharma & Devansh Chokshi)");

  // =========================================================================
  // JOURNEY 4: Switch Semester Tabs in Modal (Sem 3)
  // =========================================================================
  console.log("\n[Journey 4] Switching to Semester 3 in Dossier Modal...");
  await cdp("Runtime.evaluate", {
    expression: `(() => {
      const tabs = Array.from(document.querySelectorAll(".fixed.inset-0.z-50 .scrollbar-thin button"));
      const sem3Tab = tabs.find(t => t.innerText.includes("Sem 3"));
      if (sem3Tab) sem3Tab.click();
    })()`
  });
  await new Promise(r => setTimeout(r, 1000));

  const sem3Data = await cdp("Runtime.evaluate", {
    expression: `(() => {
      const modal = document.querySelector(".fixed.inset-0.z-50");
      const students = Array.from(modal.querySelectorAll("table tbody tr")).map(r => {
        const cells = Array.from(r.querySelectorAll("td")).map(c => c.innerText.trim());
        return { name: cells[0], prn: cells[1], roll: cells[2], status: cells[3] };
      });
      return { students };
    })()`,
    returnByValue: true
  });

  console.log("  Sem 3 Enrolled Students:", JSON.stringify(sem3Data.result.value.students, null, 2));
  assert.strictEqual(sem3Data.result.value.students.length, 1, "Sem 3 has exactly 1 enrolled student");
  assert(sem3Data.result.value.students[0].name.includes("Komal Soni"), "Sem 3 student is Komal Soni");

  await takeScreenshot("milestone2_semester_cohort.png");

  // Close the modal
  console.log("  Closing Dossier Modal...");
  await cdp("Runtime.evaluate", {
    expression: `(() => {
      const closeBtn = document.querySelector(".fixed.inset-0.z-50 button[aria-label='Close dossier']");
      if (closeBtn) closeBtn.click();
    })()`
  });
  await new Promise(r => setTimeout(r, 800));

  // Clear search input
  await cdp("Runtime.evaluate", {
    expression: `(() => {
      const input = document.getElementById("academics-programme-search");
      if (input) {
        Object.getOwnPropertyDescriptor(window.HTMLInputElement.prototype, "value").set.call(input, "");
        input.dispatchEvent(new Event("input", { bubbles: true }));
        input.dispatchEvent(new Event("change", { bubbles: true }));
      }
    })()`
  });
  await new Promise(r => setTimeout(r, 600));

  // =========================================================================
  // JOURNEY 5: Degree & Department Filtering
  // =========================================================================
  console.log("\n[Journey 5] Testing Degree & Department Filters...");

  // Test 1: Degree Filter -> DIPLOMA
  console.log("  Testing Degree Filter: DIPLOMA...");
  await cdp("Runtime.evaluate", {
    expression: `(() => {
      const pills = Array.from(document.querySelectorAll("button"));
      const diplomaPill = pills.find(p => p.innerText.trim().startsWith("Diploma"));
      if (diplomaPill) diplomaPill.click();
    })()`
  });
  await new Promise(r => setTimeout(r, 600));

  const diplomaCount = await cdp("Runtime.evaluate", {
    expression: `document.querySelectorAll(".space-y-3\\\\.5 > div").length`,
    returnByValue: true
  });
  console.log(`  -> Diploma filter rendered ${diplomaCount.result.value} programmes (Expected: 2)`);
  assert.strictEqual(diplomaCount.result.value, 2, "Diploma filter must show exactly 2 programmes (DIP-BC, DIP-FP)");

  // Reset to All Degrees
  await cdp("Runtime.evaluate", {
    expression: `(() => {
      const pills = Array.from(document.querySelectorAll("button"));
      const allPill = pills.find(p => p.innerText.trim().startsWith("All Programmes"));
      if (allPill) allPill.click();
    })()`
  });
  await new Promise(r => setTimeout(r, 600));

  // Test 2: Department Filter -> Department of Hospitality Studies
  console.log("  Testing Department Filter: Hospitality Studies...");
  await cdp("Runtime.evaluate", {
    expression: `(() => {
      const select = document.getElementById("academics-department-select");
      if (select) {
        const opt = Array.from(select.options).find(o => o.text.includes("Hospitality"));
        if (opt) {
          select.value = opt.value;
          select.dispatchEvent(new Event("change", { bubbles: true }));
        }
      }
    })()`
  });
  await new Promise(r => setTimeout(r, 600));

  const hospCount = await cdp("Runtime.evaluate", {
    expression: `document.querySelectorAll(".space-y-3\\\\.5 > div").length`,
    returnByValue: true
  });
  console.log(`  -> Hospitality Studies filter rendered ${hospCount.result.value} programmes (Expected: 4)`);
  assert.strictEqual(hospCount.result.value, 4, "Hospitality Studies department has 4 programmes");

  // =========================================================================
  // JOURNEY 6: Refresh and Direct URL Inspection Support
  // =========================================================================
  console.log("\n[Journey 6] Direct URL Navigation with query parameter (?code=BSCIT)...");
  await cdp("Page.navigate", { url: "http://localhost:3000/modules/academics?code=BSCIT" });
  await new Promise(r => setTimeout(r, 3000));

  const directDossier = await cdp("Runtime.evaluate", {
    expression: `(() => {
      const modal = document.querySelector(".fixed.inset-0.z-50");
      if (!modal) return null;
      return {
        code: modal.querySelector(".font-mono")?.innerText?.trim(),
        title: modal.querySelector("h2")?.innerText?.trim()
      };
    })()`,
    returnByValue: true
  });

  console.log("  Direct URL Dossier opened:", JSON.stringify(directDossier.result.value));
  assert(directDossier.result.value, "Modal must auto-open when navigating with ?code=BSCIT");
  assert.strictEqual(directDossier.result.value.code, "BSCIT", "Dossier must match BSCIT");

  // =========================================================================
  // JOURNEY 7: Regression Check (Students, Faculty, Global Search, Dashboard)
  // =========================================================================
  console.log("\n[Journey 7] Regression Verification of Other Modules...");

  // Check Dashboard
  await cdp("Page.navigate", { url: "http://localhost:3000/" });
  await new Promise(r => setTimeout(r, 2000));
  const dashOk = await cdp("Runtime.evaluate", { expression: "document.body.innerText.includes('Enrolled Students')", returnByValue: true });
  assert(dashOk.result.value, "Dashboard must load normally");
  console.log("  -> Dashboard: PASS");

  // Check Students
  await cdp("Page.navigate", { url: "http://localhost:3000/modules/students" });
  await new Promise(r => setTimeout(r, 2000));
  const stuOk = await cdp("Runtime.evaluate", { expression: "document.body.innerText.includes('Aarav Sharma')", returnByValue: true });
  assert(stuOk.result.value, "Students view must render live students");
  console.log("  -> Students View: PASS");

  // Check Faculty
  await cdp("Page.navigate", { url: "http://localhost:3000/modules/faculty" });
  await new Promise(r => setTimeout(r, 2000));
  const facOk = await cdp("Runtime.evaluate", { expression: "document.body.innerText.includes('Vikramaditya')", returnByValue: true });
  assert(facOk.result.value, "Faculty view must render live faculty");
  console.log("  -> Faculty View: PASS");

  // Verify Database Invariants
  const finalStudentCount = await prisma.student.count();
  const finalStaffCount = await prisma.staff.count();
  const finalProgrammeCount = await prisma.programme.count();

  console.log("\n[Database Invariants Verification]");
  console.log(`  - Students:   final=${finalStudentCount}, baseline=${initialStudentCount}`);
  console.log(`  - Faculty:    final=${finalStaffCount}, baseline=${initialStaffCount}`);
  console.log(`  - Programmes: final=${finalProgrammeCount}, baseline=${initialProgrammeCount}`);

  assert.strictEqual(finalStudentCount, initialStudentCount, "Student count must remain unchanged");
  assert.strictEqual(finalStaffCount, initialStaffCount, "Staff count must remain unchanged");
  assert.strictEqual(finalProgrammeCount, initialProgrammeCount, "Programme count must remain unchanged");

  console.log("\n>>> ALL 7 ACCEPTANCE JOURNEYS PASSED WITH ZERO ERRORS! <<<");

  ws.close();
  edgeProc.kill();
  await prisma.$disconnect();
}

runMilestone2AcceptanceSuite().catch(err => {
  console.error("TEST FAILED:", err);
  process.exit(1);
});




