"use client";

import React, { useState } from "react";
import Link from "next/link";
import { Icon } from "@/components/common/Icon";
import {
  EXECUTIVE_METRICS,
  HOSPITALITY_LABS_STATUS,
  RECENT_ACTIVITIES,
  CAMPUS_NOTICES,
} from "@/data/mockData";

export const ExecutiveOverview: React.FC = () => {
  const [metricFilter, setMetricFilter] = useState<string>("all");
  const [isRefreshing, setIsRefreshing] = useState(false);
  const [lastUpdated, setLastUpdated] = useState("Just now (09:42 AM IST)");
  const [showExportModal, setShowExportModal] = useState(false);

  const filteredMetrics =
    metricFilter === "all"
      ? EXECUTIVE_METRICS
      : EXECUTIVE_METRICS.filter((m) => m.category === metricFilter);

  const handleRefresh = () => {
    setIsRefreshing(true);
    setTimeout(() => {
      setIsRefreshing(false);
      const time = new Date().toLocaleTimeString([], {
        hour: "2-digit",
        minute: "2-digit",
        second: "2-digit",
      });
      setLastUpdated(`Synchronized at ${time} IST`);
    }, 600);
  };

  return (
    <div className="space-y-6">
      {/* Institutional Banner & Top Controls */}
      <div className="rounded-2xl bg-gradient-to-r from-[#0A192F] via-[#0F233D] to-[#162D4C] p-6 text-white shadow-xl border border-amber-500/20">
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
          <div>
            <div className="inline-flex items-center gap-2 px-2.5 py-1 rounded-full text-xs font-semibold bg-amber-500/20 text-amber-300 border border-amber-400/30 mb-2">
              <span className="w-1.5 h-1.5 rounded-full bg-amber-400 animate-pulse"></span>
              Institutional ERP Cockpit • Phase 2 Shell
            </div>
            <h1 className="text-2xl sm:text-3xl font-bold tracking-tight font-serif text-white">
              Academic & Operational Executive Overview
            </h1>
            <p className="text-xs sm:text-sm text-slate-300 mt-1 max-w-2xl">
              Rajendra Prasad Institute of Hotel Management — Consolidated morning census, practical kitchen allocations, and academic throughput.
            </p>
          </div>

          <div className="flex flex-wrap items-center gap-2.5 shrink-0">
            <button
              onClick={handleRefresh}
              disabled={isRefreshing}
              className="inline-flex items-center space-x-2 rounded-xl bg-white/10 hover:bg-white/20 px-3.5 py-2 text-xs font-semibold text-white backdrop-blur-sm border border-white/10 transition-all disabled:opacity-60 cursor-pointer"
              aria-label="Refresh simulated dashboard metrics"
            >
              <Icon
                name="refresh"
                className={`h-4 w-4 text-amber-300 ${
                  isRefreshing ? "animate-spin text-amber-400" : ""
                }`}
              />
              <span>{isRefreshing ? "Syncing..." : "Refresh Metrics"}</span>
            </button>

            <button
              onClick={() => setShowExportModal(true)}
              className="inline-flex items-center space-x-2 rounded-xl bg-amber-500 hover:bg-amber-400 px-3.5 py-2 text-xs font-bold text-slate-950 transition-all shadow-md cursor-pointer"
            >
              <Icon name="arrow-down-tray" className="h-4 w-4 text-slate-950" />
              <span>Export Snapshot</span>
            </button>
          </div>
        </div>

        {/* Sync status indicator */}
        <div className="mt-4 pt-3 border-t border-white/10 flex flex-wrap items-center justify-between text-xs text-slate-400">
          <div className="flex items-center space-x-2">
            <span className="w-2 h-2 rounded-full bg-emerald-400"></span>
            <span>All 8 Core ERP Micro-Domains Operational</span>
          </div>
          <span className="text-[11px] font-mono text-amber-200/80">
            {lastUpdated}
          </span>
        </div>
      </div>

      {/* Prominent Fictional Data Notice */}
      <div className="rounded-xl bg-amber-50/90 dark:bg-amber-950/20 border border-amber-300/80 dark:border-amber-800/40 p-4 text-xs text-amber-900 dark:text-amber-200 flex items-start space-x-3">
        <div className="p-1 rounded-md bg-amber-200/80 dark:bg-amber-900/60 text-amber-900 dark:text-amber-200 shrink-0 mt-0.5">
          <Icon name="award" className="h-4 w-4" />
        </div>
        <div className="leading-relaxed">
          <strong className="font-semibold uppercase tracking-wide">
            Demonstration Environment Notice:
          </strong>{" "}
          All student counts, financial figures, faculty names, and lab schedules are fictional sample records for UI/UX demonstration of the CampusOS application shell. No actual college records or databases are connected.
        </div>
      </div>

      {/* Metrics Section Header & Category Filter */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pt-2">
        <div>
          <h2 className="text-lg font-bold text-slate-900 dark:text-white">
            Institutional Key Performance Indicators
          </h2>
          <p className="text-xs text-slate-500">
            Current term real-time aggregated metrics across departments
          </p>
        </div>

        {/* Filter Tabs */}
        <div className="flex items-center space-x-1 bg-slate-200/70 dark:bg-slate-800 p-1 rounded-xl text-xs font-medium">
          {[
            { id: "all", label: "All Indicators" },
            { id: "academic", label: "Academic" },
            { id: "operations", label: "Operations" },
            { id: "finance", label: "Finance" },
            { id: "campus", label: "Facilities" },
          ].map((tab) => (
            <button
              key={tab.id}
              onClick={() => setMetricFilter(tab.id)}
              className={`px-3 py-1.5 rounded-lg transition-all ${
                metricFilter === tab.id
                  ? "bg-white dark:bg-slate-900 text-slate-900 dark:text-white font-semibold shadow-xs"
                  : "text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white"
              }`}
            >
              {tab.label}
            </button>
          ))}
        </div>
      </div>

      {/* 6 Key Executive Metrics Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
        {filteredMetrics.map((metric) => (
          <div
            key={metric.id}
            className="rounded-2xl bg-white dark:bg-slate-900 p-5 border border-slate-200/80 dark:border-slate-800 shadow-xs hover:shadow-md transition-all hover:border-amber-300 dark:hover:border-amber-700/60 group"
          >
            <div className="flex items-center justify-between">
              <span className="text-xs font-semibold uppercase tracking-wider text-slate-500 dark:text-slate-400">
                {metric.label}
              </span>
              <div className="p-2 rounded-xl bg-amber-50 text-amber-700 dark:bg-amber-950/40 dark:text-amber-300 border border-amber-200/50 dark:border-amber-900/40 group-hover:bg-amber-100 transition-colors">
                <Icon name={metric.icon} className="h-5 w-5" />
              </div>
            </div>

            <div className="mt-3 flex items-baseline space-x-3">
              <span className="text-2xl sm:text-3xl font-extrabold tracking-tight text-slate-900 dark:text-white font-serif">
                {metric.value}
              </span>
              {metric.change && (
                <span className="inline-flex items-center text-xs font-semibold text-emerald-700 dark:text-emerald-400 bg-emerald-50 dark:bg-emerald-950/40 px-2 py-0.5 rounded-full border border-emerald-200 dark:border-emerald-800">
                  {metric.change}
                </span>
              )}
            </div>

            <p className="mt-2 text-xs text-slate-500 dark:text-slate-400 leading-relaxed">
              {metric.caption}
            </p>
          </div>
        ))}
      </div>

      {/* Hospitality Labs & Culinary Suites Real-time Status */}
      <div className="rounded-2xl bg-white dark:bg-slate-900 p-6 border border-slate-200/80 dark:border-slate-800 shadow-xs">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 mb-4">
          <div>
            <div className="flex items-center space-x-2">
              <h3 className="text-base font-bold text-slate-900 dark:text-white">
                Hospitality Labs & Practical Kitchens Status
              </h3>
              <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-amber-100 text-amber-800 dark:bg-amber-950 dark:text-amber-300">
                Live Sensor Feed (Simulated)
              </span>
            </div>
            <p className="text-xs text-slate-500 mt-0.5">
              Workstation occupancy, instructor in charge, and scheduled practical batches
            </p>
          </div>

          <Link
            href="/modules/facilities"
            className="text-xs font-semibold text-amber-700 dark:text-amber-400 hover:underline flex items-center space-x-1"
          >
            <span>Full Facilities Console</span>
            <Icon name="chevron-right" className="h-3.5 w-3.5" />
          </Link>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {HOSPITALITY_LABS_STATUS.map((lab) => {
            const occupancyPct = Math.round((lab.currentOccupancy / lab.capacity) * 100);
            return (
              <div
                key={lab.id}
                className="p-4 rounded-xl border border-slate-200 dark:border-slate-800 bg-slate-50/50 dark:bg-slate-800/30 hover:border-slate-300 transition-all"
              >
                <div className="flex items-start justify-between">
                  <div>
                    <h4 className="text-xs font-bold text-slate-900 dark:text-white">
                      {lab.name}
                    </h4>
                    <span className="font-mono text-[10px] text-slate-500">
                      Code: {lab.code}
                    </span>
                  </div>
                  <span
                    className={`px-2 py-0.5 text-[10px] font-bold rounded-full border ${
                      lab.status === "In Session"
                        ? "bg-emerald-50 text-emerald-700 border-emerald-200 dark:bg-emerald-950/40 dark:text-emerald-300 dark:border-emerald-800"
                        : lab.status === "Sanitization"
                        ? "bg-amber-50 text-amber-700 border-amber-200 dark:bg-amber-950/40 dark:text-amber-300 dark:border-amber-800"
                        : "bg-slate-100 text-slate-700 border-slate-200 dark:bg-slate-800 dark:text-slate-300"
                    }`}
                  >
                    {lab.status}
                  </span>
                </div>

                <div className="mt-3">
                  <div className="flex justify-between text-[11px] text-slate-600 dark:text-slate-400 mb-1">
                    <span>Occupancy</span>
                    <span className="font-semibold text-slate-900 dark:text-white">
                      {lab.currentOccupancy} / {lab.capacity} ({occupancyPct}%)
                    </span>
                  </div>
                  <div className="w-full bg-slate-200 dark:bg-slate-700 h-2 rounded-full overflow-hidden">
                    <div
                      className={`h-full rounded-full transition-all ${
                        occupancyPct > 80
                          ? "bg-amber-500"
                          : occupancyPct > 0
                          ? "bg-emerald-500"
                          : "bg-slate-400"
                      }`}
                      style={{ width: `${occupancyPct}%` }}
                    ></div>
                  </div>
                </div>

                <div className="mt-3 pt-2 border-t border-slate-200/80 dark:border-slate-700/60 text-[11px] text-slate-500 space-y-1">
                  <div>
                    <strong className="text-slate-700 dark:text-slate-300">Cohort:</strong>{" "}
                    {lab.activeBatch || "None"}
                  </div>
                  <div>
                    <strong className="text-slate-700 dark:text-slate-300">Instructor:</strong>{" "}
                    {lab.facultyInCharge}
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      </div>

      {/* Lower Dual Columns: Recent Activity Log & Campus Noticeboard */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Activity Stream */}
        <div className="rounded-2xl bg-white dark:bg-slate-900 p-6 border border-slate-200/80 dark:border-slate-800 shadow-xs">
          <div className="flex items-center justify-between mb-4">
            <div>
              <h3 className="text-base font-bold text-slate-900 dark:text-white">
                Recent Institutional Activity
              </h3>
              <p className="text-xs text-slate-500">
                Audited system log events from college departments
              </p>
            </div>
            <span className="text-xs font-mono text-slate-400">Live Simulation</span>
          </div>

          <div className="divide-y divide-slate-100 dark:divide-slate-800">
            {RECENT_ACTIVITIES.map((act) => (
              <div key={act.id} className="py-3.5 first:pt-0 last:pb-0">
                <div className="flex items-center justify-between text-xs mb-1">
                  <span className="font-semibold text-slate-800 dark:text-slate-200">
                    {act.actor}{" "}
                    <span className="text-[11px] font-normal text-slate-500">
                      ({act.role})
                    </span>
                  </span>
                  <span className="text-[10px] text-slate-400">{act.timestamp}</span>
                </div>
                <p className="text-xs text-slate-600 dark:text-slate-300 leading-relaxed">
                  {act.description}
                </p>
                <div className="mt-1.5 flex items-center space-x-2">
                  <span className="text-[10px] font-medium px-2 py-0.5 rounded bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-400">
                    {act.category}
                  </span>
                  <span className="text-[10px] text-emerald-600 dark:text-emerald-400 font-mono">
                    ✓ Verified Log
                  </span>
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* Executive Noticeboard */}
        <div className="rounded-2xl bg-white dark:bg-slate-900 p-6 border border-slate-200/80 dark:border-slate-800 shadow-xs">
          <div className="flex items-center justify-between mb-4">
            <div>
              <h3 className="text-base font-bold text-slate-900 dark:text-white">
                Dean&apos;s Noticeboard & Directives
              </h3>
              <p className="text-xs text-slate-500">
                High-priority academic circulars for Odd Semester 2026-27
              </p>
            </div>
            <span className="text-xs px-2 py-0.5 rounded-full bg-rose-50 text-rose-700 font-semibold border border-rose-200">
              3 Active
            </span>
          </div>

          <div className="space-y-3">
            {CAMPUS_NOTICES.map((notice) => (
              <div
                key={notice.id}
                className="p-4 rounded-xl border border-slate-200/80 dark:border-slate-800 bg-slate-50/60 dark:bg-slate-800/20"
              >
                <div className="flex items-center justify-between text-xs mb-1.5">
                  <span
                    className={`px-2 py-0.5 text-[10px] font-bold rounded ${
                      notice.priority === "Urgent"
                        ? "bg-rose-100 text-rose-800 dark:bg-rose-950/60 dark:text-rose-200"
                        : notice.priority === "High"
                        ? "bg-amber-100 text-amber-800 dark:bg-amber-950/60 dark:text-amber-200"
                        : "bg-slate-200 text-slate-800 dark:bg-slate-700 dark:text-slate-200"
                    }`}
                  >
                    {notice.priority} Directive
                  </span>
                  <span className="text-slate-400 text-[11px]">{notice.date}</span>
                </div>
                <h4 className="text-xs font-bold text-slate-900 dark:text-white leading-snug">
                  {notice.title}
                </h4>
                <p className="text-xs text-slate-600 dark:text-slate-400 mt-1.5 leading-relaxed">
                  {notice.excerpt}
                </p>
                <div className="mt-2 text-[11px] font-medium text-amber-800 dark:text-amber-400">
                  Target: {notice.targetAudience}
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* Snapshot Export Simulation Modal */}
      {showExportModal && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-sm"
          onClick={() => setShowExportModal(false)}
          role="dialog"
          aria-modal="true"
        >
          <div
            className="w-full max-w-md rounded-2xl bg-white dark:bg-slate-900 p-6 shadow-2xl border border-slate-200 dark:border-slate-800"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="flex items-center space-x-3 mb-4">
              <div className="p-2 rounded-xl bg-amber-100 text-amber-800 dark:bg-amber-900/40 dark:text-amber-300">
                <Icon name="arrow-down-tray" className="h-6 w-6" />
              </div>
              <div>
                <h3 className="text-base font-bold text-slate-900 dark:text-white">
                  Export Executive Snapshot
                </h3>
                <p className="text-xs text-slate-500">
                  Simulated audit extract for RPIHM CampusOS
                </p>
              </div>
            </div>

            <div className="p-3 bg-slate-50 dark:bg-slate-800/60 rounded-xl text-xs text-slate-600 dark:text-slate-300 space-y-2 mb-4 border border-slate-200 dark:border-slate-700">
              <div className="flex justify-between">
                <span>Academic Session:</span>
                <span className="font-semibold text-slate-900 dark:text-white">Odd Semester 2026-27</span>
              </div>
              <div className="flex justify-between">
                <span>Census Sample:</span>
                <span className="font-semibold text-slate-900 dark:text-white">1,280 Students • 72 Faculty</span>
              </div>
              <div className="flex justify-between">
                <span>Hospitality Labs:</span>
                <span className="font-semibold text-slate-900 dark:text-white">14 Active in Session</span>
              </div>
              <div className="flex justify-between">
                <span>Fee Collection Progress:</span>
                <span className="font-semibold text-slate-900 dark:text-white">₹4.12 Cr / 88.4%</span>
              </div>
            </div>

            <p className="text-xs text-slate-500 mb-6">
              In production mode, this generates a digitally signed institutional PDF / XLSX package. In this Milestone 2 demonstration, simulated verification is confirmed.
            </p>

            <div className="flex justify-end space-x-2">
              <button
                onClick={() => setShowExportModal(false)}
                className="px-4 py-2 text-xs font-semibold rounded-lg bg-slate-100 hover:bg-slate-200 text-slate-700 dark:bg-slate-800 dark:text-slate-200"
              >
                Dismiss
              </button>
              <button
                onClick={() => {
                  alert("Simulated PDF Snapshot generated successfully for RPIHM CampusOS.");
                  setShowExportModal(false);
                }}
                className="px-4 py-2 text-xs font-semibold rounded-lg bg-[#0A192F] hover:bg-[#102A43] text-white"
              >
                Download Mock Audit PDF
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
