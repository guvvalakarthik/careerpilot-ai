"use client";

import { useState } from "react";
import Link from "next/link";
import { Rocket, ArrowLeft, Mail, CheckCircle2 } from "lucide-react";
import { AuthSidePanel } from "@/components/auth-side-panel";

export default function ForgotPasswordPage() {
  const [email, setEmail] = useState("");
  const [loading, setLoading] = useState(false);
  const [sent, setSent] = useState(false);
  const [devResetUrl, setDevResetUrl] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setLoading(true);
    setError(null);

    const res = await fetch("/api/forgot-password", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ email }),
    });

    setLoading(false);
    if (res.ok) {
      const data = (await res.json()) as { devResetUrl?: string };
      setDevResetUrl(data.devResetUrl ?? null);
      setSent(true);
    } else {
      setError("Something went wrong. Please try again.");
    }
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
              Forgot password?
            </h1>
            <p className="mt-1.5 text-sm text-slate-500">
              Enter your email and we&apos;ll send you a reset link.
            </p>
          </div>

          {sent ? (
            <div className="rounded-xl border border-emerald-200 bg-emerald-50 p-6 text-center">
              <CheckCircle2 className="mx-auto h-8 w-8 text-emerald-600" />
              <p className="mt-3 text-sm font-medium text-emerald-800">
                Check your inbox
              </p>
              <p className="mt-1 text-xs text-emerald-600">
                If an account exists for {email}, you&apos;ll receive a password reset link shortly.
              </p>
              {devResetUrl && (
                <Link
                  href={devResetUrl}
                  className="mt-4 inline-flex rounded-lg bg-emerald-700 px-3 py-2 text-sm font-semibold text-white hover:bg-emerald-800"
                >
                  Open local reset link
                </Link>
              )}
              <Link
                href="/login"
                className="mt-4 flex items-center justify-center gap-1.5 text-sm font-medium text-indigo-600 hover:text-indigo-700"
              >
                <ArrowLeft className="h-3.5 w-3.5" />
                Back to sign in
              </Link>
            </div>
          ) : (
            <form onSubmit={handleSubmit} className="space-y-5">
              <div>
                <label htmlFor="email" className="block text-sm font-medium text-slate-700">
                  Email
                </label>
                <div className="relative mt-2">
                  <Mail className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />
                  <input
                    id="email"
                    type="email"
                    required
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    className="w-full rounded-xl border border-slate-200 bg-slate-50/50 px-4 py-3 pl-10 text-sm transition focus:border-indigo-500 focus:bg-white focus:outline-none focus:ring-2 focus:ring-indigo-500/20"
                    placeholder="you@example.com"
                  />
                </div>
              </div>

              {error && (
                <div className="rounded-xl bg-red-50 px-4 py-3 text-sm text-red-600">
                  {error}
                </div>
              )}

              <button
                type="submit"
                disabled={loading}
                className="flex w-full items-center justify-center gap-2 rounded-xl bg-gradient-to-r from-indigo-600 to-indigo-500 px-4 py-3 text-sm font-semibold text-white shadow-sm transition hover:shadow-md hover:from-indigo-700 hover:to-indigo-600 disabled:opacity-50"
              >
                {loading ? "Sending..." : "Send reset link"}
              </button>
            </form>
          )}

          <p className="text-center text-sm text-slate-500">
            Remembered your password?{" "}
            <Link href="/login" className="font-semibold text-indigo-600 hover:text-indigo-700">
              Sign in
            </Link>
          </p>
        </div>
      </div>
    </div>
  );
}
