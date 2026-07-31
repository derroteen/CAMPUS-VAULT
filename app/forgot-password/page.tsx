"use client";

import Link from "next/link";
import { FormEvent, useState } from "react";
import { supabase } from "@/lib/supabase";

export default function ForgotPasswordPage() {
  const [email, setEmail] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [success, setSuccess] = useState(false);

  const handleSubmit = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    setError(null);
    setLoading(true);

    const { error } = await supabase.auth.resetPasswordForEmail(email, {
      redirectTo: `${window.location.origin}/reset-password`,
    });

    if (error) {
      setError(error.message);
      setLoading(false);
      return;
    }

    setSuccess(true);
    setLoading(false);
  };

  if (success) {
    return (
      <main className="flex min-h-screen items-center justify-center bg-warm-bg px-6 py-12 text-charcoal">
        <div className="w-full max-w-md rounded-2xl border border-slate-200 bg-white/80 p-8 shadow-lg border-l-4 border-forest relative before:absolute before:inset-0 before:bg-gradient-to-br before:from-forest/5 before:to-sunflower/5 before:rounded-2xl">
          <div className="relative z-10">
            <div className="mx-auto flex h-16 w-16 items-center justify-center rounded-full bg-emerald-500/15">
              <svg
                className="h-8 w-8 text-emerald-400"
                fill="none"
                viewBox="0 0 24 24"
                stroke="currentColor"
                strokeWidth={2.5}
              >
                <path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" />
              </svg>
            </div>
            <h1 className="mt-6 text-2xl font-semibold font-space-grotesk">Check your email</h1>
            <p className="mt-2 text-sm text-slate-600">
              If an account exists for <strong>{email}</strong>, you&apos;ll receive a password reset link shortly.
            </p>
            <p className="mt-4 text-sm text-slate-600">
              Didn&apos;t receive it? Check your spam folder or{" "}
              <Link href="/forgot-password" className="text-forest hover:text-leaf underline">
                try again
              </Link>
              .
            </p>
            <div className="mt-6">
              <Link
                href="/login"
                className="rounded-xl bg-forest px-4 py-2 font-medium text-white transition hover:bg-leaf"
              >
                Back to login
              </Link>
            </div>
          </div>
        </div>
      </main>
    );
  }

  return (
    <main className="flex min-h-screen items-center justify-center bg-warm-bg px-6 py-12 text-charcoal">
      <div className="w-full max-w-md rounded-2xl border border-slate-200 bg-white/80 p-8 shadow-lg border-l-4 border-forest relative before:absolute before:inset-0 before:bg-gradient-to-br before:from-forest/5 before:to-sunflower/5 before:rounded-2xl">
        <div className="relative z-10">
          <h1 className="text-2xl font-semibold font-space-grotesk">Forgot password?</h1>
          <p className="mt-2 text-sm text-slate-600">
            Enter your email and we&apos;ll send you a link to reset your password.
          </p>

          <form onSubmit={handleSubmit} className="mt-6 space-y-4">
            <div>
              <label className="mb-1 block text-sm text-slate-700" htmlFor="email">
                Email
              </label>
              <input
                id="email"
                type="email"
                required
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                className="w-full rounded-xl border border-slate-300 bg-white/90 px-4 py-3 text-charcoal outline-none ring-1 ring-inset ring-transparent focus:ring-2 focus:ring-forest/50"
              />
            </div>

            {error ? <p className="text-sm text-coral">{error}</p> : null}

            <button
              type="submit"
              disabled={loading}
              className="w-full rounded-xl bg-forest px-4 py-3 font-medium text-white transition hover:bg-leaf disabled:cursor-not-allowed disabled:opacity-70"
            >
              {loading ? "Sending..." : "Send reset link"}
            </button>
          </form>

          <p className="mt-4 text-center text-sm text-slate-600">
            Remember your password?{" "}
            <Link href="/login" className="text-forest hover:text-leaf underline">
              Log in
            </Link>
          </p>
        </div>
      </div>
    </main>
  );
}