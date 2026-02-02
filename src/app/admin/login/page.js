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
        <div className="h-screen flex items-center justify-center relative overflow-hidden p-4">
            {/* Background Decor */}
            <div className="absolute top-[-10%] left-[-10%] w-[500px] h-[500px] bg-blue-600/20 rounded-full blur-[120px]" />
            <div className="absolute bottom-[-10%] right-[-10%] w-[500px] h-[500px] bg-indigo-600/20 rounded-full blur-[120px]" />

            {/* Animated Logo at Top Center */}
            <div className="absolute z-20 
    /* Mobile: Top Left corner, no translation needed */
    top-4 left-4 
    
    /* Desktop (md and up): Top-8, Center horizontally */
    md:top-8 md:left-1/2 md:-translate-x-1/2"
>
    <div className="relative">
        {/* 3D Rotating Logo */}
        {/* Added responsive sizing: smaller on mobile (w-16), larger on desktop (md:w-24) */}
        <div className="relative animate-float w-16 h-16 md:w-24 md:h-24">
            
            {/* Rotating Background Glow */}
            <div className="absolute inset-0 bg-gradient-to-br from-blue-600 via-indigo-600 to-violet-600 rounded-full opacity-30 blur-2xl animate-spin-slow" />

            {/* Just the Logo with 3D Rotation */}
            <div className="relative w-full h-full animate-rotate-3d">
                <img
                    src="/logo.png"
                    alt="TheEduCode"
                    className="w-full h-full object-contain drop-shadow-2xl"
                />
            </div>

            {/* Orbiting Sparkles */}
            <div className="absolute -inset-2 animate-spin-slow">
                <div className="absolute top-0 left-1/2 w-2 h-2 bg-blue-500 rounded-full shadow-lg shadow-blue-500/50" />
            </div>
            <div className="absolute -inset-2 animate-spin-reverse">
                <div className="absolute bottom-0 right-1/2 w-2 h-2 bg-violet-500 rounded-full shadow-lg shadow-violet-500/50" />
            </div>
        </div>
    </div>
</div>

            {/* Left Side Floating Elements */}
            <div className="hidden lg:block absolute left-0 top-0 h-full w-64 pointer-events-none">
                {/* Floating Circle 1 */}
                <div className="absolute top-1/4 left-8 w-32 h-32 bg-gradient-to-br from-blue-500/10 to-indigo-500/10 rounded-full blur-xl animate-float" style={{ animationDelay: '0s' }} />

                {/* Floating Square */}
                <div className="absolute top-1/2 left-16 w-20 h-20 bg-gradient-to-br from-indigo-500/10 to-violet-500/10 rounded-2xl blur-lg animate-float-delayed" style={{ animationDelay: '1s' }} />

                {/* Floating Circle 2 */}
                <div className="absolute bottom-1/4 left-12 w-24 h-24 bg-gradient-to-br from-violet-500/10 to-blue-500/10 rounded-full blur-lg animate-float" style={{ animationDelay: '2s' }} />

                {/* Small Dots */}
                <div className="absolute top-1/3 left-20 w-3 h-3 bg-blue-400/30 rounded-full animate-pulse" />
                <div className="absolute top-2/3 left-24 w-2 h-2 bg-violet-400/30 rounded-full animate-pulse" style={{ animationDelay: '0.5s' }} />
                <div className="absolute top-1/2 left-8 w-3 h-3 bg-indigo-400/30 rounded-full animate-pulse" style={{ animationDelay: '1s' }} />
            </div>

            {/* Right Side Floating Elements */}
            <div className="hidden lg:block absolute right-0 top-0 h-full w-64 pointer-events-none">
                {/* Floating Circle 1 */}
                <div className="absolute top-1/3 right-8 w-28 h-28 bg-gradient-to-br from-violet-500/10 to-indigo-500/10 rounded-full blur-xl animate-float-delayed" style={{ animationDelay: '0.5s' }} />

                {/* Floating Triangle Effect (using gradient) */}
                <div className="absolute top-2/3 right-16 w-24 h-24 bg-gradient-to-br from-indigo-500/10 to-blue-500/10 rounded-2xl blur-lg animate-float" style={{ animationDelay: '1.5s' }} />

                {/* Floating Circle 2 */}
                <div className="absolute bottom-1/3 right-12 w-32 h-32 bg-gradient-to-br from-blue-500/10 to-violet-500/10 rounded-full blur-xl animate-float-delayed" style={{ animationDelay: '2.5s' }} />

                {/* Small Dots */}
                <div className="absolute top-1/4 right-20 w-3 h-3 bg-violet-400/30 rounded-full animate-pulse" style={{ animationDelay: '0.3s' }} />
                <div className="absolute top-1/2 right-24 w-2 h-2 bg-blue-400/30 rounded-full animate-pulse" style={{ animationDelay: '0.8s' }} />
                <div className="absolute bottom-1/3 right-10 w-3 h-3 bg-indigo-400/30 rounded-full animate-pulse" style={{ animationDelay: '1.3s' }} />
            </div>

            {/* Loading Animation */}
            {loading && (
                <div className="fixed inset-0 z-50 flex items-center justify-center bg-white/80 dark:bg-slate-900/80 backdrop-blur-md ">
                    <div className="relative">
                        {/* Logo with Animations */}
                        <div className="relative w-32 h-32">
                            {/* Rotating Background Glow */}
                            <div className="absolute inset-0 bg-gradient-to-br from-blue-600 via-indigo-600 to-violet-600 rounded-full opacity-30 blur-3xl animate-spin-slow" />

                            {/* Just the Logo with Pulsing Effect */}
                            <div className="relative w-full h-full animate-pulse ">
                                <img
                                    src="/logo.png"
                                    alt="Loading"
                                    className="w-full h-full object-contain drop-shadow-2xl"
                                />
                            </div>

                            {/* Orbiting Dots */}
                            <div className="absolute -inset-4 animate-spin">
                                <div className="absolute top-0 left-1/2 -translate-x-1/2 w-3 h-3 bg-blue-500 rounded-full shadow-lg shadow-blue-500/50" />
                            </div>
                            <div className="absolute -inset-4 animate-spin-reverse">
                                <div className="absolute bottom-0 left-1/2 -translate-x-1/2 w-3 h-3 bg-violet-500 rounded-full shadow-lg shadow-violet-500/50" />
                            </div>
                        </div>

                        {/* Loading Text */}
                        <p className="text-center mt-8 text-gray-700 dark:text-gray-300 font-semibold text-lg animate-pulse">
                            Authenticating...
                        </p>
                    </div>
                </div>
            )}

            {/* Login Card */}
            <div className="w-full max-w-md relative z-10">
                {/* Branding */}
                <div className="text-center mb-6 animate-fadeIn">
                    <div className="space-y-1">
                        <h1 className="text-4xl font-bold bg-gradient-to-r from-blue-600 via-indigo-600 to-violet-600 bg-clip-text text-transparent">
                            TheEduCode
                        </h1>
                        <p className="text-base font-semibold text-gray-700 dark:text-gray-300">
                            University Admin Portal
                        </p>
                    </div>
                </div>

                {/* Main Login Card - Compact */}
                <div className="bg-white dark:bg-slate-900/95 backdrop-blur-xl rounded-2xl shadow-2xl border border-gray-200 dark:border-slate-700/50 overflow-hidden animate-slideInRight">
                    {/* Card Header with Gradient - Compact */}
                    <div className="relative bg-gradient-to-br from-blue-600 via-indigo-600 to-violet-600 p-5 text-center overflow-hidden">
                        {/* Decorative Elements */}
                        <div className="absolute top-0 right-0 w-32 h-32 bg-white/10 rounded-full blur-3xl" />
                        <div className="absolute bottom-0 left-0 w-24 h-24 bg-white/10 rounded-full blur-3xl" />

                        <div className="relative z-10">
                            <div className="flex items-center justify-center gap-2 mb-2">
                                <div className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse shadow-lg shadow-emerald-400/50" />
                                <span className="text-white/90 text-xs font-bold uppercase tracking-widest">
                                    System Active
                                </span>
                            </div>
                            <h2 className="text-2xl font-bold text-white mb-1">
                                Administrator Access
                            </h2>
                            <p className="text-blue-50 text-xs">
                                Please authenticate to continue
                            </p>
                        </div>
                    </div>

                    {/* Card Body - Compact */}
                    <div className="p-6">
                        {/* Error Message */}
                        {error && (
                            <div className="mb-4 p-3 rounded-xl bg-red-50 dark:bg-red-900/20 border-2 border-red-200 dark:border-red-800/50 flex items-start gap-2 text-red-700 dark:text-red-300 animate-fadeIn">
                                <AlertCircle className="w-4 h-4 mt-0.5 flex-shrink-0" />
                                <div className="flex-1">
                                    <p className="font-bold text-xs">Authentication Failed</p>
                                    <p className="text-xs mt-0.5 opacity-90">{error}</p>
                                </div>
                            </div>
                        )}

                        {/* Form - Compact */}
                        <form onSubmit={handleLogin} className="space-y-4">
                            {/* Registration ID Field */}
                            <div className="space-y-2">
                                <label className="block text-xs font-bold text-gray-700 dark:text-gray-200 ml-1 uppercase tracking-wide">
                                    Registration ID
                                </label>
                                <div className="relative group">
                                    <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                                        <User className="w-4 h-4 text-gray-400 dark:text-gray-500 group-focus-within:text-blue-600 dark:group-focus-within:text-blue-400 transition-all duration-200" />
                                    </div>
                                    <input
                                        type="text"
                                        value={email}
                                        onChange={(e) => setEmail(e.target.value)}
                                        placeholder="Enter your registration ID"
                                        className="w-full bg-gray-50 dark:bg-slate-800/50 border-2 border-gray-300 dark:border-slate-600 rounded-xl py-3 pl-10 pr-4 text-gray-900 dark:text-white placeholder:text-gray-400 dark:placeholder:text-gray-500 focus:outline-none focus:ring-4 focus:ring-blue-500/20 focus:border-blue-600 dark:focus:border-blue-400 transition-all duration-200 font-medium text-sm shadow-sm hover:border-gray-400 dark:hover:border-slate-500"
                                        required
                                    />
                                </div>
                            </div>

                            {/* Password Field */}
                            <div className="space-y-2">
                                <label className="block text-xs font-bold text-gray-700 dark:text-gray-200 ml-1 uppercase tracking-wide">
                                    Password
                                </label>
                                <div className="relative group">
                                    <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                                        <Lock className="w-4 h-4 text-gray-400 dark:text-gray-500 group-focus-within:text-blue-600 dark:group-focus-within:text-blue-400 transition-all duration-200" />
                                    </div>
                                    <input
                                        type={showPassword ? "text" : "password"}
                                        value={password}
                                        onChange={(e) => setPassword(e.target.value)}
                                        placeholder="Enter your password"
                                        className="w-full bg-gray-50 dark:bg-slate-800/50 border-2 border-gray-300 dark:border-slate-600 rounded-xl py-3 pl-10 pr-10 text-gray-900 dark:text-white placeholder:text-gray-400 dark:placeholder:text-gray-500 focus:outline-none focus:ring-4 focus:ring-blue-500/20 focus:border-blue-600 dark:focus:border-blue-400 transition-all duration-200 font-medium text-sm shadow-sm hover:border-gray-400 dark:hover:border-slate-500"
                                        required
                                    />
                                    <button
                                        type="button"
                                        onClick={() => setShowPassword(!showPassword)}
                                        className="absolute inset-y-0 right-0 pr-3 flex items-center text-gray-400 dark:text-gray-500 hover:text-gray-700 dark:hover:text-gray-300 transition-colors focus:outline-none"
                                        tabIndex={-1}
                                    >
                                        {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                                    </button>
                                </div>
                            </div>

                            {/* Submit Button */}
                            <button
                                type="submit"
                                disabled={loading}
                                className="w-full bg-gradient-to-r from-blue-600 via-indigo-600 to-violet-600 hover:from-blue-700 hover:via-indigo-700 hover:to-violet-700 disabled:from-gray-400 disabled:to-gray-500 text-white font-bold py-3 px-6 rounded-xl shadow-xl shadow-blue-500/30 hover:shadow-2xl hover:shadow-blue-500/40 disabled:shadow-none active:scale-[0.98] transition-all duration-200 flex items-center justify-center gap-2 group disabled:cursor-not-allowed mt-6"
                            >
                                {loading ? (
                                    <>
                                        <Loader2 className="w-5 h-5 animate-spin" />
                                        <span className="font-semibold">Authenticating...</span>
                                    </>
                                ) : (
                                    <>
                                        <span className="font-semibold">Sign In Securely</span>
                                        <ArrowRight className="w-4 h-4 group-hover:translate-x-1 transition-transform duration-200" />
                                    </>
                                )}
                            </button>
                        </form>
                    </div>
                </div>

                {/* Branding Footer - Compact */}
                <div className="mt-4 text-center space-y-1">
                    <p className="text-xs font-medium text-gray-600 dark:text-gray-400">
                        Powered by <span className="font-bold bg-gradient-to-r from-blue-600 to-violet-600 bg-clip-text text-transparent">TheEduCode</span>
                    </p>
                    <p className="text-xs text-gray-500 dark:text-gray-500">
                        © 2026 TheEduCode. All rights reserved.
                    </p>
                </div>
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
