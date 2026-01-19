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
    <div className="min-h-screen flex items-center justify-center bg-gray-900">
      <Loader2 className="w-8 h-8 text-blue-500 animate-spin" />
    </div>
  );
}
