import { Suspense } from "react";
import { notFound, redirect } from "next/navigation";
import { connection } from "next/server";
import type { Metadata } from "next";
import Link from "next/link";
import { getCurrentUser } from "@/lib/auth/guards";
import { hasModuleAccess } from "@/lib/auth/roles";
import { AppShell } from "@/components/layout/AppShell";
import { ModulePlaceholder } from "@/components/modules/ModulePlaceholder";
import { MODULES_LIST } from "@/data/mockData";
import { Icon } from "@/components/common/Icon";

interface PageProps {
  params: Promise<{
    slug: string;
  }>;
}

export async function generateMetadata({ params }: PageProps): Promise<Metadata> {
  const { slug } = await params;
  const moduleData = MODULES_LIST.find((m) => m.slug === slug);

  if (!moduleData) {
    return {
      title: "Module Not Found | RPIHM CampusOS",
    };
  }

  return {
    title: moduleData.title + " | RPIHM CampusOS ERP",
    description: moduleData.description,
  };
}

function AccessDeniedView({ slug, role }: { slug: string; role: string }) {
  return (
    <div className="flex min-h-[400px] flex-col items-center justify-center rounded-2xl border border-red-200 bg-red-50/40 p-8 text-center shadow-xs">
      <div className="flex h-12 w-12 items-center justify-center rounded-full bg-red-100 text-red-600 mb-4">
        <Icon name="shield-alert" className="h-6 w-6" />
      </div>
      <h2 className="text-lg font-bold text-slate-900">Access Restricted</h2>
      <p className="mt-1 max-w-md text-xs text-slate-600">
        Your assigned role (<span className="font-semibold text-slate-900">{role}</span>) does not possess the institutional permissions required to access the <span className="font-semibold text-slate-900 capitalize">{slug}</span> module.
      </p>
      <div className="mt-6 flex items-center space-x-3">
        <Link
          href="/"
          className="inline-flex items-center space-x-2 rounded-xl bg-[#1657D9] px-4 py-2 text-xs font-semibold text-white shadow-xs hover:bg-[#1246ad] transition-colors"
        >
          <Icon name="arrow-left" className="h-3.5 w-3.5" />
          <span>Return to Dashboard</span>
        </Link>
      </div>
    </div>
  );
}

async function AuthenticatedModule({ params }: PageProps) {
  await connection();
  const { slug } = await params;

  // 1. Establish authentication first
  const user = await getCurrentUser();
  if (!user) {
    redirect("/login");
  }

  // 2. Establish authorization BEFORE protected module data is retrieved or rendered
  const isAuthorized = hasModuleAccess(user.role, slug);
  if (!isAuthorized) {
    return (
      <AppShell>
        <AccessDeniedView slug={slug} role={user.role} />
      </AppShell>
    );
  }

  // 3. Only after authorization is confirmed, retrieve module record
  const moduleData = MODULES_LIST.find((m) => m.slug === slug);
  if (!moduleData) {
    notFound();
  }

  return (
    <AppShell>
      <ModulePlaceholder module={moduleData} />
    </AppShell>
  );
}

export default function ModulePage(props: PageProps) {
  return (
    <Suspense
      fallback={
        <div className="flex h-64 items-center justify-center rounded-2xl border border-slate-200 bg-white p-8 text-xs text-slate-500 shadow-xs">
          <span className="flex items-center space-x-2">
            <span className="h-2 w-2 rounded-full bg-[#1657D9] animate-pulse"></span>
            <span className="text-slate-600 font-medium">Loading RPIHM module console...</span>
          </span>
        </div>
      }
    >
      <AuthenticatedModule {...props} />
    </Suspense>
  );
}
