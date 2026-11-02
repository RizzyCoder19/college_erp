const { spawn } = require("child_process");
const fs = require("fs");
const assert = require("assert");
const { PrismaClient } = require("@prisma/client");

async function testUnit241LiveBrowser() {
  console.log("=== RPIHM CampusOS: Unit 2.4.1 Comprehensive Live-Browser Verification Suite ===");
  const prisma = new PrismaClient();

  const initialStudents = await prisma.student.findMany({ select: { id: true, prn: true, rollNumber: true, email: true, phone: true } });
  const initialStaff = await prisma.staff.findMany({ select: { id: true, employeeId: true, email: true, phone: true } });
  console.log(`[Baseline] SQLite records: Students=${initialStudents.length}, Faculty=${initialStaff.length}`);

  const edgeProc = spawn("C:\\Program Files (x86)\\Microsoft\\Edge\\Application\\msedge.exe", [
    "--headless", "--remote-debugging-port=9240", "--disable-gpu", "--no-sandbox", "--window-size=1440,900"
  ]);

  for (let i = 0; i < 25; i++) {
    await new Promise(r => setTimeout(r, 400));
    try { await fetch("http://localhost:9240/json/version"); break; } catch(e){}
  }

  const tab = await (await fetch("http://localhost:9240/json/new", { method: "PUT" })).json();
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

  const consoleLogs = [];
  const networkRequests = {};
  const networkErrors = [];

  ws.addEventListener("message", e => {
    const m = JSON.parse(e.data);
    if (m.method === "Runtime.consoleAPICalled") {
      const text = m.params.args.map(a => a.value || a.description || JSON.stringify(a)).join(" ");
      consoleLogs.push({ type: m.params.type, text });
    }
    if (m.method === "Network.requestWillBeSent") {
      networkRequests[m.params.requestId] = {
        url: m.params.request.url,
        method: m.params.request.method,
        type: m.params.type
      };
    }
    if (m.method === "Network.loadingFailed") {
      const req = networkRequests[m.params.requestId] || {};
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

  console.log("\n[Step 1] Authenticating at /login in Microsoft Edge...");
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

  // --- SUB-CHECK 1: Verify successful authoritative refresh renders database records ---
  console.log("\n[Step 2] Verifying Successful Authoritative Refresh Renders Database Records...");
  await cdp("Page.navigate", { url: "http://localhost:3000/modules/students" });
  await new Promise(r => setTimeout(r, 3500));

  const studentRenderCheck = await cdp("Runtime.evaluate", {
    expression: `(() => {
      const rows = document.querySelectorAll("tbody tr");
      const errorBanner = document.querySelector(".bg-red-50");
      const aaravRendered = Array.from(rows).some(r => r.innerText.includes("2026DS041"));
      return {
        renderedRowCount: rows.length,
        hasErrorBanner: !!errorBanner,
        aaravRendered
      };
    })()`,
    returnByValue: true
  });
  console.log("  -> Student Live Render Check:", studentRenderCheck.result.value);
  assert.strictEqual(studentRenderCheck.result.value.renderedRowCount, initialStudents.length, `UI must render exactly ${initialStudents.length} student rows`);
  assert.strictEqual(studentRenderCheck.result.value.hasErrorBanner, false, "Must not have error banner on successful load");
  assert.strictEqual(studentRenderCheck.result.value.aaravRendered, true, "Aarav Sharma (2026DS041) must be rendered in table");

  await cdp("Page.navigate", { url: "http://localhost:3000/modules/faculty" });
  await new Promise(r => setTimeout(r, 3500));

  const facultyRenderCheck = await cdp("Runtime.evaluate", {
    expression: `(() => {
      const rows = document.querySelectorAll("tbody tr");
      const errorBanner = document.querySelector(".bg-red-50");
      return {
        renderedRowCount: rows.length,
        hasErrorBanner: !!errorBanner
      };
    })()`,
    returnByValue: true
  });
  console.log("  -> Faculty Live Render Check:", facultyRenderCheck.result.value);
  assert.strictEqual(facultyRenderCheck.result.value.renderedRowCount, initialStaff.length, `UI must render exactly ${initialStaff.length} faculty rows`);
  assert.strictEqual(facultyRenderCheck.result.value.hasErrorBanner, false, "Must not have error banner on successful load");

  await cdp("Page.navigate", { url: "http://localhost:3000/modules/students" });
  await new Promise(r => setTimeout(r, 3000));

  // --- SUB-CHECK 2: Exercise Actual Compiled Pagination Helper in Browser Context ---
  console.log("\n[Step 3] Exercising Actual Compiled Pagination Helper in Browser Context...");
  const paginationValidationResults = await cdp("Runtime.evaluate", {
    expression: `(async () => {
      const engine = window.__reconciliationEngine;
      if (!engine || !engine.fetchAllAuthoritativePages) {
        return { error: "reconciliationEngine not found on window" };
      }
      const helper = engine.fetchAllAuthoritativePages;

      const r1 = await helper({
        fetchPage: async () => ({ success: false, error: "Simulated Page 1 Network Timeout" }),
        mapper: r => r,
        pageSize: 100
      });

      const r2 = await helper({
        fetchPage: async ({ page }) => {
          if (page === 1) {
            return {
              success: true,
              data: {
                items: Array.from({ length: 100 }, (_, i) => ({ id: i })),
                total: 150,
                totalPages: 2,
                page: 1,
                pageSize: 100
              }
            };
          }
          return { success: false, error: "Simulated Page 2 Gateway Failure" };
        },
        mapper: r => r,
        pageSize: 100
      });

      const r3 = await helper({
        fetchPage: async () => ({
          success: true,
          data: {
            items: Array.from({ length: 90 }, (_, i) => ({ id: i })),
            total: 100,
            totalPages: 1,
            page: 1,
            pageSize: 100
          }
        }),
        mapper: r => r,
        pageSize: 100
      });

      const r4 = await helper({
        fetchPage: async () => ({
          success: true,
          data: {
            items: Array.from({ length: 100 }, (_, i) => ({ id: i })),
            total: 150,
            totalPages: 1,
            page: 1,
            pageSize: 100
          }
        }),
        mapper: r => r,
        pageSize: 100
      });

      return {
        r1_success: r1.success,
        r1_error: r1.error,
        r1_data: r1.data,
        r2_success: r2.success,
        r2_error: r2.error,
        r2_data: r2.data,
        r3_success: r3.success,
        r3_error: r3.error,
        r4_success: r4.success,
        r4_error: r4.error
      };
    })()`,
    returnByValue: true,
    awaitPromise: true
  });
  console.log("  -> Live Pagination Helper Validation Results:", paginationValidationResults.result.value);
  const pvr = paginationValidationResults.result.value;
  assert.strictEqual(pvr.r1_success, false, "Failed page 1 must return success: false");
  assert.strictEqual(pvr.r1_data, undefined, "Failed page 1 must not return partial data");
  assert.strictEqual(pvr.r2_success, false, "Failed page 2 must return success: false");
  assert.strictEqual(pvr.r2_data, undefined, "Failed page 2 must not return partial data");
  assert.strictEqual(pvr.r3_success, false, "Count mismatch must return success: false");
  assert.strictEqual(pvr.r4_success, false, "Inconsistent totalPages must return success: false");

  // --- SUB-CHECK 3: Exercise Student and Faculty Pruning Handlers with Refresh Failing ---
  console.log("\n[Step 4] Exercising Student Pruning with Refresh Failing (Byte-For-Byte Invariant)...");
  
  const studentPrototypes = [
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
    {
      id: "proto-std-002",
      prn: "2025IT112",
      rollNumber: "RPIHM-2026-003",
      fullName: "Rohan K. Verma",
      email: "rohan.verma.25@rpihm.ac.in",
      phone: "+91 99999 88888",
      programmeId: "0535808b-5d2f-44c2-b018-d46d80a247f1",
      programmeName: "B.Sc. Information Technology",
      department: "Technology & Computing",
      semester: 1,
      yearGroup: "FY",
      division: "Div B",
      admissionDate: "15 Jul 2025",
      enrollmentStatus: "Active",
      feeStatus: "Paid",
      attendanceRate: 88.5,
      mentorFaculty: "Prof. Snehal Kulkarni",
      guardianName: "Kamal Verma",
      guardianRelationship: "Father",
      guardianPhone: "+91 98201 22300",
      bloodGroup: "O+",
      dateOfBirth: "2005-11-14",
      isFictionalSample: true
    },
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
      dateOfBirth: "2006-08-20",
      isFictionalSample: true
    }
  ];

  await cdp("Runtime.evaluate", {
    expression: `localStorage.setItem("rpihm_student_records_v1", JSON.stringify(${JSON.stringify(studentPrototypes)}));`
  });

  await cdp("Page.reload");
  await new Promise(r => setTimeout(r, 4000));

  const preFailStudentStorage = await cdp("Runtime.evaluate", {
    expression: `localStorage.getItem("rpihm_student_records_v1")`,
    returnByValue: true
  });
  console.log("  -> Pre-pruning student storage bytes:", preFailStudentStorage.result.value.length);

  await cdp("Runtime.evaluate", {
    expression: `(() => {
      const reviewBtn = Array.from(document.querySelectorAll("button")).find(b => b.innerText.includes("Review & Reconcile"));
      if (reviewBtn) reviewBtn.click();
    })()`
  });
  await new Promise(r => setTimeout(r, 1500));

  await cdp("Runtime.evaluate", {
    expression: `(() => {
      window.__realFetch = window.fetch;
      window.fetch = async (...args) => {
        if (args[1] && args[1].method === "POST") {
          return new Response(JSON.stringify({ error: "Simulated Database Connection Outage" }), {
            status: 500,
            headers: { "Content-Type": "application/json" }
          });
        }
        return window.__realFetch(...args);
      };
    })()`
  });

  console.log("  -> Triggering student pruning under failing refresh...");
  await cdp("Runtime.evaluate", {
    expression: `(() => {
      const pruneBtn = Array.from(document.querySelectorAll("[role='dialog'] button")).find(b => b.innerText.includes("Prune Duplicates"));
      if (pruneBtn) pruneBtn.click();
    })()`
  });
  await new Promise(r => setTimeout(r, 600));

  await cdp("Runtime.evaluate", {
    expression: `(() => {
      const confirmBtn = Array.from(document.querySelectorAll("[role='dialog'] button")).find(b => b.innerText.includes("Yes, Safely Prune"));
      if (confirmBtn) confirmBtn.click();
    })()`
  });
  await new Promise(r => setTimeout(r, 1500));

  const studentFailCheck = await cdp("Runtime.evaluate", {
    expression: `(() => {
      if (window.__realFetch) {
        window.fetch = window.__realFetch;
        delete window.__realFetch;
      }
      const postBytes = localStorage.getItem("rpihm_student_records_v1");
      const toastText = document.querySelector(".fixed.bottom-6")?.innerText || "";
      return {
        toastText,
        isByteForByteEqual: postBytes === ${JSON.stringify(preFailStudentStorage.result.value)},
        postRecordCount: JSON.parse(postBytes || "[]").length
      };
    })()`,
    returnByValue: true
  });
  console.log("  -> Student Pruning Abort Result:", studentFailCheck.result.value);
  assert.strictEqual(studentFailCheck.result.value.isByteForByteEqual, true, "Storage must be 100% byte-for-byte identical after refresh failure");
  assert.strictEqual(studentFailCheck.result.value.postRecordCount, 3, "All 3 prototype records must remain intact");
  assert.ok(studentFailCheck.result.value.toastText.includes("Pruning aborted"), "Toast must display clear pruning aborted notification");

  await cdp("Runtime.evaluate", {
    expression: `(() => {
      const closeBtn = Array.from(document.querySelectorAll("[role='dialog'] button")).find(b => b.innerText === "Close" || b.innerText.includes("Close"));
      if (closeBtn) closeBtn.click();
    })()`
  });
  await new Promise(r => setTimeout(r, 1000));

  console.log("\n[Step 5] Exercising Faculty Pruning with Refresh Failing (Byte-For-Byte Invariant)...");
  await cdp("Page.navigate", { url: "http://localhost:3000/modules/faculty" });
  await new Promise(r => setTimeout(r, 3000));

  const facultyPrototypes = [
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
    {
      id: "proto-fac-002",
      staffId: "RPIHM-FAC-031",
      fullName: "Dr. Rajesh V. Nair",
      designation: "Professor & Head of Department",
      department: "Technology & Computing",
      category: "Professor",
      employmentType: "Full-Time Permanent",
      email: "r.nair@sample.rpihm.ac.in",
      phone: "+91 99999 11111",
      status: "Active",
      joinedDate: "2015-08-01",
      isSampleRecord: true
    }
  ];

  await cdp("Runtime.evaluate", {
    expression: `localStorage.setItem("rpihm_faculty_records_v1", JSON.stringify(${JSON.stringify(facultyPrototypes)}));`
  });

  await cdp("Page.reload");
  await new Promise(r => setTimeout(r, 4000));

  const preFailFacultyStorage = await cdp("Runtime.evaluate", {
    expression: `localStorage.getItem("rpihm_faculty_records_v1")`,
    returnByValue: true
  });

  await cdp("Runtime.evaluate", {
    expression: `(() => {
      const reviewBtn = Array.from(document.querySelectorAll("button")).find(b => b.innerText.includes("Review & Reconcile"));
      if (reviewBtn) reviewBtn.click();
    })()`
  });
  await new Promise(r => setTimeout(r, 1500));

  await cdp("Runtime.evaluate", {
    expression: `(() => {
      window.__realFetch = window.fetch;
      window.fetch = async (...args) => {
        if (args[1] && args[1].method === "POST") {
          return new Response(JSON.stringify({ error: "Simulated Database Connection Outage" }), {
            status: 500,
            headers: { "Content-Type": "application/json" }
          });
        }
        return window.__realFetch(...args);
      };
    })()`
  });

  await cdp("Runtime.evaluate", {
    expression: `(() => {
      const pruneBtn = Array.from(document.querySelectorAll("[role='dialog'] button")).find(b => b.innerText.includes("Prune Duplicates"));
      if (pruneBtn) pruneBtn.click();
    })()`
  });
  await new Promise(r => setTimeout(r, 600));

  await cdp("Runtime.evaluate", {
    expression: `(() => {
      const confirmBtn = Array.from(document.querySelectorAll("[role='dialog'] button")).find(b => b.innerText.includes("Yes, Safely Prune"));
      if (confirmBtn) confirmBtn.click();
    })()`
  });
  await new Promise(r => setTimeout(r, 1500));

  const facultyFailCheck = await cdp("Runtime.evaluate", {
    expression: `(() => {
      if (window.__realFetch) {
        window.fetch = window.__realFetch;
        delete window.__realFetch;
      }
      const postBytes = localStorage.getItem("rpihm_faculty_records_v1");
      const toastText = document.querySelector(".fixed.bottom-6")?.innerText || "";
      return {
        toastText,
        isByteForByteEqual: postBytes === ${JSON.stringify(preFailFacultyStorage.result.value)},
        postRecordCount: JSON.parse(postBytes || "[]").length
      };
    })()`,
    returnByValue: true
  });
  console.log("  -> Faculty Pruning Abort Result:", facultyFailCheck.result.value);
  assert.strictEqual(facultyFailCheck.result.value.isByteForByteEqual, true, "Faculty storage must be 100% byte-for-byte identical after refresh failure");
  assert.strictEqual(facultyFailCheck.result.value.postRecordCount, 2, "All 2 faculty prototype records must remain intact");
  assert.ok(facultyFailCheck.result.value.toastText.includes("Pruning aborted"), "Toast must display clear pruning aborted notification");

  await cdp("Runtime.evaluate", {
    expression: `(() => {
      const closeBtn = Array.from(document.querySelectorAll("[role='dialog'] button")).find(b => b.innerText === "Close" || b.innerText.includes("Close"));
      if (closeBtn) closeBtn.click();
    })()`
  });
  await new Promise(r => setTimeout(r, 1000));

  // --- SUB-CHECK 4: Restore Network and Confirm Safe Pruning & Backup Works ---
  console.log("\n[Step 6] Restoring Healthy Network and Performing Safe Pruning...");
  await cdp("Page.navigate", { url: "http://localhost:3000/modules/students" });
  await new Promise(r => setTimeout(r, 3000));

  await cdp("Runtime.evaluate", {
    expression: `(() => {
      const reviewBtn = Array.from(document.querySelectorAll("button")).find(b => b.innerText.includes("Review & Reconcile"));
      if (reviewBtn) reviewBtn.click();
    })()`
  });
  await new Promise(r => setTimeout(r, 1500));

  await cdp("Runtime.evaluate", {
    expression: `(() => {
      const pruneBtn = Array.from(document.querySelectorAll("[role='dialog'] button")).find(b => b.innerText.includes("Prune Duplicates"));
      if (pruneBtn) pruneBtn.click();
    })()`
  });
  await new Promise(r => setTimeout(r, 600));

  await cdp("Runtime.evaluate", {
    expression: `(() => {
      const confirmBtn = Array.from(document.querySelectorAll("[role='dialog'] button")).find(b => b.innerText.includes("Yes, Safely Prune"));
      if (confirmBtn) confirmBtn.click();
    })()`
  });
  await new Promise(r => setTimeout(r, 2000));

  const postPruneStudentStorage = await cdp("Runtime.evaluate", {
    expression: `(() => {
      const raw = localStorage.getItem("rpihm_student_records_v1");
      const records = JSON.parse(raw || "[]");
      const backupKey = sessionStorage.getItem("last_rpihm_student_records_v1_backup");
      const backupRaw = backupKey ? localStorage.getItem(backupKey) : null;
      return {
        remainingCount: records.length,
        remainingPrns: records.map(r => r.prn),
        aaravPruned: !records.some(r => r.prn === "2026DS041"),
        rohanKept: records.some(r => r.prn === "2025IT112"),
        aditiKept: records.some(r => r.prn === "2026DS999"),
        backupKey,
        backupFoundInLocalStorage: !!backupRaw,
        backupRecordsCount: backupRaw ? JSON.parse(backupRaw).length : 0
      };
    })()`,
    returnByValue: true
  });
  console.log("  -> Post-Prune Student Storage Check:", postPruneStudentStorage.result.value);
  const ppss = postPruneStudentStorage.result.value;
  assert.strictEqual(ppss.remainingCount, 2, "Exactly 2 records must remain after pruning duplicate");
  assert.strictEqual(ppss.aaravPruned, true, "Confirmed duplicate Aarav Sharma must be pruned");
  assert.strictEqual(ppss.rohanKept, true, "Conflict record Rohan Verma must be kept");
  assert.strictEqual(ppss.aditiKept, true, "Importable record Aditi Rao must be kept");
  assert.strictEqual(ppss.backupFoundInLocalStorage, true, "Backup must be verified in localStorage backend");
  assert.strictEqual(ppss.backupRecordsCount, 3, "Backup must contain all 3 original records");

  const prunedScreenshot = await cdp("Page.captureScreenshot", { format: "png" });
  fs.writeFileSync("unit2_student_pruned.png", Buffer.from(prunedScreenshot.data, "base64"));
  console.log("  -> Saved screenshot: unit2_student_pruned.png");

  // --- SUB-CHECK 5: Test Backup-Key Collisions in Actual Storage Backend (localStorage) ---
  console.log("\n[Step 7] Testing Backup-Key Collisions & Collision Exhaustion in localStorage...");
  const collisionTestResult = await cdp("Runtime.evaluate", {
    expression: `(() => {
      const engine = window.__reconciliationEngine;
      const testKey = "collision_test_records_v1";
      const ts = 999999;
      const baseBackup = testKey + "_backup_" + ts;
      
      localStorage.setItem(baseBackup, JSON.stringify({ protected: "BACKUP_ORIGINAL_BASE" }));
      localStorage.setItem(baseBackup + "_1", JSON.stringify({ protected: "BACKUP_ORIGINAL_1" }));
      localStorage.setItem(baseBackup + "_2", JSON.stringify({ protected: "BACKUP_ORIGINAL_2" }));

      const testRecords = [{ id: "c-1", prn: "2026DS041", fullName: "Aarav Sharma" }];
      localStorage.setItem(testKey, JSON.stringify(testRecords));

      const res1 = engine.executeSafePruning({
        storageKey: testKey,
        requestedIds: ["c-1"],
        rawStorageContent: null,
        currentDbRecords: [{ id: "db-1", prn: "2026DS041", fullName: "Aarav Sharma" }],
        evaluator: (p, d) => ({ id: p.id, status: "duplicate", primaryKey: p.prn, name: p.fullName, email: "", secondaryInfo: "", statusReason: "duplicate", rawRecord: p }),
        timestamp: ts
      });

      const chosenKey = res1.backupKey;
      const baseUntouched = JSON.parse(localStorage.getItem(baseBackup) || "{}").protected === "BACKUP_ORIGINAL_BASE";
      const sub1Untouched = JSON.parse(localStorage.getItem(baseBackup + "_1") || "{}").protected === "BACKUP_ORIGINAL_1";
      const sub2Untouched = JSON.parse(localStorage.getItem(baseBackup + "_2") || "{}").protected === "BACKUP_ORIGINAL_2";

      localStorage.removeItem(testKey);

      const exhaustKey = "exhaust_test_records_v1";
      const exhaustTs = 888888;
      const exhaustBase = exhaustKey + "_backup_" + exhaustTs;
      localStorage.setItem(exhaustBase, "EXHAUST_BASE");
      for (let i = 1; i <= 500; i++) {
        localStorage.setItem(exhaustBase + "_" + i, "EXHAUST_" + i);
      }
      const originalExhaustRecords = [{ id: "ex-1", prn: "2026DS041" }];
      localStorage.setItem(exhaustKey, JSON.stringify(originalExhaustRecords));

      const resExhaust = engine.executeSafePruning({
        storageKey: exhaustKey,
        requestedIds: ["ex-1"],
        rawStorageContent: null,
        currentDbRecords: [{ id: "db-1", prn: "2026DS041" }],
        evaluator: (p, d) => ({ id: p.id, status: "duplicate", primaryKey: p.prn, name: p.prn, email: "", secondaryInfo: "", statusReason: "duplicate", rawRecord: p }),
        timestamp: exhaustTs
      });

      const exhaustStorageAfter = localStorage.getItem(exhaustKey);
      const exhaustBaseUntouched = localStorage.getItem(exhaustBase) === "EXHAUST_BASE";
      const exhaust500Untouched = localStorage.getItem(exhaustBase + "_500") === "EXHAUST_500";

      localStorage.removeItem(baseBackup);
      localStorage.removeItem(baseBackup + "_1");
      localStorage.removeItem(baseBackup + "_2");
      localStorage.removeItem(baseBackup + "_3");
      localStorage.removeItem(exhaustKey);
      localStorage.removeItem(exhaustBase);
      for (let i = 1; i <= 500; i++) localStorage.removeItem(exhaustBase + "_" + i);

      return {
        chosenKey,
        baseUntouched,
        sub1Untouched,
        sub2Untouched,
        exhaustSuccess: resExhaust.success,
        exhaustError: resExhaust.error,
        exhaustOriginalIntact: exhaustStorageAfter === JSON.stringify(originalExhaustRecords),
        exhaustBaseUntouched,
        exhaust500Untouched
      };
    })()`,
    returnByValue: true
  });
  console.log("  -> Live Collision & Exhaustion Test Results:", collisionTestResult.result.value);
  const ctr = collisionTestResult.result.value;
  assert.ok(ctr.chosenKey.endsWith("_3"), `Engine must select next available key candidate (_3), got ${ctr.chosenKey}`);
  assert.strictEqual(ctr.baseUntouched, true, "Base backup must not be overwritten");
  assert.strictEqual(ctr.sub1Untouched, true, "Candidate _1 must not be overwritten");
  assert.strictEqual(ctr.sub2Untouched, true, "Candidate _2 must not be overwritten");
  assert.strictEqual(ctr.exhaustSuccess, false, "Exhaustion must return success: false");
  assert.strictEqual(ctr.exhaustOriginalIntact, true, "Original storage must remain 100% intact when collision exhausted");
  assert.strictEqual(ctr.exhaustBaseUntouched, true, "Exhausted base backup must not be overwritten");
  assert.strictEqual(ctr.exhaust500Untouched, true, "Exhausted key 500 must not be overwritten");

  // --- SUB-CHECK 6: Page Reload and Verification of Persisted State ---
  console.log("\n[Step 8] Verifying Reload State Persistence...");
  await cdp("Page.reload");
  await new Promise(r => setTimeout(r, 4000));

  const postReloadCheck = await cdp("Runtime.evaluate", {
    expression: `(() => {
      const raw = localStorage.getItem("rpihm_student_records_v1");
      const records = JSON.parse(raw || "[]");
      const rows = document.querySelectorAll("tbody tr");
      const banner = document.body.innerText.includes("Prototype Browser Records Detected");
      return {
        persistedRecordsCount: records.length,
        aaravStillPruned: !records.some(r => r.prn === "2026DS041"),
        rohanStillPresent: records.some(r => r.prn === "2025IT112"),
        aditiStillPresent: records.some(r => r.prn === "2026DS999"),
        dbRowsCount: rows.length,
        bannerPresent: banner
      };
    })()`,
    returnByValue: true
  });
  console.log("  -> Post-Reload Persistence State:", postReloadCheck.result.value);
  const prc = postReloadCheck.result.value;
  assert.strictEqual(prc.persistedRecordsCount, 2, "Pruned state must persist across reloads (2 records)");
  assert.strictEqual(prc.aaravStillPruned, true, "Pruned duplicate Aarav Sharma must NOT reappear");
  assert.strictEqual(prc.rohanStillPresent, true, "Conflict record Rohan Verma must persist");
  assert.strictEqual(prc.aditiStillPresent, true, "Importable record Aditi Rao must persist");
  assert.strictEqual(prc.dbRowsCount, initialStudents.length, "All live database students must be rendered");

  // --- SUB-CHECK 7: Final SQLite Database Record Invariance ---
  console.log("\n[Step 9] Verifying Absolute SQLite Invariant...");
  const finalStudents = await prisma.student.findMany({ select: { id: true, prn: true, rollNumber: true, email: true, phone: true } });
  const finalStaff = await prisma.staff.findMany({ select: { id: true, employeeId: true, email: true, phone: true } });
  console.log(`  -> Initial counts: Students=${initialStudents.length}, Faculty=${initialStaff.length}`);
  console.log(`  -> Final counts:   Students=${finalStudents.length}, Faculty=${finalStaff.length}`);

  assert.strictEqual(finalStudents.length, initialStudents.length, "Student record count must be 100% invariant");
  assert.strictEqual(finalStaff.length, initialStaff.length, "Faculty record count must be 100% invariant");

  const studentIdsIdentical = JSON.stringify(initialStudents.map(s => s.id).sort()) === JSON.stringify(finalStudents.map(s => s.id).sort());
  const studentPrnsIdentical = JSON.stringify(initialStudents.map(s => s.prn).sort()) === JSON.stringify(finalStudents.map(s => s.prn).sort());
  const staffIdsIdentical = JSON.stringify(initialStaff.map(s => s.id).sort()) === JSON.stringify(finalStaff.map(s => s.id).sort());
  const staffEmpIdentical = JSON.stringify(initialStaff.map(s => s.employeeId).sort()) === JSON.stringify(finalStaff.map(s => s.employeeId).sort());

  assert.strictEqual(studentIdsIdentical, true, "Student IDs must be 100% identical");
  assert.strictEqual(studentPrnsIdentical, true, "Student PRNs must be 100% identical");
  assert.strictEqual(staffIdsIdentical, true, "Staff IDs must be 100% identical");
  assert.strictEqual(staffEmpIdentical, true, "Staff Employee IDs must be 100% identical");
  console.log("  -> Database Invariant Check: ALL 4 IDENTITY CHECKS PASSED (100% Invariant)");

  // --- Diagnostic Inspection: Network Errors & Console Logs ---
  console.log("\n[Step 10] Diagnostic Inspection (Console & Network Errors)...");
  const realErrors = networkErrors.filter(e => !e.canceled);
  const canceledRequests = networkErrors.filter(e => e.canceled);
  console.log(`  -> In-flight navigation canceled requests (net::ERR_ABORTED): ${canceledRequests.length}`);
  console.log(`  -> Real application network failures: ${realErrors.length}`);
  assert.strictEqual(realErrors.length, 0, "There must be zero real network failures on application routes");

  const realConsoleErrors = consoleLogs.filter(l => l.type === "error" && !l.text.includes("Simulated"));
  console.log(`  -> Browser console errors: ${realConsoleErrors.length}`);
  assert.strictEqual(realConsoleErrors.length, 0, "There must be zero uncaught browser console errors");

  ws.close();
  edgeProc.kill();
  await prisma.$disconnect();

  console.log("\n=== Unit 2.4.1 Comprehensive Live-Browser Verification Suite Complete (ALL PASSED) ===");
}

testUnit241LiveBrowser().then(() => process.exit(0)).catch(err => {
  console.error("Live-Browser Verification Failed:", err);
  process.exit(1);
});
