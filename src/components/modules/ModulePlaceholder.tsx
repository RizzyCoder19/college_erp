"use client";

import React, { useState } from "react";
import Link from "next/link";
import { Icon } from "@/components/common/Icon";
import { ModuleData } from "@/types/campus";

interface ModulePlaceholderProps {
  module: ModuleData;
}

export const ModulePlaceholder: React.FC<ModulePlaceholderProps> = ({ module }) => {
  const [activeTab, setActiveTab] = useState<"records" | "specs">("records");
  const [tableSearch, setTableSearch] = useState("");

  const filteredRows = module.mockRecords.rows.filter((row) =>
    row.some((cell) =>
      String(cell).toLowerCase().includes(tableSearch.toLowerCase())
    )
  );

  return (
    <div className="space-y-6">
      {/* Breadcrumb Navigation */}
      <nav aria-label="Breadcrumb" className="flex items-center space-x-2 text-xs text-slate-500">
        <Link
          href="/"
          className="hover:text-amber-700 dark:hover:text-amber-400 flex items-center space-x-1"
        >
          <Icon name="arrow-left" className="h-3.5 w-3.5" />
          <span>Dashboard Overview</span>
        </Link>
        <span>/</span>
        <span className="text-slate-400">Modules</span>
        <span>/</span>
        <span className="font-semibold text-slate-800 dark:text-slate-200">
          {module.title}
        </span>
      </nav>

      {/* Module Banner Header */}
      <div className="rounded-2xl bg-gradient-to-r from-[#0A192F] via-[#0F233D] to-[#162D4C] p-6 text-white shadow-xl border border-amber-500/20">
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
          <div className="flex items-start space-x-4">
            <div className="p-3.5 rounded-2xl bg-amber-500/20 text-amber-300 border border-amber-400/40 shrink-0">
              <Icon name={module.icon} className="h-8 w-8" />
            </div>
            <div>
              <div className="flex items-center space-x-2">
                <span className="text-xs font-semibold uppercase tracking-wider text-amber-300">
                  {module.department}
                </span>
                <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-amber-400/20 text-amber-300 border border-amber-400/40">
                  {module.status}
                </span>
              </div>
              <h1 className="text-2xl sm:text-3xl font-bold tracking-tight text-white font-serif mt-1">
                {module.title}
              </h1>
              <p className="text-xs sm:text-sm text-slate-300 mt-1 max-w-2xl leading-relaxed">
                {module.description}
              </p>
            </div>
          </div>

          <div className="shrink-0 flex items-center space-x-2">
            <Link
              href="/"
              className="inline-flex items-center space-x-2 px-4 py-2 rounded-xl bg-white/10 hover:bg-white/20 text-white text-xs font-semibold backdrop-blur-sm transition-all border border-white/10"
            >
              <Icon name="arrow-left" className="h-4 w-4" />
              <span>Back to Overview</span>
            </Link>
          </div>
        </div>

        {/* Live Module Stats strip */}
        <div className="mt-6 pt-4 border-t border-white/10 grid grid-cols-3 gap-4 text-center sm:text-left">
          {module.stats.map((stat, idx) => (
            <div key={idx} className="bg-white/5 p-3 rounded-xl border border-white/5">
              <div className="text-[11px] text-slate-400 uppercase tracking-wider">
                {stat.label}
              </div>
              <div className="text-lg sm:text-xl font-bold text-amber-300 mt-0.5 font-serif">
                {stat.value}
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* Prominent Prototype Banner */}
      <div className="rounded-xl bg-amber-50 dark:bg-amber-950/20 border-l-4 border-amber-500 p-4 text-xs text-amber-900 dark:text-amber-200">
        <div className="flex items-start space-x-3">
          <div className="p-1 rounded bg-amber-200 dark:bg-amber-900/60 text-amber-900 dark:text-amber-200 shrink-0">
            <Icon name="award" className="h-4 w-4" />
          </div>
          <div>
            <h4 className="font-bold uppercase tracking-wider text-amber-800 dark:text-amber-300">
              Module Prototype Placeholder (Milestone 2 Specification)
            </h4>
            <p className="mt-1 leading-relaxed text-slate-700 dark:text-slate-300">
              The full operational workflow and transactional persistence for{" "}
              <strong>{module.title}</strong> is scheduled for subsequent milestones. Below is an interactive demonstration preview showing anticipated data structures, planned system features, and simulated sample records.
            </p>
          </div>
        </div>
      </div>

      {/* Tab Switcher: Mock Records vs Planned Specifications */}
      <div className="flex items-center space-x-2 border-b border-slate-200 dark:border-slate-800 pb-2">
        <button
          onClick={() => setActiveTab("records")}
          className={`px-4 py-2 text-xs font-semibold rounded-xl transition-all cursor-pointer ${
            activeTab === "records"
              ? "bg-[#0A192F] text-amber-300 shadow-sm"
              : "text-slate-600 dark:text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-800"
          }`}
        >
          Demonstration Records ({module.mockRecords.rows.length})
        </button>
        <button
          onClick={() => setActiveTab("specs")}
          className={`px-4 py-2 text-xs font-semibold rounded-xl transition-all cursor-pointer ${
            activeTab === "specs"
              ? "bg-[#0A192F] text-amber-300 shadow-sm"
              : "text-slate-600 dark:text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-800"
          }`}
        >
          Planned Specifications & Roadmap
        </button>
      </div>

      {/* Tab 1: Mock Records Table */}
      {activeTab === "records" && (
        <div className="rounded-2xl bg-white dark:bg-slate-900 p-6 border border-slate-200/80 dark:border-slate-800 shadow-xs space-y-4">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
            <div>
              <h3 className="text-base font-bold text-slate-900 dark:text-white">
                Simulated {module.title} Register
              </h3>
              <p className="text-xs text-slate-500">
                Demonstration sample records for UI/UX testing
              </p>
            </div>

            <div className="relative w-full sm:w-64">
              <Icon
                name="search"
                className="absolute left-3 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-slate-400"
              />
              <input
                type="text"
                placeholder="Filter table rows..."
                value={tableSearch}
                onChange={(e) => setTableSearch(e.target.value)}
                className="w-full pl-8 pr-3 py-1.5 text-xs rounded-xl bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 text-slate-900 dark:text-white placeholder:text-slate-400 focus:outline-none focus:ring-1 focus:ring-amber-500"
              />
            </div>
          </div>

          <div className="overflow-x-auto rounded-xl border border-slate-200 dark:border-slate-800">
            <table className="w-full text-left text-xs">
              <thead className="bg-slate-50 dark:bg-slate-800/80 text-slate-600 dark:text-slate-300 font-semibold uppercase tracking-wider text-[11px] border-b border-slate-200 dark:border-slate-800">
                <tr>
                  {module.mockRecords.columns.map((col, idx) => (
                    <th key={idx} scope="col" className="px-4 py-3">
                      {col}
                    </th>
                  ))}
                  <th scope="col" className="px-4 py-3 text-right">
                    Action (Simulated)
                  </th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 dark:divide-slate-800">
                {filteredRows.map((row, rIdx) => (
                  <tr
                    key={rIdx}
                    className="hover:bg-slate-50/80 dark:hover:bg-slate-800/40 transition-colors"
                  >
                    {row.map((cell, cIdx) => (
                      <td
                        key={cIdx}
                        className={`px-4 py-3 text-slate-800 dark:text-slate-200 ${
                          cIdx === 0 ? "font-mono font-medium text-amber-800 dark:text-amber-400" : ""
                        }`}
                      >
                        {cell}
                      </td>
                    ))}
                    <td className="px-4 py-3 text-right">
                      <button
                        onClick={() =>
                          alert(`Simulated Action: Viewing record "${row[0]}" in ${module.title}.`)
                        }
                        className="px-2.5 py-1 text-[11px] font-semibold text-amber-800 hover:text-amber-900 bg-amber-50 hover:bg-amber-100 rounded-lg border border-amber-300 dark:bg-amber-950/40 dark:text-amber-300 dark:border-amber-800 transition-colors cursor-pointer"
                      >
                        Inspect
                      </button>
                    </td>
                  </tr>
                ))}
                {filteredRows.length === 0 && (
                  <tr>
                    <td
                      colSpan={module.mockRecords.columns.length + 1}
                      className="px-4 py-8 text-center text-slate-500"
                    >
                      No records matching &quot;{tableSearch}&quot;
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>

          <div className="text-[11px] text-slate-400 text-right">
            Showing {filteredRows.length} of {module.mockRecords.rows.length} simulated rows
          </div>
        </div>
      )}

      {/* Tab 2: Planned Specifications */}
      {activeTab === "specs" && (
        <div className="rounded-2xl bg-white dark:bg-slate-900 p-6 border border-slate-200/80 dark:border-slate-800 shadow-xs space-y-4">
          <div>
            <h3 className="text-base font-bold text-slate-900 dark:text-white">
              Planned Architecture & Feature Roadmap
            </h3>
            <p className="text-xs text-slate-500">
              Functional capabilities specified for future production deployment
            </p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {module.plannedFeatures.map((feat, idx) => (
              <div
                key={idx}
                className="p-4 rounded-xl border border-slate-200 dark:border-slate-800 bg-slate-50/50 dark:bg-slate-800/30 flex items-start space-x-3"
              >
                <div className="p-1 rounded-full bg-emerald-100 text-emerald-700 dark:bg-emerald-950/60 dark:text-emerald-300 shrink-0 mt-0.5">
                  <Icon name="check-circle" className="h-4 w-4" />
                </div>
                <div>
                  <h4 className="text-xs font-semibold text-slate-900 dark:text-white">
                    {feat}
                  </h4>
                  <p className="text-[11px] text-slate-500 mt-1">
                    Staged for data model design and API routing in Milestone 3.
                  </p>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
};
