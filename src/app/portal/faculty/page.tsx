import { Suspense } from "react";
import Link from "next/link";
import { redirect } from "next/navigation";
import prisma from "@/lib/db";
import { getCurrentUser } from "@/lib/auth/guards";
import { AppShell } from "@/components/layout/AppShell";
import { FacultyPortalView } from "@/components/modules/portal/FacultyPortalView";
import { getFacultySelfProfile } from "@/lib/actions/portalFaculty";
import { AccessDeniedView } from "@/components/auth/AccessDeniedView";
import { Icon } from "@/components/common/Icon";

async function FacultyPortalContent() {
  const user = await getCurrentUser();

  // 1. Unauthenticated redirect (HTTP 307)
  if (!user) {
    redirect("/login?redirect=/portal/faculty");
  }

  // 2. Role enforcement: Strictly FACULTY_MEMBER
  if (user.role !== "FACULTY_MEMBER") {
    return (
      <AccessDeniedView
        userRole={user.role}
        workspaceName="Faculty Self-Service Workspace"
        title="ACCESS RESTRICTED — Workspace Access Denied"
        subtitle="This workspace is reserved for faculty members."
        description={`Your current institutional role (${user.role}) does not authorize access to the Faculty Self-Service Workspace.`}
      />
    );
  }

  // 3. Unlinked staff profile check
  if (!user.staffId) {
    return (
      <AppShell>
        <div className="max-w-xl mx-auto my-16 bg-white rounded-2xl border border-amber-200/80 p-8 shadow-sm text-center">
          <div className="h-14 w-14 rounded-2xl bg-amber-50 text-amber-600 flex items-center justify-center mx-auto mb-4 border border-amber-200">
            <Icon name="exclamation-triangle" className="h-7 w-7" />
          </div>
          <h1 className="text-xl font-bold text-slate-900">Staff Profile Not Linked</h1>
          <p className="text-sm text-slate-600 mt-2">
            Your institutional user account (<strong className="font-mono text-xs">{user.email}</strong>) is active,
            but is not currently associated with an official faculty staff record in the ERP directory.
          </p>
          <div className="mt-4 p-4 rounded-xl bg-slate-50 border border-slate-200 text-left text-xs text-slate-600 space-y-1.5">
            <p className="font-semibold text-slate-800">Next Steps for Verification:</p>
            <p>1. Contact the Registrar or Human Resources administration counter.</p>
            <p>2. Provide your Institutional Employee ID and Department designation.</p>
            <p>3. Once your account is linked by administration, your faculty portal will activate automatically.</p>
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

  // 4. Inactive staff account check
  const staffRecord = await prisma.staff.findUnique({
    where: { id: user.staffId },
    select: { id: true, status: true, fullName: true },
  });

  if (!staffRecord || staffRecord.status !== "ACTIVE") {
    return (
      <AppShell>
        <div className="max-w-xl mx-auto my-16 bg-white rounded-2xl border border-amber-200/80 p-8 shadow-sm text-center">
          <div className="h-14 w-14 rounded-2xl bg-amber-50 text-amber-600 flex items-center justify-center mx-auto mb-4 border border-amber-200">
            <Icon name="exclamation-triangle" className="h-7 w-7" />
          </div>
          <h1 className="text-xl font-bold text-slate-900">Staff Account Inactive</h1>
          <p className="text-sm text-slate-600 mt-2">
            Your linked faculty profile (<strong className="font-semibold text-slate-800">{staffRecord?.fullName || "Staff Member"}</strong>)
            is currently marked as <strong className="font-semibold text-amber-700">{staffRecord?.status || "INACTIVE"}</strong>.
          </p>
          <p className="text-xs text-slate-500 mt-2">
            Faculty self-service features require an active employment status. Please contact Academic HR if this is an administrative discrepancy.
          </p>
          <div className="mt-6">
            <Link
              href="/login"
              className="px-4 py-2 rounded-lg border border-slate-300 text-xs font-medium text-slate-700 hover:bg-slate-50 transition-colors"
            >
              Sign out / Switch Account
            </Link>
          </div>
        </div>
      </AppShell>
    );
  }

  // 5. Retrieve faculty self-profile data using existing Server Action
  const profileRes = await getFacultySelfProfile();
  if (!profileRes.success || !profileRes.data) {
    return (
      <AppShell>
        <div className="max-w-xl mx-auto my-16 bg-white rounded-2xl border border-rose-200 p-8 shadow-sm text-center">
          <div className="h-14 w-14 rounded-2xl bg-rose-50 text-[#D92534] flex items-center justify-center mx-auto mb-4">
            <Icon name="shield-alert" className="h-7 w-7" />
          </div>
          <h1 className="text-xl font-bold text-slate-900">Unable to Load Faculty Dossier</h1>
          <p className="text-sm text-slate-600 mt-2">
            {profileRes.error || "A database anomaly prevented retrieving your faculty profile."}
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

  return (
    <AppShell>
      <FacultyPortalView initialProfile={profileRes.data} />
    </AppShell>
  );
}

export default function FacultyPortalPage() {
  return (
    <Suspense
      fallback={
        <AppShell>
          <div className="space-y-6 animate-pulse p-4">
            <div className="h-32 bg-slate-200 rounded-2xl w-full" />
            <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
              <div className="h-28 bg-slate-200 rounded-xl" />
              <div className="h-28 bg-slate-200 rounded-xl" />
              <div className="h-28 bg-slate-200 rounded-xl" />
              <div className="h-28 bg-slate-200 rounded-xl" />
            </div>
            <div className="h-64 bg-slate-200 rounded-2xl w-full" />
          </div>
        </AppShell>
      }
    >
      <FacultyPortalContent />
    </Suspense>
  );
}
