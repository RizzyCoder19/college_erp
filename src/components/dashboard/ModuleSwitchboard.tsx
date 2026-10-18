"use client";

import React from "react";
import Link from "next/link";
import { Icon } from "@/components/common/Icon";
import { MODULES_LIST } from "@/data/mockData";

export const ModuleSwitchboard: React.FC = () => {
  // 8 featured modules for the home dashboard grid as shown in reference screenshot
  const featuredModules = [
    MODULES_LIST.find((m) => m.slug === "students"),
    MODULES_LIST.find((m) => m.slug === "academics"),
    MODULES_LIST.find((m) => m.slug === "faculty"),
    MODULES_LIST.find((m) => m.slug === "attendance"),
    MODULES_LIST.find((m) => m.slug === "examinations"),
    MODULES_LIST.find((m) => m.slug === "finance"),
    MODULES_LIST.find((m) => m.slug === "facilities"),
    MODULES_LIST.find((m) => m.slug === "reports"),
  ].filter(Boolean);

  return (
    <section id="switchboard" className="mt-8 space-y-4">
      <div className="flex items-center justify-between pb-2 border-b border-slate-200">
        <div>
          <h2 className="text-xl font-bold tracking-tight text-slate-900 font-serif">
            Explore Modules
          </h2>
          <p className="text-xs text-slate-500 mt-0.5">
            Operational subsystems for both Technology and Hospitality divisions
          </p>
        </div>

        <Link
          href="/modules/academics"
          className="text-xs font-semibold text-[#1657D9] hover:underline flex items-center space-x-1"
        >
          <span>All Modules</span>
          <Icon name="arrow-right" className="h-3.5 w-3.5" />
        </Link>
      </div>

      {/* 2 Rows of 4 Cards matching reference screenshot */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        {featuredModules.map((module) => {
          if (!module) return null;
          return (
            <Link
              key={module.slug}
              href={`/modules/${module.slug}`}
              className="rounded-xl bg-white p-4 border border-slate-200/90 shadow-2xs hover:shadow-md hover:border-[#1657D9]/50 transition-all flex items-center justify-between group"
            >
              <div className="flex items-start space-x-3.5 min-w-0 pr-2">
                <div className="p-2.5 rounded-xl bg-blue-50 text-[#1657D9] border border-blue-100 group-hover:bg-[#1657D9] group-hover:text-white transition-colors shrink-0">
                  <Icon name={module.icon} className="h-5 w-5" />
                </div>
                <div className="min-w-0">
                  <h3 className="text-[14px] font-bold text-slate-900 group-hover:text-[#1657D9] transition-colors truncate">
                    {module.title}
                  </h3>
                  <p className="text-xs text-slate-500 mt-0.5 line-clamp-2 leading-relaxed">
                    {module.description}
                  </p>
                </div>
              </div>

              <Icon
                name="chevron-right"
                className="h-4 w-4 text-slate-400 group-hover:text-[#1657D9] group-hover:translate-x-1 transition-all shrink-0"
              />
            </Link>
          );
        })}
      </div>
    </section>
  );
};
