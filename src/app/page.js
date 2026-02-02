"use client";
import { useEffect } from "react";
import { useRouter } from "next/navigation";
import { Loader2 } from "lucide-react";

export default function Home() {
  const router = useRouter();

  useEffect(() => {
    router.push("/admin/login");
  }, [router]);

  return (
    <div className="min-h-screen flex flex-col items-center justify-center bg-[#0B0F19] overflow-hidden relative">
      {/* Background Gradients */}
      <div className="absolute top-0 right-0 w-[500px] h-[500px] bg-cyan-500/10 rounded-full blur-[120px] animate-pulse" />
      <div className="absolute bottom-0 left-0 w-[500px] h-[500px] bg-violet-500/10 rounded-full blur-[120px] animate-pulse delay-75" />

      <div className="relative z-10 flex flex-col items-center gap-6">
        <div className="relative">
          <div className="absolute inset-0 bg-gradient-to-r from-cyan-500 to-violet-600 rounded-full blur-xl opacity-50 animate-spin-slow" />
          <div className="relative bg-[#0f1523] p-4 rounded-2xl border border-white/10 shadow-2xl">
            <Loader2 className="w-10 h-10 text-cyan-500 animate-spin" />
          </div>
        </div>

        <div className="text-center space-y-2">
          <h1 className="text-2xl font-bold bg-gradient-to-r from-white to-gray-400 bg-clip-text text-transparent">TheEduCode</h1>
          <div className="flex items-center gap-2 justify-center">
            <div className="h-1 w-1 bg-cyan-500 rounded-full animate-bounce" style={{ animationDelay: '0s' }} />
            <div className="h-1 w-1 bg-violet-500 rounded-full animate-bounce" style={{ animationDelay: '0.2s' }} />
            <div className="h-1 w-1 bg-purple-500 rounded-full animate-bounce" style={{ animationDelay: '0.4s' }} />
          </div>
        </div>
      </div>
    </div>
  );
}
