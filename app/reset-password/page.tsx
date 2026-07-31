"use client";

import Link from "next/link";
import { FormEvent, useState } from "react";
import { supabase } from "@/lib/supabase";

export default function ResetPasswordPage() {
  const [newPassword, setNewPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [success, setSuccess] = useState(false);

  const handleSubmit = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    setError(null);

    if (newPassword !== confirmPassword) {
      setError("Passwords do not match.");
      return;
    }

    if (newPassword.length < 6) {
      setError("Password must be at least 6 characters.");
      return;
    }

    setLoading(true);

    const { error } = await supabase.auth.updateUser({ password: newPassword });

    if (error) {
      setError(error.message);
      setLoading(false);
      return;
    }

    await supabase.auth.signOut();

    setSuccess(true);
    setLoading(false);
  };

  if (success) {
    return (
      <main className="flex min-h-screen items-center justify-center bg-warm-bg px-6 py-12 text-charcoal">
        <div className="w-full max-w-md rounded-2xl border border-slate-200 bg-white/80 p-8 shadow-lg border-l-4 border-forest relative before:absolute before:inset-0 before:bg-gradient-to-br before:from-forest/5 before:to-sunflower/5 before:rounded-2xl">
          <div className="relative z-10">
            <div className="flex h-16 w-16 items-center justify-center rounded-full bg-emerald-500/15 mx-auto">
              <svg className="h-9 w-9 text-emerald-400" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" />
              </svg>
            </div>
            <h1 className="mt-6 text-center text-2xl font-semibold font-space-grotesk">Password updated</h1>
            <p className="mt-2 text-center text-sm text-slate-600">
              Your password has been successfully reset.
            </p>
            <div className="mt-6">
              <Link
                href="/login"
                className="block w-full rounded-md bg-forest px-4 py-2 font-medium text-white text-center transition hover:bg-leaf"
              >
                Go to login
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
          <h1 className="text-2xl font-semibold font-space-grotesk">Set a new password</h1>
          <p className="mt-2 text-sm text-slate-600">
            Your new password must be different from previous passwords.
          </p>

          <form onSubmit={handleSubmit} className="mt-6 space-y-4">
            <div>
              <label className="mb-1 block text-sm text-slate-700" htmlFor="newPassword">
                New password
              </label>
              <input
                id="newPassword"
                type="password"
                required
                value={newPassword}
                onChange={(e) => setNewPassword(e.target.value)}
               className="w-full rounded-xl border border-slate-300 bg-white/90 px-4 py-3 text-charcoal outline-none ring-1 ring-inset ring-transparent focus:ring-2 focus:ring-forest/50"
                autoComplete="new-password"
              />
            </div>

            <div>
              <label className="mb-1 block text-sm text-slate-700" htmlFor="confirmPassword">
                Confirm new password
              </label>
              <input
                id="confirmPassword"
                type="password"
                required
                value={confirmPassword}
                onChange={(e) => setConfirmPassword(e.target.value)}
                className="w-full rounded-xl border border-slate-300 bg-white/90 px-4 py-3 text-charcoal outline-none ring-1 ring-inset ring-transparent focus:ring-2 focus:ring-forest/50"
                autoComplete="new-password"
              />
            </div>

            {error ? <p className="text-sm text-coral">{error}</p> : null}

            <button
              type="submit"
              disabled={loading}
              className="w-full rounded-xl bg-forest px-4 py-3 font-medium text-white transition hover:bg-leaf disabled:cursor-not-allowed disabled:opacity-70"
            >
              {loading ? "Updating..." : "Update password"}
            </button>
          </form>

          <p className="mt-4 text-center text-sm text-slate-600">
            <Link href="/login" className="text-forest hover:text-leaf underline">
              Back to login
            </Link>
          </p>
        </div>
      </div>
    </main>
  );
}