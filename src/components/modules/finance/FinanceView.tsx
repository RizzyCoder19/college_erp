"use client";

import React, { useState, useEffect, useTransition, useCallback, useRef } from "react";
import {
  getFinanceOverviewAction,
  getFeeStructuresAction,
  createFeeStructureAction,
  updateFeeStructureAction,
  getStructureEligibleStudentsAction,
  searchFeeStudentsAction,
  generateStudentInvoiceAction,
  generateBatchInvoicesAction,
  recordFeePaymentAction,
  getStudentFeeLedgerAction,
  getDefaulterListAction,
  FinanceOverviewResult,
  FeeStructureActionItem,
  DefaulterItem,
  FeeStudentSearchResult,
  StructureEligibleStudent,
} from "@/lib/actions/fees";
import { getProgrammesAction, getAcademicYearsAction } from "@/lib/actions/academics";
import { StudentFeeLedgerSummary } from "@/lib/dal/feeRepository";

interface ProgrammeOption {
  id: string;
  name: string;
  code: string;
}

interface AcademicYearOption {
  id: string;
  name: string;
  code: string;
}

export function FinanceView() {
  const [activeTab, setActiveTab] = useState<"overview" | "structures" | "defaulters">("overview");
  const [overview, setOverview] = useState<FinanceOverviewResult | null>(null);
  const [structures, setStructures] = useState<FeeStructureActionItem[]>([]);
  const [defaulters, setDefaulters] = useState<DefaulterItem[]>([]);
  const [programmes, setProgrammes] = useState<ProgrammeOption[]>([]);
  const [academicYears, setAcademicYears] = useState<AcademicYearOption[]>([]);
  const [isPending, startTransition] = useTransition();
  const [message, setMessage] = useState<{ type: "success" | "error"; text: string } | null>(null);

  // Student Search State
  const [searchQuery, setSearchQuery] = useState("");
  const [searchResults, setSearchResults] = useState<FeeStudentSearchResult[]>([]);
  const [isSearching, setIsSearching] = useState(false);
  const [showSearchDropdown, setShowSearchDropdown] = useState(false);
  const searchContainerRef = useRef<HTMLDivElement>(null);

  // Ledger & POS Collection State
  const [activeStudentLedger, setActiveStudentLedger] = useState<StudentFeeLedgerSummary | null>(null);
  const [selectedInvoiceId, setSelectedInvoiceId] = useState("");
  const [paymentAmount, setPaymentAmount] = useState<number>(0);
  const [paymentMethod, setPaymentMethod] = useState<"UPI" | "NEFT_RTGS" | "CHEQUE" | "CASH" | "CARD" | "DEMAND_DRAFT">("UPI");
  const [txnRef, setTxnRef] = useState("");
  const [payerName, setPayerName] = useState("");
  const [paymentRemarks, setPaymentRemarks] = useState("");
  const [lastReceipt, setLastReceipt] = useState<{
    receiptNumber: string;
    amountPaid: number;
    paymentMethod: string;
    transactionReference: string;
    invoiceNumber: string;
  } | null>(null);

  // Uninvoiced Student Invoice Issuance State
  const [invoiceStructureId, setInvoiceStructureId] = useState("");
  const [invoiceDueDate, setInvoiceDueDate] = useState(() => {
    const d = new Date();
    d.setDate(d.getDate() + 30);
    return d.toISOString().split("T")[0];
  });
  const [invoiceRemarks, setInvoiceRemarks] = useState("");

  // Create Fee Structure Modal State
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [newStructureForm, setNewStructureForm] = useState({
    academicYearId: "",
    programmeId: "",
    semesterNumber: 1,
    name: "",
    heads: [
      { headName: "Tuition Fee", amount: 45000 },
      { headName: "Commercial Kitchen Lab & Practical Fee", amount: 25000 },
      { headName: "Chef Uniform & Professional Knife-Kit Fee", amount: 8000 },
      { headName: "Examination & University Administrative Fee", amount: 2000 },
    ],
  });

  // Edit Structure Modal State
  const [editingStructure, setEditingStructure] = useState<FeeStructureActionItem | null>(null);
  const [editStructureForm, setEditStructureForm] = useState<{
    name: string;
    isActive: boolean;
    heads: Array<{ headName: string; amount: number; isOptional?: boolean }>;
  }>({ name: "", isActive: true, heads: [] });

  // Cohort Inspection Modal State
  const [cohortModal, setCohortModal] = useState<{
    structure: FeeStructureActionItem;
    students: StructureEligibleStudent[];
  } | null>(null);
  const [loadingCohort, setLoadingCohort] = useState(false);

  // Load institutional financial data
  const loadData = useCallback(() => {
    startTransition(async () => {
      try {
        const [ovRes, stRes, defRes, prRes, ayRes] = await Promise.all([
          getFinanceOverviewAction(),
          getFeeStructuresAction(),
          getDefaulterListAction(),
          getProgrammesAction(),
          getAcademicYearsAction(),
        ]);

        if (ovRes.success && ovRes.data) setOverview(ovRes.data);
        if (stRes.success && stRes.data) setStructures(stRes.data);
        if (defRes.success && defRes.data) setDefaulters(defRes.data);
        if (prRes.success && prRes.data) setProgrammes(prRes.data as ProgrammeOption[]);
        if (ayRes.success && ayRes.data) setAcademicYears(ayRes.data as AcademicYearOption[]);
      } catch (err) {
        console.error("Failed to load finance data:", err);
      }
    });
  }, []);

  useEffect(() => {
    loadData();
  }, [loadData]);

  // Handle URL query param: ?studentId=... (cross-module deep linking)
  useEffect(() => {
    if (typeof window !== "undefined") {
      const params = new URLSearchParams(window.location.search);
      const studentIdParam = params.get("studentId");
      if (studentIdParam) {
        setSearchQuery(studentIdParam);
        startTransition(async () => {
          const res = await getStudentFeeLedgerAction(studentIdParam);
          if (res.success && res.data) {
            selectStudentLedger(res.data);
          }
        });
      }
    }
  }, []);

  // Debounced search for student directory
  useEffect(() => {
    const trimmed = searchQuery.trim();
    if (!trimmed || trimmed.length < 2) {
      setSearchResults([]);
      setIsSearching(false);
      return;
    }

    const timer = setTimeout(async () => {
      setIsSearching(true);
      const res = await searchFeeStudentsAction(trimmed);
      if (res.success && res.data) {
        setSearchResults(res.data);
      } else {
        setSearchResults([]);
      }
      setIsSearching(false);
    }, 250);

    return () => clearTimeout(timer);
  }, [searchQuery]);

  // Click outside listener for search suggestions dropdown
  useEffect(() => {
    const handleClickOutside = (e: MouseEvent) => {
      if (searchContainerRef.current && !searchContainerRef.current.contains(e.target as Node)) {
        setShowSearchDropdown(false);
      }
    };
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  // Set active ledger and initialize collection / invoice state
  const selectStudentLedger = (ledger: StudentFeeLedgerSummary) => {
    setActiveStudentLedger(ledger);
    setSearchQuery(`${ledger.fullName} (${ledger.prn})`);
    setShowSearchDropdown(false);
    setLastReceipt(null);

    // If student has invoices, pick the first with dues
    if (ledger.invoices.length > 0) {
      const firstUnpaid = ledger.invoices.find((i) => i.outstandingBalance > 0) || ledger.invoices[0];
      setSelectedInvoiceId(firstUnpaid.invoiceId);
      setPaymentAmount(firstUnpaid.outstandingBalance);
    } else {
      setSelectedInvoiceId("");
      setPaymentAmount(0);
      // If applicable structures exist for cohort, pre-select first
      if (ledger.applicableStructures && ledger.applicableStructures.length > 0) {
        setInvoiceStructureId(ledger.applicableStructures[0].id);
      } else if (structures.length > 0) {
        setInvoiceStructureId(structures[0].id);
      }
    }
  };

  // Direct manual submit of search box (ID, PRN, or roll number)
  const handleSearchSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    const query = searchQuery.trim();
    if (!query) return;

    startTransition(async () => {
      const res = await getStudentFeeLedgerAction(query);
      if (res.success && res.data) {
        selectStudentLedger(res.data);
        setMessage(null);
      } else {
        // Fallback: search directory
        const searchRes = await searchFeeStudentsAction(query);
        if (searchRes.success && searchRes.data && searchRes.data.length > 0) {
          setSearchResults(searchRes.data);
          setShowSearchDropdown(true);
        } else {
          setActiveStudentLedger(null);
          setMessage({ type: "error", text: `No student record found matching "${query}". Please verify PRN or name.` });
        }
      }
    });
  };

  // Issue invoice for an individual student
  const handleIssueStudentInvoice = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!activeStudentLedger || !activeStudentLedger.activeEnrolmentId) {
      setMessage({ type: "error", text: "Cannot issue invoice: student has no active enrolment record." });
      return;
    }
    if (!invoiceStructureId) {
      setMessage({ type: "error", text: "Please select an applicable fee structure." });
      return;
    }

    startTransition(async () => {
      const res = await generateStudentInvoiceAction({
        studentId: activeStudentLedger.studentId,
        enrolmentId: activeStudentLedger.activeEnrolmentId as string,
        feeStructureId: invoiceStructureId,
        dueDate: new Date(invoiceDueDate),
        remarks: invoiceRemarks.trim() || undefined,
      });

      if (res.success && res.data) {
        setMessage({ type: "success", text: `Invoice ${res.data.invoiceNumber} generated successfully for ₹${res.data.totalDemand.toLocaleString()}.` });
        setInvoiceRemarks("");
        // Reload student ledger
        const updatedLedger = await getStudentFeeLedgerAction(activeStudentLedger.studentId);
        if (updatedLedger.success && updatedLedger.data) {
          selectStudentLedger(updatedLedger.data);
        }
        loadData();
      } else {
        setMessage({ type: "error", text: res.error || "Failed to generate student invoice." });
      }
    });
  };

  // Record a payment collection
  const handleRecordPayment = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedInvoiceId) {
      setMessage({ type: "error", text: "Please select an invoice to collect payment against." });
      return;
    }
    if (paymentAmount <= 0) {
      setMessage({ type: "error", text: "Payment amount must be greater than zero." });
      return;
    }
    if (!txnRef.trim()) {
      setMessage({ type: "error", text: "Transaction Reference / Bank UTR is mandatory." });
      return;
    }

    startTransition(async () => {
      const res = await recordFeePaymentAction({
        invoiceId: selectedInvoiceId,
        amountPaid: Number(paymentAmount),
        paymentMethod,
        transactionReference: txnRef.trim(),
        payerName: payerName.trim() || undefined,
        remarks: paymentRemarks.trim() || undefined,
      });

      if (res.success && res.data) {
        setMessage({ type: "success", text: `Payment of ₹${paymentAmount.toLocaleString()} recorded successfully.` });
        setLastReceipt({
          receiptNumber: res.data.receipt?.receiptNumber || "REC-SUCCESS",
          amountPaid: Number(paymentAmount),
          paymentMethod,
          transactionReference: txnRef.trim(),
          invoiceNumber: res.data.invoiceNumber,
        });
        setTxnRef("");
        setPayerName("");
        setPaymentRemarks("");

        // Refresh student ledger
        if (activeStudentLedger) {
          const updated = await getStudentFeeLedgerAction(activeStudentLedger.studentId);
          if (updated.success && updated.data) {
            selectStudentLedger(updated.data);
          }
        }
        loadData();
      } else {
        setMessage({ type: "error", text: res.error || "Failed to record payment." });
      }
    });
  };

  // Create Fee Structure
  const handleCreateStructure = async (e: React.FormEvent) => {
    e.preventDefault();
    startTransition(async () => {
      const res = await createFeeStructureAction({ ...newStructureForm, feeHeads: newStructureForm.heads });
      if (res.success) {
        setMessage({ type: "success", text: `Fee structure "${newStructureForm.name}" created successfully.` });
        setShowCreateModal(false);
        loadData();
      } else {
        setMessage({ type: "error", text: res.error || "Failed to create structure." });
      }
    });
  };

  // Edit Fee Structure
  const handleSaveEditedStructure = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!editingStructure) return;

    startTransition(async () => {
      const res = await updateFeeStructureAction(editingStructure.id, editStructureForm);
      if (res.success) {
        setMessage({ type: "success", text: `Fee structure "${editStructureForm.name}" updated successfully.` });
        setEditingStructure(null);
        loadData();
      } else {
        setMessage({ type: "error", text: res.error || "Failed to update structure." });
      }
    });
  };

  // Toggle Fee Structure active status
  const handleToggleActiveStructure = async (st: FeeStructureActionItem) => {
    const nextStatus = !st.isActive;
    startTransition(async () => {
      const res = await updateFeeStructureAction(st.id, { isActive: nextStatus });
      if (res.success) {
        setMessage({ type: "success", text: `Structure "${st.name}" is now ${nextStatus ? "Active" : "Inactive"}.` });
        loadData();
      } else {
        setMessage({ type: "error", text: res.error || "Failed to update status." });
      }
    });
  };

  // Inspect eligible cohort students
  const handleInspectCohort = async (st: FeeStructureActionItem) => {
    setLoadingCohort(true);
    const res = await getStructureEligibleStudentsAction(st.id);
    setLoadingCohort(false);
    if (res.success && res.data) {
      setCohortModal({ structure: res.data.structure, students: res.data.eligibleStudents });
    } else {
      setMessage({ type: "error", text: res.error || "Failed to load eligible students for structure." });
    }
  };

  // Batch invoice generation
  const handleBatchGenerate = async (structureId: string) => {
    if (!confirm("Generate demand invoices for all uninvoiced enrolled students in this cohort?")) return;
    startTransition(async () => {
      const res = await generateBatchInvoicesAction({
        feeStructureId: structureId,
        dueDate: new Date(Date.now() + 30 * 24 * 3600 * 1000),
      });

      if (res.success && res.data) {
        setMessage({
          type: "success",
          text: `Batch invoice generation complete. ${res.data.generatedCount} invoices issued (${res.data.skippedCount} already invoiced).`,
        });
        loadData();
        if (cohortModal && cohortModal.structure.id === structureId) {
          handleInspectCohort(cohortModal.structure);
        }
      } else {
        setMessage({ type: "error", text: res.error || "Batch generation failed." });
      }
    });
  };

  return (
    <div className="space-y-6">
      {/* Module Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 border-b border-slate-200 pb-5">
        <div>
          <h1 className="text-2xl font-bold tracking-tight text-slate-900">
            Student Fee Ledgers & Accounts
          </h1>
          <p className="text-sm text-slate-500 mt-1">
            Institutional fee structures, demand invoices, cashier collections, and double-entry clearance ledgers.
          </p>
        </div>
        <div className="flex items-center gap-2">
          <button
            onClick={() => setShowCreateModal(true)}
            className="inline-flex items-center justify-center px-4 py-2 text-sm font-semibold text-white bg-blue-600 rounded-lg hover:bg-blue-700 transition shadow-xs cursor-pointer"
          >
            + Create Fee Structure
          </button>
        </div>
      </div>

      {/* Alert Messaging */}
      {message && (
        <div
          className={`p-4 rounded-xl text-sm font-medium border flex items-center justify-between ${
            message.type === "success"
              ? "bg-emerald-50 text-emerald-800 border-emerald-200"
              : "bg-rose-50 text-rose-800 border-rose-200"
          }`}
        >
          <span>{message.text}</span>
          <button onClick={() => setMessage(null)} className="text-slate-400 hover:text-slate-600 text-xs cursor-pointer">
            ✕ Dismiss
          </button>
        </div>
      )}

      {/* Institutional Financial Overview Cards */}
      {overview && (
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          <div className="p-5 bg-white rounded-xl border border-slate-200 shadow-xs">
            <span className="text-xs font-semibold text-slate-500 uppercase tracking-wider">Total Demand Raised</span>
            <div className="text-2xl font-bold text-slate-900 mt-2">₹{overview.totalDemand.toLocaleString()}</div>
            <span className="text-xs text-slate-400 mt-1 block">{overview.totalInvoices} active invoices</span>
          </div>
          <div className="p-5 bg-white rounded-xl border border-slate-200 shadow-xs">
            <span className="text-xs font-semibold text-emerald-600 uppercase tracking-wider">Collected Dues</span>
            <div className="text-2xl font-bold text-emerald-600 mt-2">₹{overview.totalCollected.toLocaleString()}</div>
            <span className="text-xs text-slate-400 mt-1 block">{overview.totalReceipts} payment receipts</span>
          </div>
          <div className="p-5 bg-white rounded-xl border border-slate-200 shadow-xs">
            <span className="text-xs font-semibold text-rose-600 uppercase tracking-wider">Outstanding Dues</span>
            <div className="text-2xl font-bold text-rose-600 mt-2">₹{overview.totalOutstanding.toLocaleString()}</div>
            <span className="text-xs text-slate-400 mt-1 block">{defaulters.length} accounts with balance</span>
          </div>
          <div className="p-5 bg-white rounded-xl border border-slate-200 shadow-xs">
            <span className="text-xs font-semibold text-blue-600 uppercase tracking-wider">Collection Efficiency</span>
            <div className="text-2xl font-bold text-blue-600 mt-2">{overview.collectionRate}%</div>
            <span className="text-xs text-slate-400 mt-1 block">{overview.totalStructures} cohorts configured</span>
          </div>
        </div>
      )}

      {/* Tab Navigation */}
      <div className="flex border-b border-slate-200 space-x-6 text-sm font-semibold">
        <button
          onClick={() => setActiveTab("overview")}
          className={`pb-3 transition border-b-2 cursor-pointer ${
            activeTab === "overview"
              ? "border-blue-600 text-blue-600"
              : "border-transparent text-slate-500 hover:text-slate-800"
          }`}
        >
          Fee Collection & Cashier POS
        </button>
        <button
          onClick={() => setActiveTab("structures")}
          className={`pb-3 transition border-b-2 cursor-pointer ${
            activeTab === "structures"
              ? "border-blue-600 text-blue-600"
              : "border-transparent text-slate-500 hover:text-slate-800"
          }`}
        >
          Fee Structures ({structures.length})
        </button>
        <button
          onClick={() => setActiveTab("defaulters")}
          className={`pb-3 transition border-b-2 cursor-pointer ${
            activeTab === "defaulters"
              ? "border-blue-600 text-blue-600"
              : "border-transparent text-slate-500 hover:text-slate-800"
          }`}
        >
          Outstanding Defaulters ({defaulters.length})
        </button>
      </div>

      {/* TAB 1: Fee Collection & Student Ledger */}
      {activeTab === "overview" && (
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {/* Left Column: Search & Collection Form */}
          <div className="lg:col-span-1 space-y-6">
            {/* Live Autocomplete Search Box */}
            <div ref={searchContainerRef} className="bg-white p-5 rounded-xl border border-slate-200 shadow-xs space-y-4 relative">
              <h2 className="text-sm font-bold text-slate-900 uppercase tracking-wider">Find Student Account</h2>
              <form onSubmit={handleSearchSubmit} className="space-y-3">
                <div className="relative">
                  <input
                    type="text"
                    placeholder="Search by Student Name, PRN, or Roll..."
                    value={searchQuery}
                    onChange={(e) => {
                      setSearchQuery(e.target.value);
                      setShowSearchDropdown(true);
                    }}
                    onFocus={() => setShowSearchDropdown(true)}
                    className="w-full px-3 py-2 text-sm border border-slate-300 rounded-lg focus:outline-hidden focus:ring-2 focus:ring-blue-500"
                  />
                  {isSearching && (
                    <div className="absolute right-3 top-2.5 text-xs text-slate-400 font-medium animate-pulse">
                      Searching...
                    </div>
                  )}
                </div>

                {/* Autocomplete Dropdown */}
                {showSearchDropdown && (
                  <div className="absolute left-0 right-0 top-full mt-1 bg-white border border-slate-200 rounded-xl shadow-lg z-30 max-h-80 overflow-y-auto divide-y divide-slate-100">
                    {searchResults.length > 0 ? (
                      searchResults.map((std) => (
                        <div
                          key={std.id}
                          onClick={() => {
                            startTransition(async () => {
                              const res = await getStudentFeeLedgerAction(std.id);
                              if (res.success && res.data) {
                                selectStudentLedger(res.data);
                              }
                            });
                          }}
                          className="p-3 hover:bg-blue-50/70 cursor-pointer transition-colors space-y-1"
                        >
                          <div className="flex items-center justify-between">
                            <span className="font-bold text-slate-900 text-sm">{std.fullName}</span>
                            <span className={`text-[10px] font-bold px-2 py-0.5 rounded-full border ${
                              std.feeClearanceStatus === "CLEARED"
                                ? "bg-emerald-50 text-emerald-700 border-emerald-200"
                                : std.feeClearanceStatus === "PARTIALLY_CLEARED"
                                ? "bg-amber-50 text-amber-700 border-amber-200"
                                : std.feeClearanceStatus === "PENDING_DUES"
                                ? "bg-rose-50 text-rose-700 border-rose-200"
                                : "bg-slate-100 text-slate-600 border-slate-200"
                            }`}>
                              {std.feeClearanceStatus === "NOT_INVOICED" ? "Not Invoiced" : std.feeClearanceStatus.replace("_", " ")}
                            </span>
                          </div>
                          <div className="text-xs text-slate-500 flex items-center space-x-2 font-mono">
                            <span>PRN: {std.prn}</span>
                            <span>•</span>
                            <span>Roll: {std.rollNumber}</span>
                          </div>
                          <div className="text-[11px] text-slate-400">
                            {std.programmeName} • Sem {std.semesterNumber} ({std.divisionName})
                          </div>
                        </div>
                      ))
                    ) : searchQuery.trim().length >= 2 && !isSearching ? (
                      <div className="p-4 text-center text-xs text-slate-400">
                        No student found matching &ldquo;{searchQuery}&rdquo;
                      </div>
                    ) : null}
                  </div>
                )}

                <button
                  type="submit"
                  disabled={isPending}
                  className="w-full py-2 bg-slate-900 text-white text-sm font-semibold rounded-lg hover:bg-slate-800 transition cursor-pointer"
                >
                  {isPending ? "Searching..." : "Retrieve Financial Ledger"}
                </button>
              </form>
            </div>

            {/* Digital Receipt Voucher Banner */}
            {lastReceipt && (
              <div className="bg-emerald-50 border border-emerald-200 rounded-xl p-4 space-y-2 shadow-xs text-xs">
                <div className="flex items-center justify-between border-b border-emerald-200 pb-2">
                  <span className="font-bold text-emerald-900 uppercase tracking-wider">Payment Voucher Issued</span>
                  <span className="font-mono font-bold text-emerald-800">{lastReceipt.receiptNumber}</span>
                </div>
                <div className="flex justify-between text-slate-700">
                  <span>Invoice:</span>
                  <span className="font-mono">{lastReceipt.invoiceNumber}</span>
                </div>
                <div className="flex justify-between text-slate-700">
                  <span>Amount Collected:</span>
                  <span className="font-mono font-bold text-emerald-800">₹{lastReceipt.amountPaid.toLocaleString()}</span>
                </div>
                <div className="flex justify-between text-slate-700">
                  <span>Transaction UTR:</span>
                  <span className="font-mono text-slate-800">{lastReceipt.transactionReference}</span>
                </div>
                <div className="text-[11px] text-emerald-700 pt-1">
                  ✓ Subsidiary ledger balance and institutional collection totals updated.
                </div>
              </div>
            )}

            {/* Collection Form (Active if ledger loaded & dues exist) */}
            {activeStudentLedger && activeStudentLedger.invoices.some((i) => i.outstandingBalance > 0) && (
              <div className="bg-white p-5 rounded-xl border border-slate-200 shadow-xs space-y-4">
                <div className="border-b border-slate-100 pb-3">
                  <h2 className="text-sm font-bold text-slate-900 uppercase tracking-wider">Collect Fee & Issue Receipt</h2>
                  <p className="text-xs text-slate-500 mt-0.5">Cashier Point-of-Sale voucher entry</p>
                </div>
                <form onSubmit={handleRecordPayment} className="space-y-3 text-xs">
                  <div>
                    <label className="block font-medium text-slate-700 mb-1">Target Invoice</label>
                    <select
                      value={selectedInvoiceId}
                      onChange={(e) => {
                        setSelectedInvoiceId(e.target.value);
                        const inv = activeStudentLedger.invoices.find((i) => i.invoiceId === e.target.value);
                        if (inv) setPaymentAmount(inv.outstandingBalance);
                      }}
                      className="w-full px-3 py-2 border border-slate-300 rounded-lg text-xs"
                    >
                      {activeStudentLedger.invoices.map((inv) => (
                        <option key={inv.invoiceId} value={inv.invoiceId}>
                          {inv.invoiceNumber} ({inv.structureName}) - Due: ₹{inv.outstandingBalance.toLocaleString()}
                        </option>
                      ))}
                    </select>
                  </div>

                  <div>
                    <label className="block font-medium text-slate-700 mb-1">Amount to Collect (₹)</label>
                    <input
                      type="number"
                      min={1}
                      max={activeStudentLedger.invoices.find((i) => i.invoiceId === selectedInvoiceId)?.outstandingBalance || undefined}
                      value={paymentAmount || ""}
                      onChange={(e) => setPaymentAmount(Number(e.target.value))}
                      required
                      className="w-full px-3 py-2 border border-slate-300 rounded-lg font-mono font-bold text-slate-900 text-xs"
                    />
                  </div>

                  <div>
                    <label className="block font-medium text-slate-700 mb-1">Payment Instrument</label>
                    <select
                      value={paymentMethod}
                      onChange={(e) => setPaymentMethod(e.target.value as "UPI" | "NEFT_RTGS" | "CHEQUE" | "CASH" | "CARD" | "DEMAND_DRAFT")}
                      className="w-full px-3 py-2 border border-slate-300 rounded-lg text-xs"
                    >
                      <option value="UPI">UPI / QR Instant Transfer</option>
                      <option value="NEFT_RTGS">NEFT / RTGS Bank Transfer</option>
                      <option value="CHEQUE">Account Payee Cheque</option>
                      <option value="CASH">Cash Counter Voucher</option>
                      <option value="CARD">POS Debit / Credit Card</option>
                      <option value="DEMAND_DRAFT">Demand Draft</option>
                    </select>
                  </div>

                  <div>
                    <label className="block font-medium text-slate-700 mb-1">Transaction Reference / UTR / Cheque No.</label>
                    <input
                      type="text"
                      placeholder="e.g. UTR-2026-981245 or CHQ-001290"
                      value={txnRef}
                      onChange={(e) => setTxnRef(e.target.value)}
                      required
                      className="w-full px-3 py-2 border border-slate-300 rounded-lg font-mono text-xs"
                    />
                  </div>

                  <div>
                    <label className="block font-medium text-slate-700 mb-1">Payer Name (Optional)</label>
                    <input
                      type="text"
                      placeholder="e.g. Self / Guardian Name"
                      value={payerName}
                      onChange={(e) => setPayerName(e.target.value)}
                      className="w-full px-3 py-2 border border-slate-300 rounded-lg text-xs"
                    />
                  </div>

                  <div>
                    <label className="block font-medium text-slate-700 mb-1">Cashier Remarks (Optional)</label>
                    <input
                      type="text"
                      placeholder="e.g. Term fee instalment verified"
                      value={paymentRemarks}
                      onChange={(e) => setPaymentRemarks(e.target.value)}
                      className="w-full px-3 py-2 border border-slate-300 rounded-lg text-xs"
                    />
                  </div>

                  <button
                    type="submit"
                    disabled={isPending}
                    className="w-full py-2 bg-emerald-600 hover:bg-emerald-700 text-white font-semibold rounded-lg transition shadow-xs cursor-pointer"
                  >
                    {isPending ? "Processing Collection..." : "Record Payment & Issue Receipt"}
                  </button>
                </form>
              </div>
            )}
          </div>

          {/* Right Column: Detailed Ledger Inspection & Digital Receipts */}
          <div className="lg:col-span-2 space-y-6">
            {activeStudentLedger ? (
              <div className="bg-white p-6 rounded-xl border border-slate-200 shadow-xs space-y-6">
                {/* Student Banner */}
                <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between pb-4 border-b border-slate-100 gap-4">
                  <div>
                    <h2 className="text-lg font-bold text-slate-900">{activeStudentLedger.fullName}</h2>
                    <p className="text-xs text-slate-500 mt-1">
                      PRN: <span className="font-mono font-bold text-slate-700">{activeStudentLedger.prn}</span> | Roll:{" "}
                      <span className="font-mono font-bold text-slate-700">{activeStudentLedger.rollNumber}</span> |{" "}
                      {activeStudentLedger.programmeName}
                      {activeStudentLedger.semesterNumber ? ` • Sem ${activeStudentLedger.semesterNumber}` : ""}
                      {activeStudentLedger.divisionName ? ` (${activeStudentLedger.divisionName})` : ""}
                    </p>
                  </div>
                  <div>
                    <span
                      className={`inline-flex items-center px-3 py-1 rounded-full text-xs font-bold uppercase tracking-wider ${
                        activeStudentLedger.feeClearanceStatus === "CLEARED"
                          ? "bg-emerald-100 text-emerald-800"
                          : activeStudentLedger.feeClearanceStatus === "PARTIALLY_CLEARED"
                          ? "bg-amber-100 text-amber-800"
                          : activeStudentLedger.feeClearanceStatus === "NOT_INVOICED"
                          ? "bg-slate-100 text-slate-700"
                          : "bg-rose-100 text-rose-800"
                      }`}
                    >
                      {activeStudentLedger.feeClearanceStatus === "NOT_INVOICED"
                        ? "NOT INVOICED"
                        : activeStudentLedger.feeClearanceStatus.replace(/_/g, " ")}
                    </span>
                  </div>
                </div>

                {/* Ledger Financial Summary Strip */}
                <div className="grid grid-cols-3 gap-4 text-center">
                  <div className="p-3 bg-slate-50 rounded-lg border border-slate-100">
                    <span className="text-xs text-slate-500 block">Total Invoiced Demand</span>
                    <span className="text-lg font-bold font-mono text-slate-900">
                      ₹{activeStudentLedger.totalDemand.toLocaleString()}
                    </span>
                  </div>
                  <div className="p-3 bg-emerald-50/50 rounded-lg border border-emerald-100">
                    <span className="text-xs text-emerald-600 block">Total Collected</span>
                    <span className="text-lg font-bold font-mono text-emerald-700">
                      ₹{activeStudentLedger.totalPaid.toLocaleString()}
                    </span>
                  </div>
                  <div className="p-3 bg-rose-50/50 rounded-lg border border-rose-100">
                    <span className="text-xs text-rose-600 block">Outstanding Balance</span>
                    <span className="text-lg font-bold font-mono text-rose-700">
                      ₹{activeStudentLedger.outstandingBalance.toLocaleString()}
                    </span>
                  </div>
                </div>

                {/* Ledger Breakdown by Invoice */}
                {activeStudentLedger.invoices.length > 0 ? (
                  <div className="space-y-4">
                    <h3 className="text-xs font-bold text-slate-500 uppercase tracking-wider">Invoices & Payment Vouchers</h3>
                    {activeStudentLedger.invoices.map((inv) => (
                      <div key={inv.invoiceId} className="border border-slate-200 rounded-xl p-4 bg-slate-50/50 space-y-3">
                        <div className="flex items-center justify-between">
                          <div>
                            <span className="font-mono font-bold text-sm text-slate-900">{inv.invoiceNumber}</span>
                            <span className="text-xs text-slate-500 ml-2">({inv.structureName})</span>
                          </div>
                          <span
                            className={`px-2.5 py-0.5 rounded-full text-xs font-bold ${
                              inv.status === "PAID"
                                ? "bg-emerald-100 text-emerald-800"
                                : inv.status === "PARTIALLY_PAID"
                                ? "bg-amber-100 text-amber-800"
                                : "bg-rose-100 text-rose-800"
                            }`}
                          >
                            {inv.status}
                          </span>
                        </div>

                        {/* Fee Heads Breakdown */}
                        <div className="space-y-1.5 pt-2 border-t border-slate-200/60">
                          <span className="text-xs font-semibold text-slate-400 uppercase tracking-wider block mb-1">
                            Itemized Component Heads
                          </span>
                          <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 text-xs">
                            {inv.feeHeads.map((h, idx) => (
                              <div key={idx} className="flex justify-between p-2 bg-white rounded border border-slate-100">
                                <span className="text-slate-600">{h.headName}</span>
                                <span className="font-mono font-bold text-slate-800">₹{h.amount.toLocaleString()}</span>
                              </div>
                            ))}
                          </div>
                        </div>

                        {/* Receipts */}
                        {inv.receipts.length > 0 && (
                          <div className="space-y-1.5 pt-2 border-t border-slate-200/60">
                            <span className="text-xs font-semibold text-slate-400 uppercase tracking-wider block mb-1">
                              Historical Receipts ({inv.receipts.length})
                            </span>
                            <div className="space-y-2">
                              {inv.receipts.map((r) => (
                                <div
                                  key={r.id}
                                  className="flex items-center justify-between p-2.5 bg-white rounded-lg border border-slate-200 text-xs"
                                >
                                  <div>
                                    <div className="font-mono font-bold text-slate-900">{r.receiptNumber}</div>
                                    <div className="text-slate-400 text-[11px] mt-0.5">
                                      UTR: <span className="font-mono text-slate-600">{r.transactionReference}</span> • {r.paymentMethod} • {new Date(r.paymentDate).toLocaleDateString()}
                                      {r.collectedByName ? ` • Cashier: ${r.collectedByName}` : ""}
                                    </div>
                                  </div>
                                  <div className="font-mono font-bold text-emerald-700 text-sm">
                                    ₹{r.amountPaid.toLocaleString()}
                                  </div>
                                </div>
                              ))}
                            </div>
                          </div>
                        )}
                      </div>
                    ))}
                  </div>
                ) : (
                  /* UNINVOICED STUDENT INVOICE GENERATION CARD */
                  <div className="p-6 bg-slate-50 border border-slate-200 rounded-xl space-y-4">
                    <div className="border-b border-slate-200 pb-3">
                      <h3 className="text-sm font-bold text-slate-900 uppercase tracking-wider">Generate Student Fee Invoice</h3>
                      <p className="text-xs text-slate-500 mt-1">
                        This student is currently <strong className="text-slate-700">NOT INVOICED</strong>. Assign an applicable fee structure to raise the demand invoice.
                      </p>
                    </div>

                    <form onSubmit={handleIssueStudentInvoice} className="space-y-3 text-xs">
                      <div>
                        <label className="block font-medium text-slate-700 mb-1">Applicable Cohort Fee Structure</label>
                        <select
                          value={invoiceStructureId}
                          onChange={(e) => setInvoiceStructureId(e.target.value)}
                          required
                          className="w-full px-3 py-2 border border-slate-300 rounded-lg text-xs bg-white"
                        >
                          <option value="">-- Select Structure --</option>
                          {activeStudentLedger.applicableStructures && activeStudentLedger.applicableStructures.length > 0 ? (
                            activeStudentLedger.applicableStructures.map((st) => (
                              <option key={st.id} value={st.id}>
                                {st.name} — Demand: ₹{st.totalAmount.toLocaleString()} ({st.academicYearName})
                              </option>
                            ))
                          ) : (
                            structures.map((st) => (
                              <option key={st.id} value={st.id}>
                                {st.name} — Demand: ₹{st.totalAmount.toLocaleString()}
                              </option>
                            ))
                          )}
                        </select>
                      </div>

                      <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                        <div>
                          <label className="block font-medium text-slate-700 mb-1">Payment Due Date</label>
                          <input
                            type="date"
                            value={invoiceDueDate}
                            onChange={(e) => setInvoiceDueDate(e.target.value)}
                            required
                            className="w-full px-3 py-2 border border-slate-300 rounded-lg text-xs bg-white"
                          />
                        </div>
                        <div>
                          <label className="block font-medium text-slate-700 mb-1">Invoice Remarks (Optional)</label>
                          <input
                            type="text"
                            placeholder="e.g. Regular term admission demand"
                            value={invoiceRemarks}
                            onChange={(e) => setInvoiceRemarks(e.target.value)}
                            className="w-full px-3 py-2 border border-slate-300 rounded-lg text-xs bg-white"
                          />
                        </div>
                      </div>

                      <button
                        type="submit"
                        disabled={isPending}
                        className="px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white font-semibold rounded-lg transition shadow-xs cursor-pointer text-xs"
                      >
                        {isPending ? "Generating Invoice..." : "Generate & Issue Fee Invoice"}
                      </button>
                    </form>
                  </div>
                )}
              </div>
            ) : (
              <div className="p-12 text-center bg-white rounded-xl border border-slate-200 text-slate-400 space-y-2">
                <span className="text-3xl block mb-2">💳</span>
                <p className="text-sm font-semibold text-slate-700">Search for a student account to inspect fee ledgers or record payments.</p>
                <p className="text-xs text-slate-400">Use the student search box on the left or select an account from the defaulters roster.</p>
              </div>
            )}
          </div>
        </div>
      )}

      {/* TAB 2: Fee Structures */}
      {activeTab === "structures" && (
        <div className="space-y-4">
          <div className="flex justify-between items-center bg-white p-4 rounded-xl border border-slate-200">
            <div>
              <h2 className="text-sm font-bold text-slate-900 uppercase tracking-wider">Configured Fee Structures</h2>
              <p className="text-xs text-slate-500 mt-0.5">Manage programmatically enforced semester cohorts and component heads</p>
            </div>
            <button
              onClick={() => setShowCreateModal(true)}
              className="px-3 py-1.5 bg-blue-600 text-white rounded-lg text-xs font-semibold hover:bg-blue-700 transition cursor-pointer"
            >
              + New Structure
            </button>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {structures.map((st) => (
              <div key={st.id} className="bg-white p-5 rounded-xl border border-slate-200 shadow-xs space-y-4">
                <div className="flex items-start justify-between">
                  <div>
                    <div className="flex items-center space-x-2">
                      <h3 className="font-bold text-base text-slate-900">{st.name}</h3>
                      <span className={`text-[10px] font-bold px-2 py-0.5 rounded-full border ${
                        st.isActive
                          ? "bg-emerald-50 text-emerald-700 border-emerald-200"
                          : "bg-slate-100 text-slate-500 border-slate-200"
                      }`}>
                        {st.isActive ? "Active" : "Inactive"}
                      </span>
                    </div>
                    <p className="text-xs text-slate-500 mt-1">
                      {st.programme?.name} (Sem {st.semesterNumber}) | {st.academicYear?.name}
                    </p>
                  </div>
                  <span className="text-lg font-mono font-bold text-slate-900">
                    ₹{st.totalAmount.toLocaleString()}
                  </span>
                </div>

                {/* Component Fee Heads */}
                <div className="space-y-1.5 pt-2 border-t border-slate-100">
                  <span className="text-xs font-semibold text-slate-400 uppercase tracking-wider block mb-1">
                    Component Fee Heads
                  </span>
                  {st.feeHeads?.map((h) => (
                    <div key={h.id} className="flex justify-between text-xs text-slate-600">
                      <span>{h.headName}</span>
                      <span className="font-mono">₹{h.amount.toLocaleString()}</span>
                    </div>
                  ))}
                </div>

                <div className="pt-3 border-t border-slate-100 flex flex-wrap items-center justify-between gap-2">
                  <span className="text-xs text-slate-500">
                    {st._count?.invoices || 0} students invoiced
                  </span>
                  <div className="flex items-center space-x-2">
                    <button
                      onClick={() => handleInspectCohort(st)}
                      className="px-2.5 py-1 bg-slate-100 text-slate-700 hover:bg-slate-200 rounded text-xs font-semibold transition cursor-pointer"
                    >
                      View Enrolled Cohort
                    </button>
                    <button
                      onClick={() => {
                        setEditingStructure(st);
                        setEditStructureForm({
                          name: st.name,
                          isActive: st.isActive ?? true,
                          heads: st.feeHeads ? st.feeHeads.map(h => ({ headName: h.headName, amount: h.amount, isOptional: h.isOptional })) : [],
                        });
                      }}
                      className="px-2.5 py-1 bg-slate-100 text-slate-700 hover:bg-slate-200 rounded text-xs font-semibold transition cursor-pointer"
                    >
                      Edit
                    </button>
                    <button
                      onClick={() => handleToggleActiveStructure(st)}
                      className={`px-2.5 py-1 rounded text-xs font-semibold transition cursor-pointer ${
                        st.isActive
                          ? "bg-rose-50 text-rose-700 hover:bg-rose-100"
                          : "bg-emerald-50 text-emerald-700 hover:bg-emerald-100"
                      }`}
                    >
                      {st.isActive ? "Deactivate" : "Activate"}
                    </button>
                    <button
                      onClick={() => handleBatchGenerate(st.id)}
                      className="px-2.5 py-1 bg-slate-900 text-white rounded text-xs font-semibold hover:bg-slate-800 transition cursor-pointer"
                    >
                      Batch Invoice
                    </button>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* TAB 3: Outstanding Defaulters */}
      {activeTab === "defaulters" && (
        <div className="bg-white rounded-xl border border-slate-200 shadow-xs overflow-hidden">
          <div className="p-4 border-b border-slate-200 flex justify-between items-center">
            <div>
              <h2 className="text-sm font-bold text-slate-900 uppercase tracking-wider">Outstanding Defaulters Register</h2>
              <p className="text-xs text-slate-500 mt-0.5">Accounts with unpaid or overdue demand invoices</p>
            </div>
            <span className="text-xs font-bold px-2.5 py-1 bg-rose-50 text-rose-700 border border-rose-200 rounded-full">
              {defaulters.length} Accounts Pending
            </span>
          </div>

          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs">
              <thead className="bg-slate-50 text-slate-500 uppercase tracking-wider border-b border-slate-200">
                <tr>
                  <th className="p-3">Student</th>
                  <th className="p-3">PRN / Roll</th>
                  <th className="p-3">Programme</th>
                  <th className="p-3 text-right">Total Demand</th>
                  <th className="p-3 text-right">Paid</th>
                  <th className="p-3 text-right">Outstanding</th>
                  <th className="p-3 text-center">Action</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {defaulters.length > 0 ? (
                  defaulters.map((d) => (
                    <tr key={d.studentId} className="hover:bg-slate-50/80 transition-colors">
                      <td className="p-3 font-bold text-slate-900">{d.fullName}</td>
                      <td className="p-3 font-mono text-slate-600">{d.prn}</td>
                      <td className="p-3 text-slate-600">
                        {d.programmeCode} (Sem {d.semesterNumber})
                      </td>
                      <td className="p-3 text-right font-mono font-medium text-slate-900">
                        ₹{d.totalDemand.toLocaleString()}
                      </td>
                      <td className="p-3 text-right font-mono text-emerald-700">
                        ₹{d.totalPaid.toLocaleString()}
                      </td>
                      <td className="p-3 text-right font-mono font-bold text-rose-700">
                        ₹{d.outstandingBalance.toLocaleString()}
                      </td>
                      <td className="p-3 text-center">
                        <button
                          onClick={() => {
                            setActiveTab("overview");
                            startTransition(async () => {
                              const res = await getStudentFeeLedgerAction(d.studentId);
                              if (res.success && res.data) {
                                selectStudentLedger(res.data);
                              }
                            });
                          }}
                          className="px-3 py-1 bg-blue-50 text-blue-700 hover:bg-blue-100 border border-blue-200 rounded font-semibold transition cursor-pointer"
                        >
                          Collect Fee
                        </button>
                      </td>
                    </tr>
                  ))
                ) : (
                  <tr>
                    <td colSpan={7} className="p-8 text-center text-slate-400">
                      No outstanding accounts found. All fee invoices are fully settled!
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* MODAL 1: Create Structure Modal */}
      {showCreateModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/50 backdrop-blur-xs p-4">
          <div className="bg-white rounded-xl shadow-xl max-w-lg w-full p-6 space-y-4 max-h-[90vh] overflow-y-auto">
            <div className="flex justify-between items-center border-b border-slate-100 pb-3">
              <h3 className="font-bold text-base text-slate-900">Establish Fee Structure</h3>
              <button onClick={() => setShowCreateModal(false)} className="text-slate-400 hover:text-slate-600 cursor-pointer">
                ✕
              </button>
            </div>
            <form onSubmit={handleCreateStructure} className="space-y-4 text-sm">
              <div>
                <label className="block text-xs font-medium text-slate-700 mb-1">Structure Name</label>
                <input
                  type="text"
                  placeholder="e.g. B.Sc. Culinary Arts - Semester 1 (2026-27)"
                  value={newStructureForm.name}
                  onChange={(e) => setNewStructureForm({ ...newStructureForm, name: e.target.value })}
                  required
                  className="w-full px-3 py-2 border border-slate-300 rounded-lg text-xs"
                />
              </div>

              <div>
                <label className="block text-xs font-medium text-slate-700 mb-1">Academic Year</label>
                <select
                  value={newStructureForm.academicYearId}
                  onChange={(e) => setNewStructureForm({ ...newStructureForm, academicYearId: e.target.value })}
                  required
                  className="w-full px-3 py-2 border border-slate-300 rounded-lg text-xs"
                >
                  <option value="">-- Select Academic Year --</option>
                  {academicYears.map((ay) => (
                    <option key={ay.id} value={ay.id}>
                      {ay.name} ({ay.code})
                    </option>
                  ))}
                </select>
              </div>

              <div>
                <label className="block text-xs font-medium text-slate-700 mb-1">Programme</label>
                <select
                  value={newStructureForm.programmeId}
                  onChange={(e) => setNewStructureForm({ ...newStructureForm, programmeId: e.target.value })}
                  required
                  className="w-full px-3 py-2 border border-slate-300 rounded-lg text-xs"
                >
                  <option value="">-- Select Programme --</option>
                  {programmes.map((p) => (
                    <option key={p.id} value={p.id}>
                      {p.name} ({p.code})
                    </option>
                  ))}
                </select>
              </div>

              <div>
                <label className="block text-xs font-medium text-slate-700 mb-1">Semester Number</label>
                <input
                  type="number"
                  min={1}
                  max={8}
                  value={newStructureForm.semesterNumber}
                  onChange={(e) => setNewStructureForm({ ...newStructureForm, semesterNumber: Number(e.target.value) })}
                  className="w-full px-3 py-2 border border-slate-300 rounded-lg text-xs"
                />
              </div>

              {/* Fee Heads */}
              <div className="space-y-2">
                <label className="block text-xs font-medium text-slate-700">Itemized Heads & Demand Amounts</label>
                <div className="space-y-2">
                  {newStructureForm.heads.map((h, idx) => (
                    <div key={idx} className="flex gap-2 items-center">
                      <input
                        type="text"
                        value={h.headName}
                        onChange={(e) => {
                          const updated = [...newStructureForm.heads];
                          updated[idx].headName = e.target.value;
                          setNewStructureForm({ ...newStructureForm, heads: updated });
                        }}
                        className="flex-1 px-3 py-1.5 border border-slate-300 rounded text-xs"
                      />
                      <input
                        type="number"
                        value={h.amount}
                        onChange={(e) => {
                          const updated = [...newStructureForm.heads];
                          updated[idx].amount = Number(e.target.value);
                          setNewStructureForm({ ...newStructureForm, heads: updated });
                        }}
                        className="w-24 px-3 py-1.5 border border-slate-300 rounded text-xs font-mono"
                      />
                    </div>
                  ))}
                </div>
              </div>

              <div className="flex justify-end gap-2 pt-3 border-t border-slate-100">
                <button
                  type="button"
                  onClick={() => setShowCreateModal(false)}
                  className="px-3 py-1.5 text-xs text-slate-600 hover:bg-slate-100 rounded cursor-pointer"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={isPending}
                  className="px-4 py-1.5 bg-blue-600 hover:bg-blue-700 text-white rounded text-xs font-semibold cursor-pointer"
                >
                  {isPending ? "Creating..." : "Save Structure"}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* MODAL 2: Edit Structure Modal */}
      {editingStructure && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/50 backdrop-blur-xs p-4">
          <div className="bg-white rounded-xl shadow-xl max-w-lg w-full p-6 space-y-4 max-h-[90vh] overflow-y-auto">
            <div className="flex justify-between items-center border-b border-slate-100 pb-3">
              <h3 className="font-bold text-base text-slate-900">Edit Fee Structure</h3>
              <button onClick={() => setEditingStructure(null)} className="text-slate-400 hover:text-slate-600 cursor-pointer">
                ✕
              </button>
            </div>
            <form onSubmit={handleSaveEditedStructure} className="space-y-4 text-sm">
              <div>
                <label className="block text-xs font-medium text-slate-700 mb-1">Structure Name</label>
                <input
                  type="text"
                  value={editStructureForm.name}
                  onChange={(e) => setEditStructureForm({ ...editStructureForm, name: e.target.value })}
                  required
                  className="w-full px-3 py-2 border border-slate-300 rounded-lg text-xs"
                />
              </div>

              <div className="flex items-center space-x-2">
                <input
                  type="checkbox"
                  id="editIsActive"
                  checked={editStructureForm.isActive}
                  onChange={(e) => setEditStructureForm({ ...editStructureForm, isActive: e.target.checked })}
                  className="rounded text-blue-600 focus:ring-blue-500 h-4 w-4 cursor-pointer"
                />
                <label htmlFor="editIsActive" className="text-xs font-medium text-slate-700 cursor-pointer">
                  Active Structure (Permits new invoice issuance)
                </label>
              </div>

              {/* Heads */}
              <div className="space-y-2">
                <label className="block text-xs font-medium text-slate-700">
                  Component Heads & Amounts (Applied to new invoices; preserves historical invoices)
                </label>
                <div className="space-y-2">
                  {editStructureForm.heads.map((h, idx) => (
                    <div key={idx} className="flex gap-2 items-center">
                      <input
                        type="text"
                        value={h.headName}
                        onChange={(e) => {
                          const updated = [...editStructureForm.heads];
                          updated[idx].headName = e.target.value;
                          setEditStructureForm({ ...editStructureForm, heads: updated });
                        }}
                        className="flex-1 px-3 py-1.5 border border-slate-300 rounded text-xs"
                      />
                      <input
                        type="number"
                        value={h.amount}
                        onChange={(e) => {
                          const updated = [...editStructureForm.heads];
                          updated[idx].amount = Number(e.target.value);
                          setEditStructureForm({ ...editStructureForm, heads: updated });
                        }}
                        className="w-24 px-3 py-1.5 border border-slate-300 rounded text-xs font-mono"
                      />
                    </div>
                  ))}
                </div>
              </div>

              <div className="flex justify-end gap-2 pt-3 border-t border-slate-100">
                <button
                  type="button"
                  onClick={() => setEditingStructure(null)}
                  className="px-3 py-1.5 text-xs text-slate-600 hover:bg-slate-100 rounded cursor-pointer"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={isPending}
                  className="px-4 py-1.5 bg-blue-600 hover:bg-blue-700 text-white rounded text-xs font-semibold cursor-pointer"
                >
                  {isPending ? "Saving..." : "Update Structure"}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* MODAL 3: Cohort Eligible Students Modal */}
      {cohortModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/50 backdrop-blur-xs p-4">
          <div className="bg-white rounded-xl shadow-xl max-w-2xl w-full p-6 space-y-4 max-h-[85vh] overflow-y-auto">
            <div className="flex justify-between items-center border-b border-slate-100 pb-3">
              <div>
                <h3 className="font-bold text-base text-slate-900">Enrolled Cohort for Structure</h3>
                <p className="text-xs text-slate-500 mt-0.5">{cohortModal.structure.name}</p>
              </div>
              <button onClick={() => setCohortModal(null)} className="text-slate-400 hover:text-slate-600 cursor-pointer">
                ✕
              </button>
            </div>

            <div className="flex justify-between items-center text-xs bg-slate-50 p-3 rounded-lg border border-slate-200">
              <div>
                Eligible Students: <strong className="text-slate-900">{cohortModal.students.length}</strong> | Invoiced:{" "}
                <strong className="text-emerald-700">
                  {cohortModal.students.filter((s) => s.isInvoiced).length}
                </strong>{" "}
                | Pending:{" "}
                <strong className="text-rose-700">
                  {cohortModal.students.filter((s) => !s.isInvoiced).length}
                </strong>
              </div>
              <button
                onClick={() => handleBatchGenerate(cohortModal.structure.id)}
                className="px-3 py-1 bg-slate-900 text-white font-semibold rounded hover:bg-slate-800 transition cursor-pointer"
              >
                Invoice All Pending
              </button>
            </div>

            <div className="divide-y divide-slate-100 border border-slate-200 rounded-lg max-h-72 overflow-y-auto text-xs">
              {cohortModal.students.map((std) => (
                <div key={std.studentId} className="p-3 flex items-center justify-between hover:bg-slate-50/70">
                  <div>
                    <div className="font-bold text-slate-900">{std.fullName}</div>
                    <div className="text-slate-400 font-mono text-[11px]">
                      PRN: {std.prn} • Roll: {std.rollNumber} • Div: {std.divisionName}
                    </div>
                  </div>
                  <div>
                    {std.isInvoiced ? (
                      <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-emerald-100 text-emerald-800">
                        Invoiced ({std.invoiceNumber})
                      </span>
                    ) : (
                      <button
                        onClick={async () => {
                          const res = await generateStudentInvoiceAction({
                            studentId: std.studentId,
                            enrolmentId: std.enrolmentId,
                            feeStructureId: cohortModal.structure.id,
                            dueDate: new Date(Date.now() + 30 * 24 * 3600 * 1000),
                          });
                          if (res.success) {
                            setMessage({ type: "success", text: `Invoiced student ${std.fullName} successfully.` });
                            handleInspectCohort(cohortModal.structure);
                            loadData();
                          }
                        }}
                        className="px-2 py-0.5 rounded bg-blue-50 text-blue-700 hover:bg-blue-100 border border-blue-200 font-semibold cursor-pointer"
                      >
                        Issue Invoice
                      </button>
                    )}
                  </div>
                </div>
              ))}
            </div>

            <div className="flex justify-end pt-2">
              <button
                onClick={() => setCohortModal(null)}
                className="px-4 py-1.5 bg-slate-100 text-slate-700 rounded text-xs font-semibold hover:bg-slate-200 cursor-pointer"
              >
                Close
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
