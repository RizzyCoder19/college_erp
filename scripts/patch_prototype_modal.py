# -*- coding: utf-8 -*-
with open("src/components/common/PrototypeReconciliationModal.tsx", "r", encoding="utf-8") as f:
    content = f.read()

# Define new full content for PrototypeReconciliationModal.tsx
new_content = """\"use client\";

import React, { useState, useMemo } from \"react\";
import { Icon } from \"@/components/common/Icon\";

export interface PrototypeComparisonFieldDiff {
  fieldName: string;
  prototypeValue: string;
  dbValue: string;
}

export interface PrototypeComparisonItem {
  id: string;
  primaryKey: string; // PRN or StaffId
  name: string;
  email: string;
  secondaryInfo: string;
  status: \"duplicate\" | \"conflict\" | \"importable\";
  statusReason: string;
  fieldDiffs?: PrototypeComparisonFieldDiff[];
  rawRecord: unknown;
  matchedDbRecord?: unknown;
}

interface PrototypeReconciliationModalProps {
  isOpen: boolean;
  entityName: \"Student\" | \"Faculty\";
  storageKey: string;
  items: PrototypeComparisonItem[];
  onClose: () => void;
  onImport: (importableItems: PrototypeComparisonItem[]) => Promise<{ imported: number; failed: number }>;
  onPruneDuplicates?: (duplicateIds: string[]) => Promise<{ pruned: number; backupKey: string } | void> | void;
}

export const PrototypeReconciliationModal: React.FC<PrototypeReconciliationModalProps> = ({
  isOpen,
  entityName,
  storageKey,
  items,
  onClose,
  onImport,
  onPruneDuplicates,
}) => {
  const [filter, setFilter] = useState<\"all\" | \"importable\" | \"duplicate\" | \"conflict\">(\"all\");
  const [isConfirmingImport, setIsConfirmingImport] = useState(false);
  const [isConfirmingPrune, setIsConfirmingPrune] = useState(false);
  const [isProcessing, setIsProcessing] = useState(false);
  const [summaryReport, setSummaryReport] = useState<{ imported: number; failed: number; skipped: number } | null>(null);
  const [pruneReport, setPruneReport] = useState<{ pruned: number; backupKey: string } | null>(null);

  const importableCount = useMemo(() => items.filter((i) => i.status === \"importable\").length, [items]);
  const duplicateCount = useMemo(() => items.filter((i) => i.status === \"duplicate\").length, [items]);
  const conflictCount = useMemo(() => items.filter((i) => i.status === \"conflict\").length, [items]);

  const filteredItems = useMemo(() => {
    if (filter === \"all\") return items;
    return items.filter((i) => i.status === filter);
  }, [items, filter]);

  if (!isOpen) return null;

  const handleStartImport = async () => {
    setIsProcessing(true);
    setIsConfirmingImport(false);
    const toImport = items.filter((i) => i.status === \"importable\");
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

  const handleStartPrune = async () => {
    if (!onPruneDuplicates) return;
    setIsProcessing(true);
    setIsConfirmingPrune(false);
    const duplicateIds = items.filter((i) => i.status === \"duplicate\").map((i) => i.id);
    try {
      const res = await onPruneDuplicates(duplicateIds);
      if (res && res.pruned > 0) {
        setPruneReport(res);
      }
    } catch {
      // Error handled by parent
    } finally {
      setIsProcessing(false);
    }
  };

  return (
    <div
      className=\"fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-xs\"
      onClick={onClose}
      role=\"dialog\"
      aria-modal=\"true\"
      aria-label=\"Prototype Data Reconciliation\"
    >
      <div
        className=\"w-full max-w-3xl max-h-[90vh] flex flex-col rounded-2xl bg-white shadow-2xl border border-slate-200 overflow-hidden\"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header */}
        <div className=\"bg-[#0B1528] px-6 py-4.5 text-white border-b border-[#16243E] flex items-center justify-between shrink-0\">
          <div className=\"flex items-center space-x-3\">
            <div className=\"p-2 rounded-xl bg-amber-500/20 text-amber-300 border border-amber-400/30\">
              <Icon name=\"archive-box\" className=\"h-5 w-5\" />
            </div>
            <div>
              <h3 className=\"text-base font-bold text-white font-serif\">
                Reconcile Browser Prototype Records — {entityName}s
              </h3>
              <p className=\"text-[11px] text-slate-300\">
                Distinguish new importable records, verified duplicates, and conflicting data
              </p>
            </div>
          </div>
          <button
            type=\"button\"
            onClick={onClose}
            className=\"text-slate-400 hover:text-white p-1 rounded-lg hover:bg-white/10 transition-colors cursor-pointer\"
            aria-label=\"Close\"
          >
            <Icon name=\"x-mark\" className=\"w-5 h-5\" />
          </button>
        </div>

        {/* Modal Body */}
        <div className=\"p-6 space-y-5 overflow-y-auto flex-1 text-xs\">
          {/* Safeguard Notice */}
          <div className=\"p-4 rounded-xl bg-blue-50/70 border border-blue-200 flex items-start space-x-3 text-slate-700\">
            <Icon name=\"shield-check\" className=\"h-5 w-5 text-[#1657D9] shrink-0 mt-0.5\" />
            <div className=\"text-xs leading-relaxed\">
              <span className=\"font-bold text-slate-900\">Safety & Data Integrity Guarantee:</span> The SQLite database is the authoritative system of record. Prototype records in <code className=\"font-mono bg-white px-1 py-0.5 rounded border border-blue-200\">{storageKey}</code> are compared field-by-field. Confirmed duplicates can be safely pruned with automatic backup, while conflicting data is preserved for review.
            </div>
          </div>

          {/* Metric Breakdown Cards */}
          <div className=\"grid grid-cols-2 sm:grid-cols-4 gap-3\">
            <button
              type=\"button\"
              onClick={() => setFilter(\"all\")}
              className={`p-3 rounded-xl border text-left transition-all cursor-pointer ${
                filter === \"all\" ? \"bg-slate-900 text-white border-slate-900 shadow-xs\" : \"bg-slate-50 text-slate-700 border-slate-200 hover:bg-slate-100\"
              }`}
            >
              <div className=\"text-[10px] uppercase font-bold tracking-wider opacity-75\">Total Evaluated</div>
              <div className=\"text-xl font-bold font-serif mt-0.5\">{items.length}</div>
            </button>

            <button
              type=\"button\"
              onClick={() => setFilter(\"importable\")}
              className={`p-3 rounded-xl border text-left transition-all cursor-pointer ${
                filter === \"importable\" ? \"bg-emerald-700 text-white border-emerald-700 shadow-xs\" : \"bg-emerald-50 text-emerald-800 border-emerald-200 hover:bg-emerald-100\"
              }`}
            >
              <div className=\"text-[10px] uppercase font-bold tracking-wider opacity-75\">Ready to Import</div>
              <div className=\"text-xl font-bold font-serif mt-0.5\">{importableCount}</div>
            </button>

            <button
              type=\"button\"
              onClick={() => setFilter(\"duplicate\")}
              className={`p-3 rounded-xl border text-left transition-all cursor-pointer ${
                filter === \"duplicate\" ? \"bg-blue-700 text-white border-blue-700 shadow-xs\" : \"bg-blue-50 text-blue-800 border-blue-200 hover:bg-blue-100\"
              }`}
            >
              <div className=\"text-[10px] uppercase font-bold tracking-wider opacity-75\">Confirmed Duplicates</div>
              <div className=\"text-xl font-bold font-serif mt-0.5\">{duplicateCount}</div>
            </button>

            <button
              type=\"button\"
              onClick={() => setFilter(\"conflict\")}
              className={`p-3 rounded-xl border text-left transition-all cursor-pointer ${
                filter === \"conflict\" ? \"bg-amber-700 text-white border-amber-700 shadow-xs\" : \"bg-amber-50 text-amber-800 border-amber-200 hover:bg-amber-100\"
              }`}
            >
              <div className=\"text-[10px] uppercase font-bold tracking-wider opacity-75\">Conflicts</div>
              <div className=\"text-xl font-bold font-serif mt-0.5\">{conflictCount}</div>
            </button>
          </div>

          {/* Import Result Notification */}
          {summaryReport && (
            <div className=\"p-4 rounded-xl bg-emerald-50 border border-emerald-300 text-emerald-900 space-y-1\">
              <div className=\"flex items-center space-x-2 font-bold text-sm\">
                <Icon name=\"check-circle\" className=\"h-5 w-5 text-emerald-600\" />
                <span>Import Operation Complete</span>
              </div>
              <p className=\"text-xs text-emerald-800\">
                Successfully imported <strong>{summaryReport.imported}</strong> new record(s) into the SQLite database. Skipped <strong>{summaryReport.skipped}</strong> existing/conflicting record(s). Errors: <strong>{summaryReport.failed}</strong>.
              </p>
            </div>
          )}

          {/* Prune Result Notification */}
          {pruneReport && (
            <div className=\"p-4 rounded-xl bg-blue-50 border border-blue-300 text-blue-900 space-y-1\">
              <div className=\"flex items-center space-x-2 font-bold text-sm\">
                <Icon name=\"shield-check\" className=\"h-5 w-5 text-blue-600\" />
                <span>Confirmed Duplicates Cleaned</span>
              </div>
              <p className=\"text-xs text-blue-800\">
                Successfully pruned <strong>{pruneReport.pruned}</strong> confirmed duplicate(s) from browser storage. A recoverable backup was saved to <code>{pruneReport.backupKey}</code>. Conflicting and unimported records remain safely preserved.
              </p>
            </div>
          )}

          {/* Comparison Preview Table */}
          <div className=\"border border-slate-200 rounded-xl overflow-hidden\">
            <div className=\"bg-slate-50 px-4 py-2.5 border-b border-slate-200 flex items-center justify-between\">
              <span className=\"font-bold text-slate-800\">
                Prototype Records Evaluation ({filteredItems.length} records)
              </span>
              <span className=\"text-[11px] text-slate-500\">
                Filter: <strong className=\"uppercase text-slate-700\">{filter}</strong>
              </span>
            </div>

            <div className=\"max-h-80 overflow-y-auto divide-y divide-slate-100\">
              {filteredItems.map((item) => (
                <div key={item.id} className=\"p-3.5 hover:bg-slate-50/80 transition-colors text-xs space-y-2\">
                  <div className=\"flex items-start justify-between gap-3\">
                    <div>
                      <div className=\"flex items-center space-x-2\">
                        <span className=\"font-mono font-bold text-[#1657D9] bg-blue-50 px-1.5 py-0.5 rounded border border-blue-100\">
                          {item.primaryKey}
                        </span>
                        <span className=\"font-bold text-slate-900\">{item.name}</span>
                      </div>
                      <div className=\"text-slate-500 text-[11px] mt-0.5\">
                        {item.email} • {item.secondaryInfo}
                      </div>
                    </div>

                    <div className=\"shrink-0 text-right\">
                      {item.status === \"duplicate\" && (
                        <span className=\"inline-flex items-center px-2 py-0.5 rounded-full text-[10px] font-bold bg-blue-50 text-blue-700 border border-blue-200\">
                          Confirmed Duplicate (Skip)
                        </span>
                      )}
                      {item.status === \"importable\" && (
                        <span className=\"inline-flex items-center px-2 py-0.5 rounded-full text-[10px] font-bold bg-emerald-50 text-emerald-700 border border-emerald-200\">
                          New (Ready to Import)
                        </span>
                      )}
                      {item.status === \"conflict\" && (
                        <span className=\"inline-flex items-center px-2 py-0.5 rounded-full text-[10px] font-bold bg-amber-50 text-amber-700 border border-amber-200\" title={item.statusReason}>
                          Conflict Requiring Review
                        </span>
                      )}
                      <div className=\"text-[10px] text-slate-400 mt-0.5 max-w-xs text-right\">{item.statusReason}</div>
                    </div>
                  </div>

                  {/* Render Field Differences for Conflicts */}
                  {item.fieldDiffs && item.fieldDiffs.length > 0 && (
                    <div className=\"mt-2 p-2.5 rounded-lg bg-amber-50/80 border border-amber-200/80 text-[11px] space-y-1.5\">
                      <div className=\"font-bold text-amber-900 flex items-center space-x-1\">
                        <Icon name=\"exclamation-triangle\" className=\"h-3.5 w-3.5 text-amber-600 shrink-0\" />
                        <span>Preserved Field Differences ({item.fieldDiffs.length}):</span>
                      </div>
                      <div className=\"rounded border border-amber-200 bg-white overflow-hidden\">
                        <div className=\"grid grid-cols-3 gap-2 px-2.5 py-1 bg-amber-100/50 font-semibold text-[10px] text-slate-600 border-b border-amber-200\">
                          <div>Field</div>
                          <div className=\"text-amber-800\">Prototype Record</div>
                          <div className=\"text-blue-800\">Database Record</div>
                        </div>
                        <div className=\"divide-y divide-amber-100 text-[11px]\">
                          {item.fieldDiffs.map((d, idx) => (
                            <div key={idx} className=\"grid grid-cols-3 gap-2 px-2.5 py-1.5 font-mono text-[10px]\">
                              <div className=\"font-bold text-slate-700\">{d.fieldName}</div>
                              <div className=\"text-amber-700 break-words font-medium\">{d.prototypeValue || \"—\"}</div>
                              <div className=\"text-blue-700 break-words font-medium\">{d.dbValue || \"—\"}</div>
                            </div>
                          ))}
                        </div>
                      </div>
                    </div>
                  )}
                </div>
              ))}

              {filteredItems.length === 0 && (
                <div className=\"p-8 text-center text-slate-500 text-xs\">
                  No prototype records matching the \"{filter}\" classification.
                </div>
              )}
            </div>
          </div>

          {/* Explicit Confirmation Dialog before Import */}
          {isConfirmingImport && (
            <div className=\"p-4 rounded-xl bg-emerald-50 border border-emerald-300 space-y-2\">
              <div className=\"flex items-center space-x-2 font-bold text-emerald-900\">
                <Icon name=\"arrow-up-tray\" className=\"h-4 w-4 text-emerald-600\" />
                <span>Confirm Database Import</span>
              </div>
              <p className=\"text-xs text-emerald-800 leading-relaxed\">
                You are about to import <strong>{importableCount}</strong> new {entityName.toLowerCase()} record(s) into the live SQLite database. Existing database records will not be modified or duplicated.
              </p>
              <div className=\"flex items-center space-x-2 pt-1\">
                <button
                  type=\"button\"
                  onClick={handleStartImport}
                  className=\"px-3 py-1.5 rounded-lg bg-emerald-600 hover:bg-emerald-700 text-white font-bold text-xs shadow-xs cursor-pointer\"
                >
                  Yes, Confirm & Import ({importableCount})
                </button>
                <button
                  type=\"button\"
                  onClick={() => setIsConfirmingImport(false)}
                  className=\"px-3 py-1.5 rounded-lg bg-slate-200 hover:bg-slate-300 text-slate-700 font-semibold text-xs cursor-pointer\"
                >
                  Cancel
                </button>
              </div>
            </div>
          )}

          {/* Explicit Confirmation Dialog before Pruning Confirmed Duplicates */}
          {isConfirmingPrune && (
            <div className=\"p-4 rounded-xl bg-blue-50 border border-blue-300 space-y-2\">
              <div className=\"flex items-center space-x-2 font-bold text-blue-900\">
                <Icon name=\"shield-check\" className=\"h-4 w-4 text-blue-600\" />
                <span>Explicit Prune Confirmation</span>
              </div>
              <p className=\"text-xs text-blue-800 leading-relaxed\">
                You are about to prune <strong>{duplicateCount}</strong> confirmed duplicate(s) from browser storage. These records have been verified to already exist identically in SQLite. A recoverable backup will be created in browser storage. Conflicting and unimported records will remain untouched.
              </p>
              <div className=\"flex items-center space-x-2 pt-1\">
                <button
                  type=\"button\"
                  onClick={handleStartPrune}
                  className=\"px-3 py-1.5 rounded-lg bg-blue-600 hover:bg-blue-700 text-white font-bold text-xs shadow-xs cursor-pointer\"
                >
                  Yes, Safely Prune Duplicates ({duplicateCount})
                </button>
                <button
                  type=\"button\"
                  onClick={() => setIsConfirmingPrune(false)}
                  className=\"px-3 py-1.5 rounded-lg bg-slate-200 hover:bg-slate-300 text-slate-700 font-semibold text-xs cursor-pointer\"
                >
                  Cancel
                </button>
              </div>
            </div>
          )}
        </div>

        {/* Footer Actions */}
        <div className=\"bg-slate-50 px-6 py-4 border-t border-slate-200 flex flex-col sm:flex-row sm:items-center justify-between gap-3 shrink-0\">
          <div className=\"text-[11px] text-slate-500\">
            {importableCount > 0 && <span className=\"text-emerald-700 font-semibold\">{importableCount} new record(s) importable • </span>}
            {duplicateCount > 0 && <span className=\"text-blue-700 font-semibold\">{duplicateCount} confirmed duplicate(s) • </span>}
            {conflictCount > 0 && <span className=\"text-amber-700 font-semibold\">{conflictCount} conflict(s) requiring review</span>}
            {importableCount === 0 && duplicateCount === 0 && conflictCount === 0 && \"All records reconciled\"}
          </div>

          <div className=\"flex items-center space-x-2 self-end sm:self-center\">
            <button
              type=\"button\"
              onClick={onClose}
              className=\"px-4 py-2 rounded-xl text-slate-700 hover:bg-slate-200 font-semibold text-xs transition-colors cursor-pointer\"
            >
              Close
            </button>

            {/* Prune Confirmed Duplicates Button */}
            {duplicateCount > 0 && onPruneDuplicates && !isConfirmingPrune && (
              <button
                type=\"button\"
                disabled={isProcessing}
                onClick={() => setIsConfirmingPrune(true)}
                className=\"px-3.5 py-2 rounded-xl bg-blue-50 hover:bg-blue-100 text-blue-700 border border-blue-200 font-bold text-xs transition-all cursor-pointer flex items-center space-x-1.5\"
              >
                <Icon name=\"check-circle\" className=\"h-4 w-4 text-blue-600\" />
                <span>Prune Duplicates ({duplicateCount})</span>
              </button>
            )}

            {/* Import Button */}
            {importableCount > 0 && !isConfirmingImport && (
              <button
                type=\"button\"
                disabled={isProcessing}
                onClick={() => setIsConfirmingImport(true)}
                className=\"px-4 py-2 rounded-xl bg-[#1657D9] hover:bg-[#1248B8] disabled:opacity-50 text-white font-bold text-xs shadow-xs transition-all cursor-pointer flex items-center space-x-1.5\"
              >
                {isProcessing ? (
                  <>
                    <span className=\"h-3 w-3 rounded-full border-2 border-white border-t-transparent animate-spin\" />
                    <span>Processing...</span>
                  </>
                ) : (
                  <>
                    <Icon name=\"arrow-up-tray\" className=\"h-4 w-4\" />
                    <span>Import {importableCount} New</span>
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
"""

with open("src/components/common/PrototypeReconciliationModal.tsx", "w", encoding="utf-8") as f:
    f.write(new_content)
print("Successfully updated PrototypeReconciliationModal.tsx")
