import React, { useState } from "react";
import { Link, useNavigate, Navigate } from "react-router";
import { Sparkles, Mail, Lock, Eye, EyeOff, Loader2, ArrowRight } from "lucide-react";
import { useAuthStore } from "../../stores/authStore";

export default function LoginPage() {
  const navigate = useNavigate();
  const isAuthenticated = useAuthStore((state) => state.isAuthenticated);
  const isInitializing = useAuthStore((state) => state.isInitializing);
  const login = useAuthStore((state) => state.login);
  const storeError = useAuthStore((state) => state.error);
  const clearError = useAuthStore((state) => state.clearError);

  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [localError, setLocalError] = useState<string | null>(null);

  if (!isInitializing && isAuthenticated) {
    return <Navigate to="/" replace />;
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLocalError(null);
    clearError();

    const trimmedEmail = email.trim();
    if (!trimmedEmail) {
      setLocalError("Email address is required.");
      return;
    }

    if (!password) {
      setLocalError("Password is required.");
      return;
    }

    setIsSubmitting(true);
    try {
      await login({ email: trimmedEmail, password });
      navigate("/", { replace: true });
    } catch (err) {
      setLocalError(
        err instanceof Error ? err.message : "Failed to sign in. Please verify your credentials."
      );
    } finally {
      setIsSubmitting(false);
    }
  };

  const errorMessage = localError || storeError;

  return (
    <div className="flex min-h-screen w-full items-center justify-center bg-[#0c0d11] p-4 text-white">
      {/* Background ambient glow */}
      <div className="pointer-events-none fixed inset-0 flex items-center justify-center overflow-hidden">
        <div className="h-[480px] w-[480px] rounded-full bg-violet-600/10 blur-[130px]" />
      </div>

      <div className="relative w-full max-w-md">
        {/* Brand Header */}
        <div className="mb-8 text-center">
          <div className="mx-auto mb-4 flex h-14 w-14 items-center justify-center rounded-2xl bg-gradient-to-br from-violet-500 to-indigo-600 shadow-xl shadow-violet-500/25">
            <Sparkles size={28} className="text-white" />
          </div>
          <h1 className="text-2xl font-bold tracking-tight text-white">
            Welcome back to <span className="text-violet-400">Nexa AI</span>
          </h1>
          <p className="mt-1.5 text-xs tracking-wider uppercase text-zinc-500">
            Intelligence Workspace
          </p>
        </div>

        {/* Card */}
        <div className="rounded-2xl border border-white/[0.08] bg-[#15171e]/90 p-8 shadow-2xl backdrop-blur-xl">
          <h2 className="text-lg font-semibold text-white">Sign in to your account</h2>
          <p className="mt-1 text-xs text-zinc-400">
            Access your conversations, models, and AI tools.
          </p>

          {errorMessage && (
            <div className="mt-5 rounded-xl border border-red-500/20 bg-red-500/10 p-3.5 text-xs text-red-300">
              {errorMessage}
            </div>
          )}

          <form onSubmit={handleSubmit} className="mt-6 space-y-4">
            <div>
              <label
                htmlFor="email"
                className="block text-xs font-medium text-zinc-300 mb-1.5"
              >
                Email address
              </label>
              <div className="relative">
                <div className="pointer-events-none absolute inset-y-0 left-0 flex items-center pl-3.5 text-zinc-500">
                  <Mail size={16} />
                </div>
                <input
                  id="email"
                  type="email"
                  autoComplete="email"
                  required
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  placeholder="name@example.com"
                  className="w-full rounded-xl border border-white/[0.08] bg-white/[0.03] py-2.5 pl-10 pr-4 text-sm text-white placeholder-zinc-500 outline-none transition focus:border-violet-500 focus:bg-white/[0.05] focus:ring-1 focus:ring-violet-500"
                />
              </div>
            </div>

            <div>
              <div className="flex items-center justify-between mb-1.5">
                <label
                  htmlFor="password"
                  className="block text-xs font-medium text-zinc-300"
                >
                  Password
                </label>
              </div>
              <div className="relative">
                <div className="pointer-events-none absolute inset-y-0 left-0 flex items-center pl-3.5 text-zinc-500">
                  <Lock size={16} />
                </div>
                <input
                  id="password"
                  type={showPassword ? "text" : "password"}
                  autoComplete="current-password"
                  required
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  placeholder="••••••••"
                  className="w-full rounded-xl border border-white/[0.08] bg-white/[0.03] py-2.5 pl-10 pr-11 text-sm text-white placeholder-zinc-500 outline-none transition focus:border-violet-500 focus:bg-white/[0.05] focus:ring-1 focus:ring-violet-500"
                />
                <button
                  type="button"
                  onClick={() => setShowPassword((prev) => !prev)}
                  className="absolute inset-y-0 right-0 flex items-center pr-3.5 text-zinc-500 hover:text-zinc-300 transition"
                  aria-label={showPassword ? "Hide password" : "Show password"}
                >
                  {showPassword ? <EyeOff size={16} /> : <Eye size={16} />}
                </button>
              </div>
            </div>

            <button
              type="submit"
              disabled={isSubmitting}
              className="mt-2 flex w-full items-center justify-center gap-2 rounded-xl bg-violet-600 py-2.5 text-sm font-semibold text-white shadow-lg shadow-violet-600/20 transition hover:bg-violet-500 disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {isSubmitting ? (
                <>
                  <Loader2 size={16} className="animate-spin" />
                  <span>Signing in...</span>
                </>
              ) : (
                <>
                  <span>Sign in</span>
                  <ArrowRight size={15} />
                </>
              )}
            </button>
          </form>

          <div className="mt-6 border-t border-white/[0.06] pt-5 text-center text-xs text-zinc-400">
            Don't have an account?{" "}
            <Link
              to="/register"
              className="font-semibold text-violet-400 hover:text-violet-300 transition"
            >
              Create an account
            </Link>
          </div>
        </div>
      </div>
    </div>
  );
}
