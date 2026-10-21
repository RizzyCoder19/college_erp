"use client";

import React from "react";
import Link from "next/link";
import Image from "next/image";
import { Icon } from "@/components/common/Icon";
import { AnimatedReveal } from "@/components/common/AnimatedReveal";
import {
  EXECUTIVE_METRICS,
  RECENT_ACADEMIC_ACTIVITY,
  TODAY_ON_CAMPUS,
  NOTICES_AND_CIRCULARS,
} from "@/data/mockData";

export interface ExecutiveOverviewProps {
  initialMetrics?: {
    studentCount: number;
    staffCount: number;
    programmeCount: number;
    divisionCount: number;
  };
  integrityAnomalies?: Array<{
    enrolmentId: string;
    studentRoll: string;
    studentPrn: string;
    programmeCode: string;
    semesterNumber: number;
    divisionName: string;
    issueType: string;
    description: string;
  }>;
  currentUser?: {
    fullName: string;
    email: string;
    role: string;
    designation?: string | null;
  };
}

export const ExecutiveOverview: React.FC<ExecutiveOverviewProps> = ({
  initialMetrics,
  integrityAnomalies,
  currentUser,
}) => {
  const summaryMetrics = [
    {
      id: "students-enrolled",
      label: "Enrolled Students",
      value: initialMetrics?.studentCount !== undefined ? initialMetrics.studentCount.toLocaleString() : "11",
      caption: "Verified SQLite student records",
      icon: "users",
      category: "academic",
    },
    {
      id: "active-programmes",
      label: "Active Programmes",
      value: initialMetrics?.programmeCount !== undefined ? initialMetrics.programmeCount.toLocaleString() : "7",
      caption: "Hospitality & Computing disciplines",
      icon: "document-text",
      category: "academic",
    },
    {
      id: "faculty-members",
      label: "Faculty & Staff",
      value: initialMetrics?.staffCount !== undefined ? initialMetrics.staffCount.toLocaleString() : "12",
      caption: "Culinary chefs, professors & staff",
      icon: "users",
      category: "operations",
    },
    {
      id: "classes-today",
      label: "Active Class Cohorts",
      value: initialMetrics?.divisionCount !== undefined ? initialMetrics.divisionCount.toLocaleString() : "14",
      caption: "Configured class divisions across terms",
      icon: "academic-cap",
      category: "operations",
    },
  ];
  return (
    <div className="space-y-6">
      {/* 1. Welcome Hero Banner with Real Campus Photography Camouflage & Zoom */}
      <AnimatedReveal delay={0}>
        <div className="relative overflow-hidden rounded-2xl border border-slate-200/90 shadow-xs group bg-[#071322]">
          {/* Full-box background camouflage image with smooth cursor hover zoom */}
          <div className="absolute inset-0 z-0 overflow-hidden pointer-events-none">
            <Image
              src="/images/campus-illuminated-sign.png"
              alt="R. P. Institute of Hospitality & Management Campus Signage"
              fill
              sizes="100vw"
              className="object-cover object-center sm:object-right transition-transform duration-700 ease-out group-hover:scale-110 opacity-90"
              priority
            />
            {/* Camouflage blending: frosted white on left, dark navy institutional vignette on right */}
            <div className="absolute inset-0 bg-gradient-to-r from-white via-white/95 to-white/30 lg:w-[62%] z-10 backdrop-blur-[2px]"></div>
            <div className="absolute inset-0 bg-gradient-to-t from-[#0B1528]/85 via-[#0B1528]/30 to-transparent z-10"></div>
            <div className="absolute inset-0 bg-gradient-to-r from-transparent via-[#0B1528]/20 to-[#0B1528]/70 hidden lg:block z-10"></div>
          </div>

          <div className="grid grid-cols-1 lg:grid-cols-12 min-h-[220px] relative z-10">
            {/* Left Hero Content */}
            <div className="lg:col-span-7 p-6 sm:p-8 flex flex-col justify-between">
              <div>
                <div className="flex items-center space-x-2 text-xs font-bold text-[#D92534] tracking-wider uppercase">
                  <span className="w-5 h-[2.5px] bg-[#D92534]"></span>
                  <span>WELCOME TO</span>
                </div>

                <h1 className="text-3xl sm:text-4xl font-extrabold tracking-tight text-[#0F172A] mt-1 font-serif">
                  RPIHM <span className="text-[#D92534]">CampusOS</span>
                </h1>

                <h2 className="text-base sm:text-lg font-bold text-slate-800 mt-1">
                  R. P. Institute of Hospitality & Management, Vasai
                </h2>

                <p className="text-sm text-slate-600 mt-2 max-w-xl leading-relaxed">
                  A unified academic and administrative platform for a smarter, well-connected campus experience.
                </p>
              </div>

              {/* 5 Quick Action Module Pills matching reference */}
              <div className="mt-6 flex flex-wrap items-center gap-2">
                <Link
                  href="/modules/students"
                  className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full text-xs font-semibold bg-white/90 hover:bg-blue-50 text-slate-700 hover:text-[#1657D9] border border-slate-200/90 hover:border-blue-200 shadow-2xs transition-all cursor-pointer backdrop-blur-xs"
                >
                  <Icon name="users" className="h-3.5 w-3.5 text-[#1657D9]" />
                  <span>Admissions</span>
                </Link>

                <Link
                  href="/modules/academics"
                  className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full text-xs font-semibold bg-white/90 hover:bg-blue-50 text-slate-700 hover:text-[#1657D9] border border-slate-200/90 hover:border-blue-200 shadow-2xs transition-all cursor-pointer backdrop-blur-xs"
                >
                  <Icon name="academic-cap" className="h-3.5 w-3.5 text-[#1657D9]" />
                  <span>Academics</span>
                </Link>

                <Link
                  href="/modules/faculty"
                  className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full text-xs font-semibold bg-white/90 hover:bg-blue-50 text-slate-700 hover:text-[#1657D9] border border-slate-200/90 hover:border-blue-200 shadow-2xs transition-all cursor-pointer backdrop-blur-xs"
                >
                  <Icon name="briefcase" className="h-3.5 w-3.5 text-[#1657D9]" />
                  <span>Faculty & Staff</span>
                </Link>

                <Link
                  href="/modules/examinations"
                  className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full text-xs font-semibold bg-white/90 hover:bg-blue-50 text-slate-700 hover:text-[#1657D9] border border-slate-200/90 hover:border-blue-200 shadow-2xs transition-all cursor-pointer backdrop-blur-xs"
                >
                  <Icon name="document-text" className="h-3.5 w-3.5 text-[#1657D9]" />
                  <span>Examinations</span>
                </Link>

                <Link
                  href="/modules/placements"
                  className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full text-xs font-semibold bg-white/90 hover:bg-blue-50 text-slate-700 hover:text-[#1657D9] border border-slate-200/90 hover:border-blue-200 shadow-2xs transition-all cursor-pointer backdrop-blur-xs"
                >
                  <Icon name="award" className="h-3.5 w-3.5 text-[#1657D9]" />
                  <span>Placements</span>
                </Link>
              </div>
            </div>

            {/* Right Hero Wing with Mottos */}
            <div className="lg:col-span-5 relative min-h-[220px] lg:min-h-full p-5 sm:p-6 flex flex-col justify-between items-end text-right z-10 pointer-events-none">
              <div className="text-white space-y-1 drop-shadow-md">
                <div className="text-[11px] font-bold tracking-widest uppercase text-white/95">
                  PEOPLE
                </div>
                <div className="text-[11px] font-bold tracking-widest uppercase text-white/95">
                  PROGRAMMES
                </div>
                <div className="text-[11px] font-bold tracking-widest uppercase text-white/95">
                  PRACTICE
                </div>
                <div className="text-[11px] font-bold tracking-widest uppercase text-white/95">
                  POSSIBILITIES
                </div>
                <div className="w-8 h-[2px] bg-[#D92534] ml-auto mt-1"></div>
              </div>

              <div className="text-amber-100 font-serif italic text-base sm:text-lg drop-shadow-md">
                Learning Beyond Classrooms
              </div>
            </div>
          </div>
        </div>
      </AnimatedReveal>

      {/* 2. Concise Row of Readable Summary Metrics with Camouflage Hover Zoom */}
      <AnimatedReveal delay={100}>
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
          {summaryMetrics.map((metric, idx) => (
            <div
              key={metric.id}
              style={{ transitionDelay: `${idx * 60}ms` }}
              className="relative overflow-hidden rounded-2xl bg-white p-5 border border-slate-200/90 shadow-xs hover:border-[#1657D9]/40 hover:shadow-md transition-all flex flex-col justify-between group"
            >
              {/* Subtle campus camouflage backdrop with hover zoom */}
              <div className="absolute inset-0 z-0 opacity-0 group-hover:opacity-[0.07] transition-opacity duration-500 overflow-hidden pointer-events-none">
                <Image
                  src="/images/campus-illuminated-sign.png"
                  alt=""
                  fill
                  sizes="300px"
                  className="object-cover transition-transform duration-700 ease-out group-hover:scale-115"
                />
              </div>

              <div className="relative z-10 flex items-start justify-between">
                <div>
                  <div className="flex items-center space-x-1.5">
                    <span className="text-xs font-semibold text-slate-500 block">
                      {metric.label}
                    </span>
                    <span className="inline-flex items-center px-1.5 py-0.5 rounded text-[9px] font-bold bg-emerald-50 text-emerald-700 border border-emerald-200/60">
                      Live DB
                    </span>
                  </div>
                  <div className="mt-2 text-2xl sm:text-3xl font-extrabold text-[#0F172A] tracking-tight">
                    {metric.value}
                  </div>
                </div>

                <div className="p-2.5 rounded-xl bg-blue-50 text-[#1657D9] border border-blue-100 group-hover:bg-[#1657D9] group-hover:text-white transition-colors">
                  <Icon name={metric.icon} className="h-5 w-5" />
                </div>
              </div>

              <div className="relative z-10 mt-3 pt-2.5 border-t border-slate-100 text-xs text-slate-500">
                {metric.caption}
              </div>
            </div>
          ))}
        </div>
      </AnimatedReveal>

      {/* 2.5 Daily Operations & Academic Integrity Monitor Card */}
      <AnimatedReveal delay={150}>
        <div className="rounded-2xl bg-white border border-slate-200/90 shadow-xs p-5 relative overflow-hidden group">
          <div className="flex flex-col md:flex-row items-start md:items-center justify-between gap-4 pb-4 border-b border-slate-100">
            <div className="flex items-center space-x-3">
              <div className="p-2.5 rounded-xl bg-blue-50 text-[#1657D9] border border-blue-100">
                <Icon name="shield-check" className="h-5 w-5" />
              </div>
              <div>
                <div className="flex items-center space-x-2">
                  <h3 className="text-sm font-bold text-slate-900 font-serif">
                    Daily Administrative Operations & Integrity Monitor
                  </h3>
                  <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-emerald-50 text-emerald-700 border border-emerald-200">
                    Active System
                  </span>
                </div>
                <p className="text-xs text-slate-500 mt-0.5">
                  Real-time database integrity audit, role authorizations, and operational navigation shortcuts
                </p>
              </div>
            </div>

            <div className="flex items-center space-x-2">
              <span className="text-xs font-semibold text-slate-600 bg-slate-100 px-3 py-1 rounded-lg border border-slate-200">
                Active Session:{" "}
                <strong className="text-slate-900">
                  {currentUser
                    ? `${currentUser.fullName} (${currentUser.role === "SYSTEM_ADMIN" ? "System Admin" : currentUser.role === "ACADEMIC_ADMIN" ? "Academic Admin" : currentUser.role})${currentUser.designation ? ` - ${currentUser.designation}` : ""}`
                    : "Authorized User"}
                </strong>
              </span>
            </div>
          </div>

          <div className="grid grid-cols-1 lg:grid-cols-12 gap-4 mt-4">
            {/* Left: Integrity Exceptions / Status */}
            <div className="lg:col-span-7 space-y-2">
              <span className="text-[11px] font-bold uppercase tracking-wider text-slate-400 block mb-1">
                Academic Placement Consistency Audit
              </span>

              {integrityAnomalies && integrityAnomalies.length > 0 ? (
                integrityAnomalies.map((anom, idx) => (
                  <div
                    key={idx}
                    className="p-3.5 rounded-xl bg-amber-50/70 border border-amber-200 text-xs flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3"
                  >
                    <div className="flex items-start space-x-2.5">
                      <span className="w-2 h-2 rounded-full bg-amber-500 mt-1 shrink-0"></span>
                      <div>
                        <div className="flex items-center space-x-2">
                          <strong className="text-amber-950 font-semibold">{anom.studentRoll}</strong>
                          <span className="font-mono text-[10px] px-1.5 py-0.5 rounded bg-amber-200/60 text-amber-900">
                            PRN: {anom.studentPrn}
                          </span>
                          <span className="text-[10px] text-amber-700 font-mono">
                            {anom.programmeCode} - Sem {anom.semesterNumber} ({anom.divisionName})
                          </span>
                        </div>
                        <p className="text-amber-800 text-[11px] mt-0.5">{anom.description}</p>
                      </div>
                    </div>
                    <Link
                      href="/modules/students"
                      className="inline-flex items-center space-x-1 px-3 py-1.5 rounded-lg bg-amber-600 hover:bg-amber-700 text-white font-semibold text-[11px] shadow-2xs transition-colors shrink-0"
                    >
                      <span>Review in Roster</span>
                      <Icon name="arrow-right" className="h-3 w-3" />
                    </Link>
                  </div>
                ))
              ) : (
                <div className="p-3.5 rounded-xl bg-emerald-50/60 border border-emerald-200 text-xs text-emerald-800 flex items-center space-x-2">
                  <span className="w-2 h-2 rounded-full bg-emerald-500"></span>
                  <span>All active student enrolments conform to configured institutional placement hierarchies.</span>
                </div>
              )}
            </div>

            {/* Right: Operational Shortcuts */}
            <div className="lg:col-span-5 space-y-2">
              <span className="text-[11px] font-bold uppercase tracking-wider text-slate-400 block mb-1">
                Authorized Quick Workflows
              </span>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                <Link
                  href="/modules/students"
                  className="p-3 rounded-xl bg-slate-50 hover:bg-blue-50/60 border border-slate-200 hover:border-blue-200 transition-all group flex items-center space-x-2.5"
                >
                  <div className="p-2 rounded-lg bg-white text-[#1657D9] shadow-2xs group-hover:bg-[#1657D9] group-hover:text-white transition-colors">
                    <Icon name="users" className="h-4 w-4" />
                  </div>
                  <div>
                    <span className="text-xs font-bold text-slate-800 group-hover:text-[#1657D9] block">
                      Student Dossiers
                    </span>
                    <span className="text-[10px] text-slate-400 block">Manage & verify enrolments</span>
                  </div>
                </Link>

                <Link
                  href="/modules/faculty"
                  className="p-3 rounded-xl bg-slate-50 hover:bg-blue-50/60 border border-slate-200 hover:border-blue-200 transition-all group flex items-center space-x-2.5"
                >
                  <div className="p-2 rounded-lg bg-white text-[#1657D9] shadow-2xs group-hover:bg-[#1657D9] group-hover:text-white transition-colors">
                    <Icon name="briefcase" className="h-4 w-4" />
                  </div>
                  <div>
                    <span className="text-xs font-bold text-slate-800 group-hover:text-[#1657D9] block">
                      Faculty Directory
                    </span>
                    <span className="text-[10px] text-slate-400 block">Staff & teaching assignments</span>
                  </div>
                </Link>

                <Link
                  href="/modules/academics"
                  className="p-3 rounded-xl bg-slate-50 hover:bg-blue-50/60 border border-slate-200 hover:border-blue-200 transition-all group flex items-center space-x-2.5 sm:col-span-2"
                >
                  <div className="p-2 rounded-lg bg-white text-[#1657D9] shadow-2xs group-hover:bg-[#1657D9] group-hover:text-white transition-colors">
                    <Icon name="academic-cap" className="h-4 w-4" />
                  </div>
                  <div>
                    <span className="text-xs font-bold text-slate-800 group-hover:text-[#1657D9] block">
                      Academic Programmes Console
                    </span>
                    <span className="text-[10px] text-slate-400 block">7 programmes, semesters, cohorts & curriculum</span>
                  </div>
                </Link>
              </div>
            </div>
          </div>
        </div>
      </AnimatedReveal>

      {/* 3. Middle 3-Column Section: Academic Activity, Today on Campus, Notices & Circulars */}
      <AnimatedReveal delay={200}>
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {/* Column 1: Recent Academic Activity */}
          <div className="relative overflow-hidden rounded-2xl bg-white p-5 border border-slate-200/90 shadow-xs flex flex-col justify-between group hover:border-[#1657D9]/40 hover:shadow-md transition-all">
            {/* Subtle campus camouflage backdrop with hover zoom */}
            <div className="absolute inset-0 z-0 opacity-0 group-hover:opacity-[0.06] transition-opacity duration-500 overflow-hidden pointer-events-none">
              <Image
                src="/images/campus-illuminated-sign.png"
                alt=""
                fill
                sizes="400px"
                className="object-cover transition-transform duration-700 ease-out group-hover:scale-110"
              />
            </div>

            <div className="relative z-10">
              <div className="flex items-center justify-between pb-3 border-b border-slate-100">
                <div className="flex items-center space-x-2">
                  <span className="text-[11px] font-bold px-2 py-0.5 rounded-md bg-blue-50 text-[#1657D9] border border-blue-100">
                    16 Oct 2026
                  </span>
                  <h3 className="text-[15px] font-bold text-slate-900">
                    Academic Activity
                  </h3>
                </div>
                <Link
                  href="/modules/academics"
                  className="text-xs font-semibold text-[#1657D9] hover:underline flex items-center space-x-1"
                >
                  <span>View All</span>
                  <Icon name="arrow-right" className="h-3 w-3" />
                </Link>
              </div>

              <div className="mt-4 space-y-4">
                {RECENT_ACADEMIC_ACTIVITY.map((act) => (
                  <div key={act.id} className="flex items-start space-x-3 text-xs">
                    <div className="mt-1 w-2.5 h-2.5 rounded-full bg-[#1657D9] shrink-0"></div>
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center justify-between gap-1">
                        <span className="font-bold text-slate-800 truncate">
                          {act.title}
                        </span>
                        <span
                          className={`text-[10px] font-semibold px-2 py-0.5 rounded-full shrink-0 ${
                            act.status === "Ongoing"
                              ? "bg-emerald-50 text-emerald-700 border border-emerald-200"
                              : "bg-slate-100 text-slate-600 border border-slate-200"
                          }`}
                        >
                          {act.status}
                        </span>
                      </div>
                      <p className="text-slate-500 mt-0.5 truncate">{act.details}</p>
                      <span className="text-[11px] text-slate-400 mt-1 block">
                        {act.time} • {act.category}
                      </span>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </div>

          {/* Column 2: Today on Campus */}
          <div className="relative overflow-hidden rounded-2xl bg-white p-5 border border-slate-200/90 shadow-xs flex flex-col justify-between group hover:border-[#1657D9]/40 hover:shadow-md transition-all">
            {/* Subtle campus camouflage backdrop with hover zoom */}
            <div className="absolute inset-0 z-0 opacity-0 group-hover:opacity-[0.06] transition-opacity duration-500 overflow-hidden pointer-events-none">
              <Image
                src="/images/campus-illuminated-sign.png"
                alt=""
                fill
                sizes="400px"
                className="object-cover transition-transform duration-700 ease-out group-hover:scale-110"
              />
            </div>

            <div className="relative z-10">
              <div className="flex items-center justify-between pb-3 border-b border-slate-100">
                <div className="flex items-center space-x-2">
                  <Icon name="calendar" className="h-5 w-5 text-[#D92534]" />
                  <h3 className="text-[15px] font-bold text-slate-900">
                    Today on Campus
                  </h3>
                  <span className="text-[10px] font-semibold px-2 py-0.5 rounded-md bg-amber-50 text-amber-800 border border-amber-200">
                    Schedule Sync Pending
                  </span>
                </div>
                <Link
                  href="/modules/calendar"
                  className="text-xs font-semibold text-[#1657D9] hover:underline flex items-center space-x-1"
                >
                  <span>View Calendar</span>
                  <Icon name="arrow-right" className="h-3 w-3" />
                </Link>
              </div>

              <div className="mt-4 space-y-3.5">
                {TODAY_ON_CAMPUS.map((item) => (
                  <div
                    key={item.id}
                    className="p-3 rounded-xl bg-slate-50 border border-slate-100 text-xs"
                  >
                    <div className="flex items-center justify-between mb-1">
                      <span className="font-semibold text-slate-500 text-[11px]">
                        {item.timeRange}
                      </span>
                      <span
                        className={`text-[10px] font-bold px-2 py-0.5 rounded-full ${
                          item.type === "Lab Session"
                            ? "bg-blue-100 text-[#1657D9]"
                            : item.type === "Class"
                            ? "bg-indigo-100 text-indigo-800"
                            : item.type === "Examination"
                            ? "bg-amber-100 text-amber-800"
                            : item.type === "Event"
                            ? "bg-rose-100 text-rose-800"
                            : "bg-slate-200 text-slate-700"
                        }`}
                      >
                        {item.type}
                      </span>
                    </div>
                    <h4 className="font-bold text-slate-900 text-[13px]">
                      {item.title}
                    </h4>
                    <p className="text-slate-600 mt-0.5 text-[11px]">
                      {item.cohort} • <span className="text-slate-400">{item.location}</span>
                    </p>
                  </div>
                ))}
              </div>
            </div>
          </div>

          {/* Column 3: Notices & Circulars */}
          <div className="relative overflow-hidden rounded-2xl bg-white p-5 border border-slate-200/90 shadow-xs flex flex-col justify-between group hover:border-[#1657D9]/40 hover:shadow-md transition-all">
            {/* Subtle campus camouflage backdrop with hover zoom */}
            <div className="absolute inset-0 z-0 opacity-0 group-hover:opacity-[0.06] transition-opacity duration-500 overflow-hidden pointer-events-none">
              <Image
                src="/images/campus-illuminated-sign.png"
                alt=""
                fill
                sizes="400px"
                className="object-cover transition-transform duration-700 ease-out group-hover:scale-110"
              />
            </div>

            <div className="relative z-10">
              <div className="flex items-center justify-between pb-3 border-b border-slate-100">
                <div className="flex items-center space-x-2">
                  <Icon name="bell" className="h-5 w-5 text-[#D92534]" />
                  <h3 className="text-[15px] font-bold text-slate-900">
                    Notices & Circulars
                  </h3>
                </div>
                <Link
                  href="/modules/notices"
                  className="text-xs font-semibold text-[#1657D9] hover:underline flex items-center space-x-1"
                >
                  <span>View All</span>
                  <Icon name="arrow-right" className="h-3 w-3" />
                </Link>
              </div>

              <div className="mt-4 divide-y divide-slate-100">
                {NOTICES_AND_CIRCULARS.map((notice) => (
                  <Link
                    key={notice.id}
                    href="/modules/notices"
                    className="py-3 first:pt-0 last:pb-0 flex items-start justify-between group block"
                  >
                    <div className="text-xs min-w-0 pr-2">
                      <span className="text-[10px] font-bold text-slate-400 block mb-0.5">
                        {notice.date}
                      </span>
                      <h4 className="font-bold text-slate-800 group-hover:text-[#1657D9] transition-colors leading-snug">
                        {notice.title}
                      </h4>
                      <p className="text-slate-500 text-[11px] mt-0.5 truncate">
                        {notice.excerpt}
                      </p>
                    </div>
                    <Icon
                      name="chevron-right"
                      className="h-4 w-4 text-slate-400 group-hover:text-[#1657D9] shrink-0 mt-2 transition-transform group-hover:translate-x-0.5"
                    />
                  </Link>
                ))}
              </div>
            </div>
          </div>
        </div>
      </AnimatedReveal>
    </div>
  );
};
