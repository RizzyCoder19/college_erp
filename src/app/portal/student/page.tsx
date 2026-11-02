import { Suspense } from "react";
import Link from "next/link";
import { redirect } from "next/navigation";
import { getCurrentUser } from "@/lib/auth/guards";
import { AppShell } from "@/components/layout/AppShell";
import { StudentPortalView } from "@/components/modules/portal/StudentPortalView";
import { getStudentSelfProfile } from "@/lib/actions/portalStudent";
import { Icon } from "@/components/common/Icon";

async function StudentPortalContent() {
  const user = await getCurrentUser();

  // 1. Unauthenticated redirect (HTTP 307)
  if (!user) {
    redirect("/login?redirect=/portal/student");
  }

  // 2. Role enforcement: Strictly STUDENT_VIEWER
  if (user.role !== "STUDENT_VIEWER") {
    return (
      <AppShell>
        <div className="max-w-xl mx-auto my-16 bg-card-comfort rounded-2xl border border-rose-200/80 p-8 shadow-sm text-center">
          <div className="h-14 w-14 rounded-2xl bg-rose-50 text-[#D92534] flex items-center justify-center mx-auto mb-4 border border-rose-100">
            <Icon name="shield-alert" className="h-7 w-7" />
          </div>
          <h1 className="text-xl font-bold text-slate-900">Workspace Access Denied</h1>
          <p className="text-sm text-slate-600 mt-2">
            The Student Self-Service Workspace is reserved strictly for authenticated student accounts.
            Your current role (<strong className="font-semibold">{user.role}</strong>) does not have access.
          </p>
          <div className="mt-6">
            <Link
              href="/"
              className="inline-flex items-center space-x-2 px-4 py-2.5 rounded-lg bg-[#1657D9] text-white text-xs font-semibold hover:bg-blue-700 transition-colors"
            >
              <Icon name="arrow-left" className="h-4 w-4" />
              <span>Return to Dashboard</span>
            </Link>
          </div>
        </div>
      </AppShell>
    );
  }

  // 3. Unlinked student profile check
  if (!user.studentId) {
    return (
      <AppShell>
        <div className="max-w-xl mx-auto my-16 bg-card-comfort rounded-2xl border border-amber-200/80 p-8 shadow-sm text-center">
          <div className="h-14 w-14 rounded-2xl bg-amber-50 text-amber-600 flex items-center justify-center mx-auto mb-4 border border-amber-200">
            <Icon name="exclamation-triangle" className="h-7 w-7" />
          </div>
          <h1 className="text-xl font-bold text-slate-900">Student Profile Not Linked</h1>
          <p className="text-sm text-slate-600 mt-2">
            Your institutional user account (<strong className="font-mono text-xs">{user.email}</strong>) is active,
            but is not currently associated with an official student record in the ERP.
          </p>
          <div className="mt-4 p-4 rounded-xl bg-slate-50 border border-slate-200 text-left text-xs text-slate-600 space-y-1.5">
            <p className="font-semibold text-slate-800">Next Steps for Verification:</p>
            <p>1. Contact the Registrar Office or Academic Administration counter in the Main Campus.</p>
            <p>2. Provide your Permanent Registration Number (PRN) and Admission Reference Number.</p>
            <p>3. Once linked by the Registrar, your student portal workspace will activate automatically.</p>
          </div>
          <div className="mt-6 flex items-center justify-center space-x-3">
            <Link
              href="/login"
              className="px-4 py-2 rounded-lg border border-slate-300 text-xs font-medium text-slate-700 hover:bg-slate-50 transition-colors"
            >
              Sign in with another account
            </Link>
          </div>
        </div>
      </AppShell>
    );
  }

  // 4. Retrieve student self-profile data
  const profileRes = await getStudentSelfProfile();
  if (!profileRes.success || !profileRes.data) {
    return (
      <AppShell>
        <div className="max-w-xl mx-auto my-16 bg-white rounded-2xl border border-rose-200 p-8 shadow-sm text-center">
          <div className="h-14 w-14 rounded-2xl bg-rose-50 text-[#D92534] flex items-center justify-center mx-auto mb-4">
            <Icon name="shield-alert" className="h-7 w-7" />
          </div>
          <h1 className="text-xl font-bold text-slate-900">Unable to Load Student Dossier</h1>
          <p className="text-sm text-slate-600 mt-2">
            {profileRes.error || "A database anomaly prevented retrieving your student profile."}
          </p>
        </div>
      </AppShell>
    );
  }

  return (
    <AppShell>
      <StudentPortalView initialProfile={profileRes.data} />
    </AppShell>
  );
}

export default function StudentPortalPage() {
  return (
    <Suspense
      fallback={
        <div className="min-h-screen bg-[#F4F6F9] flex items-center justify-center text-xs text-slate-500">
          <span className="flex items-center space-x-2">
            <span className="h-2 w-2 rounded-full bg-[#1657D9] animate-pulse"></span>
            <span>Loading Student Portal...</span>
          </span>
        </div>
      }
    >
      <StudentPortalContent />
    </Suspense>
  );
}
