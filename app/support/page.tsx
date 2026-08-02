"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { FormEvent, useCallback, useEffect, useState } from "react";
import { Skeleton } from "@/components/Skeleton";
import { supabase } from "@/lib/supabase";

const PRESET_AMOUNTS = [20, 50, 100, 200] as const;

export default function SupportPage() {
  const router = useRouter();
  const [authChecked, setAuthChecked] = useState(false);
  const [phoneNumber, setPhoneNumber] = useState("");
  const [amountKes, setAmountKes] = useState("");
  const [paymentInProgress, setPaymentInProgress] = useState(false);
  const [paymentReference, setPaymentReference] = useState<string | null>(null);
  const [pollingCount, setPollingCount] = useState(0);
  const [paymentMessage, setPaymentMessage] = useState<string | null>(null);
  const [paymentError, setPaymentError] = useState(false);
  const [paymentSucceeded, setPaymentSucceeded] = useState(false);

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

  const checkTransactionStatus = useCallback(async () => {
    if (!paymentReference) return;

    const { data } = await supabase
      .from("transactions")
      .select("status")
      .eq("paystack_reference", paymentReference)
      .single();

    if (!data) return;

    if (data.status === "success") {
      setPaymentMessage(
        "Thank you for supporting MVCorner! Your tip has been received."
      );
      setPollingCount(0);
      setPaymentReference(null);
      setPaymentSucceeded(true);
    } else if (data.status === "failed") {
      setPaymentMessage("Payment was not completed. Please try again.");
      setPollingCount(0);
      setPaymentReference(null);
      setPaymentError(true);
    }
  }, [paymentReference]);

  useEffect(() => {
    if (!paymentReference || pollingCount >= 30) {
      return;
    }

    const interval = setInterval(async () => {
      await checkTransactionStatus();
      setPollingCount((prev) => prev + 1);
    }, 3000);

    return () => clearInterval(interval);
  }, [paymentReference, pollingCount, checkTransactionStatus]);

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
    pollingCount < 30 &&
    !paymentSucceeded &&
    !paymentError;
  const isBusy = paymentInProgress || isPolling;

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

            {paymentReference &&
            pollingCount >= 30 &&
            !paymentSucceeded &&
            !paymentError ? (
              <p className="text-xs text-slate-500">
                We haven&apos;t received confirmation yet. If you didn&apos;t complete
                the payment on your phone, please cancel and try again.
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
    </main>
  );
}
