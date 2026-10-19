"use client";

import React, { useEffect, useState, useCallback, useTransition } from "react";
import Image from "next/image";
import { useRouter } from "next/navigation";
import { Icon } from "@/components/common/Icon";
import { FICTIONAL_USER } from "@/data/mockData";
import { loginAction, logoutAction, getCurrentUserAction } from "@/lib/actions/auth";
import { AuthenticatedUser } from "@/lib/auth/session";

interface ProfileModalProps {
  isOpen: boolean;
  onClose: () => void;
}

export const ProfileModal: React.FC<ProfileModalProps> = ({ isOpen, onClose }) => {
  const router = useRouter();
  const [currentUser, setCurrentUser] = useState<AuthenticatedUser | null>(null);
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [authError, setAuthError] = useState<string | null>(null);
  const [authSuccess, setAuthSuccess] = useState<string | null>(null);
  const [showLoginForm, setShowLoginForm] = useState(false);
  const [isPending, startTransition] = useTransition();

  const handleModalClose = useCallback(() => {
    setAuthError(null);
    setAuthSuccess(null);
    setShowLoginForm(false);
    onClose();
  }, [onClose]);

  // Load session when modal opens
  useEffect(() => {
    if (isOpen) {
      startTransition(async () => {
        const res = await getCurrentUserAction();
        if (res.success && res.data) {
          setCurrentUser(res.data);
          setShowLoginForm(false);
        } else {
          setCurrentUser(null);
        }
      });
    }
  }, [isOpen]);

  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === "Escape" && isOpen) {
        handleModalClose();
      }
    };
    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [isOpen, handleModalClose]);

  const handleLogin = (e: React.FormEvent) => {
    e.preventDefault();
    setAuthError(null);
    setAuthSuccess(null);

    startTransition(async () => {
      const res = await loginAction({ email, password });
      if (res.success && res.data) {
        setCurrentUser(res.data.user);
        setShowLoginForm(false);
        setPassword("");
        setAuthSuccess(`Signed in as ${res.data.user.fullName} (${res.data.user.role})`);
      } else {
        setAuthError(res.error || "Invalid email or password.");
      }
    });
  };

  const handleLogout = () => {
    startTransition(async () => {
      await logoutAction();
      setCurrentUser(null);
      router.push('/login'); router.refresh();
    });
  };

  if (!isOpen) return null;

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-xs"
      onClick={handleModalClose}
      role="dialog"
      aria-modal="true"
    >
      <div
        className="relative w-full max-w-lg rounded-2xl bg-white shadow-2xl ring-1 ring-slate-900/10 border border-slate-200 overflow-hidden"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Navy Header Banner with Camouflage Background & Hover Zoom */}
        <div className="bg-[#0B1528] p-6 text-white border-b border-[#16243E] relative overflow-hidden group">
          <div className="absolute inset-0 z-0 overflow-hidden pointer-events-none">
            <Image
              src="/images/campus-illuminated-sign.png"
              alt="R. P. Institute of Hospitality & Management Campus Signage"
              fill
              sizes="500px"
              className="object-cover object-center opacity-35 transition-transform duration-700 ease-out group-hover:scale-110"
            />
            <div className="absolute inset-0 bg-[#0B1528]/70 backdrop-blur-[1px]"></div>
          </div>

          <div className="relative z-10">
            <button
              onClick={handleModalClose}
              className="absolute top-0 right-0 text-slate-400 hover:text-white p-1 rounded-lg hover:bg-white/10 cursor-pointer"
              aria-label="Close profile modal"
            >
              <Icon name="x-mark" className="w-5 h-5" />
            </button>
            
            <div className="flex items-center space-x-4">
              <div className="w-14 h-14 rounded-full bg-[#1657D9] text-white flex items-center justify-center font-bold text-lg shadow-md border-2 border-white/20">
                {currentUser ? currentUser.fullName.slice(0, 2).toUpperCase() : "KS"}
              </div>
              <div>
                <div className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-[11px] font-semibold bg-blue-500/20 text-blue-200 border border-blue-400/30 mb-1">
                  <span className={`w-1.5 h-1.5 rounded-full ${currentUser ? "bg-emerald-400" : "bg-blue-400"}`}></span>
                  {currentUser ? `Active Session: ${currentUser.role}` : "Prototype Profile"}
                </div>
                <h2 className="text-xl font-bold tracking-tight text-white">
                  {currentUser ? currentUser.fullName : FICTIONAL_USER.name}
                </h2>
                <p className="text-xs text-slate-300">
                  {currentUser ? currentUser.email : FICTIONAL_USER.designation}
                </p>
              </div>
            </div>
          </div>
        </div>

        {/* Profile Details Content */}
        <div className="relative overflow-hidden p-6 space-y-4 text-sm group/body">
          {/* Subtle campus camouflage backdrop with hover zoom */}
          <div className="absolute inset-0 z-0 opacity-0 group-hover/body:opacity-[0.04] transition-opacity duration-500 overflow-hidden pointer-events-none">
            <Image
              src="/images/campus-illuminated-sign.png"
              alt=""
              fill
              sizes="500px"
              className="object-cover transition-transform duration-700 ease-out group-hover/body:scale-108"
            />
          </div>

          {authSuccess && (
            <div className="relative z-10 p-3 rounded-xl bg-emerald-50 border border-emerald-200 text-xs text-emerald-800 flex items-center space-x-2">
              <span className="w-2 h-2 rounded-full bg-emerald-500"></span>
              <span>{authSuccess}</span>
            </div>
          )}

          {authError && (
            <div className="relative z-10 p-3 rounded-xl bg-red-50 border border-red-200 text-xs text-red-800 flex items-center space-x-2">
              <span className="w-2 h-2 rounded-full bg-red-500"></span>
              <span>{authError}</span>
            </div>
          )}

          {showLoginForm ? (
            /* Login Form Container */
            <form onSubmit={handleLogin} className="relative z-10 space-y-3 bg-slate-50 p-4 rounded-xl border border-slate-200">
              <div className="flex items-center justify-between pb-2 border-b border-slate-200">
                <span className="text-xs font-bold text-slate-900">Sign in to Institutional Session</span>
                <button
                  type="button"
                  onClick={() => setShowLoginForm(false)}
                  className="text-xs text-slate-500 hover:text-slate-800"
                >
                  Cancel
                </button>
              </div>

              <div>
                <label className="text-[11px] font-semibold text-slate-600 block mb-1">
                  Institutional Email
                </label>
                <input
                  type="email"
                  required
                  placeholder="admin.local@sample.rpihm.ac.in"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  className="w-full px-3 py-2 text-xs rounded-lg border border-slate-300 bg-white focus:outline-none focus:ring-2 focus:ring-[#1657D9]/20 focus:border-[#1657D9]"
                />
              </div>

              <div>
                <label className="text-[11px] font-semibold text-slate-600 block mb-1">
                  Password
                </label>
                <input
                  type="password"
                  required
                  placeholder="••••••••••••"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  className="w-full px-3 py-2 text-xs rounded-lg border border-slate-300 bg-white focus:outline-none focus:ring-2 focus:ring-[#1657D9]/20 focus:border-[#1657D9]"
                />
              </div>

              <div className="pt-1 flex items-center justify-end space-x-2">
                <button
                  type="button"
                  onClick={() => setShowLoginForm(false)}
                  className="px-3 py-1.5 text-xs text-slate-600 hover:text-slate-900 font-medium cursor-pointer"
                >
                  Back
                </button>
                <button
                  type="submit"
                  disabled={isPending}
                  className="px-4 py-1.5 bg-[#1657D9] hover:bg-[#1248B8] disabled:opacity-50 text-white text-xs font-semibold rounded-lg shadow-xs transition-colors cursor-pointer"
                >
                  {isPending ? "Verifying..." : "Sign In"}
                </button>
              </div>
            </form>
          ) : (
            /* Institutional Details Grid */
            <>
              <div className="relative z-10 grid grid-cols-2 gap-3 text-xs">
                <div className="p-3 rounded-xl bg-slate-50 border border-slate-200">
                  <span className="text-slate-400 block mb-0.5">Institution</span>
                  <span className="font-semibold text-slate-800">{FICTIONAL_USER.institution}</span>
                </div>
                <div className="p-3 rounded-xl bg-slate-50 border border-slate-200">
                  <span className="text-slate-400 block mb-0.5">Session Status</span>
                  <span className="font-semibold text-slate-800">
                    {currentUser ? `Authenticated (${currentUser.role})` : "Unauthenticated (Prototype)"}
                  </span>
                </div>
                <div className="p-3 rounded-xl bg-slate-50 border border-slate-200">
                  <span className="text-slate-400 block mb-0.5">Affiliated Body</span>
                  <span className="font-medium text-slate-800">University of Mumbai</span>
                </div>
                <div className="p-3 rounded-xl bg-slate-50 border border-slate-200">
                  <span className="text-slate-400 block mb-0.5">Academic Session</span>
                  <span className="font-medium text-slate-800">{FICTIONAL_USER.academicYear}</span>
                </div>
              </div>

              <div className="relative z-10 flex items-center space-x-3 p-2.5 rounded-xl bg-slate-50 border border-slate-200 group/loc hover:border-[#1657D9]/40 hover:shadow-2xs transition-all">
                <div className="relative w-12 h-12 rounded-lg overflow-hidden shrink-0 border border-slate-200">
                  <Image
                    src="/images/campus-front-gate.jpg"
                    alt="RPIHM Campus Vasai"
                    fill
                    sizes="48px"
                    className="object-cover transition-transform duration-700 ease-out group-hover/loc:scale-115"
                  />
                </div>
                <div className="min-w-0">
                  <span className="text-[10px] font-bold text-[#1657D9] uppercase tracking-wider block">
                    Campus Location
                  </span>
                  <p className="text-xs font-semibold text-slate-800 truncate">
                    Vasai (West) Main Campus, Palghar
                  </p>
                  <p className="text-[10px] text-slate-400">
                    R.P. Educational Trust — Affiliated to Univ. of Mumbai
                  </p>
                </div>
              </div>

              <div className="relative z-10 p-3.5 bg-slate-50 border border-slate-200 rounded-xl text-xs text-slate-600 leading-relaxed flex items-center justify-between">
                <div>
                  <strong className="text-slate-800 font-semibold block mb-0.5">Session Authority:</strong>
                  {currentUser ? (
                    <span>Authorized as <strong className="text-slate-900">{currentUser.fullName}</strong> with role <code className="bg-slate-200 px-1 py-0.5 rounded text-[10px]">{currentUser.role}</code>.</span>
                  ) : (
                    <span>Operating in prototype mode. Authenticate to test server-side permission gates.</span>
                  )}
                </div>
                {currentUser ? (
                  <button
                    onClick={handleLogout}
                    disabled={isPending}
                    className="shrink-0 ml-3 px-3 py-1.5 bg-slate-200 hover:bg-slate-300 text-slate-800 text-xs font-semibold rounded-lg transition-colors cursor-pointer"
                  >
                    {isPending ? "..." : "Sign Out"}
                  </button>
                ) : (
                  <button
                    onClick={() => setShowLoginForm(true)}
                    className="shrink-0 ml-3 px-3 py-1.5 bg-[#1657D9] hover:bg-[#1248B8] text-white text-xs font-semibold rounded-lg shadow-xs transition-colors cursor-pointer"
                  >
                    Sign In
                  </button>
                )}
              </div>
            </>
          )}
        </div>

        {/* Modal Actions */}
        <div className="bg-slate-50 px-6 py-4 border-t border-slate-200 flex items-center justify-between">
          <span className="text-[11px] text-slate-400">RPIHM CampusOS v0.1.0 • Phase 2 Security</span>
          <button
            onClick={handleModalClose}
            className="px-4 py-2 bg-slate-200 hover:bg-slate-300 text-slate-800 text-xs font-semibold rounded-lg transition-colors cursor-pointer"
          >
            Close
          </button>
        </div>
      </div>
    </div>
  );
};