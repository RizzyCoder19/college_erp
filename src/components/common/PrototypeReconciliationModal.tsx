"use client";

import React, { useState, useMemo } from "react";
import { Icon } from "@/components/common/Icon";

export interface PrototypeComparisonItem {
  id: string;
  primaryKey: string; // PRN or StaffId
  name: string;
  email: string;
  secondaryInfo: string;
  status: "duplicate" | "conflict" | "importable";
  statusReason: string;
  rawRecord: unknown;
}

interface PrototypeReconciliationModalProps {
  isOpen: boolean;
  entityName: "Student" | "Faculty";
  storageKey: string;
  items: PrototypeComparisonItem[];
  onClose: () => void;
  onImport: (importableItems: PrototypeComparisonItem[]) => Promise<{ imported: number; failed: number }>;
}

export const PrototypeReconciliationModal: React.FC<PrototypeReconciliationModalProps> = ({
  isOpen,
  entityName,
  storageKey,
  items,
  onClose,
  onImport,
}) => {
  const [filter, setFilter] = useState<"all" | "importable" | "duplicate" | "conflict">("all");
  const [isConfirming, setIsConfirming] = useState(false);
  const [isProcessing, setIsProcessing] = useState(false);
  const [summaryReport, setSummaryReport] = useState<{ imported: number; failed: number; skipped: number } | null>(null);

  const importableCount = useMemo(() => items.filter((i) => i.status === "importable").length, [items]);
  const duplicateCount = useMemo(() => items.filter((i) => i.status === "duplicate").length, [items]);
  const conflictCount = useMemo(() => items.filter((i) => i.status === "conflict").length, [items]);

  const filteredItems = useMemo(() => {
    if (filter === "all") return items;
    return items.filter((i) => i.status === filter);
  }, [items, filter]);

  if (!isOpen) return null;

  const handleStartImport = async () => {
    setIsProcessing(true);
    setIsConfirming(false);
    const toImport = items.filter((i) => i.status === "importable");
    try {
      const res = await onImport(toImport);
      setSummaryReport({
        imported: res.imported,
        failed: res.failed,
        skipped: duplicateCount + conflictCount,
      });
    } catch {
      setSummaryReport({
        imported: 0,
        failed: toImport.length,
        skipped: duplicateCount + conflictCount,
      });
    } finally {
      setIsProcessing(false);
    }
  };

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-xs"
      onClick={onClose}
      role="dialog"
      aria-modal="true"
      aria-label="Prototype Data Reconciliation"
    >
      <div
        className="w-full max-w-3xl max-h-[90vh] flex flex-col rounded-2xl bg-white shadow-2xl border border-slate-200 overflow-hidden"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header */}
        <div className="bg-[#0B1528] px-6 py-4.5 text-white border-b border-[#16243E] flex items-center justify-between shrink-0">
          <div className="flex items-center space-x-3">
            <div className="p-2 rounded-xl bg-amber-500/20 text-amber-300 border border-amber-400/30">
              <Icon name="archive-box" className="h-5 w-5" />
            </div>
            <div>
              <h3 className="text-base font-bold text-white font-serif">
                Reconcile Browser Prototype Records — {entityName}s
              </h3>
              <p className="text-[11px] text-slate-300">
                Safe non-destructive reconciliation between local storage & database
              </p>
            </div>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="text-slate-400 hover:text-white p-1 rounded-lg hover:bg-white/10 transition-colors cursor-pointer"
            aria-label="Close"
          >
            <Icon name="x-mark" className="w-5 h-5" />
          </button>
        </div>

        {/* Modal Body */}
        <div className="p-6 space-y-5 overflow-y-auto flex-1 text-xs">
          {/* Safeguard Notice */}
          <div className="p-4 rounded-xl bg-blue-50/70 border border-blue-200 flex items-start space-x-3 text-slate-700">
            <Icon name="shield-check" className="h-5 w-5 text-[#1657D9] shrink-0 mt-0.5" />
            <div className="text-xs leading-relaxed">
              <span className="font-bold text-slate-900">Safety Guarantee:</span> This reconciliation process is strictly non-destructive. Browser localStorage key <code className="font-mono bg-white px-1 py-0.5 rounded border border-blue-200">{storageKey}</code> will remain completely intact and will never be deleted or modified. Only confirmed new records will be imported into SQLite.
            </div>
          </div>

          {/* Metric Breakdown Cards */}
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
            <button
              type="button"
              onClick={() => setFilter("all")}
              className={`p-3 rounded-xl border text-left transition-all ${
                filter === "all" ? "bg-slate-900 text-white border-slate-900 shadow-xs" : "bg-slate-50 text-slate-700 border-slate-200 hover:bg-slate-100"
              }`}
            >
              <div className="text-[10px] uppercase font-bold tracking-wider opacity-75">Total Found</div>
              <div className="text-xl font-bold font-serif mt-0.5">{items.length}</div>
            </button>

            <button
              type="button"
              onClick={() => setFilter("importable")}
              className={`p-3 rounded-xl border text-left transition-all ${
                filter === "importable" ? "bg-emerald-700 text-white border-emerald-700 shadow-xs" : "bg-emerald-50 text-emerald-800 border-emerald-200 hover:bg-emerald-100"
              }`}
            >
              <div className="text-[10px] uppercase font-bold tracking-wider opacity-75">Ready to Import</div>
              <div className="text-xl font-bold font-serif mt-0.5">{importableCount}</div>
            </button>

            <button
              type="button"
              onClick={() => setFilter("duplicate")}
              className={`p-3 rounded-xl border text-left transition-all ${
                filter === "duplicate" ? "bg-blue-700 text-white border-blue-700 shadow-xs" : "bg-blue-50 text-blue-800 border-blue-200 hover:bg-blue-100"
              }`}
            >
              <div className="text-[10px] uppercase font-bold tracking-wider opacity-75">Already in DB</div>
              <div className="text-xl font-bold font-serif mt-0.5">{duplicateCount}</div>
            </button>

            <button
              type="button"
              onClick={() => setFilter("conflict")}
              className={`p-3 rounded-xl border text-left transition-all ${
                filter === "conflict" ? "bg-amber-700 text-white border-amber-700 shadow-xs" : "bg-amber-50 text-amber-800 border-amber-200 hover:bg-amber-100"
              }`}
            >
              <div className="text-[10px] uppercase font-bold tracking-wider opacity-75">Conflicts</div>
              <div className="text-xl font-bold font-serif mt-0.5">{conflictCount}</div>
            </button>
          </div>

          {/* Import Result Notification */}
          {summaryReport && (
            <div className="p-4 rounded-xl bg-emerald-50 border border-emerald-300 text-emerald-900 space-y-1">
              <div className="flex items-center space-x-2 font-bold text-sm">
                <Icon name="check-circle" className="h-5 w-5 text-emerald-600" />
                <span>Reconciliation Complete</span>
              </div>
              <p className="text-xs text-emerald-800">
                Successfully imported <strong>{summaryReport.imported}</strong> new records into the SQLite database. Skipped <strong>{summaryReport.skipped}</strong> existing/conflicting records. Errors: <strong>{summaryReport.failed}</strong>. Original localStorage records remain untouched.
              </p>
            </div>
          )}

          {/* Comparison Preview Table */}
          <div className="border border-slate-200 rounded-xl overflow-hidden">
            <div className="bg-slate-50 px-4 py-2.5 border-b border-slate-200 flex items-center justify-between">
              <span className="font-bold text-slate-800">
                Prototype Records Preview ({filteredItems.length} records)
              </span>
              <span className="text-[11px] text-slate-500">
                Showing: {filter.toUpperCase()}
              </span>
            </div>

            <div className="max-h-64 overflow-y-auto divide-y divide-slate-100">
              {filteredItems.map((item) => (
                <div key={item.id} className="p-3 hover:bg-slate-50 flex items-center justify-between gap-3 text-xs">
                  <div>
                    <div className="flex items-center space-x-2">
                      <span className="font-mono font-bold text-[#1657D9]">{item.primaryKey}</span>
                      <span className="font-bold text-slate-900">{item.name}</span>
                    </div>
                    <div className="text-slate-500 text-[11px] mt-0.5">
                      {item.email} • {item.secondaryInfo}
                    </div>
                  </div>

                  <div className="shrink-0 text-right">
                    {item.status === "duplicate" && (
                      <span className="inline-flex items-center px-2 py-0.5 rounded-full text-[10px] font-bold bg-blue-50 text-blue-700 border border-blue-200">
                        In Database (Skip)
                      </span>
                    )}
                    {item.status === "importable" && (
                      <span className="inline-flex items-center px-2 py-0.5 rounded-full text-[10px] font-bold bg-emerald-50 text-emerald-700 border border-emerald-200">
                        New (Ready to Import)
                      </span>
                    )}
                    {item.status === "conflict" && (
                      <span className="inline-flex items-center px-2 py-0.5 rounded-full text-[10px] font-bold bg-amber-50 text-amber-700 border border-amber-200" title={item.statusReason}>
                        Conflict (Review)
                      </span>
                    )}
                    <div className="text-[10px] text-slate-400 mt-0.5">{item.statusReason}</div>
                  </div>
                </div>
              ))}

              {filteredItems.length === 0 && (
                <div className="p-8 text-center text-slate-500 text-xs">
                  No prototype records matching the current filter.
                </div>
              )}
            </div>
          </div>

          {/* Explicit Confirmation Dialog before Import */}
          {isConfirming && (
            <div className="p-4 rounded-xl bg-amber-50 border border-amber-300 space-y-2">
              <div className="flex items-center space-x-2 font-bold text-amber-900">
                <Icon name="exclamation-triangle" className="h-4 w-4 text-amber-600" />
                <span>Explicit Confirmation Required</span>
              </div>
              <p className="text-xs text-amber-800 leading-relaxed">
                You are about to import <strong>{importableCount}</strong> new {entityName.toLowerCase()} record(s) into the live SQLite database. Existing browser records will remain safe and unmodified in browser storage. Are you sure you want to proceed?
              </p>
              <div className="flex items-center space-x-2 pt-1">
                <button
                  type="button"
                  onClick={handleStartImport}
                  className="px-3 py-1.5 rounded-lg bg-emerald-600 hover:bg-emerald-700 text-white font-bold text-xs shadow-xs cursor-pointer"
                >
                  Yes, Confirm & Import to Database
                </button>
                <button
                  type="button"
                  onClick={() => setIsConfirming(false)}
                  className="px-3 py-1.5 rounded-lg bg-slate-200 hover:bg-slate-300 text-slate-700 font-semibold text-xs cursor-pointer"
                >
                  Cancel
                </button>
              </div>
            </div>
          )}
        </div>

        {/* Footer Actions */}
        <div className="bg-slate-50 px-6 py-4 border-t border-slate-200 flex items-center justify-between shrink-0">
          <div className="text-[11px] text-slate-500">
            {importableCount > 0
              ? `${importableCount} record(s) can be safely imported`
              : "All prototype records are already synced with the database"}
          </div>

          <div className="flex items-center space-x-2">
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2 rounded-xl text-slate-700 hover:bg-slate-200 font-semibold text-xs transition-colors cursor-pointer"
            >
              Close
            </button>

            {importableCount > 0 && !summaryReport && (
              <button
                type="button"
                disabled={isProcessing || isConfirming}
                onClick={() => setIsConfirming(true)}
                className="px-4 py-2 rounded-xl bg-[#1657D9] hover:bg-[#1248B8] disabled:opacity-50 text-white font-bold text-xs shadow-xs transition-all cursor-pointer flex items-center space-x-1.5"
              >
                {isProcessing ? (
                  <>
                    <span className="h-3 w-3 rounded-full border-2 border-white border-t-transparent animate-spin" />
                    <span>Importing...</span>
                  </>
                ) : (
                  <>
                    <Icon name="arrow-up-tray" className="h-4 w-4" />
                    <span>Import {importableCount} New Records</span>
                  </>
                )}
              </button>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};
