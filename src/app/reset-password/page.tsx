"use client";

import { useState, Suspense } from "react";
import { useSearchParams } from "next/navigation";
import Link from "next/link";
import { Rocket, ArrowLeft, Check, X } from "lucide-react";
import { AuthSidePanel } from "@/components/auth-side-panel";

function ResetPasswordForm() {
  const searchParams = useSearchParams();
  const token = searchParams.get("token");
  const [password, setPassword] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState(false);

  const passwordChecks = [
    { label: "At least 8 characters", passed: password.length >= 8 },
    { label: "One uppercase letter (A-Z)", passed: /[A-Z]/.test(password) },
    { label: "One number (0-9)", passed: /\d/.test(password) },
    { label: "One special character (!@#$...)", passed: /[!@#$%^&*(),.?":{}|<>]/.test(password) },
  ];
  const passedCount = passwordChecks.filter((c) => c.passed).length;
  const isPasswordValid = passedCount === 4;

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!token) {
      setError("Missing reset token. Please request a new reset link.");
      return;
    }
    setLoading(true);
    setError(null);

    const res = await fetch("/api/reset-password", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ token, password }),
    });

    setLoading(false);
    if (res.ok) {
      setSuccess(true);
    } else {
      const data = (await res.json().catch(() => null)) as { error?: string } | null;
      setError(data?.error ?? "Reset failed. Please try again.");
    }
  }

  if (success) {
    return (
      <div className="flex min-h-screen">
        <AuthSidePanel
          quote="CareerPilot AI kept me organized and accountable. I landed my dream job in 6 weeks."
          author="Sarah Chen"
          authorRole="Frontend Engineer"
          initials="SC"
        />
        <div className="flex w-full items-center justify-center bg-white px-4 lg:w-1/2">
          <div className="w-full max-w-sm space-y-8 text-center">
            <div className="rounded-xl border border-emerald-200 bg-emerald-50 p-6">
              <Check className="mx-auto h-8 w-8 text-emerald-600" />
              <p className="mt-3 text-sm font-medium text-emerald-800">
                Password reset successfully!
              </p>
              <p className="mt-1 text-xs text-emerald-600">
                You can now sign in with your new password.
              </p>
              <Link
                href="/login"
                className="mt-4 inline-flex items-center gap-1.5 text-sm font-medium text-indigo-600 hover:text-indigo-700"
              >
                <ArrowLeft className="h-3.5 w-3.5" />
                Go to sign in
              </Link>
            </div>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="flex min-h-screen">
      <AuthSidePanel
        quote="CareerPilot AI kept me organized and accountable. I landed my dream job in 6 weeks."
        author="Sarah Chen"
        authorRole="Frontend Engineer"
        initials="SC"
      />
      <div className="flex w-full items-center justify-center bg-white px-4 lg:w-1/2">
        <div className="w-full max-w-sm space-y-8">
          <div className="lg:hidden">
            <Link href="/" className="flex items-center gap-2">
              <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-slate-900">
                <Rocket className="h-4 w-4 text-white" />
              </div>
              <span className="text-lg font-bold tracking-tight">
                CareerPilot<span className="text-indigo-500"> AI</span>
              </span>
            </Link>
          </div>

          <div className="animate-fade-in-up">
            <h1 className="text-2xl font-bold tracking-tight text-slate-900">
              Set new password
            </h1>
            <p className="mt-1.5 text-sm text-slate-500">
              Enter your new password below.
            </p>
          </div>

          <form onSubmit={handleSubmit} className="space-y-5">
            <div>
              <label htmlFor="password" className="block text-sm font-medium text-slate-700">
                New password
              </label>
              <input
                id="password"
                type="password"
                required
                minLength={8}
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                className="mt-2 w-full rounded-xl border border-slate-200 bg-slate-50/50 px-4 py-3 text-sm transition focus:border-indigo-500 focus:bg-white focus:outline-none focus:ring-2 focus:ring-indigo-500/20"
                placeholder="At least 8 characters"
              />
              {password.length > 0 && (
                <div className="mt-3 space-y-1.5">
                  {passwordChecks.map((check) => (
                    <div key={check.label} className="flex items-center gap-2 text-xs">
                      {check.passed ? (
                        <Check className="h-3.5 w-3.5 text-emerald-500" />
                      ) : (
                        <X className="h-3.5 w-3.5 text-slate-300" />
                      )}
                      <span className={check.passed ? "text-slate-600" : "text-slate-400"}>
                        {check.label}
                      </span>
                    </div>
                  ))}
                </div>
              )}
            </div>

            {error && (
              <div className="rounded-xl bg-red-50 px-4 py-3 text-sm text-red-600">
                {error}
              </div>
            )}

            <button
              type="submit"
              disabled={loading || !isPasswordValid}
              className="flex w-full items-center justify-center gap-2 rounded-xl bg-gradient-to-r from-indigo-600 to-indigo-500 px-4 py-3 text-sm font-semibold text-white shadow-sm transition hover:shadow-md hover:from-indigo-700 hover:to-indigo-600 disabled:opacity-50"
            >
              {loading ? "Resetting..." : isPasswordValid ? "Reset password" : "Meet password requirements"}
            </button>
          </form>

          <p className="text-center text-sm text-slate-500">
            <Link href="/login" className="font-semibold text-indigo-600 hover:text-indigo-700">
              Back to sign in
            </Link>
          </p>
        </div>
      </div>
    </div>
  );
}

export default function ResetPasswordPage() {
  return (
    <Suspense>
      <ResetPasswordForm />
    </Suspense>
  );
}
