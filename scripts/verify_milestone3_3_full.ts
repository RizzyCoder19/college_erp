import { PrismaClient } from "@prisma/client";
import assert from "assert";
import fs from "fs";
import { spawn } from "child_process";
import { hashPassword, validatePasswordStrength } from "../src/lib/auth/password";
import { hasPermission } from "../src/lib/auth/roles";

const prisma = new PrismaClient();

async function runMilestone33Suite() {
  console.log("================================================================================");
  console.log("   RPIHM CampusOS: Milestone 3.3 Full Verification Suite                       ");
  console.log("================================================================================");

  // 1. Initial Database Baseline Verification
  const initialStudentCount = await prisma.student.count();
  const initialEnrolmentCount = await prisma.enrolment.count();
  const initialStaffCount = await prisma.staff.count();
  const initialProgrammeCount = await prisma.programme.count();
  const initialUserCount = await prisma.userAccount.count();

  console.log("[Initial Database Baseline]");
  console.log(`  - Students:     ${initialStudentCount}`);
  console.log(`  - Enrolments:   ${initialEnrolmentCount}`);
  console.log(`  - Staff:        ${initialStaffCount}`);
  console.log(`  - Programmes:   ${initialProgrammeCount}`);
  console.log(`  - UserAccounts: ${initialUserCount}`);

  // Verify baseline Khushali Sharma state
  const khushaliStaff = await prisma.staff.findFirst({
    where: { fullName: { contains: "khushali" } },
    include: { userAccount: true },
  });
  assert(khushaliStaff !== null, "Khushali Sharma staff record exists");
  assert(khushaliStaff.userAccount === null, "Khushali Sharma has no userAccount in baseline");
  console.log(`  - Baseline Khushali Sharma: ID ${khushaliStaff.id}, Has UserAccount: false`);

  // ---------------------------------------------------------------------------
  // TEST 1: Password Strength & Cryptographic Hashing Logic
  // ---------------------------------------------------------------------------
  console.log("\n--- TEST 1: Password Validation & Scrypt Hashing ---");
  const weakShort = validatePasswordStrength("abc1");
  assert(!weakShort.valid, "Password under 8 characters must fail validation");

  const weakNoNum = validatePasswordStrength("passwordonly");
  assert(!weakNoNum.valid, "Password without numbers must fail validation");

  const strongPw = "CampusOS_2026_Test!";
  const validPw = validatePasswordStrength(strongPw);
  assert(validPw.valid, "Compliant password must pass validation");

  const hashResult1 = hashPassword(strongPw);
  const hashResult2 = hashPassword(strongPw);
  assert.notStrictEqual(hashResult1.salt, hashResult2.salt, "Each password hash must utilize a unique cryptographically random salt");
  assert.notStrictEqual(hashResult1.hash, hashResult2.hash, "Different salts must yield different hashes");
  console.log("  -> TEST 1 STATUS: PASS (Cryptographic security validated)");

  // ---------------------------------------------------------------------------
  // TEST 2: RBAC Matrix & Least Privilege Enforcements
  // ---------------------------------------------------------------------------
  console.log("\n--- TEST 2: Role Authorization Matrix Verification ---");
  assert(!hasPermission("STUDENT_VIEWER", "WRITE_STUDENTS"), "STUDENT_VIEWER cannot WRITE_STUDENTS");
  assert(!hasPermission("STUDENT_VIEWER", "ADMIN_ALL"), "STUDENT_VIEWER cannot ADMIN_ALL");

  assert(!hasPermission("FACULTY_MEMBER", "WRITE_STUDENTS"), "FACULTY_MEMBER cannot WRITE_STUDENTS");
  assert(!hasPermission("FACULTY_MEMBER", "WRITE_FACULTY"), "FACULTY_MEMBER cannot WRITE_FACULTY");
  assert(!hasPermission("FACULTY_MEMBER", "ADMIN_ALL"), "FACULTY_MEMBER cannot ADMIN_ALL");

  assert(hasPermission("ACADEMIC_ADMIN", "WRITE_STUDENTS"), "ACADEMIC_ADMIN can WRITE_STUDENTS");
  assert(hasPermission("ACADEMIC_ADMIN", "WRITE_FACULTY"), "ACADEMIC_ADMIN can WRITE_FACULTY");
  assert(hasPermission("ACADEMIC_ADMIN", "MANAGE_ACADEMICS"), "ACADEMIC_ADMIN can MANAGE_ACADEMICS");
  assert(!hasPermission("ACADEMIC_ADMIN", "DELETE_STUDENTS"), "ACADEMIC_ADMIN cannot DELETE_STUDENTS (Least Privilege)");
  assert(!hasPermission("ACADEMIC_ADMIN", "ADMIN_ALL"), "ACADEMIC_ADMIN cannot ADMIN_ALL (Least Privilege)");

  assert(hasPermission("SYSTEM_ADMIN", "ADMIN_ALL"), "SYSTEM_ADMIN holds ADMIN_ALL");
  console.log("  -> TEST 2 STATUS: PASS (Least privilege strictly defined)");

  // ---------------------------------------------------------------------------
  // TEST 3: Safe Account Provisioning Validation & Database Invariants
  // ---------------------------------------------------------------------------
  console.log("\n--- TEST 3: Safe Provisioning Workflow with Isolated Test Staff ---");
  const culinaryDept = await prisma.department.findFirst();
  assert(culinaryDept !== null, "Department exists");

  // Clean any residual test records first
  await prisma.session.deleteMany({ where: { user: { email: { contains: "joshi" } } } });
  await prisma.userAccount.deleteMany({ where: { email: { contains: "joshi" } } });
  await prisma.staff.deleteMany({ where: { email: { contains: "joshi" } } });

  // Create isolated test staff member
  const testStaff = await prisma.staff.create({
    data: {
      employeeId: "RPIHM-FAC-TST",
      fullName: "Dr. Ananya Joshi (Test HOD)",
      email: "a.joshi.test@sample.rpihm.ac.in",
      phone: "+91 98200 99999",
      designation: "Associate Professor & Acting HOD",
      category: "TEACHING",
      departmentId: culinaryDept.id,
      dateOfJoining: new Date("2023-06-01"),
      status: "ACTIVE",
    },
  });
  console.log(`  - Created isolated test staff record: ${testStaff.fullName} (${testStaff.employeeId})`);

  // Provision user account for test staff with ACADEMIC_ADMIN role
  const testInitialPw = "AnanyaAcademic_2026!";
  const { hash: tHash, salt: tSalt } = hashPassword(testInitialPw);

  const testUser = await prisma.userAccount.create({
    data: {
      email: testStaff.email,
      fullName: testStaff.fullName,
      role: "ACADEMIC_ADMIN",
      passwordHash: tHash,
      salt: tSalt,
      staffId: testStaff.id,
      isActive: true,
    },
  });
  console.log(`  - Provisioned UserAccount for ${testUser.fullName} with role ${testUser.role}`);

  // Test duplicate prevention: Email
  let duplicateEmailCaught = false;
  try {
    await prisma.userAccount.create({
      data: {
        email: testStaff.email,
        fullName: "Duplicate User",
        role: "FACULTY_MEMBER",
        passwordHash: tHash,
        salt: tSalt,
      },
    });
  } catch {
    duplicateEmailCaught = true;
  }
  assert(duplicateEmailCaught, "Prisma unique constraint must reject duplicate user account emails");
  console.log("  - Duplicate email constraint enforced: PASS");

  // Test duplicate prevention: StaffId Link
  let duplicateStaffLinkCaught = false;
  try {
    await prisma.userAccount.create({
      data: {
        email: "another.unique@sample.rpihm.ac.in",
        fullName: "Another User",
        role: "FACULTY_MEMBER",
        passwordHash: tHash,
        salt: tSalt,
        staffId: testStaff.id,
      },
    });
  } catch {
    duplicateStaffLinkCaught = true;
  }
  assert(duplicateStaffLinkCaught, "Prisma unique constraint must reject duplicate staff account linkages");
  console.log("  - Duplicate staffId association constraint enforced: PASS");
  console.log("  -> TEST 3 STATUS: PASS (Safe provisioning boundaries verified)");

  // ---------------------------------------------------------------------------
  // TEST 4 & 5: Live Browser Verification with Edge CDP
  // ---------------------------------------------------------------------------
  console.log("\n[Launching Microsoft Edge CDP for Live Browser Verification]");
  const edgePath = "C:\\Program Files (x86)\\Microsoft\\Edge\\Application\\msedge.exe";
  const edgePort = 9450;
  const tempProfileDir = "G:\\rpihm-campusos\\temp_edge_m3_3";

  const edgeProc = spawn(edgePath, [
    "--headless",
    `--remote-debugging-port=${edgePort}`,
    `--user-data-dir=${tempProfileDir}`,
    "--disable-gpu",
    "--no-sandbox",
    "--window-size=1440,900",
  ]);

  for (let i = 0; i < 25; i++) {
    await new Promise((r) => setTimeout(r, 400));
    try {
      await fetch(`http://localhost:${edgePort}/json/version`);
      break;
    } catch {}
  }

  const tab = await (await fetch(`http://localhost:${edgePort}/json/new`, { method: "PUT" })).json();
  const ws = new WebSocket(tab.webSocketDebuggerUrl);
  await new Promise((r) => ws.addEventListener("open", r));

  function cdp(method: string, params: any = {}): Promise<any> {
    return new Promise((res, rej) => {
      const id = Math.floor(Math.random() * 1e6);
      const h = (e: any) => {
        const m = JSON.parse(e.data);
        if (m.id === id) {
          ws.removeEventListener("message", h);
          m.error ? rej(m.error) : res(m.result);
        }
      };
      ws.addEventListener("message", h);
      ws.send(JSON.stringify({ id, method, params }));
    });
  }

  await cdp("Page.enable");
  await cdp("Runtime.enable");
  await cdp("Network.enable");

  async function takeScreenshot(fileName: string) {
    const res = await cdp("Page.captureScreenshot", { format: "png" });
    const buffer = Buffer.from(res.data, "base64");
    fs.writeFileSync(`G:\\rpihm-campusos\\${fileName}`, buffer);
    console.log(`  [Screenshot] Saved: ${fileName}`);
  }

  // --- Step 4.1: Log in as the Newly Provisioned ACADEMIC_ADMIN ---
  console.log("\n--- TEST 4: Authenticating as Provisioned ACADEMIC_ADMIN ---");
  await cdp("Network.clearBrowserCookies");
  await cdp("Page.navigate", { url: "http://localhost:3000/login" });
  await new Promise((r) => setTimeout(r, 2500));

  await cdp("Runtime.evaluate", { returnByValue: true,
    expression: `(() => {
      const setV = (el, val) => {
        if (!el) return;
        Object.getOwnPropertyDescriptor(window.HTMLInputElement.prototype, "value").set.call(el, val);
        el.dispatchEvent(new Event("input", { bubbles: true }));
        el.dispatchEvent(new Event("change", { bubbles: true }));
      };
      setV(document.getElementById("login-email"), ${JSON.stringify(testStaff.email)});
      setV(document.getElementById("login-password"), ${JSON.stringify(testInitialPw)});
      const submitBtn = document.getElementById("login-submit-button");
      if (submitBtn) submitBtn.click();
    })()`,
  });
  await new Promise((r) => setTimeout(r, 2500));
  await cdp("Page.navigate", { url: "http://localhost:3000/" });
  await new Promise((r) => setTimeout(r, 2500));

  // Verify Dashboard Identity Display
  const dashboardIdentity = await cdp("Runtime.evaluate", { returnByValue: true,
    expression: `(() => {
      const text = document.body.innerText;
      return {
        hasAnanyaName: text.includes("Dr. Ananya Joshi"),
        hasAcademicAdminRole: text.includes("Academic Admin"),
        hasDesignation: text.includes("Associate Professor & Acting HOD"),
        topBarText: document.querySelector("header")?.innerText || "",
      };
    })()`,
  });

  const identityRes = dashboardIdentity.result.value;
  console.log("  - Authenticated Identity Reflection:", identityRes);
  assert(identityRes.hasAnanyaName, "Dashboard must display authenticated user name 'Dr. Ananya Joshi'");
  assert(identityRes.hasAcademicAdminRole, "Dashboard must display assigned role 'Academic Admin'");
  assert(identityRes.topBarText.includes("DA") || identityRes.topBarText.includes("AJ"), "TopBar must display dynamic initials derived from name");
  assert(!identityRes.topBarText.includes("KS"), "TopBar must NOT display hardcoded prototype initials 'KS'");

  await takeScreenshot("milestone3_3_identity_aware_dashboard.png");

  // Open Profile Modal and check details
  await cdp("Runtime.evaluate", { returnByValue: true,
    expression: `(() => {
      const profileBtn = document.querySelector("button[aria-label='Open profile modal']");
      if (profileBtn) profileBtn.click();
    })()`,
  });
  await new Promise((r) => setTimeout(r, 1500));

  const profileModalContent = await cdp("Runtime.evaluate", { returnByValue: true,
    expression: `(() => {
      const modal = document.querySelector(".fixed.inset-0.z-50");
      return modal ? modal.innerText : "";
    })()`,
  });
  const pmText = profileModalContent.result.value;
  assert(pmText.includes("Dr. Ananya Joshi"), "Profile modal must display authenticated full name");
  assert(pmText.includes("a.joshi.test@sample.rpihm.ac.in"), "Profile modal must display authenticated email");
  assert(pmText.includes("ACADEMIC_ADMIN"), "Profile modal must display active role authority");
  await takeScreenshot("milestone3_3_profile_modal_live.png");

  // Close profile modal
  await cdp("Runtime.evaluate", { returnByValue: true,
    expression: `(() => {
      const closeBtn = Array.from(document.querySelectorAll("button")).find(b => b.innerText === "Close");
      if (closeBtn) closeBtn.click();
    })()`,
  });
  await new Promise((r) => setTimeout(r, 1000));
  console.log("  -> TEST 4 STATUS: PASS (Identity-aware dashboard and profile verified)");

  // --- Step 4.2: Verify ACADEMIC_ADMIN Save Capability on Students ---
  console.log("\n--- TEST 5: Verify ACADEMIC_ADMIN Record Editing & Persistence ---");
  await cdp("Page.navigate", { url: "http://localhost:3000/modules/students" });
  await new Promise((r) => setTimeout(r, 2500));

  const rohanBefore = await prisma.student.findFirst({ where: { prn: "2025IT112" } });
  assert(rohanBefore !== null, "Rohan Verma exists");

  console.log("  - ACADEMIC_ADMIN editing Rohan K. Verma phone to '+91 97180 54321'...");
  await cdp("Runtime.evaluate", { returnByValue: true,
    expression: `(() => {
      const rows = Array.from(document.querySelectorAll("table tbody tr"));
      const rRow = rows.find(r => r.innerText.includes("Rohan K. Verma"));
      if (rRow) {
        const editBtn = rRow.querySelector("button[title='Edit Record']");
        if (editBtn) editBtn.click();
      }
    })()`,
  });
  await new Promise((r) => setTimeout(r, 1500));

  await cdp("Runtime.evaluate", { returnByValue: true,
    expression: `(() => {
      const modal = document.querySelector(".fixed.inset-0.z-50");
      if (!modal) return;
      const phoneInput = Array.from(modal.querySelectorAll("input")).find(i => i.placeholder.includes("98000") || i.type === "tel");
      if (phoneInput) {
        Object.getOwnPropertyDescriptor(window.HTMLInputElement.prototype, "value").set.call(phoneInput, "+91 97180 54321");
        phoneInput.dispatchEvent(new Event("input", { bubbles: true }));
        phoneInput.dispatchEvent(new Event("change", { bubbles: true }));
      }
      const saveBtn = Array.from(modal.querySelectorAll("button")).find(b => b.innerText.includes("Save"));
      if (saveBtn) saveBtn.click();
    })()`,
  });
  await new Promise((r) => setTimeout(r, 2500));

  // Reload page and check DB
  await cdp("Page.navigate", { url: "http://localhost:3000/modules/students" });
  await new Promise((r) => setTimeout(r, 2000));

  const rohanAfter = await prisma.student.findFirst({ where: { prn: "2025IT112" } });
  assert.strictEqual(rohanAfter?.phone, "+91 97180 54321", "Phone edit by ACADEMIC_ADMIN must persist in database");
  console.log("  - Phone persisted in DB successfully under ACADEMIC_ADMIN session.");

  // Revert Rohan phone
  await prisma.student.update({
    where: { id: rohanBefore.id },
    data: { phone: rohanBefore.phone },
  });

  // Verify ACADEMIC_ADMIN cannot see or execute account provisioning
  await cdp("Page.navigate", { url: "http://localhost:3000/modules/faculty" });
  await new Promise((r) => setTimeout(r, 2500));

  const academicAdminFacultyView = await cdp("Runtime.evaluate", { returnByValue: true,
    expression: `(() => {
      const text = document.body.innerText;
      return {
        hasProvisionTopBtn: Array.from(document.querySelectorAll("button")).some(b => b.innerText.includes("Provision Account")),
        hasEditBtn: document.querySelectorAll("button[title='Edit Record']").length > 0,
        hasDeleteBtn: document.querySelectorAll("button[title='Delete Record']").length > 0,
      };
    })()`,
  });
  const aafvRes = academicAdminFacultyView.result.value;
  console.log("  - ACADEMIC_ADMIN Faculty Controls:", aafvRes);
  assert(!aafvRes.hasProvisionTopBtn, "ACADEMIC_ADMIN must NOT see 'Provision Account' button (Least privilege enforced)");
  assert(aafvRes.hasEditBtn, "ACADEMIC_ADMIN can edit faculty records");
  assert(!aafvRes.hasDeleteBtn, "ACADEMIC_ADMIN cannot delete faculty records");
  console.log("  -> TEST 5 STATUS: PASS (ACADEMIC_ADMIN permissions properly gated)");

  // --- Step 4.3: Switch to SYSTEM_ADMIN and inspect Khushali Sharma Row & Provisioning Modal ---
  console.log("\n--- TEST 6: System Admin Faculty Directory & Khushali Sharma Modal Inspection ---");
  await cdp("Network.clearBrowserCookies");
  await cdp("Page.navigate", { url: "http://localhost:3000/login" });
  await new Promise((r) => setTimeout(r, 2500));

  const adminCreds = JSON.parse(fs.readFileSync("G:\\rpihm-campusos\\dev-admin-credentials.json", "utf-8"));
  await cdp("Runtime.evaluate", { returnByValue: true,
    expression: `(() => {
      const setV = (el, val) => {
        if (!el) return;
        Object.getOwnPropertyDescriptor(window.HTMLInputElement.prototype, "value").set.call(el, val);
        el.dispatchEvent(new Event("input", { bubbles: true }));
        el.dispatchEvent(new Event("change", { bubbles: true }));
      };
      setV(document.getElementById("login-email"), ${JSON.stringify(adminCreds.email)});
      setV(document.getElementById("login-password"), ${JSON.stringify(adminCreds.password)});
      const submitBtn = document.getElementById("login-submit-button");
      if (submitBtn) submitBtn.click();
    })()`,
  });
  await new Promise((r) => setTimeout(r, 2500));
  await cdp("Page.navigate", { url: "http://localhost:3000/modules/faculty" });
  await new Promise((r) => setTimeout(r, 2500));

  // Verify Khushali Sharma row and Test Staff row
  const facultyRowsCheck = await cdp("Runtime.evaluate", { returnByValue: true,
    expression: `(() => {
      const rows = Array.from(document.querySelectorAll("table tbody tr"));
      const khushaliRow = rows.find(r => r.innerText.includes("khushali sharma"));
      const ananyaRow = rows.find(r => r.innerText.includes("Dr. Ananya Joshi"));
      return {
        hasProvisionTopBtn: Array.from(document.querySelectorAll("button")).some(b => b.innerText.includes("Provision Account")),
        khushaliHasKeyBtn: khushaliRow ? Boolean(khushaliRow.querySelector("button[title='Provision User Account']")) : false,
        khushaliNoAccountBadge: khushaliRow ? khushaliRow.innerText.includes("No Login Account") : false,
        ananyaHasAccountBadge: ananyaRow ? ananyaRow.innerText.includes("HOD / Academic Admin") : false,
      };
    })()`,
  });

  const frCheck = facultyRowsCheck.result.value;
  console.log("  - SYSTEM_ADMIN Faculty Directory State:", frCheck);
  assert(frCheck.hasProvisionTopBtn, "SYSTEM_ADMIN must see 'Provision Account' button in header");
  assert(frCheck.khushaliHasKeyBtn, "Khushali Sharma row must have 'Provision User Account' key action");
  assert(frCheck.khushaliNoAccountBadge, "Khushali Sharma row must display 'No Login Account' badge");
  assert(frCheck.ananyaHasAccountBadge, "Dr. Ananya Joshi row must display 'HOD / Academic Admin' badge");

  await takeScreenshot("milestone3_3_faculty_directory_roles.png");

  // Click Provision User Account on Khushali Sharma row
  await cdp("Runtime.evaluate", { returnByValue: true,
    expression: `(() => {
      const rows = Array.from(document.querySelectorAll("table tbody tr"));
      const khushaliRow = rows.find(r => r.innerText.includes("khushali sharma"));
      if (khushaliRow) {
        const keyBtn = khushaliRow.querySelector("button[title='Provision User Account']");
        if (keyBtn) keyBtn.click();
      }
    })()`,
  });
  await new Promise((r) => setTimeout(r, 1500));

  const modalState = await cdp("Runtime.evaluate", { returnByValue: true,
    expression: `(() => {
      const modal = document.querySelector(".fixed.inset-0.z-50");
      if (!modal) return null;
      return {
        title: modal.querySelector("h3")?.innerText || "",
        emailValue: modal.querySelector("input[type='email']")?.value || "",
        hasKhushaliSummary: modal.innerText.includes("khushali sharma"),
        hasAcademicAdminOption: modal.innerText.includes("Academic Administrator"),
      };
    })()`,
  });
  const mState = modalState.result.value;
  console.log("  - Provision Modal State for Khushali Sharma:", mState);
  assert(mState !== null, "Provision modal must open");
  assert(mState.hasKhushaliSummary, "Provision modal must summarize Khushali Sharma's staff profile");
  assert.strictEqual(mState.emailValue, "k.sharma@sample.rpihm.ac.in", "Modal must pre-fill Khushali's institutional email");
  assert(mState.hasAcademicAdminOption, "Modal must offer ACADEMIC_ADMIN role option");

  await takeScreenshot("milestone3_3_provision_modal_hod.png");

  // Close modal without submitting so real Khushali record remains unmutated
  await cdp("Runtime.evaluate", { returnByValue: true,
    expression: `(() => {
      const cancelBtn = Array.from(document.querySelectorAll("button")).find(b => b.innerText === "Cancel");
      if (cancelBtn) cancelBtn.click();
    })()`,
  });
  await new Promise((r) => setTimeout(r, 1000));
  console.log("  -> TEST 6 STATUS: PASS (Provision modal and row actions verified)");

  // ---------------------------------------------------------------------------
  // CLEANUP & FINAL DATABASE INVARIANTS CHECK
  // ---------------------------------------------------------------------------
  console.log("\n[Clean up isolated test records]");
  // Remove test sessions
  await prisma.session.deleteMany({ where: { userId: testUser.id } });
  // Remove test user account
  await prisma.userAccount.delete({ where: { id: testUser.id } });
  // Remove test staff member
  await prisma.staff.delete({ where: { id: testStaff.id } });
  console.log("  - Cleaned up isolated test staff and user records.");

  console.log("\n[Final Database Invariants Verification]");
  const finalStudentCount = await prisma.student.count();
  const finalEnrolmentCount = await prisma.enrolment.count();
  const finalStaffCount = await prisma.staff.count();
  const finalProgrammeCount = await prisma.programme.count();
  const finalUserCount = await prisma.userAccount.count();

  console.log(`  - Students:     final=${finalStudentCount}, baseline=${initialStudentCount}`);
  console.log(`  - Enrolments:   final=${finalEnrolmentCount}, baseline=${initialEnrolmentCount}`);
  console.log(`  - Staff:        final=${finalStaffCount}, baseline=${initialStaffCount}`);
  console.log(`  - Programmes:   final=${finalProgrammeCount}, baseline=${initialProgrammeCount}`);
  console.log(`  - UserAccounts: final=${finalUserCount}, baseline=${initialUserCount}`);

  assert.strictEqual(finalStudentCount, initialStudentCount, "Student count must remain invariant");
  assert.strictEqual(finalEnrolmentCount, initialEnrolmentCount, "Enrolment count must remain invariant");
  assert.strictEqual(finalStaffCount, initialStaffCount, "Staff count must remain invariant");
  assert.strictEqual(finalProgrammeCount, initialProgrammeCount, "Programme count must remain invariant");
  assert.strictEqual(finalUserCount, initialUserCount, "UserAccount count must remain invariant");

  console.log("\n>>> ALL MILESTONE 3.3 ACCEPTANCE TESTS PASSED WITH ZERO ERRORS! <<<");

  ws.close();
  edgeProc.kill();
  await prisma.$disconnect();
  try {
    fs.rmSync(tempProfileDir, { recursive: true, force: true });
  } catch {}
  process.exit(0);
}

runMilestone33Suite().catch((err) => {
  console.error("VERIFICATION SUITE FAILED:", err);
  process.exit(1);
});
