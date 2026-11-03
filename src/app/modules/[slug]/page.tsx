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

import { AccessDeniedView } from "@/components/auth/AccessDeniedView";

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
      <AccessDeniedView
        userRole={user.role}
        workspaceName={`Administrative Module: ${slug.toUpperCase()}`}
        title="ACCESS RESTRICTED"
        subtitle={`The ${slug} administrative module is restricted.`}
        description={`Your current institutional role (${user.role}) does not have administrative permissions for this operational module.`}
      />
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
