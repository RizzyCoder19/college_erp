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

export const ExecutiveOverview: React.FC = () => {
  return (
    <div className="space-y-6">
      {/* 1. Welcome Hero Banner with Real Campus Photography */}
      <AnimatedReveal delay={0}>
        <div className="relative overflow-hidden rounded-2xl bg-white border border-slate-200/90 shadow-xs">
          <div className="grid grid-cols-1 lg:grid-cols-12 min-h-[220px]">
            {/* Left Hero Content */}
            <div className="lg:col-span-7 p-6 sm:p-8 flex flex-col justify-between z-10 bg-white">
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
                  href="/modules/admissions"
                  className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full text-xs font-semibold bg-slate-50 hover:bg-blue-50 text-slate-700 hover:text-[#1657D9] border border-slate-200 hover:border-blue-200 shadow-2xs transition-all cursor-pointer"
                >
                  <Icon name="users" className="h-3.5 w-3.5 text-[#1657D9]" />
                  <span>Admissions</span>
                </Link>

                <Link
                  href="/modules/academics"
                  className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full text-xs font-semibold bg-slate-50 hover:bg-blue-50 text-slate-700 hover:text-[#1657D9] border border-slate-200 hover:border-blue-200 shadow-2xs transition-all cursor-pointer"
                >
                  <Icon name="academic-cap" className="h-3.5 w-3.5 text-[#1657D9]" />
                  <span>Academics</span>
                </Link>

                <Link
                  href="/modules/faculty"
                  className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full text-xs font-semibold bg-slate-50 hover:bg-blue-50 text-slate-700 hover:text-[#1657D9] border border-slate-200 hover:border-blue-200 shadow-2xs transition-all cursor-pointer"
                >
                  <Icon name="briefcase" className="h-3.5 w-3.5 text-[#1657D9]" />
                  <span>Faculty & Staff</span>
                </Link>

                <Link
                  href="/modules/examinations"
                  className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full text-xs font-semibold bg-slate-50 hover:bg-blue-50 text-slate-700 hover:text-[#1657D9] border border-slate-200 hover:border-blue-200 shadow-2xs transition-all cursor-pointer"
                >
                  <Icon name="document-text" className="h-3.5 w-3.5 text-[#1657D9]" />
                  <span>Examinations</span>
                </Link>

                <Link
                  href="/modules/placements"
                  className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full text-xs font-semibold bg-slate-50 hover:bg-blue-50 text-slate-700 hover:text-[#1657D9] border border-slate-200 hover:border-blue-200 shadow-2xs transition-all cursor-pointer"
                >
                  <Icon name="award" className="h-3.5 w-3.5 text-[#1657D9]" />
                  <span>Placements</span>
                </Link>
              </div>
            </div>

            {/* Right Hero Image & Mottos (Featuring authentic RPIHM Campus Walkway & Students) */}
            <div className="lg:col-span-5 relative min-h-[220px] lg:min-h-full bg-slate-900 overflow-hidden group">
              <Image
                src="/images/campus-walkway.png"
                alt="R. P. Institute of Hospitality & Management Campus Walkway with Students & Faculty"
                fill
                sizes="(max-width: 1024px) 100vw, 42vw"
                className="object-cover object-center opacity-95 transition-transform duration-700 ease-out group-hover:scale-105"
                priority
              />

              {/* Gradient Overlays for smooth institutional blending */}
              <div className="absolute inset-0 bg-gradient-to-r from-white via-white/30 to-transparent hidden lg:block w-24 z-10 pointer-events-none"></div>
              <div className="absolute inset-0 bg-gradient-to-t from-[#0B1528]/85 via-[#0B1528]/30 to-transparent pointer-events-none"></div>

              <div className="absolute inset-0 p-5 sm:p-6 flex flex-col justify-between items-end text-right z-10 pointer-events-none">
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
        </div>
      </AnimatedReveal>

      {/* 2. Concise Row of Readable Summary Metrics (4 cards matching reference) */}
      <AnimatedReveal delay={100}>
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
          {EXECUTIVE_METRICS.map((metric, idx) => (
            <div
              key={metric.id}
              style={{ transitionDelay: `${idx * 60}ms` }}
              className="rounded-2xl bg-white p-5 border border-slate-200/90 shadow-xs hover:border-[#1657D9]/40 hover:shadow-md transition-all flex flex-col justify-between"
            >
              <div className="flex items-start justify-between">
                <div>
                  <span className="text-xs font-semibold text-slate-500 block">
                    {metric.label}
                  </span>
                  <div className="mt-2 text-2xl sm:text-3xl font-extrabold text-[#0F172A] tracking-tight">
                    {metric.value}
                  </div>
                </div>

                <div className="p-2.5 rounded-xl bg-blue-50 text-[#1657D9] border border-blue-100">
                  <Icon name={metric.icon} className="h-5 w-5" />
                </div>
              </div>

              <div className="mt-3 pt-2.5 border-t border-slate-100 text-xs text-slate-500">
                {metric.caption}
              </div>
            </div>
          ))}
        </div>
      </AnimatedReveal>

      {/* 3. Middle 3-Column Section: Academic Activity, Today on Campus, Notices & Circulars */}
      <AnimatedReveal delay={200}>
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {/* Column 1: Recent Academic Activity */}
          <div className="rounded-2xl bg-white p-5 border border-slate-200/90 shadow-xs flex flex-col justify-between">
            <div>
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
          <div className="rounded-2xl bg-white p-5 border border-slate-200/90 shadow-xs flex flex-col justify-between">
            <div>
              <div className="flex items-center justify-between pb-3 border-b border-slate-100">
                <div className="flex items-center space-x-2">
                  <Icon name="calendar" className="h-5 w-5 text-[#D92534]" />
                  <h3 className="text-[15px] font-bold text-slate-900">
                    Today on Campus
                  </h3>
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
          <div className="rounded-2xl bg-white p-5 border border-slate-200/90 shadow-xs flex flex-col justify-between">
            <div>
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
