import { NextResponse } from "next/server";
import { getStudentsAction, createStudentAction, deleteStudentAction } from "@/lib/actions/students";
import { getStaffAction, createStaffAction, deleteStaffAction } from "@/lib/actions/faculty";
import { getAcademicYearsAction } from "@/lib/actions/academics";
import type { CreateStudentDTO } from "@/lib/dal/studentRepository";
import type { CreateStaffDTO } from "@/lib/dal/facultyRepository";
import { cookies } from "next/headers";
import { createSession, revokeSessionToken, SESSION_COOKIE_NAME } from "@/lib/auth/session";
import prisma from "@/lib/db";

const dummyStudent = {} as unknown as CreateStudentDTO;
const dummyStaff = {} as unknown as CreateStaffDTO;

// Internal verification route - accessible in development mode only
export async function GET() {
  if (process.env.NODE_ENV === "production") {
    return NextResponse.json({ error: "Disabled in production" }, { status: 403 });
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

  // --- 2. Role-based least privilege boundary enforcement with isolated test user ---
  const testStudentUser = await prisma.userAccount.create({
    data: {
      email: `boundary.test.student.${Date.now()}@sample.rpihm.ac.in`,
      fullName: "Boundary Test Student",
      passwordHash: "x".repeat(128),
      salt: "y".repeat(32),
      role: "STUDENT_VIEWER",
      isActive: true,
    },
  });

  const { token: studentToken } = await createSession(testStudentUser.id);
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

  // - DELETE_FACULTY should be blocked with FORBIDDEN
  const studentStaffDeleteRes = await deleteStaffAction("test-id");
  boundaryResults.push({
    name: "STUDENT_VIEWER blocked from deleteStaffAction (FORBIDDEN)",
    passed: !studentStaffDeleteRes.success && studentStaffDeleteRes.code === "FORBIDDEN",
    code: studentStaffDeleteRes.code,
  });

  // Clean up test user & session
  await revokeSessionToken(studentToken);
  await prisma.session.deleteMany({ where: { userId: testStudentUser.id } });
  await prisma.userAccount.delete({ where: { id: testStudentUser.id } });
  cookieStore.delete(SESSION_COOKIE_NAME);

  return NextResponse.json({
    success: true,
    total: boundaryResults.length,
    passed: boundaryResults.filter((r) => r.passed).length,
    results: boundaryResults,
  });
}