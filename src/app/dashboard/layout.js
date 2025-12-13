"use client";

export default function DashboardLayout({ children }) {
    return (
        <div className="min-h-screen bg-slate-900/50">
            {/* Main Content Area */}
            <main className="relative min-h-screen">
                {/* Background Gradients for Dashboard */}
                <div className="absolute top-0 left-0 w-full h-[500px] bg-blue-600/5 rounded-full blur-[100px] pointer-events-none" />

                <div className="relative z-10 p-4 md:p-8 max-w-7xl mx-auto">
                    {children}
                </div>
            </main>
        </div>
    );
}
