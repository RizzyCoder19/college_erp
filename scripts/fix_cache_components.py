# 1. Clean src/app/login/page.tsx
with open('src/app/login/page.tsx', 'r', encoding='utf-8') as f:
    c = f.read()
c = c.replace('export const dynamic = "force-dynamic";\n\n', '').replace('export const dynamic = "force-dynamic";\n', '')
with open('src/app/login/page.tsx', 'w', encoding='utf-8') as f:
    f.write(c)

# 2. Clean src/app/page.tsx
with open('src/app/page.tsx', 'r', encoding='utf-8') as f:
    c = f.read()
c = c.replace('export const dynamic = "force-dynamic";\n\n', '').replace('export const dynamic = "force-dynamic";\n', '')
with open('src/app/page.tsx', 'w', encoding='utf-8') as f:
    f.write(c)

# 3. Clean and fix src/app/modules/[slug]/page.tsx
slug_code = '''import { Suspense } from \"react\";
import { notFound, redirect } from \"next/navigation\";
import { connection } from \"next/server\";
import type { Metadata } from \"next\";
import { getCurrentUser } from \"@/lib/auth/guards\";
import { AppShell } from \"@/components/layout/AppShell\";
import { ModulePlaceholder } from \"@/components/modules/ModulePlaceholder\";
import { MODULES_LIST } from \"@/data/mockData\";

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
  await connection();
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
    f.write(slug_code)
print('Fixed dynamic segment config and slug page cleanly')
