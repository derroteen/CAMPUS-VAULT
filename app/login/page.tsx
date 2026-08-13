"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { FormEvent, useState } from "react";
import {
  getVerifiedTotpFactorFromList,
  userMustEnrollAdminMfa,
} from "@/lib/auth-mfa";
import { supabase } from "@/lib/supabase";
import PasswordInput from "@/components/PasswordInput";

export default function LoginPage() {
  const router = useRouter();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [mfaCode, setMfaCode] = useState("");
  const [mfaFactorId, setMfaFactorId] = useState<string | null>(null);
  const [requiresMfaChallenge, setRequiresMfaChallenge] = useState(false);
  const [infoMessage, setInfoMessage] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [googleLoading, setGoogleLoading] = useState(false);

  const finalizePostLogin = async () => {
    const {
      data: { session },
    } = await supabase.auth.getSession();

    if (!session?.user) {
      router.replace("/login");
      return;
    }

    const mustEnrollMfa = await userMustEnrollAdminMfa(session.user.id);
    if (mustEnrollMfa) {
      router.push("/account?mfa_required=1");
      return;
    }

    router.push("/dashboard");
  };

  const handleGoogleSignIn = async () => {
    setError(null);
    setInfoMessage(null);
    setGoogleLoading(true);

    const { error } = await supabase.auth.signInWithOAuth({
      provider: "google",
      options: {
        redirectTo: `${window.location.origin}/auth/callback?next=/dashboard`,
      },
    });

    if (error) {
      setError(error.message);
      setGoogleLoading(false);
    }
  };

  const handleSubmit = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    setError(null);
    setInfoMessage(null);
    setLoading(true);

    if (!requiresMfaChallenge) {
      const { error } = await supabase.auth.signInWithPassword({ email, password });

      if (error) {
        setError(error.message);
        setLoading(false);
        return;
      }

      const { data: aalData, error: aalError } =
        await supabase.auth.mfa.getAuthenticatorAssuranceLevel();

      if (aalError) {
        setError(aalError.message);
        setLoading(false);
        return;
      }

      const secondFactorRequired =
        aalData.currentLevel === "aal1" && aalData.nextLevel === "aal2";

      if (secondFactorRequired) {
        const { data: factorsData, error: factorsError } = await supabase.auth.mfa.listFactors();

        if (factorsError) {
          setError(factorsError.message);
          setLoading(false);
          return;
        }

        const verifiedFactor = getVerifiedTotpFactorFromList(factorsData);
        if (!verifiedFactor) {
          setError("No verified authenticator factor found for this account.");
          setLoading(false);
          return;
        }

        setMfaFactorId(verifiedFactor.id);
        setRequiresMfaChallenge(true);
        setInfoMessage("Enter the 6-digit code from your authenticator app to complete sign-in.");
        setLoading(false);
        return;
      }

      await finalizePostLogin();
      setLoading(false);
      return;
    }

    if (!mfaFactorId) {
      setError("No MFA factor is available for this sign-in.");
      setLoading(false);
      return;
    }

    const trimmedCode = mfaCode.trim();
    if (!/^\d{6}$/.test(trimmedCode)) {
      setError("Enter a valid 6-digit authentication code.");
      setLoading(false);
      return;
    }

    const { error } = await supabase.auth.mfa.challengeAndVerify({
      factorId: mfaFactorId,
      code: trimmedCode,
    });

    if (error) {
      setError(error.message);
      setLoading(false);
      return;
    }

    await finalizePostLogin();
    setLoading(false);
  };

  return (
    <main className="flex min-h-screen items-center justify-center bg-warm-bg px-6 py-12 text-charcoal">
      <div className="w-full max-w-md rounded-2xl border border-slate-200 bg-white/80 p-8 shadow-lg border-l-4 border-forest relative before:absolute before:inset-0 before:bg-gradient-to-br before:from-forest/5 before:to-sunflower/5 before:rounded-2xl">
        <div className="relative z-10">
          <h1 className="text-2xl font-semibold font-space-grotesk">Log in to MVCorner</h1>
          <p className="mt-2 text-sm text-slate-600">Welcome back. Enter your details to continue.</p>

          <div className="mt-6">
            <button
              type="button"
              onClick={handleGoogleSignIn}
              disabled={googleLoading || loading}
              className="flex w-full items-center justify-center gap-3 rounded-xl border border-slate-300 bg-white px-4 py-3 text-sm font-medium text-charcoal transition hover:border-forest/40 hover:bg-warm-bg disabled:cursor-not-allowed disabled:opacity-70"
            >
              <svg aria-hidden="true" viewBox="0 0 24 24" className="h-5 w-5">
                <path
                  fill="#EA4335"
                  d="M12 10.2v3.9h5.5c-.2 1.3-1.5 3.9-5.5 3.9-3.3 0-6-2.8-6-6.2s2.7-6.2 6-6.2c1.9 0 3.1.8 3.8 1.5l2.6-2.5C16.8 2.9 14.6 2 12 2 6.9 2 2.8 6.5 2.8 12s4.1 10 9.2 10c5.3 0 8.8-3.8 8.8-9.1 0-.6-.1-1.1-.2-1.6H12z"
                />
                <path
                  fill="#34A853"
                  d="M2.8 12c0 1.8.7 3.5 1.8 4.8l3-2.4c-.4-.7-.7-1.5-.7-2.4s.2-1.7.7-2.4l-3-2.4C3.5 8.5 2.8 10.2 2.8 12z"
                />
                <path
                  fill="#FBBC05"
                  d="M12 22c2.5 0 4.7-.9 6.2-2.5l-3-2.4c-.8.6-1.8 1-3.2 1-2.5 0-4.6-1.8-5.4-4.2l-3 2.3C5.1 19.8 8.2 22 12 22z"
                />
                <path
                  fill="#4285F4"
                  d="M18.2 19.5c1.8-1.7 2.8-4.1 2.8-7.5 0-.6-.1-1.1-.2-1.6H12v3.9h5.5c-.3 1.4-1.1 2.5-2.3 3.3l3 2.4z"
                />
              </svg>
              {googleLoading ? "Redirecting to Google..." : "Sign in with Google"}
            </button>

            <div className="my-5 flex items-center gap-3">
              <div className="h-px flex-1 bg-slate-200" />
              <span className="text-xs uppercase tracking-[0.15em] text-slate-500">or continue with email</span>
              <div className="h-px flex-1 bg-slate-200" />
            </div>
          </div>

          <form onSubmit={handleSubmit} className="mt-6 space-y-4">
            {!requiresMfaChallenge ? (
              <>
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

                <div>
                  <label className="mb-1 block text-sm text-slate-700" htmlFor="password">
                    Password
                  </label>
                  <PasswordInput
                    id="password"
                    required
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                  />
                </div>

                <p className="mt-1 text-right">
                  <Link href="/forgot-password" className="text-xs text-forest hover:text-leaf underline">
                    Forgot password?
                  </Link>
                </p>
              </>
            ) : (
              <div>
                <label className="mb-1 block text-sm text-slate-700" htmlFor="mfaCode">
                  6-digit authentication code
                </label>
                <input
                  id="mfaCode"
                  type="text"
                  inputMode="numeric"
                  pattern="[0-9]{6}"
                  maxLength={6}
                  required
                  value={mfaCode}
                  onChange={(e) => setMfaCode(e.target.value)}
                  className="w-full rounded-xl border border-slate-300 bg-white/90 px-4 py-3 text-charcoal outline-none ring-1 ring-inset ring-transparent focus:ring-2 focus:ring-forest/50"
                  placeholder="123456"
                />
              </div>
            )}

            {infoMessage ? <p className="text-sm text-forest">{infoMessage}</p> : null}

            {error ? <p className="text-sm text-coral">{error}</p> : null}

            <button
              type="submit"
              disabled={loading}
              className="w-full rounded-xl bg-forest px-4 py-3 font-medium text-white transition hover:bg-leaf disabled:cursor-not-allowed disabled:opacity-70"
            >
              {loading
                ? "Signing in..."
                : requiresMfaChallenge
                  ? "Verify and continue"
                  : "Log in"}
            </button>
          </form>

          <p className="mt-4 text-center text-sm text-slate-600">
            Need an account?{" "}
            <Link href="/signup" className="text-forest hover:text-leaf underline">
              Sign up
            </Link>
          </p>
        </div>
      </div>
    </main>
  );
}
