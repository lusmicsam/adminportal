"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { useAuth } from "@/context/AuthContext";
import { Users, LayoutGrid, Layers, GraduationCap, Loader2, LogOut } from "lucide-react";

export default function AdminDashboardPage() {
    const { user, loading, logout } = useAuth();
    const router = useRouter();
    const [batches, setBatches] = useState([]);
    const [fetchingBatches, setFetchingBatches] = useState(false);

    // Auth Guard is handled in context (checkSession), but we double check here
    useEffect(() => {
        if (!loading && !user) {
            router.push("/admin/login");
        }
    }, [user, loading, router]);

    // Fetch Batches on mount if user exists
    useEffect(() => {
        if (user) {
            const fetchBatches = async () => {
                setFetchingBatches(true);
                try {
                    // Cookie is passed automatically due to credentials: 'include' in global fetch config
                    // Wait, simplistic implementation here using fetch directly vs api helper?
                    // We should probably use the same credentials config.
                    // Use the proxy to avoid CORS and ensure correct domain
                    const res = await fetch("/api/proxy/api/admin/my-batches", {
                        credentials: "include"
                    });
                    if (res.ok) {
                        const data = await res.json();
                        setBatches(data.batches || data); // Adjust based on actual response structure
                    }
                } catch (err) {
                    console.error("Failed to fetch batches", err);
                } finally {
                    setFetchingBatches(false);
                }
            };
            fetchBatches();
        }
    }, [user]);

    if (loading || !user) {
        return (
            <div className="min-h-screen flex items-center justify-center bg-slate-900 text-white">
                <Loader2 className="w-8 h-8 animate-spin text-blue-500" />
                <span className="ml-3 font-medium">Verifying Session...</span>
            </div>
        );
    }

    return (
        <div className="min-h-screen bg-slate-900/50 p-8">
            {/* Header */}
            <header className="flex flex-col md:flex-row justify-between md:items-center gap-4 mb-8">
                <div>
                    <div className="flex items-center gap-2 text-slate-400 text-sm mb-1">
                        <span>Admin</span>
                        <span>/</span>
                        <span className="text-blue-400">Dashboard</span>
                    </div>
                    <h1 className="text-3xl md:text-4xl font-bold text-white">
                        Welcome, <span className="text-transparent bg-clip-text bg-gradient-to-r from-blue-400 to-cyan-300">
                            {user.name || "Admin"}
                        </span>
                    </h1>
                    <p className="text-slate-500 text-sm mt-1">
                        University ID: <span className="font-mono text-emerald-400">{user.universityId || "N/A"}</span>
                    </p>
                </div>

                <button
                    onClick={logout}
                    className="px-4 py-2 bg-red-500/10 border border-red-500/20 hover:bg-red-500/20 text-red-400 rounded-lg text-sm font-medium transition-colors flex items-center gap-2"
                >
                    <LogOut className="w-4 h-4" />
                    Logout
                </button>
            </header>

            {/* Quick Stats Grid (Reordered: Batches -> Sections -> Teachers -> Students) */}
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4 mb-8">
                {[
                    { label: "Batches", icon: LayoutGrid, active: true },
                    { label: "Sections", icon: Layers, active: false },
                    { label: "Teachers", icon: Users, active: false },
                    { label: "Students", icon: GraduationCap, active: false }
                ].map((item, idx) => (
                    <div key={idx} className={`relative p-6 rounded-2xl border ${item.active ? "bg-blue-600/10 border-blue-500/50" : "bg-white/5 border-white/5 hover:bg-white/10"} transition-all cursor-pointer group`}>
                        <div className={`w-10 h-10 rounded-lg flex items-center justify-center mb-4 ${item.active ? "bg-blue-600 text-white" : "bg-white/5 text-slate-400 group-hover:text-white"}`}>
                            <item.icon className="w-5 h-5" />
                        </div>
                        <h3 className={`font-semibold ${item.active ? "text-white" : "text-slate-400 group-hover:text-white"}`}>{item.label}</h3>
                    </div>
                ))}
            </div>

            {/* Batches Data Section */}
            <section className="glass-panel p-6 rounded-2xl border border-white/5 bg-slate-900/40">
                <h2 className="text-xl font-bold text-white mb-6">My Batches</h2>
                {fetchingBatches ? (
                    <div className="flex items-center gap-2 text-slate-400">
                        <Loader2 className="w-4 h-4 animate-spin" />
                        Loading batches...
                    </div>
                ) : batches.length > 0 ? (
                    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                        {batches.map((batch, idx) => (
                            <div key={idx} className="bg-slate-800/40 border border-white/5 p-4 rounded-xl text-white">
                                {JSON.stringify(batch)} {/* Quick dump until we know schema */}
                            </div>
                        ))}
                    </div>
                ) : (
                    <div className="text-slate-500 italic">No batches found.</div>
                )}
            </section>
        </div>
    );
}
