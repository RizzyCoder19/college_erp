"use client";

import React, { useState, useEffect, useRef, useCallback } from "react";
import Link from "next/link";
import { Icon } from "@/components/common/Icon";
import { MODULES_LIST, ACADEMIC_PROGRAMMES } from "@/data/mockData";

interface GlobalSearchModalProps {
  isOpen: boolean;
  onClose: () => void;
}

export const GlobalSearchModal: React.FC<GlobalSearchModalProps> = ({
  isOpen,
  onClose,
}) => {
  const [query, setQuery] = useState("");
  const inputRef = useRef<HTMLInputElement>(null);

  const handleClose = useCallback(() => {
    setQuery("");
    onClose();
  }, [onClose]);

  useEffect(() => {
    if (isOpen) {
      const timer = setTimeout(() => inputRef.current?.focus(), 50);
      return () => clearTimeout(timer);
    }
  }, [isOpen]);

  // Handle escape key
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === "Escape" && isOpen) {
        handleClose();
      }
    };
    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [isOpen, handleClose]);

  if (!isOpen) return null;

  // Filter modules
  const matchingModules = MODULES_LIST.filter(
    (m) =>
      m.title.toLowerCase().includes(query.toLowerCase()) ||
      m.department.toLowerCase().includes(query.toLowerCase()) ||
      m.description.toLowerCase().includes(query.toLowerCase())
  );

  // Filter academic programmes
  const matchingProgrammes = ACADEMIC_PROGRAMMES.filter(
    (p) =>
      p.name.toLowerCase().includes(query.toLowerCase()) ||
      p.code.toLowerCase().includes(query.toLowerCase()) ||
      p.department.toLowerCase().includes(query.toLowerCase())
  );

  // Fictional demonstration people (Students & Faculty)
  const fictionalPeople = [
    { name: "Chef Vikramaditya Kapoor", role: "Executive Chef Instructor • Continental Kitchen", id: "FAC-012" },
    { name: "Dr. Rajesh V. Nair", role: "Professor & HOD • Information Technology", id: "FAC-031" },
    { name: "Prof. Snehal Kulkarni", role: "Assistant Professor • Data Science & AI", id: "FAC-045" },
    { name: "Prof. Sneha Pillai", role: "Associate Professor & HOD • Food & Beverage Service", id: "FAC-024" },
    { name: "Aarav Sharma", role: "Student • B.Sc. Data Science with AI (FY)", id: "2026DS041" },
    { name: "Nandini Swaminathan", role: "Student • B.Sc. Hospitality Studies (FY)", id: "2026HS088" },
    { name: "Rohan K. Verma", role: "Student • B.Sc. Information Technology (SY)", id: "2025IT112" },
  ].filter(
    (p) =>
      p.name.toLowerCase().includes(query.toLowerCase()) ||
      p.role.toLowerCase().includes(query.toLowerCase()) ||
      p.id.toLowerCase().includes(query.toLowerCase())
  );

  return (
    <div
      className="fixed inset-0 z-50 flex items-start justify-center p-4 sm:p-6 md:p-20 bg-slate-900/60 backdrop-blur-xs transition-opacity"
      onClick={handleClose}
      role="dialog"
      aria-modal="true"
      aria-labelledby="global-search-title"
    >
      <div
        className="relative w-full max-w-2xl overflow-hidden rounded-2xl bg-white shadow-2xl ring-1 ring-slate-900/10 border border-slate-200"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Search Input Bar with Glowing Active Ring */}
        <div className="flex items-center border-b border-slate-200 px-4 py-3.5 bg-slate-50">
          <Icon name="search" className="h-5 w-5 text-[#1657D9] mr-3 shrink-0" />
          <input
            ref={inputRef}
            id="global-search-title"
            type="text"
            className="w-full bg-transparent text-slate-900 placeholder:text-slate-400 focus:outline-none text-base"
            placeholder="Type to search programmes, students, faculty, or modules (e.g. 'Data Science', 'Bakery', 'Fees')..."
            value={query}
            onChange={(e) => setQuery(e.target.value)}
          />
          <button
            onClick={handleClose}
            className="rounded-lg p-1.5 text-slate-400 hover:bg-slate-200 hover:text-slate-700 cursor-pointer"
            aria-label="Close search"
          >
            <Icon name="x-mark" className="h-5 w-5" />
          </button>
        </div>

        {/* Results Area */}
        <div className="max-h-[60vh] overflow-y-auto p-4 space-y-4 text-xs">
          {/* Institutional Note */}
          <div className="text-[11px] text-slate-500 bg-blue-50/60 p-2.5 rounded-lg border border-blue-100 flex items-center justify-between">
            <span>RPIHM Instant Institutional Search</span>
            <span className="font-mono text-[10px] bg-white px-2 py-0.5 rounded border border-slate-200">
              ESC to close
            </span>
          </div>

          {/* Academic Programmes */}
          {matchingProgrammes.length > 0 && (
            <div>
              <div className="text-[11px] font-bold uppercase tracking-wider text-slate-400 mb-2 px-2">
                Programmes (Technology & Hospitality)
              </div>
              <div className="space-y-1">
                {matchingProgrammes.map((p) => (
                  <Link
                    key={p.id}
                    href="/modules/academics"
                    onClick={handleClose}
                    className="flex items-center justify-between rounded-xl p-2.5 hover:bg-slate-50 transition-colors border border-transparent hover:border-slate-200 group"
                  >
                    <div className="flex items-center space-x-3">
                      <div className="p-2 rounded-lg bg-blue-50 text-[#1657D9] border border-blue-100">
                        <Icon name="academic-cap" className="h-4 w-4" />
                      </div>
                      <div>
                        <div className="text-sm font-bold text-slate-900 group-hover:text-[#1657D9]">
                          {p.name}
                        </div>
                        <div className="text-[11px] text-slate-500">
                          {p.department} • {p.duration} ({p.currentEnrollment} students)
                        </div>
                      </div>
                    </div>
                    <span className="text-[11px] font-mono text-slate-400 group-hover:text-[#1657D9]">
                      {p.code}
                    </span>
                  </Link>
                ))}
              </div>
            </div>
          )}

          {/* Modules Section */}
          {matchingModules.length > 0 && (
            <div>
              <div className="text-[11px] font-bold uppercase tracking-wider text-slate-400 mb-2 px-2">
                Core Modules
              </div>
              <div className="space-y-1">
                {matchingModules.map((m) => (
                  <Link
                    key={m.slug}
                    href={`/modules/${m.slug}`}
                    onClick={handleClose}
                    className="flex items-center justify-between rounded-xl p-2.5 hover:bg-slate-50 transition-colors border border-transparent hover:border-slate-200 group"
                  >
                    <div className="flex items-center space-x-3">
                      <div className="p-2 rounded-lg bg-slate-100 text-[#1657D9]">
                        <Icon name={m.icon} className="h-4 w-4" />
                      </div>
                      <div>
                        <div className="text-sm font-bold text-slate-900 group-hover:text-[#1657D9]">
                          {m.title}
                        </div>
                        <div className="text-[11px] text-slate-500">{m.department}</div>
                      </div>
                    </div>
                    <span className="text-[11px] text-[#1657D9] bg-blue-50 px-2 py-0.5 rounded-full border border-blue-100">
                      Open Module →
                    </span>
                  </Link>
                ))}
              </div>
            </div>
          )}

          {/* Fictional Demonstration People */}
          {fictionalPeople.length > 0 && (
            <div>
              <div className="text-[11px] font-bold uppercase tracking-wider text-slate-400 mb-2 px-2">
                Faculty & Students Directory
              </div>
              <div className="space-y-1">
                {fictionalPeople.map((p) => (
                  <div
                    key={p.id}
                    className="flex items-center justify-between rounded-xl p-2.5 hover:bg-slate-50 transition-colors cursor-default"
                  >
                    <div className="flex items-center space-x-3">
                      <div className="w-8 h-8 rounded-full bg-slate-200 flex items-center justify-center font-bold text-xs text-slate-700">
                        {p.name.charAt(0)}
                      </div>
                      <div>
                        <div className="text-sm font-medium text-slate-900">
                          {p.name}
                        </div>
                        <div className="text-[11px] text-slate-500">{p.role}</div>
                      </div>
                    </div>
                    <span className="text-[11px] font-mono text-slate-400">{p.id}</span>
                  </div>
                ))}
              </div>
            </div>
          )}

          {matchingModules.length === 0 && matchingProgrammes.length === 0 && fictionalPeople.length === 0 && (
            <div className="py-12 text-center text-slate-500">
              <Icon name="search" className="mx-auto h-8 w-8 text-slate-300 mb-2" />
              <p className="text-sm font-medium text-slate-700">
                No matching records found for &quot;{query}&quot;
              </p>
              <p className="text-xs text-slate-400 mt-1">
                Try searching for &quot;Data Science&quot;, &quot;Culinary&quot;, &quot;Examinations&quot;, or &quot;Faculty&quot;.
              </p>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};
