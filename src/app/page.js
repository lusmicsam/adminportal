"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { User, Lock, ArrowRight, Loader2, AlertCircle } from "lucide-react";

export default function LoginPage() {
  const router = useRouter();
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  // Form States
  const [regId, setRegId] = useState("");
  const [password, setPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);

  // Clear error on input change
  const clearError = () => {
    if (error) setError("");
  };

  const handleLogin = (e) => {
    e.preventDefault();
    clearError();

    // Basic validation
    if (!regId || !password) {
      setError("Please enter both ID and Password");
      return;
    }

    setLoading(true);

    // Simulate API call to verify credentials
    setTimeout(() => {
      // Mock Credential Check
      // ID: 12312621, Pass: Avi@6296
      if (regId === "12312621" && password === "Avi@6296") {
        // Success: Direct redirect to dashboard
        router.push("/dashboard");
      } else {
        setLoading(false);
        setError("Invalid Credentials. Check ID & Password.");
      }
    }, 1500);
  };

  return (
    <div className="min-h-screen flex items-center justify-center relative overflow-hidden p-4">
      {/* Background Decor */}
      <div className="absolute top-[-10%] left-[-10%] w-[500px] h-[500px] bg-blue-600/20 rounded-full blur-[120px]" />
      <div className="absolute bottom-[-10%] right-[-10%] w-[500px] h-[500px] bg-indigo-600/20 rounded-full blur-[120px]" />

      {/* Login Card */}
      <div className="glass-card w-full max-w-md p-8 rounded-2xl shadow-2xl relative z-10 border border-white/10 transition-all duration-300">

        {/* Header Badge */}
        <div className="flex justify-center mb-6">
          <div className="px-4 py-1.5 rounded-full bg-white/5 border border-white/10 flex items-center gap-2">
            <span className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse" />
            <span className="text-xs font-medium text-slate-300 tracking-wide uppercase">
              Student Results Portal — Teacher Access
            </span>
          </div>
        </div>

        {/* Title & Description */}
        <div className="text-center mb-8">
          <h1 className="text-3xl font-bold bg-clip-text text-transparent bg-gradient-to-r from-white to-slate-400 mb-2">
            Sign in to continue
          </h1>

          <div className="text-slate-400 text-sm">
            <p>Professional. Secure. Insight-driven.</p>
          </div>
        </div>

        {/* Error Message */}
        {error && (
          <div className="mb-6 p-3 rounded-lg bg-red-500/10 border border-red-500/20 flex items-center gap-2 text-red-400 text-sm animate-in fade-in slide-in-from-top-2">
            <AlertCircle className="w-4 h-4" />
            {error}
          </div>
        )}

        {/* Form Container */}
        <div className="relative">
          <form onSubmit={handleLogin} className="space-y-5 animate-in fade-in slide-in-from-left-4 duration-300">
            {/* Reg ID */}
            <div className="space-y-2">
              <label className="text-xs font-semibold text-slate-300 uppercase tracking-wider ml-1">
                Registration ID
              </label>
              <div className="relative group">
                <User className="absolute left-4 top-3.5 w-5 h-5 text-slate-500 group-focus-within:text-blue-400 transition-colors" />
                <input
                  type="text"
                  value={regId}
                  onChange={(e) => { setRegId(e.target.value); clearError(); }}
                  placeholder="Enter your Reg ID"
                  className="w-full bg-white/5 border border-white/10 rounded-xl py-3 pl-12 pr-4 text-white placeholder:text-slate-600 focus:outline-none focus:ring-2 focus:ring-blue-500/50 focus:border-blue-500/50 transition-all"
                  autoFocus
                />
              </div>
            </div>

            {/* Password */}
            <div className="space-y-2">
              <label className="text-xs font-semibold text-slate-300 uppercase tracking-wider ml-1">
                Password
              </label>
              <div className="relative group">
                <Lock className="absolute left-4 top-3.5 w-5 h-5 text-slate-500 group-focus-within:text-blue-400 transition-colors" />
                <input
                  type="password"
                  value={password}
                  onChange={(e) => { setPassword(e.target.value); clearError(); }}
                  placeholder="Enter your password"
                  className="w-full bg-white/5 border border-white/10 rounded-xl py-3 pl-12 pr-12 text-white placeholder:text-slate-600 focus:outline-none focus:ring-2 focus:ring-blue-500/50 focus:border-blue-500/50 transition-all"
                />
              </div>
            </div>

            <button
              type="submit"
              disabled={loading}
              className="w-full bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-500 hover:to-indigo-500 text-white font-bold py-3.5 rounded-xl shadow-lg shadow-blue-500/20 active:scale-[0.98] transition-all flex items-center justify-center gap-2 group"
            >
              {loading ? (
                <Loader2 className="w-5 h-5 animate-spin" />
              ) : (
                <>
                  Sign In
                  <ArrowRight className="w-4 h-4 group-hover:translate-x-1 transition-transform" />
                </>
              )}
            </button>
          </form>
        </div>

        {/* Footer */}
        <div className="mt-8 text-center">
          <p className="text-xs text-slate-500">
            For authorized teachers only. All access is logged.
          </p>
          <div className="mt-8 flex justify-center">
            <div className="w-8 h-8 rounded-full bg-black border border-white/20 flex items-center justify-center">
              <span className="text-white font-serif font-bold text-sm">N</span>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
