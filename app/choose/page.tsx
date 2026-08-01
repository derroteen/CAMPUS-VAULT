"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useEffect, useState } from "react";
import ProTrialBanner from "@/app/components/ProTrialBanner";
import { supabase } from "@/lib/supabase";

export default function ChoosePage() {
  const router = useRouter();
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const checkSession = async () => {
      const {
        data: { session },
      } = await supabase.auth.getSession();

      if (!session?.user) {
        router.replace("/login");
        return;
      }

      setLoading(false);
    };

    checkSession();
  }, [router]);

  if (loading) {
    return (
      <main className="min-h-screen bg-warm-bg flex items-center justify-center text-charcoal">
        <div className="animate-pulse rounded-xl border-r-[0.5px] border-y-[0.5px] border-r-forest/15 border-y-forest/15 border-l-4 border-l-forest bg-white/90 p-8 w-80 text-center shadow-sm">
          <p className="text-sm font-semibold uppercase tracking-[0.2em] text-charcoal/70">Loading...</p>
        </div>
      </main>
    );
  }

  return (
    <main className="min-h-screen bg-warm-bg px-6 py-12 text-charcoal">
      <div className="mx-auto max-w-4xl">
        <div className="text-center mb-10">
          <h1 className="text-3xl font-semibold text-charcoal">Where would you like to go?</h1>
          <p className="mt-2 text-charcoal/60">Choose a destination to continue</p>
        </div>

        <div className="mb-8">
          <ProTrialBanner />
        </div>

        <div className="grid gap-6 sm:grid-cols-2">
          {/* Study Resources Card */}
          <Link
            href="/dashboard"
            className="group flex flex-col items-center justify-center rounded-2xl border-r-[0.5px] border-y-[0.5px] border-r-forest/20 border-y-forest/20 border-l-4 border-l-forest bg-white/90 p-8 shadow-sm transition hover:border-forest hover:shadow-md hover:scale-[1.01]"
          >
            <div className="w-16 h-16 rounded-xl bg-forest/10 flex items-center justify-center mb-4 group-hover:bg-forest/20 transition-colors">
              <svg className="w-8 h-8 text-forest" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth={2}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M12 6.253v13m0-13C10.832 5.477 9.246 5 7.5 5S4.168 5.477 3 6.253v13C4.168 18.477 5.754 18 7.5 18s3.332.477 4.5 1.253m0-13C13.168 5.477 14.754 5 16.5 5c1.747 0 3.332.477 4.5 1.253v13C19.832 18.477 18.247 18 16.5 18c-1.746 0-3.332.477-4.5 1.253" />
              </svg>
            </div>
            <h2 className="text-xl font-semibold text-charcoal mb-2">Study Resources</h2>
            <p className="text-charcoal/60 text-center">Notes, past papers, and study guides</p>
            <span className="mt-6 inline-flex items-center text-forest font-medium text-sm group-hover:text-leaf transition-colors">
              Explore resources
              <svg className="w-4 h-4 ml-1 group-hover:translate-x-1 transition-transform" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth={2}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M17 8l4 4m0 0l-4 4m4-4H3" />
              </svg>
            </span>
          </Link>

          {/* Marketplace Card */}
          <Link
            href="/marketplace"
            className="group flex flex-col items-center justify-center rounded-2xl border-r-[0.5px] border-y-[0.5px] border-r-sunflower/25 border-y-sunflower/25 border-l-4 border-l-sunflower bg-white/90 p-8 shadow-sm transition hover:border-sunflower hover:shadow-md hover:scale-[1.01]"
          >
            <div className="w-16 h-16 rounded-xl bg-sunflower/15 flex items-center justify-center mb-4 group-hover:bg-sunflower/25 transition-colors">
              <svg className="w-8 h-8 text-sunflower" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth={2}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M16 11V7a4 4 0 00-8 0v4M5 9h14l1 12H4L5 9z" />
              </svg>
            </div>
            <h2 className="text-xl font-semibold text-charcoal mb-2">Marketplace</h2>
            <p className="text-charcoal/60 text-center">Buy and sell with fellow students</p>
            <span className="mt-6 inline-flex items-center text-sunflower font-medium text-sm group-hover:text-forest transition-colors">
              Explore marketplace
              <svg className="w-4 h-4 ml-1 group-hover:translate-x-1 transition-transform" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth={2}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M17 8l4 4m0 0l-4 4m4-4H3" />
              </svg>
            </span>
          </Link>
        </div>
      </div>
    </main>
  );
}