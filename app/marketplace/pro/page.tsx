"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useEffect, useState } from "react";
import { Check, ArrowLeft, Sparkles, ShieldCheck } from "lucide-react";
import { supabase } from "@/lib/supabase";

export default function ProUpgradePage() {
  const router = useRouter();

  const [isPro, setIsPro] = useState(false);
  const [loading, setLoading] = useState(true);
  const [notice, setNotice] = useState<string | null>(null);

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
        .select("tier")
        .eq("user_id", session.user.id)
        .eq("status", "active")
        .limit(1)
        .maybeSingle();

      if (data?.tier === "pro") {
        setIsPro(true);
      }

      setLoading(false);
    };

    checkSubscription();
  }, [router]);

  const handleUpgradeClick = () => {
    setNotice("Payment integration coming soon");
  };

  if (loading) {
    return (
      <main className="flex min-h-screen items-center justify-center bg-slate-950 px-6 text-white">
        <p className="text-slate-300">Loading plan options...</p>
      </main>
    );
  }

  return (
    <main className="min-h-screen bg-slate-950 px-4 py-10 text-white sm:px-6 lg:px-8">
      <div className="mx-auto max-w-4xl">
        {/* Navigation */}
        <Link
          href="/marketplace/my-listings"
          className="mb-6 inline-flex items-center gap-1.5 text-sm text-slate-400 transition hover:text-white"
        >
          <ArrowLeft className="h-4 w-4" />
          Back to my listings
        </Link>

        {/* Header */}
        <div className="mb-10 text-center">
          <div className="inline-flex items-center gap-1.5 rounded-full border border-amber-500/30 bg-amber-500/10 px-3.5 py-1 text-sm font-medium text-amber-200">
            <Sparkles className="h-4 w-4 text-amber-400" />
            Marketplace Pro
          </div>
          <h1 className="mt-4 text-3xl font-bold tracking-tight sm:text-4xl">
            Upgrade your selling power
          </h1>
          <p className="mt-2 text-slate-400">
            Reach more buyers and manage more items on MVCorner Marketplace.
          </p>
        </div>

        {/* Current status banner */}
        <div className="mb-8 rounded-2xl border border-slate-800 bg-slate-900 p-4 text-center">
          <span className="text-sm text-slate-400">Your current plan: </span>
          <span
            className={`font-semibold ${
              isPro ? "text-emerald-400" : "text-slate-200"
            }`}
          >
            {isPro ? "Pro Tier (Active)" : "Free Tier"}
          </span>
        </div>

        {/* Pricing Grid */}
        <div className="grid gap-6 md:grid-cols-2">
          {/* Free Tier Card */}
          <div className="rounded-3xl border border-slate-800 bg-slate-900/60 p-6 sm:p-8 flex flex-col justify-between">
            <div>
              <h2 className="text-xl font-semibold text-white">Free Plan</h2>
              <p className="mt-1 text-sm text-slate-400">
                Standard features for occasional sellers.
              </p>
              <div className="mt-6 text-3xl font-bold text-white">
                KES 0 <span className="text-sm font-normal text-slate-400">/ forever</span>
              </div>

              <ul className="mt-6 space-y-3 text-sm text-slate-300">
                <li className="flex items-center gap-2.5">
                  <Check className="h-4 w-4 text-emerald-400" />
                  Up to 3 active listings
                </li>
                <li className="flex items-center gap-2.5">
                  <Check className="h-4 w-4 text-emerald-400" />
                  Up to 2 images per listing
                </li>
                <li className="flex items-center gap-2.5">
                  <Check className="h-4 w-4 text-emerald-400" />
                  14 days listing duration
                </li>
              </ul>
            </div>

            <div className="mt-8">
              <button
                type="button"
                disabled
                className="w-full rounded-xl border border-slate-800 bg-slate-950/60 py-3 text-sm font-medium text-slate-500 cursor-not-allowed"
              >
                {isPro ? "Default Plan" : "Current Plan"}
              </button>
            </div>
          </div>

          {/* Pro Tier Card */}
          <div className="relative rounded-3xl border border-emerald-500/40 bg-gradient-to-b from-slate-900 via-slate-900 to-slate-950 p-6 sm:p-8 flex flex-col justify-between shadow-2xl shadow-emerald-950/30">
            <div className="absolute -top-3 right-6 rounded-full bg-emerald-500 px-3 py-0.5 text-xs font-semibold text-slate-950">
              RECOMMENDED
            </div>

            <div>
              <h2 className="text-xl font-semibold text-white flex items-center gap-2">
                Pro Plan
                <ShieldCheck className="h-5 w-5 text-emerald-400" />
              </h2>
              <p className="mt-1 text-sm text-slate-400">
                Maximum visibility &amp; unlimited listing capacity.
              </p>
              <div className="mt-6 text-3xl font-bold text-emerald-400">
                Pro Upgrade
              </div>

              <ul className="mt-6 space-y-3 text-sm text-slate-200">
                <li className="flex items-center gap-2.5">
                  <Check className="h-4 w-4 text-emerald-400" />
                  <strong className="text-white">Unlimited active listings</strong>
                </li>
                <li className="flex items-center gap-2.5">
                  <Check className="h-4 w-4 text-emerald-400" />
                  <strong className="text-white">Up to 6 images per listing</strong>
                </li>
                <li className="flex items-center gap-2.5">
                  <Check className="h-4 w-4 text-emerald-400" />
                  Priority / Boosted listing support
                </li>
                <li className="flex items-center gap-2.5">
                  <Check className="h-4 w-4 text-emerald-400" />
                  14 days listing duration
                </li>
              </ul>
            </div>

            <div className="mt-8 space-y-3">
              {isPro ? (
                <div className="rounded-xl border border-emerald-500/30 bg-emerald-500/10 py-3 text-center text-sm font-medium text-emerald-200">
                  Pro Plan Active
                </div>
              ) : (
                <button
                  type="button"
                  onClick={handleUpgradeClick}
                  className="w-full rounded-xl bg-emerald-600 py-3 text-sm font-medium text-white transition hover:bg-emerald-500"
                >
                  Upgrade to Pro
                </button>
              )}

              {notice && (
                <p className="text-center text-xs text-amber-300 font-medium">
                  {notice}
                </p>
              )}
            </div>
          </div>
        </div>
      </div>
    </main>
  );
}
