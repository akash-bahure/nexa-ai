import React from "react";
import { Navigate } from "react-router";
import { Sparkles, Loader2 } from "lucide-react";
import { useAuthStore } from "../../stores/authStore";

interface ProtectedRouteProps {
  children: React.ReactNode;
}

export default function ProtectedRoute({ children }: ProtectedRouteProps) {
  const isAuthenticated = useAuthStore((state) => state.isAuthenticated);
  const isInitializing = useAuthStore((state) => state.isInitializing);

  if (isInitializing) {
    return (
      <div className="flex h-screen w-screen flex-col items-center justify-center bg-[#0c0d11] text-white">
        <div className="flex h-14 w-14 items-center justify-center rounded-2xl bg-gradient-to-br from-violet-500 to-indigo-600 shadow-xl shadow-violet-500/20">
          <Sparkles size={28} className="text-white" />
        </div>
        <div className="mt-6 flex items-center gap-2.5 text-sm text-zinc-400">
          <Loader2 size={18} className="animate-spin text-violet-400" />
          <span>Initializing Nexa AI workspace...</span>
        </div>
      </div>
    );
  }

  if (!isAuthenticated) {
    return <Navigate to="/login" replace />;
  }

  return <>{children}</>;
}
