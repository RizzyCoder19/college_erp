"use client";

import React, { useState } from "react";
import Link from "next/link";
import { Icon } from "@/components/common/Icon";
import { MODULES_LIST } from "@/data/mockData";

export const ModuleSwitchboard: React.FC = () => {
  const [searchFilter, setSearchFilter] = useState("");

  const filtered = MODULES_LIST.filter(
    (m) =>
      m.title.toLowerCase().includes(searchFilter.toLowerCase()) ||
      m.department.toLowerCase().includes(searchFilter.toLowerCase()) ||
      m.description.toLowerCase().includes(searchFilter.toLowerCase())
  );

  return (
    <section id="switchboard" className="mt-8 space-y-4">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b border-slate-200 dark:border-slate-800 pb-3">
        <div>
          <div className="flex items-center space-x-2">
            <h2 className="text-xl font-bold tracking-tight text-slate-900 dark:text-white font-serif">
              Enterprise Module Switchboard
            </h2>
            <span className="px-2.5 py-0.5 rounded-full text-[11px] font-bold bg-[#0A192F] text-amber-300 border border-amber-400/40">
              8 Core Systems
            </span>
          </div>
          <p className="text-xs text-slate-500 mt-0.5">
            Institutional operating subsystems for Rajendra Prasad Institute of Hotel Management
          </p>
        </div>

        {/* Quick Filter */}
        <div className="relative w-full sm:w-64">
          <Icon
            name="search"
            className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-400"
          />
          <input
            type="text"
            placeholder="Filter switchboard..."
            value={searchFilter}
            onChange={(e) => setSearchFilter(e.target.value)}
            className="w-full pl-9 pr-3 py-1.5 text-xs rounded-xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 text-slate-900 dark:text-white placeholder:text-slate-400 focus:outline-none focus:ring-2 focus:ring-amber-500/50"
          />
        </div>
      </div>

      {/* Grid of the 8 Modules */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        {filtered.map((module) => (
          <div
            key={module.slug}
            className="rounded-2xl bg-white dark:bg-slate-900 p-5 border border-slate-200/80 dark:border-slate-800 shadow-xs hover:shadow-lg transition-all flex flex-col justify-between group hover:border-amber-300 dark:hover:border-amber-700/60"
          >
            <div>
              {/* Header: Icon & Status */}
              <div className="flex items-start justify-between mb-3">
                <div className="p-2.5 rounded-xl bg-amber-50 text-amber-800 dark:bg-amber-950/40 dark:text-amber-300 border border-amber-200/60 dark:border-amber-900/40 group-hover:bg-amber-100 transition-colors">
                  <Icon name={module.icon} className="h-5 w-5" />
                </div>
                <span className="text-[10px] font-semibold px-2 py-0.5 rounded-full bg-slate-100 text-slate-600 dark:bg-slate-800 dark:text-slate-400 border border-slate-200 dark:border-slate-700">
                  {module.status}
                </span>
              </div>

              {/* Department Tag */}
              <span className="text-[10px] font-semibold tracking-wide uppercase text-amber-800 dark:text-amber-400">
                {module.department}
              </span>

              {/* Module Title */}
              <h3 className="text-base font-bold text-slate-900 dark:text-white mt-1 group-hover:text-amber-700 dark:group-hover:text-amber-400 transition-colors">
                {module.title}
              </h3>

              {/* Description */}
              <p className="text-xs text-slate-600 dark:text-slate-400 mt-1.5 leading-relaxed line-clamp-3">
                {module.description}
              </p>

              {/* Fictional Live Indicators */}
              <div className="mt-4 pt-3 border-t border-slate-100 dark:border-slate-800/80 grid grid-cols-3 gap-2 text-center">
                {module.stats.map((stat, idx) => (
                  <div key={idx} className="bg-slate-50 dark:bg-slate-800/50 p-1.5 rounded-lg">
                    <div className="text-[10px] text-slate-400 font-medium truncate">
                      {stat.label}
                    </div>
                    <div className="text-xs font-bold text-slate-800 dark:text-slate-200 mt-0.5 truncate">
                      {stat.value}
                    </div>
                  </div>
                ))}
              </div>
            </div>

            {/* Launch Action */}
            <div className="mt-5 pt-3 border-t border-slate-100 dark:border-slate-800">
              <Link
                href={`/modules/${module.slug}`}
                className="w-full flex items-center justify-center space-x-2 rounded-xl bg-slate-100 hover:bg-[#0A192F] hover:text-white text-slate-800 dark:bg-slate-800 dark:text-slate-200 dark:hover:bg-amber-500 dark:hover:text-slate-950 py-2 text-xs font-semibold transition-all group-hover:border group-hover:border-amber-400/30"
              >
                <span>Open Module Console</span>
                <Icon name="chevron-right" className="h-3.5 w-3.5" />
              </Link>
            </div>
          </div>
        ))}
      </div>
    </section>
  );
};
