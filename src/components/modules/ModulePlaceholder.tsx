"use client";

import React, { useState } from "react";
import Link from "next/link";
import Image from "next/image";
import { Icon } from "@/components/common/Icon";
import { ModuleData } from "@/types/campus";
import { AcademicsView } from "@/components/modules/AcademicsView";
import { StudentsView } from "@/components/modules/students/StudentsView";

interface ModulePlaceholderProps {
  module: ModuleData;
}

export const ModulePlaceholder: React.FC<ModulePlaceholderProps> = ({ module }) => {
  const [activeTab, setActiveTab] = useState<"records" | "specs">("records");
  const [tableSearch, setTableSearch] = useState("");

  if (module.slug === "students") {
    return <StudentsView />;
  }

  if (module.slug === "academics") {
    return <AcademicsView />;
  }

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
          className="hover:text-[#1657D9] flex items-center space-x-1 font-medium"
        >
          <Icon name="arrow-left" className="h-3.5 w-3.5" />
          <span>Dashboard</span>
        </Link>
        <span>/</span>
        <span className="text-slate-400">Modules</span>
        <span>/</span>
        <span className="font-bold text-slate-900">
          {module.title}
        </span>
      </nav>

      {/* Module Banner Header with Camouflage Background and Hover Zoom */}
      <div className="relative overflow-hidden rounded-2xl border border-slate-200 shadow-xs group bg-[#071322]">
        {/* Full-box background camouflage image with smooth cursor hover zoom */}
        <div className="absolute inset-0 z-0 overflow-hidden pointer-events-none">
          <Image
            src="/images/campus-illuminated-sign.png"
            alt="R. P. Institute of Hospitality & Management Campus Signage"
            fill
            sizes="100vw"
            className="object-cover object-right opacity-80 transition-transform duration-700 ease-out group-hover:scale-108"
            priority
          />
          {/* Frosted white camouflage overlay */}
          <div className="absolute inset-0 bg-gradient-to-r from-white via-white/95 to-white/70 z-10 backdrop-blur-[1.5px]"></div>
        </div>

        <div className="relative z-10 p-6 sm:p-8">
          <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
            <div className="flex items-start space-x-4">
              <div className="p-3.5 rounded-2xl bg-blue-50 text-[#1657D9] border border-blue-100 shrink-0">
                <Icon name={module.icon} className="h-8 w-8" />
              </div>
              <div>
                <div className="flex items-center space-x-2">
                  <span className="text-xs font-bold uppercase tracking-wider text-[#1657D9]">
                    {module.department}
                  </span>
                  <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-slate-100 text-slate-600 border border-slate-200">
                    {module.status}
                  </span>
                </div>
                <h1 className="text-2xl sm:text-3xl font-extrabold tracking-tight text-slate-900 font-serif mt-1">
                  {module.title}
                </h1>
                <p className="text-sm text-slate-600 mt-1 max-w-2xl leading-relaxed">
                  {module.description}
                </p>
              </div>
            </div>

            <div className="shrink-0 flex items-center space-x-2">
              <Link
                href="/"
                className="inline-flex items-center space-x-2 px-4 py-2 rounded-xl bg-white/90 hover:bg-slate-100 text-slate-700 text-xs font-semibold transition-all border border-slate-200 shadow-2xs backdrop-blur-xs"
              >
                <Icon name="arrow-left" className="h-4 w-4" />
                <span>Back to Dashboard</span>
              </Link>
            </div>
          </div>

          {/* Live Module Stats Strip */}
          <div className="mt-6 pt-4 border-t border-slate-200/80 grid grid-cols-1 sm:grid-cols-3 gap-4">
            {module.stats.map((stat, idx) => (
              <div key={idx} className="bg-white/80 backdrop-blur-xs p-3.5 rounded-xl border border-slate-200/80 shadow-2xs">
                <div className="text-[11px] text-slate-500 uppercase tracking-wider font-semibold">
                  {stat.label}
                </div>
                <div className="text-xl sm:text-2xl font-extrabold text-[#0F172A] mt-0.5 font-serif">
                  {stat.value}
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* Campus Infrastructure Showcase (Featured for Hospitality Labs & Facilities) */}
      {module.slug === "facilities" && (
        <div className="rounded-2xl bg-white p-6 border border-slate-200 shadow-xs space-y-4">
          <div className="flex items-center justify-between">
            <div>
              <h3 className="text-base font-bold text-slate-900 font-serif">
                Campus Infrastructure & Academic Facilities
              </h3>
              <p className="text-xs text-slate-500">
                On-site facilities at R. P. Institute of Hospitality & Management, Vasai (West)
              </p>
            </div>
            <span className="text-[10px] font-bold px-2.5 py-1 rounded-full bg-blue-50 text-[#1657D9] border border-blue-100">
              Vasai West Campus
            </span>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4 pt-1">
            {/* Facility Card 1: Multi-Level Academic Block */}
            <div className="rounded-xl overflow-hidden border border-slate-200 bg-slate-50 group shadow-2xs">
              <div className="relative h-44 w-full bg-slate-900 overflow-hidden">
                <Image
                  src="/images/campus-staircase.png"
                  alt="Multi-Level Academic Block & Laboratory Access"
                  fill
                  sizes="(max-width: 640px) 100vw, 33vw"
                  className="object-cover transition-transform duration-500 group-hover:scale-105"
                />
                <div className="absolute inset-0 bg-gradient-to-t from-slate-900/80 via-transparent to-transparent"></div>
                <span className="absolute bottom-2.5 left-3 text-xs font-bold text-white drop-shadow-sm">
                  Academic Block & Lab Staircase
                </span>
              </div>
              <div className="p-3 text-xs text-slate-600">
                Multi-level vertical circulation connecting basic training kitchens, advanced bakery units, and IT laboratories.
              </div>
            </div>

            {/* Facility Card 2: Student Walkway & Academic Corridors */}
            <div className="rounded-xl overflow-hidden border border-slate-200 bg-slate-50 group shadow-2xs">
              <div className="relative h-44 w-full bg-slate-900 overflow-hidden">
                <Image
                  src="/images/campus-walkway.png"
                  alt="Student Academic Walkway & Inspiration Corridors"
                  fill
                  sizes="(max-width: 640px) 100vw, 33vw"
                  className="object-cover transition-transform duration-500 group-hover:scale-105"
                />
                <div className="absolute inset-0 bg-gradient-to-t from-slate-900/80 via-transparent to-transparent"></div>
                <span className="absolute bottom-2.5 left-3 text-xs font-bold text-white drop-shadow-sm">
                  Student Walkway & Inspiration Hall
                </span>
              </div>
              <div className="p-3 text-xs text-slate-600">
                Covered daylight thoroughfare lined with lush greenery and inspirational memorials of Dr. APJ Abdul Kalam and Albert Einstein.
              </div>
            </div>

            {/* Facility Card 3: Main Entrance & Admissions Portal */}
            <div className="rounded-xl overflow-hidden border border-slate-200 bg-slate-50 group shadow-2xs">
              <div className="relative h-44 w-full bg-slate-900 overflow-hidden">
                <Image
                  src="/images/campus-front-gate.jpg"
                  alt="Campus Main Entrance & Affiliation Board"
                  fill
                  sizes="(max-width: 640px) 100vw, 33vw"
                  className="object-cover transition-transform duration-500 group-hover:scale-105"
                />
                <div className="absolute inset-0 bg-gradient-to-t from-slate-900/80 via-transparent to-transparent"></div>
                <span className="absolute bottom-2.5 left-3 text-xs font-bold text-white drop-shadow-sm">
                  Campus Gate & Degree Center
                </span>
              </div>
              <div className="p-3 text-xs text-slate-600">
                Official institutional gateway hosting admissions counseling for Hospitality Studies, Computer Science, and Data Science.
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Institutional Module Scope */}
      <div className="relative overflow-hidden rounded-xl bg-slate-50 border border-slate-200 p-3.5 text-xs text-slate-600 flex items-center justify-between group hover:border-[#1657D9]/40 transition-all">
        {/* Subtle campus camouflage backdrop with hover zoom */}
        <div className="absolute inset-0 z-0 opacity-0 group-hover:opacity-[0.06] transition-opacity duration-500 overflow-hidden pointer-events-none">
          <Image
            src="/images/campus-illuminated-sign.png"
            alt=""
            fill
            sizes="100vw"
            className="object-cover transition-transform duration-700 ease-out group-hover:scale-110"
          />
        </div>
        <div className="relative z-10 flex items-center justify-between w-full">
          <p className="leading-relaxed">
            Administrative subsystem for <strong>{module.title}</strong> • Academic Year 2026 – 27 • University of Mumbai Scheme
          </p>
          <span className="text-[11px] text-slate-400 font-mono hidden sm:inline-block">
            Sample Records
          </span>
        </div>
      </div>

      {/* Tab Switcher: Module Records vs Planned Specifications */}
      <div className="flex items-center space-x-2 border-b border-slate-200 pb-2">
        <button
          onClick={() => setActiveTab("records")}
          className={`px-4 py-2 text-xs font-bold rounded-xl transition-all cursor-pointer ${
            activeTab === "records"
              ? "bg-[#1657D9] text-white shadow-xs"
              : "text-slate-600 hover:bg-slate-200"
          }`}
        >
          Module Records ({module.mockRecords.rows.length})
        </button>
        <button
          onClick={() => setActiveTab("specs")}
          className={`px-4 py-2 text-xs font-bold rounded-xl transition-all cursor-pointer ${
            activeTab === "specs"
              ? "bg-[#1657D9] text-white shadow-xs"
              : "text-slate-600 hover:bg-slate-200"
          }`}
        >
          Planned Specifications & University Scheme
        </button>
      </div>

      {/* Tab 1: Mock Records Table */}
      {activeTab === "records" && (
        <div className="relative overflow-hidden rounded-2xl bg-white p-6 border border-slate-200 shadow-xs space-y-4 group hover:border-[#1657D9]/40 hover:shadow-md transition-all">
          {/* Subtle campus camouflage backdrop with hover zoom */}
          <div className="absolute inset-0 z-0 opacity-0 group-hover:opacity-[0.04] transition-opacity duration-500 overflow-hidden pointer-events-none">
            <Image
              src="/images/campus-illuminated-sign.png"
              alt=""
              fill
              sizes="100vw"
              className="object-cover transition-transform duration-700 ease-out group-hover:scale-108"
            />
          </div>

          <div className="relative z-10 space-y-4">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
              <div>
                <h3 className="text-base font-bold text-slate-900">
                  Department {module.title} Register
                </h3>
                <p className="text-xs text-slate-500">
                  Sample institutional records for administrative preview
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
                  className="w-full pl-8 pr-3 py-1.5 text-xs rounded-xl bg-slate-50 border border-slate-200 text-slate-900 placeholder:text-slate-400 focus:outline-none focus:ring-1 focus:ring-[#1657D9]"
                />
              </div>
            </div>

            <div className="overflow-x-auto rounded-xl border border-slate-200 bg-white/90 backdrop-blur-2xs">
              <table className="w-full text-left text-xs">
                <thead className="bg-slate-50 text-slate-600 font-bold uppercase tracking-wider text-[11px] border-b border-slate-200">
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
                <tbody className="divide-y divide-slate-100">
                  {filteredRows.map((row, rIdx) => (
                    <tr
                      key={rIdx}
                      className="hover:bg-blue-50/40 transition-colors"
                    >
                      {row.map((cell, cIdx) => (
                        <td
                          key={cIdx}
                          className={`px-4 py-3 text-slate-800 ${
                            cIdx === 0 ? "font-mono font-bold text-[#1657D9]" : ""
                          }`}
                        >
                          {cell}
                        </td>
                      ))}
                      <td className="px-4 py-3 text-right">
                        <button
                          onClick={() =>
                            alert(`Simulated Action: Inspecting record "${row[0]}" in ${module.title}.`)
                          }
                          className="px-2.5 py-1 text-[11px] font-semibold text-[#1657D9] hover:text-white bg-blue-50 hover:bg-[#1657D9] rounded-lg border border-blue-200 transition-colors cursor-pointer"
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
        </div>
      )}

      {/* Tab 2: Planned Specifications */}
      {activeTab === "specs" && (
        <div className="relative overflow-hidden rounded-2xl bg-white p-6 border border-slate-200 shadow-xs space-y-4 group hover:border-[#1657D9]/40 hover:shadow-md transition-all">
          {/* Subtle campus camouflage backdrop with hover zoom */}
          <div className="absolute inset-0 z-0 opacity-0 group-hover:opacity-[0.05] transition-opacity duration-500 overflow-hidden pointer-events-none">
            <Image
              src="/images/campus-illuminated-sign.png"
              alt=""
              fill
              sizes="100vw"
              className="object-cover transition-transform duration-700 ease-out group-hover:scale-108"
            />
          </div>

          <div className="relative z-10 space-y-4">
            <div>
              <h3 className="text-base font-bold text-slate-900">
                Planned Architecture & Feature Specifications
              </h3>
              <p className="text-xs text-slate-500">
                Capabilities scheduled for full implementation under University of Mumbai guidelines
              </p>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {module.plannedFeatures.map((feat, idx) => (
                <div
                  key={idx}
                  className="relative overflow-hidden p-4 rounded-xl border border-slate-200 bg-slate-50/70 flex items-start space-x-3 group/item hover:border-[#1657D9]/40 hover:shadow-2xs transition-all"
                >
                  <div className="p-1 rounded-full bg-blue-100 text-[#1657D9] shrink-0 mt-0.5 relative z-10">
                    <Icon name="check-circle" className="h-4 w-4" />
                  </div>
                  <div className="relative z-10">
                    <h4 className="text-xs font-bold text-slate-900">
                      {feat}
                    </h4>
                    <p className="text-[11px] text-slate-500 mt-1">
                      Scheduled for transactional data modeling and API integration.
                    </p>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
