"use client";

import React, { useState, useEffect, useMemo } from "react";
import { Icon } from "@/components/common/Icon";
import { FacultyRecord } from "@/types/faculty";
import { Role } from "@/lib/auth/roles";
import { provisionStaffAccountAction, ProvisionStaffAccountResponse } from "@/lib/actions/auth";

interface StaffProvisionModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSuccess: () => void;
  preselectedStaff?: FacultyRecord | null;
  allStaff: FacultyRecord[];
}

const ROLE_OPTIONS: Array<{
  role: Role;
  title: string;
  badge: string;
  description: string;
  isRecommended?: boolean;
}> = [
  {
    role: "ACADEMIC_ADMIN",
    title: "Academic Administrator",
    badge: "HOD / Dean",
    description: "Full authority over academic structures, teaching assignments, and student/faculty record management.",
    isRecommended: true,
  },
  {
    role: "FACULTY_MEMBER",
    title: "Faculty Member",
    badge: "Instructor",
    description: "Read-only access to academic curriculum, assigned divisions, and student directory.",
  },
  {
    role: "STUDENT_VIEWER",
    title: "Student Viewer",
    badge: "Registry Desk",
    description: "Read-only student roster search without academic or staff management privileges.",
  },
  {
    role: "SYSTEM_ADMIN",
    title: "System Administrator",
    badge: "Super User",
    description: "Unrestricted institutional ERP access, system administration, and account provisioning.",
  },
];

export const StaffProvisionModal: React.FC<StaffProvisionModalProps> = ({
  isOpen,
  onClose,
  onSuccess,
  preselectedStaff,
  allStaff,
}) => {
  const [selectedStaffId, setSelectedStaffId] = useState<string>("");
  const [loginEmail, setLoginEmail] = useState<string>("");
  const [selectedRole, setSelectedRole] = useState<Role>("ACADEMIC_ADMIN");
  const [initialPassword, setInitialPassword] = useState<string>("");
  const [confirmPassword, setConfirmPassword] = useState<string>("");
  const [showPassword, setShowPassword] = useState<boolean>(false);
  const [isPending, setIsPending] = useState<boolean>(false);
  const [serverError, setServerError] = useState<string | null>(null);
  const [provisionedData, setProvisionedData] = useState<ProvisionStaffAccountResponse | null>(null);

  // Available unprovisioned staff
  const unprovisionedStaff = useMemo(() => {
    return allStaff.filter((s) => !s.hasUserAccount);
  }, [allStaff]);

  // Selected staff object
  const activeStaff = useMemo(() => {
    return allStaff.find((s) => s.id === selectedStaffId) || null;
  }, [allStaff, selectedStaffId]);

  // Reset and synchronize when modal opens or preselectedStaff changes
  useEffect(() => {
    if (isOpen) {
      setServerError(null);
      setProvisionedData(null);
      setInitialPassword("");
      setConfirmPassword("");

      if (preselectedStaff && !preselectedStaff.hasUserAccount) {
        setSelectedStaffId(preselectedStaff.id);
        setLoginEmail(preselectedStaff.email || "");
        // Recommend ACADEMIC_ADMIN for HOD / Coordinator / Dean designations
        if (
          preselectedStaff.designation.toLowerCase().includes("head") ||
          preselectedStaff.designation.toLowerCase().includes("hod") ||
          preselectedStaff.designation.toLowerCase().includes("dean")
        ) {
          setSelectedRole("ACADEMIC_ADMIN");
        } else {
          setSelectedRole("FACULTY_MEMBER");
        }
      } else if (unprovisionedStaff.length > 0) {
        const first = unprovisionedStaff[0];
        setSelectedStaffId(first.id);
        setLoginEmail(first.email || "");
        setSelectedRole(
          first.designation.toLowerCase().includes("head") || first.designation.toLowerCase().includes("hod")
            ? "ACADEMIC_ADMIN"
            : "FACULTY_MEMBER"
        );
      } else {
        setSelectedStaffId("");
        setLoginEmail("");
      }
    }
  }, [isOpen, preselectedStaff, unprovisionedStaff]);

  // When staff selection changes in dropdown
  const handleStaffChange = (staffId: string) => {
    setSelectedStaffId(staffId);
    const chosen = allStaff.find((s) => s.id === staffId);
    if (chosen) {
      setLoginEmail(chosen.email || "");
      if (
        chosen.designation.toLowerCase().includes("head") ||
        chosen.designation.toLowerCase().includes("hod") ||
        chosen.designation.toLowerCase().includes("dean")
      ) {
        setSelectedRole("ACADEMIC_ADMIN");
      } else {
        setSelectedRole("FACULTY_MEMBER");
      }
    }
    setServerError(null);
  };

  // Password validation indicators
  const isLengthValid = initialPassword.length >= 8;
  const hasLetter = /[a-zA-Z]/.test(initialPassword);
  const hasNumber = /[0-9]/.test(initialPassword);
  const passwordsMatch = initialPassword === confirmPassword && initialPassword.length > 0;
  const isPasswordValid = isLengthValid && hasLetter && hasNumber && passwordsMatch;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedStaffId) {
      setServerError("Please select an institutional staff member.");
      return;
    }
    if (!loginEmail || !loginEmail.includes("@")) {
      setServerError("Please provide a valid login email address.");
      return;
    }
    if (!isPasswordValid) {
      setServerError("Please provide a valid password (minimum 8 characters with letters and numbers) and ensure passwords match.");
      return;
    }

    setIsPending(true);
    setServerError(null);

    try {
      const res = await provisionStaffAccountAction({
        staffId: selectedStaffId,
        email: loginEmail,
        role: selectedRole,
        initialPassword,
      });

      if (!res.success) {
        setServerError(res.error || "Failed to provision user account.");
      } else if (res.data) {
        setProvisionedData(res.data);
      }
    } catch (err) {
      setServerError(err instanceof Error ? err.message : "Network error during account provisioning.");
    } finally {
      setIsPending(false);
    }
  };

  const handleFinish = () => {
    onSuccess();
    onClose();
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-[#0B1528]/60 backdrop-blur-xs p-4 overflow-y-auto">
      <div className="relative w-full max-w-xl bg-white rounded-2xl shadow-2xl border border-slate-200/90 overflow-hidden my-8 animate-in fade-in zoom-in-95 duration-200">
        {/* Header */}
        <div className="bg-gradient-to-r from-[#0B1528] to-[#16243E] px-6 py-5 text-white flex items-center justify-between border-b border-slate-800">
          <div className="flex items-center space-x-3">
            <div className="w-10 h-10 rounded-xl bg-[#1657D9]/30 border border-blue-400/40 flex items-center justify-center text-blue-300">
              <Icon name="key" className="h-5 w-5" />
            </div>
            <div>
              <h3 className="text-base font-bold tracking-tight text-white">
                Provision Staff User Account
              </h3>
              <p className="text-xs text-slate-300">
                Establish authentic ERP credentials linked to institutional staff record
              </p>
            </div>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="w-8 h-8 rounded-lg flex items-center justify-center text-slate-400 hover:text-white hover:bg-white/10 transition-colors cursor-pointer"
          >
            <Icon name="x" className="h-5 w-5" />
          </button>
        </div>

        {/* Success View */}
        {provisionedData ? (
          <div className="p-6 space-y-6">
            <div className="p-4 rounded-xl bg-emerald-50 border border-emerald-200 text-emerald-900 flex items-start space-x-3">
              <div className="w-8 h-8 rounded-full bg-emerald-500 text-white flex items-center justify-center shrink-0 mt-0.5">
                <Icon name="check" className="h-4 w-4" />
              </div>
              <div className="space-y-1">
                <h4 className="text-sm font-bold text-emerald-950">Account Successfully Provisioned</h4>
                <p className="text-xs text-emerald-800 leading-relaxed">
                  An authenticated ERP login account has been securely created and bound to the staff record.
                </p>
              </div>
            </div>

            <div className="bg-slate-50 rounded-xl p-4 border border-slate-200 space-y-3 text-xs">
              <div className="flex justify-between py-1 border-b border-slate-200">
                <span className="text-slate-500">Account Holder</span>
                <span className="font-bold text-slate-900">{provisionedData.fullName}</span>
              </div>
              <div className="flex justify-between py-1 border-b border-slate-200">
                <span className="text-slate-500">Login Email</span>
                <span className="font-mono font-semibold text-slate-900">{provisionedData.email}</span>
              </div>
              <div className="flex justify-between py-1 border-b border-slate-200">
                <span className="text-slate-500">Assigned Role</span>
                <span className="inline-flex items-center px-2 py-0.5 rounded text-[10px] font-bold bg-[#1657D9]/10 text-[#1657D9] border border-[#1657D9]/20">
                  {provisionedData.role}
                </span>
              </div>
              <div className="flex justify-between py-1">
                <span className="text-slate-500">Authentication Target</span>
                <span className="text-slate-700">Standard Login Portal (/login)</span>
              </div>
            </div>

            <div className="p-3.5 bg-blue-50/70 border border-blue-200 rounded-xl text-xs text-blue-900 flex items-start space-x-2.5">
              <Icon name="information-circle" className="h-4 w-4 text-[#1657D9] shrink-0 mt-0.5" />
              <p className="text-[11px] leading-relaxed text-blue-800">
                <strong>Security Notice:</strong> The initial password has been hashed with scrypt and a cryptographically random salt. The account holder can now log in using these credentials.
              </p>
            </div>

            <div className="pt-2 flex justify-end">
              <button
                type="button"
                onClick={handleFinish}
                className="px-5 py-2.5 bg-[#1657D9] hover:bg-[#1248B8] text-white text-xs font-bold rounded-xl shadow-xs transition-all cursor-pointer"
              >
                Close & Refresh Directory
              </button>
            </div>
          </div>
        ) : (
          /* Provisioning Form */
          <form onSubmit={handleSubmit} className="p-6 space-y-5 text-xs">
            {serverError && (
              <div className="p-3.5 rounded-xl bg-red-50 border border-red-200 text-red-800 flex items-start space-x-2.5">
                <Icon name="exclamation-circle" className="h-4 w-4 text-red-600 shrink-0 mt-0.5" />
                <span className="leading-relaxed">{serverError}</span>
              </div>
            )}

            {/* 1. Select Staff Member */}
            <div>
              <label className="block text-[11px] font-bold uppercase tracking-wider text-slate-600 mb-1.5">
                Select Institutional Staff Member <span className="text-red-500">*</span>
              </label>
              <select
                value={selectedStaffId}
                onChange={(e) => handleStaffChange(e.target.value)}
                disabled={isPending}
                className="w-full px-3 py-2.5 bg-slate-50 border border-slate-300 rounded-xl font-medium text-slate-800 focus:outline-none focus:border-[#1657D9] focus:ring-2 focus:ring-[#1657D9]/20 transition-all cursor-pointer"
              >
                {unprovisionedStaff.length === 0 ? (
                  <option value="">All registered staff members currently have user accounts</option>
                ) : (
                  unprovisionedStaff.map((staff) => (
                    <option key={staff.id} value={staff.id}>
                      {staff.fullName} ({staff.staffId}) ? {staff.designation}
                    </option>
                  ))
                )}
              </select>
            </div>

            {/* Selected Staff Summary Card */}
            {activeStaff && (
              <div className="p-3.5 bg-slate-50 border border-slate-200 rounded-xl space-y-2">
                <div className="flex items-center justify-between">
                  <span className="font-bold text-slate-800 text-xs">{activeStaff.fullName}</span>
                  <span className="font-mono text-[10px] px-1.5 py-0.5 rounded bg-slate-200 text-slate-700">
                    {activeStaff.staffId}
                  </span>
                </div>
                <div className="text-slate-500 text-[11px] flex items-center space-x-3">
                  <span>{activeStaff.designation}</span>
                  <span>?</span>
                  <span>{activeStaff.department}</span>
                </div>
              </div>
            )}

            {/* 2. Login Email */}
            <div>
              <label className="block text-[11px] font-bold uppercase tracking-wider text-slate-600 mb-1.5">
                Login Email Address <span className="text-red-500">*</span>
              </label>
              <input
                type="email"
                value={loginEmail}
                onChange={(e) => setLoginEmail(e.target.value)}
                placeholder="staff.email@sample.rpihm.ac.in"
                disabled={isPending}
                required
                className="w-full px-3 py-2.5 bg-slate-50 border border-slate-300 rounded-xl text-slate-800 font-medium focus:outline-none focus:border-[#1657D9] focus:ring-2 focus:ring-[#1657D9]/20 transition-all"
              />
              <span className="text-[10px] text-slate-400 mt-1 block">
                Must be a valid, unique institutional email address used for sign-in.
              </span>
            </div>

            {/* 3. Explicit Role Selection */}
            <div>
              <label className="block text-[11px] font-bold uppercase tracking-wider text-slate-600 mb-2">
                Assigned ERP Role <span className="text-red-500">*</span>
              </label>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5">
                {ROLE_OPTIONS.map((opt) => {
                  const isSelected = selectedRole === opt.role;
                  return (
                    <div
                      key={opt.role}
                      onClick={() => !isPending && setSelectedRole(opt.role)}
                      className={`p-3 rounded-xl border text-left transition-all cursor-pointer ${
                        isSelected
                          ? "border-[#1657D9] bg-blue-50/60 shadow-2xs ring-1 ring-[#1657D9]"
                          : "border-slate-200 bg-white hover:border-slate-300 hover:bg-slate-50/60"
                      }`}
                    >
                      <div className="flex items-center justify-between mb-1">
                        <span className="font-bold text-xs text-slate-900">{opt.title}</span>
                        <span className="text-[9px] font-mono px-1.5 py-0.2 rounded bg-slate-100 text-slate-600 border border-slate-200">
                          {opt.badge}
                        </span>
                      </div>
                      <p className="text-[10px] text-slate-500 leading-snug">{opt.description}</p>
                      {opt.isRecommended && (
                        <span className="inline-block mt-1.5 text-[9px] font-bold text-blue-700 bg-blue-100/70 px-1.5 py-0.2 rounded">
                          Recommended for HOD
                        </span>
                      )}
                    </div>
                  );
                })}
              </div>
            </div>

            {/* 4. Initial Password Setup */}
            <div className="space-y-3 pt-1 border-t border-slate-200">
              <div className="flex items-center justify-between">
                <label className="block text-[11px] font-bold uppercase tracking-wider text-slate-600">
                  Initial Password Setup <span className="text-red-500">*</span>
                </label>
                <button
                  type="button"
                  onClick={() => setShowPassword(!showPassword)}
                  className="text-[11px] text-[#1657D9] hover:underline cursor-pointer"
                >
                  {showPassword ? "Hide Passwords" : "Show Passwords"}
                </button>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <input
                    type={showPassword ? "text" : "password"}
                    value={initialPassword}
                    onChange={(e) => setInitialPassword(e.target.value)}
                    placeholder="Enter initial password"
                    disabled={isPending}
                    required
                    className="w-full px-3 py-2.5 bg-slate-50 border border-slate-300 rounded-xl text-slate-800 font-mono text-xs focus:outline-none focus:border-[#1657D9] focus:ring-2 focus:ring-[#1657D9]/20 transition-all"
                  />
                  <span className="text-[10px] text-slate-400 mt-1 block">Initial credential</span>
                </div>
                <div>
                  <input
                    type={showPassword ? "text" : "password"}
                    value={confirmPassword}
                    onChange={(e) => setConfirmPassword(e.target.value)}
                    placeholder="Confirm initial password"
                    disabled={isPending}
                    required
                    className="w-full px-3 py-2.5 bg-slate-50 border border-slate-300 rounded-xl text-slate-800 font-mono text-xs focus:outline-none focus:border-[#1657D9] focus:ring-2 focus:ring-[#1657D9]/20 transition-all"
                  />
                  <span className="text-[10px] text-slate-400 mt-1 block">Repeat to confirm</span>
                </div>
              </div>

              {/* Password Policy Indicators */}
              <div className="flex flex-wrap gap-2 text-[10px] pt-1">
                <span className={`px-2 py-0.5 rounded-full ${isLengthValid ? "bg-emerald-100 text-emerald-800" : "bg-slate-100 text-slate-500"}`}>
                  8+ Characters
                </span>
                <span className={`px-2 py-0.5 rounded-full ${hasLetter && hasNumber ? "bg-emerald-100 text-emerald-800" : "bg-slate-100 text-slate-500"}`}>
                  Letters & Numbers
                </span>
                <span className={`px-2 py-0.5 rounded-full ${passwordsMatch ? "bg-emerald-100 text-emerald-800" : "bg-slate-100 text-slate-500"}`}>
                  Passwords Match
                </span>
              </div>
            </div>

            {/* Actions */}
            <div className="pt-3 border-t border-slate-200 flex items-center justify-between">
              <button
                type="button"
                onClick={onClose}
                disabled={isPending}
                className="px-4 py-2.5 text-xs font-semibold text-slate-600 hover:text-slate-900 bg-slate-100 hover:bg-slate-200 rounded-xl transition-colors cursor-pointer"
              >
                Cancel
              </button>

              <button
                type="submit"
                disabled={isPending || !selectedStaffId || !isPasswordValid}
                className="px-5 py-2.5 bg-[#1657D9] hover:bg-[#1248B8] disabled:bg-slate-300 text-white text-xs font-bold rounded-xl shadow-xs transition-all flex items-center space-x-2 cursor-pointer disabled:cursor-not-allowed"
              >
                {isPending && <span className="w-3 h-3 border-2 border-white border-t-transparent rounded-full animate-spin"></span>}
                <span>{isPending ? "Provisioning Account..." : "Provision User Account"}</span>
              </button>
            </div>
          </form>
        )}
      </div>
    </div>
  );
};
