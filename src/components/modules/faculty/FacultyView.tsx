"use client";

import React, { useState, useMemo, useEffect, useCallback } from "react";
import { getStaffAction, createStaffAction, updateStaffAction, deleteStaffAction } from "@/lib/actions/faculty";
import { getDepartmentsAction } from "@/lib/actions/academics";
import { DepartmentWithCounts } from "@/lib/dal/academicRepository";
import { mapStaffDbToRecord } from "@/lib/utils/facultyMapper";
import { PrototypeReconciliationModal, PrototypeComparisonItem } from "@/components/common/PrototypeReconciliationModal";
import Link from "next/link";
import { Icon } from "@/components/common/Icon";
import { AnimatedReveal } from "@/components/common/AnimatedReveal";
import { FacultyRecord, StaffStatus } from "@/types/faculty";
import { FacultyDetailModal } from "./FacultyDetailModal";
import { FacultyFormModal } from "./FacultyFormModal";
import { DeleteFacultyModal } from "./DeleteFacultyModal";

const STORAGE_KEY = "rpihm_faculty_records_v1";

export const FacultyView: React.FC = () => {
  const [facultyList, setFacultyList] = useState<FacultyRecord[]>([]);
  const [departments, setDepartments] = useState<DepartmentWithCounts[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [serverError, setServerError] = useState<string | null>(null);

  const [searchQuery, setSearchQuery] = useState("");
  const [selectedDepartment, setSelectedDepartment] = useState("all");
  const [selectedCategory, setSelectedCategory] = useState("all");
  const [selectedStatus, setSelectedStatus] = useState("all");
  const [selectedEmployment, setSelectedEmployment] = useState("all");

  // Prototype Data Inspection & Reconciliation State
  const [prototypeRecords, setPrototypeRecords] = useState<FacultyRecord[]>([]);
  const [showReconcileBanner, setShowReconcileBanner] = useState(true);
  const [reconcileModalOpen, setReconcileModalOpen] = useState(false);

  // Modals state
  const [detailFaculty, setDetailFaculty] = useState<FacultyRecord | null>(null);
  const [formModalOpen, setFormModalOpen] = useState(false);
  const [formMode, setFormMode] = useState<"add" | "edit">("add");
  const [formFaculty, setFormFaculty] = useState<FacultyRecord | null>(null);
  const [deleteFaculty, setDeleteFaculty] = useState<FacultyRecord | null>(null);
  const [toastMessage, setToastMessage] = useState<string | null>(null);

  const loadData = useCallback(async () => {
    setIsLoading(true);
    setServerError(null);
    try {
      const res = await getStaffAction({ pageSize: 100 });
      if (!res.success || !res.data) {
        setServerError(res.error || "Failed to load faculty from database.");
      } else {
        const mapped = res.data.items.map(mapStaffDbToRecord);
        setFacultyList(mapped);
      }

      const deptRes = await getDepartmentsAction();
      if (deptRes.success && deptRes.data) {
        setDepartments(deptRes.data);
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
        const res = await getStaffAction({ pageSize: 100 });
        if (!active) return;
        if (!res.success || !res.data) {
          setServerError(res.error || "Failed to load faculty from database.");
        } else {
          setFacultyList(res.data.items.map(mapStaffDbToRecord));
        }

        const deptRes = await getDepartmentsAction();
        if (!active) return;
        if (deptRes.success && deptRes.data) {
          setDepartments(deptRes.data);
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

  // Reconciliation Comparison Items
  const reconciliationItems: PrototypeComparisonItem[] = useMemo(() => {
    return prototypeRecords.map((proto) => {
      const dbMatch = facultyList.find(
        (f) =>
          f.staffId.trim().toLowerCase() === proto.staffId.trim().toLowerCase() ||
          f.email.trim().toLowerCase() === proto.email.trim().toLowerCase()
      );

      if (dbMatch) {
        const isConflict =
          dbMatch.fullName.trim().toLowerCase() !== proto.fullName.trim().toLowerCase();
        if (isConflict) {
          return {
            id: proto.id,
            primaryKey: proto.staffId,
            name: proto.fullName,
            email: proto.email,
            secondaryInfo: proto.department,
            status: "conflict",
            statusReason: `Conflict: Staff ID matches database record for "${dbMatch.fullName}"`,
            rawRecord: proto,
          };
        }
        return {
          id: proto.id,
          primaryKey: proto.staffId,
          name: proto.fullName,
          email: proto.email,
          secondaryInfo: proto.department,
          status: "duplicate",
          statusReason: "Already present in SQLite database",
          rawRecord: proto,
        };
      }

      return {
        id: proto.id,
        primaryKey: proto.staffId,
        name: proto.fullName,
        email: proto.email,
        secondaryInfo: proto.department,
        status: "importable",
        statusReason: "New prototype staff record ready to import into database",
        rawRecord: proto,
      };
    });
  }, [prototypeRecords, facultyList]);

  // Safe Prototype Reconciliation Import Handler
  const handleReconcileImport = async (importableItems: PrototypeComparisonItem[]) => {
    let imported = 0;
    let failed = 0;

    for (const item of importableItems) {
      const fac = item.rawRecord as FacultyRecord;
      try {
        let departmentId = departments.length > 0 ? departments[0].id : "";
        const matchedDept = departments.find(
          (d) =>
            d.name.toLowerCase() === fac.department.toLowerCase() ||
            d.code.toLowerCase() === fac.department.toLowerCase()
        );
        if (matchedDept) departmentId = matchedDept.id;

        let category = "TEACHING";
        if (fac.category === "Technical Lab Staff") category = "TECHNICAL";
        else if (fac.category === "Administrative Staff") category = "ADMINISTRATIVE";

        const res = await createStaffAction({
          employeeId: fac.staffId.trim().toUpperCase(),
          fullName: fac.fullName.trim(),
          email: fac.email.trim().toLowerCase(),
          phone: fac.phone.trim(),
          designation: fac.designation.trim(),
          category,
          departmentId,
          dateOfJoining: fac.joinedDate ? new Date(fac.joinedDate) : new Date("2020-01-01"),
          status: "ACTIVE",
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
      try {
        const remaining = prototypeRecords.filter((p) => !importableItems.some((i) => i.id === p.id));
        localStorage.setItem(STORAGE_KEY, JSON.stringify(remaining));
        setPrototypeRecords(remaining);
      } catch {
        // LocalStorage fallback
      }
      await loadData();
    }
    return { imported, failed };
  };

  const showToast = (msg: string) => {
    setToastMessage(msg);
    setTimeout(() => setToastMessage(null), 3500);
  };

  // Filter logic
  const filteredFaculty = useMemo(() => {
    return facultyList.filter((f) => {
      const matchesSearch =
        searchQuery.trim() === "" ||
        f.fullName.toLowerCase().includes(searchQuery.toLowerCase()) ||
        f.staffId.toLowerCase().includes(searchQuery.toLowerCase()) ||
        f.designation.toLowerCase().includes(searchQuery.toLowerCase()) ||
        f.department.toLowerCase().includes(searchQuery.toLowerCase()) ||
        f.qualification.toLowerCase().includes(searchQuery.toLowerCase()) ||
        f.teachingSubjects.some((s) => s.toLowerCase().includes(searchQuery.toLowerCase()));

      const matchesDepartment = selectedDepartment === "all" || f.department === selectedDepartment;
      const matchesCategory = selectedCategory === "all" || f.category === selectedCategory;
      const matchesStatus = selectedStatus === "all" || f.status === selectedStatus;
      const matchesEmployment = selectedEmployment === "all" || f.employmentType === selectedEmployment;

      return matchesSearch && matchesDepartment && matchesCategory && matchesStatus && matchesEmployment;
    });
  }, [facultyList, searchQuery, selectedDepartment, selectedCategory, selectedStatus, selectedEmployment]);

  // Aggregate Metrics
  const metrics = useMemo(() => {
    const total = facultyList.length;
    const teachingCount = facultyList.filter(
      (f) => f.category === "Teaching Faculty" || f.category === "Culinary Instructor"
    ).length;
    const activeCount = facultyList.filter(
      (f) => f.status === "Active" || f.status === "In Lab / Kitchen"
    ).length;
    const avgWorkload = total > 0
      ? Math.round(facultyList.reduce((acc, f) => acc + f.workloadHours, 0) / total)
      : 0;

    return { total, teachingCount, activeCount, avgWorkload };
  }, [facultyList]);

  // Handlers for Database Mutations
  const handleAddFaculty = async (record: FacultyRecord) => {
    try {
      let departmentId = departments.length > 0 ? departments[0].id : "";
      const matchedDept = departments.find(
        (d) =>
          d.name.toLowerCase() === record.department.toLowerCase() ||
          d.code.toLowerCase() === record.department.toLowerCase()
      );
      if (matchedDept) departmentId = matchedDept.id;

      let category = "TEACHING";
      if (record.category === "Technical Lab Staff") category = "TECHNICAL";
      else if (record.category === "Administrative Staff") category = "ADMINISTRATIVE";

      const res = await createStaffAction({
        employeeId: record.staffId.trim().toUpperCase(),
        fullName: record.fullName.trim(),
        email: record.email.trim().toLowerCase(),
        phone: record.phone.trim(),
        designation: record.designation.trim(),
        category,
        departmentId,
        dateOfJoining: record.joinedDate ? new Date(record.joinedDate) : new Date("2020-01-01"),
        status: "ACTIVE",
      });

      if (!res.success) {
        return { success: false, error: res.error || "Permission denied or invalid staff data." };
      }

      showToast(`Staff member "${record.fullName}" registered in database.`);
      setFormModalOpen(false);
      await loadData();
      return { success: true };
    } catch (err) {
      const msg = err instanceof Error ? err.message : "Failed to create staff record";
      return { success: false, error: msg };
    }
  };

  const handleEditFaculty = async (record: FacultyRecord) => {
    try {
      let departmentId = departments.length > 0 ? departments[0].id : "";
      const matchedDept = departments.find(
        (d) =>
          d.name.toLowerCase() === record.department.toLowerCase() ||
          d.code.toLowerCase() === record.department.toLowerCase()
      );
      if (matchedDept) departmentId = matchedDept.id;

      let category = "TEACHING";
      if (record.category === "Technical Lab Staff") category = "TECHNICAL";
      else if (record.category === "Administrative Staff") category = "ADMINISTRATIVE";

      const res = await updateStaffAction(record.id, {
        fullName: record.fullName.trim(),
        employeeId: record.staffId.trim().toUpperCase(),
        phone: record.phone.trim(),
        email: record.email.trim().toLowerCase(),
        designation: record.designation.trim(),
        category,
        departmentId,
        status: record.status.toUpperCase() === "ON LEAVE" ? "ON_LEAVE" : "ACTIVE",
      });

      if (!res.success || !res.data) {
        return { success: false, error: res.error || "Permission denied or staff update failed." };
      }

      const updatedRecord = mapStaffDbToRecord(res.data);

      // Immediate state update
      setFacultyList((prev: FacultyRecord[]) =>
        prev.map((s) => (s.id === updatedRecord.id || s.staffId === updatedRecord.staffId ? updatedRecord : s))
      );

      // Immediate dossier update if currently viewed
      setDetailFaculty((curr) =>
        curr && (curr.id === updatedRecord.id || curr.staffId === updatedRecord.staffId) ? updatedRecord : curr
      );

      // Filter check
      const matchesSearch =
        searchQuery.trim() === "" ||
        updatedRecord.fullName.toLowerCase().includes(searchQuery.toLowerCase()) ||
        updatedRecord.staffId.toLowerCase().includes(searchQuery.toLowerCase()) ||
        updatedRecord.designation.toLowerCase().includes(searchQuery.toLowerCase()) ||
        updatedRecord.email.toLowerCase().includes(searchQuery.toLowerCase());
      const matchesDept = selectedDepartment === "all" || updatedRecord.department === selectedDepartment;
      const matchesCat = selectedCategory === "all" || updatedRecord.category === selectedCategory;

      if (!matchesSearch || !matchesDept || !matchesCat) {
        showToast(`Staff record for "${record.fullName}" updated in database. (Note: Record hidden by active filters).`);
      } else {
        showToast(`Staff record for "${record.fullName}" updated successfully in database.`);
      }

      setFormModalOpen(false);
      setFormFaculty(null);
      loadData(); // Background sync
      return { success: true };
    } catch (err) {
      const msg = err instanceof Error ? err.message : "Failed to update staff record";
      return { success: false, error: msg };
    }
  };

  const handleDeleteFaculty = async (id: string) => {
    
    try {
      const target = facultyList.find((f) => f.id === id);
      const res = await deleteStaffAction(id);
      if (!res.success) {
        showToast("Error deleting staff: " + (res.error || "Permission denied"));
        return;
      }

      showToast(`Record for "${target?.fullName || id}" removed from database.`);
      setDeleteFaculty(null);
      await loadData();
    } catch (err) {
      const msg = err instanceof Error ? err.message : "Failed to delete staff record";
      showToast("Error: " + msg);
    } finally {
      
    }
  };

  const clearAllFilters = () => {
    setSearchQuery("");
    setSelectedDepartment("all");
    setSelectedCategory("all");
    setSelectedStatus("all");
    setSelectedEmployment("all");
  };

  const exportCSV = () => {
    const headers = ["Staff ID", "Full Name", "Designation", "Department", "Category", "Workload (Hrs)", "Status", "Email", "Phone", "Cabin"];
    const rows = filteredFaculty.map((f) => [
      `"${f.staffId}"`,
      `"${f.fullName}"`,
      `"${f.designation}"`,
      `"${f.department}"`,
      `"${f.category}"`,
      `"${f.workloadHours}"`,
      `"${f.status}"`,
      `"${f.email}"`,
      `"${f.phone}"`,
      `"${f.officeLocation}"`,
    ]);

    const csvContent = "data:text/csv;charset=utf-8," + [headers.join(","), ...rows.map((e) => e.join(","))].join("\n");
    const encodedUri = encodeURI(csvContent);
    const link = document.createElement("a");
    link.setAttribute("href", encodedUri);
    link.setAttribute("download", `RPIHM_Faculty_Roster_${new Date().toISOString().split("T")[0]}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    showToast("Faculty roster exported to CSV.");
  };

  const getStatusBadge = (status: StaffStatus) => {
    switch (status) {
      case "Active":
        return "bg-emerald-50 text-emerald-700 border-emerald-200";
      case "In Lab / Kitchen":
        return "bg-blue-50 text-blue-700 border-blue-200";
      case "On Leave":
        return "bg-amber-50 text-amber-700 border-amber-200";
      case "Sabbatical":
        return "bg-purple-50 text-purple-700 border-purple-200";
      default:
        return "bg-slate-50 text-slate-700 border-slate-200";
    }
  };

  const getDepartmentPill = (dept: string) => {
    if (dept.includes("Culinary") || dept.includes("Hospitality")) {
      return "bg-amber-50 text-amber-800 border-amber-200";
    }
    if (dept.includes("Computing") || dept.includes("Data")) {
      return "bg-blue-50 text-blue-800 border-blue-200";
    }
    if (dept.includes("F&B")) {
      return "bg-emerald-50 text-emerald-800 border-emerald-200";
    }
    if (dept.includes("Bakery")) {
      return "bg-rose-50 text-rose-800 border-rose-200";
    }
    return "bg-slate-50 text-slate-800 border-slate-200";
  };

  return (
    <div className="space-y-6">
      {/* Toast Notification */}
      {toastMessage && (
        <div className="fixed bottom-6 right-6 z-50 flex items-center space-x-2 bg-slate-900 text-white px-4 py-3 rounded-xl shadow-2xl border border-slate-700 text-xs animate-in slide-in-from-bottom duration-200">
          <Icon name="check" className="w-4 h-4 text-emerald-400 shrink-0" />
          <span>{toastMessage}</span>
        </div>
      )}

      {/* Breadcrumb Navigation */}
      <nav aria-label="Breadcrumb" className="flex items-center space-x-2 text-xs text-slate-500">
        <Link href="/" className="hover:text-[#1657D9] flex items-center space-x-1 font-medium transition-colors">
          <Icon name="arrow-left" className="h-3.5 w-3.5" />
          <span>Dashboard</span>
        </Link>
        <span>/</span>
        <span className="text-slate-400">Modules</span>
        <span>/</span>
        <span className="text-slate-900 font-semibold">Faculty & Staff Leadership</span>
      </nav>

      {/* Module Header */}
      <AnimatedReveal>
        <div className="bg-white rounded-2xl border border-slate-200/80 p-5 sm:p-6 shadow-2xs relative overflow-hidden">
          <div className="absolute top-0 right-0 w-96 h-96 bg-gradient-to-bl from-blue-50/50 via-slate-50/20 to-transparent pointer-events-none rounded-full blur-3xl -mr-20 -mt-20" />

          <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4 relative z-10">
            <div>
              <div className="flex items-center space-x-2.5 mb-1.5">
                <div className="w-8 h-8 rounded-lg bg-blue-50 text-[#1657D9] border border-blue-200/60 flex items-center justify-center">
                  <Icon name="briefcase" className="w-4 h-4" />
                </div>
                <h1 className="text-xl sm:text-2xl font-bold text-slate-900 tracking-tight">
                  Faculty & Staff Management
                </h1>
                <span className="hidden sm:inline-flex px-2.5 py-0.5 rounded-full text-[11px] font-semibold bg-emerald-50 text-emerald-700 border border-emerald-200">
                  Live SQLite Database • AY 2026 – 27
                </span>
              </div>
              <p className="text-xs sm:text-sm text-slate-600 max-w-2xl leading-relaxed">
                Centralized academic roster for culinary master chefs, computing professorship, visiting lecturers, and technical laboratory personnel.
              </p>
            </div>

            <div className="flex flex-wrap items-center gap-2">
              <button
                type="button"
                onClick={loadData}
                disabled={isLoading}
                className="inline-flex items-center space-x-1.5 px-3 py-2 text-xs font-semibold text-slate-600 hover:text-slate-900 bg-slate-100 hover:bg-slate-200 rounded-xl transition-colors cursor-pointer"
                title="Refresh records from SQLite database"
              >
                <Icon name="arrow-path" className={`w-3.5 h-3.5 ${isLoading ? "animate-spin text-[#1657D9]" : ""}`} />
                <span className="hidden sm:inline">Refresh Live Records</span>
              </button>

              <button
                type="button"
                onClick={exportCSV}
                className="inline-flex items-center space-x-1.5 px-3 py-2 text-xs font-semibold text-slate-700 hover:text-slate-900 bg-white hover:bg-slate-50 border border-slate-200 rounded-xl transition-colors shadow-2xs"
              >
                <Icon name="arrow-down-tray" className="w-3.5 h-3.5" />
                <span>Export CSV</span>
              </button>

              <button
                type="button"
                onClick={() => {
                  setFormMode("add");
                  setFormFaculty(null);
                  setFormModalOpen(true);
                }}
                className="inline-flex items-center space-x-1.5 px-4 py-2 text-xs font-semibold text-white bg-[#1657D9] hover:bg-blue-700 rounded-xl transition-colors shadow-sm"
              >
                <Icon name="plus" className="w-3.5 h-3.5" />
                <span>Add Staff Member</span>
              </button>
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
                The SQLite database is now active as the authoritative system of record. You can safely inspect and reconcile legacy prototype faculty records. Browser storage will not be altered.
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

      {/* Metric Overview Cards */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        <div className="bg-white rounded-xl border border-slate-200/80 p-4 shadow-2xs">
          <div className="flex items-center justify-between">
            <span className="text-xs font-medium text-slate-500">Total Staff Roster</span>
            <div className="w-7 h-7 rounded-lg bg-blue-50 text-[#1657D9] flex items-center justify-center">
              <Icon name="users" className="w-3.5 h-3.5" />
            </div>
          </div>
          <div className="mt-2 flex items-baseline space-x-2">
            <span className="text-2xl font-bold text-slate-900">{metrics.total}</span>
            <span className="text-[11px] text-slate-400">Personnel</span>
          </div>
        </div>

        <div className="bg-white rounded-xl border border-slate-200/80 p-4 shadow-2xs">
          <div className="flex items-center justify-between">
            <span className="text-xs font-medium text-slate-500">Teaching & Chefs</span>
            <div className="w-7 h-7 rounded-lg bg-amber-50 text-amber-700 flex items-center justify-center">
              <Icon name="academic-cap" className="w-3.5 h-3.5" />
            </div>
          </div>
          <div className="mt-2 flex items-baseline space-x-2">
            <span className="text-2xl font-bold text-slate-900">{metrics.teachingCount}</span>
            <span className="text-[11px] text-amber-600 font-medium">Instructors</span>
          </div>
        </div>

        <div className="bg-white rounded-xl border border-slate-200/80 p-4 shadow-2xs">
          <div className="flex items-center justify-between">
            <span className="text-xs font-medium text-slate-500">Active On-Duty</span>
            <div className="w-7 h-7 rounded-lg bg-emerald-50 text-emerald-700 flex items-center justify-center">
              <Icon name="check-circle" className="w-3.5 h-3.5" />
            </div>
          </div>
          <div className="mt-2 flex items-baseline space-x-2">
            <span className="text-2xl font-bold text-slate-900">{metrics.activeCount}</span>
            <span className="text-[11px] text-emerald-600 font-medium">In Labs & Desks</span>
          </div>
        </div>

        <div className="bg-white rounded-xl border border-slate-200/80 p-4 shadow-2xs">
          <div className="flex items-center justify-between">
            <span className="text-xs font-medium text-slate-500">Average Workload</span>
            <div className="w-7 h-7 rounded-lg bg-purple-50 text-purple-700 flex items-center justify-center">
              <Icon name="clock" className="w-3.5 h-3.5" />
            </div>
          </div>
          <div className="mt-2 flex items-baseline space-x-2">
            <span className="text-2xl font-bold text-slate-900">{metrics.avgWorkload}</span>
            <span className="text-[11px] text-purple-600 font-medium">hrs / week</span>
          </div>
        </div>
      </div>

      {/* Search & Multi-Axis Filter Bar */}
      <div className="bg-white rounded-xl border border-slate-200/80 p-4 shadow-2xs space-y-3">
        <div className="grid grid-cols-1 md:grid-cols-12 gap-3">
          {/* Search Input */}
          <div className="md:col-span-4 relative">
            <Icon
              name="magnifying-glass"
              className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2"
            />
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="Search by name, staff ID, subject, cabin..."
              className="w-full pl-9 pr-8 py-2 text-xs rounded-xl border border-slate-200 focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-[#1657D9]"
            />
            {searchQuery && (
              <button
                type="button"
                onClick={() => setSearchQuery("")}
                className="absolute right-2.5 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600"
              >
                <Icon name="x-mark" className="w-3.5 h-3.5" />
              </button>
            )}
          </div>

          {/* Department Filter */}
          <div className="md:col-span-3">
            <select
              value={selectedDepartment}
              onChange={(e) => setSelectedDepartment(e.target.value)}
              className="w-full px-3 py-2 text-xs rounded-xl border border-slate-200 bg-white focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-[#1657D9]"
            >
              <option value="all">All Departments</option>
              {departments && departments.length > 0 ? (
                departments.map((d) => (
                  <option key={d.id} value={d.name}>
                    {d.name} ({d.code})
                  </option>
                ))
              ) : (
                <>
                  <option value="Hospitality & Culinary Arts">Hospitality & Culinary Arts</option>
                  <option value="Technology & Computing">Technology & Computing</option>
                  <option value="Administrative & Student Affairs">Administrative & Student Affairs</option>
                </>
              )}
            </select>
          </div>

          {/* Category Filter */}
          <div className="md:col-span-2">
            <select
              value={selectedCategory}
              onChange={(e) => setSelectedCategory(e.target.value)}
              className="w-full px-3 py-2 text-xs rounded-xl border border-slate-200 bg-white focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-[#1657D9]"
            >
              <option value="all">All Categories</option>
              <option value="Teaching Faculty">Teaching Faculty</option>
              <option value="Culinary Instructor">Culinary Instructor</option>
              <option value="Technical Lab Staff">Technical Lab Staff</option>
              <option value="Administrative Staff">Administrative Staff</option>
            </select>
          </div>

          {/* Status Filter */}
          <div className="md:col-span-3 flex gap-2">
            <select
              value={selectedStatus}
              onChange={(e) => setSelectedStatus(e.target.value)}
              className="w-full px-3 py-2 text-xs rounded-xl border border-slate-200 bg-white focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-[#1657D9]"
            >
              <option value="all">All Statuses</option>
              <option value="Active">Active</option>
              <option value="In Lab / Kitchen">In Lab / Kitchen</option>
              <option value="On Leave">On Leave</option>
              <option value="Sabbatical">Sabbatical</option>
            </select>

            <select
              value={selectedEmployment}
              onChange={(e) => setSelectedEmployment(e.target.value)}
              className="w-full px-3 py-2 text-xs rounded-xl border border-slate-200 bg-white focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-[#1657D9]"
            >
              <option value="all">All Appointments</option>
              <option value="Full-Time Permanent">Permanent</option>
              <option value="Visiting / Adjunct">Visiting</option>
              <option value="Industry Expert">Industry Expert</option>
            </select>
          </div>
        </div>

        {/* Active Filter Indicators */}
        {(searchQuery || selectedDepartment !== "all" || selectedCategory !== "all" || selectedStatus !== "all" || selectedEmployment !== "all") && (
          <div className="flex items-center justify-between pt-2 border-t border-slate-100 text-xs text-slate-500">
            <div className="flex items-center space-x-2">
              <span>Showing <strong>{filteredFaculty.length}</strong> of {facultyList.length} staff records</span>
            </div>
            <button
              type="button"
              onClick={clearAllFilters}
              className="text-[#1657D9] hover:underline font-semibold text-xs flex items-center space-x-1"
            >
              <Icon name="arrow-path" className="w-3 h-3" />
              <span>Reset Filters</span>
            </button>
          </div>
        )}
      </div>

      {/* Staff Register: Desktop Table View */}
      <div className="hidden lg:block bg-white rounded-2xl border border-slate-200/80 shadow-2xs overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-left border-collapse">
            <thead>
              <tr className="bg-slate-50/80 border-b border-slate-200 text-[11px] font-bold uppercase tracking-wider text-slate-500">
                <th className="py-3.5 px-4">Faculty / Staff Member</th>
                <th className="py-3.5 px-4">Staff ID</th>
                <th className="py-3.5 px-4">Department & Category</th>
                <th className="py-3.5 px-4">Workload</th>
                <th className="py-3.5 px-4">Assigned Subjects</th>
                <th className="py-3.5 px-4">Status</th>
                <th className="py-3.5 px-4">Campus Location</th>
                <th className="py-3.5 px-4 text-right">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100 text-xs">
              {filteredFaculty.map((fac) => (
                <tr key={fac.id} className="hover:bg-slate-50/80 transition-colors group">
                  {/* Name and Designation */}
                  <td className="py-3.5 px-4">
                    <div className="flex items-center space-x-3">
                      <div className="w-8 h-8 rounded-full bg-[#0B1528] text-white flex items-center justify-center font-bold text-xs shrink-0 shadow-2xs">
                        {fac.avatarInitial || fac.fullName.charAt(0)}
                      </div>
                      <div>
                        <div className="font-semibold text-slate-900 group-hover:text-[#1657D9] transition-colors">
                          {fac.fullName}
                        </div>
                        <div className="text-[11px] text-slate-500">{fac.designation}</div>
                      </div>
                    </div>
                  </td>

                  {/* Staff ID */}
                  <td className="py-3.5 px-4 font-mono font-bold text-xs text-[#1657D9]">
                    {fac.staffId}
                  </td>

                  {/* Department & Category */}
                  <td className="py-3.5 px-4">
                    <span
                      className={`inline-block px-2 py-0.5 rounded-md text-[11px] font-semibold border ${getDepartmentPill(
                        fac.department
                      )}`}
                    >
                      {fac.department}
                    </span>
                    <div className="text-[11px] text-slate-400 mt-0.5">{fac.category}</div>
                  </td>

                  {/* Workload */}
                  <td className="py-3.5 px-4">
                    <div className="font-semibold text-slate-800">{fac.workloadHours} hrs/wk</div>
                    <div className="w-20 h-1.5 bg-slate-100 rounded-full mt-1 overflow-hidden">
                      <div
                        className="h-full bg-[#1657D9] rounded-full"
                        style={{ width: `${Math.min(100, (fac.workloadHours / 28) * 100)}%` }}
                      />
                    </div>
                  </td>

                  {/* Assigned Subjects */}
                  <td className="py-3.5 px-4 max-w-xs">
                    <div className="flex flex-wrap gap-1">
                      {fac.teachingSubjects.slice(0, 2).map((sub, i) => (
                        <span
                          key={i}
                          className="inline-block px-2 py-0.5 bg-slate-100 text-slate-700 rounded text-[10px] font-medium truncate max-w-[140px]"
                          title={sub}
                        >
                          {sub}
                        </span>
                      ))}
                      {fac.teachingSubjects.length > 2 && (
                        <span className="text-[10px] text-slate-400 font-semibold self-center">
                          +{fac.teachingSubjects.length - 2}
                        </span>
                      )}
                    </div>
                  </td>

                  {/* Status */}
                  <td className="py-3.5 px-4">
                    <span
                      className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-[11px] font-semibold border ${getStatusBadge(
                        fac.status
                      )}`}
                    >
                      <span className="w-1.5 h-1.5 rounded-full bg-current mr-1.5" />
                      {fac.status}
                    </span>
                  </td>

                  {/* Location */}
                  <td className="py-3.5 px-4 text-slate-600 max-w-[160px] truncate" title={fac.officeLocation}>
                    {fac.officeLocation}
                  </td>

                  {/* Actions */}
                  <td className="py-3.5 px-4 text-right">
                    <div className="flex items-center justify-end space-x-1.5">
                      <button
                        type="button"
                        onClick={() => setDetailFaculty(fac)}
                        className="w-7 h-7 rounded-lg flex items-center justify-center text-slate-500 hover:text-[#1657D9] hover:bg-blue-50 transition-colors"
                        title="View Academic Dossier"
                      >
                        <Icon name="eye" className="w-4 h-4" />
                      </button>
                      <button
                        type="button"
                        onClick={() => {
                          setFormMode("edit");
                          setFormFaculty(fac);
                          setFormModalOpen(true);
                        }}
                        className="w-7 h-7 rounded-lg flex items-center justify-center text-slate-500 hover:text-amber-600 hover:bg-amber-50 transition-colors"
                        title="Edit Record"
                      >
                        <Icon name="pencil" className="w-4 h-4" />
                      </button>
                      <button
                        type="button"
                        onClick={() => setDeleteFaculty(fac)}
                        className="w-7 h-7 rounded-lg flex items-center justify-center text-slate-500 hover:text-red-600 hover:bg-red-50 transition-colors"
                        title="Delete Record"
                      >
                        <Icon name="trash" className="w-4 h-4" />
                      </button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      {/* Staff Register: Mobile & Tablet Card View */}
      <div className="lg:hidden grid grid-cols-1 md:grid-cols-2 gap-4">
        {filteredFaculty.map((fac) => (
          <div
            key={fac.id}
            className="bg-white rounded-2xl border border-slate-200/80 p-4 shadow-2xs flex flex-col justify-between space-y-3"
          >
            <div className="flex items-start justify-between gap-2">
              <div className="flex items-center space-x-2.5">
                <div className="w-9 h-9 rounded-full bg-[#0B1528] text-white flex items-center justify-center font-bold text-xs shrink-0 shadow-2xs">
                  {fac.avatarInitial || fac.fullName.charAt(0)}
                </div>
                <div>
                  <h4 className="font-bold text-slate-900 text-sm leading-snug">{fac.fullName}</h4>
                  <p className="text-xs text-slate-500">{fac.designation}</p>
                </div>
              </div>
              <span
                className={`inline-flex items-center px-2 py-0.5 rounded-full text-[10px] font-semibold border ${getStatusBadge(
                  fac.status
                )}`}
              >
                {fac.status}
              </span>
            </div>

            <div className="space-y-1.5 text-xs">
              <div className="flex items-center justify-between text-slate-600">
                <span className="text-slate-400">Staff ID</span>
                <span className="font-mono font-bold text-[#1657D9]">{fac.staffId}</span>
              </div>
              <div className="flex items-center justify-between text-slate-600">
                <span className="text-slate-400">Department</span>
                <span className="font-medium text-slate-800 text-right">{fac.department}</span>
              </div>
              <div className="flex items-center justify-between text-slate-600">
                <span className="text-slate-400">Workload</span>
                <span className="font-semibold text-slate-800">{fac.workloadHours} hrs / week</span>
              </div>
              <div className="pt-1">
                <span className="text-slate-400 block mb-1">Subjects</span>
                <div className="flex flex-wrap gap-1">
                  {fac.teachingSubjects.map((sub, i) => (
                    <span key={i} className="px-1.5 py-0.5 bg-slate-100 text-slate-700 rounded text-[10px] font-medium">
                      {sub}
                    </span>
                  ))}
                </div>
              </div>
            </div>

            <div className="pt-2 border-t border-slate-100 flex items-center justify-between">
              <span className="text-[11px] text-slate-400 truncate max-w-[150px]">{fac.officeLocation}</span>
              <div className="flex items-center space-x-1">
                <button
                  type="button"
                  onClick={() => setDetailFaculty(fac)}
                  className="px-2.5 py-1 text-xs font-semibold text-[#1657D9] bg-blue-50 hover:bg-blue-100 rounded-lg transition-colors"
                >
                  Dossier
                </button>
                <button
                  type="button"
                  onClick={() => {
                    setFormMode("edit");
                    setFormFaculty(fac);
                    setFormModalOpen(true);
                  }}
                  className="p-1 text-slate-500 hover:text-amber-600"
                  title="Edit"
                >
                  <Icon name="pencil" className="w-4 h-4" />
                </button>
                <button
                  type="button"
                  onClick={() => setDeleteFaculty(fac)}
                  className="p-1 text-slate-500 hover:text-red-600"
                  title="Delete"
                >
                  <Icon name="trash" className="w-4 h-4" />
                </button>
              </div>
            </div>
          </div>
        ))}
      </div>

      {/* No Results State */}
      {filteredFaculty.length === 0 && (
        <div className="bg-white rounded-2xl border border-slate-200/80 p-12 text-center shadow-2xs">
          <div className="w-12 h-12 rounded-full bg-slate-100 text-slate-400 flex items-center justify-center mx-auto mb-3">
            <Icon name="magnifying-glass" className="w-6 h-6" />
          </div>
          <h3 className="text-base font-bold text-slate-900 mb-1">No faculty or staff records found</h3>
          <p className="text-xs text-slate-500 max-w-sm mx-auto mb-4">
            No active staff member matches your current search keywords and department filters.
          </p>
          <button
            type="button"
            onClick={clearAllFilters}
            className="px-4 py-2 text-xs font-semibold text-white bg-[#1657D9] hover:bg-blue-700 rounded-xl transition-colors shadow-sm"
          >
            Clear All Filters
          </button>
        </div>
      )}

      {/* Modals */}
      <FacultyDetailModal
        faculty={detailFaculty}
        isOpen={!!detailFaculty}
        onClose={() => setDetailFaculty(null)}
        onEdit={(fac) => {
          setDetailFaculty(null);
          setFormMode("edit");
          setFormFaculty(fac);
          setFormModalOpen(true);
        }}
      />

      <FacultyFormModal
        key={formFaculty?.id || (formModalOpen ? "add" : "none")}
        isOpen={formModalOpen}
        mode={formMode}
        initialData={formFaculty}
        departments={departments}
        onClose={() => {
          setFormModalOpen(false);
          setFormFaculty(null);
        }}
        onSave={async (record) => {
          if (formMode === "add") {
            return await handleAddFaculty(record);
          } else {
            return await handleEditFaculty(record);
          }
        }}
      />

      <DeleteFacultyModal
        faculty={deleteFaculty}
        isOpen={!!deleteFaculty}
        onClose={() => setDeleteFaculty(null)}
        onConfirm={handleDeleteFaculty}
      />

      {/* Prototype Data Reconciliation Modal */}
      <PrototypeReconciliationModal
        isOpen={reconcileModalOpen}
        entityName="Faculty"
        storageKey={STORAGE_KEY}
        items={reconciliationItems}
        onClose={() => setReconcileModalOpen(false)}
        onImport={handleReconcileImport}
      />
    </div>
  );
};
