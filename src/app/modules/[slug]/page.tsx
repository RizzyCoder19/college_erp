import { Suspense } from "react";
import { notFound } from "next/navigation";
import type { Metadata } from "next";
import { AppShell } from "@/components/layout/AppShell";
import { ModulePlaceholder } from "@/components/modules/ModulePlaceholder";
import { MODULES_LIST } from "@/data/mockData";

interface PageProps {
  params: Promise<{
    slug: string;
  }>;
}

export async function generateStaticParams() {
  return MODULES_LIST.map((m) => ({
    slug: m.slug,
  }));
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
    title: `${moduleData.title} | RPIHM CampusOS ERP`,
    description: moduleData.description,
  };
}

async function ModuleContent({ params }: PageProps) {
  const { slug } = await params;
  const moduleData = MODULES_LIST.find((m) => m.slug === slug);

  if (!moduleData) {
    notFound();
  }

  return <ModulePlaceholder module={moduleData} />;
}

export default function ModulePage(props: PageProps) {
  return (
    <AppShell>
      <Suspense
        fallback={
          <div className="flex h-64 items-center justify-center rounded-2xl border border-slate-200 bg-white p-8 text-xs text-slate-500 shadow-xs dark:border-slate-800 dark:bg-slate-900">
            <span className="flex items-center space-x-2">
              <span className="h-2 w-2 rounded-full bg-amber-500 animate-pulse"></span>
              <span>Loading RPIHM module console...</span>
            </span>
          </div>
        }
      >
        <ModuleContent {...props} />
      </Suspense>
    </AppShell>
  );
}
