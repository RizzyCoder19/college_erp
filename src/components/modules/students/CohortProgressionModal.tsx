"use client";

import React, { useState, useEffect, useMemo, useCallback } from "react";
import { Icon } from "@/components/common/Icon";
import {
  previewCohortProgressionAction,
  executeCohortProgressionAction,
} from "@/lib/actions/students";
import {
  CohortProgressionCandidate,
  CohortProgressionPreviewData,
} from "@/lib/dal/studentRepository";
import { AcademicProgrammeDTO } from "@/lib/dal/academicRepository";
import { getCurrentAcademicYearAction, getProgrammeDetailsAction } from "@/lib/actions/academics";

interface CohortProgressionModalProps {
  isOpen: boolean;
  programmes: AcademicProgrammeDTO[];
  onClose: () => void;
  onSuccess: (summary: string) => void;
}

export const CohortProgressionModal: React.FC<CohortProgressionModalProps> = ({
  isOpen,
  programmes,
  onClose,
  onSuccess,
}) => {
  const [selectedProgrammeId, setSelectedProgrammeId] = useState<string>(
    programmes.length > 0 ? programmes[0].id : ""
  );
  const [academicYearId, setAcademicYearId] = useState<string>("");
  const [academicYears, setAcademicYears] = useState<Array<{ id: string; code: string; name: string }>>([]);
  const [sourceSemesterNumber, setSourceSemesterNumber] = useState<number>(1);
  const [sourceDivisionId, setSourceDivisionId] = useState<string>("ALL");

  const [programmeDetails, setProgrammeDetails] = useState<{
    id: string;
    code: string;
    name: string;
    semesters: Array<{
      id: string;
      semesterNumber: number;
      divisions: Array<{ id: string; name: string; maxCapacity: number }>;
    }>;
  } | null>(null);

  // Preview State
  const [isPreviewLoading, setIsPreviewLoading] = useState(false);
  const [previewData, setPreviewData] = useState<CohortProgressionPreviewData | null>(null);
  const [previewError, setPreviewError] = useState<string | null>(null);

  // Selection & Destination State
  const [selectedStudentIds, setSelectedStudentIds] = useState<Set<string>>(new Set());
  const [targetDivisionId, setTargetDivisionId] = useState<string>("");
  const [isExecuting, setIsExecuting] = useState(false);
  const [executionError, setExecutionError] = useState<string | null>(null);
  const [executionResult, setExecutionResult] = useState<{
    processed: number;
    successful: number;
    failed: number;
    semesterNumber: number;
    divisionName: string;
  } | null>(null);
  const [isConfirmStep, setIsConfirmStep] = useState(false);

  // Sync initial programme
  useEffect(() => {
    if (programmes.length > 0 && !selectedProgrammeId) {
      setSelectedProgrammeId(programmes[0].id);
    }
  }, [programmes, selectedProgrammeId]);

  // Load detailed programme structure whenever selectedProgrammeId changes
  useEffect(() => {
    let active = true;
    async function loadProgDetails() {
      if (!selectedProgrammeId) return;
      try {
        const res = await getProgrammeDetailsAction(selectedProgrammeId);
        if (active && res.success && res.data) {
          setProgrammeDetails(res.data);
        }
      } catch (err) {
        console.error("Failed to load programme structure", err);
      }
    }
    loadProgDetails();
    return () => {
      active = false;
    };
  }, [selectedProgrammeId]);

  // Load current academic year on mount
  useEffect(() => {
    async function loadAY() {
      const res = await getCurrentAcademicYearAction();
      if (res.success && res.data) {
        setAcademicYearId(res.data.id);
        setAcademicYears([{ id: res.data.id, code: res.data.code, name: res.data.name }]);
      }
    }
    loadAY();
  }, []);

  // Reset preview on filter change
  useEffect(() => {
    setPreviewData(null);
    setSelectedStudentIds(new Set());
    setTargetDivisionId("");
    setIsConfirmStep(false);
    setExecutionResult(null);
    setExecutionError(null);
    setPreviewError(null);
  }, [selectedProgrammeId, sourceSemesterNumber, sourceDivisionId, academicYearId]);

  // Fetch Preview
  const handleLoadPreview = useCallback(async () => {
    if (!selectedProgrammeId || !academicYearId || !programmeDetails) return;

    const sourceSem = programmeDetails.semesters.find(
      (s: { semesterNumber: number }) => s.semesterNumber === Number(sourceSemesterNumber)
    );
    if (!sourceSem) {
      setPreviewError(`Semester ${sourceSemesterNumber} not found in selected programme.`);
      return;
    }


    setIsPreviewLoading(true);
    setPreviewError(null);
    try {
      const res = await previewCohortProgressionAction({
        programmeId: selectedProgrammeId,
        semesterId: sourceSem.id,
        divisionId: sourceDivisionId === "ALL" ? undefined : sourceDivisionId,
        academicYearId,
      });

      if (!res.success || !res.data) {
        setPreviewError(res.error || "Failed to load cohort candidate preview.");
        setPreviewData(null);
      } else {
        setPreviewData(res.data);
        // Pre-select all eligible students by default
        const eligibleIds = new Set(
          res.data.candidates.filter((c) => c.isEligible).map((c) => c.id)
        );
        setSelectedStudentIds(eligibleIds);
        // Pre-select first available destination division
        if (res.data.availableDestinationDivisions.length > 0) {
          setTargetDivisionId(res.data.availableDestinationDivisions[0].id);
        }
      }
    } catch (err) {
      const msg = err instanceof Error ? err.message : "Error contacting database";
      setPreviewError(msg);
      setPreviewData(null);
    } finally {
      setIsPreviewLoading(false);
    }
  }, [selectedProgrammeId, academicYearId, programmeDetails, sourceSemesterNumber, sourceDivisionId]);

  // Toggle single student selection
  const handleToggleStudent = (id: string) => {
    setSelectedStudentIds((prev) => {
      const next = new Set(prev);
      if (next.has(id)) {
        next.delete(id);
      } else {
        next.add(id);
      }
      return next;
    });
  };

  // Select all eligible / Deselect all
  const handleSelectAllEligible = () => {
    if (!previewData) return;
    const eligibleIds = previewData.candidates
      .filter((c) => c.isEligible)
      .map((c) => c.id);
    setSelectedStudentIds(new Set(eligibleIds));
  };

  const handleClearSelection = () => {
    setSelectedStudentIds(new Set());
  };

  // Execute Progression
  const handleExecuteProgression = async () => {
    if (!previewData || !previewData.destinationSemester || !previewData.destinationAcademicYear) {
      setExecutionError("Destination term parameters incomplete.");
      return;
    }
    if (!targetDivisionId) {
      setExecutionError("Please select a target destination division.");
      return;
    }
    if (selectedStudentIds.size === 0) {
      setExecutionError("No students selected for progression.");
      return;
    }

    setIsExecuting(true);
    setExecutionError(null);

    try {
      const res = await executeCohortProgressionAction({
        studentIds: Array.from(selectedStudentIds),
        sourceSemesterId: previewData.sourceSemester.id,
        destinationAcademicYearId: previewData.destinationAcademicYear.id,
        destinationSemesterId: previewData.destinationSemester.id,
        destinationDivisionId: targetDivisionId,
      });

      if (!res.success || !res.data) {
        setExecutionError(res.error || "Failed to commit cohort progression transaction.");
      } else {
        setExecutionResult({
          processed: res.data.totalProcessed,
          successful: res.data.successfulIds.length,
          failed: res.data.failedRecords.length,
          semesterNumber: res.data.destinationSemesterNumber,
          divisionName: res.data.destinationDivisionName,
        });
        setIsConfirmStep(false);
      }
    } catch (err) {
      const msg = err instanceof Error ? err.message : "Transactional progression execution failed";
      setExecutionError(msg);
    } finally {
      setIsExecuting(false);
    }
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 overflow-y-auto bg-slate-900/70 backdrop-blur-xs flex items-center justify-center p-4">
      <div className="relative bg-white rounded-2xl shadow-2xl max-w-4xl w-full overflow-hidden border border-slate-100 flex flex-col max-h-[90vh]">
        {/* Header */}
        <div className="px-6 py-4 bg-slate-900 text-white flex items-center justify-between shrink-0">
          <div className="flex items-center space-x-3">
            <div className="w-9 h-9 rounded-xl bg-blue-600 flex items-center justify-center text-white font-bold">
              <Icon name="arrow-path" className="h-5 w-5" />
            </div>
            <div>
              <h3 className="text-base font-bold text-white tracking-tight">
                Cohort Academic Progression & Promotion
              </h3>
              <p className="text-xs text-slate-400">
                Transactional progression of student cohorts into the subsequent semester with preserved academic history.
              </p>
            </div>
          </div>
          <button
            type="button"
            onClick={onClose}
            disabled={isExecuting}
            className="p-1.5 rounded-lg text-slate-400 hover:text-white hover:bg-slate-800 transition-all cursor-pointer"
          >
            <Icon name="x-mark" className="h-5 w-5" />
          </button>
        </div>

        {/* Content Body */}
        <div className="p-6 overflow-y-auto space-y-6 flex-1">
          {executionResult ? (
            /* Post-execution Summary */
            <div className="p-8 text-center space-y-4">
              <div className="w-16 h-16 rounded-2xl bg-emerald-50 text-emerald-600 border border-emerald-200 flex items-center justify-center mx-auto">
                <Icon name="check-circle" className="h-8 w-8" />
              </div>
              <h4 className="text-lg font-bold text-slate-900">Cohort Progression Complete</h4>
              <p className="text-sm text-slate-600 max-w-md mx-auto">
                Successfully advanced <strong>{executionResult.successful}</strong> student(s) to{" "}
                <strong>Semester {executionResult.semesterNumber}</strong> (
                {executionResult.divisionName}). All prior enrolments have been archived as COMPLETED.
              </p>
              {executionResult.failed > 0 && (
                <div className="p-3 bg-amber-50 border border-amber-200 rounded-xl text-xs text-amber-800 max-w-md mx-auto">
                  {executionResult.failed} record(s) could not be progressed due to database conflicts or invalid standing.
                </div>
              )}
              <div className="pt-4">
                <button
                  type="button"
                  onClick={() => {
                    onSuccess(
                      `Successfully progressed ${executionResult.successful} students to Semester ${executionResult.semesterNumber}.`
                    );
                    onClose();
                  }}
                  className="px-6 py-2.5 bg-blue-600 text-white font-semibold rounded-xl text-xs hover:bg-blue-700 transition-all cursor-pointer shadow-sm"
                >
                  Return to Student Directory
                </button>
              </div>
            </div>
          ) : (
            <>
              {/* Filter Row / Cohort Selector */}
              <div className="p-4 rounded-xl bg-slate-50 border border-slate-200 space-y-3">
                <div className="text-xs font-bold uppercase tracking-wider text-slate-500">
                  1. Select Source Cohort
                </div>
                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3">
                  <div>
                    <label className="block text-[11px] font-semibold text-slate-600 mb-1">
                      Programme
                    </label>
                    <select
                      value={selectedProgrammeId}
                      onChange={(e) => setSelectedProgrammeId(e.target.value)}
                      className="w-full px-3 py-2 rounded-xl bg-white border border-slate-200 text-xs text-slate-800 focus:outline-none focus:ring-1 focus:ring-blue-600"
                    >
                      {programmes.map((p) => (
                        <option key={p.id} value={p.id}>
                          {p.code} — {p.name}
                        </option>
                      ))}
                    </select>
                  </div>

                  <div>
                    <label className="block text-[11px] font-semibold text-slate-600 mb-1">
                      Current Semester
                    </label>
                    <select
                      value={sourceSemesterNumber}
                      onChange={(e) => setSourceSemesterNumber(Number(e.target.value))}
                      className="w-full px-3 py-2 rounded-xl bg-white border border-slate-200 text-xs text-slate-800 focus:outline-none focus:ring-1 focus:ring-blue-600"
                    >
                      {programmeDetails?.semesters.map((s: { id: string; semesterNumber: number }) => (
                        <option key={s.id} value={s.semesterNumber}>
                          Semester {s.semesterNumber}
                        </option>
                      ))}
                    </select>
                  </div>

                  <div>
                    <label className="block text-[11px] font-semibold text-slate-600 mb-1">
                      Division
                    </label>
                    <select
                      value={sourceDivisionId}
                      onChange={(e) => setSourceDivisionId(e.target.value)}
                      className="w-full px-3 py-2 rounded-xl bg-white border border-slate-200 text-xs text-slate-800 focus:outline-none focus:ring-1 focus:ring-blue-600"
                    >
                      <option value="ALL">All Divisions</option>
                      {programmeDetails?.semesters
                        .find((s: { semesterNumber: number }) => s.semesterNumber === Number(sourceSemesterNumber))
                        ?.divisions.map((d: { id: string; name: string }) => (
                          <option key={d.id} value={d.id}>
                            {d.name}
                          </option>
                        ))}
                    </select>
                  </div>

                  <div className="flex items-end">
                    <button
                      type="button"
                      onClick={handleLoadPreview}
                      disabled={isPreviewLoading}
                      className="w-full px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white font-semibold rounded-xl text-xs transition-all cursor-pointer shadow-xs disabled:opacity-50"
                    >
                      {isPreviewLoading ? "Inspecting..." : "Inspect Candidates"}
                    </button>
                  </div>
                </div>

                {previewError && (
                  <div className="p-3 bg-rose-50 border border-rose-200 rounded-xl text-xs text-[#D92534] font-medium">
                    {previewError}
                  </div>
                )}
              </div>

              {/* Preview Candidates & Destination Configuration */}
              {previewData && (
                <div className="space-y-4">
                  {/* Destination Info Box */}
                  <div className="p-4 rounded-xl bg-blue-50/60 border border-blue-200 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 text-xs">
                    <div>
                      <div className="font-bold text-blue-900 flex items-center space-x-1.5">
                        <Icon name="arrow-path" className="h-4 w-4 text-blue-600" />
                        <span>Destination Progression Path</span>
                      </div>
                      <div className="text-blue-700 mt-0.5">
                        {previewData.isFinalSemester ? (
                          <span className="font-semibold text-amber-800">
                            Final Curriculum Semester reached. Candidates must undergo Graduation Clearance.
                          </span>
                        ) : (
                          <span>
                            Progressing from <strong>Semester {previewData.sourceSemester.semesterNumber}</strong> to{" "}
                            <strong>Semester {previewData.destinationSemester?.semesterNumber}</strong> (
                            {previewData.destinationAcademicYear?.code}).
                          </span>
                        )}
                      </div>
                    </div>

                    {!previewData.isFinalSemester && (
                      <div className="flex items-center space-x-2">
                        <label className="font-semibold text-blue-900 whitespace-nowrap">Target Division:</label>
                        <select
                          value={targetDivisionId}
                          onChange={(e) => setTargetDivisionId(e.target.value)}
                          className="px-3 py-1.5 rounded-lg bg-white border border-blue-300 text-xs font-semibold text-slate-900 focus:outline-none"
                        >
                          {previewData.availableDestinationDivisions.map((d) => (
                            <option key={d.id} value={d.id}>
                              {d.name} (Cap: {d.maxCapacity})
                            </option>
                          ))}
                        </select>
                      </div>
                    )}
                  </div>

                  {/* Candidate Metrics & Action Controls */}
                  <div className="flex items-center justify-between text-xs">
                    <div className="flex items-center space-x-4">
                      <span className="text-slate-500">
                        Total Candidates: <strong className="text-slate-900">{previewData.summary.totalCandidates}</strong>
                      </span>
                      <span className="text-emerald-700">
                        Eligible: <strong>{previewData.summary.eligibleCount}</strong>
                      </span>
                      <span className="text-rose-700">
                        Requires Review: <strong>{previewData.summary.ineligibleCount}</strong>
                      </span>
                      <span className="text-blue-700">
                        Selected: <strong>{selectedStudentIds.size}</strong>
                      </span>
                    </div>

                    {!previewData.isFinalSemester && (
                      <div className="flex items-center space-x-2">
                        <button
                          type="button"
                          onClick={handleSelectAllEligible}
                          className="px-2.5 py-1 rounded bg-slate-100 hover:bg-slate-200 text-slate-700 text-[11px] font-semibold cursor-pointer"
                        >
                          Select All Eligible
                        </button>
                        <button
                          type="button"
                          onClick={handleClearSelection}
                          className="px-2.5 py-1 rounded bg-slate-100 hover:bg-slate-200 text-slate-700 text-[11px] font-semibold cursor-pointer"
                        >
                          Clear
                        </button>
                      </div>
                    )}
                  </div>

                  {/* Candidates Table */}
                  <div className="overflow-x-auto rounded-xl border border-slate-200 max-h-72">
                    <table className="w-full text-left text-xs">
                      <thead className="bg-slate-50 text-slate-500 font-semibold uppercase tracking-wider text-[10px] border-b border-slate-200 sticky top-0">
                        <tr>
                          <th className="py-2.5 px-3 w-8">#</th>
                          <th className="py-2.5 px-3">Student Name</th>
                          <th className="py-2.5 px-3">Roll / PRN</th>
                          <th className="py-2.5 px-3">Current Div</th>
                          <th className="py-2.5 px-3">Attendance</th>
                          <th className="py-2.5 px-3">Fee Status</th>
                          <th className="py-2.5 px-3 text-right">Eligibility Status</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-slate-100 text-slate-700">
                        {previewData.candidates.length > 0 ? (
                          previewData.candidates.map((c) => {
                            const isSelected = selectedStudentIds.has(c.id);
                            return (
                              <tr
                                key={c.id}
                                className={`hover:bg-slate-50/70 transition-colors ${
                                  isSelected ? "bg-blue-50/30" : ""
                                }`}
                              >
                                <td className="py-2.5 px-3">
                                  <input
                                    type="checkbox"
                                    checked={isSelected}
                                    disabled={previewData.isFinalSemester}
                                    onChange={() => handleToggleStudent(c.id)}
                                    className="rounded border-slate-300 text-blue-600 focus:ring-blue-500 cursor-pointer"
                                  />
                                </td>
                                <td className="py-2.5 px-3 font-semibold text-slate-900">
                                  {c.fullName}
                                </td>
                                <td className="py-2.5 px-3 font-mono text-[11px] text-slate-600">
                                  {c.rollNumber}
                                </td>
                                <td className="py-2.5 px-3 font-medium text-slate-700">
                                  {c.currentDivisionName}
                                </td>
                                <td className="py-2.5 px-3">
                                  {c.attendanceRate !== null ? (
                                    <span
                                      className={`font-semibold ${
                                        c.attendanceRate >= 75 ? "text-emerald-700" : "text-[#D92534]"
                                      }`}
                                    >
                                      {c.attendanceRate}%
                                    </span>
                                  ) : (
                                    <span className="text-slate-400">N/A</span>
                                  )}
                                </td>
                                <td className="py-2.5 px-3">
                                  <span
                                    className={`text-[10px] font-bold px-2 py-0.5 rounded-full border ${
                                      c.feeStatus === "CLEARED"
                                        ? "bg-emerald-50 text-emerald-700 border-emerald-200"
                                        : c.feeStatus === "PARTIAL"
                                        ? "bg-amber-50 text-amber-700 border-amber-200"
                                        : "bg-slate-100 text-slate-700 border-slate-200"
                                    }`}
                                  >
                                    {c.feeStatus}
                                  </span>
                                </td>
                                <td className="py-2.5 px-3 text-right">
                                  {c.isEligible ? (
                                    <span className="inline-flex items-center space-x-1 text-[10px] font-bold text-emerald-700 bg-emerald-50 px-2 py-0.5 rounded border border-emerald-200">
                                      <Icon name="check-circle" className="h-3 w-3" />
                                      <span>Eligible</span>
                                    </span>
                                  ) : (
                                    <span
                                      className="inline-flex items-center space-x-1 text-[10px] font-bold text-[#D92534] bg-rose-50 px-2 py-0.5 rounded border border-rose-200"
                                      title={c.ineligibilityReason}
                                    >
                                      <Icon name="exclamation-triangle" className="h-3 w-3" />
                                      <span>Blocked</span>
                                    </span>
                                  )}
                                </td>
                              </tr>
                            );
                          })
                        ) : (
                          <tr>
                            <td colSpan={7} className="py-6 text-center text-slate-400">
                              No active students enrolled in this cohort.
                            </td>
                          </tr>
                        )}
                      </tbody>
                    </table>
                  </div>

                  {/* Confirmation Card if in Confirm Step */}
                  {isConfirmStep && (
                    <div className="p-4 rounded-xl bg-amber-50 border border-amber-200 text-xs text-amber-900 space-y-2">
                      <div className="font-bold flex items-center space-x-2">
                        <Icon name="shield-alert" className="h-4 w-4 text-amber-700" />
                        <span>Confirm Transactional Progression</span>
                      </div>
                      <p>
                        You are about to advance <strong>{selectedStudentIds.size}</strong> student(s) to{" "}
                        <strong>Semester {previewData.destinationSemester?.semesterNumber}</strong>. Prior enrolments
                        will be archived as <strong>COMPLETED</strong> and new active <strong>ENROLLED</strong> records
                        will be generated atomically.
                      </p>
                    </div>
                  )}

                  {executionError && (
                    <div className="p-3 bg-rose-50 border border-rose-200 rounded-xl text-xs text-[#D92534] font-medium">
                      {executionError}
                    </div>
                  )}
                </div>
              )}
            </>
          )}
        </div>

        {/* Footer Actions */}
        {!executionResult && (
          <div className="px-6 py-4 bg-slate-50 border-t border-slate-200 flex items-center justify-between shrink-0">
            <button
              type="button"
              onClick={onClose}
              disabled={isExecuting}
              className="px-4 py-2 rounded-xl text-xs font-semibold text-slate-700 hover:bg-slate-200 transition-all cursor-pointer"
            >
              Cancel
            </button>

            {previewData && !previewData.isFinalSemester && (
              <div className="flex items-center space-x-2">
                {isConfirmStep ? (
                  <>
                    <button
                      type="button"
                      onClick={() => setIsConfirmStep(false)}
                      disabled={isExecuting}
                      className="px-4 py-2 rounded-xl text-xs font-semibold text-slate-700 bg-white border border-slate-200 hover:bg-slate-50 transition-all cursor-pointer"
                    >
                      Back to Review
                    </button>
                    <button
                      type="button"
                      onClick={handleExecuteProgression}
                      disabled={isExecuting}
                      className="px-5 py-2 bg-blue-600 hover:bg-blue-700 text-white font-semibold rounded-xl text-xs transition-all cursor-pointer shadow-xs disabled:opacity-50"
                    >
                      {isExecuting ? "Committing Transaction..." : "Confirm & Commit Progression"}
                    </button>
                  </>
                ) : (
                  <button
                    type="button"
                    onClick={() => {
                      if (selectedStudentIds.size === 0) {
                        setExecutionError("Please select at least one eligible student.");
                        return;
                      }
                      setExecutionError(null);
                      setIsConfirmStep(true);
                    }}
                    disabled={selectedStudentIds.size === 0}
                    className="px-5 py-2 bg-slate-900 hover:bg-slate-800 text-white font-semibold rounded-xl text-xs transition-all cursor-pointer shadow-xs disabled:opacity-50"
                  >
                    Proceed with {selectedStudentIds.size} Candidate(s)
                  </button>
                )}
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  );
};
