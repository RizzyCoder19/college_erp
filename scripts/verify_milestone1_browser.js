const { spawn } = require("child_process");
const fs = require("fs");
const assert = require("assert");
const { PrismaClient } = require("@prisma/client");

async function runMilestone1AcceptanceSuite() {
  console.log("================================================================================");
  console.log("       RPIHM CampusOS: Milestone 1 Live Browser Acceptance Verification        ");
  console.log("================================================================================");

  const prisma = new PrismaClient();
  const initialStudentCount = await prisma.student.count();
  const initialStaffCount = await prisma.staff.count();
  const initialProgrammeCount = await prisma.programme.count();
  const initialDivisionCount = await prisma.division.count();

  console.log(`[Database Invariant Baseline]`);
  console.log(`  - Students: ${initialStudentCount}`);
  console.log(`  - Faculty:  ${initialStaffCount}`);
  console.log(`  - Programmes: ${initialProgrammeCount}`);
  console.log(`  - Divisions:  ${initialDivisionCount}`);

  // Launch Edge in headless mode
  const edgeProc = spawn("C:\\Program Files (x86)\\Microsoft\\Edge\\Application\\msedge.exe", [
    "--headless", "--remote-debugging-port=9245", "--disable-gpu", "--no-sandbox", "--window-size=1440,900"
  ]);

  for (let i = 0; i < 25; i++) {
    await new Promise(r => setTimeout(r, 400));
    try { await fetch("http://localhost:9245/json/version"); break; } catch(e){}
  }

  const tab = await (await fetch("http://localhost:9245/json/new", { method: "PUT" })).json();
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

  async function takeScreenshot(filename) {
    const shot = await cdp("Page.captureScreenshot", { format: "png" });
    fs.writeFileSync(filename, Buffer.from(shot.data, "base64"));
    console.log(`  [Screenshot] Saved: ${filename}`);
  }

  // Step 1: Authenticate
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
  // JOURNEY 1: Dashboard Truthfulness
  // =========================================================================
  console.log("\n[Journey 1] Dashboard Truthfulness Verification at / ...");
  await cdp("Page.navigate", { url: "http://localhost:3000/" });
  await new Promise(r => setTimeout(r, 2500));

  const dashboardMetrics = await cdp("Runtime.evaluate", {
    expression: `(() => {
      const cards = Array.from(document.querySelectorAll(".grid.grid-cols-1.sm\\\\:grid-cols-2.lg\\\\:grid-cols-4 > div"));
      return cards.map(c => {
        const label = c.querySelector("span")?.innerText?.trim();
        const value = c.querySelector(".text-2xl, .text-3xl")?.innerText?.trim();
        const badge = c.querySelector(".bg-emerald-50")?.innerText?.trim();
        const caption = c.querySelector(".border-t")?.innerText?.trim();
        return { label, value, badge, caption };
      });
    })()`,
    returnByValue: true
  });

  console.log("  Rendered Dashboard Metric Cards:", JSON.stringify(dashboardMetrics.result.value, null, 2));

  // Assertions for Journey 1
  const metrics = dashboardMetrics.result.value;
  assert(metrics && metrics.length >= 4, "Dashboard must render at least 4 metric cards");

  const studentCard = metrics.find(m => m.label && m.label.includes("Enrolled Students"));
  assert(studentCard, "Must find 'Enrolled Students' card");
  console.log(`  -> Enrolled Students: rendered="${studentCard.value}", expected="${initialStudentCount}"`);
  assert.strictEqual(studentCard.value, initialStudentCount.toString(), "Enrolled students must match SQLite count (11), NOT mock (1,284)");

  const facultyCard = metrics.find(m => m.label && m.label.includes("Faculty & Staff"));
  assert(facultyCard, "Must find 'Faculty & Staff' card");
  console.log(`  -> Faculty & Staff: rendered="${facultyCard.value}", expected="${initialStaffCount}"`);
  assert.strictEqual(facultyCard.value, initialStaffCount.toString(), "Faculty & Staff must match SQLite count (12), NOT mock (68)");

  const progCard = metrics.find(m => m.label && m.label.includes("Active Programmes"));
  assert(progCard, "Must find 'Active Programmes' card");
  console.log(`  -> Active Programmes: rendered="${progCard.value}", expected="${initialProgrammeCount}"`);
  assert.strictEqual(progCard.value, initialProgrammeCount.toString(), "Active Programmes must match SQLite count (7)");

  const cohortCard = metrics.find(m => m.label && m.label.includes("Active Class Cohorts"));
  assert(cohortCard, "Must find 'Active Class Cohorts' card");
  console.log(`  -> Active Class Cohorts: rendered="${cohortCard.value}", expected="${initialDivisionCount}"`);
  assert.strictEqual(cohortCard.value, initialDivisionCount.toString(), "Active Class Cohorts must match SQLite count (14)");

  // Check Schedule Sync Pending badge
  const scheduleSyncBadge = await cdp("Runtime.evaluate", {
    expression: `(() => {
      const el = Array.from(document.querySelectorAll("span")).find(s => s.innerText.includes("Schedule Sync Pending"));
      return el ? el.innerText.trim() : null;
    })()`,
    returnByValue: true
  });
  console.log("  -> Today on Campus badge:", scheduleSyncBadge.result.value);
  assert(scheduleSyncBadge.result.value, "Today on Campus must display 'Schedule Sync Pending' badge to distinguish mock schedule from live telemetry");

  await takeScreenshot("milestone1_dashboard_live.png");
  console.log("  [PASS] Journey 1: Dashboard Truthfulness confirmed 100% live database backed!");

  // =========================================================================
  // JOURNEY 2: Unified Global Search — Student Search & Dossier Open
  // =========================================================================
  console.log("\n[Journey 2] Unified Global Search — Student Search & Dossier Navigation...");

  // Open search modal via click on search input
  await cdp("Runtime.evaluate", {
    expression: `(() => {
      const searchBox = document.getElementById("search-input");
      if (searchBox) searchBox.click();
    })()`
  });
  await new Promise(r => setTimeout(r, 600));

  // Type "Aarav" into global-search-input
  await cdp("Runtime.evaluate", {
    expression: `(() => {
      const input = document.getElementById("global-search-input");
      if (!input) return "global-search-input not found";
      const setV = (el, val) => {
        Object.getOwnPropertyDescriptor(window.HTMLInputElement.prototype, "value").set.call(el, val);
        el.dispatchEvent(new Event("input", { bubbles: true }));
        el.dispatchEvent(new Event("change", { bubbles: true }));
      };
      setV(input, "Aarav");
      return "typed Aarav";
    })()`,
    returnByValue: true
  });
  await new Promise(r => setTimeout(r, 1200)); // wait for debounce and DB response

  const searchResultsStudent = await cdp("Runtime.evaluate", {
    expression: `(() => {
      const modal = document.querySelector("[aria-label='Institutional Search']");
      if (!modal) return { modalOpen: false };
      const items = Array.from(modal.querySelectorAll("a")).map(a => a.innerText.trim());
      return { modalOpen: true, items };
    })()`,
    returnByValue: true
  });

  console.log("  Search Results for 'Aarav':", JSON.stringify(searchResultsStudent.result.value.items));
  const hasAaravResult = searchResultsStudent.result.value.items.some(txt => txt.includes("Aarav Sharma") && txt.includes("2026DS041"));
  assert(hasAaravResult, "Global search must return Aarav Sharma with PRN 2026DS041 from live database");

  // Click on Aarav Sharma's search result
  await cdp("Runtime.evaluate", {
    expression: `(() => {
      const links = Array.from(document.querySelectorAll("[aria-label='Institutional Search'] a"));
      const aaravLink = links.find(l => l.innerText.includes("Aarav Sharma"));
      if (aaravLink) aaravLink.click();
    })()`
  });
  await new Promise(r => setTimeout(r, 2000));

  // Verify navigation to /modules/students and dossier modal open
  const studentDossierState = await cdp("Runtime.evaluate", {
    expression: `(() => {
      const url = window.location.href;
      const modalHeading = document.querySelector("h2")?.innerText || "";
      const modalText = document.body.innerText;
      const isDossierOpen = modalText.includes("Student Enrollment Dossier") || modalText.includes("Aarav Sharma");
      return { url, isDossierOpen, hasPrn: modalText.includes("2026DS041") };
    })()`,
    returnByValue: true
  });

  console.log("  Student Dossier Open State:", studentDossierState.result.value);
  assert(studentDossierState.result.value.url.includes("/modules/students"), "Must navigate to /modules/students");
  assert(studentDossierState.result.value.isDossierOpen, "Student dossier modal must be automatically open");
  assert(studentDossierState.result.value.hasPrn, "Dossier must display student PRN 2026DS041");

  await takeScreenshot("milestone1_student_search_dossier.png");

  // Close student dossier modal
  await cdp("Runtime.evaluate", {
    expression: `(() => {
      const closeBtn = document.querySelector("button[aria-label='Close dialog'], button[aria-label='Close modal'], button[title='Close']");
      if (closeBtn) closeBtn.click();
      else {
        // Fallback: click backdrop or escape
        window.dispatchEvent(new KeyboardEvent("keydown", { key: "Escape" }));
      }
    })()`
  });
  await new Promise(r => setTimeout(r, 600));
  console.log("  [PASS] Journey 2: Student search and dossier navigation verified successfully!");

  // =========================================================================
  // JOURNEY 3: Unified Global Search — Faculty Search & Dossier Open
  // =========================================================================
  console.log("\n[Journey 3] Unified Global Search — Faculty Search & Dossier Navigation...");

  // Open search modal via Ctrl+K
  await cdp("Runtime.evaluate", {
    expression: `window.dispatchEvent(new KeyboardEvent("keydown", { key: "k", ctrlKey: true, bubbles: true }))`
  });
  await new Promise(r => setTimeout(r, 600));

  // Type "Vikramaditya" into search
  await cdp("Runtime.evaluate", {
    expression: `(() => {
      const input = document.getElementById("global-search-input");
      if (!input) return "not found";
      const setV = (el, val) => {
        Object.getOwnPropertyDescriptor(window.HTMLInputElement.prototype, "value").set.call(el, val);
        el.dispatchEvent(new Event("input", { bubbles: true }));
        el.dispatchEvent(new Event("change", { bubbles: true }));
      };
      setV(input, "Vikramaditya");
      return "typed";
    })()`,
    returnByValue: true
  });
  await new Promise(r => setTimeout(r, 1200));

  const facultySearchResults = await cdp("Runtime.evaluate", {
    expression: `(() => {
      const modal = document.querySelector("[aria-label='Institutional Search']");
      if (!modal) return [];
      return Array.from(modal.querySelectorAll("a")).map(a => a.innerText.trim());
    })()`,
    returnByValue: true
  });

  console.log("  Search Results for 'Vikramaditya':", JSON.stringify(facultySearchResults.result.value));
  const hasChefResult = facultySearchResults.result.value.some(txt => txt.includes("Chef Vikramaditya Kapoor") && txt.includes("RPIHM-FAC-012"));
  assert(hasChefResult, "Global search must return Chef Vikramaditya Kapoor with employee ID RPIHM-FAC-012 from live database");

  // Click on Chef Vikramaditya Kapoor's search result
  await cdp("Runtime.evaluate", {
    expression: `(() => {
      const links = Array.from(document.querySelectorAll("[aria-label='Institutional Search'] a"));
      const chefLink = links.find(l => l.innerText.includes("Chef Vikramaditya Kapoor"));
      if (chefLink) chefLink.click();
    })()`
  });
  await new Promise(r => setTimeout(r, 2000));

  // Verify navigation to /modules/faculty and dossier modal open
  const facultyDossierState = await cdp("Runtime.evaluate", {
    expression: `(() => {
      const url = window.location.href;
      const bodyText = document.body.innerText;
      const isDossierOpen = bodyText.includes("Chef Vikramaditya Kapoor") && bodyText.includes("RPIHM-FAC-012");
      return { url, isDossierOpen };
    })()`,
    returnByValue: true
  });

  console.log("  Faculty Dossier Open State:", facultyDossierState.result.value);
  assert(facultyDossierState.result.value.url.includes("/modules/faculty"), "Must navigate to /modules/faculty");
  assert(facultyDossierState.result.value.isDossierOpen, "Faculty dossier modal must be automatically open");

  await takeScreenshot("milestone1_faculty_search_dossier.png");

  // Close faculty dossier modal
  await cdp("Runtime.evaluate", {
    expression: `(() => {
      window.dispatchEvent(new KeyboardEvent("keydown", { key: "Escape" }));
    })()`
  });
  await new Promise(r => setTimeout(r, 600));
  console.log("  [PASS] Journey 3: Faculty search and dossier navigation verified successfully!");

  // =========================================================================
  // JOURNEY 4: Faculty Department Filtering by Database ID
  // =========================================================================
  console.log("\n[Journey 4] Faculty Department Filtering by Database UUIDs...");
  await cdp("Page.navigate", { url: "http://localhost:3000/modules/faculty" });
  await new Promise(r => setTimeout(r, 2000));

  // Inspect department options
  const deptOptions = await cdp("Runtime.evaluate", {
    expression: `(() => {
      const selects = Array.from(document.querySelectorAll("select"));
      const deptSelect = selects.find(s => Array.from(s.options).some(o => o.text.includes("Hospitality") || o.text.includes("CUL")));
      if (!deptSelect) return [];
      return Array.from(deptSelect.options).map(o => ({ value: o.value, text: o.text }));
    })()`,
    returnByValue: true
  });

  console.log("  Rendered Department Filter Options:", JSON.stringify(deptOptions.result.value, null, 2));

  // Verify UUIDs in options
  const hospitalityOpt = deptOptions.result.value.find(o => o.text.includes("Hospitality"));
  assert(hospitalityOpt, "Must find Hospitality department option");
  assert(hospitalityOpt.value.includes("-"), `Hospitality option value must be a database UUID, got: ${hospitalityOpt.value}`);
  console.log(`  -> Hospitality option value: ${hospitalityOpt.value} (${hospitalityOpt.text})`);

  const techOpt = deptOptions.result.value.find(o => o.text.includes("Technology"));
  assert(techOpt, "Must find Technology department option");
  assert(techOpt.value.includes("-"), `Technology option value must be a database UUID, got: ${techOpt.value}`);
  console.log(`  -> Technology option value: ${techOpt.value} (${techOpt.text})`);

  const adminOpt = deptOptions.result.value.find(o => o.text.includes("Administrative"));
  assert(adminOpt, "Must find Administrative department option");
  assert(adminOpt.value.includes("-"), `Administrative option value must be a database UUID, got: ${adminOpt.value}`);
  console.log(`  -> Administrative option value: ${adminOpt.value} (${adminOpt.text})`);

  // Test filter selection: Hospitality
  console.log("  Testing Filter: Hospitality & Culinary Arts...");
  const hospResult = await cdp("Runtime.evaluate", {
    expression: `(() => {
      const selects = Array.from(document.querySelectorAll("select"));
      const deptSelect = selects.find(s => Array.from(s.options).some(o => o.value === ${JSON.stringify(hospitalityOpt.value)}));
      deptSelect.value = ${JSON.stringify(hospitalityOpt.value)};
      deptSelect.dispatchEvent(new Event("change", { bubbles: true }));

      const rows = Array.from(document.querySelectorAll("tbody tr"));
      return { rowCount: rows.length };
    })()`,
    returnByValue: true
  });
  console.log(`  -> Rows rendered after Hospitality filter: ${hospResult.result.value.rowCount} (expected: 6)`);
  assert.strictEqual(hospResult.result.value.rowCount, 6, "Hospitality filter must return exactly 6 staff records");

  // Test filter selection: Technology
  console.log("  Testing Filter: Technology & Computing...");
  const techResult = await cdp("Runtime.evaluate", {
    expression: `(() => {
      const selects = Array.from(document.querySelectorAll("select"));
      const deptSelect = selects.find(s => Array.from(s.options).some(o => o.value === ${JSON.stringify(techOpt.value)}));
      deptSelect.value = ${JSON.stringify(techOpt.value)};
      deptSelect.dispatchEvent(new Event("change", { bubbles: true }));

      const rows = Array.from(document.querySelectorAll("tbody tr"));
      return { rowCount: rows.length };
    })()`,
    returnByValue: true
  });
  console.log(`  -> Rows rendered after Technology filter: ${techResult.result.value.rowCount} (expected: 3)`);
  assert.strictEqual(techResult.result.value.rowCount, 3, "Technology filter must return exactly 3 staff records");

  // Test filter selection: Administrative
  console.log("  Testing Filter: Administrative & Student Affairs...");
  const adminResult = await cdp("Runtime.evaluate", {
    expression: `(() => {
      const selects = Array.from(document.querySelectorAll("select"));
      const deptSelect = selects.find(s => Array.from(s.options).some(o => o.value === ${JSON.stringify(adminOpt.value)}));
      deptSelect.value = ${JSON.stringify(adminOpt.value)};
      deptSelect.dispatchEvent(new Event("change", { bubbles: true }));

      const rows = Array.from(document.querySelectorAll("tbody tr"));
      return { rowCount: rows.length };
    })()`,
    returnByValue: true
  });
  console.log(`  -> Rows rendered after Administrative filter: ${adminResult.result.value.rowCount} (expected: 3)`);
  assert.strictEqual(adminResult.result.value.rowCount, 3, "Administrative filter must return exactly 3 staff records");

  // Reset filter to All Departments
  console.log("  Testing Filter: All Departments...");
  const allResult = await cdp("Runtime.evaluate", {
    expression: `(() => {
      const selects = Array.from(document.querySelectorAll("select"));
      const deptSelect = selects.find(s => Array.from(s.options).some(o => o.value === "all"));
      deptSelect.value = "all";
      deptSelect.dispatchEvent(new Event("change", { bubbles: true }));

      const rows = Array.from(document.querySelectorAll("tbody tr"));
      return { rowCount: rows.length };
    })()`,
    returnByValue: true
  });
  console.log(`  -> Rows rendered after resetting to All: ${allResult.result.value.rowCount} (expected: 12)`);
  assert.strictEqual(allResult.result.value.rowCount, 12, "All Departments filter must return all 12 staff records");

  await takeScreenshot("milestone1_faculty_dept_filter.png");
  console.log("  [PASS] Journey 4: Faculty Department Filtering verified 100%!");

  // =========================================================================
  // JOURNEY 5: Reconciliation Discoverability & Data Tools Action
  // =========================================================================
  console.log("\n[Journey 5] Reconciliation Discoverability & Secondary Action...");

  // Verify that large amber alert banner is NOT on the page by default
  const bannerCheck = await cdp("Runtime.evaluate", {
    expression: `(() => {
      const banners = Array.from(document.querySelectorAll(".bg-amber-50\\\\/80, .border-amber-200\\\\/90"));
      const hasLargeBanner = banners.some(b => b.innerText.includes("Prototype Browser Records Detected"));
      return { hasLargeBanner };
    })()`,
    returnByValue: true
  });
  console.log("  Large banner present on clean roster:", bannerCheck.result.value.hasLargeBanner);
  assert(!bannerCheck.result.value.hasLargeBanner, "Large disruptive banner must NOT be rendered on primary roster");

  // Seed a prototype sample into localStorage to test the secondary Data Tools button
  console.log("  Simulating prototype records in localStorage to verify secondary Data Tools action...");
  await cdp("Runtime.evaluate", {
    expression: `(() => {
      const mockProto = [{
        id: "proto-test-001",
        staffId: "RPIHM-FAC-999",
        fullName: "Dr. Prototype Inspector",
        designation: "Visiting Specialist",
        department: "Technology & Computing",
        category: "Teaching Faculty",
        employmentType: "Full-Time Permanent",
        email: "inspector@test.com",
        phone: "+91 99999 11111",
        officeLocation: "Block A",
        workloadHours: 12,
        status: "Active",
        qualification: "Ph.D",
        specialization: "AI",
        joinedDate: "2024-01-01",
        teachingSubjects: ["Advanced AI"],
        assignedProgrammes: ["BSCDS-AI"]
      }];
      localStorage.setItem("rpihm_faculty_records_v1", JSON.stringify(mockProto));
      window.location.reload();
    })()`
  });
  await new Promise(r => setTimeout(r, 2500));

  // Verify secondary action button "Data Tools" appears with count badge
  const dataToolsBtn = await cdp("Runtime.evaluate", {
    expression: `(() => {
      const btns = Array.from(document.querySelectorAll("button"));
      const btn = btns.find(b => b.innerText.includes("Data Tools"));
      if (!btn) return { found: false };
      return { found: true, text: btn.innerText.replace(/\\s+/g, " ").trim() };
    })()`,
    returnByValue: true
  });
  console.log("  Data Tools Button rendered:", dataToolsBtn.result.value);
  assert(dataToolsBtn.result.value.found, "Secondary 'Data Tools' button must appear when prototype records exist");
  assert(dataToolsBtn.result.value.text.includes("Data Tools 1"), "Data Tools button must display count badge (1)");

  // Click Data Tools button
  console.log("  Clicking Data Tools button to open reconciliation workflow...");
  await cdp("Runtime.evaluate", {
    expression: `(() => {
      const btns = Array.from(document.querySelectorAll("button"));
      const btn = btns.find(b => b.innerText.includes("Data Tools"));
      if (btn) btn.click();
    })()`
  });
  await new Promise(r => setTimeout(r, 800));

  // Verify Prototype Reconciliation Modal opened
  const modalState = await cdp("Runtime.evaluate", {
    expression: `(() => {
      const modal = document.querySelector("[role='dialog']");
      if (!modal) return { modalOpen: false };
      const heading = modal.querySelector("h3")?.innerText || modal.innerText;
      return { modalOpen: true, heading: heading.slice(0, 100) };
    })()`,
    returnByValue: true
  });
  console.log("  Reconciliation Modal State:", modalState.result.value);
  assert(modalState.result.value.modalOpen, "Prototype Reconciliation Modal must open upon clicking Data Tools");

  await takeScreenshot("milestone1_reconciliation_modal.png");

  // Close modal and clean up test record from localStorage
  await cdp("Runtime.evaluate", {
    expression: `(() => {
      localStorage.removeItem("rpihm_faculty_records_v1");
      const closeBtn = document.querySelector("[role='dialog'] button");
      if (closeBtn) closeBtn.click();
      window.dispatchEvent(new KeyboardEvent("keydown", { key: "Escape" }));
    })()`
  });
  await new Promise(r => setTimeout(r, 600));
  console.log("  [PASS] Journey 5: Reconciliation discoverability and Data Tools action verified successfully!");

  // =========================================================================
  // JOURNEY 6: Page Refresh & Invariant Verification
  // =========================================================================
  console.log("\n[Journey 6] Page Refresh, Navigation & Database Invariant Verification...");
  await cdp("Page.navigate", { url: "http://localhost:3000/" });
  await new Promise(r => setTimeout(r, 2000));

  const finalStudentCount = await prisma.student.count();
  const finalStaffCount = await prisma.staff.count();

  console.log(`  Database Counts Check:`);
  console.log(`  -> Initial Students: ${initialStudentCount}, Final Students: ${finalStudentCount}`);
  console.log(`  -> Initial Faculty:  ${initialStaffCount}, Final Faculty:  ${finalStaffCount}`);

  assert.strictEqual(finalStudentCount, initialStudentCount, "Student database records must be 100% invariant");
  assert.strictEqual(finalStaffCount, initialStaffCount, "Staff database records must be 100% invariant");

  // Clean up CDP connection and browser process
  ws.close();
  edgeProc.kill();
  await prisma.$disconnect();

  console.log("\n================================================================================");
  console.log("       ALL 6 MILESTONE 1 ACCEPTANCE JOURNEYS VERIFIED WITH 100% SUCCESS!       ");
  console.log("================================================================================");
}

runMilestone1AcceptanceSuite().catch(err => {
  console.error("FATAL SUITE ERROR:", err);
  process.exit(1);
});
