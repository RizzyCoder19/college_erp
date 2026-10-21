"use client";

import React, { useState, useEffect, useRef, useCallback, useMemo } from "react";
import Link from "next/link";
import Image from "next/image";
import { useRouter } from "next/navigation";
import { Icon } from "@/components/common/Icon";
import { MODULES_LIST } from "@/data/mockData";
import { ModuleData } from "@/types/campus";
import {
  unifiedGlobalSearchAction,
  SearchStudentResult,
  SearchFacultyResult,
  SearchProgrammeResult,
} from "@/lib/actions/search";

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
  const [isLoading, setIsLoading] = useState(false);
  const [serverError, setServerError] = useState<string | null>(null);

  const [dbStudents, setDbStudents] = useState<SearchStudentResult[]>([]);
  const [dbFaculty, setDbFaculty] = useState<SearchFacultyResult[]>([]);
  const [dbProgrammes, setDbProgrammes] = useState<SearchProgrammeResult[]>([]);

  const inputRef = useRef<HTMLInputElement>(null);
  const router = useRouter();

  const handleClose = useCallback(() => {
    setQuery("");
    setSelectedIndex(0);
    setDbStudents([]);
    setDbFaculty([]);
    setDbProgrammes([]);
    setServerError(null);
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

  // Live Database Search with Debounce
  useEffect(() => {
    const trimmed = query.trim();
    if (!trimmed) {
      setDbStudents([]);
      setDbFaculty([]);
      setDbProgrammes([]);
      setIsLoading(false);
      setServerError(null);
      return;
    }

    setIsLoading(true);
    setServerError(null);

    const timer = setTimeout(async () => {
      try {
        const res = await unifiedGlobalSearchAction(trimmed);
        if (res.success && res.data) {
          setDbStudents(res.data.students);
          setDbFaculty(res.data.faculty);
          setDbProgrammes(res.data.programmes);
        } else {
          setServerError(res.error || "Search error");
        }
      } catch (err) {
        setServerError(err instanceof Error ? err.message : "Search failed");
      } finally {
        setIsLoading(false);
      }
    }, 200);

    return () => clearTimeout(timer);
  }, [query]);

  // Filter modules client-side
  const matchingModules = useMemo(() => {
    if (!query.trim()) return [];
    return MODULES_LIST.filter(
      (m: ModuleData) =>
        m.title.toLowerCase().includes(query.toLowerCase()) ||
        m.department.toLowerCase().includes(query.toLowerCase()) ||
        m.description.toLowerCase().includes(query.toLowerCase())
    );
  }, [query]);

  // Actionable items for keyboard navigation (Ordered: Students -> Faculty -> Programmes -> Modules)
  const actionableItems = useMemo(() => {
    return [
      ...dbStudents.map((s) => ({
        type: "student" as const,
        href: `/modules/students?studentId=${s.id}&prn=${encodeURIComponent(s.prn)}`,
        id: s.id,
      })),
      ...dbFaculty.map((f) => ({
        type: "faculty" as const,
        href: `/modules/faculty?staffId=${f.id}&employeeId=${encodeURIComponent(f.employeeId)}`,
        id: f.id,
      })),
      ...dbProgrammes.map((p) => ({
        type: "programme" as const,
        href: "/modules/academics",
        id: p.id,
      })),
      ...matchingModules.map((m) => ({
        type: "module" as const,
        href: `/modules/${m.slug}`,
        id: m.slug,
      })),
    ];
  }, [dbStudents, dbFaculty, dbProgrammes, matchingModules]);

  // Keyboard navigation
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

  const totalResults = dbStudents.length + dbFaculty.length + dbProgrammes.length + matchingModules.length;

  return (
    <div
      className="fixed inset-0 z-50 flex items-start justify-center p-4 sm:p-6 md:p-20 bg-slate-900/60 backdrop-blur-xs transition-opacity"
      onClick={handleClose}
      role="dialog"
      aria-modal="true"
      aria-label="Institutional Search"
    >
      <div
        className="relative w-full max-w-2xl overflow-hidden rounded-2xl bg-white shadow-2xl ring-1 ring-slate-900/10 border border-slate-200 group hover:border-[#1657D9]/40 transition-all"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Subtle campus camouflage backdrop with hover zoom */}
        <div className="absolute inset-0 z-0 opacity-0 group-hover:opacity-[0.04] transition-opacity duration-500 overflow-hidden pointer-events-none">
          <Image
            src="/images/campus-illuminated-sign.png"
            alt=""
            fill
            sizes="700px"
            className="object-cover transition-transform duration-700 ease-out group-hover:scale-108"
          />
        </div>

        {/* Search Input Bar with Glowing Active Ring */}
        <div className="relative z-10 flex items-center border-b border-slate-200 px-4 py-3.5 bg-slate-50/90 backdrop-blur-xs">
          <Icon name="search" className="h-5 w-5 text-[#1657D9] mr-3 shrink-0" />
          <input
            ref={inputRef}
            id="global-search-input"
            type="text"
            className="w-full bg-transparent text-slate-900 placeholder:text-slate-400 focus:outline-none text-base"
            placeholder="Search students (name, PRN, roll), faculty, programmes, modules..."
            value={query}
            onChange={(e) => {
              setQuery(e.target.value);
              setSelectedIndex(0);
            }}
            aria-label="Search students, faculty, programmes, modules"
          />
          {isLoading && (
            <span className="mr-2 inline-flex items-center text-xs text-[#1657D9]">
              <Icon name="arrow-path" className="h-4 w-4 animate-spin" />
            </span>
          )}
          <button
            onClick={handleClose}
            className="rounded-lg p-1.5 text-slate-400 hover:bg-slate-200 hover:text-slate-700 cursor-pointer"
            aria-label="Close search"
          >
            <Icon name="x-mark" className="h-5 w-5" />
          </button>
        </div>

        {/* Results Area */}
        <div className="relative z-10 max-h-[60vh] overflow-y-auto p-4 space-y-4 text-xs">
          {/* Institutional Note & Keyboard Hint */}
          <div className="text-[11px] text-slate-500 bg-blue-50/60 p-2.5 rounded-lg border border-blue-100 flex items-center justify-between">
            <span className="flex items-center space-x-1.5">
              <span className="w-1.5 h-1.5 rounded-full bg-emerald-500"></span>
              <span>Live SQLite Search & Navigation</span>
            </span>
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

          {/* Server error if any */}
          {serverError && (
            <div className="p-3 rounded-xl bg-red-50 border border-red-200 text-red-800 text-xs">
              Search error: {serverError}
            </div>
          )}

          {/* 1. Students Directory */}
          {dbStudents.length > 0 && (
            <div>
              <div className="text-[11px] font-bold uppercase tracking-wider text-slate-400 mb-2 px-2 flex items-center justify-between">
                <span>Students Directory ({dbStudents.length})</span>
                <span className="text-[10px] text-emerald-600 font-semibold">Live SQLite Records</span>
              </div>
              <div className="space-y-1">
                {dbStudents.map((s, idx) => {
                  const globalIdx = idx;
                  const isSelected = selectedIndex === globalIdx;
                  return (
                    <Link
                      key={s.id}
                      href={`/modules/students?studentId=${s.id}&prn=${encodeURIComponent(s.prn)}`}
                      onClick={handleClose}
                      className={`flex items-center justify-between rounded-xl p-2.5 transition-colors border ${
                        isSelected
                          ? "bg-blue-50/80 border-[#1657D9]/40 text-[#1657D9]"
                          : "hover:bg-slate-50 border-transparent hover:border-slate-200"
                      } group`}
                    >
                      <div className="flex items-center space-x-3 min-w-0">
                        <div className="w-8 h-8 rounded-full bg-blue-50 text-[#1657D9] border border-blue-100 flex items-center justify-center font-bold text-xs shrink-0">
                          {s.fullName.charAt(0)}
                        </div>
                        <div className="min-w-0">
                          <div className="text-sm font-bold text-slate-900 group-hover:text-[#1657D9] truncate">
                            {s.fullName}
                          </div>
                          <div className="text-[11px] text-slate-500 truncate">
                            PRN: <span className="font-mono font-medium text-slate-700">{s.prn}</span> • {s.programmeName} ({s.semesterName})
                          </div>
                        </div>
                      </div>
                      <div className="flex items-center space-x-2 shrink-0">
                        <span className="text-[10px] font-mono px-2 py-0.5 rounded-full bg-slate-100 text-slate-600 border border-slate-200">
                          {s.rollNumber}
                        </span>
                        <span className="text-[11px] text-[#1657D9] hidden sm:inline-flex">
                          View Dossier →
                        </span>
                      </div>
                    </Link>
                  );
                })}
              </div>
            </div>
          )}

          {/* 2. Faculty & Staff Directory */}
          {dbFaculty.length > 0 && (
            <div>
              <div className="text-[11px] font-bold uppercase tracking-wider text-slate-400 mb-2 px-2 flex items-center justify-between">
                <span>Faculty & Staff Leadership ({dbFaculty.length})</span>
                <span className="text-[10px] text-emerald-600 font-semibold">Live SQLite Records</span>
              </div>
              <div className="space-y-1">
                {dbFaculty.map((f, idx) => {
                  const globalIdx = dbStudents.length + idx;
                  const isSelected = selectedIndex === globalIdx;
                  return (
                    <Link
                      key={f.id}
                      href={`/modules/faculty?staffId=${f.id}&employeeId=${encodeURIComponent(f.employeeId)}`}
                      onClick={handleClose}
                      className={`flex items-center justify-between rounded-xl p-2.5 transition-colors border ${
                        isSelected
                          ? "bg-blue-50/80 border-[#1657D9]/40 text-[#1657D9]"
                          : "hover:bg-slate-50 border-transparent hover:border-slate-200"
                      } group`}
                    >
                      <div className="flex items-center space-x-3 min-w-0">
                        <div className="w-8 h-8 rounded-full bg-purple-50 text-purple-700 border border-purple-100 flex items-center justify-center font-bold text-xs shrink-0">
                          {f.fullName.charAt(0)}
                        </div>
                        <div className="min-w-0">
                          <div className="text-sm font-bold text-slate-900 group-hover:text-[#1657D9] truncate">
                            {f.fullName}
                          </div>
                          <div className="text-[11px] text-slate-500 truncate">
                            {f.designation} • <span className="text-slate-600">{f.departmentName}</span>
                          </div>
                        </div>
                      </div>
                      <div className="flex items-center space-x-2 shrink-0">
                        <span className="text-[10px] font-mono px-2 py-0.5 rounded-full bg-purple-50 text-purple-800 border border-purple-200">
                          {f.employeeId}
                        </span>
                        <span className="text-[11px] text-[#1657D9] hidden sm:inline-flex">
                          View Dossier →
                        </span>
                      </div>
                    </Link>
                  );
                })}
              </div>
            </div>
          )}

          {/* 3. Academic Programmes */}
          {dbProgrammes.length > 0 && (
            <div>
              <div className="text-[11px] font-bold uppercase tracking-wider text-slate-400 mb-2 px-2">
                Programmes (Hospitality & Computing)
              </div>
              <div className="space-y-1">
                {dbProgrammes.map((p, idx) => {
                  const globalIdx = dbStudents.length + dbFaculty.length + idx;
                  const isSelected = selectedIndex === globalIdx;
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
                      <div className="flex items-center space-x-3 min-w-0">
                        <div className="p-2 rounded-lg bg-blue-50 text-[#1657D9] border border-blue-100 shrink-0">
                          <Icon name="academic-cap" className="h-4 w-4" />
                        </div>
                        <div className="min-w-0">
                          <div className="text-sm font-bold text-slate-900 group-hover:text-[#1657D9] truncate">
                            {p.name}
                          </div>
                          <div className="text-[11px] text-slate-500 truncate">
                            {p.departmentName}
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

          {/* 4. Modules Section */}
          {matchingModules.length > 0 && (
            <div>
              <div className="text-[11px] font-bold uppercase tracking-wider text-slate-400 mb-2 px-2">
                Core Modules
              </div>
              <div className="space-y-1">
                {matchingModules.map((m, idx) => {
                  const globalIdx = dbStudents.length + dbFaculty.length + dbProgrammes.length + idx;
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

          {/* Empty State */}
          {query.trim() !== "" && !isLoading && totalResults === 0 && (
            <div className="py-12 text-center text-slate-500">
              <Icon name="search" className="mx-auto h-8 w-8 text-slate-300 mb-2" />
              <p className="text-sm font-medium text-slate-700">
                No matching records found for &quot;{query}&quot;
              </p>
              <p className="text-xs text-slate-400 mt-1">
                Try searching by student name (&quot;Aarav&quot;), PRN (&quot;2026DS041&quot;), faculty member (&quot;Vikramaditya&quot;), or system modules.
              </p>
            </div>
          )}

          {/* Initial State hint when query is empty */}
          {query.trim() === "" && (
            <div className="py-8 text-center text-slate-400">
              <Icon name="magnifying-glass" className="mx-auto h-6 w-6 text-slate-300 mb-2" />
              <p className="text-xs">Type to search live student dossiers, faculty records, programmes, or system modules.</p>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};
