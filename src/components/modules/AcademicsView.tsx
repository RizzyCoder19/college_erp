"use client";

import React, { useState, useMemo } from "react";
import Link from "next/link";
import Image from "next/image";
import { Icon } from "@/components/common/Icon";
import { AnimatedReveal } from "@/components/common/AnimatedReveal";
import { ACADEMIC_PROGRAMMES, FICTIONAL_USER } from "@/data/mockData";
import { AcademicProgramme } from "@/types/campus";

type DegreeFilter = "all" | "ug" | "diploma" | "certificate";

export const AcademicsView: React.FC = () => {
  const [filter, setFilter] = useState<DegreeFilter>("all");
  const [searchQuery, setSearchQuery] = useState("");
  const [selectedProgramme, setSelectedProgramme] = useState<AcademicProgramme | null>(null);

  const filteredProgrammes = useMemo(() => {
    return ACADEMIC_PROGRAMMES.filter((prog) => {
      const matchesFilter =
        filter === "all"
          ? true
          : filter === "ug"
          ? prog.degreeType.includes("Undergraduate")
          : filter === "diploma"
          ? prog.degreeType.includes("Diploma")
          : prog.degreeType.includes("Certificate");

      const matchesSearch =
        searchQuery.trim() === "" ||
        prog.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
        prog.code.toLowerCase().includes(searchQuery.toLowerCase()) ||
        prog.department.toLowerCase().includes(searchQuery.toLowerCase());

      return matchesFilter && matchesSearch;
    });
  }, [filter, searchQuery]);

  const counts = useMemo(() => {
    const all = ACADEMIC_PROGRAMMES.length;
    const ug = ACADEMIC_PROGRAMMES.filter((p) => p.degreeType.includes("Undergraduate")).length;
    const diploma = ACADEMIC_PROGRAMMES.filter((p) => p.degreeType.includes("Diploma")).length;
    const certificate = ACADEMIC_PROGRAMMES.filter((p) => p.degreeType.includes("Certificate")).length;
    return { all, ug, diploma, certificate };
  }, []);

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
          Academics & Programmes
        </span>
      </nav>

      {/* Header Banner */}
      <AnimatedReveal delay={0}>
        <div className="rounded-2xl bg-white p-6 sm:p-8 border border-slate-200/90 shadow-xs">
          <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
            <div className="flex items-start space-x-4">
              <div className="p-3.5 rounded-2xl bg-blue-50 text-[#1657D9] border border-blue-100 shrink-0">
                <Icon name="academic-cap" className="h-8 w-8" />
              </div>
              <div>
                <div className="flex items-center space-x-2">
                  <span className="text-xs font-bold uppercase tracking-wider text-[#1657D9]">
                    Academic Affairs & Curriculum Office
                  </span>
                  <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-emerald-50 text-emerald-700 border border-emerald-200">
                    Active Session 2026 – 27
                  </span>
                </div>
                <h1 className="text-2xl sm:text-3xl font-extrabold tracking-tight text-slate-900 font-serif mt-1">
                  Academics & Programmes
                </h1>
                <p className="text-sm text-slate-600 mt-1 max-w-2xl leading-relaxed">
                  Management and oversight of degree, diploma, and certification offerings at R. P. Institute of Hospitality & Management.
                </p>
              </div>
            </div>

            <div className="shrink-0 flex items-center space-x-2">
              <Link
                href="/"
                className="inline-flex items-center space-x-2 px-4 py-2 rounded-xl bg-slate-100 hover:bg-slate-200 text-slate-700 text-xs font-semibold transition-all border border-slate-200"
              >
                <Icon name="arrow-left" className="h-4 w-4" />
                <span>Back to Dashboard</span>
              </Link>
            </div>
          </div>

          {/* Quick Metrics Strip */}
          <div className="mt-6 pt-4 border-t border-slate-100 grid grid-cols-2 sm:grid-cols-4 gap-4">
            <div className="bg-slate-50 p-3.5 rounded-xl border border-slate-100">
              <div className="text-[11px] text-slate-500 uppercase tracking-wider font-semibold">
                Total Programmes
              </div>
              <div className="text-xl sm:text-2xl font-extrabold text-[#0F172A] mt-0.5 font-serif">
                {counts.all}
              </div>
            </div>
            <div className="bg-slate-50 p-3.5 rounded-xl border border-slate-100">
              <div className="text-[11px] text-slate-500 uppercase tracking-wider font-semibold">
                Undergraduate (UG)
              </div>
              <div className="text-xl sm:text-2xl font-extrabold text-[#0F172A] mt-0.5 font-serif">
                {counts.ug}
              </div>
            </div>
            <div className="bg-slate-50 p-3.5 rounded-xl border border-slate-100">
              <div className="text-[11px] text-slate-500 uppercase tracking-wider font-semibold">
                Diploma Courses
              </div>
              <div className="text-xl sm:text-2xl font-extrabold text-[#0F172A] mt-0.5 font-serif">
                {counts.diploma}
              </div>
            </div>
            <div className="bg-slate-50 p-3.5 rounded-xl border border-slate-100">
              <div className="text-[11px] text-slate-500 uppercase tracking-wider font-semibold">
                Skill Certificates
              </div>
              <div className="text-xl sm:text-2xl font-extrabold text-[#0F172A] mt-0.5 font-serif">
                {counts.certificate}
              </div>
            </div>
          </div>
        </div>
      </AnimatedReveal>

      {/* Main Two-Column Operational Layout */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
        {/* Left Column: Programme Directory (8 Cols on Desktop) */}
        <div className="lg:col-span-8 space-y-4">
          {/* Controls: Filter Pills & Search Input */}
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 bg-white p-4 rounded-2xl border border-slate-200/90 shadow-2xs">
            {/* Filter Pills */}
            <div className="flex flex-wrap items-center gap-1.5">
              <button
                onClick={() => setFilter("all")}
                className={`px-3 py-1.5 text-xs font-bold rounded-xl transition-all cursor-pointer ${
                  filter === "all"
                    ? "bg-[#1657D9] text-white shadow-xs"
                    : "bg-slate-50 text-slate-600 hover:bg-slate-100 border border-slate-200"
                }`}
              >
                All Programmes ({counts.all})
              </button>
              <button
                onClick={() => setFilter("ug")}
                className={`px-3 py-1.5 text-xs font-bold rounded-xl transition-all cursor-pointer ${
                  filter === "ug"
                    ? "bg-[#1657D9] text-white shadow-xs"
                    : "bg-slate-50 text-slate-600 hover:bg-slate-100 border border-slate-200"
                }`}
              >
                Undergraduate ({counts.ug})
              </button>
              <button
                onClick={() => setFilter("diploma")}
                className={`px-3 py-1.5 text-xs font-bold rounded-xl transition-all cursor-pointer ${
                  filter === "diploma"
                    ? "bg-[#1657D9] text-white shadow-xs"
                    : "bg-slate-50 text-slate-600 hover:bg-slate-100 border border-slate-200"
                }`}
              >
                Diploma ({counts.diploma})
              </button>
              <button
                onClick={() => setFilter("certificate")}
                className={`px-3 py-1.5 text-xs font-bold rounded-xl transition-all cursor-pointer ${
                  filter === "certificate"
                    ? "bg-[#1657D9] text-white shadow-xs"
                    : "bg-slate-50 text-slate-600 hover:bg-slate-100 border border-slate-200"
                }`}
              >
                Certificates ({counts.certificate})
              </button>
            </div>

            {/* Search Input */}
            <div className="relative w-full sm:w-60">
              <Icon
                name="search"
                className="absolute left-3 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-slate-400"
              />
              <input
                type="text"
                placeholder="Search programmes by name or code..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="w-full pl-8 pr-3 py-1.5 text-xs rounded-xl bg-slate-50 border border-slate-200 text-slate-900 placeholder:text-slate-400 focus:outline-none focus:ring-1 focus:ring-[#1657D9]"
              />
            </div>
          </div>

          {/* Programme Cards List */}
          <div className="space-y-3.5">
            {filteredProgrammes.map((prog) => (
              <div
                key={prog.id}
                className="rounded-2xl bg-white p-5 border border-slate-200/90 shadow-2xs hover:border-[#1657D9]/40 hover:shadow-xs transition-all flex flex-col sm:flex-row sm:items-center justify-between gap-4"
              >
                <div className="space-y-1.5">
                  <div className="flex flex-wrap items-center gap-2">
                    <span className="font-mono font-bold text-xs text-[#1657D9] bg-blue-50 px-2 py-0.5 rounded-md border border-blue-100">
                      {prog.code}
                    </span>
                    <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-emerald-50 text-emerald-700 border border-emerald-200 flex items-center gap-1">
                      <span className="w-1.5 h-1.5 rounded-full bg-emerald-500"></span>
                      <span>Active</span>
                    </span>
                    <span className="text-[10px] font-semibold px-2 py-0.5 rounded-full bg-slate-100 text-slate-600">
                      {prog.degreeType}
                    </span>
                  </div>

                  <h3 className="text-base font-bold text-slate-900">
                    {prog.name}
                  </h3>

                  <div className="flex flex-wrap items-center gap-y-1 gap-x-3 text-xs text-slate-500">
                    <span className="flex items-center gap-1">
                      <Icon name="clock" className="h-3.5 w-3.5 text-slate-400" />
                      <span>{prog.duration}</span>
                    </span>
                    <span>•</span>
                    <span className="flex items-center gap-1">
                      <Icon name="academic-cap" className="h-3.5 w-3.5 text-slate-400" />
                      <span>{prog.department}</span>
                    </span>
                    <span>•</span>
                    <span className="text-slate-600 font-medium">
                      {prog.affiliatedBody}
                    </span>
                  </div>
                </div>

                <div className="flex sm:flex-col items-center sm:items-end justify-between sm:justify-center gap-2 pt-2 sm:pt-0 border-t sm:border-t-0 border-slate-100">
                  <div className="text-left sm:text-right">
                    <div className="text-xs font-bold text-slate-800">
                      {prog.currentEnrollment} Enrolled
                    </div>
                    <div className="text-[10px] text-slate-400">
                      Cohort 2026–27
                    </div>
                  </div>

                  <button
                    onClick={() => setSelectedProgramme(prog)}
                    className="px-3 py-1.5 text-xs font-semibold text-[#1657D9] hover:text-white bg-blue-50 hover:bg-[#1657D9] rounded-xl border border-blue-200 transition-colors cursor-pointer shrink-0"
                  >
                    View Details
                  </button>
                </div>
              </div>
            ))}

            {filteredProgrammes.length === 0 && (
              <div className="bg-white rounded-2xl p-8 text-center border border-slate-200 text-slate-500 text-xs">
                No programmes match &quot;{searchQuery}&quot; under the selected filter.
              </div>
            )}
          </div>
        </div>

        {/* Right Column: Institutional Overview & Accreditation (4 Cols on Desktop) */}
        <div className="lg:col-span-4 space-y-6">
          {/* Programme Overview Card matching reference image */}
          <div className="rounded-2xl bg-white border border-slate-200/90 shadow-2xs overflow-hidden">
            <div className="relative h-40 bg-slate-900">
              <Image
                src="/images/reference-hero.png"
                alt="RPIHM Campus Faculty & Facilities"
                fill
                sizes="(max-width: 1024px) 100vw, 33vw"
                className="object-cover opacity-90"
              />
              <div className="absolute inset-0 bg-gradient-to-t from-[#0B1528] via-[#0B1528]/40 to-transparent"></div>
              <div className="absolute bottom-3 left-4 right-4 text-white">
                <span className="text-[10px] font-bold uppercase tracking-wider text-amber-200">
                  Institutional Framework
                </span>
                <h4 className="text-sm font-bold text-white font-serif">
                  University of Mumbai Scheme
                </h4>
              </div>
            </div>

            <div className="p-5 space-y-4 text-xs">
              <div>
                <span className="text-[11px] font-bold text-slate-400 uppercase tracking-wider block mb-1">
                  Department Leadership
                </span>
                <div className="flex items-center space-x-2.5">
                  <div className="w-8 h-8 rounded-full bg-[#1657D9] text-white font-bold flex items-center justify-center text-xs shrink-0 shadow-2xs">
                    KS
                  </div>
                  <div>
                    <div className="font-bold text-slate-800">
                      {FICTIONAL_USER.name}
                    </div>
                    <div className="text-[11px] text-slate-500">
                      {FICTIONAL_USER.designation}
                    </div>
                  </div>
                </div>
              </div>

              <div className="pt-3 border-t border-slate-100">
                <span className="text-[11px] font-bold text-slate-400 uppercase tracking-wider block mb-1">
                  Affiliation & Approvals
                </span>
                <p className="text-slate-600 leading-relaxed text-[11px]">
                  All degree programmes are conducted under the academic statutes of <strong>University of Mumbai</strong>. Diploma courses adhere to Directorate of Technical Education (DTE) guidelines and MSBTE norms.
                </p>
              </div>

              <div className="pt-3 border-t border-slate-100">
                <span className="text-[11px] font-bold text-slate-400 uppercase tracking-wider block mb-2">
                  Academic Documentation
                </span>
                <div className="space-y-2">
                  <button
                    onClick={() =>
                      alert("Simulated Action: Downloading official 2026–27 Academic Syllabus Handbook (PDF).")
                    }
                    className="w-full flex items-center justify-between p-2.5 rounded-xl bg-slate-50 hover:bg-blue-50 text-slate-700 hover:text-[#1657D9] border border-slate-200 transition-colors text-left cursor-pointer"
                  >
                    <span className="font-semibold text-xs flex items-center gap-1.5">
                      <Icon name="document-text" className="h-4 w-4 text-[#1657D9]" />
                      <span>Syllabus Handbook (PDF)</span>
                    </span>
                    <Icon name="arrow-right" className="h-3 w-3 text-slate-400" />
                  </button>

                  <button
                    onClick={() =>
                      alert("Simulated Action: Opening RPIHM Examination & Assessment Scheme Regulations.")
                    }
                    className="w-full flex items-center justify-between p-2.5 rounded-xl bg-slate-50 hover:bg-blue-50 text-slate-700 hover:text-[#1657D9] border border-slate-200 transition-colors text-left cursor-pointer"
                  >
                    <span className="font-semibold text-xs flex items-center gap-1.5">
                      <Icon name="calendar" className="h-4 w-4 text-[#D92534]" />
                      <span>Exam Scheme Regulations</span>
                    </span>
                    <Icon name="arrow-right" className="h-3 w-3 text-slate-400" />
                  </button>
                </div>
              </div>
            </div>
          </div>

          {/* Sample Data Disclosure */}
          <div className="rounded-xl bg-slate-50 border border-slate-200 p-3.5 text-xs text-slate-500 text-center">
            Sample institutional records for administrative demonstration • Academic Year 2026 – 27
          </div>
        </div>
      </div>

      {/* Programme Details Modal (Simulated Inspection) */}
      {selectedProgramme && (
        <div
          role="dialog"
          aria-modal="true"
          className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/50 backdrop-blur-xs"
        >
          <div className="bg-white rounded-2xl max-w-lg w-full p-6 border border-slate-200 shadow-xl space-y-4 animate-in fade-in zoom-in-95 duration-200">
            <div className="flex items-start justify-between">
              <div>
                <span className="font-mono text-xs font-bold text-[#1657D9] bg-blue-50 px-2 py-0.5 rounded-md border border-blue-100">
                  {selectedProgramme.code}
                </span>
                <h3 className="text-lg font-bold text-slate-900 mt-1">
                  {selectedProgramme.name}
                </h3>
                <p className="text-xs text-slate-500">
                  {selectedProgramme.department} • {selectedProgramme.duration}
                </p>
              </div>

              <button
                onClick={() => setSelectedProgramme(null)}
                className="p-1 rounded-lg text-slate-400 hover:text-slate-600 hover:bg-slate-100 cursor-pointer"
              >
                <Icon name="x" className="h-5 w-5" />
              </button>
            </div>

            <div className="space-y-3 text-xs text-slate-600 bg-slate-50 p-4 rounded-xl border border-slate-100">
              <div className="flex justify-between py-1 border-b border-slate-200/60">
                <span className="text-slate-500">Degree Classification:</span>
                <span className="font-semibold text-slate-800">{selectedProgramme.degreeType}</span>
              </div>
              <div className="flex justify-between py-1 border-b border-slate-200/60">
                <span className="text-slate-500">Affiliated University:</span>
                <span className="font-semibold text-slate-800">{selectedProgramme.affiliatedBody}</span>
              </div>
              <div className="flex justify-between py-1 border-b border-slate-200/60">
                <span className="text-slate-500">Active Enrollment:</span>
                <span className="font-semibold text-slate-800">{selectedProgramme.currentEnrollment} Students</span>
              </div>
              <div className="flex justify-between py-1">
                <span className="text-slate-500">Curriculum Scheme:</span>
                <span className="font-semibold text-slate-800">Choice Based Credit System (CBCS)</span>
              </div>
            </div>

            <div className="flex justify-end gap-2 pt-2">
              <button
                onClick={() => setSelectedProgramme(null)}
                className="px-4 py-2 text-xs font-semibold rounded-xl bg-slate-100 text-slate-700 hover:bg-slate-200 cursor-pointer"
              >
                Close
              </button>
              <button
                onClick={() => {
                  alert(`Simulated Action: Opening curriculum modules for ${selectedProgramme.name}.`);
                  setSelectedProgramme(null);
                }}
                className="px-4 py-2 text-xs font-semibold rounded-xl bg-[#1657D9] text-white hover:bg-blue-700 cursor-pointer"
              >
                Open Syllabus Dossier
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
