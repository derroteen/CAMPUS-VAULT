"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { FormEvent, useEffect, useRef, useState } from "react";
import { Check, ArrowLeft, Sparkles, ShieldCheck } from "lucide-react";
import PaymentSuccessModal from "@/components/PaymentSuccessModal";
import { Skeleton } from "@/components/Skeleton";
import { getPlanPrice, type ProPlanId } from "@/lib/pricing";
import { isSubscriptionCurrentlyActive } from "@/lib/subscription-status";
import { supabase } from "@/lib/supabase";

const PRO_PLANS = [
  { id: "week", label: "1 Week" },
  { id: "two_week", label: "2 Weeks" },
  { id: "month", label: "1 Month" },
] as const;

export default function ProUpgradePage() {
  const router = useRouter();

  const [isPro, setIsPro] = useState(false);
  const [isTrialAccess, setIsTrialAccess] = useState(false);
  const [proExpiresAt, setProExpiresAt] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [selectedPlan, setSelectedPlan] = useState<ProPlanId | null>(null);
  const [phoneNumber, setPhoneNumber] = useState("");
  const [paymentInProgress, setPaymentInProgress] = useState(false);
  const [paymentReference, setPaymentReference] = useState<string | null>(null);
  const [paymentMessage, setPaymentMessage] = useState<string | null>(null);
  const [paymentError, setPaymentError] = useState(false);
  const [paymentSucceeded, setPaymentSucceeded] = useState(false);
  const [showSuccessModal, setShowSuccessModal] = useState(false);
  const verifyPollStartRef = useRef<number | null>(null);
  const verifyPollInFlightRef = useRef(false);
  const verifyPollIntervalRef = useRef<number | null>(null);

  useEffect(() => {
    const checkSubscription = async () => {
      const {
        data: { session },
      } = await supabase.auth.getSession();

      if (!session?.user) {
        router.replace("/login");
        return;
      }

      const { data } = await supabase
        .from("subscriptions")
        .select("tier, status, expires_at, paystack_ref")
        .eq("user_id", session.user.id)
        .eq("status", "active")
        .order("started_at", { ascending: false })
        .limit(1)
        .maybeSingle();

      if (data?.tier === "pro" && isSubscriptionCurrentlyActive(data)) {
        setIsPro(true);
        setProExpiresAt(data.expires_at ?? null);
        setIsTrialAccess(!data.paystack_ref);
      }

      setLoading(false);
    };

    checkSubscription();
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
        setPaymentError(true);
        setPaymentReference(null);
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
          setPaymentMessage("You're now Pro! Enjoy boosted visibility and unlimited listings.");
          setPaymentReference(null);
          setPaymentSucceeded(true);
          setProExpiresAt(result.expiresAt);
          setShowSuccessModal(true);
          setPaymentError(false);
          setIsPro(true);
          setIsTrialAccess(false);
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

    if (!selectedPlan) {
      setPaymentMessage("Please select a Pro plan first.");
      setPaymentError(true);
      return;
    }

    const phonePattern = /^(07|01)\d{8}$/;
    if (!phonePattern.test(phoneNumber)) {
      setPaymentMessage("Please enter a valid Kenyan phone number (e.g. 0712345678)");
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
      const response = await fetch("/api/paystack/subscribe", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${session.access_token}`,
        },
        body: JSON.stringify({ phoneNumber, plan: selectedPlan }),
      });

      const result = await response.json();
      if (!result.success) {
        setPaymentMessage(result.error ?? "Something went wrong. Please try again.");
        setPaymentError(true);
        return;
      }

      setPaymentReference(result.data.reference);
      setPaymentSucceeded(false);
      setPaymentMessage("Check your phone to complete the M-Pesa payment...");
    } catch (error) {
      console.error("Pro subscription payment error:", error);
      setPaymentMessage("Something went wrong. Please try again.");
      setPaymentError(true);
    } finally {
      setPaymentInProgress(false);
    }
  };

  const isPolling =
    Boolean(paymentReference) &&
    !paymentSucceeded &&
    !paymentError;
  const isBusy = paymentInProgress || isPolling;
  const showRenewalForm = !isPro || isTrialAccess;
  const trialEndDateLabel = proExpiresAt
    ? new Date(proExpiresAt).toLocaleDateString("en-KE", {
        month: "short",
        day: "numeric",
        year: "numeric",
      })
    : null;
  // Temporary local testing aid for Sept 5-Nov 5, 2026 launch-offer verification; remove after manual validation.
  const testDateParam =
    process.env.NODE_ENV !== "production" && typeof window !== "undefined"
      ? new URLSearchParams(window.location.search).get("testDate")
      : null;
  const testDate = testDateParam ? new Date(testDateParam) : undefined;
  const pricedPlans = PRO_PLANS.map((plan) => ({
    ...plan,
    ...getPlanPrice(plan.id, testDate),
  }));
  const showLaunchOffer = pricedPlans.some((plan) => plan.isLaunchOffer);
  const selectedPlanPricing = selectedPlan
    ? pricedPlans.find((plan) => plan.id === selectedPlan)
    : null;

  if (loading) {
    return (
      <main className="min-h-screen bg-warm-bg px-4 py-10 text-charcoal sm:px-6 lg:px-8">
        <div className="mx-auto max-w-4xl grid gap-6 md:grid-cols-2">
          {Array.from({ length: 2 }).map((_, index) => (
            <div
              key={index}
              className="rounded-3xl border-r-[0.5px] border-y-[0.5px] border-r-forest/15 border-y-forest/15 border-l-4 border-l-forest bg-white/90 p-6 shadow-sm sm:p-8"
            >
              <Skeleton className="h-6 w-32 rounded-lg" />
              <Skeleton className="mt-6 h-8 w-40 rounded-lg" />
              <div className="mt-6 space-y-3">
                <Skeleton className="h-4 w-3/4 rounded-lg" />
                <Skeleton className="h-4 w-2/3 rounded-lg" />
                <Skeleton className="h-4 w-1/2 rounded-lg" />
              </div>
            </div>
          ))}
        </div>
      </main>
    );
  }

  return (
    <main className="min-h-screen bg-warm-bg px-4 py-10 text-charcoal sm:px-6 lg:px-8">
      {showSuccessModal ? (
        <PaymentSuccessModal
          amountPaid={selectedPlanPricing?.amountKes ?? 0}
          expiresAt={proExpiresAt ?? ""}
          onClose={() => setShowSuccessModal(false)}
        />
      ) : null}

      <div className="mx-auto max-w-4xl">
        {/* Navigation */}
        <Link
          href="/marketplace/my-listings"
          className="mb-6 inline-flex items-center gap-1.5 text-sm text-charcoal/60 transition hover:text-forest"
        >
          <ArrowLeft className="h-4 w-4" />
          Back to my products
        </Link>

        {/* Header */}
        <div className="mb-10 text-center">
          <div className="inline-flex items-center gap-1.5 rounded-full border border-sunflower/30 bg-sunflower/15 px-3.5 py-1 text-sm font-medium text-charcoal">
            <Sparkles className="h-4 w-4 text-sunflower" />
            Marketplace Pro
          </div>
          <h1 className="mt-4 text-3xl font-bold tracking-tight sm:text-4xl">
            Upgrade your selling power
          </h1>
          <p className="mt-2 text-charcoal/60">
            Reach more buyers and manage more items on MVCorner Marketplace.
          </p>
        </div>

        {/* Current status banner */}
        <div className="mb-8 rounded-2xl border-r-[0.5px] border-y-[0.5px] border-r-forest/15 border-y-forest/15 border-l-4 border-l-coral bg-white/90 p-4 text-center shadow-sm">
          <span className="text-sm text-charcoal/60">Your current plan: </span>
          <span
            className={`font-semibold ${
              isPro ? "text-leaf" : "text-charcoal"
            }`}
          >
            {isPro ? "Pro Tier (Active)" : "Free Tier"}
          </span>
        </div>

        {/* Pricing Grid */}
        <div className="grid gap-6 md:grid-cols-2">
          {/* Free Tier Card */}
          <div className="rounded-3xl border-r-[0.5px] border-y-[0.5px] border-r-forest/15 border-y-forest/15 border-l-4 border-l-forest bg-white/90 p-6 shadow-sm sm:p-8 flex flex-col justify-between">
            <div>
              <h2 className="text-xl font-semibold text-charcoal">Free Plan</h2>
              <p className="mt-1 text-sm text-charcoal/60">
                Standard features for occasional sellers.
              </p>
              <div className="mt-6 text-3xl font-bold text-charcoal">
                KES 0 <span className="text-sm font-normal text-charcoal/60">/ forever</span>
              </div>

              <ul className="mt-6 space-y-3 text-sm text-charcoal/70">
                <li className="flex items-center gap-2.5">
                  <Check className="h-4 w-4 text-leaf" />
                  Up to 3 active products
                </li>
                <li className="flex items-center gap-2.5">
                  <Check className="h-4 w-4 text-leaf" />
                  Up to 2 images per product
                </li>
                <li className="flex items-center gap-2.5">
                  <Check className="h-4 w-4 text-leaf" />
                  Listings stay active for 14 days, then expire automatically
                </li>
              </ul>
            </div>

            <div className="mt-8">
              <button
                type="button"
                disabled
                className="w-full rounded-xl border border-forest/15 bg-warm-bg py-3 text-sm font-medium text-charcoal/45 cursor-not-allowed"
              >
                {isPro ? "Default Plan" : "Current Plan"}
              </button>
            </div>
          </div>

          {/* Pro Tier Card */}
          <div className="relative rounded-3xl border-r-[0.5px] border-y-[0.5px] border-r-forest/15 border-y-forest/15 border-l-4 border-l-coral bg-white/90 p-6 shadow-sm sm:p-8 flex flex-col justify-between">
            <div className="absolute -top-3 right-6 rounded-full bg-sunflower px-3 py-0.5 text-xs font-semibold text-charcoal">
              RECOMMENDED
            </div>

            <div>
              <h2 className="text-xl font-semibold text-charcoal flex items-center gap-2">
                Pro Plan
                <ShieldCheck className="h-5 w-5 text-coral" />
              </h2>
              {showLaunchOffer ? (
                <div className="mt-3 inline-flex items-center rounded-full border border-sunflower/40 bg-sunflower/15 px-3 py-1 text-xs font-semibold uppercase tracking-[0.18em] text-charcoal">
                  Launch Offer
                </div>
              ) : null}
              <p className="mt-1 text-sm text-charcoal/60">
                Maximum visibility &amp; unlimited product capacity.
              </p>
              {showLaunchOffer ? (
                <p className="mt-2 text-sm text-coral">
                  Launch offer pricing ends on Nov 5, 2026. Prices increase after that date.
                </p>
              ) : null}
              <div className="mt-6 text-3xl font-bold text-forest">
                Pro Upgrade
              </div>

              <ul className="mt-6 space-y-3 text-sm text-charcoal/70">
                <li className="flex items-center gap-2.5">
                  <Check className="h-4 w-4 text-leaf" />
                  Unlimited active products (vs. 3 on Free)
                </li>
                <li className="flex items-center gap-2.5">
                  <Check className="h-4 w-4 text-leaf" />
                  Up to 6 images per product (vs. 2 on Free)
                </li>
                <li className="flex items-center gap-2.5">
                  <Check className="h-4 w-4 text-leaf" />
                  Boosted visibility - your products appear first in marketplace search results
                </li>
                <li className="flex items-center gap-2.5">
                  <Check className="h-4 w-4 text-leaf" />
                  Priority placement on the MVCorner homepage featured section
                </li>
                <li className="flex items-center gap-2.5">
                  <Check className="h-4 w-4 text-leaf" />
                  Listings stay active for 30 days, then expire automatically (vs. 14 days on Free)
                </li>
              </ul>
            </div>

            <div className="mt-8 space-y-3">
              {isPro && !isTrialAccess ? (
                <div className="rounded-xl border border-leaf/25 bg-leaf/10 py-3 text-center text-sm font-medium text-forest">
                  Pro Plan Active
                </div>
              ) : (
                <>
                  {isTrialAccess ? (
                    <p className="rounded-xl border border-leaf/25 bg-leaf/10 px-4 py-3 text-sm text-forest">
                      You already have Pro access until {trialEndDateLabel ?? "your trial end date"} - need more time? You can renew below.
                    </p>
                  ) : null}

                  {showRenewalForm ? (
                    <form onSubmit={handleSubmit} className="space-y-3">
                      <div className="space-y-2">
                        {pricedPlans.map((plan) => {
                          const isSelected = selectedPlan === plan.id;
                          return (
                            <button
                              key={plan.id}
                              type="button"
                              onClick={() => setSelectedPlan(plan.id)}
                              disabled={isBusy}
                              className={`w-full rounded-xl border px-3 py-2 text-left text-sm font-medium transition disabled:cursor-not-allowed disabled:opacity-60 ${
                                isSelected
                                  ? "border-forest bg-forest text-white"
                                  : "border-forest/30 bg-forest/10 text-forest hover:bg-forest/20"
                              }`}
                            >
                              <span className="flex items-center justify-between gap-3">
                                <span>{plan.label}</span>
                                {plan.isLaunchOffer ? (
                                  <span className="flex items-baseline gap-2">
                                    <span>KES {plan.amountKes}</span>
                                    <span
                                      className={`text-xs line-through ${
                                        isSelected ? "text-white/50" : "text-charcoal/40"
                                      }`}
                                    >
                                      KES {plan.regularAmountKes}
                                    </span>
                                  </span>
                                ) : (
                                  <span>KES {plan.amountKes}</span>
                                )}
                              </span>
                            </button>
                          );
                        })}
                        {showLaunchOffer ? (
                          <p className="text-xs text-charcoal/50">
                            Prices increase to the amounts shown after Nov 5, 2026.
                          </p>
                        ) : null}
                      </div>

                      <div>
                        <label className="mb-1 block text-sm text-slate-700" htmlFor="pro-phone">
                          M-Pesa phone number
                        </label>
                        <input
                          id="pro-phone"
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
                        disabled={isBusy || !selectedPlan}
                        className="w-full rounded-xl bg-coral py-3 text-sm font-medium text-white transition hover:bg-forest disabled:cursor-not-allowed disabled:opacity-70"
                      >
                        {paymentInProgress
                          ? "Processing..."
                          : paymentSucceeded
                            ? "Payment received — renew again?"
                            : "Upgrade to Pro"}
                      </button>
                    </form>
                  ) : null}
                </>
              )}
            </div>
          </div>
        </div>
      </div>
    </main>
  );
}
