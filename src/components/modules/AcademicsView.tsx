"use client";

import React, { useState, useEffect, useMemo, useCallback } from "react";
import Link from "next/link";
import Image from "next/image";
import { Icon } from "@/components/common/Icon";
import { AnimatedReveal } from "@/components/common/AnimatedReveal";
import { getCurrentUserAction } from "@/lib/actions/auth";
import { hasPermission } from "@/lib/auth/roles";
import {
  getProgrammesAction,
  getProgrammeDetailsAction,
  getDepartmentsAction,
  getCurrentAcademicYearAction,
  createDivisionAction,
  deleteDivisionAction,
} from "@/lib/actions/academics";
import {
  getStaffAction,
  assignTeachingSubjectAction,
  removeTeachingAssignmentAction,
} from "@/lib/actions/faculty";
import {
  AcademicProgrammeDTO,
  ProgrammeDetails,
  DepartmentWithCounts,
  AcademicYearWithTerms,
  ProgrammeSubjectWithRelations,
} from "@/lib/dal/academicRepository";

type DegreeFilter = "all" | "UNDERGRADUATE" | "DIPLOMA" | "CERTIFICATE";

export const AcademicsView: React.FC = () => {
  const [programmes, setProgrammes] = useState<AcademicProgrammeDTO[]>([]);
  const [departments, setDepartments] = useState<DepartmentWithCounts[]>([]);
  const [currentAcademicYear, setCurrentAcademicYear] = useState<AcademicYearWithTerms | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [serverError, setServerError] = useState<string | null>(null);

  const [degreeFilter, setDegreeFilter] = useState<DegreeFilter>("all");
  const [departmentFilter, setDepartmentFilter] = useState<string>("all");
  const [searchQuery, setSearchQuery] = useState("");

  // Detailed Programme Inspection State
  const [selectedProgrammeId, setSelectedProgrammeId] = useState<string | null>(null);
  const [programmeDetails, setProgrammeDetails] = useState<ProgrammeDetails | null>(null);
  const [isLoadingDetails, setIsLoadingDetails] = useState(false);
  const [selectedSemesterIndex, setSelectedSemesterIndex] = useState(0);
  // Milestone 1C: Subject Catalog Search, Filter & Provenance Inspector State
  const [subjectSearch, setSubjectSearch] = useState("");
  const [subjectVerticalFilter, setSubjectVerticalFilter] = useState<string>("all");
  const [subjectTypeFilter, setSubjectTypeFilter] = useState<string>("all");
  const [provenanceSubject, setProvenanceSubject] = useState<ProgrammeSubjectWithRelations | null>(null);

  // Milestone 1C.1: Keyboard accessibility for Provenance Inspector (ESC key handler)
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === "Escape") {
        setProvenanceSubject(null);
      }
    };
    if (provenanceSubject) {
      window.addEventListener("keydown", handleKeyDown);
      return () => window.removeEventListener("keydown", handleKeyDown);
    }
  }, [provenanceSubject]);

  // Administrative Faculty Teaching Assignment Workflow
  const [staffList, setStaffList] = useState<Array<{ id: string; fullName: string; designation: string; department?: { name: string } | null }>>([]);
  const [assignModalSubject, setAssignModalSubject] = useState<{ id: string; code: string; title: string; semesterId: string } | null>(null);
  const [assignModalSemesterNumber, setAssignModalSemesterNumber] = useState<number>(1);
  const [assignModalDivisions, setAssignModalDivisions] = useState<Array<{ id: string; name: string; maxCapacity: number }>>([]);
  const [selectedStaffId, setSelectedStaffId] = useState<string>("");
  const [selectedDivisionId, setSelectedDivisionId] = useState<string>("");
  const [weeklyHours, setWeeklyHours] = useState<number>(4);
  const [isAssigning, setIsAssigning] = useState(false);
  const [assignError, setAssignError] = useState<string | null>(null);
  const [actionSuccessToast, setActionSuccessToast] = useState<string | null>(null);

  // Administrative Division Creation Workflow
  const [createDivModalSemester, setCreateDivModalSemester] = useState<{ id: string; semesterNumber: number; divisions?: Array<{ name: string }> } | null>(null);
  const [newDivName, setNewDivName] = useState<string>("Div A");
  const [newDivCapacity, setNewDivCapacity] = useState<number>(60);
  const [isCreatingDiv, setIsCreatingDiv] = useState(false);
  const [createDivError, setCreateDivError] = useState<string | null>(null);

  // User Role & Administrative Permission State
  const [canManageAcademics, setCanManageAcademics] = useState<boolean>(false);

  // Load live programmes and departments from SQLite
  const loadData = useCallback(async () => {
    setIsLoading(true);
    setServerError(null);
    try {
      const [progRes, deptRes, ayRes, staffRes, userRes] = await Promise.all([
        getProgrammesAction(),
        getDepartmentsAction(),
        getCurrentAcademicYearAction(),
        getStaffAction(),
        getCurrentUserAction(),
      ]);

      if (userRes.success && userRes.data) {
        setCanManageAcademics(hasPermission(userRes.data.role, "MANAGE_ACADEMICS"));
      }

      if (staffRes.success && staffRes.data) {
        setStaffList(staffRes.data.items);
      }

      if (!progRes.success) {
        setServerError(progRes.error || "Failed to load academic programmes.");
      } else {
        setProgrammes(progRes.data || []);
      }

      if (deptRes.success && deptRes.data) {
        setDepartments(deptRes.data);
      }

      if (ayRes.success && ayRes.data) {
        setCurrentAcademicYear(ayRes.data);
      }
    } catch (err) {
      const msg = err instanceof Error ? err.message : "Database connection failure";
      setServerError(msg);
    } finally {
      setIsLoading(false);
    }
  }, []);

  useEffect(() => {
    loadData();
  }, [loadData]);

  // Administrative Division Handlers
  const handleOpenCreateDivModal = (sem: { id: string; semesterNumber: number; divisions?: Array<{ name: string }> }) => {
    const existingNames = (sem.divisions || []).map((d) => d.name);
    let suggested = "Div A";
    if (existingNames.includes("Div A") && !existingNames.includes("Div B")) suggested = "Div B";
    else if (existingNames.includes("Div A") && existingNames.includes("Div B") && !existingNames.includes("Div C")) suggested = "Div C";
    setCreateDivModalSemester(sem);
    setNewDivName(suggested);
    setNewDivCapacity(60);
    setCreateDivError(null);
  };

  const handleCloseCreateDivModal = () => {
    setCreateDivModalSemester(null);
    setCreateDivError(null);
  };

  const handleSaveDivision = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!createDivModalSemester || !newDivName.trim()) return;

    setIsCreatingDiv(true);
    setCreateDivError(null);

    try {
      const res = await createDivisionAction(
        createDivModalSemester.id,
        newDivName.trim(),
        newDivCapacity
      );

      if (!res.success) {
        setCreateDivError(res.error || "Failed to create division.");
      } else {
        setActionSuccessToast(`Division "${newDivName.trim()}" successfully created for Semester ${createDivModalSemester.semesterNumber}.`);
        handleCloseCreateDivModal();
        if (selectedProgrammeId) {
          handleInspectProgramme(selectedProgrammeId);
        }
        setTimeout(() => setActionSuccessToast(null), 4000);
      }
    } catch (err) {
      setCreateDivError(err instanceof Error ? err.message : "Error creating division.");
    } finally {
      setIsCreatingDiv(false);
    }
  };

  const handleDeleteDivision = async (divId: string, divName: string, semesterNum: number) => {
    if (!confirm(`Are you sure you want to delete Division "${divName}" from Semester ${semesterNum}?`)) {
      return;
    }

    try {
      const res = await deleteDivisionAction(divId);
      if (!res.success) {
        alert(res.error || "Failed to delete division.");
      } else {
        setActionSuccessToast(`Division "${divName}" removed from Semester ${semesterNum}.`);
        if (selectedProgrammeId) {
          handleInspectProgramme(selectedProgrammeId);
        }
        setTimeout(() => setActionSuccessToast(null), 4000);
      }
    } catch (err) {
      alert(err instanceof Error ? err.message : "Error deleting division.");
    }
  };

  // Faculty Assignment Handlers
  const handleOpenAssignModal = (
    subj: { id: string; code: string; title: string; semesterId: string },
    sem: { semesterNumber: number; divisions?: Array<{ id: string; name: string; maxCapacity: number }> }
  ) => {
    setAssignModalSubject(subj);
    setAssignModalSemesterNumber(sem.semesterNumber);
    setAssignModalDivisions(sem.divisions || []);
    setSelectedStaffId(staffList.length > 0 ? staffList[0].id : "");
    setSelectedDivisionId(""); // Default to all divisions / lecture
    setWeeklyHours(4);
    setAssignError(null);
  };

  const handleCloseAssignModal = () => {
    setAssignModalSubject(null);
    setAssignError(null);
  };

  const handleSaveAssignment = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!assignModalSubject || !selectedStaffId) return;

    setIsAssigning(true);
    setAssignError(null);

    try {
      const res = await assignTeachingSubjectAction(
        selectedStaffId,
        assignModalSubject.id,
        selectedDivisionId || null,
        weeklyHours
      );

      if (!res.success) {
        setAssignError(res.error || "Failed to create teaching assignment.");
      } else {
        setActionSuccessToast(`Teaching assignment registered for ${assignModalSubject.code}.`);
        handleCloseAssignModal();
        if (selectedProgrammeId) {
          handleInspectProgramme(selectedProgrammeId);
        }
        setTimeout(() => setActionSuccessToast(null), 4000);
      }
    } catch (err) {
      setAssignError(err instanceof Error ? err.message : "Database connection error.");
    } finally {
      setIsAssigning(false);
    }
  };

  const handleRemoveAssignment = async (taId: string, staffName: string, subjectTitle: string) => {
    if (!confirm(`Are you sure you want to remove ${staffName} from teaching ${subjectTitle}?`)) {
      return;
    }

    try {
      const res = await removeTeachingAssignmentAction(taId);
      if (!res.success) {
        alert(res.error || "Failed to remove teaching assignment.");
      } else {
        setActionSuccessToast(`Removed faculty assignment for ${staffName}.`);
        if (selectedProgrammeId) {
          handleInspectProgramme(selectedProgrammeId);
        }
        setTimeout(() => setActionSuccessToast(null), 4000);
      }
    } catch (err) {
      alert(err instanceof Error ? err.message : "Error removing assignment.");
    }
  };

  // Load detailed structure when a programme is selected
  const handleInspectProgramme = useCallback(async (id: string) => {
    setSelectedProgrammeId(id);
    setIsLoadingDetails(true);
    setSelectedSemesterIndex(0);
    try {
      const res = await getProgrammeDetailsAction(id);
      if (res.success && res.data) {
        setProgrammeDetails(res.data);
      } else {
        setServerError(res.error || "Failed to load programme curriculum structure.");
      }
    } catch (err) {
      const msg = err instanceof Error ? err.message : "Failed to load curriculum details";
      setServerError(msg);
    } finally {
      setIsLoadingDetails(false);
    }
  }, []);

  const handleCloseDetails = () => {
    setSelectedProgrammeId(null);
    setProgrammeDetails(null);
  };

  // URL query parameter support for direct navigation
  useEffect(() => {
    if (typeof window !== "undefined" && programmes.length > 0) {
      const params = new URLSearchParams(window.location.search);
      const targetProgId = params.get("programmeId");
      const targetCode = params.get("code");
      if (targetProgId) {
        handleInspectProgramme(targetProgId);
      } else if (targetCode) {
        const found = programmes.find((p) => p.code.toLowerCase() === targetCode.toLowerCase());
        if (found) {
          handleInspectProgramme(found.id);
        }
      }
    }
  }, [programmes, handleInspectProgramme]);

  // Filter logic
  const filteredProgrammes = useMemo(() => {
    return programmes.filter((prog) => {
      const matchesDegree =
        degreeFilter === "all" || prog.degreeLevel.toUpperCase() === degreeFilter;

      const matchesDepartment =
        departmentFilter === "all" ||
        prog.departmentId === departmentFilter ||
        prog.departmentName.toLowerCase() === departmentFilter.toLowerCase();

      const matchesSearch =
        searchQuery.trim() === "" ||
        prog.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
        prog.code.toLowerCase().includes(searchQuery.toLowerCase()) ||
        prog.departmentName.toLowerCase().includes(searchQuery.toLowerCase());

      return matchesDegree && matchesDepartment && matchesSearch;
    });
  }, [programmes, degreeFilter, departmentFilter, searchQuery]);

  // Aggregated dynamic metrics derived from SQLite
  const counts = useMemo(() => {
    const all = programmes.length;
    const ug = programmes.filter((p) => p.degreeLevel.toUpperCase() === "UNDERGRADUATE").length;
    const diploma = programmes.filter((p) => p.degreeLevel.toUpperCase() === "DIPLOMA").length;
    const certificate = programmes.filter((p) => p.degreeLevel.toUpperCase() === "CERTIFICATE").length;
    const totalDivisions = programmes.reduce((acc, p) => acc + (p.divisionCount || 0), 0);
    const totalEnrolments = programmes.reduce((acc, p) => acc + (p.enrolmentCount || 0), 0);
    return { all, ug, diploma, certificate, totalDivisions, totalEnrolments };
  }, [programmes]);

  // Active semester within the inspected programme
  const activeSemester = useMemo(() => {
    if (!programmeDetails || !programmeDetails.semesters) return null;
    return programmeDetails.semesters[selectedSemesterIndex] || programmeDetails.semesters[0] || null;
  }, [programmeDetails, selectedSemesterIndex]);

  // Milestone 1C.1: Matching predicate for curriculum search and filtering
  const matchesSubjectFilter = useCallback(
    (subj: ProgrammeSubjectWithRelations) => {
      const q = subjectSearch.trim().toLowerCase();
      const matchesSearch =
        !q ||
        subj.code.toLowerCase().includes(q) ||
        subj.title.toLowerCase().includes(q);

      const matchesVertical =
        subjectVerticalFilter === "all" ||
        (subjectVerticalFilter === "unclassified"
          ? !subj.metadata?.vertical
          : subj.metadata?.vertical === subjectVerticalFilter);

      const matchesType =
        subjectTypeFilter === "all" || subj.subjectType === subjectTypeFilter;

      return matchesSearch && matchesVertical && matchesType;
    },
    [subjectSearch, subjectVerticalFilter, subjectTypeFilter]
  );

  // Milestone 1C: Filter subjects within active semester
  const filteredSemesterSubjects = useMemo(() => {
    if (!activeSemester || !activeSemester.subjects) return [];
    return activeSemester.subjects.filter(matchesSubjectFilter);
  }, [activeSemester, matchesSubjectFilter]);

  // Milestone 1C.1: Partition subjects into compulsory units and intelligent SEC elective groups
  const { compulsorySubjects, electiveGroups } = useMemo(() => {
    if (!activeSemester || !activeSemester.subjects) {
      return { compulsorySubjects: [], electiveGroups: [] };
    }

    const compulsory = activeSemester.subjects
      .filter((s) => !s.metadata?.electiveGroup)
      .filter(matchesSubjectFilter);

    // Collect all options per elective group across the full active semester
    const rawGroups: Record<string, ProgrammeSubjectWithRelations[]> = {};
    for (const s of activeSemester.subjects) {
      if (s.metadata?.electiveGroup) {
        if (!rawGroups[s.metadata.electiveGroup]) {
          rawGroups[s.metadata.electiveGroup] = [];
        }
        rawGroups[s.metadata.electiveGroup].push(s);
      }
    }

    // Partition each group into matching options and companion alternative options
    const groups: Array<{
      groupName: string;
      allSubjects: ProgrammeSubjectWithRelations[];
      matchingSubjects: ProgrammeSubjectWithRelations[];
      hiddenSubjects: ProgrammeSubjectWithRelations[];
    }> = [];

    for (const [groupName, allSubjects] of Object.entries(rawGroups)) {
      const matchingSubjects = allSubjects.filter(matchesSubjectFilter);
      const hiddenSubjects = allSubjects.filter((s) => !matchesSubjectFilter(s));

      // Display the elective group whenever at least one option matches the filter/search criteria
      if (matchingSubjects.length > 0) {
        groups.push({
          groupName,
          allSubjects,
          matchingSubjects,
          hiddenSubjects,
        });
      }
    }

    return { compulsorySubjects: compulsory, electiveGroups: groups };
  }, [activeSemester, matchesSubjectFilter]);
  return (
    <div className="space-y-6">
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
          Academics & Programmes
        </span>
      </nav>

      {/* Header Banner with Real Campus Photography Camouflage */}
      <AnimatedReveal delay={0}>
        <div className="relative overflow-hidden rounded-2xl border border-slate-200/90 shadow-xs group bg-[#071322]">
          <div className="absolute inset-0 z-0 overflow-hidden pointer-events-none">
            <Image
              src="/images/campus-illuminated-sign.png"
              alt="R. P. Institute of Hospitality & Management Campus Signage"
              fill
              sizes="100vw"
              className="object-cover object-right opacity-80 transition-transform duration-700 ease-out group-hover:scale-108"
              priority
            />
            <div className="absolute inset-0 bg-gradient-to-r from-white via-white/95 to-white/70 z-10 backdrop-blur-[1.5px]"></div>
          </div>

          <div className="relative z-10 p-6 sm:p-8">
            <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
              <div className="flex items-start space-x-4">
                <div className="p-3.5 rounded-2xl bg-blue-50 text-[#1657D9] border border-blue-100 shrink-0">
                  <Icon name="academic-cap" className="h-8 w-8" />
                </div>
                <div>
                  <div className="flex items-center space-x-2">
                    <span className="text-xs font-bold uppercase tracking-wider text-[#1657D9]">
                      Academic Affairs & Curriculum Registry
                    </span>
                    <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-emerald-50 text-emerald-700 border border-emerald-200 flex items-center gap-1.5">
                      <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse"></span>
                      <span>
                        {currentAcademicYear
                          ? `Live Database • AY ${currentAcademicYear.code}`
                          : "Live Database • Academic Year Not Configured"}
                      </span>
                    </span>
                  </div>
                  <h1 className="text-2xl sm:text-3xl font-extrabold tracking-tight text-slate-900 font-serif mt-1">
                    Academics & Programmes
                  </h1>
                  <p className="text-sm text-slate-600 mt-1 max-w-2xl leading-relaxed">
                    Institutional curriculum registry, degree tracks, semester progression, course units, and class cohorts across hospitality and computing disciplines.
                  </p>
                </div>
              </div>

              <div className="shrink-0 flex items-center space-x-2">
                <button
                  type="button"
                  onClick={loadData}
                  disabled={isLoading}
                  className="inline-flex items-center space-x-1.5 px-3 py-2 text-xs font-semibold text-slate-600 hover:text-slate-900 bg-white/90 hover:bg-slate-100 rounded-xl border border-slate-200 shadow-2xs transition-colors cursor-pointer"
                  title="Refresh live academic catalogue from database"
                >
                  <Icon name="arrow-path" className={`w-3.5 h-3.5 ${isLoading ? "animate-spin text-[#1657D9]" : ""}`} />
                  <span className="hidden sm:inline">Refresh Catalog</span>
                </button>

                <Link
                  href="/"
                  className="inline-flex items-center space-x-2 px-3.5 py-2 rounded-xl bg-white/90 hover:bg-slate-100 text-slate-700 text-xs font-semibold transition-all border border-slate-200 shadow-2xs backdrop-blur-xs"
                >
                  <Icon name="arrow-left" className="h-4 w-4" />
                  <span>Dashboard</span>
                </Link>
              </div>
            </div>

            {/* Quick Metrics Strip — All derived from SQLite */}
            <div className="mt-6 pt-4 border-t border-slate-200/80 grid grid-cols-2 sm:grid-cols-4 gap-4">
              <div className="bg-white/80 backdrop-blur-xs p-3.5 rounded-xl border border-slate-200/80 shadow-2xs">
                <div className="flex items-center justify-between text-[11px] text-slate-500 uppercase tracking-wider font-semibold">
                  <span>Total Programmes</span>
                  <span className="text-[9px] font-bold px-1.5 py-0.2 rounded bg-emerald-50 text-emerald-700 border border-emerald-200/60">Live DB</span>
                </div>
                <div className="text-xl sm:text-2xl font-extrabold text-[#0F172A] mt-0.5 font-serif">
                  {counts.all}
                </div>
                <div className="text-[10px] text-slate-400 mt-0.5">Across active departments</div>
              </div>

              <div className="bg-white/80 backdrop-blur-xs p-3.5 rounded-xl border border-slate-200/80 shadow-2xs">
                <div className="flex items-center justify-between text-[11px] text-slate-500 uppercase tracking-wider font-semibold">
                  <span>Undergraduate (UG)</span>
                  <span className="text-[9px] font-bold px-1.5 py-0.2 rounded bg-emerald-50 text-emerald-700 border border-emerald-200/60">Live DB</span>
                </div>
                <div className="text-xl sm:text-2xl font-extrabold text-[#1657D9] mt-0.5 font-serif">
                  {counts.ug}
                </div>
                <div className="text-[10px] text-slate-400 mt-0.5">Degree level: UNDERGRADUATE</div>
              </div>

              <div className="bg-white/80 backdrop-blur-xs p-3.5 rounded-xl border border-slate-200/80 shadow-2xs">
                <div className="flex items-center justify-between text-[11px] text-slate-500 uppercase tracking-wider font-semibold">
                  <span>Diploma Tracks</span>
                  <span className="text-[9px] font-bold px-1.5 py-0.2 rounded bg-emerald-50 text-emerald-700 border border-emerald-200/60">Live DB</span>
                </div>
                <div className="text-xl sm:text-2xl font-extrabold text-[#0F172A] mt-0.5 font-serif">
                  {counts.diploma}
                </div>
                <div className="text-[10px] text-slate-400 mt-0.5">Degree level: DIPLOMA</div>
              </div>

              <div className="bg-white/80 backdrop-blur-xs p-3.5 rounded-xl border border-slate-200/80 shadow-2xs">
                <div className="flex items-center justify-between text-[11px] text-slate-500 uppercase tracking-wider font-semibold">
                  <span>Skill Certificates</span>
                  <span className="text-[9px] font-bold px-1.5 py-0.2 rounded bg-slate-100 text-slate-600 border border-slate-200">Live DB</span>
                </div>
                <div className="text-xl sm:text-2xl font-extrabold text-slate-400 mt-0.5 font-serif">
                  {counts.certificate}
                </div>
                <div className="text-[10px] text-slate-400 mt-0.5">None registered in database</div>
              </div>
            </div>
          </div>
        </div>
      </AnimatedReveal>

      {/* Database Connection Error Alert */}
      {serverError && (
        <div className="p-4 rounded-2xl bg-red-50 border border-red-200 shadow-2xs flex items-center justify-between gap-3 text-red-900">
          <div className="flex items-center space-x-3 text-xs">
            <Icon name="exclamation-circle" className="h-5 w-5 text-red-600 shrink-0" />
            <div>
              <span className="font-bold">Academic Registry Warning: </span>
              <span>{serverError}</span>
            </div>
          </div>
          <button
            type="button"
            onClick={loadData}
            className="px-3 py-1.5 rounded-xl bg-red-600 hover:bg-red-700 text-white text-xs font-semibold shrink-0 cursor-pointer"
          >
            Retry Connection
          </button>
        </div>
      )}
      {/* Main Two-Column Layout */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
        {/* Left Column: Programme Directory */}
        <div className="lg:col-span-8 space-y-4">
          {/* Controls: Filter Pills, Department Filter, & Search */}
          <div className="bg-white p-4 rounded-2xl border border-slate-200/90 shadow-2xs space-y-3">
            {/* Top row: Degree Level filter pills */}
            <div className="flex flex-wrap items-center justify-between gap-2 pb-2 border-b border-slate-100">
              <div className="flex flex-wrap items-center gap-1.5">
                <button
                  type="button"
                  onClick={() => setDegreeFilter("all")}
                  className={`px-3 py-1.5 text-xs font-bold rounded-xl transition-all cursor-pointer ${
                    degreeFilter === "all"
                      ? "bg-[#1657D9] text-white shadow-xs"
                      : "bg-slate-50 text-slate-600 hover:bg-slate-100 border border-slate-200"
                  }`}
                >
                  All Programmes ({counts.all})
                </button>

                <button
                  type="button"
                  onClick={() => setDegreeFilter("UNDERGRADUATE")}
                  className={`px-3 py-1.5 text-xs font-bold rounded-xl transition-all cursor-pointer ${
                    degreeFilter === "UNDERGRADUATE"
                      ? "bg-[#1657D9] text-white shadow-xs"
                      : "bg-slate-50 text-slate-600 hover:bg-slate-100 border border-slate-200"
                  }`}
                >
                  Undergraduate ({counts.ug})
                </button>

                <button
                  type="button"
                  onClick={() => setDegreeFilter("DIPLOMA")}
                  className={`px-3 py-1.5 text-xs font-bold rounded-xl transition-all cursor-pointer ${
                    degreeFilter === "DIPLOMA"
                      ? "bg-[#1657D9] text-white shadow-xs"
                      : "bg-slate-50 text-slate-600 hover:bg-slate-100 border border-slate-200"
                  }`}
                >
                  Diploma ({counts.diploma})
                </button>

                <button
                  type="button"
                  onClick={() => setDegreeFilter("CERTIFICATE")}
                  className={`px-3 py-1.5 text-xs font-bold rounded-xl transition-all cursor-pointer ${
                    degreeFilter === "CERTIFICATE"
                      ? "bg-[#1657D9] text-white shadow-xs"
                      : "bg-slate-50 text-slate-600 hover:bg-slate-100 border border-slate-200"
                  }`}
                >
                  Certificates ({counts.certificate})
                </button>
              </div>

              {(degreeFilter !== "all" || departmentFilter !== "all" || searchQuery.trim() !== "") && (
                <button
                  type="button"
                  onClick={() => {
                    setDegreeFilter("all");
                    setDepartmentFilter("all");
                    setSearchQuery("");
                  }}
                  className="text-xs font-semibold text-[#1657D9] hover:underline cursor-pointer"
                >
                  Reset Filters
                </button>
              )}
            </div>

            {/* Bottom row: Search input & Department select */}
            <div className="grid grid-cols-1 sm:grid-cols-12 gap-3">
              <div className="sm:col-span-7 relative">
                <Icon
                  name="magnifying-glass"
                  className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2"
                />
                <input
                  id="academics-programme-search"
                  type="text"
                  placeholder="Search programmes by name, code, or department..."
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className="w-full pl-9 pr-8 py-2 text-xs rounded-xl border border-slate-200 bg-slate-50/50 text-slate-900 placeholder:text-slate-400 focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-[#1657D9]"
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

              <div className="sm:col-span-5">
                <select
                  id="academics-department-select"
                  value={departmentFilter}
                  onChange={(e) => setDepartmentFilter(e.target.value)}
                  className="w-full px-3 py-2 text-xs rounded-xl border border-slate-200 bg-white text-slate-700 focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-[#1657D9]"
                >
                  <option value="all">All Departments ({departments.length})</option>
                  {departments.map((d) => (
                    <option key={d.id} value={d.id}>
                      {d.name} ({d.code})
                    </option>
                  ))}
                </select>
              </div>
            </div>
          </div>

          {/* Loading Skeleton */}
          {isLoading && (
            <div className="space-y-3">
              {[1, 2, 3].map((i) => (
                <div key={i} className="bg-white rounded-2xl p-5 border border-slate-200/80 animate-pulse space-y-3">
                  <div className="h-4 bg-slate-200 rounded w-1/4"></div>
                  <div className="h-6 bg-slate-200 rounded w-3/4"></div>
                  <div className="h-3 bg-slate-100 rounded w-1/2"></div>
                </div>
              ))}
            </div>
          )}

          {/* Programme Cards List */}
          {!isLoading && (
            <div className="space-y-3.5">
              {filteredProgrammes.map((prog) => {
                const isSelected = selectedProgrammeId === prog.id;
                return (
                  <div
                    key={prog.id}
                    className={`relative overflow-hidden rounded-2xl bg-white p-5 border transition-all flex flex-col sm:flex-row sm:items-center justify-between gap-4 group ${
                      isSelected
                        ? "border-[#1657D9] ring-2 ring-blue-500/20 shadow-md"
                        : "border-slate-200/90 shadow-2xs hover:border-[#1657D9]/40 hover:shadow-xs"
                    }`}
                  >
                    <div className="relative z-10 space-y-1.5 flex-1 min-w-0">
                      <div className="flex flex-wrap items-center gap-2">
                        <span className="font-mono font-bold text-xs text-[#1657D9] bg-blue-50 px-2 py-0.5 rounded-md border border-blue-100">
                          {prog.code}
                        </span>
                        <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-emerald-50 text-emerald-700 border border-emerald-200 flex items-center gap-1">
                          <span className="w-1.5 h-1.5 rounded-full bg-emerald-500"></span>
                          <span>Active Programme</span>
                        </span>
                        <span className="text-[10px] font-semibold px-2 py-0.5 rounded-full bg-slate-100 text-slate-700">
                          {prog.degreeLevel === "UNDERGRADUATE" ? "Undergraduate (UG)" : "Diploma"}
                        </span>
                      </div>

                      <h3 className="text-base font-bold text-slate-900 group-hover:text-[#1657D9] transition-colors">
                        {prog.name}
                      </h3>

                      <div className="flex flex-wrap items-center gap-y-1 gap-x-3 text-xs text-slate-500">
                        <span className="flex items-center gap-1">
                          <Icon name="clock" className="h-3.5 w-3.5 text-slate-400" />
                          <span>{prog.durationYears} {prog.durationYears === 1 ? "Year" : "Years"} ({prog.semesterCount} Semesters)</span>
                        </span>
                        <span>•</span>
                        <span className="flex items-center gap-1">
                          <Icon name="academic-cap" className="h-3.5 w-3.5 text-slate-400" />
                          <span>{prog.departmentName}</span>
                        </span>
                        <span>•</span>
                        <span className="text-slate-600 font-medium">
                          Affiliation details not configured
                        </span>
                      </div>

                      {/* Linked counts summary pills */}
                      <div className="flex flex-wrap items-center gap-2 pt-1 text-[11px] text-slate-500">
                        <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-md bg-slate-50 border border-slate-200/80">
                          <Icon name="users" className="w-3 h-3 text-slate-400" />
                          <span>{prog.enrolmentCount} Enrolled Students</span>
                        </span>
                        <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-md bg-slate-50 border border-slate-200/80">
                          <Icon name="squares-2x2" className="w-3 h-3 text-slate-400" />
                          <span>{prog.divisionCount} Divisions</span>
                        </span>
                        <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-md bg-slate-50 border border-slate-200/80">
                          <Icon name="document-text" className="w-3 h-3 text-slate-400" />
                          <span>{prog.subjectCount} Course Units</span>
                        </span>
                      </div>
                    </div>

                    <div className="relative z-10 flex sm:flex-col items-center sm:items-end justify-between sm:justify-center gap-2 pt-2 sm:pt-0 border-t sm:border-t-0 border-slate-100">
                      <button
                        type="button"
                        onClick={() => handleInspectProgramme(prog.id)}
                        className={`px-3.5 py-2 text-xs font-semibold rounded-xl border transition-all cursor-pointer flex items-center space-x-1.5 shrink-0 ${
                          isSelected
                            ? "bg-[#1657D9] text-white border-[#1657D9] shadow-xs"
                            : "bg-blue-50 text-[#1657D9] hover:bg-[#1657D9] hover:text-white border-blue-200"
                        }`}
                      >
                        <Icon name="squares-2x2" className="h-3.5 w-3.5" />
                        <span>Inspect Curriculum</span>
                      </button>
                    </div>
                  </div>
                );
              })}

              {filteredProgrammes.length === 0 && (
                <div className="bg-white rounded-2xl p-10 text-center border border-slate-200 text-slate-500 text-xs space-y-2">
                  <Icon name="magnifying-glass" className="mx-auto h-8 w-8 text-slate-300" />
                  <p className="text-sm font-semibold text-slate-700">
                    No academic programmes match &quot;{searchQuery}&quot;
                  </p>
                  <p className="text-slate-400">
                    Try clearing search criteria or changing the active department filter.
                  </p>
                  <button
                    type="button"
                    onClick={() => {
                      setDegreeFilter("all");
                      setDepartmentFilter("all");
                      setSearchQuery("");
                    }}
                    className="mt-2 inline-flex items-center space-x-1 px-3 py-1.5 rounded-xl bg-slate-100 hover:bg-slate-200 text-slate-700 font-semibold cursor-pointer"
                  >
                    <span>Reset All Filters</span>
                  </button>
                </div>
              )}
            </div>
          )}
        </div>

        {/* Right Column: Institutional Overview & Affiliation */}
        <div className="lg:col-span-4 space-y-6">
          <div className="relative overflow-hidden rounded-2xl bg-white border border-slate-200/90 shadow-2xs group hover:border-[#1657D9]/40 hover:shadow-md transition-all">
            <div className="relative h-44 bg-slate-900 overflow-hidden z-10">
              <Image
                src="/images/campus-front-gate.jpg"
                alt="R. P. Institute of Hospitality & Management Campus Gate"
                fill
                sizes="(max-width: 1024px) 100vw, 33vw"
                className="object-cover object-center opacity-90 transition-transform duration-700 ease-out group-hover:scale-110"
              />
              <div className="absolute inset-0 bg-gradient-to-t from-[#0B1528] via-[#0B1528]/40 to-transparent"></div>
              <div className="absolute bottom-3 left-4 right-4 text-white">
                <span className="text-[10px] font-bold uppercase tracking-wider text-amber-200">
                  Institutional Registry
                </span>
                <h4 className="text-sm font-bold text-white font-serif">
                  Academic Structure & Catalog
                </h4>
              </div>
            </div>

            <div className="relative z-10 p-5 space-y-4 text-xs">
              <div>
                <span className="text-[11px] font-bold text-slate-400 uppercase tracking-wider block mb-2">
                  Academic Departments ({departments.length})
                </span>
                <div className="space-y-2">
                  {departments.map((dept) => (
                    <div
                      key={dept.id}
                      className="p-2.5 rounded-xl bg-slate-50 border border-slate-200/80 flex items-center justify-between"
                    >
                      <div>
                        <span className="font-semibold text-xs text-slate-800 block">
                          {dept.name}
                        </span>
                        <span className="text-[10px] font-mono text-slate-400">
                          Code: {dept.code}
                        </span>
                      </div>
                      <div className="text-right">
                        <span className="text-xs font-bold text-[#1657D9] block">
                          {dept._count?.programmes ?? 0} {dept._count?.programmes === 1 ? "Programme" : "Programmes"}
                        </span>
                        <span className="text-[10px] text-slate-500 block">
                          {dept._count?.staff ?? 0} Faculty / Staff
                        </span>
                      </div>
                    </div>
                  ))}
                </div>
              </div>

              <div className="pt-3 border-t border-slate-100">
                <span className="text-[11px] font-bold text-slate-400 uppercase tracking-wider block mb-1">
                  Affiliation & Regulatory Framework
                </span>
                <p className="text-slate-600 leading-relaxed text-[11px]">
                  Affiliation and external regulatory details are not configured in the active database. Current records represent verified internal institutional curriculum offerings.
                </p>
              </div>

              <div className="pt-3 border-t border-slate-100">
                <span className="text-[11px] font-bold text-slate-400 uppercase tracking-wider block mb-2">
                  Curriculum Structure Invariants
                </span>
                <div className="space-y-2">
                  <div className="p-2.5 rounded-xl bg-slate-50 border border-slate-200 text-slate-700">
                    <span className="font-semibold text-xs block text-slate-800">Course Credits & Classification</span>
                    <span className="text-[11px] text-slate-500 block mt-0.5">Subjects define academic credit weightings and course types (Theory / Practical)</span>
                  </div>
                  <div className="p-2.5 rounded-xl bg-slate-50 border border-slate-200 text-slate-700">
                    <span className="font-semibold text-xs block text-slate-800">Faculty Contact Hours</span>
                    <span className="text-[11px] text-slate-500 block mt-0.5">Teaching assignments record weekly instructional contact hours per subject</span>
                  </div>
                </div>
              </div>
            </div>
          </div>

          {/* Quick Info Box */}
          <div className="rounded-xl bg-slate-50 border border-slate-200 p-4 text-xs text-slate-600 space-y-2">
            <div className="font-bold text-slate-800 flex items-center space-x-1.5">
              <Icon name="information-circle" className="w-4 h-4 text-[#1657D9]" />
              <span>Academic Invariants ({currentAcademicYear ? `AY ${currentAcademicYear.code}` : "Current Session"})</span>
            </div>
            <p className="text-[11px] text-slate-500 leading-relaxed">
              Total enrolled student distribution, semester cohort breakdown, and faculty subject assignments are queried directly from the SQLite authoritative database.
            </p>
          </div>
        </div>
      </div>

      {/* Interactive Curriculum & Structure Dossier Modal */}
      {selectedProgrammeId && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 sm:p-6 overflow-y-auto bg-slate-900/60 backdrop-blur-sm animate-in fade-in duration-150">
          <div className="relative w-full max-w-5xl max-h-[90vh] bg-white rounded-2xl shadow-2xl border border-slate-200 flex flex-col overflow-hidden">
            
            {/* Modal Header */}
            <div className="px-6 py-5 border-b border-slate-200 bg-slate-900 text-white flex items-start justify-between">
              <div>
                <div className="flex items-center space-x-2.5 mb-1.5">
                  <span className="px-2.5 py-0.5 rounded-full text-xs font-mono font-bold bg-[#1657D9] text-white">
                    {programmeDetails?.code || 'PROGRAMME'}
                  </span>
                  <span className="px-2 py-0.5 rounded-md text-[11px] font-semibold bg-slate-800 text-slate-300 border border-slate-700">
                    {programmeDetails?.degreeLevel || 'Degree'}
                  </span>
                  <span className="px-2 py-0.5 rounded-md text-[11px] font-semibold bg-emerald-950/60 text-emerald-400 border border-emerald-800/60">
                    Active Offering
                  </span>
                </div>
                <h2 className="text-xl font-bold tracking-tight text-white">
                  {programmeDetails?.name || 'Loading Programme Structure...'}
                </h2>
                <p className="text-xs text-slate-400 mt-1 flex items-center space-x-3">
                  <span>Department: <strong className="text-slate-200">{programmeDetails?.department.name}</strong></span>
                  <span>•</span>
                  <span>Duration: <strong className="text-slate-200">{programmeDetails?.durationYears} Years</strong></span>
                  <span>•</span>
                  <span>Semesters: <strong className="text-slate-200">{programmeDetails?.semesters.length || 0} Terms</strong></span>
                  <span>•</span>
                  <span>Affiliation: <span className="text-slate-400 italic">Not configured</span></span>
                </p>
              </div>

              <button
                onClick={handleCloseDetails}
                className="p-2 text-slate-400 hover:text-white rounded-xl hover:bg-slate-800 transition-colors"
                aria-label="Close dossier"
              >
                <Icon name="x-mark" className="w-5 h-5" />
              </button>
            </div>

            {/* Modal Body */}
            <div className="flex-1 overflow-y-auto p-6 space-y-6">
              {isLoadingDetails && (
                <div className="py-20 flex flex-col items-center justify-center space-y-3">
                  <div className="w-8 h-8 border-3 border-[#1657D9] border-t-transparent rounded-full animate-spin" />
                  <p className="text-sm text-slate-500 font-medium">Querying live academic structure from database...</p>
                </div>
              )}

              {programmeDetails && !isLoadingDetails && (
                <>
                  {/* Semester Tabs Navigation */}
                  <div className="space-y-2">
                    <div className="flex items-center justify-between">
                      <span className="text-xs font-bold uppercase tracking-wider text-slate-500">
                        Semesters & Academic Terms ({programmeDetails.semesters.length} Registered)
                      </span>
                      <span className="text-xs text-slate-400">Select a semester to inspect cohorts & syllabus</span>
                    </div>

                    <div className="flex space-x-2 overflow-x-auto pb-2 scrollbar-thin">
                      {programmeDetails.semesters.map((sem, idx) => {
                        const isSelected = idx === selectedSemesterIndex;
                        return (
                          <button
                            key={sem.id}
                            onClick={() => setSelectedSemesterIndex(idx)}
                            className={`px-4 py-2.5 rounded-xl font-semibold text-xs transition-all whitespace-nowrap flex items-center space-x-2 border ${
                              isSelected
                                ? 'bg-[#1657D9] text-white border-[#1657D9] shadow-md shadow-[#1657D9]/20'
                                : 'bg-slate-50 text-slate-600 border-slate-200 hover:bg-slate-100 hover:text-slate-900'
                            }`}
                          >
                            <span>Sem {sem.semesterNumber}</span>
                            <span className={`px-1.5 py-0.5 rounded-full text-[10px] font-bold ${
                              isSelected ? 'bg-white/20 text-white' : 'bg-slate-200 text-slate-700'
                            }`}>
                              {sem.enrolments?.length || 0} students
                            </span>
                          </button>
                        );
                      })}
                    </div>
                  </div>

                  {/* Active Semester Content */}
                  {(() => {
                    const activeSem = programmeDetails.semesters[selectedSemesterIndex] || programmeDetails.semesters[0];
                    if (!activeSem) return null;

                    return (
                      <div className="space-y-6 pt-2">
                        
                        {/* Semester Header Meta */}
                        <div className="p-4 rounded-xl bg-slate-50 border border-slate-200 flex flex-wrap items-center justify-between gap-3">
                          <div className="flex items-center space-x-3">
                            <div className="w-10 h-10 rounded-xl bg-blue-100 text-[#1657D9] flex items-center justify-center font-bold text-base">
                              S{activeSem.semesterNumber}
                            </div>
                            <div>
                              <h4 className="font-bold text-slate-900 text-sm">
                                Semester {activeSem.semesterNumber} Curriculum & Cohort
                              </h4>
                              <p className="text-xs text-slate-500">
                                Term: <span className="font-semibold text-slate-700">{activeSem.termType}</span> • Academic Cycle: <span className="font-semibold text-emerald-600">Active</span>
                              </p>
                            </div>
                          </div>

                          <div className="flex items-center space-x-4 text-xs">
                            <div className="text-center px-3 py-1 rounded-lg bg-white border border-slate-200">
                              <span className="block font-bold text-slate-800">{activeSem.divisions?.length || 0}</span>
                              <span className="text-[10px] text-slate-400 uppercase font-medium">Divisions</span>
                            </div>
                            <div className="text-center px-3 py-1 rounded-lg bg-white border border-slate-200">
                              <span className="block font-bold text-slate-800">{activeSem.subjects?.length || 0}</span>
                              <span className="text-[10px] text-slate-400 uppercase font-medium">Subjects</span>
                            </div>
                            <div className="text-center px-3 py-1 rounded-lg bg-white border border-slate-200">
                              <span className="block font-bold text-[#1657D9]">{activeSem.enrolments?.length || 0}</span>
                              <span className="text-[10px] text-slate-400 uppercase font-medium">Enrolled</span>
                            </div>
                          </div>
                        </div>

                        {/* Two Columns: Divisions & Subjects */}
                        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                          
                          {/* Column 1: Divisions / Cohorts */}
                          <div className="space-y-3">
                            <div className="flex items-center justify-between">
                              <span className="text-xs font-bold uppercase tracking-wider text-slate-500 flex items-center space-x-1.5">
                                <Icon name="users" className="w-4 h-4 text-slate-400" />
                                <span>Academic Divisions (Cohorts)</span>
                              </span>
                              <div className="flex items-center space-x-2">
                                <span className="text-[11px] text-slate-400">{activeSem.divisions?.length || 0} configured</span>
                                {canManageAcademics && (
                                  <button
                                    type="button"
                                    onClick={() => handleOpenCreateDivModal(activeSem)}
                                    className="px-2 py-0.5 rounded text-[10px] font-bold text-[#1657D9] bg-blue-50 hover:bg-blue-100 border border-blue-200 transition-colors flex items-center space-x-1 cursor-pointer"
                                  >
                                    <span>+ Add Division</span>
                                  </button>
                                )}
                              </div>
                            </div>

                            {(!activeSem.divisions || activeSem.divisions.length === 0) ? (
                              <div className="p-6 rounded-xl bg-slate-50 border border-dashed border-slate-300 text-center text-xs text-slate-500 space-y-2.5">
                                <p>No divisions configured for Semester {activeSem.semesterNumber}.</p>
                                {canManageAcademics && (
                                  <button
                                    type="button"
                                    onClick={() => handleOpenCreateDivModal(activeSem)}
                                    className="px-3 py-1.5 rounded-xl text-xs font-semibold text-white bg-[#1657D9] hover:bg-[#1248B8] transition-colors shadow-xs inline-flex items-center space-x-1.5 cursor-pointer"
                                  >
                                    <span>+ Provision Division for Sem {activeSem.semesterNumber}</span>
                                  </button>
                                )}
                              </div>
                            ) : (
                              <div className="space-y-2">
                                {activeSem.divisions.map((div) => {
                                  const enrolmentCount = (activeSem.enrolments || []).filter((e) => e.divisionId === div.id).length;
                                  const teachingCount = (activeSem.subjects || []).flatMap((s) => s.teachingAssignments || []).filter((ta) => ta.divisionId === div.id).length;
                                  const isDeletable = enrolmentCount === 0 && teachingCount === 0;

                                  return (
                                    <div key={div.id} className="p-3.5 rounded-xl border border-slate-200 bg-white hover:border-slate-300 transition-colors flex items-center justify-between shadow-xs">
                                      <div>
                                        <div className="flex items-center space-x-2">
                                          <span className="font-bold text-xs text-slate-900">{div.name}</span>
                                          <span className="px-2 py-0.5 rounded-full text-[10px] font-semibold bg-emerald-50 text-emerald-700 border border-emerald-200">
                                            Active
                                          </span>
                                        </div>
                                        <div className="text-[11px] text-slate-400 flex items-center space-x-2 mt-0.5">
                                          <span>Capacity: {div.maxCapacity} seats</span>
                                          <span>•</span>
                                          <span className={enrolmentCount > 0 ? "font-semibold text-slate-700" : "text-slate-400"}>
                                            {enrolmentCount} {enrolmentCount === 1 ? "student" : "students"} placed
                                          </span>
                                          {teachingCount > 0 && (
                                            <>
                                              <span>•</span>
                                              <span>{teachingCount} faculty assigned</span>
                                            </>
                                          )}
                                        </div>
                                      </div>
                                      <div>
                                        {canManageAcademics && isDeletable ? (
                                          <button
                                            type="button"
                                            onClick={() => handleDeleteDivision(div.id, div.name, activeSem.semesterNumber)}
                                            className="px-2 py-1 rounded text-[10px] font-medium text-red-600 bg-white border border-red-200 hover:bg-red-50 transition-colors cursor-pointer"
                                            title="Delete unused division"
                                          >
                                            Delete
                                          </button>
                                        ) : (
                                          <span className="text-[10px] text-slate-400 font-medium px-2 py-0.5 bg-slate-50 rounded border border-slate-200/60" title="Cannot delete division with active enrolments or teaching assignments">
                                            Locked
                                          </span>
                                        )}
                                      </div>
                                    </div>
                                  );
                                })}
                              </div>
                            )}
                          </div>

                          {/* Column 2: Enhanced Curriculum Catalog & Faculty Assignments */}
                          <div className="space-y-3">
                            <div className="flex items-center justify-between">
                              <span className="text-xs font-bold uppercase tracking-wider text-slate-500 flex items-center space-x-1.5">
                                <Icon name="book-open" className="w-4 h-4 text-[#1657D9]" />
                                <span>Academic Curriculum Catalog</span>
                              </span>
                              <span className="text-[11px] font-semibold text-slate-500 bg-slate-100 px-2 py-0.5 rounded-full border border-slate-200">
                                {filteredSemesterSubjects.length} of {activeSem.subjects?.length || 0} Units
                              </span>
                            </div>

                            {/* Catalog Search & Filtering Controls */}
                            {activeSem.subjects && activeSem.subjects.length > 0 && (
                              <div className="p-3 bg-slate-50/80 rounded-xl border border-slate-200 space-y-2">
                                <div className="relative">
                                  <Icon name="search" className="w-3.5 h-3.5 text-slate-400 absolute left-2.5 top-1/2 -translate-y-1/2" />
                                  <input
                                    type="text"
                                    placeholder="Search courses by code or title..."
                                    value={subjectSearch}
                                    onChange={(e) => setSubjectSearch(e.target.value)}
                                    className="w-full pl-8 pr-3 py-1.5 text-xs bg-white rounded-lg border border-slate-200 text-slate-900 placeholder:text-slate-400 focus:outline-none focus:ring-1 focus:ring-[#1657D9]"
                                  />
                                  {subjectSearch && (
                                    <button
                                      type="button"
                                      onClick={() => setSubjectSearch("")}
                                      className="absolute right-2.5 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600 text-xs"
                                    >
                                      ✕
                                    </button>
                                  )}
                                </div>

                                <div className="flex flex-wrap items-center gap-1.5 text-[11px]">
                                  <span className="text-slate-400 text-[10px] uppercase font-bold mr-0.5">Vertical:</span>
                                  {([
                                    { id: "all", label: "All" },
                                    { id: "Major", label: "Major" },
                                    { id: "VSC", label: "VSC" },
                                    { id: "SEC", label: "SEC" },
                                    { id: "Minor", label: "Minor" },
                                    { id: "unclassified", label: "Baseline" },
                                  ] as const).map((v) => (
                                    <button
                                      key={v.id}
                                      type="button"
                                      onClick={() => setSubjectVerticalFilter(v.id)}
                                      className={`px-2 py-0.5 rounded-full font-medium transition-colors cursor-pointer text-[10px] ${
                                        subjectVerticalFilter === v.id
                                          ? "bg-[#1657D9] text-white shadow-xs"
                                          : "bg-white text-slate-600 border border-slate-200 hover:bg-slate-100"
                                      }`}
                                    >
                                      {v.label}
                                    </button>
                                  ))}

                                  <div className="h-3 w-px bg-slate-200 mx-1 hidden sm:block" />

                                  <select
                                    value={subjectTypeFilter}
                                    onChange={(e) => setSubjectTypeFilter(e.target.value)}
                                    className="text-[10px] bg-white border border-slate-200 rounded px-2 py-0.5 text-slate-700 font-medium focus:outline-none focus:ring-1 focus:ring-[#1657D9]"
                                  >
                                    <option value="all">All Course Types</option>
                                    <option value="THEORY">Theory (TH)</option>
                                    <option value="PRACTICAL">Practical (PR)</option>
                                    <option value="OJT">On-Job Training (OJT)</option>
                                  </select>

                                  {(subjectSearch || subjectVerticalFilter !== "all" || subjectTypeFilter !== "all") && (
                                    <button
                                      type="button"
                                      onClick={() => {
                                        setSubjectSearch("");
                                        setSubjectVerticalFilter("all");
                                        setSubjectTypeFilter("all");
                                      }}
                                      className="text-[10px] font-semibold text-[#D92534] hover:underline ml-auto cursor-pointer"
                                    >
                                      Reset Filters
                                    </button>
                                  )}
                                </div>
                              </div>
                            )}

                            {(!activeSem.subjects || activeSem.subjects.length === 0) ? (
                              <div className="p-4 rounded-xl bg-slate-50 border border-dashed border-slate-300 text-center text-xs text-slate-500">
                                No curriculum subjects configured for Semester {activeSem.semesterNumber}.
                              </div>
                            ) : filteredSemesterSubjects.length === 0 ? (
                              <div className="p-6 rounded-xl bg-slate-50 border border-slate-200 text-center space-y-2">
                                <Icon name="search" className="w-6 h-6 text-slate-300 mx-auto" />
                                <p className="text-xs font-semibold text-slate-700">No matching subjects found</p>
                                <p className="text-[11px] text-slate-400">Try adjusting your search keywords or vertical filter pills.</p>
                                <button
                                  type="button"
                                  onClick={() => {
                                    setSubjectSearch("");
                                    setSubjectVerticalFilter("all");
                                    setSubjectTypeFilter("all");
                                  }}
                                  className="px-3 py-1 rounded-lg text-xs font-bold text-[#1657D9] bg-blue-50 border border-blue-200 hover:bg-blue-100 transition-colors cursor-pointer"
                                >
                                  Clear All Filters
                                </button>
                              </div>
                            ) : (
                              <div className="space-y-3">
                                {/* Section 2A: Compulsory Core Curriculum Units */}
                                {compulsorySubjects.length > 0 && (
                                  <div className="space-y-2.5">
                                    {compulsorySubjects.map((subj) => (
                                      <div key={subj.id} className="p-3.5 rounded-xl border border-slate-200 bg-white shadow-xs space-y-2.5 hover:border-slate-300 transition-colors">
                                        <div className="flex items-start justify-between gap-3">
                                          <div className="space-y-1.5 flex-1">
                                            <div className="flex flex-wrap items-center gap-1.5">
                                              <span className="font-mono text-xs font-bold text-[#1657D9] bg-blue-50 px-2 py-0.5 rounded border border-blue-200">
                                                {subj.code}
                                              </span>
                                              <span className="font-bold text-xs text-slate-900 leading-snug">
                                                {subj.title}
                                              </span>
                                            </div>

                                            {/* Badges Row: NEP Vertical, Course Type, Credits & Verified Status */}
                                            <div className="flex flex-wrap items-center gap-1.5 pt-0.5">
                                              {subj.metadata?.vertical === "Major" && (
                                                <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-blue-50 text-[#1657D9] border border-blue-200">
                                                  Major
                                                </span>
                                              )}
                                              {subj.metadata?.vertical === "VSC" && (
                                                <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-emerald-50 text-emerald-700 border border-emerald-200">
                                                  Vocational (VSC)
                                                </span>
                                              )}
                                              {subj.metadata?.vertical === "SEC" && (
                                                <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-amber-50 text-amber-700 border border-amber-200">
                                                  Skill Enhancement (SEC)
                                                </span>
                                              )}
                                              {subj.metadata?.vertical === "Minor" && (
                                                <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-purple-50 text-purple-700 border border-purple-200">
                                                  Minor
                                                </span>
                                              )}
                                              {!subj.metadata?.vertical && (
                                                <span className="px-2 py-0.5 rounded-full text-[10px] font-medium bg-slate-100 text-slate-600 border border-slate-200">
                                                  Baseline Prototype
                                                </span>
                                              )}

                                              <span className="px-2 py-0.5 rounded-full text-[10px] font-medium bg-slate-50 text-slate-600 border border-slate-200">
                                                {subj.subjectType === "THEORY"
                                                  ? "Theory (TH)"
                                                  : subj.subjectType === "PRACTICAL" || subj.subjectType === "PRACTICAL_KITCHEN"
                                                  ? "Practical (PR)"
                                                  : subj.subjectType === "OJT"
                                                  ? "On-Job Training (OJT)"
                                                  : subj.subjectType}
                                              </span>

                                              <span className="px-2 py-0.5 rounded-full text-[10px] font-bold text-slate-800 bg-slate-100 border border-slate-200">
                                                {subj.credits} Credits
                                              </span>

                                              {subj.metadata?.isVerified && subj.metadata?.isManifestMatched ? (
                                                <span className="px-2 py-0.5 rounded-full text-[10px] font-semibold bg-emerald-50 text-emerald-800 border border-emerald-200 flex items-center space-x-1">
                                                  <span className="w-1.5 h-1.5 rounded-full bg-emerald-500" />
                                                  <span>Verified • MU Circular</span>
                                                </span>
                                              ) : (
                                                <span className="px-2 py-0.5 rounded-full text-[10px] font-medium bg-slate-100 text-slate-500 border border-slate-200">
                                                  Unverified
                                                </span>
                                              )}
                                            </div>
                                          </div>

                                          {/* Provenance Inspection Trigger */}
                                          <button
                                            type="button"
                                            onClick={() => setProvenanceSubject(subj)}
                                            className="shrink-0 px-2.5 py-1 text-[10px] font-bold text-[#1657D9] bg-blue-50 hover:bg-blue-100 border border-blue-200 rounded-lg transition-colors flex items-center space-x-1 cursor-pointer"
                                            title="Inspect syllabus provenance, circular PDF and Academic Council resolution"
                                          >
                                            <Icon name="document-text" className="w-3.5 h-3.5" />
                                            <span>Details</span>
                                          </button>
                                        </div>

                                        {/* Assigned Faculty Section */}
                                        <div className="pt-2 border-t border-slate-100 space-y-2">
                                          <div className="flex items-center justify-between">
                                            <span className="text-[10px] font-bold uppercase tracking-wider text-slate-500 flex items-center space-x-1">
                                              <Icon name="users" className="w-3 h-3 text-[#1657D9]" />
                                              <span>Faculty Assignments</span>
                                            </span>
                                            {canManageAcademics && (
                                              <button
                                                type="button"
                                                onClick={() => handleOpenAssignModal(subj, activeSem)}
                                                className="px-2 py-0.5 rounded text-[10px] font-bold text-[#1657D9] bg-blue-50 hover:bg-blue-100 border border-blue-200 transition-colors flex items-center space-x-1 cursor-pointer"
                                              >
                                                <span>+ Assign Faculty</span>
                                              </button>
                                            )}
                                          </div>

                                          {subj.teachingAssignments && subj.teachingAssignments.length > 0 ? (
                                            <div className="space-y-1.5">
                                              {subj.teachingAssignments.map((ta) => (
                                                <div key={ta.id} className="flex items-center justify-between text-xs bg-slate-50 p-2 rounded-lg border border-slate-200/60">
                                                  <div className="flex items-center space-x-2">
                                                    <div className="w-6 h-6 rounded-full bg-[#1657D9]/10 text-[#1657D9] flex items-center justify-center font-bold text-[10px]">
                                                      {ta.staff.fullName.charAt(0)}
                                                    </div>
                                                    <div>
                                                      <span className="font-semibold text-slate-800 block text-xs">{ta.staff.fullName}</span>
                                                      <span className="text-[10px] text-slate-500">
                                                        {ta.division ? `Div ${ta.division.name}` : "All Divisions / Theory"} • {ta.weeklyHours} hrs/wk
                                                      </span>
                                                    </div>
                                                  </div>
                                                  <div className="flex items-center space-x-1.5">
                                                    <a
                                                      href={`/modules/faculty?staffId=${ta.staff.id}`}
                                                      className="px-2 py-1 rounded text-[10px] font-medium text-[#1657D9] bg-white border border-blue-200 hover:bg-blue-50 transition-colors"
                                                    >
                                                      Profile
                                                    </a>
                                                    {canManageAcademics && (
                                                      <button
                                                        type="button"
                                                        onClick={() => handleRemoveAssignment(ta.id, ta.staff.fullName, subj.title)}
                                                        className="px-2 py-1 rounded text-[10px] font-medium text-red-600 bg-white border border-red-200 hover:bg-red-50 transition-colors cursor-pointer"
                                                        title="Unassign Faculty"
                                                      >
                                                        Remove
                                                      </button>
                                                    )}
                                                  </div>
                                                </div>
                                              ))}
                                            </div>
                                          ) : (
                                            <div className="text-[11px] text-amber-600 bg-amber-50 p-2 rounded-lg border border-amber-200/60 flex items-center justify-between">
                                              <div className="flex items-center space-x-1.5">
                                                <Icon name="exclamation-circle" className="w-3.5 h-3.5 text-amber-500 shrink-0" />
                                                <span>No faculty assignment registered</span>
                                              </div>
                                              {canManageAcademics && (
                                                <button
                                                  type="button"
                                                  onClick={() => handleOpenAssignModal(subj, activeSem)}
                                                  className="text-[10px] font-semibold text-[#1657D9] underline cursor-pointer"
                                                >
                                                  Assign Now
                                                </button>
                                              )}
                                            </div>
                                          )}
                                        </div>
                                      </div>
                                    ))}
                                  </div>
                                )}

                                {/* Section 2B: SEC Elective Group Offerings (Intelligent Alternative Option Grouping) */}
                                {electiveGroups.map((group) => (
                                  <div key={group.groupName} className="p-4 rounded-xl bg-amber-50/50 border border-amber-200/80 shadow-xs space-y-3">
                                    <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-1.5 pb-2 border-b border-amber-200/60">
                                      <div className="flex items-center space-x-2">
                                        <span className="px-2 py-0.5 rounded text-[10px] font-bold uppercase tracking-wider bg-amber-200/80 text-amber-900 border border-amber-300">
                                          Elective Group
                                        </span>
                                        <h4 className="text-xs font-bold text-amber-950">
                                          {group.groupName} (Alternative Options)
                                        </h4>
                                      </div>
                                      <span className="text-[11px] font-bold text-amber-800 bg-amber-100 px-2 py-0.5 rounded-full border border-amber-300">
                                        {group.hiddenSubjects.length === 0
                                          ? `Choose 1 of ${group.allSubjects.length} Options (2.0 Credits)`
                                          : `Alternative Offering • 1 of ${group.allSubjects.length} Options Matches Filter`}
                                      </span>
                                    </div>

                                    <p className="text-[11px] text-amber-800 leading-relaxed">
                                      Students fulfill this curriculum requirement by completing <strong>either Option A or Option B</strong>. Both courses are gazetted University of Mumbai syllabus options.
                                    </p>

                                    <div className="space-y-2.5">
                                      {/* Matching Elective Options */}
                                      {group.matchingSubjects.map((subj) => (
                                        <div key={subj.id} className="p-3 rounded-xl border border-amber-200 bg-white shadow-2xs space-y-2 hover:border-amber-300 transition-colors">
                                          <div className="flex items-start justify-between gap-3">
                                            <div className="space-y-1.5 flex-1">
                                              <div className="flex flex-wrap items-center gap-1.5">
                                                <span className="px-2 py-0.5 rounded-md text-[10px] font-bold bg-amber-100 text-amber-900 border border-amber-300">
                                                  {subj.metadata?.electiveOption || "Elective"}
                                                </span>
                                                <span className="font-mono text-xs font-bold text-[#1657D9] bg-blue-50 px-2 py-0.5 rounded border border-blue-200">
                                                  {subj.code}
                                                </span>
                                                <span className="font-bold text-xs text-slate-900">
                                                  {subj.title}
                                                </span>
                                              </div>

                                              <div className="flex flex-wrap items-center gap-1.5 pt-0.5">
                                                <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-amber-50 text-amber-700 border border-amber-200">
                                                  Skill Enhancement (SEC)
                                                </span>
                                                <span className="px-2 py-0.5 rounded-full text-[10px] font-medium bg-slate-50 text-slate-600 border border-slate-200">
                                                  {subj.subjectType === "THEORY" ? "Theory (TH)" : "Practical (PR)"}
                                                </span>
                                                <span className="px-2 py-0.5 rounded-full text-[10px] font-bold text-slate-800 bg-slate-100 border border-slate-200">
                                                  {subj.credits} Credits
                                                </span>
                                                <span className="px-2 py-0.5 rounded-full text-[10px] font-semibold bg-emerald-50 text-emerald-800 border border-emerald-200 flex items-center space-x-1">
                                                  <span className="w-1.5 h-1.5 rounded-full bg-emerald-500" />
                                                  <span>Verified • MU Circular</span>
                                                </span>
                                              </div>
                                            </div>

                                            <button
                                              type="button"
                                              onClick={() => setProvenanceSubject(subj)}
                                              className="shrink-0 px-2.5 py-1 text-[10px] font-bold text-[#1657D9] bg-blue-50 hover:bg-blue-100 border border-blue-200 rounded-lg transition-colors flex items-center space-x-1 cursor-pointer"
                                              title="Inspect syllabus provenance and circular details"
                                            >
                                              <Icon name="document-text" className="w-3.5 h-3.5" />
                                              <span>Details</span>
                                            </button>
                                          </div>

                                          {/* Assigned Faculty Section for Elective Option */}
                                          <div className="pt-2 border-t border-slate-100 space-y-1.5">
                                            <div className="flex items-center justify-between">
                                              <span className="text-[10px] font-bold uppercase tracking-wider text-slate-500 flex items-center space-x-1">
                                                <Icon name="users" className="w-3 h-3 text-[#1657D9]" />
                                                <span>Faculty Assignments</span>
                                              </span>
                                              {canManageAcademics && (
                                                <button
                                                  type="button"
                                                  onClick={() => handleOpenAssignModal(subj, activeSem)}
                                                  className="px-2 py-0.5 rounded text-[10px] font-bold text-[#1657D9] bg-blue-50 hover:bg-blue-100 border border-blue-200 transition-colors flex items-center space-x-1 cursor-pointer"
                                                >
                                                  <span>+ Assign Faculty</span>
                                                </button>
                                              )}
                                            </div>

                                            {subj.teachingAssignments && subj.teachingAssignments.length > 0 ? (
                                              <div className="space-y-1">
                                                {subj.teachingAssignments.map((ta) => (
                                                  <div key={ta.id} className="flex items-center justify-between text-xs bg-slate-50 p-2 rounded-lg border border-slate-200/60">
                                                    <span className="font-semibold text-slate-800 text-xs">{ta.staff.fullName}</span>
                                                    <div className="flex items-center space-x-1">
                                                      <a
                                                        href={`/modules/faculty?staffId=${ta.staff.id}`}
                                                        className="px-2 py-0.5 rounded text-[10px] font-medium text-[#1657D9] bg-white border border-blue-200 hover:bg-blue-50"
                                                      >
                                                        Profile
                                                      </a>
                                                      {canManageAcademics && (
                                                        <button
                                                          type="button"
                                                          onClick={() => handleRemoveAssignment(ta.id, ta.staff.fullName, subj.title)}
                                                          className="px-2 py-0.5 rounded text-[10px] font-medium text-red-600 bg-white border border-red-200 hover:bg-red-50 cursor-pointer"
                                                        >
                                                          Remove
                                                        </button>
                                                      )}
                                                    </div>
                                                  </div>
                                                ))}
                                              </div>
                                            ) : (
                                              <div className="text-[10px] text-amber-700 bg-amber-50 p-1.5 rounded-lg border border-amber-200/60 flex items-center justify-between">
                                                <span>No faculty assignment registered</span>
                                                {canManageAcademics && (
                                                  <button
                                                    type="button"
                                                    onClick={() => handleOpenAssignModal(subj, activeSem)}
                                                    className="font-semibold text-[#1657D9] underline cursor-pointer"
                                                  >
                                                    Assign Now
                                                  </button>
                                                )}
                                              </div>
                                            )}
                                          </div>
                                        </div>
                                      ))}

                                      {/* Milestone 1C.1: Companion Alternative Options Hidden by Active Search/Filter */}
                                      {group.hiddenSubjects.map((hiddenSubj) => (
                                        <div
                                          key={hiddenSubj.id}
                                          className="p-3 rounded-xl border border-dashed border-amber-300 bg-amber-50/40 space-y-2 opacity-90 transition-opacity hover:opacity-100"
                                        >
                                          <div className="flex items-start justify-between gap-3">
                                            <div className="space-y-1.5 flex-1">
                                              <div className="flex flex-wrap items-center gap-1.5">
                                                <span className="px-2 py-0.5 rounded-md text-[10px] font-semibold bg-amber-100/70 text-amber-900 border border-amber-200">
                                                  {hiddenSubj.metadata?.electiveOption || "Alternative"} (Filtered Out)
                                                </span>
                                                <span className="font-mono text-xs font-bold text-slate-600 bg-slate-100 px-2 py-0.5 rounded border border-slate-200">
                                                  {hiddenSubj.code}
                                                </span>
                                                <span className="font-bold text-xs text-slate-700">
                                                  {hiddenSubj.title}
                                                </span>
                                              </div>

                                              <p className="text-[11px] text-amber-700/90 italic">
                                                Alternative curriculum track for this offering. Hidden from main results because it does not match active filter keyword &quot;{subjectSearch || subjectVerticalFilter}&quot;.
                                              </p>

                                              <div className="flex flex-wrap items-center gap-1.5 pt-0.5">
                                                <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-amber-50 text-amber-700 border border-amber-200">
                                                  Skill Enhancement (SEC)
                                                </span>
                                                <span className="px-2 py-0.5 rounded-full text-[10px] font-medium bg-slate-50 text-slate-600 border border-slate-200">
                                                  {hiddenSubj.subjectType === "THEORY" ? "Theory (TH)" : "Practical (PR)"}
                                                </span>
                                                <span className="px-2 py-0.5 rounded-full text-[10px] font-bold text-slate-800 bg-slate-100 border border-slate-200">
                                                  {hiddenSubj.credits} Credits
                                                </span>
                                                <span className="px-2 py-0.5 rounded-full text-[10px] font-semibold bg-emerald-50 text-emerald-800 border border-emerald-200 flex items-center space-x-1">
                                                  <span className="w-1.5 h-1.5 rounded-full bg-emerald-500" />
                                                  <span>Verified • MU Circular</span>
                                                </span>
                                              </div>
                                            </div>

                                            <button
                                              type="button"
                                              onClick={() => setProvenanceSubject(hiddenSubj)}
                                              className="shrink-0 px-2.5 py-1 text-[10px] font-bold text-slate-700 bg-white hover:bg-slate-100 border border-slate-200 rounded-lg transition-colors flex items-center space-x-1 cursor-pointer"
                                              title="Inspect syllabus provenance and circular details"
                                            >
                                              <Icon name="document-text" className="w-3.5 h-3.5 text-slate-500" />
                                              <span>Details</span>
                                            </button>
                                          </div>
                                        </div>
                                      ))}
                                    </div>
                                  </div>
                                ))}
                              </div>
                            )}
                          </div>
                        </div>

                        {/* Section 3: Enrolled Student Cohort */}
                        <div className="space-y-3 pt-2">
                          <div className="flex items-center justify-between">
                            <span className="text-xs font-bold uppercase tracking-wider text-slate-500 flex items-center space-x-1.5">
                              <Icon name="academic-cap" className="w-4 h-4 text-slate-400" />
                              <span>Enrolled Student Cohort (Semester {activeSem.semesterNumber})</span>
                            </span>
                            <span className="text-[11px] text-slate-400">{activeSem.enrolments?.length || 0} active enrolments</span>
                          </div>

                          {(!activeSem.enrolments || activeSem.enrolments.length === 0) ? (
                            <div className="p-6 rounded-xl bg-slate-50 border border-dashed border-slate-300 text-center text-xs text-slate-500">
                              No students actively enrolled in Semester {activeSem.semesterNumber}.
                            </div>
                          ) : (
                            <div className="overflow-hidden rounded-xl border border-slate-200 bg-white shadow-xs">
                              <table className="w-full text-left border-collapse text-xs">
                                <thead>
                                  <tr className="border-b border-slate-200 bg-slate-50/70 text-slate-600 font-bold uppercase tracking-wider text-[10px]">
                                    <th className="py-2.5 px-4">Student Name</th>
                                    <th className="py-2.5 px-4">PRN</th>
                                    <th className="py-2.5 px-4">Roll Number</th>
                                    <th className="py-2.5 px-4">Enrolment Status</th>
                                    <th className="py-2.5 px-4 text-right">Student Dossier</th>
                                  </tr>
                                </thead>
                                <tbody className="divide-y divide-slate-100 text-slate-700">
                                  {activeSem.enrolments.map((enr) => (
                                    <tr key={enr.id} className="hover:bg-slate-50/60 transition-colors">
                                      <td className="py-3 px-4 font-semibold text-slate-900 flex items-center space-x-2.5">
                                        <div className="w-7 h-7 rounded-full bg-slate-100 text-slate-700 font-bold flex items-center justify-center text-xs border border-slate-200">
                                          {enr.student.fullName.charAt(0)}
                                        </div>
                                        <span>{enr.student.fullName}</span>
                                      </td>
                                      <td className="py-3 px-4 font-mono text-slate-600">{enr.student.prn}</td>
                                      <td className="py-3 px-4 font-mono font-medium text-slate-900">{enr.student.rollNumber}</td>
                                      <td className="py-3 px-4">
                                        <span className="px-2 py-0.5 rounded-full text-[10px] font-semibold bg-emerald-50 text-emerald-700 border border-emerald-200">
                                          {enr.status}
                                        </span>
                                      </td>
                                      <td className="py-3 px-4 text-right">
                                        <a
                                          href={`/modules/students?studentId=${enr.student.id}&prn=${enr.student.prn}`}
                                          className="inline-flex items-center space-x-1 px-2.5 py-1 rounded-lg text-xs font-semibold text-[#1657D9] bg-blue-50 border border-blue-200 hover:bg-blue-100 transition-colors"
                                        >
                                          <span>View Student</span>
                                          <Icon name="arrow-right" className="w-3 h-3" />
                                        </a>
                                      </td>
                                    </tr>
                                  ))}
                                </tbody>
                              </table>
                            </div>
                          )}
                        </div>

                      </div>
                    );
                  })()}
                </>
              )}
            </div>

            {/* Modal Footer */}
            <div className="px-6 py-4 border-t border-slate-200 bg-slate-50 flex items-center justify-between text-xs">
              <div className="flex items-center space-x-2 text-slate-500">
                <span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse" />
                <span>Live SQLite Academic Record • Verified</span>
              </div>
              <button
                onClick={handleCloseDetails}
                className="px-4 py-2 rounded-xl bg-slate-900 text-white font-semibold text-xs hover:bg-slate-800 transition-colors shadow-xs"
              >
                Close Dossier
              </button>
            </div>

          </div>
        </div>
      )}

      {/* Action Success Toast */}
      {actionSuccessToast && (
        <div className="fixed bottom-6 right-6 z-50 bg-slate-900 text-white text-xs px-4 py-2.5 rounded-xl shadow-lg border border-slate-700 flex items-center space-x-2 animate-fade-in">
          <Icon name="check-circle" className="w-4 h-4 text-emerald-400 shrink-0" />
          <span>{actionSuccessToast}</span>
        </div>
      )}

      {/* Modal: Curriculum Provenance Inspector (Milestone 1C & 1C.1) */}
      {provenanceSubject && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/40 backdrop-blur-2xs p-4 animate-in fade-in duration-200"
          onClick={() => setProvenanceSubject(null)}
          role="dialog"
          aria-modal="true"
          aria-labelledby="provenance-modal-title"
        >
          <div
            className="w-full max-w-lg rounded-2xl bg-white p-6 shadow-xl border border-slate-200 space-y-5 animate-in zoom-in-95 duration-200 max-h-[90vh] overflow-y-auto"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="flex items-start justify-between border-b border-slate-100 pb-3">
              <div className="space-y-1">
                <div className="flex items-center space-x-2">
                  <span className="font-mono text-xs font-bold text-[#1657D9] bg-blue-50 px-2 py-0.5 rounded border border-blue-200">
                    {provenanceSubject.code}
                  </span>
                  <span className="text-xs font-bold text-slate-500 uppercase tracking-wider">
                    Curriculum Provenance
                  </span>
                </div>
                <h3 id="provenance-modal-title" className="text-base font-bold text-slate-900 leading-snug">
                  {provenanceSubject.title}
                </h3>
              </div>
              <button
                type="button"
                onClick={() => setProvenanceSubject(null)}
                className="rounded-lg p-1 text-slate-400 hover:bg-slate-100 hover:text-slate-600 transition-colors cursor-pointer"
                title="Close Inspector"
              >
                ✕
              </button>
            </div>

            {/* Provenance Metadata Grid */}
            <div className="space-y-3">
              <div className="grid grid-cols-2 gap-3 text-xs">
                <div className="p-3 rounded-xl bg-slate-50 border border-slate-200/80 space-y-1">
                  <span className="text-[10px] font-bold uppercase tracking-wider text-slate-400 block">NEP 2020 Vertical</span>
                  <span className="font-bold text-slate-800 block text-xs">
                    {provenanceSubject.metadata?.vertical || "Unclassified Baseline"}
                  </span>
                </div>

                <div className="p-3 rounded-xl bg-slate-50 border border-slate-200/80 space-y-1">
                  <span className="text-[10px] font-bold uppercase tracking-wider text-slate-400 block">Course Classification</span>
                  <span className="font-bold text-slate-800 block text-xs">
                    {provenanceSubject.subjectType === "THEORY"
                      ? "Theory (TH)"
                      : provenanceSubject.subjectType === "PRACTICAL" || provenanceSubject.subjectType === "PRACTICAL_KITCHEN"
                      ? "Practical (PR)"
                      : provenanceSubject.subjectType === "OJT"
                      ? "On-Job Training (OJT)"
                      : provenanceSubject.subjectType}
                  </span>
                </div>

                <div className="p-3 rounded-xl bg-slate-50 border border-slate-200/80 space-y-1">
                  <span className="text-[10px] font-bold uppercase tracking-wider text-slate-400 block">Academic Weighting</span>
                  <span className="font-bold text-slate-800 block text-xs">
                    {provenanceSubject.credits} Academic Credits
                  </span>
                </div>

                <div className="p-3 rounded-xl bg-slate-50 border border-slate-200/80 space-y-1">
                  <span className="text-[10px] font-bold uppercase tracking-wider text-slate-400 block">Curriculum Status</span>
                  <span className="font-bold block text-xs text-emerald-700">
                    {provenanceSubject.metadata?.isVerified ? "Verified • MU Circular" : "Baseline Prototype"}
                  </span>
                </div>
              </div>

              {/* Verified Institutional Provenance Details */}
              {provenanceSubject.metadata?.isManifestMatched ? (
                <div className="p-4 rounded-xl bg-blue-50/60 border border-blue-200 space-y-2.5">
                  <span className="text-[10px] font-bold uppercase tracking-wider text-[#1657D9] flex items-center space-x-1.5">
                    <Icon name="award" className="w-3.5 h-3.5 text-[#1657D9]" />
                    <span>University of Mumbai Gazetted Syllabus Reference</span>
                  </span>

                  <div className="space-y-1.5 text-xs">
                    <div className="flex items-start justify-between py-1 border-b border-blue-100">
                      <span className="text-slate-500 font-medium">Primary Circular PDF:</span>
                      <span className="font-mono font-semibold text-slate-800 text-[11px]">
                        {provenanceSubject.metadata.sourcePdf}
                      </span>
                    </div>

                    <div className="flex items-start justify-between py-1 border-b border-blue-100">
                      <span className="text-slate-500 font-medium">Circular Page Number:</span>
                      <span className="font-semibold text-slate-800">
                        Page {provenanceSubject.metadata.sourcePage}
                      </span>
                    </div>

                    <div className="flex items-start justify-between py-1 border-b border-blue-100">
                      <span className="text-slate-500 font-medium">Academic Council Resolution:</span>
                      <span className="font-semibold text-slate-800 text-right max-w-[260px] text-[11px]">
                        {provenanceSubject.metadata.acResolution}
                      </span>
                    </div>

                    {provenanceSubject.metadata.electiveGroup && (
                      <div className="flex items-start justify-between py-1">
                        <span className="text-slate-500 font-medium">Elective Group Relationship:</span>
                        <span className="font-semibold text-amber-800">
                          {provenanceSubject.metadata.electiveOption} ({provenanceSubject.metadata.electiveGroup})
                        </span>
                      </div>
                    )}
                  </div>
                </div>
              ) : (
                <div className="p-4 rounded-xl bg-slate-100/80 border border-slate-200 space-y-1.5 text-xs text-slate-600">
                  <span className="font-bold text-slate-800 block text-xs">Institutional Baseline Prototype Record</span>
                  <p className="text-[11px] text-slate-500 leading-relaxed">
                    This subject was registered during initial ERP baseline development. Formal University of Mumbai circular resolution and primary syllabus PDF citations have not yet been gazetted for this record.
                  </p>
                </div>
              )}
            </div>

            <div className="flex justify-end pt-2 border-t border-slate-100">
              <button
                type="button"
                onClick={() => setProvenanceSubject(null)}
                className="px-4 py-2 rounded-xl text-xs font-bold text-white bg-[#1657D9] hover:bg-blue-700 shadow-xs transition-colors cursor-pointer"
              >
                Close Provenance Inspector
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Provision Division Administrative Modal */}
      {createDivModalSemester && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-xs animate-fade-in">
          <div className="w-full max-w-md bg-white rounded-2xl shadow-2xl border border-slate-200 overflow-hidden flex flex-col max-h-[90vh]">
            <div className="px-5 py-4 border-b border-slate-100 flex items-center justify-between bg-slate-50/80">
              <div>
                <h3 className="text-sm font-bold text-slate-800 flex items-center space-x-1.5">
                  <Icon name="users" className="w-4 h-4 text-[#1657D9]" />
                  <span>Provision Academic Division</span>
                </h3>
                <p className="text-[11px] text-slate-500 mt-0.5">
                  {programmeDetails?.name} • Semester {createDivModalSemester.semesterNumber}
                </p>
              </div>
              <button
                type="button"
                onClick={handleCloseCreateDivModal}
                disabled={isCreatingDiv}
                className="w-7 h-7 flex items-center justify-center text-slate-400 hover:text-slate-600 rounded-lg hover:bg-slate-100 transition-colors cursor-pointer"
              >
                <Icon name="x-mark" className="w-4 h-4" />
              </button>
            </div>

            <form onSubmit={handleSaveDivision} className="p-5 space-y-4 text-xs text-slate-700 overflow-y-auto">
              {createDivError && (
                <div className="p-3 rounded-xl bg-red-50 border border-red-200 text-red-700 flex items-start space-x-2">
                  <Icon name="exclamation-circle" className="w-4 h-4 text-red-600 shrink-0 mt-0.5" />
                  <span className="text-[11px] leading-relaxed">{createDivError}</span>
                </div>
              )}

              <div className="p-2.5 rounded-xl bg-blue-50/70 border border-blue-200 text-[11px] text-blue-900 flex items-start space-x-2">
                <Icon name="check-circle" className="w-4 h-4 text-[#1657D9] shrink-0 mt-0.5" />
                <p>
                  Divisions establish class cohorts for student enrolments and faculty assignments within Semester {createDivModalSemester.semesterNumber}.
                </p>
              </div>

              <div>
                <label className="block text-slate-700 font-semibold mb-1">
                  Division Name <span className="text-red-500">*</span>
                </label>
                <div className="flex items-center space-x-1.5 mb-2">
                  <span className="text-[10px] text-slate-400">Quick Picks:</span>
                  {["Div A", "Div B", "Div C", "Div D"].map((opt) => (
                    <button
                      key={opt}
                      type="button"
                      onClick={() => setNewDivName(opt)}
                      className={`px-2 py-0.5 rounded text-[10px] font-semibold transition-colors cursor-pointer ${
                        newDivName === opt
                          ? "bg-[#1657D9] text-white"
                          : "bg-slate-100 text-slate-600 hover:bg-slate-200"
                      }`}
                    >
                      {opt}
                    </button>
                  ))}
                </div>
                <input
                  type="text"
                  value={newDivName}
                  disabled={isCreatingDiv}
                  onChange={(e) => setNewDivName(e.target.value)}
                  placeholder="e.g. Div A, Div B, Batch 1"
                  className="w-full px-3 py-2 rounded-xl bg-slate-50 border border-slate-200 text-slate-900 focus:outline-none focus:ring-1 focus:ring-[#1657D9] text-xs font-semibold"
                  required
                />
              </div>

              <div>
                <label className="block text-slate-700 font-semibold mb-1">Maximum Student Capacity</label>
                <input
                  type="number"
                  min={1}
                  max={200}
                  value={newDivCapacity}
                  disabled={isCreatingDiv}
                  onChange={(e) => setNewDivCapacity(Number(e.target.value))}
                  className="w-full px-3 py-2 rounded-xl bg-slate-50 border border-slate-200 text-slate-900 focus:outline-none focus:ring-1 focus:ring-[#1657D9] text-xs font-medium"
                  required
                />
                <span className="text-[10px] text-slate-400 mt-1 block">Default standard capacity is 60 students per division.</span>
              </div>

              <div className="pt-3 border-t border-slate-100 flex items-center justify-end space-x-2">
                <button
                  type="button"
                  onClick={handleCloseCreateDivModal}
                  disabled={isCreatingDiv}
                  className="px-4 py-2 rounded-xl text-xs font-semibold text-slate-600 hover:bg-slate-100 transition-colors cursor-pointer"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={isCreatingDiv || !newDivName.trim()}
                  className="px-4 py-2 rounded-xl text-xs font-semibold text-white bg-[#1657D9] hover:bg-[#1248B8] transition-colors shadow-xs flex items-center space-x-1.5 cursor-pointer disabled:opacity-50"
                >
                  {isCreatingDiv && <span className="w-3 h-3 border-2 border-white/30 border-t-white rounded-full animate-spin"></span>}
                  <span>{isCreatingDiv ? "Creating..." : "Confirm Division"}</span>
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Assign Faculty Administrative Modal */}
      {assignModalSubject && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-xs animate-fade-in">
          <div className="w-full max-w-md bg-white rounded-2xl shadow-2xl border border-slate-200 overflow-hidden flex flex-col max-h-[90vh]">
            <div className="px-5 py-4 border-b border-slate-100 flex items-center justify-between bg-slate-50/80">
              <div>
                <h3 className="text-sm font-bold text-slate-800 flex items-center space-x-1.5">
                  <Icon name="academic-cap" className="w-4 h-4 text-[#1657D9]" />
                  <span>Assign Teaching Faculty</span>
                </h3>
                <p className="text-[11px] text-slate-500 mt-0.5">
                  {assignModalSubject.code}: {assignModalSubject.title} (Semester {assignModalSemesterNumber})
                </p>
              </div>
              <button
                type="button"
                onClick={handleCloseAssignModal}
                disabled={isAssigning}
                className="w-7 h-7 flex items-center justify-center text-slate-400 hover:text-slate-600 rounded-lg hover:bg-slate-100 transition-colors cursor-pointer"
              >
                <Icon name="x-mark" className="w-4 h-4" />
              </button>
            </div>

            <form onSubmit={handleSaveAssignment} className="p-5 space-y-4 text-xs text-slate-700 overflow-y-auto">
              {assignError && (
                <div className="p-3 rounded-xl bg-red-50 border border-red-200 text-red-700 flex items-start space-x-2">
                  <Icon name="exclamation-circle" className="w-4 h-4 text-red-600 shrink-0 mt-0.5" />
                  <span className="text-[11px] leading-relaxed">{assignError}</span>
                </div>
              )}

              <div className="p-2.5 rounded-xl bg-blue-50/70 border border-blue-200 text-[11px] text-blue-900 flex items-start space-x-2">
                <Icon name="check-circle" className="w-4 h-4 text-[#1657D9] shrink-0 mt-0.5" />
                <p>
                  Relational Verification: Only valid faculty members and compatible division cohorts belonging to Semester {assignModalSemesterNumber} can be assigned.
                </p>
              </div>

              <div>
                <label className="block text-slate-700 font-semibold mb-1">
                  Select Faculty Member <span className="text-red-500">*</span>
                </label>
                <select
                  value={selectedStaffId}
                  disabled={isAssigning}
                  onChange={(e) => setSelectedStaffId(e.target.value)}
                  className="w-full px-3 py-2 rounded-xl bg-slate-50 border border-slate-200 text-slate-900 focus:outline-none focus:ring-1 focus:ring-[#1657D9] text-xs font-medium cursor-pointer"
                  required
                >
                  {staffList.length === 0 ? (
                    <option value="">No faculty loaded</option>
                  ) : (
                    staffList.map((s) => (
                      <option key={s.id} value={s.id}>
                        {s.fullName} ({s.designation}{s.department ? ` - ${s.department.name}` : ""})
                      </option>
                    ))
                  )}
                </select>
              </div>

              <div>
                <label className="block text-slate-700 font-semibold mb-1">Target Division Cohort</label>
                <select
                  value={selectedDivisionId}
                  disabled={isAssigning}
                  onChange={(e) => setSelectedDivisionId(e.target.value)}
                  className="w-full px-3 py-2 rounded-xl bg-slate-50 border border-slate-200 text-slate-900 focus:outline-none focus:ring-1 focus:ring-[#1657D9] text-xs font-medium cursor-pointer"
                >
                  <option value="">All Divisions / Theory Lecture (Cohort Wide)</option>
                  {assignModalDivisions.map((d) => (
                    <option key={d.id} value={d.id}>
                      Division {d.name} (Max Capacity: {d.maxCapacity})
                    </option>
                  ))}
                </select>
                {assignModalDivisions.length === 0 && (
                  <p className="text-[10px] text-slate-400 mt-1">
                    No specific divisions provisioned for this semester. Assignment will apply cohort-wide.
                  </p>
                )}
              </div>

              <div>
                <label className="block text-slate-700 font-semibold mb-1">Weekly Contact Hours</label>
                <input
                  type="number"
                  min={1}
                  max={24}
                  value={weeklyHours}
                  disabled={isAssigning}
                  onChange={(e) => setWeeklyHours(Number(e.target.value))}
                  className="w-full px-3 py-2 rounded-xl bg-slate-50 border border-slate-200 text-slate-900 focus:outline-none focus:ring-1 focus:ring-[#1657D9] text-xs font-medium"
                  required
                />
              </div>

              <div className="pt-3 border-t border-slate-100 flex items-center justify-end space-x-2">
                <button
                  type="button"
                  onClick={handleCloseAssignModal}
                  disabled={isAssigning}
                  className="px-4 py-2 rounded-xl text-xs font-semibold text-slate-600 hover:bg-slate-100 transition-colors cursor-pointer"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={isAssigning || !selectedStaffId}
                  className="px-4 py-2 rounded-xl text-xs font-semibold text-white bg-[#1657D9] hover:bg-[#1248B8] transition-colors shadow-xs flex items-center space-x-1.5 cursor-pointer disabled:opacity-50"
                >
                  {isAssigning && <span className="w-3 h-3 border-2 border-white/30 border-t-white rounded-full animate-spin"></span>}
                  <span>{isAssigning ? "Assigning..." : "Confirm Assignment"}</span>
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};



