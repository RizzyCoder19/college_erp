"use client";

import React, { useState, useEffect, useRef, useCallback } from "react";
import Link from "next/link";
import { Icon } from "@/components/common/Icon";
import { MODULES_LIST, HOSPITALITY_LABS_STATUS } from "@/data/mockData";

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

  // Filter labs
  const matchingLabs = HOSPITALITY_LABS_STATUS.filter(
    (l) =>
      l.name.toLowerCase().includes(query.toLowerCase()) ||
      l.code.toLowerCase().includes(query.toLowerCase()) ||
      (l.activeBatch && l.activeBatch.toLowerCase().includes(query.toLowerCase())) ||
      (l.facultyInCharge && l.facultyInCharge.toLowerCase().includes(query.toLowerCase()))
  );

  // Fictional quick entities
  const fictionalPeople = [
    { name: "Chef Vikramaditya Kapoor", role: "Executive Chef Instructor • Continental", id: "FAC-012" },
    { name: "Prof. Sneha Pillai", role: "Associate Professor & HOD • F&B Service", id: "FAC-024" },
    { name: "Aarav Mehra", role: "Student • B.Sc. H&HA Year 1", id: "STU-2026-041" },
    { name: "Nandini Swaminathan", role: "Student • B.Sc. H&HA Year 1", id: "STU-2026-042" },
  ].filter(
    (p) =>
      p.name.toLowerCase().includes(query.toLowerCase()) ||
      p.role.toLowerCase().includes(query.toLowerCase()) ||
      p.id.toLowerCase().includes(query.toLowerCase())
  );

  return (
    <div
      className="fixed inset-0 z-50 flex items-start justify-center p-4 sm:p-6 md:p-20 bg-slate-900/60 backdrop-blur-sm transition-opacity"
      onClick={handleClose}
      role="dialog"
      aria-modal="true"
      aria-labelledby="global-search-title"
    >
      <div
        className="relative w-full max-w-2xl overflow-hidden rounded-2xl bg-white shadow-2xl ring-1 ring-slate-900/10 dark:bg-slate-900 border border-slate-200 dark:border-slate-800"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Search Input Bar */}
        <div className="flex items-center border-b border-slate-200 px-4 py-3.5 dark:border-slate-800">
          <Icon name="search" className="h-5 w-5 text-amber-600 dark:text-amber-400 mr-3 shrink-0" />
          <input
            ref={inputRef}
            id="global-search-title"
            type="text"
            className="w-full bg-transparent text-slate-900 placeholder:text-slate-400 focus:outline-none dark:text-white text-base"
            placeholder="Search modules, courses, faculty, students, or labs (e.g., 'Bakery', 'Kapoor', 'Fees')..."
            value={query}
            onChange={(e) => setQuery(e.target.value)}
          />
          <button
            onClick={handleClose}
            className="rounded-lg p-1.5 text-slate-400 hover:bg-slate-100 hover:text-slate-600 dark:hover:bg-slate-800"
            aria-label="Close search"
          >
            <Icon name="x-mark" className="h-5 w-5" />
          </button>
        </div>

        {/* Results Area */}
        <div className="max-h-[60vh] overflow-y-auto p-4 space-y-4">
          {/* Quick Notice */}
          <div className="text-xs text-slate-500 bg-slate-50 dark:bg-slate-800/60 p-2.5 rounded-lg border border-slate-200/80 dark:border-slate-800 flex items-center justify-between">
            <span>Instant Institutional Search (Client-side Simulation)</span>
            <span className="font-mono text-[10px] bg-slate-200 dark:bg-slate-700 px-1.5 py-0.5 rounded">ESC to close</span>
          </div>

          {/* Modules Section */}
          {matchingModules.length > 0 && (
            <div>
              <div className="text-xs font-semibold uppercase tracking-wider text-slate-500 mb-2 px-2">
                ERP Core Modules
              </div>
              <div className="space-y-1">
                {matchingModules.map((m) => (
                  <Link
                    key={m.slug}
                    href={`/modules/${m.slug}`}
                    onClick={onClose}
                    className="flex items-center justify-between rounded-xl p-2.5 hover:bg-slate-100 dark:hover:bg-slate-800/80 transition-colors group"
                  >
                    <div className="flex items-center space-x-3">
                      <div className="p-2 rounded-lg bg-amber-50 text-amber-700 border border-amber-200/60 dark:bg-amber-950/40 dark:text-amber-300">
                        <Icon name={m.icon} className="h-4 w-4" />
                      </div>
                      <div>
                        <div className="text-sm font-semibold text-slate-900 dark:text-white group-hover:text-amber-700 dark:group-hover:text-amber-400">
                          {m.title}
                        </div>
                        <div className="text-xs text-slate-500">{m.department}</div>
                      </div>
                    </div>
                    <span className="text-xs text-amber-700 dark:text-amber-400 bg-amber-50 dark:bg-amber-950/30 px-2 py-0.5 rounded-full border border-amber-200/60">
                      Open Module
                    </span>
                  </Link>
                ))}
              </div>
            </div>
          )}

          {/* Hospitality Labs */}
          {matchingLabs.length > 0 && (
            <div>
              <div className="text-xs font-semibold uppercase tracking-wider text-slate-500 mb-2 px-2">
                Hospitality Labs & Facilities
              </div>
              <div className="space-y-1">
                {matchingLabs.map((l) => (
                  <Link
                    key={l.id}
                    href="/modules/facilities"
                    onClick={onClose}
                    className="flex items-center justify-between rounded-xl p-2.5 hover:bg-slate-100 dark:hover:bg-slate-800/80 transition-colors"
                  >
                    <div className="flex items-center space-x-3">
                      <div className="p-2 rounded-lg bg-slate-100 text-slate-700 border border-slate-200 dark:bg-slate-800 dark:text-slate-300">
                        <Icon name="building-storefront" className="h-4 w-4" />
                      </div>
                      <div>
                        <div className="text-sm font-medium text-slate-900 dark:text-white">
                          {l.name} <span className="text-xs font-mono text-slate-500">({l.code})</span>
                        </div>
                        <div className="text-xs text-slate-500">
                          {l.facultyInCharge} • {l.status}
                        </div>
                      </div>
                    </div>
                    <span className="text-xs text-slate-600 dark:text-slate-300">
                      View Facility
                    </span>
                  </Link>
                ))}
              </div>
            </div>
          )}

          {/* Fictional People */}
          {fictionalPeople.length > 0 && (
            <div>
              <div className="text-xs font-semibold uppercase tracking-wider text-slate-500 mb-2 px-2">
                Demonstration Personnel & Students
              </div>
              <div className="space-y-1">
                {fictionalPeople.map((p) => (
                  <div
                    key={p.id}
                    className="flex items-center justify-between rounded-xl p-2.5 hover:bg-slate-100 dark:hover:bg-slate-800/80 transition-colors cursor-default"
                  >
                    <div className="flex items-center space-x-3">
                      <div className="w-8 h-8 rounded-full bg-slate-200 dark:bg-slate-700 flex items-center justify-center font-bold text-xs text-slate-700 dark:text-slate-300">
                        {p.name.charAt(0)}
                      </div>
                      <div>
                        <div className="text-sm font-medium text-slate-900 dark:text-white">
                          {p.name}
                        </div>
                        <div className="text-xs text-slate-500">{p.role}</div>
                      </div>
                    </div>
                    <span className="text-xs font-mono text-slate-400">{p.id}</span>
                  </div>
                ))}
              </div>
            </div>
          )}

          {matchingModules.length === 0 && matchingLabs.length === 0 && fictionalPeople.length === 0 && (
            <div className="py-12 text-center">
              <Icon name="search" className="mx-auto h-8 w-8 text-slate-400 mb-2" />
              <p className="text-sm font-medium text-slate-700 dark:text-slate-300">
                No matching records found for &quot;{query}&quot;
              </p>
              <p className="text-xs text-slate-500 mt-1">
                Try searching for &quot;Admissions&quot;, &quot;Chef&quot;, &quot;Bakery&quot;, or &quot;Kitchen&quot;.
              </p>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};
