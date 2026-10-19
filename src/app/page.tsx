import { Suspense } from "react";
import { redirect } from "next/navigation";
import { getCurrentUser } from "@/lib/auth/guards";
import { AppShell } from "@/components/layout/AppShell";
import { ExecutiveOverview } from "@/components/dashboard/ExecutiveOverview";
import { ModuleSwitchboard } from "@/components/dashboard/ModuleSwitchboard";

async function AuthenticatedDashboard() {
  const user = await getCurrentUser();
  if (!user) {
    redirect("/login");
  }

  return (
    <AppShell>
      <div className="space-y-8">
        <ExecutiveOverview />
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