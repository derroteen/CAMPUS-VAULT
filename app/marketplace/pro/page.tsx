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
      <main className="flex min-h-screen items-center justify-center bg-warm-bg px-6 text-charcoal">
        <p className="text-charcoal/60">Loading plan options...</p>
      </main>
    );
  }

  return (
    <main className="min-h-screen bg-warm-bg px-4 py-10 text-charcoal sm:px-6 lg:px-8">
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
                  14 days product duration
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
              <p className="mt-1 text-sm text-charcoal/60">
                Maximum visibility &amp; unlimited product capacity.
              </p>
              <div className="mt-6 text-3xl font-bold text-forest">
                Pro Upgrade
              </div>

              <ul className="mt-6 space-y-3 text-sm text-charcoal/70">
                <li className="flex items-center gap-2.5">
                  <Check className="h-4 w-4 text-leaf" />
                  <strong className="text-charcoal">Unlimited active products</strong>
                </li>
                <li className="flex items-center gap-2.5">
                  <Check className="h-4 w-4 text-leaf" />
                  <strong className="text-charcoal">Up to 6 images per product</strong>
                </li>
                <li className="flex items-center gap-2.5">
                  <Check className="h-4 w-4 text-leaf" />
                  Priority / Boosted product support
                </li>
                <li className="flex items-center gap-2.5">
                  <Check className="h-4 w-4 text-leaf" />
                  14 days product duration
                </li>
              </ul>
            </div>

            <div className="mt-8 space-y-3">
              {isPro ? (
                <div className="rounded-xl border border-leaf/25 bg-leaf/10 py-3 text-center text-sm font-medium text-forest">
                  Pro Plan Active
                </div>
              ) : (
                <button
                  type="button"
                  onClick={handleUpgradeClick}
                  className="w-full rounded-xl bg-coral py-3 text-sm font-medium text-white transition hover:bg-forest"
                >
                  Upgrade to Pro
                </button>
              )}

              {notice && (
                <p className="text-center text-xs font-medium text-coral">
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
