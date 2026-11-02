"use client";

import React, { useState, useEffect, useCallback, useTransition } from "react";
import { Icon } from "@/components/common/Icon";
import {
  getStudentDocumentsAction,
  uploadStudentDocumentAction,
  verifyStudentDocumentAction,
  replaceStudentDocumentAction,
  getDocumentStorageStatusAction,
} from "@/lib/actions/studentDocuments";
import {
  StudentDocumentDTO,
  StudentDocumentsSummary,
} from "@/lib/dal/studentRepository";
import {
  ALLOWED_DOCUMENT_CATEGORIES,
  DOCUMENT_CATEGORY_LABELS,
  DocumentCategory,
} from "@/lib/storage/validation";

interface StudentDocumentsTabProps {
  studentId: string;
  studentName: string;
  userRole: string;
  canWrite: boolean;
  onRefreshParent?: () => void;
}

export const StudentDocumentsTab: React.FC<StudentDocumentsTabProps> = ({
  studentId,
  studentName,
  userRole,
  canWrite,
  onRefreshParent,
}) => {
  const [, startTransition] = useTransition();

  const [documents, setDocuments] = useState<StudentDocumentDTO[]>([]);
  const [summary, setSummary] = useState<StudentDocumentsSummary>({
    totalCount: 0,
    verifiedCount: 0,
    pendingCount: 0,
    rejectedCount: 0,
    documents: [],
    categoriesBreakdown: [],
  });
  const [isLoading, setIsLoading] = useState(true);
  const [feedback, setFeedback] = useState<{ type: "success" | "error"; message: string } | null>(null);
  const [storageStatus, setStorageStatus] = useState<{ available: boolean; message?: string } | null>(null);

  // Filters
  const [selectedCategory, setSelectedCategory] = useState<string>("ALL");
  const [statusFilter, setStatusFilter] = useState<string>("ALL");

  // Upload Modal
  const [isUploadModalOpen, setIsUploadModalOpen] = useState(false);
  const [uploadCategory, setUploadCategory] = useState<DocumentCategory>("IDENTITY_PROOF");
  const [uploadFile, setUploadFile] = useState<File | null>(null);
  const [isUploading, setIsUploading] = useState(false);

  // Replace Modal
  const [docToReplace, setDocToReplace] = useState<StudentDocumentDTO | null>(null);
  const [replaceFile, setReplaceFile] = useState<File | null>(null);
  const [isReplacing, setIsReplacing] = useState(false);

  // Verify Modal
  const [docToVerify, setDocToVerify] = useState<StudentDocumentDTO | null>(null);
  const [verifyDecision, setVerifyDecision] = useState<"VERIFIED" | "REJECTED">("VERIFIED");
  const [verifyReason, setVerifyReason] = useState("");
  const [isVerifying, setIsVerifying] = useState(false);

  // History Modal
  const [docForHistory, setDocForHistory] = useState<StudentDocumentDTO | null>(null);

  const canVerify = userRole === "SYSTEM_ADMIN" || userRole === "ACADEMIC_ADMIN";
  const canUpload = canWrite || userRole === "STUDENT_VIEWER";
  const isStorageAvailable = storageStatus === null ? true : storageStatus.available;

  const showFeedback = (type: "success" | "error", message: string) => {
    setFeedback({ type, message });
    setTimeout(() => setFeedback(null), 5000);
  };

  const loadDocuments = useCallback(async () => {
    setIsLoading(true);
    try {
      const [res, storageRes] = await Promise.all([
        getStudentDocumentsAction(studentId),
        getDocumentStorageStatusAction(),
      ]);
      if (storageRes.success && storageRes.data) {
        setStorageStatus(storageRes.data);
      }
      if (res.success && res.data) {
        setDocuments(res.data.documents);
        setSummary(res.data);
      } else {
        showFeedback("error", res.error || "Unable to load student documents.");
      }
    } catch (err) {
      showFeedback("error", err instanceof Error ? err.message : "Error contacting server.");
    } finally {
      setIsLoading(false);
    }
  }, [studentId]);

  useEffect(() => {
    loadDocuments();
  }, [loadDocuments]);

  // Handle Upload
  const handleUploadSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!isStorageAvailable) {
      showFeedback("error", storageStatus?.message || "Document uploads are temporarily unavailable. Persistent cloud storage is not configured.");
      return;
    }
    if (!uploadFile) {
      showFeedback("error", "Please select a file to upload.");
      return;
    }

    setIsUploading(true);
    try {
      const formData = new FormData();
      formData.append("studentId", studentId);
      formData.append("category", uploadCategory);
      formData.append("file", uploadFile);

      const res = await uploadStudentDocumentAction(formData);
      if (res.success) {
        showFeedback("success", `Document "${uploadFile.name}" uploaded successfully.`);
        setIsUploadModalOpen(false);
        setUploadFile(null);
        await loadDocuments();
        if (onRefreshParent) onRefreshParent();
      } else {
        showFeedback("error", res.error || "Upload failed.");
      }
    } catch (err) {
      showFeedback("error", err instanceof Error ? err.message : "Upload failed.");
    } finally {
      setIsUploading(false);
    }
  };

  // Handle Replace
  const handleReplaceSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!isStorageAvailable) {
      showFeedback("error", storageStatus?.message || "Document replacements are temporarily unavailable. Persistent cloud storage is not configured.");
      return;
    }
    if (!docToReplace || !replaceFile) {
      showFeedback("error", "Please select a replacement file.");
      return;
    }

    setIsReplacing(true);
    try {
      const formData = new FormData();
      formData.append("documentId", docToReplace.id);
      formData.append("file", replaceFile);

      const res = await replaceStudentDocumentAction(formData);
      if (res.success) {
        showFeedback("success", `Document replaced with version v${res.data?.version}.`);
        setDocToReplace(null);
        setReplaceFile(null);
        await loadDocuments();
        if (onRefreshParent) onRefreshParent();
      } else {
        showFeedback("error", res.error || "Replacement failed.");
      }
    } catch (err) {
      showFeedback("error", err instanceof Error ? err.message : "Replacement failed.");
    } finally {
      setIsReplacing(false);
    }
  };

  // Handle Verification
  const handleVerifySubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!docToVerify) return;

    if (verifyDecision === "REJECTED" && !verifyReason.trim()) {
      showFeedback("error", "A reason is mandatory when rejecting a document.");
      return;
    }

    setIsVerifying(true);
    try {
      const res = await verifyStudentDocumentAction({
        documentId: docToVerify.id,
        decision: verifyDecision,
        reason: verifyReason.trim() || undefined,
      });

      if (res.success) {
        showFeedback(
          "success",
          `Document decision recorded: ${verifyDecision === "VERIFIED" ? "Verified" : "Rejected"}.`
        );
        setDocToVerify(null);
        setVerifyReason("");
        await loadDocuments();
        if (onRefreshParent) onRefreshParent();
      } else {
        showFeedback("error", res.error || "Verification decision failed.");
      }
    } catch (err) {
      showFeedback("error", err instanceof Error ? err.message : "Verification error.");
    } finally {
      setIsVerifying(false);
    }
  };

  // Format bytes
  const formatSize = (bytes: number) => {
    if (bytes < 1024) return `${bytes} B`;
    if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
    return `${(bytes / (1024 * 1024)).toFixed(2)} MB`;
  };

  // Filtered documents
  const filteredDocuments = documents.filter((doc) => {
    if (selectedCategory !== "ALL" && doc.category !== selectedCategory) return false;
    if (statusFilter !== "ALL" && doc.status !== statusFilter) return false;
    return true;
  });

  return (
    <div className="py-6 space-y-6">
      {/* Toast Feedback */}
      {feedback && (
        <div
          className={`p-3.5 rounded-xl border text-xs flex items-center justify-between ${
            feedback.type === "success"
              ? "bg-emerald-50 text-emerald-800 border-emerald-200"
              : "bg-rose-50 text-rose-800 border-rose-200"
          }`}
        >
          <div className="flex items-center space-x-2">
            <Icon
              name={feedback.type === "success" ? "check-circle" : "exclamation-triangle"}
              className="h-4 w-4 shrink-0"
            />
            <span className="font-medium">{feedback.message}</span>
          </div>
          <button
            type="button"
            onClick={() => setFeedback(null)}
            className="text-slate-400 hover:text-slate-600 cursor-pointer"
          >
            <Icon name="x-mark" className="h-4 w-4" />
          </button>
        </div>
      )}

      {/* Storage Unavailable Production Safety Banner */}
      {storageStatus && !storageStatus.available && (
        <div className="rounded-xl border border-amber-300/80 bg-amber-50/80 p-4 text-xs text-amber-950 flex items-start space-x-3 shadow-2xs animate-fade-in">
          <Icon name="exclamation-triangle" className="h-5 w-5 text-amber-600 shrink-0 mt-0.5" />
          <div>
            <p className="font-semibold text-amber-950">Document Uploads Temporarily Unavailable</p>
            <p className="mt-0.5 text-amber-800">
              {storageStatus.message || "Document uploads and replacements are temporarily unavailable because persistent cloud storage has not been configured in this environment."}
            </p>
            <p className="mt-1 text-[11px] text-amber-700">
              Previously submitted documents remain safe and fully accessible for viewing and review.
            </p>
          </div>
        </div>
      )}

      {/* KPI Cards Row */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        <div className="p-4 rounded-xl bg-card-surface border border-comfort flex items-center justify-between shadow-2xs">
          <div>
            <p className="text-[11px] font-semibold uppercase tracking-wider text-slate-500">
              Total Documents
            </p>
            <p className="text-2xl font-bold text-slate-900 mt-1">{summary.totalCount}</p>
          </div>
          <div className="h-10 w-10 rounded-xl bg-blue-100 text-[#1657D9] flex items-center justify-center">
            <Icon name="folder" className="h-5 w-5" />
          </div>
        </div>

        <div className="p-4 rounded-xl bg-emerald-50/50 border border-emerald-100 flex items-center justify-between">
          <div>
            <p className="text-[11px] font-semibold uppercase tracking-wider text-emerald-700">
              Verified
            </p>
            <p className="text-2xl font-bold text-emerald-900 mt-1">{summary.verifiedCount}</p>
          </div>
          <div className="h-10 w-10 rounded-xl bg-emerald-100 text-emerald-700 flex items-center justify-center">
            <Icon name="check" className="h-5 w-5" />
          </div>
        </div>

        <div className="p-4 rounded-xl bg-amber-50/50 border border-amber-100 flex items-center justify-between">
          <div>
            <p className="text-[11px] font-semibold uppercase tracking-wider text-amber-700">
              Pending Review
            </p>
            <p className="text-2xl font-bold text-amber-900 mt-1">{summary.pendingCount}</p>
          </div>
          <div className="h-10 w-10 rounded-xl bg-amber-100 text-amber-700 flex items-center justify-center">
            <Icon name="clock" className="h-5 w-5" />
          </div>
        </div>

        <div className="p-4 rounded-xl bg-rose-50/50 border border-rose-100 flex items-center justify-between">
          <div>
            <p className="text-[11px] font-semibold uppercase tracking-wider text-rose-700">
              Rejected / Attention
            </p>
            <p className="text-2xl font-bold text-rose-900 mt-1">{summary.rejectedCount}</p>
          </div>
          <div className="h-10 w-10 rounded-xl bg-rose-100 text-[#D92534] flex items-center justify-center">
            <Icon name="shield-alert" className="h-5 w-5" />
          </div>
        </div>
      </div>

      {/* Configurable Document Categories */}
      <div className="p-4 rounded-xl bg-slate-50 border border-slate-200">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-1 mb-3">
          <div>
            <h2 className="text-xs font-bold uppercase tracking-wider text-slate-700 flex items-center space-x-1.5">
              <Icon name="clipboard-check" className="h-4 w-4 text-slate-500" />
              <span>Configurable Document Categories</span>
            </h2>
            <p className="text-[11px] text-slate-500 mt-0.5">
              Institutional technical categories. Unprovided categories are optional/unconfigured unless mandated by specific programme admission policy.
            </p>
          </div>
          <span className="text-[11px] font-medium text-slate-600 shrink-0">
            {summary.categoriesBreakdown.filter((c) => c.isUploaded).length} of{" "}
            {ALLOWED_DOCUMENT_CATEGORIES.length} Categories Provided
          </span>
        </div>
        <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 gap-2">
          {summary.categoriesBreakdown.map((cat) => {
            const isSelected = selectedCategory === cat.category;
            const isUploaded = cat.isUploaded;
            return (
              <div
                key={cat.category}
                onClick={() => setSelectedCategory(isSelected ? "ALL" : cat.category)}
                className={`p-2.5 rounded-lg border text-left cursor-pointer transition-all ${
                  isSelected
                    ? "ring-2 ring-blue-500 border-blue-400 bg-white"
                    : !isUploaded
                    ? "bg-white/60 border-slate-200 text-slate-500 hover:bg-white"
                    : cat.status === "VERIFIED"
                    ? "bg-emerald-50/60 border-emerald-200 text-emerald-900 hover:bg-emerald-50"
                    : cat.status === "REJECTED"
                    ? "bg-rose-50/60 border-rose-200 text-rose-900 hover:bg-rose-50"
                    : "bg-amber-50/60 border-amber-200 text-amber-900 hover:bg-amber-50"
                }`}
              >
                <div className="flex items-center justify-between mb-1">
                  <span className="text-[10px] font-bold uppercase tracking-tight truncate">
                    {cat.label}
                  </span>
                  {cat.status === "VERIFIED" ? (
                    <span className="h-4 w-4 rounded-full bg-emerald-100 text-emerald-700 flex items-center justify-center text-[10px]">
                      ✓
                    </span>
                  ) : cat.status === "UPLOADED" ? (
                    <span className="h-4 w-4 rounded-full bg-amber-100 text-amber-700 flex items-center justify-center text-[10px]">
                      •
                    </span>
                  ) : cat.status === "REJECTED" ? (
                    <span className="h-4 w-4 rounded-full bg-rose-100 text-[#D92534] flex items-center justify-center text-[10px]">
                      ✕
                    </span>
                  ) : (
                    <span className="text-[10px] text-slate-400">—</span>
                  )}
                </div>
                <p className="text-[10px] text-slate-500">
                  {cat.status === "VERIFIED"
                    ? "Verified"
                    : cat.status === "REJECTED"
                    ? "Rejected"
                    : cat.status === "UPLOADED"
                    ? "Pending Review"
                    : "Not Uploaded (Optional)"}
                </p>
              </div>
            );
          })}
        </div>
      </div>

      {/* Control Bar: Filters & Actions */}
      <div className="flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-3 pt-2">
        <div className="flex flex-wrap items-center gap-2">
          {/* Category Dropdown */}
          <select
            value={selectedCategory}
            onChange={(e) => setSelectedCategory(e.target.value)}
            className="text-xs bg-card-surface border border-comfort text-slate-800 rounded-lg px-2.5 py-1.5 font-medium text-slate-700 focus:outline-hidden focus:ring-2 focus:ring-blue-500"
          >
            <option value="ALL">All Categories ({documents.length})</option>
            {ALLOWED_DOCUMENT_CATEGORIES.map((catKey) => (
              <option key={catKey} value={catKey}>
                {DOCUMENT_CATEGORY_LABELS[catKey]}
              </option>
            ))}
          </select>

          {/* Status Filter Tabs */}
          <div className="flex items-center space-x-1 bg-slate-100 p-1 rounded-lg">
            {["ALL", "PENDING_VERIFICATION", "VERIFIED", "REJECTED", "SUPERSEDED"].map((st) => (
              <button
                key={st}
                id={st === "ALL" ? "btn-filter-all" : st === "SUPERSEDED" ? "btn-filter-superseded" : undefined}
                type="button"
                onClick={() => setStatusFilter(st)}
                className={`text-[11px] font-semibold px-2.5 py-1 rounded-md transition-all cursor-pointer ${
                  statusFilter === st
                    ? "bg-white text-slate-900 shadow-xs"
                    : "text-slate-600 hover:text-slate-900"
                }`}
              >
                {st === "ALL"
                  ? "All Status"
                  : st === "PENDING_VERIFICATION"
                  ? "Pending"
                  : st === "VERIFIED"
                  ? "Verified"
                  : st === "REJECTED"
                  ? "Rejected"
                  : "Superseded"}
              </button>
            ))}
          </div>
        </div>

        {/* Upload Action Button */}
        {canUpload && (
          <button
            id="btn-upload-document"
            type="button"
            disabled={!isStorageAvailable}
            onClick={() => {
              if (!isStorageAvailable) {
                showFeedback("error", storageStatus?.message || "Document uploads are temporarily unavailable. Persistent cloud storage is not configured.");
                return;
              }
              setIsUploadModalOpen(true);
            }}
            className={`inline-flex items-center justify-center space-x-1.5 rounded-xl px-4 py-2 text-xs font-semibold shadow-xs transition-colors shrink-0 ${
              isStorageAvailable
                ? "bg-blue-600 text-white hover:bg-blue-700 cursor-pointer"
                : "bg-slate-200 text-slate-400 cursor-not-allowed border border-slate-300"
            }`}
            title={!isStorageAvailable ? "Document uploads temporarily unavailable: Persistent cloud storage not configured." : undefined}
          >
            <Icon name="arrow-up-tray" className="h-4 w-4" />
            <span>Upload Document</span>
          </button>
        )}
      </div>

      {/* Documents List / Table */}
      {isLoading ? (
        <div className="py-12 text-center text-xs text-slate-500">
          <Icon name="arrow-path" className="h-6 w-6 animate-spin mx-auto text-blue-600 mb-2" />
          <p>Loading student documents and verification history...</p>
        </div>
      ) : filteredDocuments.length === 0 ? (
        <div className="p-8 rounded-xl bg-card-surface border border-comfort text-center text-xs text-slate-500 shadow-2xs">
          <Icon name="folder" className="h-10 w-10 text-slate-400 mx-auto mb-2" />
          <p className="font-semibold text-slate-800 text-sm">No Documents Found</p>
          <p className="text-[11px] text-slate-500 mt-1 max-w-sm mx-auto">
            {documents.length === 0
              ? `No institutional documents have been uploaded for ${studentName} yet.`
              : "No documents match the current category or status filter."}
          </p>
          {canUpload && documents.length === 0 && (
            <button
              id="btn-upload-first-document"
              type="button"
              disabled={!isStorageAvailable}
              onClick={() => {
                if (!isStorageAvailable) {
                  showFeedback("error", storageStatus?.message || "Document uploads are temporarily unavailable. Persistent cloud storage is not configured.");
                  return;
                }
                setIsUploadModalOpen(true);
              }}
              className={`mt-4 inline-flex items-center space-x-1.5 rounded-xl px-3.5 py-1.5 text-xs font-semibold transition-colors ${
                isStorageAvailable
                  ? "bg-blue-600 text-white hover:bg-blue-700 cursor-pointer"
                  : "bg-slate-200 text-slate-400 cursor-not-allowed border border-slate-300"
              }`}
              title={!isStorageAvailable ? "Document uploads temporarily unavailable: Persistent cloud storage not configured." : undefined}
            >
              <Icon name="arrow-up-tray" className="h-3.5 w-3.5" />
              <span>Upload First Document</span>
            </button>
          )}
        </div>
      ) : (
        <div className="bg-card-comfort rounded-xl border border-comfort overflow-hidden shadow-xs">
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs text-slate-700">
              <thead className="bg-card-surface border-b border-comfort text-[10px] font-bold uppercase tracking-wider text-slate-600">
                <tr>
                  <th className="py-3 px-4">Document Details</th>
                  <th className="py-3 px-3">Category</th>
                  <th className="py-3 px-3">File Specs</th>
                  <th className="py-3 px-3">Version</th>
                  <th className="py-3 px-3">Status</th>
                  <th className="py-3 px-4 text-right">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {filteredDocuments.map((doc) => {
                  const isVerified = doc.status === "VERIFIED";
                  const isPending = doc.status === "PENDING_VERIFICATION";
                  const isRejected = doc.status === "REJECTED";
                  const isSuperseded = doc.status === "SUPERSEDED";

                  return (
                    <tr
                      key={doc.id}
                      className={`hover:bg-slate-50/80 transition-colors ${
                        isSuperseded ? "opacity-60 bg-slate-50/40" : ""
                      }`}
                    >
                      {/* Details & Filename */}
                      <td className="py-3.5 px-4">
                        <div className="flex items-start space-x-2.5">
                          <div className="h-8 w-8 rounded-lg bg-blue-50 text-[#1657D9] flex items-center justify-center shrink-0 mt-0.5">
                            <Icon name="document-text" className="h-4 w-4" />
                          </div>
                          <div>
                            <p className="font-semibold text-slate-900 leading-tight">
                              {doc.originalFileName}
                            </p>
                            <p className="text-[11px] text-slate-500 mt-0.5">
                              Uploaded {new Date(doc.createdAt).toLocaleDateString("en-IN", {
                                day: "2-digit",
                                month: "short",
                                year: "numeric",
                              })}{" "}
                              by {doc.uploadedByUserName}
                            </p>
                            {doc.replacedDocumentId && (
                              <p className="text-[10px] text-blue-600 mt-0.5">
                                Replaces superseded document ID: {doc.replacedDocumentId.slice(0, 8)}...
                              </p>
                            )}
                          </div>
                        </div>
                      </td>

                      {/* Category */}
                      <td className="py-3.5 px-3 whitespace-nowrap">
                        <span className="font-medium text-slate-800 bg-slate-100 px-2 py-0.5 rounded text-[11px]">
                          {doc.categoryLabel}
                        </span>
                      </td>

                      {/* Specs */}
                      <td className="py-3.5 px-3 whitespace-nowrap text-[11px] text-slate-600 font-mono">
                        <span>{doc.mimeType.split("/")[1]?.toUpperCase() || "DOC"}</span>
                        <span className="text-slate-400 mx-1">•</span>
                        <span>{formatSize(doc.fileSize)}</span>
                      </td>

                      {/* Version */}
                      <td className="py-3.5 px-3 whitespace-nowrap">
                        <span
                          className={`font-mono text-[10px] font-bold px-2 py-0.5 rounded-full ${
                            doc.version > 1
                              ? "bg-indigo-50 text-indigo-700 border border-indigo-200"
                              : "bg-slate-100 text-slate-600"
                          }`}
                        >
                          v{doc.version}
                        </span>
                      </td>

                      {/* Status */}
                      <td className="py-3.5 px-3 whitespace-nowrap">
                        <span
                          className={`inline-flex items-center space-x-1 text-[10px] font-bold px-2.5 py-0.5 rounded-full border ${
                            isVerified
                              ? "bg-emerald-50 text-emerald-700 border-emerald-200"
                              : isPending
                              ? "bg-amber-50 text-amber-700 border-amber-200"
                              : isRejected
                              ? "bg-rose-50 text-[#D92534] border-rose-200"
                              : "bg-slate-100 text-slate-600 border-slate-200"
                          }`}
                        >
                          <span
                            className={`h-1.5 w-1.5 rounded-full ${
                              isVerified
                                ? "bg-emerald-500"
                                : isPending
                                ? "bg-amber-500"
                                : isRejected
                                ? "bg-rose-500"
                                : "bg-slate-400"
                            }`}
                          />
                          <span>
                            {isVerified
                              ? "Verified"
                              : isPending
                              ? "Pending Review"
                              : isRejected
                              ? "Rejected"
                              : "Superseded"}
                          </span>
                        </span>
                      </td>

                      {/* Actions */}
                      <td className="py-3.5 px-4 text-right whitespace-nowrap">
                        <div className="flex items-center justify-end space-x-1.5">
                          {/* Secure Download */}
                          <a
                            href={`/api/students/${studentId}/documents/${doc.id}/download`}
                            download
                            className="p-1.5 rounded-lg text-slate-600 hover:text-blue-600 hover:bg-blue-50 transition-colors"
                            title="Download Document"
                          >
                            <Icon name="arrow-down-tray" className="h-4 w-4" />
                          </a>

                          {/* Verification History Drawer */}
                          <button
                            id={`btn-history-${doc.id}`}
                            type="button"
                            onClick={() => setDocForHistory(doc)}
                            className="p-1.5 rounded-lg text-slate-600 hover:text-slate-900 hover:bg-slate-100 transition-colors cursor-pointer"
                            title="View Verification Trail"
                          >
                            <Icon name="clock" className="h-4 w-4" />
                          </button>

                          {/* Replace Action (Active documents only) */}
                          {canUpload && !isSuperseded && (
                            <button
                              id={`btn-replace-${doc.id}`}
                              type="button"
                              disabled={!isStorageAvailable}
                              onClick={() => {
                                if (!isStorageAvailable) {
                                  showFeedback("error", storageStatus?.message || "Document replacements are temporarily unavailable. Persistent cloud storage is not configured.");
                                  return;
                                }
                                setDocToReplace(doc);
                                setReplaceFile(null);
                              }}
                              className={`p-1.5 rounded-lg transition-colors ${
                                isStorageAvailable
                                  ? "text-slate-600 hover:text-amber-600 hover:bg-amber-50 cursor-pointer"
                                  : "text-slate-300 cursor-not-allowed"
                              }`}
                              title={isStorageAvailable ? "Replace with New Version" : "Document replacement temporarily unavailable: Persistent cloud storage not configured."}
                            >
                              <Icon name="document-duplicate" className="h-4 w-4" />
                            </button>
                          )}

                          {/* Verify / Review Action (Admins only) */}
                          {canVerify && !isSuperseded && (
                            <button
                              id={`btn-review-${doc.id}`}
                              type="button"
                              onClick={() => {
                                setDocToVerify(doc);
                                setVerifyDecision(doc.status === "VERIFIED" ? "REJECTED" : "VERIFIED");
                                setVerifyReason("");
                              }}
                              className="p-1.5 rounded-lg text-slate-600 hover:text-emerald-600 hover:bg-emerald-50 transition-colors cursor-pointer"
                              title="Review / Verify Document"
                            >
                              <Icon name="check-circle" className="h-4 w-4" />
                            </button>
                          )}
                        </div>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* --- MODAL 1: Upload New Document --- */}
      {isUploadModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-xs">
          <div className="bg-card-comfort rounded-2xl border border-comfort shadow-xl max-w-md w-full p-6 animate-in fade-in zoom-in-95 duration-150">
            <div className="flex items-center justify-between pb-4 border-b border-slate-100">
              <h3 className="text-base font-bold text-slate-900">Upload Student Document</h3>
              <button
                type="button"
                onClick={() => setIsUploadModalOpen(false)}
                className="text-slate-400 hover:text-slate-600 cursor-pointer"
              >
                <Icon name="x-mark" className="h-5 w-5" />
              </button>
            </div>

            <form onSubmit={handleUploadSubmit} className="mt-4 space-y-4">
              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">
                  Document Category <span className="text-rose-500">*</span>
                </label>
                <select
                  value={uploadCategory}
                  onChange={(e) => setUploadCategory(e.target.value as DocumentCategory)}
                  className="w-full text-xs bg-card-surface border border-comfort text-slate-800 rounded-xl px-3 py-2 text-slate-800 focus:outline-hidden focus:ring-2 focus:ring-blue-500 font-medium"
                >
                  {ALLOWED_DOCUMENT_CATEGORIES.map((catKey) => (
                    <option key={catKey} value={catKey}>
                      {DOCUMENT_CATEGORY_LABELS[catKey]}
                    </option>
                  ))}
                </select>
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">
                  Select File <span className="text-rose-500">*</span>
                </label>
                <div className="border-2 border-dashed border-slate-300 rounded-xl p-4 text-center hover:border-blue-400 transition-colors bg-slate-50">
                  <input
                    type="file"
                    id="doc-upload-input"
                    accept=".pdf,.png,.jpg,.jpeg,application/pdf,image/png,image/jpeg"
                    onChange={(e) => {
                      if (e.target.files && e.target.files[0]) {
                        setUploadFile(e.target.files[0]);
                      }
                    }}
                    className="hidden"
                  />
                  <label
                    htmlFor="doc-upload-input"
                    className="cursor-pointer block text-xs text-slate-600"
                  >
                    <Icon name="arrow-up-tray" className="h-6 w-6 text-slate-400 mx-auto mb-1.5" />
                    {uploadFile ? (
                      <div>
                        <p className="font-semibold text-blue-600 truncate">{uploadFile.name}</p>
                        <p className="text-[10px] text-slate-400 mt-0.5">
                          {formatSize(uploadFile.size)}
                        </p>
                      </div>
                    ) : (
                      <div>
                        <span className="font-semibold text-blue-600">Click to choose</span> or drag
                        and drop
                        <p className="text-[10px] text-slate-400 mt-1">
                          Supported: PDF, PNG, JPEG (Max 10MB)
                        </p>
                      </div>
                    )}
                  </label>
                </div>
              </div>

              <div className="pt-2 flex items-center justify-end space-x-2">
                <button
                  type="button"
                  onClick={() => setIsUploadModalOpen(false)}
                  disabled={isUploading}
                  className="px-4 py-2 rounded-xl text-xs font-semibold text-slate-600 hover:bg-slate-100 transition-colors cursor-pointer"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={!uploadFile || isUploading}
                  className="px-4 py-2 rounded-xl text-xs font-semibold bg-blue-600 text-white hover:bg-blue-700 transition-colors disabled:opacity-50 cursor-pointer flex items-center space-x-1.5"
                >
                  {isUploading && <Icon name="arrow-path" className="h-3.5 w-3.5 animate-spin" />}
                  <span>{isUploading ? "Uploading..." : "Upload Document"}</span>
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* --- MODAL 2: Replace Document (Preserves History) --- */}
      {docToReplace && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-xs">
          <div className="bg-card-comfort rounded-2xl border border-comfort shadow-xl max-w-md w-full p-6 animate-in fade-in zoom-in-95 duration-150">
            <div className="flex items-center justify-between pb-3 border-b border-slate-100">
              <h3 className="text-base font-bold text-slate-900">Replace Document Revision</h3>
              <button
                type="button"
                onClick={() => setDocToReplace(null)}
                className="text-slate-400 hover:text-slate-600 cursor-pointer"
              >
                <Icon name="x-mark" className="h-5 w-5" />
              </button>
            </div>

            <div className="mt-3 p-3 rounded-xl bg-blue-50 border border-blue-200 text-xs text-blue-900">
              <p className="font-semibold">History Preservation Safeguard:</p>
              <p className="text-[11px] text-blue-700 mt-0.5">
                Replacing &quot;{docToReplace.originalFileName}&quot; will archive version v{docToReplace.version} as{" "}
                <strong>SUPERSEDED</strong>. All previous verification notes are preserved in the permanent institutional audit trail.
              </p>
            </div>

            <form onSubmit={handleReplaceSubmit} className="mt-4 space-y-4">
              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">
                  Upload Replacement File (v{docToReplace.version + 1}) <span className="text-rose-500">*</span>
                </label>
                <div className="border-2 border-dashed border-slate-300 rounded-xl p-4 text-center hover:border-blue-400 transition-colors bg-slate-50">
                  <input
                    type="file"
                    id="doc-replace-input"
                    accept=".pdf,.png,.jpg,.jpeg,application/pdf,image/png,image/jpeg"
                    onChange={(e) => {
                      if (e.target.files && e.target.files[0]) {
                        setReplaceFile(e.target.files[0]);
                      }
                    }}
                    className="hidden"
                  />
                  <label
                    htmlFor="doc-replace-input"
                    className="cursor-pointer block text-xs text-slate-600"
                  >
                    <Icon name="arrow-up-tray" className="h-6 w-6 text-slate-400 mx-auto mb-1.5" />
                    {replaceFile ? (
                      <div>
                        <p className="font-semibold text-blue-600 truncate">{replaceFile.name}</p>
                        <p className="text-[10px] text-slate-400 mt-0.5">
                          {formatSize(replaceFile.size)}
                        </p>
                      </div>
                    ) : (
                      <div>
                        <span className="font-semibold text-blue-600">Select new file</span>
                        <p className="text-[10px] text-slate-400 mt-1">
                          Supported: PDF, PNG, JPEG (Max 10MB)
                        </p>
                      </div>
                    )}
                  </label>
                </div>
              </div>

              <div className="pt-2 flex items-center justify-end space-x-2">
                <button
                  type="button"
                  onClick={() => setDocToReplace(null)}
                  disabled={isReplacing}
                  className="px-4 py-2 rounded-xl text-xs font-semibold text-slate-600 hover:bg-slate-100 transition-colors cursor-pointer"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={!replaceFile || isReplacing}
                  className="px-4 py-2 rounded-xl text-xs font-semibold bg-blue-600 text-white hover:bg-blue-700 transition-colors disabled:opacity-50 cursor-pointer flex items-center space-x-1.5"
                >
                  {isReplacing && <Icon name="arrow-path" className="h-3.5 w-3.5 animate-spin" />}
                  <span>{isReplacing ? "Replacing..." : `Submit Revision v${docToReplace.version + 1}`}</span>
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* --- MODAL 3: Verify / Reject (Institutional Decision) --- */}
      {docToVerify && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-xs">
          <div className="bg-card-comfort rounded-2xl border border-comfort shadow-xl max-w-md w-full p-6 animate-in fade-in zoom-in-95 duration-150">
            <div className="flex items-center justify-between pb-3 border-b border-slate-100">
              <h3 className="text-base font-bold text-slate-900">Institutional Document Verification</h3>
              <button
                type="button"
                onClick={() => setDocToVerify(null)}
                className="text-slate-400 hover:text-slate-600 cursor-pointer"
              >
                <Icon name="x-mark" className="h-5 w-5" />
              </button>
            </div>

            <div className="mt-3 text-xs space-y-1 bg-slate-50 p-3 rounded-xl border border-slate-100">
              <p>
                <strong className="text-slate-700">Document:</strong> {docToVerify.originalFileName} (v{docToVerify.version})
              </p>
              <p>
                <strong className="text-slate-700">Category:</strong> {docToVerify.categoryLabel}
              </p>
              <p>
                <strong className="text-slate-700">Current Status:</strong> {docToVerify.status}
              </p>
            </div>

            <form onSubmit={handleVerifySubmit} className="mt-4 space-y-4">
              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1.5">
                  Verification Decision <span className="text-rose-500">*</span>
                </label>
                <div className="grid grid-cols-2 gap-2">
                  <button
                    id="btn-decision-approve"
                    type="button"
                    onClick={() => setVerifyDecision("VERIFIED")}
                    className={`py-2 px-3 rounded-xl text-xs font-semibold border flex items-center justify-center space-x-1.5 transition-all cursor-pointer ${
                      verifyDecision === "VERIFIED"
                        ? "bg-emerald-50 text-emerald-800 border-emerald-300 ring-2 ring-emerald-500/20"
                        : "bg-white text-slate-600 border-slate-200 hover:bg-slate-50"
                    }`}
                  >
                    <Icon name="check" className="h-4 w-4 text-emerald-600" />
                    <span>Approve / Verify</span>
                  </button>

                  <button
                    id="btn-decision-reject"
                    type="button"
                    onClick={() => setVerifyDecision("REJECTED")}
                    className={`py-2 px-3 rounded-xl text-xs font-semibold border flex items-center justify-center space-x-1.5 transition-all cursor-pointer ${
                      verifyDecision === "REJECTED"
                        ? "bg-rose-50 text-rose-800 border-rose-300 ring-2 ring-rose-500/20"
                        : "bg-white text-slate-600 border-slate-200 hover:bg-slate-50"
                    }`}
                  >
                    <Icon name="x-mark" className="h-4 w-4 text-[#D92534]" />
                    <span>Reject Document</span>
                  </button>
                </div>
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">
                  Institutional Notes / Justification{" "}
                  {verifyDecision === "REJECTED" && <span className="text-rose-500">(Mandatory for Rejection) *</span>}
                </label>
                <textarea
                  id="textarea-verify-reason"
                  value={verifyReason}
                  onChange={(e) => setVerifyReason(e.target.value)}
                  placeholder={
                    verifyDecision === "REJECTED"
                      ? "Specify why this document is rejected (e.g. illegible photocopy, missing gazetted seal, name mismatch)..."
                      : "Optional remarks or verification reference..."
                  }
                  rows={3}
                  className="w-full text-xs bg-card-surface border border-comfort text-slate-800 rounded-xl p-2.5 text-slate-800 focus:outline-hidden focus:ring-2 focus:ring-blue-500"
                />
              </div>

              <div className="pt-2 flex items-center justify-end space-x-2">
                <button
                  type="button"
                  onClick={() => setDocToVerify(null)}
                  disabled={isVerifying}
                  className="px-4 py-2 rounded-xl text-xs font-semibold text-slate-600 hover:bg-slate-100 transition-colors cursor-pointer"
                >
                  Cancel
                </button>
                <button
                  id="btn-confirm-verify"
                  type="submit"
                  disabled={isVerifying || (verifyDecision === "REJECTED" && !verifyReason.trim())}
                  className={`px-4 py-2 rounded-xl text-xs font-semibold text-white transition-colors disabled:opacity-50 cursor-pointer flex items-center space-x-1.5 ${
                    verifyDecision === "VERIFIED"
                      ? "bg-emerald-600 hover:bg-emerald-700"
                      : "bg-[#D92534] hover:bg-rose-700"
                  }`}
                >
                  {isVerifying && <Icon name="arrow-path" className="h-3.5 w-3.5 animate-spin" />}
                  <span>{isVerifying ? "Recording..." : `Confirm ${verifyDecision}`}</span>
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* --- MODAL 4: Verification Trail & History --- */}
      {docForHistory && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-xs">
          <div className="bg-card-comfort rounded-2xl border border-comfort shadow-xl max-w-lg w-full p-6 animate-in fade-in zoom-in-95 duration-150">
            <div className="flex items-center justify-between pb-3 border-b border-slate-100">
              <div>
                <h3 className="text-base font-bold text-slate-900">Verification Audit Trail</h3>
                <p className="text-[11px] text-slate-500">
                  {docForHistory.originalFileName} • v{docForHistory.version}
                </p>
              </div>
              <button
                type="button"
                onClick={() => setDocForHistory(null)}
                className="text-slate-400 hover:text-slate-600 cursor-pointer"
              >
                <Icon name="x-mark" className="h-5 w-5" />
              </button>
            </div>

            <div className="mt-4 max-h-80 overflow-y-auto space-y-3 pr-1">
              {docForHistory.verifications.length === 0 ? (
                <div className="p-6 text-center text-xs text-slate-400">
                  <Icon name="clock" className="h-6 w-6 text-slate-300 mx-auto mb-1" />
                  <p>No verification decisions have been recorded for this document yet.</p>
                </div>
              ) : (
                docForHistory.verifications.map((v) => {
                  const isApprove = v.newStatus === "VERIFIED";
                  return (
                    <div
                      key={v.id}
                      className="p-3.5 rounded-xl border border-slate-200 bg-slate-50 space-y-1.5"
                    >
                      <div className="flex items-center justify-between">
                        <span
                          className={`text-[10px] font-bold px-2 py-0.5 rounded-full border ${
                            isApprove
                              ? "bg-emerald-50 text-emerald-800 border-emerald-200"
                              : "bg-rose-50 text-rose-800 border-rose-200"
                          }`}
                        >
                          {v.newStatus}
                        </span>
                        <span className="text-[10px] text-slate-400">
                          {new Date(v.createdAt).toLocaleString("en-IN", {
                            dateStyle: "medium",
                            timeStyle: "short",
                          })}
                        </span>
                      </div>
                      <p className="text-xs text-slate-700">
                        <span className="font-semibold text-slate-900">Reviewer:</span>{" "}
                        {v.reviewerName}
                      </p>
                      {v.reason && (
                        <p className="text-xs text-slate-600 bg-white p-2 rounded-lg border border-slate-200 mt-1 italic">
                          &quot;{v.reason}&quot;
                        </p>
                      )}
                    </div>
                  );
                })
              )}
            </div>

            <div className="pt-4 border-t border-slate-100 flex justify-end">
              <button
                type="button"
                onClick={() => setDocForHistory(null)}
                className="px-4 py-1.5 rounded-xl text-xs font-semibold bg-slate-100 text-slate-700 hover:bg-slate-200 transition-colors cursor-pointer"
              >
                Close
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
