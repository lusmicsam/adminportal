"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import { User, Lock, ArrowRight, Loader2, AlertCircle, Eye, EyeOff } from "lucide-react";
import { useAuth } from "@/context/AuthContext";
import { API_CONFIG } from "@/utils/api";

export default function AdminLoginPage() {
    const router = useRouter();
    const { login, logout, user } = useAuth();

    const [email, setEmail] = useState("");
    const [password, setPassword] = useState("");
    const [showPassword, setShowPassword] = useState(false);
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState("");

    // Name Check State
    const [showNameModal, setShowNameModal] = useState(false);
    const [adminName, setAdminName] = useState("");
    const [newPassword, setNewPassword] = useState("");
    const [confirmPassword, setConfirmPassword] = useState("");

    // Auto-redirect checks (Page Load only)
    useEffect(() => {
        // If user is ALREADY loaded on mount (e.g. refresh), verify them
        if (user?.email && !loading) {
            const verifySession = async () => {
                try {
                    // Quick check or just redirect? 
                    // To be safe and consistent, we check details even on reload
                    const checkRes = await fetch(`${API_CONFIG.baseUrl.admin}${API_CONFIG.admin.checkDetails}`, {
                        method: 'POST',
                        headers: { 'Content-Type': 'application/json' },
                        body: JSON.stringify({ email: user.email }),
                        credentials: 'include'
                    });
                    const checkData = await checkRes.json();

                    if (checkData.success) {
                        router.push("/admin/dashboard");
                    } else {
                        setShowNameModal(true);
                    }
                } catch (err) {
                    console.error("Session check failed", err);
                    router.push("/admin/dashboard");
                }
            };
            verifySession();
        }
    }, [user, router]); // 'loading' removed from deps to avoid loop, handled by initial state

    const handleLogin = async (e) => {
        e.preventDefault();
        setError("");
        setLoading(true);

        if (!email || !password) {
            setError("Please enter both Email and Password");
            setLoading(false);
            return;
        }

        const res = await login(email, password);

        if (res.success) {
            // Explicitly check details here to control loading state
            try {
                // Use the input 'email' (Reg ID) directly as we just logged in with it
                const checkRes = await fetch(`${API_CONFIG.baseUrl.admin}${API_CONFIG.admin.checkDetails}`, {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify({ email: email }), // Send the identifier used for login
                    credentials: 'include'
                });
                const checkData = await checkRes.json();

                if (checkData.success) {
                    // Name exists, proceed
                    router.push("/admin/dashboard");
                } else {
                    // Name missing, show modal
                    setLoading(false);
                    setShowNameModal(true);
                }
            } catch (err) {
                console.error("Details check failed", err);
                // Fallback: proceed to dashboard
                router.push("/admin/dashboard");
            }
        } else {
            setError(res.error || "Login failed");
            setLoading(false);
        }
    };

    const handleNameSubmit = async (e) => {
        e.preventDefault();
        if (!adminName.trim()) return;

        // Password validation
        if (newPassword || confirmPassword) {
            if (newPassword !== confirmPassword) {
                alert("Passwords do not match");
                return;
            }
            if (newPassword.length < 6) {
                alert("Password must be at least 6 characters");
                return;
            }
        }

        setLoading(true);

        try {
            const payload = {
                email: email,
                admin_name: adminName
            };

            if (newPassword) {
                payload.password = newPassword;
            }

            const res = await fetch(`${API_CONFIG.baseUrl.admin}${API_CONFIG.admin.updateDetails}`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify(payload),
                credentials: 'include'
            });

            const data = await res.json();

            if (data.success) {
                // Force logout to require re-login
                await logout();
                setShowNameModal(false);
                setAdminName("");
                setNewPassword("");
                setConfirmPassword("");
                // router.push("/admin/login") is handled by logout() usually, but we are here.
            } else {
                // ... rest of error handling
                if (data.message) {
                    setError(data.message || "Failed to update details");
                }
                setLoading(false);
            }
        } catch (err) {
            console.error("Update details failed", err);
            setError("Failed to connect to server");
            setLoading(false);
        }
    };

    return (
        <div className="min-h-screen flex items-center justify-center relative overflow-hidden p-4">
            {/* Background Decor */}
            <div className="absolute top-[-10%] left-[-10%] w-[500px] h-[500px] bg-blue-600/20 rounded-full blur-[120px]" />
            <div className="absolute bottom-[-10%] right-[-10%] w-[500px] h-[500px] bg-indigo-600/20 rounded-full blur-[120px]" />

            {/* Login Card */}
            <div className="glass-card w-full max-w-md p-8 rounded-2xl shadow-2xl relative z-10 border border-gray-200 dark:border-white/10 transition-all duration-300 bg-white/80 dark:bg-black/40 backdrop-blur-xl">

                {/* Header Badge */}
                <div className="flex justify-center mb-6">
                    <div className="px-4 py-1.5 rounded-full bg-cyan-500/10 dark:bg-white/5 border border-cyan-500/20 dark:border-white/10 flex items-center gap-2">
                        <span className="w-2 h-2 rounded-full bg-cyan-500 dark:bg-emerald-400 animate-pulse" />
                        <span className="text-xs font-medium text-cyan-700 dark:text-slate-300 tracking-wide uppercase">
                            University Admin Portal
                        </span>
                    </div>
                </div>

                {/* Title */}
                <div className="text-center mb-8">
                    <h1 className="text-3xl font-bold text-gray-900 dark:text-transparent dark:bg-clip-text dark:bg-gradient-to-r dark:from-white dark:to-slate-400 mb-2">
                        Admin Login
                    </h1>
                    <p className="text-gray-500 dark:text-slate-400 text-sm">Secure access to university controls.</p>
                </div>

                {/* Error Message */}
                {error && (
                    <div className="mb-6 p-3 rounded-lg bg-red-500/10 border border-red-500/20 flex items-center gap-2 text-red-600 dark:text-red-400 text-sm animate-in fade-in slide-in-from-top-2">
                        <AlertCircle className="w-4 h-4" />
                        {error}
                    </div>
                )}

                {/* Form */}
                <form onSubmit={handleLogin} className="space-y-5">
                    <div className="space-y-2">
                        <label className="text-xs font-semibold text-gray-500 dark:text-slate-300 uppercase tracking-wider ml-1">
                            Registration ID
                        </label>
                        <div className="relative group">
                            <User className="absolute left-4 top-3.5 w-5 h-5 text-gray-400 dark:text-slate-500 group-focus-within:text-blue-500 dark:group-focus-within:text-blue-400 transition-colors" />
                            <input
                                type="text"
                                value={email}
                                onChange={(e) => setEmail(e.target.value)}
                                placeholder="REG123"
                                className="w-full bg-gray-50 dark:bg-white/5 border border-gray-200 dark:border-white/10 rounded-xl py-3 pl-12 pr-4 text-gray-900 dark:text-white placeholder:text-gray-400 dark:placeholder:text-slate-600 focus:outline-none focus:ring-2 focus:ring-blue-500/50 focus:border-blue-500/50 transition-all"
                                required
                            />
                        </div>
                    </div>

                    <div className="space-y-2">
                        <label className="text-xs font-semibold text-gray-500 dark:text-slate-300 uppercase tracking-wider ml-1">
                            Password
                        </label>
                        <div className="relative group">
                            <Lock className="absolute left-4 top-3.5 w-5 h-5 text-gray-400 dark:text-slate-500 group-focus-within:text-blue-500 dark:group-focus-within:text-blue-400 transition-colors" />
                            <input
                                type={showPassword ? "text" : "password"}
                                value={password}
                                onChange={(e) => setPassword(e.target.value)}
                                placeholder="••••••••"
                                className="w-full bg-gray-50 dark:bg-white/5 border border-gray-200 dark:border-white/10 rounded-xl py-3 pl-12 pr-12 text-gray-900 dark:text-white placeholder:text-gray-400 dark:placeholder:text-slate-600 focus:outline-none focus:ring-2 focus:ring-blue-500/50 focus:border-blue-500/50 transition-all"
                                required
                            />
                            <button
                                type="button"
                                onClick={() => setShowPassword(!showPassword)}
                                className="absolute right-4 top-3.5 text-gray-400 dark:text-slate-500 hover:text-gray-600 dark:hover:text-slate-300 transition-colors focus:outline-none"
                            >
                                {showPassword ? <EyeOff className="w-5 h-5" /> : <Eye className="w-5 h-5" />}
                            </button>
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

            {/* NAME ENTRY MODAL */}
            {showNameModal && (
                <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm animate-in fade-in duration-300">
                    <div className="bg-white dark:bg-[#1a1f3c] border border-gray-200 dark:border-white/10 p-8 rounded-2xl shadow-2xl max-w-sm w-full text-center relative overflow-hidden animate-in zoom-in-95 duration-300">
                        <div className="absolute top-0 left-0 w-full h-1 bg-gradient-to-r from-cyan-400 to-blue-500" />

                        <div className="w-16 h-16 bg-blue-500/10 rounded-full flex items-center justify-center mx-auto mb-6">
                            <User className="w-8 h-8 text-blue-500" />
                        </div>

                        <h3 className="text-2xl font-bold text-gray-900 dark:text-white mb-2">Welcome Admin</h3>
                        <p className="text-gray-500 dark:text-gray-400 text-sm mb-6">
                            It looks like this is your first time. Please enter your full name to continue.
                        </p>

                        <form onSubmit={handleNameSubmit}>
                            <input
                                type="text"
                                value={adminName}
                                onChange={(e) => setAdminName(e.target.value)}
                                placeholder="e.g. John Doe"
                                className="w-full bg-gray-50 dark:bg-black/20 border border-gray-200 dark:border-white/10 rounded-xl px-4 py-3 text-gray-900 dark:text-white focus:outline-none focus:border-blue-500/50 mb-4 transition-all"
                                autoFocus
                                required
                            />

                            <div className="mb-4 space-y-3">
                                <p className="text-xs text-gray-400 uppercase tracking-wider font-semibold">Update Password (Optional)</p>
                                <input
                                    type="password"
                                    value={newPassword}
                                    onChange={(e) => setNewPassword(e.target.value)}
                                    placeholder="New Password"
                                    className="w-full bg-gray-50 dark:bg-black/20 border border-gray-200 dark:border-white/10 rounded-xl px-4 py-3 text-gray-900 dark:text-white focus:outline-none focus:border-blue-500/50 transition-all"
                                />
                                <input
                                    type="password"
                                    value={confirmPassword}
                                    onChange={(e) => setConfirmPassword(e.target.value)}
                                    placeholder="Confirm Password"
                                    className="w-full bg-gray-50 dark:bg-black/20 border border-gray-200 dark:border-white/10 rounded-xl px-4 py-3 text-gray-900 dark:text-white focus:outline-none focus:border-blue-500/50 transition-all"
                                />
                            </div>
                            <button
                                type="submit"
                                className="w-full bg-blue-600 hover:bg-blue-500 text-white font-bold py-3 rounded-xl transition-all"
                            >
                                Continue to Dashboard
                            </button>
                        </form>
                    </div>
                </div>
            )}
        </div>
    );
}
