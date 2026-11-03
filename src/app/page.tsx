import { Suspense } from "react";
import { redirect } from "next/navigation";
import prisma from "@/lib/db";
import { getCurrentUser } from "@/lib/auth/guards";
import { AppShell } from "@/components/layout/AppShell";
import { ExecutiveOverview } from "@/components/dashboard/ExecutiveOverview";
import { ModuleSwitchboard } from "@/components/dashboard/ModuleSwitchboard";

import { StudentRepository } from "@/lib/dal/studentRepository";

async function AuthenticatedDashboard() {
  const user = await getCurrentUser();
  if (!user) {
    redirect("/login");
  }

  // Automatic redirect to role-specific workspace for students
  if (user.role === "STUDENT_VIEWER") {
    redirect("/portal/student");
  }

  // Automatic redirect to role-specific workspace for faculty
  if (user.role === "FACULTY_MEMBER") {
    redirect("/portal/faculty");
  }

  const [studentCount, staffCount, programmeCount, divisionCount, anomaliesRes] = await Promise.all([
    prisma.student.count(),
    prisma.staff.count(),
    prisma.programme.count(),
    prisma.division.count(),
    StudentRepository.diagnoseEnrolmentIntegrity(),
  ]);

  const anomalies = anomaliesRes.success && anomaliesRes.data?.anomalies ? anomaliesRes.data.anomalies : [];

  return (
    <AppShell>
      <div className="space-y-8">
        <ExecutiveOverview
          initialMetrics={{
            studentCount,
            staffCount,
            programmeCount,
            divisionCount,
          }}
          integrityAnomalies={anomalies}
          currentUser={{
            fullName: user.fullName,
            email: user.email,
            role: user.role,
            designation: user.designation,
          }}
        />
        <ModuleSwitchboard />
      </div>
    </AppShell>
  );
}

export default function Home() {
  return (
    <Suspense
      fallback={
        <div className="min-h-screen bg-[#F4F6F9] flex items-center justify-center text-xs text-slate-500">
          <span className="flex items-center space-x-2">
            <span className="h-2 w-2 rounded-full bg-[#1657D9] animate-pulse"></span>
            <span>Verifying institutional session...</span>
          </span>
        </div>
      }
    >
      <AuthenticatedDashboard />
    </Suspense>
  );
}
