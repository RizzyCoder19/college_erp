"use client";

import React, { useState, useMemo, useEffect, useCallback } from "react";
import { getStudentsAction, createStudentAction, updateStudentAction, deleteStudentAction } from "@/lib/actions/students";
import { getProgrammesAction, getCurrentAcademicYearAction, getProgrammeDetailsAction } from "@/lib/actions/academics";
import { AcademicProgrammeDTO } from "@/lib/dal/academicRepository";
import { mapStudentDbToRecord } from "@/lib/utils/studentMapper";
import { PrototypeReconciliationModal, PrototypeComparisonItem } from "@/components/common/PrototypeReconciliationModal";
import Link from "next/link";
import Image from "next/image";
import { Icon } from "@/components/common/Icon";
import { AnimatedReveal } from "@/components/common/AnimatedReveal";
import { StudentRecord, StudentStatus, FeeStatus } from "@/types/student";
import { ACADEMIC_PROGRAMMES } from "@/data/mockData";
import { StudentDetailModal } from "./StudentDetailModal";
import { StudentFormModal } from "./StudentFormModal";
import { DeleteConfirmModal } from "./DeleteConfirmModal";

const STORAGE_KEY = "rpihm_student_records_v1";

export const StudentsView: React.FC = () => {
  const [students, setStudents] = useState<StudentRecord[]>([]);
  const [programmes, setProgrammes] = useState<AcademicProgrammeDTO[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [serverError, setServerError] = useState<string | null>(null);

  const [searchQuery, setSearchQuery] = useState("");
  const [selectedProgramme, setSelectedProgramme] = useState("all");
  const [selectedSemester, setSelectedSemester] = useState("all");
  const [selectedStatus, setSelectedStatus] = useState("all");
  const [selectedFee, setSelectedFee] = useState("all");

  // Prototype Data Inspection & Reconciliation State
  const [prototypeRecords, setPrototypeRecords] = useState<StudentRecord[]>([]);
  const [showReconcileBanner, setShowReconcileBanner] = useState(true);
  const [reconcileModalOpen, setReconcileModalOpen] = useState(false);

  const loadData = useCallback(async () => {
    setIsLoading(true);
    setServerError(null);
    try {
      const res = await getStudentsAction({ pageSize: 100 });
      if (!res.success || !res.data) {
        setServerError(res.error || "Failed to load students from database.");
      } else {
        const mapped = res.data.items.map(mapStudentDbToRecord);
        setStudents(mapped);
      }

      const progRes = await getProgrammesAction();
      if (progRes.success && progRes.data) {
        setProgrammes(progRes.data);
      }

      try {
        const saved = localStorage.getItem(STORAGE_KEY);
        if (saved) {
          const parsed = JSON.parse(saved);
          if (Array.isArray(parsed) && parsed.length > 0) {
            setPrototypeRecords(parsed);
          }
        }
      } catch {
        // LocalStorage fallback
      }
    } catch (err) {
      const msg = err instanceof Error ? err.message : "Failed to connect to database";
      setServerError(msg);
    } finally {
      setIsLoading(false);
    }
  }, []);

  useEffect(() => {
    let active = true;
    const init = async () => {
      try {
        const res = await getStudentsAction({ pageSize: 100 });
        if (!active) return;
        if (!res.success || !res.data) {
          setServerError(res.error || "Failed to load students from database.");
        } else {
          setStudents(res.data.items.map(mapStudentDbToRecord));
        }

        const progRes = await getProgrammesAction();
        if (!active) return;
        if (progRes.success && progRes.data) {
          setProgrammes(progRes.data);
        }

        try {
          const saved = localStorage.getItem(STORAGE_KEY);
          if (saved && active) {
            const parsed = JSON.parse(saved);
            if (Array.isArray(parsed) && parsed.length > 0) {
              setPrototypeRecords(parsed);
            }
          }
        } catch {
          // LocalStorage fallback
        }
      } catch (err) {
        if (!active) return;
        const msg = err instanceof Error ? err.message : "Failed to connect to database";
        setServerError(msg);
      } finally {
        if (active) setIsLoading(false);
      }
    };

    init();
    return () => {
      active = false;
    };
  }, []);

  // Modals state
  const [detailStudent, setDetailStudent] = useState<StudentRecord | null>(null);
  const [formModalOpen, setFormModalOpen] = useState(false);
  const [formMode, setFormMode] = useState<"add" | "edit">("add");
  const [formStudent, setFormStudent] = useState<StudentRecord | null>(null);
  const [deleteStudent, setDeleteStudent] = useState<StudentRecord | null>(null);
  const [toastMessage, setToastMessage] = useState<string | null>(null);

  // Reconciliation Comparison Items
  const reconciliationItems: PrototypeComparisonItem[] = useMemo(() => {
    return prototypeRecords.map((proto) => {
      const dbMatch = students.find(
        (s) =>
          s.prn.trim().toLowerCase() === proto.prn.trim().toLowerCase() ||
          s.email.trim().toLowerCase() === proto.email.trim().toLowerCase()
      );

      if (dbMatch) {
        const isConflict =
          dbMatch.fullName.trim().toLowerCase() !== proto.fullName.trim().toLowerCase();
        if (isConflict) {
          return {
            id: proto.id,
            primaryKey: proto.prn,
            name: proto.fullName,
            email: proto.email,
            secondaryInfo: proto.programmeName,
            status: "conflict",
            statusReason: `Conflict: PRN matches database record for "${dbMatch.fullName}"`,
            rawRecord: proto,
          };
        }
        return {
          id: proto.id,
          primaryKey: proto.prn,
          name: proto.fullName,
          email: proto.email,
          secondaryInfo: proto.programmeName,
          status: "duplicate",
          statusReason: "Already present in SQLite database",
          rawRecord: proto,
        };
      }

      return {
        id: proto.id,
        primaryKey: proto.prn,
        name: proto.fullName,
        email: proto.email,
        secondaryInfo: proto.programmeName,
        status: "importable",
        statusReason: "New prototype student ready to import into database",
        rawRecord: proto,
      };
    });
  }, [prototypeRecords, students]);

  // Safe Prototype Reconciliation Import Handler
  const handleReconcileImport = async (importableItems: PrototypeComparisonItem[]) => {
    let imported = 0;
    let failed = 0;

    for (const item of importableItems) {
      const std = item.rawRecord as StudentRecord;
      try {
        const ayRes = await getCurrentAcademicYearAction();
        const academicYearId = ayRes.success && ayRes.data ? ayRes.data.id : "";

        let programmeId = programmes.length > 0 ? programmes[0].id : "";
        const matchedProg = programmes.find(
          (p) =>
            p.name.toLowerCase() === std.programmeName.toLowerCase() ||
            p.id === std.programmeId
        );
        if (matchedProg) programmeId = matchedProg.id;

        const progDetails = await getProgrammeDetailsAction(programmeId);
        let semesterId = "";
        let divisionId = "";
        if (progDetails.success && progDetails.data && progDetails.data.semesters?.length > 0) {
          const sem =
            progDetails.data.semesters.find((s) => s.semesterNumber === Number(std.semester)) ||
            progDetails.data.semesters[0];
          semesterId = sem.id;
          if (sem.divisions?.length > 0) {
            const div =
              sem.divisions.find((d) => d.name === std.division) || sem.divisions[0];
            divisionId = div.id;
          }
        }

        const cleanPrn = std.prn.trim().toUpperCase();
        const rollNumber = cleanPrn.startsWith("RPIHM-") ? cleanPrn : `RPIHM-${cleanPrn}`;

        const res = await createStudentAction({
          rollNumber,
          prn: cleanPrn,
          fullName: std.fullName.trim(),
          email: std.email.trim().toLowerCase(),
          phone: std.phone.trim(),
          dob: std.dateOfBirth ? new Date(std.dateOfBirth) : new Date("2006-05-15"),
          bloodGroup: std.bloodGroup || "B+",
          gender: "MALE",
          programmeId,
          semesterId,
          divisionId,
          academicYearId,
        });

        if (res.success) {
          imported++;
        } else {
          failed++;
        }
      } catch {
        failed++;
      }
    }

    if (imported > 0) {
      await loadData();
    }
    return { imported, failed };
  };

  const showToast = (msg: string) => {
    setToastMessage(msg);
    setTimeout(() => setToastMessage(null), 3500);
  };

  // Filter logic
  const filteredStudents = useMemo(() => {
    return students.filter((std) => {
      const matchesSearch =
        searchQuery.trim() === "" ||
        std.fullName.toLowerCase().includes(searchQuery.toLowerCase()) ||
        std.prn.toLowerCase().includes(searchQuery.toLowerCase()) ||
        std.programmeName.toLowerCase().includes(searchQuery.toLowerCase()) ||
        std.email.toLowerCase().includes(searchQuery.toLowerCase());

      const matchesProgramme =
        selectedProgramme === "all" || std.programmeId === selectedProgramme;

      const matchesSemester =
        selectedSemester === "all" || String(std.semester) === selectedSemester;

      const matchesStatus =
        selectedStatus === "all" || std.enrollmentStatus === selectedStatus;

      const matchesFee =
        selectedFee === "all" || std.feeStatus === selectedFee;

      return (
        matchesSearch &&
        matchesProgramme &&
        matchesSemester &&
        matchesStatus &&
        matchesFee
      );
    });
  }, [
    students,
    searchQuery,
    selectedProgramme,
    selectedSemester,
    selectedStatus,
    selectedFee,
  ]);

  // Statistics
  const stats = useMemo(() => {
    const total = students.length;
    const active = students.filter((s) => s.enrollmentStatus === "Active").length;
    const onLeave = students.filter((s) => s.enrollmentStatus === "On Leave").length;
    const feePending = students.filter((s) => s.feeStatus === "Pending").length;
    return { total, active, onLeave, feePending };
  }, [students]);

  // Handlers for Database Mutations
  const handleAddStudent = async (record: StudentRecord) => {
    
    try {
      const ayRes = await getCurrentAcademicYearAction();
      const academicYearId = ayRes.success && ayRes.data ? ayRes.data.id : "";

      let targetProgId = record.programmeId;
      if (!targetProgId && programmes.length > 0) {
        targetProgId = programmes[0].id;
      }

      let semesterId = "";
      let divisionId = "";
      if (targetProgId) {
        const progRes = await getProgrammeDetailsAction(targetProgId);
        if (progRes.success && progRes.data && progRes.data.semesters?.length > 0) {
          const sem =
            progRes.data.semesters.find((s) => s.semesterNumber === Number(record.semester)) ||
            progRes.data.semesters[0];
          semesterId = sem.id;
          if (sem.divisions?.length > 0) {
            const div =
              sem.divisions.find((d) => d.name === record.division) || sem.divisions[0];
            divisionId = div.id;
          }
        }
      }

      if (!semesterId || !divisionId || !academicYearId) {
        const progList = await getProgrammesAction();
        if (progList.success && progList.data && progList.data.length > 0) {
          const fallbackProg = await getProgrammeDetailsAction(progList.data[0].id);
          if (fallbackProg.success && fallbackProg.data && fallbackProg.data.semesters?.length > 0) {
            const sem = fallbackProg.data.semesters[0];
            semesterId = sem.id;
            if (sem.divisions?.length > 0) {
              divisionId = sem.divisions[0].id;
            }
          }
        }
      }

      const cleanPrn = record.prn.trim().toUpperCase();
      const rollNumber = cleanPrn.startsWith("RPIHM-") ? cleanPrn : `RPIHM-${cleanPrn}`;

      const res = await createStudentAction({
        rollNumber,
        prn: cleanPrn,
        fullName: record.fullName.trim(),
        email: record.email.trim().toLowerCase(),
        phone: record.phone.trim(),
        dob: record.dateOfBirth ? new Date(record.dateOfBirth) : new Date("2006-05-15"),
        bloodGroup: record.bloodGroup || "B+",
        gender: "MALE",
        programmeId: targetProgId,
        semesterId,
        divisionId,
        academicYearId,
      });

      if (!res.success) {
        showToast("Error creating student: " + (res.error || "Permission denied"));
        return;
      }

      showToast(`Student dossier for "${record.fullName}" enrolled in database.`);
      setFormModalOpen(false);
      await loadData();
    } catch (err) {
      const msg = err instanceof Error ? err.message : "Failed to create student";
      showToast("Error: " + msg);
    } finally {
      
    }
  };

  const handleEditStudent = async (record: StudentRecord) => {
    
    try {
      const res = await updateStudentAction(record.id, {
        fullName: record.fullName.trim(),
        phone: record.phone.trim(),
        email: record.email.trim().toLowerCase(),
        bloodGroup: record.bloodGroup,
        status: record.enrollmentStatus.toUpperCase() === "ACTIVE" ? "ACTIVE" : "INACTIVE",
      });

      if (!res.success) {
        showToast("Error updating student: " + (res.error || "Permission denied"));
        return;
      }

      showToast(`Student record for "${record.fullName}" updated in database.`);
      setFormModalOpen(false);
      setFormStudent(null);
      await loadData();
    } catch (err) {
      const msg = err instanceof Error ? err.message : "Failed to update student";
      showToast("Error: " + msg);
    } finally {
      
    }
  };

  const handleDeleteStudent = async (id: string) => {
    
    try {
      const target = students.find((s) => s.id === id);
      const res = await deleteStudentAction(id);
      if (!res.success) {
        showToast("Error removing student: " + (res.error || "Permission denied"));
        return;
      }

      showToast(`Record for "${target?.fullName || id}" removed from database.`);
      setDeleteStudent(null);
      await loadData();
    } catch (err) {
      const msg = err instanceof Error ? err.message : "Failed to delete student";
      showToast("Error: " + msg);
    } finally {
      
    }
  };

  const clearFilters = () => {
    setSearchQuery("");
    setSelectedProgramme("all");
    setSelectedSemester("all");
    setSelectedStatus("all");
    setSelectedFee("all");
  };

  const isFilterActive =
    searchQuery.trim() !== "" ||
    selectedProgramme !== "all" ||
    selectedSemester !== "all" ||
    selectedStatus !== "all" ||
    selectedFee !== "all";

  const getStatusBadge = (status: StudentStatus) => {
    switch (status) {
      case "Active":
        return "bg-emerald-50 text-emerald-700 border-emerald-200";
      case "On Leave":
        return "bg-amber-50 text-amber-700 border-amber-200";
      case "Graduated":
        return "bg-blue-50 text-[#1657D9] border-blue-200";
      default:
        return "bg-purple-50 text-purple-700 border-purple-200";
    }
  };

  const getFeeBadge = (status: FeeStatus) => {
    switch (status) {
      case "Paid":
        return "bg-emerald-50 text-emerald-700 border-emerald-200";
      case "Partial":
        return "bg-amber-50 text-amber-700 border-amber-200";
      default:
        return "bg-red-50 text-[#D92534] border-red-200";
    }
  };

  return (
    <div className="space-y-6">
      {/* Toast Notification */}
      {toastMessage && (
        <div className="fixed bottom-6 right-6 z-50 flex items-center space-x-2.5 px-4 py-3 bg-[#0B1528] text-white rounded-xl shadow-2xl border border-blue-400/30 text-xs animate-in fade-in slide-in-from-bottom-3 duration-200">
          <Icon name="check" className="h-4 w-4 text-emerald-400 shrink-0" />
          <span>{toastMessage}</span>
        </div>
      )}

      {/* Breadcrumb Navigation */}
      <nav aria-label="Breadcrumb" className="flex items-center space-x-2 text-xs text-slate-500">
        <Link
          href="/"
          className="hover:text-[#1657D9] flex items-center space-x-1 font-medium transition-colors"
        >
          <Icon name="arrow-left" className="h-3.5 w-3.5" />
          <span>Dashboard</span>
        </Link>
        <span>/</span>
        <span className="text-slate-400">Modules</span>
        <span>/</span>
        <span className="font-bold text-slate-900">
          Students & Admissions
        </span>
      </nav>

      {/* Header Banner */}
      <AnimatedReveal delay={0}>
        <div className="relative overflow-hidden rounded-2xl border border-slate-200/90 shadow-xs group bg-[#071322]">
          {/* Full-box background camouflage image with smooth cursor hover zoom */}
          <div className="absolute inset-0 z-0 overflow-hidden pointer-events-none">
            <Image
              src="/images/campus-illuminated-sign.png"
              alt="R. P. Institute of Hospitality & Management Campus Signage"
              fill
              sizes="100vw"
              className="object-cover object-right opacity-80 transition-transform duration-700 ease-out group-hover:scale-108"
              priority
            />
            {/* Frosted white camouflage overlay */}
            <div className="absolute inset-0 bg-gradient-to-r from-white via-white/95 to-white/70 z-10 backdrop-blur-[1.5px]"></div>
          </div>

          <div className="relative z-10 p-6 sm:p-8">
            <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
              <div className="flex items-start space-x-4">
                <div className="p-3.5 rounded-2xl bg-blue-50 text-[#1657D9] border border-blue-100 shrink-0">
                  <Icon name="users" className="h-8 w-8" />
                </div>
                <div>
                  <div className="flex items-center space-x-2">
                    <span className="text-xs font-bold uppercase tracking-wider text-[#1657D9]">
                      Student Affairs & Registrar Office
                    </span>
                    <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-emerald-50 text-emerald-700 border border-emerald-200">
                      Live SQLite Database • AY 2026 – 27
                    </span>
                  </div>
                  <h1 className="text-2xl sm:text-3xl font-extrabold tracking-tight text-slate-900 font-serif mt-1">
                    Student Management Register
                  </h1>
                  <p className="text-sm text-slate-600 mt-1 max-w-2xl leading-relaxed">
                    Student master database, enrollment dossiers, and academic records across technology and hospitality disciplines.
                  </p>
                </div>
              </div>

              <div className="shrink-0 flex items-center space-x-2.5">
                <button
                  type="button"
                  onClick={() => {
                    setFormMode("add");
                    setFormStudent(null);
                    setFormModalOpen(true);
                  }}
                  className="inline-flex items-center space-x-2 px-4 py-2.5 rounded-xl bg-[#1657D9] hover:bg-[#1248B8] text-white text-xs font-semibold shadow-xs transition-all cursor-pointer"
                >
                  <Icon name="plus" className="h-4 w-4" />
                  <span>Enroll New Student</span>
                </button>
              </div>
            </div>

            {/* Quick Metrics Strip */}
            <div className="mt-6 pt-4 border-t border-slate-200/80 grid grid-cols-2 sm:grid-cols-4 gap-4">
              <div className="bg-white/80 backdrop-blur-xs p-3.5 rounded-xl border border-slate-200/80 shadow-2xs">
                <div className="text-[11px] text-slate-500 uppercase tracking-wider font-semibold">
                  Registered Students
                </div>
                <div className="text-xl sm:text-2xl font-extrabold text-[#0F172A] mt-0.5 font-serif">
                  {stats.total}
                </div>
              </div>
              <div className="bg-white/80 backdrop-blur-xs p-3.5 rounded-xl border border-slate-200/80 shadow-2xs">
                <div className="text-[11px] text-slate-500 uppercase tracking-wider font-semibold">
                  Active in Classrooms
                </div>
                <div className="text-xl sm:text-2xl font-extrabold text-emerald-700 mt-0.5 font-serif">
                  {stats.active}
                </div>
              </div>
              <div className="bg-white/80 backdrop-blur-xs p-3.5 rounded-xl border border-slate-200/80 shadow-2xs">
                <div className="text-[11px] text-slate-500 uppercase tracking-wider font-semibold">
                  On Leave / Training
                </div>
                <div className="text-xl sm:text-2xl font-extrabold text-amber-700 mt-0.5 font-serif">
                  {stats.onLeave}
                </div>
              </div>
              <div className="bg-white/80 backdrop-blur-xs p-3.5 rounded-xl border border-slate-200/80 shadow-2xs">
                <div className="text-[11px] text-slate-500 uppercase tracking-wider font-semibold">
                  Fee Installment Due
                </div>
                <div className="text-xl sm:text-2xl font-extrabold text-[#D92534] mt-0.5 font-serif">
                  {stats.feePending}
                </div>
              </div>
            </div>
          </div>
        </div>
      </AnimatedReveal>

      {/* Prototype Data Reconciliation Alert Banner */}
      {prototypeRecords.length > 0 && showReconcileBanner && (
        <div className="p-4 rounded-2xl bg-amber-50/80 border border-amber-200/90 shadow-2xs flex flex-col sm:flex-row sm:items-center justify-between gap-3">
          <div className="flex items-start space-x-3">
            <div className="p-2 rounded-xl bg-amber-100 text-amber-800 shrink-0 mt-0.5">
              <Icon name="archive-box" className="h-5 w-5" />
            </div>
            <div>
              <h4 className="text-xs font-bold text-amber-950">
                Prototype Browser Records Detected ({prototypeRecords.length} records in localStorage)
              </h4>
              <p className="text-[11px] text-amber-800 mt-0.5 leading-relaxed">
                The SQLite database is now active as the authoritative system of record. You can safely inspect and reconcile legacy prototype data. Browser storage will not be altered.
              </p>
            </div>
          </div>

          <div className="flex items-center space-x-2 shrink-0 self-end sm:self-center">
            <button
              type="button"
              onClick={() => setReconcileModalOpen(true)}
              className="px-3 py-1.5 rounded-xl bg-[#1657D9] hover:bg-[#1248B8] text-white text-xs font-semibold shadow-2xs transition-all cursor-pointer flex items-center space-x-1"
            >
              <Icon name="arrow-path" className="h-3.5 w-3.5" />
              <span>Review & Reconcile</span>
            </button>
            <button
              type="button"
              onClick={() => setShowReconcileBanner(false)}
              className="p-1.5 rounded-lg text-amber-700 hover:text-amber-900 hover:bg-amber-100/60 transition-colors cursor-pointer"
              title="Dismiss Banner"
              aria-label="Dismiss banner"
            >
              <Icon name="x-mark" className="h-4 w-4" />
            </button>
          </div>
        </div>
      )}

      {/* Server Connection Error Alert */}
      {serverError && (
        <div className="p-4 rounded-2xl bg-red-50 border border-red-200 shadow-2xs flex items-center justify-between gap-3 text-red-900">
          <div className="flex items-center space-x-3 text-xs">
            <Icon name="exclamation-circle" className="h-5 w-5 text-red-600 shrink-0" />
            <div>
              <span className="font-bold">Database Connection Warning: </span>
              <span>{serverError}</span>
            </div>
          </div>
          <button
            type="button"
            onClick={loadData}
            className="px-3 py-1 rounded-lg bg-red-600 hover:bg-red-700 text-white text-xs font-semibold shrink-0 cursor-pointer"
          >
            Retry
          </button>
        </div>
      )}

      {/* Main Student Register Console */}
      <div className="bg-white rounded-2xl border border-slate-200/90 shadow-2xs overflow-hidden">
        {/* Controls Bar: Search, Filters & Bulk Actions */}
        <div className="p-4 sm:p-5 border-b border-slate-100 bg-slate-50/50 space-y-3.5">
          <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-3">
            {/* Search Input */}
            <div className="relative flex-1 max-w-lg">
              <Icon
                name="search"
                className="absolute left-3.5 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-400"
              />
              <input
                type="text"
                placeholder="Search students by name, PRN, programme, email…"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="w-full pl-9 pr-3.5 py-2 text-xs rounded-xl bg-white border border-slate-200 text-slate-900 placeholder:text-slate-400 focus:outline-none focus:ring-1 focus:ring-[#1657D9]"
              />
            </div>

            {/* Quick Actions */}
            <div className="flex items-center space-x-2 shrink-0">
              {isFilterActive && (
                <button
                  type="button"
                  onClick={clearFilters}
                  className="px-3 py-2 text-xs font-semibold text-[#1657D9] hover:bg-blue-50 rounded-xl transition-all border border-blue-200 cursor-pointer flex items-center space-x-1"
                >
                  <Icon name="x-mark" className="h-3.5 w-3.5" />
                  <span>Clear Filters</span>
                </button>
              )}

              <button
                type="button"
                onClick={loadData}
                disabled={isLoading}
                className="px-3 py-2 text-xs font-semibold text-slate-600 hover:text-slate-900 hover:bg-slate-100 rounded-xl transition-all border border-slate-200 cursor-pointer flex items-center space-x-1"
                title="Refresh records from database"
              >
                <Icon name="arrow-path" className={`h-3.5 w-3.5 ${isLoading ? "animate-spin text-[#1657D9]" : ""}`} />
                <span>Refresh Live Records</span>
              </button>
            </div>
          </div>

          {/* Filter Dropdowns Grid */}
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-2.5 text-xs">
            <div>
              <label className="text-[10px] font-bold uppercase tracking-wider text-slate-400 block mb-1">
                Programme
              </label>
              <select
                value={selectedProgramme}
                onChange={(e) => setSelectedProgramme(e.target.value)}
                className="w-full px-2.5 py-1.5 rounded-lg bg-white border border-slate-200 text-slate-800 focus:outline-none focus:ring-1 focus:ring-[#1657D9] cursor-pointer"
              >
                <option value="all">All Programmes</option>
                {ACADEMIC_PROGRAMMES.map((prog) => (
                  <option key={prog.id} value={prog.id}>
                    {prog.code} ({prog.name.slice(0, 24)}…)
                  </option>
                ))}
              </select>
            </div>

            <div>
              <label className="text-[10px] font-bold uppercase tracking-wider text-slate-400 block mb-1">
                Semester
              </label>
              <select
                value={selectedSemester}
                onChange={(e) => setSelectedSemester(e.target.value)}
                className="w-full px-2.5 py-1.5 rounded-lg bg-white border border-slate-200 text-slate-800 focus:outline-none focus:ring-1 focus:ring-[#1657D9] cursor-pointer"
              >
                <option value="all">All Semesters</option>
                <option value="1">Semester 1 (FY)</option>
                <option value="2">Semester 2 (FY)</option>
                <option value="3">Semester 3 (SY)</option>
                <option value="4">Semester 4 (SY)</option>
                <option value="5">Semester 5 (TY)</option>
                <option value="6">Semester 6 (TY)</option>
              </select>
            </div>

            <div>
              <label className="text-[10px] font-bold uppercase tracking-wider text-slate-400 block mb-1">
                Enrolment Status
              </label>
              <select
                value={selectedStatus}
                onChange={(e) => setSelectedStatus(e.target.value)}
                className="w-full px-2.5 py-1.5 rounded-lg bg-white border border-slate-200 text-slate-800 focus:outline-none focus:ring-1 focus:ring-[#1657D9] cursor-pointer"
              >
                <option value="all">All Statuses</option>
                <option value="Active">Active</option>
                <option value="On Leave">On Leave</option>
                <option value="Pending Verification">Pending Verification</option>
                <option value="Graduated">Graduated</option>
              </select>
            </div>

            <div>
              <label className="text-[10px] font-bold uppercase tracking-wider text-slate-400 block mb-1">
                Fee Ledger
              </label>
              <select
                value={selectedFee}
                onChange={(e) => setSelectedFee(e.target.value)}
                className="w-full px-2.5 py-1.5 rounded-lg bg-white border border-slate-200 text-slate-800 focus:outline-none focus:ring-1 focus:ring-[#1657D9] cursor-pointer"
              >
                <option value="all">All Fee Statuses</option>
                <option value="Paid">Paid Full</option>
                <option value="Partial">Partial</option>
                <option value="Pending">Pending</option>
              </select>
            </div>
          </div>
        </div>

        {/* Results Counter Strip */}
        <div className="px-5 py-2.5 bg-slate-50/80 border-b border-slate-100 flex items-center justify-between text-xs text-slate-500">
          <div>
            Showing <strong className="text-slate-800">{filteredStudents.length}</strong> of{" "}
            <strong className="text-slate-800">{students.length}</strong> students in register
          </div>
          <div className="text-[11px] text-slate-400">
            Fictional Demonstration Records • Prototype Console
          </div>
        </div>

        {/* Desktop Table View (Hidden on mobile) */}
        <div className="hidden md:block overflow-x-auto">
          <table className="w-full text-left text-xs">
            <thead className="bg-slate-50/90 text-slate-500 font-semibold uppercase tracking-wider text-[10px] border-b border-slate-200">
              <tr>
                <th className="py-3 px-4">PRN / Roll No</th>
                <th className="py-3 px-4">Student Dossier</th>
                <th className="py-3 px-4">Programme & Cohort</th>
                <th className="py-3 px-4">Attendance</th>
                <th className="py-3 px-4">Fee Ledger</th>
                <th className="py-3 px-4">Status</th>
                <th className="py-3 px-4 text-right">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100 text-slate-700">
              {filteredStudents.map((std) => (
                <tr key={std.id} className="hover:bg-slate-50/80 transition-colors group">
                  <td className="py-3.5 px-4 font-mono font-bold text-xs text-[#1657D9]">
                    {std.prn}
                  </td>
                  <td className="py-3.5 px-4">
                    <div className="flex items-center space-x-3">
                      <div className="w-8 h-8 rounded-full bg-blue-50 text-[#1657D9] font-bold text-xs flex items-center justify-center border border-blue-100">
                        {std.fullName
                          .split(" ")
                          .map((n) => n[0])
                          .slice(0, 2)
                          .join("")}
                      </div>
                      <div>
                        <div className="font-bold text-slate-900 group-hover:text-[#1657D9] transition-colors">
                          {std.fullName}
                        </div>
                        <div className="text-[11px] text-slate-400">{std.email}</div>
                      </div>
                    </div>
                  </td>
                  <td className="py-3.5 px-4">
                    <div className="font-medium text-slate-800">{std.programmeName}</div>
                    <div className="text-[11px] text-slate-400">
                      Semester {std.semester} • {std.yearGroup} ({std.division})
                    </div>
                  </td>
                  <td className="py-3.5 px-4">
                    <div className="flex items-center space-x-2">
                      <span
                        className={`font-semibold ${
                          std.attendanceRate >= 85
                            ? "text-emerald-700"
                            : std.attendanceRate >= 75
                            ? "text-amber-700"
                            : "text-[#D92534]"
                        }`}
                      >
                        {std.attendanceRate}%
                      </span>
                      <div className="w-16 h-1.5 rounded-full bg-slate-100 overflow-hidden">
                        <div
                          className={`h-full rounded-full ${
                            std.attendanceRate >= 85
                              ? "bg-emerald-500"
                              : std.attendanceRate >= 75
                              ? "bg-amber-500"
                              : "bg-[#D92534]"
                          }`}
                          style={{ width: `${std.attendanceRate}%` }}
                        ></div>
                      </div>
                    </div>
                  </td>
                  <td className="py-3.5 px-4">
                    <span
                      className={`text-[10px] font-bold px-2 py-0.5 rounded-full border ${getFeeBadge(
                        std.feeStatus
                      )}`}
                    >
                      {std.feeStatus}
                    </span>
                  </td>
                  <td className="py-3.5 px-4">
                    <span
                      className={`text-[10px] font-bold px-2 py-0.5 rounded-full border ${getStatusBadge(
                        std.enrollmentStatus
                      )}`}
                    >
                      {std.enrollmentStatus}
                    </span>
                  </td>
                  <td className="py-3.5 px-4 text-right">
                    <div className="flex items-center justify-end space-x-1.5">
                      <button
                        type="button"
                        onClick={() => setDetailStudent(std)}
                        className="p-1.5 rounded-lg text-[#1657D9] hover:bg-blue-50 transition-colors cursor-pointer"
                        title="View Full Dossier"
                      >
                        <Icon name="eye" className="h-4 w-4" />
                      </button>
                      <button
                        type="button"
                        onClick={() => {
                          setFormMode("edit");
                          setFormStudent(std);
                          setFormModalOpen(true);
                        }}
                        className="p-1.5 rounded-lg text-slate-500 hover:text-slate-800 hover:bg-slate-100 transition-colors cursor-pointer"
                        title="Edit Record"
                      >
                        <Icon name="pencil" className="h-4 w-4" />
                      </button>
                      <button
                        type="button"
                        onClick={() => setDeleteStudent(std)}
                        className="p-1.5 rounded-lg text-slate-400 hover:text-[#D92534] hover:bg-red-50 transition-colors cursor-pointer"
                        title="Delete Record"
                      >
                        <Icon name="trash" className="h-4 w-4" />
                      </button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>

        {/* Mobile Responsive Cards Register (Shown on mobile/small screens) */}
        <div className="md:hidden divide-y divide-slate-100">
          {filteredStudents.map((std) => (
            <div key={std.id} className="p-4 space-y-3">
              <div className="flex items-start justify-between">
                <div>
                  <span className="font-mono text-xs font-bold text-[#1657D9] bg-blue-50 px-2 py-0.5 rounded border border-blue-100">
                    {std.prn}
                  </span>
                  <h3 className="text-sm font-bold text-slate-900 mt-1">{std.fullName}</h3>
                  <p className="text-[11px] text-slate-500">{std.programmeName}</p>
                </div>
                <div className="flex items-center space-x-1">
                  <span
                    className={`text-[10px] font-bold px-2 py-0.5 rounded-full border ${getStatusBadge(
                      std.enrollmentStatus
                    )}`}
                  >
                    {std.enrollmentStatus}
                  </span>
                </div>
              </div>

              <div className="grid grid-cols-2 gap-2 text-xs bg-slate-50 p-2.5 rounded-xl border border-slate-100">
                <div>
                  <span className="text-[10px] text-slate-400 block">Semester & Div</span>
                  <span className="font-medium text-slate-800">
                    Sem {std.semester} • {std.yearGroup} ({std.division})
                  </span>
                </div>
                <div>
                  <span className="text-[10px] text-slate-400 block">Attendance</span>
                  <span
                    className={`font-semibold ${
                      std.attendanceRate >= 85
                        ? "text-emerald-700"
                        : std.attendanceRate >= 75
                        ? "text-amber-700"
                        : "text-[#D92534]"
                    }`}
                  >
                    {std.attendanceRate}%
                  </span>
                </div>
              </div>

              <div className="flex items-center justify-between pt-1">
                <span
                  className={`text-[10px] font-bold px-2 py-0.5 rounded-full border ${getFeeBadge(
                    std.feeStatus
                  )}`}
                >
                  Fee: {std.feeStatus}
                </span>

                <div className="flex items-center space-x-1.5">
                  <button
                    type="button"
                    onClick={() => setDetailStudent(std)}
                    className="px-2.5 py-1.5 rounded-lg bg-blue-50 text-[#1657D9] text-xs font-semibold cursor-pointer border border-blue-200"
                  >
                    View
                  </button>
                  <button
                    type="button"
                    onClick={() => {
                      setFormMode("edit");
                      setFormStudent(std);
                      setFormModalOpen(true);
                    }}
                    className="px-2.5 py-1.5 rounded-lg bg-slate-100 text-slate-700 text-xs font-semibold cursor-pointer border border-slate-200"
                  >
                    Edit
                  </button>
                  <button
                    type="button"
                    onClick={() => setDeleteStudent(std)}
                    className="p-1.5 rounded-lg text-slate-400 hover:text-[#D92534] cursor-pointer"
                  >
                    <Icon name="trash" className="h-4 w-4" />
                  </button>
                </div>
              </div>
            </div>
          ))}
        </div>

        {/* Empty / No Results States */}
        {filteredStudents.length === 0 && (
          <div className="p-12 text-center space-y-3">
            <div className="w-12 h-12 rounded-2xl bg-blue-50 text-[#1657D9] flex items-center justify-center mx-auto border border-blue-100">
              <Icon name="search" className="h-6 w-6" />
            </div>
            <h3 className="text-sm font-bold text-slate-800">No Student Records Found</h3>
            <p className="text-xs text-slate-500 max-w-sm mx-auto leading-relaxed">
              {students.length === 0
                ? "The student register is currently empty. You can restore the sample demonstration records or enroll a new student."
                : `No student records match the active search query "${searchQuery}" and applied filters.`}
            </p>
            <div className="flex items-center justify-center space-x-2 pt-2">
              {isFilterActive && (
                <button
                  type="button"
                  onClick={clearFilters}
                  className="px-4 py-2 text-xs font-semibold text-[#1657D9] bg-blue-50 hover:bg-blue-100 rounded-xl transition-all border border-blue-200 cursor-pointer"
                >
                  Clear All Filters
                </button>
              )}
              {students.length === 0 && (
                <button
                  type="button"
                  onClick={loadData}
                  className="px-4 py-2 text-xs font-semibold text-white bg-[#1657D9] hover:bg-[#1248B8] rounded-xl transition-all cursor-pointer shadow-xs"
                >
                  Reload Database Records
                </button>
              )}
            </div>
          </div>
        )}
      </div>

      {/* Modals */}
      <StudentDetailModal
        student={detailStudent}
        isOpen={!!detailStudent}
        onClose={() => setDetailStudent(null)}
        onEdit={(std) => {
          setFormMode("edit");
          setFormStudent(std);
          setFormModalOpen(true);
        }}
      />

      <StudentFormModal
        key={formStudent?.id || (formModalOpen ? "add" : "none")}
        isOpen={formModalOpen}
        mode={formMode}
        initialData={formStudent}
        programmes={programmes}
        onClose={() => {
          setFormModalOpen(false);
          setFormStudent(null);
        }}
        onSave={(record) => {
          if (formMode === "add") {
            handleAddStudent(record);
          } else {
            handleEditStudent(record);
          }
        }}
      />

      <DeleteConfirmModal
        student={deleteStudent}
        isOpen={!!deleteStudent}
        onClose={() => setDeleteStudent(null)}
        onConfirm={handleDeleteStudent}
      />

      {/* Prototype Data Reconciliation Modal */}
      <PrototypeReconciliationModal
        isOpen={reconcileModalOpen}
        entityName="Student"
        storageKey={STORAGE_KEY}
        items={reconciliationItems}
        onClose={() => setReconcileModalOpen(false)}
        onImport={handleReconcileImport}
      />
    </div>
  );
};
