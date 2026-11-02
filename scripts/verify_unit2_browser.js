const { spawn } = require("child_process");
const fs = require("fs");
const { PrismaClient } = require("@prisma/client");

async function testUnit2Browser() {
  console.log("=== RPIHM CampusOS: Unit 2 Live-Browser Checkpoint ===");
  const prisma = new PrismaClient();

  const initialStudents = await prisma.student.findMany({ select: { id: true, prn: true, rollNumber: true, email: true, phone: true } });
  const initialStaff = await prisma.staff.findMany({ select: { id: true, employeeId: true, email: true, phone: true } });
  console.log(`Initial SQLite counts: Students=${initialStudents.length}, Faculty=${initialStaff.length}`);
  console.log("Recorded baseline student and staff identifiers for invariant verification.");

  const edgeProc = spawn("C:\\Program Files (x86)\\Microsoft\\Edge\\Application\\msedge.exe", [
    "--headless", "--remote-debugging-port=9237", "--disable-gpu", "--no-sandbox", "--window-size=1440,900"
  ]);

  for (let i = 0; i < 20; i++) {
    await new Promise(r => setTimeout(r, 400));
    try { await fetch("http://localhost:9237/json/version"); break; } catch(e){}
  }

  const tab = await (await fetch("http://localhost:9237/json/new", { method: "PUT" })).json();
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

  const consoleErrors = [];
  const requestsMap = {};
  const networkErrors = [];

  ws.addEventListener("message", e => {
    const m = JSON.parse(e.data);
    if (m.method === "Runtime.consoleAPICalled" && (m.params.type === "error" || m.params.type === "warning")) {
      const text = m.params.args.map(a => a.value || a.description || JSON.stringify(a)).join(" ");
      consoleErrors.push(`[CONSOLE ${m.params.type.toUpperCase()}] ${text}`);
    }
    if (m.method === "Network.requestWillBeSent") {
      requestsMap[m.params.requestId] = {
        url: m.params.request.url,
        type: m.params.type
      };
    }
    if (m.method === "Network.loadingFailed") {
      const req = requestsMap[m.params.requestId] || {};
      networkErrors.push({
        url: req.url || "unknown",
        type: m.params.type || req.type || "unknown",
        errorText: m.params.errorText,
        canceled: m.params.canceled === true
      });
    }
  });

  await cdp("Page.enable");
  await cdp("Runtime.enable");
  await cdp("Network.enable");

  // Step 1: Login
  console.log("\n[Step 1] Authenticating at /login...");
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

  // Wait for redirect away from /login
  for (let i = 0; i < 20; i++) {
    await new Promise(r => setTimeout(r, 500));
    const loc = await cdp("Runtime.evaluate", {
      expression: "window.location.href",
      returnByValue: true
    });
    if (loc.result.value && !loc.result.value.includes("/login")) {
      console.log("Authenticated successfully, redirected to:", loc.result.value);
      break;
    }
  }

  // Step 2: Inject Deterministic Prototype Test Data for Students
  console.log("\n[Step 2] Injecting Student Prototype Records (Duplicate, Conflict, Importable)...");
  await cdp("Page.navigate", { url: "http://localhost:3000/modules/students" });
  await new Promise(r => setTimeout(r, 3500));

  await cdp("Runtime.evaluate", {
    expression: `(() => {
      const testStudents = [
        // 1. Confirmed Duplicate: Aarav Sharma (2026DS041)
        {
          id: "proto-std-001",
          prn: "2026DS041",
          rollNumber: "RPIHM-2026DS041",
          fullName: "Aarav Sharma",
          email: "aarav.sharma.26@rpihm.ac.in",
          phone: "+91 98201 44521",
          programmeId: "c010a20b-1eb1-4688-8cb4-ff807132142d",
          programmeName: "B.Sc. Data Science with AI",
          department: "Technology & Computing",
          semester: 1,
          yearGroup: "FY",
          division: "Div A",
          admissionDate: "15 Jul 2026",
          enrollmentStatus: "Active",
          feeStatus: "Paid",
          attendanceRate: 88.5,
          mentorFaculty: "Prof. Snehal Kulkarni",
          guardianName: "Sunil Sharma",
          guardianRelationship: "Father",
          guardianPhone: "+91 98201 11200",
          bloodGroup: "B+",
          dateOfBirth: "2006-04-12",
          isFictionalSample: true
        },
        // 2. Conflict Record: Rohan K. Verma (2025IT112) with conflicting phone & division
        {
          id: "proto-std-002",
          prn: "2025IT112",
          rollNumber: "RPIHM-2026-003",
          fullName: "Rohan K. Verma",
          email: "rohan.verma.25@rpihm.ac.in",
          phone: "+91 99999 88888", // Conflicting phone
          programmeId: "0535808b-5d2f-44c2-b018-d46d80a247f1",
          programmeName: "B.Sc. Information Technology",
          department: "Technology & Computing",
          semester: 1,
          yearGroup: "FY",
          division: "Div B", // Conflicting division (DB is Div A)
          admissionDate: "15 Jul 2025",
          enrollmentStatus: "Active",
          feeStatus: "Paid",
          attendanceRate: 88.5,
          mentorFaculty: "Prof. Snehal Kulkarni",
          guardianName: "Kamal Verma",
          guardianRelationship: "Father",
          guardianPhone: "+91 98201 22300",
          bloodGroup: "O+",
          isFictionalSample: true
        },
        // 3. Importable Record: Aditi Rao (2026DS999) - genuinely new
        {
          id: "proto-std-003",
          prn: "2026DS999",
          rollNumber: "RPIHM-2026DS999",
          fullName: "Aditi Rao",
          email: "aditi.rao.26@rpihm.ac.in",
          phone: "+91 98765 43210",
          programmeId: "c010a20b-1eb1-4688-8cb4-ff807132142d",
          programmeName: "B.Sc. Data Science with AI",
          department: "Technology & Computing",
          semester: 1,
          yearGroup: "FY",
          division: "Div A",
          admissionDate: "15 Jul 2026",
          enrollmentStatus: "Active",
          feeStatus: "Paid",
          attendanceRate: 90.0,
          mentorFaculty: "Prof. Snehal Kulkarni",
          guardianName: "Sanjay Rao",
          guardianRelationship: "Father",
          guardianPhone: "+91 98765 00000",
          bloodGroup: "A+",
          isFictionalSample: true
        }
      ];
      localStorage.setItem("rpihm_student_records_v1", JSON.stringify(testStudents));
    })()`
  });

  // Reload page so StudentsView loads the injected prototype records
  await cdp("Page.reload");
  await new Promise(r => setTimeout(r, 4000));

  // Step 3: Verify Student Reconciliation Banner & Launch Modal
  console.log("\n[Step 3] Verifying Student Reconciliation Banner & Opening Modal...");
  const bannerInfo = await cdp("Runtime.evaluate", {
    expression: `(() => {
      const banner = document.body.innerText.includes("Prototype Browser Records Detected");
      const reviewBtn = Array.from(document.querySelectorAll("button")).find(b => b.innerText.includes("Review & Reconcile"));
      if (reviewBtn) reviewBtn.click();
      return { bannerVisible: banner, clickedReview: Boolean(reviewBtn) };
    })()`,
    returnByValue: true
  });
  console.log("Student Banner Evaluation:", bannerInfo.result.value);
  await new Promise(r => setTimeout(r, 1500));

  // Step 4: Verify Student Reconciliation Classification
  console.log("\n[Step 4] Checking Classifications (Duplicate, Conflict, Importable)...");
  const modalInspection = await cdp("Runtime.evaluate", {
    expression: `(() => {
      const cards = Array.from(document.querySelectorAll("[role='dialog'] button")).map(b => b.innerText.replace(/\\n/g, ": "));
      const rows = Array.from(document.querySelectorAll("[role='dialog'] .divide-y > div")).map(div => {
        const text = div.innerText.replace(/\\n/g, " | ");
        return text;
      });

      const aaravRow = rows.find(r => r.includes("2026DS041"));
      const rohanRow = rows.find(r => r.includes("2025IT112"));
      const aditiRow = rows.find(r => r.includes("2026DS999"));

      return {
        metricCards: cards,
        aaravClassification: aaravRow ? (aaravRow.includes("Confirmed Duplicate") ? "DUPLICATE" : (aaravRow.includes("Conflict") ? "CONFLICT" : "IMPORTABLE")) : "NOT_FOUND",
        aaravRowText: aaravRow || "",
        rohanClassification: rohanRow ? (rohanRow.includes("Conflict Requiring Review") ? "CONFLICT" : "OTHER") : "NOT_FOUND",
        rohanRowText: rohanRow || "",
        aditiClassification: aditiRow ? (aditiRow.includes("New (Ready to Import)") ? "IMPORTABLE" : "OTHER") : "NOT_FOUND",
        aditiRowText: aditiRow || ""
      };
    })()`,
    returnByValue: true
  });
  console.log("Student Reconciliation Items Classification:", modalInspection.result.value);

  // Capture screenshot of Student Reconciliation Modal
  const studentReconcileScreenshot = await cdp("Page.captureScreenshot", { format: "png" });
  fs.writeFileSync("unit2_student_reconciliation.png", Buffer.from(studentReconcileScreenshot.data, "base64"));
  console.log("Saved screenshot: unit2_student_reconciliation.png (" + fs.statSync("unit2_student_reconciliation.png").size + " bytes)");

  // Step 4.5: Simulated Storage Failure Verification
  console.log("\n[Step 4.5] Simulating storage write failure during pruning and verifying safe restoration...");
  const simInstall = await cdp("Runtime.evaluate", {
    expression: `(() => {
      window.__realSetItem = localStorage.setItem.bind(localStorage);
      let failedOnce = false;
      localStorage.setItem = function(k, v) {
        if (k === "rpihm_student_records_v1" && !failedOnce) {
          failedOnce = true;
          throw new Error("Simulated QuotaExceededError during filtered storage write");
        }
        return window.__realSetItem(k, v);
      };
      return { installed: true };
    })()`,
    returnByValue: true
  });
  console.log("Simulated storage failure installed:", simInstall.result.value);

  // Click Prune Duplicates with simulated failure
  await cdp("Runtime.evaluate", {
    expression: `(() => {
      const pruneBtn = Array.from(document.querySelectorAll("[role='dialog'] button")).find(b => b.innerText.includes("Prune Duplicates"));
      if (pruneBtn) pruneBtn.click();
    })()`
  });
  await new Promise(r => setTimeout(r, 600));

  // Confirm prune dialog
  await cdp("Runtime.evaluate", {
    expression: `(() => {
      const confirmBtn = Array.from(document.querySelectorAll("[role='dialog'] button")).find(b => b.innerText.includes("Yes, Safely Prune"));
      if (confirmBtn) confirmBtn.click();
    })()`
  });
  await new Promise(r => setTimeout(r, 1200));

  // Verify that original records remain completely intact in storage after simulated failure
  const simCheck = await cdp("Runtime.evaluate", {
    expression: `(() => {
      // Restore real setItem
      if (window.__realSetItem) {
        localStorage.setItem = window.__realSetItem;
        delete window.__realSetItem;
      }
      const raw = localStorage.getItem("rpihm_student_records_v1");
      const records = JSON.parse(raw || "[]");
      const backupKey = sessionStorage.getItem("last_rpihm_student_records_v1_backup");
      return {
        intactRecordCount: records.length,
        prnsIntact: records.map(r => r.prn),
        backupCreated: !!backupKey,
        backupKey
      };
    })()`,
    returnByValue: true
  });
  console.log("Simulated storage write-failure recovery verification:", simCheck.result.value);

  // Step 5: Prune Confirmed Duplicate (Aarav Sharma) and Verify Recoverable Backup
  console.log("\n[Step 5] Testing Pruning of Confirmed Duplicates...");
  const pruneClick = await cdp("Runtime.evaluate", {
    expression: `(() => {
      const pruneBtn = Array.from(document.querySelectorAll("[role='dialog'] button")).find(b => b.innerText.includes("Prune Duplicates"));
      if (!pruneBtn) return { error: "Prune button not found" };
      pruneBtn.click();
      return { clickedPrune: true };
    })()`,
    returnByValue: true
  });
  console.log("Prune button click:", pruneClick.result.value);
  await new Promise(r => setTimeout(r, 800));

  // Confirm prune dialog
  const confirmPruneClick = await cdp("Runtime.evaluate", {
    expression: `(() => {
      const confirmBtn = Array.from(document.querySelectorAll("[role='dialog'] button")).find(b => b.innerText.includes("Yes, Safely Prune"));
      if (!confirmBtn) return { error: "Confirm prune button not found" };
      confirmBtn.click();
      return { confirmedPrune: true };
    })()`,
    returnByValue: true
  });
  console.log("Confirm prune click:", confirmPruneClick.result.value);
  await new Promise(r => setTimeout(r, 1500));

  // Check localStorage after pruning
  const storageAfterPrune = await cdp("Runtime.evaluate", {
    expression: `(() => {
      const remaining = JSON.parse(localStorage.getItem("rpihm_student_records_v1") || "[]");
      const backupKey = sessionStorage.getItem("last_rpihm_student_records_v1_backup");
      const backupData = backupKey ? JSON.parse(localStorage.getItem(backupKey) || "[]") : [];
      return {
        remainingCount: remaining.length,
        remainingPrns: remaining.map(s => s.prn),
        backupKey,
        backupCount: backupData.length
      };
    })()`,
    returnByValue: true
  });
  console.log("Storage state after pruning:", storageAfterPrune.result.value);

  // Capture screenshot of pruned state
  const studentPrunedScreenshot = await cdp("Page.captureScreenshot", { format: "png" });
  fs.writeFileSync("unit2_student_pruned.png", Buffer.from(studentPrunedScreenshot.data, "base64"));
  console.log("Saved screenshot: unit2_student_pruned.png (" + fs.statSync("unit2_student_pruned.png").size + " bytes)");

  // Close modal and test page reload
  console.log("\n[Step 6] Reloading page to verify pruned duplicate does NOT reappear as candidate...");
  await cdp("Runtime.evaluate", {
    expression: `(() => {
      const closeBtn = Array.from(document.querySelectorAll("[role='dialog'] button")).find(b => b.innerText === "Close");
      if (closeBtn) closeBtn.click();
    })()`
  });
  await new Promise(r => setTimeout(r, 500));
  await cdp("Page.reload");
  await new Promise(r => setTimeout(r, 4000));

  const postReloadStorageCheck = await cdp("Runtime.evaluate", {
    expression: `(() => {
      const remaining = JSON.parse(localStorage.getItem("rpihm_student_records_v1") || "[]");
      const aaravPresent = remaining.some(s => s.prn === "2026DS041");
      const bannerText = document.querySelector(".bg-amber-50\\/80 h4")?.innerText || "";
      return {
        remainingCount: remaining.length,
        aaravPresent,
        bannerText
      };
    })()`,
    returnByValue: true
  });
  console.log("Post-reload student storage check:", postReloadStorageCheck.result.value);

  // Step 7: Faculty Management Reconciliation Check
  console.log("\n[Step 7] Testing Faculty Management Prototype Reconciliation...");
  await cdp("Page.navigate", { url: "http://localhost:3000/modules/faculty" });
  await new Promise(r => setTimeout(r, 3500));

  // Inject Faculty Prototype test data
  await cdp("Runtime.evaluate", {
    expression: `(() => {
      const testFaculty = [
        // 1. Confirmed Duplicate: Chef Vikramaditya Kapoor (RPIHM-FAC-012)
        {
          id: "proto-fac-001",
          staffId: "RPIHM-FAC-012",
          fullName: "Chef Vikramaditya Kapoor",
          designation: "Executive Chef Instructor",
          department: "Hospitality & Culinary Arts",
          category: "Culinary Instructor",
          employmentType: "Full-Time Permanent",
          email: "v.kapoor@sample.rpihm.ac.in",
          phone: "+91 98201 44551",
          status: "In Lab / Kitchen",
          joinedDate: "2018-06-15",
          isSampleRecord: true
        },
        // 2. Conflict Record: Dr. Rajesh V. Nair (RPIHM-FAC-031) with different phone
        {
          id: "proto-fac-002",
          staffId: "RPIHM-FAC-031",
          fullName: "Dr. Rajesh V. Nair",
          designation: "Professor & Head of Department",
          department: "Technology & Computing",
          category: "Professor",
          employmentType: "Full-Time Permanent",
          email: "r.nair@sample.rpihm.ac.in",
          phone: "+91 99999 11111", // Conflicting phone
          status: "Active",
          joinedDate: "2015-08-01",
          isSampleRecord: true
        },
        // 3. Importable Record: Prof. Maya Sen (RPIHM-FAC-777)
        {
          id: "proto-fac-003",
          staffId: "RPIHM-FAC-777",
          fullName: "Prof. Maya Sen",
          designation: "Assistant Professor",
          department: "Hospitality & Culinary Arts",
          category: "Teaching Faculty",
          employmentType: "Full-Time Permanent",
          email: "m.sen@sample.rpihm.ac.in",
          phone: "+91 98200 99887",
          status: "Active",
          joinedDate: "2024-01-10",
          isSampleRecord: true
        }
      ];
      localStorage.setItem("rpihm_faculty_records_v1", JSON.stringify(testFaculty));
    })()`
  });

  await cdp("Page.reload");
  await new Promise(r => setTimeout(r, 4000));

  // Open Faculty Reconciliation Modal
  await cdp("Runtime.evaluate", {
    expression: `(() => {
      const reviewBtn = Array.from(document.querySelectorAll("button")).find(b => b.innerText.includes("Review & Reconcile"));
      if (reviewBtn) reviewBtn.click();
    })()`
  });
  await new Promise(r => setTimeout(r, 1500));

  const facultyModalInspection = await cdp("Runtime.evaluate", {
    expression: `(() => {
      const rows = Array.from(document.querySelectorAll("[role='dialog'] .divide-y > div")).map(div => div.innerText.replace(/\\n/g, " | "));
      const kapoorRow = rows.find(r => r.includes("RPIHM-FAC-012"));
      const nairRow = rows.find(r => r.includes("RPIHM-FAC-031"));
      const mayaRow = rows.find(r => r.includes("RPIHM-FAC-777"));

      return {
        kapoorClassification: kapoorRow ? (kapoorRow.includes("Confirmed Duplicate") ? "DUPLICATE" : (kapoorRow.includes("Conflict") ? "CONFLICT" : "IMPORTABLE")) : "NOT_FOUND",
        kapoorRowText: kapoorRow || "",
        nairClassification: nairRow ? (nairRow.includes("Conflict Requiring Review") ? "CONFLICT" : "OTHER") : "NOT_FOUND",
        nairRowText: nairRow || "",
        mayaClassification: mayaRow ? (mayaRow.includes("New (Ready to Import)") ? "IMPORTABLE" : "OTHER") : "NOT_FOUND",
        mayaRowText: mayaRow || ""
      };
    })()`,
    returnByValue: true
  });
  console.log("Faculty Reconciliation Items Classification:", facultyModalInspection.result.value);

  // Capture screenshot of Faculty Reconciliation Modal
  const facultyScreenshot = await cdp("Page.captureScreenshot", { format: "png" });
  fs.writeFileSync("unit2_faculty_reconciliation.png", Buffer.from(facultyScreenshot.data, "base64"));
  console.log("Saved screenshot: unit2_faculty_reconciliation.png (" + fs.statSync("unit2_faculty_reconciliation.png").size + " bytes)");

  // Prune faculty confirmed duplicates
  await cdp("Runtime.evaluate", {
    expression: `(() => {
      const pruneBtn = Array.from(document.querySelectorAll("[role='dialog'] button")).find(b => b.innerText.includes("Prune Duplicates"));
      if (pruneBtn) pruneBtn.click();
    })()`
  });
  await new Promise(r => setTimeout(r, 800));

  await cdp("Runtime.evaluate", {
    expression: `(() => {
      const confirmBtn = Array.from(document.querySelectorAll("[role='dialog'] button")).find(b => b.innerText.includes("Yes, Safely Prune"));
      if (confirmBtn) confirmBtn.click();
    })()`
  });
  await new Promise(r => setTimeout(r, 1500));

  const facultyStorageAfterPrune = await cdp("Runtime.evaluate", {
    expression: `(() => {
      const remaining = JSON.parse(localStorage.getItem("rpihm_faculty_records_v1") || "[]");
      const kapoorPresent = remaining.some(f => f.staffId === "RPIHM-FAC-012");
      return {
        remainingCount: remaining.length,
        kapoorPresent
      };
    })()`,
    returnByValue: true
  });
  console.log("Faculty storage after pruning:", facultyStorageAfterPrune.result.value);

  // Step 8: Verify SQLite Database Integrity (No Unintended Inserts or Deletions)
  console.log("\n[Step 8] Verifying SQLite Database Record Integrity...");
  const finalStudents = await prisma.student.findMany({ select: { id: true, prn: true, rollNumber: true, email: true, phone: true } });
  const finalStaff = await prisma.staff.findMany({ select: { id: true, employeeId: true, email: true, phone: true } });
  console.log(`Final SQLite counts: Students=${finalStudents.length} (initial was ${initialStudents.length}), Faculty=${finalStaff.length} (initial was ${initialStaff.length})`);

  // Assert exact 1:1 identifier invariance
  const studentIdsMatch = JSON.stringify(initialStudents.map(s => s.id).sort()) === JSON.stringify(finalStudents.map(s => s.id).sort());
  const studentPrnsMatch = JSON.stringify(initialStudents.map(s => s.prn).sort()) === JSON.stringify(finalStudents.map(s => s.prn).sort());
  const staffIdsMatch = JSON.stringify(initialStaff.map(s => s.id).sort()) === JSON.stringify(finalStaff.map(s => s.id).sort());
  const staffEmpMatch = JSON.stringify(initialStaff.map(s => s.employeeId).sort()) === JSON.stringify(finalStaff.map(s => s.employeeId).sort());
  console.log(`Database Integrity Check: Student IDs identical=${studentIdsMatch}, Student PRNs identical=${studentPrnsMatch}`);
  console.log(`Database Integrity Check: Staff IDs identical=${staffIdsMatch}, Employee IDs identical=${staffEmpMatch}`);

  console.log("\n[Step 9] Checking console errors and network failures...");
  console.log("Console errors/warnings count:", consoleErrors.length);
  if (consoleErrors.length > 0) console.log(consoleErrors);
  console.log("Network failures count:", networkErrors.length);
  if (networkErrors.length > 0) console.log(networkErrors);

  ws.close();
  edgeProc.kill();
  await prisma.$disconnect();

  console.log("\n=== Unit 2 Live-Browser Checkpoint Complete ===");
}

testUnit2Browser().then(() => process.exit(0)).catch(e => {
  console.error("Test failed:", e);
  process.exit(1);
});
