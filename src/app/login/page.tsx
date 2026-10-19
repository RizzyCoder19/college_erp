import { Suspense } from "react";
import { redirect } from "next/navigation";
import Image from "next/image";
import { getCurrentUser } from "@/lib/auth/guards";
import { InstituteCrest } from "@/components/brand/InstituteCrest";
import { LoginForm } from "@/components/auth/LoginForm";

export const metadata = {
  title: "Sign In | RPIHM CampusOS ERP",
  description: "Secure institutional sign-in for R. P. Institute of Hospitality & Management, Vasai",
};

async function AuthGate() {
  const user = await getCurrentUser();
  if (user) {
    redirect("/");
  }
  return <LoginForm />;
}

export default function LoginPage() {
  return (
    <div className="min-h-screen w-full bg-[#0B1528] flex flex-col justify-between relative overflow-hidden text-slate-100">
      {/* Background Accent Gradients */}
      <div className="absolute top-0 right-0 w-[500px] h-[500px] bg-[#1657D9]/10 rounded-full blur-3xl pointer-events-none" />
      <div className="absolute bottom-0 left-0 w-[500px] h-[500px] bg-[#C5A059]/10 rounded-full blur-3xl pointer-events-none" />

      {/* Top Institutional Header */}
      <header className="relative z-10 px-6 py-5 border-b border-[#16243E] bg-[#0B1528]/80 backdrop-blur-md">
        <div className="max-w-7xl mx-auto flex items-center justify-between">
          <div className="flex items-center space-x-3.5">
            <InstituteCrest size={44} />
            <div>
              <h1 className="text-sm font-bold text-white tracking-tight leading-none">
                R. P. Institute of Hospitality & Management
              </h1>
              <p className="text-[11px] text-slate-400 mt-1 leading-none">
                Vasai (West), Palghar • Affiliated to University of Mumbai
              </p>
            </div>
          </div>
          <div className="hidden sm:flex items-center space-x-2 text-[11px] text-slate-400 bg-[#101F38] border border-[#1B2E52] px-3 py-1.5 rounded-full">
            <span className="h-2 w-2 rounded-full bg-emerald-400 animate-pulse"></span>
            <span>CampusOS ERP v0.1.0</span>
          </div>
        </div>
      </header>

      {/* Main Sign-In Card Container */}
      <main className="relative z-10 flex-1 flex items-center justify-center p-4 sm:p-6 my-8">
        <div className="w-full max-w-md bg-white text-slate-900 rounded-3xl shadow-2xl border border-slate-200/80 overflow-hidden">
          {/* Visual Header Strip with Campus Gate Image */}
          <div className="relative h-28 w-full bg-[#0B1528] overflow-hidden">
            <Image
              src="/images/campus-front-gate.jpg"
              alt="RPIHM Campus"
              fill
              priority
              sizes="448px"
              className="object-cover opacity-40 mix-blend-luminosity scale-105"
            />
            <div className="absolute inset-0 bg-gradient-to-t from-black/80 via-black/40 to-transparent" />
            <div className="absolute bottom-3 left-6 right-6 flex items-center justify-between text-white">
              <div>
                <span className="text-[10px] font-bold text-[#E5C378] uppercase tracking-wider block">
                  Institutional Access
                </span>
                <h2 className="text-base font-bold text-white">
                  CampusOS Sign In
                </h2>
              </div>
              <InstituteCrest size={36} />
            </div>
          </div>

          {/* Form Body */}
          <div className="p-6 sm:p-7">
            <Suspense fallback={<div className="py-8 text-center text-xs text-slate-400">Loading sign in...</div>}>
              <AuthGate />
            </Suspense>
          </div>
        </div>
      </main>

      {/* Footer */}
      <footer className="relative z-10 px-6 py-4 border-t border-[#16243E] bg-[#070E1B] text-center text-[11px] text-slate-500">
        <div className="max-w-7xl mx-auto flex flex-col sm:flex-row items-center justify-between gap-2">
          <span>
            © 2026 R. P. Educational Trust. All institutional rights reserved.
          </span>
          <span className="text-slate-400">
            Approved by Govt. of Maharashtra • Directorate of Technical Education
          </span>
        </div>
      </footer>
    </div>
  );
}