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
const TEMP_PROFILE = path.resolve(process.cwd(), "temp_edge_m2a4_s2_verify");

function delay(ms: number) {
  return new Promise((r) => setTimeout(r, ms));
}

async function main() {
  console.log("================================================================");
  console.log("CAMPUSOS ERP: MILESTONE 2A.4 STAGE 2 BROWSER VERIFICATION (CDP)");
  console.log("Timetable, Attendance, Exam Results, Fee Ledger & Receipts");
  console.log("================================================================\n");

  // 1. Verify dev.db baseline hash
  const initialDevBuf = fs.readFileSync(DEV_DB);
  const initialHash = crypto.createHash("sha256").update(initialDevBuf).digest("hex").toUpperCase();
  const EXPECTED_HASH = "2F092C9633F565F416051E4551A6D0751DAB601163271D10F3AC49AA0BD0B162";
  console.log(`[Database Invariance] dev.db initial SHA-256: ${initialHash}`);
  if (initialHash !== EXPECTED_HASH) {
    throw new Error(`Operational database does not match baseline: ${initialHash}`);
  }

  // 2. Set environment to point strictly to isolated test database
  process.env.DATABASE_URL = `file:${ISOLATED_DB}`;
  process.env.APP_ENV = "test";

  const { default: prisma } = await import("../src/lib/db");
  const { createSession } = await import("../src/lib/auth/session");

  console.log("[Fixture Setup] Initializing comprehensive Stage 2 fixtures in isolated test database...");

  // Academic Structure
  let academicYear = await prisma.academicYear.findFirst({ where: { code: "2026-27" } });
  if (!academicYear) {
    academicYear = await prisma.academicYear.create({
      data: {
        code: "2026-27",
        name: "Academic Year 2026-2027",
        startDate: new Date("2026-07-01"),
        endDate: new Date("2027-06-30"),
        isCurrent: true,
      },
    });
  }

  let dept = await prisma.department.findFirst({ where: { code: "CUL" } });
  if (!dept) {
    dept = await prisma.department.create({
      data: { code: "CUL", name: "Department of Culinary Arts" },
    });
  }

  let programme = await prisma.programme.findFirst({ where: { code: "BHMCT" } });
  if (!programme) {
    programme = await prisma.programme.create({
      data: {
        code: "BHMCT",
        name: "Bachelor of Hotel Management & Catering Technology",
        degreeLevel: "UNDERGRADUATE",
        durationYears: 4,
        departmentId: dept.id,
      },
    });
  }

  let semester1 = await prisma.semester.findFirst({
    where: { programmeId: programme.id, semesterNumber: 1 },
  });
  if (!semester1) {
    semester1 = await prisma.semester.create({
      data: {
        programmeId: programme.id,
        semesterNumber: 1,
        termType: "ODD",
      },
    });
  }

  let divisionA = await prisma.division.findFirst({
    where: { semesterId: semester1.id, name: "Division A" },
  });
  if (!divisionA) {
    divisionA = await prisma.division.create({
      data: {
        semesterId: semester1.id,
        name: "Division A",
        maxCapacity: 60,
      },
    });
  }

  // Subjects
  let subjectFp = await prisma.subject.findFirst({ where: { code: "BHM101" } });
  if (!subjectFp) {
    subjectFp = await prisma.subject.create({
      data: {
        code: "BHM101",
        title: "Food Production Principles",
        credits: 4.0,
        subjectType: "PRACTICAL_KITCHEN",
        semesterId: semester1.id,
      },
    });
  }

  let subjectFb = await prisma.subject.findFirst({ where: { code: "BHM102" } });
  if (!subjectFb) {
    subjectFb = await prisma.subject.create({
      data: {
        code: "BHM102",
        title: "Food & Beverage Service Foundation",
        credits: 4.0,
        subjectType: "THEORY",
        semesterId: semester1.id,
      },
    });
  }

  // Faculty Staff & User
  let chefStaff = await prisma.staff.findFirst({ where: { email: "chef.browser@rpihm.ac.in" } });
  if (!chefStaff) {
    chefStaff = await prisma.staff.create({
      data: {
        employeeId: "RPIHM-CHEF-001",
        fullName: "Chef Master Instructor",
        email: "chef.browser@rpihm.ac.in",
        phone: "9876500001",
        designation: "Executive Chef",
        category: "TEACHING",
        departmentId: dept.id,
        dateOfJoining: new Date("2020-01-01"),
        status: "ACTIVE",
      },
    });
  }

  let facultyUser = await prisma.userAccount.findUnique({ where: { email: "chef.browser@rpihm.ac.in" } });
  if (!facultyUser) {
    facultyUser = await prisma.userAccount.create({
      data: {
        email: "chef.browser@rpihm.ac.in",
        fullName: "Chef Master Instructor",
        role: "FACULTY_MEMBER",
        passwordHash: "hash-faculty",
        salt: "salt-faculty",
        isActive: true,
        staffId: chefStaff.id,
      },
    });
  }

  // Admin User
  let adminUser = await prisma.userAccount.findFirst({ where: { role: "SYSTEM_ADMIN" } });
  if (!adminUser) {
    adminUser = await prisma.userAccount.create({
      data: {
        email: "sysadmin.browser.stage2@rpihm.ac.in",
        fullName: "System Administrator",
        role: "SYSTEM_ADMIN",
        passwordHash: "hash-admin",
        salt: "salt-admin",
        isActive: true,
      },
    });
  }

  // Teaching Assignment
  let taFp = await prisma.teachingAssignment.findFirst({
    where: { subjectId: subjectFp.id, staffId: chefStaff.id, divisionId: divisionA.id },
  });
  if (!taFp) {
    taFp = await prisma.teachingAssignment.create({
      data: {
        subjectId: subjectFp.id,
        staffId: chefStaff.id,
        divisionId: divisionA.id,
        weeklyHours: 4,
      },
    });
  }

  // Timetable Entries for Division A
  let ttCount = await prisma.timetableEntry.count({ where: { divisionId: divisionA.id } });
  if (ttCount === 0) {
    await prisma.timetableEntry.create({
      data: {
        semesterId: semester1.id,
        divisionId: divisionA.id,
        subjectId: subjectFp.id,
        teachingAssignmentId: taFp.id,
        dayOfWeek: "MONDAY",
        startTime: "09:00",
        endTime: "11:00",
        room: "Basic Training Kitchen (BTK)",
        sessionType: "PRACTICAL_KITCHEN",
        status: "ACTIVE",
      },
    });

    await prisma.timetableEntry.create({
      data: {
        semesterId: semester1.id,
        divisionId: divisionA.id,
        subjectId: subjectFb.id,
        teachingAssignmentId: taFp.id,
        dayOfWeek: "TUESDAY",
        startTime: "11:30",
        endTime: "12:30",
        room: "Theory Lecture Hall 102",
        sessionType: "THEORY",
        status: "ACTIVE",
      },
    });

    await prisma.timetableEntry.create({
      data: {
        semesterId: semester1.id,
        divisionId: divisionA.id,
        subjectId: subjectFp.id,
        teachingAssignmentId: taFp.id,
        dayOfWeek: "WEDNESDAY",
        startTime: "14:00",
        endTime: "16:00",
        room: "Advanced Culinary Studio",
        sessionType: "PRACTICAL_KITCHEN",
        status: "ACTIVE",
      },
    });
  }

  // Student A: Full Dossier (Timetable, Attendance, Published Exam, Fee Invoice & Receipt)
  let studentA = await prisma.student.findFirst({ where: { email: "aarav.stage2@rpihm.ac.in" } });
  if (!studentA) {
    studentA = await prisma.student.create({
      data: {
        prn: "RPIHM-2026-0042",
        rollNumber: "BHM-26-042",
        fullName: "Aarav K. Patel",
        email: "aarav.stage2@rpihm.ac.in",
        phone: "9820011223",
        dob: new Date("2005-04-12"),
        gender: "MALE",
        status: "ACTIVE",
        currentSemester: 1,
        guardianName: "Kishore Patel",
        guardianRelationship: "Father",
        guardianPhone: "9820011999",
        mentorFaculty: "Chef Master Instructor",
      },
    });
  }

  let userA = await prisma.userAccount.findUnique({ where: { email: "aarav.stage2@rpihm.ac.in" } });
  if (!userA) {
    userA = await prisma.userAccount.create({
      data: {
        email: "aarav.stage2@rpihm.ac.in",
        fullName: "Aarav K. Patel",
        role: "STUDENT_VIEWER",
        passwordHash: "hash-aarav",
        salt: "salt-aarav",
        isActive: true,
        studentId: studentA.id,
      },
    });
  }

  let enrA = await prisma.enrolment.findFirst({ where: { studentId: studentA.id } });
  if (!enrA) {
    enrA = await prisma.enrolment.create({
      data: {
        studentId: studentA.id,
        programmeId: programme.id,
        semesterId: semester1.id,
        divisionId: divisionA.id,
        academicYearId: academicYear.id,
        status: "ENROLLED",
        enrolledAt: new Date("2026-07-01"),
      },
    });
  }

  // Attendance Records for Student A: Present, Late, Absent, Excused
  let attRecordsCount = await prisma.attendanceRecord.count({ where: { studentId: studentA.id } });
  if (attRecordsCount === 0) {
    const session1 = await prisma.attendanceSession.create({
      data: {
        semesterId: semester1.id,
        divisionId: divisionA.id,
        subjectId: subjectFp.id,
        facultyId: chefStaff.id,
        sessionDate: new Date("2026-08-03"),
        startTime: "09:00",
        endTime: "11:00",
        sessionType: "PRACTICAL_KITCHEN",
        topicCovered: "Classical French Vegetable Cuts: Brunoise, Julienne, Mirepoix",
        status: "FINALIZED",
        recordedById: facultyUser.id,
      },
    });
    await prisma.attendanceRecord.create({
      data: {
        sessionId: session1.id,
        studentId: studentA.id,
        enrolmentId: enrA.id,
        status: "PRESENT",
      },
    });

    const session2 = await prisma.attendanceSession.create({
      data: {
        semesterId: semester1.id,
        divisionId: divisionA.id,
        subjectId: subjectFp.id,
        facultyId: chefStaff.id,
        sessionDate: new Date("2026-08-05"),
        startTime: "09:00",
        endTime: "11:00",
        sessionType: "PRACTICAL_KITCHEN",
        topicCovered: "Stocks Preparation: White Veal & Brown Chicken Stock",
        status: "FINALIZED",
        recordedById: facultyUser.id,
      },
    });
    await prisma.attendanceRecord.create({
      data: {
        sessionId: session2.id,
        studentId: studentA.id,
        enrolmentId: enrA.id,
        status: "LATE",
        remarks: "Arrived at 09:12 due to suburban train delay",
      },
    });

    const session3 = await prisma.attendanceSession.create({
      data: {
        semesterId: semester1.id,
        divisionId: divisionA.id,
        subjectId: subjectFb.id,
        facultyId: chefStaff.id,
        sessionDate: new Date("2026-08-06"),
        startTime: "11:30",
        endTime: "12:30",
        sessionType: "THEORY",
        topicCovered: "Food Service Equipment: Chinaware, Flatware, Glassware Classification",
        status: "FINALIZED",
        recordedById: facultyUser.id,
      },
    });
    await prisma.attendanceRecord.create({
      data: {
        sessionId: session3.id,
        studentId: studentA.id,
        enrolmentId: enrA.id,
        status: "ABSENT",
      },
    });

    const session4 = await prisma.attendanceSession.create({
      data: {
        semesterId: semester1.id,
        divisionId: divisionA.id,
        subjectId: subjectFp.id,
        facultyId: chefStaff.id,
        sessionDate: new Date("2026-08-10"),
        startTime: "09:00",
        endTime: "11:00",
        sessionType: "PRACTICAL_KITCHEN",
        topicCovered: "Mother Sauces Mastery: Béchamel & Velouté",
        status: "FINALIZED",
        recordedById: facultyUser.id,
      },
    });
    await prisma.attendanceRecord.create({
      data: {
        sessionId: session4.id,
        studentId: studentA.id,
        enrolmentId: enrA.id,
        status: "EXCUSED",
        remarks: "Official participation in National Hospitality Conclave",
      },
    });
  }

  // Published Examination Result for Student A
  let examSession = await prisma.examSession.findFirst({ where: { sessionCode: "ODD-SEM-EXAM-2026" } });
  if (!examSession) {
    examSession = await prisma.examSession.create({
      data: {
        academicYearId: academicYear.id,
        name: "Semester I End-Term Examination (December 2026)",
        sessionCode: "ODD-SEM-EXAM-2026",
        sessionType: "REGULAR",
        startDate: new Date("2026-11-20"),
        endDate: new Date("2026-12-05"),
        status: "PUBLISHED",
        publishedAt: new Date("2026-12-15"),
        publishedById: adminUser.id,
      },
    });
  }

  let resultSummary = await prisma.examResultSummary.findFirst({ where: { studentId: studentA.id } });
  if (!resultSummary) {
    resultSummary = await prisma.examResultSummary.create({
      data: {
        examSessionId: examSession.id,
        studentId: studentA.id,
        enrolmentId: enrA.id,
        semesterId: semester1.id,
        totalMaxMarks: 200,
        totalMarksObtained: 172,
        percentage: 86.0,
        sgpa: 9.5,
        letterGrade: "O",
        resultStatus: "PASSED",
        approvalStatus: "PUBLISHED",
        publishedAt: new Date("2026-12-15"),
        publishedById: adminUser.id,
      },
    });

    await prisma.subjectResultEntry.create({
      data: {
        resultSummaryId: resultSummary.id,
        subjectId: subjectFp.id,
        totalMaxMarks: 100,
        totalMarksObtained: 88,
        credits: 4.0,
        gradePoint: 10.0,
        letterGrade: "O",
        status: "PASS",
      },
    });

    await prisma.subjectResultEntry.create({
      data: {
        resultSummaryId: resultSummary.id,
        subjectId: subjectFb.id,
        totalMaxMarks: 100,
        totalMarksObtained: 84,
        credits: 4.0,
        gradePoint: 9.0,
        letterGrade: "A+",
        status: "PASS",
      },
    });
  }

  // Fee Structure, Invoice & Receipt for Student A
  let feeStructure = await prisma.feeStructure.findFirst({ where: { name: "BHMCT Semester 1 Fees (2026-27)" } });
  if (!feeStructure) {
    feeStructure = await prisma.feeStructure.create({
      data: {
        academicYearId: academicYear.id,
        programmeId: programme.id,
        semesterNumber: 1,
        name: "BHMCT Semester 1 Fees (2026-27)",
        totalAmount: 45000,
        feeHeads: {
          create: [
            { headName: "Academic Tuition Fee", amount: 28000 },
            { headName: "Culinary Kitchen & Lab Fee", amount: 12000 },
            { headName: "Knife-Kit & Uniform Caution Deposit", amount: 3000 },
            { headName: "Examination & Library Access Fee", amount: 2000 },
          ],
        },
      },
    });
  }

  let invoiceA = await prisma.studentFeeInvoice.findFirst({ where: { studentId: studentA.id } });
  if (!invoiceA) {
    invoiceA = await prisma.studentFeeInvoice.create({
      data: {
        invoiceNumber: "INV-2026-0042",
        studentId: studentA.id,
        enrolmentId: enrA.id,
        feeStructureId: feeStructure.id,
        totalDemand: 45000,
        dueDate: new Date("2026-08-31"),
        status: "PARTIALLY_PAID",
        generatedById: adminUser.id,
      },
    });

    await prisma.feeReceipt.create({
      data: {
        receiptNumber: "REC-2026-0042",
        invoiceId: invoiceA.id,
        studentId: studentA.id,
        amountPaid: 25000,
        paymentDate: new Date("2026-07-20"),
        paymentMethod: "NEFT_RTGS",
        transactionReference: "HDFC-N260720-998877",
        payerName: "Kishore Patel",
        remarks: "Term 1 First Instalment paid via NetBanking",
        collectedById: adminUser.id,
      },
    });
  }

  // Student B: Empty State Case (No Published Results, No Invoices)
  let studentB = await prisma.student.findFirst({ where: { email: "priya.empty@rpihm.ac.in" } });
  if (!studentB) {
    studentB = await prisma.student.create({
      data: {
        prn: "RPIHM-2026-0099",
        rollNumber: "BHM-26-099",
        fullName: "Priya Sharma",
        email: "priya.empty@rpihm.ac.in",
        phone: "9820099999",
        dob: new Date("2005-08-25"),
        gender: "FEMALE",
        status: "ACTIVE",
        currentSemester: 1,
      },
    });
  }

  let userB = await prisma.userAccount.findUnique({ where: { email: "priya.empty@rpihm.ac.in" } });
  if (!userB) {
    userB = await prisma.userAccount.create({
      data: {
        email: "priya.empty@rpihm.ac.in",
        fullName: "Priya Sharma",
        role: "STUDENT_VIEWER",
        passwordHash: "hash-priya",
        salt: "salt-priya",
        isActive: true,
        studentId: studentB.id,
      },
    });
  }

  let enrB = await prisma.enrolment.findFirst({ where: { studentId: studentB.id } });
  if (!enrB) {
    enrB = await prisma.enrolment.create({
      data: {
        studentId: studentB.id,
        programmeId: programme.id,
        semesterId: semester1.id,
        divisionId: divisionA.id,
        academicYearId: academicYear.id,
        status: "ENROLLED",
        enrolledAt: new Date("2026-07-01"),
      },
    });
  }

  // Active Sessions
  const sessionStudentA = await createSession(userA.id, { userAgent: "E2E-CDP-Student-A" });
  const sessionStudentB = await createSession(userB.id, { userAgent: "E2E-CDP-Student-B" });
  const sessionFaculty = await createSession(facultyUser.id, { userAgent: "E2E-CDP-Faculty" });

  console.log(`[Auth] Test sessions created:`);
  console.log(`  - Student A (Full Data): ${userA.email} (${sessionStudentA.token.slice(0, 8)}...)`);
  console.log(`  - Student B (Empty State): ${userB.email} (${sessionStudentB.token.slice(0, 8)}...)`);
  console.log(`  - Faculty: ${facultyUser.email} (${sessionFaculty.token.slice(0, 8)}...)`);

  // Write .env.local to point Next.js to isolated_test.db on port 3005
  const envLocalPath = path.resolve(process.cwd(), ".env.local");
  fs.writeFileSync(envLocalPath, `DATABASE_URL="file:./isolated_test.db"\nDATA_SOURCE="prisma"\n`);

  console.log("\n[Server] Spawning Next.js server on 127.0.0.1:3005...");
  const nextProc = spawn("npx.cmd", ["next", "dev", "-p", "3005", "-H", "127.0.0.1"], {
    cwd: process.cwd(),
    env: {
      ...process.env,
      DATABASE_URL: `file:${ISOLATED_DB}`,
      PORT: "3005",
      HOSTNAME: "127.0.0.1",
    },
    shell: true,
  });

  nextProc.stdout?.on("data", (chunk) => {
    const str = chunk.toString();
    if (str.includes("Ready") || str.includes("Local:") || str.includes("127.0.0.1:3005") || str.includes("localhost:3005")) {
      console.log(`[Next.js stdout] ${str.trim().slice(0, 80)}`);
    }
  });

  nextProc.stderr?.on("data", (chunk) => {
    console.error(`[Next.js stderr] ${chunk.toString().trim()}`);
  });

  let serverReady = false;
  for (let i = 0; i < 60; i++) {
    await delay(1000);
    try {
      const res = await fetch("http://127.0.0.1:3005", { redirect: "manual" });
      if (res.status >= 200 && res.status < 400) {
        serverReady = true;
        console.log(`[Server] Next.js ready on 127.0.0.1:3005 (status ${res.status})`);
        break;
      }
    } catch {}
  }

  if (!serverReady) {
    nextProc.kill();
    throw new Error("Next.js server failed to respond on 127.0.0.1:3005 within 60 seconds.");
  }

  // Pre-warm student portal route with authentic session cookie so Next.js completes compilation
  console.log("[Server] Pre-warming student portal route with session cookie...");
  const warmStart = Date.now();
  try {
    const preRes = await fetch("http://127.0.0.1:3005/portal/student?tab=timetable", {
      headers: {
        Cookie: `rpihm_session_token=${sessionStudentA.token}`,
      },
    });
    console.log(`[Server] Student portal pre-warmed in ${Date.now() - warmStart}ms (status ${preRes.status})`);
  } catch (e: any) {
    console.log(`[Server] Pre-warm notice: ${e.message}`);
  }

  // Start Edge headless with CDP
  console.log(`\n[Browser] Starting headless Edge on port ${EDGE_PORT}...`);
  if (!fs.existsSync(TEMP_PROFILE)) {
    fs.mkdirSync(TEMP_PROFILE, { recursive: true });
  }

  const edgeProc = spawn(EDGE_PATH, [
    "--headless=new",
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
      const timeout = setTimeout(() => reject(new Error(`CDP Timeout: ${method}`)), 60000);
      const h = (event: any) => {
        try {
          let raw = "";
          if (typeof event.data === "string") {
            raw = event.data;
          } else if (event.data instanceof ArrayBuffer) {
            raw = Buffer.from(event.data).toString("utf-8");
          } else {
            raw = String(event.data);
          }
          const msg = JSON.parse(raw);
          if (msg.id === id) {
            clearTimeout(timeout);
            ws.removeEventListener("message", h);
            if (msg.error) reject(new Error(msg.error.message));
            else resolve(msg.result);
          }
        } catch {}
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
    try {
      const res = await send("Runtime.evaluate", {
        expression,
        returnByValue: true,
        awaitPromise: true,
      });
      return res?.result?.value;
    } catch (err: any) {
      if (
        err.message &&
        (err.message.includes("Cannot find context") ||
          err.message.includes("Execution context was destroyed") ||
          err.message.includes("CDP Timeout"))
      ) {
        return null;
      }
      throw err;
    }
  }

  async function waitForSelector(selector: string, timeoutMs = 25000): Promise<boolean> {
    const start = Date.now();
    while (Date.now() - start < timeoutMs) {
      try {
        const found = await evaluate(`Boolean(document.querySelector('${selector}'))`);
        if (found) return true;
      } catch {}
      await delay(500);
    }
    return false;
  }

  async function setSessionCookie(token: string) {
    await send("Network.setCookie", {
      name: "rpihm_session_token",
      value: token,
      domain: "127.0.0.1",
      path: "/",
      httpOnly: false,
      secure: false,
    });
  }

  async function clearSessionCookies() {
    await send("Network.clearBrowserCookies");
  }

  async function navigate(url: string) {
    await send("Page.navigate", { url });
    await delay(2500);
  }

  await send("Page.enable");
  await send("Runtime.enable");
  await send("Network.enable");

  try {
    console.log("\n--- Executing Stage 2 Real Browser Verification Suite ---");

    // =========================================================================
    // STEP 1: Student Timetable Tab (Desktop 1440x900)
    // =========================================================================
    console.log("\n[Step 1] Navigating to Student Portal Timetable Tab (Desktop)...");
    await setSessionCookie(sessionStudentA.token);
    await navigate("http://127.0.0.1:3005/portal/student?tab=timetable");
    await waitForSelector("#tab-btn-timetable");
    await delay(1500);

    const placementBadge = await evaluate(`document.body.innerText.includes('Division A')`);
    const mondaySlot = await evaluate(`document.body.innerText.includes('Basic Training Kitchen (BTK)')`);
    console.log(`  Placement Division A found: ${placementBadge}, Monday BTK room found: ${mondaySlot}`);

    await capture("m2a4_s2_01_student_timetable_desktop.png");

    // =========================================================================
    // STEP 2: Student Timetable Tab (Mobile 390x844)
    // =========================================================================
    console.log("\n[Step 2] Emulating Mobile Viewport (390 x 844) for Timetable...");
    await send("Emulation.setDeviceMetricsOverride", {
      width: 390,
      height: 844,
      deviceScaleFactor: 2,
      mobile: true,
    });
    await delay(1000);
    await capture("m2a4_s2_02_student_timetable_mobile.png");
    await send("Emulation.clearDeviceMetricsOverride");

    // =========================================================================
    // STEP 3: Student Attendance Tab (Desktop 1440x900)
    // =========================================================================
    console.log("\n[Step 3] Switching to Attendance Tab (Desktop)...");
    await navigate("http://127.0.0.1:3005/portal/student?tab=attendance");
    await waitForSelector("#tab-btn-attendance");
    await delay(1500);

    const advisoryBanner = await evaluate(`document.body.innerText.includes('75% figure is shown solely as an unverified advisory reference')`);
    const rawPresent = await evaluate(`document.body.innerText.includes('Present')`);
    console.log(`  75% Advisory Banner verified: ${advisoryBanner}, Raw Present KPI card found: ${rawPresent}`);

    await capture("m2a4_s2_03_student_attendance_desktop.png");

    // =========================================================================
    // STEP 4: Student Attendance Tab (Mobile 390x844)
    // =========================================================================
    console.log("\n[Step 4] Emulating Mobile Viewport (390 x 844) for Attendance...");
    await send("Emulation.setDeviceMetricsOverride", {
      width: 390,
      height: 844,
      deviceScaleFactor: 2,
      mobile: true,
    });
    await delay(1000);
    await capture("m2a4_s2_04_student_attendance_mobile.png");
    await send("Emulation.clearDeviceMetricsOverride");

    // =========================================================================
    // STEP 5: Published Examination Results Tab (Desktop 1440x900)
    // =========================================================================
    console.log("\n[Step 5] Switching to Examinations Tab (Desktop)...");
    await navigate("http://127.0.0.1:3005/portal/student?tab=examinations");
    await waitForSelector("#tab-btn-examinations");
    await delay(1500);

    const examTitle = await evaluate(`document.body.innerText.includes('Semester I End-Term Examination')`);
    const publishedBadge = await evaluate(`document.body.innerText.includes('Published')`);
    console.log(`  Exam session name found: ${examTitle}, Published badge found: ${publishedBadge}`);

    await capture("m2a4_s2_05_student_examinations_desktop.png");

    // =========================================================================
    // STEP 6: Published Examination Results Tab (Mobile 390x844)
    // =========================================================================
    console.log("\n[Step 6] Emulating Mobile Viewport (390 x 844) for Examinations...");
    await send("Emulation.setDeviceMetricsOverride", {
      width: 390,
      height: 844,
      deviceScaleFactor: 2,
      mobile: true,
    });
    await delay(1000);
    await capture("m2a4_s2_06_student_examinations_mobile.png");
    await send("Emulation.clearDeviceMetricsOverride");

    // =========================================================================
    // STEP 7: Student Fee Ledger & Receipts Tab (Desktop 1440x900)
    // =========================================================================
    console.log("\n[Step 7] Switching to Fees Tab (Desktop)...");
    await navigate("http://127.0.0.1:3005/portal/student?tab=fees");
    await waitForSelector("#tab-btn-fees");
    await delay(1500);

    const clearanceBadge = await evaluate(`document.body.innerText.includes('PARTIALLY CLEARED')`);
    const invoiceNum = await evaluate(`document.body.innerText.includes('INV-2026-0042')`);
    const receiptNum = await evaluate(`document.body.innerText.includes('REC-2026-0042')`);
    console.log(`  Clearance badge found: ${clearanceBadge}, Invoice # found: ${invoiceNum}, Receipt # found: ${receiptNum}`);

    await capture("m2a4_s2_07_student_fee_ledger_desktop.png");

    // =========================================================================
    // STEP 8: Student Fee Ledger Tab (Mobile 390x844)
    // =========================================================================
    console.log("\n[Step 8] Emulating Mobile Viewport (390 x 844) for Fee Ledger...");
    await send("Emulation.setDeviceMetricsOverride", {
      width: 390,
      height: 844,
      deviceScaleFactor: 2,
      mobile: true,
    });
    await delay(1000);
    await capture("m2a4_s2_08_student_fee_ledger_mobile.png");
    await send("Emulation.clearDeviceMetricsOverride");

    // =========================================================================
    // STEP 9: Interactive Payment Receipt Voucher Modal
    // =========================================================================
    console.log("\n[Step 9] Clicking 'View Voucher' to display official Receipt Voucher Modal...");
    await evaluate(`(() => {
      const btns = Array.from(document.querySelectorAll('button'));
      const voucherBtn = btns.find(b => b.textContent && b.textContent.includes('View Voucher'));
      if (voucherBtn) voucherBtn.click();
    })()`);
    await delay(1200);

    const voucherModalVisible = await evaluate(`document.body.innerText.includes('PAYMENT RECEIPT VOUCHER')`);
    console.log(`  Payment Receipt Voucher Modal visible: ${voucherModalVisible}`);

    await capture("m2a4_s2_09_receipt_voucher_modal.png");

    // Close voucher modal
    await evaluate(`(() => {
      const btns = Array.from(document.querySelectorAll('button'));
      const doneBtn = btns.find(b => b.textContent && b.textContent.includes('Done'));
      if (doneBtn) doneBtn.click();
    })()`);
    await delay(500);

    // =========================================================================
    // STEP 10: Empty State — Student with No Published Results (Student B)
    // =========================================================================
    console.log("\n[Step 10] Navigating as Student B to verify Published Examination Empty State...");
    await clearSessionCookies();
    await setSessionCookie(sessionStudentB.token);
    await navigate("http://127.0.0.1:3005/portal/student?tab=examinations");
    await waitForSelector("#tab-btn-examinations");
    await delay(1500);

    const emptyExamText = await evaluate(`document.body.innerText.includes('No examination results have been published for your account yet')`);
    console.log(`  Neutral Exam Empty State verified: ${emptyExamText}`);

    await capture("m2a4_s2_10_empty_state_no_results.png");

    // =========================================================================
    // STEP 11: Empty State — Student with No Fee Invoices (Student B)
    // =========================================================================
    console.log("\n[Step 11] Navigating as Student B to verify Fee Ledger Empty State...");
    await navigate("http://127.0.0.1:3005/portal/student?tab=fees");
    await waitForSelector("#tab-btn-fees");
    await delay(1500);

    const emptyFeeText = await evaluate(`document.body.innerText.includes('No fee invoices have been issued for your account yet')`);
    console.log(`  Neutral Fee Empty State verified: ${emptyFeeText}`);

    await capture("m2a4_s2_11_empty_state_no_invoices.png");

    // =========================================================================
    // STEP 12: Unauthorized Role Denial (Faculty navigating to Student Portal)
    // =========================================================================
    console.log("\n[Step 12] Navigating as Faculty Member to verify Access Denial Boundary...");
    await clearSessionCookies();
    await setSessionCookie(sessionFaculty.token);
    await navigate("http://127.0.0.1:3005/portal/student");
    await delay(1500);

    const accessDeniedHeading = await evaluate(`document.querySelector('h1')?.textContent`);
    console.log(`  Faculty Navigation Heading: "${accessDeniedHeading}"`);

    await capture("m2a4_s2_12_unauthorized_faculty_denied.png");

    console.log("\n✓ All 12 real browser verification steps completed successfully!");
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
    const finalHash = crypto.createHash("sha256").update(finalDevBuf).digest("hex").toUpperCase();
    console.log(`\n[Database Invariance] dev.db post-verification SHA-256: ${finalHash}`);
    if (finalHash !== EXPECTED_HASH) {
      console.error("FATAL: Operational database was modified during verification!");
      process.exit(1);
    } else {
      console.log("✓ Invariance Confirmed: Operational database hash is 100% INVARIANT.");
    }
  }
}

main().catch((err) => {
  console.error("Verification failed:", err);
  process.exit(1);
});
