"use client";

import { usePathname } from "next/navigation";
import Link from "next/link";
import { Users, LayoutGrid, Layers, GraduationCap } from "lucide-react";

const sidebarItems = [
    { icon: LayoutGrid, label: "Batches", href: "/dashboard/batches" },
    { icon: Layers, label: "Sections", href: "/dashboard/sections" },
    { icon: Users, label: "Teachers", href: "/dashboard" },
    { icon: GraduationCap, label: "Students", href: "/dashboard/students" },
];

export default function DashboardLayout({ children }) {
    const pathname = usePathname();

    return (
        <div className="flex h-screen overflow-hidden bg-slate-900/50">
            {/* Sidebar */}
            <aside className="w-64 glass-panel border-r border-white/5 hidden md:flex flex-col">
                {/* Logo Area */}
                <div className="h-16 flex items-center px-6 border-b border-white/5">
                    <div className="w-8 h-8 rounded-full bg-blue-600 flex items-center justify-center mr-3">
                        <span className="text-white font-serif font-bold">N</span>
                    </div>
                    <span className="text-white font-semibold tracking-wide">Nexus Admin</span>
                </div>

                {/* Navigation */}
                <nav className="flex-1 p-4 space-y-2">

                    {sidebarItems.map((item) => {
                        const isActive = pathname === item.href; // Simple match for now
                        return (
                            <Link
                                key={item.href}
                                href={item.href}
                                className={`flex items-center gap-3 px-4 py-3 rounded-xl transition-all group ${isActive
                                    ? "bg-blue-600 text-white shadow-lg shadow-blue-500/20"
                                    : "text-slate-400 hover:text-white hover:bg-white/5"
                                    }`}
                            >
                                <item.icon className={`w-5 h-5 ${isActive ? "text-white" : "text-slate-500 group-hover:text-white"}`} />
                                <span className="font-medium">{item.label}</span>
                            </Link>
                        );
                    })}
                </nav>


            </aside>

            {/* Main Content Area */}
            <main className="flex-1 overflow-auto relative">
                {/* Background Gradients for Dashboard */}
                <div className="absolute top-0 left-0 w-full h-[500px] bg-blue-600/5 rounded-full blur-[100px] pointer-events-none" />

                <div className="relative z-10 p-4 md:p-8 max-w-7xl mx-auto">
                    {children}
                </div>
            </main>
        </div>
    );
}
