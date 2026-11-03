"use client";

import React from "react";
import Link from "next/link";
import Image from "next/image";
import { Icon } from "@/components/common/Icon";

export interface AccessDeniedViewProps {
  title?: string;
  subtitle?: string;
  description?: string;
  userRole?: string;
  requiredRole?: string;
  workspaceName?: string;
  customReturnPath?: string;
  customReturnLabel?: string;
}

export const AccessDeniedView: React.FC<AccessDeniedViewProps> = ({
  title = "ACCESS RESTRICTED",
  subtitle = "This workspace is not available to your account.",
  description = "Your current institutional role does not authorize access to this area.",
  userRole,
  workspaceName,
  customReturnPath,
  customReturnLabel,
}) => {
  // Determine appropriate return destination based on role
  let returnPath = "/";
  let returnLabel = "Return to Dashboard";

  if (customReturnPath && customReturnLabel) {
    returnPath = customReturnPath;
    returnLabel = customReturnLabel;
  } else if (userRole === "STUDENT_VIEWER") {
    returnPath = "/portal/student";
    returnLabel = "Return to Student Portal";
  } else if (userRole === "FACULTY_MEMBER") {
    returnPath = "/portal/faculty";
    returnLabel = "Return to Faculty Workspace";
  } else if (userRole === "SYSTEM_ADMIN" || userRole === "ACADEMIC_ADMIN") {
    returnPath = "/";
    returnLabel = "Return to Administrative Console";
  }

  return (
    <div className="min-h-screen w-full bg-[#051A2C] text-white flex flex-col justify-between selection:bg-[#1657D9] selection:text-white relative overflow-hidden font-sans">
      {/* Background Ambience & Grid */}
      <div className="absolute inset-0 bg-[radial-gradient(ellipse_at_top,_var(--tw-gradient-stops))] from-[#0A2E4D] via-[#051A2C] to-[#03101C] z-0"></div>
      <div className="absolute inset-0 bg-[linear-gradient(to_right,#0F365615_1px,transparent_1px),linear-gradient(to_bottom,#0F365615_1px,transparent_1px)] bg-[size:4rem_4rem] [mask-image:radial-gradient(ellipse_60%_50%_at_50%_40%,#000_70%,transparent_100%)] z-0"></div>

      {/* Institutional TopBar */}
      <header className="w-full border-b border-[#133C5B] bg-[#062135]/90 backdrop-blur-md px-4 sm:px-8 py-3.5 flex items-center justify-between z-20 shadow-md">
        <div className="flex items-center space-x-3 sm:space-x-4">
          <div className="relative w-10 h-10 sm:w-11 sm:h-11 rounded-lg overflow-hidden shrink-0 border border-[#1E5279] bg-[#07243A] p-0.5 shadow-sm">
            <Image
              src="/images/rpihm-crest.png"
              alt="RPIHM Institutional Crest"
              fill
              sizes="44px"
              className="object-contain p-1"
              priority
            />
          </div>
          <div>
            <div className="flex items-center space-x-2">
              <span className="font-extrabold text-white text-sm sm:text-base tracking-tight leading-tight">
                RPIHM CampusOS
              </span>
              <span className="hidden sm:inline-block px-1.5 py-0.5 text-[10px] font-bold uppercase rounded bg-[#0E3554] text-[#67B1E0] border border-[#1B4D75]">
                ERP Core
              </span>
            </div>
            <p className="text-[11px] sm:text-xs text-[#8BB2D1] leading-tight truncate">
              R. P. Institute of Hospitality & Management • University of Mumbai
            </p>
          </div>
        </div>

        <div className="flex items-center space-x-3 text-xs">
          <span className="hidden md:inline-flex items-center space-x-1.5 px-3 py-1 rounded-full bg-[#092B45] border border-[#194C74] text-[#8BB2D1]">
            <span className="h-1.5 w-1.5 rounded-full bg-[#D92534] animate-pulse"></span>
            <span>Security Perimeter Active</span>
          </span>
          <Link
            href="/login"
            className="px-3.5 py-1.5 rounded-lg border border-[#1B4D75] text-[#A6CCE8] hover:text-white hover:bg-[#0E3554] transition-colors text-xs font-medium"
          >
            Sign Out
          </Link>
        </div>
      </header>

      {/* Main Content Area */}
      <main className="relative z-10 flex-1 flex items-center justify-center px-4 sm:px-6 lg:px-8 py-10 sm:py-16">
        <div className="max-w-3xl w-full mx-auto">
          {/* Status Badge */}
          <div className="inline-flex items-center space-x-2 px-3.5 py-1.5 rounded-full bg-rose-500/10 border border-rose-500/30 text-rose-300 text-xs font-semibold mb-6 shadow-sm">
            <Icon name="shield-alert" className="h-4 w-4 text-[#D92534]" />
            <span className="tracking-wider uppercase font-bold text-[11px]">
              Security Protocol 403 • Restricted Zone
            </span>
          </div>

          {/* Heading */}
          <h1 className="text-3xl sm:text-4xl lg:text-5xl font-black text-white tracking-tight leading-tight mb-4">
            {title}
          </h1>

          {/* Subtitle */}
          <p className="text-lg sm:text-xl font-medium text-[#C8E0F4] leading-snug mb-3">
            {subtitle}
          </p>

          {/* Detailed Context */}
          <p className="text-sm sm:text-base text-[#8BB2D1] leading-relaxed mb-8 max-w-2xl font-normal">
            {description}
            {workspaceName && (
              <span className="block mt-2 text-xs text-[#6B9CBF]">
                Target Area: <strong className="text-white font-semibold">{workspaceName}</strong>
              </span>
            )}
          </p>

          {/* Interactive Navigation Actions */}
          <div className="flex flex-wrap items-center gap-3.5 pt-2">
            <Link
              href={returnPath}
              className="inline-flex items-center space-x-2 px-6 py-3 rounded-xl bg-[#1657D9] hover:bg-[#1248B8] text-white text-sm font-bold shadow-lg shadow-[#1657D9]/25 hover:shadow-[#1657D9]/40 transition-all cursor-pointer"
            >
              <Icon name="arrow-left" className="h-4 w-4" />
              <span>{returnLabel}</span>
            </Link>

            <Link
              href="/login"
              className="inline-flex items-center space-x-2 px-5 py-3 rounded-xl bg-[#0D2F47] hover:bg-[#133F5E] text-[#BEE0F8] text-sm font-semibold border border-[#1F547D] transition-all cursor-pointer"
            >
              <Icon name="arrow-right-on-rectangle" className="h-4 w-4 text-[#67B1E0]" />
              <span>Sign In with Different Account</span>
            </Link>
          </div>

          {/* College Campus Context Card */}
          <div className="relative overflow-hidden mt-10 p-4 rounded-2xl bg-[#07243A]/90 border border-[#164468] shadow-xl flex items-center space-x-4 group hover:border-[#67B1E0]/50 transition-all">
            <div className="absolute inset-0 z-0 overflow-hidden pointer-events-none">
              <Image
                src="/images/campus-illuminated-sign.png"
                alt=""
                fill
                sizes="500px"
                className="object-cover opacity-20 transition-transform duration-700 ease-out group-hover:scale-110"
              />
              <div className="absolute inset-0 bg-[#07243A]/80 backdrop-blur-[1px]"></div>
            </div>

            <div className="relative z-10 w-20 h-20 sm:w-24 sm:h-24 rounded-xl overflow-hidden shrink-0 border border-[#1F537A] shadow-md">
              <Image
                src="/images/campus-walkway.png"
                alt="R.P. Institute of Hospitality & Management Campus Corridor"
                fill
                sizes="96px"
                className="object-cover object-center transition-transform duration-700 ease-out group-hover:scale-105"
                priority
              />
            </div>
            <div className="relative z-10 min-w-0 flex-1">
              <span className="text-[10px] font-bold text-[#67B1E0] uppercase tracking-wider block">
                Institutional Access Policy
              </span>
              <p className="text-xs sm:text-sm font-semibold text-white leading-tight mt-0.5 truncate">
                R. P. Institute of Hospitality & Management • Vasai (West)
              </p>
              <p className="text-[11px] sm:text-xs text-[#8BB2D1] leading-normal mt-1">
                Access to student dossiers, faculty gradebooks, and registrar administration is strictly partitioned by role-based credentials under institutional academic governance.
              </p>
            </div>
          </div>
        </div>
      </main>

      {/* Institutional Footer */}
      <footer className="w-full border-t border-[#133C5B] bg-[#062135] px-4 sm:px-8 py-3.5 flex flex-col sm:flex-row items-center justify-between text-xs text-[#7BA6C5] gap-2 z-20">
        <div className="flex items-center space-x-2">
          <span>R. P. Institute of Hospitality & Management, Vasai (West)</span>
          <span className="hidden sm:inline">•</span>
          <span className="hidden sm:inline">Approved by Govt. of Maharashtra</span>
        </div>
        <div className="text-center sm:text-right">
          <span>CampusOS ERP • Academic Session 2026 – 27</span>
        </div>
      </footer>
    </div>
  );
};
