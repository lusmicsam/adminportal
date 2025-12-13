"use client";

import { Search, LogOut, Users, LayoutGrid, Layers, GraduationCap } from "lucide-react";
import Link from "next/link";

export default function DashboardPage() {
    const teachers = [
        { id: "T001", name: "Albus Dumbledore", subject: "Transfiguration", status: "Active", initials: "A", color: "text-sky-400 bg-sky-400/10" },
        { id: "T002", name: "Severus Snape", subject: "Potions", status: "Active", initials: "S", color: "text-emerald-400 bg-emerald-400/10" },
        { id: "T003", name: "Minerva McGonagall", subject: "Transfiguration", status: "Active", initials: "M", color: "text-indigo-400 bg-indigo-400/10" },
    ];

    return (
        <div className="space-y-8">
            {/* Header */}
            <header className="flex flex-col md:flex-row justify-between md:items-center gap-4">
                <div>
                    <div className="flex items-center gap-2 text-slate-400 text-sm mb-1">
                        <span>Admin</span>
                        <span>/</span>
                        <span className="text-blue-400">Control Panel</span>
                    </div>
                    <h1 className="text-3xl md:text-4xl font-bold text-white">
                        Welcome, <span className="text-transparent bg-clip-text bg-gradient-to-r from-blue-400 to-cyan-300">Super Admin</span>
                    </h1>
                </div>

                <div className="flex items-center gap-4">
                    <div className="relative hidden md:block">
                        <Search className="absolute left-3 top-2.5 w-4 h-4 text-slate-500" />
                        <input
                            type="text"
                            placeholder="Search teachers..."
                            className="bg-slate-800/50 border border-white/10 rounded-lg py-2 pl-10 pr-4 text-sm text-white focus:outline-none focus:ring-1 focus:ring-blue-500/50 w-64"
                        />
                    </div>
                    <Link href="/" className="px-4 py-2 bg-white/5 border border-white/10 hover:bg-white/10 text-slate-300 rounded-lg text-sm font-medium transition-colors">
                        Logout
                    </Link>
                </div>
            </header>

            {/* Stats / Navigation Cards */}
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
                {[
                    { label: "Batches", icon: LayoutGrid, active: false },
                    { label: "Sections", icon: Layers, active: false },
                    { label: "Teachers", icon: Users, active: true },
                    { label: "Students", icon: GraduationCap, active: false }
                ].map((item, idx) => (
                    <div key={idx} className={`relative p-6 rounded-2xl border ${item.active ? "bg-blue-600/10 border-blue-500/50" : "bg-white/5 border-white/5 hover:bg-white/10"} transition-all cursor-pointer group`}>
                        <div className={`w-10 h-10 rounded-lg flex items-center justify-center mb-4 ${item.active ? "bg-blue-600 text-white" : "bg-white/5 text-slate-400 group-hover:text-white"}`}>
                            <item.icon className="w-5 h-5" />
                        </div>
                        <h3 className={`font-semibold ${item.active ? "text-white" : "text-slate-400 group-hover:text-white"}`}>{item.label}</h3>
                        {item.active && (
                            <div className="absolute bottom-0 left-0 w-full h-1 bg-gradient-to-r from-blue-500 to-cyan-400 rounded-b-2xl" />
                        )}
                    </div>
                ))}
            </div>

            {/* Directory Section */}
            <section className="glass-panel p-6 rounded-2xl border border-white/5 bg-slate-900/40">
                <div className="flex justify-between items-center mb-6">
                    <h2 className="text-xl font-bold text-white">Teachers Directory</h2>
                    {/* Mobile Search visible here if needed, or filter buttons */}
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                    {teachers.map((teacher) => (
                        <div key={teacher.id} className="bg-slate-800/40 border border-white/5 p-5 rounded-xl hover:border-blue-500/30 transition-all group">
                            <div className="flex justify-between items-start mb-4">
                                <div className={`w-12 h-12 rounded-full flex items-center justify-center font-bold text-lg ${teacher.color}`}>
                                    {teacher.initials}
                                </div>
                                {/* More options dots could go here */}
                            </div>

                            <h3 className="text-white font-semibold text-lg">{teacher.name}</h3>
                            <p className="text-slate-500 text-sm mb-4">{teacher.subject}</p>

                            <div className="flex items-center justify-between pt-4 border-t border-white/5">
                                <span className="text-xs text-slate-500 font-mono">ID: {teacher.id}</span>
                                <span className="text-xs text-emerald-400 bg-emerald-400/10 px-2 py-1 rounded-full">{teacher.status}</span>
                            </div>
                        </div>
                    ))}
                </div>
            </section>
        </div>
    );
}
