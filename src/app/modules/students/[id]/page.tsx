import { Suspense } from "react";
import { redirect } from "next/navigation";
import { connection } from "next/server";
import type { Metadata } from "next";
import { getCurrentUser } from "@/lib/auth/guards";
import { hasModuleAccess } from "@/lib/auth/roles";
import { AppShell } from "@/components/layout/AppShell";
import { StudentDossierView } from "@/components/modules/students/StudentDossierView";

interface PageProps {
  params: Promise<{
    id: string;
  }>;
}

export async function generateMetadata({ params }: PageProps): Promise<Metadata> {
  const { id } = await params;
  return {
    title: `Student Dossier (${id}) | RPIHM CampusOS ERP`,
    description: "Institutional 360° student academic dossier, enrolments, attendance, fees, and examination records.",
  };
}

async function AuthenticatedDossier({ params }: PageProps) {
  await connection();
  const { id } = await params;

  // 1. Establish authentication first
  const user = await getCurrentUser();
  if (!user) {
    redirect("/login");
  }

  // 2. Establish module authorization
  const isAuthorized = hasModuleAccess(user.role, "students");
  if (!isAuthorized) {
    redirect("/modules/students");
  }

  return (
    <AppShell>
      <StudentDossierView studentId={id} />
    </AppShell>
  );
}

export default function StudentDossierPage(props: PageProps) {
  return (
    <Suspense
      fallback={
        <div className="flex h-64 items-center justify-center rounded-2xl border border-slate-200 bg-white p-8 text-xs text-slate-500 shadow-xs">
          <span className="flex items-center space-x-2">
            <span className="h-2 w-2 rounded-full bg-[#1657D9] animate-pulse"></span>
            <span className="text-slate-600 font-medium">Loading Student Dossier...</span>
          </span>
        </div>
      }
    >
      <AuthenticatedDossier {...props} />
    </Suspense>
  );
}
