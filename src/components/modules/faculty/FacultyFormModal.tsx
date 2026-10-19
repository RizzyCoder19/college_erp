"use client";

import React, { useState, useEffect } from "react";
import { Icon } from "@/components/common/Icon";
import { FacultyRecord, StaffCategory, StaffStatus, EmploymentType } from "@/types/faculty";

interface FacultyFormModalProps {
  isOpen: boolean;
  mode: "add" | "edit";
  initialData: FacultyRecord | null;
  departments?: Array<{ id: string; code: string; name: string }>;
  onClose: () => void;
  onSave: (record: FacultyRecord) => Promise<{ success: boolean; error?: string } | boolean | void>;
}

interface FormErrors {
  fullName?: string;
  staffId?: string;
  designation?: string;
  department?: string;
  email?: string;
  phone?: string;
  officeLocation?: string;
  workloadHours?: string;
  qualification?: string;
  specialization?: string;
}

export const FacultyFormModal: React.FC<FacultyFormModalProps> = ({
  isOpen,
  mode,
  initialData,
  departments,
  onClose,
  onSave,
}) => {
  const [fullName, setFullName] = useState(initialData?.fullName || "");
  const [staffId, setStaffId] = useState(initialData?.staffId || "");
  const [designation, setDesignation] = useState(initialData?.designation || "");
  const defaultDept = departments && departments.length > 0 ? departments[0].name : "Hospitality & Culinary Arts";
  const [department, setDepartment] = useState(initialData?.department || defaultDept);
  const [category, setCategory] = useState<StaffCategory>(initialData?.category || "Teaching Faculty");
  const [employmentType, setEmploymentType] = useState<EmploymentType>(initialData?.employmentType || "Full-Time Permanent");
  const [email, setEmail] = useState(initialData?.email || "");
  const [phone, setPhone] = useState(initialData?.phone || "+91 ");
  const [officeLocation, setOfficeLocation] = useState(initialData?.officeLocation || "");
  const [workloadHours, setWorkloadHours] = useState<number>(initialData?.workloadHours ?? 18);
  const [status, setStatus] = useState<StaffStatus>(initialData?.status || "Active");
  const [qualification, setQualification] = useState(initialData?.qualification || "");
  const [specialization, setSpecialization] = useState(initialData?.specialization || "");
  const [teachingSubjectsInput, setTeachingSubjectsInput] = useState(
    initialData?.teachingSubjects?.join(", ") || ""
  );
  const [assignedProgrammesInput, setAssignedProgrammesInput] = useState(
    initialData?.assignedProgrammes?.join(", ") || "B.Sc. Hospitality Management"
  );

  const [errors, setErrors] = useState<FormErrors>({});
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [serverError, setServerError] = useState<string | null>(null);

  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === "Escape" && isOpen && !isSubmitting) {
        onClose();
      }
    };
    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [isOpen, onClose, isSubmitting]);

  if (!isOpen) return null;

  const validate = (): boolean => {
    const newErrors: FormErrors = {};

    if (!fullName.trim() || fullName.trim().length < 3) {
      newErrors.fullName = "Full name must be at least 3 characters";
    }
    if (!staffId.trim()) {
      newErrors.staffId = "Staff ID is required (e.g. RPIHM-FAC-125)";
    }
    if (!designation.trim()) {
      newErrors.designation = "Official designation is required";
    }
    if (!department.trim()) {
      newErrors.department = "Department assignment is required";
    }
    if (!email.trim() || !email.includes("@") || !email.includes(".")) {
      newErrors.email = "A valid campus email is required";
    }
    if (!phone.trim() || phone.trim().length < 8) {
      newErrors.phone = "Valid contact phone/extension is required";
    }
    if (!officeLocation.trim()) {
      newErrors.officeLocation = "Campus cabin/studio location is required";
    }
    if (isNaN(workloadHours) || workloadHours < 1 || workloadHours > 60) {
      newErrors.workloadHours = "Workload must be between 1 and 60 hours/week";
    }
    if (!qualification.trim()) {
      newErrors.qualification = "Highest qualification is required";
    }
    if (!specialization.trim()) {
      newErrors.specialization = "Specialization area is required";
    }

    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (isSubmitting) return;
    if (!validate()) return;

    setServerError(null);
    setIsSubmitting(true);

    try {
      const subjects = teachingSubjectsInput
        .split(",")
        .map((s) => s.trim())
        .filter((s) => s.length > 0);

      const programmes = assignedProgrammesInput
        .split(",")
        .map((p) => p.trim())
        .filter((p) => p.length > 0);

      const record: FacultyRecord = {
        id: initialData?.id || `fac-${Date.now()}`,
        staffId: staffId.trim().toUpperCase(),
        fullName: fullName.trim(),
        designation: designation.trim(),
        department: department.trim(),
        category,
        employmentType,
        email: email.trim().toLowerCase(),
        phone: phone.trim(),
        officeLocation: officeLocation.trim(),
        workloadHours: Number(workloadHours),
        status,
        qualification: qualification.trim(),
        specialization: specialization.trim(),
        joinedDate: initialData?.joinedDate || new Date().toISOString().split("T")[0],
        teachingSubjects: subjects.length > 0 ? subjects : ["Foundational Orientation"],
        assignedProgrammes: programmes.length > 0 ? programmes : ["General Undergraduate Studies"],
        avatarInitial: fullName.trim().charAt(0).toUpperCase(),
        isSampleRecord: false,
      };

      const result = await onSave(record);

      if (typeof result === "object" && result !== null && "success" in result) {
        if (!result.success) {
          setServerError(result.error || "Failed to persist staff record.");
          return;
        }
      } else if (result === false) {
        setServerError("Failed to persist staff record.");
        return;
      }

      onClose();
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : "An unexpected error occurred while saving.";
      setServerError(msg);
    } finally {
      setIsSubmitting(false);
    }
  };
  return (
    <div
      role="dialog"
      aria-modal="true"
      aria-labelledby="faculty-form-title"
      className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-sm animate-in fade-in duration-200"
      onClick={onClose}
    >
      <div
        className="w-full max-w-2xl bg-white rounded-2xl shadow-2xl border border-slate-200 max-h-[90vh] flex flex-col overflow-hidden"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-slate-200 bg-slate-50/70">
          <div className="flex items-center space-x-2.5">
            <div className="w-8 h-8 rounded-lg bg-blue-50 text-[#1657D9] border border-blue-200 flex items-center justify-center">
              <Icon name={mode === "add" ? "plus" : "pencil"} className="w-4 h-4" />
            </div>
            <div>
              <h3 id="faculty-form-title" className="text-base font-bold text-slate-900">
                {mode === "add" ? "Add Faculty / Staff Member" : "Edit Staff Record"}
              </h3>
              <p className="text-xs text-slate-500">
                {mode === "add"
                  ? "Register a new academic or operational staff member"
                  : `Updating profile of ${initialData?.fullName || "staff member"}`}
              </p>
            </div>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="w-8 h-8 rounded-lg flex items-center justify-center text-slate-400 hover:text-slate-700 hover:bg-slate-200 transition-colors"
            aria-label="Close form"
          >
            <Icon name="x-mark" className="w-5 h-5" />
          </button>
        </div>

        {/* Scrollable Form Body */}
        <form id="faculty-form" onSubmit={handleSubmit} className="p-6 space-y-6 overflow-y-auto">
          {serverError && (
            <div className="p-3.5 rounded-xl bg-red-50 border border-red-200 text-[#D92534] flex items-start space-x-2.5 animate-in fade-in">
              <Icon name="exclamation-circle" className="h-5 w-5 shrink-0 mt-0.5 text-[#D92534]" />
              <div className="flex-1">
                <p className="font-bold text-xs text-red-900">Unable to Save Staff Record</p>
                <p className="text-[11px] text-red-700 mt-0.5 leading-relaxed">{serverError}</p>
              </div>
            </div>
          )}
          {/* Basic Identity */}
          <div className="space-y-4">
            <h4 className="text-xs font-bold uppercase tracking-wider text-slate-400 flex items-center space-x-1.5">
              <Icon name="user" className="w-3.5 h-3.5 text-[#1657D9]" />
              <span>Identity & Roster Assignment</span>
            </h4>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">
                  Full Name <span className="text-red-500">*</span>
                </label>
                <input
                  type="text"
                  value={fullName}
                  onChange={(e) => setFullName(e.target.value)}
                  placeholder="e.g. Chef Vikramaditya Kapoor"
                  className={`w-full px-3 py-2 text-xs rounded-xl border ${
                    errors.fullName ? "border-red-400 bg-red-50/30" : "border-slate-200"
                  } focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-[#1657D9]`}
                />
                {errors.fullName && <p className="text-[11px] text-red-500 mt-1">{errors.fullName}</p>}
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">
                  Staff ID <span className="text-red-500">*</span>
                </label>
                <input
                  type="text"
                  value={staffId}
                  onChange={(e) => setStaffId(e.target.value)}
                  placeholder="e.g. RPIHM-FAC-125"
                  className={`w-full px-3 py-2 text-xs font-mono rounded-xl border ${
                    errors.staffId ? "border-red-400 bg-red-50/30" : "border-slate-200"
                  } focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-[#1657D9]`}
                />
                {errors.staffId && <p className="text-[11px] text-red-500 mt-1">{errors.staffId}</p>}
              </div>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">
                  Designation <span className="text-red-500">*</span>
                </label>
                <input
                  type="text"
                  value={designation}
                  onChange={(e) => setDesignation(e.target.value)}
                  placeholder="e.g. Executive Chef Instructor / Assistant Professor"
                  className={`w-full px-3 py-2 text-xs rounded-xl border ${
                    errors.designation ? "border-red-400 bg-red-50/30" : "border-slate-200"
                  } focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-[#1657D9]`}
                />
                {errors.designation && <p className="text-[11px] text-red-500 mt-1">{errors.designation}</p>}
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">
                  Department <span className="text-red-500">*</span>
                </label>
                <select
                  value={department}
                  onChange={(e) => setDepartment(e.target.value)}
                  className="w-full px-3 py-2 text-xs rounded-xl border border-slate-200 bg-white focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-[#1657D9]"
                >
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
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">Staff Category</label>
                <select
                  value={category}
                  onChange={(e) => setCategory(e.target.value as StaffCategory)}
                  className="w-full px-3 py-2 text-xs rounded-xl border border-slate-200 bg-white focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-[#1657D9]"
                >
                  <option value="Teaching Faculty">Teaching Faculty</option>
                  <option value="Culinary Instructor">Culinary Instructor</option>
                  <option value="Technical Lab Staff">Technical Lab Staff</option>
                  <option value="Administrative Staff">Administrative Staff</option>
                </select>
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">Employment Type</label>
                <select
                  value={employmentType}
                  onChange={(e) => setEmploymentType(e.target.value as EmploymentType)}
                  className="w-full px-3 py-2 text-xs rounded-xl border border-slate-200 bg-white focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-[#1657D9]"
                >
                  <option value="Full-Time Permanent">Full-Time Permanent</option>
                  <option value="Visiting / Adjunct">Visiting / Adjunct</option>
                  <option value="Industry Expert">Industry Expert</option>
                </select>
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">Current Status</label>
                <select
                  value={status}
                  onChange={(e) => setStatus(e.target.value as StaffStatus)}
                  className="w-full px-3 py-2 text-xs rounded-xl border border-slate-200 bg-white focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-[#1657D9]"
                >
                  <option value="Active">Active</option>
                  <option value="In Lab / Kitchen">In Lab / Kitchen</option>
                  <option value="On Leave">On Leave</option>
                  <option value="Sabbatical">Sabbatical</option>
                </select>
              </div>
            </div>
          </div>

          {/* Academic Credentials & Workload */}
          <div className="space-y-4">
            <h4 className="text-xs font-bold uppercase tracking-wider text-slate-400 flex items-center space-x-1.5">
              <Icon name="academic-cap" className="w-3.5 h-3.5 text-emerald-600" />
              <span>Credentials, Workload & Subjects</span>
            </h4>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">
                  Highest Qualification <span className="text-red-500">*</span>
                </label>
                <input
                  type="text"
                  value={qualification}
                  onChange={(e) => setQualification(e.target.value)}
                  placeholder="e.g. M.Sc. Hospitality / Ph.D. Computer Science"
                  className={`w-full px-3 py-2 text-xs rounded-xl border ${
                    errors.qualification ? "border-red-400 bg-red-50/30" : "border-slate-200"
                  } focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-[#1657D9]`}
                />
                {errors.qualification && (
                  <p className="text-[11px] text-red-500 mt-1">{errors.qualification}</p>
                )}
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">
                  Area of Specialization <span className="text-red-500">*</span>
                </label>
                <input
                  type="text"
                  value={specialization}
                  onChange={(e) => setSpecialization(e.target.value)}
                  placeholder="e.g. Classical French Cuisine / Distributed Systems"
                  className={`w-full px-3 py-2 text-xs rounded-xl border ${
                    errors.specialization ? "border-red-400 bg-red-50/30" : "border-slate-200"
                  } focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-[#1657D9]`}
                />
                {errors.specialization && (
                  <p className="text-[11px] text-red-500 mt-1">{errors.specialization}</p>
                )}
              </div>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">
                  Weekly Contact Workload (Hrs)
                </label>
                <input
                  type="number"
                  min="1"
                  max="48"
                  value={workloadHours}
                  onChange={(e) => setWorkloadHours(parseInt(e.target.value, 10) || 0)}
                  className={`w-full px-3 py-2 text-xs rounded-xl border ${
                    errors.workloadHours ? "border-red-400 bg-red-50/30" : "border-slate-200"
                  } focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-[#1657D9]`}
                />
                {errors.workloadHours && (
                  <p className="text-[11px] text-red-500 mt-1">{errors.workloadHours}</p>
                )}
              </div>

              <div className="sm:col-span-2">
                <label className="block text-xs font-semibold text-slate-700 mb-1">
                  Teaching Subjects (comma separated)
                </label>
                <input
                  type="text"
                  value={teachingSubjectsInput}
                  onChange={(e) => setTeachingSubjectsInput(e.target.value)}
                  placeholder="e.g. Classical Cooking, HACCP, Food Science"
                  className="w-full px-3 py-2 text-xs rounded-xl border border-slate-200 focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-[#1657D9]"
                />
              </div>
            </div>

            <div>
              <label className="block text-xs font-semibold text-slate-700 mb-1">
                Assigned Programmes (comma separated)
              </label>
              <input
                type="text"
                value={assignedProgrammesInput}
                onChange={(e) => setAssignedProgrammesInput(e.target.value)}
                placeholder="e.g. B.Sc. Culinary Arts, B.Sc. Hospitality Management"
                className="w-full px-3 py-2 text-xs rounded-xl border border-slate-200 focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-[#1657D9]"
              />
            </div>
          </div>

          {/* Contact & Location */}
          <div className="space-y-4">
            <h4 className="text-xs font-bold uppercase tracking-wider text-slate-400 flex items-center space-x-1.5">
              <Icon name="building-office" className="w-3.5 h-3.5 text-amber-600" />
              <span>Campus Office & Contact Communications</span>
            </h4>

            <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">
                  Campus Email <span className="text-red-500">*</span>
                </label>
                <input
                  type="email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  placeholder="name@sample.rpihm.ac.in"
                  className={`w-full px-3 py-2 text-xs rounded-xl border ${
                    errors.email ? "border-red-400 bg-red-50/30" : "border-slate-200"
                  } focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-[#1657D9]`}
                />
                {errors.email && <p className="text-[11px] text-red-500 mt-1">{errors.email}</p>}
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">
                  Official Phone / Extension <span className="text-red-500">*</span>
                </label>
                <input
                  type="tel"
                  value={phone}
                  onChange={(e) => setPhone(e.target.value)}
                  placeholder="+91 98200 00000"
                  className={`w-full px-3 py-2 text-xs rounded-xl border ${
                    errors.phone ? "border-red-400 bg-red-50/30" : "border-slate-200"
                  } focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-[#1657D9]`}
                />
                {errors.phone && <p className="text-[11px] text-red-500 mt-1">{errors.phone}</p>}
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">
                  Cabin / Office Room <span className="text-red-500">*</span>
                </label>
                <input
                  type="text"
                  value={officeLocation}
                  onChange={(e) => setOfficeLocation(e.target.value)}
                  placeholder="e.g. Culinary Block • Room 204"
                  className={`w-full px-3 py-2 text-xs rounded-xl border ${
                    errors.officeLocation ? "border-red-400 bg-red-50/30" : "border-slate-200"
                  } focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-[#1657D9]`}
                />
                {errors.officeLocation && (
                  <p className="text-[11px] text-red-500 mt-1">{errors.officeLocation}</p>
                )}
              </div>
            </div>
          </div>
        </form>

        {/* Footer */}
        <div className="flex items-center justify-end space-x-3 px-6 py-4 border-t border-slate-200 bg-slate-50/70">
          <button
            type="button"
            onClick={onClose}
            disabled={isSubmitting}
            className="px-4 py-2 text-xs font-semibold text-slate-700 bg-white hover:bg-slate-100 disabled:opacity-40 disabled:cursor-not-allowed rounded-xl transition-colors border border-slate-200 shadow-2xs cursor-pointer"
          >
            Cancel
          </button>
          <button
            type="submit"
            form="faculty-form"
            disabled={isSubmitting}
            className="px-5 py-2 text-xs font-semibold text-white bg-[#1657D9] hover:bg-blue-700 disabled:opacity-60 disabled:cursor-not-allowed rounded-xl transition-colors shadow-sm flex items-center space-x-2 cursor-pointer"
          >
            {isSubmitting && (
              <span className="w-3.5 h-3.5 border-2 border-white/30 border-t-white rounded-full animate-spin"></span>
            )}
            <span>
              {isSubmitting
                ? (mode === "add" ? "Registering Staff..." : "Saving Changes...")
                : (mode === "add" ? "Create Staff Record" : "Save Changes")}
            </span>
          </button>
        </div>
      </div>
    </div>
  );
};
