"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { FormEvent, useEffect, useRef, useState } from "react";
import { Skeleton } from "@/components/Skeleton";
import TipGratitudeModal from "@/components/TipGratitudeModal";
import { supabase } from "@/lib/supabase";

const PRESET_AMOUNTS = [20, 50, 100, 200] as const;

export default function SupportPage() {
  const router = useRouter();
  const [authChecked, setAuthChecked] = useState(false);
  const [phoneNumber, setPhoneNumber] = useState("");
  const [amountKes, setAmountKes] = useState("");
  const [paymentInProgress, setPaymentInProgress] = useState(false);
  const [paymentReference, setPaymentReference] = useState<string | null>(null);
  const [paymentMessage, setPaymentMessage] = useState<string | null>(null);
  const [paymentError, setPaymentError] = useState(false);
  const [paymentSucceeded, setPaymentSucceeded] = useState(false);
  const [showGratitudeModal, setShowGratitudeModal] = useState(false);
  const verifyPollStartRef = useRef<number | null>(null);
  const verifyPollInFlightRef = useRef(false);
  const verifyPollIntervalRef = useRef<number | null>(null);

  useEffect(() => {
    const checkAuth = async () => {
      const {
        data: { session },
      } = await supabase.auth.getSession();

      if (!session?.user) {
        router.push("/login");
        return;
      }

      setAuthChecked(true);
    };

    checkAuth();
  }, [router]);

  useEffect(() => {
    if (!paymentReference) {
      return;
    }

    let cancelled = false;
    verifyPollStartRef.current = Date.now();

    const stopPolling = () => {
      if (verifyPollIntervalRef.current !== null) {
        window.clearInterval(verifyPollIntervalRef.current);
        verifyPollIntervalRef.current = null;
      }
    };

    const checkTransactionStatus = async () => {
      if (verifyPollInFlightRef.current || cancelled) {
        return;
      }

      const startedAt = verifyPollStartRef.current ?? Date.now();
      if (Date.now() - startedAt >= 120000) {
        stopPolling();
        setPaymentMessage("This is taking longer than expected — check back shortly or try again");
        setPaymentReference(null);
        setPaymentError(true);
        return;
      }

      verifyPollInFlightRef.current = true;

      try {
        const {
          data: { session },
        } = await supabase.auth.getSession();

        if (!session?.access_token) {
          return;
        }

        const response = await fetch(
          `/api/paystack/verify?reference=${encodeURIComponent(paymentReference)}`,
          {
            headers: {
              Authorization: `Bearer ${session.access_token}`,
            },
          }
        );

        const result = await response.json();

        if (result.status === "success") {
          stopPolling();
          setPaymentMessage(
            "Thank you for supporting MVCorner! Your tip has been received."
          );
          setPaymentReference(null);
          setPaymentSucceeded(true);
          setShowGratitudeModal(true);
          setPaymentError(false);
          return;
        }

        if (result.status === "failed") {
          stopPolling();
          setPaymentMessage("Payment was not completed. Please try again.");
          setPaymentReference(null);
          setPaymentError(true);
          return;
        }
      } finally {
        verifyPollInFlightRef.current = false;
      }
    };

    verifyPollIntervalRef.current = window.setInterval(() => {
      void checkTransactionStatus();
    }, 8000);

    void checkTransactionStatus();

    return () => {
      cancelled = true;
      stopPolling();
    };
  }, [paymentReference]);

  const handleSubmit = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    setPaymentError(false);
    setPaymentMessage(null);

    const phonePattern = /^(07|01)\d{8}$/;
    if (!phonePattern.test(phoneNumber)) {
      setPaymentMessage("Please enter a valid Kenyan phone number (e.g. 0712345678)");
      setPaymentError(true);
      return;
    }

    const amount = Number(amountKes);
    if (!Number.isFinite(amount) || amount < 5) {
      setPaymentMessage("Please enter a tip amount of at least KES 5.");
      setPaymentError(true);
      return;
    }

    const {
      data: { session },
    } = await supabase.auth.getSession();
    if (!session?.access_token) {
      router.push("/login");
      return;
    }

    setPaymentInProgress(true);

    try {
      const response = await fetch("/api/paystack/charge", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${session.access_token}`,
        },
        body: JSON.stringify({ phoneNumber, amountKes: amount }),
      });

      const result = await response.json();
      if (!result.success) {
        setPaymentMessage(
          result.error ?? "Something went wrong. Please try again."
        );
        setPaymentError(true);
        return;
      }

      setPaymentReference(result.data.reference);
      setPaymentMessage("Check your phone to complete the M-Pesa payment...");
    } catch (error) {
      console.error("Tip error:", error);
      setPaymentMessage("Something went wrong. Please try again.");
      setPaymentError(true);
    } finally {
      setPaymentInProgress(false);
    }
  };

  if (!authChecked) {
    return (
      <main className="flex min-h-screen items-center justify-center bg-warm-bg px-6 py-12 text-charcoal font-space-grotesk">
        <div className="w-full max-w-lg rounded-2xl border border-slate-200 bg-white/80 p-8 shadow-lg border-l-4 border-forest">
          <Skeleton className="h-7 w-52 rounded-lg" />
          <Skeleton className="mt-3 h-4 w-full rounded-lg" />
          <Skeleton className="mt-6 h-12 w-full rounded-xl" />
          <Skeleton className="mt-4 h-12 w-full rounded-xl" />
          <Skeleton className="mt-4 h-12 w-full rounded-xl" />
        </div>
      </main>
    );
  }

  const isPolling =
    Boolean(paymentReference) &&
    !paymentSucceeded &&
    !paymentError;
  const isBusy = paymentInProgress || isPolling;
  const tipAmount = Number(amountKes);

  return (
    <main className="flex min-h-screen items-center justify-center bg-warm-bg px-6 py-12 text-charcoal font-space-grotesk">
      <div className="relative w-full max-w-lg rounded-2xl border border-slate-200 bg-white/80 p-8 shadow-lg border-l-4 border-forest before:absolute before:inset-0 before:bg-gradient-to-br before:from-forest/5 before:to-sunflower/5 before:rounded-2xl">
        <div className="relative z-10">
          <h1 className="text-2xl font-semibold">Support MVCorner</h1>
          <p className="mt-2 text-sm text-slate-600">
            If MVCorner has been useful to you, consider leaving a tip to support
            development. This is completely optional and doesn&apos;t unlock any extra
            features.
          </p>

          <form onSubmit={handleSubmit} className="mt-6 space-y-4">
            <div>
              <label className="mb-1 block text-sm text-slate-700" htmlFor="phone">
                M-Pesa phone number
              </label>
              <input
                id="phone"
                type="tel"
                inputMode="numeric"
                placeholder="e.g. 0712345678"
                required
                value={phoneNumber}
                onChange={(e) => setPhoneNumber(e.target.value)}
                disabled={isBusy}
                className="w-full rounded-xl border border-slate-300 bg-white/90 px-4 py-3 text-charcoal outline-none ring-1 ring-inset ring-transparent focus:ring-2 focus:ring-forest/50 placeholder:text-slate-400 disabled:opacity-60"
              />
            </div>

            <div>
              <label className="mb-1 block text-sm text-slate-700" htmlFor="amount">
                Tip amount (KES)
              </label>
              <div className="grid grid-cols-4 gap-2">
                {PRESET_AMOUNTS.map((preset) => {
                  const isSelected = amountKes === String(preset);
                  return (
                    <button
                      key={preset}
                      type="button"
                      onClick={() => setAmountKes(String(preset))}
                      disabled={isBusy}
                      className={`rounded-xl border px-3 py-2 text-sm font-medium transition disabled:cursor-not-allowed disabled:opacity-60 ${
                        isSelected
                          ? "border-forest bg-forest text-white"
                          : "border-forest/30 bg-forest/10 text-forest hover:bg-forest/20"
                      }`}
                    >
                      {preset}
                    </button>
                  );
                })}
              </div>
              <input
                id="amount"
                type="number"
                inputMode="numeric"
                min="1"
                placeholder="Or enter a custom amount"
                required
                value={amountKes}
                onChange={(e) => setAmountKes(e.target.value)}
                disabled={isBusy}
                className="mt-2 w-full rounded-xl border border-slate-300 bg-white/90 px-4 py-3 text-charcoal outline-none ring-1 ring-inset ring-transparent focus:ring-2 focus:ring-forest/50 placeholder:text-slate-400 disabled:opacity-60"
              />
            </div>

            {paymentMessage ? (
              <p className={`text-sm ${paymentError ? "text-coral" : "text-forest"}`}>
                {paymentMessage}
              </p>
            ) : null}

            {isPolling ? (
              <div className="flex items-center gap-2 text-sm text-slate-600">
                <div className="h-4 w-4 animate-spin rounded-full border-2 border-forest/40 border-t-transparent" />
                <span>Waiting for M-Pesa confirmation...</span>
              </div>
            ) : null}

            <button
              type="submit"
              disabled={isBusy}
              className="w-full rounded-xl bg-forest px-4 py-3 font-medium text-white transition hover:bg-leaf disabled:cursor-not-allowed disabled:opacity-70"
            >
              {paymentInProgress
                ? "Processing..."
                : paymentSucceeded
                  ? "Tip received — send another?"
                  : "Send tip"}
            </button>
          </form>

          <p className="mt-6 text-center text-sm text-slate-600">
            <Link
              href="/dashboard"
              className="text-forest hover:text-leaf underline"
            >
              Back to dashboard
            </Link>
          </p>
        </div>
      </div>

      {showGratitudeModal ? (
        <TipGratitudeModal
          amountPaid={Number.isFinite(tipAmount) ? tipAmount : 0}
          onClose={() => setShowGratitudeModal(false)}
        />
      ) : null}
    </main>
  );
}
