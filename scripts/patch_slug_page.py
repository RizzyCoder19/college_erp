code = '''import { Suspense } from \"react\";
import { notFound, redirect } from \"next/navigation\";
import type { Metadata } from \"next\";
import { getCurrentUser } from \"@/lib/auth/guards\";
import { AppShell } from \"@/components/layout/AppShell\";
import { ModulePlaceholder } from \"@/components/modules/ModulePlaceholder\";
import { MODULES_LIST } from \"@/data/mockData\";

export const dynamic = \"force-dynamic\";

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
      title: \"Module Not Found | RPIHM CampusOS\",
    };
  }

  return {
    title: ${moduleData.title} | RPIHM CampusOS ERP,
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

async function AuthenticatedModule(props: PageProps) {
  const user = await getCurrentUser();
  if (!user) {
    redirect(\"/login\");
  }

  return (
    <AppShell>
      <ModuleContent {...props} />
    </AppShell>
  );
}

export default function ModulePage(props: PageProps) {
  return (
    <Suspense
      fallback={
        <div className=\"flex h-64 items-center justify-center rounded-2xl border border-slate-200 bg-white p-8 text-xs text-slate-500 shadow-xs\">
          <span className=\"flex items-center space-x-2\">
            <span className=\"h-2 w-2 rounded-full bg-[#1657D9] animate-pulse\"></span>
            <span className=\"text-slate-600 font-medium\">Loading RPIHM module console...</span>
          </span>
        </div>
      }
    >
      <AuthenticatedModule {...props} />
    </Suspense>
  );
}
'''
with open('src/app/modules/[slug]/page.tsx', 'w', encoding='utf-8') as f:
    f.write(code)
print('Updated src/app/modules/[slug]/page.tsx with force-dynamic and removed generateStaticParams')
