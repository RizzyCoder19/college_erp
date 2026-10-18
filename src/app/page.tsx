import { AppShell } from "@/components/layout/AppShell";
import { ExecutiveOverview } from "@/components/dashboard/ExecutiveOverview";
import { ModuleSwitchboard } from "@/components/dashboard/ModuleSwitchboard";

export default function Home() {
  return (
    <AppShell>
      <div className="space-y-8">
        <ExecutiveOverview />
        <ModuleSwitchboard />
      </div>
    </AppShell>
  );
}
