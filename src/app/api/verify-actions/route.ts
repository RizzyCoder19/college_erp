import {
  createFeeStructureAction,
  generateStudentInvoiceAction,
  generateBatchInvoicesAction,
  recordFeePaymentAction,
  getStudentFeeLedgerAction,
  getFinanceOverviewAction,
  getDefaulterListAction,
} from "@/lib/actions/fees";
import { NextResponse } from "next/server";
import { getStudentsAction, createStudentAction, deleteStudentAction } from "@/lib/actions/students";
import { getStaffAction, createStaffAction, deleteStaffAction } from "@/lib/actions/faculty";
import { getAcademicYearsAction } from "@/lib/actions/academics";
import type { CreateStudentDTO } from "@/lib/dal/studentRepository";
import type { CreateStaffDTO } from "@/lib/dal/facultyRepository";
import type {
  CreateFeeStructureDTO,
  GenerateInvoiceDTO,
  RecordPaymentDTO,
} from "@/lib/dal/feeRepository";
import { cookies } from "next/headers";
import { createSession, revokeSessionToken, SESSION_COOKIE_NAME } from "@/lib/auth/session";
import prisma from "@/lib/db";

const dummyStudent = {} as unknown as CreateStudentDTO;
const dummyStaff = {} as unknown as CreateStaffDTO;
const dummyFeeStructure = {} as unknown as CreateFeeStructureDTO;
const dummyGenInvoice = {} as unknown as Omit<GenerateInvoiceDTO, "generatedById">;
const dummyBatchInvoice = {} as unknown as { feeStructureId: string; dueDate: Date };
const dummyRecordPayment = {} as unknown as Omit<RecordPaymentDTO, "collectedById">;

import { connection } from "next/server";

// Internal verification route - accessible in development mode only
export async function GET() {
  await connection();
  if (process.env.NODE_ENV === "production") {
    return new NextResponse(null, { status: 404 });
  }

  const boundaryResults: Array<{ name: string; passed: boolean; code?: string; details?: string }> = [];

  // --- 1. Unauthenticated direct invocation of real server actions ---
  // In this request context, no session cookie is present
  const cookieStore = await cookies();
  cookieStore.delete(SESSION_COOKIE_NAME);

  const resStudents = await getStudentsAction();
  boundaryResults.push({
    name: "getStudentsAction() rejects unauthenticated call",
    passed: !resStudents.success && resStudents.code === "UNAUTHORIZED",
    code: resStudents.code,
  });

  const resStaff = await getStaffAction();
  boundaryResults.push({
    name: "getStaffAction() rejects unauthenticated call",
    passed: !resStaff.success && resStaff.code === "UNAUTHORIZED",
    code: resStaff.code,
  });

  const resAcademics = await getAcademicYearsAction();
  boundaryResults.push({
    name: "getAcademicYearsAction() rejects unauthenticated call",
    passed: !resAcademics.success && resAcademics.code === "UNAUTHORIZED",
    code: resAcademics.code,
  });

  const resCreateStudent = await createStudentAction(dummyStudent);
  boundaryResults.push({
    name: "createStudentAction() rejects unauthenticated call",
    passed: !resCreateStudent.success && resCreateStudent.code === "UNAUTHORIZED",
    code: resCreateStudent.code,
  });

  const resDeleteStudent = await deleteStudentAction("nonexistent-id");
  boundaryResults.push({
    name: "deleteStudentAction() rejects unauthenticated call",
    passed: !resDeleteStudent.success && resDeleteStudent.code === "UNAUTHORIZED",
    code: resDeleteStudent.code,
  });

  const resDeleteStaff = await deleteStaffAction("nonexistent-id");
  boundaryResults.push({
    name: "deleteStaffAction() rejects unauthenticated call",
    passed: !resDeleteStaff.success && resDeleteStaff.code === "UNAUTHORIZED",
    code: resDeleteStaff.code,
  });


  // --- 1B. Unauthenticated fee server actions ---
  const resUnauthOverview = await getFinanceOverviewAction();
  boundaryResults.push({
    name: "getFinanceOverviewAction() rejects unauthenticated call",
    passed: !resUnauthOverview.success && resUnauthOverview.code === "UNAUTHORIZED",
    code: resUnauthOverview.code,
  });

  const resUnauthCreateStructure = await createFeeStructureAction(dummyFeeStructure);
  boundaryResults.push({
    name: "createFeeStructureAction() rejects unauthenticated call",
    passed: !resUnauthCreateStructure.success && resUnauthCreateStructure.code === "UNAUTHORIZED",
    code: resUnauthCreateStructure.code,
  });

  const resUnauthGenInvoice = await generateStudentInvoiceAction(dummyGenInvoice);
  boundaryResults.push({
    name: "generateStudentInvoiceAction() rejects unauthenticated call",
    passed: !resUnauthGenInvoice.success && resUnauthGenInvoice.code === "UNAUTHORIZED",
    code: resUnauthGenInvoice.code,
  });

  const resUnauthBatchInvoice = await generateBatchInvoicesAction(dummyBatchInvoice);
  boundaryResults.push({
    name: "generateBatchInvoicesAction() rejects unauthenticated call",
    passed: !resUnauthBatchInvoice.success && resUnauthBatchInvoice.code === "UNAUTHORIZED",
    code: resUnauthBatchInvoice.code,
  });

  const resUnauthRecordPayment = await recordFeePaymentAction(dummyRecordPayment);
  boundaryResults.push({
    name: "recordFeePaymentAction() rejects unauthenticated call",
    passed: !resUnauthRecordPayment.success && resUnauthRecordPayment.code === "UNAUTHORIZED",
    code: resUnauthRecordPayment.code,
  });

  const resUnauthLedger = await getStudentFeeLedgerAction("some-student-id");
  boundaryResults.push({
    name: "getStudentFeeLedgerAction() rejects unauthenticated call",
    passed: !resUnauthLedger.success && resUnauthLedger.code === "UNAUTHORIZED",
    code: resUnauthLedger.code,
  });

  const resUnauthDefaulters = await getDefaulterListAction();
  boundaryResults.push({
    name: "getDefaulterListAction() rejects unauthenticated call",
    passed: !resUnauthDefaulters.success && resUnauthDefaulters.code === "UNAUTHORIZED",
    code: resUnauthDefaulters.code,
  });

  // --- 2. Role-based least privilege boundary enforcement with isolated test user ---
  let testStudentUser: { id: string } | null = null;
  let studentToken: string | null = null;
  try {
    testStudentUser = await prisma.userAccount.create({
      data: {
        email: `boundary.test.student.${Date.now()}@sample.rpihm.ac.in`,
        fullName: "Boundary Test Student",
        passwordHash: "x".repeat(128),
        salt: "y".repeat(32),
        role: "STUDENT_VIEWER",
        isActive: true,
      },
    });

    const sessionRes = await createSession(testStudentUser.id);
    studentToken = sessionRes.token;
    cookieStore.set(SESSION_COOKIE_NAME, studentToken);

    // Authenticated as STUDENT_VIEWER:
    // - READ_STUDENTS should succeed at the guard level
    const studentReadRes = await getStudentsAction();
    boundaryResults.push({
      name: "STUDENT_VIEWER permitted to read students",
      passed: studentReadRes.success === true,
    });

    // - WRITE_STUDENTS should be blocked with FORBIDDEN
    const studentWriteRes = await createStudentAction(dummyStudent);
    boundaryResults.push({
      name: "STUDENT_VIEWER blocked from createStudentAction (FORBIDDEN)",
      passed: !studentWriteRes.success && studentWriteRes.code === "FORBIDDEN",
      code: studentWriteRes.code,
    });

    // - DELETE_STUDENTS should be blocked with FORBIDDEN
    const studentDeleteRes = await deleteStudentAction("test-id");
    boundaryResults.push({
      name: "STUDENT_VIEWER blocked from deleteStudentAction (FORBIDDEN)",
      passed: !studentDeleteRes.success && studentDeleteRes.code === "FORBIDDEN",
      code: studentDeleteRes.code,
    });

    // - WRITE_FACULTY should be blocked with FORBIDDEN
    const studentStaffWriteRes = await createStaffAction(dummyStaff);
    boundaryResults.push({
      name: "STUDENT_VIEWER blocked from createStaffAction (FORBIDDEN)",
      passed: !studentStaffWriteRes.success && studentStaffWriteRes.code === "FORBIDDEN",
      code: studentStaffWriteRes.code,
    });


    // - Fee management & collection blocked for STUDENT_VIEWER
    const studentCreateStruct = await createFeeStructureAction(dummyFeeStructure);
    boundaryResults.push({
      name: "STUDENT_VIEWER blocked from createFeeStructureAction (FORBIDDEN)",
      passed: !studentCreateStruct.success && studentCreateStruct.code === "FORBIDDEN",
      code: studentCreateStruct.code,
    });

    const studentGenInvoice = await generateStudentInvoiceAction(dummyGenInvoice);
    boundaryResults.push({
      name: "STUDENT_VIEWER blocked from generateStudentInvoiceAction (FORBIDDEN)",
      passed: !studentGenInvoice.success && studentGenInvoice.code === "FORBIDDEN",
      code: studentGenInvoice.code,
    });

    const studentRecordPay = await recordFeePaymentAction(dummyRecordPayment);
    boundaryResults.push({
      name: "STUDENT_VIEWER blocked from recordFeePaymentAction (FORBIDDEN)",
      passed: !studentRecordPay.success && studentRecordPay.code === "FORBIDDEN",
      code: studentRecordPay.code,
    });

    const studentDefaulters = await getDefaulterListAction();
    boundaryResults.push({
      name: "STUDENT_VIEWER blocked from getDefaulterListAction (FORBIDDEN)",
      passed: !studentDefaulters.success && studentDefaulters.code === "FORBIDDEN",
      code: studentDefaulters.code,
    });

    // - Student record isolation: Student cannot view another student's ledger
    const crossStudentLedger = await getStudentFeeLedgerAction("target-other-student-id");
    boundaryResults.push({
      name: "STUDENT_VIEWER cannot inspect another student's ledger (UNLINKED_STUDENT or isolated)",
      passed: !crossStudentLedger.success && crossStudentLedger.code === "UNLINKED_STUDENT",
      code: crossStudentLedger.code,
    });

    // - DELETE_FACULTY should be blocked with FORBIDDEN
    const studentStaffDeleteRes = await deleteStaffAction("test-id");
    boundaryResults.push({
      name: "STUDENT_VIEWER blocked from deleteStaffAction (FORBIDDEN)",
      passed: !studentStaffDeleteRes.success && studentStaffDeleteRes.code === "FORBIDDEN",
      code: studentStaffDeleteRes.code,
    });
  } finally {
    // Guaranteed cleanup of test user & session
    if (studentToken) {
      await revokeSessionToken(studentToken);
    }
    if (testStudentUser) {
      await prisma.session.deleteMany({ where: { userId: testStudentUser.id } });
      await prisma.userAccount.delete({ where: { id: testStudentUser.id } });
    }
    cookieStore.delete(SESSION_COOKIE_NAME);
  }


  // --- 3. FACULTY_MEMBER authorization boundary ---
  let testFacultyUser: { id: string } | null = null;
  let facultyToken: string | null = null;
  try {
    testFacultyUser = await prisma.userAccount.create({
      data: {
        email: `boundary.test.faculty.${Date.now()}@sample.rpihm.ac.in`,
        fullName: "Boundary Test Faculty",
        passwordHash: "x".repeat(128),
        salt: "y".repeat(32),
        role: "FACULTY_MEMBER",
        isActive: true,
      },
    });

    const facultySession = await createSession(testFacultyUser.id);
    facultyToken = facultySession.token;
    cookieStore.set(SESSION_COOKIE_NAME, facultyToken);

    const facultyCreateStruct = await createFeeStructureAction(dummyFeeStructure);
    boundaryResults.push({
      name: "FACULTY_MEMBER blocked from createFeeStructureAction (FORBIDDEN)",
      passed: !facultyCreateStruct.success && facultyCreateStruct.code === "FORBIDDEN",
      code: facultyCreateStruct.code,
    });

    const facultyGenInvoice = await generateStudentInvoiceAction(dummyGenInvoice);
    boundaryResults.push({
      name: "FACULTY_MEMBER blocked from generateStudentInvoiceAction (FORBIDDEN)",
      passed: !facultyGenInvoice.success && facultyGenInvoice.code === "FORBIDDEN",
      code: facultyGenInvoice.code,
    });

    const facultyRecordPay = await recordFeePaymentAction(dummyRecordPayment);
    boundaryResults.push({
      name: "FACULTY_MEMBER blocked from recordFeePaymentAction (FORBIDDEN)",
      passed: !facultyRecordPay.success && facultyRecordPay.code === "FORBIDDEN",
      code: facultyRecordPay.code,
    });

    const facultyDefaulters = await getDefaulterListAction();
    boundaryResults.push({
      name: "FACULTY_MEMBER blocked from getDefaulterListAction (FORBIDDEN)",
      passed: !facultyDefaulters.success && facultyDefaulters.code === "FORBIDDEN",
      code: facultyDefaulters.code,
    });
  } finally {
    if (facultyToken) {
      await revokeSessionToken(facultyToken);
    }
    if (testFacultyUser) {
      await prisma.session.deleteMany({ where: { userId: testFacultyUser.id } });
      await prisma.userAccount.delete({ where: { id: testFacultyUser.id } });
    }
    cookieStore.delete(SESSION_COOKIE_NAME);
  }

  return NextResponse.json({
    success: true,
    total: boundaryResults.length,
    passed: boundaryResults.filter((r) => r.passed).length,
    results: boundaryResults,
  });
}