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
      <main className="flex min-h-screen items-center justify-center bg-slate-950 px-6 py-12 text-white">
        <div className="w-full max-w-md rounded-xl border border-slate-800 bg-slate-900 p-8 shadow-xl">
          <div className="flex h-16 w-16 items-center justify-center rounded-full bg-emerald-500/15 mx-auto">
            <svg className="h-9 w-9 text-emerald-400" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" />
            </svg>
          </div>
          <h1 className="mt-6 text-center text-2xl font-semibold">Password updated</h1>
          <p className="mt-2 text-center text-sm text-slate-400">
            Your password has been successfully reset.
          </p>
          <div className="mt-6">
            <Link
              href="/login"
              className="block w-full rounded-md bg-sky-600 px-4 py-2 font-medium text-white text-center transition hover:bg-sky-500"
            >
              Go to login
            </Link>
          </div>
        </div>
      </main>
    );
  }

  return (
    <main className="flex min-h-screen items-center justify-center bg-slate-950 px-6 py-12 text-white">
      <div className="w-full max-w-md rounded-xl border border-slate-800 bg-slate-900 p-8 shadow-xl">
        <h1 className="text-2xl font-semibold">Set a new password</h1>
        <p className="mt-2 text-sm text-slate-400">
          Your new password must be different from previous passwords.
        </p>

        <form onSubmit={handleSubmit} className="mt-6 space-y-4">
          <div>
            <label className="mb-1 block text-sm text-slate-300" htmlFor="newPassword">
              New password
            </label>
            <input
              id="newPassword"
              type="password"
              required
              value={newPassword}
              onChange={(e) => setNewPassword(e.target.value)}
              className="w-full rounded-md border border-slate-700 bg-slate-950 px-3 py-2 text-white outline-none ring-0"
              autoComplete="new-password"
            />
          </div>

          <div>
            <label className="mb-1 block text-sm text-slate-300" htmlFor="confirmPassword">
              Confirm new password
            </label>
            <input
              id="confirmPassword"
              type="password"
              required
              value={confirmPassword}
              onChange={(e) => setConfirmPassword(e.target.value)}
              className="w-full rounded-md border border-slate-700 bg-slate-950 px-3 py-2 text-white outline-none ring-0"
              autoComplete="new-password"
            />
          </div>

          {error ? <p className="text-sm text-rose-400">{error}</p> : null}

          <button
            type="submit"
            disabled={loading}
            className="w-full rounded-md bg-sky-600 px-4 py-2 font-medium text-white transition hover:bg-sky-500 disabled:cursor-not-allowed disabled:opacity-70"
          >
            {loading ? "Updating..." : "Update password"}
          </button>
        </form>

        <p className="mt-4 text-center text-sm text-slate-400">
          <Link href="/login" className="text-sky-400 hover:text-sky-300">
            Back to login
          </Link>
        </p>
      </div>
    </main>
  );
}