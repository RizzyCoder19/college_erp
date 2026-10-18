"use client";

import React, { useState, useEffect, useRef, useCallback, useMemo } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { Icon } from "@/components/common/Icon";
import { MODULES_LIST, ACADEMIC_PROGRAMMES } from "@/data/mockData";
import { AcademicProgramme, ModuleData } from "@/types/campus";

interface GlobalSearchModalProps {
  isOpen: boolean;
  onClose: () => void;
}

export const GlobalSearchModal: React.FC<GlobalSearchModalProps> = ({
  isOpen,
  onClose,
}) => {
  const [query, setQuery] = useState("");
  const [selectedIndex, setSelectedIndex] = useState(0);
  const inputRef = useRef<HTMLInputElement>(null);
  const router = useRouter();

  const handleClose = useCallback(() => {
    setQuery("");
    setSelectedIndex(0);
    onClose();
  }, [onClose]);

  useEffect(() => {
    if (isOpen) {
      const timer = setTimeout(() => inputRef.current?.focus(), 50);
      document.body.style.overflow = "hidden";
      return () => {
        clearTimeout(timer);
        document.body.style.overflow = "unset";
      };
    }
  }, [isOpen]);

interface PersonnelItem {
  name: string;
  role: string;
  id: string;
}

  // Filter modules
  const matchingModules = useMemo(() => {
    return MODULES_LIST.filter(
      (m: ModuleData) =>
        m.title.toLowerCase().includes(query.toLowerCase()) ||
        m.department.toLowerCase().includes(query.toLowerCase()) ||
        m.description.toLowerCase().includes(query.toLowerCase())
    );
  }, [query]);

  // Filter academic programmes
  const matchingProgrammes = useMemo(() => {
    return ACADEMIC_PROGRAMMES.filter(
      (p: AcademicProgramme) =>
        p.name.toLowerCase().includes(query.toLowerCase()) ||
        p.code.toLowerCase().includes(query.toLowerCase()) ||
        p.department.toLowerCase().includes(query.toLowerCase())
    );
  }, [query]);

  // Institutional personnel (Students & Faculty)
  const matchingPersonnel = useMemo<PersonnelItem[]>(() => {
    const list: PersonnelItem[] = [
      { name: "Chef Vikramaditya Kapoor", role: "Executive Chef Instructor • Continental Kitchen", id: "FAC-012" },
      { name: "Dr. Rajesh V. Nair", role: "Professor & HOD • Information Technology", id: "FAC-031" },
      { name: "Prof. Snehal Kulkarni", role: "Assistant Professor • Data Science & AI", id: "FAC-045" },
      { name: "Prof. Sneha Pillai", role: "Associate Professor & HOD • Food & Beverage Service", id: "FAC-024" },
      { name: "Aarav Sharma", role: "Student • B.Sc. Data Science with AI (FY)", id: "2026DS041" },
      { name: "Nandini Swaminathan", role: "Student • B.Sc. Hospitality Studies (FY)", id: "2026HS088" },
      { name: "Rohan K. Verma", role: "Student • B.Sc. Information Technology (SY)", id: "2025IT112" },
    ];
    return list.filter(
      (p: PersonnelItem) =>
        p.name.toLowerCase().includes(query.toLowerCase()) ||
        p.role.toLowerCase().includes(query.toLowerCase()) ||
        p.id.toLowerCase().includes(query.toLowerCase())
    );
  }, [query]);

  // Flatten actionable items for keyboard navigation
  const actionableItems = useMemo(() => {
    return [
      ...matchingProgrammes.map((p: AcademicProgramme) => ({ type: "programme" as const, href: "/modules/academics", id: p.id })),
      ...matchingModules.map((m: ModuleData) => ({ type: "module" as const, href: `/modules/${m.slug}`, id: m.slug })),
    ];
  }, [matchingProgrammes, matchingModules]);

  // Handle keyboard navigation: Escape, ArrowDown, ArrowUp, Enter
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (!isOpen) return;

      if (e.key === "Escape") {
        e.preventDefault();
        handleClose();
      } else if (e.key === "ArrowDown") {
        e.preventDefault();
        setSelectedIndex((prev) => (actionableItems.length > 0 ? (prev + 1) % actionableItems.length : 0));
      } else if (e.key === "ArrowUp") {
        e.preventDefault();
        setSelectedIndex((prev) => (actionableItems.length > 0 ? (prev - 1 + actionableItems.length) % actionableItems.length : 0));
      } else if (e.key === "Enter") {
        if (actionableItems.length > 0 && actionableItems[selectedIndex]) {
          e.preventDefault();
          const target = actionableItems[selectedIndex];
          handleClose();
          router.push(target.href);
        }
      }
    };
    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [isOpen, handleClose, actionableItems, selectedIndex, router]);

  if (!isOpen) return null;

  return (
    <div
      className="fixed inset-0 z-50 flex items-start justify-center p-4 sm:p-6 md:p-20 bg-slate-900/60 backdrop-blur-xs transition-opacity"
      onClick={handleClose}
      role="dialog"
      aria-modal="true"
      aria-label="Institutional Search"
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
            id="global-search-input"
            type="text"
            className="w-full bg-transparent text-slate-900 placeholder:text-slate-400 focus:outline-none text-base"
            placeholder="Search students, faculty, programmes, schedules, notices…"
            value={query}
            onChange={(e) => {
              setQuery(e.target.value);
              setSelectedIndex(0);
            }}
            aria-label="Search students, faculty, programmes, schedules, notices"
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
          {/* Institutional Note & Keyboard Hint */}
          <div className="text-[11px] text-slate-500 bg-blue-50/60 p-2.5 rounded-lg border border-blue-100 flex items-center justify-between">
            <span>RPIHM Instant Institutional Search</span>
            <div className="flex items-center space-x-2">
              <span className="font-mono text-[10px] bg-white px-2 py-0.5 rounded border border-slate-200">
                ↑↓ to navigate
              </span>
              <span className="font-mono text-[10px] bg-white px-2 py-0.5 rounded border border-slate-200">
                ↵ to select
              </span>
              <span className="font-mono text-[10px] bg-white px-2 py-0.5 rounded border border-slate-200">
                ESC to close
              </span>
            </div>
          </div>

          {/* Academic Programmes */}
          {matchingProgrammes.length > 0 && (
            <div>
              <div className="text-[11px] font-bold uppercase tracking-wider text-slate-400 mb-2 px-2">
                Programmes (Technology & Hospitality)
              </div>
              <div className="space-y-1">
                {matchingProgrammes.map((p: AcademicProgramme, pIdx: number) => {
                  const isSelected = selectedIndex === pIdx;
                  return (
                    <Link
                      key={p.id}
                      href="/modules/academics"
                      onClick={handleClose}
                      className={`flex items-center justify-between rounded-xl p-2.5 transition-colors border ${
                        isSelected
                          ? "bg-blue-50/80 border-[#1657D9]/40 text-[#1657D9]"
                          : "hover:bg-slate-50 border-transparent hover:border-slate-200"
                      } group`}
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
                  );
                })}
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
                {matchingModules.map((m: ModuleData, mIdx: number) => {
                  const globalIdx = matchingProgrammes.length + mIdx;
                  const isSelected = selectedIndex === globalIdx;
                  return (
                    <Link
                      key={m.slug}
                      href={`/modules/${m.slug}`}
                      onClick={handleClose}
                      className={`flex items-center justify-between rounded-xl p-2.5 transition-colors border ${
                        isSelected
                          ? "bg-blue-50/80 border-[#1657D9]/40 text-[#1657D9]"
                          : "hover:bg-slate-50 border-transparent hover:border-slate-200"
                      } group`}
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
                  );
                })}
              </div>
            </div>
          )}

          {/* Institutional Personnel Directory */}
          {matchingPersonnel.length > 0 && (
            <div>
              <div className="text-[11px] font-bold uppercase tracking-wider text-slate-400 mb-2 px-2">
                Faculty & Students Directory
              </div>
              <div className="space-y-1">
                {matchingPersonnel.map((p: PersonnelItem) => (
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

          {matchingModules.length === 0 && matchingProgrammes.length === 0 && matchingPersonnel.length === 0 && (
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
