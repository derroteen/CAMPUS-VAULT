"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import { Sparkles, X } from "lucide-react";
import { isSubscriptionCurrentlyActive } from "@/lib/subscription-status";
import { supabase } from "@/lib/supabase";

const MS_PER_DAY = 1000 * 60 * 60 * 24;
const DISMISSED_KEY = "pro-trial-banner-dismissed";
const DISMISSED_DATE_KEY = "pro-trial-banner-dismissed-date";

export default function ProTrialBanner() {
  const [daysRemaining, setDaysRemaining] = useState<number | null>(null);
  const [dismissed, setDismissed] = useState(false);

  useEffect(() => {
    let isMounted = true;

    const loadTrialStatus = async () => {
      const today = new Date().toISOString().slice(0, 10);

      if (typeof window !== "undefined") {
        try {
          const dismissedValue = sessionStorage.getItem(DISMISSED_KEY);
          const dismissedDate = sessionStorage.getItem(DISMISSED_DATE_KEY);

          if (dismissedValue === "true" && dismissedDate === today) {
            return;
          }
        } catch {
          // Ignore sessionStorage access issues and continue.
        }
      }

      const {
        data: { session },
      } = await supabase.auth.getSession();

      if (!session?.user || !isMounted) {
        return;
      }

      const { data } = await supabase
        .from("subscriptions")
        .select("status, expires_at, paystack_ref")
        .eq("user_id", session.user.id)
        .eq("tier", "pro")
        .eq("status", "active")
        .order("expires_at", { ascending: false })
        .limit(1)
        .maybeSingle();

      if (
        !isMounted ||
        !data ||
        !isSubscriptionCurrentlyActive(data) ||
        !!data.paystack_ref
      ) {
        return;
      }

      const expiresAt = new Date(data.expires_at);
      const now = new Date();

      const remainingDays = Math.ceil((expiresAt.getTime() - now.getTime()) / MS_PER_DAY);

      if (remainingDays > 0) {
        setDaysRemaining(remainingDays);
      }
    };

    loadTrialStatus();

    return () => {
      isMounted = false;
    };
  }, []);

  if (dismissed || daysRemaining == null) {
    return null;
  }

  return (
    <div className="relative rounded-2xl border-r-[0.5px] border-y-[0.5px] border-r-sunflower/25 border-y-sunflower/25 border-l-4 border-l-sunflower bg-white/90 px-4 py-3 shadow-sm">
      <div className="flex items-start gap-3 pr-8 sm:items-center">
        <span className="mt-0.5 inline-flex h-8 w-8 flex-shrink-0 items-center justify-center rounded-full bg-sunflower/20 text-forest sm:mt-0">
          <Sparkles className="h-4 w-4" />
        </span>
        <div className="min-w-0 text-sm text-charcoal/80">
          <p>
            <span className="font-medium text-charcoal">
              You&apos;re on a free Pro trial - {daysRemaining} {daysRemaining === 1 ? "day" : "days"} left.
            </span>{" "}
            Enjoy boosted visibility and unlimited listings.{" "}
            <Link href="/marketplace/pro" className="font-medium text-forest transition hover:text-coral">
              Learn more
            </Link>
          </p>
        </div>
      </div>
      <button
        type="button"
        onClick={() => {
          setDismissed(true);

          if (typeof window !== "undefined") {
            try {
              sessionStorage.setItem(DISMISSED_KEY, "true");
              sessionStorage.setItem(
                DISMISSED_DATE_KEY,
                new Date().toISOString().slice(0, 10)
              );
            } catch {
              // Ignore sessionStorage access issues.
            }
          }
        }}
        className="absolute right-3 top-3 rounded-full p-1 text-charcoal/45 transition hover:bg-sunflower/15 hover:text-charcoal"
        aria-label="Dismiss Pro trial banner"
      >
        <X className="h-4 w-4" />
      </button>
    </div>
  );
}