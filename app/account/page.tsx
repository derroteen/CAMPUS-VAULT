"use client";

import { FormEvent, Suspense, useEffect, useMemo, useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import Image from "next/image";
import { Skeleton } from "@/components/Skeleton";
import { getVerifiedTotpFactorFromList } from "@/lib/auth-mfa";
import { supabase } from "@/lib/supabase";

type FactorLike = {
  id: string;
  status?: string;
};

type EnrollResult = {
  id: string;
  totp?: {
    qr_code?: string;
    secret?: string;
    uri?: string;
  };
};

function getSecretFromUri(uri: string | undefined) {
  if (!uri) {
    return null;
  }

  const match = uri.match(/[?&]secret=([^&]+)/i);
  return match ? decodeURIComponent(match[1]) : null;
}

function AccountPageContent() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const [authChecked, setAuthChecked] = useState(false);
  const [userId, setUserId] = useState<string | null>(null);
  const [isAdmin, setIsAdmin] = useState(false);
  const [verifiedFactor, setVerifiedFactor] = useState<FactorLike | null>(null);
  const [enrolling, setEnrolling] = useState(false);
  const [verifying, setVerifying] = useState(false);
  const [unenrolling, setUnenrolling] = useState(false);
  const [pendingFactorId, setPendingFactorId] = useState<string | null>(null);
  const [pendingQrCode, setPendingQrCode] = useState<string | null>(null);
  const [pendingSecret, setPendingSecret] = useState<string | null>(null);
  const [verificationCode, setVerificationCode] = useState("");
  const [message, setMessage] = useState<string | null>(null);
  const [messageIsError, setMessageIsError] = useState(false);

  const forcedAdminMessage = useMemo(
    () => searchParams.get("mfa_required") === "1",
    [searchParams]
  );

  const loadMfaState = async (currentUserId: string) => {
    const { data: profileData } = await supabase
      .from("profiles")
      .select("is_admin")
      .eq("id", currentUserId)
      .single();

    setIsAdmin(Boolean(profileData?.is_admin));

    const { data: factorsData } = await supabase.auth.mfa.listFactors();
    setVerifiedFactor(getVerifiedTotpFactorFromList(factorsData));
  };

  useEffect(() => {
    const checkAuth = async () => {
      const {
        data: { session },
      } = await supabase.auth.getSession();

      if (!session?.user) {
        router.replace("/login");
        return;
      }

      setUserId(session.user.id);
      await loadMfaState(session.user.id);
      setAuthChecked(true);
    };

    checkAuth();
  }, [router]);

  const handleStartEnrollment = async () => {
    setMessage(null);
    setMessageIsError(false);
    setEnrolling(true);

    const { data, error } = await supabase.auth.mfa.enroll({
      factorType: "totp",
    });

    if (error || !data) {
      setMessage(error?.message ?? "Could not start 2FA enrollment. Please try again.");
      setMessageIsError(true);
      setEnrolling(false);
      return;
    }

    const enrollData = data as EnrollResult;
    setPendingFactorId(enrollData.id);
    setPendingQrCode(enrollData.totp?.qr_code ?? null);
    setPendingSecret(enrollData.totp?.secret ?? getSecretFromUri(enrollData.totp?.uri));
    setMessage("Scan the QR code and enter a 6-digit code to finish setup.");
    setMessageIsError(false);
    setEnrolling(false);
  };

  const handleVerifyEnrollment = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    setMessage(null);
    setMessageIsError(false);

    if (!pendingFactorId) {
      setMessage("Start enrollment first to generate a QR code.");
      setMessageIsError(true);
      return;
    }

    const trimmedCode = verificationCode.trim();
    if (!/^\d{6}$/.test(trimmedCode)) {
      setMessage("Enter a valid 6-digit authentication code.");
      setMessageIsError(true);
      return;
    }

    setVerifying(true);

    const { error } = await supabase.auth.mfa.challengeAndVerify({
      factorId: pendingFactorId,
      code: trimmedCode,
    });

    if (error) {
      setMessage(error.message);
      setMessageIsError(true);
      setVerifying(false);
      return;
    }

    setPendingFactorId(null);
    setPendingQrCode(null);
    setPendingSecret(null);
    setVerificationCode("");

    if (userId) {
      await loadMfaState(userId);
    }

    setMessage("Two-factor authentication has been enabled successfully.");
    setMessageIsError(false);
    setVerifying(false);
  };

  const handleUnenroll = async () => {
    if (!verifiedFactor || isAdmin) {
      return;
    }

    setMessage(null);
    setMessageIsError(false);
    setUnenrolling(true);

    const { error } = await supabase.auth.mfa.unenroll({
      factorId: verifiedFactor.id,
    });

    if (error) {
      setMessage(error.message);
      setMessageIsError(true);
      setUnenrolling(false);
      return;
    }

    setVerifiedFactor(null);
    setMessage("Two-factor authentication has been disabled.");
    setMessageIsError(false);
    setUnenrolling(false);
  };

  if (!authChecked) {
    return (
      <main className="flex min-h-screen items-center justify-center bg-warm-bg px-6 py-12 text-charcoal">
        <div className="w-full max-w-2xl rounded-2xl border border-slate-200 bg-white/80 p-8 shadow-lg border-l-4 border-forest">
          <Skeleton className="h-8 w-48 rounded-lg" />
          <Skeleton className="mt-3 h-4 w-80 rounded-lg" />
          <Skeleton className="mt-8 h-20 w-full rounded-xl" />
          <Skeleton className="mt-4 h-12 w-full rounded-xl" />
        </div>
      </main>
    );
  }

  const isEnrolled = Boolean(verifiedFactor);

  return (
    <main className="min-h-screen bg-warm-bg px-6 py-12 text-charcoal">
      <div className="mx-auto w-full max-w-2xl rounded-2xl border border-slate-200 bg-white/85 p-8 shadow-lg border-l-4 border-forest">
        <h1 className="text-2xl font-semibold font-space-grotesk">Account security</h1>
        <p className="mt-2 text-sm text-slate-600">
          Manage two-factor authentication for your account.
        </p>

        {forcedAdminMessage ? (
          <p className="mt-5 rounded-xl border border-sunflower/40 bg-sunflower/15 px-4 py-3 text-sm text-charcoal">
            Two-factor authentication is required for admin accounts — please enable it below to continue.
          </p>
        ) : null}

        <section className="mt-8 rounded-2xl border-r-[0.5px] border-y-[0.5px] border-r-forest/15 border-y-forest/15 border-l-4 border-l-forest bg-white/90 p-5 shadow-sm">
          <h2 className="text-lg font-semibold text-charcoal">Two-factor authentication</h2>

          {isEnrolled ? (
            <div className="mt-4 space-y-4">
              <p className="text-sm text-forest">Two-factor authentication is enabled.</p>

              {isAdmin ? (
                <p className="text-sm text-coral">
                  Admin accounts are required to keep 2FA enabled.
                </p>
              ) : (
                <button
                  type="button"
                  onClick={handleUnenroll}
                  disabled={unenrolling}
                  className="rounded-xl border border-coral/30 bg-coral/10 px-4 py-2 text-sm font-medium text-coral transition hover:bg-coral/15 disabled:cursor-not-allowed disabled:opacity-70"
                >
                  {unenrolling ? "Disabling..." : "Disable two-factor authentication"}
                </button>
              )}
            </div>
          ) : (
            <div className="mt-4 space-y-4">
              <p className="text-sm text-charcoal/70">No verified authenticator app is enrolled yet.</p>

              {!pendingFactorId ? (
                <button
                  type="button"
                  onClick={handleStartEnrollment}
                  disabled={enrolling}
                  className="rounded-xl bg-forest px-4 py-2 text-sm font-medium text-white transition hover:bg-leaf disabled:cursor-not-allowed disabled:opacity-70"
                >
                  {enrolling ? "Preparing setup..." : "Enable two-factor authentication"}
                </button>
              ) : null}

              {pendingFactorId ? (
                <div className="space-y-4 rounded-xl border border-forest/15 bg-warm-bg p-4">
                  {pendingQrCode ? (
                    <Image
                      src={pendingQrCode}
                      alt="Authenticator QR code"
                      width={176}
                      height={176}
                      unoptimized
                      className="h-44 w-44 rounded-lg border border-slate-200 bg-white p-2"
                    />
                  ) : null}

                  {pendingSecret ? (
                    <p className="text-sm text-charcoal/75">
                      Manual setup key: <span className="font-mono text-charcoal">{pendingSecret}</span>
                    </p>
                  ) : null}

                  <form onSubmit={handleVerifyEnrollment} className="space-y-3">
                    <div>
                      <label htmlFor="mfaCode" className="mb-1 block text-sm text-slate-700">
                        6-digit code from your authenticator app
                      </label>
                      <input
                        id="mfaCode"
                        type="text"
                        inputMode="numeric"
                        pattern="[0-9]{6}"
                        maxLength={6}
                        value={verificationCode}
                        onChange={(event) => setVerificationCode(event.target.value)}
                        className="w-full rounded-xl border border-slate-300 bg-white/90 px-4 py-3 text-charcoal outline-none ring-1 ring-inset ring-transparent focus:ring-2 focus:ring-forest/50"
                        placeholder="123456"
                        required
                      />
                    </div>

                    <button
                      type="submit"
                      disabled={verifying}
                      className="w-full rounded-xl bg-forest px-4 py-3 text-sm font-medium text-white transition hover:bg-leaf disabled:cursor-not-allowed disabled:opacity-70"
                    >
                      {verifying ? "Verifying..." : "Verify and enable 2FA"}
                    </button>
                  </form>
                </div>
              ) : null}
            </div>
          )}

          {message ? (
            <p className={`mt-4 text-sm ${messageIsError ? "text-coral" : "text-forest"}`}>
              {message}
            </p>
          ) : null}
        </section>
      </div>
    </main>
  );
}

export default function AccountPage() {
  return (
    <Suspense
      fallback={
        <main className="flex min-h-screen items-center justify-center bg-warm-bg px-6 py-12 text-charcoal">
          <div className="w-full max-w-2xl rounded-2xl border border-slate-200 bg-white/80 p-8 shadow-lg border-l-4 border-forest">
            <Skeleton className="h-8 w-48 rounded-lg" />
            <Skeleton className="mt-3 h-4 w-80 rounded-lg" />
            <Skeleton className="mt-8 h-20 w-full rounded-xl" />
            <Skeleton className="mt-4 h-12 w-full rounded-xl" />
          </div>
        </main>
      }
    >
      <AccountPageContent />
    </Suspense>
  );
}
