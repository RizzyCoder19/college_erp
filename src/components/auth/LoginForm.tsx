"use client";

import React, { useState } from "react";
import { useRouter } from "next/navigation";
import { loginAction } from "@/lib/actions/auth";
import { Icon } from "@/components/common/Icon";

export function LoginForm() {
  const router = useRouter();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [isPending, setIsPending] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleSubmit = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    setError(null);
    setIsPending(true);

    try {
      const form = e.currentTarget;
      const emailEl = form.querySelector("#login-email") as HTMLInputElement | null;
      const passEl = form.querySelector("#login-password") as HTMLInputElement | null;
      const submitEmail = (emailEl?.value || email).trim();
      const submitPassword = passEl?.value || password;

      const result = await loginAction({ email: submitEmail, password: submitPassword });
      if (!result.success) {
        setError(result.error || "Authentication failed. Please check credentials.");
        setIsPending(false);
        return;
      }

      // Successful sign in: navigate to dashboard and refresh session state
      router.push("/");
      router.refresh();
    } catch {
      setError("Unable to connect to authentication service. Please try again.");
      setIsPending(false);
    }
  };

  return (
    <form onSubmit={handleSubmit} className="space-y-4">
      {error && (
        <div
          role="alert"
          className="p-3 rounded-xl bg-red-50 border border-red-200 text-xs text-red-800 flex items-center space-x-2"
        >
          <span className="h-2 w-2 rounded-full bg-[#D92534] shrink-0"></span>
          <span>{error}</span>
        </div>
      )}

      <div>
        <label
          htmlFor="login-email"
          className="block text-xs font-semibold text-slate-700 mb-1"
        >
          Institutional Email
        </label>
        <div className="relative">
          <input
            id="login-email"
            name="email"
            type="email"
            required
            autoComplete="email"
            placeholder="admin.local@sample.rpihm.ac.in"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            className="w-full px-3.5 py-2.5 text-xs rounded-xl border border-slate-300 bg-white text-slate-900 placeholder:text-slate-400 focus:outline-none focus:ring-2 focus:ring-[#1657D9]/20 focus:border-[#1657D9] transition-all"
          />
        </div>
      </div>

      <div>
        <label
          htmlFor="login-password"
          className="block text-xs font-semibold text-slate-700 mb-1"
        >
          Password
        </label>
        <div className="relative">
          <input
            id="login-password"
            name="password"
            type="password"
            required
            autoComplete="current-password"
            placeholder="••••••••••••••••"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            className="w-full px-3.5 py-2.5 text-xs rounded-xl border border-slate-300 bg-white text-slate-900 placeholder:text-slate-400 focus:outline-none focus:ring-2 focus:ring-[#1657D9]/20 focus:border-[#1657D9] transition-all"
          />
        </div>
      </div>

      <div className="pt-2">
        <button
          type="submit"
          id="login-submit-button"
          disabled={isPending}
          className="w-full py-2.5 px-4 bg-[#1657D9] hover:bg-[#1248B8] active:bg-[#0E3B96] disabled:opacity-60 text-white text-xs font-bold rounded-xl shadow-xs transition-colors flex items-center justify-center space-x-2 cursor-pointer"
        >
          {isPending ? (
            <>
              <span className="h-3 w-3 rounded-full border-2 border-white/30 border-t-white animate-spin"></span>
              <span>Verifying credentials...</span>
            </>
          ) : (
            <>
              <Icon name="lock-closed" className="h-3.5 w-3.5" />
              <span>Sign In to Institutional Session</span>
            </>
          )}
        </button>
      </div>

      <div className="mt-4 pt-4 border-t border-slate-100 text-[11px] text-slate-500 text-center space-y-1">
        <p>CampusOS ERP Development Authentication</p>
        <p className="text-[10px] text-slate-400">
          Default prototype administrator configured in <code className="bg-slate-100 px-1 py-0.5 rounded text-slate-600">dev-admin-credentials.json</code>
        </p>
      </div>
    </form>
  );
}