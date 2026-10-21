import { Suspense } from "react";
import { AnimatedLampLogin } from "@/components/auth/AnimatedLampLogin";

export const metadata = {
  title: "Sign In | RPIHM CampusOS ERP",
  description: "Secure institutional sign-in for R. P. Institute of Hospitality & Management, Vasai",
};

export default function LoginPage() {
  return (
    <Suspense
      fallback={
        <div className="min-h-screen bg-[#08090c] flex items-center justify-center text-slate-400 text-xs font-mono">
          Loading CampusOS Secure Sign In...
        </div>
      }
    >
      <AnimatedLampLogin />
    </Suspense>
  );
}
